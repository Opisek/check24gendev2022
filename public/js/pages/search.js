function changeValue(input, change=0) {
    let currentValue = parseInt(input.value);
    if (isNaN(currentValue)) currentValue = 0;
    currentValue += change;
    if (currentValue < input.min) currentValue = input.min;
    if (currentValue > input.max) currentValue = input.max;
    input.value = currentValue;
    changeInputWidth(input);
}

function changeInputWidth(input) {
    if (input.value.length > 5) input.value = input.value.substring(0, 5);
    input.style.width = `${2+.4*input.value.length}em`;
}

window.addEventListener("load", () => {
    for (let input of document.getElementsByClassName("filterInput")) {
        input.addEventListener("keyup", () => changeValue(input));
        input.addEventListener("keydown", () => changeValue(input));
        input.addEventListener("input", () => changeValue(input));
        for (let button of input.parentElement.getElementsByClassName("filterButton")) button.addEventListener("click", () => changeValue(input, parseInt(button.value)))
        changeValue(input);
    }
});