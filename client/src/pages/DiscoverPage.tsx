import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchDiscoverTracks, type CatalogTrack } from "@/api";
import { IconHeart, IconMoreVert } from "@/icons/FigIcons";
import { useMainLayoutOutlet } from "@/layout/mainLayoutContext";
import { catalogTracksToPlayerTracks } from "@/layout/playlistToPlayerTracks";
import { usePlayer } from "@/player/PlayerContext";
import { formatDuration } from "@/utils/format";

function norm(s: string): string {
  return s.trim().toLowerCase();
}

export default function DiscoverPage() {
  const { searchQuery } = useMainLayoutOutlet();
  const [tracks, setTracks] = useState<CatalogTrack[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { setQueueFromTracks, index: qIndex, queue, toggleLikeTrack, isTrackLiked } = usePlayer();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { tracks: list } = await fetchDiscoverTracks(48);
        if (!cancelled) setTracks(list);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Ошибка");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!tracks) return [];
    const q = norm(searchQuery);
    if (!q) return tracks;
    return tracks.filter((t) => norm(t.title).includes(q) || norm(t.artist.name).includes(q));
  }, [tracks, searchQuery]);

  const playerTracks = useMemo(() => catalogTracksToPlayerTracks(filtered), [filtered]);

  useEffect(() => {
    if (!playerTracks.length) return;
    setQueueFromTracks(playerTracks, 0, false);
  }, [playerTracks, setQueueFromTracks]);

  return (
    <div className="fig-page-stack">
      <div>
        <Link to="/" className="fig-rc-all" style={{ display: "inline-block", marginBottom: 8 }}>
          ← Главная
        </Link>
        <h1 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 700, letterSpacing: "-0.02em" }}>Открытия</h1>
        <p className="fig-pl-sub" style={{ marginTop: 6 }}>
          Популярные треки из каталога — обновляется при каждом заходе на страницу.
        </p>
      </div>

      <div className="fig-tab-body">
        {error ? <div className="error">{error}</div> : null}

        <div className="fig-tracks">
          {tracks === null ? (
            <p className="fig-pl-sub">Загрузка…</p>
          ) : filtered.length === 0 ? (
            <p className="fig-pl-sub">Нет треков по запросу.</p>
          ) : (
            filtered.map((t, i) => {
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
                    <IconMoreVert />
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
