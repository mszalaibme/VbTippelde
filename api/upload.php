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

function sendUploadJson(int $status, array $payload): void
{
    http_response_code($status);
    header('content-type: application/json; charset=utf-8');
    header('cache-control: no-store');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

function uploadFail(int $status, string $message): void
{
    sendUploadJson($status, ['ok' => false, 'error' => $message]);
}

function uploadLower(string $value): string
{
    return function_exists('mb_strtolower') ? mb_strtolower($value, 'UTF-8') : strtolower($value);
}

function uploadCurrentUser(array $state, DbHandler $db): ?array
{
    $userId = (string) ($_SESSION['user_id'] ?? '');
    foreach ($state['users'] as $user) {
        if (($user['id'] ?? '') === $userId) {
            return $db->publicUser($user);
        }
    }
    return null;
}

function requireUploadAdmin(array $state, DbHandler $db): array
{
    $user = uploadCurrentUser($state, $db);
    if (!$user || empty($user['isAdmin'])) {
        uploadFail(403, 'Nincs jogosultság fájlfeltöltéshez.');
    }
    return $user;
}

function uploadNowId(string $prefix, int $index): string
{
    return $prefix . '-' . str_replace('.', '', sprintf('%.6f', microtime(true))) . '-' . $index;
}

function uploadStageForLabel(string $label): string
{
    return strpos(uploadLower($label), 'csoport') !== false ? 'group' : 'knockout';
}

function normalizeUploadText(string $text): string
{
    if (preg_match('//u', $text)) {
        return preg_replace('/^\xEF\xBB\xBF/', '', $text) ?? $text;
    }

    if (function_exists('iconv')) {
        $converted = iconv('WINDOWS-1250', 'UTF-8//IGNORE', $text);
        if ($converted !== false) {
            return preg_replace('/^\xEF\xBB\xBF/', '', $converted) ?? $converted;
        }
    }

    return $text;
}

function normalizeHeader(string $value): string
{
    $value = uploadLower($value);
    $value = strtr($value, [
        'á' => 'a', 'é' => 'e', 'í' => 'i', 'ó' => 'o', 'ö' => 'o', 'ő' => 'o',
        'ú' => 'u', 'ü' => 'u', 'ű' => 'u',
    ]);
    return preg_replace('/[^a-z0-9]+/', '', $value) ?? '';
}

function csvValue(array $headers, array $row, array $names): string
{
    foreach ($headers as $index => $header) {
        if (in_array($header, $names, true)) {
            return trim((string) ($row[$index] ?? ''));
        }
    }
    return '';
}

function parseUploadDate(string $value, int $rowNumber): string
{
    $trimmed = trim($value);
    if (preg_match('/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?\s*(CEST|CET)?$/i', $trimmed, $match)) {
        $second = ($match[6] ?? '') !== '' ? $match[6] : '00';
        $zone = strtoupper($match[7] ?? 'CEST') === 'CET' ? '+01:00' : '+02:00';
        $trimmed = "{$match[1]}-{$match[2]}-{$match[3]}T{$match[4]}:{$match[5]}:{$second}{$zone}";
    }

    try {
        $date = new DateTimeImmutable($trimmed);
    } catch (Throwable $error) {
        uploadFail(400, "Hibás időpont a(z) {$rowNumber}. sorban.");
    }

    return $date->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d\TH:i:s\Z');
}

function parseMatchesCsv(string $text): array
{
    $text = normalizeUploadText($text);
    $firstLine = strtok($text, "\r\n") ?: '';
    $delimiter = substr_count($firstLine, ';') > substr_count($firstLine, ',') ? ';' : ',';
    $stream = fopen('php://temp', 'r+');
    fwrite($stream, $text);
    rewind($stream);

    $rows = [];
    while (($row = fgetcsv($stream, 0, $delimiter)) !== false) {
        $rows[] = array_map(fn ($cell): string => trim((string) $cell), $row);
    }
    fclose($stream);

    if (count($rows) < 2) {
        uploadFail(400, 'A CSV üres.');
    }

    $headers = array_map('normalizeHeader', $rows[0]);
    $matches = [];
    foreach (array_slice($rows, 1) as $index => $row) {
        if (!array_filter($row, fn ($cell): bool => trim((string) $cell) !== '')) {
            continue;
        }

        $rowNumber = $index + 2;
        $home = csvValue($headers, $row, ['hazaicsapat', 'hazai', 'home']);
        $away = csvValue($headers, $row, ['idegencsapat', 'idegen', 'vendeg', 'away']);
        $kickoff = csvValue($headers, $row, ['idopont', 'datum', 'date', 'kickoff']);
        $label = csvValue($headers, $row, ['meccsstatus', 'status', 'szakasz', 'stage']) ?: 'Csoportkör';
        $group = csvValue($headers, $row, ['csoport', 'group']);
        if ($home === '' || $away === '' || $kickoff === '') {
            uploadFail(400, "Hiányzó adat a(z) {$rowNumber}. sorban.");
        }

        $matches[] = [
            'id' => uploadNowId('csv', $index),
            'home' => $home,
            'away' => $away,
            'kickoff' => parseUploadDate($kickoff, $rowNumber),
            'label' => $label,
            'group' => $group,
            'stage' => uploadStageForLabel($label),
        ];
    }

    return $matches;
}

function filterByMatchIds(array $items, array $keepIds): array
{
    return array_values(array_filter($items, fn ($item): bool => isset($keepIds[$item['matchId'] ?? ''])));
}

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        uploadFail(405, 'A feltöltő csak POST kérést fogad.');
    }

    $db = new DbHandler();
    $state = $db->read();
    requireUploadAdmin($state, $db);

    $kind = (string) ($_POST['kind'] ?? 'matches-csv');
    if ($kind === 'matches-csv') {
        if (empty($_FILES['csvFile']['tmp_name']) || ($_FILES['csvFile']['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            uploadFail(400, 'Nem érkezett CSV fájl.');
        }
        $matches = parseMatchesCsv((string) file_get_contents($_FILES['csvFile']['tmp_name']));
        $replace = !empty($_POST['replaceMatches']);
        $state = $db->update(function (array $state) use ($matches, $replace): array {
            if ($replace) {
                $keepIds = array_fill_keys(array_column($matches, 'id'), true);
                $state['matches'] = $matches;
                $state['predictions'] = filterByMatchIds($state['predictions'], $keepIds);
                $state['predictionSubmissions'] = filterByMatchIds($state['predictionSubmissions'], $keepIds);
                $state['resultSubmissions'] = filterByMatchIds($state['resultSubmissions'], $keepIds);
                $state['approvedResults'] = filterByMatchIds($state['approvedResults'], $keepIds);
                $state['hiddenMissingTips'] = array_values(array_filter(
                    $state['hiddenMissingTips'],
                    fn ($key): bool => isset($keepIds[explode(':', (string) $key)[1] ?? ''])
                ));
            } else {
                array_push($state['matches'], ...$matches);
            }
            return $state;
        });
        sendUploadJson(200, [
            'ok' => true,
            'state' => $db->publicState($state),
            'config' => $db->publicConfig(),
            'user' => uploadCurrentUser($state, $db),
            'imported' => count($matches),
        ]);
    }

    if ($kind === 'state-json') {
        $file = $_FILES['stateFile'] ?? $_FILES['jsonFile'] ?? null;
        if (!$file || empty($file['tmp_name']) || (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK)) {
            uploadFail(400, 'Nem érkezett JSON fájl.');
        }
        $decoded = json_decode((string) file_get_contents($file['tmp_name']), true);
        if (!is_array($decoded)) {
            uploadFail(400, 'A feltöltött fájl nem érvényes JSON.');
        }
        $state = $db->update(fn (array $state): array => $decoded);
        sendUploadJson(200, [
            'ok' => true,
            'state' => $db->publicState($state),
            'config' => $db->publicConfig(),
            'user' => uploadCurrentUser($state, $db),
        ]);
    }

    uploadFail(400, 'Ismeretlen feltöltési típus.');
} catch (Throwable $error) {
    uploadFail(500, $error->getMessage());
}
