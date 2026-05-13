# Laravel backend

Это перенос серверной части с Express/Prisma на Laravel. API оставлен совместимым с текущим React-клиентом: маршруты начинаются с `/api`, JWT передается через `Authorization: Bearer ...`, а стриминг также принимает `?token=...`.

## Запуск

1. Установи PHP 8.1+ и Composer.
2. В папке `server-laravel` выполни:

```bash
composer install
cp .env.example .env
php artisan key:generate
New-Item -ItemType File database/database.sqlite
php artisan migrate --seed
.\start.ps1
```

Для PowerShell команда создания SQLite-файла уже указана выше. В bash/macOS/Linux используй `touch database/database.sqlite`.

## Использование существующей Prisma SQLite базы

Если хочешь читать текущую базу из Node-версии, укажи в `.env`:

```env
DB_CONNECTION=sqlite
DB_DATABASE=../server/prisma/dev.db
```

Миграции создают Prisma-совместимые имена таблиц и колонок: `User`, `Artist`, `Track`, `Playlist`, `PlaylistTrack`, `UserFavoriteArtist`.

## PHP 8.1

Проект настроен на Laravel 10, потому что эта версия поддерживает PHP 8.1. Если позже переключишь Open Server на PHP 8.2+, можно будет обновиться до Laravel 11/12.

В Open Server CLI PHP может запускаться без `php.ini`, поэтому `start.ps1` явно включает расширения `openssl`, `mbstring`, `fileinfo`, `pdo_sqlite` и `sqlite3`.
