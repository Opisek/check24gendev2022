const postgress = require("pg");
const moment = require("moment-timezone");

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
}