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
        //try {await this._requests[requestId].cancel();} catch(e) {}
        delete this._requests[requestId];
    }

    async _beginRequest(query, parameters, requestId) {
        console.log("beginning request: " + requestId);
        const request = this._sql.query(query, parameters);
        this._requests[requestId] = request;
        let result;
        try {result = (await request).rows} catch (e) {
            result = [];
            console.error(e);
        }
        delete this._requests[requestId];
        return result;
    }

    async getHotelsByFilters(filters, requestId) {
        return await this._hotelsByFilters(filters, requestId, ["hotelid", "price", "name", "stars"]);
    }

    async getHotelsByFiltersPages(filters, requestId) {
        return await this._hotelsByFilters(filters, requestId, ["COUNT(*)"], false);
    }

    async getOffersByHotel(filters, requestId) {
        return await this._offersByHotel(filters, requestId, ["id", "departuredate", "returndate", "countadults", "countchildren", "price", "inbounddepartureairport", "inboundarrivalairport", "inboundairline", "inboundarrivaldatetime", "outbounddepartureairport", "outbounddepartureairport", "outboundarrivalairport", "outboundairline", "outboundarrivaldatetime", "mealtype", "oceanview", "roomtype"]);
    }

    async getOffersByHotelPages(filters, requestId) {
        return await this._offersByHotel(filters, requestId, ["COUNT(*)"], false);
    }

    async _hotelsByFilters(filters, requestId, columns, limit=true) {
        this._parseFilters(filters);

        let offset = 1;
        if ("page" in filters && !Number.isNaN(Number.parseInt(filters.page)) && filters.page > 0) offset = filters.page;
        offset = (offset - 1) * pagination;
        offset -= offset % dbPagination;

        return await this._beginRequest(`
            SELECT ${columns.join(", ")}
            FROM (
                SELECT hotelid, MIN(price) as price
                FROM offers
                WHERE countadults=$1
                AND countchildren=$2
                AND price<=$3
                AND price>=$4
                AND departuredate>=$5
                AND returndate<=$6
                GROUP BY hotelid
            ) AS filtered
            INNER JOIN hotels ON filtered.hotelid=hotels.id
            WHERE stars>=$7
            AND stars<=$8
            ${limit ? `ORDER BY ${filters.sort} LIMIT ${dbPagination} OFFSET ${offset}` : ""}
        `,
        [filters.adults, filters.children, filters.priceMax, filters.priceMin, filters.departureDate, filters.returnDate, filters.starsMin, filters.starsMax],
        requestId);
    }

    async _offersByHotel(filters, requestId, columns, limit=true) {
        this._parseFilters(filters);

        let offset = 1;
        if ("page" in filters && !Number.isNaN(Number.parseInt(filters.page)) && filters.page > 0) offset = filters.page;
        offset = (offset - 1) * pagination;
        offset -= offset % dbPagination;

        return await this._beginRequest(`
            SELECT ${columns.join(", ")}
            FROM offers
            WHERE hotelid=$1
            AND countadults=$2
            AND countchildren=$3
            AND price<=$4
            AND price>=$5
            AND departuredate>=$6
            AND returndate<=$7
            ${limit ? `ORDER BY ${filters.sort} LIMIT ${dbPagination} OFFSET ${offset}` : ""}
        `,
        [filters.hotelid, filters.adults, filters.children, filters.priceMax, filters.priceMin, filters.departureDate, filters.returnDate],
        requestId);
    }

    _parseFilters(filters) {
        if (!("adults" in filters && !Number.isNaN(Number.parseInt(filters.adults)))) filters.adults = 1;
        if (!("children" in filters && !Number.isNaN(Number.parseInt(filters.children)))) filters.children = 0;
        if (!("priceMin" in filters && !Number.isNaN(Number.parseInt(filters.priceMin)))) filters.priceMin = 0;
        if (!("priceMax" in filters && !Number.isNaN(Number.parseInt(filters.priceMax)))) filters.priceMax = 10000;
        if (!("starsMin" in filters && !Number.isNaN(Number.parseFloat(filters.starsMin)))) filters.starsMin = 1;
        if (!("starsMax" in filters && !Number.isNaN(Number.parseFloat(filters.starsMax)))) filters.starsMax = 5;
        if (!("departureDate" in filters && filters.departureDate != '0' && !Number.isNaN(new Date(filters.departureDate)))) filters.departureDate = new Date().toISOString();
        if (!("returnDate" in filters && filters.returnDate != '0' && !Number.isNaN(new Date(filters.returnDate)))) {
            let returnDate = new Date();
            returnDate.setFullYear(returnDate.getFullYear() + 1);
            filters.returnDate = returnDate.toISOString();
        }
        switch (filters.sort) {
            default:
            case "priceAsc":
                filters.sort = "price ASC";
                break;
            case "priceDesc":
                filters.sort = "price DESC";
                break;
            case "alphAsc":
                filters.sort = "name ASC";
                break;
            case "alphDesc":
                filters.sort = "name DESC";
                break;
            case "starsAsc":
                filters.sort = "stars ASC";
                break;
            case "starsDesc":
                filters.sort = "stars DESC";
                break;
        }
    }
}