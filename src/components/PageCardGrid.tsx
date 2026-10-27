// Een grid van card-links, in de vorm van de hub uit de huisstijl ("Page patterns", "The hub"): één
// .grid-3 met een .card.card--link per pagina. Gedeeld door de homepagina (alleen de Spotify-card) en
// /spotify (de pagina's daaronder).
import Link from "next/link";

export interface PageCard {
  href: string;
  label: string;
  sub: string;
}

export function PageCardGrid({ cards }: { cards: PageCard[] }) {
  return (
    <div className="grid-3">
      {cards.map((card) => (
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
  );
}
