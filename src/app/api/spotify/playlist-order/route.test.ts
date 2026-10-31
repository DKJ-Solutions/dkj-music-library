// POST /api/spotify/playlist-order: nooit verplaatsen op verouderde plekken. Alles van Spotify en van schijf
// wordt gemockt; de route-handler zelf draait echt, met de echte (maar naar een tijdelijke map omgeleide)
// stores voor de uitgestelde volgorde en de rate limit.
import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
import { SpotifyRateLimitError } from "@/lib/spotify/errors";
import { getPendingOrder, setPendingOrder } from "@/lib/spotify/pendingOrderStore";
import { getRateLimitUntil, recordRateLimit } from "@/lib/spotify/rateLimitStore";
import { DELETE, POST } from "./route";

const ID = "P".repeat(22);
const item = (id: string | null) => ({ addedAt: null, addedBy: null, isLocal: false, track: id ? { id } : null });
const items = (...ids: (string | null)[]) => ids.map(item);

const BODY = { playlistId: ID, snapshotId: "snap1", rangeStart: 0, insertBefore: 3, targetPosition: 2, expectedStartId: "a", expectedTargetId: "c" };
const request = (body: unknown) =>
  new Request("http://localhost/api/spotify/playlist-order", { method: "POST", body: JSON.stringify(body) });

let dir: string;
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "dkj-order-route-"));
  process.env.SPOTIFY_PENDING_ORDER_STORE_PATH = path.join(dir, "pending-order.json");
  process.env.SPOTIFY_RATE_LIMIT_STORE_PATH = path.join(dir, "rate-limit.json");
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

afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

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

  it("bewaart de verplaatsing lokaal als Spotify een lange rate limit geeft, en geeft de playlist weer vrij", async () => {
    vi.mocked(spotifyGet).mockRejectedValueOnce(new SpotifyRateLimitError("rate limit", 19429));
    const res = await POST(request(BODY));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ pending: true, moveCount: 1 });
    expect(reorderPlaylistItem).not.toHaveBeenCalled();
    // a b c -> a naar plek 3 (voor het einde): b c a
    expect(getPendingOrder(ID)).toMatchObject({ baseSnapshotId: "snap1", order: [1, 2, 0], moveCount: 1 });
    // Het slot is los: de volgende verplaatsing komt gewoon aan (nu op de uitgestelde volgorde b c a).
    const next = { ...BODY, rangeStart: 2, insertBefore: 0, targetPosition: 0, expectedStartId: "a", expectedTargetId: "b" };
    expect((await POST(request(next))).status).toBe(200);
    expect(getPendingOrder(ID)).toMatchObject({ order: [0, 1, 2], moveCount: 2 });
  });

  it("bewaart ook als de PUT zelf de rate limit raakt", async () => {
    vi.mocked(reorderPlaylistItem).mockRejectedValueOnce(new SpotifyRateLimitError("rate limit", 3600));
    const res = await POST(request(BODY));
    expect(res.status).toBe(200);
    const data = (await res.json()) as { pending: boolean; rateLimitedUntil: number };
    expect(data.pending).toBe(true);
    expect(data.rateLimitedUntil).toBeGreaterThan(Date.now());
    expect(getPendingOrder(ID)?.order).toEqual([1, 2, 0]);
  });

  it("gaat bij een actieve rate limit niet naar Spotify maar bewaart lokaal, met het einde van de ban", async () => {
    const until = recordRateLimit(3600);
    const res = await POST(request(BODY));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ pending: true, moveCount: 1, rateLimitedUntil: until });
    expect(spotifyGet).not.toHaveBeenCalled();
    expect(fetchAllPlaylistItems).not.toHaveBeenCalled();
    expect(getRateLimitUntil()).toBe(until);
  });

  it("stuurt zodra er een uitgestelde volgorde is ALLES daarheen, ook zonder rate limit, en controleert de getoonde volgorde", async () => {
    setPendingOrder(ID, { baseSnapshotId: "snap1", order: [2, 1, 0], moveCount: 1 }); // getoond: c b a
    // Getoond staat c op plek 0 en a op plek 2: een verplaatsing die uitgaat van Spotify's a b c wordt geweigerd.
    expect((await POST(request(BODY))).status).toBe(409);
    expect(getPendingOrder(ID)?.moveCount).toBe(1);

    const res = await POST(request({ ...BODY, expectedStartId: "c", expectedTargetId: "a" })); // c voor het einde
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ pending: true, moveCount: 2, rateLimitedUntil: null });
    expect(getPendingOrder(ID)?.order).toEqual([1, 0, 2]); // c b a -> b a c
    expect(spotifyGet).not.toHaveBeenCalled();
    expect(reorderPlaylistItem).not.toHaveBeenCalled();
  });

  it("geeft 409 pending_conflict als de uitgestelde volgorde bij een andere snapshot hoort", async () => {
    setPendingOrder(ID, { baseSnapshotId: "snapOud", order: [2, 1, 0], moveCount: 1 });
    const res = await POST(request(BODY));
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ error: "pending_conflict" });
    expect(getPendingOrder(ID)?.order).toEqual([2, 1, 0]);
  });

  it("gooit de uitgestelde volgorde weg met DELETE, ook tijdens een rate limit", async () => {
    setPendingOrder(ID, { baseSnapshotId: "snap1", order: [2, 1, 0], moveCount: 1 });
    recordRateLimit(3600);
    const body = JSON.stringify({ playlistId: ID });
    const res = await DELETE(new Request("http://localhost/api/spotify/playlist-order", { method: "DELETE", body }));
    expect(res.status).toBe(200);
    expect(getPendingOrder(ID)).toBeNull();
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
