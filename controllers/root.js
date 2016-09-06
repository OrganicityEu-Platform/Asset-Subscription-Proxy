var config = require('./../config.js'),
    proxy = require('./../lib/HTTPClient.js');
var log = require('./../lib/logger').logger.getLogger("Organicity-subscription-proxy");

var Root = (function () {
    var pep = function (req, res) {
        var options = {
            host: config.asset_directory_host,
            port: config.asset_directory_port,
            path: req.url + 'v2/entities/',
            method: req.method,
            headers: proxy.getClientIp(req, req.headers)
        };
        if (req.body.length > 0) {
            //log.info(req.body.toString());
            var assets;

            try {
                assets = JSON.parse(req.body);
            } catch (e) {
                log.error(e);
                res.send(400, e);
            }
            if (assets != undefined && assets.data != undefined && assets.data.length >= 1) {
                for (var i = 0; i < assets.data.length; i++) {
                    var asset = assets.data[i];
                    var type = asset.type;
                    var assetId = asset.id;
                    updateAsset(options, asset, res, req, assetId, type);
                }
            }
        } else {
            res.send(400, "No Asset Info");
        }
        return;
    }

    var updateAsset = function (options, asset, res, req, assetId, type) {
        options.path = req.url + 'v2/entities/' + assetId + '/attrs';
        // options.path = req.url + 'v2/entities/' + assetId + '?type=' + type; //not implemented yet at Orion
        options.method = 'POST';
        log.info("Asset Creating:" + assetId);
        delete asset.id;
        delete asset.type;
        var payload = JSON.stringify(asset);
        proxy.sendData('http', options, payload, res,
            function (status, e) {
                if (status == 201 || status == 204) {
                    log.info("Asset Updated:" + this.assetId);
                    res.send(200, "Asset Updated:" + this.assetId);
                    return;
                }
                log.error(status);
                log.error(e);
                res.send(400, e);
                return;
            }.bind({assetId: assetId}),
            function (status, e) {
                if (status == 201 || status == 204) {
                    log.info("Asset Updated:");
                    res.send(200, "Asset Updated");
                    return;
                } else if (status == 404) {
                    this.asset.id = this.assetId;
                    this.asset.type = this.type;
                    this.options.path=this.req.url + 'v2/entities/';
                    var payload = JSON.stringify(asset);
                    proxy.sendData('http', this.options, payload, this.res,
                        function (status, e) {
                            if (status == 201 || status == 204) {
                                log.info("Asset Created:" + this.assetId);
                                res.send(200, "Asset Created:" + this.assetId);
                                return;
                            }
                            log.error(status);
                            log.error(e);
                            res.send(400, e);
                            return;
                        }.bind({assetId: assetId}),
                        function (status, e) {
                            if (status == 201 || status == 204) {
                                log.info("Asset Created:");
                                res.send(200, "Asset Created");
                                return;
                            } else if (status == 404) {
                                this.asset.id = this.assetId;
                                this.asset.type = this.type;

                            }
                            log.error(status);
                            log.error(e);
                            log.error(this.asset);
                            res.send(400, e);
                            return;
                        }.bind({assetId: assetId, asset: asset, type: type, options: options, res: res, req:req})
                    );
                }
                log.error(status);
                log.error(e);
                log.error(this.asset);
                res.send(400, e);
                return;
            }.bind({assetId: assetId, asset: asset, type: type, options: options, res: res, req:req})
        );
        return
    }

    return {
        pep: pep
    }
})();

exports.Root = Root;