import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** Демо-URL (royalty-free / archive). Для отчёта: можно заменить на свои файлы в uploads */
const DEMO_MP3 =
  "https://archive.org/download/testmp3testfile/mpthreetest.mp3";

async function main() {
  if ((await prisma.artist.count()) > 0) {
    console.log("Seed пропущен: в базе уже есть артисты");
    return;
  }

  const catalog: { name: string; tracks: { title: string; popularity: number }[] }[] = [
    {
      name: "Arctic Monkeys",
      tracks: [
        { title: "Do I Wanna Know?", popularity: 98 },
        { title: "505", popularity: 91 },
        { title: "R U Mine?", popularity: 89 },
        { title: "Fluorescent Adolescent", popularity: 82 },
        { title: "Crying Lightning", popularity: 74 },
      ],
    },
    {
      name: "Daft Punk",
      tracks: [
        { title: "Get Lucky", popularity: 99 },
        { title: "One More Time", popularity: 96 },
        { title: "Harder, Better, Faster, Stronger", popularity: 93 },
        { title: "Around the World", popularity: 85 },
        { title: "Digital Love", popularity: 78 },
      ],
    },
    {
      name: "Radiohead",
      tracks: [
        { title: "Creep", popularity: 97 },
        { title: "Karma Police", popularity: 90 },
        { title: "Paranoid Android", popularity: 86 },
        { title: "No Surprises", popularity: 84 },
        { title: "Fake Plastic Trees", popularity: 79 },
      ],
    },
    {
      name: "The Weeknd",
      tracks: [
        { title: "Blinding Lights", popularity: 100 },
        { title: "Starboy", popularity: 94 },
        { title: "Can't Feel My Face", popularity: 88 },
        { title: "The Hills", popularity: 87 },
        { title: "Save Your Tears", popularity: 83 },
      ],
    },
    {
      name: "Mozart (демо-каталог)",
      tracks: [
        { title: "Symphony No. 40 — Allegro (фрагмент)", popularity: 72 },
        { title: "Eine kleine Nachtmusik — Allegro", popularity: 70 },
        { title: "Rondo alla turca", popularity: 68 },
        { title: "Lacrimosa", popularity: 65 },
        { title: "Queen of the Night aria", popularity: 62 },
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
          durationSec: 180,
          audioPath: DEMO_MP3,
          artistId: artist.id,
        },
      });
    }
  }

  console.log("Seed OK:", catalog.length, "артистов");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
