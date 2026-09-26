// enrichedPlaylists.ts: de verrijkte leeslaag die de snapshot + de done-status samenvoegt met de
// geparsede naam-dimensies en de Plutchik-emotie. snapshotStore.ts/doneStore.ts worden gemockt --
// deze tests toetsen de samenvoeg-/verrijkingslogica, niet de fs-laag zelf (die heeft zijn eigen
// snapshotStore.test.ts/doneStore.test.ts).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./snapshotStore", () => ({
  readSnapshot: vi.fn(),
}));
vi.mock("./doneStore", () => ({
  readDoneStatuses: vi.fn(),
  getDoneStatus: vi.fn(),
}));
vi.mock("./worldStore", () => ({
  readWorldOverrides: vi.fn(),
  getWorldOverride: vi.fn(),
}));
vi.mock("./bpmStore", () => ({
  readBpmOverrides: vi.fn(),
  getBpmOverride: vi.fn(),
}));
// De lokale privé-regels (privateRules.ts): een vast eigen account en geen privé-namen, zodat deze
// tests de eigenaar-logica toetsen zonder data/spotify/private-rules.json te lezen.
const OWN_SPOTIFY_USER_ID = "eigen-account-id";
vi.mock("./privateRules", () => ({
  readPrivateRules: () => ({ ownerUserId: "eigen-account-id", priveNamePatterns: [] }),
}));

import { readSnapshot } from "./snapshotStore";
import { getDoneStatus, readDoneStatuses } from "./doneStore";
import { getWorldOverride, readWorldOverrides } from "./worldStore";
import { getBpmOverride, readBpmOverrides } from "./bpmStore";
import { enrichSinglePlaylist, getEnrichedSnapshot } from "./enrichedPlaylists";
import type { Playlist, Snapshot } from "./types";

const mockedReadSnapshot = vi.mocked(readSnapshot);
const mockedReadDoneStatuses = vi.mocked(readDoneStatuses);
const mockedGetDoneStatus = vi.mocked(getDoneStatus);
const mockedReadWorldOverrides = vi.mocked(readWorldOverrides);
const mockedGetWorldOverride = vi.mocked(getWorldOverride);
const mockedReadBpmOverrides = vi.mocked(readBpmOverrides);
const mockedGetBpmOverride = vi.mocked(getBpmOverride);

// Default: geen wereld-/BPM-overrides -- de meeste bestaande tests hieronder gaan over de
// done-status/sortBucket-samenvoeging en zijn niet bezig met wereld-/BPM-overrides; alleen de
// eigen "wereld"/"BPM"-tests verderop overschrijven dit expliciet.
beforeEach(() => {
  mockedReadWorldOverrides.mockReturnValue({});
  mockedGetWorldOverride.mockReturnValue(null);
  mockedReadBpmOverrides.mockReturnValue({});
  mockedGetBpmOverride.mockReturnValue(null);
});

afterEach(() => {
  mockedReadSnapshot.mockReset();
  mockedReadDoneStatuses.mockReset();
  mockedGetDoneStatus.mockReset();
  mockedReadWorldOverrides.mockReset();
  mockedGetWorldOverride.mockReset();
  mockedReadBpmOverrides.mockReset();
  mockedGetBpmOverride.mockReset();
});

function makePlaylist(overrides: Partial<Playlist> = {}): Playlist {
  return {
    id: "playlist-1",
    name: "Cyan Full (f) 🧊 Top 100",
    uri: "spotify:playlist:playlist-1",
    collaborative: false,
    public: true,
    snapshotId: "snap-v1",
    owner: { id: OWN_SPOTIFY_USER_ID, displayName: "Dave" },
    images: [],
    description: null,
    trackCount: 0,
    tracks: [],
    ...overrides,
  };
}

describe("getEnrichedSnapshot", () => {
  it("geeft null terug als er nog geen snapshot is", () => {
    mockedReadSnapshot.mockReturnValue(null);

    expect(getEnrichedSnapshot()).toBeNull();
  });

  it("verrijkt een eigen, herkende playlist met kleur, emotie en sortBucket 'gesorteerd'", () => {
    const snapshot: Snapshot = { syncedAt: "2026-07-23T00:00:00Z", playlists: [makePlaylist()] };
    mockedReadSnapshot.mockReturnValue(snapshot);
    mockedReadDoneStatuses.mockReturnValue({});

    const enriched = getEnrichedSnapshot();

    expect(enriched?.syncedAt).toBe("2026-07-23T00:00:00Z");
    expect(enriched?.playlists).toHaveLength(1);
    const p = enriched!.playlists[0];
    expect(p.ownerBucket).toBe("dave");
    expect(p.parsed.typeLabel).toBe("Top 100");
    expect(p.parsed.color).toBe("Cyan");
    expect(p.emotion).toBe("Vermaak"); // canonieke Plutchik-mapping voor Cyan
    expect(p.done).toBe(false);
    expect(p.sortBucket).toBe("gesorteerd");
  });

  it("markeert een niet-eigen playlist als 'ongesorteerd', ongeacht of de naam een patroon volgt", () => {
    const snapshot: Snapshot = {
      syncedAt: "2026-07-23T00:00:00Z",
      playlists: [makePlaylist({ owner: { id: "iemand-anders", displayName: "Iemand Anders" } })],
    };
    mockedReadSnapshot.mockReturnValue(snapshot);
    mockedReadDoneStatuses.mockReturnValue({});

    const p = getEnrichedSnapshot()!.playlists[0];
    expect(p.ownerBucket).toBe("other");
    expect(p.sortBucket).toBe("ongesorteerd");
  });

  it("markeert een eigen playlist zonder herkend patroon ook als 'ongesorteerd'", () => {
    const snapshot: Snapshot = {
      syncedAt: "2026-07-23T00:00:00Z",
      playlists: [makePlaylist({ name: "Feestje Buren" })],
    };
    mockedReadSnapshot.mockReturnValue(snapshot);
    mockedReadDoneStatuses.mockReturnValue({});

    const p = getEnrichedSnapshot()!.playlists[0];
    expect(p.parsed.matched).toBe(false);
    expect(p.sortBucket).toBe("ongesorteerd");
  });

  it("past de done-status per playlist-id toe (overleeft dus een hersync omdat 'm los wordt ingelezen)", () => {
    const snapshot: Snapshot = {
      syncedAt: "2026-07-23T00:00:00Z",
      playlists: [makePlaylist({ id: "playlist-1" }), makePlaylist({ id: "playlist-2" })],
    };
    mockedReadSnapshot.mockReturnValue(snapshot);
    mockedReadDoneStatuses.mockReturnValue({
      "playlist-1": { done: true, updatedAt: "2026-07-20T00:00:00Z" },
    });

    const playlists = getEnrichedSnapshot()!.playlists;
    expect(playlists.find((p) => p.id === "playlist-1")?.done).toBe(true);
    expect(playlists.find((p) => p.id === "playlist-2")?.done).toBe(false);
  });

  it("laat 'tracks' bewust weg uit het verrijkte object (overzichtslaag, geen trackdata)", () => {
    const snapshot: Snapshot = { syncedAt: "2026-07-23T00:00:00Z", playlists: [makePlaylist()] };
    mockedReadSnapshot.mockReturnValue(snapshot);
    mockedReadDoneStatuses.mockReturnValue({});

    const p = getEnrichedSnapshot()!.playlists[0];
    expect(p).not.toHaveProperty("tracks");
  });
});

describe("enrichSinglePlaylist", () => {
  it("verrijkt één playlist via de losse done-status-lookup", () => {
    mockedGetDoneStatus.mockReturnValue(true);

    const enriched = enrichSinglePlaylist(makePlaylist({ id: "playlist-42" }));

    expect(mockedGetDoneStatus).toHaveBeenCalledWith("playlist-42");
    expect(enriched.done).toBe(true);
    expect(enriched.parsed.typeLabel).toBe("Top 100");
  });
});

// De effectieve-wereld-resolutie (override ?? classifyWorld(...)) -- classifyWorld.ts zelf heeft
// zijn eigen, uitgebreide classifyWorld.test.ts; deze tests toetsen alleen de SAMENVOEGING met de
// (gemockte) worldStore hier in enrichedPlaylists.ts.
describe("getEnrichedSnapshot -- wereld-resolutie", () => {
  it("gebruikt de auto-classificatie als er geen override is (worldIsOverridden: false)", () => {
    const snapshot: Snapshot = {
      // Niet "Cyan Music Mood Full (f)" (sinds de tweede classifyWorld-bijstelling van 2026-07-23
      // is een kale Music Mood-emmer -- zónder Vol.-nummer -- juist Privé, zie
      // classifyWorld.test.ts): MMC is nu uitsluitend nog de genummerde mixen.
      syncedAt: "2026-07-23T00:00:00Z",
      playlists: [makePlaylist({ id: "playlist-1", name: "Green House Mix Full (f) Vol. 1" })],
    };
    mockedReadSnapshot.mockReturnValue(snapshot);
    mockedReadDoneStatuses.mockReturnValue({});
    mockedReadWorldOverrides.mockReturnValue({});

    const p = getEnrichedSnapshot()!.playlists[0];
    expect(p.world).toBe("mmc"); // eigen playlist, House Mix + Vol.-nummer -> MMC (zie classifyWorld.ts)
    expect(p.worldIsOverridden).toBe(false);
  });

  it("laat een handmatige override de auto-classificatie overschrijven (worldIsOverridden: true)", () => {
    const snapshot: Snapshot = {
      syncedAt: "2026-07-23T00:00:00Z",
      playlists: [makePlaylist({ id: "playlist-1", name: "Green House Mix Full (f) Vol. 1" })],
    };
    mockedReadSnapshot.mockReturnValue(snapshot);
    mockedReadDoneStatuses.mockReturnValue({});
    mockedReadWorldOverrides.mockReturnValue({
      "playlist-1": { world: "prive", updatedAt: "2026-07-20T00:00:00Z" },
    });

    const p = getEnrichedSnapshot()!.playlists[0];
    expect(p.world).toBe("prive"); // override wint van de MMC-gok
    expect(p.worldIsOverridden).toBe(true);
  });

  it("past de override per playlist-id toe, andere playlists blijven op hun auto-classificatie", () => {
    const snapshot: Snapshot = {
      syncedAt: "2026-07-23T00:00:00Z",
      playlists: [
        makePlaylist({ id: "playlist-1", name: "Cyan Full (f) 🧊 Top 100" }),
        makePlaylist({ id: "playlist-2", name: "Classic Pop | DJ Cylow" }),
      ],
    };
    mockedReadSnapshot.mockReturnValue(snapshot);
    mockedReadDoneStatuses.mockReturnValue({});
    mockedReadWorldOverrides.mockReturnValue({
      "playlist-1": { world: "djcylow", updatedAt: "2026-07-20T00:00:00Z" },
    });

    const playlists = getEnrichedSnapshot()!.playlists;
    expect(playlists.find((p) => p.id === "playlist-1")).toMatchObject({
      world: "djcylow",
      worldIsOverridden: true,
    });
    expect(playlists.find((p) => p.id === "playlist-2")).toMatchObject({
      world: "djcylow", // eigen classificatie (DJ Cylow-marker), geen override nodig
      worldIsOverridden: false,
    });
  });

  it("geeft altijd precies één wereld terug, ook voor een niet-eigen playlist zonder marker", () => {
    const snapshot: Snapshot = {
      syncedAt: "2026-07-23T00:00:00Z",
      playlists: [
        makePlaylist({
          id: "playlist-1",
          name: "Disco Balls",
          owner: { id: "iemand-anders", displayName: "Iemand Anders" },
        }),
      ],
    };
    mockedReadSnapshot.mockReturnValue(snapshot);
    mockedReadDoneStatuses.mockReturnValue({});
    mockedReadWorldOverrides.mockReturnValue({});

    const p = getEnrichedSnapshot()!.playlists[0];
    expect(p.world).toBe("prive"); // de catch-all -- niets verdwijnt
  });
});

describe("enrichSinglePlaylist -- wereld-resolutie", () => {
  it("gebruikt de losse override-lookup (getWorldOverride), niet readWorldOverrides", () => {
    mockedGetDoneStatus.mockReturnValue(false);
    mockedGetWorldOverride.mockReturnValue("prive");

    const enriched = enrichSinglePlaylist(
      makePlaylist({ id: "playlist-42", name: "Cyan Full (f) 🧊 Top 100" })
    );

    expect(mockedGetWorldOverride).toHaveBeenCalledWith("playlist-42");
    expect(enriched.world).toBe("prive");
    expect(enriched.worldIsOverridden).toBe(true);
  });
});

// De effectieve-BPM-resolutie (override ?? classifyMmcBpm(...)) -- classifyBpm.ts zelf heeft zijn
// eigen, uitgebreide classifyBpm.test.ts; deze tests toetsen alleen de SAMENVOEGING met de
// (gemockte) bpmStore hier in enrichedPlaylists.ts. Zelfde recept als de wereld-resolutie-tests
// hierboven.
describe("getEnrichedSnapshot -- BPM-resolutie", () => {
  it("gebruikt de auto-classificatie als er geen BPM-override is (mmcBpmIsOverridden: false)", () => {
    const snapshot: Snapshot = {
      syncedAt: "2026-07-23T00:00:00Z",
      playlists: [makePlaylist({ id: "playlist-1", name: "House Mix 🟠 Orange Full (f) 🟠 Vol. X" })],
    };
    mockedReadSnapshot.mockReturnValue(snapshot);
    mockedReadDoneStatuses.mockReturnValue({});

    const p = getEnrichedSnapshot()!.playlists[0];
    expect(p.mmcBpm).toBe(128); // House Mix -> 128 (zie classifyBpm.ts)
    expect(p.mmcBpmIsOverridden).toBe(false);
  });

  it("laat een handmatige BPM-override de auto-classificatie overschrijven (mmcBpmIsOverridden: true)", () => {
    const snapshot: Snapshot = {
      syncedAt: "2026-07-23T00:00:00Z",
      playlists: [makePlaylist({ id: "playlist-1", name: "House Mix 🟠 Orange Full (f) 🟠 Vol. X" })],
    };
    mockedReadSnapshot.mockReturnValue(snapshot);
    mockedReadDoneStatuses.mockReturnValue({});
    mockedReadBpmOverrides.mockReturnValue({
      "playlist-1": { bpm: 176, updatedAt: "2026-07-20T00:00:00Z" },
    });

    const p = getEnrichedSnapshot()!.playlists[0];
    expect(p.mmcBpm).toBe(176); // override wint van de 128-gok
    expect(p.mmcBpmIsOverridden).toBe(true);
  });

  it("geeft null terug (overig/onbekend) als geen enkele BPM-regel van toepassing is", () => {
    const snapshot: Snapshot = {
      syncedAt: "2026-07-23T00:00:00Z",
      playlists: [makePlaylist({ id: "playlist-1", name: "Willekeurige naam zonder structuur" })],
    };
    mockedReadSnapshot.mockReturnValue(snapshot);
    mockedReadDoneStatuses.mockReturnValue({});

    const p = getEnrichedSnapshot()!.playlists[0];
    expect(p.mmcBpm).toBeNull();
    expect(p.mmcBpmIsOverridden).toBe(false);
  });
});

describe("enrichSinglePlaylist -- BPM-resolutie", () => {
  it("gebruikt de losse override-lookup (getBpmOverride), niet readBpmOverrides", () => {
    mockedGetDoneStatus.mockReturnValue(false);
    mockedGetBpmOverride.mockReturnValue(96);

    const enriched = enrichSinglePlaylist(
      makePlaylist({ id: "playlist-42", name: "House Mix 🟠 Orange Full (f) 🟠 Vol. X" })
    );

    expect(mockedGetBpmOverride).toHaveBeenCalledWith("playlist-42");
    expect(enriched.mmcBpm).toBe(96);
    expect(enriched.mmcBpmIsOverridden).toBe(true);
  });
});
