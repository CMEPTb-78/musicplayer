<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Playlist extends Model
{
    protected $table = 'Playlist';

    public const CREATED_AT = 'createdAt';
    public const UPDATED_AT = null;

    protected $fillable = ['name', 'userId', 'isStarter'];

    protected $casts = [
        'isStarter' => 'boolean',
        'createdAt' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'userId');
    }

    public function tracks(): HasMany
    {
        return $this->hasMany(PlaylistTrack::class, 'playlistId');
    }
}
