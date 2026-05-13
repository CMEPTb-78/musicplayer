<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class User extends Authenticatable
{
    protected $table = 'User';

    public const CREATED_AT = 'createdAt';
    public const UPDATED_AT = null;

    protected $fillable = ['email', 'passwordHash', 'displayName'];

    protected $hidden = ['passwordHash'];

    public function playlists(): HasMany
    {
        return $this->hasMany(Playlist::class, 'userId');
    }

    public function favoriteArtists(): BelongsToMany
    {
        return $this->belongsToMany(Artist::class, 'UserFavoriteArtist', 'userId', 'artistId');
    }
}
