require("dotenv").config();

const webServer = new (require("./private/js/webserver"))(process.env.WEB_PORT);
const database = new (require("./private/js/database"))(process.env.DB_HOST, process.env.DB_PORT, process.env.DB_USER, process.env.DB_PASSWORD, process.env.DB_DATABASE);
(async () => {
    await database.connect();
    console.log("database connected!")
})();