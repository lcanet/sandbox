var http = require('http'),
    downloader = require('./js/downloader.js'),
    proxy = require('./js/proxy.js')
;

// create NODE JS proxy that reinjects referer
proxy.create(56471);

// instantiate leaflet
var map = L.map('map').setView([45, 4], 6);

// change this with your key !
var ignGeoportailDevModeKey = 'kiaagdc8wartm9h6uhvdbt3l';

var photoLayer =
    L.tileLayer('http://localhost:56471/' + ignGeoportailDevModeKey + '/wmts?LAYER=ORTHOIMAGERY.ORTHOPHOTOS&EXCEPTIONS=text/xml&FORMAT=image/jpeg&SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetTile&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}',
        {
            maxZoom: 18,
            attribution: "Institut geographique national"
        });
var mapLayer =
    L.tileLayer('http://localhost:56471/' + ignGeoportailDevModeKey + '/wmts?LAYER=GEOGRAPHICALGRIDSYSTEMS.MAPS&EXCEPTIONS=text/xml&FORMAT=image/jpeg&SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetTile&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}',
        {
            maxZoom: 18,
            attribution: "Institut geographique national"

        });
//photoLayer.addTo(map);
mapLayer.addTo(map).bringToFront();


// some funky controls
var currentBaseLayer = mapLayer;
L.control.layers({"Carte": mapLayer, "Photos": photoLayer}).addTo(map);
map.on('baselayerchange', function(newBaseLayer){
    currentBaseLayer = newBaseLayer;
});


// Initialize the FeatureGroup to store editable layers
var drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);

//draw control
var drawControl = new L.Control.Draw({
    draw: {
        polyline: false,
        rectangle: false,
        circle: false,
        marker: false,
        polygon: {
            title: 'Draw polygon!',
            allowIntersection: false,
            drawError: {
                color: '#b00b00',
                timeout: 1000
            },
            shapeOptions: {
                color: '#ff0000'
            },
            showArea: true
        }
    },
    edit: {
        featureGroup: drawnItems
    }
});

map.addControl(drawControl);
map.on('draw:created', function (e) {
    var type = e.layerType, layer = e.layer;

    drawnItems.addLayer(layer);

    var latLgs = layer.getLatLngs();
    var projLatLngs = [];
    for (var i = 0; i < latLgs.length; i++) {
        projLatLngs.push(L.CRS.EPSG3857.project(latLgs[i]));
    }
    projLatLngs.push(L.CRS.EPSG3857.project(latLgs[0]));

    console.log('Doing ', JSON.stringify(projLatLngs));
    var tiles = downloader.buildTileSets(projLatLngs, 2, 16);
    if (confirm('Do you to download all ' + tiles.length + ' tiles to the "out" directory ?')){

        downloader.writeLayerDescription('Sample layer', latLgs, "out");

        var layerName = currentBaseLayer === mapLayer ? 'GEOGRAPHICALGRIDSYSTEMS.MAPS' : 'ORTHOIMAGERY.ORTHOPHOTOS';
        var evt = downloader.downloadTiles(tiles,
            'wxs.ign.fr',
            ignGeoportailDevModeKey,
            layerName,
            'out');

        var prog = document.getElementById('dl-progress');
        var errReport = document.getElementById('dl-error');
        var idx = 0;
        evt.on("onefile", function(){
            idx ++;
            prog.innerHTML = "done " + idx + " remaining " + tiles.length;
        });
        evt.on("error", function(err){
            errReport.innerHTML = "ERROR: " +  err.toString();
        });

    }
});