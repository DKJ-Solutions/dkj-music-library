// compareLocal (#144): de Spotify-kant naast de lokale bestanden, gekoppeld op dkj_file.
import { describe, expect, it } from "vitest";
import { compareLocal, matchKey, type CompareTrack } from "./compareLocal";
import type { LocalFile } from "./scanMusicFolder";

const house = { id: "p1", name: "House" };
const disco = { id: "p2", name: "Disco" };

function file(name: string, dir = "Muziek"): LocalFile {
  return { name, relativePath: `${dir}/${name}.mp3` };
}

describe("matchKey", () => {
  it("negeert hoofdletters, dubbele witruimte en de Unicode-vorm", () => {
    expect(matchKey("  Abel Ramos -  Higher ")).toBe(matchKey("abel ramos - higher"));
    expect(matchKey("Beyoncé")).toBe(matchKey("Beyoncé"));
  });
});

describe("compareLocal", () => {
  it("splitst in te downloaden per playlist, alleen lokaal en gekoppeld", () => {
    const tracks: CompareTrack[] = [
      { id: "T1", file: "Abel Ramos - Higher", playlists: [house] },
      { id: "T2", file: "Jaded - Can You Feel It", playlists: [house, disco] },
      { id: "T3", file: "Chic - Le Freak", playlists: [disco] },
    ];
    const files = [file("abel ramos - higher"), file("Iets Anders")];
    const result = compareLocal(tracks, files);
    expect(result.matchedCount).toBe(1);
    expect(result.toDownloadCount).toBe(2);
    expect(result.toDownload).toEqual([
      { id: "p1", name: "House", files: ["Jaded - Can You Feel It"] },
      { id: "p2", name: "Disco", files: ["Chic - Le Freak", "Jaded - Can You Feel It"] },
    ]);
    expect(result.localOnly).toEqual([file("Iets Anders")]);
  });

  it("slaat tracks zonder playlist over en telt tracks zonder dkj_file apart", () => {
    const tracks: CompareTrack[] = [
      { id: "T1", file: "Los Nummer", playlists: [] },
      { id: "T2", file: null, playlists: [house] },
      { id: "T3", file: "  ", playlists: [house] },
    ];
    const result = compareLocal(tracks, [file("Los Nummer")]);
    expect(result).toEqual({
      toDownload: [],
      toDownloadCount: 0,
      localOnly: [file("Los Nummer")],
      matchedCount: 0,
      withoutFileName: 2,
    });
  });

  it("koppelt twee kopieën van hetzelfde bestand allebei aan de track", () => {
    const tracks: CompareTrack[] = [{ id: "T1", file: "Track", playlists: [house] }];
    const result = compareLocal(tracks, [file("Track", "A"), file("Track", "B")]);
    expect(result.matchedCount).toBe(1);
    expect(result.localOnly).toEqual([]);
  });
});
