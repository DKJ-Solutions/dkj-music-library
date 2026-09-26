// De bovenste laag van Dave's drietrapsindeling voor muziek (2026-07-25):
//
//   TYPE      EDM · ROCK · POP · ALT                          <- deze module
//   GENRE     House · Drum & Bass · Techno · Nu-Disco          <- `Mix.genre` uit de JSON's
//   SUBGENRE  Tech House · Liquid Drum & Bass · Melodic Techno <- `Mix.subgenre` uit de JSON's
//
// De onderste twee lagen staan als veld in de mix-JSON's (src/data/mixes/README.md, §genre/§subgenre);
// de bovenste staat NERGENS in een bron. Vandaar deze afleiding i.p.v. een nieuw veld: de vier
// toegestane genre-waarden van de veldspec zijn alle vier dansmuziek en dus deterministisch "EDM",
// en zolang er geen rock/pop/alt-mix op de website staat zou een handmatig veld in 85 entries toch
// alleen "EDM" bevatten. Komt er ooit een niet-EDM mix, dan is dit de enige plek die mee moet.
//
// Puur functioneel (geen fs/React) -- vrij importeerbaar, ook client-side.

/** De vier soorten muziek op het breedste niveau, in Dave's eigen volgorde. */
export const GENRE_FAMILIES = ["EDM", "ROCK", "POP", "ALT"] as const;

export type GenreFamily = (typeof GENRE_FAMILIES)[number];

/** Herkent een waarde die zélf al een familie is (de mix-JSON's dragen een handvol legacy-entries
 *  met `"genre": "EDM"` -- volgens de veldspec fout, maar ze staan er). */
export function isGenreFamily(value: string | null): value is GenreFamily {
  if (!value) return false;
  const needle = value.trim().toUpperCase();
  return GENRE_FAMILIES.some((f) => f === needle);
}

// De genre-families uit de veldspec, tolerant gematcht: "Drum & Bass" komt in de praktijk ook voor
// als "Drum and Bass"/"DnB", "Nu-Disco" als "Nu Disco". Alle vier zijn dansmuziek -> EDM.
const EDM_GENRE_PATTERNS: readonly RegExp[] = [
  /\bhouse\b/i,
  /\btechno\b/i,
  /\btrance\b/i,
  /\bdisco\b/i,
  /\bdrum\s*(&|and|'?n'?)\s*bass\b/i,
  /\bd\s*&\s*b\b/i,
  /\bdnb\b/i,
  /\bbreak(beat|s)\b/i,
  /\bgarage\b/i,
  /\bdubstep\b/i,
];

/** Leidt de familie af uit een genre- of subgenre-waarde uit de mix-JSON's.
 *
 *  Werkt óók op een subgenre ("Tech House" -> EDM, "Liquid Drum & Bass" -> EDM), zodat een entry met
 *  alleen een subgenre niet leeg blijft. `null` zodra er niets te herkennen valt -- liever leeg dan
 *  een gok, want een verkeerd ingevulde familie is lastiger te zien dan een lege cel. */
export function genreToFamily(genre: string | null): GenreFamily | null {
  if (!genre) return null;
  if (isGenreFamily(genre)) return genre.trim().toUpperCase() as GenreFamily;
  return EDM_GENRE_PATTERNS.some((re) => re.test(genre)) ? "EDM" : null;
}

// De naamgevingsfamilies van de playlist-parser (spotify/parsePlaylistName.ts) waarvan de soort
// muziek ONMISKENBAAR is. Bewust incompleet: "Top 100", "OST", "D&D" en "Phase/Feestzaal" zeggen iets
// over de gelégenheid, niet over de muzieksoort, en die blijven dus leeg in plaats van geraden.
const TYPE_LABEL_FAMILIES: ReadonlyMap<string, GenreFamily> = new Map([
  ["House Mix", "EDM"],
  ["Drum & Bass (Mix)", "EDM"],
  ["EDM-emmer", "EDM"],
  ["Music Mood", "EDM"],
  ["Classic Pop", "POP"],
  ["ALT", "ALT"],
] as const);

/** Terugval voor playlists zonder gekoppelde mix: leidt de familie af uit de naamgevingsfamilie die
 *  de playlist-parser in de naam herkende. Zo blijft de TYPE-kolom ook gevuld op de lijsten die geen
 *  mix-JSON hebben (de kleur-emmers, de MMC-werkbakken). */
export function typeLabelToFamily(typeLabel: string | null): GenreFamily | null {
  if (!typeLabel) return null;
  return TYPE_LABEL_FAMILIES.get(typeLabel.trim()) ?? null;
}
