import { useCallback, useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { createPlaylist, deletePlaylist, fetchArtists, fetchPlaylists, removeTrackFromPlaylist, type ArtistOption, type PlaylistSummary } from "@/api";
import {
  IconDiscover,
  IconHeart,
  IconHome,
  IconLibraryStacks,
  IconPlus,
  IconSearch,
} from "@/icons/FigIcons";
import { useAuth } from "@/auth/AuthContext";
import { usePlayer } from "@/player/PlayerContext";
import PlayerBar from "@/layout/PlayerBar";
import type { MainLayoutOutletContext } from "@/layout/mainLayoutContext";
import ConfirmDialog from "@/components/ConfirmDialog";
import PlaylistSelector from "@/components/PlaylistSelector";
import "@/components/ConfirmDialog.css";
import "@/components/PlaylistSelector.css";

type LibTab = "playlists" | "albums" | "artists";

function getPlaylistCover(playlistId: number): string | undefined {
  return localStorage.getItem(`playlist-cover-${playlistId}`) || undefined;
}

function isLikedPlaylistName(name: string): boolean {
  const n = name.toLowerCase();
  return n.includes("избран") || n.includes("liked") || n.includes("любим");
}

function norm(s: string): string {
  return s.trim().toLowerCase();
}

function truncatePlaylistName(name: string): string {
  if (name.length <= 9) return name;
  return name.substring(0, 9) + "...";
}

export default function MainLayout() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const { recent, queue, setQueueFromTracks, playTrackAt, toggleLikeTrack, isTrackLiked } = usePlayer();
  const [playlists, setPlaylists] = useState<PlaylistSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [libTab, setLibTab] = useState<LibTab>("playlists");
  const [menuOpen, setMenuOpen] = useState(false);
  const [playlistSelectorOpen, setPlaylistSelectorOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [catalogArtists, setCatalogArtists] = useState<ArtistOption[] | null>(null);
  const [artistsLoading, setArtistsLoading] = useState(false);
  const [albums, setAlbums] = useState<PlaylistSummary[]>([]);
  const [userAlbums, setUserAlbums] = useState<PlaylistSummary[]>([]);
  const [playlistToDelete, setPlaylistToDelete] = useState<PlaylistSummary | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [trackToDelete, setTrackToDelete] = useState<{ id: number; title: string; playlistId: number } | null>(null);
  const [trackDeleteConfirmOpen, setTrackDeleteConfirmOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchPlaylists();
      setPlaylists(data);
      
      // No albums in library - only available on main page
      setAlbums([]);
    } catch {
      setPlaylists([]);
      setAlbums([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();

    const handlePlaylistUpdate = () => {
      void load();
    };

    window.addEventListener('playlist-updated', handlePlaylistUpdate);
    
    return () => {
      window.removeEventListener('playlist-updated', handlePlaylistUpdate);
    };
  }, [load]);

  useEffect(() => {
    if (libTab !== "artists") return;
    let cancelled = false;
    setArtistsLoading(true);
    (async () => {
      try {
        const data = await fetchArtists();
        if (!cancelled) setCatalogArtists(data);
      } catch {
        if (!cancelled) setCatalogArtists([]);
      } finally {
        if (!cancelled) setArtistsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [libTab]);

  const filteredPlaylists = useMemo(() => {
    const q = norm(searchQuery);
    if (!q) return playlists;
    return playlists.filter((p) => norm(p.name).includes(q));
  }, [playlists, searchQuery]);

  const filteredArtists = useMemo(() => {
    if (!catalogArtists) return [];
    const q = norm(searchQuery);
    if (!q) return catalogArtists;
    return catalogArtists.filter((a) => norm(a.name).includes(q));
  }, [catalogArtists, searchQuery]);

  function handleNewPlaylist() {
    setPlaylistSelectorOpen(true);
  }

  const handleDeleteClick = (playlist: PlaylistSummary) => {
    if (playlist.isStarter) {
      window.alert("Нельзя удалить стартовый плейлист");
      return;
    }
    setPlaylistToDelete(playlist);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!playlistToDelete) return;
    
    try {
      await deletePlaylist(playlistToDelete.id);
      
      // Check if user is currently in the deleted playlist
      const currentPath = window.location.pathname;
      const isCurrentPlaylist = currentPath.includes(`/playlist/${playlistToDelete.id}`);
      
      // Update playlists list immediately
      setPlaylists(prev => prev.filter(p => p.id !== playlistToDelete.id));
      setDeleteConfirmOpen(false);
      setPlaylistToDelete(null);
      
      // Redirect to main page if deleting current playlist
      if (isCurrentPlaylist) {
        window.location.href = '/';
      }
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Не удалось удалить плейлист");
    }
  };

  const handleCancelDelete = () => {
    setDeleteConfirmOpen(false);
    setPlaylistToDelete(null);
  };

  const handleTrackDelete = (trackId: number, trackTitle: string, playlistId: number) => {
    setTrackToDelete({ id: trackId, title: trackTitle, playlistId });
    setTrackDeleteConfirmOpen(true);
  };

  const handleConfirmTrackDelete = async () => {
    if (!trackToDelete) return;
    
    try {
      await removeTrackFromPlaylist(trackToDelete.playlistId, trackToDelete.id);
      
      // Trigger playlist update event to refresh the page
      window.dispatchEvent(new CustomEvent('playlist-updated'));
      
      console.log('Track deleted from playlist');
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Не удалось удалить трек");
    } finally {
      setTrackDeleteConfirmOpen(false);
      setTrackToDelete(null);
    }
  };

  const handleCancelTrackDelete = () => {
    setTrackDeleteConfirmOpen(false);
    setTrackToDelete(null);
  };

  const handleAddAlbumToLibrary = (album: PlaylistSummary) => {
    setUserAlbums(prev => {
      const exists = prev.some(a => a.id === album.id);
      if (!exists) {
        return [...prev, album];
      }
      return prev;
    });
  };

  const handleRemoveAlbumFromLibrary = (albumId: number) => {
    setUserAlbums(prev => prev.filter(a => a.id !== albumId));
  };

  const isAlbumInLibrary = (albumId: number) => {
    return userAlbums.some(a => a.id === albumId);
  };

  const outletContext = useMemo<MainLayoutOutletContext>(
    () => ({ 
      searchQuery, 
      setSearchQuery,
      handleAddAlbumToLibrary,
      handleRemoveAlbumFromLibrary,
      isAlbumInLibrary,
      handleTrackDelete
    }),
    [searchQuery, handleAddAlbumToLibrary, handleRemoveAlbumFromLibrary, isAlbumInLibrary, handleTrackDelete]
  );

  return (
    <div className="fig-layout">
      <div className="fig-col-left">
        <nav className="glass fig-nav-block" aria-label="Основная навигация">
          <NavLink className={({ isActive }) => `fig-nav-link${isActive ? " active" : ""}`} to="/" end>
            <IconHome />
            Главная
          </NavLink>
          <button
            type="button"
            className="fig-nav-link"
            style={{ border: "none", width: "100%" }}
            onClick={() => {
              document.getElementById("fig-search-input")?.focus();
            }}
          >
            <IconSearch />
            Поиск
          </button>
          <NavLink className={({ isActive }) => `fig-nav-link${isActive ? " active" : ""}`} to="/discover">
            <IconDiscover />
            Открытия
          </NavLink>
        </nav>

        <div className="glass fig-library">
          <div className="fig-library-head">
            <div className="fig-library-title-row">
              <IconLibraryStacks />
              <span className="fig-library-title">Ваша библиотека</span>
            </div>
            <button
              type="button"
              className="fig-library-head-search"
              aria-label="Фокус на поиске"
              onClick={() => document.getElementById("fig-search-input")?.focus()}
            >
              <IconSearch />
            </button>
          </div>
          <div className="fig-tabs" role="tablist">
            {(
              [
                ["playlists", "Плейлисты"],
                ["albums", "Альбомы"],
                ["artists", "Артисты"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                className={`fig-tab ${libTab === id ? "active" : ""}`}
                onClick={() => setLibTab(id)}
              >
                {label}
              </button>
            ))}
          </div>

          {libTab === "playlists" ? (
            <>
              <div className="fig-library-pl-body">
                {loading ? (
                  <p className="fig-pl-sub">Загрузка…</p>
                ) : (
                  <ul className="fig-pl-list">
                    {filteredPlaylists.map((p) => (
                      <li key={p.id} style={{ position: 'relative' }}>
                        <button
                          type="button"
                          className="fig-pl-row"
                          onClick={() => navigate(`/playlist/${p.id}`)}
                        >
                          <div
                            className={
                              isLikedPlaylistName(p.name)
                                ? "fig-cover-lib fig-cover--heart"
                                : "fig-cover-lib"
                            }
                            style={
                              isLikedPlaylistName(p.name)
                                ? undefined
                                : (() => {
                                    const uploadedCover = getPlaylistCover(p.id);
                                    if (uploadedCover) {
                                      return {
                                        backgroundImage: `url(${uploadedCover})`,
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center',
                                        backgroundRepeat: 'no-repeat'
                                      };
                                    }
                                    return {
                                      background: `linear-gradient(135deg, hsl(${(p.id * 47) % 360}, 48%, 38%), hsl(${((p.id * 23) % 360) || 210}, 40%, 22%))`,
                                    };
                                  })()
                            }
                          >
                            {isLikedPlaylistName(p.name) ? <IconHeart filled /> : null}
                          </div>
                          <div className="fig-pl-meta">
                            <div className="fig-pl-name">{truncatePlaylistName(p.name)}</div>
                            <div className="fig-pl-sub">Плейлист · {p._count.tracks} треков</div>
                          </div>
                        </button>
                        {!p.isStarter && (
                          <span
                            className="fig-pl-more"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClick(p);
                            }}
                            title="Удалить плейлист"
                            style={{
                              position: 'absolute',
                              right: '12px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '24px',
                              height: '24px',
                              cursor: 'pointer',
                              opacity: '0.6',
                              transition: 'opacity 0.2s ease',
                              zIndex: 10
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                            onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
                          >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                              <circle cx="8" cy="3" r="1.5"/>
                              <circle cx="8" cy="8" r="1.5"/>
                              <circle cx="8" cy="13" r="1.5"/>
                            </svg>
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <button type="button" className="fig-new-pl" onClick={() => void handleNewPlaylist()}>
                <IconPlus className="fig-new-pl-icon" aria-hidden />
                Новый плейлист
              </button>
            </>
          ) : libTab === "albums" ? (
            <div className="fig-library-pl-body fig-library-albums">
              {loading ? (
                <p className="fig-pl-sub">Загрузка…</p>
              ) : userAlbums.length === 0 ? (
                <p className="fig-pl-sub">Вы еще не добавили альбомы в библиотеку.</p>
              ) : (
                <ul className="fig-lib-album-grid">
                  {userAlbums.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        className="fig-lib-album-card"
                        onClick={() => navigate(`/playlist/${p.id}`)}
                      >
                        <div
                          className="fig-lib-album-cover"
                          style={{
                            background: `linear-gradient(135deg, hsl(${(p.id * 47) % 360}, 48%, 38%), hsl(${((p.id * 23) % 360) || 210}, 40%, 22%))`,
                          }}
                          aria-hidden
                        />
                        <div className="fig-lib-album-meta">
                          <div className="fig-lib-album-name">{p.name}</div>
                          <div className="fig-pl-sub">{p._count.tracks} треков</div>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <div className="fig-library-pl-body">
              {artistsLoading || catalogArtists === null ? (
                <p className="fig-pl-sub">Загрузка артистов…</p>
              ) : filteredArtists.length === 0 ? (
                <p className="fig-pl-sub">Нет артистов по запросу.</p>
              ) : (
                <ul className="fig-pl-list">
                  {filteredArtists.map((a) => (
                    <li key={a.id}>
                      <button
                        type="button"
                        className="fig-pl-row"
                        onClick={() => navigate(`/artist/${a.id}`)}
                      >
                        <div
                          className="fig-cover-lib"
                          style={{
                            background: `linear-gradient(135deg, hsl(${(a.id * 47) % 360}, 48%, 38%), hsl(${((a.id * 23) % 360) || 210}, 40%, 22%))`,
                          }}
                          aria-hidden
                        />
                        <div className="fig-pl-meta">
                          <div className="fig-pl-name">{a.name}</div>
                          <div className="fig-pl-sub">{a.trackCount} треков в каталоге</div>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>

      <main className="glass fig-main-panel">
        <div className="fig-main-top">
          <label className="fig-search" htmlFor="fig-search-input">
            <IconSearch />
            <input
              id="fig-search-input"
              placeholder="Поиск по артисту, треку или альбому"
              autoComplete="off"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </label>
          <div className="fig-user">
            <button type="button" className="fig-avatar" title={user?.displayName} onClick={() => setMenuOpen((v) => !v)} aria-label="Профиль" />
            {menuOpen ? (
              <div style={{ position: "relative" }}>
                <div
                  className="glass"
                  style={{
                    position: "absolute",
                    right: 0,
                    top: 8,
                    minWidth: 160,
                    padding: "0.5rem",
                    borderRadius: 12,
                    zIndex: 20,
                  }}
                >
                  <div className="fig-pl-sub" style={{ padding: "0.35rem 0.5rem" }}>
                    {user?.displayName}
                  </div>
                  <button
                    type="button"
                    className="fig-pl-row"
                    style={{ padding: "0.5rem" }}
                    onClick={() => {
                      logout();
                      setMenuOpen(false);
                    }}
                  >
                    Выйти
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
        <Outlet context={outletContext} />
      </main>

      <aside className="fig-col-right">
        <div className="glass">
          <div className="fig-rc-head">
            <span className="fig-rc-title">Играло недавно</span>
            <button type="button" className="fig-rc-all" onClick={() => navigate("/recent")}>
              Смотреть все
            </button>
          </div>
          <ul className="fig-rc-list">
            {(recent.length ? recent.slice(0, 8) : []).map((t) => (
              <li key={`${t.id}-${t.title}`}>
                <div className="fig-rc-row">
                  <button
                    type="button"
                    className="fig-rc-item fig-rc-item-play"
                    onClick={() => {
                      const idx = queue.findIndex((x) => x.id === t.id);
                      if (idx >= 0) playTrackAt(idx);
                      else setQueueFromTracks([t], 0, true);
                    }}
                  >
                    <div
                      className="fig-cover-lib"
                      style={{
                        background: `linear-gradient(135deg, hsl(${(t.id * 47) % 360}, 48%, 38%), hsl(${((t.id * 23) % 360) || 210}, 40%, 22%))`,
                      }}
                      aria-hidden
                    />
                    <div className="fig-rc-meta">
                      <div className="fig-rc-track-title">{t.title}</div>
                      <div className="fig-rc-track-artist">{t.artist}</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    className="fig-rc-heart fig-rc-heart-btn"
                    aria-label={isTrackLiked(t.id) ? "Убрать из избранного" : "В избранное"}
                    onClick={() => toggleLikeTrack(t.id)}
                  >
                    <IconHeart filled={isTrackLiked(t.id)} />
                  </button>
                </div>
              </li>
            ))}
            {!recent.length ? (
              <li className="fig-rc-empty">Здесь появятся треки после воспроизведения.</li>
            ) : null}
          </ul>
        </div>
      </aside>

      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        title="Удалить плейлист?"
        message={`Вы уверены, что хотите удалить плейлист "${playlistToDelete?.name}"? Это действие нельзя отменить.`}
        confirmText="Удалить"
        cancelText="Отмена"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        danger={true}
      />

      <ConfirmDialog
        isOpen={trackDeleteConfirmOpen}
        title="Удалить из плейлиста?"
        message={`Вы уверены, что хотите удалить трек "${trackToDelete?.title}" из плейлиста?`}
        confirmText="Удалить"
        cancelText="Отмена"
        onConfirm={handleConfirmTrackDelete}
        onCancel={handleCancelTrackDelete}
        danger={true}
      />

      {playlistSelectorOpen && (
        <PlaylistSelector
          trackId={0} // Placeholder track ID for creating playlist without track
          onClose={() => setPlaylistSelectorOpen(false)}
          onTrackAdded={() => {
            setPlaylistSelectorOpen(false);
            load(); // Refresh playlists after creation
          }}
        />
      )}

      <div className="fig-player-slot">
        <PlayerBar />
      </div>
    </div>
  );
}
