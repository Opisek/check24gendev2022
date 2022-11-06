const postgres = require("postgres");
const moment = require("moment-timezone");

const pagination = 10;
const dbPagination = 100;

module.exports = class Database {
    constructor(host, port, user, password, database) {
        this._sql = new postgres({
            host: host,
            port: port,
            username: user,
            password: password,
            database: database,
            connect_timeout: 60,
            max: 1000
        });
        this._requests = {};
    }

    async connect() {
        //await this._sql.connect();
        await this._sql`SET client_encoding='UTF8'`;
    }

    async abortRequest(requestId) {
        console.log("aborting request: " + requestId);
        if (!(requestId in this._requests)) return;
        //await this._requests[requestId].cancel(); // the library is bugged and crashes the app, turns out making my own solutions may have been worth it after all. maybe i'll revert
        delete this._requests[requestId];
    }

    async _beginRequest(query, requestId) {
        console.log("beginning request: " + requestId);
        this._requests[requestId] = query;
        let result;
        try {result = await query;} catch (e) {result = [];}
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
        let conditions = [];
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

        return await this._beginRequest(this._sql`
        SELECT hotelid, price, name
        FROM (
            SELECT hotelid, MIN(price) as price
            FROM offers
            WHERE countadults=${filters.adults}
            AND countchildren=${filters.children}
            AND price<=${filters.priceMax}
            AND price>=${filters.priceMin}
            GROUP BY hotelid
        ) AS filtered
        LEFT JOIN hotels ON filtered.hotelid=hotels.id
        WHERE stars>=${filters.starsMin}
        AND stars<=${filters.starsMax}
        LIMIT ${dbPagination}
        OFFSET ${offset}
        `, requestId);
    }
}