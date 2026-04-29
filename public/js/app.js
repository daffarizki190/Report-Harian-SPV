// SPV Report - Main App Logic (Premium Version)
const app = {
    currentView: 'dashboard',
    reports: [],

    async init() {
        this.bindEvents();
        this.updateDate();
        this.applyRolePermissions();
        await this.refreshData();
        this.handleUrlParams();
        
        // Auto-refresh data every 30 seconds
        this.refreshInterval = setInterval(() => {
            if (document.visibilityState === 'visible' && !document.querySelector('.overlay:not(.hidden)')) {
                console.log('Background refreshing data...');
                this.refreshData();
            }
        }, 30000);
    },

    handleUrlParams() {
        const params = new URLSearchParams(window.location.search);
        const reportId = params.get('report_id');
        const autoPdf = params.get('auto_pdf');

        if (reportId) {
            console.log('Auto-opening report:', reportId);
            this.previewReport(reportId);
            if (autoPdf === '1') {
                setTimeout(() => {
                    console.log('Auto-downloading PDF...');
                    this.downloadPDF();
                }, 3000);
            }
        }
    },

    applyRolePermissions() {
        const user = window.Laravel?.user;
        if (!user) return;

        const nameEl = document.getElementById('user-name');
        const roleEl = document.getElementById('user-role');
        if (nameEl) nameEl.textContent = user.name;
        if (roleEl) roleEl.textContent = user.role;

        const spvOnlyElements = document.querySelectorAll('.restricted-spv');
        spvOnlyElements.forEach(el => {
            if (!['Supervisor', 'Leader', 'Admin'].includes(user.role)) {
                el.style.display = 'none';
            }
        });
    },

    bindEvents() {
        // Navigation
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const view = item.dataset.view;
                if (!view) return;
                e.preventDefault();
                this.switchView(view);
                
                if (view === 'upload' && window.formDigital) {
                    window.formDigital.resetForm();
                }

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

                const digitalWrapper = document.getElementById('digital-form-wrapper');
                const uploadMetaFields = document.getElementById('upload-meta-fields');
                const uploadDescField  = document.getElementById('upload-desc-field');
                const submitUploadBtn  = document.getElementById('btn-submit-upload');

                if (digitalWrapper) digitalWrapper.classList.toggle('hidden', !isForm);
                if (uploadMetaFields) uploadMetaFields.classList.toggle('hidden', isForm);
                if (uploadDescField)  uploadDescField.classList.toggle('hidden', isForm);
                if (submitUploadBtn)  submitUploadBtn.classList.toggle('hidden', isForm);

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
        document.getElementById('btn-refresh')?.addEventListener('click', () => {
            this.refreshData();
            this.showToast('Data diperbarui', 'info');
        });

        // Export
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
            });
            fileInput.addEventListener('change', () => {
                if (fileInput.files.length) {
                    dropZone.querySelector('p').textContent = fileInput.files[0].name;
                    dropZone.classList.add('has-file');
                }
            });
        }

        // Purge
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

        // Hide all sections
        document.querySelectorAll('.view-section').forEach(sec => {
            sec.classList.remove('active');
            sec.classList.add('hidden');
        });

        // Show target section
        const activeSec = document.getElementById(`view-${viewId}`);
        if (activeSec) {
            activeSec.classList.remove('hidden');
            activeSec.classList.add('active');
        }

        // Update title
        const titleEl = document.getElementById('view-title');
        if (titleEl) {
            const titles = { 
                dashboard: 'Daftar Persetujuan', 
                upload: 'Buat Laporan', 
                history: 'Daftar Laporan', 
                users: 'Manajemen Pengguna', 
                monitoring: 'Monitoring Sistem' 
            };
            titleEl.textContent = titles[viewId] || 'App';
        }

        // Load data based on view
        if (viewId === 'dashboard' || viewId === 'history') this.loadReports();
        if (viewId === 'users') this.loadUsers();
        if (viewId === 'monitoring') this.loadMonitoringData();
    },

    loadMonitoringData() {
        this.loadLogs();
        this.loadSystemInfo();
    },

    async loadSystemInfo() {
        try {
            const res = await fetch('/v1/system/info');
            const data = await res.json();
            
            const phpEl = document.getElementById('mon-php-version');
            if (phpEl) phpEl.textContent = 'PHP ' + data.server.php_version;
            
            const softEl = document.getElementById('mon-server-software');
            if (softEl) softEl.textContent = 'Software: ' + data.server.server_software;
            
            const repEl = document.getElementById('mon-db-reports');
            if (repEl) repEl.textContent = data.database.total_reports + ' Laporan';
            
            const usrEl = document.getElementById('mon-db-users');
            if (usrEl) usrEl.textContent = data.database.total_users + ' Pengguna';
            
            const rateEl = document.getElementById('mon-completion-rate');
            if (rateEl) rateEl.textContent = data.database.completion_rate + '%';
            
            const progressEl = document.getElementById('mon-progress-fill');
            if (progressEl) progressEl.style.width = data.database.completion_rate + '%';
            
            const tzEl = document.getElementById('mon-timezone');
            if (tzEl) tzEl.textContent = data.server.timezone;
            
            const drvEl = document.getElementById('mon-db-driver');
            if (drvEl) drvEl.textContent = data.database.driver;
            
            const doneEl = document.getElementById('mon-reports-done');
            if (doneEl) doneEl.textContent = data.database.stats.completed;
            
            const pendEl = document.getElementById('mon-reports-pending');
            if (pendEl) pendEl.textContent = data.database.stats.pending;
        } catch (e) { console.error('Failed to load system info', e); }
    },

    async loadLogs() {
        const body = document.getElementById('monitoring-logs-body');
        if (!body) return;
        body.innerHTML = '<tr><td colspan="5" style="text-align:center;">Memuat log...</td></tr>';

        try {
            const response = await fetch('/v1/reports/logs');
            const logs = await response.json();
            body.innerHTML = '';
            
            logs.forEach(log => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="font-weight:700;">${log.user_name}</td>
                    <td><span class="badge ${log.action.toLowerCase().includes('delete') ? 'malam' : 'pagi'}">${log.action}</span></td>
                    <td style="font-size:0.85rem; color:var(--text-dim);">${log.details || '-'}</td>
                    <td style="font-family:monospace; font-size:0.8rem;">${log.ip_address || '-'}</td>
                    <td style="font-size:0.8rem;">${new Date(log.created_at).toLocaleString('id-ID')}</td>
                `;
                body.appendChild(tr);
            });
        } catch (e) {
            body.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--error);">Gagal memuat log.</td></tr>';
        }
    },

    async loadUsers() {
        const tableBody = document.querySelector('#users-table tbody');
        if (!tableBody) return;
        tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center">Memuat user...</td></tr>';
        try {
            const response = await fetch(`${window.Laravel.baseUrl}/v1/users`);
            const data = await response.json();
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
                    <td><span class="badge ${(user.role || '').toLowerCase()}">${user.role}</span></td>
                    <td>
                        <button class="btn-icon" onclick="app.showUserForm(${JSON.stringify(user).replace(/"/g, '&quot;')})"><i class="fas fa-edit"></i></button>
                        <button class="btn-icon" onclick="app.deleteUser(${user.id})" style="color:var(--error)"><i class="fas fa-trash"></i></button>
                    </td>
                `;
                tableBody.appendChild(tr);
            });
        } catch (e) { console.error(e); }
    },

    showUserForm(user = null) {
        const modal = document.getElementById('user-modal');
        const form = document.getElementById('user-form');
        form.reset();
        document.getElementById('user-id').value = user ? user.id : '';
        document.getElementById('user-modal-title').textContent = user ? 'Edit User' : 'Tambah User';
        if (user) {
            document.getElementById('user-name-input').value = user.name;
            document.getElementById('user-username-input').value = user.username;
            document.getElementById('user-role-input').value = user.role;
        }
        modal.classList.remove('hidden');

        if (this._userFormHandler) form.removeEventListener('submit', this._userFormHandler);
        this._userFormHandler = async (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());
            try {
                const res = await fetch(`${window.Laravel.baseUrl}/v1/users`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': window.Laravel.csrfToken, 'Accept': 'application/json' },
                    body: JSON.stringify(data)
                });
                const result = await res.json();
                if (res.ok) {
                    this.showToast(result.message, 'success');
                    modal.classList.add('hidden');
                    this.loadUsers();
                } else {
                    this.showToast(result.message || 'Gagal menyimpan', 'error');
                }
            } catch (e) { this.showToast('Server error', 'error'); }
        };
        form.addEventListener('submit', this._userFormHandler);
    },

    async deleteUser(id) {
        if (!confirm('Hapus user ini?')) return;
        try {
            const res = await fetch(`${window.Laravel.baseUrl}/v1/users/${id}`, {
                method: 'DELETE',
                headers: { 'X-CSRF-TOKEN': window.Laravel.csrfToken }
            });
            if (res.ok) { this.showToast('User dihapus', 'success'); this.loadUsers(); }
        } catch (e) { console.error(e); }
    },

    refreshData() {
        this.loadStats();
        this.loadLogs();
        return this.loadReports();
    },

    async loadStats() {
        try {
            const response = await fetch(`${window.Laravel.baseUrl}/v1/reports/stats`);
            const data = await response.json();
            document.getElementById('stat-total').textContent = data.total || 0;
            document.getElementById('stat-today').textContent = data.today || 0;
        } catch (e) { }
    },

    async loadLogs() {
        const container = document.getElementById('logs-feed');
        if (!container) return;
        try {
            const response = await fetch(`${window.Laravel.baseUrl}/v1/reports/logs`);
            const data = await response.json();
            container.innerHTML = '';
            data.slice(0, 10).forEach(log => {
                const item = document.createElement('div');
                item.className = 'log-item';
                const date = new Date(log.created_at).toLocaleString('id-ID', {hour:'2-digit', minute:'2-digit', day:'2-digit', month:'short'});
                let icon = 'dot-circle', iconColor = 'var(--accent)';
                const action = log.action.toLowerCase();
                if (action.includes('upload') || action.includes('create')) { icon = 'plus-circle'; iconColor = 'var(--success)'; }
                else if (action.includes('delete')) { icon = 'trash-alt'; iconColor = 'var(--error)'; }
                else if (action.includes('update')) { icon = 'edit'; iconColor = 'var(--accent-gold)'; }
                item.innerHTML = `
                    <div class="log-icon" style="color:${iconColor}"><i class="fas fa-${icon}"></i></div>
                    <div class="log-body">
                        <div class="log-text"><strong>${log.user_name}</strong> ${log.action}</div>
                        <div class="log-detail">${log.details || ''}</div>
                    </div>
                    <div class="log-time">${date}</div>
                `;
                container.appendChild(item);
            });
        } catch (e) { }
    },

    async loadReports() {
        const grid = document.getElementById('reports-grid');
        const historyBody = document.querySelector('#reports-history-table tbody');
        if (!grid && !historyBody) return;

        const startDate = document.getElementById('filter-start-date')?.value || '';
        const endDate = document.getElementById('filter-end-date')?.value || '';
        const shiftFilter = document.getElementById('filter-shift')?.value || '';

        try {
            const url = new URL(`${window.Laravel.baseUrl}/v1/reports`);
            if (startDate) url.searchParams.append('start_date', startDate);
            if (endDate) url.searchParams.append('end_date', endDate);
            if (shiftFilter) url.searchParams.append('shift', shiftFilter);

            const response = await fetch(url);
            const data = await response.json();
            this.reports = data;

            // Pre-process data: ensure form_data is an object
            data.forEach(r => {
                if (typeof r.form_data === 'string') {
                    try { r.form_data = JSON.parse(r.form_data); } catch(e) { r.form_data = {}; }
                }
            });

            if (grid) {
                grid.innerHTML = '';
                // Dashboard ONLY shows reports that ARE NOT signed by Inhouse (mgr-2)
                const pendingReports = data.filter(r => {
                    const sigs = r.form_data?.signatures || {};
                    return !sigs['mgr-2'];
                });
                
                if (pendingReports.length === 0) {
                    grid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding:40px; color:var(--text-dim);">Semua laporan sudah lengkap.</div>';
                }

                pendingReports.forEach(report => {
                    const card = document.createElement('div');
                    card.className = 'report-card animate-slide-up';
                    const d = new Date(report.report_date);
                    const dateStr = d.toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' });
                    card.innerHTML = `
                        <div class="rc-header">
                            <div class="rc-user">
                                <div class="rc-avatar">${report.user_name ? report.user_name.charAt(0).toUpperCase() : '?'}</div>
                                <div><h4>${report.user_name}</h4><span>${report.user_role || 'SPV'}</span></div>
                            </div>
                            <span class="badge ${(report.shift || '').toLowerCase()}">${report.shift}</span>
                        </div>
                        <div class="rc-body">
                            <div class="rc-info"><i class="far fa-calendar-alt"></i> ${dateStr}</div>
                            
                            <div class="sig-status-row">
                                <span class="sig-badge ${report.form_data?.signatures?.['mgr-1'] ? 'signed' : 'pending'}">
                                    <i class="fas ${report.form_data?.signatures?.['mgr-1'] ? 'fa-check-circle' : 'fa-clock'}"></i> Mgr: ${report.form_data?.signatures?.['mgr-1'] ? 'Sudah' : 'Belum'}
                                </span>
                                <span class="sig-badge ${report.form_data?.signatures?.['mgr-2'] ? 'signed' : 'pending'}">
                                    <i class="fas ${report.form_data?.signatures?.['mgr-2'] ? 'fa-check-circle' : 'fa-clock'}"></i> Inhouse: ${report.form_data?.signatures?.['mgr-2'] ? 'Sudah' : 'Belum'}
                                </span>
                            </div>

                            <div class="rc-desc">${report.description || 'Tidak ada keterangan'}</div>
                        </div>
                        <div class="rc-footer">
                            <button onclick="app.previewReport('${report.id}')" class="rc-btn view"><i class="fas fa-eye"></i> Detail</button>
                            ${['Admin', 'CAR PARK MANAGER', 'Supervisor', 'Leader', 'SPV', 'Inhouse'].includes(window.Laravel.user.role) ? `<button onclick="app.editDigitalForm('${report.id}')" class="rc-btn edit"><i class="fas fa-signature"></i> TTD</button>` : ''}
                            ${['Admin', 'CAR PARK MANAGER', 'Inhouse'].includes(window.Laravel.user.role) ? `<button onclick="app.deleteReport('${report.id}')" class="rc-btn delete"><i class="fas fa-trash"></i></button>` : ''}
                        </div>
                    `;
                    grid.appendChild(card);
                });
            }

            if (historyBody) {
                historyBody.innerHTML = '';
                
                // History ONLY shows reports that ARE signed by Inhouse (mgr-2)
                const completedReports = data.filter(r => {
                    const sigs = r.form_data?.signatures || {};
                    return sigs['mgr-2'];
                });

                if (completedReports.length === 0) {
                    historyBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px; color:var(--text-dim);">Belum ada laporan final.</td></tr>';
                }

                completedReports.forEach(r => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td style="font-weight:700;">${r.user_name}</td>
                        <td>${r.report_date}</td>
                        <td><span class="badge ${(r.shift||'').toLowerCase()}">${r.shift}</span></td>
                        <td>${r.description || '-'}</td>
                        <td>
                            <div style="display:flex; gap:8px;">
                                <button onclick="app.previewReport('${r.id}')" class="btn-secondary" style="padding:6px 12px;"><i class="fas fa-eye"></i></button>
                                ${['Admin', 'CAR PARK MANAGER', 'Inhouse'].includes(window.Laravel.user.role) ? `<button onclick="app.deleteReport('${r.id}')" class="btn-secondary" style="padding:6px 12px; color:var(--error);"><i class="fas fa-trash"></i></button>` : ''}
                            </div>
                        </td>
                    `;
                    historyBody.appendChild(tr);
                });
            }
        } catch (e) { console.error(e); }
    },

    processExport() {
        const start = document.getElementById('export-start-date').value;
        const end = document.getElementById('export-end-date').value;
        
        if (!start || !end) return this.showToast('Pilih periode tanggal', 'error');

        const filteredReports = this.reports.filter(r => {
            const date = r.report_date;
            const sigs = r.form_data?.signatures || {};
            return date >= start && date <= end && sigs['mgr-2'];
        });

        if (filteredReports.length === 0) {
            return this.showToast('Tidak ada laporan final pada periode tersebut', 'error');
        }

        document.getElementById('export-modal').classList.add('hidden');
        this.showToast(`Memproses ${filteredReports.length} laporan...`, 'info');

        const detailedData = [];
        filteredReports.forEach(r => {
            const items = r.form_data?.items || [];
            const baseUrl = window.location.origin;
            // Add auto_pdf=1 to the link
            const reportLink = `${baseUrl}?report_id=${r.id}&auto_pdf=1`;

            if (items.length > 0) {
                items.forEach((item, index) => {
                    detailedData.push({
                        'No': index === 0 ? detailedData.length + 1 : '',
                        'Tanggal': index === 0 ? r.report_date : '',
                        'Shift': index === 0 ? r.shift : '',
                        'Nama SPV': index === 0 ? r.user_name : '',
                        'LOKASI / AREA': item.location || '',
                        'URAIAN KEGIATAN': item.activity || '',
                        'PERSONIL': item.personnel || '',
                        'KETERANGAN': item.note || '',
                        'LINK DETAIL': index === 0 ? reportLink : '',
                        'Status': index === 0 ? 'FINAL' : ''
                    });
                });
            } else {
                detailedData.push({
                    'No': detailedData.length + 1,
                    'Tanggal': r.report_date,
                    'Shift': r.shift,
                    'Nama SPV': r.user_name,
                    'LOKASI / AREA': '-',
                    'URAIAN KEGIATAN': r.description || '-',
                    'PERSONIL': '-',
                    'KETERANGAN': '-',
                    'LINK DETAIL': reportLink,
                    'Status': 'FINAL'
                });
            }
        });

        const worksheet = XLSX.utils.json_to_sheet(detailedData);
        const wscols = [
            {wch: 5}, {wch: 12}, {wch: 8}, {wch: 20}, {wch: 20}, {wch: 40}, {wch: 15}, {wch: 20}, {wch: 35}, {wch: 10}
        ];
        worksheet['!cols'] = wscols;

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Detail");
        XLSX.writeFile(workbook, `Export_Laporan_${start}_sd_${end}.xlsx`);
        this.showToast('Export berhasil diunduh', 'success');
    },

    exportToExcel() {
        // This is now triggered from the modal
        document.getElementById('export-modal').classList.remove('hidden');
    },

    downloadPDF() {
        const element = document.getElementById('print-content');
        if (!element || !element.innerHTML) return this.showToast('Gagal memproses PDF', 'error');

        this.showToast('Menyiapkan PDF...', 'info');

        const opt = {
            margin:       [10, 10, 10, 10],
            filename:     `Laporan_SPV_${new Date().toISOString().split('T')[0]}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true, letterRendering: true },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        html2pdf().set(opt).from(element).save()
            .then(() => this.showToast('PDF berhasil diunduh', 'success'))
            .catch(err => {
                console.error(err);
                this.showToast('Gagal mengunduh PDF', 'error');
            });
    },

    previewReport(id) {
        const report = this.reports.find(r => r.id == id);
        if (!report) return;

        // Ensure form_data is an object
        if (typeof report.form_data === 'string' && report.form_data.trim() !== '') {
            try { report.form_data = JSON.parse(report.form_data); } catch(e) { console.error('Parse error', e); }
        }

        if (report.file_url) window.open(report.file_url, '_blank');
        else if (report.form_data) this.viewDigitalForm(id);
        else if (report.manual_content) {
            document.getElementById('modal-content-body').textContent = report.manual_content;
            document.getElementById('manual-modal').classList.remove('hidden');
        } else {
            this.showToast('Data laporan tidak ditemukan atau kosong', 'error');
        }
    },

    async editDigitalForm(id) {
        const report = this.reports.find(r => r.id == id);
        if (!report) return;

        // Ensure form_data is an object
        if (typeof report.form_data === 'string' && report.form_data.trim() !== '') {
            try { report.form_data = JSON.parse(report.form_data); } catch(e) { console.error('Parse error', e); }
        }

        if (!report.form_data) return this.showToast('Laporan digital tidak ditemukan', 'error');

        this.switchView('upload');
        const btnForm = document.querySelector('.method-btn[data-method="form"]');
        if (btnForm) btnForm.click();

        document.getElementById('df-report-id').value = id;
        document.getElementById('df-tanggal').value = report.report_date;
        document.getElementById('df-nama').value = report.spv_name;
        document.getElementById('df-shift').value = report.shift;
        document.getElementById('df-briefing').value = report.form_data.briefing || '';
        document.getElementById('df-training').value = report.form_data.training || '';

        const mp_jabatan = ['Car Park Manager','IT','Administrasi','Supervisor','Leader','Staff'];
        mp_jabatan.forEach(j => {
            const inp = document.querySelector(`.mp-input[data-jabatan="${j}"]`);
            const inpMid = document.querySelector(`.mp-input-middle[data-jabatan="${j}"]`);
            if (inp) inp.value = report.form_data.manpower?.[j] || '';
            if (inpMid) inpMid.value = report.form_data.manpower?.[j + '_middle'] || '';
        });

        if (window.formDigital) {
            window.formDigital.loadExistingSignatures(report.form_data.signatures || {}, report.form_data.signer_names || {});
            window.formDigital.calcTotal();
        }
        this.showToast('Laporan dimuat untuk diedit', 'info');
    },

    async deleteReport(id) {
        if (!confirm('Hapus laporan ini?')) return;
        try {
            const res = await fetch(`${window.Laravel.baseUrl}/v1/reports/${id}`, {
                method: 'DELETE',
                headers: { 'X-CSRF-TOKEN': window.Laravel.csrfToken }
            });
            if (res.ok) { this.showToast('Laporan dihapus', 'success'); this.refreshData(); }
        } catch (e) { }
    },

    viewDigitalForm(id) {
        const report = this.reports.find(r => r.id == id);
        if (report && window.formDigital) {
            window.formDigital.openPrintPreview(report.form_data, report);
        }
    },

    async handleUpload(e) {
        e.preventDefault();
        const btn = document.getElementById('btn-submit-upload');
        const formData = new FormData(e.target);
        btn.disabled = true;
        try {
            const res = await fetch(`${window.Laravel.baseUrl}/v1/reports`, {
                method: 'POST',
                headers: { 'X-CSRF-TOKEN': window.Laravel.csrfToken, 'Accept': 'application/json' },
                body: formData
            });
            if (res.ok) {
                this.showToast('Laporan disimpan', 'success');
                e.target.reset();
                this.switchView('dashboard');
            } else {
                const data = await res.json();
                this.showToast(data.message || 'Gagal menyimpan', 'error');
            }
        } catch (e) { } finally { btn.disabled = false; }
    },

    async handlePurge(all) {
        const startDate = document.getElementById('purge-start')?.value;
        const endDate = document.getElementById('purge-end')?.value;
        if (!all && !startDate && !endDate) return this.showToast('Pilih range tanggal', 'error');

        if (!confirm(all ? 'Hapus SEMUA data?' : 'Hapus data di range ini?')) return;
        try {
            const res = await fetch(`${window.Laravel.baseUrl}/v1/reports/purge`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': window.Laravel.csrfToken },
                body: JSON.stringify({ start_date: startDate, end_date: endDate, all })
            });
            if (res.ok) { this.showToast('Data dibersihkan', 'success'); this.refreshData(); }
        } catch (e) { }
    },

    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<i class="fas fa-info-circle"></i> <span>${message}</span>`;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
};

const formDigital = {
    init() {
        this.bindManpowerAutoSum();
        this.bindFormSubmit();
        this.bindPrintPreview();
        this.initSignaturePads();
        window.addEventListener('resize', () => this.resizeSignaturePads());
    },

    initSignaturePads() {
        this.sigPads = {};
        ['spv', 'mgr-1', 'mgr-2'].forEach(key => {
            const canvas = document.getElementById(`sig-${key}`);
            if (canvas) {
                const pad = new SignaturePad(canvas, { backgroundColor: 'rgba(255, 255, 255, 0)', penColor: 'rgb(0, 0, 0)' });
                if (canvas.classList.contains('sig-readonly')) pad.off();
                this.sigPads[key] = pad;
            }
        });
        this.resizeSignaturePads();
    },

    resizeSignaturePads() {
        if (!this.sigPads) return;
        Object.values(this.sigPads).forEach(pad => {
            const canvas = pad.canvas;
            if (canvas && canvas.offsetParent) {
                const ratio = Math.max(window.devicePixelRatio || 1, 1);
                const data = pad.toData();
                canvas.width = canvas.offsetWidth * ratio;
                canvas.height = canvas.offsetHeight * ratio;
                canvas.getContext("2d").scale(ratio, ratio);
                pad.clear(); pad.fromData(data);
            }
        });
    },

    clearSig(key) {
        const pad = this.sigPads?.[key];
        if (pad) {
            pad.clear();
            const wrapper = pad.canvas.closest('.sig-pad-wrapper');
            if (wrapper) {
                wrapper.querySelector('.existing-sig')?.remove();
                pad.canvas.style.opacity = '1';
                delete wrapper.dataset.signerName;
            }
            
            // Reset display name
            const nameDisp = document.getElementById(`df-sig-name-${key}`);
            if (nameDisp) {
                if (key === 'spv') nameDisp.textContent = window.Laravel?.user?.name || '-';
                else nameDisp.textContent = '....................';
            }
        }
    },

    loadExistingSignatures(sigs, names = {}) {
        Object.keys(sigs).forEach(key => {
            const canvas = document.getElementById(`sig-${key}`);
            const wrapper = canvas?.closest('.sig-pad-wrapper');
            if (wrapper && sigs[key]) {
                wrapper.querySelector('.existing-sig')?.remove();
                const img = document.createElement('img');
                img.src = sigs[key];
                img.className = 'existing-sig';
                img.style.cssText = 'position:absolute; top:0; left:0; width:100%; height:100%; object-fit:contain; background:white; z-index:5;';
                wrapper.style.position = 'relative';
                wrapper.appendChild(img);
                canvas.style.opacity = '0';
                
                // Store signer name in dataset and display it
                if (names[key]) {
                    wrapper.dataset.signerName = names[key];
                    const nameDisp = document.getElementById(`df-sig-name-${key}`);
                    if (nameDisp) nameDisp.textContent = names[key];
                }
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
        this.addPlotingRow(); this.addSpesifikasiRow();
        this.calcTotal();
        Object.keys(this.sigPads || {}).forEach(k => this.clearSig(k));
        
        // Reset name inputs
        ['spv', 'mgr-1', 'mgr-2'].forEach(k => {
            const inp = document.getElementById(`df-sig-name-${k}`);
            if (inp) inp.value = (k === 'spv') ? (window.Laravel?.user?.name || '') : '';
        });
    },

    bindManpowerAutoSum() {
        document.querySelectorAll('.mp-input, .mp-input-middle').forEach(i => i.addEventListener('input', () => this.calcTotal()));
    },

    calcTotal() {
        let s = 0, m = 0;
        document.querySelectorAll('.mp-input').forEach(i => s += parseInt(i.value || 0));
        document.querySelectorAll('.mp-input-middle').forEach(i => m += parseInt(i.value || 0));
        if (document.getElementById('mp-total-val')) document.getElementById('mp-total-val').textContent = s;
        if (document.getElementById('mp-total-middle')) document.getElementById('mp-total-middle').textContent = m;
    },

    addPlotingRow() {
        const tbody = document.getElementById('ploting-tbody');
        const tr = document.createElement('tr');
        tr.className = 'ploting-row';
        tr.innerHTML = `<td>${tbody.children.length + 1}</td><td><input type="text" class="ploting-area"></td><td><input type="text" class="ploting-petugas"></td><td style="text-align:center;"><button type="button" onclick="this.closest('tr').remove()">×</button></td>`;
        tbody.appendChild(tr);
    },

    addSpesifikasiRow() {
        const tbody = document.getElementById('spesifikasi-tbody');
        const tr = document.createElement('tr');
        tr.className = 'spesifikasi-row';
        tr.innerHTML = `<td><input type="text" class="spec-jenis"></td><td><input type="text" class="spec-waktu"></td><td><input type="text" class="spec-detail"></td><td><input type="text" class="spec-tindakan"></td><td><select class="spec-status"><option value="On Progres">On Progres</option><option value="Done">Done</option></select></td><td style="text-align:center;"><button type="button" onclick="this.closest('tr').remove()">×</button></td>`;
        tbody.appendChild(tr);
    },

    collectData() {
        const mp = { TOTAL: 0, TOTAL_MIDDLE: 0 };
        document.querySelectorAll('.mp-input').forEach(i => {
            const val = parseInt(i.value || 0);
            mp[i.dataset.jabatan] = val;
            mp.TOTAL += val;
        });
        document.querySelectorAll('.mp-input-middle').forEach(i => {
            const val = parseInt(i.value || 0);
            mp[i.dataset.jabatan + '_middle'] = val;
            mp.TOTAL_MIDDLE += val;
        });
        
        const plot = [];
        document.querySelectorAll('#ploting-tbody tr').forEach((tr, i) => {
            const area = tr.querySelector('.ploting-area').value;
            const petugas = tr.querySelector('.ploting-petugas').value;
            if (area || petugas) plot.push({ no: i+1, area, petugas });
        });

        const perlen = [];
        document.querySelectorAll('#tbl-perlengkapan tbody tr').forEach((tr, i) => {
            perlen.push({
                no: i+1,
                nama: tr.querySelector('td:nth-child(2)').textContent.trim(),
                jumlah: tr.querySelector('.perlen-jumlah').value,
                baik: tr.querySelector('.perlen-baik').value,
                rusak: tr.querySelector('.perlen-rusak').value,
                keterangan: tr.querySelector('.perlen-ket').value
            });
        });

        const spec = [];
        document.querySelectorAll('#spesifikasi-tbody tr').forEach(tr => {
            const jenis = tr.querySelector('.spec-jenis').value;
            if (jenis) spec.push({ jenis, waktu: tr.querySelector('.spec-waktu').value, detail: tr.querySelector('.spec-detail').value, tindakan: tr.querySelector('.spec-tindakan').value, status: tr.querySelector('.spec-status').value });
        });

        const sigs = {};
        const signerNames = {};
        Object.keys(this.sigPads || {}).forEach(k => {
            const pad = this.sigPads[k];
            const wrapper = pad.canvas.closest('.sig-pad-wrapper');
            const existing = wrapper.querySelector('.existing-sig');
            
            // Get data-signer attribute if it exists (from loading existing)
            const existingSignerName = wrapper.dataset.signerName;

            if (existing) {
                sigs[k] = existing.src;
                signerNames[k] = existingSignerName;
            } else if (!pad.isEmpty()) {
                sigs[k] = pad.toDataURL();
                signerNames[k] = window.Laravel.user.name; // Capture current logged in user
            }
        });

        return { manpower: mp, ploting: plot, perlengkapan: perlen, briefing: document.getElementById('df-briefing').value, training: document.getElementById('df-training').value, spesifikasi: spec, signatures: sigs, signer_names: signerNames };
    },

    bindFormSubmit() {
        document.getElementById('form-digital')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btn-submit-form');
            btn.disabled = true;
            const data = this.collectData();
            const payload = {
                report_id: document.getElementById('df-report-id').value,
                report_date: document.getElementById('df-tanggal').value,
                shift: document.getElementById('df-shift').value,
                form_data: JSON.stringify(data)
            };
            try {
                const res = await fetch(`${window.Laravel.baseUrl}/v1/reports/form`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': window.Laravel.csrfToken, 'Accept': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (res.ok) { app.showToast('Laporan berhasil disimpan', 'success'); app.switchView('dashboard'); }
            } catch (e) { } finally { btn.disabled = false; }
        });
    },

    bindPrintPreview() {
        document.getElementById('btn-print-preview')?.addEventListener('click', () => {
            const data = this.collectData();
            const report = {
                spv_name: document.getElementById('df-nama').value,
                shift: document.getElementById('df-shift').value,
                report_date: document.getElementById('df-tanggal').value
            };
            this.openPrintPreview(data, report);
        });

        document.getElementById('btn-do-print')?.addEventListener('click', () => {
            window.print();
        });
    },

    openPrintPreview(data, report) {
        const nama = report.spv_name || document.getElementById('df-nama').value;
        const shift = report.shift || document.getElementById('df-shift').value;
        const tgl = report.report_date || document.getElementById('df-tanggal').value;

        let mpRows = '', plotRows = '', perRows = '', specRows = '';
        const mp_j = ['Car Park Manager','IT','Administrasi','Supervisor','Leader','Staff'];
        mp_j.forEach(j => {
            mpRows += `<tr><td style="padding:4px 8px; border:1px solid #000;">${j}</td><td style="text-align:center; border:1px solid #000;">${data.manpower?.[j] || '-'}</td><td style="text-align:center; border:1px solid #000;">${data.manpower?.[j + '_middle'] || '-'}</td></tr>`;
        });

        (data.ploting || []).forEach(p => plotRows += `<tr><td style="text-align:center; border:1px solid #000;">${p.no}</td><td style="border:1px solid #000; padding:4px 8px;">${p.area}</td><td style="border:1px solid #000; padding:4px 8px;">${p.petugas}</td></tr>`);
        (data.perlengkapan || []).forEach(p => perRows += `<tr><td style="text-align:center; border:1px solid #000;">${p.no}</td><td style="border:1px solid #000; padding:4px 8px;">${p.nama}</td><td style="text-align:center; border:1px solid #000;">${p.jumlah}</td><td style="text-align:center; border:1px solid #000; color:green;">${p.baik}</td><td style="text-align:center; border:1px solid #000; color:red;">${p.rusak}</td><td style="border:1px solid #000; padding:4px 8px;">${p.keterangan || '-'}</td></tr>`);
        (data.spesifikasi || []).forEach(s => specRows += `<tr><td style="border:1px solid #000; padding:4px 8px;">${s.jenis}</td><td style="text-align:center; border:1px solid #000;">${s.waktu}</td><td style="border:1px solid #000; padding:4px 8px;">${s.detail}</td><td style="border:1px solid #000; padding:4px 8px;">${s.tindakan}</td><td style="text-align:center; border:1px solid #000;">${s.status}</td></tr>`);

        const html = `
            <div style="text-align:center; margin-bottom:20px;">
                <h2 style="margin:0; text-transform:uppercase;">DAILY REPORT SUPERVISOR</h2>
                <p style="margin:5px 0;">GANDARIA CITY MALL</p>
            </div>
            <table style="width:100%; margin-bottom:15px; font-size:10pt;">
                <tr><td style="width:15%;">Nama SPV</td><td>: ${nama}</td><td style="width:15%;">Shift</td><td>: ${shift}</td></tr>
                <tr><td>Tanggal</td><td>: ${tgl}</td></tr>
            </table>
            <div style="margin-bottom:20px;">
                <h4 style="margin:0 0 8px; font-size:10pt;">MAN POWER</h4>
                <table style="width:100%; border-collapse:collapse; font-size:9pt; margin-bottom:15px;">
                    <thead>
                        <tr>
                            <th style="border:1px solid #000; background:#eee; padding:6px;">JABATAN</th>
                            <th style="border:1px solid #000; background:#eee; padding:6px; width:100px;">SHIFT</th>
                            <th style="border:1px solid #000; background:#eee; padding:6px; width:100px;">MIDDLE</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${mpRows}
                        <tr style="font-weight:bold; background:#f9f9f9;">
                            <td style="border:1px solid #000; padding:6px 10px;">TOTAL</td>
                            <td style="text-align:center; border:1px solid #000; padding:6px;">${data.manpower?.TOTAL || 0}</td>
                            <td style="text-align:center; border:1px solid #000; padding:6px;">${data.manpower?.TOTAL_MIDDLE || 0}</td>
                        </tr>
                    </tbody>
                </table>

                <h4 style="margin:15px 0 8px; font-size:10pt;">PLOTING MANPOWER</h4>
                <table style="width:100%; border-collapse:collapse; font-size:9pt; margin-bottom:15px;">
                    <thead>
                        <tr>
                            <th style="width:40px; border:1px solid #000; background:#eee; padding:6px;">NO</th>
                            <th style="border:1px solid #000; background:#eee; padding:6px;">AREA PLOTING</th>
                            <th style="border:1px solid #000; background:#eee; padding:6px;">NAMA PETUGAS</th>
                        </tr>
                    </thead>
                    <tbody>${plotRows}</tbody>
                </table>
            </div>

            <h4 style="margin:15px 0 8px; font-size:10pt;">PERLENGKAPAN</h4>
            <table style="width:100%; border-collapse:collapse; font-size:9pt; margin-bottom:15px;">
                <thead>
                    <tr>
                        <th rowspan="2" style="width:35px; border:1px solid #000; background:#eee; padding:4px;">NO</th>
                        <th rowspan="2" style="border:1px solid #000; background:#eee; padding:4px;">NAMA PERLENGKAPAN</th>
                        <th rowspan="2" style="width:60px; border:1px solid #000; background:#eee; padding:4px;">TOTAL</th>
                        <th colspan="2" style="border:1px solid #000; background:#eee; padding:4px;">KONDISI</th>
                        <th rowspan="2" style="border:1px solid #000; background:#eee; padding:4px;">KETERANGAN</th>
                    </tr>
                    <tr>
                        <th style="width:50px; border:1px solid #000; background:#eee; color:green; padding:4px;">BAIK</th>
                        <th style="width:50px; border:1px solid #000; background:#eee; color:red; padding:4px;">RUSAK</th>
                    </tr>
                </thead>
                <tbody>${perRows}</tbody>
            </table>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px; margin-bottom:15px; font-size:9pt;">
                <div style="border:1px solid #000; padding:8px; min-height:80px;">
                    <h4 style="margin:0 0 5px; border-bottom:1px solid #000; font-size:9pt;">BRIEFING</h4>
                    <div style="white-space:pre-wrap;">${data.briefing || '-'}</div>
                </div>
                <div style="border:1px solid #000; padding:8px; min-height:80px;">
                    <h4 style="margin:0 0 5px; border-bottom:1px solid #000; font-size:9pt;">TRAINING</h4>
                    <div style="white-space:pre-wrap;">${data.training || '-'}</div>
                </div>
            </div>

            <h4 style="margin:15px 0 8px; font-size:10pt;">SPESIFIKASI LAPORAN</h4>
            <table style="width:100%; border-collapse:collapse; font-size:9pt; margin-bottom:25px;">
                <thead>
                    <tr>
                        <th style="border:1px solid #000; background:#eee; padding:6px; width:130px;">JENIS LAPORAN</th>
                        <th style="width:70px; border:1px solid #000; background:#eee; padding:6px;">WAKTU</th>
                        <th style="border:1px solid #000; background:#eee; padding:6px;">DETAIL LAPORAN</th>
                        <th style="border:1px solid #000; background:#eee; padding:6px;">TINDAKAN</th>
                        <th style="width:80px; border:1px solid #000; background:#eee; padding:6px;">STATUS</th>
                    </tr>
                </thead>
                <tbody>${specRows}</tbody>
            </table>
            <table style="width:100%; border-collapse:collapse; font-size:9pt; text-align:center;">
                <tr>
                    <td>Dibuat,<br><br>${data.signatures?.spv ? `<img src="${data.signatures.spv}" style="height:50px;">` : '<br><br>'}<br><b>( ${data.signer_names?.spv || nama} )</b><br>Supervisor/Leader</td>
                    <td>Mengetahui,<br><br>${data.signatures?.['mgr-1'] ? `<img src="${data.signatures['mgr-1']}" style="height:50px;">` : '<br><br>'}<br><b>( ${data.signer_names?.['mgr-1'] || '....................'} )</b><br>CarPark Manager</td>
                    <td>Mengetahui,<br><br>${data.signatures?.['mgr-2'] ? `<img src="${data.signatures?.['mgr-2']}" style="height:50px;">` : '<br><br>'}<br><b>( ${data.signer_names?.['mgr-2'] || '....................'} )</b><br>Inhouse Parking</td>
                </tr>
            </table>
        `;
        document.getElementById('print-content').innerHTML = html;
        document.getElementById('print-modal').classList.remove('hidden');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    window.app = app;
    window.formDigital = formDigital;
    app.init();
    formDigital.init();
});
