export type Resp = RespSimpleString | RespInteger | RespBulkString | RespError | RespArray | null;

interface RespFn {
    /**
     * Encode a RESP frame to a Buffer.
     * @returns Buffer containing the encoded frame
     */
    encode: () => Buffer;
    toString: () => string;
}

export interface RespSimpleString extends RespFn {
    type: "RespSimpleString";
    value: string;
}

export interface RespInteger extends RespFn {
    type: "RespInteger";
    value: number;
}

export interface RespBulkString extends RespFn {
    type: "RespBulkString";
    value: string | null;
}

export interface RespError extends RespFn {
    type: "RespError";
    value: string;
}

export interface RespArray extends RespFn {
    type: "RespArray";
    value: Resp[] | null;
}

export const RespSimpleString = (value: string): RespSimpleString => ({
    type: "RespSimpleString",
    value,
    encode: () => Buffer.from(`+${value}${messageSeparator}`),
    toString: () => value,
});

export const RespInteger = (value: number): RespInteger => ({
    type: "RespInteger",
    value,
    encode: () => Buffer.from(`:${value}${messageSeparator}`),
    toString: () => value.toString(),
});

export const RespBulkString = (value: string | null): RespBulkString => ({
    type: "RespBulkString",
    value,
    encode: () => {
        if (value === null) {
            // Special case for null bulk string
            return Buffer.from("$-1\r\n");
        }

        return Buffer.from(`$${Buffer.byteLength(value)}\r\n${value}${messageSeparator}`);
    },
    toString: () => (value === null ? "null" : value),
});

export const RespError = (value: string): RespError => ({
    type: "RespError",
    value,
    encode: () => Buffer.from(`-${value}${messageSeparator}`),
    toString: () => value,
});

export const RespArray = (value: Resp[] | null): RespArray => ({
    type: "RespArray",
    value,
    encode: () => {
        if (value === null) {
            // Special case for null array
            return Buffer.from("*-1\r\n");
        }

        const prefix = `*${value.length}${messageSeparator}`;
        const body = value.map((child) => child?.encode()).join("");
        const postfix = messageSeparator;
        return Buffer.from(prefix + body + postfix);
    },
    toString: () =>
        value === null
            ? "null"
            : `${value.map((v) => (v === null ? "null" : v.toString())).join(" ")}`,
});

// RESP protocol prefixes as constants
const RESP_PREFIXES = {
    SIMPLE_STRING: 43, // '+'.charCodeAt(0)
    INTEGER: 58, // ':'.charCodeAt(0)
    BULK_STRING: 36, // '$'.charCodeAt(0)
    ERROR: 45, // '-'.charCodeAt(0)
    ARRAY: 42, // '*'.charCodeAt(0)
} as const;

const messageSeparator = "\r\n";
const sepLen = Buffer.from(messageSeparator).length;

/**
 * Extract a RESP frame from a Buffer.
 * @param buffer Buffer containing the RESP frame
 * @returns An object containing the extracted frame and its size
 */
export function extractFrameFromBuffer(buffer: Buffer): { frame: Resp | null; frameSize: number } {
    // If there is no separator in the buffer, we cannot extract any RESP frame
    const sep = buffer.indexOf(messageSeparator);
    if (sep < 0) {
        return { frame: null, frameSize: 0 };
    }

    // Check for first byte
    switch (buffer[0]) {
        // Simple String
        case RESP_PREFIXES.SIMPLE_STRING: {
            const value = buffer.subarray(1, sep).toString();
            return { frame: RespSimpleString(value), frameSize: sep + sepLen };
        }

        // Error
        case RESP_PREFIXES.ERROR: {
            const errorValue = buffer.subarray(1, sep).toString();
            return { frame: RespError(errorValue), frameSize: sep + sepLen };
        }

        // Integer
        case RESP_PREFIXES.INTEGER: {
            const value = parseInt(buffer.subarray(1, sep).toString());
            if (isNaN(value)) {
                // If the value is not a valid number, we cannot extract an integer
                return { frame: null, frameSize: 0 };
            }
            return { frame: RespInteger(value), frameSize: sep + sepLen };
        }

        // Bulk String
        case RESP_PREFIXES.BULK_STRING: {
            // If a separator is found, extract the length of the bulk string
            const bulkStringLength = parseInt(buffer.subarray(1, sep).toString());

            // If the length is -1, it indicates a null frame
            if (bulkStringLength === -1) {
                return { frame: RespBulkString(null), frameSize: sep + sepLen };
            }

            // If the length is not a valid number, we cannot extract a RespBulkString
            if (isNaN(bulkStringLength) || bulkStringLength < 0) {
                return { frame: null, frameSize: 0 };
            }

            // There has to be a "closing" separator after the bulk string content
            const secondSeparator = buffer.indexOf(messageSeparator, sep + bulkStringLength);
            if (secondSeparator < 0) {
                // If we cannot find the second separator, we cannot extract a RespBulkString
                return { frame: null, frameSize: 0 };
            }

            // Get the content by grabbing subarray from the first separator to
            // the expected length of the bulk string
            const content = buffer.subarray(sep + sepLen, sep + sepLen + bulkStringLength);

            return {
                frame: RespBulkString(content.toString()),
                frameSize: sep + sepLen + bulkStringLength + sepLen,
            };
        }

        // Array
        case RESP_PREFIXES.ARRAY: {
            // If a separator is found, extract the length of the array
            const arrayLength = parseInt(buffer.subarray(1, sep).toString());

            // If the length is -1, it indicates a null frame
            if (arrayLength === -1) {
                return { frame: RespArray(null), frameSize: sep + sepLen };
            }

            // If the length is not a valid number, we cannot extract an Array
            if (isNaN(arrayLength) || arrayLength < 0) {
                return { frame: null, frameSize: 0 };
            }

            // Let's look for the next `arrayLength` separators
            let currentIndex = sep + sepLen;
            let totalSize = sep + sepLen;
            const frames: Resp[] = [];

            for (let i = 0; i < arrayLength; i++) {
                const frameBuffer = buffer.subarray(currentIndex);
                const extractedFrame = extractFrameFromBuffer(frameBuffer);

                if (extractedFrame.frameSize === 0) {
                    // If we encounter a 0 sized frame, we stop processing
                    return { frame: null, frameSize: 0 };
                }

                frames.push(extractedFrame.frame);
                currentIndex += extractedFrame.frameSize;

                totalSize += extractedFrame.frameSize;
            }

            // If we successfully extracted all frames, return the RespArray
            return {
                frame: RespArray(frames),
                frameSize: totalSize,
            };
        }

        // Fallthrough case for unsupported RESP types
        default:
            return { frame: null, frameSize: 0 };
    }
}

export function encode(resp: Resp): Buffer | null {
    return resp?.encode() || null;
}
