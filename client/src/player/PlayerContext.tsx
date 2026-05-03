import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { streamUrl } from "@/api";

const LIKED_TRACKS_KEY = "mp_liked_track_ids";

function readLikedIds(): Set<number> {
  try {
    const raw = localStorage.getItem(LIKED_TRACKS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((x): x is number => typeof x === "number" && Number.isFinite(x)));
  } catch {
    return new Set();
  }
}

function persistLikedIds(ids: Set<number>) {
  localStorage.setItem(LIKED_TRACKS_KEY, JSON.stringify([...ids]));
}

export type PlayerTrack = {
  id: number;
  title: string;
  artist: string;
  durationSec: number;
};

type PlayerCtx = {
  queue: PlayerTrack[];
  index: number;
  current: PlayerTrack | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  recent: PlayerTrack[];
  likedTrackIds: ReadonlySet<number>;
  toggleLikeTrack: (trackId: number) => void;
  isTrackLiked: (trackId: number) => boolean;
  setQueueFromTracks: (tracks: PlayerTrack[], startIndex?: number, autoplay?: boolean) => void;
  togglePlay: () => void;
  playTrackAt: (idx: number) => void;
  next: () => void;
  prev: () => void;
  seekToRatio: (r: number) => void;
  setVolume: (v: number) => void;
};

const PlayerContext = createContext<PlayerCtx | null>(null);

function pushRecent(list: PlayerTrack[], t: PlayerTrack): PlayerTrack[] {
  const without = list.filter((x) => x.id !== t.id);
  return [{ ...t }, ...without].slice(0, 12);
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const queueRef = useRef<PlayerTrack[]>([]);
  const indexRef = useRef(0);
  const autoplayRef = useRef(false);

  const [queue, setQueue] = useState<PlayerTrack[]>([]);
  const [index, setIndexState] = useState(0);
  const [isPlaying, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolState] = useState(0.9);
  const [recent, setRecent] = useState<PlayerTrack[]>([]);
  const [likedTrackIds, setLikedTrackIds] = useState<Set<number>>(() => readLikedIds());

  queueRef.current = queue;
  indexRef.current = index;
  const volumeRef = useRef(volume);
  volumeRef.current = volume;

  const current = queue[index] ?? null;
  const queueKey = useMemo(() => queue.map((t) => t.id).join(","), [queue]);

  const bootTrack = useCallback(async (track: PlayerTrack, autoplay: boolean) => {
      const el = audioRef.current;
      if (!el) return;
      el.src = streamUrl(track.id);
      el.volume = volumeRef.current;
      try {
        await el.load();
      } catch {
        /* noop */
      }
      if (autoplay) {
        try {
          await el.play();
          setPlaying(true);
        } catch {
          setPlaying(false);
        }
      } else {
        el.pause();
        setPlaying(false);
      }
      setRecent((r) => pushRecent(r, track));
  }, []);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    function onMeta() {
      const a = audioRef.current;
      if (!a) return;
      setDuration(Number.isFinite(a.duration) ? a.duration : 0);
    }
    function onTime() {
      const a = audioRef.current;
      if (!a) return;
      setCurrentTime(a.currentTime);
    }
    function onEnded() {
      const q = queueRef.current;
      const i = indexRef.current;
      const nx = i + 1;
      if (nx < q.length) {
        indexRef.current = nx;
        autoplayRef.current = true;
        setIndexState(nx);
      } else {
        setPlaying(false);
      }
    }

    el.addEventListener("loadedmetadata", onMeta);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("ended", onEnded);
    return () => {
      el.removeEventListener("loadedmetadata", onMeta);
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("ended", onEnded);
    };
  }, []);

  useEffect(() => {
    if (!current) return;
    const ap = autoplayRef.current;
    autoplayRef.current = false;
    void bootTrack(current, ap);
  }, [queueKey, index, current?.id, bootTrack]);

  useEffect(() => {
    const el = audioRef.current;
    if (el) el.volume = volume;
  }, [volume]);

  const setQueueFromTracks = useCallback(
    (tracks: PlayerTrack[], startIndex = 0, autoplay = true) => {
      if (!tracks.length) return;
      const i = Math.min(Math.max(0, startIndex), tracks.length - 1);
      autoplayRef.current = autoplay;
      setQueue(tracks);
      setIndexState(i);
    },
    []
  );

  const togglePlay = useCallback(() => {
    const el = audioRef.current;
    if (!el || !current) return;
    if (isPlaying) {
      el.pause();
      setPlaying(false);
    } else {
      void el.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    }
  }, [current, isPlaying]);

  const playTrackAt = useCallback(
    (idx: number) => {
      if (idx < 0 || idx >= queueRef.current.length) return;
      autoplayRef.current = true;
      setIndexState(idx);
    },
    []
  );

  const next = useCallback(() => {
    playTrackAt(indexRef.current + 1);
  }, [playTrackAt]);

  const prev = useCallback(() => {
    const el = audioRef.current;
    if (el && el.currentTime > 2.5) {
      el.currentTime = 0;
      return;
    }
    playTrackAt(indexRef.current - 1);
  }, [playTrackAt]);

  const seekToRatio = useCallback((r: number) => {
    const el = audioRef.current;
    if (!el || !duration) return;
    el.currentTime = Math.max(0, Math.min(1, r)) * duration;
  }, [duration]);

  const setVolume = useCallback((v: number) => {
    setVolState(Math.max(0, Math.min(1, v)));
  }, []);

  const toggleLikeTrack = useCallback((trackId: number) => {
    setLikedTrackIds((prev) => {
      const next = new Set(prev);
      if (next.has(trackId)) next.delete(trackId);
      else next.add(trackId);
      persistLikedIds(next);
      return next;
    });
  }, []);

  const isTrackLiked = useCallback((trackId: number) => likedTrackIds.has(trackId), [likedTrackIds]);

  const value = useMemo(
    (): PlayerCtx => ({
      queue,
      index,
      current,
      isPlaying,
      currentTime,
      duration,
      volume,
      recent,
      likedTrackIds,
      toggleLikeTrack,
      isTrackLiked,
      setQueueFromTracks,
      togglePlay,
      playTrackAt,
      next,
      prev,
      seekToRatio,
      setVolume,
    }),
    [
      queue,
      index,
      current,
      isPlaying,
      currentTime,
      duration,
      volume,
      recent,
      likedTrackIds,
      toggleLikeTrack,
      isTrackLiked,
      setQueueFromTracks,
      togglePlay,
      playTrackAt,
      next,
      prev,
      seekToRatio,
      setVolume,
    ]
  );

  return (
    <PlayerContext.Provider value={value}>
      <audio ref={audioRef} preload="metadata" hidden />
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer(): PlayerCtx {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer outside PlayerProvider");
  return ctx;
}
