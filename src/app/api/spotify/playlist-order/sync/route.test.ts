// POST /api/spotify/playlist-order/sync: de uitgestelde volgorde naar Spotify sturen. Spotify en de snapshot
// worden gemockt; de route draait echt, met de echte (naar een tijdelijke map omgeleide) stores.
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
import { applyMove } from "@/lib/library/pendingOrder";
import { getPendingOrder, setPendingOrder } from "@/lib/spotify/pendingOrderStore";
import { recordRateLimit } from "@/lib/spotify/rateLimitStore";
import { POST } from "./route";

const ID = "P".repeat(22);
const item = (id: string | null) => ({ addedAt: null, addedBy: null, isLocal: false, track: id ? { id } : null });
const items = (...ids: (string | null)[]) => ids.map(item);
const request = () =>
  new Request("http://localhost/api/spotify/playlist-order/sync", { method: "POST", body: JSON.stringify({ playlistId: ID }) });

// Gewenst: c a null b a  (indices 4 0 2 1 3 van a b null a c)
const DESIRED_ORDER = [4, 0, 2, 1, 3];
const DESIRED = ["c", "a", null, "b", "a"];

let dir: string;
// De "live" playlist van Spotify: elke PUT wordt er echt op toegepast, zodat we de uitkomst kunnen vergelijken.
let live: (string | null)[];
let realReorder: (id: string, move: { rangeStart: number; insertBefore: number; snapshotId: string }) => Promise<string | null>;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "dkj-order-sync-"));
  process.env.SPOTIFY_PENDING_ORDER_STORE_PATH = path.join(dir, "pending-order.json");
  process.env.SPOTIFY_RATE_LIMIT_STORE_PATH = path.join(dir, "rate-limit.json");
  vi.resetAllMocks();
  live = ["a", "b", null, "a", "c"];
  let n = 1;
  realReorder = async (_id, move) => {
    live = applyMove(live, move);
    return `snap${++n}`;
  };
  vi.mocked(readSnapshot).mockReturnValue({
    syncedAt: "x",
    playlists: [{ id: ID, name: "House Mix Vol. X", snapshotId: "snap1", tracks: items("a", "b", null, "a", "c") }],
  } as never);
  vi.mocked(spotifyGet).mockResolvedValue({ snapshot_id: "snap1" });
  vi.mocked(fetchAllPlaylistItems).mockImplementation(async () => items(...live) as never);
  vi.mocked(reorderPlaylistItem).mockImplementation(realReorder);
  vi.mocked(refreshPlaylistInSnapshot).mockResolvedValue({ playlist: {} as never, libraryUpdated: true });
});
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

describe("playlist-order sync route", () => {
  it("brengt Spotify in de gewenste volgorde (met dubbelen en een item zonder track), ververst en ruimt op", async () => {
    setPendingOrder(ID, { baseSnapshotId: "snap1", order: DESIRED_ORDER, moveCount: 3 });
    const res = await POST(request());
    expect(res.status).toBe(200);
    const data = (await res.json()) as { synced: boolean; moves: number; refreshed: boolean };
    expect(data).toMatchObject({ synced: true, refreshed: true });
    expect(data.moves).toBe(vi.mocked(reorderPlaylistItem).mock.calls.length);
    expect(live).toEqual(DESIRED);
    // Elke PUT draagt het snapshot_id van de vorige.
    const snapshots = vi.mocked(reorderPlaylistItem).mock.calls.map((call) => call[1].snapshotId);
    expect(snapshots[0]).toBe("snap1");
    expect(snapshots.slice(1)).toEqual(snapshots.slice(1).map((_, i) => `snap${i + 2}`));
    expect(refreshPlaylistInSnapshot).toHaveBeenCalledTimes(1);
    expect(getPendingOrder(ID)).toBeNull();
  });

  it("weigert met 503 en rateLimitedUntil zolang de rate limit loopt, zonder Spotify aan te roepen", async () => {
    setPendingOrder(ID, { baseSnapshotId: "snap1", order: DESIRED_ORDER, moveCount: 1 });
    const until = recordRateLimit(3600);
    const res = await POST(request());
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ error: "rate_limited", rateLimitedUntil: until });
    expect(spotifyGet).not.toHaveBeenCalled();
    expect(getPendingOrder(ID)).not.toBeNull();
  });

  it("houdt de uitgestelde volgorde bij een 429 halverwege en rekent de volgende keer vanuit de live lijst", async () => {
    setPendingOrder(ID, { baseSnapshotId: "snap1", order: DESIRED_ORDER, moveCount: 1 });
    vi.mocked(reorderPlaylistItem)
      .mockImplementationOnce(realReorder)
      .mockRejectedValueOnce(new SpotifyRateLimitError("rate limit", 3600));
    const res = await POST(request());
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ error: "rate_limited" });
    expect(getPendingOrder(ID)).not.toBeNull();
    expect(refreshPlaylistInSnapshot).not.toHaveBeenCalled();
    expect(live).not.toEqual(DESIRED); // één verplaatsing gedaan, de rest wacht

    // Later: de rest volgt, zonder de eerste verplaatsing opnieuw te doen.
    vi.mocked(reorderPlaylistItem).mockImplementation(realReorder);
    const second = await POST(request());
    expect(second.status).toBe(200);
    expect(live).toEqual(DESIRED);
    expect(getPendingOrder(ID)).toBeNull();
  });

  it("geeft 409 pending_conflict en verplaatst niets als Spotify andere tracks heeft", async () => {
    setPendingOrder(ID, { baseSnapshotId: "snap1", order: DESIRED_ORDER, moveCount: 1 });
    live = [...live, "nieuw"];
    const res = await POST(request());
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ error: "pending_conflict" });
    expect(reorderPlaylistItem).not.toHaveBeenCalled();
    expect(getPendingOrder(ID)).not.toBeNull();
  });

  it("geeft 409 pending_conflict als de opgeslagen snapshot een andere is dan waarop de volgorde is gebouwd", async () => {
    setPendingOrder(ID, { baseSnapshotId: "snapOud", order: DESIRED_ORDER, moveCount: 1 });
    expect((await POST(request())).status).toBe(409);
    expect(spotifyGet).not.toHaveBeenCalled();
  });

  it("geeft 404 als er niets te versturen is", async () => {
    expect((await POST(request())).status).toBe(404);
  });
});
