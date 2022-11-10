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
        return await this._hotelsByFilters(filters, requestId, ["hotelid", "price", "amount", "name", "stars"]);
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
    
    async getAirports(filters, requestId) {
        return await this._beginRequest(`
            SELECT *
            FROM airports
            ORDER BY name
        `,
        [],
        requestId);
    }

    async getRooms(filters, requestId) {
        return await this._beginRequest(`
            SELECT *
            FROM rooms
            ORDER BY id
        `,
        [],
        requestId);
    }

    async getMeals(filters, requestId) {
        return await this._beginRequest(`
            SELECT *
            FROM meals
            ORDER BY id
        `,
        [],
        requestId);
    }

    async _hotelsByFilters(filters, requestId, columns, limit=true) {
        this._parseFilters(filters);

        let offset = 1;
        if ("page" in filters && !Number.isNaN(Number.parseInt(filters.page)) && filters.page > 0) offset = filters.page;
        offset = (offset - 1) * pagination;
        offset -= offset % dbPagination;

        let parameters = [filters.priceMax, filters.priceMin, filters.starsMin, filters.starsMax];
        let paramCount = parameters.length;
        let query = `
            SELECT ${columns.join(", ")}
            FROM (
                SELECT hotelid, MIN(price) AS price, COUNT(*) AS amount
                FROM offers_${filters.adults}_${filters.children}
                WHERE price<=$1
                AND price>=$2
                ${filters.departureDate ? `AND departuredate>=$${++paramCount}` : ''}
                ${filters.departureDate ? `AND returnDate<=$${++paramCount}` : ''}
                ${filters.airport ? `AND outbounddepartureairport=$${++paramCount}` : ''}
                ${filters.room ? `AND roomtype=$${++paramCount}` : ''}
                ${filters.meal ? `AND mealtype=$${++paramCount}` : ''}
                GROUP BY hotelid
            ) AS filtered
            INNER JOIN hotels ON filtered.hotelid=hotels.id
            WHERE stars>=$3
            AND stars<=$4
            ${filters.query ? `AND POSITION($${++paramCount} IN name)>0` : ''}
            ${limit ? `ORDER BY ${filters.sort} LIMIT ${dbPagination} OFFSET ${offset}` : ""}
        `;

        for (let key of ["departureDate", "returnDate", "airport", "room", "meal", "query"]) if (filters[key]) parameters.push(filters[key]);

        return await this._beginRequest(query, parameters, requestId);
    }

    async _offersByHotel(filters, requestId, columns, limit=true) {
        this._parseFilters(filters);

        let offset = 1;
        if ("page" in filters && !Number.isNaN(Number.parseInt(filters.page)) && filters.page > 0) offset = filters.page;
        offset = (offset - 1) * pagination;
        offset -= offset % dbPagination;

        let parameters = [filters.hotelid, filters.priceMax, filters.priceMin];
        let paramCount = parameters.length;
        let query = `
            SELECT ${columns.join(", ")}
            FROM offers_${filters.adults}_${filters.children}
            WHERE hotelid=$1
            AND price<=$2
            AND price>=$3
            ${filters.departureDate ? `AND departuredate>=$${++paramCount}` : ''}
            ${filters.departureDate ? `AND returnDate<=$${++paramCount}` : ''}
            ${filters.airport ? `AND outbounddepartureairport=$${++paramCount}` : ''}
            ${filters.room ? `AND roomtype=$${++paramCount}` : ''}
            ${filters.meal ? `AND mealtype=$${++paramCount}` : ''}
            ${limit ? `ORDER BY ${filters.sort} LIMIT ${dbPagination} OFFSET ${offset}` : ""}
        `;

        for (let key of ["departureDate", "returnDate", "airport", "room", "meal"]) if (filters[key]) parameters.push(filters[key]);

        return await this._beginRequest(query, parameters, requestId);
    }

    _parseFilters(filters) {
        if (!("query" in filters) || filters.query == '' || "Mallorca".includes(filters.query)) filters.query = null;
        if (!("adults" in filters) || Number.isNaN(Number.parseInt(filters.adults))) filters.adults = 1;
        if (!("children" in filters) || Number.isNaN(Number.parseInt(filters.children))) filters.children = 0;
        if (!("priceMin" in filters) || Number.isNaN(Number.parseInt(filters.priceMin))) filters.priceMin = 0;
        if (!("priceMax" in filters) || Number.isNaN(Number.parseInt(filters.priceMax))) filters.priceMax = 10000;
        if (!("starsMin" in filters) || Number.isNaN(Number.parseFloat(filters.starsMin))) filters.starsMin = 1;
        if (!("starsMax" in filters) || Number.isNaN(Number.parseFloat(filters.starsMax))) filters.starsMax = 5;
        if (!("departureDate" in filters) || filters.departureDate == '' || Number.isNaN(new Date(filters.departureDate))) filters.departureDate = null;
        if (!("returnDate" in filters) || filters.returnDate == '' || Number.isNaN(new Date(filters.returnDate))) filters.returnDate = null;
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
            case "depAsc":
                filters.sort = "departureDate ASC";
                break;
            case "depDesc":
                filters.sort = "departureDate DESC";
                break;
            case "retAsc":
                filters.sort = "returnDate ASC";
                break;
            case "retDesc":
                filters.sort = "returnDate DESC";
                break;
        }
        if (!("airport" in filters) || filters.airport == "Any") filters.airport = null;
        if (!("room" in filters) || filters.room == "Any") filters.room = null;
        if (!("meal" in filters) || filters.meal == "Any") filters.meal = null;
    }
}