import test, { describe } from "node:test";
import assert from "node:assert";

import {
    RespBulkString,
    extractFrameFromBuffer,
    RespArray,
    RespError,
    RespInteger,
    RespSimpleString,
} from "./protocol.ts";

describe("Protocol Tests", () => {
    describe("RESP: simple string", () => {
        [
            {
                name: "Partial message",
                buffer: Buffer.from("+Par"),
                expectedFrame: null,
                expectedSize: 0,
            },
            {
                name: "Full simple string",
                buffer: Buffer.from("+OK\r\n"),
                expectedFrame: RespSimpleString("OK"),
                expectedSize: 5,
            },
            {
                name: "Full, followed by partial simple string",
                buffer: Buffer.from("+OK\r\n+Next"),
                expectedFrame: RespSimpleString("OK"),
                expectedSize: 5,
            },
        ].forEach(({ name, buffer, expectedFrame, expectedSize }) => {
            test(`extract: ${name}`, () => {
                const { frame, frameSize } = extractFrameFromBuffer(buffer);

                assert.strictEqual(
                    frame?.value,
                    expectedFrame?.value,
                    "Failed to parse frame correctly",
                );
                assert.strictEqual(frameSize, expectedSize, "Incorrect frame size");
            });
        });

        [
            {
                name: "Simple string with content",
                frame: RespSimpleString("Hello"),
                expectedBuffer: Buffer.from("+Hello\r\n"),
            },
            {
                name: "Empty simple string",
                frame: RespSimpleString(""),
                expectedBuffer: Buffer.from("+\r\n"),
            },
        ].forEach(({ name, frame, expectedBuffer }) => {
            test(`encode: ${name}`, () => {
                const buffer = frame.encode();
                assert.deepEqual(buffer, expectedBuffer, "Encoded buffer does not match expected");
            });
        });
    });

    describe("RESP: error", () => {
        [
            {
                name: "Partial error message",
                buffer: Buffer.from("-Error"),
                expectedFrame: null,
                expectedSize: 0,
            },
            {
                name: "Full error message",
                buffer: Buffer.from("-Error message\r\n"),
                expectedFrame: RespError("Error message"),
                expectedSize: 16,
            },
            {
                name: "Full, followed by partial error message",
                buffer: Buffer.from("-Error message\r\n-Other"),
                expectedFrame: RespError("Error message"),
                expectedSize: 16,
            },
        ].forEach(({ name, buffer, expectedFrame, expectedSize }) => {
            test(`extract: ${name}`, () => {
                const { frame, frameSize } = extractFrameFromBuffer(buffer);

                assert.strictEqual(
                    frame?.value,
                    expectedFrame?.value,
                    "Failed to parse frame correctly",
                );
                assert.strictEqual(frameSize, expectedSize, "Incorrect frame size");
            });
        });

        [
            {
                name: "Error frame",
                frame: RespError("An error occurred"),
                expectedBuffer: Buffer.from("-An error occurred\r\n"),
            },
        ].forEach(({ name, frame, expectedBuffer }) => {
            test(`encode: ${name}`, () => {
                const buffer = frame.encode();
                assert.deepEqual(buffer, expectedBuffer, "Encoded buffer does not match expected");
            });
        });
    });

    describe("RESP: integer", () => {
        [
            {
                name: "Partial integer",
                buffer: Buffer.from(":42"),
                expectedFrame: null,
                expectedSize: 0,
            },
            {
                name: "Full integer",
                buffer: Buffer.from(":42\r\n"),
                expectedFrame: RespInteger(42),
                expectedSize: 5,
            },
            {
                name: "full negative integer",
                buffer: Buffer.from(":-1\r\n"),
                expectedFrame: RespInteger(-1),
                expectedSize: 5,
            },
            {
                name: "Full, followed by partial integer",
                buffer: Buffer.from(":42\r\n:545"),
                expectedFrame: RespInteger(42),
                expectedSize: 5,
            },
        ].forEach(({ name, buffer, expectedFrame, expectedSize }) => {
            test(`extract: ${name}`, () => {
                const { frame, frameSize } = extractFrameFromBuffer(buffer);

                assert.strictEqual(
                    frame?.value,
                    expectedFrame?.value,
                    "Failed to parse frame correctly",
                );
                assert.strictEqual(frameSize, expectedSize, "Incorrect frame size");
            });
        });

        [
            {
                name: "Positive integer",
                frame: RespInteger(12345),
                expectedBuffer: Buffer.from(":12345\r\n"),
            },
            {
                name: "Negative integer",
                frame: RespInteger(-67890),
                expectedBuffer: Buffer.from(":-67890\r\n"),
            },
        ].forEach(({ name, frame, expectedBuffer }) => {
            test(`encode: ${name}`, () => {
                const buffer = frame.encode();
                assert.deepEqual(buffer, expectedBuffer, "Encoded buffer does not match expected");
            });
        });
    });

    describe("RESP: bulk string", () => {
        [
            {
                name: "Partial bulk string",
                buffer: Buffer.from("$5\r\nHel"),
                expectedFrame: null,
                expectedSize: 0,
            },
            {
                name: "Full bulk string",
                buffer: Buffer.from("$5\r\nHello\r\n"),
                expectedFrame: RespBulkString("Hello"),
                expectedSize: 11,
            },
            {
                name: "Longer bulk string",
                buffer: Buffer.from("$12\r\nHello, World\r\n"),
                expectedFrame: RespBulkString("Hello, World"),
                expectedSize: 19,
            },
            {
                name: "Bulk string with embedded newline",
                buffer: Buffer.from("$12\r\nHello\r\nWorld\r\n"),
                expectedFrame: RespBulkString("Hello\r\nWorld"),
                expectedSize: 19,
            },
            {
                name: "Empty bulk string",
                buffer: Buffer.from("$0\r\n\r\n"),
                expectedFrame: RespBulkString(""),
                expectedSize: 6,
            },
            {
                name: "Null bulk string",
                buffer: Buffer.from("$-1\r\n"),
                expectedFrame: RespBulkString(null),
                expectedSize: 5,
            },
        ].forEach(({ name, buffer, expectedFrame, expectedSize }) => {
            test(`extract: ${name}`, () => {
                const { frame, frameSize } = extractFrameFromBuffer(buffer);

                assert.strictEqual(
                    frame?.value,
                    expectedFrame?.value,
                    "Failed to parse frame correctly",
                );
                assert.strictEqual(frameSize, expectedSize, "Incorrect frame size");
            });
        });

        [
            {
                name: "Bulk string with content",
                frame: RespBulkString("Bulk content"),
                expectedBuffer: Buffer.from("$12\r\nBulk content\r\n"),
            },
            {
                name: "Bulk string with embedded newline",
                frame: RespBulkString("Bulk\r\ncontent"),
                expectedBuffer: Buffer.from("$13\r\nBulk\r\ncontent\r\n"),
            },
            {
                name: "Empty bulk string",
                frame: RespBulkString(""),
                expectedBuffer: Buffer.from("$0\r\n\r\n"),
            },
            {
                name: "`null` frame will be encoded as an special bulk string",
                frame: RespBulkString(null),
                expectedBuffer: Buffer.from("$-1\r\n"),
            },
        ].forEach(({ name, frame, expectedBuffer }) => {
            test(`encode: ${name}`, () => {
                const buffer = frame.encode();
                assert.deepEqual(buffer, expectedBuffer, "Encoded buffer does not match expected");
            });
        });
    });

    describe("RESP: array", () => {
        [
            {
                name: "Partial array",
                buffer: Buffer.from("*2\r\n$5\r\nhello\r\n$5\r\n"),
                expectedFrame: null,
                expectedSize: 0,
            },
            {
                name: "Full array with two bulk strings",
                buffer: Buffer.from("*2\r\n$5\r\nhello\r\n$5\r\nworld\r\n"),
                expectedFrame: RespArray([RespBulkString("hello"), RespBulkString("world")]),
                expectedSize: 26,
            },
            {
                name: "Full array with two bulk strings and partial next message",
                buffer: Buffer.from("*2\r\n$5\r\nhello\r\n$5\r\nworld\r\n+OK"),
                expectedFrame: RespArray([RespBulkString("hello"), RespBulkString("world")]),
                expectedSize: 26,
            },
            {
                name: "Partial array of integers",
                buffer: Buffer.from("*3\r\n:1\r\n:"),
                expectedFrame: null,
                expectedSize: 0,
            },
            {
                name: "Full array of integers",
                buffer: Buffer.from("*3\r\n:1\r\n:2\r\n:3\r\n"),
                expectedFrame: RespArray([RespInteger(1), RespInteger(2), RespInteger(3)]),
                expectedSize: 16,
            },
            {
                name: "Full array of integers with partial next message",
                buffer: Buffer.from("*3\r\n:1\r\n:2\r\n:3\r\n+OK"),
                expectedFrame: RespArray([RespInteger(1), RespInteger(2), RespInteger(3)]),
                expectedSize: 16,
            },
            {
                name: "`null` array",
                buffer: Buffer.from("*-1\r\n"),
                expectedFrame: RespArray(null),
                expectedSize: 5,
            },
        ].forEach(({ name, buffer, expectedFrame, expectedSize }) => {
            test(`extract: ${name}`, () => {
                const { frame, frameSize } = extractFrameFromBuffer(buffer);

                // TODO: Check original frame type without encoding it before (WORKAROUND)
                const expectedBuffer = expectedFrame?.encode();
                const actualBuffer = frame?.encode();

                assert.deepEqual(actualBuffer, expectedBuffer, "Failed to parse frame correctly");
                assert.strictEqual(frameSize, expectedSize, "Incorrect frame size");
            });
        });

        [
            {
                name: "mixed content array",
                frame: RespArray([
                    RespBulkString("Bulk content"), // = $12\r\nBulk content\r\n
                    RespInteger(123), // = :123\r\n
                    RespBulkString("ok"), // = $2\r\nok\r\n
                ]),
                expectedBuffer: Buffer.from(
                    "*3\r\n$12\r\nBulk content\r\n:123\r\n$2\r\nok\r\n\r\n",
                ),
            },
            {
                name: "empty array",
                frame: RespArray([]),
                expectedBuffer: Buffer.from("*0\r\n\r\n"),
            },
            {
                name: "`null` array",
                frame: RespArray(null),
                expectedBuffer: Buffer.from("*-1\r\n"),
            },
        ].forEach(({ name, frame, expectedBuffer }) => {
            test(`encode: ${name}`, () => {
                const buffer = frame.encode();
                assert.deepEqual(buffer, expectedBuffer, "Encoded buffer does not match expected");
            });
        });
    });
});
