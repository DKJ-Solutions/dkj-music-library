// Een grid van card-links, in de vorm van de hub uit de huisstijl ("Page patterns", "The hub"): één
// .grid-3 met een .card.card--link per pagina. Gedeeld door de homepagina (alleen de Spotify-card) en
// /spotify (de pagina's daaronder). Elke card draagt een icoon vóór het label, net als de cards op de
// hub: een lijn-icoon van 24px in currentColor, als .menu-item__icon.
import type { ReactNode } from "react";
import Link from "next/link";

// De lijnen per icoon, in dezelfde tekenstijl als de hub (viewBox 24, stroke 2, ronde uiteinden).
const ICONS = {
  music: (
    <>
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </>
  ),
  list: <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />,
  table: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18M3 15h18M9 3v18" />
    </>
  ),
  chart: <path d="M3 3v18h18M8 17v-6M13 17V7M18 17v-4" />,
  palette: (
    <>
      <path d="M12 3a9 9 0 1 0 0 18c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.3 0-1.1.9-2 2-2h2.4A4.6 4.6 0 0 0 21 9.8C21 6 17 3 12 3z" />
      <circle cx="7.5" cy="11" r="1" />
      <circle cx="10" cy="7" r="1" />
      <circle cx="15" cy="7" r="1" />
    </>
  ),
  disc: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  lock: (
    <>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </>
  ),
  link: (
    <>
      <path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" />
      <path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20a6 6 0 0 1 12 0M16 5a3 3 0 0 1 0 6M21 20a6 6 0 0 0-4-5.6" />
    </>
  ),
  star: <path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9z" />,
  plug: <path d="M9 2v6M15 2v6M6 8h12v3a6 6 0 0 1-12 0zM12 17v5" />,
  calendar: (
    <>
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M3 10h18M8 2v4M16 2v4" />
    </>
  ),
  compare: <path d="M7 4L3 8l4 4M3 8h14M17 12l4 4-4 4M21 16H7" />,
  monitor: (
    <>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </>
  ),
} satisfies Record<string, ReactNode>;

export type PageIcon = keyof typeof ICONS;

export interface PageCard {
  href: string;
  label: string;
  sub: string;
  icon: PageIcon;
  /** Een kleur van de eigen albums ("cyan"): dan staat er een stip in die kleur op de plek van het icoon
   *  (components/_colour-cards.scss), zoals op /mixen/planned. */
  dot?: string;
  /** Een afbeelding-URL (de vierkante thumbnail van een mix): dan staat die op de plek van het icoon
   *  (components/_colour-cards.scss), zoals op /mixen/published. */
  image?: string;
}

export function PageCardGrid({ cards }: { cards: PageCard[] }) {
  return (
    <div className="grid-3">
      {cards.map((card) => (
        <section key={card.href} className={card.image ? "card card--link thumb-card" : "card card--link"}>
          <nav className="menu-list" aria-label={card.label}>
            <Link className="menu-item" href={card.href}>
              {card.image ? (
                // eslint-disable-next-line @next/next/no-img-element -- een lokale route, geen next/image-bron
                <img className="menu-item__icon card-thumb" src={card.image} width={40} height={40} alt="" />
              ) : card.dot ? (
                <span className="menu-item__icon colour-dot" data-color={card.dot} aria-hidden="true" />
              ) : (
                <svg
                  className="menu-item__icon"
                  viewBox="0 0 24 24"
                  width="24"
                  height="24"
                  aria-hidden="true"
                  focusable="false"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {ICONS[card.icon]}
                </svg>
              )}
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
