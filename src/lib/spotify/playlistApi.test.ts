// reorderPlaylistItem: de body die naar Spotify gaat en het snapshot_id dat terugkomt. getValidAccessToken
// wordt gemockt en fetch ingespoten, zoals in httpClient.test.ts.
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./auth", () => ({ getValidAccessToken: vi.fn() }));

import { getValidAccessToken } from "./auth";
import { SpotifyApiError } from "./errors";
import { reorderPlaylistItem } from "./playlistApi";

function response(status: number, text: string): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    text: async () => text,
  } as unknown as Response;
}

beforeEach(() => {
  vi.mocked(getValidAccessToken).mockResolvedValue("tok");
});

describe("reorderPlaylistItem", () => {
  it("stuurt PUT /playlists/{id}/items met range_length 1 en het meegegeven snapshot_id, en geeft het nieuwe terug", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response(200, JSON.stringify({ snapshot_id: "NEW" })));

    const result = await reorderPlaylistItem("abc", { rangeStart: 3, insertBefore: 1, snapshotId: "OLD" }, { fetchImpl });

    expect(result).toBe("NEW");
    const [url, init] = fetchImpl.mock.calls[0];
    expect(String(url)).toBe("https://api.spotify.com/v1/playlists/abc/items");
    expect(init.method).toBe("PUT");
    expect(JSON.parse(init.body)).toEqual({ range_start: 3, insert_before: 1, range_length: 1, snapshot_id: "OLD" });
  });

  it("geeft null (en gooit niet) als Spotify na een geslaagde PUT geen snapshot_id teruggeeft", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response(200, ""));
    await expect(reorderPlaylistItem("abc", { rangeStart: 0, insertBefore: 2, snapshotId: "x" }, { fetchImpl })).resolves.toBeNull();
  });

  it("geeft een Spotify-fout door als SpotifyApiError", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response(403, JSON.stringify({ error: { message: "nope" } })));
    await expect(reorderPlaylistItem("abc", { rangeStart: 0, insertBefore: 2, snapshotId: "x" }, { fetchImpl })).rejects.toBeInstanceOf(
      SpotifyApiError
    );
  });
});
