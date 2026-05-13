<?php

namespace App\Http\Controllers;

use App\Models\Track;
use Illuminate\Http\JsonResponse;

class TrackController extends Controller
{
    public function show(int $id): JsonResponse
    {
        $track = Track::with('artist:id,name')->find($id);
        if (! $track) {
            return response()->json(['error' => 'Трек не найден'], 404);
        }

        return response()->json([
            'id' => $track->id,
            'title' => $track->title,
            'popularity' => $track->popularity,
            'durationSec' => $track->durationSec,
            'audioUrl' => "/api/stream/{$track->id}",
            'artistId' => $track->artistId,
            'artist' => $track->artist,
        ]);
    }
}
