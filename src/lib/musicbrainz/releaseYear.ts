// Het jaar van EERSTE uitgave van een track, via MusicBrainz' recording-search (issue #45). Spotify kent
// alleen de releasedatum van het ALBUM (zie library/releaseYears.ts) -- op een verzamelalbum of een
// heruitgave is dat een te jong jaar ("The Best of The Monkees" 2008 in plaats van 1966). MusicBrainz
// kent `first-release-date`: het jaar waarin de OPNAME voor het eerst uitkwam, los van welke uitgave je
// toevallig op Spotify tegenkomt.
//
// Puur: bouwt de zoek-URL en kiest uit een response. Het echte netwerkverzoek (met MusicBrainz' regel
// van hooguit 1 verzoek per seconde, en de retries) staat in het script, scripts/library/fetch-release-
// years.ts -- deze module doet zelf nooit fetch. Het resultaat landt in de lokale cache
// (musicbrainz/cacheStore.ts); de pagina's lezen alleen die cache.
import { studioTitleOf } from "@/lib/library/liveTitle";
import { yearOf } from "@/lib/library/releaseYears";

export const MUSICBRAINZ_SEARCH_URL = "https://musicbrainz.org/ws/2/recording";
// Het maximum dat MusicBrainz toestaat. Een bekend nummer heeft tientallen opnames met score 100 (live,
// heropnames, verzamelalbums), en het origineel staat daar niet vanzelf bij de eerste 25: met 25 kwam
// "I'm a Believer" van The Monkees op 1980 uit in plaats van 1966. Meer resultaten kost geen extra verzoek.
const RESULT_LIMIT = 100;

/** Alleen een hoge score telt als match (Dave, issue #45) -- MusicBrainz geeft desnoods ook een half
 *  passende kandidaat terug, en die is hier onbruikbaar: liever geen jaar dan een verkeerd jaar. */
const MIN_SCORE = 90;

// Tekens die in MusicBrainz' Lucene-zoeksyntax een speciale betekenis hebben. Ongeëscaped zouden ze de
// zoekopdracht breken of anders laten zoeken dan bedoeld (bv. een "?" in een titel als wildcard).
const LUCENE_SPECIAL = /([+\-!(){}[\]^"~*?:\\/&|])/g;

/** Een titel of artiestnaam zoals die veilig in een Lucene-zoekterm mag -- elk speciaal teken
 *  voorafgegaan door een backslash. */
export function escapeLucene(value: string): string {
  return value.replace(LUCENE_SPECIAL, "\\$1");
}

// Achtervoegsels die Spotify aan een titel hangt en die MusicBrainz niet als eigen opname kent: die
// verstoren de zoekopdracht alleen maar ("Yellow - Remastered 2011", "Two Weeks (Demo)", "Umbrella - Radio
// Edit"). Live wordt al
// door liveTitle.ts herkend (dezelfde titel als de studio-opname, zie de kop daar) -- hergebruikt. De
// rest (remaster, demo, radio edit, single version) herkent deze module zelf, in dezelfde vorm: een stuk na " - "/" – " of tussen
// ( )/[ ], met een optioneel jaartal ervoor of erachter.
const YEAR = String.raw`(?:19|20)\d{2}`;
const SUFFIX_WORD = String.raw`re-?master(?:ed)?|demo|(?:radio|single|album)\s+edit|radio|single|album|edit`;
const SUFFIX_MARK = new RegExp(String.raw`^(?:${YEAR}\s+)?(?:${SUFFIX_WORD})(?:\s+version)?(?:\s+${YEAR})?$`, "i");
const SUFFIX_BRACKET = new RegExp(
  String.raw`\s*[([]\s*(?:${YEAR}\s+)?(?:${SUFFIX_WORD})(?:\s+version)?(?:\s+${YEAR})?\s*[)\]]`,
  "gi"
);
const SEGMENT_SEPARATOR = /(\s[-–]\s)/;

/** De titel zonder Spotify-achtervoegsel (live, remaster, demo, radio/single edit, single/album version, edit), voor de MusicBrainz-zoekopdracht. */
export function searchTitleOf(title: string): string {
  const withoutLive = studioTitleOf(title);
  const [first, ...rest] = withoutLive.split(SEGMENT_SEPARATOR);
  let kept = first;
  for (let i = 0; i < rest.length; i += 2) {
    const [separator, segment] = [rest[i], rest[i + 1]];
    if (SUFFIX_MARK.test(segment.trim())) break;
    kept += separator + segment;
  }
  const cleaned = kept.replace(SUFFIX_BRACKET, "").trim();
  return cleaned === "" ? withoutLive : cleaned;
}

/** De MusicBrainz-zoekopdracht (Lucene) voor de recording-search: titel + hoofdartiest, allebei als
 *  woordgroep en ge-escaped. */
export function buildRecordingQuery(title: string, artist: string): string {
  return `recording:"${escapeLucene(searchTitleOf(title))}" AND artist:"${escapeLucene(artist)}"`;
}

/** De volledige zoek-URL voor GET /ws/2/recording. */
export function buildSearchUrl(title: string, artist: string): string {
  const url = new URL(MUSICBRAINZ_SEARCH_URL);
  url.searchParams.set("query", buildRecordingQuery(title, artist));
  url.searchParams.set("fmt", "json");
  url.searchParams.set("limit", String(RESULT_LIMIT));
  return url.toString();
}

export interface MusicBrainzArtistCredit {
  name: string;
  artist?: { id: string; name: string };
}

export interface MusicBrainzRecording {
  id: string;
  score?: number | string; // MusicBrainz geeft dit soms als getal, soms als tekst terug
  title?: string;
  "first-release-date"?: string;
  "artist-credit"?: MusicBrainzArtistCredit[];
}

export interface MusicBrainzSearchResponse {
  recordings?: MusicBrainzRecording[];
}

export interface ChosenRelease {
  year: number;
  recordingId: string;
}

function scoreOf(recording: MusicBrainzRecording): number {
  const raw = recording.score;
  const value = typeof raw === "string" ? Number(raw) : raw;
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/** Kleine letters, zonder accenten, met een spatie aan beide kanten -- zelfde truc als fold() in
 *  library/register.ts en normalize() in library/primaryArtist.ts: zo vindt " camo krooked " ook
 *  "Camo & Krooked" zonder dat "iron" toevallig binnen "environment" matcht. Net als die twee een eigen,
 *  lokale kopie in plaats van een cross-import -- dezelfde afweging als daar (elk bestand blijft zo op
 *  zichzelf leesbaar, en de kopie is drie regels). */
function fold(value: string): string {
  const words = value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
  return ` ${words} `;
}

/** Of de artist-credit van deze kandidaat de gezochte artiest BEVAT (hoofdletter- en accentongevoelig) --
 *  niet per se als enige credit: "Michael Jackson & Paul McCartney" telt mee voor "Michael Jackson". */
function creditsInclude(recording: MusicBrainzRecording, artist: string): boolean {
  const needle = fold(artist);
  if (needle.trim() === "") return false;
  const credits = recording["artist-credit"] ?? [];
  const haystack = fold(credits.map((credit) => credit.artist?.name ?? credit.name).join(" "));
  return haystack.includes(needle);
}

/** De MusicBrainz-artiest (MBID) achter de gezochte naam in deze kandidaat: de eerste credit waarvan de naam
 *  de gezochte artiest bevat en die een id heeft. null als geen credit dat heeft. */
function artistIdOf(recording: MusicBrainzRecording, artist: string): string | null {
  const needle = fold(artist);
  for (const credit of recording["artist-credit"] ?? []) {
    const id = credit.artist?.id;
    if (id && fold(credit.artist?.name ?? credit.name).includes(needle)) return id;
  }
  return null;
}

/** Kiest uit een MusicBrainz-response: alleen kandidaten met een hoge score (>= MIN_SCORE) waarvan de
 *  artist-credit de gezochte artiest bevat, en daarvan het VROEGSTE `first-release-date`-jaar (net als
 *  het vroegste-jaar-over-alle-varianten-principe in library/releaseYears.ts). Geen bruikbare kandidaat
 *  -> null.
 *
 *  Een naamgenoot telt niet mee (issue #47): de artiest van de kandidaat met de hoogste score ligt vast
 *  op zijn MBID, en een kandidaat die een ANDERE artiest met dezelfde naam credit, valt af. Zo trok een
 *  opname van een tweede "James Morrison" het jaar van "Wonderful World" terug naar 1996. Een kandidaat
 *  zonder MBID's in zijn credits kan dat niet laten zien en telt op de naam alleen. */
export function chooseRelease(response: MusicBrainzSearchResponse, artist: string): ChosenRelease | null {
  const matching = (response.recordings ?? []).filter(
    (recording) => scoreOf(recording) >= MIN_SCORE && creditsInclude(recording, artist)
  );
  const top = matching.reduce<MusicBrainzRecording | null>(
    (best, recording) => (best === null || scoreOf(recording) > scoreOf(best) ? recording : best),
    null
  );
  const pinnedId = top ? artistIdOf(top, artist) : null;

  let best: ChosenRelease | null = null;
  for (const recording of matching) {
    const hasIds = (recording["artist-credit"] ?? []).some((credit) => credit.artist?.id);
    if (pinnedId && hasIds && artistIdOf(recording, artist) !== pinnedId) continue;
    const year = yearOf(recording["first-release-date"]);
    if (year !== null && (best === null || year < best.year)) best = { year, recordingId: recording.id };
  }
  return best;
}
