const broadcastAddress = require('broadcast-address');
const chalk = require('chalk');
const websocket = require("ws");

const timeout = 10;

let id = 0;

console.log("Sema_ticks")

var args = process.argv.slice(2);
var machineName = args[0];

var peers = {};
var wsclient = null;

var PORT = 7243;
var netInterface = args.length > 1 ? args[1] : "en0"
var BROADCAST_ADDR = broadcastAddress(netInterface);
var dgram = require('dgram');
var udpserver = dgram.createSocket({
  type: "udp4",
  reuseAddr: true
});
// var hiRegex = /hi i'm [A-Za-z0-9]+\./;


////broadcast

udpserver.bind(function() {
  udpserver.setBroadcast(true);
  setInterval(broadcastNew, 1000);
});

function broadcastNew() {
  // var hellomessage = Buffer.from("hi i'm " + p + ".");
  var hellomessage = JSON.stringify({
    c: "hi",
    "data": machineName
  });
  udpserver.send(hellomessage, 0, hellomessage.length, PORT, BROADCAST_ADDR, function() {
    console.log("Sent '" + hellomessage + "'");
  });
  for (p in peers) {
    console.log(chalk.green(p + "(" + peers[p].timeout + ", " + peers[p].remote + ")"));
    peers[p].timeout = peers[p].timeout - 1;
    // if (peers[p].remote == 0) {
    // } else {
    //timeout for remote peers done here
    if (peers[p].timeout <= 0) {
      delete peers[p];
    }
    // }
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
  msgdata = JSON.parse(message);
  // let match = message.toString().match(hiRegex);
  if (msgdata.c == "hi") {
    // let clockName = match[0].substr(7, match[0].length - 8);
    let clockName = msgdata.data;
    console.log("clock name: " + clockName);
    if (clockName in peers) {
      if (peers[clockName].remote) {
        peers[clockName].timeout = timeout;
      } else {
        if (peers[clockName].timeout <= 0) {
          delete peers[clockName];
        }
      }
    } else {
      peers[clockName] = {
        "timeout": timeout,
        "remote": 1
      }; //timeout in secs
    }
  } else if (msgdata.c == "p") {
    if (msgdata.id != machineName) {
      // console.log("phase in");
      // console.log(wsclient);
      if (wsclient != null) {
        console.log("phase send")
        let phasedata = {
          "r": "o",
          "v": 0,
          "i": 1
        };
        wsclient.send(JSON.stringify(phasedata));
      }
    }
  }
});

client.bind(PORT);





//sema comms

var wss = new websocket.Server({
  port: 8089
});

wss.on('connection', function(socket, req) {
  console.log("Connection from Sema");
  wsclient = socket;
  socket.on('message', function incoming(message) {
    console.log(chalk.magenta('received:' + message));
    try {
      let request = JSON.parse(message);
      console.log(request);
      switch (request.c) {
        // case "i":
        //   let idresponse = {
        //     "r": "i",
        //     "n": id++
        //   };
        //   console.log(idresponse);
        //   socket.send(JSON.stringify(idresponse));
        //   idname = machineName + idresponse.n;
        //   // peers[idname] = {
        //   //   "timeout": timeout,
        //   //   "remote": 0,
        //   //   "wssocket":socket
        //   // }; //timeout in secs
        //   wsclient = socket;
        //   break;
        case "q":
          let peerresponse = {
            "r": "p",
            "n": Object.keys(peers).length
          };
          console.log(peerresponse);
          socket.send(JSON.stringify(peerresponse));
          break;
        // case "h":
        //   //ping
        //   // idname = machineName + request.i;
        //   // peers[idname].timeout = timeout;
        //   console.log("ping: " + idname);
        //   break;
        case "o":
          //phase
          idname = machineName + request.i;
          // console.log("phase: " + request.p);
          let msg = JSON.stringify({
            c: "p",
            id: machineName,
            p: request.p
          });
          //set out over udp broadcast
          udpserver.send(msg, 0, msg.length, PORT, BROADCAST_ADDR);
          break;
      }
    } catch (e) {
      //ignore
    }

  });

});
