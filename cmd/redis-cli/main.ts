import { getSetupFromArgs } from "../getSetup.ts";
import { createRedisCli } from "./redis-cli.ts";

// get "host" and "port" from arguments
const { host, port } = getSetupFromArgs();

// create and run the Redis CLI
const cliProcess = createRedisCli(host, port);
cliProcess.run();
