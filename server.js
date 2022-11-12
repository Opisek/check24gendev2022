require("dotenv").config();

const webServer = new (require("./private/js/webserver"))(process.env.WEB_PORT);
const database = new (require("./private/js/database"))(process.env.DB_HOST, process.env.DB_PORT, process.env.DB_USER, process.env.DB_PASSWORD, process.env.DB_DATABASE);
(async () => {
    await database.connect();
    console.log("database connected!");

    webServer.addEventListener("getHotelsByFilters", async (filters, requestId, callback) => callback(await database.getHotelsByFilters(filters, requestId)));
    webServer.addEventListener("getHotelsByFiltersPages", async (filters, requestId, callback) => callback(await database.getHotelsByFiltersPages(filters, requestId)));
    
    webServer.addEventListener("getOffersByHotel", async (filters, requestId, callback) => callback(await database.getOffersByHotel(filters, requestId)));
    webServer.addEventListener("getOffersByHotelPages", async (filters, requestId, callback) => callback(await database.getOffersByHotelPages(filters, requestId)));
    
    webServer.addEventListener("getAirports", async (filters, requestId, callback) => callback(await database.getAirports(filters, requestId)));
    webServer.addEventListener("getRooms", async (filters, requestId, callback) => callback(await database.getRooms(filters, requestId)));
    webServer.addEventListener("getMeals", async (filters, requestId, callback) => callback(await database.getMeals(filters, requestId)));

    webServer.addEventListener("login", async (filters, requestId, callback) => {
        console.log("login");
        callback("test");
    });
    webServer.addEventListener("register", async (filters, requestId, callback) => {
        console.log("register");
        callback("test");
    });
    webServer.addEventListener("recover", async (filters, requestId, callback) => {
        console.log("recover");
        callback("test");
    });

    webServer.addEventListener("abortRequest", requestId => database.abortRequest(requestId));
})();