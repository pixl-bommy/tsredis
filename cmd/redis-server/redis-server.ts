import { createServer } from "node:net";
import {
    extractFrameFromBuffer,
    RespArray,
    RespSimpleString,
    type Resp,
} from "../../internal/protocol/protocol.ts";

const PORT = 6379;

const server = createServer((socket) => {
    console.log("client connected");
    socket.on("end", () => {
        console.log("client disconnected");
    });

    socket.on("data", (data) => {
        const frame = extractFrameFromBuffer(data);

        // make sure there is a valid RESP array frame
        if (!frame.frame) {
            console.error("Failed to extract RESP frame from buffer");
            return;
        }
        if (frame.frame.type !== "RespArray") {
            console.error("Expected a RESP array frame");
            return;
        }

        const command = frame.frame.value?.[0]?.toString().toLocaleUpperCase();
        let response: Resp;

        switch (command) {
            // handle RESP commands
            case "PING": {
                response = RespArray([RespSimpleString("PONG")]);
                break;
            }

            case "ECHO": {
                if (frame.frame.value?.length !== 2) {
                    response = RespArray([
                        RespSimpleString("ERR wrong number of arguments for 'echo' command"),
                    ]);
                    break;
                }

                // array has size 2 surely, so we can safely access the second element
                const message = frame.frame.value[1]!.toString();
                response = RespArray([RespSimpleString(message)])
                break;
            }

            // fallback for unknown commands
            default:
                console.error(`Unknown command: ${command}`);
                response = RespArray([RespSimpleString(`ERR unknown command '${command}'`)]);
                break;
        }

        console.log(`Received: ${frame.frame.toString()}`);
        console.log(`Sending: ${response.toString()}`);

        // send the response back to the client
        socket.write(response.encode());
    });
});

server.listen(PORT, () => {
    console.log(`Redis server is running on port ${PORT}`);
});
