// Constants

const fs = require("fs");
const path = require("path");
const http = require("http");

const useHttps = true;
const host = "test.opisek.ddnsgeek.com";
const localPort = 8084;
const publicPort = 443;

const httpProtocol = useHttps ? "https" : "http";
const socketProtocol = useHttps ? "wss" : "ws";

// Web Server
const express = require("express");
const bodyParser = require('body-parser')
const server = express();
server.use(express.json());
server.use(express.urlencoded({extended:false}));
server.set("view engine", "ejs");

const urlParser = require("parseurl");
const cookieParser = require("cookie-parser");

const serverPath = __dirname;
const publicPath = path.join(serverPath + '/public');
server.set("views", path.join(publicPath + '/ejs'))
server.set("/partials", path.join(publicPath + '/partials'))
server.use("/css", express.static(path.join(publicPath + '/css')));
server.use("/js", express.static(path.join(publicPath + '/js')));

server.get("/", function(req, res) {
    //if (authenticate(req, res)) return;

    res.render(`index`, {host: `https://${host}`});
    res.end();
});

server.get("/search/", function(req, res) {
    //if (authenticate(req, res)) return;

    res.render(`search`, {host: `https://${host}`});
    res.end();
});

/*(require('socket.io')(server)).on("connection", function(socket) {
    socket.on("authenticate", function(token) {
  
    });

    socket.emit("init", "hi");
});*/

const httpServer = http.createServer(server);
httpServer.listen(localPort);
console.log("listening on " + localPort);
