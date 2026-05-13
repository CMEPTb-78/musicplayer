<?php

namespace App\Http\Controllers;

use App\Models\Artist;
use App\Models\Playlist;
use App\Models\PlaylistTrack;
use App\Models\Track;
use App\Support\AuthUser;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class UploadController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        try {
            $data = $request->validate([
                'file' => ['required', 'file', 'max:40960', 'mimetypes:audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/x-wav'],
                'title' => ['required', 'string', 'min:1', 'max:200'],
                'artistId' => ['required', 'integer', 'min:1'],
                'popularity' => ['nullable', 'integer', 'min:0', 'max:100'],
            ]);
        } catch (ValidationException $e) {
            return response()->json(['error' => 'Некорректные метаданные', 'details' => $e->errors()], 400);
        }

        if (! Artist::whereKey($data['artistId'])->exists()) {
            return response()->json(['error' => 'Артист не найден'], 400);
        }

        $uploadRoot = base_path(env('UPLOAD_DIR', 'storage/app/uploads'));
        if (! is_dir($uploadRoot)) {
            mkdir($uploadRoot, 0775, true);
        }

        $file = $request->file('file');
        $safeName = preg_replace('/[^a-zA-Z0-9._-]/', '_', $file->getClientOriginalName());
        $filename = time().'_'.Str::random(8).'_'.$safeName;
        $file->move($uploadRoot, $filename);

        $track = DB::transaction(function () use ($data, $filename, $request): Track {
            $track = Track::create([
                'title' => $data['title'],
                'artistId' => $data['artistId'],
                'popularity' => $data['popularity'] ?? 50,
                'durationSec' => 0,
                'audioPath' => $filename,
            ]);

            $playlist = Playlist::firstOrCreate(
                ['userId' => AuthUser::id($request), 'name' => 'Мои загрузки'],
                ['isStarter' => false],
            );

            PlaylistTrack::create([
                'playlistId' => $playlist->id,
                'trackId' => $track->id,
                'position' => ((int) PlaylistTrack::where('playlistId', $playlist->id)->max('position')) + 1,
            ]);

            return $track;
        });

        return response()->json([
            'id' => $track->id,
            'title' => $track->title,
            'artistId' => $track->artistId,
            'audioUrl' => "/api/stream/{$track->id}",
        ], 201);
    }
}
