const postgress = require("pg");
const moment = require("moment-timezone");

const pagination = 10;
const dbPagination = 100;

module.exports = class Database {
    constructor(host, port, user, password, database) {
        this._sql = new postgress.Pool({
            host: host,
            port: port,
            user: user,
            password: password,
            database: database
        });
        this._requests = {};
    }

    async connect() {
        await this._sql.connect();
        await this._sql.query("SET client_encoding='UTF8'");
    }

    async abortRequest(requestId) {
        console.log("aborting request: " + requestId);
        if (!(requestId in this._requests)) return;
        // TODO: more proper aborting, perhaps find a more suitable library
        let request = this._requests[requestId];
        let runningProcesses = await this._sql.query(`SELECT pid, backend_start FROM pg_stat_activity WHERE state='active' AND query=$1`, [request[0]]);
        let lowestDelta = Number.MAX_VALUE;
        let lowestPID = null;
        for (let entry of runningProcesses.rows) {
            let currentDelta = new Date(entry.backend_start) - request[1];
            if (currentDelta > 0 && currentDelta < lowestDelta) {
                lowestDelta = currentDelta;
                lowestPID = entry.pid;
            }
        }
        this._sql.query(`SELECT pg_cancel_backend($1)`, [lowestPID]);
        delete this._requests[requestId];
    }

    async _beginRequest(query, parameters, requestId) {
        console.log("beginning request: " + requestId);
        this._requests[requestId] = [query, Date.now()];

        let result;
        try {
            result = (await this._sql.query(query, parameters)).rows;
        } catch (e) {
            result = [];
        }

        delete this._requests[requestId];
    
        return result;
    }

    async offersRequest(filters) {
        let query = "SELECT * FROM offers INNER JOIN hotels ON offers.hotelid=hotels.id";

        let conditions = [];
        let paramaters = [];
        if ("adults" in filters && !Number.isNaN(Number.parseInt(filters.adults))) {
            conditions.push(`countadults=$${conditions.length+1}`);
            paramaters.push(filters.adults);
        }
        if ("children" in filters && !Number.isNaN(Number.parseInt(filters.children))) {
            conditions.push(`countchildren=$${conditions.length+1}`);
            paramaters.push(filters.children);
        }
        if ("priceMin" in filters && !Number.isNaN(Number.parseInt(filters.priceMin))) {
            conditions.push(`price>=$${conditions.length+1}`);
            paramaters.push(filters.priceMin);
        }
        if ("priceMax" in filters && !Number.isNaN(Number.parseInt(filters.priceMax))) {
            conditions.push(`price<=$${conditions.length+1}`);
            paramaters.push(filters.priceMax);
        }
        if ("starsMin" in filters && !Number.isNaN(Number.parseFloat(filters.starsMin))) {
            conditions.push(`stars>=$${conditions.length+1}`);
            paramaters.push(filters.starsMin);
        }
        if ("starsMax" in filters && !Number.isNaN(Number.parseFloat(filters.starsMax))) {
            conditions.push(`stars<=$${conditions.length+1}`);
            paramaters.push(filters.starsMax);
        }

        let page = 1;
        if ("page" in filters && !Number.isNaN(Number.parseInt(filters.page)) && filters.page > 0) page = filters.page;

        if (conditions.length != 0) query += ` WHERE ${conditions.join(" AND ")}`;

        query += ` LIMIT ${pagination} OFFSET ${(page - 1) * pagination}`; // in real life one should consider cursor instead limit and offset

        let result = await this._sql.query(query, paramaters);

        return result;
    }

    async getHotelsByFilters(filters, requestId) {
        let conditions = [];
        let paramaters = [];
        if ("adults" in filters && !Number.isNaN(Number.parseInt(filters.adults))) {
            conditions.push(`countadults=$${conditions.length+1}`);
            paramaters.push(filters.adults);
        }
        if ("children" in filters && !Number.isNaN(Number.parseInt(filters.children))) {
            conditions.push(`countchildren=$${conditions.length+1}`);
            paramaters.push(filters.children);
        }
        if ("priceMin" in filters && !Number.isNaN(Number.parseInt(filters.priceMin))) {
            conditions.push(`price>=$${conditions.length+1}`);
            paramaters.push(filters.priceMin);
        }
        if ("priceMax" in filters && !Number.isNaN(Number.parseInt(filters.priceMax))) {
            conditions.push(`price<=$${conditions.length+1}`);
            paramaters.push(filters.priceMax);
        }
        if ("starsMin" in filters && !Number.isNaN(Number.parseFloat(filters.starsMin))) {
            conditions.push(`stars>=$${conditions.length+1}`);
            paramaters.push(filters.starsMin);
        }
        if ("starsMax" in filters && !Number.isNaN(Number.parseFloat(filters.starsMax))) {
            conditions.push(`stars<=$${conditions.length+1}`);
            paramaters.push(filters.starsMax);
        }

        let offset = 1;
        if ("page" in filters && !Number.isNaN(Number.parseInt(filters.page)) && filters.page > 0) offset = filters.page;
        offset = (offset - 1) * pagination;
        offset -= offset % dbPagination;
        
        let query = `SELECT hotelid, price, name FROM (SELECT hotelid, MIN(price) as price FROM offers INNER JOIN hotels ON offers.hotelid=hotels.id${conditions.length == 0 ? '' : ` WHERE ${conditions.join(" AND ")}`} GROUP BY hotelid LIMIT ${dbPagination} OFFSET ${offset}) AS filtered LEFT JOIN hotels ON filtered.hotelid=hotels.id`;

        return await this._beginRequest(query, paramaters, requestId);

        // SELECT hotelid, price, name FROM (SELECT hotelid, MIN(price) as price FROM offers WHERE countadults=2 AND countchildren=0 AND price < 1000 GROUP BY hotelid LIMIT 100) AS filtered LEFT JOIN hotels ON filtered.hotelid=hotels.id;
    }
}