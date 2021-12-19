#!/usr/bin/env node

const path = require('path')
const updateNotifier = require('update-notifier')
const pkg = require('../package.json')

const download = require('../').download
const serve = require('../').serve
const isMapboxURL = require('../').isMapboxURL

const notifier = updateNotifier({
  pkg: pkg
})
notifier.notify()

const argv = require('yargs-parser')(process.argv.slice(2), {
  alias: {
    a: 'asar',
    p: 'port',
    t: 'token',
    z: 'minzoom',
    Z: 'maxzoom',
    b: 'bounds',
    o: 'output',
    u: 'minutf',
    U: 'maxutf'
  },
  boolean: ['asar', 'style', 'glyphs', 'sprites', 'tiles'],
  string: [
    'bounds',
    'token'
  ],
  default: {
    port: 8080
  }
})

const cmd = argv._[0]

if (cmd === 'download') {
  const styleUrl = argv._[1]
  if (!styleUrl) {
    onError(new Error('Missing styleUrl'))
  }
  if (!argv.o) {
    onError(new Error('You must pass an output dir with option -o or --output'))
  }
  const outDir = path.resolve(process.cwd(), argv.o)
  const accessToken = argv.token || process.env.MAPBOX_TOKEN
  if (isMapboxURL(styleUrl) && !accessToken) {
    onError(new Error('missing Mapbox access token, please pass -t or --token'))
  }
  download(styleUrl, accessToken, outDir, argv, onError)
} else if (cmd === 'serve') {
  const root = path.resolve(process.cwd(), argv._[1] || '')
  const styleFile = path.join(root, 'style.json')
  serve(root, styleFile, argv.port)
} else {
  console.log(`USAGE: mapbox-style <command> [options]

  download STYLE_URL [options]
    -a, --asar          export tile sources as asar archives
    -b, --bounds        bounding box in the form of "lat, lon, lat, lon"
    -o, --output        the output path for the styles
    -z, --minzoom       the minimum zoom for tile downloading [1,16]
    -Z, --maxzoom       the maximum zoom for tile downloading [1,16]
    -t, --token         your MapBox API token
    -u, --minutf        minimum UTF-8 char code to download glyphs for
    -U, --maxutf        maximum UTF-8 char code to download glyphs for
    --style             only download the style.json
    --glyphs            download glyphs
    --tiles             download tiles
    --sprites           download sprites
  
  By default all resources (style.json, glyphs, tiles and sprites) are downloaded.
  Passing any of the --style, --glyphs, --tiles, --sprites options will result
  in only the resources specified being downloaded. This can be helpful if, for
  example, only the style has changes, but the tile data remains the same, so
  there is no need to download it a second time. Note that the style.json is
  _always_ downloaded, since it is needed to get the URLs for other resources.

  serve
    -p, --port          the port to use for the server

  help
    see this help text
`)
}

function onError (err) {
  if (err) {
    console.error(err)
    process.exit(1)
  } else {
    process.exit()
  }
}
