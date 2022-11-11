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
        offerDiv.className = "offer tripOffer";
        const offerName = document.createElement("h2");
        const nights = Math.ceil(((new Date(offer.returndate)).valueOf() - (new Date(offer.outboundarrivaldatetime)).valueOf())/1000/60/60/24);
        offerName.innerHTML = `${nights} night${nights == 1 ? '' : 's'}`;
        offerDiv.appendChild(offerName);
        const offerPrice = document.createElement("b");
        offerPrice.innerHTML = `${offer.price}€`;
        offerDiv.appendChild(offerPrice);
        
        const flight = document.createElement("div");
        flight.className = "flightData";
        
        const outgoingFlight = document.createElement("div");
        addFlightData(outgoingFlight, [
            offer.outboundairline,
            (new Date(offer.departuredate)).toLocaleDateString(),
            (new Date(offer.departuredate)).toLocaleTimeString(),
            offer.outbounddepartureairport,
            (new Date(offer.outboundarrivaldatetime)).toLocaleDateString(),
            (new Date(offer.outboundarrivaldatetime)).toLocaleTimeString(),
            offer.outboundarrivalairport
        ]);
        flight.appendChild(outgoingFlight);

        const incomingFlight = document.createElement("div");
        addFlightData(incomingFlight, [
            offer.inboundairline,
            (new Date(offer.returndate)).toLocaleDateString(),
            (new Date(offer.returndate)).toLocaleTimeString(),
            offer.inbounddepartureairport,
            (new Date(offer.inboundarrivaldatetime)).toLocaleDateString(),
            (new Date(offer.inboundarrivaldatetime)).toLocaleTimeString(),
            offer.inboundarrivalairport
        ]);
        flight.appendChild(incomingFlight);

        offerDiv.appendChild(flight);

        const offerDetails = document.createElement("div");
        offerDetails.className = "offerDetails";
        offerDetails.appendChild(createSpan(offer.mealtype));
        offerDetails.appendChild(createSpan(offer.roomtype));

        offerDiv.appendChild(offerDetails);
        const offerButton = document.createElement("button");
        offerButton.innerHTML = "Book"; 
        offerButton.addEventListener("click", () => {});
        offerDiv.appendChild(offerButton);
        container.appendChild(offerDiv);
    }

    unlockPages();
}

function addFlightData(parent, data) {
    parent.appendChild(createSpan(data[0], "airline"));
    parent.appendChild(createSpan(data[1], "depdate"));
    parent.appendChild(createSpan(data[2], "deptime"));
    parent.appendChild(createSpan(data[3], "depairport"));
    parent.appendChild(createSpan(data[4], "arrdate"));
    parent.appendChild(createSpan(data[5], "arrtime"));
    parent.appendChild(createSpan(data[6], "arrairport"));
    parent.appendChild(createSpan('⟶', "arrow"));
};
function createSpan(content, className="") {
    const element = document.createElement("span");
    element.innerHTML = content;
    element.className = className;
    return element
}

window.addEventListener("load", () => {
    const elements = document.getElementsByClassName("hotelFilter");
    for (let i = elements.length-1; i >= 0; --i) elements[i].remove();
    document.getElementById("hotelName").innerHTML = "Test Hotel";
});