import { createConnection } from "node:net";
import {
    encode,
    extractFrameFromBuffer,
    RespArray,
    RespBulkString,
    type Resp,
} from "../../internal/protocol/protocol.ts";

export function createRedisCli(host: string, port: number) {
    // prepare wrappers
    const prompt = `${host}:${port}> `;
    const input = createUserPrompt(prompt);
    const redis = createRedisConnection(port, host);

    // create and run main input-response loop
    async function runInputResponseLoop() {
        while (true) {
            const command = await input.readInput();

            // if the command is empty, continue to the next iteration
            if (!command) continue;

            // exit if the command is "exit" or "quit"
            if (command === "exit" || command === "quit") {
                process.exit(0);
            }

            const response = await redis.sendCommand(command);
            console.log(response);
        }
    }

    return { run: runInputResponseLoop };
}

/**
 * Wrapper for user input prompt.
 */
function createUserPrompt(prompt: string) {
    process.stdin.setEncoding("utf8");

    /**
     * Reads user input from the terminal.
     * @param prompt The prompt to display before reading input.
     * @returns A promise that resolves to the user input string.
     */
    function readInput(): Promise<string> {
        return new Promise((resolve) => {
            process.stdout.write(prompt);

            process.stdin.once("data", (data) => {
                const input = data.toString().trim();
                resolve(input);
            });
        });
    }

    return { readInput };
}

/**
 * Wrapper for Redis connection.
 * @param port The port of the Redis server.
 * @param host The host of the Redis server.
 */
function createRedisConnection(port: number, host: string) {
    const socket = createConnection(port, host);

    /**
     * Wrapper for send-receive data.
     *
     * This function sends a command to the Redis server and waits for a response.
     * @param command The command to send to the Redis server.
     * @returns A promise that resolves to the response from the Redis server.
     */
    function sendCommand(command: string): Promise<string | null> {
        return new Promise((resolve) => {
            // encode the command
            const encodedCommand = encode(encodeCommand(command));

            // if the encoded command is null, resolve with null
            if (!encodedCommand) {
                resolve(null);
                return;
            }

            // send the encoded command to the Redis server
            socket.write(encodedCommand);

            // wait for the response
            socket.once("data", (data: Buffer) => {
                const { frame } = extractFrameFromBuffer(data);
                resolve(frame?.toString() ?? null);
            });
        });

        function encodeCommand(cmd: string): Resp {
            const fields = cmd.split(" ");

            const items: Resp[] = fields.map((field) => RespBulkString(field));
            return RespArray(items);
        }
    }

    return { sendCommand };
}
