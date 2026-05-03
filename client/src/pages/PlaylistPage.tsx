import { useEffect, useMemo, useState, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchPlaylist, removeTrackFromPlaylist, deletePlaylist, updatePlaylist, type PlaylistDetail, type PlaylistSummary } from "@/api";
import { IconHeart } from "@/icons/FigIcons";
import { useMainLayoutOutlet } from "@/layout/mainLayoutContext";
import { playlistToPlayerTracks } from "@/layout/playlistToPlayerTracks";
import { usePlayer } from "@/player/PlayerContext";
import { formatDuration } from "@/utils/format";
import PlaylistSelector from "@/components/PlaylistSelector";
import TrackActionsMenu from "@/components/TrackActionsMenu";
import "@/components/PlaylistSelector.css";
import "@/components/TrackActionsMenu.css";

function norm(s: string): string {
  return s.trim().toLowerCase();
}

export default function PlaylistPage() {
  const { id } = useParams();
  const playlistId = Number(id);
  const { searchQuery, handleTrackDelete, isAlbumInLibrary, handleAddAlbumToLibrary, handleRemoveAlbumFromLibrary } = useMainLayoutOutlet();
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

  // Reset state and load localStorage data when playlistId changes
  useEffect(() => {
    console.log('Initial localStorage effect - playlistId:', playlistId, 'type:', typeof playlistId);
    
    // Reset coverImage when changing playlists
    setCoverImage(null);
    
    if (playlistId && !isNaN(playlistId)) {
      const localCoverImage = localStorage.getItem(`playlist-cover-${playlistId}`);
      const localPlaylistName = localStorage.getItem(`playlist-name-${playlistId}`);
      const localPlaylistDescription = localStorage.getItem(`playlist-description-${playlistId}`);
      
      console.log('Initial localStorage check for playlist', playlistId);
      console.log('Cover image exists:', !!localCoverImage);
      console.log('Cover image length:', localCoverImage?.length);
      console.log('Name:', localPlaylistName);
      console.log('Description:', localPlaylistDescription);
      
      if (localCoverImage) {
        setCoverImage(localCoverImage);
        console.log('Set initial cover image from localStorage');
      }
    } else {
      console.log('Invalid playlistId for localStorage check');
    }
  }, [playlistId]);

  useEffect(() => {
    console.log('Playlist data updated:', data);
    console.log('Cover image in data:', data?.coverImage);
    if (data) {
      // Try to get cover image from API first, then fallback to localStorage
      const apiCoverImage = data.coverImage;
      const localCoverImage = localStorage.getItem(`playlist-cover-${playlistId}`);
      
      console.log('API cover image:', apiCoverImage);
      console.log('Local cover image:', localCoverImage);
      
      // Only use API cover image if it exists, otherwise keep localStorage or current coverImage
      const finalCoverImage = apiCoverImage || localCoverImage || coverImage;
      console.log('Setting final cover image:', finalCoverImage);
      
      setCoverImage(finalCoverImage);
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
    if (handleTrackDelete) {
      handleTrackDelete(trackId, trackTitle, playlistId);
    }
  };

  const handleConfirmDelete = async () => {
    if (!trackToDelete || !data) return;
    
    try {
      await removeTrackFromPlaylist(playlistId, trackToDelete.id);
      
      // Refresh playlist data by triggering a refetch
      const pl = await fetchPlaylist(playlistId);
      setData(pl);
      
      // Trigger playlist update event to refresh library
      window.dispatchEvent(new CustomEvent('playlist-updated'));
      
      console.log('Track deleted and playlist refreshed');
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

  const generateAlbumCover = (albumId: number): string => {
    // Generate consistent random colors based on album ID
    const seed = albumId * 47;
    const hue1 = (seed * 13) % 360;
    const hue2 = ((seed * 23) % 360) || 210;
    const saturation = 45 + (seed % 20);
    const lightness1 = 35 + (seed % 15);
    const lightness2 = 20 + (seed % 10);
    
    return `linear-gradient(135deg, hsl(${hue1}, ${saturation}%, ${lightness1}%), hsl(${hue2}, ${saturation}%, ${lightness2}%))`;
  };

  const getMockAlbumData = (albumId: number): PlaylistDetail => {
    const albumData: { [key: number]: PlaylistDetail } = {
      1001: {
        id: 1001,
        name: "Midnight Sessions",
        description: "Intimate late-night recordings from underground artists",
        coverImage: generateAlbumCover(1001),
        isStarter: true,
        createdAt: new Date().toISOString(),
        tracks: [
          { id: 10001, title: "After Hours", popularity: 75, durationSec: 245, audioUrl: "", artist: { id: 2001, name: "Luna Echo" }, position: 1 },
          { id: 10002, title: "Neon Dreams", popularity: 68, durationSec: 198, audioUrl: "", artist: { id: 2002, name: "Nightwave" }, position: 2 },
          { id: 10003, title: "City Lights", popularity: 82, durationSec: 267, audioUrl: "", artist: { id: 2003, name: "Urban Pulse" }, position: 3 },
          { id: 10004, title: "Midnight Blues", popularity: 71, durationSec: 312, audioUrl: "", artist: { id: 2004, name: "Jazz Noir" }, position: 4 },
          { id: 10005, title: "Silent Streets", popularity: 64, durationSec: 189, audioUrl: "", artist: { id: 2005, name: "Echo Chamber" }, position: 5 },
        ]
      },
      1002: {
        id: 1002,
        name: "Urban Legends",
        description: "Stories from the city streets and underground culture",
        coverImage: generateAlbumCover(1002),
        isStarter: true,
        createdAt: new Date().toISOString(),
        tracks: [
          { id: 10006, title: "Concrete Jungle", popularity: 79, durationSec: 234, audioUrl: "", artist: { id: 2006, name: "Street Poet" }, position: 1 },
          { id: 10007, title: "Subway Stories", popularity: 73, durationSec: 267, audioUrl: "", artist: { id: 2007, name: "Metro Beats" }, position: 2 },
          { id: 10008, title: "Rooftop Views", popularity: 85, durationSec: 201, audioUrl: "", artist: { id: 2008, name: "Sky High" }, position: 3 },
          { id: 10009, title: "Graffiti Nights", popularity: 77, durationSec: 289, audioUrl: "", artist: { id: 2009, name: "Art Attack" }, position: 4 },
          { id: 10010, title: "Back Alley Blues", popularity: 70, durationSec: 245, audioUrl: "", artist: { id: 2010, name: "Shadow Walker" }, position: 5 },
        ]
      },
      1003: {
        id: 1003,
        name: "Acoustic Dreams",
        description: "Unplugged sessions and intimate performances",
        coverImage: generateAlbumCover(1003),
        isStarter: true,
        createdAt: new Date().toISOString(),
        tracks: [
          { id: 10011, title: "Morning Coffee", popularity: 72, durationSec: 178, audioUrl: "", artist: { id: 2011, name: "Acoustic Soul" }, position: 1 },
          { id: 10012, title: "Rainy Days", popularity: 80, durationSec: 234, audioUrl: "", artist: { id: 2012, name: "Folk Heart" }, position: 2 },
          { id: 10013, title: "Sunset Sessions", popularity: 76, durationSec: 267, audioUrl: "", artist: { id: 2013, name: "Golden Hour" }, position: 3 },
          { id: 10014, title: "Campfire Songs", popularity: 68, durationSec: 198, audioUrl: "", artist: { id: 2014, name: "Woodland Voice" }, position: 4 },
          { id: 10015, title: "Ocean Waves", popularity: 74, durationSec: 245, audioUrl: "", artist: { id: 2015, name: "Coastal Dreams" }, position: 5 },
        ]
      },
      1004: {
        id: 1004,
        name: "Electronic Pulse",
        description: "High-energy electronic beats and synth melodies",
        coverImage: generateAlbumCover(1004),
        isStarter: true,
        createdAt: new Date().toISOString(),
        tracks: [
          { id: 10016, title: "Digital Sunrise", popularity: 83, durationSec: 256, audioUrl: "", artist: { id: 2016, name: "Synthwave" }, position: 1 },
          { id: 10017, title: "Binary Dreams", popularity: 78, durationSec: 198, audioUrl: "", artist: { id: 2017, name: "Code Music" }, position: 2 },
          { id: 10018, title: "Glitch Hop", popularity: 75, durationSec: 234, audioUrl: "", artist: { id: 2018, name: "Pixel Perfect" }, position: 3 },
          { id: 10019, title: "Neon Nights", popularity: 81, durationSec: 267, audioUrl: "", artist: { id: 2019, name: "Electric Dreams" }, position: 4 },
          { id: 10020, title: "Cyber Dance", popularity: 72, durationSec: 189, audioUrl: "", artist: { id: 2020, name: "Future Bass" }, position: 5 },
        ]
      }
    };
    
    return albumData[albumId] || {
      id: albumId,
      name: "Unknown Album",
      description: "Album details not available",
      coverImage: undefined,
      isStarter: true,
      createdAt: new Date().toISOString(),
      tracks: []
    };
  };

  const handleSavePlaylist = async () => {
    if (!data) return;
    
    console.log('handleSavePlaylist called');
    console.log('coverImage:', !!coverImage);
    console.log('playlistId:', playlistId);
    console.log('coverImage length:', coverImage?.length);
    
    try {
      // Save all data to localStorage
      if (coverImage) {
        console.log('Attempting to save cover image to localStorage...');
        localStorage.setItem(`playlist-cover-${playlistId}`, coverImage);
        console.log('Cover image saved to localStorage successfully');
        
        // Verify it was saved
        const saved = localStorage.getItem(`playlist-cover-${playlistId}`);
        console.log('Verification - cover image saved:', !!saved);
        console.log('Verification - saved length:', saved?.length);
      } else {
        console.log('No cover image to save, removing existing...');
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
        
        // Check if this is an album (ID >= 1001)
        if (playlistId >= 1001) {
          // Mock album data
          const mockAlbumData = getMockAlbumData(playlistId);
          console.log('Using mock album data:', mockAlbumData);
          if (!cancelled) setData(mockAlbumData);
        } else {
          // Regular playlist data
          const pl = await fetchPlaylist(playlistId);
          console.log('API response - full playlist data:', pl);
          console.log('API response - coverImage field:', pl.coverImage);
          if (!cancelled) setData(pl);
        }
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
              if (!data?.isStarter) {
                console.log('Cover image clicked');
                fileInputRef.current?.click();
              }
            }}
            style={{
              width: "128px",
              height: "128px",
              borderRadius: "12px",
              backgroundColor: "rgba(255, 255, 255, 0.1)",
              backgroundImage: coverImage ? `url(${coverImage})` : "none",
              backgroundSize: "cover",
              backgroundPosition: "center",
              cursor: data?.isStarter ? "default" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "background-color 0.2s ease",
              position: "relative",
              overflow: "hidden"
            }}
            onMouseEnter={(e) => {
              if (!coverImage && !data?.isStarter) {
                e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.15)";
              }
            }}
            onMouseLeave={(e) => {
              if (!coverImage && !data?.isStarter) {
                e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
              }
            }}
          >
            {!coverImage && !data?.isStarter && (
              <span style={{
                color: "rgba(255, 255, 255, 0.5)",
                fontSize: "0.9rem",
                fontWeight: "500"
              }}>
                Добавить
              </span>
            )}
            {coverImage && !data?.isStarter && (
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
                  const result = e.target?.result as string;
                  setCoverImage(result);
                  
                  // Save immediately to localStorage
                  if (playlistId && result) {
                    localStorage.setItem(`playlist-cover-${playlistId}`, result);
                    console.log('Cover image auto-saved to localStorage');
                  }
                };
                reader.readAsDataURL(file);
              }
            }}
          />
        </div>

        {/* Playlist Info */}
        <div style={{ flex: 1 }}>
          <div 
            style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: "12px", 
              marginBottom: "6px",
              position: "relative"
            }}
            onMouseEnter={(e) => {
              const pencilIcon = e.currentTarget.querySelector('.pencil-icon');
              if (pencilIcon) {
                (pencilIcon as HTMLElement).style.opacity = "1";
              }
            }}
            onMouseLeave={(e) => {
              const pencilIcon = e.currentTarget.querySelector('.pencil-icon');
              if (pencilIcon) {
                (pencilIcon as HTMLElement).style.opacity = "0";
              }
            }}
          >
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
                className="pencil-icon"
                style={{
                  border: "none",
                  backgroundColor: "transparent",
                  color: "rgba(255, 255, 255, 0.7)",
                  cursor: "pointer",
                  padding: "4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "opacity 0.2s ease, color 0.2s ease",
                  opacity: "0"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "#ffffff";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "rgba(255, 255, 255, 0.7)";
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
                cursor: data?.isStarter ? "default" : "pointer",
                transition: "color 0.2s ease",
                maxHeight: "5.6em" // 4 lines * 1.4 line height
              }}
              onMouseEnter={(e) => {
                if (!data?.isStarter) {
                  e.currentTarget.style.color = "#ffffff";
                }
              }}
              onMouseLeave={(e) => {
                if (!data?.isStarter) {
                  e.currentTarget.style.color = "rgba(255, 255, 255, 0.7)";
                }
              }}
              onClick={() => {
                if (!data?.isStarter) {
                  setIsEditing(true);
                  setEditingMode('description');
                  setEditTitle(data?.name || "");
                  setEditDescription(data?.description || "");
                }
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
                  className="playlist-name-input"
                  style={{
                    border: "none",
                    outline: "none"
                  }}
                  autoFocus
                />
              )}
              {editingMode === 'description' && (
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Добавить описание..."
                  className="playlist-name-input"
                  style={{
                    border: "none",
                    outline: "none",
                    height: "5.6em", // Exactly 4 lines (4 * 1.4)
                    resize: "none",
                    overflow: "hidden",
                    whiteSpace: "pre-wrap",
                    verticalAlign: "top",
                    lineHeight: "1.4"
                  }}
                  autoFocus
                />
              )}
              <div className="create-playlist-actions">
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditingMode(null);
                  }}
                  className="cancel-btn"
                >
                  Отмена
                </button>
                <button
                  onClick={handleSavePlaylist}
                  className="create-btn"
                >
                  Сохранить
                </button>
              </div>
            </div>
          )}
          <p className="fig-pl-sub" style={{ marginTop: isEditing ? "8px" : "4px" }}>
            {data ? `${data.tracks.length} треков` : "Загрузка…"}
          </p>
          {data?.isStarter && (
            <button
              type="button"
              className="fig-rc-heart fig-rc-heart-btn"
              style={{ 
                marginTop: "6px"
              }}
              onClick={() => {
                if (data) {
                  const isInLibrary = isAlbumInLibrary?.(data.id);
                  if (isInLibrary) {
                    // Remove from library
                    if (handleRemoveAlbumFromLibrary) {
                      handleRemoveAlbumFromLibrary(data.id);
                    }
                  } else {
                    // Add to library
                    if (handleAddAlbumToLibrary) {
                      const albumSummary: PlaylistSummary = {
                        id: data.id,
                        name: data.name,
                        coverImage: data.coverImage,
                        isStarter: data.isStarter,
                        createdAt: data.createdAt,
                        _count: { tracks: data.tracks.length }
                      };
                      handleAddAlbumToLibrary(albumSummary);
                    }
                  }
                }
              }}
              aria-label={isAlbumInLibrary?.(data.id) ? "Убрать из библиотеки" : "Добавить в библиотеку"}
            >
              <IconHeart filled={isAlbumInLibrary?.(data.id) || false} />
            </button>
          )}
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
                    showRemoveOption={!data?.isStarter}
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
      
          </div>
  );
}
