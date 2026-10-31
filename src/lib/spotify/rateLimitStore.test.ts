// rateLimitStore.ts: het eindtijdstip van een lange rate limit, in een eigen bestand.
import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getRateLimitUntil, recordRateLimit } from "./rateLimitStore";

let dir: string;
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "dkj-ratelimit-"));
  process.env.SPOTIFY_RATE_LIMIT_STORE_PATH = path.join(dir, "sub", "rate-limit.json");
});
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

describe("rateLimitStore", () => {
  it("kent geen rate limit zonder bestand", () => {
    expect(getRateLimitUntil()).toBeNull();
  });

  it("bewaart het eindtijdstip en geeft het terug zolang het niet voorbij is", () => {
    const until = recordRateLimit(3600, 1_000_000);
    expect(until).toBe(1_000_000 + 3_600_000);
    expect(getRateLimitUntil(1_000_001)).toBe(until);
    expect(getRateLimitUntil(until)).toBeNull();
    expect(getRateLimitUntil(until + 1)).toBeNull();
  });

  it("laat de laatste uitspraak van Spotify winnen", () => {
    recordRateLimit(7200, 0);
    expect(recordRateLimit(60, 1000)).toBe(61_000);
    expect(getRateLimitUntil(2000)).toBe(61_000);
  });

  it("behandelt een onleesbaar bestand als geen rate limit", () => {
    fs.mkdirSync(path.join(dir, "sub"));
    fs.writeFileSync(process.env.SPOTIFY_RATE_LIMIT_STORE_PATH!, "{kapot");
    expect(getRateLimitUntil()).toBeNull();
  });
});
