## Dongju

Download mapbox vector tile specification based resources - styles, tiles, glyphs, and sprites for offline use.
<!--
```
npm install -g dongju
```

## Usage

To download, you need to get a MapBox API Token. You can get one by signing up
for mapbox and requesting a public key from them. It is free. It should start
with `pk`. This is your `token` to be used with mapbox-style-downloader.

To find out the coordinates for the bounding box of the area you'll be downloading
the [boundingbox](https://boundingbox.klokantech.com/) online tool can be used.
Use the `CSV` Copy & Paste option to display the coordinates in the correct format.

To download, use the `download` command like so:

```sh
mapbox-style download mapbox://styles/mapbox/streets-v9 \
  --asar \
  --token='MAPBOX_API_TOKEN' \
  -o styledir \
  -z 8 \
  -Z 13 \
  -b '-60.1364 1.5626 -58.0627 3.475'
```

You need to provide a Mapbox Style URL as the first argument to `download`.
There are many of them, but this is an example: `mapbox://styles/mapbox/streets-v9`. You can see the full list on the [MapBox website](https://docs.mapbox.com/api/maps/styles/).

## Be careful!

This has the capability to send MapBox a lot of requests. Try not to get your
token throttled! Make sure you pick reasonable bounding boxes and zoom levels,
because the data can get very large, very fast.

## Serve styles

To serve the styles, you can use a static http server. MapBox isn't that picky
on how you serve your tiles. There is a built-in example with this command-line
tool. Just give the path to your `styledir` like so:

```
mapbox-style serve styledir
```

And you will be able to see your map, being served offline from the tiles,
sprites, and glyphs you just downloaded.

## API

```
USAGE: mapbox-style <command> [options]

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
```
-->
