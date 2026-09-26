// spotifyIdSync: welke playlists de sleutel krijgen, en wat er aan hun beschrijving verandert.
//
// Wat hier wordt vastgelegd is vooral wat de planning NIET doet: gokken. De match is de exacte naam en
// verder niets, en zodra er meer dan één kandidaat aan een naam hangt schrijft hij niets -- want een gok
// zou hier de beschrijving van de verkeerde playlist overschrijven.
import { describe, expect, it } from "vitest";
import { buildSpotifyIdPlan, summarizeSpotifyIdPlan, type SyncPlaylist } from "./spotifyIdSync";
import type { Mix } from "./types";

const TITEL = "EDM 128BPM 🧊 Cyan Light (f) 🧊 Vol. 5";

function makeMix(overrides: Partial<Mix> = {}): Mix {
  return {
    id: "20251108",
    file: "light-cyan.json",
    spotifyId: "mmc_edm_128bpm_light_f_cyan_20251108",
    title: "Nu-Disco Mix · Cyan Light (f) · Vol. 5",
    spotifyTitle: TITEL,
    genre: "Nu-Disco",
    subgenre: "Nu-Disco",
    color: "Cyan",
    density: "Light",
    gender: "f",
    volume: 5,
    date: "2025-11-08",
    bpm: 128,
    topArtists: [],
    tracks: [],
    ...overrides,
  };
}

function makePlaylist(overrides: Partial<SyncPlaylist> = {}): SyncPlaylist {
  return {
    id: "3n2hqFL0txhpHwDrz2rHXY",
    name: TITEL,
    description: "Nu-Disco · Cyan Light (f) · Vol. 5 · 20251108",
    ...overrides,
  };
}

describe("buildSpotifyIdPlan -- de match", () => {
  it("koppelt op de exacte naam en levert de nieuwe beschrijving", () => {
    const plan = buildSpotifyIdPlan([makeMix()], [makePlaylist()]);

    expect(plan.rows).toHaveLength(1);
    expect(plan.rows[0]).toMatchObject({
      playlistId: "3n2hqFL0txhpHwDrz2rHXY",
      mixId: "20251108",
      currentKey: "20251108",
      targetKey: "mmc_edm_128bpm_light_f_cyan_20251108",
      targetDescription: "Nu-Disco · Cyan Light (f) · Vol. 5 · mmc_edm_128bpm_light_f_cyan_20251108",
      state: "to-write",
    });
  });

  it("koppelt NIET op een naam die er net naast zit -- exact is exact", () => {
    const plan = buildSpotifyIdPlan([makeMix()], [makePlaylist({ name: `${TITEL} ` })]);
    expect(plan.rows).toHaveLength(0);
    expect(plan.unmatchedMixIds).toEqual(["20251108"]);
  });

  it("laat een mix zonder title_spotify buiten de hele telling", () => {
    const plan = buildSpotifyIdPlan([makeMix({ spotifyTitle: null })], [makePlaylist()]);
    expect(plan.rows).toHaveLength(0);
    expect(plan.unmatchedMixIds).toEqual([]);
  });

  it("houdt de vrije tekst achter het blok in de doelbeschrijving", () => {
    const plan = buildSpotifyIdPlan(
      [makeMix()],
      [makePlaylist({ description: "Nu-Disco · Cyan Light (f) · Vol. 5 · 20251108 — Lekker in de auto" })]
    );
    expect(plan.rows[0].targetDescription).toBe(
      "Nu-Disco · Cyan Light (f) · Vol. 5 · mmc_edm_128bpm_light_f_cyan_20251108 — Lekker in de auto"
    );
  });

  it("sorteert nieuwste mix bovenaan", () => {
    const oud = makeMix({ id: "20240408", spotifyId: "mmc_edm_176bpm_full_f_blue_20240408", spotifyTitle: "A" });
    const nieuw = makeMix({ id: "20260615", spotifyId: "mmc_edm_128bpm_light_m_red_20260615", spotifyTitle: "B" });
    const plan = buildSpotifyIdPlan(
      [oud, nieuw],
      [makePlaylist({ id: "a", name: "A" }), makePlaylist({ id: "b", name: "B" })]
    );
    expect(plan.rows.map((r) => r.mixId)).toEqual(["20260615", "20240408"]);
  });
});

describe("buildSpotifyIdPlan -- de standen", () => {
  it("meldt 'in-sync' als de beschrijving de sleutel al draagt", () => {
    const plan = buildSpotifyIdPlan(
      [makeMix()],
      [makePlaylist({ description: "Nu-Disco · Cyan Light (f) · Vol. 5 · mmc_edm_128bpm_light_f_cyan_20251108" })]
    );
    expect(plan.rows[0].state).toBe("in-sync");
    expect(plan.rows[0].diffs).toEqual([]);
  });

  it("meldt 'to-write' óók als er nog helemaal geen blok staat", () => {
    const plan = buildSpotifyIdPlan([makeMix()], [makePlaylist({ description: "" })]);
    expect(plan.rows[0]).toMatchObject({ state: "to-write", currentKey: null });
  });

  it("meldt 'blocked' als de bron zichzelf tegenspreekt, met de reden erbij", () => {
    const scheef = makeMix({ spotifyId: "mmc_edm_128bpm_light_f_cyan_20240408" });
    const plan = buildSpotifyIdPlan([scheef], [makePlaylist()]);

    expect(plan.rows[0].state).toBe("blocked");
    expect(plan.rows[0].blocker).toContain("20240408");
    // En het doel blijft de veilige, oude vorm -- geen tegenstrijdige sleutel de beschrijving in.
    expect(plan.rows[0].targetKey).toBe("20251108");
  });

  it("toont de overige veldafwijkingen mee -- die worden door dezelfde actie herschreven", () => {
    const plan = buildSpotifyIdPlan(
      [makeMix()],
      [makePlaylist({ description: "Deep House · Cyan Light (f) · Vol. 1 · 20251108" })]
    );
    expect(plan.rows[0].diffs.map((d) => d.field)).toEqual(["subgenre", "volume", "id_spotify"]);
  });
});

describe("buildSpotifyIdPlan -- dubbelzinnigheid", () => {
  it("schrijft niets als twee mixen dezelfde title_spotify dragen", () => {
    const a = makeMix({ id: "20251108", spotifyId: "mmc_edm_128bpm_light_f_cyan_20251108" });
    const b = makeMix({ id: "20240408", spotifyId: "mmc_edm_176bpm_full_f_blue_20240408" });
    const plan = buildSpotifyIdPlan([a, b], [makePlaylist()]);

    expect(plan.rows).toHaveLength(0);
    expect(plan.ambiguous).toEqual([
      { title: TITEL, mixIds: ["20251108", "20240408"], playlistIds: ["3n2hqFL0txhpHwDrz2rHXY"] },
    ]);
  });

  it("schrijft niets als twee playlists dezelfde naam dragen", () => {
    const plan = buildSpotifyIdPlan(
      [makeMix()],
      [makePlaylist({ id: "een" }), makePlaylist({ id: "twee" })]
    );

    expect(plan.rows).toHaveLength(0);
    expect(plan.ambiguous[0].playlistIds).toEqual(["een", "twee"]);
  });
});

describe("summarizeSpotifyIdPlan", () => {
  it("telt de standen uit elkaar", () => {
    const teDoen = makeMix({ id: "20251108", spotifyTitle: "A" });
    const alGoed = makeMix({ id: "20260615", spotifyId: "mmc_edm_128bpm_light_m_red_20260615", spotifyTitle: "B" });
    const plan = buildSpotifyIdPlan(
      [teDoen, alGoed],
      [
        makePlaylist({ id: "a", name: "A" }),
        makePlaylist({
          id: "b",
          name: "B",
          description: "Nu-Disco · Cyan Light (f) · Vol. 5 · mmc_edm_128bpm_light_m_red_20260615",
        }),
      ]
    );

    expect(summarizeSpotifyIdPlan(plan)).toEqual({
      matched: 2,
      toWrite: 1,
      inSync: 1,
      blocked: 0,
      ambiguous: 0,
      unmatched: 0,
    });
  });
});
