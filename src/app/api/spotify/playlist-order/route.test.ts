// POST /api/spotify/playlist-order: verplaatsingen worden ALTIJD lokaal bewaard en nooit naar Spotify gestuurd,
// en nooit op verouderde plekken. De Spotify-modules worden gemockt om te bewijzen dat ze niet worden
// aangeroepen; de route-handler draait echt, met de echte (naar een tijdelijke map omgeleide) stores.
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
import { getPendingOrder, setPendingOrder } from "@/lib/spotify/pendingOrderStore";
import { recordRateLimit } from "@/lib/spotify/rateLimitStore";
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
});

afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

const expectNoSpotify = () => {
  expect(spotifyGet).not.toHaveBeenCalled();
  expect(fetchAllPlaylistItems).not.toHaveBeenCalled();
  expect(reorderPlaylistItem).not.toHaveBeenCalled();
  expect(refreshPlaylistInSnapshot).not.toHaveBeenCalled();
};

describe("playlist-order route", () => {
  it("bewaart de eerste verplaatsing lokaal zonder Spotify aan te roepen", async () => {
    const res = await POST(request(BODY));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ pending: true, moveCount: 1, rateLimitedUntil: null });
    // a b c -> a naar plek 3 (voor het einde): b c a
    expect(getPendingOrder(ID)).toMatchObject({ baseSnapshotId: "snap1", order: [1, 2, 0], moveCount: 1 });
    expectNoSpotify();
  });

  it("past een volgende verplaatsing toe op de uitgestelde volgorde en controleert de GETOONDE volgorde", async () => {
    setPendingOrder(ID, { baseSnapshotId: "snap1", order: [2, 1, 0], moveCount: 1 }); // getoond: c b a
    // Getoond staat c op plek 0 en a op plek 2: een verplaatsing die uitgaat van a b c wordt geweigerd.
    expect((await POST(request(BODY))).status).toBe(409);
    expect(getPendingOrder(ID)?.moveCount).toBe(1);

    const res = await POST(request({ ...BODY, expectedStartId: "c", expectedTargetId: "a" })); // c voor het einde
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ pending: true, moveCount: 2, rateLimitedUntil: null });
    expect(getPendingOrder(ID)?.order).toEqual([1, 0, 2]); // c b a -> b a c
    expectNoSpotify();
  });

  it("heen en weer slepen kost geen Spotify-call en eindigt weer op de oorspronkelijke volgorde", async () => {
    await POST(request(BODY)); // b c a
    const back = { ...BODY, rangeStart: 2, insertBefore: 0, targetPosition: 0, expectedStartId: "a", expectedTargetId: "b" };
    expect((await POST(request(back))).status).toBe(200);
    expect(getPendingOrder(ID)).toMatchObject({ order: [0, 1, 2], moveCount: 2 });
    expectNoSpotify();
  });

  it("meldt een actieve rate limit alleen als informatie: bewaren lukt gewoon", async () => {
    const until = recordRateLimit(3600);
    const res = await POST(request(BODY));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ pending: true, moveCount: 1, rateLimitedUntil: until });
    expectNoSpotify();
  });

  it("geeft 409 zonder Spotify aan te roepen als de pagina een ander snapshot_id heeft dan de opslag", async () => {
    expect((await POST(request({ ...BODY, snapshotId: "oud" }))).status).toBe(409);
    expect(getPendingOrder(ID)).toBeNull();
    expectNoSpotify();
  });

  it("geeft 409 als de verwachte track op de beginplek een andere is", async () => {
    expect((await POST(request({ ...BODY, expectedStartId: "z" }))).status).toBe(409);
    expect(getPendingOrder(ID)).toBeNull();
  });

  it("geeft 409 als de doelplek een andere track draagt of buiten de lijst valt", async () => {
    expect((await POST(request({ ...BODY, expectedTargetId: "b" }))).status).toBe(409);
    expect((await POST(request({ ...BODY, targetPosition: 3 }))).status).toBe(409);
    expect(getPendingOrder(ID)).toBeNull();
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

  it("weigert een slecht verzoek met 400", async () => {
    expect((await POST(request({ ...BODY, playlistId: "kort" }))).status).toBe(400);
  });

  it("weigert een playlist die geen werkbak is", async () => {
    vi.mocked(readSnapshot).mockReturnValue({
      syncedAt: "x",
      playlists: [{ id: ID, name: "Gewone playlist", snapshotId: "snap1", tracks: items("a", "b", "c") }],
    } as never);
    expect((await POST(request(BODY))).status).toBe(404);
  });
});
