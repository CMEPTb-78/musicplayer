import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchArtistTracks, type ArtistTracksResponse } from "@/api";
import { IconHeart, IconMoreVert } from "@/icons/FigIcons";
import { useMainLayoutOutlet } from "@/layout/mainLayoutContext";
import { catalogTracksToPlayerTracks } from "@/layout/playlistToPlayerTracks";
import { usePlayer } from "@/player/PlayerContext";
import { formatDuration } from "@/utils/format";

function norm(s: string): string {
  return s.trim().toLowerCase();
}

export default function ArtistPage() {
  const { artistId: idParam } = useParams();
  const artistId = Number(idParam);
  const { searchQuery } = useMainLayoutOutlet();
  const [data, setData] = useState<ArtistTracksResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { setQueueFromTracks, index: qIndex, queue, toggleLikeTrack, isTrackLiked } = usePlayer();

  const filteredTracks = useMemo(() => {
    if (!data) return [];
    const q = norm(searchQuery);
    if (!q) return data.tracks;
    return data.tracks.filter((t) => norm(t.title).includes(q) || norm(t.artist.name).includes(q));
  }, [data, searchQuery]);

  const playerTracks = useMemo(() => catalogTracksToPlayerTracks(filteredTracks), [filteredTracks]);

  useEffect(() => {
    if (!Number.isFinite(artistId)) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchArtistTracks(artistId);
        if (!cancelled) setData(res);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Ошибка");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [artistId]);

  useEffect(() => {
    if (!playerTracks.length) return;
    setQueueFromTracks(playerTracks, 0, false);
  }, [artistId, playerTracks, setQueueFromTracks]);

  if (!Number.isFinite(artistId)) {
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
          {data?.name ?? "Артист"}
        </h1>
        <p className="fig-pl-sub" style={{ marginTop: 6 }}>
          {data ? `${data.tracks.length} треков в каталоге` : "Загрузка…"}
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
          })}
        </div>
      </div>
    </div>
  );
}
