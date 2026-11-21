// REQ-038: no unit test may reach the network. An unmocked fetch fails the test.
globalThis.fetch = (() => {
  throw new Error('unmocked fetch: unit tests must not use the network');
}) as typeof fetch;
