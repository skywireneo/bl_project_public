import handleRequest from "./requestHandler";

export const fetchSystemVersions = async (filters = {}) => {
    return handleRequest('get', 'systemVersions', { params: filters });
};

export const fetchActiveSystemVersions = async () => {
    return handleRequest('get', 'systemVersions/active');
};

export const fetchSystemVersionById = async (id) => {
    return handleRequest('get', `systemVersions/${id}`);
};

export const createSystemVersion = async (data) => {
    return handleRequest('post', 'systemVersions', { body: data });
};

export const updateSystemVersion = async (id, data) => {
    return handleRequest('put', `systemVersions/${id}`, { body: data });
};

export const deactivateSystemVersion = async (id) => {
    return handleRequest('delete', `systemVersions/${id}`);
};