<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('User', function (Blueprint $table): void {
            $table->id();
            $table->string('email')->unique();
            $table->string('passwordHash');
            $table->string('displayName');
            $table->timestamp('createdAt')->useCurrent();
        });

        Schema::create('Artist', function (Blueprint $table): void {
            $table->id();
            $table->string('name')->unique();
        });

        Schema::create('Track', function (Blueprint $table): void {
            $table->id();
            $table->string('title');
            $table->integer('popularity')->default(0);
            $table->integer('durationSec')->default(0);
            $table->string('audioPath');
            $table->foreignId('artistId')->constrained('Artist')->cascadeOnDelete();
            $table->index(['artistId', 'popularity']);
        });

        Schema::create('Playlist', function (Blueprint $table): void {
            $table->id();
            $table->string('name');
            $table->foreignId('userId')->constrained('User')->cascadeOnDelete();
            $table->boolean('isStarter')->default(false);
            $table->timestamp('createdAt')->useCurrent();
        });

        Schema::create('PlaylistTrack', function (Blueprint $table): void {
            $table->id();
            $table->integer('position');
            $table->foreignId('playlistId')->constrained('Playlist')->cascadeOnDelete();
            $table->foreignId('trackId')->constrained('Track')->cascadeOnDelete();
            $table->unique(['playlistId', 'trackId']);
            $table->index(['playlistId', 'position']);
        });

        Schema::create('UserFavoriteArtist', function (Blueprint $table): void {
            $table->foreignId('userId')->constrained('User')->cascadeOnDelete();
            $table->foreignId('artistId')->constrained('Artist')->cascadeOnDelete();
            $table->primary(['userId', 'artistId']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('UserFavoriteArtist');
        Schema::dropIfExists('PlaylistTrack');
        Schema::dropIfExists('Playlist');
        Schema::dropIfExists('Track');
        Schema::dropIfExists('Artist');
        Schema::dropIfExists('User');
    }
};
