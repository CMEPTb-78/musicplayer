<?php

namespace App\Http\Controllers;

use App\Models\Track;
use App\Support\AuthUser;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class StreamController extends Controller
{
    public function show(Request $request, int $trackId): Response
    {
        $track = Track::whereKey($trackId)
            ->whereHas('playlists.playlist', fn ($query) => $query->where('userId', AuthUser::id($request)))
            ->first();

        if (! $track) {
            return response()->json(['error' => 'Трек недоступен'], 404);
        }

        if (str_starts_with($track->audioPath, 'http://') || str_starts_with($track->audioPath, 'https://')) {
            return redirect($track->audioPath);
        }

        $uploadRoot = realpath(base_path(env('UPLOAD_DIR', 'storage/app/uploads')));
        $full = realpath(($uploadRoot ?: base_path()).DIRECTORY_SEPARATOR.ltrim($track->audioPath, '/\\'));

        if (! $uploadRoot || ! $full || ! str_starts_with($full, $uploadRoot) || ! is_file($full)) {
            return response()->json(['error' => 'Файл не найден на сервере'], 404);
        }

        $size = filesize($full);
        $range = $request->header('Range');

        if ($range && preg_match('/bytes=(\d+)-(\d*)/', $range, $matches)) {
            $start = (int) $matches[1];
            $end = $matches[2] !== '' ? (int) $matches[2] : $size - 1;
            $end = min($end, $size - 1);

            return response()->stream(function () use ($full, $start, $end): void {
                $handle = fopen($full, 'rb');
                fseek($handle, $start);
                echo fread($handle, $end - $start + 1);
                fclose($handle);
            }, 206, [
                'Content-Range' => "bytes {$start}-{$end}/{$size}",
                'Accept-Ranges' => 'bytes',
                'Content-Length' => $end - $start + 1,
                'Content-Type' => 'audio/mpeg',
            ]);
        }

        return response()->stream(function () use ($full): void {
            readfile($full);
        }, 200, [
            'Content-Length' => $size,
            'Content-Type' => 'audio/mpeg',
            'Accept-Ranges' => 'bytes',
        ]);
    }
}
