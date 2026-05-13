<?php

use Illuminate\Support\Facades\Artisan;

Artisan::command('about:music-player', function (): void {
    $this->info('Music Player Laravel API');
});
