// Planned op /mixen/planned: de plek voor de mixen die nog op djcylow.com moeten verschijnen. Er is nog
// geen bron voor geplande mixen; de pagina toont alvast een card per albumkleur, met die kleur als
// achtergrond (components/_colour-cards.scss). De card ernaartoe staat op de hub /mixen, naast Published.
import { pageTitle } from "@/lib/pages";

// De volgorde zoals gevraagd (27 oktober 2026), niet die van DKJ_ALBUM_COLOURS.
const COLOURS = ["Cyan", "Yellow", "Blue", "Green", "Orange", "Magenta", "Red", "Purple"] as const;

export default function MixenPlannedPage() {
  return (
    <main className="wrap">
      <header className="masthead">
        <p className="kicker">dkj-music-library · Mixen</p>
        <h1>{pageTitle("/mixen/planned")}</h1>
      </header>

      <section className="layer">
        <div className="grid-3">
          {COLOURS.map((colour) => (
            <section key={colour} className="card colour-card" data-color={colour.toLowerCase()}>
              <h2 className="colour-card__title">{colour}</h2>
            </section>
          ))}
        </div>
      </section>
    </main>
  );
}
