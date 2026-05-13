<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\JwtService;
use App\Services\RegistrationService;
use App\Support\AuthUser;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class AuthController extends Controller
{
    public function __construct(
        private readonly JwtService $jwt,
        private readonly RegistrationService $registration,
    ) {
    }

    public function register(Request $request): JsonResponse
    {
        try {
            $data = $request->validate([
                'email' => ['required', 'email'],
                'password' => ['required', 'string', 'min:6'],
                'displayName' => ['required', 'string', 'min:1', 'max:80'],
                'artistIds' => ['required', 'array', 'min:1', 'max:20'],
                'artistIds.*' => ['integer', 'min:1'],
            ]);
        } catch (ValidationException $e) {
            return response()->json(['error' => 'Некорректные данные', 'details' => $e->errors()], 400);
        }

        try {
            $user = $this->registration->register($data);
        } catch (RuntimeException $e) {
            return match ($e->getMessage()) {
                'EMAIL_TAKEN' => response()->json(['error' => 'Этот email уже зарегистрирован'], 409),
                'NO_ARTISTS' => response()->json(['error' => 'Выберите хотя бы одного артиста'], 400),
                'INVALID_ARTISTS' => response()->json(['error' => 'Указаны несуществующие артисты'], 400),
                default => response()->json(['error' => 'Ошибка сервера'], 500),
            };
        }

        return response()->json($this->authResponse($user), 201);
    }

    public function login(Request $request): JsonResponse
    {
        try {
            $data = $request->validate([
                'email' => ['required', 'email'],
                'password' => ['required', 'string'],
            ]);
        } catch (ValidationException) {
            return response()->json(['error' => 'Некорректные данные'], 400);
        }

        $user = User::where('email', $data['email'])->first();
        if (! $user || ! Hash::check($data['password'], $user->passwordHash)) {
            return response()->json(['error' => 'Неверный email или пароль'], 401);
        }

        return response()->json($this->authResponse($user));
    }

    public function me(Request $request): JsonResponse
    {
        $user = User::with('favoriteArtists:id,name')->find(AuthUser::id($request));
        if (! $user) {
            return response()->json(['error' => 'Пользователь не найден'], 404);
        }

        return response()->json([
            'id' => $user->id,
            'email' => $user->email,
            'displayName' => $user->displayName,
            'createdAt' => $user->createdAt,
            'favoriteArtists' => $user->favoriteArtists->map(fn ($artist) => [
                'id' => $artist->id,
                'name' => $artist->name,
            ])->values(),
        ]);
    }

    private function authResponse(User $user): array
    {
        return [
            'token' => $this->jwt->sign(['sub' => $user->id, 'email' => $user->email]),
            'user' => [
                'id' => $user->id,
                'email' => $user->email,
                'displayName' => $user->displayName,
            ],
        ];
    }
}
