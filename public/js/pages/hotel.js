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

    document.getElementsByClassName("mainFilters")[0].classList.add("hidden");

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
        offerDiv.appendChild(offerDetails);
        container.appendChild(offerDiv);
    }
}

const socket = io();

window.addEventListener("load", () => {
    document.getElementById("filterRowStars").remove();
    document.getElementById("hotelName").innerHTML = "Test Hotel";
});