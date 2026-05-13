<?php

namespace App\Services;

use RuntimeException;

class JwtService
{
    public function sign(array $payload): string
    {
        $ttl = (int) env('JWT_TTL_MINUTES', 60 * 24 * 7);
        $payload['iat'] = time();
        $payload['exp'] = time() + ($ttl * 60);

        $header = ['alg' => 'HS256', 'typ' => 'JWT'];
        $segments = [
            $this->base64UrlEncode(json_encode($header, JSON_THROW_ON_ERROR)),
            $this->base64UrlEncode(json_encode($payload, JSON_THROW_ON_ERROR)),
        ];
        $segments[] = $this->signature($segments[0].'.'.$segments[1]);

        return implode('.', $segments);
    }

    public function verify(string $token): array
    {
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            throw new RuntimeException('Invalid token');
        }

        [$header, $payload, $signature] = $parts;
        if (! hash_equals($this->signature($header.'.'.$payload), $signature)) {
            throw new RuntimeException('Invalid token');
        }

        $decoded = json_decode($this->base64UrlDecode($payload), true, flags: JSON_THROW_ON_ERROR);
        if (($decoded['exp'] ?? 0) < time()) {
            throw new RuntimeException('Expired token');
        }

        return $decoded;
    }

    private function signature(string $data): string
    {
        return $this->base64UrlEncode(hash_hmac('sha256', $data, env('JWT_SECRET', 'dev-secret'), true));
    }

    private function base64UrlEncode(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }

    private function base64UrlDecode(string $value): string
    {
        return base64_decode(strtr($value, '-_', '+/').str_repeat('=', (4 - strlen($value) % 4) % 4));
    }
}
