// @ts-nocheck
import env_obj from "$/server/env.js";

const routes_list = (await import("$/server/utils/routers_helpers/build_endpoints/index.js")).default;

const app_obj = {};
function set_app(app) {
    app_obj.app = app;
}

function remove_route(router, target_routes_paths, target_routes_handlers_contain, path = "", routes = [], root = true, update_endpoints = false) {
    if (!router) {
        if (!app_obj.app?._router) {
            throw {
                status_code: env_obj.response.status_codes.server_error,
                error: {
                    msg: "App Server is not set on the endpoints list builder",
                    name: "server error",
                },
            };
        }
        router = app_obj.app._router;
    }

    if (router.stack) {
        for (const layer of router.stack) {
            if (layer.route) {
                const _path = `${path}${layer.route.path}`;
                const _handlers_names = layer.route.stack.map((handler) => handler?.name);
                let removed = false;
                if (target_routes_paths) {
                    if (target_routes_paths.includes(_path)) {
                        console.log(_path, _handlers_names);
                        removed = true;
                        router.stack = router.stack.filter((_layer) => {
                            const handlers_names = _layer?.route?.stack.map((handler) => handler?.name);
                            return !(
                                handlers_names?.length === _handlers_names?.length &&
                                handlers_names.every((name) => _handlers_names.includes(name)) &&
                                !!_layer?.route?.path &&
                                _layer?.route?.path === layer.route.path
                            );
                        });
                    }
                }
                if (target_routes_handlers_contain) {
                    if (target_routes_handlers_contain.some((target_name) => _handlers_names.filter((name) => name != "<anonymous>").includes(target_name))) {
                        removed = true;
                        router.stack = router.stack.filter((_layer) => {
                            const handlers_names = _layer?.route?.stack.map((handler) => handler?.name);
                            return !(
                                handlers_names?.length === _handlers_names?.length &&
                                handlers_names.every((name) => _handlers_names.includes(name)) &&
                                !!_layer?.route?.path &&
                                _layer?.route?.path === layer.route.path
                            );
                        });
                    }
                }
                if (!removed) {
                    routes.push({
                        methods: layer.route.methods,
                        path: `${path}${layer.route.path}`.replace("\\", ""),
                        handlers_name: layer.route.stack.map((handler) => handler?.name),
                    });
                }
            }
            if (layer?.handle?.stack) {
                console.log(layer.regexp);
                const sub_path = String(layer.regexp)
                    .match(/(\^\\?)(.*?)(\\\/\?)/)[2]
                    .replace("\\", "");
                remove_route(layer.handle, target_routes_paths, target_routes_handlers_contain, path + sub_path, routes, false);
            }
        }
    }
    if (root && update_endpoints) {
        routes_list.splice(0, routes_list.length);
        routes_list.push(...routes);
    }
    return routes;
}

export default remove_route;
export { set_app };
