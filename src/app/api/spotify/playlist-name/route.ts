// De schrijfkant van de playlistNAAM: trekt de naam van een Spotify-playlist gelijk met `title_spotify`
// uit de mix-bron -- "EDM 128BPM 🟡 Yellow Full (m) 🟡 Vol. 1". Zie mixes/spotifyTitle.ts voor wat die
// naam precies is en wanneer hij nog niet geschreven mag worden.
//
// DIT IS DE TWEEDE ROUTE DIE NAAR SPOTIFY SCHRIJFT, naast mix-tag (de beschrijving). Beide raken Dave's
// echte account, dus deze route draagt dezelfde grenzen, plus één die alleen hier van toepassing is:
//   1. alleen het `name`-veld gaat mee (zie playlistApi.ts) -- beschrijving en openbaarheid blijven buiten;
//   2. **de client stuurt geen naam mee, alleen een playlist-id.** De naam wordt hier server-side uit de
//      mix-bron gehaald, via de mix die aan deze playlist gekoppeld is. Er is dus geen manier om via deze
//      route een zelfgekozen naam in een playlist te krijgen -- de bron dicteert hem, en dat is de hele
//      afspraak ("de mix-data is leidend, de playlist is de weerspiegeling");
//   3. de playlist moet in de snapshot staan en aan een mix gekoppeld zijn;
//   4. NIEUW HIER: een naam die de blokkade van spotifyTitle.ts niet passeert wordt geweigerd met de
//      uitleg erbij. Concreet gaat het nu om de zes Cyan-playlists: de bron schrijft 💠 waar Dave's
//      playlists 🧊 gebruiken, en Dave heeft besloten dat de bron daar wordt rechtgezet (2026-08-11) --
//      niet de hub. Een 409 dus, geen stille correctie en geen stille no-op.
//
// POST -> { playlistId: string }
//         Geen tweede veld: er is maar één naam die deze playlist kan krijgen.
//
// WAAROM DE KOPPELING VIA DE BESCHRIJVING LOOPT en niet via de tracklist-heuristiek: de beschrijving
// draagt het mix-ID als harde sleutel (mixDescription.ts). Een naam is te ingrijpend om op een gok te
// wijzigen -- staat de sleutel er niet, dan schrijft deze route niets en zegt dat ook.
//
// fs vereist de Node-runtime, niet de edge-runtime.
import { NextResponse } from "next/server";
import { parseMixDescription } from "@/lib/mixes/mixDescription";
import { readMixes } from "@/lib/mixes/mixStore";
import { titleBlocker } from "@/lib/mixes/spotifyTitle";
import { isValidPlaylistId } from "@/lib/spotify/overrideSafety";
import { readSnapshot } from "@/lib/spotify/snapshotStore";
import { updatePlaylistName } from "@/lib/spotify/playlistApi";
import { SpotifyApiError, spotifyErrorMessage } from "@/lib/spotify/errors";
import { sameOriginGuard } from "@/lib/http/sameOrigin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Wat we zélf kunnen zeggen wanneer Spotify een fout geeft zónder uitleg -- alleen dán, want anders
 *  overschrijft een gok een feit. Zelfde afspraak en zelfde tekst als in de mix-tag-route: de 403 heeft
 *  drie werkelijke oorzaken en we kiezen er niet één uit. */
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
      { error: "invalid_body", message: "Verwacht { playlistId: string }" },
      { status: 400 }
    );
  }

  const { playlistId } = body as { playlistId?: unknown };

  if (typeof playlistId !== "string" || !isValidPlaylistId(playlistId)) {
    return NextResponse.json(
      { error: "invalid_body", message: "playlistId heeft niet de vorm van een geldige Spotify-playlist-id" },
      { status: 400 }
    );
  }

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

  // De harde sleutel uit de beschrijving bepaalt WELKE mix de naam dicteert. Zonder sleutel geen naam:
  // zie de toelichting in de kop.
  const mixId = parseMixDescription(playlist.description)?.mixId ?? null;
  if (mixId === null) {
    return NextResponse.json(
      {
        error: "no_mix_link",
        message:
          "De beschrijving van deze playlist noemt geen mix-ID, dus er is geen mix die zijn naam dicteert. " +
          "Zet eerst de mix-spiegel in de beschrijving (het #-knopje), dan kan de naam mee.",
      },
      { status: 409 }
    );
  }

  const mix = readMixes().find((m) => m.id === mixId);
  if (!mix) {
    return NextResponse.json(
      {
        error: "unknown_mix",
        message:
          "Het mix-ID uit de beschrijving staat niet in de mix-bron (djcylow-react) -- controleer het ID, " +
          "of de bron is niet gevonden.",
      },
      { status: 404 }
    );
  }

  const blocker = titleBlocker(mix);
  if (blocker !== null) {
    return NextResponse.json({ error: "title_blocked", mixId, message: blocker }, { status: 409 });
  }

  // `titleBlocker` heeft hierboven al vastgesteld dat er een naam is; deze check houdt het type eerlijk.
  const name = mix.spotifyTitle;
  if (name === null) {
    return NextResponse.json(
      { error: "no_title", mixId, message: "Deze mix levert geen title_spotify." },
      { status: 409 }
    );
  }

  // Niets te doen: dan ook niet naar Spotify. Scheelt een schrijfactie en een rate-limit-slot -- zelfde
  // afspraak als in de mix-tag-route.
  if (name === playlist.name) {
    return NextResponse.json({ playlistId, mixId, name, changed: false });
  }

  try {
    await updatePlaylistName(playlistId, name);
  } catch (err) {
    if (err instanceof SpotifyApiError) {
      // Spotify's eigen woorden gaan voor; wij interpreteren alleen wanneer de bron zwijgt. Zie de
      // uitgebreide toelichting hierop in de mix-tag-route.
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
  // sync haalt de nieuwe naam gewoon op. De UI werkt in de tussentijd optimistisch bij.
  return NextResponse.json({ playlistId, mixId, name, previousName: playlist.name, changed: true });
}
