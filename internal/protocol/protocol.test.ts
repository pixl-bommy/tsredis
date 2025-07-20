import test, { describe } from "node:test";
import assert from "node:assert";

import {
    BulkString,
    encodeFrameToBuffer,
    extractFrameFromBuffer,
    RespError,
    SimpleString,
} from "./protocol.ts";

describe("Protocol Tests", () => {
    describe("extract frame from buffer", () => {
        const testCases = [
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
            {
                name: "Full error message",
                buffer: Buffer.from("-Error message\r\n"),
                expectedFrame: RespError("Error message"),
                expectedSize: 16,
            },
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
                name: "bulk sting with length -1 is a null frame",
                buffer: Buffer.from("$-1\r\n"),
                expectedFrame: null,
                expectedSize: 5,
            },
        ];

        testCases.forEach(({ name, buffer, expectedFrame, expectedSize }) => {
            test(name, () => {
                const { frame, frameSize } = extractFrameFromBuffer(buffer);

                assert.deepStrictEqual(frame, expectedFrame, "Failed to parse frame correctly");
                assert.strictEqual(frameSize, expectedSize, "Incorrect frame size");
            });
        });
    });

    describe("encode frame to buffer", () => {
        const testCases = [
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
            {
                name: "Error frame",
                frame: RespError("An error occurred"),
                expectedBuffer: Buffer.from("-An error occurred\r\n"),
            },
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
        ];

        testCases.forEach(({ name, frame, expectedBuffer }) => {
            test(name, () => {
                const buffer = encodeFrameToBuffer(frame);
                assert.deepEqual(buffer, expectedBuffer, "Encoded buffer does not match expected");
            });
        });
    });
});
