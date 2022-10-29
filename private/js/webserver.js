// Web Server
const express = require("express");
const bodyParser = require('body-parser')
const server = express();
server.use(express.json());
server.use(express.urlencoded({extended:false}));
server.set("view engine", "ejs");
const path = require("path");
const http = require("http");
const socketio = require("socket.io");

//const urlParser = require("parseurl");
//const cookieParser = require("cookie-parser");

const serverPath = __dirname;
const publicPath = path.join(serverPath + '/public');

module.exports = class WebServer {
    constructor(port) {
        server.set("views", path.join(publicPath + '/ejs'))
        server.set("/partials", path.join(publicPath + '/partials'))
        server.use("/css", express.static(path.join(publicPath + '/css')));
        server.use("/js", express.static(path.join(publicPath + '/js')));

        server.set("trust proxy", "loopback, linklocal, uniquelocal");

        const httpServer = http.createServer(server);

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

        socketio(httpServer).on("connection", socket => {
            console.log("client connected");

            socket.on("authenticate", token => {
                // not yet supported
            });

            socket.on("requestOffers", filters => {
                console.log(`offers requested:\n${JSON.stringify(filters)}`);
            });
        });


        httpServer.listen(port);
        console.log("listening on " + port);
    }
}