const broadcastAddress = require('broadcast-address');
const chalk = require('chalk');
const websocket = require("ws");

const timeout = 10;

let id=0;

console.log("Sema_ticks")

var args = process.argv.slice(2);

var peers = {};

var PORT = 7243;
var netInterface = args.length > 1 ? args[1] : "en0"
var BROADCAST_ADDR = broadcastAddress(netInterface);
var dgram = require('dgram');
var server = dgram.createSocket({
  type: "udp4",
  reuseAddr: true
}); //todo: shared socket https://nodejs.org/api/dgram.html addMembership
var hiRegex = /hi i'm [A-Za-z0-9]+\./;

////broadcast

server.bind(function() {
  server.setBroadcast(true);
  setInterval(broadcastNew, 1000);
});

function broadcastNew() {
  var hellomessage = Buffer.from("hi i'm " + args[0] + ".");
  server.send(hellomessage, 0, hellomessage.length, PORT, BROADCAST_ADDR, function() {
    console.log("Sent '" + hellomessage + "'");
  });
  for (p in peers) {
    console.log(chalk.green(p + "(" + peers[p].timeout+ ", "+ peers[p].remote + ")"));
    peers[p].timeout = peers[p].timeout - 1;
    if (peers[p].timeout == 0) {
      delete peers[p];
    }
  }
}

//listener

var client = dgram.createSocket({
  type: "udp4",
  reuseAddr: true
});

client.on('listening', function() {
  var address = client.address();
  console.log('UDP Client listening on ' + address.address + ":" + address.port);
  client.setBroadcast(true);
});

client.on('message', function(message, rinfo) {
  console.log('Message from: ' + rinfo.address + ':' + rinfo.port + ' - ' + message);
  var match = message.toString().match(hiRegex);
  var clockName = match[0].substr(7, match[0].length - 8);
  if (match != null) {
    // console.log("message match: " + clockName);
    peers[clockName] = {"timeout":timeout, "remote":1}; //timeout in secs
  }
});

client.bind(PORT);

//sema comms

var wss = new websocket.Server({
  port: 8089
});

wss.on('connection', function(socket, req) {
  console.log("Connection from Sema");

  socket.on('message', function incoming(message) {
    console.log(chalk.magenta('received:' + message));
    try {
      let request = JSON.parse(message);
      console.log(request);
      switch(request.c) {
        case "i":
          let idresponse = {"r":"i", "n":id++};
          console.log(idresponse);
          socket.send(JSON.stringify(idresponse));
          idname = clockName + idresponse.n;
          peers[idname] = {"timeout":timeout, "remote":0}; //timeout in secs

          break;
        case "q":
          let peerresponse = {"r":"p", "n":Object.keys(peers).length};
          console.log(peerresponse);
          socket.send(JSON.stringify(peerresponse));
          break;
      }
    } catch (e) {
      //ignore
    }

  });

});
