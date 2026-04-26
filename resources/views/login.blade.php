<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login | SPV Report Gandaria City</title>
    <link rel="stylesheet" href="{{ asset('css/style.css') }}">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600&display=swap" rel="stylesheet">
</head>
<body class="login-page">
    <div class="background-glow"></div>
    
    <div id="login-overlay" class="overlay">
        <div class="glass-card login-card animate-fade-in">
            <div class="logo">
                <i class="fas fa-shield-alt"></i>
                <h1>REPORT SPV</h1>
            </div>
            <p>Internal Reporting Portal</p>
            
            @if($errors->any())
                <div class="error-msg" style="color: #ef4444; margin-bottom: 1rem; font-size: 0.85rem; background: #fef2f2; padding: 10px; border-radius: 8px; border: 1px solid #fee2e2;">
                    {{ $errors->first() }}
                </div>
            @endif

            <form action="{{ route('login.post') }}" method="POST">
                @csrf
                <div class="input-group">
                    <i class="fas fa-user"></i>
                    <input type="text" name="username" placeholder="Username" required value="{{ old('username') }}">
                </div>
                <div class="input-group">
                    <i class="fas fa-lock"></i>
                    <input type="password" name="password" placeholder="Password" required>
                </div>
                <button type="submit" class="btn-primary" style="width: 100%; margin-top: 8px;">
                    Masuk <i class="fas fa-arrow-right" style="font-size: 0.8rem;"></i>
                </button>
            </form>
        </div>
    </div>
    <script defer src="/_vercel/insights/script.js"></script>
</body>
</html>
