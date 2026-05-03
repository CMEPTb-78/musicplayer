import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchTrack, type TrackDetail } from "@/api";
import { IconHeart, IconMoreVert } from "@/icons/FigIcons";
import { usePlayer } from "@/player/PlayerContext";
import { formatDuration } from "@/utils/format";
import PlaylistSelector from "@/components/PlaylistSelector";
import "@/components/PlaylistSelector.css";

export default function TrackPage() {
  const { id } = useParams();
  const trackId = Number(id);
  const [track, setTrack] = useState<TrackDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTrackId, setSelectedTrackId] = useState<number | null>(null);
  const { setQueueFromTracks, toggleLikeTrack, isTrackLiked, current } = usePlayer();

  useEffect(() => {
    if (!Number.isFinite(trackId)) return;
    
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const trackData = await fetchTrack(trackId);
        if (!cancelled) {
          setTrack(trackData);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Ошибка загрузки трека");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    
    return () => {
      cancelled = true;
    };
  }, [trackId]);

  const handlePlayTrack = () => {
    if (!track) return;
    
    const playerTrack = {
      id: track.id,
      title: track.title,
      artist: track.artist.name,
      artistId: track.artist.id,
      durationSec: track.durationSec,
    };
    
    setQueueFromTracks([playerTrack], 0, true);
  };

  const isCurrentTrack = current?.id === trackId;

  if (!Number.isFinite(trackId)) {
    return (
      <div className="fig-page-stack">
        <p className="fig-pl-sub">
          Некорректная ссылка. <Link to="/">На главную</Link>
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="fig-page-stack">
        <div className="loading">Загрузка трека...</div>
      </div>
    );
  }

  if (error || !track) {
    return (
      <div className="fig-page-stack">
        <Link to="/" className="fig-rc-all" style={{ display: "inline-block", marginBottom: 8 }}>
          ← Главная
        </Link>
        <div className="error">{error || "Трек не найден"}</div>
      </div>
    );
  }

  return (
    <div className="fig-page-stack">
      <Link to="/" className="fig-rc-all" style={{ display: "inline-block", marginBottom: 16 }}>
        ← Главная
      </Link>
      
      <div style={{ display: "flex", gap: "20px", alignItems: "flex-start" }}>
        {/* Track Cover */}
        <div>
          <div
            style={{
              width: "128px",
              height: "128px",
              borderRadius: "12px",
              backgroundColor: "rgba(255, 255, 255, 0.1)",
              backgroundImage: `linear-gradient(135deg, hsl(${(track.id * 47) % 360}, 48%, 38%), hsl(${((track.id * 23) % 360) || 210}, 40%, 22%))`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              cursor: "default",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "background-color 0.2s ease",
              position: "relative",
              overflow: "hidden"
            }}
          >
            <span style={{
              color: "rgba(255, 255, 255, 0.5)",
              fontSize: "2rem",
              fontWeight: "500"
            }}>
              ♪
            </span>
          </div>
        </div>
        
        {/* Track Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              position: "relative"
            }}
          >
            <h1 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 700, letterSpacing: "-0.02em" }}>
              {track.title}
            </h1>
          </div>
          
          <p 
            style={{ 
              color: "rgba(255, 255, 255, 0.7)", 
              fontSize: "0.9rem", 
              marginTop: "6px",
              lineHeight: "1.4",
              cursor: "default"
            }}
          >
            <Link 
              to={`/artist/${track.artist.id}`} 
              style={{ 
                color: "rgba(255, 255, 255, 0.7)", 
                textDecoration: "none"
              }}
            >
              {track.artist.name}
            </Link>
          </p>
          
          <p className="fig-pl-sub" style={{ marginTop: "4px" }}>
            {formatDuration(track.durationSec)} • Популярность: {track.popularity}
          </p>
          
          <div style={{ marginTop: "16px", display: "flex", gap: "12px", alignItems: "center" }}>
            <button
              type="button"
              className="fig-rc-heart fig-rc-heart-btn"
              onClick={() => toggleLikeTrack(track.id)}
              aria-label={isTrackLiked(track.id) ? "Убрать из понравившихся" : "Добавить в понравившиеся"}
            >
              <IconHeart filled={isTrackLiked(track.id)} />
            </button>
          </div>
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
