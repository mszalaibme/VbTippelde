<?php
declare(strict_types=1);

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';

if ($path === '/') {
    header('content-type: text/html; charset=utf-8');
    readfile(__DIR__ . '/index.html');
    return true;
}

if (strpos($path, '/data/') === 0 || $path === '/data') {
    http_response_code(403);
    echo 'Forbidden';
    return true;
}

$file = realpath(__DIR__ . $path);
if ($file && strpos($file, __DIR__) === 0 && is_file($file)) {
    return false;
}

http_response_code(404);
echo 'Not found';
return true;
