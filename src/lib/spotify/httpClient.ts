// Rate-limit-bewuste GET-wrapper voor de Spotify Web API (zie het dossier, §3: rolling
// 30s-window, 429 + Retry-After in seconden, geen vast plafond gepubliceerd). Voegt de
// Bearer-header toe via getValidAccessToken() (ververst zo nodig, gooit
// SpotifyReauthRequiredError door als re-auth nodig is -- die fout hier bewust NIET vangen, de
// aanroeper in de route handler toont de "log opnieuw in"-melding).
//
// Bewust GEEN write-methodes (POST/PUT/DELETE) -- dit project is en blijft read-only (zie de
// opdracht).
//
// SERVER-ONLY: importeert getValidAccessToken (fs via tokenStore), mag dus nooit vanuit een
// 'use client'-bestand gebruikt worden.

import { getValidAccessToken } from "./auth";
import { SpotifyApiError } from "./errors";

export const SPOTIFY_API_BASE = "https://api.spotify.com/v1";

// Bovengrens tegen een oneindige wachtlus als Spotify structureel 429 blijft geven -- beter een
// duidelijke fout dan een script dat voor altijd blijft hangen.
const MAX_RETRIES = 5;

export interface SpotifyFetchOptions {
  /** Override voor tests: eigen fetch-implementatie i.p.v. het globale fetch. */
  fetchImpl?: typeof fetch;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Het foutlichaam van een niet-2xx-respons, zonder het te verliezen.
 *
 *  EERST TEKST, DÁN JSON -- en die volgorde is het hele punt (Dave, 2026-07-25). Hier stond
 *  `res.json().catch(() => null)`, wat elk niet-JSON-antwoord in `null` veranderde. Spotify antwoordt
 *  echter niet altijd met JSON: op *"The user is not registered for this application."* stuurt hij platte
 *  tekst, en juist die boodschap was de enige die de oorzaak prijsgaf. Nu blijft hij bewaard: is het
 *  geldige JSON, dan het geparseerde object; is het dat niet, dan de rauwe tekst.
 *
 *  Levert `null` bij een lege body -- dan is er werkelijk niets gezegd. */
async function readErrorBody(res: Response): Promise<unknown> {
  const tekst = await res.text().catch(() => "");
  if (tekst.trim() === "") return null;
  try {
    return JSON.parse(tekst);
  } catch {
    return tekst;
  }
}

const SPOTIFY_API_HOST = new URL(SPOTIFY_API_BASE).host;

function buildUrl(
  pathOrUrl: string,
  params?: Record<string, string | number | undefined>
): URL {
  // `next`-links uit een paging-object zijn al volledige URL's (incl. query) -- die worden
  // ongewijzigd hergebruikt. Een eigen endpoint-pad krijgt de base-URL + de meegegeven params.
  const url = pathOrUrl.startsWith("http")
    ? new URL(pathOrUrl)
    : new URL(`${SPOTIFY_API_BASE}${pathOrUrl}`);

  // Defense-in-depth: een `next`-URL komt rechtstreeks uit Spotify's eigen respons, maar mocht
  // die ooit een andere host bevatten (corrupte/gemanipuleerde data), dan wordt hij hier geweigerd
  // -- het Bearer-token gaat nooit mee naar een niet-Spotify-host.
  if (url.host !== SPOTIFY_API_HOST) {
    throw new SpotifyApiError(
      `Onverwachte host in een Spotify-URL: '${url.host}' (verwacht '${SPOTIFY_API_HOST}') -- geweigerd, het Bearer-token wordt hier niet naartoe gestuurd.`,
      0,
      null
    );
  }

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }
  return url;
}

// Eén GET-aanvraag tegen de Spotify Web API, met automatische 429-afhandeling. Elke poging haalt
// opnieuw een geldig access token op (goedkoop: getValidAccessToken() ververst alleen als het
// echt nodig is), zodat een lange 429-wachttijd nooit tegen een inmiddels verlopen token aanloopt.
export async function spotifyGet<T>(
  pathOrUrl: string,
  params?: Record<string, string | number | undefined>,
  options: SpotifyFetchOptions = {}
): Promise<T> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const url = buildUrl(pathOrUrl, params);

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const accessToken = await getValidAccessToken();
    const res = await fetchImpl(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (res.status === 429) {
      const retryAfterHeader = res.headers.get("Retry-After");
      const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) : 1;
      const waitSeconds = Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0 ? retryAfterSeconds : 1;
      console.warn(
        `[spotify/httpClient] 429 op ${url.pathname} -- wacht ${waitSeconds}s (Retry-After), poging ${attempt + 1}/${MAX_RETRIES + 1}`
      );
      await sleep(waitSeconds * 1000);
      continue;
    }

    if (!res.ok) {
      const body = await readErrorBody(res);
      throw new SpotifyApiError(
        `Spotify API gaf ${res.status} terug op ${url.pathname}`,
        res.status,
        body
      );
    }

    return (await res.json()) as T;
  }

  throw new SpotifyApiError(
    `Spotify API bleef 429 (rate limit) geven op ${url.pathname} na ${MAX_RETRIES} pogingen`,
    429,
    null
  );
}

/** Eén PUT-aanvraag met een JSON-body. Zelfde 429-afhandeling en token-verversing als `spotifyGet`.
 *
 *  Levert niets terug: de endpoints die de hub schrijft (`PUT /playlists/{id}`) antwoorden met 200 en een
 *  lege body, en `res.json()` zou daarop klappen. Een fout komt als `SpotifyApiError` naar boven.
 *
 *  DIT IS DE ENIGE SCHRIJFWEG NAAR SPOTIFY in deze codebase (zie de scope-toelichting in config.ts).
 *  Wie hier een tweede aanroeper aan toevoegt, verbreedt daarmee wat de hub feitelijk mag doen -- dat
 *  hoort een bewuste keuze te zijn, niet een bijkomstigheid. */
export async function spotifyPut(
  path: string,
  body: unknown,
  options: SpotifyFetchOptions = {}
): Promise<void> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const url = buildUrl(path);

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const accessToken = await getValidAccessToken();
    const res = await fetchImpl(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (res.status === 429) {
      const retryAfterHeader = res.headers.get("Retry-After");
      const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) : 1;
      const waitSeconds = Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0 ? retryAfterSeconds : 1;
      console.warn(
        `[spotify/httpClient] 429 op PUT ${url.pathname} -- wacht ${waitSeconds}s (Retry-After), poging ${attempt + 1}/${MAX_RETRIES + 1}`
      );
      await sleep(waitSeconds * 1000);
      continue;
    }

    if (!res.ok) {
      const errorBody = await readErrorBody(res);
      throw new SpotifyApiError(
        `Spotify API gaf ${res.status} terug op PUT ${url.pathname}`,
        res.status,
        errorBody
      );
    }

    return;
  }

  throw new SpotifyApiError(
    `Spotify API bleef 429 (rate limit) geven op PUT ${url.pathname} na ${MAX_RETRIES} pogingen`,
    429,
    null
  );
}

export interface SpotifyPagingObject<T> {
  items: T[];
  next: string | null;
  offset: number;
  limit: number;
  total: number;
}

const PAGE_LIMIT = 50; // maximum dat de Spotify Web API toestaat op deze endpoints

// Loopt alle pagina's van een `GET`-paging-endpoint af (bv. /me/playlists,
// /playlists/{id}/items) en verzamelt de items. Sequentieel per playlist/endpoint -- de
// concurrency-cap tussen playlists onderling zit in ingest.ts, niet hier.
export async function fetchAllPages<T>(
  path: string,
  params: Record<string, string | number | undefined> = {},
  options: SpotifyFetchOptions = {}
): Promise<T[]> {
  const items: T[] = [];
  let nextUrl: string | null = null;
  let offset = 0;

  do {
    const page: SpotifyPagingObject<T> = nextUrl
      ? await spotifyGet<SpotifyPagingObject<T>>(nextUrl, undefined, options)
      : await spotifyGet<SpotifyPagingObject<T>>(path, { ...params, limit: PAGE_LIMIT, offset }, options);

    items.push(...page.items);
    nextUrl = page.next;
    offset += PAGE_LIMIT;
  } while (nextUrl);

  return items;
}
