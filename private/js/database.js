const postgress = require("pg");
const moment = require("moment-timezone");

const pagination = 20;

module.exports = class Database {
    constructor(host, port, user, password, database) {
        this._sql = new postgress.Pool({
            host: host,
            port: port,
            user: user,
            password: password,
            database: database
        });
    }

    async connect() {
        await this._sql.connect();
        await this._sql.query("SET client_encoding='UTF8'");
    }

    async offersRequest(filters) {
        let query = "SELECT * FROM offers INNER JOIN hotels ON offers.hotelid=hotels.id";

        console.log(filters);

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

        return result.rows;
    }
}