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

const serverPath = path.resolve(__dirname, "../../");
const publicPath = path.join(serverPath + "/public");

module.exports = class WebServer {
    addEventListener(name, callback) {
        this._events[name].push(callback);
        this._socketIndex = 0;

        this._currentRequest = null;
        this._currentRequestIndex = 0;
    }
    
    _emit(name, data, requestId, callback = null) {
        for (const listener of this._events[name]) listener(data, requestId, callback);
    }

    async _newRequest(socket, event, filters, callback) {
        let requestIndex = this._currentRequestIndex++;
        let lastCurrentRequest = this._currentRequest;
        this._currentRequest = requestIndex;
        setTimeout(async () => {
            if (requestIndex != this._currentRequest) return;
            if (lastCurrentRequest) await this._emit("abortRequest", `${socket.id}/${lastCurrentRequest}`);
            if (requestIndex != this._currentRequest) return;
            this._emit(event, filters, `${socket.id}/${requestIndex}`, result => {
                if (requestIndex != this._currentRequest) return;
                this._currentRequest = null;
                callback(result);
            });
        }, 100);
    }

    constructor(port) {
        this._events = {"getHotelsByFilters":[], "getOffersByHotel":[], "abortRequest":[]};

        server.set("views", path.join(publicPath + '/ejs'))
        server.set("/partials", path.join(publicPath + '/partials'))
        server.use(express.static(path.join(publicPath)));

        server.set("trust proxy", "loopback, linklocal, uniquelocal");

        const httpServer = http.createServer(server);

        server.get("/", function(req, res) {
            //if (authenticate(req, res)) return;

            res.render("index", { host: `${req.protocol}://${req.hostname}` });
            res.end();
        });

        server.get("/search/", function(req, res) {
            //if (authenticate(req, res)) return;

            res.render("search", { host: `${req.protocol}://${req.hostname}` });
            res.end();
        });

        server.get("/hotel/:hotelId", function(req, res) {
            //if (authenticate(req, res)) return;

            res.render("hotel", { host: `${req.protocol}://${req.hostname}`, hotelId: req.params.hotelId });
            res.end();
        });

        server.get("/contact/", function(req, res) {
            //if (authenticate(req, res)) return;

            res.render("contact", { host: `${req.protocol}://${req.hostname}` });
            res.end();
        });

        socketio(httpServer).on("connection", socket => {
            socket.on("authenticate", token => {
                // not yet supported
            });

            socket.on("getHotelsByFilters", (filters, callback) => this._newRequest(socket, "getHotelsByFilters", filters, callback));
            socket.on("getOffersByHotel", (filters, callback) => this._newRequest(socket, "getOffersByHotel", filters, callback));
        });


        httpServer.listen(port);
        console.log("listening on " + port);
    }
}