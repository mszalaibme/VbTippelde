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

final class ApiError extends RuntimeException
{
    private int $httpStatus;

    public function __construct(int $httpStatus, string $message)
    {
        parent::__construct($message);
        $this->httpStatus = $httpStatus;
    }

    public function status(): int
    {
        return $this->httpStatus;
    }
}

function sendJson(int $status, array $payload): void
{
    http_response_code($status);
    header('content-type: application/json; charset=utf-8');
    header('cache-control: no-store');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

function failRequest(int $status, string $message): void
{
    throw new ApiError($status, $message);
}

function lowerText(string $value): string
{
    return function_exists('mb_strtolower') ? mb_strtolower($value, 'UTF-8') : strtolower($value);
}

function readPayload(): array
{
    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
    if (stripos($contentType, 'application/json') !== false) {
        $raw = file_get_contents('php://input') ?: '{}';
        $decoded = json_decode($raw, true);
        if (!is_array($decoded)) {
            failRequest(400, 'Érvénytelen JSON kérés.');
        }
        return $decoded;
    }

    return $_POST;
}

function nowIso(): string
{
    return gmdate('Y-m-d\TH:i:s\Z');
}

function createId(string $prefix): string
{
    return $prefix . '-' . bin2hex(random_bytes(12));
}

function findIndexById(array $items, string $id): int
{
    foreach ($items as $index => $item) {
        if (($item['id'] ?? '') === $id) {
            return $index;
        }
    }
    return -1;
}

function findUserIndexByName(array $state, string $name): int
{
    $needle = lowerText(trim($name));
    foreach ($state['users'] as $index => $user) {
        if (lowerText((string) ($user['name'] ?? '')) === $needle) {
            return $index;
        }
    }
    return -1;
}

function currentUser(array $state, DbHandler $db): ?array
{
    $userId = (string) ($_SESSION['user_id'] ?? '');
    if ($userId === '') {
        return null;
    }

    $index = findIndexById($state['users'], $userId);
    if ($index < 0) {
        unset($_SESSION['user_id']);
        return null;
    }

    return $db->publicUser($state['users'][$index]);
}

function requireUser(array $state, DbHandler $db): array
{
    $user = currentUser($state, $db);
    if (!$user) {
        failRequest(401, 'Bejelentkezés szükséges.');
    }
    return $user;
}

function requireAdmin(array $state, DbHandler $db): array
{
    $user = requireUser($state, $db);
    if (empty($user['isAdmin'])) {
        failRequest(403, 'Nincs jogosultság ehhez a művelethez.');
    }
    return $user;
}

function stateResponse(array $state, DbHandler $db, array $extra = []): array
{
    return array_merge([
        'ok' => true,
        'state' => $db->publicState($state),
        'config' => $db->publicConfig(),
        'user' => currentUser($state, $db),
    ], $extra);
}

function canPlay(array $user, DbHandler $db): bool
{
    return !$db->isSystemAdminUser($user) && empty($user['mustChangePassword']);
}

function scoreValue($value, string $label): int
{
    if (!is_numeric($value)) {
        failRequest(400, $label . ' eredmény hibás.');
    }

    $score = (int) $value;
    if ($score < 0 || $score > 20) {
        failRequest(400, $label . ' eredmény 0 és 20 között lehet.');
    }

    return $score;
}

function isoDateValue($value): string
{
    try {
        $date = new DateTimeImmutable((string) $value);
    } catch (Throwable $error) {
        failRequest(400, 'Hibás időpont.');
    }

    return $date->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d\TH:i:s\Z');
}

function stageForLabel(string $label): string
{
    return strpos(lowerText($label), 'csoport') !== false ? 'group' : 'knockout';
}

function matchIndex(array $state, string $matchId): int
{
    return findIndexById($state['matches'], $matchId);
}

function approvedResultIndex(array $state, string $matchId): int
{
    foreach ($state['approvedResults'] as $index => $result) {
        if (($result['matchId'] ?? '') === $matchId) {
            return $index;
        }
    }
    return -1;
}

function pendingResultFor(array $state, string $matchId): ?array
{
    $latest = null;
    foreach ($state['resultSubmissions'] as $item) {
        if (($item['matchId'] ?? '') !== $matchId || ($item['status'] ?? '') !== 'pending') {
            continue;
        }
        if (!$latest || strcmp((string) ($item['submittedAt'] ?? ''), (string) ($latest['submittedAt'] ?? '')) > 0) {
            $latest = $item;
        }
    }
    return $latest;
}

function predictionIndex(array $state, string $userId, string $matchId): int
{
    foreach ($state['predictions'] as $index => $prediction) {
        if (($prediction['userId'] ?? '') === $userId && ($prediction['matchId'] ?? '') === $matchId) {
            return $index;
        }
    }
    return -1;
}

function isLocked(array $match): bool
{
    $time = strtotime((string) ($match['kickoff'] ?? ''));
    return $time !== false && time() >= $time;
}

function outcome(int $homeGoals, int $awayGoals): string
{
    if ($homeGoals > $awayGoals) {
        return 'home';
    }
    if ($awayGoals > $homeGoals) {
        return 'away';
    }
    return 'draw';
}

function impliedQualifier(array $match, int $homeGoals, int $awayGoals, string $qualifier): string
{
    $result = outcome($homeGoals, $awayGoals);
    if ($result === 'home') {
        return (string) ($match['home'] ?? '');
    }
    if ($result === 'away') {
        return (string) ($match['away'] ?? '');
    }
    return $qualifier;
}

function validQualifier(array $match, int $homeGoals, int $awayGoals, string $qualifier): string
{
    if (($match['stage'] ?? '') !== 'knockout') {
        return '';
    }

    if ($homeGoals !== $awayGoals) {
        return impliedQualifier($match, $homeGoals, $awayGoals, '');
    }

    $allowed = [(string) ($match['home'] ?? ''), (string) ($match['away'] ?? '')];
    if ($qualifier === '' || !in_array($qualifier, $allowed, true)) {
        failRequest(400, 'Döntetlen kieséses meccsnél továbbjutót kell választani.');
    }
    return $qualifier;
}

function upsertApprovedResult(array &$state, string $matchId, int $homeGoals, int $awayGoals, string $qualifier, string $approvedBy): void
{
    $state['approvedResults'] = array_values(array_filter(
        $state['approvedResults'],
        fn ($result): bool => ($result['matchId'] ?? '') !== $matchId
    ));
    $state['approvedResults'][] = [
        'id' => createId('approved'),
        'matchId' => $matchId,
        'homeGoals' => $homeGoals,
        'awayGoals' => $awayGoals,
        'qualifier' => $qualifier,
        'approvedAt' => nowIso(),
        'approvedBy' => $approvedBy,
    ];

    foreach ($state['resultSubmissions'] as &$item) {
        if (($item['matchId'] ?? '') === $matchId && ($item['status'] ?? '') === 'pending') {
            $item['status'] = 'rejected';
            $item['reviewedAt'] = nowIso();
        }
    }
    unset($item);
}

function missingTipKey(string $userId, string $matchId): string
{
    return $userId . ':' . $matchId;
}

function removeUserData(array &$state, string $userId): void
{
    $state['users'] = array_values(array_filter($state['users'], fn ($user): bool => ($user['id'] ?? '') !== $userId));
    $state['predictions'] = array_values(array_filter($state['predictions'], fn ($item): bool => ($item['userId'] ?? '') !== $userId));
    $state['predictionSubmissions'] = array_values(array_filter($state['predictionSubmissions'], fn ($item): bool => ($item['userId'] ?? '') !== $userId));
    $state['resultSubmissions'] = array_values(array_filter($state['resultSubmissions'], fn ($item): bool => ($item['userId'] ?? '') !== $userId));
    $state['hiddenMissingTips'] = array_values(array_filter(
        $state['hiddenMissingTips'],
        fn ($key): bool => explode(':', (string) $key)[0] !== $userId
    ));
}

try {
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        header('access-control-allow-methods: POST, OPTIONS');
        header('access-control-allow-headers: content-type');
        header('cache-control: no-store');
        http_response_code(204);
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        failRequest(405, 'Ez az API csak POST kéréseket fogad.');
    }

    $db = new DbHandler();
    $action = (string) ($_GET['action'] ?? '');
    $payload = readPayload();
    if ($action === '') {
        $action = (string) ($payload['action'] ?? '');
    }

    switch ($action) {
        case 'bootstrap': {
            $state = $db->read();
            sendJson(200, stateResponse($state, $db));
        }

        case 'login': {
            $state = $db->read();
            $index = findUserIndexByName($state, (string) ($payload['name'] ?? ''));
            if ($index < 0) {
                failRequest(404, 'Nincs ilyen felhasználó.');
            }
            $user = $state['users'][$index];
            if (!$db->verifyPassword($user, (string) ($payload['password'] ?? ''))) {
                failRequest(401, 'Hibás jelszó.');
            }
            session_regenerate_id(true);
            $_SESSION['user_id'] = $user['id'];
            sendJson(200, stateResponse($state, $db, ['user' => $db->publicUser($user)]));
        }

        case 'logout': {
            $_SESSION = [];
            if (ini_get('session.use_cookies')) {
                $params = session_get_cookie_params();
                setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'] ?? '', (bool) $params['secure'], (bool) $params['httponly']);
            }
            session_destroy();
            $state = $db->read();
            sendJson(200, ['ok' => true, 'state' => $db->publicState($state), 'config' => $db->publicConfig(), 'user' => null]);
        }

        case 'change-password': {
            $state = $db->update(function (array $state) use ($payload, $db): array {
                $user = requireUser($state, $db);
                if ($db->isSystemAdminUser($user)) {
                    failRequest(403, 'Az alap admin jelszava be van építve az appba.');
                }
                $index = findIndexById($state['users'], (string) $user['id']);
                if ($index < 0 || !$db->verifyPassword($state['users'][$index], (string) ($payload['oldPassword'] ?? ''))) {
                    failRequest(401, 'A régi jelszó nem stimmel.');
                }
                if ((string) ($payload['newPassword'] ?? '') === '') {
                    failRequest(400, 'Az új jelszó nem lehet üres.');
                }
                $db->setPassword($state['users'][$index], (string) $payload['newPassword']);
                $state['users'][$index]['mustChangePassword'] = false;
                $state['users'][$index]['passwordChangedAt'] = nowIso();
                return $state;
            });
            sendJson(200, stateResponse($state, $db));
        }

        case 'complete-first-password-change': {
            $state = $db->update(function (array $state) use ($payload, $db): array {
                $user = requireUser($state, $db);
                $index = findIndexById($state['users'], (string) $user['id']);
                if ($index < 0 || empty($state['users'][$index]['mustChangePassword']) || (string) ($payload['newPassword'] ?? '') === '') {
                    failRequest(403, 'A jelszó módosítása nem engedélyezett.');
                }
                $db->setPassword($state['users'][$index], (string) $payload['newPassword']);
                $state['users'][$index]['mustChangePassword'] = false;
                $state['users'][$index]['passwordChangedAt'] = nowIso();
                return $state;
            });
            sendJson(200, stateResponse($state, $db));
        }

        case 'password-reset-request': {
            $state = $db->update(function (array $state) use ($payload, $db): array {
                $requestedName = trim((string) ($payload['name'] ?? ''));
                if ($requestedName === '') {
                    failRequest(400, 'Add meg a felhasználóneved.');
                }
                $userIndex = findUserIndexByName($state, $requestedName);
                $user = $userIndex >= 0 && !$db->isSystemAdminUser($state['users'][$userIndex]) ? $state['users'][$userIndex] : null;
                foreach ($state['passwordResetRequests'] as $request) {
                    $sameKnownUser = $user && (($request['userId'] ?? '') === ($user['id'] ?? ''));
                    $sameName = lowerText((string) ($request['requestedName'] ?? '')) === lowerText($requestedName);
                    if (($request['status'] ?? '') === 'pending' && ($sameKnownUser || $sameName)) {
                        return $state;
                    }
                }
                $state['passwordResetRequests'][] = [
                    'id' => createId('reset'),
                    'userId' => $user['id'] ?? '',
                    'requestedName' => $requestedName,
                    'status' => 'pending',
                    'requestedAt' => nowIso(),
                ];
                return $state;
            });
            sendJson(200, stateResponse($state, $db));
        }

        case 'admin-create-user': {
            $createdUser = null;
            $state = $db->update(function (array $state) use ($payload, $db, &$createdUser): array {
                $admin = requireAdmin($state, $db);
                $name = trim((string) ($payload['name'] ?? ''));
                $password = (string) ($payload['password'] ?? '');
                if ($name === '' || $password === '') {
                    failRequest(400, 'Név és jelszó is kell.');
                }
                if (findUserIndexByName($state, $name) >= 0) {
                    failRequest(409, 'Ez a név már létezik.');
                }
                $user = [
                    'id' => createId('user'),
                    'name' => $name,
                    'isAdmin' => !empty($payload['isAdmin']),
                    'isSystemAdmin' => false,
                    'mustChangePassword' => true,
                    'createdByAdmin' => $admin['id'],
                    'createdAt' => nowIso(),
                ];
                $db->setPassword($user, $password);
                $state['users'][] = $user;
                $createdUser = $db->publicUser($user);
                return $state;
            });
            sendJson(200, stateResponse($state, $db, ['createdUser' => $createdUser]));
        }

        case 'admin-set-password': {
            $state = $db->update(function (array $state) use ($payload, $db): array {
                requireAdmin($state, $db);
                $index = findIndexById($state['users'], (string) ($payload['userId'] ?? ''));
                if ($index < 0 || (string) ($payload['password'] ?? '') === '') {
                    failRequest(403, 'Nincs jogosultság a jelszó visszaállításához.');
                }
                if ($db->isSystemAdminUser($state['users'][$index])) {
                    failRequest(403, 'Az alap admin jelszava be van építve az appba.');
                }
                $db->setPassword($state['users'][$index], (string) $payload['password']);
                $state['users'][$index]['mustChangePassword'] = true;
                return $state;
            });
            sendJson(200, stateResponse($state, $db));
        }

        case 'resolve-password-reset': {
            $state = $db->update(function (array $state) use ($payload, $db): array {
                $admin = requireAdmin($state, $db);
                $requestIndex = findIndexById($state['passwordResetRequests'], (string) ($payload['requestId'] ?? ''));
                if ($requestIndex < 0 || (string) ($payload['password'] ?? '') === '') {
                    failRequest(403, 'Nincs jogosultság a jelszó visszaállításához.');
                }
                $userIndex = findIndexById($state['users'], (string) ($state['passwordResetRequests'][$requestIndex]['userId'] ?? ''));
                if ($userIndex < 0 || $db->isSystemAdminUser($state['users'][$userIndex])) {
                    failRequest(403, 'Nincs jogosultság a jelszó visszaállításához.');
                }
                $db->setPassword($state['users'][$userIndex], (string) $payload['password']);
                $state['users'][$userIndex]['mustChangePassword'] = true;
                $state['passwordResetRequests'][$requestIndex]['status'] = 'resolved';
                $state['passwordResetRequests'][$requestIndex]['reviewedAt'] = nowIso();
                $state['passwordResetRequests'][$requestIndex]['reviewedBy'] = $admin['id'];
                return $state;
            });
            sendJson(200, stateResponse($state, $db));
        }

        case 'close-password-reset': {
            $state = $db->update(function (array $state) use ($payload, $db): array {
                $admin = requireAdmin($state, $db);
                $requestIndex = findIndexById($state['passwordResetRequests'], (string) ($payload['requestId'] ?? ''));
                if ($requestIndex < 0) {
                    failRequest(404, 'Nincs ilyen jelszó-visszaállítási kérés.');
                }
                $state['passwordResetRequests'][$requestIndex]['status'] = 'closed';
                $state['passwordResetRequests'][$requestIndex]['reviewedAt'] = nowIso();
                $state['passwordResetRequests'][$requestIndex]['reviewedBy'] = $admin['id'];
                return $state;
            });
            sendJson(200, stateResponse($state, $db));
        }

        case 'save-prediction': {
            $state = $db->update(function (array $state) use ($payload, $db): array {
                $user = requireUser($state, $db);
                if (!canPlay($user, $db)) {
                    failRequest(403, 'Most nem menthetsz tippet.');
                }
                $matchId = (string) ($payload['matchId'] ?? '');
                $matchIdx = matchIndex($state, $matchId);
                if ($matchIdx < 0) {
                    failRequest(404, 'Nincs ilyen meccs.');
                }
                $match = $state['matches'][$matchIdx];
                if (isLocked($match) || approvedResultIndex($state, $matchId) >= 0) {
                    failRequest(403, 'Erre a meccsre már nem lehet tippelni.');
                }
                $homeGoals = scoreValue($payload['homeGoals'] ?? null, 'Hazai');
                $awayGoals = scoreValue($payload['awayGoals'] ?? null, 'Vendég');
                $qualifier = validQualifier($match, $homeGoals, $awayGoals, trim((string) ($payload['qualifier'] ?? '')));

                if (pendingResultFor($state, $matchId)) {
                    $state['predictionSubmissions'][] = [
                        'id' => createId('prediction-change'),
                        'userId' => $user['id'],
                        'matchId' => $matchId,
                        'homeGoals' => $homeGoals,
                        'awayGoals' => $awayGoals,
                        'qualifier' => $qualifier,
                        'status' => 'pending',
                        'submittedAt' => nowIso(),
                    ];
                    return $state;
                }

                $predictionIdx = predictionIndex($state, (string) $user['id'], $matchId);
                if ($predictionIdx >= 0) {
                    $state['predictions'][$predictionIdx]['homeGoals'] = $homeGoals;
                    $state['predictions'][$predictionIdx]['awayGoals'] = $awayGoals;
                    $state['predictions'][$predictionIdx]['qualifier'] = $qualifier;
                    $state['predictions'][$predictionIdx]['updatedAt'] = nowIso();
                } else {
                    $state['predictions'][] = [
                        'id' => createId('prediction'),
                        'userId' => $user['id'],
                        'matchId' => $matchId,
                        'homeGoals' => $homeGoals,
                        'awayGoals' => $awayGoals,
                        'qualifier' => $qualifier,
                        'createdAt' => nowIso(),
                        'updatedAt' => nowIso(),
                    ];
                }
                return $state;
            });
            sendJson(200, stateResponse($state, $db));
        }

        case 'submit-result': {
            $state = $db->update(function (array $state) use ($payload, $db): array {
                $user = requireUser($state, $db);
                if (!empty($user['mustChangePassword'])) {
                    failRequest(403, 'Előbb módosítanod kell a jelszavad.');
                }
                $matchId = (string) ($payload['matchId'] ?? '');
                $matchIdx = matchIndex($state, $matchId);
                if ($matchIdx < 0) {
                    failRequest(404, 'Nincs ilyen meccs.');
                }
                $match = $state['matches'][$matchIdx];
                $homeGoals = scoreValue($payload['homeGoals'] ?? null, 'Hazai');
                $awayGoals = scoreValue($payload['awayGoals'] ?? null, 'Vendég');
                $qualifier = validQualifier($match, $homeGoals, $awayGoals, trim((string) ($payload['qualifier'] ?? '')));
                if (!empty($user['isAdmin'])) {
                    upsertApprovedResult($state, $matchId, $homeGoals, $awayGoals, $qualifier, (string) $user['id']);
                    return $state;
                }
                $state['resultSubmissions'][] = [
                    'id' => createId('result'),
                    'userId' => $user['id'],
                    'matchId' => $matchId,
                    'homeGoals' => $homeGoals,
                    'awayGoals' => $awayGoals,
                    'qualifier' => $qualifier,
                    'status' => 'pending',
                    'submittedAt' => nowIso(),
                ];
                return $state;
            });
            sendJson(200, stateResponse($state, $db));
        }

        case 'update-approved-result': {
            $state = $db->update(function (array $state) use ($payload, $db): array {
                $admin = requireAdmin($state, $db);
                $matchId = (string) ($payload['matchId'] ?? '');
                $matchIdx = matchIndex($state, $matchId);
                $resultIdx = approvedResultIndex($state, $matchId);
                if ($matchIdx < 0 || $resultIdx < 0) {
                    failRequest(404, 'Nincs ilyen végleges eredmény.');
                }
                $homeGoals = scoreValue($payload['homeGoals'] ?? null, 'Hazai');
                $awayGoals = scoreValue($payload['awayGoals'] ?? null, 'Vendég');
                $state['approvedResults'][$resultIdx]['homeGoals'] = $homeGoals;
                $state['approvedResults'][$resultIdx]['awayGoals'] = $awayGoals;
                $state['approvedResults'][$resultIdx]['qualifier'] = validQualifier($state['matches'][$matchIdx], $homeGoals, $awayGoals, trim((string) ($payload['qualifier'] ?? '')));
                $state['approvedResults'][$resultIdx]['approvedAt'] = nowIso();
                $state['approvedResults'][$resultIdx]['approvedBy'] = $admin['id'];
                return $state;
            });
            sendJson(200, stateResponse($state, $db));
        }

        case 'approve-result': {
            $state = $db->update(function (array $state) use ($payload, $db): array {
                $admin = requireAdmin($state, $db);
                $index = findIndexById($state['resultSubmissions'], (string) ($payload['submissionId'] ?? ''));
                if ($index < 0) {
                    failRequest(404, 'Nincs ilyen eredménybeküldés.');
                }
                $submission = $state['resultSubmissions'][$index];
                upsertApprovedResult(
                    $state,
                    (string) $submission['matchId'],
                    (int) $submission['homeGoals'],
                    (int) $submission['awayGoals'],
                    (string) ($submission['qualifier'] ?? ''),
                    (string) $admin['id']
                );
                $state['resultSubmissions'][$index]['status'] = 'approved';
                $state['resultSubmissions'][$index]['reviewedAt'] = nowIso();
                return $state;
            });
            sendJson(200, stateResponse($state, $db));
        }

        case 'reject-result': {
            $state = $db->update(function (array $state) use ($payload, $db): array {
                requireAdmin($state, $db);
                $index = findIndexById($state['resultSubmissions'], (string) ($payload['submissionId'] ?? ''));
                if ($index < 0) {
                    failRequest(404, 'Nincs ilyen eredménybeküldés.');
                }
                $state['resultSubmissions'][$index]['status'] = 'rejected';
                $state['resultSubmissions'][$index]['reviewedAt'] = nowIso();
                return $state;
            });
            sendJson(200, stateResponse($state, $db));
        }

        case 'approve-prediction-submission': {
            $state = $db->update(function (array $state) use ($payload, $db): array {
                $admin = requireAdmin($state, $db);
                $index = findIndexById($state['predictionSubmissions'], (string) ($payload['submissionId'] ?? ''));
                if ($index < 0) {
                    failRequest(404, 'Nincs ilyen tippmódosítás.');
                }
                $submission = $state['predictionSubmissions'][$index];
                $predictionIdx = predictionIndex($state, (string) $submission['userId'], (string) $submission['matchId']);
                if ($predictionIdx < 0) {
                    $state['predictions'][] = [
                        'id' => createId('prediction'),
                        'userId' => $submission['userId'],
                        'matchId' => $submission['matchId'],
                        'createdAt' => $submission['submittedAt'] ?? nowIso(),
                    ];
                    $predictionIdx = count($state['predictions']) - 1;
                }
                $state['predictions'][$predictionIdx]['homeGoals'] = (int) $submission['homeGoals'];
                $state['predictions'][$predictionIdx]['awayGoals'] = (int) $submission['awayGoals'];
                $state['predictions'][$predictionIdx]['qualifier'] = (string) ($submission['qualifier'] ?? '');
                $state['predictions'][$predictionIdx]['updatedAt'] = nowIso();
                $state['predictions'][$predictionIdx]['approvedByAdmin'] = $admin['id'];
                $state['predictionSubmissions'][$index]['status'] = 'approved';
                $state['predictionSubmissions'][$index]['reviewedAt'] = nowIso();
                return $state;
            });
            sendJson(200, stateResponse($state, $db));
        }

        case 'reject-prediction-submission': {
            $state = $db->update(function (array $state) use ($payload, $db): array {
                requireAdmin($state, $db);
                $index = findIndexById($state['predictionSubmissions'], (string) ($payload['submissionId'] ?? ''));
                if ($index < 0) {
                    failRequest(404, 'Nincs ilyen tippmódosítás.');
                }
                $state['predictionSubmissions'][$index]['status'] = 'rejected';
                $state['predictionSubmissions'][$index]['reviewedAt'] = nowIso();
                return $state;
            });
            sendJson(200, stateResponse($state, $db));
        }

        case 'hide-missing-tip': {
            $state = $db->update(function (array $state) use ($payload, $db): array {
                requireAdmin($state, $db);
                $key = (string) ($payload['key'] ?? '');
                if ($key !== '' && !in_array($key, $state['hiddenMissingTips'], true)) {
                    $state['hiddenMissingTips'][] = $key;
                }
                return $state;
            });
            sendJson(200, stateResponse($state, $db));
        }

        case 'save-admin-prediction': {
            $state = $db->update(function (array $state) use ($payload, $db): array {
                $admin = requireAdmin($state, $db);
                $userId = (string) ($payload['userId'] ?? '');
                $matchId = (string) ($payload['matchId'] ?? '');
                $userIdx = findIndexById($state['users'], $userId);
                $matchIdx = matchIndex($state, $matchId);
                if ($userIdx < 0 || $matchIdx < 0 || $db->isSystemAdminUser($state['users'][$userIdx])) {
                    failRequest(404, 'Nincs ilyen játékos vagy meccs.');
                }
                $homeGoals = scoreValue($payload['homeGoals'] ?? null, 'Hazai');
                $awayGoals = scoreValue($payload['awayGoals'] ?? null, 'Vendég');
                $qualifier = validQualifier($state['matches'][$matchIdx], $homeGoals, $awayGoals, trim((string) ($payload['qualifier'] ?? '')));
                $predictionIdx = predictionIndex($state, $userId, $matchId);
                if ($predictionIdx < 0) {
                    $state['predictions'][] = [
                        'id' => createId('prediction'),
                        'userId' => $userId,
                        'matchId' => $matchId,
                        'createdAt' => nowIso(),
                    ];
                    $predictionIdx = count($state['predictions']) - 1;
                }
                $state['predictions'][$predictionIdx]['homeGoals'] = $homeGoals;
                $state['predictions'][$predictionIdx]['awayGoals'] = $awayGoals;
                $state['predictions'][$predictionIdx]['qualifier'] = $qualifier;
                $state['predictions'][$predictionIdx]['updatedAt'] = nowIso();
                $state['predictions'][$predictionIdx]['enteredByAdmin'] = $admin['id'];
                $state['hiddenMissingTips'] = array_values(array_filter(
                    $state['hiddenMissingTips'],
                    fn ($key): bool => $key !== missingTipKey($userId, $matchId)
                ));
                return $state;
            });
            sendJson(200, stateResponse($state, $db));
        }

        case 'add-match': {
            $state = $db->update(function (array $state) use ($payload, $db): array {
                requireAdmin($state, $db);
                $home = trim((string) ($payload['home'] ?? ''));
                $away = trim((string) ($payload['away'] ?? ''));
                $label = trim((string) ($payload['label'] ?? '')) ?: 'Meccs';
                if ($home === '' || $away === '') {
                    failRequest(400, 'Hazai és vendég csapat is kell.');
                }
                $state['matches'][] = [
                    'id' => createId('manual'),
                    'home' => $home,
                    'away' => $away,
                    'kickoff' => isoDateValue($payload['kickoff'] ?? ''),
                    'label' => $label,
                    'group' => trim((string) ($payload['group'] ?? '')),
                    'stage' => stageForLabel($label),
                ];
                return $state;
            });
            sendJson(200, stateResponse($state, $db));
        }

        case 'save-match': {
            $state = $db->update(function (array $state) use ($payload, $db): array {
                requireAdmin($state, $db);
                $matchId = (string) ($payload['matchId'] ?? '');
                $index = matchIndex($state, $matchId);
                if ($index < 0) {
                    failRequest(404, 'Nincs ilyen meccs.');
                }
                $home = trim((string) ($payload['home'] ?? ''));
                $away = trim((string) ($payload['away'] ?? ''));
                $label = trim((string) ($payload['label'] ?? '')) ?: 'Meccs';
                if ($home === '' || $away === '') {
                    failRequest(400, 'Hazai és vendég csapat is kell.');
                }
                $state['matches'][$index]['home'] = $home;
                $state['matches'][$index]['away'] = $away;
                $state['matches'][$index]['kickoff'] = isoDateValue($payload['kickoff'] ?? '');
                $state['matches'][$index]['label'] = $label;
                $state['matches'][$index]['group'] = trim((string) ($payload['group'] ?? ''));
                $state['matches'][$index]['stage'] = stageForLabel($label);
                return $state;
            });
            sendJson(200, stateResponse($state, $db));
        }

        case 'set-admin-role': {
            $state = $db->update(function (array $state) use ($payload, $db): array {
                $admin = requireAdmin($state, $db);
                $userId = (string) ($payload['userId'] ?? '');
                $index = findIndexById($state['users'], $userId);
                if ($index < 0 || $db->isSystemAdminUser($state['users'][$index])) {
                    failRequest(404, 'Nincs ilyen felhasználó.');
                }
                $isAdmin = !empty($payload['isAdmin']);
                if ($userId === $admin['id'] && !$isAdmin) {
                    failRequest(403, 'Saját magadtól nem veheted el az admin jogot.');
                }
                $state['users'][$index]['isAdmin'] = $isAdmin;
                return $state;
            });
            sendJson(200, stateResponse($state, $db));
        }

        case 'delete-user': {
            $state = $db->update(function (array $state) use ($payload, $db): array {
                $admin = requireAdmin($state, $db);
                $userId = (string) ($payload['userId'] ?? '');
                $index = findIndexById($state['users'], $userId);
                if ($index < 0) {
                    failRequest(404, 'Nincs ilyen felhasználó.');
                }
                if ($userId === $admin['id'] || $db->isSystemAdminUser($state['users'][$index])) {
                    failRequest(403, 'Ezt a felhasználót nem törölheted.');
                }
                removeUserData($state, $userId);
                return $state;
            });
            sendJson(200, stateResponse($state, $db));
        }

        default:
            failRequest(404, 'Ismeretlen API művelet.');
    }
} catch (ApiError $error) {
    sendJson($error->status(), ['ok' => false, 'error' => $error->getMessage()]);
} catch (Throwable $error) {
    sendJson(500, ['ok' => false, 'error' => $error->getMessage()]);
}
