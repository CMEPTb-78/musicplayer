$php = "C:\OSPanel\modules\php\PHP_8.1\php.exe"
$ext = "C:\OSPanel\modules\php\PHP_8.1\ext"

& $php `
  -d "extension_dir=$ext" `
  -d extension=openssl `
  -d extension=mbstring `
  -d extension=fileinfo `
  -d extension=pdo_sqlite `
  -d extension=sqlite3 `
  -S 127.0.0.1:4000 `
  -t public
