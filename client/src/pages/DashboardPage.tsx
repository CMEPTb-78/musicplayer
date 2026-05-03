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
  const [mood, setMood] = useState<string | null>(null);
  const [mainTab, setMainTab] = useState<MainTab>("playlists");
  const [dashArtists, setDashArtists] = useState<ArtistOption[] | null>(null);
  const [catalogTracks, setCatalogTracks] = useState<CatalogTrack[] | null>(null);
  const [selectedTrackId, setSelectedTrackId] = useState<number | null>(null);

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
    if (!lists) return [];
    const q = norm(searchQuery);
    let top = [...lists].sort((a, b) => b._count.tracks - a._count.tracks);
    if (q) top = top.filter((p) => norm(p.name).includes(q));
    return top.slice(0, 3);
  }, [lists, searchQuery]);

  const filteredListsForAlbums = useMemo(() => {
    if (!lists) return [];
    const q = norm(searchQuery);
    if (!q) return lists;
    return lists.filter((p) => norm(p.name).includes(q));
  }, [lists, searchQuery]);

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
              className="fig-day-card"
              onClick={() => navigate(`/playlist/${p.id}`)}
            >
              <div className="fig-day-card-inner">
                <div className="fig-day-meta">
                  {p._count.tracks} треков · {approxDuration(p._count.tracks)}
                </div>
                <div className="fig-day-label">Плейлист дня</div>
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
                  <button type="button" className="fig-dash-album-card" onClick={() => navigate(`/playlist/${p.id}`)}>
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
