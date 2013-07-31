var http = require('http');

// create NODE JS proxy that reinjects referer
http.createServer(function(request, response) {
    var proxyReq = http.get({
            host: 'wxs.ign.fr',
            path:request.url ,
            headers: {
                Referer: 'http://localhost'
            }
        },
        function(proxyRes){
            response.setHeader('Content-Type', proxyRes.headers['Content-Type']);
            response.writeHead(proxyRes.statusCode);
            proxyRes.on('data', function (chunk) {
                response.write(chunk, 'binary');
            });
            proxyRes.on('end', function(){
                response.end();
            });
        });
    proxyReq.on('error', function(e){
        console.log("Proxy Req err", e);
    });
}).listen(56471);

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
L.control.layers({"Carte": mapLayer, "Photos": photoLayer}).addTo(map);