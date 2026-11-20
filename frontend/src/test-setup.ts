import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => cleanup());

// Recharts and TanStack Virtual measure elements; jsdom has no layout.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;

// jsdom has no layout, so give elements a size for TanStack Virtual to render rows into.
for (const [prop, size] of [["clientHeight", 720], ["clientWidth", 1200], ["offsetHeight", 720], ["offsetWidth", 1200]] as const) {
  Object.defineProperty(HTMLElement.prototype, prop, { configurable: true, get: () => size });
}
