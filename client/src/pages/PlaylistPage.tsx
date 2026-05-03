import { useEffect, useMemo, useState, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchPlaylist, removeTrackFromPlaylist, deletePlaylist, updatePlaylist, type PlaylistDetail } from "@/api";
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
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editingMode, setEditingMode] = useState<'title' | 'description' | null>(null);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { setQueueFromTracks, index: qIndex, queue, toggleLikeTrack, isTrackLiked } = usePlayer();

  // Initial check for localStorage data
  useEffect(() => {
    if (playlistId) {
      const localCoverImage = localStorage.getItem(`playlist-cover-${playlistId}`);
      const localPlaylistName = localStorage.getItem(`playlist-name-${playlistId}`);
      const localPlaylistDescription = localStorage.getItem(`playlist-description-${playlistId}`);
      
      console.log('Initial localStorage check for playlist', playlistId);
      console.log('Cover image:', localCoverImage);
      console.log('Name:', localPlaylistName);
      console.log('Description:', localPlaylistDescription);
      
      if (localCoverImage) {
        setCoverImage(localCoverImage);
        console.log('Set initial cover image from localStorage');
      }
    }
  }, [playlistId]);

  useEffect(() => {
    console.log('Playlist data updated:', data);
    console.log('Cover image in data:', data?.coverImage);
    if (data) {
      // Try to get cover image from API first, then fallback to localStorage
      const apiCoverImage = data.coverImage;
      const localCoverImage = localStorage.getItem(`playlist-cover-${playlistId}`);
      const localPlaylistName = localStorage.getItem(`playlist-name-${playlistId}`);
      const localPlaylistDescription = localStorage.getItem(`playlist-description-${playlistId}`);
      
      console.log('API cover image:', apiCoverImage);
      console.log('Local cover image:', localCoverImage);
      console.log('Local name:', localPlaylistName);
      console.log('Local description:', localPlaylistDescription);
      
      const finalCoverImage = apiCoverImage || localCoverImage;
      console.log('Setting final cover image:', finalCoverImage);
      
      setCoverImage(finalCoverImage);
      
      // Update data with localStorage values if they exist
      if (localPlaylistName || localPlaylistDescription) {
        const updatedData = {
          ...data,
          name: localPlaylistName || data.name,
          description: localPlaylistDescription || data.description,
        };
        setData(updatedData);
        console.log('Updated data with localStorage values');
      }
    }
  }, [data, playlistId]);

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

  const handleSavePlaylist = async () => {
    if (!data) return;
    
    try {
      // Save all data to localStorage
      if (coverImage) {
        localStorage.setItem(`playlist-cover-${playlistId}`, coverImage);
        console.log('Cover image saved to localStorage');
      } else {
        localStorage.removeItem(`playlist-cover-${playlistId}`);
        console.log('Cover image removed from localStorage');
      }
      
      if (editTitle && editTitle !== data.name) {
        localStorage.setItem(`playlist-name-${playlistId}`, editTitle);
        console.log('Name saved to localStorage:', editTitle);
      } else {
        localStorage.removeItem(`playlist-name-${playlistId}`);
        console.log('Name removed from localStorage');
      }
      
      // Handle description - save if not empty, remove if empty
      if (editDescription && editDescription.trim()) {
        localStorage.setItem(`playlist-description-${playlistId}`, editDescription.trim());
        console.log('Description saved to localStorage:', editDescription.trim());
      } else {
        localStorage.removeItem(`playlist-description-${playlistId}`);
        console.log('Description removed from localStorage (empty)');
      }
      
      // Update local state with new values
      const updatedData = {
        ...data,
        name: editTitle || data.name,
        description: editDescription && editDescription.trim() ? editDescription.trim() : undefined,
      };
      
      setData(updatedData);
      setIsEditing(false);
      setEditingMode(null);
      
      console.log('Playlist updated locally (localStorage only)');
      console.log('Changes saved locally. Server sync will be available later.');
      
    } catch (err) {
      console.error('Error saving playlist:', err);
      setError(err instanceof Error ? err.message : "Ошибка сохранения плейлиста");
    }
  };

  useEffect(() => {
    if (!Number.isFinite(playlistId)) return;
    let cancelled = false;
    (async () => {
      try {
        console.log('Fetching playlist data for ID:', playlistId);
        const pl = await fetchPlaylist(playlistId);
        console.log('API response - full playlist data:', pl);
        console.log('API response - coverImage field:', pl.coverImage);
        if (!cancelled) setData(pl);
      } catch (e) {
        console.error('Error fetching playlist:', e);
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
      <Link to="/" className="fig-rc-all" style={{ display: "inline-block", marginBottom: 16 }}>
        ← Главная
      </Link>
      
      <div style={{ display: "flex", gap: "20px", alignItems: "flex-start" }}>
        {/* Album Cover */}
        <div>
          <div
            onClick={() => {
              console.log('Cover image clicked');
              fileInputRef.current?.click();
            }}
            style={{
              width: "128px",
              height: "128px",
              borderRadius: "12px",
              backgroundColor: "rgba(255, 255, 255, 0.1)",
              backgroundImage: coverImage ? `url(${coverImage})` : "none",
              backgroundSize: "cover",
              backgroundPosition: "center",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "background-color 0.2s ease",
              position: "relative",
              overflow: "hidden"
            }}
            onMouseEnter={(e) => {
              if (!coverImage) {
                e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.15)";
              }
            }}
            onMouseLeave={(e) => {
              if (!coverImage) {
                e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
              }
            }}
          >
            {!coverImage && (
              <svg width="32" height="32" viewBox="0 0 32 32" fill="rgba(255, 255, 255, 0.5)">
                <path d="M16 4v8m0 8v-8m-8 0h16"/>
              </svg>
            )}
            {coverImage && (
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: "rgba(0, 0, 0, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: 0,
                  transition: "opacity 0.2s ease"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = "1";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = "0";
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                  <path d="M12 15.5A3.5 3.5 0 0 1 8.5 12A3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5a3.5 3.5 0 0 1-3.5 3.5m7.43-2.53c.04-.32.07-.64.07-.97c0-.33-.03-.65-.07-.97l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.39-1.06-.73-1.69-.98l-.37-2.65A.506.506 0 0 0 14 2h-4c-.25 0-.46.18-.5.42l-.37 2.65c-.63.25-1.17.59-1.69.98l-2.49-1c-.22-.08-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.32-.07.64-.07.97c0 .33.03.65.07.97l-2.11 1.63c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.39 1.06.73 1.69.98l.37 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.37-2.65c.63-.25 1.17-.59 1.69-.98l2.49 1c.22.08.49 0 .61-.22l2-3.46c.13-.22.07-.49-.12-.64l-2.11-1.63Z"/>
                </svg>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => {
              console.log('File input changed');
              const file = e.target.files?.[0];
              if (file) {
                console.log('File selected:', file.name);
                const reader = new FileReader();
                reader.onload = (e) => {
                  console.log('File loaded, setting cover image');
                  setCoverImage(e.target?.result as string);
                };
                reader.readAsDataURL(file);
              }
            }}
          />
        </div>

        {/* Playlist Info */}
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
            <h1 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 700, letterSpacing: "-0.02em" }}>
              {data?.name ?? "Плейлист"}
            </h1>
            {!data?.isStarter && (
              <button
                type="button"
                onClick={() => {
                  setIsEditing(true);
                  setEditingMode('title');
                  setEditTitle(data?.name || "");
                  setEditDescription(data?.description || "");
                }}
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  border: "none",
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                  color: "#ffffff",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "background-color 0.2s ease"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.2)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
                }}
                title="Редактировать плейлист"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5L13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175l-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z"/>
                </svg>
              </button>
            )}
          </div>
          {!isEditing && (
            <p 
              style={{ 
                color: "rgba(255, 255, 255, 0.7)", 
                fontSize: "0.9rem", 
                marginTop: "6px",
                lineHeight: "1.4",
                display: "-webkit-box",
                WebkitLineClamp: 4,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                wordBreak: "break-word",
                whiteSpace: "pre-wrap",
                cursor: "pointer",
                transition: "color 0.2s ease",
                maxHeight: "5.6em" // 4 lines * 1.4 line height
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#ffffff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "rgba(255, 255, 255, 0.7)";
              }}
              onClick={() => {
                setIsEditing(true);
                setEditingMode('description');
                setEditTitle(data?.name || "");
                setEditDescription(data?.description || "");
              }}
            >
              {data?.description || "Добавить описание..."}
            </p>
          )}
          {isEditing && (
            <div style={{ marginTop: "8px" }}>
              {editingMode === 'title' && (
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Название плейлиста"
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    color: "#ffffff",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    fontSize: "1rem",
                    width: "100%",
                    marginBottom: "8px",
                    outline: "none"
                  }}
                />
              )}
              {editingMode === 'description' && (
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Добавить описание..."
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    color: "#ffffff",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    fontSize: "0.9rem",
                    lineHeight: "1.4",
                    width: "100%",
                    height: "5.6em", // Exactly 4 lines (4 * 1.4)
                    resize: "none",
                    overflow: "hidden",
                    outline: "none",
                    fontFamily: "inherit",
                    whiteSpace: "pre-wrap",
                    verticalAlign: "top"
                  }}
                />
              )}
              <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditingMode(null);
                  }}
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    color: "#ffffff",
                    padding: "8px 16px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "0.9rem"
                  }}
                >
                  Отмена
                </button>
                <button
                  onClick={handleSavePlaylist}
                  style={{
                    backgroundColor: "#1db954",
                    border: "none",
                    color: "#ffffff",
                    padding: "8px 16px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "0.9rem"
                  }}
                >
                  Сохранить
                </button>
              </div>
            </div>
          )}
          <p className="fig-pl-sub" style={{ marginTop: isEditing ? "8px" : "4px" }}>
            {data ? `${data.tracks.length} треков` : "Загрузка…"}
          </p>
        </div>
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
        title={trackToDelete?.id === data?.id ? "Удалить плейлист?" : "Удалить из плейлиста?"}
        message={trackToDelete?.id === data?.id 
          ? `Вы уверены, что хотите удалить плейлист "${trackToDelete?.title}"? Это действие нельзя отменить.`
          : `Вы уверены, что хотите удалить трек "${trackToDelete?.title}" из плейлиста?`}
        confirmText="Удалить"
        cancelText="Отмена"
        onConfirm={trackToDelete?.id === data?.id ? handleConfirmPlaylistDelete : handleConfirmDelete}
        onCancel={trackToDelete?.id === data?.id ? handleCancelPlaylistDelete : handleCancelDelete}
        danger={true}
      />
    </div>
  );
}
