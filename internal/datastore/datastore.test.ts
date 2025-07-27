import test, { describe } from "node:test";
import assert from "node:assert";

import { Datastore } from "./datastore.ts";

describe("Datastore Tests", () => {
    describe("Set and Get", () => {
        [
            {
                name: "Simple Get",
                key: "key",
                expectedValue: "value",
                expectedError: null,
            },
            {
                name: "Invalid Get",
                key: "unknownKey",
                expectedValue: "",
                expectedError: "not found",
            },
        ].forEach(({ name, key, expectedValue, expectedError }) => {
            test(name, () => {
                const datastore = new Datastore();
                datastore.set("key", "value");

                const { value, error } = datastore.get(key);

                assert.strictEqual(value, expectedValue);
                assert.strictEqual(error, expectedError);
            });
        });

        test("Set previously not existing key-value pair", () => {
            const someKey = "some:key";
            const datastore = new Datastore();

            const firstTry = datastore.get(someKey);
            assert.strictEqual(firstTry.value, "");
            assert.strictEqual(firstTry.error, "not found");

            datastore.set(someKey, "some value");
            const secondTry = datastore.get(someKey);
            assert.strictEqual(secondTry.value, "some value");
            assert.strictEqual(secondTry.error, null);
        });

        test("Existing key-value pair may be overriden", () => {
            const someKey = "some:key";
            const datastore = new Datastore();
            datastore.set(someKey, "initial value");

            const firstTry = datastore.get(someKey);
            assert.strictEqual(firstTry.value, "initial value");
            assert.strictEqual(firstTry.error, null);

            datastore.set(someKey, "some value");
            const secondTry = datastore.get(someKey);
            assert.strictEqual(secondTry.value, "some value");
            assert.strictEqual(secondTry.error, null);
        });
    });

    describe("Exists", () => {
        [
            {
                name: "Existing Key",
                key: "key",
                expectedValue: true,
            },
            {
                name: "Not Existing Key",
                key: "unknownKey",
                expectedValue: false,
            },
        ].forEach(({ name, key, expectedValue }) => {
            test(name, () => {
                const datastore = new Datastore();
                datastore.set("key", "value");

                const exists = datastore.exists(key);

                assert.equal(exists, expectedValue);
            });
        });
    });
});
