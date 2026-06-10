<?php
declare(strict_types=1);

require_once __DIR__ . '/DbHandler.php';

$isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
    || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
session_set_cookie_params([
    'lifetime' => 0,
    'path' => '/',
    'secure' => $isHttps,
    'httponly' => true,
    'samesite' => 'Lax',
]);
session_start();

function exportError(int $status, string $message): void
{
    http_response_code($status);
    header('content-type: application/json; charset=utf-8');
    header('cache-control: no-store');
    echo json_encode(['ok' => false, 'error' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

function exportCurrentUser(array $state): ?array
{
    $userId = (string) ($_SESSION['user_id'] ?? '');
    foreach ($state['users'] as $user) {
        if (($user['id'] ?? '') === $userId) {
            return $user;
        }
    }
    return null;
}

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'GET' && $_SERVER['REQUEST_METHOD'] !== 'POST') {
        exportError(405, 'Az export csak GET vagy POST kérést fogad.');
    }

    $db = new DbHandler();
    $state = $db->read();
    $user = exportCurrentUser($state);
    if (!$user || empty($user['isAdmin'])) {
        exportError(403, 'Nincs jogosultság exportáláshoz.');
    }

    $storedState = $db->readStored();
    $filename = 'vb-tippliga-2026-adatok-' . gmdate('Ymd-His') . '.json';
    header('content-type: application/json; charset=utf-8');
    header('cache-control: no-store');
    header('content-disposition: attachment; filename="' . $filename . '"');
    echo json_encode($storedState, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . PHP_EOL;
} catch (Throwable $error) {
    exportError(500, $error->getMessage());
}
