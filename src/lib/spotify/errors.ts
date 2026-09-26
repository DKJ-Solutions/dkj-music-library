// Eigen foutklassen voor de Spotify-integratie. Route handlers en de token-laag onderscheiden
// hiermee "configuratie ontbreekt" / "opnieuw inloggen nodig" / "token-endpoint gaf iets
// onverwachts terug" -- zodat elk geval zijn eigen, nette afhandeling krijgt in plaats van één
// generieke 500.

export class SpotifyConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SpotifyConfigError";
  }
}

// Gegooid wanneer de refresh token niet meer geldig is: verlopen na de 6-maanden-limiet (zie het
// dossier, §6) of ingetrokken. Dit is een verwachte levenscyclus, geen bug -- de aanroeper moet
// dit opvangen met een nette "log opnieuw in bij Spotify"-melding: geen silent failure, geen
// oneindige retry.
export class SpotifyReauthRequiredError extends Error {
  constructor(message = "Spotify-sessie verlopen of nog niet verbonden -- log opnieuw in.") {
    super(message);
    this.name = "SpotifyReauthRequiredError";
  }
}

export class SpotifyTokenExchangeError extends Error {
  public readonly status: number;
  public readonly body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "SpotifyTokenExchangeError";
    this.status = status;
    this.body = body;
  }
}

// Fase 3: gegooid door de rate-limit-bewuste fetch-wrapper (httpClient.ts) bij een niet-2xx,
// niet-429-respons van de Spotify Web API (429 wordt daar zelf afgehandeld via Retry-After, geen
// error). Dezelfde vorm als SpotifyTokenExchangeError, maar apart benoemd zodat de ingest-laag en
// de token-laag elk hun eigen foutklasse hebben.
export class SpotifyApiError extends Error {
  public readonly status: number;
  public readonly body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "SpotifyApiError";
    this.status = status;
    this.body = body;
  }
}

/** Spotify's ÉIGEN uitleg uit een foutlichaam, of `null` als er geen leesbare boodschap in zit.
 *
 *  WAAROM DIT BESTAAT (Dave, 2026-07-25). Bij 48 mislukte schrijfacties meldde de hub *"waarschijnlijk
 *  geen playlist van jezelf"* -- een gok van onszelf. Spotify had iets veel bruikbaarders gezegd:
 *  *"The user is not registered for this application."* (de Development-Mode-allowlist). Die boodschap
 *  ging tweemaal verloren: de route verving hem door de gok, en het lichaam was al eerder weggegooid
 *  omdat dit antwoord **platte tekst** was en er `res.json()` op werd gedaan. Wie het beter weet dan de
 *  bron, stuurt de lezer de verkeerde kant op.
 *
 *  De vormen die Spotify gebruikt, en die hier alle drie worden gelezen:
 *   1. `{ "error": { "status": 403, "message": "..." } }`  -- het standaard Web API-foutobject;
 *   2. `{ "error": "invalid_grant", "error_description": "..." }` -- de auth-endpoints;
 *   3. platte tekst -- o.a. bij "The user is not registered for this application."
 */
export function spotifyErrorMessage(body: unknown): string | null {
  if (typeof body === "string") {
    const tekst = body.trim();
    return tekst === "" ? null : tekst;
  }
  if (typeof body !== "object" || body === null) return null;

  const record = body as Record<string, unknown>;

  // Vorm 1: het geneste foutobject van de Web API.
  const genest = record.error;
  if (typeof genest === "object" && genest !== null) {
    const message = (genest as Record<string, unknown>).message;
    if (typeof message === "string" && message.trim() !== "") return message.trim();
  }

  // Vorm 2: de auth-stijl. `error_description` is de leesbare kant; `error` is de code, en die is
  // beter dan niets als de omschrijving ontbreekt.
  const omschrijving = record.error_description;
  if (typeof omschrijving === "string" && omschrijving.trim() !== "") return omschrijving.trim();
  if (typeof genest === "string" && genest.trim() !== "") return genest.trim();

  return null;
}
