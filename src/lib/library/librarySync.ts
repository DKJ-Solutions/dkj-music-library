// De bibliotheek bijwerken na een nieuwe snapshot: eigen track- en artiest-ID's, dkj_group uit de werelden
// en djcylow_mix uit de mix-koppeling. Gedeeld door de volledige sync (api/spotify/sync) en de sync van één
// playlist (api/spotify/sync/playlist) -- beide schrijven eerst de snapshot weg en roepen dit daarna aan.
//
// Altijd over de HELE snapshot, ook na een sync van één playlist: spotify_playlist en djcylow_mix worden
// per track uit alle playlists samen opgebouwd, dus een halve snapshot zou de koppelingen naar de rest
// wissen.
//
// SERVER-ONLY: opent de bibliotheek via libraryFile.ts.
import { withLibrary } from "./libraryFile";
import { applyLibraryIdsFromSnapshot, type ArtistIdResult } from "./artistIds";
import { fillGroupsFromWorlds } from "./groupFromWorlds";
import { applyDjcylowMixes } from "./djcylowMixes";
import { ownPlaylistsOnly, removeSharedOnlyTracks } from "./ownPlaylists";
import type { TrackIdResult } from "./trackIds";
import { getMixLinks } from "@/lib/mixes/mixLinks";
import { getEnrichedSnapshot } from "@/lib/spotify/enrichedPlaylists";
import { readPrivateRules } from "@/lib/spotify/privateRules";
import type { Snapshot } from "@/lib/spotify/types";

export function updateLibraryFromSnapshot(snapshot: Snapshot): { tracks: TrackIdResult; artists: ArtistIdResult } {
  // De werelden (met je handmatige correcties) voor dkj_group; zie groupFromWorlds.ts.
  const worlds = getEnrichedSnapshot(snapshot)?.playlists ?? [];
  // Alleen je eigen playlists vullen de bibliotheek; zie ownPlaylists.ts.
  const { ownerUserId } = readPrivateRules();
  const own = ownPlaylistsOnly(snapshot, ownerUserId);
  return withLibrary((db) => {
    removeSharedOnlyTracks(db, snapshot, ownerUserId);
    const result = applyLibraryIdsFromSnapshot(db, own);
    fillGroupsFromWorlds(db, worlds);
    // De mixen op djcylow.com voor djcylow_mix; zie djcylowMixes.ts.
    applyDjcylowMixes(db, own, getMixLinks(snapshot));
    return result;
  });
}
