// De rekenkundige kant van een uitgestelde volgorde (een "pending order"): een werkbak waarin je tracks
// verplaatst terwijl Spotify niet schrijven laat (rate limit). De volgorde wordt dan lokaal bewaard als een
// PERMUTATIE VAN INDICES in `playlist.tracks` van een bekende snapshot -- indices en geen track-ID's, zodat
// lokale bestanden, dubbele nummers en items zonder track gewoon kloppen.
//
// `order[p]` is de index (in de snapshot) van het item dat op getoonde plek p staat. De identiteit
// [0, 1, 2, …] is "niets verplaatst".
//
// Pure module: geen fs, geen React -- los te testen, en door de routes en de pagina te delen.
import type { PlaylistMove } from "./playlistOrder";

/** [0, 1, …, n-1]: de volgorde van de snapshot zelf. */
export function identityOrder(length: number): number[] {
  return Array.from({ length }, (_, i) => i);
}

/** Is `order` een permutatie van 0..length-1 (elke index precies één keer)? */
export function isPermutation(order: unknown, length: number): order is number[] {
  if (!Array.isArray(order) || order.length !== length) return false;
  const seen = new Array<boolean>(length).fill(false);
  for (const value of order) {
    if (!Number.isInteger(value) || value < 0 || value >= length || seen[value]) return false;
    seen[value] = true;
  }
  return true;
}

/** De lijst in de volgorde van `order`: het item op plek p is `list[order[p]]`. */
export function permuteBy<T>(list: readonly T[], order: readonly number[]): T[] {
  return order.map((index) => list[index]);
}

/** Eén Spotify-verplaatsing (`range_length` 1) toegepast op een lijst. `insertBefore` telt in de lijst zoals
 *  hij VÓÓR het weghalen is, net als bij Spotify (zie planPlaylistMove). Nieuwe array. */
export function applyMove<T>(list: readonly T[], move: PlaylistMove): T[] {
  const next = [...list];
  const [item] = next.splice(move.rangeStart, 1);
  next.splice(move.insertBefore > move.rangeStart ? move.insertBefore - 1 : move.insertBefore, 0, item);
  return next;
}

/** Is `live` dezelfde verzameling items als `desired` (zelfde ID's, zelfde aantallen, ongeacht volgorde)? */
export function sameMultiset(live: readonly (string | null)[], desired: readonly (string | null)[]): boolean {
  if (live.length !== desired.length) return false;
  const counts = new Map<string | null, number>();
  for (const id of live) counts.set(id, (counts.get(id) ?? 0) + 1);
  for (const id of desired) {
    const left = counts.get(id);
    if (!left) return false;
    counts.set(id, left - 1);
  }
  return true;
}

/** De verplaatsingen die de LIVE volgorde van Spotify in de GEWENSTE volgorde brengen, één voor één toe te
 *  passen (elke verplaatsing telt in de lijst zoals die er na de vorige uitziet), of null als de twee niet
 *  dezelfde items bevatten -- dan is er iets toegevoegd of weggehaald en is verplaatsen gokken.
 *
 *  Van voor naar achter: staat op plek i niet het gewenste item, dan wordt het eerste exemplaar daarvan
 *  verderop naar plek i gehaald (`insertBefore` = i). Plekken vóór i liggen dan vast, dus het kost hoogstens
 *  n-1 verplaatsingen, en alleen waar de volgorde echt afwijkt. Dubbele ID's en items zonder track (null)
 *  zijn onderling verwisselbaar, wat in de uitkomst niet te onderscheiden is. */
export function planSyncMoves(
  live: readonly (string | null)[],
  desired: readonly (string | null)[]
): PlaylistMove[] | null {
  if (!sameMultiset(live, desired)) return null;
  const working = [...live];
  const moves: PlaylistMove[] = [];
  for (let i = 0; i < desired.length; i++) {
    if (working[i] === desired[i]) continue;
    const from = working.indexOf(desired[i], i + 1);
    // Onbereikbaar zolang sameMultiset klopt; liever null dan een verplaatsing op een plek die niet bestaat.
    if (from < 0) return null;
    const move = { rangeStart: from, insertBefore: i };
    moves.push(move);
    working.splice(0, working.length, ...applyMove(working, move));
  }
  return moves;
}

/** "HH:MM" in de lokale tijd, voor in een melding of op de knop. */
export function formatClock(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
}
