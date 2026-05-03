import { useOutletContext } from "react-router-dom";
import type { PlaylistSummary } from "@/api";

export type MainLayoutOutletContext = {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  handleAddAlbumToLibrary?: (album: PlaylistSummary) => void;
  isAlbumInLibrary?: (albumId: number) => boolean;
  handleTrackDelete?: (trackId: number, trackTitle: string, playlistId: number) => void;
};

export function useMainLayoutOutlet(): MainLayoutOutletContext {
  return useOutletContext<MainLayoutOutletContext>();
}
