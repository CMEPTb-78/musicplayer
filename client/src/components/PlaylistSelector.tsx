import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { addTrackToPlaylist, createPlaylist, fetchPlaylists, type PlaylistSummary } from "@/api";

interface PlaylistSelectorProps {
  trackId: number;
  onClose: () => void;
  onTrackAdded?: () => void;
}

export default function PlaylistSelector({ trackId, onClose, onTrackAdded }: PlaylistSelectorProps) {
  const [playlists, setPlaylists] = useState<PlaylistSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [adding, setAdding] = useState<number | null>(null);

  useEffect(() => {
    loadPlaylists();
  }, []);

  const loadPlaylists = async () => {
    try {
      setLoading(true);
      const data = await fetchPlaylists();
      setPlaylists(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки плейлистов");
    } finally {
      setLoading(false);
    }
  };

  const handleAddToPlaylist = async (playlistId: number) => {
    try {
      setAdding(playlistId);
      await addTrackToPlaylist(playlistId, trackId);
      onTrackAdded?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка добавления трека");
    } finally {
      setAdding(null);
    }
  };

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) return;
    
    try {
      setAdding(-1); // Use -1 for create operation
      const newPlaylist = await createPlaylist(newPlaylistName.trim());
      
      // Only add track if trackId is valid (not 0)
      if (trackId && trackId > 0) {
        await addTrackToPlaylist(newPlaylist.id, trackId);
      }
      
      onTrackAdded?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка создания плейлиста");
    } finally {
      setAdding(null);
    }
  };

  return createPortal(
    <div className="playlist-selector-overlay" onClick={onClose}>
      <div className="playlist-selector" onClick={(e) => e.stopPropagation()}>
        <div className="playlist-selector-header">
          <h3>Добавить в плейлист</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        {error && <div className="error">{error}</div>}
        
        {loading ? (
          <div className="loading">Загрузка...</div>
        ) : (
          <div className="playlist-list">
            {playlists.map((playlist) => (
              <button
                key={playlist.id}
                className="playlist-item"
                onClick={() => handleAddToPlaylist(playlist.id)}
                disabled={adding === playlist.id}
              >
                <span className="playlist-name">{playlist.name}</span>
                <span className="playlist-count">{playlist._count.tracks} треков</span>
                {adding === playlist.id && <span className="loading-indicator">...</span>}
              </button>
            ))}
            
            {!showCreateForm ? (
              <button
                className="playlist-item create-playlist-btn"
                onClick={() => setShowCreateForm(true)}
                disabled={adding === -1}
              >
                <span className="playlist-name">+ Создать новый плейлист</span>
              </button>
            ) : (
              <div className="create-playlist-form">
                <input
                  type="text"
                  placeholder="Название плейлиста"
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleCreatePlaylist()}
                  className="playlist-name-input"
                  autoFocus
                />
                <div className="create-playlist-actions">
                  <button
                    onClick={handleCreatePlaylist}
                    disabled={!newPlaylistName.trim() || adding === -1}
                    className="create-btn"
                  >
                    {adding === -1 ? "Создание..." : "Создать"}
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateForm(false);
                      setNewPlaylistName("");
                    }}
                    className="cancel-btn"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
