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
<body class="bg-slate-900 min-h-screen flex items-center justify-center p-6 relative overflow-hidden font-outfit">
    <!-- Parking Background -->
    <div class="fixed inset-0 z-0">
        <img src="{{ asset('images/login-bg.png') }}" class="w-full h-full object-cover opacity-60" alt="Background">
        <div class="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900/60 to-transparent"></div>
    </div>

    <div class="relative z-10 w-full max-w-md">
        <div class="bg-slate-900/40 backdrop-blur-3xl border border-white/10 p-10 rounded-[48px] shadow-2xl animate-fade-in relative overflow-hidden">
            <!-- Decorative Glow -->
            <div class="absolute -top-24 -right-24 w-48 h-48 bg-blue-600/20 blur-[80px]"></div>
            
            <!-- Header with Dashboard Logo -->
            <div class="text-center mb-10 relative">
                <div class="inline-block bg-white rounded-3xl shadow-2xl mb-6 overflow-hidden border-4 border-white/20">
                    <img src="{{ asset('img/logo.png') }}" alt="Logo" class="w-24 h-24 object-cover">
                </div>
                <h1 class="text-4xl font-black text-white tracking-tight mb-1 uppercase italic">Daily Report</h1>
                <p class="text-blue-400 text-[10px] font-black uppercase tracking-[0.4em]">Gandaria City Parking</p>
            </div>

            @if($errors->any())
                <div class="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl text-xs mb-6 animate-shake text-center">
                    <i class="fas fa-shield-virus mr-2"></i> {{ $errors->first() }}
                </div>
            @endif

            <!-- Tab Switcher -->
            <div class="flex bg-white/5 p-1.5 rounded-2xl mb-8 border border-white/5">
                <button onclick="toggleLoginMethod('pass')" id="btn-pass" class="flex-1 py-3 text-[10px] font-black rounded-xl transition-all bg-blue-600 text-white shadow-lg shadow-blue-600/20">KATA SANDI</button>
                <button onclick="toggleLoginMethod('magic')" id="btn-magic" class="flex-1 py-3 text-[10px] font-black rounded-xl transition-all text-white/30 hover:text-white">LINK AJAIB</button>
            </div>

            <!-- Password Form -->
            <form id="login-form" action="{{ route('login.post') }}" method="POST" class="space-y-4">
                @csrf
                <div class="relative group">
                    <i class="fas fa-user-circle absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-blue-500 transition-colors"></i>
                    <input type="text" name="username" placeholder="Username" class="w-full bg-white/5 border border-white/10 rounded-2xl px-14 py-4.5 text-white placeholder-white/20 focus:outline-none focus:border-blue-500 focus:bg-white/10 transition-all font-medium" required value="{{ old('username') }}">
                </div>
                <div class="relative group">
                    <i class="fas fa-fingerprint absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-blue-500 transition-colors"></i>
                    <input type="password" name="password" placeholder="Password" class="w-full bg-white/5 border border-white/10 rounded-2xl px-14 py-4.5 text-white placeholder-white/20 focus:outline-none focus:border-blue-500 focus:bg-white/10 transition-all font-medium" required>
                </div>
                <button type="submit" class="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-5 rounded-2xl shadow-2xl shadow-blue-600/30 hover:shadow-blue-600/50 hover:-translate-y-1 active:translate-y-0 transition-all duration-300 mt-6 tracking-widest text-xs uppercase">
                    <span class="btn-text">Authenticate Access</span>
                    <div class="dots-wave hidden"><span></span><span></span><span></span></div>
                </button>
            </form>

            <!-- Magic Link Form -->
            <form id="magic-link-form" action="{{ route('magic.link.send') }}" method="POST" class="space-y-4 hidden">
                @csrf
                <div class="relative group">
                    <i class="fas fa-envelope-open absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-blue-500 transition-colors"></i>
                    <input type="text" name="username" placeholder="Username / ID" class="w-full bg-white/5 border border-white/10 rounded-2xl px-14 py-4.5 text-white placeholder-white/20 focus:outline-none focus:border-blue-500 focus:bg-white/10 transition-all font-medium" required>
                </div>
                <p class="text-white/20 text-[9px] text-center px-8 font-black uppercase tracking-tighter">Security verification will be required after accessing the link.</p>
                <button type="submit" class="w-full bg-white text-black font-black py-5 rounded-2xl shadow-2xl hover:bg-slate-100 transition-all mt-6 tracking-widest text-xs uppercase">
                    <span class="btn-text">Send Access Link</span>
                    <div class="dots-wave hidden"><span></span><span></span><span></span></div>
                </button>
            </form>
        </div>

        <div class="mt-12 flex flex-col items-center gap-2 opacity-40">
            <p class="text-white/40 text-[9px] font-black tracking-[0.4em] uppercase">Parking Management System</p>
            <p class="text-white/20 text-[8px] font-bold uppercase tracking-widest">© 2024 Crafted with Excellence by Daffa Rizki</p>
        </div>
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
                btnPass.classList.remove('text-white/30');
                btnMagic.classList.add('text-white/30');
                btnMagic.classList.remove('bg-blue-600', 'text-white', 'shadow-lg');
            } else {
                passForm.classList.add('hidden');
                magicForm.classList.remove('hidden');
                btnMagic.classList.add('bg-blue-600', 'text-white', 'shadow-lg');
                btnMagic.classList.remove('text-white/30');
                btnPass.classList.add('text-white/30');
                btnPass.classList.remove('bg-blue-600', 'text-white', 'shadow-lg');
            }
        }

        document.querySelectorAll('form').forEach(form => {
            form.addEventListener('submit', function() {
                const btn = this.querySelector('button');
                btn.querySelector('.btn-text').classList.add('hidden');
                btn.querySelector('.dots-wave').classList.remove('hidden');
                this.closest('.bg-slate-900\/40').classList.add('opacity-50', 'pointer-events-none');
            });
        });
    </script>
</body>
</html>
