import { describe, expect, it } from "vitest";
import { describeDiff, diffExports } from "./exportDiff";

const line = (id: string, over: Record<string, unknown> = {}) =>
  JSON.stringify({ dkj_track_id: id, updated_at: "2026-09-29T00:00:00Z", dkj_rating: "star-4", title: id, ...over });

describe("diffExports", () => {
  it("telt gewijzigde tracks per veld, en negeert updated_at", () => {
    const before = [line("a"), line("b"), line("c")].join("\n");
    const after = [line("a", { dkj_rating: "star-3", updated_at: "x" }), line("b", { updated_at: "y" }), line("c", { dkj_rating: "star-8", title: "C" })].join("\r\n");
    const diff = diffExports(before, after);
    expect(diff).toEqual({ changed: 2, added: 0, removed: 0, fields: { dkj_rating: 2, title: 1 } });
    expect(describeDiff(diff)).toBe("2 tracks gewijzigd (dkj_rating 2, title 1)");
  });

  it("telt toegevoegde en weggehaalde tracks apart", () => {
    const diff = diffExports([line("a"), line("b")].join("\n"), [line("a", { dkj_rating: "star-1" }), line("c")].join("\n"));
    expect(describeDiff(diff)).toBe("1 track gewijzigd (dkj_rating 1), 1 toegevoegd, 1 weggehaald");
  });

  it("geeft een lege zin als er niets veranderde", () => {
    expect(describeDiff(diffExports(line("a"), line("a", { updated_at: "later" })))).toBe("");
  });
});
