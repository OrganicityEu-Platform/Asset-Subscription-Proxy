var config = require('./config');
var httpClient = require('./lib/HTTPClient.js');

var payloadJson = {
  "subject": {
    "entities": [
      {
        "idPattern": ".*",
        "type" : ""
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

var payloadString = JSON.stringify(payloadJson);

var options = {
  host: config.orion_host, // 31.200.243.82
  port: config.orion_port,
  path: '/v2/subscriptions',
  method: 'POST',
  headers: {
    'Content-Type' : 'application/json',
    'Accept' : 'application/json',
    'Fiware-Service' : 'organicity'
  }
};

console.log('Subscribe now...');

httpClient.sendData(config.orion_protocol, options, payloadString, undefined, function (status, responseText, headers) {
  console.log('Successful: ' + headers.location);
}, function(status, resp) {
  console.log('ERROR', status, resp);
});
