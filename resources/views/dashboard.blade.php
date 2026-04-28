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
            baseUrl: '{{ url("/") }}',
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
                    <i class="fas fa-th-large"></i> Dashboard
                </a>
                @if(auth()->user()->role === 'Supervisor')
                <a href="#" class="nav-item" data-view="upload">
                    <i class="fas fa-plus-circle"></i> Buat Laporan
                </a>
                @endif

                @if(auth()->user()->role !== 'Supervisor')
                <a href="#" class="nav-item" data-view="history">
                    <i class="fas fa-history"></i> Riwayat
                </a>
                @endif
                @if(auth()->user()->role === 'Admin')
                <a href="#" class="nav-item" data-view="users">
                    <i class="fas fa-users-cog"></i> Pengguna
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
                    <button class="btn-secondary" id="btn-refresh"><i class="fas fa-sync-alt"></i></button>
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
                    <div class="glass-card stat-card animate-slide-up delay-1" style="border-left: 4px solid var(--success);">
                        <div class="stat-header">
                            <i class="fas fa-calendar-day" style="color: var(--success); background: rgba(16, 185, 129, 0.1);"></i>
                        </div>
                        <div class="stat-content">
                            <h3>Hari Ini</h3>
                            <p id="stat-today">0</p>
                        </div>
                    </div>
                    <div class="glass-card stat-card animate-slide-up delay-2" style="border-left: 4px solid var(--accent-gold);">
                        <div class="stat-header">
                            <i class="fas fa-clock" style="color: var(--accent-gold); background: rgba(251, 191, 36, 0.1);"></i>
                        </div>
                        <div class="stat-content">
                            <h3>Shift Aktif</h3>
                            <p style="font-size: 1.4rem; font-weight: 800; margin-top: 5px;">{{ $currentShift }}</p>
                        </div>
                    </div>
                    <div class="glass-card stat-card animate-slide-up delay-3" style="border-left: 4px solid #8b5cf6;">
                        <div class="stat-header">
                            <i class="fas fa-fingerprint" style="color: #8b5cf6; background: rgba(139, 92, 246, 0.1);"></i>
                        </div>
                        <div class="stat-content">
                            <h3>Akses Role</h3>
                            <p style="font-size: 1.4rem; font-weight: 800; margin-top: 5px; color: #8b5cf6;">{{ auth()->user()->role }}</p>
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

                    @if(in_array(auth()->user()->role, ['Management', 'Admin']))
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
            </section>

            <!-- Upload/Input View -->
            <section id="view-upload" class="view-section hidden">
                <div class="glass-card animate-fade-in" style="max-width: 860px; margin: 0 auto;">
                    <h3 style="margin-bottom: 24px;">Buat Laporan Baru</h3>

                    <div class="method-toggle" style="grid-template-columns: 1fr 1fr 1fr;">
                        <button type="button" class="method-btn active" data-method="file">Upload PDF/Img</button>
                        <button type="button" class="method-btn" data-method="manual">Input Manual</button>
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

                        <div id="method-manual-container" class="method-content hidden">
                            <div class="form-group">
                                <label>Isi Laporan</label>
                                <textarea name="manual_content" placeholder="Tuliskan detail laporan di sini..." style="min-height: 200px;"></textarea>
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
                                            <th style="width:50%">JABATAN</th>
                                            <th style="text-align:center; width:120px">SHIFT</th>
                                            <th style="text-align:center; width:140px">
                                                MIDDLE
                                                <span style="display:block; font-size:0.65rem; font-weight:500; color:var(--text-dim); text-transform:none; letter-spacing:0;">(opsional)</span>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        @foreach(['Car Park Manager','IT','Administrasi','Supervisor','Leader','Staff'] as $jabatan)
                                        <tr>
                                            <td>{{ $jabatan }}</td>
                                            <td style="text-align:center; padding: 8px 16px;">
                                                <input type="number" class="mp-input" data-jabatan="{{ $jabatan }}" data-col="shift"
                                                    min="0" value=""
                                                    style="width:70px; text-align:center; padding:6px 8px;">
                                            </td>
                                            <td style="text-align:center; padding: 8px 16px;">
                                                <input type="number" class="mp-input-middle" data-jabatan="{{ $jabatan }}" data-col="middle"
                                                    min="0" value=""
                                                    placeholder="-"
                                                    style="width:70px; text-align:center; padding:6px 8px; border-color: #e2e8f0;">
                                            </td>
                                        </tr>
                                        @endforeach
                                    </tbody>
                                    <tfoot>
                                        <tr class="mp-total-row">
                                            <td style="font-weight:800; padding:12px 24px;">TOTAL</td>
                                            <td style="text-align:center; font-size:1.3rem; font-weight:800; color:var(--accent); padding:12px 24px;">
                                                <span id="mp-total-val">0</span>
                                            </td>
                                            <td style="text-align:center; font-size:1.3rem; font-weight:800; color:#8b5cf6; padding:12px 24px;">
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
                                        </tr>
                                    </thead>
                                    <tbody id="ploting-tbody">
                                        @php
                                        $plotingAreas = [
                                            'Mobile Basement','Mobile MSCP','Control Room Officer 1',
                                            'Control Room Officer 2','PK Motor','Area Motor B2','Area Motor B1',
                                            'Area B2','Area B2','Area B1','Area B1','Area LG','Area LG','Area MSCP',''
                                        ];
                                        @endphp
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
                                            <th style="width:90px; text-align:center">JUMLAH</th>
                                            <th style="text-align:center; width:200px">KONDISI</th>
                                            <th>KETERANGAN</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        @php
                                        $perlengkapan = [
                                            ['Handy Talkie', 3],
                                            ['Traffic Lamp', 5],
                                            ['Jas Hujan', 1],
                                            ['Traffic Cone CP', 100],
                                            ['Sticke Cone CP', 200],
                                            ['Senter', 1],
                                        ];
                                        @endphp
                                        @foreach($perlengkapan as $idx => $item)
                                        <tr>
                                            <td style="text-align:center; color:var(--text-dim); font-size:0.8rem;">{{ $idx+1 }}</td>
                                            <td style="font-weight:600;">{{ $item[0] }}</td>
                                            <td style="text-align:center; padding:8px 12px;">
                                                <input type="number" class="perlen-jumlah" min="0"
                                                    value="{{ $item[1] }}"
                                                    style="width:70px; text-align:center; padding:6px 8px;">
                                            </td>
                                            <td style="text-align:center; padding:8px 16px;">
                                                <div class="kondisi-toggle">
                                                    <label class="kondisi-label baik">
                                                        <input type="radio" name="kondisi_{{ $idx }}" class="perlen-kondisi" value="Baik">
                                                        <span>Baik</span>
                                                    </label>
                                                    <label class="kondisi-label tidak-baik">
                                                        <input type="radio" name="kondisi_{{ $idx }}" class="perlen-kondisi" value="Tidak Baik">
                                                        <span>Tidak Baik</span>
                                                    </label>
                                                </div>
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

                        {{-- SEKSI 5: BRIEFING & TRAINING --}}
                        <div class="glass-card df-section">
                            <div class="df-section-title"><span>5</span> BRIEFING &amp; TRAINING</div>
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

                        {{-- SEKSI 6: SPESIFIKASI LAPORAN --}}
                        <div class="glass-card df-section">
                            <div class="df-section-title"><span>6</span> SPESIFIKASI LAPORAN</div>
                            <div class="table-container" style="overflow-x:auto;">
                                <table id="tbl-spesifikasi" style="min-width:700px;">
                                    <thead>
                                        <tr>
                                            <th style="min-width:140px">JENIS LAPORAN</th>
                                            <th style="width:90px">WAKTU</th>
                                            <th style="min-width:200px">DETAIL LAPORAN</th>
                                            <th style="min-width:200px">TINDAKAN YANG DILAKUKAN</th>
                                            <th style="width:110px; text-align:center">STATUS</th>
                                            <th style="width:40px"></th>
                                        </tr>
                                    </thead>
                                    <tbody id="spesifikasi-tbody">
                                        <tr class="spesifikasi-row">
                                            <td><input type="text" class="spec-jenis" placeholder="Jenis laporan..." style="width:100%; border:none; background:transparent;"></td>
                                            <td><input type="time" class="spec-waktu" style="width:100%; border:none; background:transparent; padding:4px 0;"></td>
                                            <td><input type="text" class="spec-detail" placeholder="Detail kejadian..." style="width:100%; border:none; background:transparent;"></td>
                                            <td><input type="text" class="spec-tindakan" placeholder="Tindakan dilakukan..." style="width:100%; border:none; background:transparent;"></td>
                                            <td style="text-align:center; padding:8px;">
                                                <select class="spec-status" style="width:100%; padding:5px; border-radius:6px; border:1px solid var(--border-dark); font-size:0.82rem;">
                                                    <option value="">-</option>
                                                    <option value="On Progres">On Progres</option>
                                                    <option value="Done">Done</option>
                                                </select>
                                            </td>
                                            <td style="text-align:center;">
                                                <button type="button" class="btn-remove-row" onclick="formDigital.removeSpesifikasiRow(this)" title="Hapus baris">×</button>
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
                                        @if(auth()->user()->role === 'Supervisor')
                                            <canvas id="sig-spv" class="sig-canvas"></canvas>
                                            <button type="button" class="btn-clear-sig" onclick="formDigital.clearSig('spv')">Hapus</button>
                                        @else
                                            <div class="sig-placeholder" id="sig-spv-placeholder">
                                                <i class="fas fa-signature"></i>
                                                <span>Belum TTD</span>
                                            </div>
                                        @endif
                                    </div>
                                    <p class="df-sig-name">{{ Auth::user()->name ?? '-' }}</p>
                                    <p class="df-sig-role">Supervisor / Leader</p>
                                </div>

                                {{-- Management (Mengetahui 1) --}}
                                <div class="df-signature-block">
                                    <p>Mengetahui,</p>
                                    <div class="sig-pad-wrapper">
                                        @if(auth()->user()->role === 'Management' || auth()->user()->role === 'Admin')
                                            <canvas id="sig-mgr-1" class="sig-canvas"></canvas>
                                            <button type="button" class="btn-clear-sig" onclick="formDigital.clearSig('mgr-1')">Hapus</button>
                                        @else
                                            <div class="sig-placeholder" id="sig-mgr-1-placeholder">
                                                <i class="fas fa-signature"></i>
                                                <span>Belum TTD</span>
                                            </div>
                                        @endif
                                    </div>
                                    <p class="df-sig-name">&nbsp;</p>
                                    <p class="df-sig-role">CarPark Manager</p>
                                </div>

                                {{-- Management (Mengetahui 2) --}}
                                <div class="df-signature-block">
                                    <p>Mengetahui,</p>
                                    <div class="sig-pad-wrapper">
                                        @if(auth()->user()->role === 'Management' || auth()->user()->role === 'Admin')
                                            <canvas id="sig-mgr-2" class="sig-canvas"></canvas>
                                            <button type="button" class="btn-clear-sig" onclick="formDigital.clearSig('mgr-2')">Hapus</button>
                                        @else
                                            <div class="sig-placeholder" id="sig-mgr-2-placeholder">
                                                <i class="fas fa-signature"></i>
                                                <span>Belum TTD</span>
                                            </div>
                                        @endif
                                    </div>
                                    <p class="df-sig-name">&nbsp;</p>
                                    <p class="df-sig-role">Inhouse Parking</p>
                                </div>
                            </div>
                        </div>

                        {{-- ACTIONS --}}
                        <div style="display:flex; gap:12px; margin-top: 8px; margin-bottom: 40px;">
                            <button type="button" id="btn-print-preview" class="btn-secondary" style="flex:1;">
                                <i class="fas fa-print"></i> Preview & Cetak PDF
                            </button>
                            <button type="submit" id="btn-submit-form" class="btn-primary" style="flex:2;">
                                <span class="btn-text-form"><i class="fas fa-paper-plane"></i> Simpan Laporan Digital</span>
                                <div class="dots-wave hidden"><span></span><span></span><span></span></div>
                            </button>
                        </div>
                    </form>
                </div>
            </section>

            <!-- Riwayat View -->
            <section id="view-history" class="view-section hidden">
                <div class="glass-card animate-fade-in">
                    <div class="card-header" style="margin-bottom: 24px;">
                        <h3>Riwayat Laporan</h3>
                    </div>
                    <div class="table-container">
                        <table id="reports-history-table">
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
            @if(auth()->user()->role !== 'Supervisor')
            <a href="#" class="nav-item" data-view="history"><i class="fas fa-history"></i></a>
            @endif
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

    <!-- PDF Print Preview Modal -->
    <div id="print-modal" class="overlay hidden">
        <div style="background:white; width:90%; max-width:820px; max-height:90vh; border-radius:16px; display:flex; flex-direction:column; overflow:hidden; box-shadow: 0 25px 60px rgba(0,0,0,0.25);">
            <div style="padding:16px 24px; border-bottom:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center; background:#f8fafc;">
                <h3 style="font-size:1rem; font-weight:800; color:#0f172a;">Preview Laporan Harian</h3>
                <div style="display:flex; gap:8px;">
                    <button id="btn-do-print" class="btn-primary" style="padding:8px 20px; width:auto;">
                        <i class="fas fa-print"></i> Cetak / Simpan PDF
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

    <!-- Scripts -->
    <script src="https://unpkg.com/jszip@3.10.1/dist/jszip.min.js"></script>
    <script src="https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/signature_pad@4.1.7/dist/signature_pad.umd.min.js"></script>
    <script src="{{ asset('js/app.js') }}"></script>
    <script defer src="/_vercel/insights/script.js"></script>
</body>
</html>

