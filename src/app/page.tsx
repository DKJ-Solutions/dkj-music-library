// De homepagina: een grid van card-links, in de vorm van de hub uit de huisstijl ("Page patterns",
// "The hub"): de breadcrumb-balk met alleen Home, dan één .grid-3 met een .card.card--link per
// pagina, zonder kop erboven. De pagina's onder Spotify hebben hun card op /spotify zelf; komt de
// desktop-mirror erbij, dan krijgt die hier een eigen card.
import { PageCardGrid, type PageCard } from "@/components/PageCardGrid";

const CARDS: PageCard[] = [
  {
    href: "/spotify",
    label: "Spotify",
    sub: "Read-only back-up van je Spotify-playlists, met filteren, groeperen en zoeken",
  },
];

export default function Home() {
  return (
    <>
      <div className="breadcrumbs-bar">
        <div className="container">
          <nav className="breadcrumbs" aria-label="Kruimelpad">
            <ol>
              <li>
                <span aria-current="page">Home</span>
              </li>
            </ol>
          </nav>
        </div>
      </div>

      <main className="page-column">
        <PageCardGrid cards={CARDS} />
      </main>
    </>
  );
}
