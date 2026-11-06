const { encrypt, decrypt, hashData } = require("./cryptoService");
// const ValidateService = require("./validate/validateService");

// const validateService = new ValidateService();

class userEncriptionService {

    async getTgDataEncrypted(tgId, tgUsername) {

        const encryptedDataTgId = encrypt(String(tgId), "USER_TG");
        const heshTgId = hashData(String(tgId), "USER_TG");
        const encryptedDataTgUsername = encrypt(tgUsername, "USER_TG");
        const heshTgUsername = hashData(tgUsername, "USER_TG");


        // Возвращаем в том же «формате», что и queryService, чтобы не ломать вызовы дальше
        return {
            encryptedDataTgIdEncrypted: encryptedDataTgId.encrypted,
            encryptedDataTgIdIv: encryptedDataTgId.iv,
            encryptedDataTgIdAuthTag: encryptedDataTgId.authTag,
            heshTgId: heshTgId,
            encryptedDataTgUsernameEncrypted: encryptedDataTgUsername.encrypted,
            encryptedDataTgUsernameIv: encryptedDataTgUsername.iv,
            encryptedDataTgUsernameAuthTag: encryptedDataTgUsername.authTag,
            heshTgUsername: heshTgUsername
        };
    }

    async getTgLoginDataDecrypted(encryptedDataNameEncrypted, encryptedDataNameIv, encryptedDataNameAuthTag) {
        if (encryptedDataNameEncrypted && encryptedDataNameIv && encryptedDataNameAuthTag)
            return decrypt({
                encrypted: encryptedDataNameEncrypted,
                iv: encryptedDataNameIv,
                authTag: encryptedDataNameAuthTag
            }, "USER_TG");
        else
            return null
    }
    async getTgIdDataDecrypted(encryptedDataNameEncrypted, encryptedDataNameIv, encryptedDataNameAuthTag) {
        if (encryptedDataNameEncrypted && encryptedDataNameIv && encryptedDataNameAuthTag)
            return decrypt({
                encrypted: encryptedDataNameEncrypted,
                iv: encryptedDataNameIv,
                authTag: encryptedDataNameAuthTag
            }, "USER_TG");
        else
            return null
    }

    async getNameDataEncrypted(name) {

        const encryptedDataName = encrypt(name, "USER_NAME");
        const heshName = hashData(name, "USER_NAME");


        // Возвращаем в том же «формате», что и queryService, чтобы не ломать вызовы дальше
        return {
            encryptedDataNameEncrypted: encryptedDataName.encrypted,
            encryptedDataNameIv: encryptedDataName.iv,
            encryptedDataNameAuthTag: encryptedDataName.authTag,
            heshName: heshName,
        };
    }

    async getNameDataDecrypted(encryptedDataNameEncrypted, encryptedDataNameIv, encryptedDataNameAuthTag) {
        if (encryptedDataNameEncrypted && encryptedDataNameIv && encryptedDataNameAuthTag)
            return decrypt({
                encrypted: encryptedDataNameEncrypted,
                iv: encryptedDataNameIv,
                authTag: encryptedDataNameAuthTag
            }, "USER_NAME");
        else
            return null
    }

    async getPhoneDataEncrypted(phone) {

        const encryptedDataPhone = encrypt(phone, "USER_PHONE");
        const heshPhone = hashData(phone, "USER_PHONE");


        // Возвращаем в том же «формате», что и queryService, чтобы не ломать вызовы дальше
        return {
            encryptedDataPhoneEncrypted: encryptedDataPhone.encrypted,
            encryptedDataPhoneIv: encryptedDataPhone.iv,
            encryptedDataPhoneAuthTag: encryptedDataPhone.authTag,
            heshPhone: heshPhone,
        };
    }

    async getPhoneDataDecrypted(encryptedDataPhoneEncrypted, encryptedDataPhoneIv, encryptedDataPhoneAuthTag) {
        if (encryptedDataPhoneEncrypted && encryptedDataPhoneIv && encryptedDataPhoneAuthTag)
            return decrypt({
                encrypted: encryptedDataPhoneEncrypted,
                iv: encryptedDataPhoneIv,
                authTag: encryptedDataPhoneAuthTag
            }, "USER_PHONE");
        else
            return null
    }

    async getEmailDataEncrypted(email) {

        const encryptedDataEmail = encrypt(email, "USER_EMAIL");
        const heshEmail = hashData(email, "USER_EMAIL");

        return {
            encryptedDataEmailEncrypted: encryptedDataEmail.encrypted,
            encryptedDataEmailIv: encryptedDataEmail.iv,
            encryptedDataEmailAuthTag: encryptedDataEmail.authTag,
            heshEmail: heshEmail,
        };
    }

    async getEmailDataDecrypted(encryptedDataEmailEncrypted, encryptedDataEmailIv, encryptedDataEmailAuthTag) {
        if (encryptedDataEmailEncrypted && encryptedDataEmailIv && encryptedDataEmailAuthTag)
            return decrypt({
                encrypted: encryptedDataEmailEncrypted,
                iv: encryptedDataEmailIv,
                authTag: encryptedDataEmailAuthTag
            }, "USER_EMAIL");
        else
            return null
    }

    async getTgUsernameDataEncrypted(tg) {

        const encryptedDataTg = encrypt(tg, "USER_TG");
        const heshTg = hashData(tg, "USER_TG");

        return {
            encryptedDataTgEncrypted: encryptedDataTg.encrypted,
            encryptedDataTgIv: encryptedDataTg.iv,
            encryptedDataTgAuthTag: encryptedDataTg.authTag,
            heshTg: heshTg,
        };
    }

    async getTgUsernameDataDecrypted(encryptedDataTgEncrypted, encryptedDataTgIv, encryptedDataTgAuthTag) {
        if (encryptedDataTgEncrypted && encryptedDataTgIv && encryptedDataTgAuthTag)
            return decrypt({
                encrypted: encryptedDataTgEncrypted,
                iv: encryptedDataTgIv,
                authTag: encryptedDataTgAuthTag
            }, "USER_TG");
        else
            return null
    }

}

module.exports = new userEncriptionService();
