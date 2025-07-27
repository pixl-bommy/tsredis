import assert from "node:assert";
import test, { describe } from "node:test";

import { DEFAULT_HOST, DEFAULT_PORT, getSetupFromArgs } from "./getSetup.ts";

describe("getSetupFromArgs", () => {
    test("return default host and port when no args are provided", () => {
        const setup = getSetupFromArgs([]);
        assert.deepStrictEqual(setup, { host: DEFAULT_HOST, port: DEFAULT_PORT });
    });

    test("return provided host and default port when only host is specified", () => {
        const setup = getSetupFromArgs(["--host", "192.168.1.1"]);
        assert.deepStrictEqual(setup, { host: "192.168.1.1", port: DEFAULT_PORT });
    });

    test("return provided port and default host when only port is specified", () => {
        const setup = getSetupFromArgs(["--port", "1234"]);
        assert.deepStrictEqual(setup, { host: DEFAULT_HOST, port: 1234 });
    });

    test("return provided host and port when both are specified", () => {
        const setup = getSetupFromArgs(["--host", "10.0.0.2", "--port", "4321"]);
        assert.deepStrictEqual(setup, { host: "10.0.0.2", port: 4321 });
    });

    test("ignore extra unrelated arguments", () => {
        const setup = getSetupFromArgs(["foo", "--host", "localhost", "bar", "--port", "8888"]);
        assert.deepStrictEqual(setup, { host: "localhost", port: 8888 });
    });

    test("use default port if provided port value is not a number", () => {
        const setup = getSetupFromArgs(["--port", "notanumber"]);
        assert.deepStrictEqual(setup, { host: DEFAULT_HOST, port: DEFAULT_PORT });
    });
});
