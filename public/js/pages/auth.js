var authPage = 0;
var authButtons = [];
var authContainers = [];
var authContainerTimeouts = [];
var authError = [];
var authBusy = [];

function submit(request, i) {
    if (authBusy[i]) return;
    authBusy[i] = true;
    
    const errorField = authContainers[i].getElementsByClassName("formErrorContainer")[0].children[0];
    if (authError[i]) {
        errorField.classList.add("hidden");
        setTimeout(() => {authError[i] = false;}, 250);
    }

    let data = {};
    for (const field of authContainers[i].getElementsByTagName("input")) data[field.name] = field.value;
    socket.emit(request, data, async result => {
        if (result.status == "error") {
            const errorField = authContainers[i].getElementsByClassName("formErrorContainer")[0].children[0];
            await new Promise(res => {
                let wait = setInterval(() => {
                    if (!authError[i]) {
                        clearInterval(wait);
                        res();
                    }
                }, 10);
            });
            errorField.classList.add("hidden");
            errorField.innerHTML = result.data;
            errorField.classList.remove("hidden");
            authError[i] = true;
        } else if (result.status == "success") {
            setCookie("token", result.data);
            const url = new URL(window.location.href);
            const redirect = url.searchParams.get("redirect");
            url.searchParams.delete("redirect");
            window.location = redirect ? redirect : '/' + document.location.search;
        }
        authBusy[i] = false;
    });
}

window.addEventListener("load", () => {
    authButtons.push(document.getElementById("loginButton"));
    authButtons.push(document.getElementById("registerButton"));
    authButtons.push(document.getElementById("recoveryButton"));
    authContainers.push(document.getElementById("loginContainer"));
    authContainers.push(document.getElementById("registerContainer"));
    authContainers.push(document.getElementById("recoveryContainer"));
    
    for (let i = 0; i < 3; ++i) {
        authButtons[i].addEventListener("click", () => {
            const oldContainer = authContainers[authPage];
            authButtons[authPage].classList.remove("active");
            oldContainer.classList.add("hiding");
            authContainerTimeouts[authPage] = setTimeout(() => {
                oldContainer.classList.add("hidden");
                oldContainer.classList.remove("hiding");
            }, 500);

            if (authContainerTimeouts[i] != null) clearTimeout(authContainerTimeouts[i]);

            authButtons[i].classList.add("active");
            authContainers[i].classList.remove("hidden", "hiding");
            authPage = i;
        });
        const submitButton = authContainers[i].getElementsByTagName("button")[0];
        submitButton.addEventListener("click", () => submit(submitButton.value, i));
        authError[i] = false;
        authBusy[i] = false;
    }
});