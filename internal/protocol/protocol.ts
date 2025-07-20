type Resp = SimpleString | RespError;

type SimpleString = {
    type: "SimpleString";
    value: string;
};

type RespError = {
    type: "Error";
    value: string;
};

export const SimpleString = (value: string): SimpleString => ({
    type: "SimpleString",
    value,
});

export const RespError = (value: string): RespError => ({
    type: "Error",
    value,
});

// RESP protocol prefixes as constants
const RESP_PREFIXES = {
    SIMPLE_STRING: 43, // '+'.charCodeAt(0)
    ERROR: 45, // '-'.charCodeAt(0)
} as const;

const messageSeparator = "\r\n";
const sepLen = messageSeparator.length;

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
    switch (frame.type) {
        case "SimpleString":
            return Buffer.from(`+${frame.value}${messageSeparator}`);
        case "Error":
            return Buffer.from(`-${frame.value}${messageSeparator}`);
        default:
            throw new Error(`Unsupported RESP type: ${(frame as any).type}`);
    }
}
