// compareLocal (#144, #151): de Spotify-kant naast de lokale bestanden: eigen koppeling, dkj_file, voorstel.
import { describe, expect, it } from "vitest";
import { compareLocal, fuzzyWords, matchKey, similarity, type CompareTrack } from "./compareLocal";
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
      unlinked: [],
      localOnly: [file("Los Nummer")],
      matchedCount: 0,
      ownLinks: [],
      suggestions: [],
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

describe("fuzzyWords en similarity", () => {
  it("vouwt ft./featuring naar feat en laat accenten, leestekens en verbindingswoorden weg", () => {
    expect(fuzzyWords("Beyoncé ft. Jay-Z & X - Crazy (Remix)")).toEqual(new Set(["beyonce", "feat", "jay", "z", "crazy", "remix"]));
    expect(similarity(fuzzyWords("A feat. B - Song"), fuzzyWords("A ft B - Song"))).toBe(1);
    expect(similarity(new Set(), new Set(["a"]))).toBe(0);
  });
});

describe("compareLocal: eigen koppeling en voorstellen (#151)", () => {
  it("koppelt via dkj_local_file, ook als de naam afwijkt, en zet de track bij ownLinks", () => {
    const tracks: CompareTrack[] = [{ id: "T1", file: "Abel Ramos - Higher", localFile: String.raw`Muziek\HIGHER final.mp3`, playlists: [house] }];
    const result = compareLocal(tracks, [file("Higher final")]);
    expect(result.matchedCount).toBe(1);
    expect(result.ownLinks).toEqual([{ trackId: "T1", file: "Abel Ramos - Higher", relativePath: "Muziek/Higher final.mp3" }]);
    expect(result.localOnly).toEqual([]);
    expect(result.toDownloadCount).toBe(0);
  });

  it("valt terug op dkj_file als het gekoppelde bestand er niet meer staat", () => {
    const tracks: CompareTrack[] = [{ id: "T1", file: "Track", localFile: "Weg/Oud.mp3", playlists: [house] }];
    const result = compareLocal(tracks, [file("Track")]);
    expect(result.matchedCount).toBe(1);
    expect(result.ownLinks).toEqual([]);
  });

  it("stelt een anders gespeld bestand voor en haalt beide uit de lijsten", () => {
    const tracks: CompareTrack[] = [
      { id: "T1", file: "Jaded - Can You Feel It (feat. Eva)", playlists: [house] },
      { id: "T2", file: "Chic - Le Freak", playlists: [disco] },
    ];
    const files = [file("Jaded ft. Eva - Can You Feel It"), file("Iets Heel Anders")];
    const result = compareLocal(tracks, files);
    expect(result.suggestions).toEqual([
      { trackId: "T1", file: "Jaded - Can You Feel It (feat. Eva)", suggestion: files[0], score: 1 },
    ]);
    expect(result.toDownloadCount).toBe(1);
    expect(result.unlinked).toEqual([{ trackId: "T2", file: "Chic - Le Freak" }]);
    expect(result.toDownload).toEqual([{ id: "p2", name: "Disco", files: ["Chic - Le Freak"] }]);
    expect(result.localOnly).toEqual([file("Iets Heel Anders")]);
    expect(result.matchedCount).toBe(0);
  });

  it("stelt niets voor onder de drempel", () => {
    const tracks: CompareTrack[] = [{ id: "T1", file: "Abel Ramos - Higher", playlists: [house] }];
    const result = compareLocal(tracks, [file("Higher")]);
    expect(result.suggestions).toEqual([]);
    expect(result.toDownloadCount).toBe(1);
  });

  it("geeft elk bestand aan één track: het sterkste paar wint", () => {
    const tracks: CompareTrack[] = [
      { id: "T1", file: "Artist - Song (Radio Edit)", playlists: [house] },
      { id: "T2", file: "Artist - Song (Club Mix)", playlists: [house] },
    ];
    const result = compareLocal(tracks, [file("Artist - Song (Radio Edit) [clean]")]);
    expect(result.suggestions.map((s) => s.trackId)).toEqual(["T1"]);
    expect(result.unlinked.map((t) => t.trackId)).toEqual(["T2"]);
  });

  it("stelt geen bestand voor dat al via dkj_file bij een track hoort", () => {
    const tracks: CompareTrack[] = [
      { id: "T1", file: "Artist - Song", playlists: [house] },
      { id: "T2", file: "Artist - Song (Edit)", playlists: [house] },
    ];
    const result = compareLocal(tracks, [file("Artist - Song")]);
    expect(result.matchedCount).toBe(1);
    expect(result.suggestions).toEqual([]);
  });
});
