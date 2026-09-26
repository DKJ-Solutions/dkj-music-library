// spotifyGet / fetchAllPages: de rate-limit-bewuste GET-wrapper + paginatie. getValidAccessToken
// wordt hier ALTIJD gemockt (geen echte token-store/refresh nodig); fetch wordt via de
// `fetchImpl`-optie ingespoten, nooit het globale netwerk op.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./auth", () => ({
  getValidAccessToken: vi.fn(),
}));

import { getValidAccessToken } from "./auth";
import { SpotifyApiError } from "./errors";
import { fetchAllPages, spotifyGet } from "./httpClient";

function jsonResponse(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name: string) => headers[name] ?? null },
    json: async () => body,
    // `text` hoort erbij sinds het foutlichaam eerst als tekst wordt gelezen (zie readErrorBody in
    // httpClient.ts) -- zonder deze zou een neppe respons zich anders gedragen dan een echte.
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

/** Een respons met een lichaam dat GEEN JSON is -- precies wat Spotify stuurt bij "The user is not
 *  registered for this application." Zonder deze vorm was de bug niet te reproduceren. */
function textResponse(status: number, body: string): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    json: async () => {
      throw new SyntaxError("Unexpected token T in JSON at position 0");
    },
    text: async () => body,
  } as unknown as Response;
}

beforeEach(() => {
  vi.mocked(getValidAccessToken).mockResolvedValue("test-access-token");
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("spotifyGet", () => {
  it("voegt de Bearer-header toe en geeft de JSON-body terug bij 200", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, { hello: "world" }));

    const result = await spotifyGet("/me/playlists", { limit: 50 }, { fetchImpl });

    expect(result).toEqual({ hello: "world" });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(String(url)).toBe("https://api.spotify.com/v1/me/playlists?limit=50");
    expect(init.headers.Authorization).toBe("Bearer test-access-token");
    expect(init.method).toBe("GET");
  });

  it("hergebruikt een volledige URL (bv. uit een paging-object se `next`) ongewijzigd", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, { items: [] }));
    const nextUrl = "https://api.spotify.com/v1/me/playlists?limit=50&offset=50";

    await spotifyGet(nextUrl, undefined, { fetchImpl });

    expect(String(fetchImpl.mock.calls[0][0])).toBe(nextUrl);
  });

  it("wacht Retry-After seconden bij 429 en herhaalt de aanvraag daarna", async () => {
    vi.useFakeTimers();
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(429, null, { "Retry-After": "2" }))
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }));

    const promise = spotifyGet("/me/playlists", {}, { fetchImpl });
    await vi.advanceTimersByTimeAsync(2000);
    const result = await promise;

    expect(result).toEqual({ ok: true });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("gooit SpotifyApiError als 429 blijft aanhouden na de max. aantal pogingen", async () => {
    vi.useFakeTimers();
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(429, null, { "Retry-After": "0" }));

    const promise = spotifyGet("/me/playlists", {}, { fetchImpl });
    // Genoeg tijd voor alle retries; onbelangrijk hoe lang precies.
    const assertion = expect(promise).rejects.toBeInstanceOf(SpotifyApiError);
    await vi.advanceTimersByTimeAsync(60_000);
    await assertion;
  });

  it("gooit SpotifyApiError bij een niet-2xx, niet-429-respons", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(403, { error: "forbidden" }));

    await expect(spotifyGet("/me/playlists", {}, { fetchImpl })).rejects.toMatchObject({
      status: 403,
      body: { error: "forbidden" },
    });
  });

  // DE BUG (Dave, 2026-07-25): hier stond `res.json().catch(() => null)`, waardoor elk niet-JSON
  // foutlichaam in `null` veranderde. Spotify's *"The user is not registered for this application."* is
  // platte tekst, en juist die boodschap was de enige die de oorzaak van 48 mislukte schrijfacties
  // prijsgaf. Het lichaam moet dus bewaard blijven, in welke vorm het ook komt.
  it("bewaart een foutlichaam dat GEEN JSON is, als rauwe tekst", async () => {
    const tekst = "The user is not registered for this application. Please check your settings on https://developer.spotify.com/dashboard.";
    const fetchImpl = vi.fn().mockResolvedValue(textResponse(403, tekst));

    await expect(spotifyGet("/me", {}, { fetchImpl })).rejects.toMatchObject({
      status: 403,
      body: tekst,
    });
  });

  it("levert null als het foutlichaam werkelijk leeg is", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(textResponse(500, ""));

    await expect(spotifyGet("/me", {}, { fetchImpl })).rejects.toMatchObject({
      status: 500,
      body: null,
    });
  });

  it("weigert een `next`-URL die niet naar api.spotify.com wijst (host-validatie), en stuurt geen Bearer-token mee", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, { ok: true }));

    await expect(
      spotifyGet("https://evil.example.com/v1/me/playlists?offset=50", undefined, { fetchImpl })
    ).rejects.toMatchObject({ status: 0 });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("logt de poging-teller kloppend bij herhaalde 429's (nooit '6/5' bij MAX_RETRIES=5)", async () => {
    vi.useFakeTimers();
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(429, null, { "Retry-After": "0" }));

    const promise = spotifyGet("/me/playlists", {}, { fetchImpl });
    const assertion = expect(promise).rejects.toBeInstanceOf(SpotifyApiError);
    await vi.advanceTimersByTimeAsync(60_000);
    await assertion;

    const messages = warnSpy.mock.calls.map(([message]) => message);
    expect(messages.at(-1)).toMatch(/poging 6\/6/);
    expect(messages.some((m) => typeof m === "string" && m.includes("/5"))).toBe(false);
    warnSpy.mockRestore();
  });
});

describe("fetchAllPages", () => {
  it("loopt alle pagina's af via `next` tot alles binnen is", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(200, {
          items: [{ id: 1 }, { id: 2 }],
          next: "https://api.spotify.com/v1/me/playlists?limit=50&offset=50",
          offset: 0,
          limit: 50,
          total: 3,
        })
      )
      .mockResolvedValueOnce(
        jsonResponse(200, { items: [{ id: 3 }], next: null, offset: 50, limit: 50, total: 3 })
      );

    const items = await fetchAllPages<{ id: number }>("/me/playlists", {}, { fetchImpl });

    expect(items).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    // Tweede call gebruikt de `next`-URL rechtstreeks (geen dubbele limit/offset-params erbij).
    expect(String(fetchImpl.mock.calls[1][0])).toBe(
      "https://api.spotify.com/v1/me/playlists?limit=50&offset=50"
    );
  });

  it("geeft een lege lijst terug als de eerste pagina al leeg is (geen playlists)", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse(200, { items: [], next: null, offset: 0, limit: 50, total: 0 }));

    const items = await fetchAllPages("/me/playlists", {}, { fetchImpl });

    expect(items).toEqual([]);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
