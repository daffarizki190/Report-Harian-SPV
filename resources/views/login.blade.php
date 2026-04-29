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
        <div class="glass-card login-card animate-slide-up">
            <div class="logo animate-slide-up delay-1">
                <i class="fas fa-shield-alt"></i>
                <h1>REPORT SPV</h1>
            </div>
            <p class="animate-slide-up delay-2">Internal Reporting Portal</p>
            
            @if($errors->any())
                <div class="error-msg animate-fade-in" style="color: #ef4444; margin-bottom: 1rem; font-size: 0.85rem; background: #fef2f2; padding: 10px; border-radius: 8px; border: 1px solid #fee2e2;">
                    {{ $errors->first() }}
                </div>
            @endif

            <form id="login-form" action="{{ route('login.post') }}" method="POST" class="animate-slide-up delay-3">
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
                    <span class="btn-text">Masuk</span>
                    <div class="dots-wave hidden"><span></span><span></span><span></span></div>
                </button>
            </form>
        </div>
    </div>
    <script>
        document.getElementById('login-form').addEventListener('submit', function() {
            const btn = this.querySelector('button');
            btn.querySelector('.btn-text').classList.add('hidden');
            btn.querySelector('.dots-wave').classList.remove('hidden');
            document.querySelector('.login-card').style.opacity = '0.5';
            document.querySelector('.login-card').style.pointerEvents = 'none';
        });

        // Prevention of back button
        window.history.pushState(null, null, window.location.href);
        window.onpopstate = function () {
            window.history.go(1);
        };
    </script>
    <script defer src="/_vercel/insights/script.js"></script>
</body>
</html>
