// `dkj_file`: de bestandsnaam van een track zoals hij op de desktop zou heten, zonder extensie.
//
// De vorm (Dave, 27 september 2026): "<artiesten> - <titel> (<versie>)", bijvoorbeeld
//   Higher - David Penn Remix   (Abel Ramos, David Penn)  ->  Abel Ramos - Higher (David Penn Remix)
//   Airdraw, Jo.E & Aaren - Bryde's Whale (New Ordinance Edit)
//   Jaded - Can You Feel It (Luttrell Remix)
//
// De regels:
//   - Artiesten: die van de track, met ", " ertussen en " & " voor de laatste. De remixer staat al in
//     de versie en gaat er dus uit (bij twee remixers allebei), behalve als hij ook de hoofdartiest is
//     ("Andy C VIP"). Een artiest
//     die de titel al als featuring noemt ("(feat. Eva Simons)"), staat er ook niet nog eens vooraan.
//   - Titel: elk stuk na " - " gaat tussen haakjes ("Levels - Radio Edit" -> "Levels (Radio Edit)");
//     wat al tussen haakjes staat, blijft zoals het is.
//   - Tekens die Windows niet in een bestandsnaam toestaat, gaan eruit: / \ : worden "-", ? * " < > |
//     vallen weg, en een punt of spatie aan het eind ook.
//
// Pure module: geen fs, geen sqlite.
import { artistsNamedIn, titleCreditOf, versionParts } from "./primaryArtist";

/** Een stuk na " - " (of " – "). */
const SUFFIX_SEPARATOR = /\s[-–]\s/;

/** Een featuring-stuk in de titel: "(feat. X)", "[ft. X]", "- feat. X", "(with X)", of los "Kawir feat. X".
 *  "with" alleen na een haakje of streepje: "Run with the Wolves" is geen featuring. */
const FEATURING = /(?:(?:\(|\[|\s[-–]\s)\s*(?:feat\.?|ft\.?|featuring|with)|\s(?:feat\.|ft\.|featuring))\s[^)\]]*/gi;

/** "A", "A & B", "A, B & C". */
export function joinArtists(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} & ${names[names.length - 1]}`;
}

/** De titel met elk " - stuk" tussen haakjes. */
export function fileTitle(title: string): string {
  const [base, ...suffixes] = title.split(SUFFIX_SEPARATOR);
  return [base.trim(), ...suffixes.map((suffix) => `(${suffix.trim()})`)].join(" ");
}

/** Maakt een naam bruikbaar als Windows-bestandsnaam. */
export function safeFileName(name: string): string {
  return name
    .replace(/[\\/:]/g, "-")
    .replace(/[?*"<>|]/g, "")
    .replace(/\p{Cc}/gu, "")
    .replace(/\s+/g, " ")
    .replace(/[. ]+$/, "")
    .trim();
}

/** De artiesten vóór de titel: zonder de remixer (tenzij hoofdartiest) en zonder wie de titel al als
 *  featuring noemt. Blijft er niemand over, dan alle artiesten. */
export function fileArtists(title: string, artists: readonly string[]): string[] {
  // Iedereen die in een versiedeel staat, is al genoemd: "PROFF & Igor Garanin Remix" noemt ze allebei.
  const remixers = new Set(versionParts(title).flatMap((part) => artistsNamedIn(part, artists)));
  if (remixers.size === 0) {
    // De titel noemt de remixer korter dan Spotify: "[Luttrell Remix]" bij de artiest "Eric Luttrell".
    const credit = titleCreditOf(title);
    if (credit !== null) for (const name of artists) if (artistsNamedIn(name, [credit]).length > 0) remixers.add(name);
  }
  const featured = new Set([...title.matchAll(FEATURING)].flatMap((match) => artistsNamedIn(match[0], artists)));
  const kept = artists.filter((name, i) => i === 0 || (!remixers.has(name) && !featured.has(name)));
  return kept.length > 0 ? kept : [...artists];
}

// `dkj_title` is alleen de titel (Dave, 27 september 2026): een generieke versie-aanduiding en een
// featuring gaan eruit, een remix van een artiest blijft staan.
//   99 Biker Friends (Main Version) (Explicit)  ->  99 Biker Friends
//   2 up in the Morning (Radio Mix)             ->  2 up in the Morning
//   Titanium (feat. Sia)                        ->  Titanium
//   Higher (David Penn Remix)                   ->  Higher (David Penn Remix)
// Een groep tussen haakjes is generiek als ELK woord erin een versiewoord of een jaartal is. Daardoor
// blijft "Falling (JORDAZ Radio Mix)" staan (JORDAZ is geen versiewoord) en ook alles wat bij de
// titel hoort: "(I Can't Get No) Satisfaction", "Blue (Da Ba Dee)". Een groep met meerdere delen
// ("Danny Byrd Remix; Explicit") verliest alleen zijn generieke delen.

/** De woorden van een generieke versie-aanduiding, in kleine letters en zonder accenten. */
const VERSION_WORDS = new Set([
  "a", "acapella", "accapella", "acoustic", "album", "and", "bonus", "clean", "club", "cut", "demo", "digital",
  "dub", "edit", "edited", "explicit", "extended", "full", "instrumental", "lange", "long", "main", "mix",
  "mixed", "mono", "non", "original", "radio", "re", "recorded", "remaster", "remastered", "remix", "rerecorded",
  "short", "single", "stereo", "studio", "track", "versie", "version", "vocal",
]);

/** Een groep tussen ronde of rechte haakjes zonder haakjes erin (de binnenste eerst). */
const GROUP = /\s*[([]([^()[\]]*)[)\]]/g;

/** Een featuring-groep: "(feat. X)", "[ft. X]", "(Featuring X)", "(with X)". */
const FEATURING_GROUP = /^\s*(?:feat\.?|ft\.?|featuring|with)\s/i;

/** Een losse featuring buiten haakjes: "Kawir feat. X" -- tot het eind of de volgende groep. */
const LOOSE_FEATURING = /\s(?:feat\.|ft\.|featuring)\s[^()[\]]*/gi;

function isVersionPart(part: string): boolean {
  const words = part
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .split(/[\s-]+/)
    .map((word) => word.replace(/[^\p{L}\p{N}"]/gu, ""))
    .filter((word) => word !== "");
  return words.length > 0 && words.every((word) => VERSION_WORDS.has(word) || /^\d{4}$/.test(word) || /^\d+"$/.test(word));
}

/** Wat er van de inhoud van een groep overblijft: null als de hele groep weg moet. */
function cleanGroup(content: string): string | null {
  if (FEATURING_GROUP.test(content)) return null;
  const pieces = content.split(/\s*[;,]\s*|\s+\/\s+/);
  const kept = pieces.filter((piece) => !isVersionPart(piece));
  if (kept.length === 0) return null;
  if (kept.length === pieces.length) return content;
  const separator = content.match(/[;,]|\s\/\s/)?.[0].trim() ?? ";";
  return kept.join(separator === "/" ? " / " : `${separator} `);
}

/** De titel zonder generieke versie-aanduidingen en featuring. */
export function cleanTitle(title: string): string {
  const cleaned = title.replace(LOOSE_FEATURING, " ").replace(GROUP, (match, content: string) => {
    const kept = cleanGroup(content);
    return kept === null ? "" : match.replace(content, kept);
  });
  return cleaned.replace(/\s+/g, " ").replace(/\s*[-–]\s*$/, "").trim();
}

/** De titel in de vorm van `dkj_file` na de artiesten ("Levels - Radio Edit" -> "Levels (Radio Edit)").
 *  Tot 27 september 2026 was dit ook `dkj_title`; refreshTitles() herkent die oude waarden eraan. */
export function versionedTitleOf(title: string | null): string | null {
  if (!title || title.trim() === "") return null;
  return fileTitle(title).replace(/\s+/g, " ").trim() || null;
}

/** `dkj_title` voor een track: alleen de titel, zonder generieke versie-aanduiding en featuring (zie
 *  boven), of null zonder titel. Geen bestandsnaam, dus de tekens die Windows niet toestaat blijven
 *  staan. Blijft er niets over, dan de titel met versie. */
export function titleNameOf(title: string | null): string | null {
  const versioned = versionedTitleOf(title);
  if (versioned === null) return null;
  return cleanTitle(versioned) || versioned;
}

/** `dkj_file` voor een track, of null zonder titel. */
export function fileNameOf(title: string | null, artists: readonly string[]): string | null {
  if (!title || title.trim() === "") return null;
  const who = joinArtists(fileArtists(title, artists));
  const name = who ? `${who} - ${fileTitle(title)}` : fileTitle(title);
  return safeFileName(name) || null;
}
