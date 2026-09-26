// sameOriginGuard: de gedeelde CSRF-verdediging vóór de drie state-wijzigende POST-routes.
import { describe, expect, it } from "vitest";
import { sameOriginGuard } from "./sameOrigin";

function makeRequest(url: string, headers: Record<string, string> = {}): Request {
  return new Request(url, { method: "POST", headers });
}

describe("sameOriginGuard", () => {
  it("laat een same-origin request door (Sec-Fetch-Site: same-origin)", () => {
    const request = makeRequest("http://127.0.0.1:3000/api/spotify/sync", {
      "sec-fetch-site": "same-origin",
    });
    expect(sameOriginGuard(request)).toBeNull();
  });

  it("laat 'none' door (rechtstreekse navigatie, geen pagina die de request initieert)", () => {
    const request = makeRequest("http://127.0.0.1:3000/api/spotify/sync", {
      "sec-fetch-site": "none",
    });
    expect(sameOriginGuard(request)).toBeNull();
  });

  it("weigert cross-site met 403", () => {
    const request = makeRequest("http://127.0.0.1:3000/api/spotify/sync", {
      "sec-fetch-site": "cross-site",
    });
    const result = sameOriginGuard(request);
    expect(result).not.toBeNull();
    expect(result?.status).toBe(403);
  });

  it("weigert same-site (ander (sub)domein, niet exact dezelfde origin) met 403", () => {
    const request = makeRequest("http://127.0.0.1:3000/api/spotify/sync", {
      "sec-fetch-site": "same-site",
    });
    expect(sameOriginGuard(request)?.status).toBe(403);
  });

  it("valt terug op Origin-vergelijking zonder Sec-Fetch-Site: gelijke origin mag door", () => {
    const request = makeRequest("http://127.0.0.1:3000/api/spotify/sync", {
      origin: "http://127.0.0.1:3000",
    });
    expect(sameOriginGuard(request)).toBeNull();
  });

  it("valt terug op Origin-vergelijking: een andere origin wordt geweigerd", () => {
    const request = makeRequest("http://127.0.0.1:3000/api/spotify/sync", {
      origin: "https://evil.example.com",
    });
    expect(sameOriginGuard(request)?.status).toBe(403);
  });

  it("laat een verzoek zonder Sec-Fetch-Site én zonder Origin door (bv. curl -X POST, zie sync/route.ts)", () => {
    const request = makeRequest("http://127.0.0.1:3000/api/spotify/sync");
    expect(sameOriginGuard(request)).toBeNull();
  });
});
