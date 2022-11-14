window.addEventListener("load", () => {
    document.getElementById("logoutButton").addEventListener("click", () => {
        deleteCookie("token");
        location.reload();
    });
})