function validateValue(input, change=0) {
    let currentValue = parseInt(input.value);
    if (isNaN(currentValue)) currentValue = 0;
    currentValue += change;
    if (currentValue < input.min) currentValue = input.min;
    else if (currentValue > input.max) currentValue = input.max;
    input.value = currentValue;
}

function changeValue(input, change=0) {
    validateValue(input, change);    
    changeInputWidth(input);
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
    upperFieldChange();
}
function lowerSliderChange () {
    priceElements.lowerField.value = priceElements.lowerSlider.value * priceRounding;
    lowerFieldChange();
}
function upperFieldChange () {
    changeValue(priceElements.upperField);
    priceElements.upperSlider.value = Math.ceil(priceElements.upperField.value / priceRounding);
    priceElements.lowerField.max = priceElements.upperField.value;
    changeValue(priceElements.lowerField);
    priceElements.lowerSlider.value = Math.floor(priceElements.lowerField.value / priceRounding);
}
function lowerFieldChange () {
    changeValue(priceElements.lowerField);
    priceElements.lowerSlider.value = Math.floor(priceElements.lowerField.value / priceRounding);
    priceElements.upperField.min = priceElements.lowerField.value;
    changeValue(priceElements.upperField);
    priceElements.upperSlider.value = Math.ceil(priceElements.upperField.value / priceRounding);
}

window.addEventListener("load", () => {
    for (let input of document.getElementsByClassName("filterInput")) {
        if (input.type != "number") continue;
        console.log("found");
        input.addEventListener("input", () => changeInputWidth(input));
        input.addEventListener("change", () => changeValue(input));
        for (let button of input.parentElement.getElementsByClassName("filterButton")) button.addEventListener("click", () => changeValue(input, parseInt(button.value)))
        changeValue(input);
    }

    priceElements.upperSlider = document.getElementById("filterInputPriceUpperSlider");
    priceElements.lowerSlider = document.getElementById("filterInputPriceLowerSlider");
    priceElements.upperField = document.getElementById("filterInputPriceUpperField");
    priceElements.lowerField = document.getElementById("filterInputPriceLowerField");
    priceElements.upperSlider.max = Math.ceil(maxPrice / priceRounding);
    priceElements.lowerSlider.max = Math.ceil(maxPrice / priceRounding);
    priceElements.upperField.max = maxPrice;
    priceElements.lowerField.max = maxPrice;
    priceElements.upperSlider.min = 0;
    priceElements.lowerSlider.min = 0;
    priceElements.upperField.min = 0;
    priceElements.lowerField.min = 0;
    priceElements.upperSlider.value = Math.ceil(maxPrice / priceRounding);
    priceElements.lowerSlider.value = 0;
    priceElements.upperField.value = maxPrice;
    priceElements.lowerField.value = 0;
    changeInputWidth(priceElements.upperField);
    changeInputWidth(priceElements.lowerField);
    priceElements.upperSlider.addEventListener("input", () => upperSliderChange());
    priceElements.lowerSlider.addEventListener("input", () => lowerSliderChange());
    priceElements.upperField.addEventListener("change", () => upperFieldChange());
    priceElements.lowerField.addEventListener("change", () => lowerFieldChange());
});