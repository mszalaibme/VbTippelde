<?php
declare(strict_types=1);

final class DbHandler
{
    private string $stateFile;
    private string $adminConfigFile;
    private string $knockoutConfigFile;

    private array $emptyState = [
        'users' => [],
        'matches' => [],
        'predictions' => [],
        'resultSubmissions' => [],
        'predictionSubmissions' => [],
        'passwordResetRequests' => [],
        'hiddenMissingTips' => [],
        'teamAssignments' => [],
        'approvedResults' => [],
    ];

    private array $teamCompetitionTeams = [
        ['id' => 'team-a', 'name' => 'A csapat', 'color' => '#2f855a', 'soft' => '#e4f4ea'],
        ['id' => 'team-b', 'name' => 'B csapat', 'color' => '#c26a22', 'soft' => '#fff0dc'],
        ['id' => 'team-c', 'name' => 'C csapat', 'color' => '#6b46c1', 'soft' => '#f0eaff'],
    ];

    private array $defaultAdminConfig = [
        'passwordIterations' => 150000,
        'systemAdmin' => [
            'id' => '__system_admin__',
            'name' => 'admin',
            'passwordSalt' => 'NpmIyFI9JOoFRBlwK8uJ1A==',
            'passwordHash' => 'erOma9EQJKks86WBDWq3Xxum2v+QogUVkLtghUHqr7w=',
            'passwordVersion' => 2,
            'passwordIterations' => 150000,
        ],
    ];

    private array $defaultKnockoutConfig = [
        [
            'title' => '32-es kör',
            'matches' => [
                ['no' => 73, 'home' => 'A csoport 2.', 'away' => 'B csoport 2.'],
                ['no' => 74, 'home' => 'E csoport 1.', 'away' => 'A/B/C/D/F csoport 3.'],
                ['no' => 75, 'home' => 'F csoport 1.', 'away' => 'C csoport 2.'],
                ['no' => 76, 'home' => 'C csoport 1.', 'away' => 'F csoport 2.'],
                ['no' => 77, 'home' => 'I csoport 1.', 'away' => 'C/D/F/G/H csoport 3.'],
                ['no' => 78, 'home' => 'E csoport 2.', 'away' => 'I csoport 2.'],
                ['no' => 79, 'home' => 'A csoport 1.', 'away' => 'C/E/F/H/I csoport 3.'],
                ['no' => 80, 'home' => 'L csoport 1.', 'away' => 'E/H/I/J/K csoport 3.'],
                ['no' => 81, 'home' => 'D csoport 1.', 'away' => 'B/E/F/I/J csoport 3.'],
                ['no' => 82, 'home' => 'G csoport 1.', 'away' => 'A/E/H/I/J csoport 3.'],
                ['no' => 83, 'home' => 'K csoport 2.', 'away' => 'L csoport 2.'],
                ['no' => 84, 'home' => 'H csoport 1.', 'away' => 'J csoport 2.'],
                ['no' => 85, 'home' => 'B csoport 1.', 'away' => 'E/F/G/I/J csoport 3.'],
                ['no' => 86, 'home' => 'J csoport 1.', 'away' => 'H csoport 2.'],
                ['no' => 87, 'home' => 'K csoport 1.', 'away' => 'D/E/I/J/L csoport 3.'],
                ['no' => 88, 'home' => 'D csoport 2.', 'away' => 'G csoport 2.'],
            ],
        ],
        [
            'title' => 'Nyolcaddöntő',
            'matches' => [
                ['no' => 89, 'home' => '73. meccs győztese', 'away' => '75. meccs győztese'],
                ['no' => 90, 'home' => '74. meccs győztese', 'away' => '77. meccs győztese'],
                ['no' => 91, 'home' => '76. meccs győztese', 'away' => '78. meccs győztese'],
                ['no' => 92, 'home' => '79. meccs győztese', 'away' => '80. meccs győztese'],
                ['no' => 93, 'home' => '83. meccs győztese', 'away' => '84. meccs győztese'],
                ['no' => 94, 'home' => '81. meccs győztese', 'away' => '82. meccs győztese'],
                ['no' => 95, 'home' => '86. meccs győztese', 'away' => '88. meccs győztese'],
                ['no' => 96, 'home' => '85. meccs győztese', 'away' => '87. meccs győztese'],
            ],
        ],
        [
            'title' => 'Negyeddöntő',
            'matches' => [
                ['no' => 97, 'home' => '89. meccs győztese', 'away' => '90. meccs győztese'],
                ['no' => 98, 'home' => '93. meccs győztese', 'away' => '94. meccs győztese'],
                ['no' => 99, 'home' => '91. meccs győztese', 'away' => '92. meccs győztese'],
                ['no' => 100, 'home' => '95. meccs győztese', 'away' => '96. meccs győztese'],
            ],
        ],
        [
            'title' => 'Elődöntő',
            'matches' => [
                ['no' => 101, 'home' => '97. meccs győztese', 'away' => '98. meccs győztese'],
                ['no' => 102, 'home' => '99. meccs győztese', 'away' => '100. meccs győztese'],
            ],
        ],
        [
            'title' => 'Döntők',
            'matches' => [
                ['no' => 103, 'home' => '101. meccs vesztese', 'away' => '102. meccs vesztese', 'note' => 'Bronzmeccs'],
                ['no' => 104, 'home' => '101. meccs győztese', 'away' => '102. meccs győztese', 'note' => 'Döntő'],
            ],
        ],
    ];

    public function __construct(?string $stateFile = null)
    {
        $dataDir = dirname(__DIR__) . '/data';
        $this->stateFile = $stateFile ?: $dataDir . '/state.json';
        $this->adminConfigFile = $dataDir . '/admin-config.json';
        $this->knockoutConfigFile = $dataDir . '/knockout-config.json';
        $this->ensureStateFile();
        $this->ensureConfigFiles();
    }

    public function read(): array
    {
        $handle = fopen($this->stateFile, 'c+');
        if (!$handle) {
            throw new RuntimeException('Nem lehet megnyitni az adatfájlt.');
        }

        flock($handle, LOCK_SH);
        $state = $this->readFromHandle($handle);
        flock($handle, LOCK_UN);
        fclose($handle);

        return $this->withSystemAdmin($this->normalizeState($state));
    }

    public function readStored(): array
    {
        $state = $this->read();
        return $this->sanitizeForStorage($state);
    }

    public function update(callable $callback): array
    {
        $handle = fopen($this->stateFile, 'c+');
        if (!$handle) {
            throw new RuntimeException('Nem lehet megnyitni az adatfájlt.');
        }

        flock($handle, LOCK_EX);
        $state = $this->withSystemAdmin($this->normalizeState($this->readFromHandle($handle)));
        $nextState = $callback($state);
        if (is_array($nextState)) {
            $state = $nextState;
        }

        $storedState = $this->sanitizeForStorage($state);
        rewind($handle);
        ftruncate($handle, 0);
        fwrite($handle, json_encode($storedState, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . PHP_EOL);
        fflush($handle);
        flock($handle, LOCK_UN);
        fclose($handle);

        return $this->withSystemAdmin($this->normalizeState($storedState));
    }

    public function sanitizeForStorage(array $state): array
    {
        $safeState = $this->normalizeState($state);
        $safeState['users'] = array_values(array_map(
            function (array $user): array {
                unset($user['password']);
                return $user;
            },
            array_filter($safeState['users'], fn ($user): bool => !$this->isSystemAdminUser($user))
        ));

        return $safeState;
    }

    public function systemAdminUser(): array
    {
        $admin = $this->systemAdminConfig();
        return [
            'id' => $admin['id'],
            'name' => $admin['name'],
            'isAdmin' => true,
            'isSystemAdmin' => true,
            'mustChangePassword' => false,
            'createdAt' => 'system',
        ];
    }

    public function isSystemAdminUser(?array $user): bool
    {
        if (!$user) {
            return false;
        }

        $name = (string) ($user['name'] ?? '');
        $name = function_exists('mb_strtolower') ? mb_strtolower($name, 'UTF-8') : strtolower($name);
        $admin = $this->systemAdminConfig();

        return !empty($user['isSystemAdmin'])
            || (($user['id'] ?? '') === $admin['id'])
            || ($name === $this->lowerText((string) $admin['name']));
    }

    public function hashPassword(string $password, ?string $saltValue = null): array
    {
        $salt = $saltValue ? base64_decode($saltValue, true) : random_bytes(16);
        if ($salt === false) {
            $salt = random_bytes(16);
        }

        $iterations = $this->passwordIterations();
        $hash = hash_pbkdf2('sha256', $password, $salt, $iterations, 32, true);

        return [
            'passwordSalt' => base64_encode($salt),
            'passwordHash' => base64_encode($hash),
            'passwordVersion' => 2,
            'passwordIterations' => $iterations,
        ];
    }

    public function setPassword(array &$user, string $password): void
    {
        $user = array_merge($user, $this->hashPassword($password));
        unset($user['password']);
    }

    public function verifyPassword(?array $user, string $password): bool
    {
        if (!$user) {
            return false;
        }

        if ($this->isSystemAdminUser($user)) {
            $admin = $this->systemAdminConfig();
            if (!empty($admin['passwordHash']) && !empty($admin['passwordSalt'])) {
                $candidate = $this->hashPassword($password, (string) $admin['passwordSalt'])['passwordHash'];
                return hash_equals((string) $admin['passwordHash'], $candidate);
            }
            if (!empty($admin['password'])) {
                return hash_equals((string) $admin['password'], $password);
            }
            return false;
        }

        if (empty($user['passwordHash']) || empty($user['passwordSalt'])) {
            return false;
        }

        $candidate = $this->hashPassword($password, (string) $user['passwordSalt'])['passwordHash'];
        return hash_equals((string) $user['passwordHash'], $candidate);
    }

    public function publicUser(array $user): array
    {
        unset($user['password']);
        unset($user['passwordSalt']);
        unset($user['passwordHash']);
        unset($user['passwordVersion']);
        unset($user['passwordIterations']);
        return $user;
    }

    public function publicState(array $state): array
    {
        $publicState = $this->withSystemAdmin($this->normalizeState($state));
        $publicState['users'] = array_values(array_map([$this, 'publicUser'], $publicState['users']));

        return $publicState;
    }

    public function publicConfig(): array
    {
        $admin = $this->systemAdminConfig();
        return [
            'admin' => [
                'passwordIterations' => $this->passwordIterations(),
                'systemAdmin' => [
                    'id' => $admin['id'],
                    'name' => $admin['name'],
                ],
            ],
            'knockoutBracket' => $this->knockoutConfig(),
            'teamCompetitionTeams' => $this->teamCompetitionTeams,
        ];
    }

    private function ensureStateFile(): void
    {
        $dir = dirname($this->stateFile);
        if (!is_dir($dir)) {
            mkdir($dir, 0775, true);
        }

        if (!file_exists($this->stateFile)) {
            file_put_contents(
                $this->stateFile,
                json_encode($this->emptyState, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . PHP_EOL
            );
        }
    }

    private function ensureConfigFiles(): void
    {
        $this->ensureJsonFile($this->adminConfigFile, $this->defaultAdminConfig);
        $this->ensureJsonFile($this->knockoutConfigFile, $this->defaultKnockoutConfig);
    }

    private function ensureJsonFile(string $path, array $default): void
    {
        if (!file_exists($path)) {
            file_put_contents($path, json_encode($default, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . PHP_EOL);
        }
    }

    private function readFromHandle($handle): array
    {
        rewind($handle);
        $json = stream_get_contents($handle) ?: '';
        if (trim($json) === '') {
            return $this->emptyState;
        }

        $decoded = json_decode($json, true);
        if (!is_array($decoded)) {
            throw new RuntimeException('A state.json nem érvényes JSON.');
        }

        return $decoded;
    }

    private function normalizeState(array $state): array
    {
        $normalized = array_merge($this->emptyState, $state);
        foreach ($this->emptyState as $key => $default) {
            if (!isset($normalized[$key]) || !is_array($normalized[$key])) {
                $normalized[$key] = $default;
            }
        }

        $normalized['users'] = array_values(array_map([$this, 'normalizeUser'], $normalized['users']));
        $normalized['matches'] = array_values(array_map(
            fn ($match): array => array_merge(['group' => ''], is_array($match) ? $match : []),
            $normalized['matches']
        ));
        $normalized['teamAssignments'] = $this->normalizeTeamAssignments($normalized['teamAssignments'], $normalized['users']);

        return $normalized;
    }

    private function normalizeTeamAssignments(array $assignments, array $users): array
    {
        $validTeamIds = array_column($this->teamCompetitionTeams, 'id');
        $validUserIds = array_map(
            fn (array $user): string => (string) ($user['id'] ?? ''),
            array_filter($users, fn (array $user): bool => !$this->isSystemAdminUser($user))
        );
        $validUserSet = array_fill_keys(array_filter($validUserIds), true);
        $validTeamSet = array_fill_keys($validTeamIds, true);
        $normalized = [];

        foreach ($assignments as $userId => $teamId) {
            $userId = (string) $userId;
            $teamId = (string) $teamId;
            if ($userId === '' || $teamId === '' || !isset($validTeamSet[$teamId])) {
                continue;
            }
            if (!isset($validUserSet[$userId])) {
                continue;
            }
            $normalized[$userId] = $teamId;
        }

        return $normalized;
    }

    private function normalizeUser($user): array
    {
        $normalized = is_array($user) ? $user : [];
        unset($normalized['password']);

        return array_merge([
            'passwordSalt' => '',
            'passwordHash' => '',
            'passwordVersion' => 2,
            'passwordIterations' => $this->passwordIterations(),
            'isAdmin' => false,
            'isSystemAdmin' => false,
            'mustChangePassword' => false,
        ], $normalized);
    }

    private function withSystemAdmin(array $state): array
    {
        $state['users'] = array_values(array_filter(
            $state['users'] ?? [],
            fn ($user): bool => !$this->isSystemAdminUser($user)
        ));
        array_unshift($state['users'], $this->systemAdminUser());

        return $state;
    }

    private function passwordIterations(): int
    {
        return max(1, (int) ($this->adminConfig()['passwordIterations'] ?? $this->defaultAdminConfig['passwordIterations']));
    }

    private function systemAdminConfig(): array
    {
        $config = $this->adminConfig();
        $admin = is_array($config['systemAdmin'] ?? null) ? $config['systemAdmin'] : [];
        $merged = array_merge($this->defaultAdminConfig['systemAdmin'], $admin);
        $merged['passwordIterations'] = max(1, (int) ($merged['passwordIterations'] ?? $config['passwordIterations'] ?? $this->defaultAdminConfig['passwordIterations']));
        return $merged;
    }

    private function adminConfig(): array
    {
        $config = $this->readJsonFile($this->adminConfigFile, $this->defaultAdminConfig);
        $systemAdmin = is_array($config['systemAdmin'] ?? null) ? $config['systemAdmin'] : [];
        return [
            'passwordIterations' => max(1, (int) ($config['passwordIterations'] ?? $this->defaultAdminConfig['passwordIterations'])),
            'systemAdmin' => array_merge($this->defaultAdminConfig['systemAdmin'], $systemAdmin),
        ];
    }

    private function knockoutConfig(): array
    {
        $config = $this->readJsonFile($this->knockoutConfigFile, $this->defaultKnockoutConfig);
        return is_array($config) ? $config : $this->defaultKnockoutConfig;
    }

    private function readJsonFile(string $path, array $default): array
    {
        $json = @file_get_contents($path);
        if ($json === false || trim($json) === '') {
            return $default;
        }

        $decoded = json_decode($json, true);
        return is_array($decoded) ? $decoded : $default;
    }

    private function lowerText(string $value): string
    {
        return function_exists('mb_strtolower') ? mb_strtolower($value, 'UTF-8') : strtolower($value);
    }
}
