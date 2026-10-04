<?php
/**
 * DREAMSHARE site relay. Optional — the plugin works locally without it.
 * Drop this next to index.html on any PHP host. Creates dreamshare-data/.
 */
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');
header('Cache-Control: no-store');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

$dir = __DIR__ . '/dreamshare-data';
$feedFile = $dir . '/feed.json';
$wavDir = $dir . '/wav';
if (!is_dir($dir)) @mkdir($dir, 0755, true);
if (!is_dir($wavDir)) @mkdir($wavDir, 0755, true);
if (!is_file($dir . '/.htaccess')) {
  @file_put_contents($dir . '/.htaccess', "Options -Indexes\n<FilesMatch \"\\.(json|wav)$\">\n  Require all denied\n</FilesMatch>\n");
}

function feed_load($f) {
  if (!is_file($f)) return ['posts' => []];
  $j = json_decode(@file_get_contents($f), true);
  return is_array($j) && isset($j['posts']) ? $j : ['posts' => []];
}
function feed_save($f, $data) {
  $fp = fopen($f, 'c+');
  if (!$fp) return false;
  flock($fp, LOCK_EX);
  ftruncate($fp, 0);
  rewind($fp);
  fwrite($fp, json_encode($data));
  flock($fp, LOCK_UN);
  fclose($fp);
  return true;
}
function clean_user($u) {
  $u = preg_replace('/[^A-Za-z0-9_]/', '', (string)$u);
  if (strlen($u) < 3 || strlen($u) > 20) return '';
  if (!preg_match('/^[A-Za-z]/', $u)) return '';
  return $u;
}
function rate_ok($dir) {
  $ip = $_SERVER['REMOTE_ADDR'] ?? '0';
  $f = $dir . '/rate_' . hash('sha256', $ip) . '.txt';
  $now = time();
  $n = 0; $t = 0;
  if (is_file($f)) { $p = explode(' ', trim(@file_get_contents($f))); $t = (int)$p[0]; $n = (int)($p[1] ?? 0); }
  if ($now - $t > 60) { $t = $now; $n = 0; }
  $n++;
  @file_put_contents($f, $t . ' ' . $n);
  return $n <= 8;
}

$action = $_GET['action'] ?? $_POST['action'] ?? 'list';

if ($action === 'list') {
  header('Content-Type: application/json; charset=utf-8');
  $feed = feed_load($feedFile);
  $out = [];
  foreach ($feed['posts'] as $p) {
    $out[] = [
      'id' => $p['id'] ?? '',
      'user' => $p['user'] ?? '',
      'text' => $p['text'] ?? '',
      'at' => $p['at'] ?? 0,
      'hasAudio' => !empty($p['hasAudio']),
      'audioId' => $p['audioId'] ?? null
    ];
  }
  echo json_encode(['ok' => true, 'posts' => $out]);
  exit;
}

if ($action === 'stream') {
  $id = preg_replace('/[^A-Za-z0-9_\-]/', '', $_GET['id'] ?? '');
  $path = $wavDir . '/' . $id . '.wav';
  if (!$id || !is_file($path)) { http_response_code(404); exit; }
  header('Content-Type: audio/wav');
  header('Content-Disposition: inline; filename="listen.wav"');
  header('X-Content-Type-Options: nosniff');
  header('Content-Length: ' . filesize($path));
  readfile($path);
  exit;
}

if ($action === 'post' && $_SERVER['REQUEST_METHOD'] === 'POST') {
  header('Content-Type: application/json; charset=utf-8');
  if (!rate_ok($dir)) { http_response_code(429); echo json_encode(['ok'=>false,'error'=>'slow down']); exit; }
  $user = clean_user($_POST['user'] ?? '');
  $text = trim((string)($_POST['text'] ?? ''));
  $text = substr(strip_tags($text), 0, 280);
  if ($user === '') { http_response_code(400); echo json_encode(['ok'=>false,'error'=>'bad user']); exit; }
  if ($text === '' && empty($_FILES['wav']['tmp_name'])) { http_response_code(400); echo json_encode(['ok'=>false,'error'=>'empty']); exit; }
  if (preg_match('/<\s*script|javascript:|data:text/i', $text)) { http_response_code(400); echo json_encode(['ok'=>false,'error'=>'blocked']); exit; }

  $id = preg_replace('/[^A-Za-z0-9_]/', '', (string)($_POST['id'] ?? ('p'.time())));
  $audioId = null;
  $has = false;
  if (!empty($_FILES['wav']['tmp_name']) && is_uploaded_file($_FILES['wav']['tmp_name'])) {
    if ($_FILES['wav']['size'] > 3 * 1024 * 1024) { http_response_code(400); echo json_encode(['ok'=>false,'error'=>'too big']); exit; }
    $head = file_get_contents($_FILES['wav']['tmp_name'], false, null, 0, 12);
    if (substr($head, 0, 4) !== 'RIFF' || substr($head, 8, 4) !== 'WAVE') {
      http_response_code(400); echo json_encode(['ok'=>false,'error'=>'not wav']); exit;
    }
    $audioId = 'a' . $id;
    if (!move_uploaded_file($_FILES['wav']['tmp_name'], $wavDir . '/' . $audioId . '.wav')) {
      http_response_code(500); echo json_encode(['ok'=>false,'error'=>'store']); exit;
    }
    $has = true;
  }

  $feed = feed_load($feedFile);
  $feed['posts'][] = [
    'id' => $id,
    'user' => $user,
    'text' => $text,
    'at' => time() * 1000,
    'hasAudio' => $has,
    'audioId' => $audioId
  ];
  if (count($feed['posts']) > 200) $feed['posts'] = array_slice($feed['posts'], -200);
  feed_save($feedFile, $feed);
  echo json_encode(['ok' => true, 'id' => $id]);
  exit;
}

http_response_code(400);
header('Content-Type: application/json');
echo json_encode(['ok' => false]);
