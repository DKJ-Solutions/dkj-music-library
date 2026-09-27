// HET SCHEMA VAN DE TRACKDATABASE -- de enige plek waar een veld bestaat.
//
// Een nieuw veld toevoegen = één regel onderaan TRACK_FIELDS. Bij de volgende keer dat de database
// opent (app-start of import) voegt syncSchema() (db.ts) de kolom zelf toe; bestaande rijen krijgen
// dan NULL voor dat veld. Er is dus geen losse migratie nodig.
//
// De regels, zodat er nooit data wegvalt:
//   - Een veld WEGHALEN uit deze lijst laat de kolom en de data gewoon staan in de database. De app
//     negeert de kolom en waarschuwt in de console. Echt verwijderen is een bewuste, losse stap.
//   - Een veld HERNOEMEN: geef het nieuwe `key` en zet de oude naam in `renamedFrom`. De kolom wordt
//     dan hernoemd, met de data erin. Laat `renamedFrom` staan tot elke database hernoemd is.
//   - Het `type` van een bestaand veld veranderen past de kolom NIET aan (SQLite is flexibel in wat
//     een kolom bevat); het verandert alleen hoe de app de waarde leest en schrijft.
//
// Pure module: geen fs, geen sqlite -- ook vanuit een client-component te importeren.

/** Hoe een waarde in de database staat en terugkomt.
 *  - text:    string
 *  - integer: geheel getal (bv. duur in ms, jaartal)
 *  - real:    kommagetal (bv. een exacte BPM als 127.98)
 *  - boolean: true/false, opgeslagen als 1/0
 *  - json:    lijst of object, opgeslagen als JSON-tekst (bv. meerdere artiesten, tags) */
export type FieldType = "text" | "integer" | "real" | "boolean" | "json";

export interface FieldDef {
  /** Kolomnaam in de database en kolomkop in een importbestand. Kleine letters, cijfers en `_`. */
  key: string;
  type: FieldType;
  /** Korte uitleg voor wie het schema leest; staat verder nergens. */
  label: string;
  /** Vorige naam van dit veld, als het hernoemd is (zie de regels hierboven). */
  renamedFrom?: string;
  /** Alleen bij type text: de enige toegestane waarden. Een andere waarde is een invoerfout; hoofdletters
   *  en spaties tellen niet mee ("128 bpm" wordt "128BPM"). Opgeslagen wordt altijd de spelling hier. */
  options?: readonly string[];
}

/** De sleutel van elke track: jouw eigen gegenereerde ID. Geen apart veld in TRACK_FIELDS, omdat hij
 *  nooit hernoemd of weggehaald mag worden. */
export const TRACK_ID_KEY = "dkj_track_id";

/** De oude naam van TRACK_ID_KEY (tot 27 september 2026). Nog overal gelezen: een bestaande database
 *  hernoemt de kolom zelf (db.ts, trackIds.ts), een oude export zet gewoon terug (libraryFile.ts) en een
 *  importbestand met de kolomkop `track_id` werkt nog (trackStore.ts). Geschreven wordt alleen de nieuwe. */
export const LEGACY_TRACK_ID_KEY = "track_id";

/** Het veld met de eigen artiest-ID's van een track (zie artistIds.ts). Hier en niet in artistIds.ts,
 *  omdat trackIds.ts het ook nodig heeft en artistIds.ts trackIds.ts al importeert. */
export const ARTIST_IDS_KEY = "dkj_artist_ids";

/** Het veld met precies één artiest: de eerste uit `artists` (zie fillPrimaryArtists in artistIds.ts). */
export const PRIMARY_ARTIST_KEY = "dkj_artist";

/** Het veld met alle artiesten als één tekst, in de volgorde van Spotify (zie fillAlbumArtists in artistIds.ts). */
export const ALBUM_ARTIST_KEY = "dkj_albumartiest";

/** Hoe de namen in `dkj_albumartiest` aan elkaar staan. */
export const ALBUM_ARTIST_SEPARATOR = ", ";

/** `dkj_albumartiest` voor een rij artiestnamen, of null als er geen is. */
export function albumArtistOf(names: readonly string[]): string | null {
  return names.length > 0 ? names.join(ALBUM_ARTIST_SEPARATOR) : null;
}

/** De eigen BPM-groepen, in de volgorde waarin ze getoond worden. */
export const DKJ_BPM_OPTIONS = ["128BPM", "112BPM", "176BPM", "144BPM", "96BPM"] as const;

/** De acht kleuren van de eigen albums. */
export const DKJ_ALBUM_COLOURS = ["Green", "Yellow", "Red", "Purple", "Cyan", "Blue", "Orange", "Magenta"] as const;

/** Elk eigen album: een kleur, Light of Full, en (f) of (m) -- bv. "Green Light (f)". */
export const DKJ_ALBUM_OPTIONS: readonly string[] = DKJ_ALBUM_COLOURS.flatMap((colour) =>
  ["Light (f)", "Full (f)", "Light (m)", "Full (m)"].map((variant) => `${colour} ${variant}`)
);

export const TRACK_FIELDS: readonly FieldDef[] = [
  { key: "spotify_track_id", type: "text", label: "Spotify-track-ID (het deel na spotify:track:)" },
  { key: "title", type: "text", label: "Titel" },
  { key: "artists", type: "json", label: "Artiesten, als lijst" },
  { key: "album", type: "text", label: "Album" },
  { key: "duration_ms", type: "integer", label: "Duur in milliseconden" },
  { key: "release_year", type: "integer", label: "Jaar van uitgave" },
  { key: "bpm", type: "real", label: "BPM" },
  { key: "musical_key", type: "text", label: "Toonsoort (bv. 8A of Am)" },
  { key: "genre", type: "text", label: "Genre" },
  { key: "tags", type: "json", label: "Eigen tags, als lijst" },
  { key: "notes", type: "text", label: "Vrije notities" },
  { key: "dkj_artist_ids", type: "json", label: "Eigen artiest-ID's (tabel artists, zie artistIds.ts), hoofdartiest eerst" },
  {
    key: "dkj_bpm",
    type: "text",
    label: "Eigen BPM-groep",
    options: DKJ_BPM_OPTIONS,
  },
  { key: "dkj_album", type: "text", label: "Eigen album (kleur, Light/Full, f/m)", options: DKJ_ALBUM_OPTIONS },
  { key: "dkj_artist", type: "text", label: "Eén artiest: de eerste uit artists, tenzij zelf ingevuld" },
  { key: "dkj_albumartiest", type: "text", label: "Alle artiesten in Spotify-volgorde, met komma's, tenzij zelf ingevuld" },
  // Nieuw veld? Voeg het hier toe, bv.:
  // { key: "energy", type: "integer", label: "Energie 1-10" },
];

const KEY_SHAPE = /^[a-z][a-z0-9_]*$/;

/** Hoe een invoerwaarde met een optie vergeleken wordt: zonder spaties en hoofdletterongevoelig. */
export function optionKey(value: string): string {
  return value.replace(/\s+/g, "").toUpperCase();
}

/** Kolommen die de database zelf bijhoudt; die mogen niet als veld gedefinieerd worden. */
export const SYSTEM_COLUMNS = [TRACK_ID_KEY, "created_at", "updated_at"] as const;

/** Controleert het schema zelf: geldige namen, geen dubbelen, niets dat een systeemkolom overlapt.
 *  Gooit bij de eerste fout, want een kapot schema is een programmeerfout en geen gebruikersdata. */
export function validateFields(fields: readonly FieldDef[]): void {
  const seen = new Set<string>(SYSTEM_COLUMNS);
  for (const field of fields) {
    if (!KEY_SHAPE.test(field.key)) {
      throw new Error(`veldnaam ${JSON.stringify(field.key)} mag alleen a-z, 0-9 en _ bevatten`);
    }
    if (seen.has(field.key)) {
      throw new Error(`veldnaam ${JSON.stringify(field.key)} komt dubbel voor of is gereserveerd`);
    }
    seen.add(field.key);
    if (field.renamedFrom !== undefined && !KEY_SHAPE.test(field.renamedFrom)) {
      throw new Error(`renamedFrom ${JSON.stringify(field.renamedFrom)} is geen geldige veldnaam`);
    }
    if (field.options !== undefined) {
      if (field.type !== "text") {
        throw new Error(`veld ${JSON.stringify(field.key)}: options kan alleen bij type text`);
      }
      const keys = field.options.map(optionKey);
      if (keys.length === 0 || keys.includes("") || new Set(keys).size !== keys.length) {
        throw new Error(`veld ${JSON.stringify(field.key)}: options moet gevuld zijn, zonder lege of dubbele waarden`);
      }
    }
  }
}
