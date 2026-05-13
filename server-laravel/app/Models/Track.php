<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Track extends Model
{
    protected $table = 'Track';
    public $timestamps = false;

    protected $fillable = ['title', 'popularity', 'durationSec', 'audioPath', 'artistId'];

    public function artist(): BelongsTo
    {
        return $this->belongsTo(Artist::class, 'artistId');
    }

    public function playlists(): HasMany
    {
        return $this->hasMany(PlaylistTrack::class, 'trackId');
    }
}
