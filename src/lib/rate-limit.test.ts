import { afterEach, describe, expect, it } from "vitest";
import { checkRateLimit, _resetRateLimitStoreForTests } from "./rate-limit";

describe("checkRateLimit", () => {
  afterEach(() => {
    _resetRateLimitStoreForTests();
  });

  it("allows requests under the limit", () => {
    const result = checkRateLimit("test-key-1", 3, 60_000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it("blocks requests once the limit is reached", () => {
    checkRateLimit("test-key-2", 2, 60_000);
    checkRateLimit("test-key-2", 2, 60_000);
    const third = checkRateLimit("test-key-2", 2, 60_000);
    expect(third.allowed).toBe(false);
    expect(third.remaining).toBe(0);
  });

  it("tracks different keys independently", () => {
    checkRateLimit("key-a", 1, 60_000);
    const keyB = checkRateLimit("key-b", 1, 60_000);
    expect(keyB.allowed).toBe(true);
  });

  it("resets after the window expires", async () => {
    checkRateLimit("test-key-3", 1, 20);
    const blocked = checkRateLimit("test-key-3", 1, 20);
    expect(blocked.allowed).toBe(false);

    await new Promise((resolve) => setTimeout(resolve, 30));

    const afterWindow = checkRateLimit("test-key-3", 1, 20);
    expect(afterWindow.allowed).toBe(true);
  });
});
