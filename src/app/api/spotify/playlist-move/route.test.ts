// POST /api/spotify/playlist-move: een track van de ene werkbak naar een andere (#134). Spotify en de snapshot
// worden gemockt; de route draait echt, met de echte (naar een tijdelijke map omgeleide) rate-limit-store.
import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/spotify/snapshotStore", () => ({ readSnapshot: vi.fn() }));
vi.mock("@/lib/spotify/playlistApi", () => ({ addPlaylistItems: vi.fn(), removePlaylistItems: vi.fn() }));
vi.mock("@/lib/spotify/refreshPlaylist", () => ({ refreshPlaylistInSnapshot: vi.fn() }));

import { readSnapshot } from "@/lib/spotify/snapshotStore";
import { addPlaylistItems, removePlaylistItems } from "@/lib/spotify/playlistApi";
import { refreshPlaylistInSnapshot } from "@/lib/spotify/refreshPlaylist";
import { SpotifyApiError } from "@/lib/spotify/errors";
import { recordRateLimit } from "@/lib/spotify/rateLimitStore";
import { POST } from "./route";

const FROM = "F".repeat(22);
const TO = "T".repeat(22);
const OTHER = "O".repeat(22);
const TRACK = "a".repeat(22);
const item = (id: string) => ({ addedAt: null, addedBy: null, isLocal: false, track: { id } });
const request = (body: unknown) =>
  new Request("http://localhost/api/spotify/playlist-move", { method: "POST", body: JSON.stringify(body) });
const move = (over: Record<string, string> = {}) => POST(request({ fromId: FROM, toId: TO, trackId: TRACK, ...over }));

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "dkj-playlist-move-"));
  process.env.SPOTIFY_RATE_LIMIT_STORE_PATH = path.join(dir, "rate-limit.json");
  vi.resetAllMocks();
  vi.mocked(readSnapshot).mockReturnValue({
    syncedAt: "x",
    playlists: [
      { id: FROM, name: "Purple Mix Vol. X", snapshotId: "from1", tracks: [item(TRACK), item("b".repeat(22))] },
      { id: TO, name: "Blue Mix Vol. X", snapshotId: "to1", tracks: [item("c".repeat(22))] },
      { id: OTHER, name: "Gewoon een playlist", snapshotId: "o1", tracks: [] },
    ],
  } as never);
  vi.mocked(addPlaylistItems).mockResolvedValue("to2");
  vi.mocked(removePlaylistItems).mockResolvedValue("from2");
  vi.mocked(refreshPlaylistInSnapshot).mockResolvedValue({ playlist: {} as never, libraryUpdated: true });
});
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

describe("playlist-move route", () => {
  it("voegt eerst toe aan de doelwerkbak, haalt dan weg uit de bron en ververst beide", async () => {
    const res = await move();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ moved: true, added: true, refreshed: true });
    expect(addPlaylistItems).toHaveBeenCalledWith(TO, [TRACK]);
    expect(removePlaylistItems).toHaveBeenCalledWith(FROM, [TRACK], "from1");
    expect(vi.mocked(addPlaylistItems).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(removePlaylistItems).mock.invocationCallOrder[0]
    );
    expect(vi.mocked(refreshPlaylistInSnapshot).mock.calls.map((call) => call[0])).toEqual([FROM, TO]);
  });

  it("voegt niet nog eens toe als de track al in de doelwerkbak staat", async () => {
    const snapshot = vi.mocked(readSnapshot)() as unknown as { playlists: { tracks: unknown[] }[] };
    snapshot.playlists[1].tracks.push(item(TRACK));
    vi.mocked(readSnapshot).mockReturnValue(snapshot as never);
    const res = await move();
    expect(await res.json()).toMatchObject({ moved: true, added: false });
    expect(addPlaylistItems).not.toHaveBeenCalled();
    expect(removePlaylistItems).toHaveBeenCalledTimes(1);
  });

  it("weigert een doel dat geen werkbak is, dezelfde werkbak, en een track die er niet in staat", async () => {
    expect((await move({ toId: OTHER })).status).toBe(404);
    expect((await move({ toId: FROM })).status).toBe(400);
    expect((await move({ trackId: "z".repeat(22) })).status).toBe(409);
    expect((await move({ trackId: "kort" })).status).toBe(400);
    expect(addPlaylistItems).not.toHaveBeenCalled();
    expect(removePlaylistItems).not.toHaveBeenCalled();
  });

  it("weigert met 503 zolang de rate limit loopt, zonder Spotify aan te roepen", async () => {
    recordRateLimit(600);
    const res = await move();
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ error: "rate_limited" });
    expect(addPlaylistItems).not.toHaveBeenCalled();
  });

  it("haalt niets weg als het toevoegen mislukt", async () => {
    vi.mocked(addPlaylistItems).mockRejectedValue(new SpotifyApiError("nee", 403, null));
    const res = await move();
    expect(res.status).toBe(403);
    expect(removePlaylistItems).not.toHaveBeenCalled();
    expect((await res.json()).message).not.toMatch(/beide werkbakken/);
  });

  it("zegt dat de track in beide staat als het weghalen na het toevoegen mislukt", async () => {
    vi.mocked(removePlaylistItems).mockRejectedValue(new Error("stuk"));
    const res = await move();
    expect(res.status).toBe(500);
    expect((await res.json()).message).toMatch(/beide werkbakken/);
  });

  it("geeft het slot vrij, ook na een fout, zodat een volgende verplaatsing kan", async () => {
    vi.mocked(removePlaylistItems).mockRejectedValueOnce(new Error("stuk"));
    await move();
    expect((await move()).status).toBe(200);
  });
});
