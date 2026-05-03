const TOKEN_KEY = "mp_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(
  path: string,
  options: RequestInit & { json?: unknown } = {}
): Promise<T> {
  const headers: HeadersInit = {
    ...(options.headers ?? {}),
  };
  const token = getToken();
  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }
  let body = options.body;
  if (options.json !== undefined) {
    (headers as Record<string, string>)["Content-Type"] = "application/json";
    body = JSON.stringify(options.json);
  }
  const res = await fetch(path, { ...options, headers, body });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const msg = data?.error ?? res.statusText;
    throw new Error(typeof msg === "string" ? msg : "Ошибка запроса");
  }
  return data as T;
}

export type User = { id: number; email: string; displayName: string };

export async function login(email: string, password: string) {
  return request<{ token: string; user: User }>("/api/auth/login", {
    method: "POST",
    json: { email, password },
  });
}

export async function register(payload: {
  email: string;
  password: string;
  displayName: string;
  artistIds: number[];
}) {
  return request<{ token: string; user: User }>("/api/auth/register", {
    method: "POST",
    json: payload,
  });
}

export type ArtistOption = { id: number; name: string; trackCount: number };

export async function fetchArtists() {
  return request<ArtistOption[]>("/api/artists");
}

export type PlaylistSummary = {
  id: number;
  name: string;
  isStarter: boolean;
  createdAt: string;
  _count: { tracks: number };
};

export async function fetchPlaylists() {
  return request<PlaylistSummary[]>("/api/playlists");
}

export type CatalogTrack = {
  id: number;
  title: string;
  popularity: number;
  durationSec: number;
  audioUrl: string;
  artist: { id: number; name: string };
};

export type PlaylistDetail = {
  id: number;
  name: string;
  isStarter: boolean;
  createdAt: string;
  tracks: (CatalogTrack & { position: number })[];
};

export async function fetchPlaylist(id: number) {
  return request<PlaylistDetail>(`/api/playlists/${id}`);
}

export type ArtistTracksResponse = {
  id: number;
  name: string;
  tracks: (CatalogTrack & { position: number })[];
};

export async function fetchArtistTracks(artistId: number) {
  return request<ArtistTracksResponse>(`/api/artists/${artistId}/tracks`);
}

export async function fetchDiscoverTracks(limit = 40) {
  return request<{ tracks: CatalogTrack[] }>(`/api/discover/tracks?limit=${encodeURIComponent(String(limit))}`);
}

export async function createPlaylist(name: string) {
  return request<{ id: number; name: string; userId?: number }>("/api/playlists", {
    method: "POST",
    json: { name },
  });
}

export async function addTrackToPlaylist(playlistId: number, trackId: number) {
  return request<{ success: boolean; position: number }>(`/api/playlists/${playlistId}/tracks`, {
    method: "POST",
    json: { trackId },
  });
}

export async function removeTrackFromPlaylist(playlistId: number, trackId: number) {
  return request<{ success: boolean }>(`/api/playlists/${playlistId}/tracks/${trackId}`, {
    method: "DELETE",
  });
}

export async function deletePlaylist(playlistId: number) {
  return request<{ success: boolean }>(`/api/playlists/${playlistId}`, {
    method: "DELETE",
  });
}

export type TrackDetail = CatalogTrack & {
  album?: {
    id: number;
    title: string;
    coverUrl?: string;
  };
  lyrics?: string;
};

export async function fetchTrack(trackId: number) {
  return request<TrackDetail>(`/api/tracks/${trackId}`);
}

export function streamUrl(trackId: number): string {
  const token = getToken();
  const q = token ? `?token=${encodeURIComponent(token)}` : "";
  return `/api/stream/${trackId}${q}`;
}
