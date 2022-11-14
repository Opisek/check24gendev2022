function localize(key, language, arguments = []) {
    return new Promise(resolve => socket.emit("localize", { key: key, language: language, arguments: arguments }, result => resolve(result)));
}