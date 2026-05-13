<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Artist extends Model
{
    protected $table = 'Artist';
    public $timestamps = false;

    protected $fillable = ['name'];

    public function tracks(): HasMany
    {
        return $this->hasMany(Track::class, 'artistId');
    }

    public function favoritedBy(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'UserFavoriteArtist', 'artistId', 'userId');
    }
}
