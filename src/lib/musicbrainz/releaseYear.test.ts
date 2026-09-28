import { describe, expect, it } from "vitest";
import {
  buildRecordingQuery,
  buildSearchUrl,
  chooseRelease,
  escapeLucene,
  searchTitleOf,
  type MusicBrainzSearchResponse,
} from "./releaseYear";

describe("escapeLucene", () => {
  it("escaped elk speciaal Lucene-teken met een backslash", () => {
    expect(escapeLucene('Song (Live) - "Radio Edit" [2011]')).toBe('Song \\(Live\\) \\- \\"Radio Edit\\" \\[2011\\]');
    expect(escapeLucene("AC/DC")).toBe("AC\\/DC");
    expect(escapeLucene("Wh?t's Up*")).toBe("Wh\\?t's Up\\*");
  });

  it("laat gewone tekst ongewijzigd", () => {
    expect(escapeLucene("Clocks")).toBe("Clocks");
  });
});

describe("searchTitleOf", () => {
  it("laat een remaster-achtervoegsel weg, met of zonder jaartal", () => {
    expect(searchTitleOf("Yellow - Remastered 2011")).toBe("Yellow");
    expect(searchTitleOf("Yellow - 2011 Remaster")).toBe("Yellow");
    expect(searchTitleOf("Yellow (Remastered)")).toBe("Yellow");
    expect(searchTitleOf("Yellow (2011 Remastered Version)")).toBe("Yellow");
  });

  it("laat een demo-achtervoegsel weg", () => {
    expect(searchTitleOf("Two Weeks - Demo")).toBe("Two Weeks");
    expect(searchTitleOf("Two Weeks (Demo)")).toBe("Two Weeks");
    expect(searchTitleOf("Two Weeks (Demo Version)")).toBe("Two Weeks");
  });

  it("laat een radio-edit- of single-achtervoegsel weg", () => {
    expect(searchTitleOf("Umbrella - Radio Edit")).toBe("Umbrella");
    expect(searchTitleOf("Umbrella (Radio Edit)")).toBe("Umbrella");
    expect(searchTitleOf("Jump - Single Version")).toBe("Jump");
    expect(searchTitleOf("Jump (Radio Version)")).toBe("Jump");
    expect(searchTitleOf("Yellow - Single Edit")).toBe("Yellow");
    expect(searchTitleOf("Yellow - Album Version")).toBe("Yellow");
    expect(searchTitleOf("Yellow - Edit")).toBe("Yellow");
  });

  it("hergebruikt liveTitle.ts voor een live-achtervoegsel", () => {
    expect(searchTitleOf("Clocks - Live")).toBe("Clocks");
    expect(searchTitleOf("Alive (Live)")).toBe("Alive");
  });

  it("laat een titel zonder achtervoegsel ongewijzigd, ook als hij toevallig op een jaartal lijkt", () => {
    expect(searchTitleOf("Radio Edit")).toBe("Radio Edit");
    expect(searchTitleOf("1999")).toBe("1999");
  });
});

describe("buildRecordingQuery / buildSearchUrl", () => {
  it("bouwt de Lucene-query op titel + hoofdartiest, allebei ge-escaped en met de achtervoegsels eraf", () => {
    expect(buildRecordingQuery("Yellow - Remastered 2011", 'Guns N\' Roses')).toBe(
      'recording:"Yellow" AND artist:"Guns N\' Roses"'
    );
  });

  it("bouwt de volledige zoek-URL met fmt=json en een limit", () => {
    const url = new URL(buildSearchUrl("Clocks", "Coldplay"));
    expect(url.origin + url.pathname).toBe("https://musicbrainz.org/ws/2/recording");
    expect(url.searchParams.get("query")).toBe('recording:"Clocks" AND artist:"Coldplay"');
    expect(url.searchParams.get("fmt")).toBe("json");
    expect(url.searchParams.get("limit")).toBe("100");
  });
});

describe("chooseRelease", () => {
  const response = (
    recordings: MusicBrainzSearchResponse["recordings"]
  ): MusicBrainzSearchResponse => ({ recordings });

  it("negeert een kandidaat met een lage score", () => {
    const result = chooseRelease(
      response([
        { id: "r1", score: 60, "first-release-date": "1966", "artist-credit": [{ name: "The Monkees" }] },
      ]),
      "The Monkees"
    );
    expect(result).toBeNull();
  });

  it("negeert een kandidaat van een andere artiest", () => {
    const result = chooseRelease(
      response([
        { id: "r1", score: 100, "first-release-date": "1966", "artist-credit": [{ name: "The Wrong Band" }] },
      ]),
      "The Monkees"
    );
    expect(result).toBeNull();
  });

  it("negeert een kandidaat zonder first-release-date", () => {
    const result = chooseRelease(
      response([{ id: "r1", score: 100, "artist-credit": [{ name: "The Monkees" }] }]),
      "The Monkees"
    );
    expect(result).toBeNull();
  });

  it("kiest het VROEGSTE jaar over meerdere geldige kandidaten", () => {
    const result = chooseRelease(
      response([
        { id: "r1", score: 95, "first-release-date": "2008-01-01", "artist-credit": [{ name: "The Monkees" }] },
        { id: "r2", score: 100, "first-release-date": "1966-09-12", "artist-credit": [{ name: "The Monkees" }] },
        { id: "r3", score: 90, "first-release-date": "1975", "artist-credit": [{ name: "The Monkees" }] },
      ]),
      "The Monkees"
    );
    expect(result).toEqual({ year: 1966, recordingId: "r2" });
  });

  it("vergelijkt de artiest hoofdletter- en accentongevoelig, en telt een credit met méér dan één naam mee", () => {
    const result = chooseRelease(
      response([
        {
          id: "r1",
          score: 96,
          "first-release-date": "1997",
          "artist-credit": [{ name: "PROFF" }, { name: "Röyksopp" }],
        },
      ]),
      "royksopp"
    );
    expect(result).toEqual({ year: 1997, recordingId: "r1" });
  });

  it("gebruikt de naam van de geneste artist als die er is, en accepteert een score als tekst", () => {
    const result = chooseRelease(
      response([
        {
          id: "r1",
          score: "92", // score komt soms als tekst terug
          "first-release-date": "1966",
          "artist-credit": [{ name: "The Monkees", artist: { id: "a1", name: "The Monkees" } }],
        },
      ]),
      "The Monkees"
    );
    expect(result).toEqual({ year: 1966, recordingId: "r1" });
  });

  it("geeft null zonder recordings in de response", () => {
    expect(chooseRelease({}, "Iemand")).toBeNull();
  });
});
