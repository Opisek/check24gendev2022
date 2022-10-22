require("dotenv").config();

const postgress = require("pg");

const moment = require("moment-timezone");

async function main() {
    const sql = new postgress.Pool({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT, 
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE
    });
    await sql.connect();

    console.log("set utf8");
    await sql.query("SET client_encoding='UTF8'");

    /*let cases = "";
    for (let i = 0; i < 20; ++i) {
        cases += `when price between ${i * 1000} and ${(i + 1) * 1000 - 1} then '${i * 1000}-${(i + 1) * 1000 - 1}' `;
    }
    let query = `SELECT MIN(c.amount), AVG(c.amount), MAX(c.amount) FROM (SELECT COUNT(*) as amount from (select case ${cases}else 'other' end as range, countadults, countchildren from offers) t group by t.range, countadults, countchildren) c;`;
    console.log(query);*/
    
    console.log("resetting");
    await sql.query("DROP TABLE IF EXISTS offers, hotels");

    console.log("create hotels");
    await sql.query("CREATE TABLE IF NOT EXISTS hotels (id INT PRIMARY KEY, name VARCHAR(256), latitude NUMERIC(12, 10), longitude NUMERIC(12, 10), stars NUMERIC(2, 1))");

    console.log("create offers");
    const maxAdultsCount = 6;
    const maxChildrenCount = 6;
    await sql.query(`
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
) PARTITION BY LIST(countadults)`);

// id should technically be PRIMARY KEY but that is not possible due no partitions
// CONSTRAINT hotelreference FOREIGN KEY(hotelid) REFERENCES hotels(id), // not supported by partitions

    console.log("partition offers");
    for (let i = 1; i <= maxAdultsCount; ++i) {
        await sql.query(`CREATE TABLE ${`offers_${i}`} PARTITION OF offers FOR VALUES IN (${i}) PARTITION BY LIST(countchildren)`);
        for (let j = 0; j <= maxChildrenCount; ++j) await sql.query(`CREATE TABLE ${`offers_${i}_${j}`} PARTITION OF offers_${i} FOR VALUES IN (${j})`);
    }

    console.log("load hotels");
    //await sql`COPY hotels FROM '${process.env.DB_CSV}/hotels.csv' DELIMITER ',' CSV HEADER`;
    await sql.query(`COPY hotels FROM 'D:/Projects/Websites/check24gendev2022/csv/hotels.csv' DELIMITER ',' CSV HEADER`);

    await progressReporting(`COPY offers (hotelid, departuredate, returndate, countadults, countchildren, price, inbounddepartureairport, inboundarrivalairport, inboundairline, inboundarrivaldatetime, outbounddepartureairport, outboundarrivalairport, outboundairline, outboundarrivaldatetime, mealtype, oceanview, roomtype) FROM 'D:/Projects/Websites/check24gendev2022/csv/offers.csv' DELIMITER ',' CSV HEADER`, "copy");
    await progressReporting("CREATE INDEX price_index on offers(price)", "create_index");
    await progressReporting("CREATE INDEX outbounddepartureairport_index on offers(outbounddepartureairport)", "create_index");
    await progressReporting("CREATE INDEX inboundarrivalairport_index on offers(inboundarrivalairport)", "create_index");

    console.log("load offers");


    // SELECT bytes_processed, bytes_total FROM pg_stat_progress_copy
}

async function progressReporting(query, type) {
    return new Promise(async resolve => {
        let done = false;
        sql.query(query).then(() => done = true);
        let differences = [];
        let lastProgress = 0;
        console.log("0%");
        while (!done) {
            let progress = await sql.query(`SELECT bytes_processed, bytes_total FROM pg_stat_progress_${type}`);
            let currentProgress = progress.rows[0].bytes_processed / progress.rows[0].bytes_total;
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
        process.stdout.write(`100%`);
        resolve();
    });
}

main();