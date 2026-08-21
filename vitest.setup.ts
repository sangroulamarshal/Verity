import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Testing Library's automatic afterEach cleanup only registers itself when
// the test runner exposes `afterEach` as a global. This project keeps
// Vitest's `globals` option off on purpose (explicit imports are easier to
// trace), so cleanup is wired up here instead — otherwise every test file
// with more than one `it()` accumulates DOM nodes across tests.
afterEach(() => {
  cleanup();
});
