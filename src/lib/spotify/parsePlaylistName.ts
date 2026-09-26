// Fase 4: de tokenizer-parser die een Spotify-playlistnaam ontleedt in zijn losse dimensies.
//
// BEWUSTE KEUZE (zie de opdracht): een TOKENIZER, geen starre "regex per familie". Dave's 375
// eigen playlist-namen (van de 386 totaal incl. gevolgde, niet-eigen playlists -- zie
// DAVE_SPOTIFY_USER_ID in enrichedPlaylists.ts) volgen 10 losjes verwante naamgevingsfamilies
// (House Mix, Drum & Bass (Mix), Top 100, Classic Pop, ALT, OST, EDM-emmer, Music Mood, D&D,
// Phase/Feestzaal), maar de
// TOKENVOLGORDE wisselt per familie/lijn (bv. "EDM 112BPM | Purple Music Mood Full (m)" vs.
// "Purple Music Mood Full (f) | EDM 112BPM"), spaties zijn soms dubbel/ontbrekend, en het
// kleur-emoji staat soms 1x, soms 2x in de naam. Een regex-per-familie zou voor elke
// volgorde-variant een eigen patroon nodig hebben; deze parser herkent en verwijdert losse
// tokens (kleur, dichtheid, geslacht, bpm, volume, D&D-code, Phase-code, ...) ONGEACHT hun
// positie in de string, en laat zien wat er overblijft.
//
// Elke playlist krijgt ALLE herkenbare dimensies als losse, schone velden terug -- fase 5 (de
// flexibele filter/groepeer-UI) filtert/groepeert vrij op elk van deze velden. Dit bestand bouwt
// geen UI.

import { PLUTCHIK_COLOR_EMOJI, PLUTCHIK_COLORS, type PlutchikColor } from "./plutchikColors";

// --- Het datamodel -----------------------------------------------------------------------------

export interface ParsedPlaylistName {
  /** Herkende naamgevingsfamilie, bv. "House Mix", "Top 100", "D&D" -- of null. */
  typeLabel: string | null;
  color: PlutchikColor | null;
  density: "Full" | "Light" | null;
  /** 'f'/'m' uit "(f)"/"(m)" in de naam -- of null als afwezig. */
  gender: "f" | "m" | null;
  bpm: number | null;
  /** Vol.-nummer, of 'X', of null als er geen Vol.-token is. Het token draagt de PRODUCTIESTATUS van
   *  de mix (Dave, 2026-07-24): `Vol. X` is een **werkbak** -- tracks verzameld, mix nog niet
   *  gemaakt, staat niet op de website -- en een `Vol. <cijfer>` betekent klaar én live. */
  volume: number | "X" | null;
  /** Vrije pipe-staart / restinformatie die niet in een van de andere velden past (artiest,
   *  gelegenheid, of -- bij een echte uitzondering zoals playlist 1 -- gewoon rommelige rest-tekst). */
  contextTag: string | null;
  /** Viel de naam in een herkend structureel patroon? True zodra er een typeLabel-familie
   *  herkend is, OF (ook zonder typeLabel-keyword) een kleur herkend is -- de kleur-gecodeerde
   *  compilaties (bv. "Red Full (m) | Delta Heavy") hebben geen los familie-woord maar zijn wel
   *  degelijk systematisch opgebouwd. Alleen namen zonder kleur EN zonder typeLabel-keyword
   *  (Dave's "~5 losse namen") krijgen matched=false. */
  matched: boolean;

  // --- D&D-familie: extra structuur, alleen gevuld als typeLabel === "D&D" -----------------
  // Losstaand open punt (bewust NIET opgelost, zie de opdracht): het 8ste emotie-slot heet in de
  // naam "MAGENTA" en de 7 andere woorden (GRIEF/PEACE/JOY/RELIEF/AWE/HOPE/TERROR) zijn Dave's
  // eigen Engelse D&D-vocabulaire -- NIET dezelfde als de NL Plutchik-emotienamen. `ddWord` is
  // dus een vrij label, geen koppeling naar `PlutchikColor`/`colorToEmotion`.
  ddSpeed: "Fast" | "Slow" | null;
  ddWord: string | null;
  ddLoudness: "Loud" | "Quiet" | null;
  /** De codeletter (bv. "1A", "5C") 1-op-1 overgenomen uit de naam -- NIET herberekend. */
  ddCode: string | null;

  // --- Phase/Feestzaal-familie: extra structuur, alleen gevuld als typeLabel === "Phase/Feestzaal" --
  phaseCode: string | null; // bv. "1", "1A", "2D"
  feestzaalYear: string | null; // bv. "2026"
}

// --- Kleur-emoji's: de HERKEN-patronen, afgeleid van de canonieke tabel in plutchikColors.ts.
//
// Bewust afgeleid en niet nog eens uitgeschreven: die tabel is sinds 2026-08-11 de bron van waarheid
// voor beide richtingen (herkennen hier, valideren in mixes/spotifyTitle.ts), en twee losse lijstjes
// zouden onvermijdelijk uiteenlopen.
//
// De enige bewerking is de variatieselector: ♦️ is U+2666 + U+FE0F, maar sommige bronnen laten die
// FE0F weg (♦). Die wordt hier dus optioneel gemaakt, zodat beide vormen als Magenta worden herkend.
// Voor de zes gekleurde cirkels en 🧊 verandert er niets -- die dragen geen FE0F. ----------------
// Als `new RegExp` en niet als literal: U+FE0F is een onzichtbaar teken, en een regex-literal met een
// onzichtbaar teken erin is niet te lezen en niet veilig te bewerken (een editor of een copy-paste kan
// hem zonder spoor weglaten).
const VARIATIE_SELECTOR = new RegExp("\\uFE0F", "g");

const COLOR_EMOJI_SOURCE: Record<PlutchikColor, string> = Object.fromEntries(
  PLUTCHIK_COLORS.map((c) => [c, PLUTCHIK_COLOR_EMOJI[c].replace(VARIATIE_SELECTOR, "\\uFE0F?")])
) as Record<PlutchikColor, string>;

// --- Naamgevingsfamilies (typeLabel), in prioriteitsvolgorde. Bij een naam die toevallig in
// meerdere families past (bv. playlist 1: "House Mix" én "Music Mood" in dezelfde naam) wint de
// eerste match in deze lijst. -------------------------------------------------------------------

interface TypeMatcher {
  label: string;
  test: (s: string) => boolean;
  strip: (s: string) => string;
}

const HOUSE_MIX: TypeMatcher = {
  label: "House Mix",
  test: (s) => /house\s*mix/i.test(s),
  strip: (s) => s.replace(/house\s*mix/gi, " "),
};

const DRUM_AND_BASS: TypeMatcher = {
  label: "Drum & Bass (Mix)",
  test: (s) => /drum\s*&\s*bass(\s*mix)?/i.test(s),
  strip: (s) => s.replace(/drum\s*&\s*bass(\s*mix)?/gi, " "),
};

const TOP_100: TypeMatcher = {
  label: "Top 100",
  test: (s) => /top\s*100/i.test(s),
  strip: (s) => s.replace(/top\s*100/gi, " "),
};

const CLASSIC_POP: TypeMatcher = {
  label: "Classic Pop",
  test: (s) => /classic\s*pop/i.test(s),
  strip: (s) => s.replace(/classic\s*pop/gi, " "),
};

const ALT: TypeMatcher = {
  label: "ALT",
  test: (s) => /\balt\b/i.test(s),
  strip: (s) => s.replace(/\balt\b/gi, " "),
};

const OST: TypeMatcher = {
  label: "OST",
  test: (s) => /\bost\b/i.test(s),
  strip: (s) => s.replace(/\bost\b/gi, " "),
};

// EDM-emmer: een kleur/dichtheid/geslacht-combinatie met een bpm-tier (112/128/176), met het
// woord "EDM" ergens naast de bpm-annotatie -- maar GEEN "Music Mood" (die heeft zijn eigen,
// exclusieve familie hieronder, ook al noemt de pipe-staart daar óók "EDM 112BPM").
const EDM_EMMER: TypeMatcher = {
  label: "EDM-emmer",
  test: (s) => /\bedm\b/i.test(s) && /\d{2,4}\s*bpm/i.test(s) && !/music\s*mood/i.test(s),
  strip: (s) => s.replace(/\bedm\b/gi, " "),
};

const MUSIC_MOOD: TypeMatcher = {
  label: "Music Mood",
  test: (s) => /music\s*mood/i.test(s),
  strip: (s) => s.replace(/music\s*mood/gi, " "),
};

const DND: TypeMatcher = {
  label: "D&D",
  test: (s) => /D&D/i.test(s),
  strip: (s) => s.replace(/D&D/gi, " "),
};

const PHASE_FEESTZAAL: TypeMatcher = {
  label: "Phase/Feestzaal",
  test: (s) => /\bfeestzaal\b/i.test(s),
  strip: (s) => s.replace(/\bfeestzaal\b/gi, " "),
};

const TYPE_MATCHERS: TypeMatcher[] = [
  HOUSE_MIX,
  DRUM_AND_BASS,
  TOP_100,
  CLASSIC_POP,
  ALT,
  OST,
  EDM_EMMER,
  MUSIC_MOOD,
  DND,
  PHASE_FEESTZAAL,
];

/** De 10 herkende typeLabel-families, voor referentie vanuit fase 5 (bv. een vaste filterlijst). */
export const KNOWN_TYPE_LABELS: readonly string[] = TYPE_MATCHERS.map((m) => m.label);

// --- De parser -----------------------------------------------------------------------------

export function parsePlaylistName(rawName: string): ParsedPlaylistName {
  let working = rawName;

  let typeLabel: string | null = null;
  let ddSpeed: "Fast" | "Slow" | null = null;
  let ddWord: string | null = null;
  let ddLoudness: "Loud" | "Quiet" | null = null;
  let ddCode: string | null = null;
  let phaseCode: string | null = null;
  let feestzaalYear: string | null = null;

  for (const matcher of TYPE_MATCHERS) {
    if (!matcher.test(working)) continue;

    typeLabel = matcher.label;
    working = matcher.strip(working);

    if (matcher === DND) {
      const speedMatch = working.match(/\((Fast|Slow)\)/i);
      if (speedMatch) {
        ddSpeed = normalizeWord(speedMatch[1]) as "Fast" | "Slow";
        working = working.replace(/\((Fast|Slow)\)/gi, " ");
      }

      const coreMatch = working.match(/L\.([A-Za-z]+)-(Loud|Quiet)\s*\(([0-9][A-Za-z])\)/i);
      if (coreMatch) {
        ddWord = coreMatch[1].toUpperCase();
        ddLoudness = normalizeWord(coreMatch[2]) as "Loud" | "Quiet";
        ddCode = coreMatch[3].toUpperCase(); // verbatim uit de naam -- niet herberekend
        working = working.replace(/L\.([A-Za-z]+)-(Loud|Quiet)\s*\(([0-9][A-Za-z])\)/gi, " ");
      }
    }

    if (matcher === PHASE_FEESTZAAL) {
      const phaseMatch = working.match(/\bphase\s+([0-9]+[A-Za-z]?)\b/i);
      if (phaseMatch) {
        phaseCode = phaseMatch[1].toUpperCase();
        working = working.replace(/\bphase\s+([0-9]+[A-Za-z]?)\b/gi, " ");
      }

      const yearMatch = working.match(/\((\d{4})\)/);
      if (yearMatch) {
        feestzaalYear = yearMatch[1];
        working = working.replace(/\((\d{4})\)/g, " ");
      }
    }

    break; // eerste match wint (prioriteitsvolgorde, zie TYPE_MATCHERS hierboven)
  }

  // --- kleur: woord of emoji, 1x of 2x in de naam -- welke het ook is, één kleur per naam ------
  let color: PlutchikColor | null = null;
  for (const c of PLUTCHIK_COLORS) {
    const hasWord = new RegExp(`\\b${c}\\b`, "i").test(working);
    const hasEmoji = new RegExp(COLOR_EMOJI_SOURCE[c], "u").test(working);
    if (!hasWord && !hasEmoji) continue;

    color = c;
    working = working.replace(new RegExp(`\\b${c}\\b`, "gi"), " ");
    working = working.replace(new RegExp(COLOR_EMOJI_SOURCE[c], "gu"), " ");
    break;
  }

  // --- dichtheid ---------------------------------------------------------------------------
  let density: "Full" | "Light" | null = null;
  if (/\bfull\b/i.test(working)) {
    density = "Full";
    working = working.replace(/\bfull\b/gi, " ");
  } else if (/\blight\b/i.test(working)) {
    density = "Light";
    working = working.replace(/\blight\b/gi, " ");
  }

  // --- geslacht -----------------------------------------------------------------------------
  let gender: "f" | "m" | null = null;
  const genderMatch = working.match(/\(([fm])\)/i);
  if (genderMatch) {
    gender = genderMatch[1].toLowerCase() as "f" | "m";
    working = working.replace(/\(([fm])\)/gi, " ");
  }

  // --- bpm ----------------------------------------------------------------------------------
  let bpm: number | null = null;
  const bpmMatch = working.match(/(\d{2,4})\s*bpm/i);
  if (bpmMatch) {
    bpm = parseInt(bpmMatch[1], 10);
    working = working.replace(/\d{2,4}\s*bpm/gi, " ");
    // "EDM" naast een bpm-annotatie is altijd decoratie ("EDM 112BPM" in de Music Mood-pipe-staart,
    // "128BPM EDM" in de EDM-emmer-familie) -- nooit betekenisvolle vrije context, dus altijd
    // meestrippen, ongeacht welk typeLabel hierboven won.
    working = working.replace(/\bedm\b/gi, " ");
  }

  // --- volume: "Vol. 1" / "Vol 1" / "Vol. X" / "Vol x" / "Vol.1" -- met/zonder punt en spatie --
  let volume: number | "X" | null = null;
  const volMatch = working.match(/\bvol\.?\s*([0-9]+|x)\b/i);
  if (volMatch) {
    volume = /^x$/i.test(volMatch[1]) ? "X" : parseInt(volMatch[1], 10);
    working = working.replace(/\bvol\.?\s*([0-9]+|x)\b/gi, " ");
  }

  const contextTag = extractContextTag(working);

  return {
    typeLabel,
    color,
    density,
    gender,
    bpm,
    volume,
    contextTag,
    matched: typeLabel !== null || color !== null,
    ddSpeed,
    ddWord,
    ddLoudness,
    ddCode,
    phaseCode,
    feestzaalYear,
  };
}

function normalizeWord(word: string): string {
  return word[0].toUpperCase() + word.slice(1).toLowerCase();
}

// Wat overblijft nadat alle herkende dimensies uit de naam zijn gestript. Pipe-gescheiden
// restsegmenten die alleen nog leeg/interpunctie zijn (bv. de komma die "Phase 1, Feestzaal
// (2026)" bijeenhield) worden weggegooid; wat overblijft is de vrije context (artiest,
// gelegenheid, of -- bij een genuine uitzondering -- gewoon restrommel).
function extractContextTag(working: string): string | null {
  const segments = working
    .split("|")
    .map((segment) =>
      segment
        .replace(/\(\s*\)/g, " ") // lege haakjes die overbleven na het strippen van een waarde
        .replace(/\s+/g, " ")
        .trim()
        .replace(/^[,\-–]+|[,\-–]+$/g, "")
        .trim()
    )
    .filter((segment) => segment.length > 0 && !/^[\s,.\-–()]*$/.test(segment));

  return segments.length > 0 ? segments.join(" | ") : null;
}
