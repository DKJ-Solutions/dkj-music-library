// LIVE-VARIANTEN: een live-opname is geen eigen nummer in de collectie.
//
// De regel (Dave, 27 september 2026): er komt nooit een live-variant in de collectie. Een live-opname
// telt als hetzelfde nummer als de studioversie: hij krijgt hetzelfde dkj_track_id, en de rij houdt de
// titel en de Spotify-gegevens van de studioversie. Staat alleen de live-opname in je playlists, dan
// blijft het nummer bestaan, maar onder de schone titel ("About A Girl" in plaats van
// "About A Girl - Live").
//
// Live herken je alleen aan de TITEL, niet aan het album: een album als "I Live, I Learn" is niet live.
// Twee vormen, zoals Spotify ze schrijft:
//   - een stuk na " - " (of " – ") met het woord live erin: "Clocks - Live",
//     "Layla - Acoustic; Live at MTV Unplugged, ...", "Mess of Me - Live [Bonus Track]". Dat stuk valt
//     weg, en alles erachter ook: Spotify zet de datum van de opname als eigen stuk achter het live-stuk
//     ("Neon - Live at the Nokia Theatre, ... - December 2007"). Wat ervoor staat, blijft
//     ("Song - Radio Edit - Live" -> "Song - Radio Edit");
//   - een stuk tussen ( ) of [ ] met live erin, maar niet aan het begin van de titel: "Alive (Live)" ->
//     "Alive", terwijl "(Can't Live Without Your) Love And Affection" blijft zoals het is.
// Live in de titel zelf telt niet: "Live Forever", "Live Is Life" en "Played-A-Live" zijn gewoon titels.
//
// Pure module: geen fs, geen sqlite.

/** Scheidt de titel van een versiestuk: " - " of " – ". */
const SEGMENT_SEPARATOR = /(\s[-–]\s)/;

const LIVE_WORD = /\blive\b/i;

/** Een stuk tussen haakjes met live erin, met de spaties ervoor. */
const LIVE_BRACKET = /\s*[([][^()[\]]*\blive\b[^()[\]]*[)\]]/gi;

/** De titel zonder live-aanduiding. Een titel zonder live-aanduiding komt ongewijzigd terug, en ook een
 *  titel die anders leeg zou worden. */
export function studioTitleOf(title: string): string {
  const [first, ...rest] = title.split(SEGMENT_SEPARATOR);
  let kept = first;
  for (let i = 0; i < rest.length; i += 2) {
    const [separator, segment] = [rest[i], rest[i + 1]];
    if (LIVE_WORD.test(segment)) break;
    kept += separator + segment;
  }
  // Niet aan het begin: daar is een haakje deel van de titel zelf.
  const lead = /^\s*[([][^()[\]]*[)\]]/.exec(kept)?.[0] ?? "";
  const cleaned = (lead + kept.slice(lead.length).replace(LIVE_BRACKET, "")).trim();
  return cleaned === "" ? title : cleaned;
}

/** Of de titel een live-variant aanduidt. */
export function isLiveTitle(title: string): boolean {
  return studioTitleOf(title) !== title.trim();
}
