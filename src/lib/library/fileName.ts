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

/** `dkj_title` voor een track: alleen de titel, in dezelfde vorm als in `dkj_file` na de artiesten
 *  ("Levels - Radio Edit" -> "Levels (Radio Edit)"), of null zonder titel. Geen bestandsnaam, dus de
 *  tekens die Windows niet toestaat blijven staan. */
export function titleNameOf(title: string | null): string | null {
  if (!title || title.trim() === "") return null;
  return fileTitle(title).replace(/\s+/g, " ").trim() || null;
}

/** `dkj_file` voor een track, of null zonder titel. */
export function fileNameOf(title: string | null, artists: readonly string[]): string | null {
  if (!title || title.trim() === "") return null;
  const who = joinArtists(fileArtists(title, artists));
  const name = who ? `${who} - ${fileTitle(title)}` : fileTitle(title);
  return safeFileName(name) || null;
}
