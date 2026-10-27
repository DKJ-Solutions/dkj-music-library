import { describe, expect, it } from "vitest";
import { breadcrumbTrail, pageTitle, PAGE_TITLES } from "./pages";

describe("breadcrumbTrail", () => {
  it("is alleen Home op de homepagina", () => {
    expect(breadcrumbTrail("/")).toEqual([{ href: "/", label: "Home" }]);
  });

  it("loopt via elke ouder met een naam naar de pagina zelf", () => {
    expect(breadcrumbTrail("/spotify/playlists/musicmoodcolours/128bpm").map((c) => c.label)).toEqual([
      "Home",
      "Spotify",
      "Playlists",
      "Music Mood Colours",
      "128 BPM",
    ]);
  });

  it("hangt de vergelijkingen onder Compare", () => {
    expect(breadcrumbTrail("/compare/playlists-mixes").map((c) => c.label)).toEqual([
      "Home",
      "Compare",
      "Playlists ↔ Mixes",
    ]);
  });

  it("stopt bij de dichtstbijzijnde bekende ouder voor een onbekende route", () => {
    expect(breadcrumbTrail("/spotify/bestaat-niet").map((c) => c.href)).toEqual(["/", "/spotify"]);
  });

  it("neemt de naam van een pagina uit data mee, zoals een mix-detailpagina", () => {
    const extra = { "/mixen/published/red-light-m-edm-128bpm-20260615": "Tech House Mix · Red Light (m) · Vol. 1" };
    expect(breadcrumbTrail("/mixen/published/red-light-m-edm-128bpm-20260615", extra).map((c) => c.label)).toEqual([
      "Home",
      "Mixen",
      "Published",
      "Tech House Mix · Red Light (m) · Vol. 1",
    ]);
  });

  it("geeft elke pagina met een naam een pad dat op die pagina eindigt", () => {
    for (const [href, label] of Object.entries(PAGE_TITLES)) {
      expect(breadcrumbTrail(href).at(-1)).toEqual({ href, label });
    }
  });
});

describe("pageTitle", () => {
  it("weigert een route zonder naam", () => {
    expect(() => pageTitle("/spotify/bestaat-niet")).toThrow(/src\/lib\/pages\.ts/);
  });
});
