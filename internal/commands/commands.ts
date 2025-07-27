import type { Datastore } from "../datastore/datastore.ts";
import {
    RespArray,
    RespBulkString,
    RespError,
    RespInteger,
    RespSimpleString,
    type Resp,
} from "../protocol/protocol.ts";

export function handleCommand(resp: RespArray, datastore: Datastore): NonNullable<Resp> {
    const commandArray = resp.value;
    if (!commandArray || !commandArray[0]) {
        return RespError("ERR empty command");
    }

    const command = commandArray[0].toString().toLocaleUpperCase();
    switch (command) {
        // handle RESP commands
        case "PING":
            return handlePingCommand(commandArray);

        case "ECHO":
            return handleEchoCommand(commandArray);

        case "EXISTS":
            return handleExistsCommand(commandArray, datastore);

        case "SET":
            return handleSetCommand(commandArray, datastore);

        case "GET":
            return handleGetCommand(commandArray, datastore);

        // fallback for unknown commands
        default:
            console.error(`Unknown command: ${command}`);
            return RespError(`ERR unknown command '${command}'`);
    }
}

function handlePingCommand(commandArray: Resp[]): NonNullable<Resp> {
    // without params, return PONG
    if (commandArray.length === 1) {
        return RespSimpleString("PONG");
    }
    // with too many params, return error
    else if (commandArray.length !== 2 || !commandArray[1]) {
        return RespError("ERR wrong number of arguments for 'ping' command");
    }

    // with one param, return the param
    return commandArray[1];
}

function handleEchoCommand(commandArray: Resp[]): NonNullable<Resp> {
    if (commandArray.length !== 2 || !commandArray[1]) {
        return RespError("ERR wrong number of arguments for 'echo' command");
    }

    // array has size 2 surely, so we can safely access the second element
    return commandArray[1];
}

function handleExistsCommand(commandArray: Resp[], datastore: Datastore): NonNullable<Resp> {
    if (commandArray.length !== 2 || !commandArray[1]) {
        return RespError("ERR wrong number of arguments for 'exists' command");
    }

    // array has size 2 surely, so we can safely access the second element
    const key = commandArray[1].toString();

    // check if the key exists in the datastore
    const exists = datastore.exists(key);

    // if the value is not empty, the key exists
    return RespInteger(exists ? 1 : 0);
}

function handleSetCommand(commandArray: Resp[], datastore: Datastore): NonNullable<Resp> {
    if (commandArray.length !== 3 || !commandArray[1] || !commandArray[2]) {
        return RespError("ERR wrong number of arguments for 'set' command");
    }

    // array has size 3 surely, so we can safely access the second and third elements
    const key = commandArray[1].toString();
    const value = commandArray[2].toString();

    // store the value in the datastore
    const { error } = datastore.set(key, value);
    if (error) {
        // something went wrong, return an error
        return RespError(`ERR ${error}`);
    }

    // if everything went well, return a simple string response
    return RespSimpleString(`OK`);
}

function handleGetCommand(commandArray: Resp[], datastore: Datastore): NonNullable<Resp> {
    if (commandArray.length !== 2 || !commandArray[1]) {
        return RespError("ERR wrong number of arguments for 'get' command");
    }

    // array has size 2 surely, so we can safely access the second element
    const key = commandArray[1].toString();

    // retrieve the value from the datastore
    const { value, error } = datastore.get(key);

    // if there is an error, which is not "not found", something went wrong
    // otherwise, return the empty string if the key does not exist
    if (error && error !== "not found") {
        // something went wrong, return an error
        return RespError(`ERR ${error}`);
    }

    // if everything went well, return a simple string response
    return RespBulkString(value);
}
