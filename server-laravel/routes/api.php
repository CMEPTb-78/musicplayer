<?php

use App\Http\Controllers\ArtistController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\DiscoverController;
use App\Http\Controllers\PlaylistController;
use App\Http\Controllers\StreamController;
use App\Http\Controllers\TrackController;
use App\Http\Controllers\UploadController;
use Illuminate\Support\Facades\Route;

Route::get('/health', fn () => ['ok' => true]);

Route::prefix('auth')->group(function (): void {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
    Route::get('/me', [AuthController::class, 'me'])->middleware('jwt');
});

Route::get('/artists', [ArtistController::class, 'index']);
Route::get('/artists/{id}/tracks', [ArtistController::class, 'tracks'])->middleware('jwt');

Route::middleware('jwt')->group(function (): void {
    Route::get('/discover/tracks', [DiscoverController::class, 'tracks']);
    Route::get('/playlists', [PlaylistController::class, 'index']);
    Route::post('/playlists', [PlaylistController::class, 'store']);
    Route::get('/playlists/{id}', [PlaylistController::class, 'show']);
    Route::patch('/playlists/{id}', [PlaylistController::class, 'update']);
    Route::delete('/playlists/{id}', [PlaylistController::class, 'destroy']);
    Route::post('/playlists/{id}/tracks', [PlaylistController::class, 'addTrack']);
    Route::delete('/playlists/{id}/tracks/{trackId}', [PlaylistController::class, 'removeTrack']);
    Route::get('/tracks/{id}', [TrackController::class, 'show']);
    Route::post('/uploads', [UploadController::class, 'store']);
});

Route::get('/stream/{trackId}', [StreamController::class, 'show'])->middleware('jwt');
