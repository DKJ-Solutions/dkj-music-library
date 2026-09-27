// Geeft elk nummer uit de Spotify-snapshot (data/spotify/snapshot.json) een eigen ID in de
// trackdatabase: T000001, T000002, ... Releasevarianten van hetzelfde nummer krijgen hetzelfde ID.
//
//   npm run library:assign-ids
//
// De sync op /spotify doet dit na elke run zelf; dit script is er voor een bestaande snapshot, of om
// het los na te lopen. Opnieuw draaien is veilig: wat al een ID heeft, houdt dat. Hoe het werkt staat
// in src/lib/library/trackIds.ts; hoe de ID's met de repo meereizen in src/lib/library/libraryFile.ts.
import { applyLibraryIdsFromSnapshot } from "../../src/lib/library/artistIds";
import { withLibrary } from "../../src/lib/library/libraryFile";
import { countTracks } from "../../src/lib/library/trackStore";
import { readSnapshot } from "../../src/lib/spotify/snapshotStore";

const snapshot = readSnapshot();
if (!snapshot) {
  console.error("Geen snapshot gevonden -- start eerst een sync op /spotify.");
  process.exit(1);
}

try {
  const { tracks, artists, primaryArtistsFilled, albumArtistsFilled, fileNamesFilled, playlistsChanged, albumsFilled, renumbered, total } = withLibrary((db) => ({
    ...applyLibraryIdsFromSnapshot(db, snapshot),
    total: countTracks(db),
  }));
  const { newTracks, newLinks, totalLinks } = tracks;
  if (renumbered > 0) console.log(`${renumbered} tracks van een oud ID (T000001) naar het nieuwe formaat omgenummerd`);
  console.log(
    `${newTracks} nieuwe nummers, ${newLinks} Spotify-ID's gekoppeld -- ` +
      `${total} tracks, ${totalLinks} Spotify-ID's in totaal`
  );
  console.log(
    `${artists.newArtists} nieuwe artiesten, dkj_artist_ids gevuld bij ${artists.tracksFilled} tracks -- ` +
      `${artists.totalArtists} artiesten in totaal`
  );
  if (primaryArtistsFilled > 0) console.log(`dkj_artist gevuld bij ${primaryArtistsFilled} bestaande tracks`);
  if (albumArtistsFilled > 0) console.log(`dkj_albumartiest gevuld bij ${albumArtistsFilled} bestaande tracks`);
  if (fileNamesFilled > 0) console.log(`dkj_file gevuld bij ${fileNamesFilled} bestaande tracks`);
  if (playlistsChanged > 0) console.log(`dkj_playlists bijgewerkt bij ${playlistsChanged} tracks`);
  if (albumsFilled > 0) console.log(`dkj_album uit de playlists gevuld bij ${albumsFilled} tracks`);
  console.log("Export bijgewerkt in data/library/export/ -- commit die map om hem op je andere machines te hebben.");
} catch (err) {
  console.error(`Toekennen mislukt: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}
