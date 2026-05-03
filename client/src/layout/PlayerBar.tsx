import type { CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { IconExpand, IconNext, IconPause, IconPlay, IconPrev, IconVerified, IconVolume } from "@/icons/FigIcons";
import { formatDuration } from "@/utils/format";
import { usePlayer } from "@/player/PlayerContext";

export default function PlayerBar() {
  const navigate = useNavigate();
  const {
    current,
    isPlaying,
    togglePlay,
    next,
    prev,
    currentTime,
    duration,
    seekToRatio,
    volume,
    setVolume,
  } = usePlayer();

  const progress = duration > 0 ? currentTime / duration : 0;
  const remain = duration - currentTime;

  return (
    <div className="fig-player fig-player-block glass">
      <div className="fig-player-inner">
        <div className="fig-p-left">
          <div className="fig-p-text-stack">
            <div className="fig-p-track-title">{current?.title ?? "Выберите трек"}</div>
            <div className="fig-p-meta-row">
              <span className="fig-p-track-artist">{current?.artist ?? "—"}</span>
              {current ? (
                <span className="fig-p-verified-wrap" aria-hidden>
                  <IconVerified className="fig-p-verified" />
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="fig-p-center">
          <div className="fig-p-transport" role="group" aria-label="Воспроизведение">
            <button type="button" className="fig-p-trans-btn" onClick={prev} aria-label="Предыдущий трек">
              <IconPrev className="fig-p-ico-prev" />
            </button>
            <button type="button" className="fig-p-play" onClick={togglePlay} aria-label={isPlaying ? "Пауза" : "Играть"}>
              {isPlaying ? <IconPause className="fig-p-ico-play" /> : <IconPlay className="fig-p-ico-play" />}
            </button>
            <button type="button" className="fig-p-trans-btn" onClick={next} aria-label="Следующий трек">
              <IconNext className="fig-p-ico-next" />
            </button>
          </div>
          <div className="fig-p-progress-wrap">
            <span className="fig-p-time" aria-hidden>
              {formatDuration(currentTime)}
            </span>
            <input
              className="fig-p-range fig-p-range-track"
              type="range"
              min={0}
              max={1}
              step={0.001}
              value={progress}
              disabled={!current || duration <= 0}
              onChange={(e) => seekToRatio(Number(e.target.value))}
              aria-label={
                current && duration > 0
                  ? `Позиция: ${formatDuration(currentTime)} из ${formatDuration(duration)}`
                  : "Позиция воспроизведения"
              }
              style={{ "--p": progress } as CSSProperties}
            />
            <span className="fig-p-time" aria-hidden>
              -{formatDuration(Math.max(0, remain))}
            </span>
          </div>
        </div>

        <div className="fig-p-right">
          <span className="fig-p-right-vol-icon" aria-hidden>
            <IconVolume className="fig-p-ico-speaker" />
          </span>
          <input
            className="fig-p-range fig-p-range-vol"
            type="range"
            min={0}
            max={1}
            step={0.02}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            aria-label="Громкость"
            style={{ "--p": volume } as CSSProperties}
          />
          <button
            type="button"
            className="fig-p-expand"
            aria-label="Открытия — каталог треков"
            onClick={() => navigate("/discover")}
          >
            <IconExpand className="fig-p-ico-expand" />
          </button>
        </div>
      </div>
    </div>
  );
}
