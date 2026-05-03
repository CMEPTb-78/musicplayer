import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchTrack, type TrackDetail } from "@/api";
import { IconHeart, IconMoreVert } from "@/icons/FigIcons";
import { usePlayer } from "@/player/PlayerContext";
import { formatDuration } from "@/utils/format";
import PlaylistSelector from "@/components/PlaylistSelector";
import "@/components/PlaylistSelector.css";
import "./TrackPage.css";

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
      <div>
        <Link to="/" className="fig-rc-all" style={{ display: "inline-block", marginBottom: 8 }}>
          ← Главная
        </Link>
      </div>

      <div className="track-page-header">
        <div className="track-page-cover">
          <div className="track-page-cover-placeholder" />
        </div>
        
        <div className="track-page-info">
          <h1 className="track-page-title">{track.title}</h1>
          <div className="track-page-artist">
            <Link to={`/artist/${track.artist.id}`} className="track-page-artist-link">
              {track.artist.name}
            </Link>
          </div>
          
          <div className="track-page-meta">
            <span className="track-page-duration">{formatDuration(track.durationSec)}</span>
            <span className="track-page-popularity">Популярность: {track.popularity}</span>
          </div>

          <div className="track-page-actions">
            <button
              className={`track-page-play-btn ${isCurrentTrack ? "playing" : ""}`}
              onClick={handlePlayTrack}
            >
              {isCurrentTrack ? "Сейчас играет" : "Играть"}
            </button>
            
            <button
              className="track-page-like-btn"
              onClick={() => toggleLikeTrack(track.id)}
              title={isTrackLiked(track.id) ? "Убрать из понравившихся" : "Добавить в понравившиеся"}
            >
              <IconHeart filled={isTrackLiked(track.id)} />
            </button>
            
            <button
              className="track-page-add-btn"
              onClick={() => setSelectedTrackId(track.id)}
              title="Добавить в плейлист"
            >
              <IconMoreVert />
            </button>
          </div>
        </div>
      </div>

      <div className="track-page-content">
        <div className="track-page-section">
          <h3>О треке</h3>
          <div className="track-page-details">
            <div className="track-page-detail-row">
              <span className="track-page-detail-label">Исполнитель:</span>
              <Link to={`/artist/${track.artist.id}`} className="track-page-detail-value">
                {track.artist.name}
              </Link>
            </div>
            <div className="track-page-detail-row">
              <span className="track-page-detail-label">Длительность:</span>
              <span className="track-page-detail-value">{formatDuration(track.durationSec)}</span>
            </div>
            <div className="track-page-detail-row">
              <span className="track-page-detail-label">Популярность:</span>
              <span className="track-page-detail-value">{track.popularity}</span>
            </div>
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
