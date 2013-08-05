var events = require('events'),
    http = require('http'),
    fs = require('fs'),
    jsts = require('jsts');


var RESOLUTIONS_MERCATOR = [
    /* 0 */156543.033928,
    /* 1 */78271.516964,
    /* 2 */39135.758482,
    /* 3 */19567.879241,
    /* 4 */9783.939621,
    /* 5 */4891.969810,
    /* 6 */2445.984905,
    /* 7 */1222.992453,
    /* 8 */611.496226,
    /* 9 */305.748113,
    /* 10 */152.874057,
    /* 11 */76.437028,
    /* 12 */38.218514,
    /* 13 */19.109257,
    /* 14 */9.554629,
    /* 15 */4.777302,
    /* 16 */2.388657,
    /* 17 */1.194329,
    /* 18 */0.597164,
    /* 19 */0.298582,
    /* 20 */0.149291,
    /* 21 */0.074646
];

var ORIGIN_MERCATOR_X =-20037508;
var ORIGIN_MERCATOR_Y = 20037508;

function buildTileFromCoordinates(x, y, zoom) {
    var scale = 256 * RESOLUTIONS_MERCATOR[zoom];
    return {
        x: Math.floor( (x - ORIGIN_MERCATOR_X) / scale),
        y: Math.floor( (ORIGIN_MERCATOR_Y - y) / scale),
        z: zoom
    };
}

function buildCoordinatesFromTile(i, j, z) {
    var scale = 256 * RESOLUTIONS_MERCATOR[z];
    return new jsts.geom.Coordinate(i * scale + ORIGIN_MERCATOR_X, ORIGIN_MERCATOR_Y - j*scale);
}

/**
 * Returns a list of tile {x, y, z}
 * @param latLngs list of o.Point in mercator
 * @param fromZoom
 * @param toZoom
 */
function buildTileSets(latLngs, fromZoom, toZoom) {
    // to pretty print
    var wktOut = new jsts.io.WKTWriter();
    //build a geom
    var geometryFactory = new jsts.geom.GeometryFactory();
    var i, j, z;

    // convert coords to JTS
    var coords = [];
    for (i = 0; i < latLngs.length; i++) {
        coords.push(new jsts.geom.Coordinate(latLngs[0].x, latLngs[0].y));
    }
    var polygon = geometryFactory.createPolygon(geometryFactory.createLinearRing(coords), null);

    // get the bounding box (todo: jsts should do that)
    var minx = NaN, miny = NaN, maxx = NaN, maxy = NaN;
    for (i = 0; i < coords.length; i++) {
        var x = coords[i].x;
        var y = coords[i].y;
        minx = minx ? Math.min(minx, x) : x;
        miny = miny ? Math.min(miny, y) : y;
        maxx = maxx ? Math.max(maxx, x) : x;
        maxy = maxy ? Math.max(maxy, y) : y;
    }

    var matchingTiles = [];

    // loop on all zoo mlevels
    for (z = fromZoom; z <= toZoom;z++) {
        var fromTile = buildTileFromCoordinates(minx, maxy, z);
        var toTile = buildTileFromCoordinates(maxx, miny, z);
        console.log("At level " + z + " from tile ", fromTile);
        console.log("To tile ", toTile);

        for (i = fromTile.x; i <= toTile.x; i++){
            for (j = fromTile.y; j <= toTile.y; j++) {

                // build a pseudo geom for this tile
                var tileCoords = [
                    buildCoordinatesFromTile(i, j, z),
                    buildCoordinatesFromTile(i, j+1, z),
                    buildCoordinatesFromTile(i+1, j+1, z),
                    buildCoordinatesFromTile(i+1, j, z),
                    buildCoordinatesFromTile(i, j, z)
                ];
                var tileRing = geometryFactory.createPolygon(geometryFactory.createLinearRing(coords), null);

                // if it intersects, add it
                var intersects = true;
                try {
                    tileRing.intersects(polygon);
                } catch (e){
                    console.log("Error: ", e.message);
                }
                if (intersects) {
                    var tile = {x: i, y: j, z: z};
                    matchingTiles.push(tile);
                }
            }
        }
    }

    return matchingTiles;
}

function downloadTiles(tiles, host, key, layer, toDir) {
    var emitter = new events.EventEmitter();

    var downloadATile = function() {
        if (tiles.length == 0){
            emitter.emit('end');
            return;
        }
        var nextTile = tiles.pop();
        var path = '/' + key + '/wmts?LAYER=' + layer +
                '&EXCEPTIONS=text/xml' +
                '&FORMAT=image/jpeg' +
                '&SERVICE=WMTS' +
                '&VERSION=1.0.0' +
                '&REQUEST=GetTile' +
                '&STYLE=normal' +
                '&TILEMATRIXSET=PM' +
                '&TILEMATRIX=' + nextTile.z +
                '&TILEROW=' + nextTile.y +
                '&TILECOL=' + nextTile.x;
        console.log("Download tile at " + path + " for ", nextTile);

        http.get({
                host: host,
                path: path ,
                headers: {
                    Referer: 'http://localhost'
                }
            },
            function(res){
                var fileName = toDir + '/' + nextTile.z + '_' + nextTile.x + '_' + nextTile.y + '.jpg';
                var stream = fs.createWriteStream(fileName);
                res.pipe(stream);

                res.on('end', function(){
                    // write tile
                    console.log("One Tile OK");
                    emitter.emit('onefile', fileName);
                    downloadATile();
                });
                res.on('error', function(err){
                    console.log('Error downloadting tile', err);
                    emitter.emit('error', err);
                    downloadATile();
                });
            });

    };

    downloadATile();

    return emitter;
}


exports.buildTileSets = buildTileSets;
exports.downloadTiles = downloadTiles;

// MAIN

/*
var latLngs = [
    { x: 445277.96317309426, y: 5621521.486192066},
    { x: 556597.4539663679, y: 5621521.486192066},
    { x: 556597.4539663679, y: 5780349.220256351},
    { x: 445277.96317309426, y: 5780349.220256351},
    { x: 445277.96317309426, y: 5621521.486192066}
];
var tiles = buildTileSets(latLngs, 5, 8);
console.log(tiles.length);
downloadTiles(tiles, 'wxs.ign.fr', 'kiaagdc8wartm9h6uhvdbt3l', 'GEOGRAPHICALGRIDSYSTEMS.MAPS', 'out');
    */