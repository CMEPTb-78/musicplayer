<?php

namespace App\Support;

use Illuminate\Http\Request;

class AuthUser
{
    public static function id(Request $request): int
    {
        return (int) ($request->attributes->get('authUser')['sub'] ?? 0);
    }
}
