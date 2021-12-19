process.env.UV_THREADPOOL_SIZE = process.env.UV_THREADPOOL_SIZE || Math.ceil(Math.max(4, require('os').cpus().length * 1.5))

const debug = require('debug')('mapbox-style-downloader')
const mkdirp = require('mkdirp')
const path = require('path')
const parseUrl = require('url').parse
const tilelive = require('tilelive-streaming')(require('@mapbox/tilelive'))
const asar = require('asar')
const rimraf = require('rimraf')

const tileJsonClass = require('@mapbox/tilejson')
tileJsonClass.registerProtocols(tilelive)
require('tilelive-file').registerProtocols(tilelive)
const request = require('requestretry');
const Agent = require('agentkeepalive');
const agent = new Agent({
  maxSockets: 128,
  keepAliveTimeout: 30000
});
const httpsagent = new Agent.HttpsAgent({
  maxSockets: 128,
  keepAliveTimeout: 30000
});
tileJsonClass.prototype.get = function(url, callback) {
  request({
    url: url,
    encoding: null,
    timeout: this.timeout,
    headers: {Connection: 'Keep-Alive', Origin: 'http://localhost:8000'}, // For adding Origin
    agent: url.indexOf('https:') === 0 ? httpsagent : agent,
    maxAttempts: 2,
    retryDelay: 0
  }, function (err, res, buffer) {
    if (!err && res.statusCode !== 200) {
      err = new Error('Server returned HTTP ' + res.statusCode);
      err.statusCode = res.statusCode;
    }
    callback(err, buffer, res && res.headers);
  });
};

const sanitize = require('./sanitize-id')
const normalizeSourceURL = require('./mapbox').normalizeSourceURL

module.exports = function (url, outDir, accessToken, opts, cb) {
  opts = opts || {}
  opts.minzoom = 'minzoom' in opts ? opts.minzoom : 0
  opts.maxzoom = 'maxzoom' in opts ? opts.maxzoom : 16
  if (!opts.bounds) console.warn('warning: no bounds set, downloading entire world')
  opts.bounds = opts.bounds || [-180, -85.0511, 180, 85.0511]

  debug('waiting for tilelive.load')
  tilelive.load('tilejson+' + normalizeSourceURL(url, accessToken), function (err, source) {
    if (err) return cb(err)
    var tilejson = source.data
    var sourceId = tilejson.id
    outDir = path.join(outDir, sanitize(sourceId))
    mkdirp.sync(outDir)

    opts.minzoom = Math.max(opts.minzoom, tilejson.minzoom || 0)
    opts.maxzoom = Math.min(opts.maxzoom, tilejson.maxzoom || 20)
    if (opts.minzoom > opts.maxzoom) {
      if (opts.minzoom === tilejson.minzoom) opts.maxzoom = opts.minzoom
      else opts.minzoom = opts.maxzoom
    }
    tilejson.minzoom = opts.minzoom
    tilejson.maxzoom = opts.maxzoom

    var tilePath = parseUrl(tilejson.tiles[0] || tilejson.tiles).pathname
    var filetype = path.parse(tilePath).base.replace('%7By%7D', '').replace(/^\./, '')
    return tilelive.load('file://' + outDir, function (err, sink) {
      if (err) return cb(err)
      sink.filetype = filetype
      source.createReadStream(opts)
        .pipe(sink.createWriteStream())
        .on('tile', function (tile) {
          if (!opts.quiet) {
            console.log('%d/%d/%d\t%d', tile.z, tile.x, tile.y, tile.length)
          }
        })
        .on('error', cb)
        .on('end', function () {
          tilejson.tiles = ['/{z}/{x}/{y}.' + filetype]
          if (!opts.asar) return cb(null, tilejson)
          asar.createPackage(outDir, outDir + '.asar', function (err) {
            if (err) return cb(err)
            rimraf(outDir, function (err) {
              cb(err, tilejson)
            })
          })
        })
    })
  })
}
