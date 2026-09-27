// De schrijfkant van de playlistbeschrijving: zet (of wist) de **spiegel van de mix-JSON** in de
// beschrijving van een Spotify-playlist -- `Tech House · Red Light (m) · Vol. 6 · 20260615`, zie
// mixes/mixDescription.ts voor het formaat.
//
// DIT IS EEN VAN DE TWEE ROUTES DIE NAAR SPOTIFY SCHRIJVEN, naast playlist-name (de naam). De andere
// schrijf-routes (world, bpm, done) raken uitsluitend lokale JSON-bestanden; deze verandert data in
// Dave's Spotify-account. Vandaar drie grenzen
// bovenop de gebruikelijke same-origin-guard:
//   1. alleen het `description`-veld gaat mee (zie playlistApi.ts) -- naam en openbaarheid blijven buiten;
//   2. **de client stuurt geen vrije tekst mee, alleen een mix-ID.** De nieuwe beschrijving wordt hier
//      opgebouwd uit twee server-side bronnen: de mix uit de JSON-bron (de velden) en de HUIDIGE
//      beschrijving uit de snapshot (zodat vrije tekst die Dave er zelf bij zette niet verdwijnt). Dat
//      de velden hier vandaan komen en niet van de client is de kern van deze grens: er is geen manier
//      om via deze route willekeurige tekst in een playlist te krijgen.
//   3. de playlist moet in de snapshot staan en van Dave zelf zijn -- een willekeurig playlist-id van
//      buiten kan hier dus niets wijzigen.
//
// POST -> { playlistId: string; mixId: string | null }
//         mixId: een 8-cijferig ID zet/vervangt de spiegel; `null` haalt hem weg.
//
// fs vereist de Node-runtime, niet de edge-runtime.
import { NextResponse } from "next/server";
import { withMixDescription, withoutMixDescription } from "@/lib/mixes/mixDescription";
import { readMixes } from "@/lib/mixes/mixStore";
import { isValidPlaylistId } from "@/lib/spotify/overrideSafety";
import { readSnapshot } from "@/lib/spotify/snapshotStore";
import { updatePlaylistDescription } from "@/lib/spotify/playlistApi";
import { SpotifyApiError, spotifyErrorMessage } from "@/lib/spotify/errors";
import { sameOriginGuard } from "@/lib/http/sameOrigin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Het ID-formaat uit de mix-JSON's: precies acht cijfers (`YYYYMMDD`). */
function isValidMixId(value: unknown): value is string {
  return typeof value === "string" && /^\d{8}$/.test(value);
}

/** Wat we zélf kunnen zeggen wanneer Spotify een fout geeft zónder uitleg -- alleen dán, want anders
 *  overschrijft een gok een feit.
 *
 *  Bij 403 worden bewust de drie werkelijke oorzaken genoemd in plaats van er één te kiezen. Spotify
 *  gebruikt die code namelijk voor alle drie, en eerder werd hier één ervan als dé verklaring
 *  gepresenteerd -- precies de fout die deze wijziging herstelt. */
function hintZonderUitleg(status: number): string {
  if (status === 403) {
    return (
      "Bij een 403 zijn er drie mogelijkheden: je account staat niet als gebruiker bij deze app " +
      "(Development Mode, max. 5 gebruikers -- Dashboard > Settings > User Management), het token mist " +
      "de schrijf-scope (log opnieuw in), of deze playlist is niet van jou."
    );
  }
  if (status === 401) return "Het token is niet (meer) geldig -- log opnieuw in bij Spotify.";
  return "Zie de serverconsole (het venster waarin `npm run dev` draait) voor de ruwe respons.";
}

export async function POST(request: Request) {
  const guard = sameOriginGuard(request);
  if (guard) return guard;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json(
      { error: "invalid_body", message: "Verwacht { playlistId: string; mixId: string | null }" },
      { status: 400 }
    );
  }

  const { playlistId, mixId } = body as { playlistId?: unknown; mixId?: unknown };

  if (typeof playlistId !== "string" || !isValidPlaylistId(playlistId)) {
    return NextResponse.json(
      { error: "invalid_body", message: "playlistId heeft niet de vorm van een geldige Spotify-playlist-id" },
      { status: 400 }
    );
  }

  if (mixId !== null && !isValidMixId(mixId)) {
    return NextResponse.json(
      { error: "invalid_body", message: "mixId moet acht cijfers zijn (YYYYMMDD), of null om de tag te wissen" },
      { status: 400 }
    );
  }

  // De playlist moet in de laatste snapshot staan. Dat levert twee dingen: de huidige beschrijving (om
  // niets te overschrijven) en de zekerheid dat dit een playlist is die de hub überhaupt kent.
  const snapshot = readSnapshot();
  const playlist = snapshot?.playlists.find((p) => p.id === playlistId);
  if (!playlist) {
    return NextResponse.json(
      {
        error: "unknown_playlist",
        message: "Deze playlist staat niet in de laatste snapshot -- sync eerst, of controleer het id.",
      },
      { status: 404 }
    );
  }

  // De velden komen uit de mix-bron, niet van de client. Kent de bron dit ID niet, dan valt er niets te
  // spiegelen -- en dat is een 404 en geen stille no-op: de aanvrager denkt iets te schrijven.
  let description: string;
  if (mixId === null) {
    description = withoutMixDescription(playlist.description);
  } else {
    const mix = readMixes().find((m) => m.id === mixId);
    if (!mix) {
      return NextResponse.json(
        {
          error: "unknown_mix",
          message:
            "Dit mix-ID staat niet in de mix-bron (djcylow-react) -- controleer het ID, of de bron is niet gevonden.",
        },
        { status: 404 }
      );
    }
    description = withMixDescription(playlist.description, mix);
  }

  // Niets te doen: dan ook niet naar Spotify. Scheelt een schrijfactie en een rate-limit-slot.
  if (description === (playlist.description ?? "")) {
    return NextResponse.json({ playlistId, mixId, description, changed: false });
  }

  try {
    await updatePlaylistDescription(playlistId, description);
  } catch (err) {
    if (err instanceof SpotifyApiError) {
      // SPOTIFY'S EIGEN WOORDEN GAAN VOOR (Dave, 2026-07-25). Hier stond een vertaling per statuscode --
      // 403 werd "waarschijnlijk geen playlist van jezelf". Bij 48 mislukte schrijfacties bleek dat
      // gewoon onwaar: Spotify zei *"The user is not registered for this application."*, oftewel de
      // Development-Mode-allowlist, en die melding wees rechtstreeks naar de oplossing. Wij weten het
      // niet beter dan de bron, dus interpreteren we alleen nog wanneer de bron zwijgt.
      const vanSpotify = spotifyErrorMessage(err.body);
      const message = vanSpotify
        ? `Spotify weigert de wijziging (${err.status}): ${vanSpotify}`
        : `Spotify weigert de wijziging (${err.status}) zonder uitleg. ${hintZonderUitleg(err.status)}`;
      return NextResponse.json({ error: "spotify_error", status: err.status, message }, { status: 502 });
    }
    return NextResponse.json(
      { error: "write_failed", message: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }

  // De snapshot wordt hier BEWUST niet bijgewerkt: die is een momentopname van Spotify, en de volgende
  // sync haalt de nieuwe beschrijving gewoon op. De UI werkt in de tussentijd optimistisch bij.
  return NextResponse.json({ playlistId, mixId, description, changed: true });
}
