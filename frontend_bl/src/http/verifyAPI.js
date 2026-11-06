import handleRequest from "./requestHandler";
import API_ROUTES from "./apiRoutes";

/**
 * Проверка подлинности документа по токену
 * Публичный запрос — без авторизации
 */
export const getVerifyInfo = (token) => {
    const url = API_ROUTES.verify.getInfo({ token });
    return handleRequest('get', url, { skipAuth: true });
};