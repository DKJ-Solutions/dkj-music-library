// De landingspagina van één kleur op /mixen/planned/<kleur>: de plek voor de geplande mixen in die kleur.
// Er is nog geen bron voor geplande mixen, dus de pagina staat er alvast met alleen een lege melding. De
// card ernaartoe staat op /mixen/planned.
import { notFound } from "next/navigation";
import { PLANNED_COLOURS, plannedColourHref, plannedColourOf } from "@/lib/mixes/plannedColours";
import { pageTitle } from "@/lib/pages";

export function generateStaticParams() {
  return PLANNED_COLOURS.map((colour) => ({ colour: colour.toLowerCase() }));
}

export default async function PlannedColourPage({ params }: { params: Promise<{ colour: string }> }) {
  const colour = plannedColourOf((await params).colour);
  if (!colour) notFound();

  return (
    <main className="page-column">
      <header className="masthead">
        <p className="kicker">dkj-music-library · Mixen · Planned</p>
        <h1>{pageTitle(plannedColourHref(colour))}</h1>
      </header>

      <section className="layer">
        <p className="empty-note">Nog geen geplande {colour}-mixen.</p>
      </section>
    </main>
  );
}
