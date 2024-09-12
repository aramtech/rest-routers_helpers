// @ts-nocheck
const end_points = [];

function routes_lister(router, path = "", routes = end_points, root = true) {
    if (root) {
        routes.splice(0, routes.length);
    }

    if (router.stack) {
        for (const layer of router.stack) {
            if (layer.route) {
                routes.push({
                    methods: layer.route.methods,
                    path: `${path}${layer.route.path}`.replace("\\", ""),
                    handlers_name: layer.route.stack.map((handler) => handler?.name),
                });
            }
            if (layer?.handle?.stack) {
                const sub_path = String(layer.regexp)
                    .match(/(\^\\?)(.*?)(\\\/\?)/)[2]
                    .replace("\\", "");
                routes_lister(layer.handle, path + sub_path, routes, false);
            }
        }
    }
    return routes;
}

export default end_points;
export { routes_lister };
