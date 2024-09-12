import { description_suffix_regx, router_suffix_regx } from "$/server/utils/routers_helpers/matchers.js";
import cluster from "cluster";
import fs from "fs";
import mime from "mime-types";
import path from "path";
import ts from "typescript";
import url from "url";
import root_paths from "../../../dynamic_configuration/root_paths.js";
import env from "../../../env.js";
import { lock_method } from "../../common/index.js";
export type DescriptionProps = {
    fileUrl: string;
    path?: string;
    full_route_path?: string;
    requires_auth?: boolean;
    requires_authorities?: string[];
    description_text?: string;
    method: "all" | "get" | "put" | "post" | "delete";
    request_params_type_string?: string;
    request_body_type_string?: string;
    request_headers_type_string?: string;
    response_content_type?: string;
    response_body_type_string?: string;
    description_file_full_path?: string;
};
export const descriptions_map = {} as {
    [key: string]: DescriptionProps;
};
const router_directory = path.join(root_paths.src_path, env.router.router_directory);

const check_type = (type_string: string) => {
    const sourceCode = `type TempType = ${type_string};`;
    eval(ts.transpile(sourceCode));
};

export const describe = lock_method(
    (options: DescriptionProps) => {
        if (!cluster.isPrimary || env.build_runtime) {
            return;
        }
        try {
            if (!options.response_content_type) {
                options.response_content_type = "application/json";
            } else {
                if (!mime.extension(options.response_content_type)) {
                    console.error("Content Type Not Found", options.response_content_type);
                    throw new Error();
                }
            }

            if (options.request_body_type_string) {
                check_type(options.request_body_type_string);
            } else {
                options.request_body_type_string = "any";
            }

            if (options.request_headers_type_string) {
                check_type(options.request_headers_type_string);
            } else {
                options.request_headers_type_string = "any";
            }

            if (options.request_params_type_string) {
                check_type(options.request_params_type_string);
            } else {
                options.request_params_type_string = "any";
            }

            if (options.response_body_type_string) {
                check_type(options.response_body_type_string);
            } else {
                options.response_body_type_string = "any";
            }
            if (!options.path) {
                options.path = "/";
            }

            const route_path = url.fileURLToPath(options.fileUrl);
            const route_directory = path.dirname(route_path);

            const route_relative_path = url.fileURLToPath(options.fileUrl).replace(router_directory, "");
            const route_relative_directory = path.dirname(route_relative_path);

            const route_file_name = path.basename(route_path);
            const route_suffix_match = route_file_name.match(router_suffix_regx);
            if (!route_suffix_match) {
                console.error(
                    'Invalid Route Name, a route file should end with "' + env.router.router_suffix + '" provided is: ',
                    route_file_name,
                );
                throw new Error();
            }

            const route_file_name_without_extension = route_file_name.slice(
                0,
                route_file_name.indexOf(route_suffix_match[0]),
            );

            const route_precise_path = path.join(
                route_file_name_without_extension == "index"
                    ? route_relative_directory
                    : path.join(route_relative_directory, route_file_name_without_extension),
                options.path || "",
            );
            console.log("Route Full path on describe", route_precise_path);

            const route_directory_content = fs.readdirSync(route_directory);
            const route_description_regx = RegExp(
                `${route_file_name_without_extension}${description_suffix_regx.toString().slice(1, -1)}`,
            );

            const description_file_name = route_directory_content.find((item) => {
                const item_stats = fs.statSync(path.join(route_directory, item));
                if (item_stats.isFile()) {
                    if (item.match(route_description_regx)) {
                        return true;
                    }
                }
                return false;
            });
            const description_file_full_path = !description_file_name
                ? path.join(
                      route_directory,
                      route_file_name_without_extension + env.router.description_pre_extension_suffix + ".md",
                  )
                : path.join(route_directory, description_file_name);
            const route_description_content = `<!-- --start-- ${route_precise_path} -->

# Route Description 
${options.description_text || "No description Text Provided"}

## Route Path: 
${route_precise_path}

## Route Method:
${options.method}

## route Request Headers type definition:
\`\`\`ts
type RequestHeader = ${options.request_headers_type_string || "any"}
\`\`\`

## route Request Params type definition:
\`\`\`ts
type RequestQueryParams = ${options.request_params_type_string || "any"}
\`\`\`

## route Request Body type definition:
\`\`\`ts
type RequestBody = ${options.request_body_type_string || "any"}
\`\`\`

## Response Content Mimetype: 
${options.response_content_type}

## Response Content Type Definition: 
\`\`\`ts
type Response = ${options.response_body_type_string || "any"}
\`\`\`



<!-- --end-- ${route_precise_path} -->`;

            if (!description_file_name) {
                fs.writeFileSync(description_file_full_path, route_description_content);
            } else {
                const content = fs.readFileSync(description_file_full_path, "utf-8");

                if (!content.includes(route_precise_path)) {
                    fs.writeFileSync(description_file_full_path, content + "\n\n" + route_description_content);
                } else {
                    fs.writeFileSync(
                        description_file_full_path,
                        content.replace(
                            RegExp(
                                `\\<\\!-- --start-- ${route_precise_path.replaceAll("/", "\\/")} --\\>(.|\n)*?\\<\\!-- --end-- ${route_precise_path.replaceAll("/", "\\/")} --\\>`,
                            ),
                            route_description_content,
                        ),
                    );
                }
            }

            options.full_route_path = route_precise_path;
            options.description_file_full_path = path.join(route_precise_path, "/describe");

            if (descriptions_map[options.full_route_path]) {
                console.error(
                    "Route Descriptor Already Registered",
                    "\nNew Registeration:",
                    options,
                    "\nOld Registeration:",
                    descriptions_map[options.full_route_path],
                );
                throw new Error();
            }
            options.fileUrl = options.full_route_path;
            descriptions_map[options.full_route_path] = options;
        } catch (error) {
            console.error(error);
            console.error("CRITICAL: Invalid Route Descriptor", options);
            process.exit(-1);
        }
    },
    {
        lock_name: "setting_up_route_descriptions",
    },
);
