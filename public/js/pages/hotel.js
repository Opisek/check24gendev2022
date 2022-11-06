// getting offers from database

var lastFilters = {};
var cachedRows = {};

function getOffers() {
    const container = document.getElementsByClassName("mainList")[0];
    container.scrollTo(0, 0);
    window.scrollTo(0, 0);
    container.innerHTML = "";
    const loadingDiv = document.createElement("div");
    loadingDiv.innerHTML = "Loading... Please wait."
    container.appendChild(loadingDiv);

    let filterParameters = { "hotelid": hotelId };
    for (let input of document.getElementsByClassName("filterInput")) if (input.name != undefined && input.name != "" && input.value != "") filterParameters[input.name] = input.value;

    const page = filterParameters.page;

    let allSame = false;
    if (Object.keys(lastFilters).length == Object.keys(filterParameters).length) {
        allSame = true;
        for (let parameter of Object.keys(filterParameters)) {
            if (parameter == "page") continue;
            if (!(parameter in lastFilters) || lastFilters[parameter] != filterParameters[parameter]) {
                allSame = false;
                break;
            }
        }
    }

    if (allSame) {
        if (page in cachedRows) {
            displayOffers(cachedRows[page]); // will need to await
            return;
        }
    } else {
        lastFilters = filterParameters;
        cachedRows = {};
    }

    lockPages();
    if (!allSame) socket.emit("getOffersByHotelPages", filterParameters, results => updateLastPage(Math.ceil(Number.parseInt(results[0].count) / pagination)));
    socket.emit("getOffersByHotel", filterParameters, results => {
        let startingPage = page - (page - 1) % (dbPagination / pagination);
        for (let i = 0; i < dbPagination / pagination; ++i) {
            let newCache = [];
            for (let j = i; j < i + pagination && j < results.length; ++j) newCache.push(results[j]);
            cachedRows[i + startingPage] = newCache;
        }
        displayOffers(cachedRows[page], page);
    });
}

function displayOffers(offers, page) {
    if (offers.length == 0) {
        if (page > 1) {
            document.getElementById("pageField").value = page - 1;
            getOffers();
        } else {
            const container = document.getElementsByClassName("mainList")[0];
            container.innerHTML = "";
            const emptyDiv = document.createElement("div");
            emptyDiv.innerHTML = "No results found."
            container.appendChild(emptyDiv);
        }
        return;
    }
    
    const container = document.getElementsByClassName("mainList")[0];
    container.scrollTo(0, 0);
    window.scrollTo(0, 0);
    container.innerHTML = "";

    for (let offer of offers) {
        const offerDiv = document.createElement("div");
        offerDiv.className = "offer";
        const offerName = document.createElement("h2");
        offerName.innerHTML = offer.name;
        offerDiv.appendChild(offerName);
        const offerPrice = document.createElement("b");
        offerPrice.innerHTML = `${offer.price}€`;
        offerDiv.appendChild(offerPrice);
        const offerDetails = document.createElement("div");

        const meal = document.createElement("span");
        meal.innerHTML = `${offer.mealtype}`;
        offerDetails.appendChild(meal);

        const room = document.createElement("span");
        room.innerHTML = `${offer.roomtype}`;
        offerDetails.appendChild(room);

        if (offer.oceanview) {
            const ocean = document.createElement("span");
            ocean.innerHTML = `ocean view`;
            offerDetails.appendChild(ocean);
        }

        const departure = document.createElement("span");
        departure.innerHTML = `${offer.departuredate}`;
        offerDetails.appendChild(departure);
        
        const ret = document.createElement("span");
        ret.innerHTML = `${offer.returndate}`;
        offerDetails.appendChild(ret);

        offerDiv.appendChild(offerDetails);
        const offerButton = document.createElement("button");
        offerButton.innerHTML = "Book";
        offerButton.addEventListener("click", () => {});
        offerDiv.appendChild(offerButton);
        container.appendChild(offerDiv);
    }

    unlockPages();
}

const socket = io();

window.addEventListener("load", () => {
    document.getElementById("filterRowStars").remove();
    document.getElementById("hotelName").innerHTML = "Test Hotel";
});