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
                //await databaseConnection.query("INSERT INTO hotels value (?, ?, ?, ?, ?)", [parseInt(data[Object.keys(data)[0]]), data.name, parseFloat(data.latitude), parseFloat(data.longitude), parseInt(data.category_stars)]);
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
                await databaseConnection.query("INSERT INTO offers value (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", 
                    [
                        i,
                        data.hotelid,
                        moment(data.departuredate).format("YYYY-MM-DD HH:mm:ss"),
                        moment(data.returndate).format("YYYY-MM-DD HH:mm:ss"),
                        data.countadults,
                        data.countchildren,
                        data.price,
                        data.inbounddepartureairport,
                        data.inboundarrivalairport,
                        data.inboundairline,
                        moment(data.inboundarrivaldatetime).format("YYYY-MM-DD HH:mm:ss"),
                        data.outbounddepartureairport,
                        data.outboundarrivalairport,
                        data.outboundairline,
                        moment(data.outboundarrivaldatetime).format("YYYY-MM-DD HH:mm:ss"),
                        data.mealtype,
                        data.oceanview & 1,
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
price MEDIUMINT,\
inbounddepartureairport CHAR(3),\
inboundarrivalairport CHAR(3),\
inboundairline CHAR(3),\
inboundarrivaldatetime DATETIME,\
outbounddepartureairport CHAR(3),\
outboundarrivalairport CHAR(3),\
outboundairline CHAR(3),\
outboundarrivaldatetime DATETIME,\
mealtype VARCHAR(64),\
oceanview BOOL,\
roomtype VARCHAR(64)\
)"); // todo: add foreign key constraint
    await loadData(connection);
}

// LOAD DATA LOCAL INFILE 'C:/Users/darow/desktop/check24gendev/csv/hotels.csv' INTO TABLE hotels
// LOAD DATA LOCAL INFILE 'C:/Users/darow/desktop/check24gendev/csv/offers.csv' INTO TABLE offers FIELDS TERMINATED BY ',' ENCLOSED BY '"' LINES TERMINATED BY '\n' (id, hotelid, departuredate, returndate, countadults, countchildren, price, inbounddepartureairport, inboundarrivalairport, inboundairline, inboundarrivaldatetime, outbounddepartureairport, outboundarrivalairport, outboundairline, outboundarrivaldatetime, mealtype, oceanview, roomtype) SET ID = NULL

main();