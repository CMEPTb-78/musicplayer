<?php

use Illuminate\Support\Facades\Route;

Route::get('/uploads/{path}', function (string $path) {
    $uploadRoot = realpath(base_path(env('UPLOAD_DIR', 'storage/app/uploads')));
    $full = realpath(($uploadRoot ?: base_path()).DIRECTORY_SEPARATOR.ltrim($path, '/\\'));

    abort_unless($uploadRoot && $full && str_starts_with($full, $uploadRoot) && is_file($full), 404);

    return response()->file($full);
})->where('path', '.*');
