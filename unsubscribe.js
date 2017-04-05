var config = require('./config');
var httpClient = require('./lib/HTTPClient.js');
var fs = require('fs');

var subFile = "./subscription.json";

var fs = require('fs');
if (fs.existsSync(subFile)) {
    console.log('Subscribtion file exists already.');

	fs.readFile(subFile, 'utf8', function (err,data) {
		if (err) {
			return console.log(err);
		}

		console.log('Unsubscribe ' + data);

		var options = {
		  host: config.orion_host,
		  port: config.orion_port,
		  path: data,
		  method: 'DELETE',
		  headers: {
			'Accept' : 'application/json',
			'Fiware-Service' : 'organicity'
		  }
		};

		httpClient.sendData(config.orion_protocol, options, undefined, undefined, function (status, responseText, headers) {
			console.log('Unsubscribe successful.');
			fs.unlinkSync(subFile);
			console.log(subFile + ' deleted!');
		}, function(status, resp) {
		  console.log('ERROR', status, resp);
			fs.unlinkSync(subFile);
			console.log(subFile + ' deleted!');
		});
	});

} else {
	console.log('Subscription does not exists.');
}
