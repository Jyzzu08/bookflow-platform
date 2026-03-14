<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, auth-token');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$host = getenv('MYSQL_HOST') ?: 'mysql';
$db = getenv('MYSQL_DATABASE') ?: 'bookflow_catalog';
$user = getenv('MYSQL_USER') ?: 'bookflow';
$pass = getenv('MYSQL_PASSWORD') ?: 'bookflow';

function json_response($status, $body) {
    http_response_code($status);
    echo json_encode($body);
    exit;
}

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8mb4", $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);

    $pdo->exec("CREATE TABLE IF NOT EXISTS books (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      cover VARCHAR(255) NOT NULL,
      id_user VARCHAR(64) NOT NULL
    )");

    $countStmt = $pdo->query("SELECT COUNT(*) as count FROM books");
    $count = (int)$countStmt->fetch()['count'];
    if ($count === 0) {
        $seed = $pdo->prepare("INSERT INTO books (title, cover, id_user) VALUES (?, ?, ?)");
        $seed->execute(['Docker Deep Dive', 'docker.jpg', 'demo-user']);
        $seed->execute(['Distributed Systems 101', 'distributed.jpg', 'demo-user']);
        $seed->execute(['Zero Trust Networks', 'zero-trust.jpg', 'admin-seed']);
    }
} catch (Throwable $e) {
    json_response(500, ['error' => 'catalog_db_error', 'message' => $e->getMessage()]);
}

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'];
$segments = array_values(array_filter(explode('/', $uri)));

if ($uri === '/health') {
    json_response(200, ['service' => 'catalog', 'status' => 'ok']);
}

if (count($segments) >= 4 && $segments[0] === 'v1' && $segments[1] === 'get_all') {
    $id_user = $segments[2];
    $stmt = $pdo->prepare("SELECT id, title, cover, id_user FROM books WHERE id_user = ?");
    $stmt->execute([$id_user]);
    json_response(200, $stmt->fetchAll());
}

if (count($segments) >= 4 && $segments[0] === 'v1' && $segments[1] === 'get') {
    $id = (int)$segments[2];
    $stmt = $pdo->prepare("SELECT id, title, cover, id_user FROM books WHERE id = ? LIMIT 1");
    $stmt->execute([$id]);
    $book = $stmt->fetch();
    if (!$book) {
        json_response(404, ['error' => 'book_not_found']);
    }
    json_response(200, $book);
}

if ($uri === '/v2/catalog/books' && $method === 'GET') {
    $stmt = $pdo->query("SELECT id, title, cover, id_user FROM books ORDER BY id DESC");
    json_response(200, ['items' => $stmt->fetchAll()]);
}

if ($uri === '/v2/catalog/books' && $method === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true);
    if (!isset($body['title']) || !isset($body['cover']) || !isset($body['idUser'])) {
        json_response(400, ['error' => 'invalid_payload']);
    }

    $stmt = $pdo->prepare("INSERT INTO books (title, cover, id_user) VALUES (?, ?, ?)");
    $stmt->execute([$body['title'], $body['cover'], $body['idUser']]);

    json_response(201, [
        'id' => (int)$pdo->lastInsertId(),
        'title' => $body['title'],
        'cover' => $body['cover'],
        'id_user' => $body['idUser']
    ]);
}

json_response(404, ['error' => 'route_not_found', 'path' => $uri]);
