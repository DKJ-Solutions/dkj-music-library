// De enige plek waar deze hub iets naar Spotify TERUGSCHRIJFT. Al het andere in src/lib/spotify/ leest
// alleen: de snapshot, de classificaties en de correctie-overrides blijven allemaal lokaal.
//
// Aanleiding (Dave, 2026-07-25): het mix-ID als `mix:YYYYMMDD` in de beschrijving van een eigen
// MMC-playlist zetten, zodat de brug op een harde sleutel kan koppelen i.p.v. op de tracklist-heuristiek
// (zie mixes/mixIdTag.ts). Daarvoor is de scope-set uitgebreid met playlist-modify-private/-public --
// zie de toelichting in config.ts.
//
// TWEE FUNCTIES, ELK MET ÉÉN VELD -- en dat is een bewuste grens, niet een toevalligheid van de
// implementatie. `PUT /playlists/{id}` kan naam, beschrijving én openbaarheid in één keer wijzigen; hier
// stuurt elke functie precies één van die velden mee, zodat een schrijfactie nooit meer verandert dan
// waar hij over gaat. `public` wordt door geen van beide meegestuurd: of een playlist openbaar is, is
// niets wat de mix-bron dicteert.
//
// DE NAAM IS ER OP 2026-08-11 BIJ GEKOMEN, en tot die dag stond hier letterlijk dat naam en
// openbaarheid buiten blijven "zodat de hub ze niet per ongeluk kan overschrijven". Dat gold zolang de
// hub geen enkele reden had om de naam te kennen. Sinds de mix-bron `title_spotify` draagt -- de exacte
// playlistnaam die bij een mix hoort -- is de naam wél een veld dat de bron dicteert, en heeft Dave
// gevraagd hem gelijk te trekken (2026-08-11). De grens is dus niet weggehaald maar verlegd, en waar hij
// nu ligt staat hieronder: de naam komt uit de bron, niet van een aanroeper die er zelf iets van maakt.
import { spotifyPut, type SpotifyFetchOptions } from "./httpClient";

/** Zet de beschrijving van één playlist. Alleen mogelijk voor playlists die de ingelogde gebruiker bezit
 *  (of die collaborative zijn) -- Spotify antwoordt anders met 403.
 *
 *  LET OP: dit VERVANGT de hele beschrijving. Wie de mix-velden wil zetten zonder de bestaande tekst te
 *  verliezen, bouwt de nieuwe waarde met `withMixDescription()` uit mixes/mixDescription.ts.
 *
 *  Spotify kapt de beschrijving af rond de 300 tekens; langere waarden worden hier geweigerd in plaats van
 *  stil ingekort, zodat een te lange tekst niet halverwege verdwijnt. */
export const PLAYLIST_DESCRIPTION_MAX = 300;

/** Spotify kapt een playlistNAAM af rond de 100 tekens -- zelfde afspraak als hierboven: langer wordt
 *  geweigerd in plaats van stil ingekort. Ter maat: de langste `title_spotify` in de mix-bron is nu ~40
 *  tekens, dus dit is een vangnet en geen dagelijkse grens. */
export const PLAYLIST_NAME_MAX = 100;

export async function updatePlaylistDescription(
  playlistId: string,
  description: string,
  options: SpotifyFetchOptions = {}
): Promise<void> {
  if (description.length > PLAYLIST_DESCRIPTION_MAX) {
    throw new Error(
      `Beschrijving is ${description.length} tekens; Spotify staat er ${PLAYLIST_DESCRIPTION_MAX} toe.`
    );
  }

  await spotifyPut(`/playlists/${encodeURIComponent(playlistId)}`, { description }, options);
}

/** Zet de NAAM van één playlist. Zelfde grenzen als de beschrijving hierboven: alleen mogelijk voor
 *  playlists die de ingelogde gebruiker bezit, en het is een volledige vervanging -- een playlistnaam
 *  heeft geen "beheerd blok" met vrije tekst eromheen, dus er valt hier niets te bewaren.
 *
 *  De naam hoort uit de mix-bron te komen (`title_spotify`, zie mixes/spotifyTitle.ts) en niet van een
 *  aanroeper die er zelf iets van samenstelt. Deze functie kan dat niet afdwingen -- ze ziet alleen een
 *  string -- dus doet de route dat, die de enige aanroeper is
 *  (`app/api/spotify/playlist-name/route.ts`).
 *
 *  Een LEGE naam wordt geweigerd. Spotify accepteert hem namelijk en de playlist wordt dan naamloos in de
 *  app; dat is precies het soort stille schade waar een lege string in een keten makkelijk toe leidt. */
export async function updatePlaylistName(
  playlistId: string,
  name: string,
  options: SpotifyFetchOptions = {}
): Promise<void> {
  if (name.trim() === "") {
    throw new Error("Een lege playlistnaam wordt niet naar Spotify geschreven.");
  }

  if (name.length > PLAYLIST_NAME_MAX) {
    throw new Error(`Naam is ${name.length} tekens; Spotify staat er ${PLAYLIST_NAME_MAX} toe.`);
  }

  await spotifyPut(`/playlists/${encodeURIComponent(playlistId)}`, { name }, options);
}
