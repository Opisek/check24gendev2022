const socket = io();

let navMobile = true;
let navExpanded = false;
let domNavRight;
let domNavLeft;
let domNavExpand;
let domNavBlackout;
let timeoutNavHide;

function navResize() {
    let navMobileNew = document.documentElement.clientWidth <= 1000;
    if (navMobile == navMobileNew) return;
    
    navMobile = navMobileNew;
    if (navMobile) {
        domNavRight.classList.add("navHidden");
        domNavLeft.classList.add("navHidden");
        domNavBlackout.classList.add("navFaded");
        domNavRight.classList.add("navFaded");
        domNavLeft.classList.add("navFaded");
        navExpanded = false;
        clearTimeout(timeoutNavHide);
        domNavBlackout.classList.add("navFaded");
        domNavBlackout.classList.add("navHidden");
    } else {
        domNavBlackout.classList.add("navHidden");
        domNavBlackout.classList.remove("navFaded");
        domNavRight.classList.remove("navFaded");
        domNavRight.classList.remove("navHidden");
        domNavLeft.classList.remove("navFaded");
        domNavLeft.classList.remove("navHidden");
        domNavBlackout.classList.add("navHidden");
    }
}

function navExpand(expanded) {
    navExpanded = expanded;
    if (expanded) {
        domNavRight.classList.remove("navHidden");
        domNavLeft.classList.remove("navHidden");
        clearTimeout(timeoutNavHide);
        domNavBlackout.classList.remove("navHidden");
        setTimeout(() => {
            domNavBlackout.classList.remove("navFaded");
            domNavRight.classList.remove("navFaded");
            domNavLeft.classList.remove("navFaded");
        }, 0);
        
    } else {
        domNavRight.classList.add("navFaded");
        domNavLeft.classList.add("navFaded");
        domNavBlackout.classList.add("navFaded");
        timeoutNavHide = setTimeout(() => {
            domNavRight.classList.add("navHidden");
            domNavLeft.classList.add("navHidden");
            domNavBlackout.classList.add("navHidden");
        }, 500);
    }
}

window.addEventListener("resize", navResize);
window.addEventListener("load", () => {
    domNavRight = document.getElementById("navRight");
    domNavLeft = document.getElementById("navLeft");
    domNavExpand = document.getElementById("navExpand");
    domNavBlackout = document.getElementById("navBlackout");
    domNavExpand.addEventListener("click", () => {
        navExpand(!navExpanded);
    });
    domNavBlackout.addEventListener("click", () => {
        navExpand(false);
    });
    navResize();
});