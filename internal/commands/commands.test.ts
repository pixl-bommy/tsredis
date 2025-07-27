import test, { describe } from "node:test";
import { RespArray, RespBulkString, RespError, RespSimpleString } from "../protocol/protocol.ts";
import { handleCommand } from "./commands.ts";

describe("Command Tests", () => {
    describe("Handle PING Command", () => {
        [
            {
                name: "PING",
                input: RespArray([RespBulkString("PING")]),
                expected: RespSimpleString("PONG"),
            },
            {
                name: "ping",
                input: RespArray([RespBulkString("ping")]),
                expected: RespSimpleString("PONG"),
            },
            {
                name: "ping with a param",
                input: RespArray([RespBulkString("PING"), RespBulkString("param")]),
                expected: RespBulkString("param"),
            },
            {
                name: "ping with multiple params",
                input: RespArray([
                    RespBulkString("PING"),
                    RespBulkString("p1"),
                    RespBulkString("p2"),
                ]),
                expected: RespError("ERR wrong number of arguments for 'ping' command"),
            },
            {
                name: "echo hello world",
                input: RespArray([RespBulkString("ECHO"), RespBulkString("Hello World")]),
                expected: RespBulkString("Hello World"),
            },
        ].forEach(({ name, input, expected }) => {
            test(name, () => {
                const response = handleCommand(input);
                if (response.type !== expected.type || response.value !== expected.value) {
                    throw new Error(
                        `Expected "${expected.toString()}" (${expected.type}), but got "${response.toString()}" (${response.type})`,
                    );
                }
            });
        });
    });
});
