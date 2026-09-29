// Same-origin-guard voor state-wijzigende POST-routes (CSRF-verdediging). Deze app heeft geen
// aparte CSRF-token-laag (geen sessie-cookies buiten de korte-levensduur OAuth-state-cookie, zie
// api/auth/login/spotify/route.ts) -- in plaats daarvan controleert deze guard of de aanvraag
// daadwerkelijk van dezelfde origin komt, via headers die de browser zelf meestuurt en een pagina
// niet kan vervalsen. Gedeeld door elke state-wijzigende POST-route: /api/spotify/sync, done, bpm,
// world, mix-tag, playlist-name en rating, en /api/auth/logout/spotify.
//
// Volgorde: `Sec-Fetch-Site` (door alle courante browsers gestuurd op vrijwel elke request) weegt
// het zwaarst -- "same-origin" of "none" (rechtstreekse navigatie/geen pagina die 'm initieert,
// bv. een lokale `curl -X POST`, zie sync/route.ts se eigen documentatie-comment) mag door, elke
// andere waarde ("cross-site", "same-site") wordt geweigerd. Ontbreekt die header (oudere
// browser, of een niet-browser-client), dan valt de guard terug op een Origin-vergelijking.
// Sturen beide headers niets mee, dan laat de guard het verzoek door -- dit is defense-in-depth
// tegen browser-gedreven CSRF, geen vervanging voor een echte auth-laag (die hier los al bestaat
// via de OAuth-tokens).
//
// De Origin wordt vergeleken met de `Host`-header, niet met `request.url`: Next dev bouwt die URL altijd
// als `localhost:3000`, hoe de app ook geopend is. Op het LAN-adres (http://192.168.178.123:3000) stuurt
// de browser geen `Sec-Fetch-Site` -- dat doet hij alleen op een beveiligde origin, en 127.0.0.1 is dat
// wel, een LAN-adres over http niet -- dus viel elke knop daar op deze vergelijking terug en werd hij
// geweigerd (28 september 2026). De Host-header is wat de browser werkelijk aansprak.
import { NextResponse } from "next/server";

export function sameOriginGuard(request: Request): NextResponse | null {
  const secFetchSite = request.headers.get("sec-fetch-site");
  if (secFetchSite) {
    return secFetchSite === "same-origin" || secFetchSite === "none" ? null : forbidden();
  }

  const origin = request.headers.get("origin");
  if (origin) {
    const host = request.headers.get("host") ?? new URL(request.url).host;
    return hostOf(origin) === host ? null : forbidden();
  }

  return null;
}

function hostOf(origin: string): string | null {
  try {
    return new URL(origin).host;
  } catch {
    return null; // "null" of iets anders onleesbaars: nooit gelijk aan een host
  }
}

function forbidden(): NextResponse {
  return NextResponse.json(
    { error: "cross_origin_forbidden", message: "Aanvraag geweigerd: niet same-origin." },
    { status: 403 }
  );
}
