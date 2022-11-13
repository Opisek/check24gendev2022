module.exports = class Lang {
    constructor() {
        this._translations = {
            "en": require("../lang/en.json"),
            "de": require("../lang/de.json")
        }
    }
    localize (key, language, args = []) {
        return this._localize(key, language, args, language);
    }
    _localize (key, language, args, initialLanguage) {
        let path = (`${language}.${key}`).split(".");
        let dir = this._translations;
        for (let i = 0; i < path.length;) if (!(dir = dir[path[i++]])) return language == "en" ? this._localize("err.missingTranslation", initialLanguage, args, initialLanguage) : loc(key, "en", args, initialLanguage);
        for (let i = 0; i < args.length;) dir = dir.replace(`$${i}`, args[i++]);
        return dir;
    }
}