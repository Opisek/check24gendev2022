require("dotenv").config();
const postgress = require("postgres");
const moment = require("moment-timezone");

async function main() {
    const sql = postgress({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT, 
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE
    });
    
    console.log("resetting");
    await sql`DROP TABLE IF EXISTS offers, hotels`;

    console.log("create hotels");
    await sql`CREATE TABLE IF NOT EXISTS hotels (id INT PRIMARY KEY, name VARCHAR(256), latitude NUMERIC(12, 10), longitude NUMERIC(12, 10), category_stars NUMERIC(2, 1))`;

    console.log("create offers");
    const maxAdultsCount = 10;
    await sql`
CREATE TABLE IF NOT EXISTS offers\
(\
id SERIAL,\
hotelid INT,\
departuredate TIMESTAMP,\
returndate TIMESTAMP,\
countadults SMALLINT,\
countchildren SMALLINT,\
price INTEGER,\
inbounddepartureairport CHAR(3),\
inboundarrivalairport CHAR(3),\
inboundairline CHAR(3),\
inboundarrivaldatetime TIMESTAMP,\
outbounddepartureairport CHAR(3),\
outboundarrivalairport CHAR(3),\
outboundairline CHAR(3),\
outboundarrivaldatetime TIMESTAMP,\
mealtype VARCHAR(64),\
oceanview BOOL,\
roomtype VARCHAR(64)\
)`//\
//PARTITION BY LIST(countadults)`;
// id should technically be PRIMARY KEY but that is not possible due no partitions
// CONSTRAINT hotelreference FOREIGN KEY(hotelid) REFERENCES hotels(id), // not supported by partitions

    console.log("partition offers");
    for (let i = 0; i <= maxAdultsCount; ++i) {
        console.log(`partition ${i}`);
        //sql`CREATE TABLE offers${i} PARTITION OF offers FOR VALUES IN (${i})`;
    }
    
    console.log("set utf8");
    await sql`SET client_encoding='UTF8'`;

    console.log("load hotels");
    //await sql`COPY hotels FROM '${process.env.DB_CSV}/hotels.csv' DELIMITER ',' CSV HEADER`;
    await sql`COPY hotels FROM 'D:/Projects/Websites/check24gendev2022/csv/hotels.csv' DELIMITER ',' CSV HEADER`;

    console.log("load offers");
    let done = false;
    sql`COPY offers (hotelid, departuredate, returndate, countadults, countchildren, price, inbounddepartureairport, inboundarrivalairport, inboundairline, inboundarrivaldatetime, outbounddepartureairport, outboundarrivalairport, outboundairline, outboundarrivaldatetime, mealtype, oceanview, roomtype) FROM 'D:/Projects/Websites/check24gendev2022/csv/offers.csv' DELIMITER ',' CSV HEADER`.then(() => done = true);
    let differences = [];
    let lastProgress = 0;
    while (!done) {
        let progress = await sql`SELECT bytes_processed, bytes_total FROM pg_stat_progress_copy`;
        let currentProgress = progress[0].bytes_processed / progress[0].bytes_total;
        differences.push(currentProgress - lastProgress);
        if (differences.length > 20) differences.shift();
        lastProgress = currentProgress;

        let mean = 0;
        for (let dif of differences) mean += dif;
        mean /= differences.length;

        let remaining = (1-currentProgress) / mean;

        process.stdout.clearLine();
        process.stdout.cursorTo(0);
        process.stdout.write(`${Math.floor(currentProgress * 1000)/10}%\t${moment.duration(remaining, "seconds").humanize()} remaining`);

        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    process.stdout.clearLine();
    process.stdout.cursorTo(0);
    process.stdout.write(`done`);
    // SELECT bytes_processed, bytes_total FROM pg_stat_progress_copy
}

function reportProgress() {

}

main();