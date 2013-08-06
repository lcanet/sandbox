var http = require('http');

function createProxy(port) {
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
    }).listen(port ? port : 56471);
}

exports.create = createProxy;
