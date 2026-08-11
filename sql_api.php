<?php
// Set response headers to return JSON
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *"); // Restrict this in production!
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type");

// 1. Include the secure database connection
require_once '/home/icmriorg/secure/db_connection.php';

// 2. Only allow POST requests for security/data handling
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["error" => "Method Not Allowed. Use POST."]);
    exit;
}

// 3. Get the raw POST payload (handles both JSON and standard POST data)
$input = json_decode(file_get_contents('php://input'), true);
$query = isset($input['query']) ? $input['query'] : (isset($_POST['query']) ? $_POST['query'] : null);

if (empty($query)) {
    http_response_code(400);
    echo json_encode(["error" => "Bad Request. 'query' parameter is required."]);
    exit;
}

// 4. Execute the raw query
$result = $conn->query($query);

// 5. Handle the response based on query type
if ($result === false) {
    // Query failed
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "error" => $conn->error
    ]);
} elseif ($result === true) {
    // INSERT, UPDATE, DELETE, etc. executed successfully
    echo json_encode([
        "success" => true,
        "affected_rows" => $conn->affected_rows,
        "insert_id" => $conn->insert_id
    ]);
} else {
    // SELECT, SHOW, DESCRIBE executed successfully and returned rows
    $data = [];
    while ($row = $result->fetch_assoc()) {
        $data[] = $row;
    }
    
    echo json_encode([
        "success" => true,
        "row_count" => $result->num_rows,
        "data" => $data
    ]);
    
    // Free the result set
    $result->free();
}

// Close connection
$conn->close();
?>