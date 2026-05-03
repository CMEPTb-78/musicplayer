import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchArtists,
  fetchDiscoverTracks,
  fetchPlaylist,
  fetchPlaylists,
  type ArtistOption,
  type CatalogTrack,
  type PlaylistDetail,
  type PlaylistSummary,
} from "@/api";
import { IconHeart, IconMoreVert } from "@/icons/FigIcons";
import { useMainLayoutOutlet } from "@/layout/mainLayoutContext";
import { catalogTracksToPlayerTracks } from "@/layout/playlistToPlayerTracks";
import { usePlayer } from "@/player/PlayerContext";
import { formatDuration, formatDurationHuman } from "@/utils/format";
import PlaylistSelector from "@/components/PlaylistSelector";
import "@/components/PlaylistSelector.css";

const MOODS = ["Энергичное", "Хорошее настроение", "Релакс", "Спорт", "Грустное", "Веселое"] as const;

type MainTab = "playlists" | "artists" | "albums" | "fav";

function norm(s: string): string {
  return s.trim().toLowerCase();
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { searchQuery } = useMainLayoutOutlet();
  const { setQueueFromTracks, index: qIndex, queue, isTrackLiked, toggleLikeTrack, likedTrackIds } = usePlayer();
  const [lists, setLists] = useState<PlaylistSummary[] | null>(null);
  const [detail, setDetail] = useState<PlaylistDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [discoverTracks, setDiscoverTracks] = useState<CatalogTrack[]>([]);
  const [mood, setMood] = useState<string | null>(null);
  const [mainTab, setMainTab] = useState<MainTab>("playlists");
  const [dashArtists, setDashArtists] = useState<ArtistOption[] | null>(null);
  const [catalogTracks, setCatalogTracks] = useState<CatalogTrack[] | null>(null);
  const [selectedTrackId, setSelectedTrackId] = useState<number | null>(null);
  const { handleAddAlbumToLibrary, isAlbumInLibrary } = useMainLayoutOutlet();

  // Add drag to scroll functionality for moods container
  useEffect(() => {
    const moodsContainer = document.querySelector('.fig-moods') as HTMLElement;
    if (!moodsContainer) return;

    let isDown = false;
    let startX: number;
    let scrollLeft: number;

    const handleMouseDown = (e: Event) => {
      const mouseEvent = e as MouseEvent;
      isDown = true;
      moodsContainer.classList.add('dragging');
      startX = mouseEvent.pageX - moodsContainer.offsetLeft;
      scrollLeft = moodsContainer.scrollLeft;
    };

    const handleMouseLeave = () => {
      isDown = false;
      moodsContainer.classList.remove('dragging');
    };

    const handleMouseUp = () => {
      isDown = false;
      moodsContainer.classList.remove('dragging');
    };

    const handleMouseMove = (e: Event) => {
      if (!isDown) return;
      const mouseEvent = e as MouseEvent;
      mouseEvent.preventDefault();
      const x = mouseEvent.pageX - moodsContainer.offsetLeft;
      const walk = (x - startX) * 2; // Adjust scroll speed
      moodsContainer.scrollLeft = scrollLeft - walk;
    };

    moodsContainer.addEventListener('mousedown', handleMouseDown);
    moodsContainer.addEventListener('mouseleave', handleMouseLeave);
    moodsContainer.addEventListener('mouseup', handleMouseUp);
    moodsContainer.addEventListener('mousemove', handleMouseMove);

    return () => {
      moodsContainer.removeEventListener('mousedown', handleMouseDown);
      moodsContainer.removeEventListener('mouseleave', handleMouseLeave);
      moodsContainer.removeEventListener('mouseup', handleMouseUp);
      moodsContainer.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  useEffect(() => {
    const loadPlaylists = async () => {
      let cancelled = false;
      try {
        const data = await fetchPlaylists();
        if (cancelled) return;
        setLists(data);
        const sorted = [...data].sort((a, b) => b._count.tracks - a._count.tracks);
        const best = sorted.find((p) => p._count.tracks > 0) ?? sorted[0];
        if (!best) {
          setDetail(null);
          return;
        }
        const d = await fetchPlaylist(best.id);
        if (!cancelled) setDetail(d);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Ошибка");
      }
    };

    loadPlaylists();

    const handlePlaylistUpdate = () => {
      loadPlaylists();
    };

    window.addEventListener('playlist-updated', handlePlaylistUpdate);
    
    return () => {
      window.removeEventListener('playlist-updated', handlePlaylistUpdate);
    };
  }, []);

  useEffect(() => {
    const loadDiscoverTracks = async () => {
      try {
        const data = await fetchDiscoverTracks(100);
        setDiscoverTracks(data.tracks);
      } catch (e) {
        console.error('Failed to load discover tracks:', e);
      }
    };

    loadDiscoverTracks();
  }, []);

  useEffect(() => {
    if (mainTab !== "artists") return;
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchArtists();
        if (!cancelled) setDashArtists(data);
      } catch {
        if (!cancelled) setDashArtists([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mainTab]);

  useEffect(() => {
    if (mainTab !== "fav") return;
    let cancelled = false;
    (async () => {
      try {
        const { tracks } = await fetchDiscoverTracks(200); // Fetch more tracks for favorites
        if (!cancelled) setCatalogTracks(tracks);
      } catch {
        if (!cancelled) setCatalogTracks([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mainTab]);

  const orderedTracks = useMemo(() => {
    const base = detail?.tracks ?? [];
    const list = [...base];
    if (mood === "Энергичное" || mood === "Спорт" || mood === "Веселое") {
      list.sort((a, b) => b.popularity - a.popularity || a.title.localeCompare(b.title));
    } else if (mood === "Релакс" || mood === "Грустное") {
      list.sort((a, b) => a.popularity - b.popularity || a.title.localeCompare(b.title));
    } else if (mood === "Хорошее настроение") {
      list.sort((a, b) => b.durationSec - a.durationSec || a.title.localeCompare(b.title));
    }
    return list;
  }, [detail?.tracks, mood]);

  const searchFilteredTracks = useMemo(() => {
    const q = norm(searchQuery);
    if (!q) return orderedTracks;
    return orderedTracks.filter((t) => norm(t.title).includes(q) || norm(t.artist.name).includes(q));
  }, [orderedTracks, searchQuery]);

  const displayTracks = useMemo(() => {
    if (mainTab !== "fav") return searchFilteredTracks;
    
    // For favorites tab, use catalog tracks instead of playlist tracks
    if (!catalogTracks) return [];
    
    const q = norm(searchQuery);
    let favoriteTracks = catalogTracks.filter((t) => isTrackLiked(t.id));
    
    if (q) {
      favoriteTracks = favoriteTracks.filter((t) => 
        norm(t.title).includes(q) || norm(t.artist.name).includes(q)
      );
    }
    
    return favoriteTracks;
  }, [searchFilteredTracks, mainTab, likedTrackIds, isTrackLiked, catalogTracks, searchQuery]);

  const playerTracksForQueue = useMemo(
    () =>
      displayTracks.map((t) => ({
        id: t.id,
        title: t.title,
        artist: t.artist.name,
        durationSec: t.durationSec,
      })),
    [displayTracks]
  );

  useEffect(() => {
    if (!detail || mainTab !== "playlists") return;
    if (!playerTracksForQueue.length) return;
    setQueueFromTracks(playerTracksForQueue, 0, false);
  }, [detail?.id, mainTab, playerTracksForQueue, setQueueFromTracks]);

  const featured = useMemo(() => {
    const unlikedTracks = discoverTracks.filter(track => !isTrackLiked(track.id));
    const q = norm(searchQuery);
    let filtered = unlikedTracks;
    if (q) filtered = filtered.filter((t) => norm(t.title).includes(q) || norm(t.artist.name).includes(q));
    
    // Create 3 collections from unliked tracks
    const collections = [
      {
        id: 10001,
        name: "Новые открытия",
        _count: { tracks: Math.min(8, filtered.slice(0, 8).length) },
        isStarter: true,
        createdAt: new Date().toISOString(),
        tracks: filtered.slice(0, 8),
        styleClass: "collection-new",
        gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        icon: "🌟"
      },
      {
        id: 10002,
        name: "Хиты",
        _count: { tracks: Math.min(6, filtered.slice(8, 14).length) },
        isStarter: true,
        createdAt: new Date().toISOString(),
        tracks: filtered.slice(8, 14),
        styleClass: "collection-popular",
        gradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
        icon: "🔥"
      },
      {
        id: 10003,
        name: "Скрытые жемчужины",
        _count: { tracks: Math.min(10, filtered.slice(14, 24).length) },
        isStarter: true,
        createdAt: new Date().toISOString(),
        tracks: filtered.slice(14, 24),
        styleClass: "collection-hidden",
        gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
        icon: "💎"
      }
    ].filter(c => c._count.tracks > 0);
    
    return collections;
  }, [discoverTracks, isTrackLiked, searchQuery]);

  const filteredListsForAlbums = useMemo(() => {
    // Mock albums from other users (not editable)
    const mockAlbums: PlaylistSummary[] = [
      { id: 1001, name: "Midnight Sessions", _count: { tracks: 15 }, isStarter: true, createdAt: new Date().toISOString() },
      { id: 1002, name: "Urban Legends", _count: { tracks: 22 }, isStarter: true, createdAt: new Date().toISOString() },
      { id: 1003, name: "Acoustic Dreams", _count: { tracks: 18 }, isStarter: true, createdAt: new Date().toISOString() },
      { id: 1004, name: "Electronic Pulse", _count: { tracks: 31 }, isStarter: true, createdAt: new Date().toISOString() },
      { id: 1005, name: "Jazz Nights", _count: { tracks: 24 }, isStarter: true, createdAt: new Date().toISOString() },
      { id: 1006, name: "Rock Revolution", _count: { tracks: 28 }, isStarter: true, createdAt: new Date().toISOString() },
      { id: 1007, name: "Classical Moods", _count: { tracks: 19 }, isStarter: true, createdAt: new Date().toISOString() },
      { id: 1008, name: "World Beats", _count: { tracks: 33 }, isStarter: true, createdAt: new Date().toISOString() },
      { id: 1009, name: "Retro Wave", _count: { tracks: 26 }, isStarter: true, createdAt: new Date().toISOString() },
      { id: 1010, name: "Future Bass", _count: { tracks: 21 }, isStarter: true, createdAt: new Date().toISOString() },
      { id: 1011, name: "Soulful Sundays", _count: { tracks: 17 }, isStarter: true, createdAt: new Date().toISOString() },
      { id: 1012, name: "Metal Mayhem", _count: { tracks: 35 }, isStarter: true, createdAt: new Date().toISOString() },
    ];
    
    const q = norm(searchQuery);
    if (!q) return mockAlbums;
    return mockAlbums.filter((p) => norm(p.name).includes(q));
  }, [searchQuery]);

  // Mock album details with tracks
  const mockAlbumDetails = useMemo(() => {
    return {
      1001: {
        id: 1001,
        name: "Midnight Sessions",
        description: "Intimate late-night recordings from underground artists",
        coverImage: null,
        isStarter: true,
        tracks: [
          { id: 10001, title: "After Hours", artist: "Luna Echo", duration: 245, position: 1 },
          { id: 10002, title: "Neon Dreams", artist: "Nightwave", duration: 198, position: 2 },
          { id: 10003, title: "City Lights", artist: "Urban Pulse", duration: 267, position: 3 },
          { id: 10004, title: "Midnight Blues", artist: "Jazz Noir", duration: 312, position: 4 },
          { id: 10005, title: "Silent Streets", artist: "Echo Chamber", duration: 189, position: 5 },
        ]
      },
      1002: {
        id: 1002,
        name: "Urban Legends",
        description: "Stories from the city streets and underground culture",
        coverImage: null,
        isStarter: true,
        tracks: [
          { id: 10006, title: "Concrete Jungle", artist: "Street poet", duration: 234, position: 1 },
          { id: 10007, title: "Subway Stories", artist: "Metro Beats", duration: 267, position: 2 },
          { id: 10008, title: "Rooftop Views", artist: "Sky High", duration: 201, position: 3 },
          { id: 10009, title: "Graffiti Nights", artist: "Art Attack", duration: 289, position: 4 },
          { id: 10010, title: "Back Alley Blues", artist: "Shadow Walker", duration: 245, position: 5 },
        ]
      },
      1003: {
        id: 1003,
        name: "Acoustic Dreams",
        description: "Unplugged sessions and intimate performances",
        coverImage: null,
        isStarter: true,
        tracks: [
          { id: 10011, title: "Morning Coffee", artist: "Acoustic Soul", duration: 178, position: 1 },
          { id: 10012, title: "Rainy Days", artist: "Folk Heart", duration: 234, position: 2 },
          { id: 10013, title: "Sunset Sessions", artist: "Golden Hour", duration: 267, position: 3 },
          { id: 10014, title: "Campfire Songs", artist: "Woodland Voice", duration: 198, position: 4 },
          { id: 10015, title: "Ocean Waves", artist: "Coastal Dreams", duration: 245, position: 5 },
        ]
      }
      // Add more albums as needed...
    };
  }, []);

  const filteredDashArtists = useMemo(() => {
    if (!dashArtists) return [];
    const q = norm(searchQuery);
    if (!q) return dashArtists;
    return dashArtists.filter((a) => norm(a.name).includes(q));
  }, [dashArtists, searchQuery]);

  
  function approxDuration(count: number): string {
    return formatDurationHuman(count * 180);
  }

  return (
    <div className="fig-page-stack">
      <div className="fig-moods" aria-label="Настроение">
        {MOODS.map((m) => (
          <button
            key={m}
            type="button"
            className={`fig-mood${mood === m ? " active" : ""}`}
            onClick={() => setMood((x) => (x === m ? null : m))}
          >
            {m}
          </button>
        ))}
      </div>

      <div className="fig-featured">
        {featured.length === 0 && !lists ? (
          <span className="fig-pl-sub">Загрузка подборок…</span>
        ) : (
          featured.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`fig-day-card ${p.styleClass}`}
              onClick={() => {
                if (p.tracks && p.tracks.length > 0) {
                  const playerTracks = catalogTracksToPlayerTracks(p.tracks || []);
                  setQueueFromTracks(playerTracks, 0, true);
                }
              }}
              style={{
                background: p.gradient
              }}
            >
              <div className="fig-day-card-inner" style={{ minHeight: '180px' }}>
                <div className="fig-day-meta" style={{ 
                  marginBottom: '2px',
                  maxWidth: '100%',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {p._count.tracks} треков · {approxDuration(p._count.tracks)}
                </div>
                <div className="fig-day-label" style={{ 
                  marginBottom: '2px',
                  maxWidth: '100%',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontSize: '0.9rem',
                  lineHeight: '1.2'
                }}>
                  {p.name}
                </div>
                <div className="fig-day-thumb" aria-hidden />
              </div>
            </button>
          ))
        )}
      </div>

      <div className="fig-subtabs" role="tablist">
        {(
          [
            ["playlists", "Плейлисты"],
            ["artists", "Артисты"],
            ["albums", "Альбомы"],
            ["fav", "Любимое"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            className={`fig-subtab ${mainTab === id ? "active" : ""}`}
            onClick={() => setMainTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="fig-tab-body">
        {error ? <div className="error">{error}</div> : null}

        {mainTab === "playlists" ? (
          <div className="fig-tracks">
          {!detail ? (
            <p className="fig-pl-sub">Нет треков для отображения — создайте плейлист или зарегистрируйтесь заново.</p>
          ) : displayTracks.length === 0 ? (
            <p className="fig-pl-sub">Нет треков по фильтру. Сбросьте поиск или вкладку «Любимое».</p>
          ) : (
            displayTracks.map((t, rowIndex) => {
              const active = queue[qIndex]?.id === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  className={`fig-track-row${active ? " active" : ""}`}
                  onClick={() => {
                    setQueueFromTracks(playerTracksForQueue, rowIndex, true);
                  }}
                >
                  <span className="fig-t-num">{rowIndex + 1}</span>
                  <span className="fig-t-cover" aria-hidden />
                  <span className="fig-t-meta-row">
                    <span className="fig-t-title">{t.title}</span>
                    <span className="fig-t-artist">{t.artist.name}</span>
                    <span className="fig-t-dur">{formatDuration(t.durationSec)}</span>
                  </span>
                  <span className="fig-track-actions">
                    <span
                      role="button"
                      tabIndex={0}
                      className="fig-track-action-hit"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLikeTrack(t.id);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleLikeTrack(t.id);
                        }
                      }}
                    >
                      <IconHeart filled={isTrackLiked(t.id)} />
                    </span>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTrackId(t.id);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          e.stopPropagation();
                          setSelectedTrackId(t.id);
                        }
                      }}
                      title="Добавить в плейлист"
                    >
                      <IconMoreVert />
                    </span>
                  </span>
                </button>
              );
            })
          )}
          </div>
        ) : mainTab === "artists" ? (
          <div className="fig-dash-grid">
          {dashArtists === null ? (
            <p className="fig-pl-sub">Загрузка…</p>
          ) : filteredDashArtists.length === 0 ? (
            <p className="fig-pl-sub">Артисты не найдены.</p>
          ) : (
            <ul className="fig-dash-artist-list">
              {filteredDashArtists.map((a) => (
                <li key={a.id}>
                  <button type="button" className="fig-dash-artist-row" onClick={() => navigate(`/artist/${a.id}`)}>
                    <span
                      className="fig-dash-artist-dot"
                      style={{
                        background: `linear-gradient(135deg, hsl(${(a.id * 47) % 360}, 48%, 38%), hsl(${((a.id * 23) % 360) || 210}, 40%, 22%))`,
                      }}
                      aria-hidden
                    />
                    <span className="fig-dash-artist-name">{a.name}</span>
                    <span className="fig-pl-sub">{a.trackCount} треков</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          </div>
        ) : mainTab === "albums" ? (
          <div className="fig-dash-albums">
          {!lists ? (
            <p className="fig-pl-sub">Загрузка…</p>
          ) : filteredListsForAlbums.length === 0 ? (
            <p className="fig-pl-sub">Нет плейлистов по запросу.</p>
          ) : (
            <ul className="fig-dash-album-grid">
              {filteredListsForAlbums.map((p) => (
                <li key={p.id}>
                  <button 
                    type="button" 
                    className="fig-dash-album-card"
                    onClick={() => navigate(`/playlist/${p.id}`)}
                  >
                    <div
                      className="fig-dash-album-cover"
                      style={{
                        background: `linear-gradient(135deg, hsl(${(p.id * 47) % 360}, 48%, 38%), hsl(${((p.id * 23) % 360) || 210}, 40%, 22%))`,
                      }}
                      aria-hidden
                    />
                    <div className="fig-dash-album-title">{p.name}</div>
                    <div className="fig-pl-sub">{p._count.tracks} треков</div>
                  </button>
                </li>
              ))}
            </ul>
          )}
          </div>
        ) : (
          <div className="fig-tracks">
          {!detail ? (
            <p className="fig-pl-sub">Нет данных плейлиста.</p>
          ) : displayTracks.length === 0 ? (
            <p className="fig-pl-sub">Пока нет избранных треков — нажмите на сердечко у композиции.</p>
          ) : (
            displayTracks.map((t, rowIndex) => {
              const active = queue[qIndex]?.id === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  className={`fig-track-row${active ? " active" : ""}`}
                  onClick={() => setQueueFromTracks(playerTracksForQueue, rowIndex, true)}
                >
                  <span className="fig-t-num">{rowIndex + 1}</span>
                  <span className="fig-t-cover" aria-hidden />
                  <span className="fig-t-meta-row">
                    <span className="fig-t-title">{t.title}</span>
                    <span className="fig-t-artist">{t.artist.name}</span>
                    <span className="fig-t-dur">{formatDuration(t.durationSec)}</span>
                  </span>
                  <span className="fig-track-actions">
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLikeTrack(t.id);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleLikeTrack(t.id);
                        }
                      }}
                    >
                      <IconHeart filled={isTrackLiked(t.id)} />
                    </span>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTrackId(t.id);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          e.stopPropagation();
                          setSelectedTrackId(t.id);
                        }
                      }}
                      title="Добавить в плейлист"
                    >
                      <IconMoreVert />
                    </span>
                  </span>
                </button>
              );
            })
          )}
          </div>
        )}
      </div>
      
      {selectedTrackId && (
        <PlaylistSelector
          trackId={selectedTrackId}
          onClose={() => setSelectedTrackId(null)}
          onTrackAdded={() => {
            // Trigger a global refresh of playlists list to update track counts
            window.dispatchEvent(new CustomEvent('playlist-updated'));
          }}
        />
      )}
    </div>
  );
}
