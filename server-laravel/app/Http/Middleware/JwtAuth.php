<?php

namespace App\Http\Middleware;

use App\Services\JwtService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class JwtAuth
{
    public function __construct(private readonly JwtService $jwt)
    {
    }

    public function handle(Request $request, Closure $next): Response
    {
        $header = $request->header('Authorization', '');
        $token = str_starts_with($header, 'Bearer ') ? substr($header, 7) : $request->query('token');

        if (! is_string($token) || $token === '') {
            return response()->json(['error' => 'Требуется авторизация'], 401);
        }

        try {
            $request->attributes->set('authUser', $this->jwt->verify($token));
        } catch (\Throwable) {
            return response()->json(['error' => 'Недействительный токен'], 401);
        }

        return $next($request);
    }
}
