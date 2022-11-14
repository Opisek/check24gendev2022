window.addEventListener("load", () => {
    document.getElementById("colorButton").addEventListener("click", () => {
        if (color == "default") setCookie("color", "dark");
        else setCookie("color", "default");
        location.reload();
    });
});