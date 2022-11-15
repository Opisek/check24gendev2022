const postgres = require("pg");
const moment = require("moment-timezone");

const pagination = 10;
const dbPagination = 100;

module.exports = class Database {
    constructor(host, port, user, password, database) {
        this._sql = new postgres.Pool({
            host: host,
            port: port,
            user: user,
            password: password,
            database: database
        });
        this._requests = {};
    }


    async connect() {
        try {
            await this._sql.connect();
            await this._sql.query(`SET client_encoding='UTF8'`);
            return true;
        } catch(e) {
            console.error(`Could not connect to database: ${e}`);
            return false;
        }
    }

    async abortRequest(requestId) {
        console.log("Aborting request: " + requestId);
        if (!(requestId in this._requests)) return;
        //try {await this._requests[requestId].cancel();} catch(e) {}
        delete this._requests[requestId];
    }

    async _beginRequest(query, parameters, requestId) {
        console.log("Beginning request: " + requestId);
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
        let rows = ["filtered.hotelid", "price", "amount", "name", "stars"];
        if (filters.userId) rows.push("saved");
        return await this._hotelsByFilters(filters, requestId, rows);
    }

    async getHotelsByFiltersPages(filters, requestId) {
        return await this._hotelsByFilters(filters, requestId, ["COUNT(*)"], false);
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
                ${filters.returnDate ? `AND returnDate<=$${++paramCount}` : ''}
                ${filters.airport ? `AND outbounddepartureairport=$${++paramCount}` : ''}
                ${filters.room ? `AND roomtype=$${++paramCount}` : ''}
                ${filters.meal ? `AND mealtype=$${++paramCount}` : ''}
                ${filters.oceanview ? `AND oceanview=true` : ''}
                GROUP BY hotelid
            ) AS filtered
            INNER JOIN hotels ON filtered.hotelid=hotels.id
            ${filters.userId ? `LEFT OUTER JOIN (SELECT hotelId, true AS saved FROM hotelSaves WHERE userId=${filters.userId}) AS saves ON saves.hotelId=filtered.hotelid` : ''}
            WHERE stars>=$3
            AND stars<=$4
            ${filters.saved && filters.userId ? `AND saved=true` : ''}
            ${filters.query ? `AND POSITION($${++paramCount} IN name)>0` : ''}
            ${limit ? `ORDER BY ${filters.sort} LIMIT ${dbPagination} OFFSET ${offset}` : ""}
        `;

        for (let key of ["departureDate", "returnDate", "airport", "room", "meal", "query"]) if (filters[key]) parameters.push(filters[key]);

        return await this._beginRequest(query, parameters, requestId);
    }

    async getOffersByHotel(filters, requestId) {
        let rows = [
            "filtered.id",
            "departuredate",
            "returndate",
            "countadults",
            "countchildren",
            "price",
            "indepairport.name AS inbounddepartureairport",
            "inarrairport.name AS inboundarrivalairport",
            "inairline.name AS inairline",
            "inboundarrivaldatetime",
            "outdepairport.name AS outbounddepartureairport",
            "outarrairport.name AS outboundarrivalairport",
            "outairline.name AS outairline",
            "outboundarrivaldatetime",
            "mealtype",
            "oceanview",
            "roomtype"
        ];
        if (filters.userId) rows.push("saved");
        return await this._offersByHotel(filters, requestId, rows);
    }

    async getOffersByHotelPages(filters, requestId) {
        return await this._offersByHotel(filters, requestId, ["COUNT(*)"], false);
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
            FROM (
                SELECT *
                FROM offers_${filters.adults}_${filters.children}
                ${filters.userId ? `LEFT OUTER JOIN (SELECT offerId, true AS saved FROM offerSaves WHERE userId=${filters.userId}) AS saves ON saves.offerId=offers_${filters.adults}_${filters.children}.id` : ''}
                WHERE hotelid=$1
                AND price<=$2
                AND price>=$3
                ${filters.departureDate ? `AND departuredate>=$${++paramCount}` : ''}
                ${filters.returnDate ? `AND returnDate<=$${++paramCount}` : ''}
                ${filters.airport ? `AND outbounddepartureairport=$${++paramCount}` : ''}
                ${filters.room ? `AND roomtype=$${++paramCount}` : ''}
                ${filters.meal ? `AND mealtype=$${++paramCount}` : ''}
                ${filters.oceanview ? `AND oceanview=true` : ''}
                ${filters.saved && filters.userId ? `AND saved=true` : ''}
                ${limit ? `ORDER BY ${filters.sort} LIMIT ${dbPagination} OFFSET ${offset}` : ""}
            ) AS filtered
            INNER JOIN airports AS outdepairport ON filtered.outbounddepartureairport=outdepairport.iata OR filtered.outbounddepartureairport=outdepairport.icao
            INNER JOIN airports AS outarrairport ON filtered.outboundarrivalairport=outarrairport.iata OR filtered.outboundarrivalairport=outarrairport.icao
            INNER JOIN airports AS indepairport ON filtered.inbounddepartureairport=indepairport.iata OR filtered.inbounddepartureairport=indepairport.icao
            INNER JOIN airports AS inarrairport ON filtered.inboundarrivalairport=inarrairport.iata OR filtered.inboundarrivalairport=inarrairport.icao
            INNER JOIN airlines AS outairline ON filtered.outboundairline=outairline.iata OR filtered.outboundairline=outairline.icao
            INNER JOIN airlines AS inairline ON filtered.inboundairline=inairline.iata OR filtered.inboundairline=inairline.icao
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

    async existsUserByEmail(filters, requestId) {
        return await this._beginRequest(`
            SELECT COUNT(*)
            FROM users
            WHERE email=$1
        `,
        [filters.email],
        requestId);
    }

    async getUserByEmail(filters, requestId) {
        return await this._beginRequest(`
            SELECT *
            FROM users
            WHERE email=$1
        `,
        [filters.email],
        requestId);
    }

    async registerUser(data, requestId) {
        return await this._beginRequest(`
            INSERT INTO users(email, password)
            VALUES ($1, $2)
            RETURNING id
        `,
        [data.email, data.password],
        requestId);
    }

    async saveHotel(data, requestId) {
        return await this._beginRequest(`
            INSERT INTO hotelSaves(userId, hotelId)
            VALUES ($1, $2)
        `,
        [Number.parseInt(data.userId), Number.parseInt(data.hotelId)],
        requestId);
    }
    async unsaveHotel(data, requestId) {
        return await this._beginRequest(`
            DELETE FROM hotelSaves
            WHERE userId=$1
            AND hotelId=$2
        `,
        [Number.parseInt(data.userId), Number.parseInt(data.hotelId)],
        requestId);
    }
    async unsaveOffersByHotel(data, requestId) {
        return await this._beginRequest(`
            DELETE FROM offerSaves
            WHERE offerSaves.offerId
            IN (
                SELECT filtered.offerId
                FROM (
                    SELECT offerId
                    FROM offerSaves
                    WHERE userId=$1
                ) AS filtered
                INNER JOIN offers ON filtered.offerId=offers.id
                WHERE offers.hotelid=$2
            )
        `,
        [Number.parseInt(data.userId), Number.parseInt(data.hotelId)],
        requestId);
    }
    async saveOffer(data, requestId) {
        return await this._beginRequest(`
            INSERT INTO offerSaves(userId, offerId)
            VALUES ($1, $2)
        `,
        [Number.parseInt(data.userId), Number.parseInt(data.offerId)],
        requestId);
    }
    async saveHotelByOffer(data, requestId) {
        return await this._beginRequest(`
            INSERT INTO hotelSaves(userId, hotelId)
            SELECT $1 as userId, hotels.id as hotelId
            FROM hotels
            INNER JOIN (
                SELECT hotelid
                FROM offers
                WHERE offers.id=$2
            ) AS filtered ON hotels.id=filtered.hotelid
        `,
        [Number.parseInt(data.userId), Number.parseInt(data.offerId)],
        requestId);
    }
    async unsaveOffer(data, requestId) {
        return await this._beginRequest(`
            DELETE FROM offerSaves
            WHERE userId=$1
            AND offerId=$2
        `,
        [Number.parseInt(data.userId), Number.parseInt(data.offerId)],
        requestId);
    }

    async getHotelById(filters, requestId) {
        return await this._beginRequest(`
            SELECT *
            FROM hotels
            WHERE id=$1
        `,
        [filters.hotelId],
        requestId);
    }
}