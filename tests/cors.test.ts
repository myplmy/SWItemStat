import { describe, expect, it } from "vitest";
import { isOriginAllowed } from "../src/server/cors.js";

describe("isOriginAllowed", () => {
  const production = "https://myplmy.github.io";

  it("allows configured Pages and local origins", () => {
    expect(isOriginAllowed(production, production)).toBe(true);
    expect(isOriginAllowed("http://localhost:5173", production)).toBe(true);
    expect(isOriginAllowed(undefined, production)).toBe(true);
  });

  it("rejects other origins", () => {
    expect(isOriginAllowed("https://example.com", production)).toBe(false);
    expect(isOriginAllowed("not-an-origin", production)).toBe(false);
  });
});
