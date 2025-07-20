import test, { describe } from "node:test";
import assert from "node:assert";

import {
    BulkString,
    encodeFrameToBuffer,
    extractFrameFromBuffer,
    RespArray,
    RespError,
    RespInteger,
    SimpleString,
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
                expectedFrame: SimpleString("OK"),
                expectedSize: 5,
            },
            {
                name: "Full, followed by partial simple string",
                buffer: Buffer.from("+OK\r\n+Next"),
                expectedFrame: SimpleString("OK"),
                expectedSize: 5,
            },
        ].forEach(({ name, buffer, expectedFrame, expectedSize }) => {
            test(`extract: ${name}`, () => {
                const { frame, frameSize } = extractFrameFromBuffer(buffer);

                assert.deepStrictEqual(frame, expectedFrame, "Failed to parse frame correctly");
                assert.strictEqual(frameSize, expectedSize, "Incorrect frame size");
            });
        });

        [
            {
                name: "Simple string with content",
                frame: SimpleString("Hello"),
                expectedBuffer: Buffer.from("+Hello\r\n"),
            },
            {
                name: "Empty simple string",
                frame: SimpleString(""),
                expectedBuffer: Buffer.from("+\r\n"),
            },
        ].forEach(({ name, frame, expectedBuffer }) => {
            test(`encode: ${name}`, () => {
                const buffer = encodeFrameToBuffer(frame);
                assert.deepEqual(buffer, expectedBuffer, "Encoded buffer does not match expected");
            });
        });
    });

    describe("RESP: error", () => {
        [
            {
                name: "Full error message",
                buffer: Buffer.from("-Error message\r\n"),
                expectedFrame: RespError("Error message"),
                expectedSize: 16,
            },
        ].forEach(({ name, buffer, expectedFrame, expectedSize }) => {
            test(`extract: ${name}`, () => {
                const { frame, frameSize } = extractFrameFromBuffer(buffer);

                assert.deepStrictEqual(frame, expectedFrame, "Failed to parse frame correctly");
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
                const buffer = encodeFrameToBuffer(frame);
                assert.deepEqual(buffer, expectedBuffer, "Encoded buffer does not match expected");
            });
        });
    });

    describe("RESP: integer", () => {
        [
            {
                name: "Integer with value",
                buffer: Buffer.from(":42\r\n"),
                expectedFrame: RespInteger(42),
                expectedSize: 5,
            },
            {
                name: "Negative integer",
                buffer: Buffer.from(":-1\r\n"),
                expectedFrame: RespInteger(-1),
                expectedSize: 5,
            },
            {
                name: "Zero integer",
                buffer: Buffer.from(":0\r\n"),
                expectedFrame: RespInteger(0),
                expectedSize: 4,
            },
        ].forEach(({ name, buffer, expectedFrame, expectedSize }) => {
            test(`extract: ${name}`, () => {
                const { frame, frameSize } = extractFrameFromBuffer(buffer);

                assert.deepStrictEqual(frame, expectedFrame, "Failed to parse frame correctly");
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
                const buffer = encodeFrameToBuffer(frame);
                assert.deepEqual(buffer, expectedBuffer, "Encoded buffer does not match expected");
            });
        });
    });

    describe("RESP: bulk string", () => {
        [
            {
                name: "Bulk string with content",
                buffer: Buffer.from("$12\r\nBulk content\r\n"),
                expectedFrame: BulkString("Bulk content"),
                expectedSize: 19,
            },
            {
                name: "Empty bulk string",
                buffer: Buffer.from("$0\r\n\r\n"),
                expectedFrame: BulkString(""),
                expectedSize: 6,
            },
            {
                name: "bulk sting with length -1 is a `null` frame",
                buffer: Buffer.from("$-1\r\n"),
                expectedFrame: null,
                expectedSize: 5,
            },
        ].forEach(({ name, buffer, expectedFrame, expectedSize }) => {
            test(`extract: ${name}`, () => {
                const { frame, frameSize } = extractFrameFromBuffer(buffer);

                assert.deepStrictEqual(frame, expectedFrame, "Failed to parse frame correctly");
                assert.strictEqual(frameSize, expectedSize, "Incorrect frame size");
            });
        });

        [
            {
                name: "Bulk string with content",
                frame: BulkString("Bulk content"),
                expectedBuffer: Buffer.from("$12\r\nBulk content\r\n"),
            },
            {
                name: "Empty bulk string",
                frame: BulkString(""),
                expectedBuffer: Buffer.from("$0\r\n\r\n"),
            },
            {
                name: "`null` frame will be encoded as an special bulk string",
                frame: null,
                expectedBuffer: Buffer.from("$-1\r\n"),
            },
        ].forEach(({ name, frame, expectedBuffer }) => {
            test(`encode: ${name}`, () => {
                const buffer = encodeFrameToBuffer(frame);
                assert.deepEqual(buffer, expectedBuffer, "Encoded buffer does not match expected");
            });
        });
    });

    describe("RESP: array", () => {
        [
            {
                name: "array with basic content",
                buffer: Buffer.from("*2\r\n$12\r\nBulk content\r\n$2\r\nok\r\n\r\n"),
                expectedFrame: RespArray([BulkString("Bulk content"), BulkString("ok")]),
                expectedSize: 33,
            },
            {
                name: "array with mixed content",
                buffer: Buffer.from("*3\r\n$12\r\nBulk content\r\n:123\r\n$2\r\nok\r\n\r\n"),
                expectedFrame: RespArray([
                    BulkString("Bulk content"), // = $12\r\nBulk content\r\n
                    RespInteger(123), // = :123\r\n
                    BulkString("ok"), // = $2\r\nok\r\n
                ]),
                expectedSize: 39,
            },
            {
                name: "array with mixed and `null` content",
                buffer: Buffer.from("*4\r\n$12\r\nBulk content\r\n*-1\r\n:123\r\n$2\r\nok\r\n\r\n"),
                expectedFrame: RespArray([
                    BulkString("Bulk content"), // = $12\r\nBulk content\r\n
                    null, // = *-1\r\n
                    RespInteger(123), // = :123\r\n
                    BulkString("ok"), // = $2\r\nok\r\n
                ]),
                expectedSize: 44,
            },
            {
                name: "Empty array",
                buffer: Buffer.from("*0\r\n\r\n"),
                expectedFrame: RespArray([]),
                expectedSize: 6,
            },
            {
                name: "array with length -1 is a `null` frame",
                buffer: Buffer.from("*-1\r\n"),
                expectedFrame: null,
                expectedSize: 5,
            },
        ].forEach(({ name, buffer, expectedFrame, expectedSize }) => {
            test(`extract: ${name}`, () => {
                const { frame, frameSize } = extractFrameFromBuffer(buffer);

                assert.deepStrictEqual(frame, expectedFrame, "Failed to parse frame correctly");
                assert.strictEqual(frameSize, expectedSize, "Incorrect frame size");
            });
        });

        [
            {
                name: "mixed content array",
                frame: RespArray([
                    BulkString("Bulk content"), // = $12\r\nBulk content\r\n
                    RespInteger(123), // = :123\r\n
                    BulkString("ok"), // = $2\r\nok\r\n
                ]),
                expectedBuffer: Buffer.from("*3\r\n$12\r\nBulk content\r\n:123\r\n$2\r\nok\r\n\r\n"),
            },
            {
                name: "empty array",
                frame: RespArray([]),
                expectedBuffer: Buffer.from("*0\r\n\r\n"),
            },
        ].forEach(({ name, frame, expectedBuffer }) => {
            test(`encode: ${name}`, () => {
                const buffer = encodeFrameToBuffer(frame);
                assert.deepEqual(buffer, expectedBuffer, "Encoded buffer does not match expected");
            });
        });
    });
});
