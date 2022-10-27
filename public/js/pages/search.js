function setUrlParameter(paramater, value) {
    let url = new URL(window.location.href);
    url.searchParams.set(paramater, value);
    history.replaceState({}, "Title", url.toString());
}

function changeValue(input, change=0, apply=true) {
    let currentValue = parseInt(input.value);
    if (isNaN(currentValue)) currentValue = 0;
    currentValue += change;
    if (currentValue < input.min) currentValue = input.min;
    else if (currentValue > input.max) currentValue = input.max;
    input.value = currentValue;
    changeInputWidth(input);
    if (apply) setUrlParameter(input.name, input.value);
}

function changeInputWidth(input) {
    if (input.value.length > 5) input.value = input.value.substring(0, 5);
    input.style.width = `${2+.4*input.value.length}em`;
}

let priceElements = {};
const maxPrice = 10000;
const priceRounding = 100;

function upperSliderChange () {
    priceElements.upperField.value = priceElements.upperSlider.value * priceRounding;
    upperFieldChange(true);
}
function lowerSliderChange () {
    priceElements.lowerField.value = priceElements.lowerSlider.value * priceRounding;
    lowerFieldChange(true);
}
function upperFieldChange (sliderChange = false) {
    changeValue(priceElements.upperField, 0, false);
    priceElements.upperSlider.value = Math.ceil(priceElements.upperField.value / priceRounding);
    priceElements.lowerField.max = priceElements.upperField.value;
    changeValue(priceElements.lowerField, 0, false);
    priceElements.lowerSlider.value = Math.floor(priceElements.lowerField.value / priceRounding);
    if (!sliderChange) {
        setUrlParameter(priceElements.upperField.name, priceElements.upperField.value);
        setUrlParameter(priceElements.lowerField.name, priceElements.lowerField.value);
    }
}
function lowerFieldChange (sliderChange = false) {
    changeValue(priceElements.lowerField, 0, false);
    priceElements.lowerSlider.value = Math.floor(priceElements.lowerField.value / priceRounding);
    priceElements.upperField.min = priceElements.lowerField.value;
    changeValue(priceElements.upperField, 0, false);
    priceElements.upperSlider.value = Math.ceil(priceElements.upperField.value / priceRounding);
    if (!sliderChange) {
        setUrlParameter(priceElements.upperField.name, priceElements.upperField.value);
        setUrlParameter(priceElements.lowerField.name, priceElements.lowerField.value);
    }
}

window.addEventListener("load", () => {
    const socket = io();

    const url = new URL(window.location.href);

    priceElements.upperSlider = document.getElementById("filterInputPriceUpperSlider");
    priceElements.lowerSlider = document.getElementById("filterInputPriceLowerSlider");
    priceElements.upperField = document.getElementById("filterInputPriceUpperField");
    priceElements.lowerField = document.getElementById("filterInputPriceLowerField");
    priceElements.upperSlider.max = Math.ceil(maxPrice / priceRounding);
    priceElements.lowerSlider.max = Math.ceil(maxPrice / priceRounding);
    priceElements.upperSlider.min = 0;
    priceElements.lowerSlider.min = 0;
    priceElements.upperField.max = maxPrice;
    priceElements.lowerField.max = maxPrice;
    priceElements.upperField.min = 0;
    priceElements.lowerField.min = 0;
    priceElements.upperField.value = maxPrice;
    priceElements.lowerField.value = 0;

    for (let input of document.getElementsByClassName("filterInput")) {
        if (input.type == "number") {
            input.addEventListener("input", () => changeInputWidth(input));
            input.addEventListener("change", () => changeValue(input));
            for (let button of input.parentElement.getElementsByClassName("filterButton")) button.addEventListener("click", () => changeValue(input, parseInt(button.value)))
        }
        // todo: add search bar query from and to url
        if (input.name != undefined) {
            input.value = url.searchParams.get(input.name);
        }
        if (input.type != "range") {
            changeValue(input, 0, false);
        }
    }

    priceElements.lowerField.max = priceElements.upperField.value;
    priceElements.upperField.min = priceElements.lowerField.value;
    priceElements.upperSlider.value = Math.ceil(priceElements.upperField.value / priceRounding);
    priceElements.lowerSlider.value = Math.floor(priceElements.lowerField.value / priceRounding);
    changeInputWidth(priceElements.upperField);
    changeInputWidth(priceElements.lowerField);
    priceElements.upperSlider.addEventListener("input", () => upperSliderChange());
    priceElements.lowerSlider.addEventListener("input", () => lowerSliderChange());
    priceElements.upperSlider.addEventListener("change", () => changeValue(priceElements.upperField));
    priceElements.lowerSlider.addEventListener("change", () => changeValue(priceElements.lowerField));
    priceElements.upperField.addEventListener("change", () => upperFieldChange());
    priceElements.lowerField.addEventListener("change", () => lowerFieldChange());

    document.getElementById("filterButtonSubmit").addEventListener("click", () => {
        let filterParameters = {}
        for (let input of document.getElementsByClassName("filterInput")) if (input.name != undefined && input.value != "") filterParameters[input.name] = input.value;
        socket.emit("requestOffers", filterParameters);
    });
});