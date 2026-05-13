<?php

return [
    'default' => env('FILESYSTEM_DISK', 'local'),
    'disks' => [
        'local' => [
            'driver' => 'local',
            'root' => storage_path('app/private'),
            'throw' => false,
        ],
        'uploads' => [
            'driver' => 'local',
            'root' => base_path(env('UPLOAD_DIR', 'storage/app/uploads')),
            'throw' => false,
        ],
    ],
];
