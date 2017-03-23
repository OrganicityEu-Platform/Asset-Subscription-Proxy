var config = require('./config');
var opbeat = undefined;

if(config.opbeat) {
  opbeat = require('opbeat').start(config.opbeat);
}

var fs = require('fs'),
    https = require('https'),
    Root = require('./controllers/root').Root;

var log = require('./lib/logger').logger.getLogger("Server");

var express = require('express');

process.on('uncaughtException', function (err) {
    log.error('Caught exception: ' + err);
});
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

var app = express();

//app.use(express.bodyParser());

app.use(function (req, res, next) {
    var bodyChunks = [];
    req.on('data', function (chunk) {
        bodyChunks.push(chunk);
    });

    req.on('end', function () {
        req.body = Buffer.concat(bodyChunks);
        next();
    });
});

app.use(function (req, res, next) {
    "use strict";
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'HEAD, POST, PUT, GET, OPTIONS, DELETE');
    res.header('Access-Control-Allow-Headers', 'origin, content-type, X-Auth-Token, Tenant-ID, Authorization');
    //log.debug("New Request: ", req.method);
    if (req.method == 'OPTIONS') {
        log.debug("CORS request");
        res.statusCode = 200;
        res.header('Content-Length', '0');
        res.send();
        res.end();
    }
    else {
        next();
    }
});

var port = config.proxy_port || 80;
app.set('port', port);

app.post('/', Root.createOrUpdate);
app.delete('/v2/entities/:assetId', Root.remove);

app.get('/test', function(req, res, next) {
  console.log('test called');
  //console.log(test);

  var err = new Error('Ups, something broke!')
  opbeat.captureError(err)

  res.status(200).send('test ok');
});


if(config.opbeat) {
  console.log('Use Opbeat error logging');
  app.use(opbeat.middleware.express());
}

log.info('Starting Organicity Subscription Proxy in port ' + port + ' ...');
app.listen(app.get('port'));

