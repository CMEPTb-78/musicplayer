<?php

namespace App\Services;

use App\Models\Artist;
use App\Models\Playlist;
use App\Models\PlaylistTrack;
use App\Models\Track;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use RuntimeException;

class RegistrationService
{
    private const TOP_TRACKS_PER_ARTIST = 3;

    public function register(array $input): User
    {
        if (User::where('email', $input['email'])->exists()) {
            throw new RuntimeException('EMAIL_TAKEN');
        }

        $artistIds = array_values(array_unique($input['artistIds']));
        if (count($artistIds) === 0) {
            throw new RuntimeException('NO_ARTISTS');
        }

        if (Artist::whereIn('id', $artistIds)->count() !== count($artistIds)) {
            throw new RuntimeException('INVALID_ARTISTS');
        }

        return DB::transaction(function () use ($input, $artistIds): User {
            $user = User::create([
                'email' => $input['email'],
                'passwordHash' => Hash::make($input['password']),
                'displayName' => $input['displayName'],
            ]);

            $user->favoriteArtists()->attach($artistIds);

            $orderedTrackIds = [];
            foreach ($artistIds as $artistId) {
                $tracks = Track::where('artistId', $artistId)
                    ->orderByDesc('popularity')
                    ->limit(self::TOP_TRACKS_PER_ARTIST)
                    ->pluck('id')
                    ->all();

                foreach ($tracks as $trackId) {
                    if (! in_array($trackId, $orderedTrackIds, true)) {
                        $orderedTrackIds[] = $trackId;
                    }
                }
            }

            $playlist = Playlist::create([
                'name' => 'Стартовая подборка по любимым артистам',
                'userId' => $user->id,
                'isStarter' => true,
            ]);

            foreach ($orderedTrackIds as $index => $trackId) {
                PlaylistTrack::create([
                    'playlistId' => $playlist->id,
                    'trackId' => $trackId,
                    'position' => $index,
                ]);
            }

            return $user;
        });
    }
}
