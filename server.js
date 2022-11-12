require("dotenv").config();

const webServer = new (require("./private/js/webserver"))(process.env.WEB_PORT);
const database = new (require("./private/js/database"))(process.env.DB_HOST, process.env.DB_PORT, process.env.DB_USER, process.env.DB_PASSWORD, process.env.DB_DATABASE);
const auth = new (require("./private/js/auth"))(process.env.JWT_SECRET);

(async () => {
    await database.connect();
    console.log("database connected!");

    // Hotel Search
    webServer.addEventListener("getHotelsByFilters", async (data, requestId, callback) => {
        data.userId = await auth.verifyToken(data, requestId);
        callback(await database.getHotelsByFilters(data, requestId))
    });
    webServer.addEventListener("getHotelsByFiltersPages", async (data, requestId, callback) => callback(await database.getHotelsByFiltersPages(data, requestId)));
    
    // Offer Search
    webServer.addEventListener("getOffersByHotel", async (data, requestId, callback) => {
        data.userId = await auth.verifyToken(data, requestId);
        callback(await database.getOffersByHotel(data, requestId))
    });
    webServer.addEventListener("getOffersByHotelPages", async (data, requestId, callback) => callback(await database.getOffersByHotelPages(data, requestId)));
    
    // Filter Search
    webServer.addEventListener("getAirports", async (data, requestId, callback) => callback(await database.getAirports(data, requestId, callback)));
    webServer.addEventListener("getRooms", async (data, requestId, callback) => callback(await database.getRooms(data, requestId, callback)));
    webServer.addEventListener("getMeals", async (data, requestId, callback) => callback(await database.getMeals(data, requestId, callback)));

    // Authentication
    webServer.addEventListener("login", async (data, requestId, callback) => callback(await auth.login(data, requestId)));
    webServer.addEventListener("register", async (data, requestId, callback) => callback(await auth.register(data, requestId)));
    webServer.addEventListener("recover", async (data, requestId, callback) => callback(await auth.recover(data, requestId)));
    webServer.addEventListener("verifyToken", async (data, requestId, callback) => callback(await auth.verifyToken(data, requestId)));

    auth.addEventListener("existsUserByEmail", async (data, requestId, callback) => callback(await database.existsUserByEmail(data, requestId)));
    auth.addEventListener("getUserByEmail", async (data, requestId, callback) => callback(await database.getUserByEmail(data, requestId)));
    auth.addEventListener("registerUser", async (data, requestId, callback) => callback(await database.registerUser(data, requestId)));

    // Saving
    webServer.addEventListener("saveHotel", async (data, requestId, callback) => {
        const id = await auth.verifyToken(data, requestId);
        if (id == null) callback(false);
        else {
            data.userId = id;
            await database.saveHotel(data, requestId)
            callback(true);
        }
    });
    webServer.addEventListener("unsaveHotel", async (data, requestId, callback) => {
        const id = await auth.verifyToken(data, requestId);
        if (id == null) callback(false);
        else {
            data.userId = id;
            await database.unsaveHotel(data, requestId)
            callback(true);
        }
    });
    webServer.addEventListener("saveOffer", async (data, requestId, callback) => {
        const id = await auth.verifyToken(data, requestId);
        if (id == null) callback(false);
        else {
            data.userId = id;
            await database.saveOffer(data, requestId)
            callback(true);
        }
    });
    webServer.addEventListener("unsaveOffer", async (data, requestId, callback) => {
        const id = await auth.verifyToken(data, requestId);
        if (id == null) callback(false);
        else {
            data.userId = id;
            await database.unsaveOffer(data, requestId)
            callback(true);
        }
    });

    // Request Abortion
    webServer.addEventListener("abortRequest", requestId => database.abortRequest(requestId));
})();

/*function handleEvent(emitter, event, handler) {
    emitter.addEventListener(event, async (data, requestId, callback) => callback(await handler(data, requestId)));
}*/