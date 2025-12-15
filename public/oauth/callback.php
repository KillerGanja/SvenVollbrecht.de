<?php
require_once 'config.php';

session_start();

// Verify state to prevent CSRF
if (!isset($_GET['state']) || !isset($_SESSION['oauth_state']) || $_GET['state'] !== $_SESSION['oauth_state']) {
    die('Invalid state');
}

if (!isset($_GET['code'])) {
    die('Authorization code missing');
}

$code = $_GET['code'];

// Exchange code for access token
$ch = curl_init('https://github.com/login/oauth/access_token');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, [
    'client_id' => Config::$clientId,
    'client_secret' => Config::$clientSecret,
    'code' => $code,
    'redirect_uri' => Config::$redirectUri
]);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Accept: application/json'
]);

$response = curl_exec($ch);
curl_close($ch);

$data = json_decode($response, true);

if (isset($data['access_token'])) {
    $token = $data['access_token'];
    
    // Output the script that posts the message back to the CMS window
    ?>
    <!doctype html>
    <html>
    <body>
    <script>
      const receiveMessage = (message) => {
        window.opener.postMessage(
          'authorization:github:success:{"token":"<?php echo $token; ?>","provider":"github"}',
          message.origin
        );
        window.close();
      };
      (function() {
        window.addEventListener("message", receiveMessage, false);
        window.opener.postMessage("authorizing:github", "*");
      })();
    </script>
    </body>
    </html>
    <?php
} else {
    echo 'Error retrieving token: ' . htmlspecialchars(print_r($data, true));
}
