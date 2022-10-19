require("dotenv").config();
const mariadb = require("mariadb");
const pool = mariadb.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT, 
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE
});

async function initializeDatabase() {

}

async function main() {
    let connection = await pool.getConnection();
    await connection.query("CREATE TABLE IF NOT EXISTS hotels(\
        id INT PRIMARY KEY DEFAULT,\
        name VARCHAR,\
        latitude DOUBLE,\
        longitude DOUBLE,\
        category_stars TINYINT\
    )");
    await connection.query("CREATE TABLE IF NOT EXISTS offers (\
        id INT PRIMARY KEY DEFAULT,\
        hotelid INT,\
        departuredate DATETIME,\
        returndate DATETIME,\
        countadults TINYINT,\
        countchildren TINYINT,\
        price SMALLINT,\
        inbounddepartureairport CHAR(3),\
        inboundarrivalairport CHAR(3),\
        inboundarrivaldatetime DATETIME,\
        outbounddepartureairport CHAR(3),\
        outboundarrivalairport CHAR(3),\
        outboundarrivaldatetime DATETIME,\
        mealtype VARCHAR\
        oceanview BOOL\
        roomtype VARCHAR\
    )");
}

main();