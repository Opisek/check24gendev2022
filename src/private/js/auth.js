const bcrypt = require("bcrypt");
const jwt = require('jsonwebtoken');

module.exports = class Auth {
    constructor(secret) {
        this._events = {};
        this._secret = secret;
    }

    addEventListener(name, callback) {
        if (!(name in this._events)) this._events[name] = [];
        this._events[name].push(callback);
        this._socketIndex = 0;

        this._currentRequest = {};
        this._currentRequestIndex = {};
    }
    
    _emit(name, data, requestId, callback = null) {
        if (!(name in this._events)) this._events = [];
        for (const listener of this._events[name]) listener(data, requestId, callback);
    }

    async _databaseRequest(request, data, requestId) {
        return new Promise(res => this._emit(request, data, `${requestId}/${request}`, res));
    }

    _generateJwt(id) {
        return jwt.sign({ id: id, timestamp: Date.now() }, this._secret);
    }

    async login(data, requestId) {
        if (isEmpty(data, "email")) return error("emailMissing");
        if (isEmpty(data, "password")) return error("passwordMissing");

        const userData = await this._databaseRequest("getUserByEmail", { email: data.email }, requestId);
        if (userData.length == 0 || !bcrypt.compareSync(data.password, userData[0].password)) return error("credentialsIncorrect");
        return success(this._generateJwt(userData[0].id));
    }
    async register(data, requestId) {
        if (isEmpty(data, "email")) return error("emailMissing");
        if (data.email.length < 5) return error("emailTooShort");
        if (data.email.length > 128) return error("emailTooLong");
        if (isEmpty(data, "repeatEmail")) return error("repeatEmailMissing");
        if (data.email != data.repeatEmail) return error("emailUnequeal");

        if ((await this._databaseRequest("existsUserByEmail", { email: data.email }, requestId))[0].count != 0) return error("emailExists");

        if (isEmpty(data, "password")) return error("passwordMissing");
        if (data.password.length < 5) return error("passwordTooShort");
        if (data.password.length > 128) return error("passwordTooLong");
        if (isEmpty(data, "repeatPassword")) return error("repeatPasswordMissing");
        if (data.password != data.repeatPassword) return error("passwordUnequeal");

        let id = (await this._databaseRequest("registerUser", { email: data.email, password: bcrypt.hashSync(data.password, 10) }, requestId))[0].id;
        return success(this._generateJwt(id));
    }
    async recover(data, requestId) {
        if (isEmpty(data, "email")) return error("missingEmail");
    }
    async verifyToken(data, requestId) {
        try {
            return jwt.verify(data.token, this._secret).id;
        } catch(e) {
            return null;
        }
    }
};

function isEmpty(object, key) {
    return (!(key in object) || object[key] == undefined || object[key] == '')
}

function success(data) {
    return {
        status: "success",
        data: data
    };
}

function error(message) {
    return {
        status: "error",
        data: message
    };
}