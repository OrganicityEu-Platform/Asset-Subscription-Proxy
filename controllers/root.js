var config = require('./../config.js'),
    proxy = require('./../lib/HTTPClient.js');
var log = require('./../lib/logger').logger.getLogger("Organicity-subscription-proxy");

var MILLIS_IN_SECOND = 1000;
var SECONDS_IN_MINUTE = 60;
var CACHE_MINUTES = 4;
//Last time the token was updated
var lastTime = null;
//The last access token
var access_token = null;

var Root = (function () {

  // Get the Access Token
  var getAccessToken = function(req, res, next) {
    console.log('# Access token');

    //check if there was any previous token
    if (lastTime != null && access_token != null) {
      timeDiff = new Date().getTime() / 1000 - lastTime.getTime() / 1000;
      var remainingTime = CACHE_MINUTES * SECONDS_IN_MINUTE - timeDiff;
      log.debug(parseInt(remainingTime) + " seconds remaining for Access Token refresh.");
      //token is kept for 4 minutes
      if (remainingTime > 0) {
        log.debug("Access Token is cached, proceeding to next call");
        req.access_token = access_token;
        next();
        return;
      }
    }
    var options = {
      host: 'accounts.organicity.eu', // 31.200.243.82
      port: '443',
      path: '/realms/organicity/protocol/openid-connect/token',
      method: 'POST',
      headers: {
        'Content-Type' : 'application/x-www-form-urlencoded'
      }
    };

    var payload = 'grant_type=client_credentials&client_id=' + config.client_id + '&client_secret=' + config.client_secret;

    proxy.sendData('https', options, payload, res, function (status, responseText) {
      var token = JSON.parse(responseText);
      req.access_token = token.access_token;
      //save token cache
      log.debug("New Access Token acquired.")
      lastTime = new Date();
      access_token = token.access_token;
      next();
    });
  };

  var getAssetFromBody = function (req, res, next) {
    log.debug('### Get Asset from body');
    if (req.body.length > 0) {
      try {
        // On notification, Orions gets an array of Assets
        var body = JSON.parse(req.body);
        if (body != undefined && body.data != undefined && body.data.length >= 1) {
          req.assets = body.data;
          //log.debug('Assets:', req.assets);
          log.debug('No of assets:', req.assets.length);
          next();
          return;
        } else {
          res.status(400).send('Body wrong!');
          return;
        }
      } catch (e) {
        log.error(e);
        res.status(400).send(e);
        return;
      }
    }
    res.status(400).send('Body is not allowed to be emty!');
  };

  var updateOrCreate = function (req, res, next) {
    var i = 0;
    var nextAsset = function() {
      var asset = req.assets[i];
      if(asset) {
        log.debug('Handle asset #' + i);
        //log.debug(asset);
        i++;
        updateAsset(asset, req, nextAsset);
      } else {
        log.debug('All assets handled!');
        res.status(200).send("All assets handled!");
      }
    }
    nextAsset();
  };

  var updateAsset = function(asset, req, callback) {

    log.debug('### Try to update asset');

    var asset_id = asset.id;
    var asset_type = asset.type;

    var options = {
      host: config.asset_directory_host,
      port: config.asset_directory_port,
      path: '/v2/entities/' + asset_id + '/attrs',
      method: 'POST',
      headers: proxy.getClientIp(req, req.headers)
    };

    // Add auth header
    options.headers['authorization'] = 'Bearer ' + req.access_token;

    // Remove the id and type temporarly
    delete asset.id;
    delete asset.type;

    log.info("Asset updating: " +  asset_id);

    var payload = JSON.stringify(asset);
    proxy.sendData(config.asset_directory_protocol, options, payload, undefined,
      function (status, e) {
        if (status == 201 || status == 204) {
          log.info("Asset updated: " + this.assetId);
          callback();
          return;
        }
        log.error(status);
        log.error(e);
        callback();
      }.bind({assetId: asset_id}),
      function (status, e) {

        log.debug('Update failed.');
        log.debug(e);

        // Reset the id and type
        asset.id = asset_id;
        asset.type = asset_type;

        createAsset(asset, req, callback);
      }
    );
  };

  var createAsset = function (asset, req, callback) {

    log.debug('### Try to create asset');

    // options.path = req.url + 'v2/entities/' + assetId + '?type=' + type; //not implemented yet at Orion
    var options = {
      host: config.asset_directory_host,
      port: config.asset_directory_port,
      path: '/v2/entities',
      method: 'POST',
      headers: proxy.getClientIp(req, req.headers)
    };

    // Add auth header
    options.headers['authorization'] = 'Bearer ' + req.access_token;

    log.info("Asset creating: " + asset.id);
    var payload = JSON.stringify(asset);
    proxy.sendData(config.asset_directory_protocol, options, payload, undefined,
      function (status, e) {
        if (status == 201 || status == 204) {
          log.info("Asset created: " + this.assetId);
          callback();
          return;
        }
        log.error(status);
        log.error(e);
        callback();
      }.bind({assetId: asset.id}),
      function (status, e) {
        log.error(status);
        log.error(e);
        log.error(this.asset);
        callback();
      }.bind({assetId: asset.id, asset: asset})
    );
  };

  var remove = function(req, res, next) {

    log.debug('### Remove asset');

    var options = {
      host: config.asset_directory_host,
      port: config.asset_directory_port,
      path: '/v2/entities/' + req.params.assetId,
      method: 'DELETE',
      headers: proxy.getClientIp(req, req.headers)
    };

    // Add auth header
    options.headers['authorization'] = 'Bearer ' + req.access_token;

    log.info("Asset deletion: " + req.params.assetId);
    proxy.sendData(config.asset_directory_protocol, options, undefined, res,
      function (status, e) {
        if (status == 201 || status == 204) {
          log.info("Asset deleted: " + this.assetId);
          res.status(200).send("Asset deleted:" + this.assetId);
          return;
        }
        log.error(status);
        log.error(e);
        res.status(400).send(e);
      }.bind({assetId: req.params.assetId}),
      function (status, e) {
        log.error(status);
        log.error(e);
        log.error(this.asset);
        res.status(400).send(e);
      }.bind({assetId: req.params.assetId, asset: req.asset})
    );

  }

  var chains = {
    createOrUpdate : [getAccessToken, getAssetFromBody, updateOrCreate],
    remove : [getAccessToken, remove]
  };

  //log.debug(chains);
  return chains;
})();

exports.Root = Root;
