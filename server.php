<?php
declare(strict_types=1);

/**
 * Universal File & Directory API (PHP 7.4+ Compatible)
 * * Usage:
 * List directory (JSON): /api.php?path=.
 * View/Download file:   /api.php?path=./path/to/file.png
 * Edit/Write file:      /api.php?path=./path/to/file.txt (Method: POST, Body: content=new_text)
 */

ini_set('display_errors', '0'); 
error_reporting(E_ALL);
set_time_limit(0);

function getSafeMimeType(string $path): string 
{
    if (function_exists('mime_content_type')) {
        $mime = @mime_content_type($path);
        if ($mime !== false) {
            return $mime;
        }
    }
    
    $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
    $map = [
        'txt'  => 'text/plain',
        'html' => 'text/html',
        'css'  => 'text/css',
        'js'   => 'application/javascript',
        'json' => 'application/json',
        'xml'  => 'application/xml',
        'jpg'  => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'png'  => 'image/png',
        'gif'  => 'image/gif',
        'svg'  => 'image/svg+xml',
        'mp4'  => 'video/mp4',
        'webm' => 'video/webm',
        'mp3'  => 'audio/mpeg',
        'pdf'  => 'application/pdf',
        'zip'  => 'application/zip'
    ];
    
    return $map[$ext] ?? 'application/octet-stream';
}

function searchDirectoryRecursive(string $basePath, string $query): array {
    $result = [];
    $skipNames = ['.', '..', '.git', 'node_modules', 'vendor', '.well-known'];
    
    try {
        $dirIterator = new RecursiveDirectoryIterator($basePath, RecursiveDirectoryIterator::SKIP_DOTS);
        $iterator = new RecursiveIteratorIterator($dirIterator, RecursiveIteratorIterator::SELF_FIRST);
        
        $maxResults = 500;
        $count = 0;
        
        foreach ($iterator as $item) {
            if ($count >= $maxResults) {
                break;
            }
            
            $name = $item->getFilename();
            $pathName = $item->getPathname();
            
            // Skip common hidden folders and excluded directory trees
            $shouldSkip = false;
            
            // Fast check for dot files/folders inside path (except the search query itself if it has dot)
            $parts = explode(DIRECTORY_SEPARATOR, $pathName);
            foreach ($parts as $part) {
                if (in_array($part, $skipNames, true)) {
                    $shouldSkip = true;
                    break;
                }
                // Check if any parent folder is a hidden folder
                if (strpos($part, '.') === 0 && $part !== '.' && $part !== '..' && $part !== $name) {
                    $shouldSkip = true;
                    break;
                }
            }
            
            if ($shouldSkip) {
                continue;
            }
            
            if (stripos($name, $query) !== false) {
                $fullPath = $item->getPathname();
                $isDir = $item->isDir();
                $mtime = $item->getMTime();
                $perms = $item->getPerms();
                
                // Construct relative path for client
                $relative = str_replace($basePath, '', $fullPath);
                $relative = str_replace(DIRECTORY_SEPARATOR, '/', $relative);
                $relative = ltrim($relative, '/');
                
                $relative_path = rtrim($_GET['path'] ?? '', '/') . '/' . $relative;
                
                $fileInfo = [
                    'name'          => $name,
                    'type'          => $isDir ? 'directory' : 'file',
                    'relative_path' => $relative_path,
                    'is_hidden'     => (strpos($name, '.') === 0),
                    'permissions'   => $perms ? substr(sprintf('%o', $perms), -4) : '0000',
                    'timestamps'    => [
                        'modified_at' => $mtime ? date('Y-m-d H:i:s', $mtime) : null,
                        'created_at'  => null,
                        'accessed_at' => null,
                    ]
                ];
                
                if (!$isDir) {
                    $fileInfo['size_bytes'] = $item->getSize();
                    $fileInfo['mime_type']  = getSafeMimeType($fullPath);
                }
                
                $result[] = $fileInfo;
                $count++;
            }
        }
    } catch (Exception $e) {
        // Silent catch
    }
    
    return $result;
}

$pathParam = $_GET['path'] ?? __DIR__;
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// 1. Handle File Creation / Editing (POST)
if ($method === 'POST') {
    header('Content-Type: application/json; charset=utf-8');
    
    // Resolve the real path if the file already exists, or resolve parent dir if creating new file
    $realPath = realpath($pathParam);
    if (!$realPath) {
        // Fallback: Check if the parent directory exists so we can create a new file
        $parentDir = realpath(dirname($pathParam));
        if ($parentDir && is_dir($parentDir)) {
            $realPath = $parentDir . DIRECTORY_SEPARATOR . basename($pathParam);
        }
    }

    if (!$realPath || is_dir($realPath)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid target path. Cannot write to a directory root directly.']);
        exit;
    }

    // Capture the edit content from raw input (supports standard form-urlencoded or raw payloads)
    $content = $_POST['content'] ?? file_get_contents('php://input');

    // Attempt to write/edit the file securely
    $bytesWritten = @file_put_contents($realPath, $content);

    if ($bytesWritten === false) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to write to file. Check permissions.']);
    } else {
        echo json_encode([
            'success' => true,
            'message' => 'File saved successfully.',
            'path' => $realPath,
            'bytes_written' => $bytesWritten
        ]);
    }
    exit;
}

// 2. Resolve Path for GET operations
$realPath = realpath($pathParam);

// Path Validation
if (!$realPath || !file_exists($realPath)) {
    http_response_code(404);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'Path not found.']);
    exit;
}

// 3. Handle Search (Recursive)
$searchQuery = $_GET['search'] ?? null;
if ($searchQuery !== null && $searchQuery !== '') {
    header('Content-Type: application/json; charset=utf-8');
    $contents = searchDirectoryRecursive($realPath, $searchQuery);
    echo json_encode([
        'current_directory' => $realPath,
        'contents' => $contents
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit;
}

// 4. Handle File Output (Text, Media, Documents)
if (is_file($realPath)) {
    $mimeType = getSafeMimeType($realPath);
    
    // PHP 7.4 alternative to str_starts_with
    $isText = (strpos($mimeType, 'text/') === 0) || in_array($mimeType, [
        'application/json', 
        'application/javascript', 
        'application/xml'
    ], true);

    if ($isText) {
        header('Content-Type: text/plain; charset=utf-8');
        @readfile($realPath);
    } else {
        header('Content-Type: ' . $mimeType);
        header('Content-Length: ' . (@filesize($realPath) ?: 0));
        
        // PHP 7.4 alternative to str_starts_with
        $isMediaOrPdf = (strpos($mimeType, 'image/') === 0) || (strpos($mimeType, 'video/') === 0) || ($mimeType === 'application/pdf');
        $disposition = $isMediaOrPdf ? 'inline' : 'attachment';
            
        header(sprintf('%s; filename="%s"', $disposition, basename($realPath)));
        
        while (ob_get_level()) ob_end_clean();
        @readfile($realPath);
    }
    exit;
}

// 5. Handle Directory Listing (JSON with Timestamps & Info)
if (is_dir($realPath)) {
    header('Content-Type: application/json; charset=utf-8');

    $skipNames = ['.', '..', '.git', 'node_modules', 'vendor', '.well-known'];
    $items = @scandir($realPath);

    if ($items === false) {
        http_response_code(403);
        echo json_encode(['error' => 'Directory unreadable.']);
        exit;
    }

    $result = [
        'current_directory' => $realPath,
        'contents' => []
    ];

    foreach ($items as $item) {
        if (in_array($item, $skipNames, true)) {
            continue;
        }

        $fullPath = $realPath . DIRECTORY_SEPARATOR . $item;
        $isDir = @is_dir($fullPath);
        
        $mtime = @filemtime($fullPath) ?: 0;
        $ctime = @filectime($fullPath) ?: 0;
        $atime = @fileatime($fullPath) ?: 0;
        $perms = @fileperms($fullPath) ?: 0;

        $fileInfo = [
            'name'          => $item,
            'type'          => $isDir ? 'directory' : 'file',
            'relative_path' => $pathParam . '/' . $item,
            'is_hidden'     => (strpos($item, '.') === 0), // PHP 7.4 alternative
            'permissions'   => $perms ? substr(sprintf('%o', $perms), -4) : '0000',
            'timestamps'    => [
                'modified_at' => $mtime ? date('Y-m-d H:i:s', $mtime) : null,
                'created_at'  => $ctime ? date('Y-m-d H:i:s', $ctime) : null,
                'accessed_at' => $atime ? date('Y-m-d H:i:s', $atime) : null,
            ]
        ];

        if (!$isDir) {
            $fileInfo['size_bytes'] = @filesize($fullPath) ?: 0;
            $fileInfo['mime_type']  = getSafeMimeType($fullPath);
        }

        $result['contents'][] = $fileInfo;
    }

    echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit;
}

