// De Playlists-hub op /spotify/playlists, een laag onder /spotify: één grid met een card per
// playlist-pagina, in de vorm van de Spotify-hub. Server Component: leest de verrijkte playlists
// (fase 4) alleen om de wereld-cards hun aantal playlists als onderschrift te geven; de cards zelf staan
// in components/spotify/playlistCards.ts, want /spotify toont dezelfde.
import { PageCardGrid } from "@/components/PageCardGrid";
import { playlistCards } from "@/components/spotify/playlistCards";
import { pageTitle } from "@/lib/pages";

export const dynamic = "force-dynamic";

export default function PlaylistsHubPage() {
  return (
    <main className="wrap">
      <header className="masthead">
        <h1>{pageTitle("/spotify/playlists")}</h1>
      </header>

      <section className="layer">
        <PageCardGrid cards={playlistCards()} />
      </section>
    </main>
  );
}
