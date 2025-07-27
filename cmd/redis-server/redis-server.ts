import { createServer, Socket } from "node:net";
import { extractFrameFromBuffer } from "../../internal/protocol/protocol.ts";
import { handleCommand } from "../../internal/commands/commands.ts";

export function createRedisServer(host: string, port: number) {
    const server = createServer(handleNewSocket);

    function serve() {
        server.listen(port, host, () => {
            console.log(`Redis server is running on ${host}:${port}`);
        });
    }

    return { serve };
}

function handleNewSocket(socket: Socket) {
    console.log("client connected");
    socket.on("end", () => {
        console.log("client disconnected");
    });

    socket.on("data", (data) => {
        const command = extractFrameFromBuffer(data).frame;

        // make sure there is a valid RESP array frame
        if (command?.type !== "RespArray") {
            console.error("Expected a RESP array frame");
            return;
        }

        const response = handleCommand(command);

        console.log(`Received: ${command.toString()}`);
        console.log(`Sending: ${response.toString()}`);

        // send the response back to the client
        socket.write(response.encode());
    });
}
