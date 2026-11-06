import { makeAutoObservable } from "mobx";
import storageHandler from "../http/utils/storageHandler";

export default class UserStore {
    constructor() {
        this._isAuth = false;
        this._user = {};
        this._permissions = [];
        makeAutoObservable(this);

        // При старте приложения сразу загружаем права из localStorage
        this.loadPermissionsFromStorage();
    }

    setIsAuth(bool) {
        this._isAuth = bool;
        if (!bool) {
            this._permissions = [];
            storageHandler.remove("user_permissions", { method: "localStorage" });
        }
    }

    setUser(user) {
        this._user = user;
    }

    setPermissions(perms) {
        this._permissions = perms || [];
        storageHandler.add("user_permissions", perms, { method: "localStorage" });
    }

    loadPermissionsFromStorage() {
        const stored = storageHandler.get("user_permissions", "localStorage");
        if (stored && Array.isArray(stored)) {
            this._permissions = stored;
        }
    }

    get isAuth() { return this._isAuth; }
    get user() { return this._user; }
    get permissions() { return this._permissions; }
}