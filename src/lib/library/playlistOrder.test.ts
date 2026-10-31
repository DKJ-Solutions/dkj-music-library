import { describe, expect, it } from "vitest";
import { matchesLivePlaylist, moveItem, orderRowsByPlaylist, planPlaylistMove } from "./playlistOrder";

const row = (id: string) => ({ id });

describe("orderRowsByPlaylist", () => {
  it("zet de rijen in de volgorde van de playlist, met hun plek", () => {
    const result = orderRowsByPlaylist([row("A"), row("B"), row("C")], ["C", "A", "B"]);
    expect(result.map((r) => [r.row.id, r.position])).toEqual([["C", 0], ["A", 1], ["B", 2]]);
  });

  it("slaat items zonder bibliotheektrack over maar telt hun plek mee", () => {
    const result = orderRowsByPlaylist([row("A"), row("B")], [null, "B", null, "A"]);
    expect(result.map((r) => r.position)).toEqual([1, 3]);
  });

  it("geeft een nummer dat er twee keer in staat één rij op zijn eerste plek", () => {
    const result = orderRowsByPlaylist([row("A"), row("B")], ["B", "A", "B"]);
    expect(result.map((r) => [r.row.id, r.position])).toEqual([["B", 0], ["A", 1]]);
  });

  it("zet rijen die niet in de playlist staan achteraan, zonder plek, in hun eigen volgorde", () => {
    const result = orderRowsByPlaylist([row("X"), row("A"), row("Y")], ["A"]);
    expect(result.map((r) => [r.row.id, r.position])).toEqual([["A", 0], ["X", undefined], ["Y", undefined]]);
  });
});

describe("planPlaylistMove", () => {
  const positions = [0, 1, 2, 3, 4];

  it("naar beneden: vóór het item NA de doelrij (insert_before = doelplek + 1)", () => {
    expect(planPlaylistMove(positions, 1, 3)).toEqual({ rangeStart: 1, insertBefore: 4 });
  });

  it("naar boven: vóór de doelrij (insert_before = doelplek)", () => {
    expect(planPlaylistMove(positions, 3, 1)).toEqual({ rangeStart: 3, insertBefore: 1 });
  });

  it("één plek naar beneden en naar de laatste plek", () => {
    expect(planPlaylistMove(positions, 0, 1)).toEqual({ rangeStart: 0, insertBefore: 2 });
    expect(planPlaylistMove(positions, 0, 4)).toEqual({ rangeStart: 0, insertBefore: 5 });
  });

  it("gebruikt absolute plekken als er items zonder rij tussen staan", () => {
    // Tabelrijen op playlist-plekken 0, 2 (plek 1 is een lokaal bestand), 5.
    expect(planPlaylistMove([0, 2, 5], 0, 1)).toEqual({ rangeStart: 0, insertBefore: 3 });
    expect(planPlaylistMove([0, 2, 5], 2, 0)).toEqual({ rangeStart: 5, insertBefore: 0 });
  });

  it("geeft null bij niets te doen: zelfde rij, of een invoegplek die niets verandert", () => {
    expect(planPlaylistMove(positions, 2, 2)).toBeNull();
    // Naar de rij direct onder zich met een tussenliggend item zonder rij is wél een verplaatsing,
    // maar naar dezelfde eindplek niet: insert_before === start + 1.
    expect(planPlaylistMove([0, 1], 0, 0)).toBeNull();
  });

  it("geeft null als een rij geen plek heeft", () => {
    expect(planPlaylistMove([0, undefined, 2], 0, 1)).toBeNull();
    expect(planPlaylistMove([0, undefined, 2], 1, 0)).toBeNull();
  });

  it("het resultaat komt overeen met wat Spotify doet (simulatie van range_start/insert_before)", () => {
    const spotify = (list: string[], { rangeStart, insertBefore }: { rangeStart: number; insertBefore: number }) => {
      const next = [...list];
      const [item] = next.splice(rangeStart, 1);
      next.splice(insertBefore > rangeStart ? insertBefore - 1 : insertBefore, 0, item);
      return next;
    };
    const list = ["a", "b", "c", "d", "e"];
    for (let from = 0; from < list.length; from++) {
      for (let to = 0; to < list.length; to++) {
        const plan = planPlaylistMove(list.map((_, i) => i), from, to);
        const expected = moveItem(list, from, to);
        expect(plan ? spotify(list, plan) : list).toEqual(expected);
      }
    }
  });
});

describe("moveItem", () => {
  it("verplaatst zonder het origineel te wijzigen", () => {
    const list = [1, 2, 3];
    expect(moveItem(list, 0, 2)).toEqual([2, 3, 1]);
    expect(list).toEqual([1, 2, 3]);
  });
});

describe("matchesLivePlaylist", () => {
  const move = { rangeStart: 0, insertBefore: 3, targetPosition: 2, expectedStartId: "a", expectedTargetId: "c" };

  it("klopt als beide plekken de verwachte track dragen", () => {
    expect(matchesLivePlaylist(["a", "b", "c"], move)).toBe(true);
  });

  it("klopt niet bij een andere track op de begin- of doelplek", () => {
    expect(matchesLivePlaylist(["x", "b", "c"], move)).toBe(false);
    expect(matchesLivePlaylist(["a", "b", "x"], move)).toBe(false);
    expect(matchesLivePlaylist([null, "b", "c"], move)).toBe(false);
  });

  it("klopt niet als de live playlist korter is dan de plekken", () => {
    expect(matchesLivePlaylist(["a", "b"], move)).toBe(false);
    expect(matchesLivePlaylist(["a", "b", "c"], { ...move, insertBefore: 4 })).toBe(false);
  });
});
