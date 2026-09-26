// Het samenstellen van de brug: haalt beide bronnen van schijf en levert het koppelresultaat.
// De feitelijke koppel-logica zit puur in matchMixes.ts, de mix-leeslaag in mixStore.ts -- dit
// bestand is alleen het bindmiddel (zelfde rolverdeling als spotify/enrichedPlaylists.ts tegenover
// classifyWorld.ts).
//
// SERVER-ONLY: leest via mixStore.ts + spotify/snapshotStore.ts van schijf.
import { readSnapshot } from "@/lib/spotify/snapshotStore";
import { getEnrichedSnapshot } from "@/lib/spotify/enrichedPlaylists";
import type { Snapshot } from "@/lib/spotify/types";
import { parseMixIdTag } from "./mixIdTag";
import { readMixes } from "./mixStore";
import {
  findUnmirroredPlaylists,
  linkMixes,
  type MixLink,
  type MixMatchCandidate,
} from "./matchMixes";

export interface MixLinkResult {
  /** Tijdstip van de Spotify-sync waartegen gekoppeld is -- null als er nog geen snapshot is. */
  syncedAt: string | null;
  /** Aantal publieke mixen dat in src/data/mixes/ gevonden is (0 = map ontbreekt of is leeg). */
  mixCount: number;
  links: MixLink[];
  /** De omgekeerde blik: genummerde MMC-playlists ("klaar & live") zonder mix in de JSON's. */
  unmirroredPlaylists: MixMatchCandidate[];
  /** Aantal `Vol. X`-werkbakken binnen MMC -- geen afwijking, maar de normale voorraad. */
  workBenchCount: number;
}

/** Koppelt de mix-JSON's aan de playlists uit de laatste snapshot.
 *
 *  `snapshot` is optioneel en bestaat om dezelfde reden als het doorgeven aan getEnrichedSnapshot
 *  hieronder: het bestand is tientallen MB's en readSnapshot() cachet niet, dus een aanroeper die hem
 *  tóch al gelezen heeft (MixBridge, dat er ook de id_spotify-planning mee maakt) hoort hem niet nog
 *  een keer te laten parsen. Weggelaten = zelf lezen, precies zoals voorheen.
 *
 *  Kandidaten zijn ALLE playlists met tracks, niet alleen de MMC-lijsten: juist de match buiten MMC
 *  is informatief -- die vertelt dat de tracks alleen in een grote kleur-emmer staan en de mix (nog)
 *  geen eigen genummerde playlist heeft. Playlists zonder tracks vallen af; dat zijn de gevolgde,
 *  niet-eigen lijsten waarvoor de API 403 geeft (zie het dossier, "Praktijk-correcties" punt 3) en
 *  daar valt niets te matchen. */
export function getMixLinks(gegeven?: Snapshot | null): MixLinkResult {
  const mixes = readMixes();

  // Snapshot één keer lezen en doorgeven -- getEnrichedSnapshot() zou 'm anders nóg een keer van
  // schijf parsen (zie de toelichting bij die functie).
  const snapshot = gegeven !== undefined ? gegeven : readSnapshot();
  const enriched = getEnrichedSnapshot(snapshot);
  if (!snapshot || !enriched) {
    return {
      syncedAt: null,
      mixCount: mixes.length,
      links: [],
      unmirroredPlaylists: [],
      workBenchCount: 0,
    };
  }

  const enrichedById = new Map(enriched.playlists.map((p) => [p.id, p]));

  const candidates: MixMatchCandidate[] = [];
  for (const playlist of snapshot.playlists) {
    if (playlist.tracks.length === 0) continue;
    const meta = enrichedById.get(playlist.id);
    candidates.push({
      id: playlist.id,
      name: playlist.name,
      isMmc: meta?.world === "mmc",
      trackCount: playlist.trackCount,
      tracks: playlist.tracks.map((item) =>
        item.track ? `${item.track.artists.map((a) => a.name).join(" ")} ${item.track.name}` : ""
      ),
      volume: meta?.parsed.volume ?? null,
      guessedBpm: meta?.mmcBpm ?? null,
      // De harde sleutel, als Dave hem in de beschrijving heeft gezet (zie mixIdTag.ts).
      declaredMixId: parseMixIdTag(playlist.description),
      // De hele beschrijving gaat mee: de sleutel bepaalt de koppeling, de overige velden erin worden
      // verderop tegen de mix-JSON gelegd (playlistMixInfo.ts).
      description: playlist.description ?? null,
    });
  }

  const links = linkMixes(mixes, candidates);

  return {
    syncedAt: enriched.syncedAt,
    mixCount: mixes.length,
    links,
    unmirroredPlaylists: findUnmirroredPlaylists(candidates, links),
    // Geteld over de VERRIJKTE playlists, niet over de kandidaten: een werkbak die (nog) geen
    // tracks heeft valt uit de kandidatenlijst, maar hoort wel in de voorraad-telling.
    workBenchCount: enriched.playlists.filter((p) => p.world === "mmc" && p.parsed.volume === "X").length,
  };
}
