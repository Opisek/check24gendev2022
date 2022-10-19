// Constants

const fs = require("fs");
const path = require("path");
const http = require("http");
require("dotenv").config();

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

server.set("trust proxy", "loopback, linklocal, uniquelocal");

server.get("/", function(req, res) {
    //if (authenticate(req, res)) return;

    res.render(`index`, { host: `${req.protocol}://${req.hostname}` });
    res.end();
});

server.get("/search/", function(req, res) {
    //if (authenticate(req, res)) return;

    res.render(`search`, {host: `${req.protocol}://${req.hostname}` });
    res.end();
});

/*(require('socket.io')(server)).on("connection", function(socket) {
    socket.on("authenticate", function(token) {
  
    });

    socket.emit("init", "hi");
});*/

const httpServer = http.createServer(server);
httpServer.listen(process.env.PORT);
console.log("listening on " + process.env.PORT);
