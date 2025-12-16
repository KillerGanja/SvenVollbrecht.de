<?php

// GitHub OAuth Configuration
class Config {
    // Client ID from GitHub OAuth App
    public static $clientId = 'Ov23li72fesu19Ua7RDK';
    
    // Client Secret from GitHub OAuth App
    public static $clientSecret = '5933cf4d0c7b8c04eb45f2c70b7f429e71c71321';
    
    // Redirect URI (must match the one in GitHub settings)
    public static $redirectUri = 'https://ideenfetzen.de/oauth/callback.php';

    // Authorized user (optional, simple protection)
    // public static $allowedUsers = ['github_username'];
}
