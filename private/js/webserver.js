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

    async _isLoggedIn(cookies) {
        return await new Promise(res => this._emit("verifyToken", { token: cookies.token }, null, id => res(id)));
    }
    _getColorScheme(cookies) {
        const colorCookie = cookies.color;
        return ["default", "dark"].includes(cookies.color) ? cookies.color : "default";
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

        server.get("/", (req, res) => {
            //if (authenticate(req, res)) return;

            res.render("index", { host: `${req.protocol}://${req.hostname}`, color: this._getColorScheme(req.cookies) });
            res.end();
        });

        server.get("/", (req, res) => {
            //if (authenticate(req, res)) return;

            res.render("index", { host: `${req.protocol}://${req.hostname}`, color: this._getColorScheme(req.cookies) });
            res.end();
        });

        server.get("/search/", (req, res) => {
            //if (authenticate(req, res)) return;

            res.render("search", { host: `${req.protocol}://${req.hostname}`, color: this._getColorScheme(req.cookies) });
            res.end();
        });

        server.get("/hotel/:hotelId", async (req, res) => {
            //if (authenticate(req, res)) return;

            const hotelName = await new Promise(res => this._emit("getHotelById", { hotelId: req.params.hotelId }, null, id => res(id)));

            res.render("hotel", { 
                host: `${req.protocol}://${req.hostname}`,
                color: this._getColorScheme(req.cookies),
                hotelId: req.params.hotelId,
                hotelName: hotelName.length == 0 ? "Invalid Hotel" : hotelName[0].name,
            });
            res.end();
        });

        server.get("/contact/", (req, res) => {
            //if (authenticate(req, res)) return;

            res.render("contact", { host: `${req.protocol}://${req.hostname}`, color: this._getColorScheme(req.cookies) });
            res.end();
        });

        server.get("/account/", async (req, res) => {
            if ((await this._isLoggedIn(req.cookies)) == null) {
                res.redirect("/auth/");
                res.end();
                return;
            }
            res.render("account", { host: `${req.protocol}://${req.hostname}`, color: this._getColorScheme(req.cookies) });
            res.end();
        });

        server.get("/auth/", async (req, res) => {
            if (await this._isLoggedIn(req.cookies) != null) {
                res.redirect("/account/");
                res.end();
                return;
            }
            res.render("auth", { host: `${req.protocol}://${req.hostname}`, color: this._getColorScheme(req.cookies) });
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
                "unsaveOffer"
            ]) socket.on(event, (data, callback) => this._newRequest(socket, event, data, callback));

            socket.on("localize", (data, callback) => this._emit("localize", data, null, callback));
        });

        httpServer.listen(port);
        console.log("listening on " + port);
    }
}