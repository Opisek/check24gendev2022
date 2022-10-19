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
    //await connection.query("CREATE TABLE IF NOT EXISTS hotels (id int primary key DEFAULT, name, latitude, longitude, category_stars)"); // proper table definiton to be added
}

main();