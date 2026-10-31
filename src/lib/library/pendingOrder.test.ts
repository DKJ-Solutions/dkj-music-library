// pendingOrder.ts: de permutatie van een uitgestelde volgorde en het plan om Spotify daarheen te brengen.
import { describe, expect, it } from "vitest";
import { applyMove, identityOrder, isPermutation, permuteBy, planSyncMoves, sameMultiset } from "./pendingOrder";

describe("identityOrder / isPermutation / permuteBy", () => {
  it("maakt de identiteit en herkent permutaties", () => {
    expect(identityOrder(4)).toEqual([0, 1, 2, 3]);
    expect(isPermutation([2, 0, 1], 3)).toBe(true);
    expect(isPermutation([0, 0, 1], 3)).toBe(false); // dubbel
    expect(isPermutation([0, 1], 3)).toBe(false); // te kort
    expect(isPermutation([0, 1, 3], 3)).toBe(false); // buiten bereik
    expect(isPermutation([0, 1.5, 2], 3)).toBe(false);
    expect(isPermutation("012", 3)).toBe(false);
  });

  it("zet de lijst in de volgorde van de permutatie", () => {
    expect(permuteBy(["a", "b", "c"], [2, 0, 1])).toEqual(["c", "a", "b"]);
  });
});

describe("applyMove", () => {
  const list = ["a", "b", "c", "d"];
  it("telt insertBefore in de lijst van vóór het weghalen (naar beneden)", () => {
    expect(applyMove(list, { rangeStart: 0, insertBefore: 3 })).toEqual(["b", "c", "a", "d"]);
    expect(applyMove(list, { rangeStart: 0, insertBefore: 4 })).toEqual(["b", "c", "d", "a"]);
  });
  it("verplaatst naar boven", () => {
    expect(applyMove(list, { rangeStart: 3, insertBefore: 1 })).toEqual(["a", "d", "b", "c"]);
  });
  it("laat de invoer ongemoeid", () => {
    applyMove(list, { rangeStart: 0, insertBefore: 3 });
    expect(list).toEqual(["a", "b", "c", "d"]);
  });
});

describe("sameMultiset", () => {
  it("vergelijkt aantallen, niet volgorde", () => {
    expect(sameMultiset(["a", "b", "a", null], [null, "a", "a", "b"])).toBe(true);
    expect(sameMultiset(["a", "b", "a"], ["a", "b", "b"])).toBe(false);
    expect(sameMultiset(["a"], ["a", "a"])).toBe(false);
  });
});

describe("planSyncMoves", () => {
  /** De verplaatsingen één voor één toegepast op de live lijst, zoals de sync-route dat doet. */
  const run = (live: (string | null)[], desired: (string | null)[]) => {
    const moves = planSyncMoves(live, desired);
    if (!moves) return null;
    return { moves, result: moves.reduce<(string | null)[]>((list, move) => applyMove(list, move), live) };
  };

  it("brengt een omgekeerde lijst in de gewenste volgorde", () => {
    const outcome = run(["a", "b", "c", "d"], ["d", "c", "b", "a"]);
    expect(outcome?.result).toEqual(["d", "c", "b", "a"]);
    expect(outcome!.moves.length).toBeLessThanOrEqual(3);
  });

  it("doet niets als de volgorde al klopt", () => {
    expect(planSyncMoves(["a", "b"], ["a", "b"])).toEqual([]);
  });

  it("gebruikt één verplaatsing voor één verschoven item", () => {
    expect(planSyncMoves(["a", "b", "c", "d"], ["a", "d", "b", "c"])).toEqual([{ rangeStart: 3, insertBefore: 1 }]);
  });

  it("klopt met dubbele nummers en items zonder track (null)", () => {
    const live = ["a", null, "b", "a", null, "c"];
    const desired = [null, "a", "c", null, "a", "b"];
    expect(run(live, desired)?.result).toEqual(desired);
  });

  it("klopt voor elke permutatie van een lijst met dubbelen (uitputtend, 5 items)", () => {
    const live = ["a", "b", "a", null, "c"];
    const permutations = (items: number[]): number[][] =>
      items.length <= 1 ? [items] : items.flatMap((x, i) => permutations([...items.slice(0, i), ...items.slice(i + 1)]).map((rest) => [x, ...rest]));
    for (const order of permutations(identityOrder(live.length))) {
      const desired = permuteBy(live, order);
      expect(run(live, desired)?.result).toEqual(desired);
    }
  });

  it("geeft null als Spotify andere items heeft dan de gewenste volgorde", () => {
    expect(planSyncMoves(["a", "b", "x"], ["a", "b", "c"])).toBeNull();
    expect(planSyncMoves(["a", "b"], ["a", "b", "c"])).toBeNull();
  });
});
