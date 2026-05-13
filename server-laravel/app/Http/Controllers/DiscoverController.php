<?php

namespace App\Http\Controllers;

use App\Models\Track;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DiscoverController extends Controller
{
    public function tracks(Request $request): JsonResponse
    {
        $limit = min(max((int) $request->query('limit', 40), 1), 100);
        $tracks = Track::with('artist:id,name')
            ->orderByDesc('popularity')
            ->orderBy('id')
            ->limit($limit)
            ->get();

        return response()->json([
            'tracks' => $tracks->map(fn ($track) => [
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
