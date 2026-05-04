<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login | SPV Report Gandaria City</title>
    <link rel="stylesheet" href="{{ asset('css/style.css') }}">
    <link rel="stylesheet" href="{{ asset('css/app.css') }}">
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Outfit', sans-serif; }
        .gahar-glass { background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 24px; }
        .gahar-input { width: 100%; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1); padding: 12px 12px 12px 45px; border-radius: 12px; color: white; transition: 0.3s; }
        .gahar-input:focus { border-color: #3b82f6; outline: none; background: rgba(0,0,0,0.4); }
        .gahar-btn { width: 100%; padding: 14px; background: linear-gradient(135deg, #3b82f6, #2563eb); border-radius: 12px; font-weight: 600; color: white; transition: 0.3s; }
        .gahar-glow-text { text-shadow: 0 0 20px rgba(59, 130, 246, 0.5); }
    </style>
</head>
<body class="bg-black min-h-screen flex items-center justify-center p-6 relative overflow-hidden font-outfit">
    <!-- Gahar Background -->
    <div class="fixed inset-0 z-0">
        <img src="{{ asset('images/login-bg.png') }}" class="w-full h-full object-cover opacity-60 scale-105 blur-sm" alt="Background">
        <div class="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
    </div>

    <div class="relative z-10 w-full max-w-md">
        <div class="gahar-glass p-10 animate-fade-in">
            <!-- Header -->
            <div class="text-center mb-10">
                <div class="inline-flex items-center justify-center w-16 h-16 bg-blue-500/20 rounded-2xl mb-6 border border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                    <i class="fas fa-shield-halved text-blue-500 text-3xl"></i>
                </div>
                <h1 class="text-4xl font-extrabold gahar-glow-text tracking-tighter mb-2 text-white">REPORT SPV</h1>
                <p class="text-white/40 text-sm font-medium uppercase tracking-[0.2em]">Gandaria City Command Center</p>
            </div>

            @if($errors->any())
                <div class="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm mb-6 animate-shake">
                    <i class="fas fa-triangle-exclamation mr-2"></i> {{ $errors->first() }}
                </div>
            @endif

            @if(session('status'))
                <div class="bg-blue-500/10 border border-blue-500/20 text-blue-200 p-4 rounded-xl text-sm mb-6">
                    <i class="fas fa-info-circle mr-2"></i> {{ session('status') }}
                    @if(session('magic_link'))
                        <a href="{{ session('magic_link') }}" class="block mt-2 font-bold underline">Login Otomatis &raquo;</a>
                    @endif
                </div>
            @endif

            <!-- Tab Switcher -->
            <div class="flex bg-white/5 p-1 rounded-xl mb-8">
                <button onclick="toggleLoginMethod('pass')" id="btn-pass" class="flex-1 py-2 text-sm font-bold rounded-lg transition-all bg-blue-600 text-white shadow-lg">PASSWORD</button>
                <button onclick="toggleLoginMethod('magic')" id="btn-magic" class="flex-1 py-2 text-sm font-bold rounded-lg transition-all text-white/40 hover:text-white">MAGIC LINK</button>
            </div>

            <!-- Password Form -->
            <form id="login-form" action="{{ route('login.post') }}" method="POST" class="space-y-4">
                @csrf
                <div class="relative">
                    <i class="fas fa-user absolute left-4 top-1/2 -translate-y-1/2 text-white/30"></i>
                    <input type="text" name="username" placeholder="Username" class="gahar-input" required value="{{ old('username') }}">
                </div>
                <div class="relative">
                    <i class="fas fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-white/30"></i>
                    <input type="password" name="password" placeholder="Password" class="gahar-input" required>
                </div>
                <button type="submit" class="gahar-btn mt-4">
                    <span class="btn-text">INITIALIZE SESSION</span>
                    <div class="dots-wave hidden"><span></span><span></span><span></span></div>
                </button>
            </form>

            <!-- Magic Link Form -->
            <form id="magic-link-form" action="{{ route('magic.link.send') }}" method="POST" class="space-y-4 hidden">
                @csrf
                <div class="relative">
                    <i class="fas fa-envelope absolute left-4 top-1/2 -translate-y-1/2 text-white/30"></i>
                    <input type="text" name="username" placeholder="Username / Email" class="gahar-input" required>
                </div>
                <p class="text-white/30 text-[11px] text-center italic">Link akses akan dibuat secara instan untuk akun Anda.</p>
                <button type="submit" class="gahar-btn mt-4 bg-gradient-to-r from-yellow-500 to-orange-600 shadow-orange-600/20">
                    <span class="btn-text">REQUEST MAGIC LINK</span>
                    <div class="dots-wave hidden"><span></span><span></span><span></span></div>
                </button>
            </form>
        </div>

        <p class="text-center text-white/20 text-[10px] mt-8 uppercase tracking-widest font-bold">Encrypted Connection &bull; Gandaria City Terminal v2.0</p>
    </div>

    <script>
        function toggleLoginMethod(method) {
            const passForm = document.getElementById('login-form');
            const magicForm = document.getElementById('magic-link-form');
            const btnPass = document.getElementById('btn-pass');
            const btnMagic = document.getElementById('btn-magic');
            
            if (method === 'pass') {
                passForm.classList.remove('hidden');
                magicForm.classList.add('hidden');
                btnPass.classList.add('bg-blue-600', 'text-white', 'shadow-lg');
                btnPass.classList.remove('text-white/40');
                btnMagic.classList.add('text-white/40');
                btnMagic.classList.remove('bg-blue-600', 'text-white', 'shadow-lg');
            } else {
                passForm.classList.add('hidden');
                magicForm.classList.remove('hidden');
                btnMagic.classList.add('bg-blue-600', 'text-white', 'shadow-lg');
                btnMagic.classList.remove('text-white/40');
                btnPass.classList.add('text-white/40');
                btnPass.classList.remove('bg-blue-600', 'text-white', 'shadow-lg');
            }
        }

        document.querySelectorAll('form').forEach(form => {
            form.addEventListener('submit', function() {
                const btn = this.querySelector('button');
                btn.querySelector('.btn-text').classList.add('hidden');
                btn.querySelector('.dots-wave').classList.remove('hidden');
                document.querySelector('.gahar-glass').classList.add('opacity-50', 'pointer-events-none');
            });
        });
    </script>
    <script defer src="/_vercel/insights/script.js"></script>
</body>
</html>
