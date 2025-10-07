<?php
require __DIR__ . '/../vendor/autoload.php';
use Kreait\Firebase\Factory;

$factory = (new Factory)->withServiceAccount(__DIR__ . '/../firebase_credentials.json');
$firestore = $factory->createFirestore()->database();

$name = $_POST['name'];
$email = $_POST['email'];

$firestore->collection('users')->add([
    'name' => $name,
    'email' => $email
]);

echo "User saved to Firebase!";
?>
