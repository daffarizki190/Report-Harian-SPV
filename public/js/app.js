// SPV Report - Main App Logic (Premium Version)
const app = {
    currentView: 'dashboard',
    reports: [],

    init() {
        this.bindEvents();
        this.updateDate();
        this.applyRolePermissions();
        this.refreshData();
        
        // Auto-refresh stats every 5 minutes
        setInterval(() => this.loadStats(), 300000);
    },

    applyRolePermissions() {
        const user = window.Laravel?.user;
        if (!user) return;

        // Guard: elemen mungkin tidak ada tergantung layout
        const nameEl = document.getElementById('user-name');
        const roleEl = document.getElementById('user-role');
        if (nameEl) nameEl.textContent = user.name;
        if (roleEl) roleEl.textContent = user.role;

        const spvOnlyElements = document.querySelectorAll('.restricted-spv');
        spvOnlyElements.forEach(el => {
            if (user.role !== 'Supervisor' && user.role !== 'Admin') {
                el.style.display = 'none';
            }
        });
    },

    bindEvents() {
        // Navigation (Sidebar & Mobile)
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const view = item.dataset.view;
                if (!view) return; // Allow logout form to work
                
                e.preventDefault();
                e.stopPropagation();
                
                this.switchView(view);
                
                if (view === 'upload' && window.formDigital) {
                    window.formDigital.resetForm();
                }

                // Update active class on all nav instances (Sidebar & Mobile)
                document.querySelectorAll(`.nav-item`).forEach(i => {
                    i.classList.toggle('active', i.dataset.view === view);
                });
            });
        });

        // Tab / Method Toggles
        document.querySelectorAll('.method-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.method-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                const method = btn.dataset.method;
                const isForm = method === 'form';

                // Hide/show digital form wrapper vs upload form extras
                const digitalWrapper = document.getElementById('digital-form-wrapper');
                const uploadMetaFields = document.getElementById('upload-meta-fields');
                const uploadDescField  = document.getElementById('upload-desc-field');
                const submitUploadBtn  = document.getElementById('btn-submit-upload');

                if (digitalWrapper) digitalWrapper.classList.toggle('hidden', !isForm);
                if (uploadMetaFields) uploadMetaFields.classList.toggle('hidden', isForm);
                if (uploadDescField)  uploadDescField.classList.toggle('hidden', isForm);
                if (submitUploadBtn)  submitUploadBtn.classList.toggle('hidden', isForm);

                // Toggle between file/manual containers
                document.querySelectorAll('.method-content').forEach(c => {
                    c.classList.add('hidden');
                    c.classList.remove('active');
                });
                const container = document.getElementById(`method-${method}-container`);
                if (container) {
                    container.classList.remove('hidden');
                    container.classList.add('active');
                }

                if (method === 'form') {
                    if (window.formDigital) window.formDigital.initSignaturePads();
                }
            });
        });

        // Filters
        document.getElementById('filter-start-date')?.addEventListener('change', () => this.loadReports());
        document.getElementById('filter-end-date')?.addEventListener('change', () => this.loadReports());
        document.getElementById('filter-shift')?.addEventListener('change', () => this.loadReports());

        // Refresh Button
        document.getElementById('btn-refresh')?.addEventListener('click', () => {
            this.refreshData();
            this.showToast('Data diperbarui', 'info');
        });

        // Export & Download
        document.getElementById('btn-export-excel')?.addEventListener('click', () => this.handleExportExcel());
        document.getElementById('btn-bulk-zip')?.addEventListener('click', () => this.handleBulkDownload());

        // Upload Form
        const uploadForm = document.getElementById('upload-form');
        if (uploadForm) {
            uploadForm.addEventListener('submit', (e) => this.handleUpload(e));
        }

        // File Drop Zone
        const dropZone = document.getElementById('drop-zone');
        const fileInput = document.getElementById('file-input');

        if (dropZone) {
            dropZone.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropZone.style.borderColor = 'var(--primary)';
                dropZone.style.background = 'rgba(139, 92, 246, 0.1)';
            });
            fileInput.addEventListener('change', () => {
                if (fileInput.files.length) {
                    dropZone.querySelector('p').textContent = fileInput.files[0].name;
                    dropZone.classList.add('has-file');
                }
            });
        }

        // Purge Events
        document.getElementById('btn-purge-range')?.addEventListener('click', () => this.handlePurge(false));
        document.getElementById('btn-purge-all')?.addEventListener('click', () => this.handlePurge(true));
    },

    updateDate() {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const el = document.getElementById('current-date');
        if (el) el.textContent = new Date().toLocaleDateString('id-ID', options);
    },

    switchView(viewId) {
        if (!viewId) return;
        this.currentView = viewId;
        document.querySelectorAll('.view-section').forEach(sec => {
            sec.classList.remove('active');
            sec.classList.add('hidden');
        });

        const activeSec = document.getElementById(`view-${viewId}`);
        if (activeSec) {
            activeSec.classList.remove('hidden');
            activeSec.classList.add('active');
            
            // Re-trigger animation
            activeSec.classList.remove('animate-fade-in');
            void activeSec.offsetWidth; // trigger reflow
            activeSec.classList.add('animate-fade-in');
        }

        const titles = {
            'dashboard': 'Dashboard Overview',
            'upload': 'Upload Laporan Harian',
            'history': 'Riwayat Laporan',
            'users': 'User Management'
        };
        document.getElementById('view-title').textContent = titles[viewId] || 'System';
        
        // Refresh data when switching back to dashboard or history
        if (viewId === 'dashboard' || viewId === 'history') {
            this.refreshData();
        }
        if (viewId === 'users') {
            this.loadUsers();
        }
    },

    async loadUsers() {
        const tableBody = document.querySelector('#users-table tbody');
        if (!tableBody) return;

        tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center">Memuat user...</td></tr>';

        try {
            const response = await fetch(`${window.Laravel.baseUrl}/v1/users`);
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.message || `Server error: ${response.status}`);
            }
            const data = await response.json();
            
            // Pastikan tabel benar-benar kosong sebelum render ulang
            tableBody.innerHTML = '';
            if (data.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center">Tidak ada user ditemukan.</td></tr>';
                return;
            }

            data.forEach(user => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${user.name}</td>
                    <td>${user.username}</td>
                    <td><span class="badge ${(user.role || '').toLowerCase()}">${user.role || 'User'}</span></td>
                    <td>
                        <button class="btn-icon" onclick="app.showUserForm(${JSON.stringify(user).replace(/"/g, '&quot;')})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon" onclick="app.deleteUser(${user.id})" style="color:var(--error)">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                `;
                tableBody.appendChild(tr);
            });
        } catch (e) {
            console.error('Load users error:', e);
            tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--error)">Gagal memuat data: ${e.message}</td></tr>`;
        }
    },

    showUserForm(user = null) {
        const modal = document.getElementById('user-modal');
        const form = document.getElementById('user-form');
        const title = document.getElementById('user-modal-title');
        
        form.reset();
        document.getElementById('user-id').value = user ? user.id : '';
        title.textContent = user ? 'Edit User' : 'Tambah User';

        if (user) {
            document.getElementById('user-name-input').value = user.name;
            document.getElementById('user-username-input').value = user.username;
            document.getElementById('user-role-input').value = user.role;
        }

        modal.classList.remove('hidden');

        // Bind form submit once
        form.onsubmit = async (e) => {
            e.preventDefault();
            const btn = form.querySelector('button[type="submit"]');
            const originalHtml = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';

            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());

            try {
                const response = await fetch(`${window.Laravel.baseUrl}/v1/users`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': window.Laravel.csrfToken
                    },
                    body: JSON.stringify(data)
                });

                const contentType = response.headers.get('content-type') || '';
                if (!contentType.includes('application/json')) {
                    throw new Error('Server error saat menyimpan user');
                }
                const result = await response.json();
                if (response.ok) {
                    this.showToast(result.message, 'success');
                    modal.classList.add('hidden');
                    this.loadUsers();
                } else {
                    this.showToast(result.message, 'error');
                }
            } catch (e) { 
                console.error('Save user error:', e); 
                this.showToast('Gagal menyimpan user', 'error');
            } finally {
                btn.disabled = false;
                btn.innerHTML = originalHtml;
            }
        };
    },

    async deleteUser(id) {
        if (!confirm('Hapus user ini secara permanen?')) return;

        try {
            const response = await fetch(`${window.Laravel.baseUrl}/v1/users/${id}`, {
                method: 'DELETE',
                headers: {
                    'X-CSRF-TOKEN': window.Laravel.csrfToken
                }
            });

            const contentType = response.headers.get('content-type') || '';
            if (!contentType.includes('application/json')) {
                throw new Error('Server error saat menghapus user');
            }
            const result = await response.json();
            if (response.ok) {
                this.showToast(result.message, 'success');
                this.loadUsers();
            } else {
                this.showToast(result.message, 'error');
            }
        } catch (e) { console.error('Delete user error:', e); }
    },

    refreshData() {
        this.loadReports();
        this.loadStats();
        this.loadLogs();
    },

    async loadStats() {
        const totalEl = document.getElementById('stat-total');
        const todayEl = document.getElementById('stat-today');
        
        if (!totalEl || !todayEl) return;

        try {
            const response = await fetch(`${window.Laravel.baseUrl}/v1/reports/stats`);
            const contentType = response.headers.get('content-type') || '';
            
            if (!response.ok || !contentType.includes('application/json')) {
                console.error('Gagal memuat statistik:', response.status);
                return;
            }

            const data = await response.json();
            totalEl.textContent = data.total || 0;
            todayEl.textContent = data.today || 0;
        } catch (e) { console.error('Stats error:', e); }
    },

    async loadLogs() {
        const tableBody = document.querySelector('#logs-table tbody');
        if (!tableBody) return;

        try {
            const response = await fetch(`${window.Laravel.baseUrl}/v1/reports/logs`);
            const contentType = response.headers.get('content-type') || '';
            if (!response.ok || !contentType.includes('application/json')) {
                throw new Error('Gagal memuat log');
            }
            const data = await response.json();
            
            tableBody.innerHTML = '';
            data.forEach(log => {
                const tr = document.createElement('tr');
                const date = new Date(log.created_at).toLocaleString('id-ID', {hour: '2-digit', minute:'2-digit'});
                tr.innerHTML = `
                    <td style="font-weight:700; color:var(--primary)">${log.user_name}</td>
                    <td><span class="badge ${(log.action || '').toLowerCase().replace(' ', '-')}">${log.action || 'Unknown'}</span></td>
                    <td style="font-size:0.8rem; color:var(--text-dim)">${date}</td>
                `;
                tableBody.appendChild(tr);
            });
        } catch (e) { console.error('Logs error:', e); }
    },

    async loadReports() {
        const tableBody = document.querySelector('#reports-table tbody');
        const historyBody = document.querySelector('#reports-history-table tbody');
        
        if (!tableBody && !historyBody) return;

        const startDate = document.getElementById('filter-start-date')?.value || '';
        const endDate = document.getElementById('filter-end-date')?.value || '';
        const shiftFilter = document.getElementById('filter-shift')?.value || '';

        const loadingMsg = '<tr><td colspan="5" style="text-align:center">Memuat laporan...</td></tr>';
        if (tableBody) tableBody.innerHTML = loadingMsg;
        if (historyBody) historyBody.innerHTML = loadingMsg;

        try {
            const response = await fetch(`${window.Laravel.baseUrl}/v1/reports?start_date=${startDate}&end_date=${endDate}&shift=${shiftFilter}`);

            const contentType = response.headers.get('content-type') || '';
            if (!response.ok || !contentType.includes('application/json')) {
                const text = await response.text();
                console.error('Gagal memuat laporan:', response.status, text.substring(0, 200));
                const errMsg = `<tr><td colspan="5" style="text-align:center; color: var(--error)">Gagal memuat data (${response.status}).</td></tr>`;
                if (tableBody) tableBody.innerHTML = errMsg;
                if (historyBody) historyBody.innerHTML = errMsg;
                return;
            }

            const data = await response.json();
            this.reports = data;

            if (tableBody) tableBody.innerHTML = '';
            if (historyBody) historyBody.innerHTML = '';

            if (this.reports.length === 0) {
                const emptyMsg = '<tr><td colspan="5" style="text-align:center">Tidak ada laporan ditemukan.</td></tr>';
                if (tableBody) tableBody.innerHTML = emptyMsg;
                if (historyBody) historyBody.innerHTML = emptyMsg;
                return;
            }

            this.reports.forEach(row => {
                const tr = document.createElement('tr');
                const safeContent = row.manual_content ? btoa(unescape(encodeURIComponent(row.manual_content))) : '';
                const isImage = row.file_url && /\.(jpg|jpeg|png|gif|webp)$/i.test(row.file_url);
                
                tr.innerHTML = `
                    <td>${row.spv_name}</td>
                    <td>${row.report_date}</td>
                    <td><span class="badge ${(row.shift || '').toLowerCase()}">${row.shift || '-'}</span></td>
                    <td>${row.description || (row.manual_content ? 'Manual Input' : '-')}</td>
                    <td>
                        <div style="display:flex; gap:8px; align-items: center;">
                            ${row.file_url ? `
                                ${isImage ? `
                                    <div class="img-preview-mini" onclick="window.open('${row.file_url}', '_blank')" title="Klik untuk memperbesar">
                                        <img src="${row.file_url}" alt="preview">
                                    </div>
                                ` : ''}
                                <button class="btn-icon" title="Lihat" onclick="window.open('${row.file_url}', '_blank')">
                                    <i class="fas ${isImage ? 'fa-search-plus' : 'fa-eye'}"></i>
                                </button>
                                <a href="${row.file_url}" class="btn-icon" title="Unduh" download><i class="fas fa-download"></i></a>
                            ` : row.form_data ? `
                                <button class="btn-icon" title="Lihat" onclick="app.viewDigitalForm(${row.id})">
                                    <i class="fas fa-eye" style="color:var(--accent)"></i>
                                </button>
                                <button class="btn-icon" title="Edit / TTD" onclick="app.editDigitalForm(${row.id})">
                                    <i class="fas fa-pen-nib" style="color:var(--success)"></i>
                                </button>
                            ` : safeContent ? `
                                <button class="btn-icon" title="Lihat Isi" onclick="app.viewManualContent('${safeContent}')"><i class="fas fa-file-alt"></i></button>
                            ` : '<span style="color:var(--text-dim);font-size:0.8rem">-</span>'}
                        </div>
                    </td>
                `;
                if (tableBody) tableBody.appendChild(tr.cloneNode(true));
                if (historyBody) historyBody.appendChild(tr);
            });
        } catch (error) {
            console.error('Error loading reports:', error);
            const errHtml = '<tr><td colspan="5" style="text-align:center; color: var(--error)">Gagal memuat data. Periksa koneksi.</td></tr>';
            if (tableBody) tableBody.innerHTML = errHtml;
            if (historyBody) historyBody.innerHTML = errHtml;
        }
    },

    viewManualContent(base64Content) {
        const content = atob(base64Content);
        document.getElementById('modal-content-body').textContent = content;
        document.getElementById('manual-modal').classList.remove('hidden');
    },

    viewDigitalForm(id) {
        const report = this.reports.find(r => r.id === id);
        if (!report || !report.form_data) return;

        // Load data into hidden digital form fields temporarily to reuse preview logic
        // or just pass data directly to openPrintPreview
        
        // We need to make sure the date and name fields match the report being viewed
        const dfDate = document.getElementById('df-tanggal');
        const dfName = document.getElementById('df-nama');
        const dfShift = document.getElementById('df-shift');
        const dfBriefing = document.getElementById('df-briefing');
        const dfTraining = document.getElementById('df-training');

        // Backup current form state if any
        const backup = {
            date: dfDate?.value,
            name: dfName?.value,
            shift: dfShift?.value,
            briefing: dfBriefing?.value,
            training: dfTraining?.value
        };

        // Set temporary values for preview
        if (dfDate) dfDate.value = report.report_date;
        if (dfName) dfName.value = report.spv_name;
        if (dfShift) dfShift.value = report.shift;
        if (dfBriefing) dfBriefing.value = report.form_data.briefing || '';
        if (dfTraining) dfTraining.value = report.form_data.training || '';

        // Manpower
        const mp_jabatan = ['Car Park Manager','IT','Administrasi','Supervisor','Leader','Staff'];
        mp_jabatan.forEach(j => {
            const inp = document.querySelector(`.mp-input[data-jabatan="${j}"]`);
            const inpMid = document.querySelector(`.mp-input-middle[data-jabatan="${j}"]`);
            if (inp) inp.value = report.form_data.manpower[j] || '';
            if (inpMid) inpMid.value = report.form_data.manpower[j + '_middle'] || '';
        });
        
        // Update totals
        if (window.formDigital) {
            window.formDigital.calcTotal();
            
            // We also need to handle Ploting, Perlengkapan, and Spesifikasi
            // This is getting complex, maybe formDigital.openPrintPreview should take data as argument
            
            // For now, let's just call openPrintPreview with the report data
            // I'll modify openPrintPreview to accept an optional data argument
            window.formDigital.openPrintPreview(report.form_data, report);
        }

        // Restore backup after a short delay (enough for preview to generate)
        setTimeout(() => {
            if (dfDate) dfDate.value = backup.date;
            if (dfName) dfName.value = backup.name;
            if (dfShift) dfShift.value = backup.shift;
            if (dfBriefing) dfBriefing.value = backup.briefing;
            if (dfTraining) dfTraining.value = backup.training;
            // Restore manpower (optional, usually SPV will refresh anyway)
        }, 500);
    },

    handleExportExcel() {
        try {
            if (!this.reports || this.reports.length === 0) {
                return this.showToast('Tidak ada data untuk diekspor', 'error');
            }
            
            this.showToast('Menyiapkan file Excel...', 'info');

            const data = this.reports.map((r, index) => ({
                'No': index + 1,
                'Nama Supervisor': r.spv_name,
                'Tanggal Laporan': r.report_date,
                'Shift': r.shift,
                'Keterangan': r.description || '-',
                'Laporan Manual': r.manual_content || '-',
                'Link Lampiran': r.file_url ? 'KLIK DISINI' : '-',
                'Waktu Input (WIB)': new Date(r.created_at).toLocaleString('id-ID')
            }));

            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Laporan Daily SPV");

            // Atur lebar kolom agar rapi
            ws['!cols'] = [
                { wch: 5 },  // No
                { wch: 25 }, // Nama
                { wch: 15 }, // Tanggal
                { wch: 10 }, // Shift
                { wch: 30 }, // Keterangan
                { wch: 50 }, // Isi Manual
                { wch: 20 }, // Link Lampiran
                { wch: 20 }  // Waktu Input
            ];

            // Tambahkan Hyperlink ke kolom Link Lampiran (Kolom Index 6 / 'G')
            const range = XLSX.utils.decode_range(ws['!ref']);
            for (let R = range.s.r + 1; R <= range.e.r; ++R) {
                const cellRef = XLSX.utils.encode_cell({r: R, c: 6});
                const report = this.reports[R - 1]; 
                if (ws[cellRef] && ws[cellRef].v === 'KLIK DISINI' && report && report.file_url) {
                    ws[cellRef].l = { 
                        Target: report.file_url, 
                        Tooltip: "Klik untuk membuka lampiran" 
                    };
                    // Tambahkan styling agar terlihat seperti link (opsional, xlsx dasar tidak mendukung style penuh)
                    ws[cellRef].s = { font: { color: { rgb: "0000FF" }, underline: true } };
                }
            }

            XLSX.writeFile(wb, `Laporan_SPV_GandariaCity_${new Date().toISOString().split('T')[0]}.xlsx`);
            
            this.showToast('Excel berhasil diunduh', 'success');
        } catch (error) {
            console.error('Excel Export Error:', error);
            this.showToast('Gagal mengekspor Excel: ' + error.message, 'error');
        }
    },

    async handleBulkDownload() {
        const startDate = document.getElementById('filter-start-date')?.value || '';
        const endDate = document.getElementById('filter-end-date')?.value || '';
        const shiftFilter = document.getElementById('filter-shift')?.value || '';

        this.showToast('Sedang membuat ZIP di server...', 'info');
        
        try {
            const url = `/v1/reports/zip?start_date=${startDate}&end_date=${endDate}&shift=${shiftFilter}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                const contentType = response.headers.get('content-type') || '';
                if (contentType.includes('application/json')) {
                    const err = await response.json();
                    throw new Error(err.message || 'Gagal membuat ZIP');
                }
                throw new Error('Server error saat membuat ZIP');
            }

            const blob = await response.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `Batch_Laporan_SPV_${new Date().toISOString().split('T')[0]}.zip`;
            link.click();
            this.showToast('ZIP berhasil diunduh', 'success');
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    },

    async handleUpload(e) {
        e.preventDefault();
        const btn = document.getElementById('btn-submit-upload');
        const btnText = btn.querySelector('.btn-text');
        const wave = btn.querySelector('.dots-wave');

        const formData = new FormData(e.target);
        const method = document.querySelector('.method-btn.active').dataset.method;
        
        if (method === 'file' && !formData.get('report_file')?.size) {
            return this.showToast('Pilih file PDF terlebih dahulu', 'error');
        }
        if (method === 'manual' && !formData.get('manual_content')?.trim()) {
            return this.showToast('Ketik isi laporan terlebih dahulu', 'error');
        }

        // UI Feedback
        if (btnText) btnText.classList.add('hidden');
        if (wave) wave.classList.remove('hidden');
        btn.disabled = true;

        try {
            const response = await fetch(`${window.Laravel.baseUrl}/v1/reports`, {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': window.Laravel.csrfToken,
                    'Accept': 'application/json'
                },
                body: formData
            });

            const contentType = response.headers.get('content-type') || '';
            if (!contentType.includes('application/json')) {
                throw new Error('Server error saat upload');
            }
            const result = await response.json();

            if (response.ok) {
                this.showToast('Laporan berhasil disimpan!', 'success');
                e.target.reset();
                const dropZone = document.getElementById('drop-zone');
                if (dropZone) {
                    dropZone.querySelector('p').textContent = 'Tarik file PDF ke sini atau Klik untuk pilih';
                    dropZone.classList.remove('has-file');
                }
                this.switchView('dashboard');
            } else {
                this.showToast('Gagal: ' + (result.message || 'Terjadi kesalahan'), 'error');
            }
        } catch (error) {
            console.error('Upload error:', error);
            this.showToast('Gagal terhubung ke server', 'error');
        } finally {
            this.resetUploadBtn();
        }
    },

    resetUploadBtn() {
        const btn = document.getElementById('btn-submit-upload');
        if (btn) {
            const btnText = btn.querySelector('.btn-text');
            const wave = btn.querySelector('.dots-wave');
            if (btnText) btnText.classList.remove('hidden');
            if (wave) wave.classList.add('hidden');
            btn.disabled = false;
        }
    },

    editDigitalForm(id) {
        const report = this.reports.find(r => r.id === id);
        if (!report || !report.form_data) return;

        // 1. Reset & Switch View
        if (window.formDigital) window.formDigital.resetForm();
        this.switchView('upload');
        const formBtn = document.querySelector('.method-btn[data-method="form"]');
        if (formBtn) formBtn.click();

        // 2. Populate ID & Metadata
        document.getElementById('df-report-id').value = report.id;
        document.getElementById('df-tanggal').value   = report.report_date;
        document.getElementById('df-nama').value      = report.spv_name;
        document.getElementById('df-shift').value     = report.shift;

        const data = report.form_data;

        // 3. Populate Manpower
        if (data.manpower) {
            Object.keys(data.manpower).forEach(key => {
                const isMiddle = key.endsWith('_middle');
                const baseKey = isMiddle ? key.replace('_middle', '') : key;
                const selector = isMiddle ? `.mp-input-middle[data-jabatan="${baseKey}"]` : `.mp-input[data-jabatan="${baseKey}"]`;
                const inp = document.querySelector(selector);
                if (inp) inp.value = data.manpower[key] || '';
            });
            if (window.formDigital) window.formDigital.calcTotal();
        }

        // 4. Populate Ploting
        const plotBody = document.getElementById('ploting-tbody');
        if (plotBody) {
            plotBody.innerHTML = '';
            (data.ploting || []).forEach(p => {
                window.formDigital.addPlotingRow();
                const lastRow = plotBody.lastElementChild;
                if (lastRow) {
                    lastRow.querySelector('.ploting-area').value = p.area;
                    lastRow.querySelector('.ploting-petugas').value = p.petugas;
                }
            });
        }

        // 5. Populate Perlengkapan
        if (data.perlengkapan) {
            data.perlengkapan.forEach(p => {
                const tr = Array.from(document.querySelectorAll('#tbl-perlengkapan tbody tr')).find(r => r.querySelector('td:nth-child(2)')?.textContent?.trim() === p.nama);
                if (tr) {
                    const inpJml = tr.querySelector('.perlen-jumlah');
                    const radio  = tr.querySelector(`.perlen-kondisi[value="${p.kondisi}"]`);
                    const inpKet = tr.querySelector('.perlen-ket');
                    if (inpJml) inpJml.value = p.jumlah;
                    if (radio)  radio.checked = true;
                    if (inpKet) inpKet.value = p.keterangan;
                }
            });
        }

        // 6. Briefing & Training
        if (document.getElementById('df-briefing')) document.getElementById('df-briefing').value = data.briefing || '';
        if (document.getElementById('df-training')) document.getElementById('df-training').value = data.training || '';

        // 7. Spesifikasi
        const specBody = document.getElementById('spesifikasi-tbody');
        if (specBody) {
            specBody.innerHTML = '';
            (data.spesifikasi || []).forEach(s => {
                window.formDigital.addSpesifikasiRow();
                const lastRow = specBody.lastElementChild;
                if (lastRow) {
                    lastRow.querySelector('.spec-jenis').value = s.jenis;
                    lastRow.querySelector('.spec-waktu').value = s.waktu;
                    lastRow.querySelector('.spec-detail').value = s.detail;
                    lastRow.querySelector('.spec-tindakan').value = s.tindakan;
                    lastRow.querySelector('.spec-status').value = s.status;
                }
            });
        }

        // 8. Signatures
        if (window.formDigital) {
            window.formDigital.loadExistingSignatures(data.signatures || {});
        }

        this.showToast('Data laporan dimuat untuk diedit / tanda tangan.', 'info');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    async handlePurge(all) {
        console.log('handlePurge triggered, all:', all);
        const startDate = document.getElementById('purge-start')?.value;
        const endDate = document.getElementById('purge-end')?.value;

        if (!all && !startDate && !endDate) {
            return this.showToast('Pilih range tanggal terlebih dahulu', 'error');
        }

        const confirmMsg = all 
            ? 'PERINGATAN: Anda akan menghapus SELURUH data laporan. Tindakan ini tidak dapat dibatalkan.' 
            : `Hapus laporan dari ${startDate || 'awal'} s/d ${endDate || 'akhir'}?`;

        this.showConfirm(confirmMsg, async () => {
            try {
                const response = await fetch(`${window.Laravel.baseUrl}/v1/reports/purge`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': window.Laravel.csrfToken
                    },
                    body: JSON.stringify({
                        start_date: startDate,
                        end_date: endDate,
                        all: all
                    })
                });

                const contentType = response.headers.get('content-type') || '';
                if (!contentType.includes('application/json')) {
                    throw new Error('Server error saat menghapus data');
                }
                const result = await response.json();
                if (response.ok) {
                    this.showToast(result.message, 'success');
                    this.refreshData();
                } else {
                    this.showToast(result.message || 'Gagal menghapus data', 'error');
                }
            } catch (e) {
                console.error('Purge error:', e);
                this.showToast('Gagal memproses penghapusan: ' + e.message, 'error');
            }
        });
    },

    showConfirm(message, onYes) {
        const modal = document.getElementById('confirm-modal');
        const msgEl = document.getElementById('confirm-message');
        const yesBtn = document.getElementById('confirm-yes');
        const noBtn = document.getElementById('confirm-no');

        if (!modal || !msgEl) return;

        msgEl.textContent = message;
        modal.classList.remove('hidden');

        const close = () => modal.classList.add('hidden');

        yesBtn.onclick = () => {
            close();
            if (onYes) onYes();
        };

        noBtn.onclick = close;
        modal.onclick = (e) => { if (e.target === modal) close(); };
    },

    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        let icon = 'info-circle';
        if (type === 'success') icon = 'check-circle';
        if (type === 'error') icon = 'exclamation-circle';

        toast.innerHTML = `
            <i class="fas fa-${icon}"></i>
            <span>${message}</span>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'toastOut 0.3s forwards';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
};

document.addEventListener('DOMContentLoaded', () => app.init());
window.app = app;

// ============================================================
// FORM DIGITAL MODULE — Daily Report Pengawas
// ============================================================
const formDigital = {

    init() {
        this.bindManpowerAutoSum();
        this.bindFormSubmit();
        this.bindPrintPreview();
        this.initSignaturePads();
        
        window.addEventListener('resize', () => this.resizeSignaturePads());
    },

    // ── Signature Pads ──────────────────────────────────────
    initSignaturePads() {
        this.sigPads = {};
        const pads = [
            { id: 'sig-spv', key: 'spv' },
            { id: 'sig-mgr-1', key: 'mgr-1' },
            { id: 'sig-mgr-2', key: 'mgr-2' }
        ];

        pads.forEach(p => {
            const canvas = document.getElementById(p.id);
            if (canvas) {
                this.sigPads[p.key] = new SignaturePad(canvas, {
                    backgroundColor: 'rgba(255, 255, 255, 0)',
                    penColor: 'rgb(0, 0, 0)'
                });
            }
        });
        
        this.resizeSignaturePads();
    },

    resizeSignaturePads() {
        if (!this.sigPads) return;
        
        Object.keys(this.sigPads).forEach(key => {
            const pad = this.sigPads[key];
            const canvas = pad.canvas;
            if (canvas && canvas.offsetParent !== null) { // Only resize visible canvases
                const ratio =  Math.max(window.devicePixelRatio || 1, 1);
                const data = pad.toData(); // Save existing signature
                
                canvas.width = canvas.offsetWidth * ratio;
                canvas.height = canvas.offsetHeight * ratio;
                canvas.getContext("2d").scale(ratio, ratio);
                
                pad.clear(); // necessary to reset internal state
                pad.fromData(data); // restore signature
            }
        });
    },

    clearSig(key) {
        if (this.sigPads && this.sigPads[key]) {
            this.sigPads[key].clear();
            // Show canvas if it was hidden by existing sig
            const canvas = document.getElementById(`sig-${key}`);
            const wrapper = canvas?.closest('.sig-pad-wrapper');
            if (wrapper) {
                const img = wrapper.querySelector('.existing-sig');
                if (img) img.remove();
                canvas.style.display = 'block';
            }
        }
    },

    loadExistingSignatures(sigs) {
        Object.keys(sigs).forEach(key => {
            const canvas = document.getElementById(`sig-${key}`);
            if (!canvas) return;
            const wrapper = canvas.closest('.sig-pad-wrapper');
            if (wrapper) {
                // Remove old img if exists
                const oldImg = wrapper.querySelector('.existing-sig');
                if (oldImg) oldImg.remove();

                const img = document.createElement('img');
                img.src = sigs[key];
                img.className = 'existing-sig';
                img.style.cssText = 'position:absolute; top:0; left:0; width:100%; height:100%; object-fit:contain; background:white;';
                wrapper.appendChild(img);
                canvas.style.display = 'none';
            }
        });
    },

    resetForm() {
        const form = document.getElementById('form-digital');
        if (!form) return;
        form.reset();
        document.getElementById('df-report-id').value = '';
        document.getElementById('ploting-tbody').innerHTML = '';
        document.getElementById('spesifikasi-tbody').innerHTML = '';
        this.addPlotingRow(); // Add 1 empty row
        this.addSpesifikasiRow(); // Add 1 empty row
        this.calcTotal();
        
        // Clear all sig pads & existing images
        if (this.sigPads) {
            Object.keys(this.sigPads).forEach(key => {
                this.clearSig(key);
            });
        }
    },

    // ── Seksi 2: Auto-Sum Manpower ──────────────────────────
    bindManpowerAutoSum() {
        document.querySelectorAll('.mp-input, .mp-input-middle').forEach(input => {
            input.addEventListener('input', () => this.calcTotal());
        });
    },

    calcTotal() {
        let totalShift = 0, totalMiddle = 0;
        document.querySelectorAll('.mp-input').forEach(inp => {
            totalShift += parseInt(inp.value || 0, 10);
        });
        document.querySelectorAll('.mp-input-middle').forEach(inp => {
            totalMiddle += parseInt(inp.value || 0, 10);
        });
        const elShift  = document.getElementById('mp-total-val');
        const elMiddle = document.getElementById('mp-total-middle');
        if (elShift)  elShift.textContent  = totalShift;
        if (elMiddle) elMiddle.textContent = totalMiddle;
    },

    // ── Seksi 3: Ploting Rows ────────────────────────────────
    addPlotingRow() {
        const tbody = document.getElementById('ploting-tbody');
        if (!tbody) return;
        const rows  = tbody.querySelectorAll('.ploting-row');
        const rowNo = rows.length + 1;
        const tr    = document.createElement('tr');
        tr.className = 'ploting-row';
        tr.innerHTML = `
            <td style="text-align:center; color:var(--text-dim); font-size:0.8rem;">${rowNo}</td>
            <td><input type="text" class="ploting-area" placeholder="Nama Area"
                style="width:100%; border:none; background:transparent; padding:4px 0; font-size:0.9rem;"></td>
            <td style="display:flex; align-items:center; gap:8px;">
                <input type="text" class="ploting-petugas" placeholder="Nama Petugas"
                    style="flex:1; border:none; background:transparent; padding:4px 0; font-size:0.9rem;">
                <button type="button" class="btn-remove-row" onclick="formDigital.removePlotingRow(this)" title="Hapus">×</button>
            </td>`;
        tbody.appendChild(tr);
        tr.querySelector('.ploting-area').focus();
    },

    removePlotingRow(btn) {
        const tr = btn.closest('tr');
        if (tr) {
            tr.remove();
            this.renumberPloting();
        }
    },

    renumberPloting() {
        document.querySelectorAll('#ploting-tbody .ploting-row').forEach((tr, i) => {
            const td = tr.querySelector('td:first-child');
            if (td) td.textContent = i + 1;
        });
    },

    // ── Seksi 6: Spesifikasi Rows ────────────────────────────
    addSpesifikasiRow() {
        const tbody = document.getElementById('spesifikasi-tbody');
        if (!tbody) return;
        const tr = document.createElement('tr');
        tr.className = 'spesifikasi-row';
        tr.innerHTML = `
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
                <button type="button" class="btn-remove-row" onclick="formDigital.removeSpesifikasiRow(this)" title="Hapus">×</button>
            </td>`;
        tbody.appendChild(tr);
        tr.querySelector('.spec-jenis').focus();
    },

    removeSpesifikasiRow(btn) {
        const tr = btn.closest('tr');
        const tbody = document.getElementById('spesifikasi-tbody');
        if (tr && tbody && tbody.querySelectorAll('.spesifikasi-row').length > 1) {
            tr.remove();
        } else {
            app.showToast('Harus ada minimal 1 baris.', 'info');
        }
    },

    // ── Kumpulkan Data Form ──────────────────────────────────
    collectData() {
        // Manpower
        const manpower = {};
        document.querySelectorAll('.mp-input').forEach(inp => {
            const val = inp.value.trim();
            manpower[inp.dataset.jabatan] = val !== '' ? parseInt(val, 10) : null;
        });
        document.querySelectorAll('.mp-input-middle').forEach(inp => {
            const val = inp.value.trim();
            const key = inp.dataset.jabatan + '_middle';
            if (val !== '') manpower[key] = parseInt(val, 10);
        });
        manpower['TOTAL']        = parseInt(document.getElementById('mp-total-val')?.textContent    || '0', 10);
        manpower['TOTAL_MIDDLE'] = parseInt(document.getElementById('mp-total-middle')?.textContent || '0', 10);

        // Ploting
        const ploting = [];
        document.querySelectorAll('#ploting-tbody .ploting-row').forEach((tr, i) => {
            const area    = tr.querySelector('.ploting-area')?.value?.trim() || '';
            const petugas = tr.querySelector('.ploting-petugas')?.value?.trim() || '';
            if (area || petugas) ploting.push({ no: i + 1, area, petugas });
        });

        // Perlengkapan
        const perlengkapan = [];
        document.querySelectorAll('#tbl-perlengkapan tbody tr').forEach((tr, i) => {
            const nama    = tr.querySelector('td:nth-child(2)')?.textContent?.trim() || '';
            const jumlah  = tr.querySelector('.perlen-jumlah')?.value?.trim() || '';
            const kondisi = tr.querySelector('.perlen-kondisi:checked')?.value || '';
            const ket     = tr.querySelector('.perlen-ket')?.value?.trim() || '';
            perlengkapan.push({ no: i + 1, nama, jumlah, kondisi, keterangan: ket });
        });

        // Briefing & Training
        const briefing = document.getElementById('df-briefing')?.value?.trim() || '';
        const training = document.getElementById('df-training')?.value?.trim() || '';

        // Spesifikasi
        const spesifikasi = [];
        document.querySelectorAll('#spesifikasi-tbody .spesifikasi-row').forEach(tr => {
            const jenis    = tr.querySelector('.spec-jenis')?.value?.trim()    || '';
            const waktu    = tr.querySelector('.spec-waktu')?.value?.trim()    || '';
            const detail   = tr.querySelector('.spec-detail')?.value?.trim()   || '';
            const tindakan = tr.querySelector('.spec-tindakan')?.value?.trim() || '';
            const status   = tr.querySelector('.spec-status')?.value           || '';
            if (jenis || detail || tindakan) spesifikasi.push({ jenis, waktu, detail, tindakan, status });
        });

        // 6. Signatures
        const signatures = {};
        if (this.sigPads) {
            Object.keys(this.sigPads).forEach(key => {
                if (!this.sigPads[key].isEmpty()) {
                    signatures[key] = this.sigPads[key].toDataURL();
                }
            });
        }

        return { 
            manpower, 
            ploting, 
            perlengkapan, 
            briefing, 
            training, 
            spesifikasi,
            signatures 
        };
    },

    // ── Submit ───────────────────────────────────────────────
    bindFormSubmit() {
        const form = document.getElementById('form-digital');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn     = document.getElementById('btn-submit-form');
            const btnText = btn?.querySelector('.btn-text-form');
            const wave    = btn?.querySelector('.dots-wave');

            // UI loading
            if (btnText) btnText.classList.add('hidden');
            if (wave)    wave.classList.remove('hidden');
            if (btn)     btn.disabled = true;

            const tanggal = document.getElementById('df-tanggal')?.value;
            const shift   = document.getElementById('df-shift')?.value;

            if (!tanggal || !shift) {
                app.showToast('Tanggal dan Shift wajib diisi.', 'error');
                this.resetSubmitBtn();
                return;
            }

            const formData = this.collectData();
            // Tambahkan metadata manual agar sinkron
            formData.metadata = {
                report_date: tanggal,
                shift: shift,
                spv_name: document.getElementById('df-nama')?.value
            };

            const report_id = document.getElementById('df-report-id')?.value;

            try {
                const res = await fetch(`${window.Laravel.baseUrl}/v1/reports/form`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': window.Laravel.csrfToken,
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                        report_id:   report_id,
                        report_date: tanggal,
                        shift:       shift,
                        form_data:   JSON.stringify(formData)
                    })
                });

                const ct = res.headers.get('content-type') || '';
                if (!ct.includes('application/json')) throw new Error('Server error saat menyimpan');
                const result = await res.json();

                if (res.ok) {
                    app.showToast('Laporan Digital berhasil disimpan! ✓', 'success');
                    this.resetForm();
                    app.refreshData();
                    app.switchView('dashboard');
                } else {
                    app.showToast('Gagal: ' + (result.message || 'Terjadi kesalahan'), 'error');
                }
            } catch (err) {
                console.error('Form digital submit error:', err);
                app.showToast('Gagal terhubung ke server.', 'error');
            } finally {
                this.resetSubmitBtn();
            }
        });
    },

    resetSubmitBtn() {
        const btn     = document.getElementById('btn-submit-form');
        const btnText = btn?.querySelector('.btn-text-form');
        const wave    = btn?.querySelector('.dots-wave');
        if (btnText) btnText.classList.remove('hidden');
        if (wave)    wave.classList.add('hidden');
        if (btn)     btn.disabled = false;
    },

    // ── PDF Print Preview ────────────────────────────────────
    bindPrintPreview() {
        document.getElementById('btn-print-preview')?.addEventListener('click', () => {
            this.openPrintPreview();
        });
        document.getElementById('btn-do-print')?.addEventListener('click', () => {
            window.print();
        });
    },

    openPrintPreview(overrideData = null, overrideMeta = null) {
        const data    = overrideData || this.collectData();
        const tanggal = overrideMeta ? overrideMeta.report_date : (document.getElementById('df-tanggal')?.value || '-');
        const nama    = overrideMeta ? overrideMeta.spv_name : (document.getElementById('df-nama')?.value || '-');
        const shift   = overrideMeta ? overrideMeta.shift : (document.getElementById('df-shift')?.value || '-');

        const fmtDate = (d) => {
            if (!d) return '-';
            const dt = new Date(d + 'T00:00:00');
            return dt.toLocaleDateString('id-ID', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
        };

        // Manpower rows
        const mp_jabatan = ['Car Park Manager','IT','Administrasi','Supervisor','Leader','Staff'];
        const mpRows = mp_jabatan.map(j => {
            const val = data.manpower[j];
            const middleVal = data.manpower[j + '_middle'];
            return `
            <tr>
                <td style="padding:5px 10px; border:1px solid #000;">${j}</td>
                <td style="padding:5px 10px; border:1px solid #000; text-align:center;">${val != null ? val : ''}</td>
                <td style="padding:5px 10px; border:1px solid #000; text-align:center; color:#7c3aed;">${middleVal != null ? middleVal : ''}</td>
            </tr>`;}).join('');

        // Ploting rows
        const plotingRows = (data.ploting || []).map(p => `
            <tr>
                <td style="padding:5px 8px; border:1px solid #000; text-align:center;">${p.no}</td>
                <td style="padding:5px 8px; border:1px solid #000;">${p.area}</td>
                <td style="padding:5px 8px; border:1px solid #000;">${p.petugas}</td>
            </tr>`).join('');

        // Perlengkapan rows
        const perlenRows = (data.perlengkapan || []).map(p => {
            const kondisiColor = p.kondisi === 'Baik' ? 'color:#16a34a;' : p.kondisi === 'Tidak Baik' ? 'color:#dc2626;' : '';
            return `<tr>
                <td style="padding:5px 8px; border:1px solid #000; text-align:center;">${p.no}</td>
                <td style="padding:5px 8px; border:1px solid #000;">${p.nama}</td>
                <td style="padding:5px 8px; border:1px solid #000; text-align:center;">${p.jumlah}</td>
                <td style="padding:5px 8px; border:1px solid #000; text-align:center; font-weight:700; ${kondisiColor}">${p.kondisi || '-'}</td>
                <td style="padding:5px 8px; border:1px solid #000;">${p.keterangan}</td>
            </tr>`;
        }).join('');

        // Spesifikasi rows
        const specRows = (data.spesifikasi && data.spesifikasi.length)
            ? data.spesifikasi.map(s => {
                const statusColor = s.status === 'Done' ? '#16a34a' : s.status === 'On Progres' ? '#d97706' : '#64748b';
                return `<tr>
                    <td style="padding:5px 8px; border:1px solid #000;">${s.jenis}</td>
                    <td style="padding:5px 8px; border:1px solid #000; text-align:center;">${s.waktu}</td>
                    <td style="padding:5px 8px; border:1px solid #000;">${s.detail}</td>
                    <td style="padding:5px 8px; border:1px solid #000;">${s.tindakan}</td>
                    <td style="padding:5px 8px; border:1px solid #000; text-align:center; font-weight:700; color:${statusColor}">${s.status}</td>
                </tr>`;}).join('')
            : '<tr><td colspan="5" style="padding:20px; border:1px solid #000; text-align:center; color:#888;">Tidak ada spesifikasi laporan</td></tr>';

        const html = `
            <div style="text-align:center; margin-bottom:16px; border-bottom:2px solid #000; padding-bottom:12px;">
                <h2 style="font-size:15pt; font-weight:bold; margin:0;">DAILY REPORT PENGAWAS - LEADER</h2>
                <p style="font-size:9pt; color:#555; margin:4px 0 0;">Gandaria City Parking Management</p>
            </div>

            <h4 style="margin:16px 0 6px; font-size:10pt;">1 &nbsp; WAKTU</h4>
            <table style="width:100%; border-collapse:collapse; font-size:10pt; margin-bottom:16px;">
                <tr>
                    <td style="padding:6px 10px; border:1px solid #000; width:30%; background:#f5f5f5; font-weight:700;">HARI / TANGGAL</td>
                    <td style="padding:6px 10px; border:1px solid #000;">${fmtDate(tanggal)}</td>
                </tr>
                <tr>
                    <td style="padding:6px 10px; border:1px solid #000; background:#f5f5f5; font-weight:700;">NAMA PENGAWAS</td>
                    <td style="padding:6px 10px; border:1px solid #000;">${nama}</td>
                </tr>
                <tr>
                    <td style="padding:6px 10px; border:1px solid #000; background:#f5f5f5; font-weight:700;">SHIFT</td>
                    <td style="padding:6px 10px; border:1px solid #000;">${shift}</td>
                </tr>
            </table>

            <h4 style="margin:16px 0 6px; font-size:10pt;">2 &nbsp; MAN POWER</h4>
            <table style="width:60%; border-collapse:collapse; font-size:10pt; margin-bottom:16px;">
                <thead><tr>
                    <th style="padding:6px 10px; border:1px solid #000; background:#f5f5f5; text-align:left;">JABATAN</th>
                    <th style="padding:6px 10px; border:1px solid #000; background:#f5f5f5; text-align:center;">SHIFT</th>
                    <th style="padding:6px 10px; border:1px solid #000; background:#f5f5f5; text-align:center; color:#7c3aed;">MIDDLE</th>
                </tr></thead>
                <tbody>${mpRows}</tbody>
                <tfoot><tr>
                    <td style="padding:6px 10px; border:1px solid #000; font-weight:800; background:#f0f9ff;">TOTAL</td>
                    <td style="padding:6px 10px; border:1px solid #000; font-weight:800; text-align:center; background:#f0f9ff;">${data.manpower['TOTAL'] || 0}</td>
                    <td style="padding:6px 10px; border:1px solid #000; font-weight:800; text-align:center; background:#f0f9ff; color:#7c3aed;">${data.manpower['TOTAL_MIDDLE'] || 0}</td>
                </tr></tfoot>
            </table>

            <h4 style="margin:16px 0 6px; font-size:10pt;">3 &nbsp; PLOTING MANPOWER</h4>
            <table style="width:100%; border-collapse:collapse; font-size:10pt; margin-bottom:16px;">
                <thead><tr>
                    <th style="padding:6px 8px; border:1px solid #000; background:#f5f5f5; width:40px;">NO</th>
                    <th style="padding:6px 8px; border:1px solid #000; background:#f5f5f5;">AREA PLOTING</th>
                    <th style="padding:6px 8px; border:1px solid #000; background:#f5f5f5;">NAMA PETUGAS</th>
                </tr></thead>
                <tbody>${plotingRows || '<tr><td colspan="3" style="padding:10px; border:1px solid #000; text-align:center;">-</td></tr>'}</tbody>
            </table>

            <h4 style="margin:16px 0 6px; font-size:10pt;">4 &nbsp; PERLENGKAPAN</h4>
            <table style="width:100%; border-collapse:collapse; font-size:10pt; margin-bottom:16px;">
                <thead><tr>
                    <th style="padding:6px 8px; border:1px solid #000; background:#f5f5f5; width:30px;">NO</th>
                    <th style="padding:6px 8px; border:1px solid #000; background:#f5f5f5;">NAMA</th>
                    <th style="padding:6px 8px; border:1px solid #000; background:#f5f5f5; width:70px; text-align:center;">JUMLAH</th>
                    <th style="padding:6px 8px; border:1px solid #000; background:#f5f5f5; width:100px; text-align:center;">KONDISI</th>
                    <th style="padding:6px 8px; border:1px solid #000; background:#f5f5f5;">KETERANGAN</th>
                </tr></thead>
                <tbody>${perlenRows}</tbody>
            </table>

            <h4 style="margin:16px 0 6px; font-size:10pt;">5 &nbsp; BRIEFING &amp; TRAINING</h4>
            <table style="width:100%; border-collapse:collapse; font-size:10pt; margin-bottom:16px;">
                <thead><tr>
                    <th style="padding:8px 12px; border:1px solid #000; background:#f5f5f5; width:50%;">MATERI BRIEFING</th>
                    <th style="padding:8px 12px; border:1px solid #000; background:#f5f5f5; width:50%;">MATERI TRAINING</th>
                </tr></thead>
                <tbody><tr>
                    <td style="padding:10px 12px; border:1px solid #000; vertical-align:top; min-height:80px; white-space:pre-wrap;">${data.briefing || ''}</td>
                    <td style="padding:10px 12px; border:1px solid #000; vertical-align:top; min-height:80px; white-space:pre-wrap;">${data.training || ''}</td>
                </tr></tbody>
            </table>

            <h4 style="margin:16px 0 6px; font-size:10pt;">6 &nbsp; SPESIFIKASI LAPORAN</h4>
            <table style="width:100%; border-collapse:collapse; font-size:10pt; margin-bottom:24px;">
                <thead><tr>
                    <th style="padding:6px 8px; border:1px solid #000; background:#f5f5f5;">JENIS LAPORAN</th>
                    <th style="padding:6px 8px; border:1px solid #000; background:#f5f5f5; width:80px;">WAKTU</th>
                    <th style="padding:6px 8px; border:1px solid #000; background:#f5f5f5;">DETAIL LAPORAN</th>
                    <th style="padding:6px 8px; border:1px solid #000; background:#f5f5f5;">TINDAKAN YANG DILAKUKAN</th>
                    <th style="padding:6px 8px; border:1px solid #000; background:#f5f5f5; width:80px; text-align:center;">STATUS</th>
                </tr></thead>
                <tbody>${specRows}</tbody>
            </table>

            <table style="width:100%; border-collapse:collapse; font-size:10pt; margin-top:32px;">
                <tr>
                    <td style="width:33%; text-align:center; padding:12px;">
                        <p style="margin:0 0 10px;">Dibuat oleh,</p>
                        <div style="height:60px; display:flex; align-items:center; justify-content:center;">
                            ${data.signatures?.spv ? `<img src="${data.signatures.spv}" style="max-height:60px;">` : '<div style="height:1px; width:100%; border-bottom:1px solid #000; margin-top:40px;"></div>'}
                        </div>
                        <p style="margin:6px 0 0; font-weight:700;">${nama}</p>
                        <p style="margin:2px 0 0; font-size:9pt; color:#555;">Supervisor / Leader</p>
                    </td>
                    <td style="width:33%; text-align:center; padding:12px;">
                        <p style="margin:0 0 10px;">Mengetahui,</p>
                        <div style="height:60px; display:flex; align-items:center; justify-content:center;">
                            ${data.signatures?.['mgr-1'] ? `<img src="${data.signatures['mgr-1']}" style="max-height:60px;">` : '<div style="height:1px; width:100%; border-bottom:1px solid #000; margin-top:40px;"></div>'}
                        </div>
                        <p style="margin:6px 0 0;">&nbsp;</p>
                        <p style="margin:2px 0 0; font-size:9pt; color:#555;">CarPark Manager</p>
                    </td>
                    <td style="width:33%; text-align:center; padding:12px;">
                        <p style="margin:0 0 10px;">Mengetahui,</p>
                        <div style="height:60px; display:flex; align-items:center; justify-content:center;">
                            ${data.signatures?.['mgr-2'] ? `<img src="${data.signatures['mgr-2']}" style="max-height:60px;">` : '<div style="height:1px; width:100%; border-bottom:1px solid #000; margin-top:40px;"></div>'}
                        </div>
                        <p style="margin:6px 0 0;">&nbsp;</p>
                        <p style="margin:2px 0 0; font-size:9pt; color:#555;">Inhouse Parking</p>
                    </td>
                </tr>
            </table>`;

        document.getElementById('print-content').innerHTML = html;
        document.getElementById('print-modal').classList.remove('hidden');
    }
};

document.addEventListener('DOMContentLoaded', () => formDigital.init());
window.formDigital = formDigital;

