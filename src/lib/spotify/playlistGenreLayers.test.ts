// De drie genre-lagen per playlist + de keuzelijsten voor de filter-selects. Pure functies.
import { describe, expect, it } from "vitest";
import {
  collectGenreLayerOptions,
  playlistFamily,
  playlistGenre,
  playlistSubgenre,
} from "./playlistGenreLayers";
import type { EnrichedPlaylist } from "./enrichedPlaylists";
import type { ParsedPlaylistName } from "./parsePlaylistName";
import type { PlaylistMixInfo } from "@/lib/mixes/playlistMixInfo";

function makeParsed(over: Partial<ParsedPlaylistName> = {}): ParsedPlaylistName {
  return {
    typeLabel: null,
    color: null,
    density: null,
    gender: null,
    bpm: null,
    volume: null,
    contextTag: null,
    matched: false,
    ddSpeed: null,
    ddWord: null,
    ddLoudness: null,
    ddCode: null,
    phaseCode: null,
    feestzaalYear: null,
    ...over,
  };
}

function makePlaylist(over: Partial<EnrichedPlaylist> = {}): EnrichedPlaylist {
  return {
    id: "p1",
    name: "Een playlist",
    uri: "spotify:playlist:p1",
    collaborative: false,
    public: true,
    snapshotId: "snap-v1",
    owner: { id: "eigen-account-id", displayName: "Dave" },
    images: [],
    description: null,
    trackCount: 10,
    ownerBucket: "dave",
    parsed: makeParsed(),
    emotion: null,
    sortBucket: "gesorteerd",
    done: false,
    world: "mmc",
    autoWorld: "mmc",
    worldIsOverridden: false,
    mmcBpm: null,
    mmcBpmIsOverridden: false,
    ...over,
  };
}

const mix = (over: Partial<PlaylistMixInfo> = {}): PlaylistMixInfo => ({
  mixId: "20260303",
  matchedBy: "tracklist",
  family: "EDM",
  genre: "House",
  subgenre: "Tech House",
  descriptionState: "missing",
  descriptionDiffs: [],
  // Deze tests gaan over de genre-lagen, niet over de playlistnaam: "in-sync" zegt dat er aan de naam
  // niets te doen valt, en geen enkele functie hier leest deze drie velden.
  titleState: "in-sync",
  titleTarget: null,
  titleBlocker: null,
  ...over,
});

describe("playlistFamily", () => {
  it("neemt de familie van de gekoppelde mix als die er is", () => {
    expect(playlistFamily(makePlaylist(), mix({ family: "ALT" }))).toBe("ALT");
  });

  it("valt zonder mix terug op de naamgevingsfamilie uit de playlistnaam", () => {
    expect(playlistFamily(makePlaylist({ parsed: makeParsed({ typeLabel: "House Mix" }) }), null)).toBe("EDM");
    expect(playlistFamily(makePlaylist({ parsed: makeParsed({ typeLabel: "Classic Pop" }) }), null)).toBe("POP");
  });

  it("is null als er geen mix is en de naam niets prijsgeeft over de muzieksoort", () => {
    expect(playlistFamily(makePlaylist({ parsed: makeParsed({ typeLabel: "OST" }) }), null)).toBeNull();
    expect(playlistFamily(makePlaylist(), null)).toBeNull();
  });
});

describe("playlistGenre / playlistSubgenre", () => {
  it("komen uitsluitend uit de gekoppelde mix", () => {
    expect(playlistGenre(mix())).toBe("House");
    expect(playlistSubgenre(mix())).toBe("Tech House");
    expect(playlistGenre(null)).toBeNull();
    expect(playlistSubgenre(null)).toBeNull();
  });
});

describe("collectGenreLayerOptions", () => {
  it("levert per laag de voorkomende waarden, alfabetisch en zonder dubbelingen", () => {
    const playlists = [
      makePlaylist({ id: "a" }),
      makePlaylist({ id: "b" }),
      makePlaylist({ id: "c" }),
      makePlaylist({ id: "d" }),
    ];
    const opties = collectGenreLayerOptions(playlists, {
      a: mix({ genre: "Techno", subgenre: "Melodic Techno" }),
      b: mix({ genre: "House", subgenre: "Tech House" }),
      c: mix({ genre: "House", subgenre: "Deep House" }), // House dubbel -> één keer in de lijst
      d: mix({ genre: "Drum & Bass", subgenre: "Liquid Drum & Bass", family: "ALT" }),
    });

    expect(opties.families).toEqual(["ALT", "EDM"]);
    expect(opties.genres).toEqual(["Drum & Bass", "House", "Techno"]);
    expect(opties.subgenres).toEqual(["Deep House", "Liquid Drum & Bass", "Melodic Techno", "Tech House"]);
  });

  it("biedt geen keuze aan die nul rijen zou opleveren -- alleen wat in de data zit", () => {
    const opties = collectGenreLayerOptions([makePlaylist({ id: "a" })], { a: mix() });
    // ROCK en POP komen in geen enkele mix voor en horen dus niet in de select.
    expect(opties.families).toEqual(["EDM"]);
  });

  it("neemt de terugval-familie mee van playlists zonder mix", () => {
    const playlists = [
      makePlaylist({ id: "a", parsed: makeParsed({ typeLabel: "Classic Pop" }) }),
      makePlaylist({ id: "b", parsed: makeParsed({ typeLabel: "ALT" }) }),
    ];
    expect(collectGenreLayerOptions(playlists, {}).families).toEqual(["ALT", "POP"]);
  });

  it("levert lege lijsten zonder mix-info en zonder herkende namen", () => {
    expect(collectGenreLayerOptions([makePlaylist()], {})).toEqual({
      families: [],
      genres: [],
      subgenres: [],
    });
  });
});
