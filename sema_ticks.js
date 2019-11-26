const broadcastAddress = require('broadcast-address');
const chalk = require('chalk');

console.log("Sema_ticks")

var args = process.argv.slice(2);


var PORT = 7243;
var netInterface = args.length > 1 ? args[1] : "en0"
var BROADCAST_ADDR = broadcastAddress(netInterface);
var dgram = require('dgram');
var server = dgram.createSocket("udp4");
var hellomessage = Buffer.from("hi i'm " + args[0] + ".");
var hiRegex = /hi i'm [A-Za-z0-9]+\./;

server.bind(function() {
    server.setBroadcast(true);
    setInterval(broadcastNew, 1000);
});

function broadcastNew() {
    server.send(hellomessage, 0, hellomessage.length, PORT, BROADCAST_ADDR, function() {
        console.log("Sent '" + hellomessage + "'");
    });
}


var client = dgram.createSocket('udp4');

client.on('listening', function () {
    var address = client.address();
    console.log('UDP Client listening on ' + address.address + ":" + address.port);
    client.setBroadcast(true);
});

client.on('message', function (message, rinfo) {
    console.log('Message from: ' + rinfo.address + ':' + rinfo.port +' - ' + message);
    var match = message.toString().match(hiRegex);
    var clockName = match[0].substr(7,match[0].length-8);
    if (match != null) {
      console.log("message match: " + clockName );
    }
});

client.bind(PORT);
