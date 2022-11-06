const pagination = 10;
const dbPagination = 100;

var loaded = false;

var pagesLocked = false;
var previousMinPage;
var previousMaxPage;

function setUrlParameter(paramater, value) {
    if (paramater == "" || paramater == undefined || paramater == null) return;
    let url = new URL(window.location.href);
    url.searchParams.set(paramater, value);
    history.replaceState({}, "Title", url.toString());
}

function switchPageWithParameters(subpage) {
    window.location = subpage + document.location.search;
}

function lockPages() {
    if (pagesLocked) return;
    pagesLocked = true;
    let pageField = document.getElementById("pageField");
    previousMinPage = pageField.min;
    previousMaxPage = pageField.max;
    pageField.min = pageField.value;
    pageField.max = pageField.value;
}

function unlockPages() {
    if (!pagesLocked) return;
    pagesLocked = false;
    let pageField = document.getElementById("pageField");
    pageField.min = previousMinPage;
    pageField.max = previousMaxPage;
}

function updateLastPage(lastPage) {
    const pageCountElement = document.getElementById("pageCount");
    let text = pageCountElement.innerHTML.split(" ");
    text[text.length-1] = lastPage
    pageCountElement.innerHTML = text.join(" ");
    if (pagesLocked) previousMaxPage = lastPage;
    else document.getElementById("pageField").max = lastPage;
}

function changeValue(input, change=0, apply=true) {
    let currentValue = parseFloat(input.value);
    if (isNaN(currentValue)) currentValue = 0;
    currentValue += change;
    if (currentValue < input.min) currentValue = input.min;
    else if (currentValue > input.max) currentValue = input.max;
    input.value = currentValue;
    changeInputWidth(input);

    if (apply) setUrlParameter(input.name, input.value);

    if (input.name != "page") {
        const pageField = document.getElementById("pageField");
        pageField.value = 1;
        changeInputWidth(pageField);
    }

    if (loaded && apply) getOffers();
}

function changeInputWidth(input) {
    if (input.value.length > 5) input.value = input.value.substring(0, 5);
    input.style.width = `${2+.4*input.value.length}em`;
}

function upperSliderChange (elements, correction) {
    elements.upperField.value = elements.upperSlider.value / correction;
    upperFieldChange(elements, correction, true);
}
function lowerSliderChange (elements, correction) {
    elements.lowerField.value = elements.lowerSlider.value / correction;
    lowerFieldChange(elements, correction, true);
}
function upperFieldChange (elements, correction, sliderChange = false) {
    changeValue(elements.upperField, 0, false);
    elements.upperSlider.value = elements.upperField.value * correction;
    elements.lowerField.max = elements.upperField.value;
    changeValue(elements.lowerField, 0, false);
    elements.lowerSlider.value = elements.lowerField.value * correction;
    if (!sliderChange) {
        setUrlParameter(elements.upperField.name, elements.upperField.value);
        setUrlParameter(elements.lowerField.name, elements.lowerField.value);
    }
}
function lowerFieldChange (elements, correction, sliderChange = false) {
    changeValue(elements.lowerField, 0, false);
    elements.lowerSlider.value = elements.lowerField.value * correction;
    elements.upperField.min = elements.lowerField.value;
    changeValue(elements.upperField, 0, false);
    elements.upperSlider.value = elements.upperField.value * correction;
    if (!sliderChange) {
        setUrlParameter(elements.upperField.name, elements.upperField.value);
        setUrlParameter(elements.lowerField.name, elements.lowerField.value);
    }
}

function initRange(name, min, max, step, correction) {
    let elements = {};

    elements.upperSlider = document.getElementById(`filterInput${name}UpperSlider`);
    elements.lowerSlider = document.getElementById(`filterInput${name}LowerSlider`);
    elements.upperField = document.getElementById(`filterInput${name}UpperField`);
    elements.lowerField = document.getElementById(`filterInput${name}LowerField`);
    elements.upperSlider.max = max * correction;
    elements.lowerSlider.max = max * correction;
    elements.upperSlider.min = min * correction;
    elements.lowerSlider.min = min * correction;
    elements.upperField.max = max;
    elements.lowerField.max = max;
    elements.upperField.min = min;
    elements.lowerField.min = min;
    elements.upperField.value = max * correction;
    elements.lowerField.value = min * correction;
    elements.upperSlider.step = step * correction;
    elements.lowerSlider.step = step * correction;

    return elements;
}

function readyRange(elements, correction) {
    elements.lowerField.max = elements.upperField.value;
    elements.upperField.min = elements.lowerField.value;
    elements.upperSlider.value = elements.upperField.value * correction;
    elements.lowerSlider.value = elements.lowerField.value * correction;
    changeInputWidth(elements.upperField);
    changeInputWidth(elements.lowerField);
    elements.upperSlider.addEventListener("input", () => upperSliderChange(elements, correction));
    elements.lowerSlider.addEventListener("input", () => lowerSliderChange(elements, correction));
    elements.upperSlider.addEventListener("change", () => changeValue(elements.upperField));
    elements.lowerSlider.addEventListener("change", () => changeValue(elements.lowerField));
    elements.upperField.addEventListener("change", () => upperFieldChange(elements, correction));
    elements.lowerField.addEventListener("change", () => lowerFieldChange(elements, correction));
}

window.addEventListener("load", () => {
    const url = new URL(window.location.href);

    const priceRange = initRange("Price", 0, 10000, 100, 1);
    const startRange = initRange("Stars", 1, 5, .5, 2);

    for (let input of document.getElementsByClassName("filterInput")) {
        if (input.type == "number") {
            input.addEventListener("input", () => changeInputWidth(input));
            input.addEventListener("change", () => changeValue(input));
            for (let button of input.parentElement.getElementsByClassName("filterButton")) button.addEventListener("click", () => changeValue(input, parseInt(button.value)))
        }
        if (input.name != undefined) {
            const urlValue = url.searchParams.get(input.name);
            if (urlValue != "" && urlValue != undefined) input.value = urlValue;
        }
        if (input.type != "range") changeValue(input, apply=false);
    }

    readyRange(priceRange, 1);
    readyRange(startRange, 2);

    document.getElementById("filtersButtonOpen").addEventListener("click", () => document.getElementsByClassName("mainFilters")[0].classList.remove("hidden"));
    document.getElementById("filtersButtonClose").addEventListener("click", () => document.getElementsByClassName("mainFilters")[0].classList.add("hidden"));

    document.getElementById("filterButtonSubmit").addEventListener("click", () => {
        document.getElementsByClassName("mainFilters")[0].classList.add("hidden");
        getOffers();
    });

    getOffers();

    loaded = true;
});