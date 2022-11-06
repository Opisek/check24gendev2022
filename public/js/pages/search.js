// getting offers from database

var lastFilters = {};
var cachedRows = {};

function getOffers() {
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

    if (pagesLocked && allSame) return;
    lockPages();

    const container = document.getElementsByClassName("mainList")[0];
    container.scrollTo(0, 0);
    window.scrollTo(0, 0);
    container.innerHTML = "";
    const loadingDiv = document.createElement("div");
    loadingDiv.innerHTML = "Loading... Please wait."
    container.appendChild(loadingDiv);

    let filterParameters = {};
    for (let input of document.getElementsByClassName("filterInput")) if (input.name != undefined && input.name != "" && input.value != "") filterParameters[input.name] = input.value;

    const page = filterParameters.page;

    if (allSame) {
        if (page in cachedRows) {
            displayOffers(cachedRows[page]); // will need to await
            return;
        }
    } else {
        lastFilters = filterParameters;
        cachedRows = {};
    }

    if (!allSame) socket.emit("getHotelsByFiltersPages", filterParameters, results => updateLastPage(Math.ceil(Number.parseInt(results[0].count) / pagination)));
    socket.emit("getHotelsByFilters", filterParameters, results => {
        let startingPage = page - (page - 1) % (dbPagination / pagination);
        for (let i = 0; i < dbPagination / pagination; ++i) {
            let newCache = [];
            for (let j = i * pagination; j < (i + 1) * pagination && j < results.length; ++j) newCache.push(results[j]);
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
        offerPrice.innerHTML = `from ${offer.price}€`;
        offerDiv.appendChild(offerPrice);
        const offerDetails = document.createElement("div");
        offerDiv.appendChild(offerDetails);
        const offerButton = document.createElement("button");
        offerButton.innerHTML = "See offers";
        offerButton.addEventListener("click", () => offerClick(offer.hotelid));
        offerDiv.appendChild(offerButton);
        container.appendChild(offerDiv);
    }

    unlockPages();
}

function offerClick(id) {
    switchPageWithParameters(`/hotel/${id}`);
}

const socket = io();