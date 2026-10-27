// Planned op /mixen/planned: de plek voor de mixen die nog op djcylow.com moeten verschijnen. Eén grid met
// een card-link per albumkleur (lib/mixes/plannedColours.ts), zelfde vorm als de hub op /mixen, met een
// stip in die kleur op de plek van het icoon. Elke card drilt door naar /mixen/planned/<kleur>. De card
// ernaartoe staat op de hub /mixen, naast Published.
import { PageCardGrid, type PageCard } from "@/components/PageCardGrid";
import { PLANNED_COLOURS, plannedColourHref } from "@/lib/mixes/plannedColours";
import { pageTitle } from "@/lib/pages";

const CARDS: PageCard[] = PLANNED_COLOURS.map((colour) => ({
  href: plannedColourHref(colour),
  icon: "disc",
  dot: colour.toLowerCase(),
  label: pageTitle(plannedColourHref(colour)),
  sub: `De geplande ${colour}-mixen`,
}));

export default function MixenPlannedPage() {
  return (
    <main className="wrap">
      <header className="masthead">
        <p className="kicker">dkj-music-library · Mixen</p>
        <h1>{pageTitle("/mixen/planned")}</h1>
      </header>

      <section className="layer">
        <PageCardGrid cards={CARDS} />
      </section>
    </main>
  );
}
