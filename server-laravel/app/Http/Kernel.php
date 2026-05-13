<?php

namespace App\Http;

use App\Http\Middleware\JwtAuth;
use Illuminate\Foundation\Http\Kernel as HttpKernel;

class Kernel extends HttpKernel
{
    protected $middleware = [
        \Illuminate\Http\Middleware\HandleCors::class,
        \Illuminate\Foundation\Http\Middleware\ValidatePostSize::class,
        \Illuminate\Foundation\Http\Middleware\ConvertEmptyStringsToNull::class,
    ];

    protected $middlewareGroups = [
        'web' => [
            \Illuminate\Routing\Middleware\SubstituteBindings::class,
        ],
        'api' => [
            \Illuminate\Routing\Middleware\SubstituteBindings::class,
        ],
    ];

    protected $middlewareAliases = [
        'jwt' => JwtAuth::class,
        'bindings' => \Illuminate\Routing\Middleware\SubstituteBindings::class,
    ];
}
