import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/** Демо-URL (royalty-free / archive). Для отчёта: можно заменить на свои файлы в uploads */
const DEMO_MP3 =
  "https://archive.org/download/testmp3testfile/mpthreetest.mp3";

async function main() {
  if ((await prisma.artist.count()) > 0) {
    console.log("Seed пропущен: в базе уже есть артисты");
    return;
  }

  const catalog: { name: string; tracks: { title: string; popularity: number; durationSec?: number }[] }[] = [
    {
      name: "Arctic Monkeys",
      tracks: [
        { title: "Do I Wanna Know?", popularity: 98, durationSec: 272 },
        { title: "505", popularity: 91, durationSec: 254 },
        { title: "R U Mine?", popularity: 89, durationSec: 199 },
        { title: "Fluorescent Adolescent", popularity: 82, durationSec: 167 },
        { title: "Crying Lightning", popularity: 74, durationSec: 224 },
        { title: "Why'd You Only Call Me When You're High?", popularity: 71, durationSec: 162 },
      ],
    },
    {
      name: "Daft Punk",
      tracks: [
        { title: "Get Lucky", popularity: 99, durationSec: 363 },
        { title: "One More Time", popularity: 96, durationSec: 320 },
        { title: "Harder, Better, Faster, Stronger", popularity: 93, durationSec: 225 },
        { title: "Around the World", popularity: 85, durationSec: 447 },
        { title: "Digital Love", popularity: 78, durationSec: 285 },
        { title: "Instant Crush", popularity: 75, durationSec: 348 },
      ],
    },
    {
      name: "Radiohead",
      tracks: [
        { title: "Creep", popularity: 97, durationSec: 236 },
        { title: "Karma Police", popularity: 90, durationSec: 268 },
        { title: "Paranoid Android", popularity: 86, durationSec: 383 },
        { title: "No Surprises", popularity: 84, durationSec: 201 },
        { title: "Fake Plastic Trees", popularity: 79, durationSec: 275 },
        { title: "High and Dry", popularity: 73, durationSec: 244 },
      ],
    },
    {
      name: "The Weeknd",
      tracks: [
        { title: "Blinding Lights", popularity: 100, durationSec: 200 },
        { title: "Starboy", popularity: 94, durationSec: 227 },
        { title: "Can't Feel My Face", popularity: 88, durationSec: 194 },
        { title: "The Hills", popularity: 87, durationSec: 240 },
        { title: "Save Your Tears", popularity: 83, durationSec: 215 },
        { title: "After Hours", popularity: 80, durationSec: 356 },
      ],
    },
    {
      name: "Mozart (демо-каталог)",
      tracks: [
        { title: "Symphony No. 40 — Allegro (фрагмент)", popularity: 72, durationSec: 180 },
        { title: "Eine kleine Nachtmusik — Allegro", popularity: 70, durationSec: 300 },
        { title: "Rondo alla turca", popularity: 68, durationSec: 210 },
        { title: "Lacrimosa", popularity: 65, durationSec: 195 },
        { title: "Queen of the Night aria", popularity: 62, durationSec: 165 },
      ],
    },
    {
      name: "Billie Eilish",
      tracks: [
        { title: "bad guy", popularity: 95, durationSec: 194 },
        { title: "Ocean Eyes", popularity: 88, durationSec: 215 },
        { title: "when the party's over", popularity: 85, durationSec: 189 },
        { title: "bury a friend", popularity: 82, durationSec: 197 },
        { title: "everything i wanted", popularity: 78, durationSec: 240 },
      ],
    },
    {
      name: "Drake",
      tracks: [
        { title: "God's Plan", popularity: 92, durationSec: 198 },
        { title: "Hotline Bling", popularity: 89, durationSec: 265 },
        { title: "In My Feelings", popularity: 86, durationSec: 216 },
        { title: "One Dance", popularity: 94, durationSec: 174 },
        { title: "Started From the Bottom", popularity: 81, durationSec: 298 },
      ],
    },
    {
      name: "Taylor Swift",
      tracks: [
        { title: "Shake It Off", popularity: 93, durationSec: 219 },
        { title: "Blank Space", popularity: 90, durationSec: 233 },
        { title: "Anti-Hero", popularity: 96, durationSec: 201 },
        { title: "Lavender Haze", popularity: 84, durationSec: 227 },
        { title: "All Too Well", popularity: 87, durationSec: 323 },
      ],
    },
    {
      name: "Kendrick Lamar",
      tracks: [
        { title: "HUMBLE.", popularity: 91, durationSec: 177 },
        { title: "DNA.", popularity: 88, durationSec: 188 },
        { title: "Alright", popularity: 85, durationSec: 194 },
        { title: "Money Trees", popularity: 82, durationSec: 366 },
        { title: "Swimming Pools", popularity: 79, durationSec: 312 },
      ],
    },
    {
      name: "Tame Impala",
      tracks: [
        { title: "The Less I Know The Better", popularity: 89, durationSec: 337 },
        { title: "Feels Like We Only Go Backwards", popularity: 86, durationSec: 191 },
        { title: "Elephant", popularity: 83, durationSec: 207 },
        { title: "Currents", popularity: 80, durationSec: 305 },
        { title: "New Person, Same Old Mistakes", popularity: 77, durationSec: 360 },
      ],
    },
  ];

  for (const a of catalog) {
    const artist = await prisma.artist.upsert({
      where: { name: a.name },
      update: {},
      create: { name: a.name },
    });
    for (const t of a.tracks) {
      await prisma.track.create({
        data: {
          title: t.title,
          popularity: t.popularity,
          durationSec: t.durationSec || 180,
          audioPath: DEMO_MP3,
          artistId: artist.id,
        },
      });
    }
  }

  // Create test users
  const testUsers = [
    {
      email: "test1@example.com",
      displayName: "Меломан 1",
      password: "password123",
      artistIds: [1, 2, 3] // Arctic Monkeys, Daft Punk, Radiohead
    },
    {
      email: "test2@example.com", 
      displayName: "Меломан 2",
      password: "password123",
      artistIds: [4, 5, 6] // The Weeknd, Billie Eilish, Drake
    },
    {
      email: "test3@example.com",
      displayName: "Меломан 3", 
      password: "password123",
      artistIds: [7, 8, 9] // Taylor Swift, Kendrick Lamar, Tame Impala
    }
  ];

  for (const userData of testUsers) {
    const existingUser = await prisma.user.findUnique({ where: { email: userData.email } });
    if (!existingUser) {
      const passwordHash = await bcrypt.hash(userData.password, 10);
      const user = await prisma.user.create({
        data: {
          email: userData.email,
          passwordHash,
          displayName: userData.displayName,
        },
      });

      // Add favorite artists
      await prisma.userFavoriteArtist.createMany({
        data: userData.artistIds.map(artistId => ({
          userId: user.id,
          artistId
        }))
      });

      console.log(`Created test user: ${userData.email}`);
    }
  }

  // Create starter playlists for all users
  const allTracks = await prisma.track.findMany();
  const users = await prisma.user.findMany();
  
  if (users.length > 0 && allTracks.length > 0) {
    // Create various starter playlists
    const starterPlaylists = [
      {
        name: "Избранное",
        description: "Ваши любимые треки",
        trackIds: allTracks.slice(0, 20).map(t => t.id)
      },
      {
        name: "Популярные хиты",
        description: "Самые популярные треки",
        trackIds: allTracks.filter(t => t.popularity >= 90).slice(0, 15).map(t => t.id)
      },
      {
        name: "Рок-классика",
        description: "Лучшие рок-композиции",
        trackIds: allTracks.filter(t => 
          catalog.find(a => a.name.includes("Arctic") || a.name.includes("Radiohead") || a.name.includes("Tame"))
            ?.tracks.some(track => track.title === t.title)
        ).slice(0, 12).map(t => t.id)
      },
      {
        name: "Электронная музыка",
        description: "Электронные биты и синтезаторы",
        trackIds: allTracks.filter(t => 
          catalog.find(a => a.name.includes("Daft"))
            ?.tracks.some(track => track.title === t.title)
        ).slice(0, 10).map(t => t.id)
      },
      {
        name: "Классика",
        description: "Классические произведения",
        trackIds: allTracks.filter(t => 
          catalog.find(a => a.name.includes("Mozart"))
            ?.tracks.some(track => track.title === t.title)
        ).map(t => t.id)
      }
    ];

    // Create playlists for each user
    for (const user of users) {
      for (const playlistData of starterPlaylists) {
        const playlist = await prisma.playlist.create({
          data: {
            name: playlistData.name,
            userId: user.id,
            isStarter: true,
          },
        });

        // Add tracks to playlist
        for (let i = 0; i < playlistData.trackIds.length; i++) {
          await prisma.playlistTrack.create({
            data: {
              playlistId: playlist.id,
              trackId: playlistData.trackIds[i],
              position: i + 1,
            },
          });
        }
      }
      console.log(`Created starter playlists for user: ${user.email}`);
    }
  }

  console.log("Seed OK:", catalog.length, "артистов,", allTracks.length, "треков");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
