function setCookie(key, value) {
    let date = new Date();
    date = new Date(date.setMonth(date.getMonth + 1));
    document.cookie = `${key} = ${value};expires = ${date.toUTCString()};path = /`;
}

function getCookie(key) {
    var match = document.cookie.match(new RegExp('(^| )' + key + '=([^;]+)'));
    if (match) return match[2];
    else return null;
}

function deleteCookie(key, value) {
    document.cookie = `${key} = ;expires = ${(new Date(0)).toUTCString()};path = /`;
}
