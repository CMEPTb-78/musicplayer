import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchPlaylist, removeTrackFromPlaylist, deletePlaylist, type PlaylistDetail } from "@/api";
import { useMainLayoutOutlet } from "@/layout/mainLayoutContext";
import { playlistToPlayerTracks } from "@/layout/playlistToPlayerTracks";
import { usePlayer } from "@/player/PlayerContext";
import { formatDuration } from "@/utils/format";
import PlaylistSelector from "@/components/PlaylistSelector";
import ConfirmDialog from "@/components/ConfirmDialog";
import TrackActionsMenu from "@/components/TrackActionsMenu";
import "@/components/PlaylistSelector.css";
import "@/components/ConfirmDialog.css";
import "@/components/TrackActionsMenu.css";

function norm(s: string): string {
  return s.trim().toLowerCase();
}

export default function PlaylistPage() {
  const { id } = useParams();
  const playlistId = Number(id);
  const { searchQuery } = useMainLayoutOutlet();
  const [data, setData] = useState<PlaylistDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedTrackId, setSelectedTrackId] = useState<number | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [trackToDelete, setTrackToDelete] = useState<{ id: number; title: string } | null>(null);
  const { setQueueFromTracks, index: qIndex, queue, toggleLikeTrack, isTrackLiked } = usePlayer();

  const filteredTracks = useMemo(() => {
    if (!data) return [];
    const q = norm(searchQuery);
    if (!q) return data.tracks;
    return data.tracks.filter((t) => norm(t.title).includes(q) || norm(t.artist.name).includes(q));
  }, [data, searchQuery]);

  const playerTracks = useMemo(() => {
    if (!data) return [];
    return playlistToPlayerTracks({ ...data, tracks: filteredTracks });
  }, [data, filteredTracks]);

  const handleDeleteClick = (trackId: number, trackTitle: string) => {
    setTrackToDelete({ id: trackId, title: trackTitle });
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!trackToDelete || !data) return;
    
    try {
      await removeTrackFromPlaylist(playlistId, trackToDelete.id);
      // Refresh playlist data
      setData(null);
      // Trigger playlist update event
      window.dispatchEvent(new CustomEvent('playlist-updated'));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка удаления трека");
    } finally {
      setDeleteConfirmOpen(false);
      setTrackToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setDeleteConfirmOpen(false);
    setTrackToDelete(null);
  };

  const handlePlaylistDelete = () => {
    if (!data || data.isStarter) return;
    setTrackToDelete({ id: data.id, title: data.name });
    setDeleteConfirmOpen(true);
  };

  const handleConfirmPlaylistDelete = async () => {
    if (!trackToDelete || !data) return;
    
    try {
      await deletePlaylist(trackToDelete.id);
      // Navigate back to home
      window.location.href = '/';
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка удаления плейлиста");
    } finally {
      setDeleteConfirmOpen(false);
      setTrackToDelete(null);
    }
  };

  const handleCancelPlaylistDelete = () => {
    setDeleteConfirmOpen(false);
    setTrackToDelete(null);
  };

  useEffect(() => {
    if (!Number.isFinite(playlistId)) return;
    let cancelled = false;
    (async () => {
      try {
        const pl = await fetchPlaylist(playlistId);
        if (!cancelled) setData(pl);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Ошибка");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [playlistId]);

  useEffect(() => {
    if (!data || !playerTracks.length) return;
    setQueueFromTracks(playerTracks, 0, false);
  }, [data?.id, playerTracks, setQueueFromTracks]);

  if (!Number.isFinite(playlistId)) {
    return (
      <p className="fig-pl-sub">
        Некорректная ссылка. <Link to="/">На главную</Link>
      </p>
    );
  }

  return (
    <div className="fig-page-stack">
      <div>
        <Link to="/" className="fig-rc-all" style={{ display: "inline-block", marginBottom: 8 }}>
          ← Главная
        </Link>
        <h1 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 700, letterSpacing: "-0.02em" }}>
          {data?.name ?? "Плейлист"}
        </h1>
        <p className="fig-pl-sub" style={{ marginTop: 6 }}>
          {data ? `${data.tracks.length} треков` : "Загрузка…"}
        </p>
      </div>

      <div className="fig-tab-body">
        {error ? <div className="error">{error}</div> : null}

        <div className="fig-tracks">
          {filteredTracks.map((t, i) => {
            const active = queue[qIndex]?.id === t.id;
            return (
              <button
                key={t.id}
                type="button"
                className={`fig-track-row${active ? " active" : ""}`}
                onClick={() => setQueueFromTracks(playerTracks, i, true)}
              >
                <span className="fig-t-num">{i + 1}</span>
                <span className="fig-t-cover" aria-hidden />
                <span className="fig-t-meta-row">
                  <span className="fig-t-title">{t.title}</span>
                  <span className="fig-t-artist">{t.artist.name}</span>
                  <span className="fig-t-dur">{formatDuration(t.durationSec)}</span>
                </span>
                <span className="fig-track-actions">
                  <TrackActionsMenu
                    trackId={t.id}
                    trackTitle={t.title}
                    isLiked={isTrackLiked(t.id)}
                    onLikeToggle={() => toggleLikeTrack(t.id)}
                    onAddToPlaylist={() => setSelectedTrackId(t.id)}
                    onRemoveFromPlaylist={() => handleDeleteClick(t.id, t.title)}
                    onDeletePlaylist={() => {}}
                    showRemoveOption={true}
                    showDeletePlaylistOption={false}
                  />
                </span>
              </button>
            );
          })}
        </div>
      </div>
      
      {selectedTrackId && (
        <PlaylistSelector
          trackId={selectedTrackId}
          onClose={() => setSelectedTrackId(null)}
          onTrackAdded={() => {
            // Refresh playlist data when track is added
            if (data) {
              setData(null); // This will trigger a refetch
            }
            // Also trigger a global refresh of playlists list to update track counts
            window.dispatchEvent(new CustomEvent('playlist-updated'));
          }}
        />
      )}
      
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        title="Удалить плейлист?"
        message={`Вы уверены, что хотите удалить плейлист "${trackToDelete?.title}"? Это действие нельзя отменить.`}
        confirmText="Удалить"
        cancelText="Отмена"
        onConfirm={handleConfirmPlaylistDelete}
        onCancel={handleCancelPlaylistDelete}
        danger={true}
      />
    </div>
  );
}
