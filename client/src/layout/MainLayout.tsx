import { useCallback, useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { createPlaylist, fetchArtists, fetchPlaylists, type ArtistOption, type PlaylistSummary } from "@/api";
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

type LibTab = "playlists" | "albums" | "artists";

function isLikedPlaylistName(name: string): boolean {
  const n = name.toLowerCase();
  return n.includes("избран") || n.includes("liked") || n.includes("любим");
}

function norm(s: string): string {
  return s.trim().toLowerCase();
}

export default function MainLayout() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const { recent, queue, setQueueFromTracks, playTrackAt, toggleLikeTrack, isTrackLiked } = usePlayer();
  const [playlists, setPlaylists] = useState<PlaylistSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [libTab, setLibTab] = useState<LibTab>("playlists");
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [catalogArtists, setCatalogArtists] = useState<ArtistOption[] | null>(null);
  const [artistsLoading, setArtistsLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchPlaylists();
      setPlaylists(data);
    } catch {
      setPlaylists([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
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

  async function handleNewPlaylist() {
    const name = window.prompt("Название плейлиста", "Новый плейлист");
    if (!name?.trim()) return;
    try {
      await createPlaylist(name.trim());
      await load();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Не удалось создать плейлист");
    }
  }

  const outletContext = useMemo<MainLayoutOutletContext>(
    () => ({ searchQuery, setSearchQuery }),
    [searchQuery]
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
                      <li key={p.id}>
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
                                : {
                                    background: `linear-gradient(135deg, hsl(${(p.id * 47) % 360}, 48%, 38%), hsl(${((p.id * 23) % 360) || 210}, 40%, 22%))`,
                                  }
                            }
                          >
                            {isLikedPlaylistName(p.name) ? <IconHeart filled /> : null}
                          </div>
                          <div className="fig-pl-meta">
                            <div className="fig-pl-name">{p.name}</div>
                            <div className="fig-pl-sub">Плейлист · {p._count.tracks} треков</div>
                          </div>
                        </button>
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
              ) : filteredPlaylists.length === 0 ? (
                <p className="fig-pl-sub">Нет плейлистов по запросу.</p>
              ) : (
                <ul className="fig-lib-album-grid">
                  {filteredPlaylists.map((p) => (
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
            <button type="button" className="fig-rc-all" onClick={() => navigate("/discover")}>
              Смотреть все
            </button>
          </div>
          <ul className="fig-rc-list">
            {(recent.length ? recent : []).map((t) => (
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

      <div className="fig-player-slot">
        <PlayerBar />
      </div>
    </div>
  );
}
