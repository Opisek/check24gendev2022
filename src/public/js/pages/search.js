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

    let filterParameters = {};
    for (let input of document.getElementsByClassName("filterInput")) {
        if (input.type == "checkbox") filterParameters[input.name] = input.checked;
        else if (input.name != undefined && input.name != "" && input.value != "") filterParameters[input.name] = input.value;
    }
    filterParameters.token = getCookie("token");

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
        if (pagesLocked) return;
        if (page in cachedRows) {
            displayOffers(cachedRows[page]); // will need to await
            return;
        }
    } else {
        lastFilters = filterParameters;
        cachedRows = {};
    }

    lockPages();
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
            document.getElementById("pageField").value = page - 1; // deprecated because of min max, should've remove or use binary search
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
        if (offer.saved) offerDiv.className = "offer saved";
        else offerDiv.className = "offer"

        const offerName = document.createElement("h2");
        offerName.innerHTML = offer.name;
        offerDiv.appendChild(offerName);

        const offerPrice = document.createElement("b");
        offerPrice.innerHTML = `from ${offer.price}€`;
        offerDiv.appendChild(offerPrice);

        const offerDetails = document.createElement("div");
        offerDetails.className = "offerDetails";

        const stars = document.createElement("span");
        stars.innerHTML = `${offer.stars} ★`;
        offerDetails.appendChild(stars);

        const amount = document.createElement("span");
        amount.innerHTML = `${offer.amount} offer(s)`;
        offerDetails.appendChild(amount);
        offerDiv.appendChild(offerDetails);

        const offerButton = document.createElement("button");
        offerButton.innerHTML = "See offers";
        offerButton.addEventListener("click", () => offerClick(offer.hotelid));
        offerDiv.appendChild(offerButton);
        

        const starButton = document.createElement("span");
        starButton.classList.add("starButton");
        starButton.innerHTML = '★';
        starButton.addEventListener("click", () => starClick(offer.hotelid, offerDiv));
        offerDiv.appendChild(starButton);

        container.appendChild(offerDiv);
    }

    unlockPages();
}

function starClick(id, offer) {
    const token = getCookie("token");
    if (token == null) {
        setUrlParameter("redirect", "search");
        switchPageWithParameters("/auth");
    } else {
        if (offer.classList.contains("saved")) {
            offer.classList.remove("saved");
            socket.emit("unsaveHotel", { token: token, hotelId: id });
        } else {
            offer.classList.add("saved");
            socket.emit("saveHotel", { token: token, hotelId: id });
        }
    }
}

function offerClick(id) {
    switchPageWithParameters(`/hotel/${id}`);
}