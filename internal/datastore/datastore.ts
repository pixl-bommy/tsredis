interface MapEntryStructure<V = string> {
    value: V;
}

export class Datastore {
    private data: Map<string, MapEntryStructure> = new Map();

    /**
     * Store a value in the datastore.
     * @param key key to store the value under
     * @param value value to store
     */
    public set(key: string, value: string): void {
        this.data.set(key, { value });
    }

    /**
     * Retrieve a value from the datastore.
     * @param key key to retrieve the value for
     * @returns an object containing the value and an optional error
     */
    public get(key: string): { value: string; error: string | null } {
        const entry = this.data.get(key);
        if (entry) {
            return { value: entry.value, error: null };
        } else {
            return { value: "", error: "not found" };
        }
    }
}
