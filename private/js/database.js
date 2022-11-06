const postgres = require("pg");
const moment = require("moment-timezone");

const pagination = 10;
const dbPagination = 100;

module.exports = class Database {
    constructor(host, port, user, password, database) {
        this._sql = new postgres.Client({
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
        await this._sql.query(`SET client_encoding='UTF8'`);
    }

    async abortRequest(requestId) {
        console.log("aborting request: " + requestId);
        if (!(requestId in this._requests)) return;
        console.log(this._requests[requestId]);
        //try {await this._requests[requestId].cancel();} catch(e) {} // the library is bugged and crashes the app, turns out making my own solutions may have been worth it after all. maybe i'll revert
        delete this._requests[requestId];
    }

    async _beginRequest(query, parameters, requestId) {
        console.log("beginning request: " + requestId);
        const request = this._sql.query(query, parameters);
        this._requests[requestId] = request;
        let result;
        try {result = (await request).rows} catch (e) {result = [];}
        delete this._requests[requestId];
        return result;
    }

    async offersRequest(filters) {
        let query = `SELECT * FROM offers INNER JOIN hotels ON offers.hotelid=hotels.id`;

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
        if (!("adults" in filters && !Number.isNaN(Number.parseInt(filters.adults)))) filters.adults = 1;
        if (!("children" in filters && !Number.isNaN(Number.parseInt(filters.children)))) filters.children = 0;
        if (!("priceMin" in filters && !Number.isNaN(Number.parseInt(filters.priceMin)))) filters.priceMin = 0;
        if (!("priceMax" in filters && !Number.isNaN(Number.parseInt(filters.priceMax)))) filters.priceMax = 10000;
        if (!("starsMin" in filters && !Number.isNaN(Number.parseFloat(filters.starsMin)))) filters.starsMin = 1;
        if (!("starsMax" in filters && !Number.isNaN(Number.parseFloat(filters.starsMax)))) filters.starsMax = 5;

        let offset = 1;
        if ("page" in filters && !Number.isNaN(Number.parseInt(filters.page)) && filters.page > 0) offset = filters.page;
        offset = (offset - 1) * pagination;
        offset -= offset % dbPagination;

        return await this._beginRequest(`
        SELECT hotelid, price, name
        FROM (
            SELECT hotelid, MIN(price) as price
            FROM offers
            WHERE countadults=$1
            AND countchildren=$2
            AND price<=$3
            AND price>=$4
            GROUP BY hotelid
        ) AS filtered
        LEFT JOIN hotels ON filtered.hotelid=hotels.id
        WHERE stars>=$5
        AND stars<=$6
        LIMIT $7
        OFFSET $8
        `,
        [filters.adults, filters.children, filters.priceMax, filters.priceMin, filters.starsMin, filters.starsMax, dbPagination, offset],
        requestId);
    }
}