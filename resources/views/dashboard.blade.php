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
        <aside class="sidebar glass">
            <div class="sidebar-header">
                <i class="fas fa-city"></i>
                <span>Gandaria City</span>
            </div>
            <nav>
                <a href="#" class="nav-item active" data-view="dashboard">
                    <i class="fas fa-th-large"></i> Dashboard
                </a>
                @if(auth()->user()->role === 'Supervisor')
                <a href="#" class="nav-item restricted-spv" data-view="upload">
                    <i class="fas fa-cloud-upload-alt"></i> Upload / Input
                </a>
                @endif
                <a href="#" class="nav-item" data-view="history">
                    <i class="fas fa-history"></i> Riwayat
                </a>
                @if(auth()->user()->role === 'Admin')
                <a href="#" class="nav-item" data-view="users">
                    <i class="fas fa-users-cog"></i> User Management
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
                    <button type="submit" class="btn-icon"><i class="fas fa-sign-out-alt"></i></button>
                </form>
            </div>
        </aside>

        <!-- Main Content -->
        <main class="content">
            <header class="top-bar">
                <h2 id="view-title">Dashboard Overview</h2>
                <div class="actions">
                    <button class="btn-secondary" id="btn-refresh"><i class="fas fa-sync"></i> Refresh</button>
                    <div class="date-display" id="current-date">{{ date('l, d F Y') }}</div>
                </div>
            </header>

            <!-- Dashboard View -->
            <section id="view-dashboard" class="view-section active">
                @if(auth()->user()->role === 'Admin')
                <div class="stats-grid animate-fade-in" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 24px;">
                    <div class="glass-card stat-card" style="display: flex; align-items: center; gap: 20px;">
                        <i class="fas fa-file-pdf" style="font-size: 2.5rem; color: var(--primary);"></i>
                        <div class="stat-content">
                            <h3 style="font-size: 0.9rem; color: var(--text-dim);">Total Laporan</h3>
                            <p id="stat-total" style="font-size: 2rem; font-weight: 600;">0</p>
                        </div>
                    </div>
                    <div class="glass-card stat-card" style="display: flex; align-items: center; gap: 20px;">
                        <i class="fas fa-clock" style="font-size: 2.5rem; color: var(--accent);"></i>
                        <div class="stat-content">
                            <h3 style="font-size: 0.9rem; color: var(--text-dim);">Laporan Hari Ini</h3>
                            <p id="stat-today" style="font-size: 2rem; font-weight: 600;">0</p>
                        </div>
                    </div>
                </div>

                <div class="glass-card animate-fade-in" style="margin-bottom: 24px; animation-delay: 0.1s;">
                    <h3 style="margin-bottom: 16px; font-size: 1.1rem;"><i class="fas fa-stream"></i> Log Aktivitas Terakhir</h3>
                    <div class="table-container">
                        <table id="logs-table">
                            <thead>
                                <tr>
                                    <th>User</th>
                                    <th>Aksi</th>
                                    <th>Detail</th>
                                    <th>Waktu</th>
                                </tr>
                            </thead>
                            <tbody></tbody>
                        </table>
                    </div>
                </div>
                @else
                <div class="glass-card animate-fade-in" style="text-align: center; padding: 60px;">
                    <i class="fas fa-check-circle" style="font-size: 4rem; color: var(--primary); margin-bottom: 20px;"></i>
                    <h2>Selamat Datang</h2>
                    <p style="color: var(--text-dim);">Sistem Laporan Harian Pengawas Gandaria City.</p>
                </div>
                @endif

                <div class="glass-card report-list-card animate-fade-in" style="animation-delay: 0.1s;">
                    <div class="card-header">
                        <h3>Daftar Laporan Terbaru</h3>
                        <div class="header-actions">
                            <button id="btn-export-excel" class="btn-secondary"><i class="fas fa-file-excel"></i> Export Excel</button>
                            <button id="btn-bulk-zip" class="btn-secondary"><i class="fas fa-file-archive"></i> Bulk ZIP</button>
                            <div class="filters">
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <label style="font-size: 0.8rem; color: var(--text-dim);">Dari:</label>
                                    <input type="date" id="filter-start-date">
                                </div>
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <label style="font-size: 0.8rem; color: var(--text-dim);">Ke:</label>
                                    <input type="date" id="filter-end-date">
                                </div>
                                <select id="filter-shift">
                                    <option value="">Semua Shift</option>
                                    <option value="Pagi">Pagi</option>
                                    <option value="Siang">Siang</option>
                                    <option value="Malam">Malam</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div class="table-container">
                        <table id="reports-table">
                            <thead>
                                <tr>
                                    <th>SPV Name</th>
                                    <th>Date</th>
                                    <th>Shift</th>
                                    <th>Keterangan</th>
                                    <th>Aksi</th>
                                </tr>
                            </thead>
                            <tbody></tbody>
                        </table>
                    </div>

                    @if(auth()->user()->role === 'Management')
                    <div class="purge-section" style="margin-top: 40px; padding: 20px; border-top: 1px solid var(--glass-border); background: rgba(239, 68, 68, 0.05); border-radius: 12px;">
                        <h3 style="color: var(--error); margin-bottom: 15px;"><i class="fas fa-trash-alt"></i> Hapus Data Laporan (Purge)</h3>
                        <p style="font-size: 0.85rem; color: var(--text-dim); margin-bottom: 20px;">Fitur ini akan menghapus data laporan secara permanen dari database dan storage.</p>
                        <div class="purge-controls" style="display: flex; flex-wrap: wrap; gap: 15px; align-items: flex-end;">
                            <div class="form-group" style="flex: 1; min-width: 150px;">
                                <label style="display: block; font-size: 0.8rem; margin-bottom: 5px;">Mulai Tanggal</label>
                                <input type="date" id="purge-start" class="btn-secondary" style="width: 100%;">
                            </div>
                            <div class="form-group" style="flex: 1; min-width: 150px;">
                                <label style="display: block; font-size: 0.8rem; margin-bottom: 5px;">Sampai Tanggal</label>
                                <input type="date" id="purge-end" class="btn-secondary" style="width: 100%;">
                            </div>
                            <button id="btn-purge-range" class="btn-primary" style="background: var(--error); flex: 1; min-width: 150px;">
                                <i class="fas fa-calendar-times"></i> Hapus Range
                            </button>
                            <button id="btn-purge-all" class="btn-secondary" style="border-color: var(--error); color: var(--error); flex: 1; min-width: 150px;">
                                <i class="fas fa-dumpster-fire"></i> Hapus Semua
                            </button>
                        </div>
                    </div>
                    @endif
                </div>
            </section>

            <!-- Upload/Input View -->
            <section id="view-upload" class="view-section hidden">
                <div class="glass-card animate-fade-in" style="max-width: 800px; margin: 0 auto;">
                    <h2><i class="fas fa-cloud-upload-alt"></i> Upload / Input Laporan</h2>
                    
                    <div class="method-toggle">
                        <button type="button" class="method-btn active" data-method="file">
                            <i class="fas fa-file-pdf"></i> Upload PDF
                        </button>
                        <button type="button" class="method-btn" data-method="manual">
                            <i class="fas fa-edit"></i> Ketik Manual
                        </button>
                    </div>

                    <form id="upload-form">
                        <div id="method-file-container" class="method-content">
                            <div class="drop-zone" id="drop-zone">
                                <i class="fas fa-file-upload"></i>
                                <p>Tarik file PDF ke sini atau Klik untuk pilih</p>
                                <input type="file" id="file-input" name="report_file" accept=".pdf" hidden>
                            </div>
                        </div>

                        <div id="method-manual-container" class="method-content hidden">
                            <div class="form-group">
                                <label>Isi Laporan Manual</label>
                                <textarea name="manual_content" id="upload-content-manual" placeholder="Ketik isi laporan di sini..." style="min-height: 200px;"></textarea>
                            </div>
                        </div>

                        <div class="input-grid">
                            <div class="form-group">
                                <label>Tanggal Laporan</label>
                                <input type="date" name="report_date" id="report-date-input" value="{{ date('Y-m-d') }}" required>
                            </div>
                            <div class="form-group">
                                <label>Shift</label>
                                <select name="shift" required>
                                    <option value="Pagi">Pagi</option>
                                    <option value="Siang">Siang</option>
                                    <option value="Malam">Malam</option>
                                </select>
                            </div>
                        </div>

                        <div class="form-group">
                            <label>Keterangan Tambahan (Opsional)</label>
                            <input type="text" name="description" placeholder="Contoh: Aman Terkendali, Perbaikan Lampu, dll.">
                        </div>

                        <button type="submit" class="btn-primary" id="btn-submit-upload" style="margin-top: 10px;">
                            <i class="fas fa-save"></i> 
                            <span class="btn-text">Simpan Laporan</span>
                            <div class="dots-wave hidden">
                                <span></span><span></span><span></span>
                            </div>
                        </button>
                    </form>
                </div>
            </section>

            <!-- Logs View -->
            <section id="view-history" class="view-section hidden">
                <div class="glass-card animate-fade-in">
                    <div class="card-header"><h3>Audit Logs</h3></div>
                    <div class="table-container">
                        <table id="logs-table">
                            <thead>
                                <tr><th>User</th><th>Action</th><th>Details</th><th>Timestamp</th></tr>
                            </thead>
                            <tbody></tbody>
                        </table>
                    </div>
                </div>
            </section>

        <!-- Modal for Manual Content -->
        <div id="manual-modal" class="overlay hidden" style="background: rgba(0,0,0,0.8);">
            <div class="glass-card animate-fade-in" style="max-width: 600px; width: 90%; position: relative;">
                <button class="btn-icon" style="position: absolute; top: 15px; right: 15px;" onclick="document.getElementById('manual-modal').classList.add('hidden')">
                    <i class="fas fa-times"></i>
                </button>
                <h3 style="margin-bottom: 20px;"><i class="fas fa-file-alt"></i> Detail Laporan Manual</h3>
                <div id="modal-content-body" style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 10px; max-height: 400px; overflow-y: auto; white-space: pre-wrap; line-height: 1.6;">
                </div>
        </div>
    </div>
            <!-- User Management View (Admin Only) -->
            @if(auth()->user()->role === 'Admin')
            <section id="view-users" class="view-section hidden">
                <div class="glass-card animate-fade-in">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <h2>User Management</h2>
                        <button class="btn-primary" onclick="app.showUserForm()" style="width: auto;"><i class="fas fa-plus"></i> Tambah User</button>
                    </div>
                    
                    <div class="table-container">
                        <table id="users-table">
                            <thead>
                                <tr>
                                    <th>Nama</th>
                                    <th>Username</th>
                                    <th>Role</th>
                                    <th>Aksi</th>
                                </tr>
                            </thead>
                            <tbody></tbody>
                        </table>
                    </div>
                </div>

                <!-- User Modal Form -->
                <div id="user-modal" class="overlay hidden" style="background: rgba(0,0,0,0.8);">
                    <div class="glass-card animate-fade-in" style="max-width: 500px; width: 90%;">
                        <h3 id="user-modal-title" style="margin-bottom: 20px;">Edit User</h3>
                        <form id="user-form">
                            <input type="hidden" name="id" id="user-id">
                            <div class="form-group" style="margin-bottom: 15px;">
                                <label style="display: block; margin-bottom: 5px;">Nama Lengkap</label>
                                <input type="text" name="name" id="user-name-input" class="btn-secondary" style="width: 100%; text-align: left;" required>
                            </div>
                            <div class="form-group" style="margin-bottom: 15px;">
                                <label style="display: block; margin-bottom: 5px;">Username</label>
                                <input type="text" name="username" id="user-username-input" class="btn-secondary" style="width: 100%; text-align: left;" required>
                            </div>
                            <div class="form-group" style="margin-bottom: 15px;">
                                <label style="display: block; margin-bottom: 5px;">Role</label>
                                <select name="role" id="user-role-input" class="btn-secondary" style="width: 100%;" required>
                                    <option value="Admin">Admin</option>
                                    <option value="Supervisor">Supervisor</option>
                                    <option value="Management">Management</option>
                                </select>
                            </div>
                            <div class="form-group" style="margin-bottom: 20px;">
                                <label style="display: block; margin-bottom: 5px;">Password (Kosongkan jika tidak ingin mengubah)</label>
                                <input type="password" name="password" id="user-password-input" class="btn-secondary" style="width: 100%; text-align: left;">
                            </div>
                            <div style="display: flex; gap: 10px;">
                                <button type="submit" class="btn-primary">Simpan</button>
                                <button type="button" class="btn-secondary" onclick="document.getElementById('user-modal').classList.add('hidden')">Batal</button>
                            </div>
                        </form>
                    </div>
                </div>
            </section>
            @endif
        </main>

        <div class="mobile-nav glass">
            <nav>
                <a href="#" class="nav-item active" data-view="dashboard"><i class="fas fa-th-large"></i> Dashboard</a>
                @if(auth()->user()->role === 'Supervisor')
                <a href="#" class="nav-item restricted-spv" data-view="upload"><i class="fas fa-cloud-upload-alt"></i> Upload / Input</a>
                @endif
                <a href="#" class="nav-item" data-view="history"><i class="fas fa-history"></i> Riwayat</a>
            </nav>
            <form action="{{ route('logout') }}" method="POST" id="logout-form-mobile" style="display: inline;">
                @csrf
                <a href="#" id="btn-logout-mobile" onclick="document.getElementById('logout-form-mobile').submit();"><i class="fas fa-sign-out-alt"></i></a>
            </form>
        </div>
        <div id="toast-container" class="toast-container"></div>
    </div>

    <!-- Scripts -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
    <script src="{{ asset('js/app.js') }}"></script>
    <script defer src="/_vercel/insights/script.js"></script>
</body>
</html>
