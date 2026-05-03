import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { IconHeart, IconMoreVert } from "@/icons/FigIcons";
import { useMainLayoutOutlet } from "@/layout/mainLayoutContext";
import { usePlayer } from "@/player/PlayerContext";
import { formatDuration } from "@/utils/format";
import PlaylistSelector from "@/components/PlaylistSelector";
import "@/components/PlaylistSelector.css";

function norm(s: string): string {
  return s.trim().toLowerCase();
}

export default function RecentPage() {
  const { searchQuery } = useMainLayoutOutlet();
  const [selectedTrackId, setSelectedTrackId] = useState<number | null>(null);
  const { recent, setQueueFromTracks, index: qIndex, queue, toggleLikeTrack, isTrackLiked } = usePlayer();

  const filtered = useMemo(() => {
    if (!recent) return [];
    const q = norm(searchQuery);
    if (!q) return recent;
    return recent.filter((t) => norm(t.title).includes(q) || norm(t.artist).includes(q));
  }, [recent, searchQuery]);

  const playerTracks = useMemo(() => {
    return filtered.map((t) => ({
      id: t.id,
      title: t.title,
      artist: t.artist,
      durationSec: t.durationSec,
    }));
  }, [filtered]);

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
        <h1 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 700, letterSpacing: "-0.02em" }}>Играло недавно</h1>
        <p className="fig-pl-sub" style={{ marginTop: 6 }}>
          Недавно прослушанные треки — {recent.length} треков.
        </p>
      </div>

      <div className="fig-tab-body">
        <div className="fig-tracks">
          {!recent ? (
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
                    <span className="fig-t-artist">{t.artist}</span>
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
