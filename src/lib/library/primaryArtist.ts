// WIE ER IN `dkj_artist` KOMT: de ene artiest van een track.
//
// De regel (Dave, 27 september 2026): de artiest die de remix of edit maakte, gaat altijd voor. Verder
// is het de eerste artiest uit `artists`, de hoofdartiest volgens Spotify.
//
// Een remix of edit is te herkennen aan het versiedeel van de titel: het stuk na " - " of tussen haakjes
// waarin remix, edit, mix, rework, bootleg, flip, VIP, remake of dub staat ("Filmic - CRi Remix",
// "Maybe (Fred V & Grafix Remix)"). De remixer wordt in twee stappen gezocht:
//
//   1. Staat een van de artiesten van de track in dat stuk, dan is die het; bij meer dan één telt wie
//      het eerst genoemd wordt ("PROFF & Igor Garanin Remix" -> PROFF). Zo komt de naam precies zoals
//      Spotify hem spelt.
//   2. Anders telt de naam vóór het versiewoord, zoals hij in de titel staat ("The Wolves - Lenzman
//      Remix" -> Lenzman), ook als Spotify die remixer niet bij de track zet. Woorden die geen naam zijn
//      ("Radio Edit", "Original Mix", "Extended Club Mix", "UK Radio Edit", "Re-Edit"), een jaartal
//      ("Drunkenmunky 2007 Remake" -> Drunkenmunky, "2019 Mix" en "'98 Radio Edit" -> geen naam) en een
//      plaatformaat ("7\" Remix", "12inch Mix") vallen weg, net als een "feat."-stuk ervoor. Bij een komma telt de eerste naam ("Misha Klein, No
//      Hopes Remix" -> Misha Klein); een & blijft staan, omdat dat vaak één act is ("Camo & Krooked").
//      Een stijl leest hier als een naam ("Techno Mix" -> Techno): daarvoor gekozen door Dave, omdat
//      een echte remixer missen erger is.
//
// Blijft er niets over ("Levels - Radio Edit"), dan is het de hoofdartiest.
//
// Pure module: geen fs, geen sqlite.

const VERSION_WORD = String.raw`(?:remix|edit|mix|rework|bootleg|flip|vip|remake|dub)`;

/** Een versiedeel: na " - " (of " – "), of tussen ( ) of [ ], met een versiewoord erin. */
const VERSION_PART = new RegExp(String.raw`(?:\s[-–]\s|[([])([^()[\]]*?\b${VERSION_WORD}\b[^()[\]]*)`, "gi");

/** Het eerste versiewoord in een versiedeel; wat ervoor staat, is de credit. */
const FIRST_VERSION_WORD = new RegExp(String.raw`\b${VERSION_WORD}\b`, "i");

/** Woorden in een credit die geen naam zijn, maar het soort versie. */
const NOT_A_NAME = new Set([
  "radio", "original", "extended", "club", "vocal", "instrumental", "dub", "main", "album", "single",
  "short", "long", "full", "clean", "explicit", "remix", "edit", "mix", "re", "uk", "us",
]);

/** Woorden die een jaar of plaatformaat zijn, geen naam: 2019, '98, 2K21, 7", 12", 12inch (en een los getal:
 *  de " van 7" is dan al als aanhalingsteken weggehaald). */
const DATE_OR_FORMAT = /^(?:'?\d{1,2}|\d{4}|2k\d{2}|\d{1,2}(?:"|''|inch|in))$/i;

/** Kleine letters, zonder accenten, en alles wat geen letter of cijfer is als één spatie, met een spatie
 *  aan beide kanten: zo vindt " krunk " ook "Krunk!" en " camo krooked " ook "Camo & Krooked". */
function normalize(value: string): string {
  const words = value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
  return ` ${words} `;
}

/** Alle versiedelen van een titel, de laatste eerst (daar staat de remix meestal). */
export function versionParts(title: string): string[] {
  return [...title.matchAll(VERSION_PART)].map((match) => match[1]).reverse();
}

/** Stap 1: de artiest van de track die in een versiedeel het eerst staat. */
export function remixArtistOf(title: string, artists: readonly string[]): string | null {
  for (const part of versionParts(title)) {
    const haystack = normalize(part);
    let best: { at: number; name: string } | null = null;
    for (const name of artists) {
      const needle = normalize(name);
      if (needle.trim() === "") continue;
      const at = haystack.indexOf(needle);
      if (at >= 0 && (best === null || at < best.at)) best = { at, name };
    }
    if (best) return best.name;
  }
  return null;
}

/** Stap 2: de naam vóór het versiewoord, zoals hij in de titel staat, of null als er geen naam staat. */
export function titleCreditOf(title: string): string | null {
  for (const part of versionParts(title)) {
    // Alleen het laatste stuk vóór het versiewoord: "feat. Starling - VIP" heeft geen maker.
    const segments = part.split(FIRST_VERSION_WORD)[0].split(/\s[-–](?:\s|$)/);
    const before = segments[segments.length - 1].split(",")[0];
    const words = before
      .trim()
      .replace(/^['"‘’“”]+|['"‘’“”]+$/g, "")
      .split(/\s+/)
      .filter((word) => word !== "" && !NOT_A_NAME.has(word.toLowerCase().replace(/[^\p{L}]/gu, "")))
      .filter((word) => !DATE_OR_FORMAT.test(word.replace(/[;,]+$/, "")));
    const credit = words.join(" ").replace(/^['"‘’“”]+|['"‘’“”]+$/g, "").trim();
    if (/[\p{L}\p{N}]/u.test(credit)) return credit;
  }
  return null;
}

/** `dkj_artist` voor een track: de remixer als die er is, anders de eerste artiest. */
export function primaryArtistOf(title: string | null, artists: readonly string[]): string | null {
  if (title) {
    const remixer = remixArtistOf(title, artists) ?? titleCreditOf(title);
    if (remixer !== null) return remixer;
  }
  return artists[0] ?? null;
}
