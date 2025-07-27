import { RespArray, RespError, RespSimpleString, type Resp } from "../protocol/protocol.ts";

export function handleCommand(resp: RespArray): NonNullable<Resp> {
    const commandArray = resp.value;
    if (!commandArray || !commandArray[0]) {
        return RespError("ERR empty command");
    }

    const command = commandArray[0].toString().toLocaleUpperCase();
    switch (command) {
        // handle RESP commands
        case "PING": {
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

        case "ECHO": {
            if (commandArray.length !== 2 || !commandArray[1]) {
                return RespError("ERR wrong number of arguments for 'echo' command");
            }

            // array has size 2 surely, so we can safely access the second element
            return commandArray[1];
        }

        // fallback for unknown commands
        default:
            console.error(`Unknown command: ${command}`);
            return RespError(`ERR unknown command '${command}'`);
    }
}
