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

		console.log('Verify subscribtion ' + data);

		var options = {
		  host: config.orion_host,
		  port: config.orion_port,
		  path: data,
		  method: 'GET',
		  headers: {
			'Accept' : 'application/json',
			'Fiware-Service' : 'organicity'
		  }
		};

		httpClient.sendData(config.orion_protocol, options, payloadString, undefined, function (status, responseText, headers) {
			console.log('OK');
		}, function(status, resp) {
		  console.log('ERROR', status, resp);
			fs.unlinkSync(subFile); // Let's remove the file
			console.log(subFile + ' deleted!');
		});
	});

} else {
	var payloadJson = {
	  "subject": {
		"entities": [
		  {
			"idPattern": ".*",
			"type" : "*"
		  }
		],
		"condition": {
		  "attrs": []
		}
	  },
	  "notification": {
		"http": {
		  "url": config.subscription_url
		}
	  },
	  "expires": "2018-04-05T14:00:00.00Z",
	  "throttling": config.subscription_throttling
	};

	console.log('Subscribe now...');

	var payloadString = JSON.stringify(payloadJson);

	var options = {
	  host: config.orion_host,
	  port: config.orion_port,
	  path: '/v2/subscriptions',
	  method: 'POST',
	  headers: {
		'Content-Type' : 'application/json',
		'Accept' : 'application/json',
		'Fiware-Service' : 'organicity'
	  }
	};

	httpClient.sendData(config.orion_protocol, options, payloadString, undefined, function (status, responseText, headers) {
	  console.log('Successful: ' + headers.location);

		fs.writeFile(subFile, headers.location, function(err) {
			if(err) {
				return console.log(err);
			}

			console.log("Subscription saved in subscription.json!");
		});

	  console.log('Successful: ' + headers.location);
	}, function(status, resp) {
	  console.log('ERROR', status, resp);
	});
}
