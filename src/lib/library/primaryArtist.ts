// WIE ER IN `dkj_artist` KOMT: de ene artiest van een track.
//
// De regel (Dave, 27 september 2026): de artiest die de remix of edit maakte, gaat altijd voor. Verder
// is het de eerste artiest uit `artists`, de hoofdartiest volgens Spotify.
//
// Een remix of edit is te herkennen aan het versiedeel van de titel: het stuk na " - " of tussen haakjes
// waarin remix, edit, mix, rework, bootleg, flip, VIP, remake of dub staat ("Filmic - CRi Remix",
// "Maybe (Fred V & Grafix Remix)"). Staat een van de artiesten van de track in dat stuk, dan is die de
// remixer; bij meer dan één telt wie het eerst genoemd wordt ("PROFF & Igor Garanin Remix" -> PROFF).
//
// Alleen artiesten die Spotify bij de track noemt, tellen. Een naam die alleen in de titel staat, wordt
// niet overgenomen: in hetzelfde versiedeel staan net zo vaak stijlen ("Techno Mix", "Remastered Mix",
// "Disco Edit") als namen, en die zijn uit de titel alleen niet van elkaar te onderscheiden.
// "Radio Edit", "Original Mix" en "Extended Mix" noemen geen artiest, dus daar blijft de hoofdartiest staan.
//
// Pure module: geen fs, geen sqlite.

const VERSION_WORD = String.raw`(?:remix|edit|mix|rework|bootleg|flip|vip|remake|dub)`;

/** Een versiedeel: na " - " (of " – "), of tussen ( ) of [ ], met een versiewoord erin. */
const VERSION_PART = new RegExp(String.raw`(?:\s[-–]\s|[([])([^()[\]]*?\b${VERSION_WORD}\b[^()[\]]*)`, "gi");

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

/** Het laatste versiedeel van een titel, of null als de titel er geen heeft. */
export function versionPart(title: string): string | null {
  const parts = [...title.matchAll(VERSION_PART)].map((match) => match[1]);
  return parts.length > 0 ? parts[parts.length - 1] : null;
}

/** De remixer of editor van een track: de artiest die in het versiedeel van de titel het eerst staat. */
export function remixArtistOf(title: string, artists: readonly string[]): string | null {
  const part = versionPart(title);
  if (part === null) return null;
  const haystack = normalize(part);
  let best: { at: number; name: string } | null = null;
  for (const name of artists) {
    const needle = normalize(name);
    if (needle.trim() === "") continue;
    const at = haystack.indexOf(needle);
    if (at >= 0 && (best === null || at < best.at)) best = { at, name };
  }
  return best?.name ?? null;
}

/** `dkj_artist` voor een track: de remixer als die er is, anders de eerste artiest. */
export function primaryArtistOf(title: string | null, artists: readonly string[]): string | null {
  return (title ? remixArtistOf(title, artists) : null) ?? artists[0] ?? null;
}
