<?php

namespace App\Http\Controllers;

use App\Models\Artist;
use Illuminate\Http\JsonResponse;

class ArtistController extends Controller
{
    public function index(): JsonResponse
    {
        $artists = Artist::withCount('tracks')->orderBy('name')->get();

        return response()->json($artists->map(fn (Artist $artist) => [
            'id' => $artist->id,
            'name' => $artist->name,
            'trackCount' => $artist->tracks_count,
        ]));
    }

    public function tracks(int $id): JsonResponse
    {
        $artist = Artist::find($id);
        if (! $artist) {
            return response()->json(['error' => 'Артист не найден'], 404);
        }

        $tracks = $artist->tracks()
            ->with('artist:id,name')
            ->orderByDesc('popularity')
            ->orderBy('id')
            ->limit(100)
            ->get();

        return response()->json([
            'id' => $artist->id,
            'name' => $artist->name,
            'tracks' => $tracks->values()->map(fn ($track, int $position) => [
                'position' => $position,
                'id' => $track->id,
                'title' => $track->title,
                'popularity' => $track->popularity,
                'durationSec' => $track->durationSec,
                'audioUrl' => "/api/stream/{$track->id}",
                'artistId' => $track->artistId,
                'artist' => $track->artist,
            ]),
        ]);
    }
}
