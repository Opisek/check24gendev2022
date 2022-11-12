// Web Server
const express = require("express");
const cookieParser = require("cookie-parser");
const server = express();
server.use(express.json());
server.use(express.urlencoded({extended:false}));
server.use(cookieParser());
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
    }
    
    _emit(name, data, requestId, callback = null) {
        if (!(name in this._events)) this._events = [];
        for (const listener of this._events[name]) listener(data, requestId, callback);
    }

    async _newRequest(socket, event, filters, callback = () => {}) {
        if (!(event in this._currentRequest[socket.id])) {
            this._currentRequest[socket.id][event] = null;
            this._currentRequestIndex[socket.id][event] = 0;
        }

        let requestIndex = this._currentRequestIndex[socket.id][event]++;
        let lastCurrentRequest = this._currentRequest[socket.id][event];
        this._currentRequest[socket.id][event] = requestIndex;
        setTimeout(async () => {
            if (!(socket.id in this._currentRequest) || !(event in this._currentRequest[socket.id]) || requestIndex != this._currentRequest[socket.id][event]) return;
            if (lastCurrentRequest) await this._emit("abortRequest", `${socket.id}/${event}/${lastCurrentRequest}`);
            if (requestIndex != this._currentRequest[socket.id][event]) return;
            this._emit(event, filters, `${socket.id}/${event}/${requestIndex}`, result => {
                if (!(socket.id in this._currentRequest) || !(event in this._currentRequest[socket.id]) || requestIndex != this._currentRequest[socket.id][event]) return;
                this._currentRequest[socket.id][event] = null;
                callback(result);
            });
        }, 100);
    }

    constructor(port) {
        this._events = {};
        this._currentRequest = {};
        this._currentRequestIndex = {};

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

        server.get("/account/", function(req, res) {
            //if (authenticate(req, res)) return;

            res.render("contact", { host: `${req.protocol}://${req.hostname}` });
            res.end();
        });

        server.get("/auth/", function(req, res) {
            //if (authenticate(req, res)) return;

            res.render("auth", { host: `${req.protocol}://${req.hostname}` });
            res.end();
        });

        socketio(httpServer).on("connection", socket => {
            this._currentRequest[socket.id] = {};
            this._currentRequestIndex[socket.id] = {};
            socket.on("disconnect", () => {
                delete this._currentRequest[socket.id];
                delete this._currentRequestIndex[socket.id]
            });

            socket.on("authenticate", token => {
                // not yet supported
            });

            for (const event of [
                "getHotelsByFilters",
                "getHotelsByFiltersPages",
                "getOffersByHotel",
                "getOffersByHotelPages",
                "getAirports",
                "getRooms",
                "getMeals",
                "login",
                "register",
                "recover",
                "saveHotel",
                "unsaveHotel",
                "saveOffer",
                "unsaveOffer",
            ]) socket.on(event, (data, callback) => this._newRequest(socket, event, data, callback));
        });

        httpServer.listen(port);
        console.log("listening on " + port);
    }
}