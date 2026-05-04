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
        <img src="{{ asset('images/login-bg.png') }}" class="w-full h-full object-cover opacity-70" alt="Background">
        <div class="absolute inset-0 bg-gradient-to-br from-slate-900/90 via-slate-900/40 to-transparent"></div>
    </div>

    <div class="relative z-10 w-full max-w-md">
        <div class="bg-white/10 backdrop-blur-2xl border border-white/20 p-10 rounded-[40px] shadow-2xl animate-fade-in">
            <!-- Header with Parking Logo -->
            <div class="text-center mb-10">
                <div class="inline-flex items-center justify-center w-20 h-20 bg-yellow-500 rounded-3xl mb-6 shadow-[0_10px_40px_rgba(234,179,8,0.3)] transform -rotate-6 border-4 border-white/20">
                    <i class="fas fa-parking text-white text-4xl"></i>
                </div>
                <h1 class="text-4xl font-black text-white tracking-tight mb-2 uppercase italic">Daily Report</h1>
                <p class="text-yellow-500 text-xs font-black uppercase tracking-[0.3em] bg-black/40 py-1 px-4 rounded-full inline-block">Supervisor Parkir Gancy</p>
            </div>

            @if($errors->any())
                <div class="bg-red-500/20 border border-red-500/30 text-red-200 p-4 rounded-2xl text-sm mb-6 animate-shake">
                    <i class="fas fa-triangle-exclamation mr-2"></i> {{ $errors->first() }}
                </div>
            @endif

            <!-- Tab Switcher -->
            <div class="flex bg-black/40 p-1.5 rounded-2xl mb-8 border border-white/5">
                <button onclick="toggleLoginMethod('pass')" id="btn-pass" class="flex-1 py-3 text-[10px] font-black rounded-xl transition-all bg-yellow-500 text-black shadow-lg">KATA SANDI</button>
                <button onclick="toggleLoginMethod('magic')" id="btn-magic" class="flex-1 py-3 text-[10px] font-black rounded-xl transition-all text-white/40 hover:text-white">LINK AJAIB</button>
            </div>

            <!-- Password Form -->
            <form id="login-form" action="{{ route('login.post') }}" method="POST" class="space-y-4">
                @csrf
                <div class="relative group">
                    <i class="fas fa-user-shield absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-yellow-500 transition-colors"></i>
                    <input type="text" name="username" placeholder="Username Pengawas" class="w-full bg-black/50 border border-white/10 rounded-2xl px-14 py-4.5 text-white placeholder-white/20 focus:outline-none focus:border-yellow-500 focus:bg-black/70 transition-all font-medium" required value="{{ old('username') }}">
                </div>
                <div class="relative group">
                    <i class="fas fa-key absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-yellow-500 transition-colors"></i>
                    <input type="password" name="password" placeholder="Password" class="w-full bg-black/50 border border-white/10 rounded-2xl px-14 py-4.5 text-white placeholder-white/20 focus:outline-none focus:border-yellow-500 focus:bg-black/70 transition-all font-medium" required>
                </div>
                <button type="submit" class="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-black py-5 rounded-2xl shadow-2xl shadow-yellow-500/20 hover:shadow-yellow-500/40 hover:-translate-y-1 active:translate-y-0 transition-all duration-300 mt-6 tracking-widest text-xs">
                    <span class="btn-text">MASUK KE DASHBOARD</span>
                    <div class="dots-wave hidden"><span></span><span></span><span></span></div>
                </button>
            </form>

            <!-- Magic Link Form -->
            <form id="magic-link-form" action="{{ route('magic.link.send') }}" method="POST" class="space-y-4 hidden">
                @csrf
                <div class="relative group">
                    <i class="fas fa-id-card absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-yellow-500 transition-colors"></i>
                    <input type="text" name="username" placeholder="Username Anda" class="w-full bg-black/50 border border-white/10 rounded-2xl px-14 py-4.5 text-white placeholder-white/20 focus:outline-none focus:border-yellow-500 focus:bg-black/70 transition-all font-medium" required>
                </div>
                <p class="text-white/30 text-[10px] text-center px-6 font-bold leading-relaxed italic uppercase">Link login akan dikirimkan secara otomatis untuk verifikasi akses.</p>
                <button type="submit" class="w-full bg-white text-black font-black py-5 rounded-2xl shadow-2xl hover:bg-slate-100 transition-all mt-6 tracking-widest text-xs">
                    <span class="btn-text">MINTA LINK AKSES</span>
                    <div class="dots-wave hidden"><span></span><span></span><span></span></div>
                </button>
            </form>
        </div>

        <div class="mt-12 flex flex-col items-center gap-4 opacity-40">
             <div class="flex items-center gap-6 grayscale">
                <img src="https://www.gandariacity.co.id/images/logo.png" alt="Gancy Logo" class="h-8">
                <div class="w-px h-6 bg-white/50"></div>
                <span class="text-white text-[10px] font-black tracking-[0.4em] uppercase">Parking Dept</span>
            </div>
            <p class="text-white/50 text-[9px] uppercase tracking-widest font-black">&copy; 2024 Gandaria City Parking Management</p>
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
                btnPass.classList.add('bg-yellow-500', 'text-black', 'shadow-lg');
                btnPass.classList.remove('text-white/40');
                btnMagic.classList.add('text-white/40');
                btnMagic.classList.remove('bg-yellow-500', 'text-black', 'shadow-lg');
            } else {
                passForm.classList.add('hidden');
                magicForm.classList.remove('hidden');
                btnMagic.classList.add('bg-yellow-500', 'text-black', 'shadow-lg');
                btnMagic.classList.remove('text-white/40');
                btnPass.classList.add('text-white/40');
                btnPass.classList.remove('bg-yellow-500', 'text-black', 'shadow-lg');
            }
        }

        document.querySelectorAll('form').forEach(form => {
            form.addEventListener('submit', function() {
                const btn = this.querySelector('button');
                btn.querySelector('.btn-text').classList.add('hidden');
                btn.querySelector('.dots-wave').classList.remove('hidden');
                this.closest('.bg-white\/10').classList.add('opacity-50', 'pointer-events-none');
            });
        });
    </script>
</body>
</html>
