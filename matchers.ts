const env = (await import("$/server/env.js")).env

export const directory_alias_suffix_regx = RegExp(env.router.alias_suffix_regx || "\\.directory_alias\\.js$");
export const router_suffix_regx = RegExp(env.router.router_suffix_regx || "\\.router\\.js$");
export const description_suffix_regx = RegExp(env.router.description_suffix_regx || "\\.description\\.[a-zA-Z]{1,10}$");
export const middleware_suffix_regx = RegExp(env.router.middleware_suffix_regx || "\\.middleware\\.(?:js|ts)$");
