import handleRequest from "./requestHandler";
import API_ROUTES from "./apiRoutes";
import { $authHost } from ".";

export const getStats = (metric_name, entity_id, from, to, granularity, format, force_refresh) => {
    const url = API_ROUTES.stats.getStats({ metric_name, entity_id, from, to, granularity, format, force_refresh });
    return handleRequest('get', url);
};

export const getOverviewStats = () => {
    const url = API_ROUTES.stats.overview({});
    return handleRequest('get', url);
};

export const deleteStats = (metric_name, entity_id) => {
    const body = { metric_name, entity_id };
    return handleRequest('post', API_ROUTES.stats.deleteStats, { body });
};

export const getModuleStats = (module) => {
    const url = API_ROUTES.stats.getModuleStats({ module });
    return handleRequest('get', url);
};