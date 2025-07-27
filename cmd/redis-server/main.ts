import { Datastore } from "../../internal/datastore/datastore.ts";
import { getSetupFromArgs } from "../getSetup.ts";
import { createRedisServer } from "./redis-server.ts";

// get "host" and "port" from arguments
const { host, port } = getSetupFromArgs();

// Create a datastore instance
const datastore = new Datastore();

// create and run the Redis server
const serverProcess = createRedisServer(host, port, datastore);
serverProcess.serve();
