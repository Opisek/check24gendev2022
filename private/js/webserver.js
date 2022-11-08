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
        if (!(name in this._events)) this._events[name] = [];
        this._events[name].push(callback);
        this._socketIndex = 0;

        this._currentRequest = {};
        this._currentRequestIndex = {};
    }
    
    _emit(name, data, requestId, callback = null) {
        if (!(name in this._events)) this._events = [];
        for (const listener of this._events[name]) listener(data, requestId, callback);
    }

    async _newRequest(socket, event, filters, callback) {
        if (!(event in this._currentRequest)) {
            this._currentRequest[event] = null;
            this._currentRequestIndex[event] = 0;
        }

        let requestIndex = this._currentRequestIndex[event]++;
        let lastCurrentRequest = this._currentRequest[event];
        this._currentRequest[event] = requestIndex;
        setTimeout(async () => {
            if (requestIndex != this._currentRequest[event]) return;
            if (lastCurrentRequest) await this._emit("abortRequest", `${socket.id}/${event}/${lastCurrentRequest}`);
            if (requestIndex != this._currentRequest[event]) return;
            this._emit(event, filters, `${socket.id}/${event}/${requestIndex}`, result => {
                if (requestIndex != this._currentRequest[event]) return;
                this._currentRequest[event] = null;
                callback(result);
            });
        }, 100);
    }

    constructor(port) {
        this._events = {};

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
            socket.on("getHotelsByFiltersPages", (filters, callback) => this._newRequest(socket, "getHotelsByFiltersPages", filters, callback));
            socket.on("getOffersByHotel", (filters, callback) => this._newRequest(socket, "getOffersByHotel", filters, callback));
            socket.on("getOffersByHotelPages", (filters, callback) => this._newRequest(socket, "getOffersByHotelPages", filters, callback));
            socket.on("getAirports", (filters, callback) => this._newRequest(socket, "getAirports", filters, callback));
        });


        httpServer.listen(port);
        console.log("listening on " + port);
    }
}