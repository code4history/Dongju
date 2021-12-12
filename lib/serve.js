const ecstatic = require('ecstatic')
const http = require('http')
const url = require('url')
const getport = require('getport')
const fs = require('fs')
const path = require('path')
const asar = require('asar')

module.exports = serve

// /tiles/:tilesetId/.*
var tilePathRe = /^\/tiles\/((?:[^/]+?))\/(.*)$/i

function serve (root, styleFile, port) {
  var server = http.createServer(function (req, res) {
    var pathname = url.parse(req.url).pathname
    var tilePathMatch = tilePathRe.exec(pathname)
    if (tilePathMatch) {
      console.log('tileserve')
      return serveTile(req, res, root, tilePathMatch)
    }
    if (pathname === '/style.json') {
      return serveStyleFile(req, res, styleFile)
    }
    ecstatic({ root: root, cors: true })(req, res)
  })

  getport(port, function (err, port) {
    if (err) return console.error(err)
    server.listen(port, function () {
      console.log('Listening on port:', port)
    })
  })

  return server
}

function serveStyleFile (req, res, styleFile) {
  fs.stat(styleFile, function (err, stat) {
    if (err) console.error(err)
    fs.readFile(styleFile, 'utf8', function (err, data) {
      if (err) console.error(err)
      data = Buffer.from(data.replace(/\{host\}/gm, 'http://' + req.headers.host))
      res.setHeader('content-type', 'application/json; charset=utf-8')
      res.setHeader('last-modified', (new Date(stat.mtime)).toUTCString())
      res.setHeader('content-length', data.length)
      res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, If-Match, If-Modified-Since, If-None-Match, If-Unmodified-Since')
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.statusCode = 200
      res.write(data)
      res.end()
    })
  })
}

function serveTile (req, res, root, match) {
  var pathname = url.parse(req.url).pathname
  if (pathname.endsWith('.pbf') || pathname.endsWith('.mvt')) {
    // Vector tiles are gzip at rest, so need to be served as gzip
    // Raster tiles should not be served as gzip
    res.setHeader('content-encoding', 'gzip')
  }
  var tilesetId = match[1]
  var asarPath = path.join(root, 'tiles', tilesetId + '.asar')
  fs.access(asarPath, fs.constants.R_OK, function (err) {
    if (err) console.log('no asar')
    // if no asar file, serve tile as static file
    if (err) return ecstatic({ root: root, cors: true })(req, res)
    console.log('asar', asarPath, match[2])
    var tilePath = match[2]
    serveAsarTile(req, res, asarPath, tilePath)
  })
}

function serveAsarTile (req, res, asarPath, tilePath) {
  try {
    var buf = asar.extractFile(asarPath, tilePath)
    var ext = path.parse(tilePath).ext
    console.log(buf)
    var mime
    switch (ext) {
      case 'png': mime = 'image/png'; break
      case 'jpg': mime = 'image/jpg'; break
    }
    if (mime) res.setHeader('content-type', mime)
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.end(buf)
  } catch (e) {
    res.statusCode = 404
    res.end()
  }
}
