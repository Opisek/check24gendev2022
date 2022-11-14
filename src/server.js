require("dotenv").config();

const webServer = new (require("./private/js/webserver"))(process.env.WEB_PORT);
const database = new (require("./private/js/database"))(process.env.DB_HOST, process.env.DB_PORT, process.env.DB_USER, process.env.DB_PASSWORD, process.env.DB_DATABASE);
const dataLoader = new (require("./private/js/dataLoader"))(process.env.DB_HOST, process.env.DB_PORT, process.env.DB_USER, process.env.DB_PASSWORD, process.env.DB_DATABASE, process.env.DATA_PATH);
const auth = new (require("./private/js/auth"))(process.env.JWT_SECRET);
const lang = new (require("./private/js/lang"));

(async () => {
    console.log("Connecting data loader");
    if (!(await dataLoader.connect())) return;
    console.log("Data loader connected");
    if (await dataLoader.checkTables()) console.log("All tables present");
    else {
        console.log("Database incomplete");
        console.log("Checking files");
        if (!dataLoader.checkFiles()) return;
        console.log("Purging incomplete database");
        await dataLoader.resetData();
        console.log("Loading data");
        await dataLoader.loadData();
        console.log("All data loaded");
    }

    console.log("Connecting database");
    if (!(await database.connect())) return;
    console.log("Database connected");

    // Hotel Search
    webServer.addEventListener("getHotelsByFilters", async (data, requestId, callback) => {
        data.userId = await auth.verifyToken(data, requestId);
        callback(await database.getHotelsByFilters(data, requestId));
    });
    webServer.addEventListener("getHotelsByFiltersPages", async (data, requestId, callback) => {
        data.userId = await auth.verifyToken(data, requestId);
        callback(await database.getHotelsByFiltersPages(data, requestId));
    });
    webServer.addEventListener("getHotelById", async (data, requestId, callback) => callback(await database.getHotelById(data, requestId)));
    
    // Offer Search
    webServer.addEventListener("getOffersByHotel", async (data, requestId, callback) => {
        data.userId = await auth.verifyToken(data, requestId);
        callback(await database.getOffersByHotel(data, requestId));
    });
    webServer.addEventListener("getOffersByHotelPages", async (data, requestId, callback) => {
        data.userId = await auth.verifyToken(data, requestId);
        callback(await database.getOffersByHotelPages(data, requestId));
    });
    
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
            await database.unsaveOffersByHotel(data, requestId)
            callback(true);
        }
    });
    webServer.addEventListener("saveOffer", async (data, requestId, callback) => {
        const id = await auth.verifyToken(data, requestId);
        if (id == null) callback(false);
        else {
            data.userId = id;
            await database.saveOffer(data, requestId)
            await database.saveHotelByOffer(data, requestId)
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

    // Localization
    webServer.addEventListener("localize", (data, requestId, callback) => callback(lang.localize(data.key, data.language, data.arguments)));
})();

/*function handleEvent(emitter, event, handler) {
    emitter.addEventListener(event, async (data, requestId, callback) => callback(await handler(data, requestId)));
}*/