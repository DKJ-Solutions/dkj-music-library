// PC ↔ Spotify op /compare/pc-spotify: de plek waar de tracks op de pc naast de bibliotheek komen te
// staan. De koppeling loopt straks via `dkj_file` (de bestandsnaam zoals op de desktop, fields.ts), maar er
// is nog geen bron voor de pc-map, dus de pagina staat er alvast met alleen een lege melding. De card
// ernaartoe staat op de hub /compare, naast Playlists ↔ Mixes.
import { pageTitle } from "@/lib/pages";

export default function ComparePcSpotifyPage() {
  return (
    <main className="wrap">
      <header className="masthead">
        <p className="kicker">dkj-music-library · Compare</p>
        <h1>{pageTitle("/compare/pc-spotify")}</h1>
      </header>

      <section className="layer">
        <p className="empty-note">Nog geen pc-map gekoppeld.</p>
      </section>
    </main>
  );
}
