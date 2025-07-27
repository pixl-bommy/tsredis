export const DEFAULT_HOST = "127.0.0.1";
export const DEFAULT_PORT = 6379;

export function getSetupFromArgs(args: string[] = process.argv) {
    // get "host" and "port" from arguments
    // if not provided, use default values
    const indexForHost = args.findIndex((arg) => arg === "--host");
    const indexForPort = args.findIndex((arg) => arg === "--port");
    const host = (indexForHost !== -1 && args[indexForHost + 1]) || DEFAULT_HOST;
    const port = (indexForPort !== -1 && parseInt(args[indexForPort + 1], 10)) || DEFAULT_PORT;

    return { host, port };
}
