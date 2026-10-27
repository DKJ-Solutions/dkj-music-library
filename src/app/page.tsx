// De homepagina: een grid van card-links, in de vorm van de hub uit de huisstijl ("Page patterns",
// "The hub"): de breadcrumb-balk met alleen Home, dan één .grid-3 met een .card.card--link per
// mirror, zonder kop erboven. Komt de desktop-mirror erbij, dan krijgt die hier een eigen card.
import Link from "next/link";

interface HomeCard {
  href: string;
  label: string;
  sub: string;
}

const CARDS: HomeCard[] = [
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
        <div className="grid-3">
          {CARDS.map((card) => (
            <section key={card.href} className="card card--link">
              <nav className="menu-list" aria-label={card.label}>
                <Link className="menu-item" href={card.href}>
                  <span className="menu-item__label">
                    {card.label}
                    <span className="menu-item__sub">{card.sub}</span>
                  </span>
                  <svg
                    className="menu-item__chevron"
                    viewBox="0 0 24 24"
                    width="20"
                    height="20"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <path
                      d="M9 6l6 6-6 6"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </Link>
              </nav>
            </section>
          ))}
        </div>
      </main>
    </>
  );
}
