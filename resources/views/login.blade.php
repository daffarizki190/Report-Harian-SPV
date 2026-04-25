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
    
    <div id="login-overlay" class="overlay active">
        <div class="glass-card login-card animate-fade-in">
            <div class="logo">
                <i class="fas fa-file-invoice"></i>
                <h1>SPV Report</h1>
            </div>
            <p>Internal Reporting Portal for Gandaria City</p>
            
            @if($errors->any())
                <div class="error-msg" style="color: #ff4d4d; margin-bottom: 1rem; font-size: 0.9rem;">
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
                <button type="submit" class="btn-primary">Login <i class="fas fa-arrow-right"></i></button>
            </form>
        </div>
    </div>
</body>
</html>
