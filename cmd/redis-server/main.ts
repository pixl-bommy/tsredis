import { getSetupFromArgs } from "../getSetup.ts";
import { createRedisServer } from "./redis-server.ts";

// get "host" and "port" from arguments
const { host, port } = getSetupFromArgs();

// create and run the Redis server
const serverProcess = createRedisServer(host, port);
serverProcess.serve();
