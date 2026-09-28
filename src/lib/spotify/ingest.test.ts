// ingest.ts: mapping van ruwe Spotify-responses naar het eigen datamodel, + de snapshot_id-diff
// in buildSnapshot(). fetchAllPages (httpClient.ts) wordt hier gemockt -- deze tests toetsen de
// mapping/diff-logica, niet de HTTP/paginatie-laag zelf (die heeft zijn eigen
// httpClient.test.ts).
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./httpClient", () => ({
  fetchAllPages: vi.fn(),
}));

import { fetchAllPages } from "./httpClient";
import { SpotifyApiError } from "./errors";
import { buildSnapshot, fetchAllPlaylistItems, fetchAllPlaylists } from "./ingest";
import type { Snapshot } from "./types";

const mockedFetchAllPages = vi.mocked(fetchAllPages);

// Elke test zet zijn eigen mockResolvedValue(Once)-reeks op -- zonder reset lekt een
// mockResolvedValue (zonder "Once") uit een eerdere test door naar de volgende en verstoort de
// call-tellingen daar.
afterEach(() => {
  mockedFetchAllPages.mockReset();
});

function rawPlaylist(overrides: Record<string, unknown> = {}) {
  return {
    id: "playlist-1",
    name: "Roadtrip",
    uri: "spotify:playlist:playlist-1",
    collaborative: false,
    public: true,
    snapshot_id: "snap-v1",
    owner: { id: "dave", display_name: "Dave" },
    images: [],
    description: null,
    // LET OP: dit veld heet in de echte API-respons `items`, niet `tracks` (bevestigd via een
    // live call tijdens de bouw, zie ingest.ts) -- de mapping/tests volgen die echte vorm.
    items: { total: 2 },
    ...overrides,
  };
}

function rawTrackItem(overrides: Record<string, unknown> = {}) {
  return {
    added_at: "2026-01-01T00:00:00Z",
    added_by: { id: "dave" },
    is_local: false,
    // LET OP: dit veld heet in de echte API-respons `item`, niet `track` (bevestigd via een live
    // call tijdens de bouw, zie ingest.ts) -- de mapping/tests volgen die echte vorm.
    item: {
      id: "track-1",
      uri: "spotify:track:track-1",
      name: "Some Song",
      type: "track",
      duration_ms: 200_000,
      artists: [{ id: "artist-1", name: "Some Artist" }],
      album: { id: "album-1", name: "Some Album", images: [], release_date: "1997-05-12" },
    },
    ...overrides,
  };
}

describe("fetchAllPlaylists", () => {
  it("roept fetchAllPages aan voor /me/playlists", async () => {
    mockedFetchAllPages.mockResolvedValueOnce([rawPlaylist()]);

    const playlists = await fetchAllPlaylists();

    expect(playlists).toEqual([rawPlaylist()]);
    expect(mockedFetchAllPages).toHaveBeenCalledWith("/me/playlists", {}, {});
  });
});

describe("fetchAllPlaylistItems", () => {
  it("mapt een normale track-entry naar het eigen datamodel", async () => {
    mockedFetchAllPages.mockResolvedValueOnce([rawTrackItem()]);

    const items = await fetchAllPlaylistItems("playlist-1");

    expect(items).toEqual([
      {
        addedAt: "2026-01-01T00:00:00Z",
        addedBy: "dave",
        isLocal: false,
        track: {
          id: "track-1",
          uri: "spotify:track:track-1",
          name: "Some Song",
          artists: [{ id: "artist-1", name: "Some Artist" }],
          album: { id: "album-1", name: "Some Album", images: [], releaseDate: "1997-05-12" },
          durationMs: 200_000,
        },
      },
    ]);
    expect(mockedFetchAllPages).toHaveBeenCalledWith(
      "/playlists/playlist-1/items",
      { fields: expect.stringContaining("added_at") },
      {}
    );
  });

  it("mapt een lokaal bestand zonder track-id naar track: null", async () => {
    mockedFetchAllPages.mockResolvedValueOnce([
      rawTrackItem({
        is_local: true,
        item: {
          id: null,
          uri: "spotify:local:x",
          name: "Lokaal bestand",
          type: "track",
          duration_ms: 100,
          artists: [],
          album: null,
        },
      }),
    ]);

    const [item] = await fetchAllPlaylistItems("playlist-1");

    expect(item.isLocal).toBe(true);
    expect(item.track).toBeNull();
  });

  it("mapt een episode (podcast) naar track: null -- buiten scope van dit datamodel", async () => {
    mockedFetchAllPages.mockResolvedValueOnce([
      rawTrackItem({
        item: {
          id: "episode-1",
          uri: "spotify:episode:episode-1",
          name: "Aflevering 1",
          type: "episode",
          duration_ms: 1_800_000,
          artists: null,
          album: null,
        },
      }),
    ]);

    const [item] = await fetchAllPlaylistItems("playlist-1");
    expect(item.track).toBeNull();
  });

  it("mapt track: null als het item zelf geen genest item/track bevat (bv. verwijderd)", async () => {
    mockedFetchAllPages.mockResolvedValueOnce([rawTrackItem({ item: null })]);

    const [item] = await fetchAllPlaylistItems("playlist-1");
    expect(item.track).toBeNull();
  });
});

describe("buildSnapshot", () => {
  it("haalt tracks op voor elke playlist als er nog geen vorige snapshot is", async () => {
    mockedFetchAllPages
      .mockResolvedValueOnce([rawPlaylist()]) // /me/playlists
      .mockResolvedValueOnce([rawTrackItem()]); // /playlists/playlist-1/items

    const snapshot = await buildSnapshot();

    expect(snapshot.playlists).toHaveLength(1);
    expect(snapshot.playlists[0].id).toBe("playlist-1");
    expect(snapshot.playlists[0].tracks).toHaveLength(1);
    expect(snapshot.playlists[0].trackCount).toBe(1);
    expect(mockedFetchAllPages).toHaveBeenCalledTimes(2);
  });

  it("slaat een playlist over (hergebruikt vorige tracks) als het snapshot_id ongewijzigd is", async () => {
    const previous: Snapshot = {
      syncedAt: "2026-01-01T00:00:00Z",
      playlists: [
        {
          id: "playlist-1",
          name: "Roadtrip (oude naam)",
          uri: "spotify:playlist:playlist-1",
          collaborative: false,
          public: true,
          snapshotId: "snap-v1",
          owner: { id: "dave", displayName: "Dave" },
          images: [],
          description: null,
          trackCount: 1,
          tracks: [
            {
              addedAt: "2025-01-01T00:00:00Z",
              addedBy: "dave",
              isLocal: false,
              track: {
                id: "oud-track",
                uri: "spotify:track:oud-track",
                name: "Oud nummer",
                artists: [],
                album: { id: "", name: "", images: [], releaseDate: null },
                durationMs: 1000,
              },
            },
          ],
        },
      ],
    };

    mockedFetchAllPages.mockResolvedValueOnce([rawPlaylist({ snapshot_id: "snap-v1" })]); // /me/playlists

    const snapshot = await buildSnapshot({ previousSnapshot: previous });

    // Alleen de playlist-lijst wordt opgehaald -- geen aparte /items-call omdat het snapshot_id
    // gelijk is gebleven.
    expect(mockedFetchAllPages).toHaveBeenCalledTimes(1);
    expect(snapshot.playlists[0].tracks).toEqual(previous.playlists[0].tracks);
    // De naam komt wel uit de nieuwe playlist-metadata (die verandert onafhankelijk van tracks).
    expect(snapshot.playlists[0].name).toBe("Roadtrip");
  });

  it("haalt een ongewijzigde playlist één keer opnieuw op als de vorige tracks nog geen releaseDate kennen", async () => {
    const previous: Snapshot = {
      syncedAt: "2026-01-01T00:00:00Z",
      playlists: [
        {
          id: "playlist-1",
          name: "Roadtrip",
          uri: "spotify:playlist:playlist-1",
          collaborative: false,
          public: true,
          snapshotId: "snap-v1",
          owner: { id: "dave", displayName: "Dave" },
          images: [],
          description: null,
          trackCount: 1,
          tracks: [
            {
              addedAt: null,
              addedBy: null,
              isLocal: false,
              // Een snapshot van vóór releaseDate: het veld ontbreekt helemaal.
              track: { id: "track-1", uri: "spotify:track:track-1", name: "Some Song", artists: [], album: { id: "", name: "", images: [] }, durationMs: 1 },
            },
          ],
        },
      ],
    };

    mockedFetchAllPages
      .mockResolvedValueOnce([rawPlaylist({ snapshot_id: "snap-v1" })])
      .mockResolvedValueOnce([rawTrackItem()]);

    const snapshot = await buildSnapshot({ previousSnapshot: previous });

    expect(mockedFetchAllPages).toHaveBeenCalledTimes(2);
    expect(snapshot.playlists[0].tracks[0].track?.album.releaseDate).toBe("1997-05-12");
  });

  it("haalt tracks wél opnieuw op als het snapshot_id is veranderd", async () => {
    const previous: Snapshot = {
      syncedAt: "2026-01-01T00:00:00Z",
      playlists: [
        {
          id: "playlist-1",
          name: "Roadtrip",
          uri: "spotify:playlist:playlist-1",
          collaborative: false,
          public: true,
          snapshotId: "snap-v1",
          owner: { id: "dave", displayName: "Dave" },
          images: [],
          description: null,
          trackCount: 1,
          tracks: [],
        },
      ],
    };

    mockedFetchAllPages
      .mockResolvedValueOnce([rawPlaylist({ snapshot_id: "snap-v2" })])
      .mockResolvedValueOnce([rawTrackItem()]);

    const snapshot = await buildSnapshot({ previousSnapshot: previous });

    expect(mockedFetchAllPages).toHaveBeenCalledTimes(2);
    expect(snapshot.playlists[0].tracks).toHaveLength(1);
  });

  it("behoudt folderPath/tags uit de vorige snapshot ongeacht diffing (fase-4-velden, niet uit de API)", async () => {
    const previous: Snapshot = {
      syncedAt: "2026-01-01T00:00:00Z",
      playlists: [
        {
          id: "playlist-1",
          name: "Roadtrip",
          uri: "spotify:playlist:playlist-1",
          collaborative: false,
          public: true,
          snapshotId: "snap-oud",
          owner: { id: "dave", displayName: "Dave" },
          images: [],
          description: null,
          trackCount: 0,
          tracks: [],
          folderPath: ["Muziek", "Onderweg"],
          tags: ["favoriet"],
        },
      ],
    };

    mockedFetchAllPages
      .mockResolvedValueOnce([rawPlaylist({ snapshot_id: "snap-nieuw" })])
      .mockResolvedValueOnce([]);

    const snapshot = await buildSnapshot({ previousSnapshot: previous });

    expect(snapshot.playlists[0].folderPath).toEqual(["Muziek", "Onderweg"]);
    expect(snapshot.playlists[0].tags).toEqual(["favoriet"]);
  });

  it("meldt voortgang via onProgress inclusief een afsluitend 'done'-event", async () => {
    mockedFetchAllPages.mockResolvedValueOnce([rawPlaylist()]).mockResolvedValueOnce([]);
    const onProgress = vi.fn();

    await buildSnapshot({ onProgress });

    const types = onProgress.mock.calls.map(([event]) => event.type);
    expect(types[0]).toBe("playlists_fetched");
    expect(types).toContain("playlist_synced");
    expect(types.at(-1)).toBe("done");
  });

  it("verwerkt meerdere playlists correct onder een concurrency-cap > 1", async () => {
    mockedFetchAllPages
      .mockResolvedValueOnce([
        rawPlaylist({ id: "p1", name: "Een" }),
        rawPlaylist({ id: "p2", name: "Twee" }),
        rawPlaylist({ id: "p3", name: "Drie" }),
      ])
      .mockResolvedValue([rawTrackItem()]); // elke /items-call daarna

    const snapshot = await buildSnapshot({ concurrency: 2 });

    expect(snapshot.playlists.map((p) => p.id).sort()).toEqual(["p1", "p2", "p3"]);
    expect(snapshot.playlists.every((p) => p.tracks.length === 1)).toBe(true);
  });

  it("slaat een gevolgde, niet-eigen playlist metadata-only op bij 403 op /items (geen crash)", async () => {
    // rawPlaylist() geeft standaard items.total: 2 mee -- de forbidden playlist heeft dus wél
    // een echt trackCount (2) ook al zijn de tracks zelf (nog) niet op te halen.
    mockedFetchAllPages
      .mockResolvedValueOnce([rawPlaylist({ owner: { id: "iemand-anders", display_name: "Iemand Anders" } })])
      .mockRejectedValueOnce(new SpotifyApiError("Spotify API gaf 403 terug", 403, { error: "forbidden" }));
    const onProgress = vi.fn();

    const snapshot = await buildSnapshot({ onProgress });

    expect(snapshot.playlists).toHaveLength(1);
    expect(snapshot.playlists[0].tracks).toEqual([]);
    // Regressietest: trackCount moet Spotify's eigen items.total behouden i.p.v. onvoorwaardelijk
    // te worden overschreven met tracks.length (dat hier 0 zou zijn zonder vorige snapshot).
    expect(snapshot.playlists[0].trackCount).toBe(2);
    const types = onProgress.mock.calls.map(([event]) => event.type);
    expect(types).toContain("playlist_forbidden");
  });

  it("hergebruikt de vorige tracks (i.p.v. leeg) bij 403 als er al een eerdere snapshot was", async () => {
    const previous: Snapshot = {
      syncedAt: "2026-01-01T00:00:00Z",
      playlists: [
        {
          id: "playlist-1",
          name: "Gevolgde playlist",
          uri: "spotify:playlist:playlist-1",
          collaborative: false,
          public: true,
          snapshotId: "snap-oud",
          owner: { id: "iemand-anders", displayName: "Iemand Anders" },
          images: [],
          description: null,
          trackCount: 1,
          tracks: [
            {
              addedAt: "2025-01-01T00:00:00Z",
              addedBy: "iemand-anders",
              isLocal: false,
              track: {
                id: "eerder-opgehaald",
                uri: "spotify:track:eerder-opgehaald",
                name: "Eerder al opgehaald",
                artists: [],
                album: { id: "", name: "", images: [] },
                durationMs: 1000,
              },
            },
          ],
        },
      ],
    };

    mockedFetchAllPages
      .mockResolvedValueOnce([rawPlaylist({ snapshot_id: "snap-nieuw" })]) // snapshot_id gewijzigd -> probeert opnieuw op te halen
      .mockRejectedValueOnce(new SpotifyApiError("403", 403, null));

    const snapshot = await buildSnapshot({ previousSnapshot: previous });

    expect(snapshot.playlists[0].tracks).toEqual(previous.playlists[0].tracks);
  });

  it("vangt een niet-403-fout van fetchAllPlaylistItems per playlist af i.p.v. de hele sync te laten falen", async () => {
    mockedFetchAllPages
      .mockResolvedValueOnce([rawPlaylist()])
      .mockRejectedValueOnce(new SpotifyApiError("server error", 500, null));
    const onProgress = vi.fn();

    const snapshot = await buildSnapshot({ onProgress });

    // Geen crash: er komt gewoon een snapshot terug, met de gefaalde playlist metadata-only
    // (leeg, want er was geen vorige snapshot om op terug te vallen) en het echte trackCount
    // uit Spotify's items.total behouden (niet overschreven door tracks.length === 0).
    expect(snapshot.playlists).toHaveLength(1);
    expect(snapshot.playlists[0].tracks).toEqual([]);
    expect(snapshot.playlists[0].trackCount).toBe(2);

    const types = onProgress.mock.calls.map(([event]) => event.type);
    expect(types).toContain("playlist_failed");

    const doneEvent = onProgress.mock.calls.map(([event]) => event).find((e) => e.type === "done");
    expect(doneEvent?.failedCount).toBe(1);
  });

  it("laat de overige playlists gewoon slagen als slechts één van de meerdere playlists faalt (geen alles-of-niets)", async () => {
    mockedFetchAllPages
      .mockResolvedValueOnce([
        rawPlaylist({ id: "p1", name: "Een" }),
        rawPlaylist({ id: "p2", name: "Twee" }),
        rawPlaylist({ id: "p3", name: "Drie" }),
      ])
      .mockResolvedValueOnce([rawTrackItem()]) // p1: slaagt
      .mockRejectedValueOnce(new SpotifyApiError("server error", 500, null)) // p2: faalt
      .mockResolvedValueOnce([rawTrackItem()]); // p3: slaagt

    const onProgress = vi.fn();
    const snapshot = await buildSnapshot({ concurrency: 1, onProgress });

    expect(snapshot.playlists).toHaveLength(3);
    const byId = new Map(snapshot.playlists.map((p) => [p.id, p]));
    expect(byId.get("p1")?.tracks).toHaveLength(1);
    expect(byId.get("p2")?.tracks).toEqual([]); // gefaald, fallback op leeg (geen vorige snapshot)
    expect(byId.get("p3")?.tracks).toHaveLength(1); // niet geraakt door p2's fout

    const doneEvent = onProgress.mock.calls.map(([event]) => event).find((e) => e.type === "done");
    expect(doneEvent?.failedCount).toBe(1);
  });

  it("geeft een lege snapshot terug als er geen playlists zijn", async () => {
    mockedFetchAllPages.mockResolvedValueOnce([]);

    const snapshot = await buildSnapshot();

    expect(snapshot.playlists).toEqual([]);
    expect(mockedFetchAllPages).toHaveBeenCalledTimes(1);
  });
});
