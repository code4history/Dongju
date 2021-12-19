const debug = require('debug')('mapbox-style-downloader')
const request = require('request')
const mkdirp = require('mkdirp')
const path = require('path')
const queue = require('d3-queue').queue
const assign = require('object-assign')
const fs = require('fs-extra')

const sanitize = require('./sanitize-id')
const normalizeStyleURL = require('./mapbox').normalizeStyleURL
const downloadGlyphs = require('./glyphs')
const downloadSprites = require('./sprites')
const downloadTiles = require('./tiles')

const defaults = {
  glyphs: false,
  sprites: false,
  tiles: false,
  style: false,
  minzoom: 1,
  maxzoom: 14,
  bounds: '-180.0 -85.06 180.0 85.06',
  sources: null,
  range: [0, 65535],
  asar: false
}

module.exports = download

function download (styleUrl, accessToken, outDir, opts, cb) {
  opts = Object.assign({}, defaults, opts)
  opts.bounds = opts.bounds.split(/,|\s/)

  const all = !opts.glyphs && !opts.sprites && !opts.tiles && !opts.style

  if (typeof opts.minutf === 'number') opts.range[0] = opts.minutf
  if (typeof opts.maxutf === 'number') opts.range[1] = opts.maxutf

  debug('Requesting stylesheet...')
  request(normalizeStyleURL(styleUrl, accessToken), { json: true }, function (err, res, stylesheet) {
    if (err) return cb(err)
    if (res.body.message) return cb(new Error(res.body.message))
    var offlineStylesheet = assign({}, stylesheet)
    var q = queue(1)

    mkdirp.sync(outDir)
    if (opts.glyphs || all) {
      q.defer(downloadGlyphs, stylesheet, path.join(outDir, 'fonts'), accessToken, opts.range)
      offlineStylesheet.glyphs = '{host}/fonts/{fontstack}/{range}.pbf'
    }
    if (opts.sprites || all) {
      q.defer(downloadSprites, stylesheet.sprite, path.join(outDir, 'sprites'), accessToken)
      offlineStylesheet.sprite = '{host}/sprites/sprite'
    }
    if (opts.tiles || all) {
      q.defer(downloadSources)
    }
    q.awaitAll(function (err) {
      if (err) return cb(err)
      offlineStylesheet.zoom = opts.minzoom
      const centerLon = opts.bounds[0] + (opts.bounds[2] - opts.bounds[0]) / 2
      const centerLat = opts.bounds[1] + (opts.bounds[3] - opts.bounds[1]) / 2
      offlineStylesheet.center = [centerLon, centerLat]
      fs.writeFileSync(path.join(outDir, 'style.json'), JSON.stringify(offlineStylesheet, null, 2))
      fs.copySync(path.join(__dirname, '../index.html'), path.join(outDir, 'index.html'))
      console.log('Style resources successfully downloaded to ', outDir)
    })

    function downloadSources (cb) {
      console.log('Organizing sources...')
      var sourceQ = queue(1)
      var sourceKeys = Object.keys(stylesheet.sources)

      sourceKeys
        .forEach(function (key, i) {
          var sourceUrl = stylesheet.sources[key].url
          sourceQ.defer(downloadTiles, sourceUrl, path.join(outDir, 'tiles'), accessToken, opts)
        })
      sourceQ.awaitAll(function (err, tilejsons) {
        if (err) return cb(err)
        offlineStylesheet.sources = sourceKeys.reduce(function (acc, key, i) {
          acc[key] = tilejsons[i]
          var sanitizedId = sanitize(acc[key].id)
          acc[key].tiles = acc[key].tiles.map(function (url) { return '{host}/tiles/' + sanitizedId + url })
          acc[key].type = stylesheet.sources[key].type
          return acc
        }, {})
        cb()
      })
    }
  })
}
