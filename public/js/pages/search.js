function setUrlParameter(paramater, value) {
    let url = new URL(window.location.href);
    url.searchParams.set(paramater, value);
    history.replaceState({}, "Title", url.toString());
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
}

function changeInputWidth(input) {
    if (input.value.length > 5) input.value = input.value.substring(0, 5);
    input.style.width = `${2+.4*input.value.length}em`;
}

function upperSliderChange (elements, correction) {
    elements.upperField.value = elements.upperSlider.value / correction;
    console.log(elements.upperSlider.value);
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
    const socket = io();

    const url = new URL(window.location.href);

    const priceRange = initRange("Price", 0, 10000, 100, 1);
    const startRange = initRange("Stars", .5, 5, .5, 2);

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

    readyRange(priceRange, 1);
    readyRange(startRange, 2);

    document.getElementById("filterButtonSubmit").addEventListener("click", () => {
        let filterParameters = {}
        for (let input of document.getElementsByClassName("filterInput")) if (input.name != undefined && input.name != "" && input.value != "") filterParameters[input.name] = input.value;
        socket.emit("requestOffers", filterParameters);
    });
});