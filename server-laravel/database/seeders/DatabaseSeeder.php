<?php

namespace Database\Seeders;

use App\Models\Artist;
use App\Models\Playlist;
use App\Models\PlaylistTrack;
use App\Models\Track;
use App\Models\User;
use App\Services\RegistrationService;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    private const DEMO_MP3 = 'https://archive.org/download/testmp3testfile/mpthreetest.mp3';

    public function run(): void
    {
        if (Artist::count() > 0) {
            $this->command?->info('Seed пропущен: артисты уже есть в базе.');
            return;
        }

        $catalog = [
            'Arctic Monkeys' => [
                ['Do I Wanna Know?', 98, 272],
                ['505', 91, 254],
                ['R U Mine?', 89, 199],
                ['Fluorescent Adolescent', 82, 167],
                ['Crying Lightning', 74, 224],
                ["Why'd You Only Call Me When You're High?", 71, 162],
            ],
            'Daft Punk' => [
                ['Get Lucky', 99, 363],
                ['One More Time', 96, 320],
                ['Harder, Better, Faster, Stronger', 93, 225],
                ['Around the World', 85, 447],
                ['Digital Love', 78, 285],
                ['Instant Crush', 75, 348],
            ],
            'Radiohead' => [
                ['Creep', 97, 236],
                ['Karma Police', 90, 268],
                ['Paranoid Android', 86, 383],
                ['No Surprises', 84, 201],
                ['Fake Plastic Trees', 79, 275],
                ['High and Dry', 73, 244],
            ],
            'The Weeknd' => [
                ['Blinding Lights', 100, 200],
                ['Starboy', 94, 227],
                ["Can't Feel My Face", 88, 194],
                ['The Hills', 87, 240],
                ['Save Your Tears', 83, 215],
                ['After Hours', 80, 356],
            ],
            'Mozart (демо-каталог)' => [
                ['Symphony No. 40 - Allegro (фрагмент)', 72, 180],
                ['Eine kleine Nachtmusik - Allegro', 70, 300],
                ['Rondo alla turca', 68, 210],
                ['Lacrimosa', 65, 195],
                ['Queen of the Night aria', 62, 165],
            ],
            'Billie Eilish' => [
                ['bad guy', 95, 194],
                ['Ocean Eyes', 88, 215],
                ["when the party's over", 85, 189],
                ['bury a friend', 82, 197],
                ['everything i wanted', 78, 240],
            ],
            'Drake' => [
                ["God's Plan", 92, 198],
                ['Hotline Bling', 89, 265],
                ['In My Feelings', 86, 216],
                ['One Dance', 94, 174],
                ['Started From the Bottom', 81, 298],
            ],
            'Taylor Swift' => [
                ['Shake It Off', 93, 219],
                ['Blank Space', 90, 233],
                ['Anti-Hero', 96, 201],
                ['Lavender Haze', 84, 227],
                ['All Too Well', 87, 323],
            ],
            'Kendrick Lamar' => [
                ['HUMBLE.', 91, 177],
                ['DNA.', 88, 188],
                ['Alright', 85, 194],
                ['Money Trees', 82, 366],
                ['Swimming Pools', 79, 312],
            ],
            'Tame Impala' => [
                ['The Less I Know The Better', 89, 337],
                ['Feels Like We Only Go Backwards', 86, 191],
                ['Elephant', 83, 207],
                ['Currents', 80, 305],
                ['New Person, Same Old Mistakes', 77, 360],
            ],
        ];

        foreach ($catalog as $artistName => $tracks) {
            $artist = Artist::create(['name' => $artistName]);
            foreach ($tracks as [$title, $popularity, $durationSec]) {
                Track::create([
                    'title' => $title,
                    'popularity' => $popularity,
                    'durationSec' => $durationSec,
                    'audioPath' => self::DEMO_MP3,
                    'artistId' => $artist->id,
                ]);
            }
        }

        $registration = app(RegistrationService::class);
        $users = [
            ['test1@example.com', 'Меломан 1', [1, 2, 3]],
            ['test2@example.com', 'Меломан 2', [4, 5, 6]],
            ['test3@example.com', 'Меломан 3', [7, 8, 9]],
        ];

        foreach ($users as [$email, $displayName, $artistIds]) {
            if (! User::where('email', $email)->exists()) {
                $registration->register([
                    'email' => $email,
                    'password' => 'password123',
                    'displayName' => $displayName,
                    'artistIds' => $artistIds,
                ]);
            }
        }

        $popularTrackIds = Track::orderByDesc('popularity')->limit(20)->pluck('id')->all();
        foreach (User::all() as $user) {
            $playlist = Playlist::create([
                'name' => 'Популярные хиты',
                'userId' => $user->id,
                'isStarter' => true,
            ]);

            foreach ($popularTrackIds as $index => $trackId) {
                PlaylistTrack::create([
                    'playlistId' => $playlist->id,
                    'trackId' => $trackId,
                    'position' => $index + 1,
                ]);
            }
        }
    }
}
