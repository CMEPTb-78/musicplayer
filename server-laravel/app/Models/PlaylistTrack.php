<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PlaylistTrack extends Model
{
    protected $table = 'PlaylistTrack';
    public $timestamps = false;

    protected $fillable = ['position', 'playlistId', 'trackId'];

    public function playlist(): BelongsTo
    {
        return $this->belongsTo(Playlist::class, 'playlistId');
    }

    public function track(): BelongsTo
    {
        return $this->belongsTo(Track::class, 'trackId');
    }
}
