require("dotenv").config();
const postgress = require("postgres");

async function main() {
    const sql = postgress({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT, 
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE
    });
    
    await sql`CREATE TABLE IF NOT EXISTS hotels (id INT PRIMARY KEY, name VARCHAR(256), latitude NUMERIC(12, 10), longitude NUMERIC(12, 10), category_stars NUMERIC(2, 1))`;
    await sql`CREATE TABLE IF NOT EXISTS offers (\
id SERIAL PRIMARY KEY,\
hotelid int,\
CONSTRAINT hotelreference FOREIGN KEY(hotelid) REFERENCES hotels(id),\
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
);`
    await sql`COPY hotels FROM '${process.env.DB_CSV}/hotels.csv' DELIMITER ',' CSV HEADER`;
    await sql`COPY offers (hotelid, departuredate, returndate, countadults, countchildren, price, inbounddepartureairport, inboundarrivalairport, inboundairline, inboundarrivaldatetime, outbounddepartureairport, outboundarrivalairport, outboundairline, outboundarrivaldatetime, mealtype, oceanview, roomtype)  FROM ''${process.env.DB_CSV}/offers.csv' DELIMITER ',' CSV HEADER`;
}

main();