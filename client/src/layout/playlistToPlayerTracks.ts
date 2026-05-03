import type { CatalogTrack, PlaylistDetail } from "@/api";
import type { PlayerTrack } from "@/player/PlayerContext";

export function playlistToPlayerTracks(detail: PlaylistDetail): PlayerTrack[] {
  return detail.tracks.map((t) => ({
    id: t.id,
    title: t.title,
    artist: t.artist.name,
    durationSec: t.durationSec,
  }));
}

export function catalogTracksToPlayerTracks(tracks: CatalogTrack[]): PlayerTrack[] {
  return tracks.map((t) => ({
    id: t.id,
    title: t.title,
    artist: t.artist.name,
    durationSec: t.durationSec,
  }));
}
