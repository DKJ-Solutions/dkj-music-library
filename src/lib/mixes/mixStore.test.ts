// mixStore: de leeslaag over src/data/mixes/. De tests lezen NOOIT de echte map -- MIXES_DATA_DIR
// wordt per test overridden naar een tijdelijk pad onder de OS-temp, dat na afloop wordt opgeruimd
// (zelfde recept als spotify/snapshotStore.test.ts).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { getMixDirCandidates, mixSlugOf, normalizeMix, readMixes } from "./mixStore";
import type { RawMixEntry } from "./types";

let tempDir: string;
let originalEnv: string | undefined;

function writeMixFile(name: string, entries: unknown): void {
  fs.writeFileSync(path.join(tempDir, name), JSON.stringify(entries), "utf8");
}

const FULL_ENTRY: RawMixEntry = {
  id: "20260615",
  title: "Tech House · Red Light (m) Mix · Vol. 6",
  genre: "House",
  subgenre: "Tech House",
  color: "Red",
  power: "Light",
  frequency: "(m)",
  volume: "Vol. 6",
  date: "2026-06-15",
  audioSrc:
    "https://pub-4fa4c2c1f9a644c4878cba29a7926443.r2.dev/red/Red_Light_m_EDM_128BPM_20260615_Audio_V1%20(Vol.%206).mp3",
  ignore: false,
  top_artists: ["Tiësto", "MEDUZA"],
  tracklist: [
    { time: "00:00:59", track: "Anabel Englund & Kamino - Belong to Me" },
    { time: "00:03:00", track: "Roddy Lima - Shadows" },
  ],
};

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "life-hub-mixes-"));
  originalEnv = process.env.MIXES_DATA_DIR;
  process.env.MIXES_DATA_DIR = tempDir;
});

afterEach(() => {
  if (originalEnv === undefined) delete process.env.MIXES_DATA_DIR;
  else process.env.MIXES_DATA_DIR = originalEnv;
  fs.rmSync(tempDir, { recursive: true, force: true });
  vi.restoreAllMocks();
});

// Dave houdt sinds 2026-07-25 één source of truth: de mix-JSON's wonen in de djcylow-react-repo, de
// website waar ze bij horen. De kopie in deze repo (src/data/mixes/) is weg. Deze keten is dus geen
// detail maar de reden dat de mix-kolommen nog gevuld raken -- breekt de orde stil, dan valt de hele
// koppeling leeg zonder foutmelding.
describe("getMixDirCandidates", () => {
  const cwd = path.join("C:", "repos", "life-hub");

  it("zoekt zonder override eerst lokaal, dan in de zusterrepo djcylow-react", () => {
    expect(getMixDirCandidates(cwd, undefined)).toEqual([
      path.join(cwd, "src", "data", "mixes"),
      path.join(cwd, "..", "djcylow-react", "src", "data", "mixes"),
    ]);
  });

  it("laat een expliciete override de énige kandidaat zijn -- een verkeerd pad hoort op te vallen", () => {
    // Absoluut op elk OS: "D:" is alleen op Windows absoluut en werd op de Linux-CI relatief opgelost.
    const override = path.resolve(path.sep, "elders", "mixes");
    expect(getMixDirCandidates(cwd, override)).toEqual([override]);
  });

  it("maakt een relatieve override absoluut", () => {
    expect(getMixDirCandidates(cwd, "./tmp/mixes")).toEqual([path.resolve("./tmp/mixes")]);
  });
});

describe("normalizeMix", () => {
  it("zet een volledige entry om naar de app-dimensies", () => {
    const mix = normalizeMix(FULL_ENTRY, "light-red.json");

    expect(mix).toMatchObject({
      id: "20260615",
      file: "light-red.json",
      genre: "House",
      subgenre: "Tech House",
      color: "Red",
      density: "Light", // `power` in de JSON
      gender: "m", // `frequency` "(m)" in de JSON
      volume: 6,
      date: "2026-06-15",
      bpm: 128, // uit de audioSrc-bestandsnaam, niet uit een eigen veld
    });
    expect(mix.tracks).toEqual([
      "Anabel Englund & Kamino - Belong to Me",
      "Roddy Lima - Shadows",
    ]);
    expect(mix.topArtists).toEqual(["Tiësto", "MEDUZA"]);
  });

  it("accepteert de legacy kleine letters voor color/power", () => {
    const mix = normalizeMix({ ...FULL_ENTRY, color: "blue", power: "full" }, "full-blue.json");
    expect(mix.color).toBe("Blue");
    expect(mix.density).toBe("Full");
  });

  it("levert null i.p.v. een fout voor lege/ontbrekende legacy-velden", () => {
    const mix = normalizeMix({ id: "x", color: "", power: "", frequency: "", volume: "", date: "" }, "full-blue.json");

    expect(mix.color).toBeNull();
    expect(mix.density).toBeNull();
    expect(mix.gender).toBeNull();
    expect(mix.volume).toBeNull();
    expect(mix.date).toBeNull();
    expect(mix.bpm).toBeNull();
    expect(mix.tracks).toEqual([]);
    expect(mix.topArtists).toEqual([]);
  });

  it("valt voor de BPM terug op de permalink als er geen audioSrc is", () => {
    const mix = normalizeMix(
      { ...FULL_ENTRY, audioSrc: undefined, permalink: "luister/mix/red-light-m-EDM-176BPM-20260615.html" },
      "full-red.json"
    );
    expect(mix.bpm).toBe(176);
  });

  // Dave (2026-07-25): "DNB = ALTIJD 176BPM". Een deel van de bestandsnamen draagt dat token op de plek
  // van het BPM-getal; op de bron van die datum 21 van de 77 publieke mixen, alle 21 Drum & Bass.
  describe("het DNB-token als 176 BPM", () => {
    it("leest DNB uit de audioSrc (waar de underscore geen woordgrens vormt)", () => {
      const mix = normalizeMix(
        { ...FULL_ENTRY, audioSrc: "https://x.r2.dev/blue/Blue_Full_f_EDM_DNB_20240408_Audio_V1.mp3" },
        "full-blue.json"
      );
      expect(mix.bpm).toBe(176);
    });

    it("leest DNB ook uit de permalink-variant met streepjes", () => {
      const mix = normalizeMix(
        { ...FULL_ENTRY, audioSrc: undefined, permalink: "luister/mix/blue-full-f-EDM-DNB-20240408.html" },
        "full-blue.json"
      );
      expect(mix.bpm).toBe(176);
    });

    it("laat een expliciet BPM-getal vóórgaan op het token", () => {
      const mix = normalizeMix(
        { ...FULL_ENTRY, audioSrc: "https://x.r2.dev/blue/Blue_Full_f_DNB_128BPM_20240408.mp3" },
        "full-blue.json"
      );
      expect(mix.bpm).toBe(128);
    });

    it("trapt niet in 'dnb' als deel van een langer woord", () => {
      const mix = normalizeMix(
        { ...FULL_ENTRY, audioSrc: "https://x.r2.dev/blue/Blue_Full_f_LIQUIDNBASS_20240408.mp3" },
        "full-blue.json"
      );
      expect(mix.bpm).toBeNull();
    });
  });

  it("herkent een onbekende kleurnaam niet als kleur", () => {
    expect(normalizeMix({ ...FULL_ENTRY, color: "Turquoise" }, "x.json").color).toBeNull();
  });
});

describe("readMixes", () => {
  it("leest alle bestanden en laat `ignore: true`-entries weg", () => {
    writeMixFile("light-red.json", [FULL_ENTRY, { ...FULL_ENTRY, id: "Red_light_preview", ignore: true }]);
    writeMixFile("full-blue.json", [{ ...FULL_ENTRY, id: "20240408", color: "Blue", power: "Full" }]);

    const mixes = readMixes();

    expect(mixes.map((m) => m.id)).toEqual(["20240408", "20260615"]); // bestandsnaam-orde: full-blue, light-red
    expect(mixes.map((m) => m.file)).toEqual(["full-blue.json", "light-red.json"]);
  });

  it("levert een lege lijst als de map niet bestaat -- geen bron is geen fout", () => {
    process.env.MIXES_DATA_DIR = path.join(tempDir, "bestaat-niet");
    expect(readMixes()).toEqual([]);
  });

  it("negeert niet-JSON-bestanden", () => {
    writeMixFile("light-red.json", [FULL_ENTRY]);
    fs.writeFileSync(path.join(tempDir, "README.md"), "# spec", "utf8");

    expect(readMixes()).toHaveLength(1);
  });

  it("slaat een kapot bestand over en houdt de rest overeind", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    fs.writeFileSync(path.join(tempDir, "full-blue.json"), "{ dit is geen json", "utf8");
    writeMixFile("light-red.json", [FULL_ENTRY]);

    const mixes = readMixes();

    expect(mixes.map((m) => m.id)).toEqual(["20260615"]);
    expect(console.warn).toHaveBeenCalled();
  });

  it("slaat een bestand over dat geen array bevat", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    writeMixFile("full-blue.json", { id: "geen-array" });
    writeMixFile("light-red.json", [FULL_ENTRY]);

    expect(readMixes().map((m) => m.id)).toEqual(["20260615"]);
  });
});

describe("mixSlugOf", () => {
  it("leidt de slug af zoals de website: bestandsnaam zonder .html, in kleine letters", () => {
    expect(mixSlugOf("luister/mix/red-light-m-EDM-128BPM-20260615.html")).toBe("red-light-m-edm-128bpm-20260615");
    expect(mixSlugOf("")).toBeNull();
    expect(mixSlugOf(undefined)).toBeNull();
  });
});
