// De Spotify-speler voor één track (embed-iframe), voor de afspeelknop in TrackRegister.tsx. Geen
// OAuth-scope nodig: de embed speelt de hele track als je in dezelfde browser bij Spotify bent ingelogd,
// anders een fragment van 30 seconden.
//
// Pure module: geen fs, geen sqlite.

/** De embed-URL van een track op Spotify. */
export function trackEmbedUrl(spotifyTrackId: string): string {
  return `https://open.spotify.com/embed/track/${encodeURIComponent(spotifyTrackId)}`;
}
