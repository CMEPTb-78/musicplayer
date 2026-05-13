<?php

namespace App\Http\Controllers;

use App\Models\Playlist;
use App\Models\PlaylistTrack;
use App\Models\Track;
use App\Support\AuthUser;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PlaylistController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $playlists = Playlist::withCount('tracks')
            ->where('userId', AuthUser::id($request))
            ->orderByDesc('createdAt')
            ->get();

        return response()->json($playlists->map(fn (Playlist $playlist) => [
            'id' => $playlist->id,
            'name' => $playlist->name,
            'isStarter' => $playlist->isStarter,
            'createdAt' => $playlist->createdAt,
            '_count' => ['tracks' => $playlist->tracks_count],
        ]));
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $playlist = $this->playlistForUser($id, AuthUser::id($request));
        if (! $playlist) {
            return response()->json(['error' => 'Плейлист не найден'], 404);
        }

        return response()->json($this->detailPayload($playlist));
    }

    public function store(Request $request): JsonResponse
    {
        try {
            $data = $request->validate(['name' => ['required', 'string', 'min:1', 'max:120']]);
        } catch (ValidationException) {
            return response()->json(['error' => 'Некорректное имя плейлиста'], 400);
        }

        $playlist = Playlist::create([
            'name' => $data['name'],
            'userId' => AuthUser::id($request),
            'isStarter' => false,
        ]);

        return response()->json($playlist, 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $playlist = $this->playlistForUser($id, AuthUser::id($request));
        if (! $playlist) {
            return response()->json(['error' => 'Плейлист не найден'], 404);
        }

        try {
            $data = $request->validate([
                'name' => ['sometimes', 'string', 'min:1', 'max:120'],
                'description' => ['sometimes', 'nullable', 'string', 'max:500'],
                'coverImage' => ['sometimes', 'nullable', 'string', 'max:1000'],
            ]);
        } catch (ValidationException) {
            return response()->json(['error' => 'Некорректные данные плейлиста'], 400);
        }

        if (array_key_exists('name', $data)) {
            $playlist->name = $data['name'];
            $playlist->save();
        }

        return response()->json($this->detailPayload($playlist->fresh('tracks.track.artist')));
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $playlist = $this->playlistForUser($id, AuthUser::id($request));
        if (! $playlist) {
            return response()->json(['error' => 'Плейлист не найден'], 404);
        }
        if ($playlist->isStarter) {
            return response()->json(['error' => 'Нельзя удалить стартовый плейлист'], 403);
        }

        $playlist->delete();

        return response()->json(['success' => true]);
    }

    public function addTrack(Request $request, int $id): JsonResponse
    {
        try {
            $data = $request->validate(['trackId' => ['required', 'integer', 'min:1']]);
        } catch (ValidationException) {
            return response()->json(['error' => 'Некорректный id трека'], 400);
        }

        $playlist = $this->playlistForUser($id, AuthUser::id($request));
        if (! $playlist) {
            return response()->json(['error' => 'Плейлист не найден'], 404);
        }
        if (! Track::whereKey($data['trackId'])->exists()) {
            return response()->json(['error' => 'Трек не найден'], 404);
        }
        if (PlaylistTrack::where('playlistId', $id)->where('trackId', $data['trackId'])->exists()) {
            return response()->json(['error' => 'Трек уже в плейлисте'], 409);
        }

        $nextPosition = ((int) PlaylistTrack::where('playlistId', $id)->max('position')) + 1;
        $row = PlaylistTrack::create([
            'playlistId' => $id,
            'trackId' => $data['trackId'],
            'position' => $nextPosition,
        ]);

        return response()->json(['success' => true, 'position' => $row->position], 201);
    }

    public function removeTrack(Request $request, int $id, int $trackId): JsonResponse
    {
        $playlist = $this->playlistForUser($id, AuthUser::id($request));
        if (! $playlist) {
            return response()->json(['error' => 'Плейлист не найден'], 404);
        }

        $row = PlaylistTrack::where('playlistId', $id)->where('trackId', $trackId)->first();
        if (! $row) {
            return response()->json(['error' => 'Трек не найден в плейлисте'], 404);
        }

        DB::transaction(function () use ($row, $id): void {
            $row->delete();
            PlaylistTrack::where('playlistId', $id)
                ->orderBy('position')
                ->get()
                ->values()
                ->each(fn (PlaylistTrack $track, int $index) => $track->update(['position' => $index + 1]));
        });

        return response()->json(['success' => true]);
    }

    private function playlistForUser(int $id, int $userId): ?Playlist
    {
        return Playlist::with(['tracks' => fn ($query) => $query->orderBy('position'), 'tracks.track.artist:id,name'])
            ->where('id', $id)
            ->where('userId', $userId)
            ->first();
    }

    private function detailPayload(Playlist $playlist): array
    {
        return [
            'id' => $playlist->id,
            'name' => $playlist->name,
            'isStarter' => $playlist->isStarter,
            'createdAt' => $playlist->createdAt,
            'tracks' => $playlist->tracks->map(fn (PlaylistTrack $playlistTrack) => [
                'position' => $playlistTrack->position,
                'id' => $playlistTrack->track->id,
                'title' => $playlistTrack->track->title,
                'popularity' => $playlistTrack->track->popularity,
                'durationSec' => $playlistTrack->track->durationSec,
                'audioUrl' => "/api/stream/{$playlistTrack->track->id}",
                'artistId' => $playlistTrack->track->artistId,
                'artist' => $playlistTrack->track->artist,
            ])->values(),
        ];
    }
}
