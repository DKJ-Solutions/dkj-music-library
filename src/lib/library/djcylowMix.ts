// Een mix in `djcylow_mix`, en de link naar zijn pagina op djcylow.com. Apart van djcylowMixes.ts, dat
// de database gebruikt: dit deel moet ook in de browser kunnen (TrackRegister.tsx).
//
// Pure module: geen fs, geen sqlite.

export interface DjcylowMixLink {
  /** De slug van de mixpagina (Mix.slug in mixes/types.ts). */
  slug: string;
  /** De titel van de mix op de website, bv. "Tech House Mix · Red Light (m) · Vol. 1". */
  name: string;
}

/** De link naar een mix op djcylow.com (de route /luister/mix/[slug] in djcylow-react). */
export function mixUrl(slug: string): string {
  return `https://djcylow.com/luister/mix/${encodeURIComponent(slug)}`;
}
