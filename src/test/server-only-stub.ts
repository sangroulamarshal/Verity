// Vitest-only stub. The real `server-only` package intentionally throws
// when resolved via a "browser" condition, which jsdom's test environment
// triggers even though these modules only ever run in Next.js's actual
// server build. Aliased in vitest.config.mts — production builds still go
// through the real package and its guard.
export {};
