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

            <div class="method-toggle animate-slide-up delay-3" style="grid-template-columns: 1fr 1fr; margin-bottom: 20px;">
                <button type="button" class="method-btn active" onclick="toggleLoginMethod('pass')">Password</button>
                <button type="button" class="method-btn" onclick="toggleLoginMethod('magic')">Magic Link</button>
            </div>

            @if(session('status'))
                <div class="status-msg animate-fade-in" style="color: #059669; margin-bottom: 1rem; font-size: 0.85rem; background: #ecfdf5; padding: 10px; border-radius: 8px; border: 1px solid #d1fae5;">
                    {{ session('status') }}
                    @if(session('magic_link'))
                        <div style="margin-top: 10px; padding: 10px; background: white; border-radius: 6px; border: 1px dashed #059669; word-break: break-all;">
                            <a href="{{ session('magic_link') }}" style="color: #059669; font-weight: 700;">Klik di sini untuk login otomatis &raquo;</a>
                        </div>
                    @endif
                </div>
            @endif

            <form id="login-form" action="{{ route('login.post') }}" method="POST" class="animate-slide-up delay-3">
                @csrf
                <div class="input-group">
                    <i class="fas fa-user"></i>
                    <input type="text" name="username" placeholder="Username" required value="{{ old('username') }}">
                </div>
                <div class="input-group" id="password-field">
                    <i class="fas fa-lock"></i>
                    <input type="password" name="password" placeholder="Password" required>
                </div>
                <button type="submit" class="btn-primary" style="width: 100%; margin-top: 8px;">
                    <span class="btn-text">Masuk</span>
                    <div class="dots-wave hidden"><span></span><span></span><span></span></div>
                </button>
            </form>

            <form id="magic-link-form" action="{{ route('magic.link.send') }}" method="POST" class="animate-slide-up delay-3 hidden">
                @csrf
                <div class="input-group">
                    <i class="fas fa-user"></i>
                    <input type="text" name="username" placeholder="Username" required>
                </div>
                <p style="font-size: 0.75rem; color: var(--text-dim); margin-bottom: 15px;">Kami akan membuatkan link login khusus untuk akun Anda.</p>
                <button type="submit" class="btn-primary" style="width: 100%; background: var(--accent-gold); border: none;">
                    <span class="btn-text">Dapatkan Magic Link</span>
                    <div class="dots-wave hidden"><span></span><span></span><span></span></div>
                </button>
            </form>
        </div>
    </div>
    <script>
        function toggleLoginMethod(method) {
            const passForm = document.getElementById('login-form');
            const magicForm = document.getElementById('magic-link-form');
            const btns = document.querySelectorAll('.method-btn');
            
            if (method === 'pass') {
                passForm.classList.remove('hidden');
                magicForm.classList.add('hidden');
                btns[0].classList.add('active');
                btns[1].classList.remove('active');
            } else {
                passForm.classList.add('hidden');
                magicForm.classList.remove('hidden');
                btns[0].classList.remove('active');
                btns[1].classList.add('active');
            }
        }

        document.querySelectorAll('form').forEach(form => {
            form.addEventListener('submit', function() {
                const btn = this.querySelector('button');
                btn.querySelector('.btn-text').classList.add('hidden');
                btn.querySelector('.dots-wave').classList.remove('hidden');
                document.querySelector('.login-card').style.opacity = '0.5';
                document.querySelector('.login-card').style.pointerEvents = 'none';
            });
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
