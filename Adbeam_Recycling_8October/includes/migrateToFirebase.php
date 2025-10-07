<?php
require __DIR__ . '/../vendor/autoload.php';
require 'config.php';

use Kreait\Firebase\Factory;

// Connect to Firestore
$factory = (new Factory)->withServiceAccount(__DIR__ . '/../firebase_credentials.json');
$firestore = $factory->createFirestore()->database();

// Get MySQL data
$result = $conn->query("SELECT * FROM users");

while ($row = $result->fetch_assoc()) {
    $firestore->collection('users')->add($row);
}

echo "Migration from MySQL to Firestore complete!";
?>
