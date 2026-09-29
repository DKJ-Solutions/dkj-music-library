// De Spotify-speler voor één track, voor de afspeelknop in TrackRegister.tsx. Geen OAuth-scope nodig: de
// embed speelt de hele track als je in dezelfde browser bij Spotify bent ingelogd, anders een fragment van
// 30 seconden.
//
// De speler komt uit Spotify's iFrame API (loadSpotifyIframeApi), en niet uit een kale <iframe>: alleen
// via de API kan de pagina de speler zelf starten, zodat één klik op de afspeelknop genoeg is (Dave). De
// kale embed-URL (trackEmbedUrl) blijft de terugval als het script van Spotify niet laadt.
//
// Geen fs, geen sqlite; loadSpotifyIframeApi raakt `window` en `document`, dus alleen in de browser.

export const SPOTIFY_IFRAME_API_URL = "https://open.spotify.com/embed/iframe-api/v1";

/** De embed-URL van een track op Spotify. */
export function trackEmbedUrl(spotifyTrackId: string): string {
  return `https://open.spotify.com/embed/track/${encodeURIComponent(spotifyTrackId)}`;
}

/** De Spotify-URI van een track, zoals de iFrame API hem wil. */
export function trackUri(spotifyTrackId: string): string {
  return `spotify:track:${spotifyTrackId}`;
}

/** Het deel van Spotify's EmbedController dat het register gebruikt. */
export interface SpotifyEmbedController {
  loadUri(uri: string): void;
  play(): void;
  destroy(): void;
  addListener(event: "ready", callback: () => void): void;
}

export interface SpotifyIframeApi {
  createController(
    element: HTMLElement,
    options: { uri: string; width?: string | number; height?: string | number },
    callback: (controller: SpotifyEmbedController) => void
  ): void;
}

declare global {
  interface Window {
    onSpotifyIframeApiReady?: (api: SpotifyIframeApi) => void;
  }
}

let pending: Promise<SpotifyIframeApi> | null = null;

/** Laadt Spotify's iFrame API één keer per pagina; elke volgende aanroep krijgt dezelfde belofte. Mislukt
 *  het laden, dan mag een volgende aanroep het opnieuw proberen. */
export function loadSpotifyIframeApi(): Promise<SpotifyIframeApi> {
  if (!pending) {
    pending = new Promise((resolve, reject) => {
      window.onSpotifyIframeApiReady = resolve;
      const script = document.createElement("script");
      script.src = SPOTIFY_IFRAME_API_URL;
      script.async = true;
      script.onerror = () => {
        pending = null;
        script.remove();
        reject(new Error("De iFrame API van Spotify laadt niet."));
      };
      document.body.appendChild(script);
    });
  }
  return pending;
}
