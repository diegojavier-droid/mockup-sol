/** Unit-test preload. Every test must replace transport explicitly.
 * Never use this for local-stack integration or acceptance tests. */
globalThis.fetch = (() => { throw new Error("Unit test attempted HTTP without an explicit fixture"); }) as typeof fetch;
