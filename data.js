require("dotenv").config();
const path = require("path");

const postgress = require("pg");

const moment = require("moment-timezone");

async function offers(sql) {
    console.log("reset offers");
    await sql.query("DROP TABLE IF EXISTS offers");

    console.log("create offers");
    const maxAdultsCount = 6;
    const maxChildrenCount = 6;
    await sql.query(`
        CREATE TABLE offers
        (
            id SERIAL,
            hotelid INT,
            departuredate TIMESTAMP,
            returndate TIMESTAMP,
            countadults SMALLINT,
            countchildren SMALLINT,
            price INTEGER,
            inbounddepartureairport CHAR(3),
            inboundarrivalairport CHAR(3),
            inboundairline CHAR(3),
            inboundarrivaldatetime TIMESTAMP,
            outbounddepartureairport CHAR(3),
            outboundarrivalairport CHAR(3),
            outboundairline CHAR(3),
            outboundarrivaldatetime TIMESTAMP,
            mealtype VARCHAR(64),
            oceanview BOOL,
            roomtype VARCHAR(64)
        ) PARTITION BY LIST(countadults)
    `);
    // id should technically be PRIMARY KEY but that is not possible due no partitions
    // CONSTRAINT hotelreference FOREIGN KEY(hotelid) REFERENCES hotels(id), // not supported by partitions

    console.log("partition offers");
    for (let i = 1; i <= maxAdultsCount; ++i) {
        await sql.query(`CREATE TABLE ${`offers_${i}`} PARTITION OF offers FOR VALUES IN (${i}) PARTITION BY LIST(countchildren)`);
        for (let j = 0; j <= maxChildrenCount; ++j) await sql.query(`CREATE TABLE ${`offers_${i}_${j}`} PARTITION OF offers_${i} FOR VALUES IN (${j})`);
    }

    console.log("load offers");
    await progressReporting(sql, `COPY offers (hotelid, departuredate, returndate, countadults, countchildren, price, inbounddepartureairport, inboundarrivalairport, inboundairline, inboundarrivaldatetime, outbounddepartureairport, outboundarrivalairport, outboundairline, outboundarrivaldatetime, mealtype, oceanview, roomtype) FROM '${path.join(process.env.DATA_PATH + "/offers.csv")}' DELIMITER ',' CSV HEADER`, "copy", "bytes_total", "bytes_processed");

    console.log("create hotelid index");
    await progressReporting(sql, "CREATE INDEX hotel_index on offers USING btree (hotelid)", "create_index", "tuples_total", "tuples_done");
    
    console.log("create search index");
    await progressReporting(sql, "CREATE INDEX hotel_search_index on offers USING btree(hotelid, price, countadults, countchildren)", "create_index", "tuples_total", "tuples_done");
}
async function hotels(sql) {
    console.log("reset hotels");
    await sql.query("DROP TABLE IF EXISTS hotels");

    console.log("create hotels");
    await sql.query(`
        CREATE TABLE hotels
        (
            id INT PRIMARY KEY,
            name VARCHAR(256),
            latitude NUMERIC(12, 10),
            longitude NUMERIC(12, 10),
            stars NUMERIC(2, 1)
        )`
    );

    console.log("load hotels");
    await progressReporting(sql, `COPY hotels FROM '${path.join(process.env.DATA_PATH + "/hotels.csv")}' DELIMITER ',' CSV HEADER`, "copy", "bytes_total", "bytes_processed");
}
async function airports(sql) {
    console.log("reset airports");
    await sql.query("DROP TABLE IF EXISTS airports, temp");

    console.log("create airports");
    await sql.query(`
        CREATE TABLE airports
        (
            id CHAR(3) PRIMARY KEY,
            name VARCHAR(64),
            home BOOLEAN
        )
    `);

    console.log("create temp");
    await sql.query(`
        CREATE TABLE temp
        (
            id CHAR(5),
            name VARCHAR(64),
            country VARCHAR(64)
        )
    `);

    console.log("load temp");
    await progressReporting(sql, `COPY temp FROM '${path.join(process.env.DATA_PATH + "/airports.tsv")}' DELIMITER E'\t'`, "copy", "bytes_total", "bytes_processed");
    
    console.log("filter airports");
    await sql.query(`
        INSERT INTO airports 
        SELECT DISTINCT temp.id, temp.name, true AS home
        FROM (
            SELECT DISTINCT outbounddepartureairport as id FROM offers
            UNION
            SELECT DISTINCT inboundarrivalairport as id FROM offers
        ) as ids
        INNER JOIN temp ON ids.id=temp.id
        ON CONFLICT DO NOTHING;`
    );
    await sql.query(`
        INSERT INTO airports 
        SELECT DISTINCT temp.id, temp.name, false AS home
        FROM (
            SELECT DISTINCT outboundarrivalairport as id FROM offers
            UNION
            SELECT DISTINCT inbounddepartureairport as id FROM offers
        ) as ids
        INNER JOIN temp ON ids.id=temp.id
        ON CONFLICT DO NOTHING;`
    );

    console.log("delete temp");
    await sql.query("DROP TABLE temp");
}

async function roomtypes(sql) {
    console.log("reset roomtypes");
    await sql.query("DROP TABLE IF EXISTS rooms");

    console.log("create roomtypes");
    await sql.query(`
        CREATE TABLE rooms
        (
            id VARCHAR(16) PRIMARY KEY
        )
    `);

    console.log("load roomtypes");
    await sql.query(`
        INSERT INTO rooms
        SELECT DISTINCT roomtype
        FROM offers
    `);
}

async function mealtypes(sql) {
    console.log("reset mealtypes");
    await sql.query("DROP TABLE IF EXISTS meals");

    console.log("create mealtypes");
    await sql.query(`
        CREATE TABLE meals
        (
            id VARCHAR(16) PRIMARY KEY
        )
    `);

    console.log("load mealtypes");
    await sql.query(`
        INSERT INTO meals
        SELECT DISTINCT mealtype
        FROM offers
    `);
}

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

    await offers(sql);
    await hotels(sql);
    await airports(sql);
    await roomtypes(sql);
    await mealtypes(sql);

    console.log("all done");
}

async function progressReporting(sql, query, type, totalColumn, doneColumn) {
    return new Promise(async resolve => {
        let done = false;
        sql.query(query).then(() => done = true);
        let differences = [];
        let lastProgress = 0;
        while (!done) {
            let progress = await sql.query(`SELECT ${doneColumn}, ${totalColumn} FROM pg_stat_progress_${type}`);
            if (progress.rows.length == 0) break;
            let currentProgress = progress.rows[0][doneColumn] / progress.rows[0][totalColumn];
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
        process.stdout.write(`100%\n`);
        resolve();
    });
}

main();