import { $host } from ".";
import handleRequest from "./requestHandler";

// БЫЛО: const policy = await $authHost.get('policy/getPolicy?policyType=all')
// СТАЛО:
export const fatchPolicy = async () => {
    return handleRequest('get', 'policy/getPolicy', { params: { policyType: 'all' }, noCache: true });
};

export const selectPolicy = async (policyType) => {
    return handleRequest('get', 'policy/getPolicy', { params: { policyType } });
};

export const getPolicyVersions = async (policyType) => {
    return handleRequest('get', 'policy/getPolicyVersions', { params: { policyType } });
};

export const getPolicyVersionDetail = async (policyType, version) => {
    return handleRequest('get', 'policy/getPolicyVersion', { params: { policyType, version } });
};

export const updatePolicy = async (updateType, policyType, text, changeComment, changeDescription = '') => {
    return handleRequest('post', 'policy/updatePolicy', {
        body: { updateType, policyType, text, changeComment, changeDescription }
    });
};

// Для PDF оставляем $host, так как это blob и особая логика, но если он тоже требует защиты, 
// можно добавить генерацию заголовков вручную, но обычно файлы исключают из strict trust.
export const getPDFPolicy = async (policyType) => {
    const response = await $host.get('policy/getPDFPolicy', {
        params: { policyType },
        responseType: 'blob'
    });
    return response;
};