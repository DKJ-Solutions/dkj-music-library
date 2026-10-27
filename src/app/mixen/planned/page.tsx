// Planned op /mixen/planned: de plek voor de mixen die nog op djcylow.com moeten verschijnen. Er is nog
// geen bron voor geplande mixen, dus de pagina staat er alvast met alleen een lege melding. De card
// ernaartoe staat op de hub /mixen, naast Published.
import { pageTitle } from "@/lib/pages";

export default function MixenPlannedPage() {
  return (
    <main className="wrap">
      <header className="masthead">
        <p className="kicker">dkj-music-library · Mixen</p>
        <h1>{pageTitle("/mixen/planned")}</h1>
      </header>

      <section className="layer">
        <p className="empty-note">Nog geen geplande mixen.</p>
      </section>
    </main>
  );
}
