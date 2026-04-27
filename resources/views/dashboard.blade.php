<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>SPV Daily Report | Gandaria City</title>
    <link rel="stylesheet" href="{{ asset('css/style.css') }}">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600&display=swap" rel="stylesheet">
    <script>
        window.Laravel = {
            csrfToken: '{{ csrf_token() }}',
            user: {
                name: '{{ Auth::user()->name ?? "Guest" }}',
                role: '{{ Auth::user()->role ?? "Guest" }}'
            }
        };
    </script>
</head>
<body>
    <div class="background-glow"></div>
    
    <div id="app-container">
        <!-- Sidebar -->
        <aside class="sidebar">
            <div class="sidebar-header">
                <img src="{{ asset('img/logo.png') }}" alt="Logo" class="sidebar-logo">
                <span>Gandaria City</span>
            </div>
            <nav>
                <a href="#" class="nav-item active" data-view="dashboard">
                    <i class="fas fa-grid-2"></i> Dashboard
                </a>
                @if(auth()->user()->role === 'Supervisor')
                <a href="#" class="nav-item" data-view="upload">
                    <i class="fas fa-file-plus"></i> Buat Laporan
                </a>
                @endif
                <a href="#" class="nav-item" data-view="history">
                    <i class="fas fa-clock-rotate-left"></i> Riwayat
                </a>
                @if(auth()->user()->role === 'Admin')
                <a href="#" class="nav-item" data-view="users">
                    <i class="fas fa-users-gear"></i> Pengguna
                </a>
                @endif
            </nav>
            <div class="sidebar-footer">
                <div class="user-info">
                    <div class="avatar">{{ substr(Auth::user()->name ?? 'U', 0, 1) }}</div>
                    <div class="details">
                        <p id="user-name">{{ Auth::user()->name ?? 'User' }}</p>
                        <small id="user-role">{{ Auth::user()->role ?? 'Guest' }}</small>
                    </div>
                </div>
                <form action="{{ route('logout') }}" method="POST">
                    @csrf
                    <button type="submit" class="btn-icon" title="Logout"><i class="fas fa-sign-out-alt"></i></button>
                </form>
            </div>
        </aside>

        <!-- Main Content -->
        <main class="content">
            <header class="top-bar">
                <h2 id="view-title">Dashboard</h2>
                <div class="actions">
                    <div class="date-display" id="current-date">{{ date('d M Y') }}</div>
                    <button class="btn-secondary" id="btn-refresh"><i class="fas fa-rotate"></i></button>
                </div>
            </header>

            <!-- Dashboard View -->
            <section id="view-dashboard" class="view-section active">
                @php
                    $hour = (int)date('H');
                    if ($hour >= 7 && $hour < 15) {
                        $currentShift = 'Pagi';
                    } elseif ($hour >= 15 && $hour < 23) {
                        $currentShift = 'Siang';
                    } else {
                        $currentShift = 'Malam';
                    }
                @endphp
                <div class="stats-grid animate-fade-in">
                    <div class="glass-card stat-card">
                        <div class="stat-header">
                            <i class="fas fa-file-lines"></i>
                        </div>
                        <div class="stat-content">
                            <h3>Total Laporan</h3>
                            <p id="stat-total">0</p>
                        </div>
                    </div>
                    <div class="glass-card stat-card">
                        <div class="stat-header">
                            <i class="fas fa-calendar-day" style="color: #10b981;"></i>
                        </div>
                        <div class="stat-content">
                            <h3>Hari Ini</h3>
                            <p id="stat-today">0</p>
                        </div>
                    </div>
                    <div class="glass-card stat-card">
                        <div class="stat-header">
                            <i class="fas fa-user-clock" style="color: #f59e0b;"></i>
                        </div>
                        <div class="stat-content">
                            <h3>Shift Aktif</h3>
                            <p style="font-size: 1.2rem; margin-top: 10px;">{{ $currentShift }}</p>
                        </div>
                    </div>
                    <div class="glass-card stat-card">
                        <div class="stat-header">
                            <i class="fas fa-shield-halved" style="color: #6366f1;"></i>
                        </div>
                        <div class="stat-content">
                            <h3>Sistem Status</h3>
                            <p style="font-size: 1.2rem; margin-top: 10px; color: #10b981;">Online</p>
                        </div>
                    </div>
                </div>

                @if(auth()->user()->role === 'Admin')
                <div class="glass-card animate-fade-in" style="margin-bottom: 24px;">
                    <div class="card-header">
                        <h3>Log Aktivitas Terkini</h3>
                    </div>
                    <div class="table-container">
                        <table id="logs-table">
                            <thead>
                                <tr><th>User</th><th>Aksi</th><th>Waktu</th></tr>
                            </thead>
                            <tbody></tbody>
                        </table>
                    </div>
                </div>
                @endif

                <div class="glass-card animate-fade-in" style="margin-top: 24px;">
                    <div class="card-header" style="margin-bottom: 24px;">
                        <h3>Daftar Laporan</h3>
                        <div class="actions" style="gap: 8px;">
                            <button id="btn-export-excel" class="btn-secondary"><i class="fas fa-file-excel"></i> Excel</button>
                            <button id="btn-bulk-zip" class="btn-secondary"><i class="fas fa-file-archive"></i> ZIP</button>
                        </div>
                    </div>

                    <div class="filters" style="display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap;">
                        <input type="date" id="filter-start-date" placeholder="Mulai">
                        <input type="date" id="filter-end-date" placeholder="Selesai">
                        <select id="filter-shift">
                            <option value="">Semua Shift</option>
                            <option value="Pagi">Pagi</option>
                            <option value="Siang">Siang</option>
                            <option value="Malam">Malam</option>
                        </select>
                    </div>

                    <div class="table-container">
                        <table id="reports-table">
                            <thead>
                                <tr>
                                    <th>SPV</th>
                                    <th>Tanggal</th>
                                    <th>Shift</th>
                                    <th>Keterangan</th>
                                    <th>Aksi</th>
                                </tr>
                            </thead>
                            <tbody></tbody>
                        </table>
                    </div>

                    @if(auth()->user()->role === 'Management')
                    <div style="margin-top: 40px; padding: 24px; border-top: 1px solid var(--border); background: #fff1f2; border-radius: var(--radius-md);">
                        <h4 style="color: #be123c; margin-bottom: 12px;"><i class="fas fa-exclamation-triangle"></i> Pemeliharaan Data</h4>
                        <p style="font-size: 0.85rem; color: #9f1239; margin-bottom: 20px;">Hapus data laporan secara permanen dari sistem.</p>
                        <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                            <input type="date" id="purge-start" style="max-width: 200px;">
                            <input type="date" id="purge-end" style="max-width: 200px;">
                            <button id="btn-purge-range" class="btn-primary" style="background: #e11d48; width: auto;">Hapus Range</button>
                            <button id="btn-purge-all" class="btn-secondary" style="color: #e11d48; border-color: #fecaca;">Hapus Seluruh Data</button>
                        </div>
                    </div>
                    @endif
                </div>
            </section>

            <!-- Upload/Input View -->
            <section id="view-upload" class="view-section hidden">
                <div class="glass-card animate-fade-in" style="max-width: 700px; margin: 0 auto;">
                    <h3 style="margin-bottom: 24px;">Buat Laporan Baru</h3>
                    
                    <div class="method-toggle">
                        <button type="button" class="method-btn active" data-method="file">Upload PDF</button>
                        <button type="button" class="method-btn" data-method="manual">Input Manual</button>
                    </div>

                    <form id="upload-form">
                        <div id="method-file-container" class="method-content">
                            <div class="drop-zone" id="drop-zone">
                                <i class="fas fa-cloud-upload-alt"></i>
                                <p>Klik atau tarik file PDF ke sini</p>
                                <input type="file" id="file-input" name="report_file" accept=".pdf" hidden>
                            </div>
                        </div>

                        <div id="method-manual-container" class="method-content hidden">
                            <div class="form-group">
                                <label>Isi Laporan</label>
                                <textarea name="manual_content" placeholder="Tuliskan detail laporan di sini..." style="min-height: 200px;"></textarea>
                            </div>
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                            <div class="form-group">
                                <label>Tanggal</label>
                                <input type="date" name="report_date" value="{{ date('Y-m-d') }}" required>
                            </div>
                            <div class="form-group">
                                <label>Shift</label>
                                <select name="shift" required>
                                    <option value="Pagi" {{ $currentShift === 'Pagi' ? 'selected' : '' }}>Pagi (07:00 - 15:00)</option>
                                    <option value="Siang" {{ $currentShift === 'Siang' ? 'selected' : '' }}>Siang (15:00 - 23:00)</option>
                                    <option value="Malam" {{ $currentShift === 'Malam' ? 'selected' : '' }}>Malam (23:00 - 07:00)</option>
                                </select>
                            </div>
                        </div>

                        <div class="form-group">
                            <label>Keterangan Ringkas</label>
                            <input type="text" name="description" placeholder="Contoh: Kondisi Aman, Monitoring Listrik">
                        </div>

                        <button type="submit" class="btn-primary" id="btn-submit-upload" style="margin-top: 12px; width: 100%;">
                            <span class="btn-text">Simpan Laporan</span>
                            <div class="dots-wave hidden"><span></span><span></span><span></span></div>
                        </button>
                    </form>
                </div>
            </section>

            <!-- Riwayat/Logs View -->
            <section id="view-history" class="view-section hidden">
                <div class="glass-card animate-fade-in">
                    <h3>Audit System Logs</h3>
                    <div class="table-container">
                        <table id="logs-table-full">
                            <thead>
                                <tr><th>User</th><th>Aksi</th><th>Detail</th><th>Waktu</th></tr>
                            </thead>
                            <tbody></tbody>
                        </table>
                    </div>
                </div>
            </section>

            <!-- User Management -->
            @if(auth()->user()->role === 'Admin')
            <section id="view-users" class="view-section hidden">
                <div class="glass-card animate-fade-in">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                        <h3>Manajemen Pengguna</h3>
                        <button class="btn-primary" onclick="app.showUserForm()" style="width: auto;">Tambah User</button>
                    </div>
                    <div class="table-container">
                        <table id="users-table">
                            <thead>
                                <tr><th>Nama</th><th>Username</th><th>Role</th><th>Aksi</th></tr>
                            </thead>
                            <tbody></tbody>
                        </table>
                    </div>
                </div>
            </section>
            @endif
        </main>

        <div class="mobile-nav">
            <a href="#" class="nav-item active" data-view="dashboard"><i class="fas fa-home"></i></a>
            @if(auth()->user()->role === 'Supervisor')
            <a href="#" class="nav-item" data-view="upload"><i class="fas fa-plus"></i></a>
            @endif
            <a href="#" class="nav-item" data-view="history"><i class="fas fa-history"></i></a>
            <form action="{{ route('logout') }}" method="POST" id="logout-form-mobile">
                @csrf
                <a href="#" onclick="document.getElementById('logout-form-mobile').submit();" class="nav-item"><i class="fas fa-sign-out-alt"></i></a>
            </form>
        </div>
        <div id="toast-container" class="toast-container"></div>
    </div>

    <!-- Modals -->
    <div id="manual-modal" class="overlay hidden">
        <div class="glass-card animate-fade-in" style="max-width: 600px; width: 90%;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3>Detail Laporan</h3>
                <button class="btn-icon" onclick="document.getElementById('manual-modal').classList.add('hidden')"><i class="fas fa-times"></i></button>
            </div>
            <div id="modal-content-body" style="background: #f8fafc; padding: 20px; border-radius: 8px; max-height: 400px; overflow-y: auto; white-space: pre-wrap; font-size: 0.95rem; line-height: 1.6;"></div>
        </div>
    </div>

    @if(auth()->user()->role === 'Admin')
    <div id="user-modal" class="overlay hidden">
        <div class="glass-card animate-fade-in" style="max-width: 450px; width: 90%;">
            <h3 id="user-modal-title" style="margin-bottom: 20px;">User Form</h3>
            <form id="user-form">
                <input type="hidden" name="id" id="user-id">
                <div class="form-group">
                    <label>Nama Lengkap</label>
                    <input type="text" name="name" id="user-name-input" required>
                </div>
                <div class="form-group">
                    <label>Username</label>
                    <input type="text" name="username" id="user-username-input" required>
                </div>
                <div class="form-group">
                    <label>Role</label>
                    <select name="role" id="user-role-input" required>
                        <option value="Admin">Admin</option>
                        <option value="Supervisor">Supervisor</option>
                        <option value="Management">Management</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Password</label>
                    <input type="password" name="password" id="user-password-input" placeholder="Isi untuk ganti password">
                </div>
                <div style="display: flex; gap: 12px; margin-top: 24px;">
                    <button type="submit" class="btn-primary" style="flex: 1;">Simpan</button>
                    <button type="button" class="btn-secondary" onclick="document.getElementById('user-modal').classList.add('hidden')" style="flex: 1;">Batal</button>
                </div>
            </form>
        </div>
    </div>
    @endif

    <!-- Scripts -->
    <script src="https://unpkg.com/jszip@3.10.1/dist/jszip.min.js"></script>
    <script src="https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js"></script>
    <script src="{{ asset('js/app.js') }}"></script>
    <script defer src="/_vercel/insights/script.js"></script>
</body>
</html>
