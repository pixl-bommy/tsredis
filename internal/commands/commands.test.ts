import test, { describe } from "node:test";
import {
    RespArray,
    RespBulkString,
    RespError,
    RespInteger,
    RespSimpleString,
} from "../protocol/protocol.ts";
import { handleCommand } from "./commands.ts";
import { Datastore } from "../datastore/datastore.ts";

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
                const response = handleCommand(input, new Datastore());
                if (response.type !== expected.type || response.value !== expected.value) {
                    throw new Error(
                        `Expected "${expected.toString()}" (${
                            expected.type
                        }), but got "${response.toString()}" (${response.type})`,
                    );
                }
            });
        });
    });

    describe("Handle EXISTS Command", () => {
        [
            {
                name: "existing key returns 1",
                input: RespArray([RespBulkString("EXISTS"), RespBulkString("key")]),
                expected: RespInteger(1),
            },
            {
                name: "not existing key returns 0",
                input: RespArray([RespBulkString("EXISTS"), RespBulkString("not-existing-key")]),
                expected: RespInteger(0),
            },
        ].forEach(({ name, input, expected }) => {
            test(name, () => {
                const datastore = new Datastore();
                datastore.set("key", "value"); // Set a key for testing

                const response = handleCommand(input, datastore);

                if (response.type !== expected.type || response.value !== expected.value) {
                    throw new Error(
                        `Expected "${expected.toString()}" (${
                            expected.type
                        }), but got "${response.toString()}" (${response.type})`,
                    );
                }
            });
        });
    });

    describe("Handle SET Command", () => {
        [
            {
                name: "set key with value",
                input: RespArray([RespBulkString("SET"), RespBulkString("key"), RespBulkString("value")]),
                expected: RespSimpleString("OK"),
            },
            {
                name: "set key with empty value",
                input: RespArray([RespBulkString("SET"), RespBulkString("key"), RespBulkString("")]),
                expected: RespSimpleString("OK"),
            },
            {
                name: "set without value",
                input: RespArray([RespBulkString("SET"), RespBulkString("key")]),
                expected: RespError("ERR wrong number of arguments for 'set' command"),
            },
        ].forEach(({ name, input, expected }) => {
            test(name, () => {
                const datastore = new Datastore();
                const response = handleCommand(input, datastore);

                if (response.type !== expected.type || response.value !== expected.value) {
                    throw new Error(
                        `Expected "${expected.toString()}" (${
                            expected.type
                        }), but got "${response.toString()}" (${response.type})`,
                    );
                }
            });
        });
    });

    describe("Handle GET Command", () => {
        [
            {
                name: "get existing key",
                input: RespArray([RespBulkString("GET"), RespBulkString("key")]),
                expected: RespBulkString("value"),
            },
            {
                name: "get non-existing key",
                input: RespArray([RespBulkString("GET"), RespBulkString("non-existing-key")]),
                expected: RespBulkString(""),
            },
        ].forEach(({ name, input, expected }) => {
            test(name, () => {
                const datastore = new Datastore();
                datastore.set("key", "value"); // Set a key for testing

                const response = handleCommand(input, datastore);

                if (response.type !== expected.type || response.value !== expected.value) {
                    throw new Error(
                        `Expected "${expected.toString()}" (${
                            expected.type
                        }), but got "${response.toString()}" (${response.type})`,
                    );
                }
            });
        });
    });
});
