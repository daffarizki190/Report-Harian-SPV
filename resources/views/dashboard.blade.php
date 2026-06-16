<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <meta name="description" content="Digital Reporting Portal for Gandaria City Supervisors. Streamline daily reports, signatures, and monitoring in one professional platform.">
    <meta name="keywords" content="Supervisor Report, Gandaria City, Digital Reporting, Management Portal, Car Park Management">
    <meta name="author" content="Gandaria City IT Team">
    <link rel="icon" type="image/png" href="{{ asset('img/logo.png') }}">
    
    <!-- Open Graph / Social Media -->
    <meta property="og:type" content="website">
    <meta property="og:title" content="Supervisor Daily Report | Gandaria City">
    <meta property="og:description" content="Professional digital reporting system for Gandaria City.">
    <meta property="og:image" content="{{ asset('img/logo.png') }}">

    <title>Supervisor Daily Report | Gandaria City</title>
    
    <!-- Performance: Preconnect to CDNs -->
    <link rel="preconnect" href="https://cdnjs.cloudflare.com">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="preconnect" href="https://unpkg.com">

    <link rel="stylesheet" href="{{ asset('css/style.css') }}">
    <link rel="stylesheet" href="{{ asset('css/app.css') }}">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600&display=swap" rel="stylesheet">
    <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
    <script src="https://js.pusher.com/8.0.1/pusher.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/laravel-echo@1.16.1/dist/echo.iife.js"></script>
    <script>
        window.Pusher = Pusher;
        @if(!empty(env('REVERB_APP_KEY')))
        window.Echo = new Echo({
            broadcaster: 'reverb',
            key: '{{ env('REVERB_APP_KEY') }}',
            wsHost: '{{ env('REVERB_HOST') }}',
            wsPort: {{ env('REVERB_PORT', 80) }},
            forceTLS: true,
            enabledTransports: ['ws', 'wss'],
        });
        @endif
    </script>
    <script>
        window.Laravel = {
            csrfToken: '{{ csrf_token() }}',
            baseUrl: '{{ url("/") }}',
            user: {
                id: {{ Auth::user()->id ?? 0 }},
                name: '{{ Auth::user()->name ?? "Guest" }}',
                role: '{{ Auth::user()->role ?? "Guest" }}'
            }
        };

        // Early detection of Direct PDF Mode to prevent flickering
        if (new URLSearchParams(window.location.search).get('auto_pdf') === '1') {
            document.documentElement.classList.add('mode-auto-pdf');
        }
    </script>
</head>
<body>
    <div class="background-glow"></div>
    
    {{-- PDF Loading Screen for Direct Link --}}
    @if(request()->get('auto_pdf') == '1')
    <div id="pdf-loading-screen">
        <div class="pdf-spinner"></div>
        <h2 style="color: var(--primary); font-weight: 800; margin-bottom: 8px;">Generating Report...</h2>
        <p style="color: var(--text-dim); font-size: 0.9rem;">Please wait a moment while we prepare your PDF.</p>
    </div>
    @endif

    {{-- Global Loading Overlay --}}
    <div id="global-loader" class="overlay hidden" style="z-index: 9999;">
        <div class="glass-card" style="padding: 2.5rem; text-align: center; max-width: 320px;">
            <div class="dots-wave" style="margin: 0 auto 1.5rem;">
                <span></span><span></span><span></span>
            </div>
            <h3 style="color: var(--primary); font-weight: 700; margin-bottom: 0.5rem;">Memuat Data</h3>
            <p style="color: var(--text-dim); font-size: 0.88rem;">Mohon tunggu sejenak...</p>
        </div>
    </div>

    <div id="app-container">
        <!-- Sidebar -->
        <aside class="sidebar">
            <div class="sidebar-header">
                <img src="{{ asset('img/logo.png') }}" alt="Gandaria City Corporate Logo" class="sidebar-logo" loading="lazy">
                <span>Gandaria City</span>
            </div>
            <nav>
                @if(in_array(auth()->user()->role, ['CAR PARK MANAGER', 'Admin', 'Inhouse']))
                <a href="#" class="nav-item active" data-view="dashboard">
                    <i class="fas fa-tasks"></i> Daftar Persetujuan
                </a>
                @endif

                <a href="#" class="nav-item {{ in_array(auth()->user()->role, ['Supervisor', 'Leader']) ? 'active' : '' }}" data-view="history">
                    <i class="fas fa-file-invoice"></i> Daftar Laporan
                </a>

                @if(in_array(auth()->user()->role, ['Supervisor', 'Leader']))
                <a href="#" class="nav-item" data-view="upload">
                    <i class="fas fa-plus-circle"></i> Buat Laporan
                </a>
                @endif

                @if(auth()->user()->role === 'Admin')
                <a href="#" class="nav-item" data-view="monitoring">
                    <i class="fas fa-server"></i> Monitoring
                </a>
                <a href="#" class="nav-item" data-view="users">
                    <i class="fas fa-users-cog"></i> Pengguna
                </a>
                @endif
                
                @if(in_array(auth()->user()->role, ['CAR PARK MANAGER', 'Admin', 'Inhouse']))
                <a href="#" class="nav-item" onclick="document.getElementById('modal-upload-schedule').classList.remove('hidden')" style="color: var(--accent);">
                    <i class="fas fa-calendar-plus"></i> Upload Jadwal
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
                    <button type="submit" class="btn-icon" title="Logout" aria-label="Keluar dari sistem">
                        <i class="fas fa-sign-out-alt" aria-hidden="true"></i>
                    </button>
                </form>
            </div>
        </aside>



        <!-- Main Content -->
        <main class="content">
            <header class="top-bar">
                <h2 id="view-title">Daftar Persetujuan</h2>
                <div class="actions">
                    <div class="date-display" id="current-date">{{ date('d M Y') }}</div>
                    <button class="btn-secondary" id="btn-refresh" title="Refresh Data" aria-label="Segarkan data laporan">
                        <i class="fas fa-sync-alt" aria-hidden="true"></i>
                    </button>
                </div>
            </header>

            @if(in_array(auth()->user()->role, ['CAR PARK MANAGER', 'Admin', 'Inhouse']))
            <!-- Dashboard View -->
            <section id="view-dashboard" class="view-section active">
                <div class="stats-grid">
                    <div class="glass-card stat-card animate-slide-up" style="border-left: 4px solid var(--accent);">
                        <div class="stat-header">
                            <i class="fas fa-file-invoice" style="color: var(--accent); background: rgba(99, 102, 241, 0.1);"></i>
                        </div>
                        <div class="stat-content">
                            <h3>Total Laporan</h3>
                            <p id="stat-total">0</p>
                        </div>
                    </div>
                    <div class="glass-card stat-card animate-slide-up delay-1" style="border-left: 4px solid var(--error);">
                        <div class="stat-header">
                            <i class="fas fa-clock" style="color: var(--error); background: rgba(239, 68, 68, 0.1);"></i>
                        </div>
                        <div class="stat-content">
                            <h3>Belum Approve</h3>
                            <p id="stat-pending">0</p>
                        </div>
                    </div>
                    <div class="glass-card stat-card animate-slide-up delay-2" style="border-left: 4px solid var(--success);">
                        <div class="stat-header">
                            <i class="fas fa-check-circle" style="color: var(--success); background: rgba(16, 185, 129, 0.1);"></i>
                        </div>
                        <div class="stat-content">
                            <h3>Sudah Approve</h3>
                            <p id="stat-approved">0</p>
                        </div>
                    </div>
                    <div class="glass-card stat-card animate-slide-up delay-3" style="border-left: 4px solid var(--accent-gold);">
                        <div class="stat-header">
                            <i class="fas fa-calendar-day" style="color: var(--accent-gold); background: rgba(251, 191, 36, 0.1);"></i>
                        </div>
                        <div class="stat-content">
                            <h3>Shift Aktif</h3>
                            <p style="font-size: 1.4rem; font-weight: 800; margin-top: 5px;">{{ $currentShift }}</p>
                        </div>
                    </div>
                </div>


                <div class="glass-card animate-fade-in" style="margin-top: 24px;">
                    <div class="card-header" style="margin-bottom: 24px;">
                        <h3>Daftar Laporan</h3>
                        <div class="actions" style="gap: 8px;">
                            <button id="btn-upload-schedule" class="btn-secondary" onclick="document.getElementById('modal-upload-schedule').classList.remove('hidden')"><i class="fas fa-calendar-plus"></i> Upload Jadwal</button>
                            <button id="btn-export-excel" class="btn-secondary"><i class="fas fa-file-excel"></i> Excel</button>
                            <button id="btn-bulk-zip" class="btn-secondary"><i class="fas fa-file-archive"></i> ZIP</button>
                        </div>
                    </div>

                    <div class="filters" style="display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; align-items: center;">
                        <div style="position: relative; flex: 1; min-width: 250px;">
                            <i class="fas fa-search" style="position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--text-dim); font-size: 0.9rem;"></i>
                            <input type="text" id="filter-search" placeholder="Cari nama pengawas atau kejadian..." style="width: 100%; padding-left: 40px; border-radius: 12px; border: 1px solid var(--border-dark); font-size: 0.9rem; height: 42px;">
                        </div>
                        <div style="display: flex; gap: 8px; align-items: center; background: white; padding: 0 12px; border-radius: 12px; border: 1px solid var(--border-dark); height: 42px;">
                            <i class="fas fa-calendar-alt" style="color: var(--text-dim); font-size: 0.85rem;"></i>
                            <input type="date" id="filter-start-date" style="border: none; font-size: 0.85rem; color: var(--text-main); font-weight: 600;">
                        </div>
                        <div style="display: flex; gap: 8px; align-items: center; background: white; padding: 0 12px; border-radius: 12px; border: 1px solid var(--border-dark); height: 42px;">
                            <i class="fas fa-calendar-alt" style="color: var(--text-dim); font-size: 0.85rem;"></i>
                            <input type="date" id="filter-end-date" style="border: none; font-size: 0.85rem; color: var(--text-main); font-weight: 600;">
                        </div>
                        <select id="filter-shift">
                            <option value="">Semua Shift</option>
                            <option value="Pagi">Pagi</option>
                            <option value="Siang">Siang</option>
                            <option value="Malam">Malam</option>
                        </select>
                    </div>

                    <div id="reports-grid" class="reports-grid">
                        <!-- Diisi via JS dalam bentuk Card -->
                        <div style="grid-column: 1/-1; text-align:center; padding: 40px; color: var(--text-dim);">Memuat laporan terbaru...</div>
                    </div>

                    <!-- Pagination Controls -->
                    <div class="reports-pagination" style="display:flex; justify-content:center; align-items:center; flex-wrap:wrap; gap:15px; margin-top:20px; padding:10px;">
                        <button class="btn-prev-page btn-secondary" style="padding:8px 16px; border-radius:8px;" disabled><i class="fas fa-chevron-left"></i> Prev</button>
                        <span class="page-info" style="font-weight:600; color:var(--text-main);">Page 1 of 1</span>
                        <button class="btn-next-page btn-secondary" style="padding:8px 16px; border-radius:8px;" disabled>Next <i class="fas fa-chevron-right"></i></button>
                    </div>

                    @if(in_array(auth()->user()->role, ['CAR PARK MANAGER', 'Admin', 'Inhouse']))
                    <div class="animate-slide-up delay-2" style="margin-top: 40px; padding: 24px; border-top: 1px solid var(--border); background: #fff1f2; border-radius: var(--radius-md);">
                        <h4 style="color: #be123c; margin-bottom: 12px;"><i class="fas fa-exclamation-triangle"></i> Pemeliharaan Data</h4>
                        <p style="font-size: 0.85rem; color: #9f1239; margin-bottom: 20px;">Hapus data laporan secara permanen dari sistem.</p>
                        <div style="display: flex; gap: 12px; flex-wrap: wrap; align-items: center;">
                            <div style="display: flex; gap: 8px; align-items: center; background: white; padding: 6px 12px; border-radius: 10px; border: 1px solid var(--border-dark);">
                                <i class="fas fa-calendar-alt" style="color: var(--text-dim);"></i>
                                <input type="date" id="purge-start" style="border: none; padding: 4px; font-size: 0.85rem; width: 130px;">
                                <span style="color: var(--text-dim);">s/d</span>
                                <input type="date" id="purge-end" style="border: none; padding: 4px; font-size: 0.85rem; width: 130px;">
                            </div>
                            <button id="btn-purge-range" class="btn-primary" style="background: #e11d48; width: auto; box-shadow: 0 4px 12px rgba(225, 29, 72, 0.2);">
                                <i class="fas fa-eraser"></i> Hapus Range
                            </button>
                            <button id="btn-purge-all" class="btn-secondary" style="color: #e11d48; border-color: #fecaca; background: white;">
                                <i class="fas fa-trash-alt"></i> Kosongkan Database
                            </button>
                        </div>
                    </div>
                    @endif
                </div>

                @if(auth()->user()->role === 'Admin')
                <div class="glass-card animate-fade-in" style="margin-top: 24px; padding: 20px;">
                    <div class="card-header" style="margin-bottom: 16px;">
                        <h3 style="font-size: 0.95rem;"><i class="fas fa-history" style="margin-right: 8px; color: var(--accent);"></i> Log Aktivitas Terkini</h3>
                    </div>
                    <div id="logs-feed" class="activity-feed">
                        <!-- Diisi via JS -->
                        <div style="text-align:center; padding: 20px; color: var(--text-dim);">Memuat aktivitas...</div>
                    </div>
                </div>
                @endif
            </section>
            @endif
            
            <!-- History View -->
            <section id="view-history" class="view-section {{ in_array(auth()->user()->role, ['Supervisor', 'Leader']) ? 'active' : '' }}">
                <div class="glass-card animate-fade-in">
                    <div class="card-header" style="margin-bottom: 24px;">
                        <h3>Daftar Laporan</h3>
                        <p style="color: var(--text-dim); font-size: 0.85rem;">Menampilkan seluruh laporan yang telah dibuat.</p>
                    </div>
                    
                    <div class="table-container" style="overflow-x: auto;">
                        <table id="reports-history-table" style="width: 100%; border-collapse: separate; border-spacing: 0 8px;">
                            <thead>
                                <tr style="text-align: left; color: var(--text-dim); font-size: 0.85rem; text-transform: uppercase; letter-spacing: 1px;">
                                    <th style="padding: 12px 16px;">Pengawas</th>
                                    <th style="padding: 12px 16px;">Tanggal</th>
                                    <th style="padding: 12px 16px;">Shift</th>
                                    <th style="padding: 12px 16px;">Keterangan</th>
                                    <th style="padding: 12px 16px;">Status</th>
                                    <th style="padding: 12px 16px; text-align: center;">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td colspan="6" style="text-align:center; padding: 40px; color: var(--text-dim);">Memuat riwayat laporan...</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    
                    <!-- Pagination Controls -->
                    <div class="reports-pagination" style="display:flex; justify-content:center; align-items:center; flex-wrap:wrap; gap:15px; margin-top:20px; padding:10px;">
                        <button class="btn-prev-page btn-secondary" style="padding:8px 16px; border-radius:8px;" disabled><i class="fas fa-chevron-left"></i> Prev</button>
                        <span class="page-info" style="font-weight:600; color:var(--text-main);">Page 1 of 1</span>
                        <button class="btn-next-page btn-secondary" style="padding:8px 16px; border-radius:8px;" disabled>Next <i class="fas fa-chevron-right"></i></button>
                    </div>
                </div>
            </section>


            <!-- Upload/Input View -->
            <section id="view-upload" class="view-section hidden">
                <div class="glass-card animate-fade-in" style="max-width: 860px; margin: 0 auto;">
                    <h3 style="margin-bottom: 24px;">Buat Laporan Baru</h3>

                    <div class="method-toggle" style="grid-template-columns: 1fr 1fr;">
                        <button type="button" class="method-btn active" data-method="file">Upload PDF/Img</button>
                        <button type="button" class="method-btn" data-method="form">Form Digital</button>
                    </div>

                    {{-- TAB: Upload File --}}
                    <form id="upload-form">
                        <div id="method-file-container" class="method-content">
                            <div class="drop-zone" id="drop-zone">
                                <i class="fas fa-cloud-upload-alt"></i>
                                <p>Klik atau tarik file PDF/Gambar ke sini</p>
                                <input type="file" id="file-input" name="report_file" accept=".pdf,image/*" hidden>
                            </div>
                        </div>

                        <div id="method-form-container" class="method-content hidden"></div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;" id="upload-meta-fields">
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
                        <div class="form-group" id="upload-desc-field">
                            <label>Keterangan Ringkas</label>
                            <input type="text" name="description" placeholder="Contoh: Kondisi Aman, Monitoring Listrik">
                        </div>

                        <button type="submit" class="btn-primary" id="btn-submit-upload" style="margin-top: 12px; width: 100%;">
                            <span class="btn-text">Simpan Laporan</span>
                            <div class="dots-wave hidden"><span></span><span></span><span></span></div>
                        </button>
                    </form>
                </div>

                {{-- TAB: Form Digital (standalone, outside upload-form) --}}
                <div id="digital-form-wrapper" class="hidden" style="max-width: 860px; margin: 24px auto 0;">
                    <form id="form-digital">
                        <input type="hidden" id="df-report-id" name="report_id">

                        {{-- SEKSI 1: WAKTU --}}
                        <div class="glass-card df-section">
                            <div class="df-section-title"><span>1</span> WAKTU</div>
                            <div class="df-grid-2">
                                <div class="form-group">
                                    <label>Hari / Tanggal</label>
                                    <input type="date" id="df-tanggal" name="df_tanggal" value="{{ date('Y-m-d') }}" required>
                                </div>
                                <div class="form-group">
                                    <label>Nama Pengawas</label>
                                    <input type="text" id="df-nama" name="df_nama" value="{{ Auth::user()->name ?? '' }}" readonly class="input-readonly">
                                </div>
                            </div>
                            <div class="form-group" style="max-width: 260px;">
                                <label>Shift</label>
                                <select id="df-shift" name="df_shift" required>
                                    <option value="Pagi" {{ $currentShift === 'Pagi' ? 'selected' : '' }}>Pagi (07:00 - 15:00)</option>
                                    <option value="Siang" {{ $currentShift === 'Siang' ? 'selected' : '' }}>Siang (15:00 - 23:00)</option>
                                    <option value="Malam" {{ $currentShift === 'Malam' ? 'selected' : '' }}>Malam (23:00 - 07:00)</option>
                                </select>
                            </div>
                        </div>

                        {{-- SEKSI 2: MAN POWER --}}
                        <div class="glass-card df-section">
                            <div class="df-section-title"><span>2</span> MAN POWER</div>
                            <div class="table-container">
                                <table id="tbl-manpower">
                                    <thead>
                                        <tr>
                                            <th style="width:40%; padding-left:10px;">JABATAN</th>
                                            <th style="text-align:center; width:30%;">SHIFT</th>
                                            <th style="text-align:center; width:30%;">
                                                MIDDLE
                                                <span style="display:block; font-size:0.65rem; font-weight:500; color:var(--text-dim); text-transform:none; letter-spacing:0;">(opsional)</span>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        @foreach(['Car Park Manager','IT','Administrasi','Supervisor','Leader','Staff'] as $jabatan)
                                        <tr>
                                            <td style="font-size:0.85rem; padding-left:10px;">{{ $jabatan }}</td>
                                            <td style="text-align:center; padding: 6px;">
                                                <input type="number" class="mp-input" data-jabatan="{{ $jabatan }}" data-col="shift"
                                                    min="0" value=""
                                                    style="width:100%; max-width:80px; margin:0 auto; text-align:center; padding:6px 4px;">
                                            </td>
                                            <td style="text-align:center; padding: 6px;">
                                                <input type="number" class="mp-input-middle" data-jabatan="{{ $jabatan }}" data-col="middle"
                                                    min="0" value=""
                                                    placeholder="-"
                                                    style="width:100%; max-width:80px; margin:0 auto; text-align:center; padding:6px 4px; border-color: #e2e8f0;">
                                            </td>
                                        </tr>
                                        @endforeach
                                    </tbody>
                                    <tfoot>
                                        <tr class="mp-total-row">
                                            <td style="font-weight:800; padding:12px 10px;">TOTAL</td>
                                            <td style="text-align:center; font-size:1.3rem; font-weight:800; color:var(--accent); padding:12px 8px;">
                                                <span id="mp-total-val">0</span>
                                            </td>
                                            <td style="text-align:center; font-size:1.3rem; font-weight:800; color:#8b5cf6; padding:12px 8px;">
                                                <span id="mp-total-middle">0</span>
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>

                        {{-- SEKSI 3: PLOTING MANPOWER --}}
                        <div class="glass-card df-section">
                            <div class="df-section-title"><span>3</span> PLOTING MANPOWER</div>
                            <div class="table-container">
                                <table id="tbl-ploting">
                                    <thead>
                                        <tr>
                                            <th style="width:50px">NO</th>
                                            <th>AREA PLOTING</th>
                                            <th>NAMA PETUGAS</th>
                                            <th style="width:40px"></th>
                                        </tr>
                                    </thead>
                                    <tbody id="ploting-tbody">
                                        @foreach($plotingAreas as $i => $area)
                                        <tr class="ploting-row">
                                            <td style="text-align:center; color:var(--text-dim); font-size:0.8rem;">{{ $i+1 }}</td>
                                            <td>
                                                <input type="text" class="ploting-area"
                                                    value="{{ $area }}"
                                                    placeholder="Nama Area"
                                                    style="width:100%; border:none; background:transparent; padding:4px 0; font-size:0.9rem;">
                                            </td>
                                            <td>
                                                <input type="text" class="ploting-petugas"
                                                    placeholder="Nama Petugas"
                                                    style="width:100%; border:none; background:transparent; padding:4px 0; font-size:0.9rem;">
                                            </td>
                                            <td style="text-align:center;">
                                                <button type="button" class="btn-remove-row" onclick="this.closest('tr').remove()" title="Hapus baris">×</button>
                                            </td>
                                        </tr>
                                        @endforeach
                                    </tbody>
                                </table>
                            </div>
                            <button type="button" class="btn-add-row" onclick="formDigital.addPlotingRow()">
                                <i class="fas fa-plus"></i> Tambah Baris
                            </button>
                        </div>

                        {{-- SEKSI 4: PERLENGKAPAN --}}
                        <div class="glass-card df-section">
                            <div class="df-section-title"><span>4</span> PERLENGKAPAN</div>
                            <div class="table-container">
                                <table id="tbl-perlengkapan">
                                    <thead>
                                        <tr>
                                            <th style="width:40px">NO</th>
                                            <th>NAMA PERLENGKAPAN</th>
                                            <th style="width:100px; text-align:center">JUMLAH</th>
                                            <th style="width:100px; text-align:center; color:var(--success)">BAIK</th>
                                            <th style="width:100px; text-align:center; color:var(--error)">RUSAK</th>
                                            <th>KETERANGAN</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        @foreach($perlengkapan as $idx => $item)
                                        <tr>
                                            <td style="text-align:center; color:var(--text-dim); font-size:0.8rem;">{{ $idx+1 }}</td>
                                            <td style="font-weight:600;">{{ $item[0] }}</td>
                                            <td style="text-align:center; padding:8px 6px;">
                                                <input type="number" class="perlen-jumlah" min="0"
                                                    value="{{ $item[1] }}"
                                                    style="width:100%; min-width:80px; text-align:center; padding:6px 2px;">
                                            </td>
                                            <td style="text-align:center; padding:8px 6px;">
                                                <input type="number" class="perlen-baik" min="0" value="{{ $item[1] }}"
                                                    style="width:100%; min-width:80px; text-align:center; padding:6px 2px; border-color: #bbf7d0; color: #15803d;">
                                            </td>
                                            <td style="text-align:center; padding:8px 6px;">
                                                <input type="number" class="perlen-rusak" min="0" value="0"
                                                    style="width:100%; min-width:80px; text-align:center; padding:6px 2px; border-color: #fecaca; color: #b91c1c;">
                                            </td>
                                            <td style="padding:8px 16px;">
                                                <input type="text" class="perlen-ket"
                                                    placeholder="Keterangan..."
                                                    style="width:100%; border:none; background:transparent; padding:4px 0; font-size:0.88rem;">
                                            </td>
                                        </tr>
                                        @endforeach
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {{-- SEKSI 5: PERALATAN --}}
                        <div class="glass-card df-section">
                            <div class="df-section-title"><span>5</span> PERALATAN</div>
                            <div class="table-container">
                                <table id="tbl-peralatan">
                                    <thead>
                                        <tr>
                                            <th style="width:40px">NO</th>
                                            <th>NAMA PERALATAN</th>
                                            <th style="width:100px; text-align:center">JUMLAH</th>
                                            <th style="width:100px; text-align:center; color:var(--success)">BAIK</th>
                                            <th style="width:100px; text-align:center; color:var(--error)">RUSAK</th>
                                            <th>KETERANGAN</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        @foreach($peralatan as $idx => $item)
                                        <tr>
                                            <td style="text-align:center; color:var(--text-dim); font-size:0.8rem;">{{ $idx+1 }}</td>
                                            <td style="font-weight:600;">{{ $item[0] }}</td>
                                            <td style="text-align:center; padding:8px 6px;">
                                                <input type="number" class="alat-jumlah" min="0"
                                                    value="{{ $item[1] }}"
                                                    style="width:100%; min-width:80px; text-align:center; padding:6px 2px;">
                                            </td>
                                            <td style="text-align:center; padding:8px 6px;">
                                                <input type="number" class="alat-baik" min="0" value="{{ $item[1] }}"
                                                    style="width:100%; min-width:80px; text-align:center; padding:6px 2px; border-color: #bbf7d0; color: #15803d;">
                                            </td>
                                            <td style="text-align:center; padding:8px 6px;">
                                                <input type="number" class="alat-rusak" min="0" value="0"
                                                    style="width:100%; min-width:80px; text-align:center; padding:6px 2px; border-color: #fecaca; color: #b91c1c;">
                                            </td>
                                            <td style="padding:8px 16px;">
                                                <input type="text" class="alat-ket"
                                                    placeholder="Keterangan..."
                                                    style="width:100%; border:none; background:transparent; padding:4px 0; font-size:0.88rem;">
                                            </td>
                                        </tr>
                                        @endforeach
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {{-- SEKSI 6: BRIEFING & TRAINING --}}
                        <div class="glass-card df-section">
                            <div class="df-section-title"><span>6</span> BRIEFING &amp; TRAINING</div>
                            <div class="df-grid-2">
                                <div class="form-group">
                                    <label>Materi Briefing</label>
                                    <textarea id="df-briefing" rows="8" placeholder="Tuliskan materi briefing..."></textarea>
                                </div>
                                <div class="form-group">
                                    <label>Materi Training</label>
                                    <textarea id="df-training" rows="8" placeholder="Tuliskan materi training..."></textarea>
                                </div>
                            </div>
                        </div>

                        {{-- SEKSI 7: SPESIFIKASI LAPORAN --}}
                        <div class="glass-card df-section">
                            <div class="df-section-title"><span>7</span> SPESIFIKASI LAPORAN</div>
                            <div class="table-container" style="overflow-x:auto; -webkit-overflow-scrolling: touch;">
                                <table id="tbl-spesifikasi" style="min-width: 1000px; border-collapse: separate; border-spacing: 0;">
                                    <thead>
                                        <tr style="background: var(--bg-app);">
                                            <th style="width:140px; padding:12px;">JENIS LAPORAN</th>
                                            <th style="width:100px; padding:12px; text-align:center">WAKTU</th>
                                            <th style="padding:12px;">DETAIL LAPORAN</th>
                                            <th style="padding:12px;">TINDAKAN</th>
                                            <th style="width:160px; padding:12px; text-align:center">STATUS</th>
                                            <th style="width:60px; padding:12px; text-align:center"></th>
                                        </tr>
                                    </thead>
                                    <tbody id="spesifikasi-tbody">
                                        <tr class="spesifikasi-row">
                                            <td style="padding:8px;">
                                                <select class="spec-jenis" style="width:100%; padding:8px; border-radius:8px; border:1px solid var(--border); background:white;">
                                                    <option value="Temuan">Temuan</option>
                                                    <option value="Kejadian">Kejadian</option>
                                                    <option value="Kegiatan">Kegiatan</option>
                                                    <option value="Laporan">Laporan</option>
                                                </select>
                                            </td>
                                            <td style="padding:8px;"><input type="text" class="spec-waktu" maxlength="5" placeholder="00:00" oninput="this.value = this.value.replace(/[^0-9]/g, '').replace(/^(\d{2})(\d{1,2})/, '$1:$2')" style="width:100%; padding:8px; border:1px solid var(--border); border-radius:8px; text-align:center; background:white;"></td>
                                            <td style="padding:8px;"><textarea class="spec-detail" placeholder="Detail kejadian..." style="width:100%; min-height:60px; padding:10px; border:1px solid var(--border); border-radius:8px; background:white; resize:vertical; font-family:inherit; font-size:0.9rem;"></textarea></td>
                                            <td style="padding:8px;"><textarea class="spec-tindakan" placeholder="Tindakan dilakukan..." style="width:100%; min-height:60px; padding:10px; border:1px solid var(--border); border-radius:8px; background:white; resize:vertical; font-family:inherit; font-size:0.9rem;"></textarea></td>
                                            <td style="text-align:center; padding:8px;">
                                                <select class="spec-status" style="width:100%; padding:8px; border-radius:8px; border:1px solid var(--border); background:white; font-weight:700;">
                                                    <option value="Done">Done</option>
                                                    <option value="On Progres">On Progres</option>
                                                </select>
                                            </td>
                                            <td style="text-align:center; padding:8px;">
                                                <button type="button" class="btn-remove-row" onclick="this.closest('tr').remove()" title="Hapus baris" style="background:rgba(239, 68, 68, 0.1); color:#ef4444; border:none; width:32px; height:32px; border-radius:8px;"><i class="fas fa-times"></i></button>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <button type="button" class="btn-add-row" onclick="formDigital.addSpesifikasiRow()">
                                <i class="fas fa-plus"></i> Tambah Kejadian
                            </button>
                        </div>

                        {{-- FOOTER: TANDA TANGAN --}}
                        <div class="glass-card df-section">
                            <div class="mobile-only-warning">
                                <i class="fas fa-mobile-alt"></i> Gunakan layar HP untuk melakukan tanda tangan digital
                            </div>
                            <div class="df-signature-grid">
                                {{-- Supervisor / Leader (Dibuat oleh) --}}
                                <div class="df-signature-block">
                                    <p>Dibuat oleh,</p>
                                    <div class="sig-pad-wrapper">
                                        <canvas id="sig-spv" class="sig-canvas {{ !in_array(auth()->user()->role, ['Supervisor', 'Leader']) ? 'sig-readonly' : '' }}"></canvas>
                                        @if(in_array(auth()->user()->role, ['Supervisor', 'Leader']))
                                            <button type="button" class="btn-upload-sig" onclick="formDigital.triggerSigPhotoUpload('spv')" title="Upload foto tanda tangan dari kertas putih">
                                                <i class="fas fa-camera"></i> Foto
                                            </button>
                                            <button type="button" class="btn-clear-sig" onclick="formDigital.clearSig('spv')">Hapus</button>
                                        @endif
                                    </div>
                                    <p class="df-sig-name" id="df-sig-name-spv">{{ Auth::user()->name ?? '-' }}</p>
                                    <p class="df-sig-role">Supervisor/Leader</p>
                                </div>

                                {{-- Management (Mengetahui 1) --}}
                                <div class="df-signature-block">
                                    <p>Mengetahui,</p>
                                    <div class="sig-pad-wrapper">
                                        <canvas id="sig-mgr-1" class="sig-canvas {{ !in_array(auth()->user()->role, ['CAR PARK MANAGER','Admin','Inhouse']) ? 'sig-readonly' : '' }}"></canvas>
                                        @if(in_array(auth()->user()->role, ['CAR PARK MANAGER','Admin','Inhouse']))
                                            <button type="button" class="btn-upload-sig" onclick="formDigital.triggerSigPhotoUpload('mgr-1')" title="Upload foto tanda tangan dari kertas putih">
                                                <i class="fas fa-camera"></i> Foto
                                            </button>
                                            <button type="button" class="btn-clear-sig" onclick="formDigital.clearSig('mgr-1')">Hapus</button>
                                        @endif
                                    </div>
                                    <p class="df-sig-name" id="df-sig-name-mgr-1">....................</p>
                                    <p class="df-sig-role">CarPark Manager</p>
                                </div>

                                {{-- Management (Mengetahui 2) --}}
                                <div class="df-signature-block">
                                    <p>Mengetahui,</p>
                                    <div class="sig-pad-wrapper">
                                       <canvas id="sig-mgr-2" class="sig-canvas {{ !in_array(auth()->user()->role, ['CAR PARK MANAGER','Admin','Inhouse']) ? 'sig-readonly' : '' }}"></canvas>
                                       @if(in_array(auth()->user()->role, ['CAR PARK MANAGER','Admin','Inhouse']))
                                           <button type="button" class="btn-upload-sig" onclick="formDigital.triggerSigPhotoUpload('mgr-2')" title="Upload foto tanda tangan dari kertas putih">
                                               <i class="fas fa-camera"></i> Foto
                                           </button>
                                           <button type="button" class="btn-clear-sig" onclick="formDigital.clearSig('mgr-2')">Hapus</button>
                                       @endif
                                   </div>
                                   <p class="df-sig-name" id="df-sig-name-mgr-2">....................</p>
                                   <p class="df-sig-role">Inhouse Parking</p>
                                </div>
                            </div>
                        </div>

                        {{-- ACTIONS --}}
                        <div style="display:flex; gap:12px; margin-top: 8px; margin-bottom: 40px;">
                            <button type="button" id="btn-print-preview" class="btn-secondary" style="flex:1;">
                                <i class="fas fa-print"></i> Preview & Cetak PDF
                            </button>
                            <button type="submit" id="btn-submit-form" class="btn-primary" style="flex:2; background-color: #0f172a !important; color: #ffffff !important;">
                                <span class="btn-text-form"><i class="fas fa-paper-plane"></i> Simpan Laporan Digital</span>
                                <div class="dots-wave hidden"><span></span><span></span><span></span></div>
                            </button>
                        </div>
                        {{-- Hidden Input for Signature Photo --}}
                        <input type="file" id="sig-photo-input" accept="image/*" hidden>
                    </form>
                </div>
            </section>

            <!-- User Management -->
            @if(auth()->user()->role === 'Admin')
            <section id="view-monitoring" class="view-section hidden">
                <div class="glass-card p-8 animate-fade-in">
                    <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                        <h3 class="text-2xl font-bold text-primary m-0 flex items-center gap-3">
                            <i class="fas fa-desktop text-accent"></i> 
                            Monitoring Sistem
                        </h3>
                        <button onclick="app.loadMonitoringData()" class="btn-premium">
                            <i class="fas fa-sync-alt"></i> Refresh Monitor
                        </button>
                    </div>
                    
                    <!-- Tech Stack Details -->
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                        <!-- Card 1 -->
                        <div class="bg-white/50 backdrop-blur-xl border border-white/40 border-t-4 border-t-accent p-6 rounded-lg-custom shadow-sm hover:shadow-md transition-all">
                            <div class="text-text-dim text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
                                <i class="fab fa-php text-lg"></i> Server Engine
                            </div>
                            <div class="stat-content">
                                <h4 id="mon-php-version" class="text-2xl font-bold text-primary mb-1">Memuat...</h4>
                                <p id="mon-server-software" class="text-sm text-text-dim m-0">Environment: -</p>
                            </div>
                        </div>
                        <!-- Card 2 -->
                        <div class="bg-white/50 backdrop-blur-xl border border-white/40 border-t-4 border-t-success p-6 rounded-lg-custom shadow-sm hover:shadow-md transition-all">
                            <div class="text-text-dim text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
                                <i class="fas fa-database text-lg"></i> Database Stats
                            </div>
                            <div class="stat-content">
                                <h4 id="mon-db-reports" class="text-2xl font-bold text-primary mb-1">0 Laporan</h4>
                                <p id="mon-db-users" class="text-sm text-text-dim m-0">0 Pengguna Terdaftar</p>
                            </div>
                        </div>
                        <!-- Card 3 -->
                        <div class="bg-white/50 backdrop-blur-xl border border-white/40 border-t-4 border-t-accent-gold p-6 rounded-lg-custom shadow-sm hover:shadow-md transition-all">
                            <div class="text-text-dim text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
                                <i class="fas fa-percentage text-lg"></i> Completion Rate
                            </div>
                            <div class="stat-content">
                                <h4 id="mon-completion-rate" class="text-2xl font-bold text-primary mb-3">0%</h4>
                                <div class="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                                    <div id="mon-progress-fill" class="h-full bg-accent-gold w-0 transition-all duration-1000"></div>
                                </div>
                            </div>
                        </div>
                    </div>
 
                    <!-- Detailed Technical Info -->
                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
                        <div class="bg-white/40 backdrop-blur-lg border border-white/20 p-6 rounded-lg-custom">
                            <h5 class="text-lg font-bold text-primary mb-5 flex items-center gap-2">
                                <i class="fas fa-info-circle text-accent"></i> Info Sistem
                            </h5>
                            <div class="space-y-4">
                                <div class="flex justify-between items-center text-sm">
                                    <span class="text-text-dim">Timezone:</span> 
                                    <span id="mon-timezone" class="font-semibold text-primary">-</span>
                                </div>
                                <div class="flex justify-between items-center text-sm">
                                    <span class="text-text-dim">Storage Provider:</span> 
                                    <span id="mon-storage" class="font-semibold text-primary">Supabase Cloud</span>
                                </div>
                                <div class="flex justify-between items-center text-sm">
                                    <span class="text-text-dim">Database Driver:</span> 
                                    <span id="mon-db-driver" class="font-semibold text-primary">-</span>
                                </div>
                            </div>
                        </div>
                        <div class="bg-white/40 backdrop-blur-lg border border-white/20 p-6 rounded-lg-custom">
                            <h5 class="text-lg font-bold text-primary mb-5 flex items-center gap-2">
                                <i class="fas fa-chart-pie text-accent"></i> Distribusi Laporan
                            </h5>
                            <div class="space-y-4">
                                <div class="flex justify-between items-center text-sm">
                                    <span class="text-text-dim">Sudah Final:</span> 
                                    <span id="mon-reports-done" class="font-bold text-success">0</span>
                                </div>
                                <div class="flex justify-between items-center text-sm">
                                    <span class="text-text-dim">Pending Approval:</span> 
                                    <span id="mon-reports-pending" class="font-bold text-error">0</span>
                                </div>
                            </div>
                        </div>
                        <div class="bg-white/40 backdrop-blur-lg border border-white/20 p-6 rounded-lg-custom">
                            <h5 class="text-lg font-bold text-primary mb-5 flex items-center gap-2">
                                <i class="fas fa-code text-accent"></i> Developer Tech Stack
                            </h5>
                            <div class="space-y-4" id="mon-tech-stack-list">
                                <div class="flex justify-between items-center text-sm">
                                    <span class="text-text-dim">Framework:</span> 
                                    <span class="font-semibold text-primary">Laravel 11</span>
                                </div>
                                <div class="flex justify-between items-center text-sm">
                                    <span class="text-text-dim">Styling:</span> 
                                    <span class="font-semibold text-primary">Tailwind CSS</span>
                                </div>
                                <div class="flex justify-between items-center text-sm">
                                    <span class="text-text-dim">Hosting:</span> 
                                    <span class="font-semibold text-primary">Vercel</span>
                                </div>
                            </div>
                        </div>
                    </div>
>

                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                        <h4 style="margin:0;"><i class="fas fa-list-ul"></i> Audit Log Aktivitas</h4>
                    </div>
                    <div class="table-container">
                        <table id="monitoring-logs-table">
                            <thead>
                                <tr>
                                    <th>User</th>
                                    <th>Aksi</th>
                                    <th>Detail</th>
                                    <th>IP Address</th>
                                    <th>Waktu</th>
                                </tr>
                            </thead>
                            <tbody id="monitoring-logs-body"></tbody>
                        </table>
                    </div>
                </div>
            </section>

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

        {{-- Mobile Bottom Navigation --}}
        <nav class="mobile-bottom-nav" style="display:none;">
            @if(in_array(auth()->user()->role, ['CAR PARK MANAGER', 'Admin', 'Inhouse']))
            <a href="#" class="nav-item active" data-view="dashboard">
                <i class="fas fa-tasks"></i>
                <span>Beranda</span>
            </a>
            @endif
            <a href="#" class="nav-item {{ in_array(auth()->user()->role, ['Supervisor', 'Leader']) ? 'active' : '' }}" data-view="history">
                <i class="fas fa-file-invoice"></i>
                <span>Laporan</span>
            </a>
            @if(in_array(auth()->user()->role, ['Supervisor', 'Leader']))
            <a href="#" class="nav-item" data-view="upload">
                <i class="fas fa-plus-circle"></i>
                <span>Buat</span>
            </a>
            @endif
            @if(auth()->user()->role === 'Admin')
            <a href="#" class="nav-item" data-view="monitoring">
                <i class="fas fa-server"></i>
                <span>Monitor</span>
            </a>
            <a href="#" class="nav-item" data-view="users">
                <i class="fas fa-users-cog"></i>
                <span>User</span>
            </a>
            @endif
            <a href="#" class="nav-item" id="mobile-logout-btn">
                <i class="fas fa-sign-out-alt"></i>
                <span>Keluar</span>
            </a>
        </nav>
        <form id="mobile-logout-form" action="{{ route('logout') }}" method="POST" style="display:none;">@csrf</form>
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
                        <select name="role" id="user-role-select" class="form-control" required>
                            <option value="Supervisor">Supervisor</option>
                            <option value="Leader">Leader</option>
                            <option value="CAR PARK MANAGER">CAR PARK MANAGER</option>
                            <option value="Inhouse">Inhouse</option>
                            <option value="Admin">Admin</option>
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

    <!-- Export Period Modal -->
    <div id="export-modal" class="overlay hidden">
        <div class="glass-card animate-slide-up" style="max-width: 400px; width: 90%;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="margin:0;"><i class="fas fa-file-excel" style="color:#059669;"></i> Export Periode</h3>
                <button type="button" class="btn-icon" onclick="document.getElementById('export-modal').classList.add('hidden')">×</button>
            </div>
            <div class="form-group">
                <label>Tanggal Mulai</label>
                <input type="date" id="export-start-date" class="form-control" value="{{ date('Y-m-01') }}">
            </div>
            <div class="form-group">
                <label>Tanggal Selesai</label>
                <input type="date" id="export-end-date" class="form-control" value="{{ date('Y-m-d') }}">
            </div>
            <div style="margin-top: 24px; display: flex; gap: 12px;">
                <button onclick="app.processExport()" class="btn-primary" style="flex:1; background:#059669; border:none;">Download Excel</button>
                <button onclick="document.getElementById('export-modal').classList.add('hidden')" class="btn-secondary" style="flex:1;">Batal</button>
            </div>
        </div>
    </div>

    <!-- PDF Print Preview Modal -->
    <div id="print-modal" class="overlay hidden">
        <div style="background:white; width:90%; max-width:820px; max-height:90vh; border-radius:16px; display:flex; flex-direction:column; overflow:hidden; box-shadow: 0 25px 60px rgba(0,0,0,0.25);">
            <div style="padding:16px 24px; border-bottom:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center; background:#f8fafc;">
                <h3 style="font-size:1rem; font-weight:800; color:#0f172a;">Preview Laporan Harian</h3>
                <div style="display:flex; gap:8px;">
                    <button onclick="app.downloadPDF()" class="btn-primary" style="padding:8px 20px; width:auto; background: #dc2626;">
                        <i class="fas fa-file-pdf"></i> Simpan PDF
                    </button>
                    <button id="btn-do-print" class="btn-primary" style="padding:8px 20px; width:auto; background: var(--primary);">
                        <i class="fas fa-print"></i> Cetak
                    </button>
                    <button class="btn-secondary" onclick="document.getElementById('print-modal').classList.add('hidden')" style="padding:8px 16px;">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            <div style="overflow-y:auto; padding:24px; flex:1;">
                <div id="print-content" style="font-family: Arial, sans-serif; font-size:11pt; color:#000; max-width:720px; margin:0 auto;"></div>
            </div>
        </div>
    </div>

    <!-- Custom Confirm Modal -->
    <div id="confirm-modal" class="overlay hidden">
        <div class="glass-card animate-fade-in" style="max-width: 400px; width: 90%; text-align: center; border-top: 5px solid var(--error);">
            <div style="font-size: 3rem; color: var(--error); margin-bottom: 16px;">
                <i class="fas fa-exclamation-circle"></i>
            </div>
            <h3 style="margin-bottom: 12px; color: var(--primary);">Apakah Anda Yakin?</h3>
            <p id="confirm-message" style="color: var(--text-dim); margin-bottom: 24px; line-height: 1.5;"></p>
            <div style="display: flex; gap: 12px;">
                <button id="confirm-yes" class="btn-primary" style="background: var(--error); flex: 1;">Ya, Hapus</button>
                <button id="confirm-no" class="btn-secondary" style="flex: 1;">Batal</button>
            </div>
        </div>
    </div>

    <div id="toast-container"></div>
    
    <!-- Global Loader -->
    <div id="global-loader" class="overlay hidden">
        <div class="glass-card" style="text-align:center; padding:30px;">
            <div class="loader-spinner" style="margin: 0 auto 15px;"></div>
            <p style="font-weight:700; color:var(--primary);">Memuat Data...</p>
        </div>
    </div>

    <!-- Upload Schedule Modal -->
    <div id="modal-upload-schedule" class="overlay hidden">
        <div class="glass-card animate-slide-up" style="max-width: 500px; width: 90%; position: relative;">
            <button onclick="document.getElementById('modal-upload-schedule').classList.add('hidden')" style="position: absolute; right: 20px; top: 20px; background: none; border: none; font-size: 1.5rem; color: var(--text-dim); cursor: pointer;">&times;</button>
            <h3 style="margin-bottom: 20px; color: var(--primary);"><i class="fas fa-calendar-plus" style="color: var(--accent); margin-right: 10px;"></i> Upload Jadwal Bulanan</h3>
            <p style="font-size: 0.9rem; color: var(--text-dim); margin-bottom: 20px;">
                Unggah file Excel jadwal bulanan. Sistem akan otomatis merekap Man Power untuk setiap shift berdasarkan tanggal.
            </p>
            <div class="form-group">
                <label>Bulan (YYYY-MM)</label>
                <input type="month" id="schedule-month" required>
            </div>
            <div class="form-group" style="margin-bottom: 24px;">
                <label>File Excel (.xlsx)</label>
                <input type="file" id="schedule-file" accept=".xlsx, .xls" style="padding: 10px; background: #f8fafc;">
            </div>
            <button id="btn-process-schedule" class="btn-primary" style="width: 100%;"><i class="fas fa-upload"></i> Proses & Simpan Jadwal</button>
        </div>
    </div>

    <!-- Scripts -->
    <script src="https://unpkg.com/jszip@3.10.1/dist/jszip.min.js"></script>
    <script src="https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/signature_pad@4.1.7/dist/signature_pad.umd.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
    <script src="{{ asset('js/app.js') }}?v={{ time() }}"></script>
    <script defer src="/_vercel/insights/script.js"></script>
</body>
</html>
