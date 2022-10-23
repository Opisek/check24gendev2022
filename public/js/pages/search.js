function changeInputWidth(input) {
    if (input.value.length > 5) input.value = input.value.substring(0, 5);
    input.style.width = `${2+.4*input.value.length}em`;
}

window.addEventListener("load", () => {
    for (let input of document.getElementsByClassName("filterInput")) {
        input.addEventListener("keyup", () => changeInputWidth(input));
        input.addEventListener("keydown", () => changeInputWidth(input));
        input.addEventListener("input", () => changeInputWidth(input));
    }
});