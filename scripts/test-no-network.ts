/** Unit/contract tests must provide their own HTTP fixtures, never contact real services. */
globalThis.fetch = (() => {
  throw new Error("Unmocked network request in unit tests. Provide a local fetch fixture.");
}) as typeof fetch;
