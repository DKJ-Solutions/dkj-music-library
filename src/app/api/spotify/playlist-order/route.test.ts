// POST /api/spotify/playlist-order: nooit verplaatsen op verouderde plekken. Alles van Spotify en van schijf
// wordt gemockt; de route-handler zelf draait echt.
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/spotify/snapshotStore", () => ({ readSnapshot: vi.fn() }));
vi.mock("@/lib/spotify/httpClient", () => ({ spotifyGet: vi.fn() }));
vi.mock("@/lib/spotify/ingest", () => ({ fetchAllPlaylistItems: vi.fn() }));
vi.mock("@/lib/spotify/playlistApi", () => ({ reorderPlaylistItem: vi.fn() }));
vi.mock("@/lib/spotify/refreshPlaylist", () => ({ refreshPlaylistInSnapshot: vi.fn() }));

import { readSnapshot } from "@/lib/spotify/snapshotStore";
import { spotifyGet } from "@/lib/spotify/httpClient";
import { fetchAllPlaylistItems } from "@/lib/spotify/ingest";
import { reorderPlaylistItem } from "@/lib/spotify/playlistApi";
import { refreshPlaylistInSnapshot } from "@/lib/spotify/refreshPlaylist";
import { POST } from "./route";

const ID = "P".repeat(22);
const item = (id: string | null) => ({ addedAt: null, addedBy: null, isLocal: false, track: id ? { id } : null });
const items = (...ids: (string | null)[]) => ids.map(item);

const BODY = { playlistId: ID, snapshotId: "snap1", rangeStart: 0, insertBefore: 3, targetPosition: 2, expectedStartId: "a", expectedTargetId: "c" };
const request = (body: unknown) =>
  new Request("http://localhost/api/spotify/playlist-order", { method: "POST", body: JSON.stringify(body) });

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(readSnapshot).mockReturnValue({
    syncedAt: "x",
    playlists: [{ id: ID, name: "House Mix Vol. X", snapshotId: "snap1", tracks: items("a", "b", "c") }],
  } as never);
  vi.mocked(spotifyGet).mockResolvedValue({ snapshot_id: "snap1" });
  vi.mocked(fetchAllPlaylistItems).mockResolvedValue(items("a", "b", "c") as never);
  vi.mocked(reorderPlaylistItem).mockResolvedValue("snap2");
  vi.mocked(refreshPlaylistInSnapshot).mockResolvedValue({ playlist: {} as never, libraryUpdated: true });
});

describe("playlist-order route", () => {
  it("verplaatst als de live playlist klopt en ververst daarna", async () => {
    const res = await POST(request(BODY));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ snapshotId: "snap2", refreshed: true });
    expect(reorderPlaylistItem).toHaveBeenCalledWith(ID, { rangeStart: 0, insertBefore: 3, snapshotId: "snap1" });
    expect(refreshPlaylistInSnapshot).toHaveBeenCalledTimes(1);
  });

  it("geeft 409 en verplaatst niets als de live track op de beginplek een andere is, ook bij gelijke snapshot_id's", async () => {
    // De snapshot droeg het nieuwe id bij oude tracks (mislukte ophaal): beide id-controles slagen.
    vi.mocked(fetchAllPlaylistItems).mockResolvedValue(items("z", "a", "c") as never);
    const res = await POST(request(BODY));
    expect(res.status).toBe(409);
    expect(reorderPlaylistItem).not.toHaveBeenCalled();
    expect(refreshPlaylistInSnapshot).toHaveBeenCalledTimes(1);
  });

  it("geeft 409 als de doelplek een andere track draagt", async () => {
    vi.mocked(fetchAllPlaylistItems).mockResolvedValue(items("a", "c", "b") as never);
    expect((await POST(request(BODY))).status).toBe(409);
    expect(reorderPlaylistItem).not.toHaveBeenCalled();
  });

  it("geeft 409 als de live playlist korter is dan de plekken", async () => {
    vi.mocked(fetchAllPlaylistItems).mockResolvedValue(items("a", "b") as never);
    expect((await POST(request(BODY))).status).toBe(409);
    expect(reorderPlaylistItem).not.toHaveBeenCalled();
  });

  it("geeft 409 als Spotify een ander snapshot_id heeft", async () => {
    vi.mocked(spotifyGet).mockResolvedValue({ snapshot_id: "snap9" });
    expect((await POST(request(BODY))).status).toBe(409);
    expect(reorderPlaylistItem).not.toHaveBeenCalled();
  });

  it("geeft 409 zonder Spotify aan te roepen als de pagina een ander snapshot_id heeft dan de opslag", async () => {
    expect((await POST(request({ ...BODY, snapshotId: "oud" }))).status).toBe(409);
    expect(spotifyGet).not.toHaveBeenCalled();
  });

  it("weigert een tweede gelijktijdige verplaatsing in dezelfde playlist met 429", async () => {
    let release!: () => void;
    vi.mocked(reorderPlaylistItem).mockReturnValue(new Promise((resolve) => (release = () => resolve("snap2"))));
    const first = POST(request(BODY));
    await vi.waitFor(() => expect(reorderPlaylistItem).toHaveBeenCalled());
    const second = await POST(request(BODY));
    expect(second.status).toBe(429);
    release();
    expect((await first).status).toBe(200);
    // Daarna is de playlist weer vrij.
    expect((await POST(request(BODY))).status).toBe(200);
  });

  it("meldt een geslaagde PUT zonder snapshot_id in het antwoord als verplaatst, niet als mislukt", async () => {
    vi.mocked(reorderPlaylistItem).mockResolvedValue(null);
    const res = await POST(request(BODY));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ snapshotId: null, refreshed: true });
  });

  it("meldt refreshed: false als het ophalen na een geslaagde PUT mislukt", async () => {
    vi.mocked(refreshPlaylistInSnapshot).mockRejectedValue(new Error("netwerk"));
    const res = await POST(request(BODY));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ snapshotId: "snap2", refreshed: false });
  });

  it("weigert een playlist die geen werkbak is", async () => {
    vi.mocked(readSnapshot).mockReturnValue({
      syncedAt: "x",
      playlists: [{ id: ID, name: "Gewone playlist", snapshotId: "snap1", tracks: items("a", "b", "c") }],
    } as never);
    expect((await POST(request(BODY))).status).toBe(404);
  });
});
