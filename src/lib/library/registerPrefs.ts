// DE FILTERSTAND VAN HET TRACKREGISTER ONTHOUDEN (Dave, eigenaar koos localStorage): wie dkj_genre op
// EDM zet en de pagina later herlaadt of opnieuw opent, ziet EDM er weer staan. Bewaard worden query,
// yearFrom, yearTo, bpm, genre, album, group, sort en columnSet, onder één versioned key -- `page` NIET:
// een nieuw bezoek begint altijd op pagina 1, ook als de vorige sessie op pagina 40 eindigde.
//
// Pure module, geen React: TrackRegister.tsx roept load/save pas aan ná de eerste render (useEffect).
// De pagina rendert eerst server-side, waar geen localStorage bestaat; lezen vóór mount zou de
// server-HTML en de client-HTML laten verschillen (hydration mismatch). Zie TrackRegister.tsx voor hoe
// dat useEffect-patroon toegepast wordt.
//
// Elke read/write zit in try/catch (localStorage kan ontbreken, vol zijn, of geblokkeerd -- privémodus)
// en elke waarde wordt hier per veld gevalideerd: een kapotte of verouderde opgeslagen stand (JSON die
// niet meer parseert, een dkj_genre dat niet meer in de data bestaat, een met de hand aangepaste
// sort-key of columnSet) mag de pagina nooit laten crashen. Eén ongeldig veld valt terug op zijn eigen
// standaardwaarde; de rest van de opgeslagen stand blijft gewoon staan.
import { EMPTY_FILTER, type RegisterSort, type SortKey } from "./register";

/** Welke kolommen de tabel toont: de gewone, of de kolommen die daar bewust uit zijn gelaten. Hoort qua
 *  onderwerp bij TrackRegister.tsx, maar staat hier omdat de opgeslagen stand hem nodig heeft. */
export type ColumnSet = "visible" | "hidden";
const COLUMN_SETS: readonly ColumnSet[] = ["visible", "hidden"];

const SORT_DIRS: readonly RegisterSort["dir"][] = ["asc", "desc"];

export interface RegisterPrefs {
  query: string;
  yearFrom: string;
  yearTo: string;
  bpm: string;
  genre: string;
  album: string;
  group: string;
  sort: RegisterSort | null;
  columnSet: ColumnSet;
}

/** De geldige opties per select-filter, zoals TrackRegister.tsx ze aanbiedt -- alleen de echte
 *  waarden; "" (alle) en EMPTY_FILTER (leeg) horen er bij elk veld altijd bij en staan niet in deze
 *  lijsten. `sortKeys` is SORT_KEYS uit register.ts. */
export interface RegisterPrefsOptions {
  bpm: readonly string[];
  genre: readonly string[];
  album: readonly string[];
  group: readonly string[];
  sortKeys: readonly SortKey[];
}

export const REGISTER_PREFS_KEY = "dkj.trackregister.filters.v1";

/** De stand waarmee het register opent zonder (geldige) opgeslagen filters. */
export function defaultRegisterPrefs(): RegisterPrefs {
  return { query: "", yearFrom: "", yearTo: "", bpm: "", genre: "", album: "", group: "", sort: null, columnSet: "visible" };
}

const validText = (value: unknown, fallback: string): string => (typeof value === "string" ? value : fallback);

/** yearFrom/yearTo: leeg, of alleen cijfers -- net als de jaargrens die filterRegister zelf accepteert. */
const validYear = (value: unknown): string => (typeof value === "string" && /^\d*$/.test(value) ? value : "");

/** "" (alle) en EMPTY_FILTER (leeg) zijn bij elk select-filter altijd geldig, naast de echte opties. */
const validOption = (value: unknown, options: readonly string[]): string =>
  typeof value === "string" && (value === "" || value === EMPTY_FILTER || options.includes(value)) ? value : "";

function validSort(value: unknown, sortKeys: readonly SortKey[]): RegisterSort | null {
  if (typeof value !== "object" || value === null) return null;
  const { key, dir } = value as { key?: unknown; dir?: unknown };
  if (typeof key !== "string" || !sortKeys.includes(key as SortKey)) return null;
  if (typeof dir !== "string" || !SORT_DIRS.includes(dir as RegisterSort["dir"])) return null;
  return { key: key as SortKey, dir: dir as RegisterSort["dir"] };
}

const validColumnSet = (value: unknown): ColumnSet =>
  typeof value === "string" && COLUMN_SETS.includes(value as ColumnSet) ? (value as ColumnSet) : "visible";

/** Zet onbekende JSON om in een geldige RegisterPrefs, per veld gevalideerd tegen `options` -- zodat één
 *  kapot veld niet de hele opgeslagen stand verwerpt. Geen object (bv. corrupte JSON die wel parseerde,
 *  zoals een los getal of `null`): de volledige standaardstand. */
export function validateRegisterPrefs(value: unknown, options: RegisterPrefsOptions): RegisterPrefs {
  if (typeof value !== "object" || value === null) return defaultRegisterPrefs();
  const raw = value as Record<string, unknown>;
  return {
    query: validText(raw.query, ""),
    yearFrom: validYear(raw.yearFrom),
    yearTo: validYear(raw.yearTo),
    bpm: validOption(raw.bpm, options.bpm),
    genre: validOption(raw.genre, options.genre),
    album: validOption(raw.album, options.album),
    group: validOption(raw.group, options.group),
    sort: validSort(raw.sort, options.sortKeys),
    columnSet: validColumnSet(raw.columnSet),
  };
}

/** De opgeslagen filterstand, of de standaardstand als er niets (geldigs) ligt. Nooit een geworpen fout:
 *  een lezing die faalt (geen localStorage, corrupte JSON) levert gewoon de standaardstand op. */
export function loadRegisterPrefs(options: RegisterPrefsOptions): RegisterPrefs {
  try {
    const raw = window.localStorage.getItem(REGISTER_PREFS_KEY);
    if (raw === null) return defaultRegisterPrefs();
    return validateRegisterPrefs(JSON.parse(raw), options);
  } catch {
    return defaultRegisterPrefs();
  }
}

/** Bewaart de filterstand. Faalt de schrijfactie (vol, geblokkeerd), dan onthoudt de pagina de stand
 *  gewoon niet voor de volgende keer -- geen fout die de gebruiker ziet. */
export function saveRegisterPrefs(prefs: RegisterPrefs): void {
  try {
    window.localStorage.setItem(REGISTER_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // Zie de JSDoc hierboven.
  }
}

/** Staat het register nog in zijn standaardstand? Gebruikt door de UI om de "Filters wissen"-knop te
 *  tonen of te verbergen, net als isDefaultFilters() bij de Spotify-playlistmanager. */
export function isDefaultRegisterPrefs(prefs: RegisterPrefs): boolean {
  const empty = defaultRegisterPrefs();
  return (
    prefs.query === empty.query &&
    prefs.yearFrom === empty.yearFrom &&
    prefs.yearTo === empty.yearTo &&
    prefs.bpm === empty.bpm &&
    prefs.genre === empty.genre &&
    prefs.album === empty.album &&
    prefs.group === empty.group &&
    prefs.sort === empty.sort &&
    prefs.columnSet === empty.columnSet
  );
}
