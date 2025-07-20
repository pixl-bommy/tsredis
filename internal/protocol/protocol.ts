type Resp = SimpleString | RespInteger | BulkString | RespError | RespArray | null;

type SimpleString = {
    type: "SimpleString";
    value: string;
};

type RespInteger = {
    type: "Integer";
    value: number;
};

type BulkString = {
    type: "BulkString";
    value: string;
};

type RespError = {
    type: "Error";
    value: string;
};

type RespArray = {
    type: "Array";
    value: Resp[];
};

export const SimpleString = (value: string): SimpleString => ({
    type: "SimpleString",
    value,
});

export const RespInteger = (value: number): RespInteger => ({
    type: "Integer",
    value,
});

export const BulkString = (value: string): BulkString => ({
    type: "BulkString",
    value,
});

export const RespError = (value: string): RespError => ({
    type: "Error",
    value,
});

export const RespArray = (value: Resp[]): RespArray => ({
    type: "Array",
    value,
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
    // Check for first byte
    switch (buffer[0]) {
        // Simple String
        case RESP_PREFIXES.SIMPLE_STRING: {
            // Find the separator
            const sep = buffer.indexOf(messageSeparator);

            // If a separator is found, extract the frame as a SimpleString
            // and return it along with the position of the next message
            if (sep >= 0) {
                const value = buffer.subarray(1, sep).toString();
                return { frame: SimpleString(value), frameSize: sep + sepLen };
            }
            break;
        }

        // Integer
        case RESP_PREFIXES.INTEGER: {
            // Find the separator
            const sep = buffer.indexOf(messageSeparator);

            // If a separator is found, extract the frame as a RespInteger
            // and return it along with the position of the next message
            if (sep >= 0) {
                const value = parseInt(buffer.subarray(1, sep).toString());
                if (!isNaN(value)) {
                    return { frame: RespInteger(value), frameSize: sep + sepLen };
                }
            }
            break;
        }

        // Bulk String
        case RESP_PREFIXES.BULK_STRING: {
            // Find the separator
            const firstSeparator = buffer.indexOf(messageSeparator);

            // If a separator is not found, we cannot extract a BulkString
            if (firstSeparator < 0) break;

            // If a separator is found, extract the length of the bulk string
            const bulkStringLength = parseInt(buffer.subarray(1, firstSeparator).toString());

            // If the length is -1, it indicates a null frame
            if (bulkStringLength === -1) {
                return { frame: null, frameSize: firstSeparator + sepLen };
            }

            // If the length is not a valid number, we cannot extract a BulkString
            if (isNaN(bulkStringLength)) break;

            // let's look for the second separator
            const secondSeparator = buffer.indexOf(messageSeparator, firstSeparator + sepLen);

            // If the second separator is not found, we cannot extract a BulkString
            if (secondSeparator < 0) break;

            // If the second separator is found, extract the frame as a BulkString
            // and return it along with the position of the next message
            const value = buffer.subarray(firstSeparator + sepLen, secondSeparator).toString();
            if (value.length !== bulkStringLength) {
                // TODO: we should handle that case, but for now, we will just leave it as is
                break;
            }

            return {
                frame: BulkString(value),
                frameSize: secondSeparator + sepLen,
            };
        }

        // Error
        case RESP_PREFIXES.ERROR: {
            // Find the separator
            const errorSep = buffer.indexOf(messageSeparator);

            // If a separator is found, extract the frame as a RespError
            // and return it along with the position of the next message
            if (errorSep >= 0) {
                const errorValue = buffer.subarray(1, errorSep).toString();
                return { frame: RespError(errorValue), frameSize: errorSep + sepLen };
            }
            break;
        }

        // Array
        case RESP_PREFIXES.ARRAY: {
            // Find the separator
            const arraySep = buffer.indexOf(messageSeparator);

            // If a separator is found, extract the length of the array
            const arrayLength = parseInt(buffer.subarray(1, arraySep).toString());

            // If the length is -1, it indicates a null frame
            if (arrayLength === -1) {
                return { frame: null, frameSize: arraySep + sepLen };
            }

            // If the length is not a valid number, we cannot extract an Array
            if (isNaN(arrayLength)) break;

            // Let's look for the next `arrayLength` separators
            let currentIndex = arraySep + sepLen;
            let totalSize = arraySep + sepLen;
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

            // next chars have to be the message separator
            const arrayEndSep = buffer.subarray(currentIndex).indexOf(messageSeparator);
            if (arrayEndSep !== 0) {
                // If the next characters are not the message separator, we stop processing
                return { frame: null, frameSize: 0 };
            }

            // If we successfully extracted all frames, return the RespArray
            return {
                frame: RespArray(frames),
                frameSize: totalSize + sepLen,
            };
        }
    }

    return { frame: null, frameSize: 0 };
}

/**
 * Encode a RESP frame to a Buffer.
 * @param frame frame to encode
 * @returns Buffer containing the encoded frame
 * @throws Error if the frame type is not supported
 */
export function encodeFrameToBuffer(frame: Resp): Buffer {
    if (frame === null) {
        // Special case for null frame
        return Buffer.from("$-1\r\n");
    }

    switch (frame.type) {
        case "SimpleString":
            return Buffer.from(`+${frame.value}${messageSeparator}`);
        case "Integer":
            return Buffer.from(`:${frame.value}${messageSeparator}`);
        case "BulkString":
            return Buffer.from(
                `$${Buffer.byteLength(frame.value)}\r\n${frame.value}${messageSeparator}`,
            );
        case "Error":
            return Buffer.from(`-${frame.value}${messageSeparator}`);
        case "Array": {
            const prefix = `*${frame.value.length}${messageSeparator}`;
            const body = frame.value.map(encodeFrameToBuffer).join("");
            const postfix = messageSeparator;
            return Buffer.from(prefix + body + postfix);
        }
        default:
            throw new Error(`Unsupported RESP type: ${(frame as any).type}`);
    }
}
