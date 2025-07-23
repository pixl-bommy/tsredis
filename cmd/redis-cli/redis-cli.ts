import { createConnection, Socket } from "node:net";
import {
    encode,
    extractFrameFromBuffer,
    RespArray,
    RespBulkString,
    type Resp,
} from "../../internal/protocol/protocol.ts";

// get "host" and "port" from arguments
// if not provided, use default values
const indexForHost = process.argv.findIndex((arg) => arg === "--host");
const indexForPort = process.argv.findIndex((arg) => arg === "--port");
const host = (indexForHost !== -1 && process.argv[indexForHost + 1]) || "127.0.0.1";
const port = (indexForPort !== -1 && parseInt(process.argv[indexForPort + 1], 10)) || 6379;

const prompt = `${host}:${port}> `;
process.stdin.setEncoding("utf8");

function encodeCommand(cmd: string): Resp {
    const fields = cmd.split(" ");

    const items: Resp[] = fields.map((field) => RespBulkString(field));
    return RespArray(items);
}

const socket = createConnection(port, host);

process.stdout.write(prompt);

process.stdin.on("data", (input) => {
    const data = input.toString().trim();

    // if the input is empty, just return
    if (data === "") {
        process.stdout.write(prompt);
        return;
    }

    // exit if the command is "exit" or "quit"
    if (data === "exit" || data === "quit") {
        process.exit(0);
    }

    // encode the command itself
    const encodedCommand = encode(encodeCommand(data));

    // will never be `null`, but we check for it just in case
    if (!encodedCommand) return;

    // send the encoded command to the Redis server
    socket.write(encodedCommand);
});

socket.on("data", (data: Buffer) => {
    console.log(extractFrameFromBuffer(data).frame?.toString() ?? "No response");

    process.stdout.write(prompt);
});
