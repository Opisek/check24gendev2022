require("dotenv").config();
const mariadb = require("mariadb");
const pool = mariadb.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT, 
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE
});

async function loadData(databaseConnection) {
    const fs = require("fs");
    const csv = require("csv-parser");
    const moment = require("moment-timezone");
    let res = await new Promise( async (resolve, reject) => {
        let i = 0;
        fs.createReadStream("csv/hotels.csv")
            .pipe(csv())
            .on("data", async data => {
                ++i;
                await databaseConnection.query("INSERT INTO hotels value (?, ?, ?, ?, ?)", [parseInt(data[Object.keys(data)[0]]), data.name, parseFloat(data.latitude), parseFloat(data.longitude), parseInt(data.category_stars)]);
            })
            .on("end", () => resolve(i));
    });
    console.log(res);
    res = await new Promise( async (resolve, reject) => {
        let i = 0;
        let oldPercentage = "";
        fs.createReadStream("csv/offers.csv")
            .pipe(csv())
            .on("data", async data => {
                ++i;
                let percentage = Math.floor(i/72353411*1000)/10;
                if (oldPercentage != percentage) {
                    oldPercentage = percentage;
                    console.log(`${percentage}%`);
                }
                console.log("---");
                console.log(data.departureDate.substri(19));
                let departureDate = moment(data.departureDate.substr(19));
                console.log(departureDate);
                console.log(departureDate.format("YYYY-MM-DD HH:mm:ss"));
                await databaseConnection.query("INSERT INTO offers value (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", 
                    [
                        i,
                        data.hotelid,
                        data.departuredate,
                        data.returndate,
                        data.countadults,
                        data.countchildren,
                        data.price,
                        data.inbounddepartureairport,
                        data.inboundarrivalairport,
                        data.inboundairline,
                        data.inboundarrivaldatetime,
                        data.outbounddepartureairport,
                        data.outboundarrivalairport,
                        data.outboundairline,
                        data.outboundarrivaldatetime,
                        data.mealtype,
                        data.oceanview,
                        data.roomtype
                    ]
                );
            })
            .on("end", () => resolve(i));
    });
    console.log(res);
}

async function initializeDatabase() {

}

async function main() {
    let connection = await pool.getConnection();
    await connection.query("CREATE TABLE IF NOT EXISTS hotels (id INT PRIMARY KEY, name VARCHAR(256), latitude DOUBLE, longitude DOUBLE, category_stars TINYINT)");
    await connection.query("CREATE TABLE IF NOT EXISTS offers (\
id INT PRIMARY KEY AUTO_INCREMENT,\
hotelid INT,\
departuredate DATETIME,\
returndate DATETIME,\
countadults TINYINT,\
countchildren TINYINT,\
price SMALLINT,\
inbounddepartureairport CHAR(3),\
inboundarrivalairport CHAR(3),\
inboundarrivaldatetime DATETIME,\
inboundairline CHAR(3),\
outbounddepartureairport CHAR(3),\
outboundarrivalairport CHAR(3),\
outboundarrivaldatetime DATETIME,\
outboundairline CHAR(3),\
mealtype VARCHAR(64),\
oceanview BOOL,\
roomtype VARCHAR(64)\
)");
    await loadData(connection);
}

main();