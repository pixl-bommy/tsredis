import test, { describe } from "node:test";
import assert from "node:assert";

import {
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
        ];

        testCases.forEach(({ name, frame, expectedBuffer }) => {
            test(name, () => {
                const buffer = encodeFrameToBuffer(frame);
                assert.deepEqual(buffer, expectedBuffer, "Encoded buffer does not match expected");
            });
        });
    });
});
