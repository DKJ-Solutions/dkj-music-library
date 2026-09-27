// Leeslaag voor de mix-JSON's van de DJ Cylow-website (`[power]-[color].json`). READ-ONLY: de hub
// leest deze bron alleen, precies zoals hij `Brains/` alleen leest -- Dave beheert de bestanden zelf
// (de veldspecificatie staat als README.md naast de JSON's).
//
// WAAR DIE BRON WOONT (Dave, 2026-07-25 -- één source of truth): in de **djcylow-react-repo**, de
// website waar deze data bij hoort: `../djcylow-react/src/data/mixes/`. Er stond eerst een tweede
// kopie in deze repo (`src/data/mixes/`, buiten git via de .gitignore-regel `data/`); die is
// weggehaald juist om die dubbeling kwijt te raken. Vandaar de zoekorde hieronder: eerst een
// expliciete override, dan een lokale map als die er ooit weer is, en anders de zusterrepo naast
// deze -- beide repo's staan onder .../GitHub/DaveKJohn/, dus een relatief pad volstaat en er hoeft
// geen absoluut pad met een gebruikersnaam in de code.
//
// Vindt geen van de kandidaten iets (verse kloon zonder zusterrepo, CI-runner), dan levert dit
// bestand een lege lijst i.p.v. een fout -- dezelfde "geen bron = leeg, niet stuk"-lijn als
// snapshotStore.ts. De mix-kolommen in de playlist-tabel blijven dan simpelweg leeg.
//
// SERVER-ONLY: gebruikt Node's `fs`, mag dus nooit vanuit een 'use client'-bestand geïmporteerd
// worden. De normalisatie zelf (`normalizeMix`) is een pure functie en wél vrij te importeren/testen.
import fs from "fs";
import path from "path";
import { PLUTCHIK_COLORS, type PlutchikColor } from "@/lib/spotify/plutchikColors";
import { normalizeSpotifyId } from "./spotifyId";
import { normalizeSpotifyTitle } from "./spotifyTitle";
import type { Mix, RawMixEntry } from "./types";

/** De kandidaat-mappen, in zoekorde -- puur zodat de keten los van de schijf te testen is.
 *
 *  `cwd` is de repo-root van de hub (Next.js draait daar), `env` de waarde van MIXES_DATA_DIR. Een
 *  expliciete override wint altijd en is dan de énige kandidaat: staat die verkeerd, dan hoort dat
 *  op te vallen, niet stil te worden opgevangen door een terugval. */
export function getMixDirCandidates(cwd: string, env: string | undefined): string[] {
  if (env) return [path.resolve(env)];
  return [
    path.join(cwd, "src", "data", "mixes"),
    path.join(cwd, "..", "djcylow-react", "src", "data", "mixes"),
  ];
}

/** De eerste kandidaat die bestaat, of null als geen enkele bron te vinden is. */
function getMixDir(): string | null {
  const candidates = getMixDirCandidates(process.cwd(), process.env.MIXES_DATA_DIR);
  return candidates.find((dir) => fs.existsSync(dir)) ?? null;
}

function toColor(value: string | undefined): PlutchikColor | null {
  if (!value) return null;
  const needle = value.trim().toLowerCase();
  return PLUTCHIK_COLORS.find((c) => c.toLowerCase() === needle) ?? null;
}

function toDensity(value: string | undefined): "Full" | "Light" | null {
  const needle = (value ?? "").trim().toLowerCase();
  if (needle === "full") return "Full";
  if (needle === "light") return "Light";
  return null;
}

function toGender(value: string | undefined): "f" | "m" | null {
  // De JSON schrijft "(f)"/"(m)"; legacy-entries soms zonder haakjes.
  const hit = (value ?? "").match(/([fm])/i);
  return hit ? (hit[1].toLowerCase() as "f" | "m") : null;
}

function toVolume(value: string | undefined): number | null {
  const hit = (value ?? "").match(/(\d+)/);
  return hit ? Number(hit[1]) : null;
}

// De échte BPM staat niet in een eigen veld maar in de audio-bestandsnaam (conventie
// "[Color]_[Power]_[f|m]_[Genre]_[BPM]BPM_[YYYYMMDD]_...", zie de README naast de mix-JSON's). De
// legacy `permalink` draagt hetzelfde fragment en dient als terugval.
//
// Een deel van de namen draagt géén BPM-getal maar het token `DNB` op die plek
// ("Blue_Full_f_EDM_DNB_20240408_..."). Dave heeft vastgesteld (2026-07-25): **DNB is altijd 176 BPM**.
// Dat is dus geen gok maar dezelfde harde regel als het getal zelf -- vandaar dat het hier thuishoort en
// niet in een aparte "geraden BPM". Op de bron van 25 juli 2026 gaat het om 21 van de 77 publieke mixen,
// alle 21 met genre "Drum & Bass"; daarmee heeft élke publieke mix een echte BPM.
const DNB_BPM = 176;

// Let op de grenzen: `\bDNB\b` werkt hier NIET, want in `EDM_DNB_2024` is de underscore zelf een
// word-teken en ontstaat er geen woordgrens. De audioSrc schrijft `_DNB_`, de permalink `-DNB-`, dus
// grenzen we op "geen letter" -- dat dekt beide.
const DNB_TOKEN = /(?:^|[^A-Za-z])dnb(?:[^A-Za-z]|$)/i;

function toBpm(entry: RawMixEntry): number | null {
  const bron = `${entry.audioSrc ?? ""} ${entry.permalink ?? ""}`;
  const hit = bron.match(/(\d{2,3})\s*BPM/i);
  if (hit) return Number(hit[1]);
  return DNB_TOKEN.test(bron) ? DNB_BPM : null;
}

/** De slug van de mixpagina, zoals de website hem uit `permalink` afleidt (mixSlug in djcylow-react):
 *  `luister/mix/red-light-m-EDM-128BPM-20260615.html` -> `red-light-m-edm-128bpm-20260615`. */
export function mixSlugOf(permalink: string | undefined): string | null {
  const file = (permalink ?? "").split("/").pop() ?? "";
  return file.split(".html")[0].toLowerCase().trim() || null;
}

/** Pure normalisatie van één JSON-entry naar de app-vorm. Ontbrekende/legacy-velden worden `null`
 *  i.p.v. een fout: de bestanden dragen bewust nog oude entries (zie "Known Inconsistencies" in
 *  src/data/mixes/README.md), en die mogen de hub niet laten omvallen. */
export function normalizeMix(entry: RawMixEntry, file: string): Mix {
  return {
    id: entry.id ?? "",
    file,
    spotifyId: normalizeSpotifyId(entry.id_spotify),
    title: entry.title ?? "",
    spotifyTitle: normalizeSpotifyTitle(entry.title_spotify),
    slug: mixSlugOf(entry.permalink),
    genre: entry.genre?.trim() || null,
    subgenre: entry.subgenre?.trim() || null,
    color: toColor(entry.color),
    density: toDensity(entry.power),
    gender: toGender(entry.frequency),
    volume: toVolume(entry.volume),
    date: entry.date?.trim() || null,
    bpm: toBpm(entry),
    topArtists: Array.isArray(entry.top_artists) ? entry.top_artists.filter(Boolean) : [],
    tracks: Array.isArray(entry.tracklist) ? entry.tracklist.map((t) => t?.track ?? "").filter(Boolean) : [],
  };
}

/** Alle PUBLIEKE mixen uit alle `[power]-[color].json`-bestanden van de eerste vindbare bron (zie
 *  getMixDirCandidates), nieuwste eerst per bestand (de bestanden zijn zelf al zo gesorteerd).
 *  Entries met `ignore: true` (preview-stubs, concepten) vallen weg -- die staan niet op de site en
 *  horen dus ook niet in de koppeling. */
export function readMixes(): Mix[] {
  const dir = getMixDir();
  if (dir === null) return [];

  const mixes: Mix[] = [];
  for (const file of fs.readdirSync(dir).filter((n) => n.toLowerCase().endsWith(".json")).sort()) {
    try {
      const parsed: unknown = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
      if (!Array.isArray(parsed)) {
        console.warn(`[mixes/mixStore] ${file} bevat geen array, overgeslagen`);
        continue;
      }
      for (const entry of parsed as RawMixEntry[]) {
        if (entry?.ignore) continue;
        mixes.push(normalizeMix(entry, file));
      }
    } catch (err) {
      // Eén kapot bestand mag de rest niet meesleuren -- Dave bewerkt deze JSON's met de hand.
      console.warn(`[mixes/mixStore] kon ${file} niet lezen, overgeslagen:`, err);
    }
  }
  return mixes;
}
