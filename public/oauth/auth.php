<?php
require_once 'config.php';

// Generate a random state for security
session_start();
$state = bin2hex(random_bytes(16));
$_SESSION['oauth_state'] = $state;

// Build the authorization URL
$params = [
    'client_id' => Config::$clientId,
    'redirect_uri' => Config::$redirectUri,
    'scope' => 'repo,user', // Permissions needed for Decap CMS
    'state' => $state
];

$url = 'https://github.com/login/oauth/authorize?' . http_build_query($params);

// Redirect the user to GitHub
header('Location: ' . $url);
exit;
