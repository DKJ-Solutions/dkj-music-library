// Handmatig vastgezette jaren, per Spotify-track-id (issue #47): voor de paar tracks waarbij MusicBrainz
// zelf het jaar mis heeft. De vroegste-jaar-regel (zie spotify/playlistTableRows.ts en
// library/releaseYears.ts) laat één uitschieter in MusicBrainz' data het jaar te ver terugtrekken, en een
// strengere match helpt daar niet: het is dezelfde artiest, met een opname die MusicBrainz een te vroege
// `first-release-date` geeft. Een jaar hier WINT daarom van alle andere bronnen -- het doet niet mee in
// het minimum, want dan verloor het alsnog van dat te vroege jaar.
//
// Gewoon code in plaats van een bestand onder data/: data/musicbrainz/ is lokaal en niet gecommit (zie
// musicbrainz/cacheStore.ts), en deze lijst moet in elke kloon hetzelfde zijn. Alleen een jaar dat je
// ZEKER weet hoort hier -- een geraden jaar is precies de fout die deze lijst moet herstellen.

/** Spotify-track-id -> het juiste jaar, met de track en wat MusicBrainz ervan maakte als commentaar. */
export const RELEASE_YEAR_OVERRIDES: ReadonlyMap<string, number> = new Map([
  ["4aR9bPMAOFySBuQSbVWF3d", 2006], // Lily Allen - Smile; MusicBrainz: 1995
  ["2kUzt5LsTUR0ggquP7O3eN", 1979], // Status Quo - Whatever You Want; MusicBrainz: 1977
  ["6U7GUjtamt2P0LcFod1dBT", 2006], // Sérgio Mendes & Black Eyed Peas - Mas Que Nada (de remake op Timeless); MusicBrainz: 1985
]);
