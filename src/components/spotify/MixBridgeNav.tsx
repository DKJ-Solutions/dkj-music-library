// De ingang naar de brug-pagina, als extra sectie op /spotify/musicmoodcolours. Bewust een eigen
// component (en niet inline in de route) zodat musicmoodcolours/page.tsx het dunne schilletje blijft
// dat het is; hergebruikt het world-tile-idioom van de werelden-/BPM-tegels (_world-nav.scss).
//
// Géén cijfers op deze tegel: die zouden een tweede fs-read (de mix-JSON's + de koppeling over ~350
// playlists) op de MMC-pagina kosten voor informatie die één klik verder tóch volledig staat.
import Link from "next/link";

export function MixBridgeNav() {
  return (
    <section className="layer">
      <div className="band">
        <span className="eyebrow">Mixen ↔ playlists</span>
        <span className="rule"></span>
      </div>
      <p className="section-lede">
        De MMC-playlists horen een weerspiegeling te zijn van de mix-metadata van de DJ
        Cylow-website. Deze pagina legt beide bronnen naast elkaar -- gekoppeld op tracklist-inhoud,
        met de afwijkingen (geen eigen playlist, ander <code>Vol.</code>-nummer, ander trackaantal,
        andere BPM) erbij.
      </p>
      <div className="world-grid">
        <Link href="/spotify/musicmoodcolours/mixen" className="world-tile">
          <span className="emoji" aria-hidden="true">
            🎚️
          </span>
          <span className="label">Mixen ↔ playlists</span>
          <span className="count">→</span>
        </Link>
      </div>
    </section>
  );
}
