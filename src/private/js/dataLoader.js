const postgres = require("pg");
const moment = require("moment-timezone");
const path = require("path");
const fs = require("fs");

const tables = ["offers", "hotels", "airports", "airlines", "rooms", "meals", "users", "hotelSaves", "offerSaves"];
const manualFiles = ["hotels.csv", "offers.csv"];
const automaticFiles = ["airports.dat", "airlines.dat"];

module.exports = class DataLoader {
    constructor(host, port, user, password, database, dataPath) {
        this._sql = new postgres.Pool({
            host: host,
            port: port,
            user: user,
            password: password,
            database: database
        });
        this._dataPath = dataPath;
    }

    connect() {
        return new Promise(res => {
            let repetition = 0;
            let interval = setInterval(async () => {
                try {
                    await this._sql.connect();
                    await this._sql.query(`SET client_encoding='UTF8'`);
                    clearInterval(interval);
                    res(true);
                } catch(e) {
                    repetition += 1;
                    if (repetition == 6) {
                        clearInterval(interval);
                        res(false);
                    } else {
                        console.error(`Could not connect to database: ${e}`);
                        console.error(`Retrying... (${repetition}/5)`);
                    }
                }
            }, 1000);
        });
    }

    async checkTables() {
        return (await this._sql.query(`SELECT COUNT(*) FROM pg_tables WHERE schemaname='public' AND (${tables.map(t => `tablename='${t.toLowerCase()}'`).join(" OR ")})`)).rows[0].count == tables.length;
    }

    checkFiles() {
        for (const file of manualFiles) {
            if (!fs.existsSync(path.join(this._dataPath, file))) {
                console.error(`File "${file}" could not be found in "${this._dataPath}"`);
                return false;
            }
        }
        for (const file of automaticFiles) {
            if (!fs.existsSync(path.join(this._dataPath, file))) {
                console.error(`Copying "${file}"`);
                try {
                    fs.copyFileSync(path.join("/usr/src/app/data", file), path.join(this._dataPath, file));
                } catch(e) {
                    console.error(`Could no copy file "${file}" into "${this._dataPath}": ${e}`);
                    return false;
                }
            }
        }
        return true;
    }

    async resetData() {
        await this._sql.query(`DROP TABLE IF EXISTS ${tables.join(", ")}`);
    }

    async loadData() {
        await this._sql.query("SET client_encoding='UTF8'");
    
        await offers(this._sql);
        await hotels(this._sql);
        await airports(this._sql);
        await airlines(this._sql);
        await roomtypes(this._sql);
        await mealtypes(this._sql);
        await users(this._sql);
        await saves(this._sql);
    }
}

async function offers(sql) {
    console.log("Creating offers");
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

    console.log("Partitioning offers");
    for (let i = 1; i <= maxAdultsCount; ++i) {
        await sql.query(`CREATE TABLE ${`offers_${i}`} PARTITION OF offers FOR VALUES IN (${i}) PARTITION BY LIST(countchildren)`);
        for (let j = 0; j <= maxChildrenCount; ++j) await sql.query(`CREATE TABLE ${`offers_${i}_${j}`} PARTITION OF offers_${i} FOR VALUES IN (${j})`);
    }

    console.log("Loading offers");
    await progressReporting(sql, `COPY offers (hotelid, departuredate, returndate, countadults, countchildren, price, inbounddepartureairport, inboundarrivalairport, inboundairline, inboundarrivaldatetime, outbounddepartureairport, outboundarrivalairport, outboundairline, outboundarrivaldatetime, mealtype, oceanview, roomtype) FROM '${path.join(process.env.DATA_PATH + "/offers.csv")}' DELIMITER ',' CSV HEADER`, "copy", "bytes_total", "bytes_processed");

    console.log("Indexing offers (1/3)");
    await progressReporting(sql, "CREATE INDEX offer_index ON offers USING btree (id)", "create_index", "tuples_total", "tuples_done");

    console.log("Indexing offers (2/3)");
    await progressReporting(sql, "CREATE INDEX hotel_index ON offers USING btree (hotelid)", "create_index", "tuples_total", "tuples_done");
    
    console.log("Indexing offers (3/3)");
    await progressReporting(sql, "CREATE INDEX hotel_search_index ON offers USING btree(hotelid, price, countadults, countchildren)", "create_index", "tuples_total", "tuples_done");
}
async function hotels(sql) {
    console.log("Creating hotels");
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

    console.log("Loading hotels");
    await progressReporting(sql, `COPY hotels FROM '${path.join(process.env.DATA_PATH + "/hotels.csv")}' DELIMITER ',' CSV HEADER`, "copy", "bytes_total", "bytes_processed");
}
async function airports(sql) {
    console.log("Creating airports");
    await sql.query(`
        CREATE TABLE airports
        (
            iata CHAR(3),
            icao CHAR(4),
            name VARCHAR(128),
            home BOOLEAN
        )
    `);

    console.log("Creating temporary airports");
    await sql.query(`
        CREATE TABLE temp
        (
            id int,
            name VARCHAR(128),
            city VARCHAR(64),
            country VARCHAR(64),
            iata CHAR(3),
            icao CHAR(4),
            latitude NUMERIC(18, 15),
            longitude NUMERIC(18, 15),
            altitude NUMERIC(5, 0),
            timezone VARCHAR(5),
            dst VARCHAR(5),
            timezoneCode VARCHAR(32),
            type CHAR(7),
            source VARCHAR(16)
        )
    `);

    console.log("Loading temporary airports");
    await progressReporting(sql, `COPY temp FROM '${path.join(process.env.DATA_PATH + "/airports.dat")}' DELIMITER ',' ESCAPE  '\\' CSV`, "copy", "bytes_total", "bytes_processed");
    
    console.log("Filtering airports");
    await sql.query(`
        INSERT INTO airports 
        SELECT DISTINCT temp.iata, temp.icao, temp.name, true AS home
        FROM (
            SELECT DISTINCT outbounddepartureairport as id FROM offers
            UNION
            SELECT DISTINCT inboundarrivalairport as id FROM offers
        ) as ids
        INNER JOIN temp ON ids.id=temp.iata OR ids.id=temp.icao
        ON CONFLICT DO NOTHING;`
    );
    await sql.query(`
        INSERT INTO airports 
        SELECT DISTINCT temp.iata, temp.icao, temp.name, false AS home
        FROM (
            SELECT DISTINCT outboundarrivalairport as id FROM offers
            UNION
            SELECT DISTINCT inbounddepartureairport as id FROM offers
        ) as ids
        INNER JOIN temp ON ids.id=temp.iata OR ids.id=temp.icao
        ON CONFLICT DO NOTHING;`
    );

    console.log("Deleting temporary airports");
    await sql.query("DROP TABLE temp");

    console.log("Indexing airports (1/2)");
    await progressReporting(sql, "CREATE INDEX airport_iata_index ON airports USING btree (iata)", "create_index", "tuples_done", "tuples_total");

    console.log("Indexing airports (2/2)");
    await progressReporting(sql, "CREATE INDEX airport_icao_index ON airports USING btree (icao)", "create_index", "tuples_done", "tuples_total");
}

async function airlines(sql) {
    console.log("Resetting airlines");
    await sql.query("DROP TABLE IF EXISTS airlines, temp");

    console.log("Creating airlines");
    await sql.query(`
        CREATE TABLE airlines
        (
            iata CHAR(2),
            icao CHAR(3),
            name VARCHAR(64)
        )
    `);

    console.log("Creating temporary airlines");
    await sql.query(`
        CREATE TABLE temp
        (
            id int,
            name VARCHAR(128),
            alias VARCHAR(64),
            iata VARCHAR(2),
            icao CHAR(3),
            callsign VARCHAR(64),
            country VARCHAR(64),
            active CHAR(1)
        )
    `);

    console.log("Loading temporary airlines");
    await progressReporting(sql, `COPY temp FROM '${path.join(process.env.DATA_PATH + "/airlines.dat")}' DELIMITER ',' ESCAPE  '\\' CSV`, "copy", "bytes_total", "bytes_processed");
    
    console.log("Filtering airlines");
    await sql.query(`
        INSERT INTO airlines 
        SELECT DISTINCT temp.iata, temp.icao, temp.name
        FROM (
            SELECT DISTINCT outboundairline as id FROM offers
            UNION
            SELECT DISTINCT inboundairline as id FROM offers
        ) as ids
        INNER JOIN temp ON ids.id=temp.iata OR ids.id=temp.icao
        ON CONFLICT DO NOTHING;`
    );

    console.log("Deleting temporary airlines");
    await sql.query("DROP TABLE temp");

    console.log("Indexing airlines (1/2)");
    await progressReporting(sql, "CREATE INDEX airline_iata_index ON airlines USING btree (iata)", "create_index", "tuples_done", "tuples_total");

    console.log("Indexing airlines (2/2)");
    await progressReporting(sql, "CREATE INDEX airline_icao_index ON airlines USING btree (icao)", "create_index", "tuples_done", "tuples_total");
}

async function roomtypes(sql) {
    console.log("Creating room types");
    await sql.query(`
        CREATE TABLE rooms
        (
            id VARCHAR(16) PRIMARY KEY
        )
    `);

    console.log("Loading room types");
    await sql.query(`
        INSERT INTO rooms
        SELECT DISTINCT roomtype
        FROM offers
    `);
}

async function mealtypes(sql) {
    console.log("Creating meal types");
    await sql.query(`
        CREATE TABLE meals
        (
            id VARCHAR(16) PRIMARY KEY
        )
    `);

    console.log("Loading meal types");
    await sql.query(`
        INSERT INTO meals
        SELECT DISTINCT mealtype
        FROM offers
    `);
}

async function users(sql) {
    console.log("Creating users");
    await sql.query(`
        CREATE TABLE users
        (
            id SERIAL PRIMARY KEY,
            email VARCHAR(128),
            password CHAR(60)
        )
    `);
}

async function saves(sql) {
    console.log("Creating hotel saves");
    await sql.query(`
        CREATE TABLE hotelSaves
        (
            userId INT,
            hotelId INT,
            CONSTRAINT userReference FOREIGN KEY(userId) REFERENCES users(id),
            CONSTRAINT hotelReference FOREIGN KEY(hotelId) REFERENCES hotels(id)
        )
    `);
    console.log("Creating offer saves");
    await sql.query(`
        CREATE TABLE offerSaves
        (
            userId INT,
            offerId INT,
            CONSTRAINT userReference FOREIGN KEY(userId) REFERENCES users(id)
        )
    `);
    console.log("Indexing offer saves");
    await progressReporting(sql, "CREATE INDEX offerSave_index on offerSaves USING btree (offerId)", "create_index", "tuples_done", "tuples_total");
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

            /*process.stdout.clearLine();
            process.stdout.cursorTo(0);*/
            console.log(`${Math.floor(currentProgress * 1000)/10}%\t${moment.duration(remaining, "seconds").humanize()} remaining`);

            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        /*process.stdout.clearLine();
        process.stdout.cursorTo(0);
        process.stdout.write(`100%\n`);*/
        console.log("100%");
        resolve();
    });
}