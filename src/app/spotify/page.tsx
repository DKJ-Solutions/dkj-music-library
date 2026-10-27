// De Spotify-hub op /spotify: één grid met een card per pagina eronder, en verder niets. Server
// Component: leest de tokens (OAuth-status) en de verrijkte playlists (fase 4) alleen om de cards een
// actueel onderschrift te geven -- de wereld-cards hun aantal playlists, de verbinding-card of er een
// koppeling is. De verbinding zelf (status, login/logout, sync) staat sinds de cards op
// /spotify/verbinding, de playlist manager op /spotify/playlists.
import { readTokens } from "@/lib/spotify/tokenStore";
import { getEnrichedSnapshot } from "@/lib/spotify/enrichedPlaylists";
import { countByWorld } from "@/lib/spotify/playlistFilters";
import { SPOTIFY_WORLDS, WORLD_META } from "@/lib/spotify/classifyWorld";
import { PageCardGrid, type PageCard } from "@/components/PageCardGrid";
import { pageTitle } from "@/lib/pages";

export const dynamic = "force-dynamic";

// De pagina's onder /spotify, als card-links (stonden eerder op de homepagina). Ze hangen niet af van
// een snapshot: het register leest de bibliotheek uit git, dus deze links horen ook zichtbaar te
// zijn op een machine die nog nooit gesynct heeft.
const PAGE_CARDS: PageCard[] = [
  {
    href: "/spotify/playlists",
    label: pageTitle("/spotify/playlists"),
    sub: "Alle playlists, met filteren, groeperen en cross-playlist zoeken",
  },
  {
    href: "/spotify/trackregister",
    label: pageTitle("/spotify/trackregister"),
    sub: "Elke track met zijn eigen velden, te filteren op BPM en album",
  },
  {
    href: "/spotify/dashboard",
    label: pageTitle("/spotify/dashboard"),
    sub: "Dedup, top-artiesten en verdelingen over de hele bibliotheek",
  },
  {
    href: "/spotify/musicmoodcolours",
    label: pageTitle("/spotify/musicmoodcolours"),
    sub: "De genummerde House- en Drum & Bass-mixen, per BPM",
  },
  {
    href: "/spotify/djcylow",
    label: pageTitle("/spotify/djcylow"),
    sub: "Het DJ-werk: Feestzaal-fases, gigs en compilaties",
  },
  {
    href: "/spotify/prive",
    label: pageTitle("/spotify/prive"),
    sub: "Persoonlijke lijsten en playlists die je alleen volgt",
  },
  {
    href: "/spotify/musicmoodcolours/mixen",
    label: pageTitle("/spotify/musicmoodcolours/mixen"),
    sub: "De mixen van de DJ Cylow-website naast de MMC-playlists",
  },
  {
    href: "/spotify/maple-classic",
    label: pageTitle("/spotify/maple-classic"),
    sub: "De gedeelde playlist als tabel",
  },
  {
    href: "/spotify/classic-pop",
    label: pageTitle("/spotify/classic-pop"),
    sub: "Elk Classic Pop-nummer één keer, met de playlists waarin het staat",
  },
  {
    href: "/spotify/verbinding",
    label: pageTitle("/spotify/verbinding"),
    sub: "Inloggen bij Spotify en de back-up syncen",
  },
];

export default function SpotifyHubPage() {
  const connected = readTokens() !== null;
  const enriched = getEnrichedSnapshot();
  const worldCounts = enriched ? countByWorld(enriched.playlists) : null;
  // Elke pagina staat één keer op deze pagina: als card. De wereld-cards dragen hun aantal playlists
  // zodra er een snapshot is, de verbinding-card of er een koppeling met Spotify is.
  const cards = PAGE_CARDS.map((card) => {
    if (card.href === "/spotify/verbinding") {
      return { ...card, sub: `${card.sub} · ${connected ? "verbonden" : "niet verbonden"}` };
    }
    const world = SPOTIFY_WORLDS.find((w) => WORLD_META[w].href === card.href);
    return world && worldCounts ? { ...card, sub: `${card.sub} · ${worldCounts[world]} playlists` } : card;
  });

  return (
    <main className="wrap">
      <header className="masthead">
        <p className="kicker">dkj-music-library · Spotify</p>
        <h1>{pageTitle("/spotify")}</h1>
      </header>

      <section className="layer">
        <PageCardGrid cards={cards} />
      </section>
    </main>
  );
}
