// Planned op /mixen/planned: de plek voor de mixen die nog op djcylow.com moeten verschijnen. Er is nog
// geen bron voor geplande mixen; de pagina toont alvast een card per albumkleur, in dezelfde vorm als de
// cards van PageCardGrid, met een stip in die kleur op de plek van het icoon (components/_colour-cards.scss).
// Nog geen link en dus geen chevron: er is per kleur nog geen pagina. De card ernaartoe staat op de hub
// /mixen, naast Published.
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
            <section key={colour} className="card">
              <div className="menu-item">
                <span className="menu-item__icon colour-dot" data-color={colour.toLowerCase()} aria-hidden="true" />
                <span className="menu-item__label">{colour}</span>
              </div>
            </section>
          ))}
        </div>
      </section>
    </main>
  );
}
