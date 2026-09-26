// Same-origin-guard voor state-wijzigende POST-routes (CSRF-verdediging). Deze app heeft geen
// aparte CSRF-token-laag (geen sessie-cookies buiten de korte-levensduur OAuth-state-cookie, zie
// api/auth/login/spotify/route.ts) -- in plaats daarvan controleert deze guard of de aanvraag
// daadwerkelijk van dezelfde origin komt, via headers die de browser zelf meestuurt en een pagina
// niet kan vervalsen. Gedeeld door de drie state-wijzigende POST-routes: /api/spotify/sync,
// /api/spotify/done, /api/auth/logout/spotify.
//
// Volgorde: `Sec-Fetch-Site` (door alle courante browsers gestuurd op vrijwel elke request) weegt
// het zwaarst -- "same-origin" of "none" (rechtstreekse navigatie/geen pagina die 'm initieert,
// bv. een lokale `curl -X POST`, zie sync/route.ts se eigen documentatie-comment) mag door, elke
// andere waarde ("cross-site", "same-site") wordt geweigerd. Ontbreekt die header (oudere
// browser, of een niet-browser-client), dan valt de guard terug op een Origin-vergelijking.
// Sturen beide headers niets mee, dan laat de guard het verzoek door -- dit is defense-in-depth
// tegen browser-gedreven CSRF, geen vervanging voor een echte auth-laag (die hier los al bestaat
// via de OAuth-tokens).
import { NextResponse } from "next/server";

export function sameOriginGuard(request: Request): NextResponse | null {
  const secFetchSite = request.headers.get("sec-fetch-site");
  if (secFetchSite) {
    return secFetchSite === "same-origin" || secFetchSite === "none" ? null : forbidden();
  }

  const origin = request.headers.get("origin");
  if (origin) {
    const requestOrigin = new URL(request.url).origin;
    return origin === requestOrigin ? null : forbidden();
  }

  return null;
}

function forbidden(): NextResponse {
  return NextResponse.json(
    { error: "cross_origin_forbidden", message: "Aanvraag geweigerd: niet same-origin." },
    { status: 403 }
  );
}
