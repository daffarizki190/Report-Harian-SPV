// SPV Report - Main App Logic (Premium Version)
const PLOTTING_AREAS = [
    'Mobile Basement', 'Mobile MSCP', 'Control Room Officer 1',
    'Control Room Officer 2', 'PK Motor', 'Area Motor B2', 'Area Motor B1',
    'Area B2', 'Area B2', 'Area B1', 'Area B1', 'Area LG', 'Area LG', 'Area MSCP'
];

const DEFAULT_PERLENGKAPAN = [
    ['Handy Talkie', 3],
    ['Traffic Lamp', 5],
    ['Jas Hujan', 1],
    ['Traffic Cone CP', 200],
    ['Sticke Cone CP', 100],
    ['Senter', 1],
];

const DEFAULT_PERALATAN = [
    ['Parking Entrance', 16],
    ['Parking Exit', 23],
    ['Server parking', 2],
    ['DDS', 7],
    ['Emergency button', 43],
    ['Hanging Sign', 355],
    ['Totem Sign', 35],
];

const app = {
    currentView: 'dashboard',
    reports: [],
    currentPage: 1,

    async init() {
        this.bindEvents();
        this.updateDate();
        this.applyRolePermissions();
        await this.refreshData();
        this.handleUrlParams();

        // Real-time: Listen for new reports via Reverb
        try { this.initEcho(); } catch(e) { console.error('Pusher/Echo initialization error:', e); }

        // Fallback: Auto-refresh data every 10 seconds
        this.refreshInterval = setInterval(() => {
            if (document.visibilityState === 'visible' && !document.querySelector('.overlay:not(.hidden)')) {
                this.refreshData(true);
            }
        }, 10000);
    },

    debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    },

    initEcho() {
        if (typeof window.Echo === 'undefined' || typeof window.Echo.channel !== 'function') return;
        window.Echo.channel('reports')
            .listen('ReportSubmitted', (e) => {
                console.log('Real-time: New report received', e);
                this.showToast(`Laporan baru dari ${e.spv_name || 'SPV'}`, 'info');
                this.refreshData(true);
            });
    },

    async handleUrlParams() {
        const params = new URLSearchParams(window.location.search);
        const reportId = params.get('report_id');
        const autoPdf = params.get('auto_pdf');

        if (reportId) {
            console.log('Auto-opening report:', reportId);
            
            if (autoPdf === '1') {
                document.documentElement.classList.add('mode-auto-pdf');
            }

            // Check if report exists in local state
            let report = this.reports.find(r => r.id == reportId);
            
            if (!report) {
                console.warn('Report not found in current view, trying to load all...');
                await this.loadReports(true); 
                report = this.reports.find(r => r.id == reportId);
            }

            if (report) {
                if (report.file_url) {
                    // It's a static file (e.g. uploaded PDF), just open it
                    window.open(report.file_url, '_blank');
                    this.finishAutoPdf();
                } else {
                    // It's a digital form, we need to generate PDF
                    this.viewDigitalForm(reportId);
                    if (autoPdf === '1') {
                        this.showToast('Menyiapkan pratinjau PDF...', 'info');
                        
                        // Open tab immediately to avoid popup blocker
                        const pdfTab = window.open('about:blank', '_blank');
                        
                        setTimeout(() => {
                            this.downloadPDF(true, pdfTab); 
                            this.finishAutoPdf();
                        }, 1500);
                    }
                }
            } else {
                this.finishAutoPdf();
                this.showToast('Laporan tidak ditemukan. Pastikan Anda memiliki akses.', 'error');
            }
        }
    },

    finishAutoPdf() {
        document.documentElement.classList.remove('mode-auto-pdf');
        const loader = document.getElementById('pdf-loading-screen');
        if (loader) loader.classList.add('hidden');
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
        // Pagination
        document.querySelectorAll('.btn-prev-page').forEach(btn => {
            btn.addEventListener('click', () => {
                if (this.currentPage > 1) {
                    this.currentPage--;
                    this.refreshData();
                }
            });
        });
        document.querySelectorAll('.btn-next-page').forEach(btn => {
            btn.addEventListener('click', () => {
                if (this.currentPage < this.lastPage) {
                    this.currentPage++;
                    this.refreshData();
                }
            });
        });

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
                const uploadDescField = document.getElementById('upload-desc-field');
                const submitUploadBtn = document.getElementById('btn-submit-upload');

                if (digitalWrapper) digitalWrapper.classList.toggle('hidden', !isForm);
                if (uploadMetaFields) uploadMetaFields.classList.toggle('hidden', isForm);
                if (uploadDescField) uploadDescField.classList.toggle('hidden', isForm);
                if (submitUploadBtn) submitUploadBtn.classList.toggle('hidden', isForm);

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
        
        let searchTimeout;
        document.getElementById('filter-search')?.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => this.loadReports(), 500);
        });
        document.getElementById('btn-refresh')?.addEventListener('click', () => {
            this.refreshData();
            this.showToast('Data diperbarui', 'info');
        });

        // Export & Schedule
        document.getElementById('btn-export-excel')?.addEventListener('click', () => this.exportToExcel());
        document.getElementById('btn-bulk-zip')?.addEventListener('click', () => this.handleBulkDownload());
        document.getElementById('btn-process-schedule')?.addEventListener('click', () => window.scheduleManager.processExcel());

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

        // Mobile bottom nav — show on small screens
        const mobileNav = document.querySelector('.mobile-bottom-nav');
        if (mobileNav && window.innerWidth <= 768) {
            mobileNav.style.display = 'flex';
        }
        window.addEventListener('resize', () => {
            if (mobileNav) mobileNav.style.display = window.innerWidth <= 768 ? 'flex' : 'none';
        });

        // Mobile logout
        document.getElementById('mobile-logout-btn')?.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('mobile-logout-form')?.submit();
        });
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
                approved: 'Riwayat Approve',
                upload: 'Buat Laporan',
                history: 'Daftar Laporan',
                users: 'Manajemen Pengguna',
                monitoring: 'Monitoring Sistem'
            };
            titleEl.textContent = titles[viewId] || 'App';
        }

        // Load data based on view
        if (['dashboard', 'history', 'approved'].includes(viewId)) this.loadReports();
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

            // Developer Tech Stack
            const stackList = document.getElementById('mon-tech-stack-list');
            if (stackList && data.stack) {
                stackList.innerHTML = '';
                Object.entries(data.stack).forEach(([key, value]) => {
                    const item = document.createElement('div');
                    item.className = 'mon-info-item';
                    item.innerHTML = `
                        <span class="mon-info-label" style="text-transform: capitalize;">${key}:</span>
                        <span class="mon-info-value">${value}</span>
                    `;
                    stackList.appendChild(item);
                });
            }
        } catch (e) { console.error('Failed to load system info', e); }
    },

    async loadLogs() {
        const user = window.Laravel?.user;
        if (!user || user.role !== 'Admin') {
            const feed = document.getElementById('logs-feed');
            if (feed) {
                const card = feed.closest('.glass-card');
                if (card) card.style.display = 'none';
            }
            return;
        }

        const body = document.getElementById('monitoring-logs-body');
        const feed = document.getElementById('logs-feed');
        if (!body && !feed) return;

        if (body) body.innerHTML = '<tr><td colspan="5" style="text-align:center;">Memuat log...</td></tr>';
        if (feed) feed.innerHTML = '<div style="text-align:center; padding:10px; color:var(--text-dim);">Memuat aktivitas...</div>';

        try {
            const response = await fetch(`${window.Laravel.baseUrl}/v1/reports/logs`);
            const json = await response.json();
            const logs = json.data || json;

            if (body) {
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
            }

            if (feed) {
                feed.innerHTML = '';
                logs.slice(0, 10).forEach(log => {
                    const item = document.createElement('div');
                    item.className = 'log-item';
                    const date = new Date(log.created_at).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' });
                    let icon = 'dot-circle', iconColor = 'var(--accent)';
                    const action = (log.action || '').toLowerCase();
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
                    feed.appendChild(item);
                });
            }
        } catch (e) {
            console.error('Failed to load logs', e);
            if (body) body.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--error);">Gagal memuat log.</td></tr>';
        }
    },

    async loadUsers() {
        const tableBody = document.querySelector('#users-table tbody');
        if (!tableBody) return;
        tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center">Memuat user...</td></tr>';
        try {
            const response = await fetch(`${window.Laravel.baseUrl}/v1/users`);
            const json = await response.json();
            const data = json.data || json;
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
                        <button class="btn-icon" onclick="app.editUser(${user.id})"><i class="fas fa-edit"></i></button>
                        <button class="btn-icon" onclick="app.deleteUser(${user.id})" style="color:var(--error)"><i class="fas fa-trash"></i></button>
                    </td>
                `;
                tableBody.appendChild(tr);
            });
        } catch (e) { console.error(e); }
    },

    async editUser(id) {
        try {
            const res = await fetch(`${window.Laravel.baseUrl}/v1/users`);
            const users = await res.json();
            const user = (users.data || users).find(u => u.id == id);
            if (user) this.showUserForm(user);
        } catch (e) { this.showToast('Gagal memuat data user', 'error'); }
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
            document.getElementById('user-role-select').value = user.role;
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
        this.showConfirm('Hapus user ini?', async () => {
            try {
                const res = await fetch(`${window.Laravel.baseUrl}/v1/users/${id}`, {
                    method: 'DELETE',
                    headers: { 'X-CSRF-TOKEN': window.Laravel.csrfToken }
                });
                if (res.ok) { this.showToast('User dihapus', 'success'); this.loadUsers(); }
            } catch (e) { console.error('Delete user failed:', e); }
        });
    },

    async refreshData(silent = false) {
        if (!silent) this.showGlobalLoader();
        try {
            await Promise.allSettled([
                this.loadStats(),
                this.loadLogs(),
                this.loadReports()
            ]);
        } catch (e) {
            console.error('Refresh data failed:', e);
        } finally {
            if (!silent) this.hideGlobalLoader();
        }
    },

    async loadStats() {
        try {
            const response = await fetch(`${window.Laravel.baseUrl}/v1/reports/stats`);
            const data = await response.json();
            const totalEl = document.getElementById('stat-total');
            const pendingEl = document.getElementById('stat-pending');
            const approvedEl = document.getElementById('stat-approved');

            if (totalEl) totalEl.textContent = data.total || 0;
            if (pendingEl) pendingEl.textContent = data.pending || 0;
            if (approvedEl) approvedEl.textContent = data.approved || 0;
        } catch (e) { console.error('Load stats failed:', e); }
    },


    async loadReports(ignoreFilters = false) {
        const grid = document.getElementById('reports-grid');
        const historyBody = document.querySelector('#reports-history-table tbody');
        if (!grid && !historyBody) return;

        const startDate = !ignoreFilters ? (document.getElementById('filter-start-date')?.value || '') : '';
        const endDate = !ignoreFilters ? (document.getElementById('filter-end-date')?.value || '') : '';
        const shiftFilter = !ignoreFilters ? (document.getElementById('filter-shift')?.value || '') : '';
        const searchFilter = !ignoreFilters ? (document.getElementById('filter-search')?.value || '') : '';

        try {
            const url = new URL(`${window.Laravel.baseUrl}/v1/reports`);
            if (startDate) url.searchParams.append('start_date', startDate);
            if (endDate) url.searchParams.append('end_date', endDate);
            if (shiftFilter) url.searchParams.append('shift', shiftFilter);
            if (searchFilter) url.searchParams.append('search', searchFilter);
            
            // Pagination
            url.searchParams.append('page', this.currentPage);

            // Add cache-busting timestamp
            url.searchParams.append('_', new Date().getTime());
            
            // Apply status filter based on active view
            const activeView = this.currentView || 'dashboard';

            if (activeView === 'dashboard') {
                url.searchParams.append('status', 'pending');
            } else if (activeView === 'approved') {
                url.searchParams.append('status', 'approved');
            }
            
            const response = await fetch(url, {
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const json = await response.json();
            
            // Handle Laravel API Resource wrapper
            const data = json.data || json;
            this.reports = data;
            
            // Update pagination UI
            if (json.meta) {
                this.currentPage = json.meta.current_page;
                this.lastPage = json.meta.last_page;
                
                document.querySelectorAll('.page-info').forEach(el => {
                    el.textContent = `Page ${this.currentPage} of ${this.lastPage || 1}`;
                });
                document.querySelectorAll('.btn-prev-page').forEach(btn => {
                    btn.disabled = this.currentPage <= 1;
                });
                document.querySelectorAll('.btn-next-page').forEach(btn => {
                    btn.disabled = this.currentPage >= (this.lastPage || 1);
                });
            }

            // Pre-process data: ensure form_data is an object and signatures are detected
            data.forEach(r => {
                if (typeof r.form_data === 'string') {
                    try { r.form_data = JSON.parse(r.form_data); } catch (e) { r.form_data = {}; }
                }
                
                // Robust signature detection: use server flags or check object keys
                const hasSigs = r.form_data?.signatures || {};
                r.has_mgr1_sig = r.has_mgr1_sig || (hasSigs['mgr-1'] ? 1 : 0);
                r.has_mgr2_sig = r.has_mgr2_sig || (hasSigs['mgr-2'] ? 1 : 0);
            });

            // Find the active grid
            const grid = document.querySelector('.view-section.active .reports-grid') || document.getElementById('reports-grid');

            if (grid) {
                grid.innerHTML = '';
                
                const displayReports = data;

                if (displayReports.length === 0) {
                    grid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding:40px; color:var(--text-dim);">Belum ada laporan.</div>';
                }

                displayReports.forEach(report => {
                    try {
                        const d = new Date(report.report_date);
                        const dateStr = d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });

                        const user = window.Laravel?.user || {};
                        const isOwner = report.user_id === user.id || (report.user_name === user.name && !report.user_id);
                        const isAdmin = user.role === 'Admin';
                        const isManager = ['CAR PARK MANAGER', 'Inhouse'].includes(user.role);
                        
                        let showActionBtn = false;
                        let actionLabel = 'TTD';
                        let actionIcon = 'fa-signature';

                        let hasOnProgres = false;
                        if (report.form_data && report.form_data.spesifikasi) {
                            hasOnProgres = report.form_data.spesifikasi.some(s => s.status === 'On Progres' || s.status === 'On Progress');
                        }

                        if (isOwner || isAdmin || hasOnProgres) {
                            showActionBtn = true;
                            actionLabel = (isOwner || hasOnProgres) ? 'Edit / TTD' : 'Admin Edit';
                            actionIcon = 'fa-edit';
                        } else if (isManager) {
                            const needsMgr1 = user.role === 'CAR PARK MANAGER' && !report.has_mgr1_sig;
                            const needsMgr2 = user.role === 'Inhouse' && !report.has_mgr2_sig;
                            if (needsMgr1 || needsMgr2) showActionBtn = true;
                        }

                        const card = document.createElement('div');
                        card.className = 'report-card animate-slide-up';
                        card.innerHTML = `
                            <div class="rc-header">
                                <div class="rc-user">
                                    <div class="rc-avatar">${report.user_name ? report.user_name.charAt(0).toUpperCase() : '?'}</div>
                                    <div><h4>${report.user_name}</h4><span>${report.user_role || 'Supervisor'}</span></div>
                                </div>
                                <span class="badge ${(report.shift || '').toLowerCase()}">${report.shift}</span>
                            </div>
                            <div class="rc-body">
                                <div class="rc-info"><i class="far fa-calendar-alt"></i> ${dateStr}</div>
                                <div class="sig-status-row">
                                    <span class="sig-badge ${report.has_mgr1_sig ? 'signed' : 'pending'}">
                                        <i class="fas ${report.has_mgr1_sig ? 'fa-check-circle' : 'fa-clock'}"></i> Mgr: ${report.has_mgr1_sig ? 'Sudah' : 'Belum'}
                                    </span>
                                    <span class="sig-badge ${report.has_mgr2_sig ? 'signed' : 'pending'}">
                                        <i class="fas ${report.has_mgr2_sig ? 'fa-check-circle' : 'fa-clock'}"></i> Inhouse: ${report.has_mgr2_sig ? 'Sudah' : 'Belum'}
                                    </span>
                                </div>
                                <div class="rc-desc">${report.description || 'Tidak ada keterangan'}</div>
                            </div>
                            <div class="rc-footer">
                                <button onclick="app.previewReport('${report.id}')" class="rc-btn view"><i class="fas fa-eye"></i> Detail</button>
                                ${showActionBtn ? `
                                    <button onclick="app.editDigitalForm('${report.id}')" class="rc-btn edit">
                                        <i class="fas ${actionIcon}"></i> ${actionLabel}
                                    </button>` : ''}
                                ${['Admin', 'CAR PARK MANAGER', 'Inhouse', 'Supervisor', 'Leader'].includes(user.role) ? `
                                    <button onclick="app.deleteReport('${report.id}')" class="rc-btn delete">
                                        <i class="fas fa-trash"></i>
                                    </button>` : ''}
                            </div>
                        `;
                        grid.appendChild(card);
                    } catch (err) {
                        console.error('Error rendering report card:', err, report);
                    }
                });
            }

            if (historyBody) {
                historyBody.innerHTML = '';

                // Tampilkan semua laporan tanpa menunggu approval
                const completedReports = data;

                if (completedReports.length === 0) {
                    historyBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px; color:var(--text-dim);">Belum ada laporan.</td></tr>';
                }

                completedReports.forEach(r => {
                    const hasFormData = r.form_data && Object.keys(r.form_data).length > 0;
                    const hasFile = !!r.file_url;
                    const canDownloadPDF = hasFormData || hasFile;

                    let statusHtml = '';
                    const hasOnProgres = Array.isArray(r.form_data?.spesifikasi) && r.form_data.spesifikasi.some(s => s.status === 'On Progres' || s.status === 'On Progress');

                    if (hasOnProgres) {
                        statusHtml = '<span class="sig-badge pending" style="color:#b45309; background:#fef3c7; border:1px solid #fcd34d;"><i class="fas fa-spinner fa-spin"></i> ON PROGRES</span>';
                    } else if (r.has_mgr2_sig) {
                        statusHtml = '<span class="sig-badge signed"><i class="fas fa-check-double"></i> DONE</span>';
                    } else if (r.has_mgr1_sig) {
                        statusHtml = '<span class="sig-badge pending" style="color:var(--accent-gold); background:rgba(251, 191, 36, 0.1); border:1px solid var(--accent-gold);"><i class="fas fa-clock"></i> Menunggu Inhouse</span>';
                    } else {
                        statusHtml = '<span class="sig-badge pending"><i class="fas fa-clock"></i> Menunggu CPM</span>';
                    }

                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td style="font-weight:700;">${r.user_name}</td>
                        <td>${r.report_date}</td>
                        <td><span class="badge ${(r.shift || '').toLowerCase()}">${r.shift}</span></td>
                        <td>${r.description || '-'}</td>
                        <td>${statusHtml}</td>
                        <td>
                            <div style="display:flex; gap:6px; flex-wrap:wrap;">
                                <button onclick="app.previewReport('${r.id}')" class="btn-secondary" style="padding:6px 10px;" title="Preview"><i class="fas fa-eye"></i></button>
                                ${hasFile
                                    ? `<a href="${r.file_url}" target="_blank" class="btn-secondary" style="padding:6px 10px; text-decoration:none; display:inline-flex; align-items:center; gap:4px;" title="Buka PDF Upload"><i class="fas fa-file-pdf" style="color:#dc2626;"></i></a>`
                                    : hasFormData
                                        ? `<button onclick="app.downloadDigitalPDF('${r.id}')" class="btn-secondary" style="padding:6px 10px; color:#dc2626;" title="Download PDF Form Digital"><i class="fas fa-file-pdf"></i></button>`
                                        : ''}
                                ${['Admin', 'CAR PARK MANAGER', 'Inhouse', 'Supervisor', 'Leader'].includes(window.Laravel.user.role) ? `<button onclick="app.deleteReport('${r.id}')" class="btn-secondary" style="padding:6px 10px; color:var(--error);" title="Hapus"><i class="fas fa-trash"></i></button>` : ''}
                            </div>
                        </td>
                    `;
                    historyBody.appendChild(tr);
                });
            }
        } catch (e) { 
            console.error('Load reports failed:', e); 
            this.showToast('Gagal memuat data laporan.', 'error');
        }
    },

    processExport() {
        const start = document.getElementById('export-start-date').value;
        const end = document.getElementById('export-end-date').value;

        if (!start || !end) return this.showToast('Pilih periode tanggal', 'error');

        const filteredReports = this.reports.filter(r => {
            const date = r.report_date;
            return date >= start && date <= end && r.has_mgr2_sig;
        });

        if (filteredReports.length === 0) {
            return this.showToast('Tidak ada laporan final pada periode tersebut', 'error');
        }

        document.getElementById('export-modal').classList.add('hidden');
        this.showToast(`Memproses ${filteredReports.length} laporan...`, 'info');

        const detailedData = [];
        filteredReports.forEach(r => {
            const items = r.form_data?.items || [];
            const baseUrl = window.Laravel.baseUrl.replace(/\/$/, "");
            const reportLink = `${baseUrl}/dashboard?report_id=${r.id}&auto_pdf=1`;

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
                        'LINK DETAIL': index === 0 ? { f: `HYPERLINK("${reportLink}","KLIK DISINI")` } : '',
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
                    'LINK DETAIL': { f: `HYPERLINK("${reportLink}","KLIK DISINI")` },
                    'Status': 'FINAL'
                });
            }
        });

        const worksheet = XLSX.utils.json_to_sheet(detailedData);
        const wscols = [
            { wch: 5 }, { wch: 12 }, { wch: 8 }, { wch: 20 }, { wch: 20 }, { wch: 40 }, { wch: 15 }, { wch: 20 }, { wch: 35 }, { wch: 10 }
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

    handleBulkDownload() {
        // Ambil filter yang sedang aktif di dashboard
        const startDate = document.getElementById('filter-start-date')?.value || '';
        const endDate   = document.getElementById('filter-end-date')?.value   || '';
        const shift     = document.getElementById('filter-shift')?.value       || '';

        // Hitung laporan yang punya file PDF (file_url) sesuai filter saat ini
        const reportsWithFile = this.reports.filter(r => r.file_url);

        if (reportsWithFile.length === 0) {
            this.showToast('Tidak ada file PDF dalam filter saat ini. Pastikan ada laporan yang diupload (bukan Form Digital).', 'error');
            return;
        }

        // Konfirmasi download
        const msg = `Unduh ZIP berisi ${reportsWithFile.length} file PDF` +
                    (startDate ? ` dari ${startDate}` : '') +
                    (endDate   ? ` s/d ${endDate}`    : '') +
                    (shift     ? ` (${shift})`         : '') +
                    '?';

        this.showConfirm(msg, () => {
            this._triggerZipDownload(startDate, endDate, shift);
        }, '📥 Ya, Unduh ZIP');
    },

    async _triggerZipDownload(startDate, endDate, shift) {
        this.showToast('Menyiapkan ZIP... proses ini mungkin memakan beberapa menit.', 'info');
        this.showGlobalLoader();

        try {
            // Filter laporan sesuai kriteria
            let filtered = this.reports;
            if (startDate) filtered = filtered.filter(r => r.report_date >= startDate);
            if (endDate)   filtered = filtered.filter(r => r.report_date <= endDate);
            if (shift)     filtered = filtered.filter(r => r.shift === shift);

            if (filtered.length === 0) {
                this.showToast('Tidak ada laporan ditemukan untuk filter ini.', 'error');
                this.hideGlobalLoader();
                return;
            }

            const zip = new JSZip();
            let addedCount = 0;
            const errors = [];

            for (const report of filtered) {
                const safeName = `DAILY_REPORT_${report.report_date}_${report.shift}_${report.spv_name || report.user_name}`
                    .replace(/[^A-Za-z0-9_\-]/g, '_');

                try {
                    if (report.file_url) {
                        // --- Laporan upload PDF: fetch dari Supabase ---
                        // Fetch via server proxy agar tidak kena CORS
                        const proxyUrl = new URL(`${window.Laravel.baseUrl}/v1/reports/zip`);
                        proxyUrl.searchParams.append('start_date', report.report_date);
                        proxyUrl.searchParams.append('end_date', report.report_date);
                        proxyUrl.searchParams.append('shift', report.shift);
                        // Catatan: kita pakai direct fetch untuk file individual
                        const res = await fetch(report.file_url, { mode: 'cors' });
                        if (res.ok) {
                            const blob = await res.blob();
                            zip.file(`${safeName}.pdf`, blob);
                            addedCount++;
                        } else {
                            errors.push(safeName);
                        }
                    } else if (report.form_data && Object.keys(report.form_data).length > 0) {
                        // --- Form Digital: generate PDF client-side ---
                        // Fetch full form_data jika belum ada
                        let fd = report.form_data;
                        if (typeof fd === 'string') {
                            try { fd = JSON.parse(fd); } catch(e) { fd = {}; }
                        }

                        if (!fd || Object.keys(fd).length === 0) {
                            const res = await fetch(`${window.Laravel.baseUrl}/v1/reports/${report.id}`);
                            const detail = await res.json();
                            fd = detail.data?.form_data || detail.form_data || {};
                        }

                        if (fd && Object.keys(fd).length > 0) {
                            const blob = await this._generatePdfBlobFromFormData(fd, report);
                            zip.file(`${safeName}.pdf`, blob);
                            addedCount++;
                        } else {
                            errors.push(safeName + ' (form kosong)');
                        }
                    } else {
                        // Tidak ada file maupun form data — skip
                    }
                } catch (err) {
                    console.warn('Error processing report:', safeName, err);
                    errors.push(safeName);
                }
            }

            if (addedCount === 0) {
                this.showToast('Tidak ada PDF yang berhasil diproses.', 'error');
                this.hideGlobalLoader();
                return;
            }

            // Generate dan download ZIP
            const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(zipBlob);
            a.download = `DAILY_REPORT_${new Date().toISOString().slice(0,10)}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(a.href);

            let msg = `ZIP berhasil! ${addedCount} file PDF diunduh.`;
            if (errors.length > 0) msg += ` (${errors.length} gagal: ${errors.slice(0,2).join(', ')}${errors.length > 2 ? '...' : ''})`;
            this.showToast(msg, addedCount > 0 ? 'success' : 'error');

        } catch (e) {
            console.error('ZIP generation failed:', e);
            this.showToast('Gagal membuat ZIP: ' + e.message, 'error');
        } finally {
            this.hideGlobalLoader();
        }
    },

    /**
     * Download PDF langsung dari Form Digital (tanpa perlu buka print preview)
     * Dipanggil dari tombol di tabel history / report card
     */
    async downloadDigitalPDF(reportId) {
        let report = this.reports.find(r => r.id == reportId);
        if (!report) return this.showToast('Laporan tidak ditemukan', 'error');

        this.showToast('Menyiapkan PDF...', 'info');
        this.showGlobalLoader();

        try {
            // Fetch full form_data if not loaded yet
            if (!report.form_data || Object.keys(report.form_data).length === 0) {
                const res = await fetch(`${window.Laravel.baseUrl}/v1/reports/${reportId}`);
                const detail = await res.json();
                report.form_data = detail.data?.form_data || detail.form_data;
            }

            if (!report.form_data) throw new Error('Data form tidak tersedia');

            const blob = await this._generatePdfBlobFromFormData(report.form_data, report);
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `DAILY_REPORT_${report.report_date}_${report.shift}_${(report.spv_name || report.user_name || 'SPV').replace(/[^A-Za-z0-9_\-]/g, '_')}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(a.href);
            this.showToast('PDF berhasil diunduh!', 'success');
        } catch (e) {
            console.error('Download PDF error:', e);
            this.showToast('Gagal membuat PDF: ' + e.message, 'error');
        } finally {
            this.hideGlobalLoader();
        }
    },

    /**
     * Helper: Generate HTML dari form_data lalu konversi ke PDF blob.
     * Dipakai oleh downloadDigitalPDF() dan _triggerZipDownload().
     * @returns {Promise<Blob>}
     */
    _generatePdfBlobFromFormData(formData, report) {
        return new Promise((resolve, reject) => {
            if (!window.formDigital || typeof window.formDigital.openPrintPreview !== 'function') {
                return reject(new Error('formDigital module tidak tersedia'));
            }

            // Render HTML ke elemen tersembunyi
            const container = document.createElement('div');
            container.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:794px;background:white;font-family:Arial,sans-serif;';
            document.body.appendChild(container);

            // Gunakan openPrintPreview untuk generate HTML, tapi ke container sementara
            // Kita ambil HTML dari formDigital.buildPrintHtml
            const html = window.formDigital._buildPrintHTML(formData, report);
            container.innerHTML = html;

            const opt = {
                margin: [8, 8, 8, 8],
                filename: `DAILY_REPORT.pdf`,
                image: { type: 'jpeg', quality: 0.95 },
                html2canvas: { scale: 1.5, useCORS: true, logging: false },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            html2pdf().set(opt).from(container).output('blob')
                .then(blob => {
                    document.body.removeChild(container);
                    resolve(blob);
                })
                .catch(err => {
                    if (document.body.contains(container)) document.body.removeChild(container);
                    reject(err);
                });
        });
    },

    downloadPDF(openInNewTab = false, targetTab = null) {
        const element = document.getElementById('print-content');
        if (!element || !element.innerHTML) {
            if (targetTab) targetTab.close();
            return this.showToast('Gagal memproses PDF', 'error');
        }

        this.showToast('Menyiapkan PDF...', 'info');

        const opt = {
            margin: [10, 10, 10, 10],
            filename: `DAILY_REPORT_${new Date().toISOString().split('T')[0]}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, letterRendering: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        const worker = html2pdf().set(opt).from(element);
        
        if (openInNewTab) {
            worker.output('bloburl').then((url) => {
                if (targetTab) {
                    targetTab.location.href = url;
                } else {
                    window.open(url, '_blank');
                }
                this.showToast('PDF berhasil dibuka di tab baru', 'success');
            }).catch(err => {
                if (targetTab) targetTab.close();
                console.error(err);
            });
        } else {
            worker.save()
                .then(() => this.showToast('PDF berhasil diunduh', 'success'))
                .catch(err => {
                    console.error(err);
                    this.showToast('Gagal mengunduh PDF', 'error');
                });
        }
    },

    async previewReport(id) {
        let report = this.reports.find(r => r.id == id);
        if (!report) return;

        // Fetch full data if form_data is not present (lazy loading for performance)
        if (!report.form_data || Object.keys(report.form_data).length === 0) {
            this.showGlobalLoader();
            try {
                const res = await fetch(`${window.Laravel.baseUrl}/v1/reports/${id}`);
                const detail = await res.json();
                report.form_data = detail.data.form_data;
                this.hideGlobalLoader();
            } catch (e) {
                this.hideGlobalLoader();
                return this.showToast('Gagal memuat detail laporan', 'error');
            }
        }

        if (report.file_url) window.open(report.file_url, '_blank');
        else if (report.form_data) this.renderDigitalPreview(report.form_data, report);
        else if (report.manual_content) {
            document.getElementById('modal-content-body').textContent = report.manual_content;
            document.getElementById('manual-modal').classList.remove('hidden');
        } else {
            this.showToast('Data laporan tidak ditemukan atau kosong', 'error');
        }
    },

    // New helper to avoid race conditions with this.reports
    renderDigitalPreview(formData, report) {
        if (window.formDigital) {
            window.formDigital.openPrintPreview(formData, report);
        }
    },

    async editDigitalForm(id) {
        let report = this.reports.find(r => r.id == id);
        if (!report) return;

        // Fetch full data if form_data is not present (lazy loading for performance)
        if (!report.form_data || Object.keys(report.form_data).length === 0) {
            this.showGlobalLoader();
            try {
                const res = await fetch(`${window.Laravel.baseUrl}/v1/reports/${id}`);
                const detail = await res.json();
                report.form_data = detail.data.form_data;
                this.hideGlobalLoader();
            } catch (e) {
                this.hideGlobalLoader();
                return this.showToast('Gagal memuat detail laporan', 'error');
            }
        }

        if (!report.form_data) return this.showToast('Laporan digital tidak ditemukan', 'error');

        this.renderDigitalEdit(report.form_data, report);
    },

    renderDigitalEdit(formData, report) {
        const id = report.id;
        this.switchView('upload');
        const btnForm = document.querySelector('.method-btn[data-method="form"]');
        if (btnForm) btnForm.click();

        document.getElementById('df-report-id').value = id;
        document.getElementById('df-tanggal').value = report.report_date;
        document.getElementById('df-nama').value = report.spv_name || report.user_name || '';
        document.getElementById('df-shift').value = report.shift;
        document.getElementById('df-briefing').value = formData.briefing || '';
        document.getElementById('df-training').value = formData.training || '';

        // Ownership & Permissions Check
        const isOwner = report.user_id === window.Laravel.user.id || (report.user_name === window.Laravel.user.name && !report.user_id);
        
        const canEdit = isOwner;

        // Toggle Readonly state for inputs
        const inputs = document.querySelectorAll('#view-upload input, #view-upload textarea, #view-upload select');
        inputs.forEach(input => {
            if (input.id === 'df-report-id' || input.id === 'sig-photo-input' || input.id === 'df-nama') return;

            if (!canEdit) {
                input.setAttribute('readonly', true);
                input.classList.add('input-readonly');
                if (input.tagName === 'SELECT') input.disabled = true;
            } else {
                input.removeAttribute('readonly');
                input.classList.remove('input-readonly');
                if (input.tagName === 'SELECT') input.disabled = false;
            }
        });

        // Hide 'Add Row' button if can't edit
        const addRowBtn = document.querySelector('.btn-add-row');
        if (addRowBtn) addRowBtn.style.display = canEdit ? 'block' : 'none';

        const mp_jabatan = ['Car Park Manager', 'IT', 'Administrasi', 'Supervisor', 'Leader', 'Staff'];
        mp_jabatan.forEach(j => {
            const inp = document.querySelector(`.mp-input[data-jabatan="${j}"]`);
            const inpMid = document.querySelector(`.mp-input-middle[data-jabatan="${j}"]`);
            if (inp) inp.value = formData.manpower?.[j] || '';
            if (inpMid) inpMid.value = formData.manpower?.[j + '_middle'] || '';
        });
        this.calcTotal();

        const plotingTbody = document.getElementById('ploting-tbody');
        if (plotingTbody && formData.ploting) {
            plotingTbody.innerHTML = '';
            formData.ploting.forEach((p, i) => {
                const tr = document.createElement('tr');
                tr.className = 'ploting-row';
                tr.innerHTML = `
                    <td style="text-align:center; color:var(--text-dim); font-size:0.8rem;">${i+1}</td>
                    <td><input type="text" class="ploting-area" value="${p.area || ''}" placeholder="Nama Area" style="width:100%; border:none; background:transparent; padding:4px 0; font-size:0.9rem;"></td>
                    <td><input type="text" class="ploting-petugas" value="${p.petugas || ''}" placeholder="Nama Petugas" style="width:100%; border:none; background:transparent; padding:4px 0; font-size:0.9rem;"></td>
                `;
                plotingTbody.appendChild(tr);
            });
            if (formData.ploting.length === 0) {
                PLOTTING_AREAS.forEach(area => window.formDigital.addPlotingRow(area));
            }
        }

        const perlenTbody = document.querySelector('#tbl-perlengkapan tbody');
        if (perlenTbody && formData.perlengkapan) {
            perlenTbody.innerHTML = '';
            formData.perlengkapan.forEach((p, i) => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="text-align:center; color:var(--text-dim); font-size:0.8rem;">${i+1}</td>
                    <td style="font-weight:600;">${p.nama || ''}</td>
                    <td style="text-align:center; padding:8px 6px;"><input type="number" class="perlen-jumlah" value="${p.jumlah || 0}" style="width:100%; min-width:80px; padding:6px 2px; text-align:center;"></td>
                    <td style="text-align:center; padding:8px 6px;"><input type="number" class="perlen-baik" value="${p.baik || 0}" style="width:100%; min-width:80px; padding:6px 2px; text-align:center; color:green;"></td>
                    <td style="text-align:center; padding:8px 6px;"><input type="number" class="perlen-rusak" value="${p.rusak || 0}" style="width:100%; min-width:80px; padding:6px 2px; text-align:center; color:red;"></td>
                    <td><input type="text" class="perlen-ket" value="${p.keterangan || ''}" style="width:100%; border:none; background:transparent;"></td>
                `;
                perlenTbody.appendChild(tr);
            });
        }

        const alatTbody = document.querySelector('#tbl-peralatan tbody');
        if (alatTbody) {
            alatTbody.innerHTML = '';
            const peralatanData = (formData.peralatan && formData.peralatan.length > 0) 
                ? formData.peralatan 
                : DEFAULT_PERALATAN.map((item, i) => ({ no: i+1, nama: item[0], jumlah: item[1], baik: item[1], rusak: 0, keterangan: '-' }));
            
            peralatanData.forEach((p, i) => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="text-align:center; color:var(--text-dim); font-size:0.8rem;">${i+1}</td>
                    <td style="font-weight:600;">${p.nama || ''}</td>
                    <td style="text-align:center; padding:8px 6px;"><input type="number" class="alat-jumlah" value="${p.jumlah || 0}" style="width:100%; min-width:80px; padding:6px 2px; text-align:center;"></td>
                    <td style="text-align:center; padding:8px 6px;"><input type="number" class="alat-baik" value="${p.baik || 0}" style="width:100%; min-width:80px; padding:6px 2px; text-align:center; color:green;"></td>
                    <td style="text-align:center; padding:8px 6px;"><input type="number" class="alat-rusak" value="${p.rusak || 0}" style="width:100%; min-width:80px; padding:6px 2px; text-align:center; color:red;"></td>
                    <td><input type="text" class="alat-ket" value="${p.keterangan || ''}" style="width:100%; border:none; background:transparent;"></td>
                `;
                alatTbody.appendChild(tr);
            });
        }

        const specTbody = document.querySelector('#tbl-spesifikasi tbody');
        if (specTbody && formData.spesifikasi) {
            specTbody.innerHTML = '';
            formData.spesifikasi.forEach((s, i) => {
                const tr = document.createElement('tr');
                tr.className = 'spesifikasi-row';
                tr.innerHTML = `
                    <td style="padding:8px;">
                        <select class="spec-jenis" style="width:100%; padding:8px; border-radius:8px; border:1px solid var(--border); background:white;">
                            <option value="Temuan" ${s.jenis === 'Temuan' ? 'selected' : ''}>Temuan</option>
                            <option value="Kejadian" ${s.jenis === 'Kejadian' ? 'selected' : ''}>Kejadian</option>
                            <option value="Kegiatan" ${s.jenis === 'Kegiatan' ? 'selected' : ''}>Kegiatan</option>
                            <option value="Laporan" ${s.jenis === 'Laporan' ? 'selected' : ''}>Laporan</option>
                        </select>
                    </td>
                    <td style="padding:8px;"><input type="text" class="spec-waktu" maxlength="5" oninput="this.value = this.value.replace(/[^0-9]/g, '').replace(/^(\\d{2})(\\d{1,2})/, '$1:$2')" value="${s.waktu || ''}" style="width:100%; padding:8px; border:1px solid var(--border); border-radius:8px; text-align:center; background:white;"></td>
                    <td style="padding:8px;"><textarea class="spec-detail" style="width:100%; min-height:60px; padding:10px; border:1px solid var(--border); border-radius:8px; background:white; resize:vertical; font-family:inherit; font-size:0.9rem;">${s.detail || ''}</textarea></td>
                    <td style="padding:8px;"><textarea class="spec-tindakan" style="width:100%; min-height:60px; padding:10px; border:1px solid var(--border); border-radius:8px; background:white; resize:vertical; font-family:inherit; font-size:0.9rem;">${s.tindakan || ''}</textarea></td>
                    <td style="text-align:center; padding:8px;">
                        <select class="spec-status" style="width:100%; padding:8px; border-radius:8px; border:1px solid var(--border); background:white; font-weight:700;">
                            <option value="Done" ${s.status === 'Done' ? 'selected' : ''}>Done</option>
                            <option value="On Progres" ${s.status === 'On Progres' ? 'selected' : ''}>On Progres</option>
                        </select>
                    </td>
                    <td style="text-align:center; padding:8px;">
                        <button type="button" class="btn-remove-row" onclick="this.closest('tr').remove()" title="Hapus baris" style="background:rgba(239, 68, 68, 0.1); color:#ef4444; border:none; width:32px; height:32px; border-radius:8px;"><i class="fas fa-times"></i></button>
                    </td>
                `;
                specTbody.appendChild(tr);
            });
            if (formData.spesifikasi.length === 0) window.formDigital.addSpesifikasiRow();
        }

        if (window.formDigital) {
            window.formDigital.loadExistingSignatures(formData.signatures, formData.signer_names);
        }

        // We already have canEdit from above. 
        // If not canEdit, we make sure all form-digital elements are also readonly
        if (!canEdit) {
            document.querySelectorAll('#form-digital input, #form-digital textarea, #form-digital select').forEach(el => {
                el.readOnly = true;
                el.classList.add('input-readonly');
                if (el.tagName === 'SELECT') el.disabled = true;
            });
            document.querySelectorAll('#form-digital .btn-remove-row, #form-digital .btn-add-row').forEach(el => {
                el.style.display = 'none';
            });
        }

        this.showToast('Laporan dimuat untuk ditandatangani', 'info');
    },

    async deleteReport(id) {
        this.showConfirm('Hapus laporan ini?', async () => {
            try {
                const res = await fetch(`${window.Laravel.baseUrl}/v1/reports/${id}`, {
                    method: 'DELETE',
                    headers: { 'X-CSRF-TOKEN': window.Laravel.csrfToken }
                });
                if (res.ok) { this.showToast('Laporan dihapus', 'success'); this.refreshData(); }
            } catch (e) { console.error('Delete report failed:', e); }
        });
    },

    viewDigitalForm(id) {
        this.previewReport(id);
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
        } catch (e) { console.error('Upload failed:', e); } finally { btn.disabled = false; }
    },

    async handlePurge(all) {
        const startDate = document.getElementById('purge-start')?.value;
        const endDate = document.getElementById('purge-end')?.value;
        if (!all && !startDate && !endDate) return this.showToast('Pilih range tanggal', 'error');

        this.showConfirm(all ? 'Hapus SEMUA data?' : 'Hapus data di range ini?', async () => {
            try {
                const res = await fetch(`${window.Laravel.baseUrl}/v1/reports/purge`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': window.Laravel.csrfToken },
                    body: JSON.stringify({ start_date: startDate, end_date: endDate, all })
                });
                if (res.ok) { this.showToast('Data dibersihkan', 'success'); this.refreshData(); }
            } catch (e) { console.error('Purge failed:', e); }
        });
    },

    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<i class="fas fa-info-circle"></i> <span>${message}</span>`;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    },

    showConfirm(message, onYes, yesLabel = 'Ya, Lanjutkan') {
        const modal = document.getElementById('confirm-modal');
        const msgEl = document.getElementById('confirm-message');
        const btnYes = document.getElementById('confirm-yes');
        const btnNo = document.getElementById('confirm-no');

        if (!modal || !msgEl || !btnYes || !btnNo) {
            if (confirm(message)) onYes();
            return;
        }

        msgEl.textContent = message;
        btnYes.textContent = yesLabel;
        modal.classList.remove('hidden');

        const handleYes = () => {
            modal.classList.add('hidden');
            btnYes.textContent = 'Ya, Hapus'; // reset default
            onYes();
            cleanup();
        };
        const handleNo = () => {
            modal.classList.add('hidden');
            btnYes.textContent = 'Ya, Hapus'; // reset default
            cleanup();
        };
        const cleanup = () => {
            btnYes.removeEventListener('click', handleYes);
            btnNo.removeEventListener('click', handleNo);
        };

        btnYes.addEventListener('click', handleYes);
        btnNo.addEventListener('click', handleNo);
    },

    showGlobalLoader() {
        const el = document.getElementById('global-loader');
        if (el) el.classList.remove('hidden');
    },

    hideGlobalLoader() {
        const el = document.getElementById('global-loader');
        if (el) el.classList.add('hidden');
    }

};

const formDigital = {
    init() {
        this.bindManpowerAutoSum();
        this.bindFormSubmit();
        this.bindPrintPreview();
        this.initSignaturePads();
        this.bindSigPhotoUpload();
        
        const debouncedResize = app.debounce(() => this.resizeSignaturePads(), 250);
        window.addEventListener('resize', debouncedResize);
    },

    bindSigPhotoUpload() {
        const input = document.getElementById('sig-photo-input');
        if (!input) return;
        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            const key = input.dataset.targetKey;
            if (file && key) {
                this.importSignatureFromPhoto(key, file);
                input.value = ''; // Reset for next use
            }
        });
    },

    triggerSigPhotoUpload(key) {
        const input = document.getElementById('sig-photo-input');
        if (input) {
            input.dataset.targetKey = key;
            input.click();
        }
    },

    async importSignatureFromPhoto(key, file) {
        const pad = this.sigPads?.[key];
        if (!pad) return;

        const wrapper = pad.canvas.closest('.sig-pad-wrapper');
        const processingOverlay = document.createElement('div');
        processingOverlay.className = 'sig-processing';
        processingOverlay.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Memproses foto...</span>';
        wrapper.appendChild(processingOverlay);

        try {
            const img = await this.loadImage(file);
            const processedDataUrl = await this.processSignatureImage(img);
            
            // Clear pad and load the processed signature
            pad.clear();
            
            // Use SignaturePad's fromDataURL but we might need to scale it
            // Better to draw it on the canvas directly then tell pad it changed
            const canvas = pad.canvas;
            const ctx = canvas.getContext('2d');
            const resultImg = new Image();
            resultImg.onload = () => {
                const ratio = Math.max(window.devicePixelRatio || 1, 1);
                const cw = canvas.width;
                const ch = canvas.height;
                
                // Scale to 90% of physical canvas size
                const scale = Math.min(cw / resultImg.width, ch / resultImg.height) * 0.9;
                const sw = resultImg.width * scale;
                const sh = resultImg.height * scale;
                const sx = (cw - sw) / 2;
                const sy = (ch - sh) / 2;

                // Create a temp canvas of the SAME physical size as the main canvas
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = cw;
                tempCanvas.height = ch;
                const tCtx = tempCanvas.getContext('2d');
                tCtx.drawImage(resultImg, sx, sy, sw, sh);

                // Clear existing and handle loading
                wrapper.querySelector('.existing-sig')?.remove();
                canvas.style.opacity = '1';
                pad.clear();
                
                // Load the entire temp canvas into the pad without extra options to avoid doubling/scaling
                pad.fromDataURL(tempCanvas.toDataURL());
                
                processingOverlay.remove();
                app.showToast('Tanda tangan berhasil diimpor', 'success');
            };
            resultImg.src = processedDataUrl;

        } catch (error) {
            console.error('Signature processing failed', error);
            app.showToast('Gagal memproses foto tanda tangan', 'error');
            processingOverlay.remove();
        }
    },

    loadImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = reject;
                img.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    },

    processSignatureImage(img) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Limit size for processing speed
            const maxDim = 1000;
            let w = img.width;
            let h = img.height;
            if (w > maxDim || h > maxDim) {
                if (w > h) { h *= maxDim / w; w = maxDim; }
                else { w *= maxDim / h; h = maxDim; }
            }
            
            canvas.width = w;
            canvas.height = h;
            ctx.drawImage(img, 0, 0, w, h);
            
            const imageData = ctx.getImageData(0, 0, w, h);
            const data = imageData.data;
            
            // Image processing algorithm:
            // 1. Grayscale
            // 2. Thresholding (Adaptive-ish)
            // 3. Make non-signature pixels transparent
            
            // First pass: find average brightness
            let totalBrightness = 0;
            for (let i = 0; i < data.length; i += 4) {
                const brightness = (data[i] + data[i+1] + data[i+2]) / 3;
                totalBrightness += brightness;
            }
            const avgBrightness = totalBrightness / (data.length / 4);
            
            // Threshold is slightly below average to catch only darker strokes
            const threshold = avgBrightness * 0.85; 

            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i+1];
                const b = data[i+2];
                const brightness = (r + g + b) / 3;
                
                if (brightness > threshold) {
                    // It's background (white paper) -> make transparent
                    data[i + 3] = 0;
                } else {
                    // It's signature (pen stroke) -> make it solid black for clarity
                    // or keep it but enhance contrast
                    data[i] = 0;
                    data[i+1] = 0;
                    data[i+2] = 0;
                    // Boost opacity based on how dark it was
                    data[i+3] = Math.min(255, (threshold - brightness) * (255 / threshold) * 2);
                }
            }
            
            ctx.putImageData(imageData, 0, 0);

            // Auto-crop: Find the bounding box of non-transparent pixels
            let minX = w, minY = h, maxX = 0, maxY = 0;
            let found = false;
            for (let y = 0; y < h; y++) {
                for (let x = 0; x < w; x++) {
                    const alpha = data[(y * w + x) * 4 + 3];
                    if (alpha > 0) {
                        minX = Math.min(minX, x);
                        minY = Math.min(minY, y);
                        maxX = Math.max(maxX, x);
                        maxY = Math.max(maxY, y);
                        found = true;
                    }
                }
            }

            if (found) {
                const cropW = (maxX - minX) + 1;
                const cropH = (maxY - minY) + 1;
                const cropCanvas = document.createElement('canvas');
                cropCanvas.width = cropW;
                cropCanvas.height = cropH;
                cropCanvas.getContext('2d').drawImage(canvas, minX, minY, cropW, cropH, 0, 0, cropW, cropH);
                resolve(cropCanvas.toDataURL('image/png'));
            } else {
                resolve(canvas.toDataURL('image/png'));
            }
        });
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
                
                // Simpan state saat ini
                const isEmpty = pad.isEmpty();
                const currentDataUrl = isEmpty ? null : pad.toDataURL();
                
                // Atur ukuran canvas fisik
                canvas.width = canvas.offsetWidth * ratio;
                canvas.height = canvas.offsetHeight * ratio;
                
                // Atur skala konteks 2D
                const ctx = canvas.getContext("2d");
                ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform sebelum scaling
                ctx.scale(ratio, ratio);
                
                pad.clear();
                if (currentDataUrl) {
                    pad.fromDataURL(currentDataUrl, {
                        width: canvas.offsetWidth,
                        height: canvas.offsetHeight
                    });
                }
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
                delete wrapper.dataset.existingSrc;
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
            const pad = this.sigPads?.[key];
            const canvas = pad?.canvas;
            const wrapper = canvas?.closest('.sig-pad-wrapper');
            if (pad && sigs[key]) {
                // Remove any old overlaid images if they exist
                wrapper.querySelector('.existing-sig')?.remove();
                
                // Ensure canvas is visible
                canvas.style.opacity = '1';
                
                // Load the image directly into the pad
                pad.clear();
                pad.fromDataURL(sigs[key], {
                    width: canvas.offsetWidth,
                    height: canvas.offsetHeight
                });

                // Store signer name and existing source for fallback
                wrapper.dataset.existingSrc = sigs[key];
                if (names[key]) {
                    wrapper.dataset.signerName = names[key];
                    const nameDisp = document.getElementById(`df-sig-name-${key}`);
                    if (nameDisp) nameDisp.textContent = names[key];
                }
            }
        });
    },

    async resetForm() {
        const form = document.getElementById('form-digital');
        if (!form) return;
        form.reset();
        document.getElementById('df-report-id').value = '';
        document.getElementById('ploting-tbody').innerHTML = '';
        document.getElementById('spesifikasi-tbody').innerHTML = '';
        PLOTTING_AREAS.forEach(area => this.addPlotingRow(area));

        let carriedForward = false;
        const user = window.Laravel?.user;
        
        if (user) {
            try {
                // Fetch up to 50 recent reports to ensure we don't miss anything due to pagination
                const url = new URL(`${window.Laravel.baseUrl}/v1/reports`);
                url.searchParams.append('per_page', 50);
                url.searchParams.append('full_data', 1);
                url.searchParams.append('_', new Date().getTime()); // cache busting
                
                const response = await fetch(url, {
                    headers: { 'X-Requested-With': 'XMLHttpRequest' }
                });
                
                if (response.ok) {
                    const json = await response.json();
                    const data = json.data || json;
                    
                    const seenDetails = new Set();
                    const itemsToCarry = [];

                    for (const r of data) {
                        // Batasi hanya laporan dari tanggal 10 Juni 2026 ke atas
                        const reportDateStr = r.report_date || '';
                        if (reportDateStr && reportDateStr < '2026-06-10') {
                            continue;
                        }

                        let formData = r.form_data;
                        if (typeof formData === 'string') {
                            try { formData = JSON.parse(formData); } catch(e) { formData = {}; }
                        }
                        
                        if (formData && formData.spesifikasi) {
                            formData.spesifikasi.forEach(s => {
                                const detailKey = (s.detail || '').trim().toLowerCase();
                                if (!detailKey) return;

                                if (!seenDetails.has(detailKey)) {
                                    seenDetails.add(detailKey);
                                    // Allow flexible status matching
                                    if (s.status === 'On Progres' || s.status === 'On Progress') {
                                        itemsToCarry.push(s);
                                    }
                                }
                            });
                        }
                    }

                    itemsToCarry.reverse().forEach(s => {
                        this.addSpesifikasiRow(s);
                        carriedForward = true;
                    });
                }
            } catch (err) {
                console.error("Gagal menarik data On Progres otomatis:", err);
            }
        }

        if (!carriedForward) {
            this.addSpesifikasiRow();
        }

        this.calcTotal();
        Object.keys(this.sigPads || {}).forEach(k => this.clearSig(k));

        // Reset name inputs
        ['spv', 'mgr-1', 'mgr-2'].forEach(k => {
            const inp = document.getElementById(`df-sig-name-${k}`);
            if (inp) inp.textContent = (k === 'spv') ? (window.Laravel?.user?.name || '') : '....................';
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

    addPlotingRow(area = '') {
        const tbody = document.getElementById('ploting-tbody');
        const tr = document.createElement('tr');
        tr.className = 'ploting-row';
        tr.innerHTML = `
            <td style="text-align:center; color:var(--text-dim); font-size:0.8rem;">${tbody.children.length + 1}</td>
            <td><input type="text" class="ploting-area" value="${area}" placeholder="Nama Area" style="width:100%; border:none; background:transparent; padding:4px 0; font-size:0.9rem;"></td>
            <td><input type="text" class="ploting-petugas" placeholder="Nama Petugas" style="width:100%; border:none; background:transparent; padding:4px 0; font-size:0.9rem;"></td>
            <td style="text-align:center;"><button type="button" class="btn-remove-row" onclick="this.closest('tr').remove()" title="Hapus baris">×</button></td>
        `;
        tbody.appendChild(tr);
    },

    addSpesifikasiRow(data = null) {
        const tbody = document.getElementById('spesifikasi-tbody');
        const tr = document.createElement('tr');
        tr.className = 'spesifikasi-row';
        
        const jenis = data?.jenis || 'Temuan';
        const waktu = data?.waktu || '';
        const detail = data?.detail || '';
        const tindakan = data?.tindakan || '';
        const status = data?.status || 'On Progres';

        tr.innerHTML = `
            <td style="padding:8px;">
                <select class="spec-jenis" style="width:100%; padding:8px; border:1px solid var(--border); border-radius:8px; background:white;">
                    <option value="Temuan" ${jenis === 'Temuan' ? 'selected' : ''}>Temuan</option>
                    <option value="Kejadian" ${jenis === 'Kejadian' ? 'selected' : ''}>Kejadian</option>
                    <option value="Kegiatan" ${jenis === 'Kegiatan' ? 'selected' : ''}>Kegiatan</option>
                    <option value="Laporan" ${jenis === 'Laporan' ? 'selected' : ''}>Laporan</option>
                </select>
            </td>
            <td style="padding:8px;"><input type="text" class="spec-waktu" maxlength="5" placeholder="00:00" oninput="this.value = this.value.replace(/[^0-9]/g, '').replace(/^(\\d{2})(\\d{1,2})/, '$1:$2')" value="${waktu}" style="width:100%; padding:8px; border:1px solid var(--border); border-radius:8px; text-align:center; background:white;"></td>
            <td style="padding:8px;"><textarea class="spec-detail" placeholder="Isi detail..." style="width:100%; min-height:60px; padding:10px; border:1px solid var(--border); border-radius:8px; background:white; resize:vertical; font-family:inherit; font-size:0.9rem;">${detail}</textarea></td>
            <td style="padding:8px;"><textarea class="spec-tindakan" placeholder="Isi tindakan..." style="width:100%; min-height:60px; padding:10px; border:1px solid var(--border); border-radius:8px; background:white; resize:vertical; font-family:inherit; font-size:0.9rem;">${tindakan}</textarea></td>
            <td style="text-align:center; padding:8px;">
                <select class="spec-status" style="width:100%; padding:8px; border-radius:8px; border:1px solid var(--border); background:white; font-weight:700;">
                    <option value="Done" ${status === 'Done' ? 'selected' : ''}>Done</option>
                    <option value="On Progres" ${status === 'On Progres' ? 'selected' : ''}>On Progres</option>
                </select>
            </td>
            <td style="text-align:center; padding:8px;">
                <button type="button" class="btn-remove-row" onclick="this.closest('tr').remove()" title="Hapus baris" style="background:rgba(239, 68, 68, 0.1); color:#ef4444; border:none; width:32px; height:32px; border-radius:8px;"><i class="fas fa-times"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    },

    collectData() {
        const mp = { TOTAL: 0, TOTAL_MIDDLE: 0 };
        const mp_j = ['Car Park Manager', 'IT', 'Administrasi', 'Supervisor', 'Leader', 'Staff'];
        
        mp_j.forEach(j => {
            const inp = document.querySelector(`.mp-input[data-jabatan="${j}"]`);
            const inpMid = document.querySelector(`.mp-input-middle[data-jabatan="${j}"]`);
            const v1 = parseInt(inp ? inp.value : 0) || 0;
            const v2 = parseInt(inpMid ? inpMid.value : 0) || 0;
            mp[j] = v1;
            mp[j + '_middle'] = v2;
            mp.TOTAL += v1;
            mp.TOTAL_MIDDLE += v2;
        });

        const plot = [];
        document.querySelectorAll('#ploting-tbody tr').forEach((tr, i) => {
            const areaInp = tr.querySelector('.ploting-area');
            const petugasInp = tr.querySelector('.ploting-petugas');
            const area = areaInp ? areaInp.value : '';
            const petugas = petugasInp ? petugasInp.value : '';
            if (area || petugas) plot.push({ no: i + 1, area, petugas });
        });

        const perlen = [];
        document.querySelectorAll('#tbl-perlengkapan tbody tr').forEach((tr, i) => {
            const nameEl = tr.querySelector('td:nth-child(2)');
            const jInp = tr.querySelector('.perlen-jumlah');
            const bInp = tr.querySelector('.perlen-baik');
            const rInp = tr.querySelector('.perlen-rusak');
            const kInp = tr.querySelector('.perlen-ket');
            
            if (nameEl) {
                perlen.push({
                    no: i + 1,
                    nama: nameEl.textContent.trim(),
                    jumlah: jInp ? jInp.value : '0',
                    baik: bInp ? bInp.value : '0',
                    rusak: rInp ? rInp.value : '0',
                    keterangan: kInp ? kInp.value : '-'
                });
            }
        });

        const alat = [];
        document.querySelectorAll('#tbl-peralatan tbody tr').forEach((tr, i) => {
            const nameEl = tr.querySelector('td:nth-child(2)');
            const jInp = tr.querySelector('.alat-jumlah');
            const bInp = tr.querySelector('.alat-baik');
            const rInp = tr.querySelector('.alat-rusak');
            const kInp = tr.querySelector('.alat-ket');
            
            if (nameEl) {
                alat.push({
                    no: i + 1,
                    nama: nameEl.textContent.trim(),
                    jumlah: jInp ? jInp.value : '0',
                    baik: bInp ? bInp.value : '0',
                    rusak: rInp ? rInp.value : '0',
                    keterangan: kInp ? kInp.value : '-'
                });
            }
        });

        const spec = [];
        document.querySelectorAll('#spesifikasi-tbody tr').forEach(tr => {
            const jInp = tr.querySelector('.spec-jenis');
            const wInp = tr.querySelector('.spec-waktu');
            const dInp = tr.querySelector('.spec-detail');
            const tInp = tr.querySelector('.spec-tindakan');
            const sInp = tr.querySelector('.spec-status');
            
            const jenis = jInp ? jInp.value : '';
            const detail = dInp ? dInp.value : '';
            
            if (jenis || detail) {
                spec.push({
                    jenis: jenis,
                    waktu: wInp ? wInp.value : '-',
                    detail: detail,
                    tindakan: tInp ? tInp.value : '-',
                    status: sInp ? sInp.value : '-'
                });
            }
        });

        const sigs = {};
        const signerNames = {};
        ['spv', 'mgr-1', 'mgr-2'].forEach(k => {
            const pad = this.sigPads?.[k];
            if (!pad) return;
            const wrapper = pad.canvas.closest('.sig-pad-wrapper');
            const existingSignerName = wrapper.dataset.signerName;
            const nameInp = document.getElementById(`df-sig-name-${k}`);

            if (!pad.isEmpty()) {
                sigs[k] = pad.toDataURL();
                signerNames[k] = (nameInp && nameInp.textContent && nameInp.textContent !== '....................') 
                    ? nameInp.textContent 
                    : (window.Laravel?.user?.name || '');
            } else if (wrapper.dataset.existingSrc) {
                // Fallback for cases where pad is empty but we have an existing source (though loadExistingSignatures now fills the pad)
                sigs[k] = wrapper.dataset.existingSrc;
                signerNames[k] = existingSignerName || (nameInp ? nameInp.textContent : '');
            }
        });

        return { 
            metadata: {
                spv_name: document.getElementById('df-nama')?.value || '',
                report_date: document.getElementById('df-tanggal')?.value || '',
                shift: document.getElementById('df-shift')?.value || ''
            },
            manpower: mp, 
            ploting: plot, 
            perlengkapan: perlen, 
            peralatan: alat,
            briefing: document.getElementById('df-briefing')?.value || '', 
            training: document.getElementById('df-training')?.value || '', 
            spesifikasi: spec, 
            signatures: sigs, 
            signer_names: signerNames 
        };
    },

    bindFormSubmit() {
        document.getElementById('form-digital')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btn-submit-form');
            const btnText = btn.querySelector('.btn-text-form');
            const loader = btn.querySelector('.dots-wave');
            
            btn.disabled = true;
            if (btnText) btnText.classList.add('hidden');
            if (loader) loader.classList.remove('hidden');
            
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

                let result;
                const contentType = res.headers.get("content-type");
                if (contentType && contentType.indexOf("application/json") !== -1) {
                    result = await res.json();
                } else {
                    const text = await res.text();
                    console.error('Non-JSON response:', text);
                    throw new Error(`Server returned non-JSON response (${res.status})`);
                }

                if (res.ok) { 
                    app.showToast('Laporan berhasil disimpan', 'success'); 
                    await app.refreshData();
                    app.switchView('dashboard'); 
                } else {
                    app.showToast(result.message || 'Gagal menyimpan laporan', 'error');
                }
            } catch (e) { 
                console.error('Save error details:', e);
                app.showToast('Gagal menyimpan: ' + (e.message || 'Kesalahan Server'), 'error');
            } finally { 
                if (btn) btn.disabled = false; 
                if (btnText) btnText.classList.remove('hidden');
                if (loader) loader.classList.add('hidden');
            }
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
        const nama = report.spv_name || document.getElementById('df-nama')?.value || '-';
        const shift = report.shift || document.getElementById('df-shift')?.value || '-';
        const tgl = report.report_date || document.getElementById('df-tanggal')?.value || '-';

        let mpRows = '', plotRows = '', perRows = '', alatRows = '', specRows = '';
        const mp_j = ['Car Park Manager', 'IT', 'Administrasi', 'Supervisor', 'Leader', 'Staff'];
        
        mp_j.forEach(j => {
            const val = data.manpower?.[j] || '0';
            const valMid = data.manpower?.[j + '_middle'] || '0';
            
            mpRows += `
                <tr>
                    <td style="border:1px solid #000; padding:4px 10px;">${j}</td>
                    <td style="border:1px solid #000; padding:4px; text-align:center;">${val}</td>
                    <td style="border:1px solid #000; padding:4px; text-align:center;">${valMid}</td>
                </tr>`;
        });

        (data.ploting || []).forEach(p => {
            plotRows += `
                <tr>
                    <td style="border:1px solid #000; padding:4px; text-align:center;">${p.no}</td>
                    <td style="border:1px solid #000; padding:4px 10px;">${p.area || '-'}</td>
                    <td style="border:1px solid #000; padding:4px 10px;">${p.petugas || '-'}</td>
                </tr>`;
        });

        const perlenData = (data.perlengkapan && data.perlengkapan.length > 0)
            ? data.perlengkapan
            : DEFAULT_PERLENGKAPAN.map((item, i) => ({ no: i+1, nama: item[0], jumlah: item[1], baik: item[1], rusak: 0, keterangan: '-' }));

        perlenData.forEach(p => {
            perRows += `
                <tr>
                    <td style="border:1px solid #000; padding:4px; text-align:center;">${p.no}</td>
                    <td style="border:1px solid #000; padding:4px 8px;">${p.nama || '-'}</td>
                    <td style="border:1px solid #000; padding:4px; text-align:center;">${p.jumlah || '0'}</td>
                    <td style="border:1px solid #000; padding:4px; text-align:center; color:green;">${p.baik || '0'}</td>
                    <td style="border:1px solid #000; padding:4px; text-align:center; color:red;">${p.rusak || '0'}</td>
                    <td style="border:1px solid #000; padding:4px 8px;">${p.keterangan || '-'}</td>
                </tr>`;
        });

        const pData = (data.peralatan && data.peralatan.length > 0)
            ? data.peralatan
            : DEFAULT_PERALATAN.map((item, i) => ({ no: i+1, nama: item[0], jumlah: item[1], baik: item[1], rusak: 0, keterangan: '-' }));

        pData.forEach(p => {
            alatRows += `
                <tr>
                    <td style="border:1px solid #000; padding:4px; text-align:center;">${p.no}</td>
                    <td style="border:1px solid #000; padding:4px 8px;">${p.nama || '-'}</td>
                    <td style="border:1px solid #000; padding:4px; text-align:center;">${p.jumlah || '0'}</td>
                    <td style="border:1px solid #000; padding:4px; text-align:center; color:green;">${p.baik || '0'}</td>
                    <td style="border:1px solid #000; padding:4px; text-align:center; color:red;">${p.rusak || '0'}</td>
                    <td style="border:1px solid #000; padding:4px 8px;">${p.keterangan || '-'}</td>
                </tr>`;
        });

        (data.spesifikasi || []).forEach(s => {
            specRows += `
                <tr>
                    <td style="border:1px solid #000; padding:6px 10px;">${s.jenis || '-'}</td>
                    <td style="border:1px solid #000; padding:6px; text-align:center;">${s.waktu || '-'}</td>
                    <td style="border:1px solid #000; padding:6px 10px;">${s.detail || '-'}</td>
                    <td style="border:1px solid #000; padding:6px 10px;">${s.tindakan || '-'}</td>
                    <td style="border:1px solid #000; padding:6px; text-align:center;">${s.status || '-'}</td>
                </tr>`;
        });

        const html = `
            <div style="font-family: Arial, sans-serif; color: #000; line-height: 1.2; padding: 0;">
                <div style="text-align:center; margin-bottom:15px; border-bottom: 2px solid #000; padding-bottom: 10px;">
                    <h2 style="margin:0; font-size: 16pt;">DAILY REPORT SUPERVISOR</h2>
                    <h3 style="margin:2px 0; font-size: 12pt;">GANDARIA CITY MALL</h3>
                </div>

                <table style="width:100%; margin-bottom:15px; font-size:10pt;">
                    <tr>
                        <td style="width:100px; padding:2px 0;">Supervisor</td>
                        <td style="padding:2px 0;">: <strong>${nama}</strong></td>
                        <td style="width:80px; padding:2px 0;">Shift</td>
                        <td style="padding:2px 0;">: <strong>${shift}</strong></td>
                    </tr>
                    <tr>
                        <td style="padding:2px 0;">Tanggal</td>
                        <td colspan="3" style="padding:2px 0;">: <strong>${tgl}</strong></td>
                    </tr>
                </table>

                <div style="margin-bottom:15px;">
                    <h4 style="margin:0 0 5px; font-size:10pt; text-decoration: underline; background: #eee; padding: 2px 5px;">I. MAN POWER</h4>
                    <table style="width:100%; border-collapse:collapse; font-size:10pt;">
                        <thead>
                            <tr style="background-color: #f2f2f2;">
                                <th style="border:1px solid #000; padding:8px; text-align:left;">JABATAN</th>
                                <th style="border:1px solid #000; padding:8px; width:120px;">SHIFT</th>
                                <th style="border:1px solid #000; padding:8px; width:120px;">MIDDLE</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${mpRows}
                            <tr style="background-color: #eee; font-weight: bold;">
                                <td style="border:1px solid #000; padding:8px 10px;">TOTAL PERSONEL</td>
                                <td style="border:1px solid #000; padding:8px; text-align:center;">${data.manpower?.TOTAL || 0}</td>
                                <td style="border:1px solid #000; padding:8px; text-align:center;">${data.manpower?.TOTAL_MIDDLE || 0}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div style="margin-bottom:15px; page-break-inside: avoid;">
                    <h4 style="margin:0 0 5px; font-size:10pt; text-decoration: underline; background: #eee; padding: 2px 5px;">II. PLOTING PERSONEL</h4>
                    <table style="width:100%; border-collapse:collapse; font-size:10pt;">
                        <thead>
                            <tr style="background-color: #f2f2f2;">
                                <th style="border:1px solid #000; padding:8px; width:40px;">NO</th>
                                <th style="border:1px solid #000; padding:8px; text-align:left;">AREA PLOTING</th>
                                <th style="border:1px solid #000; padding:8px; text-align:left;">NAMA PETUGAS</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${plotRows || '<tr><td colspan="3" style="border:1px solid #000; padding:10px; text-align:center;">Tidak ada data plotting</td></tr>'}
                        </tbody>
                    </table>
                </div>

                <div style="margin-bottom:15px; page-break-inside: avoid;">
                    <h4 style="margin:0 0 5px; font-size:10pt; text-decoration: underline; background: #eee; padding: 2px 5px;">III. PERLENGKAPAN</h4>
                    <table style="width:100%; border-collapse:collapse; font-size:9pt;">
                        <thead>
                            <tr style="background-color: #f2f2f2;">
                                <th rowspan="2" style="border:1px solid #000; padding:4px; width:30px;">NO</th>
                                <th rowspan="2" style="border:1px solid #000; padding:4px; text-align:left;">NAMA PERLENGKAPAN</th>
                                <th rowspan="2" style="border:1px solid #000; padding:4px; width:60px;">TOTAL</th>
                                <th colspan="2" style="border:1px solid #000; padding:4px;">KONDISI</th>
                                <th rowspan="2" style="border:1px solid #000; padding:4px;">KETERANGAN</th>
                            </tr>
                            <tr style="background-color: #f2f2f2;">
                                <th style="border:1px solid #000; padding:4px; width:50px; color:green;">BAIK</th>
                                <th style="border:1px solid #000; padding:4px; width:50px; color:red;">RUSAK</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${perRows || '<tr><td colspan="6" style="border:1px solid #000; padding:10px; text-align:center;">Tidak ada data perlengkapan</td></tr>'}
                        </tbody>
                    </table>
                </div>

                <div style="margin-bottom:15px; page-break-inside: avoid;">
                    <h4 style="margin:0 0 5px; font-size:10pt; text-decoration: underline; background: #eee; padding: 2px 5px;">IV. PERALATAN</h4>
                    <table style="width:100%; border-collapse:collapse; font-size:9pt;">
                        <thead>
                            <tr style="background-color: #f2f2f2;">
                                <th rowspan="2" style="border:1px solid #000; padding:4px; width:30px;">NO</th>
                                <th rowspan="2" style="border:1px solid #000; padding:4px; text-align:left;">NAMA PERALATAN</th>
                                <th rowspan="2" style="border:1px solid #000; padding:4px; width:60px;">TOTAL</th>
                                <th colspan="2" style="border:1px solid #000; padding:4px;">KONDISI</th>
                                <th rowspan="2" style="border:1px solid #000; padding:4px;">KETERANGAN</th>
                            </tr>
                            <tr style="background-color: #f2f2f2;">
                                <th style="border:1px solid #000; padding:4px; width:50px; color:green;">BAIK</th>
                                <th style="border:1px solid #000; padding:4px; width:50px; color:red;">RUSAK</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${alatRows || '<tr><td colspan="6" style="border:1px solid #000; padding:10px; text-align:center;">Tidak ada data peralatan</td></tr>'}
                        </tbody>
                    </table>
                </div>

                <div style="display:flex; gap:10px; margin-bottom:15px; page-break-inside: avoid;">
                    <div style="flex:1; border:1px solid #000; padding:5px;">
                        <h4 style="margin:0 0 5px; border-bottom:1px solid #000; padding-bottom:2px; font-size:9pt; background:#eee;">V. MATERI BRIEFING</h4>
                        <div style="white-space:pre-wrap; min-height:40px; font-size:9pt;">${data.briefing || '-'}</div>
                    </div>
                    <div style="flex:1; border:1px solid #000; padding:5px;">
                        <h4 style="margin:0 0 5px; border-bottom:1px solid #000; padding-bottom:2px; font-size:9pt; background:#eee;">VI. TRAINING / INSTRUKSI</h4>
                        <div style="white-space:pre-wrap; min-height:40px; font-size:9pt;">${data.training || '-'}</div>
                    </div>
                </div>

                <div style="margin-bottom:20px; page-break-inside: avoid;">
                    <h4 style="margin:0 0 5px; font-size:10pt; text-decoration: underline; background: #eee; padding: 2px 5px;">VII. TEMUAN & TINDAKAN (SPESIFIKASI)</h4>
                    <table style="width:100%; border-collapse:collapse; font-size:9pt;">
                        <thead>
                            <tr style="background-color: #f2f2f2;">
                                <th style="border:1px solid #000; padding:8px; text-align:left;">JENIS LAPORAN</th>
                                <th style="border:1px solid #000; padding:8px; width:80px;">WAKTU</th>
                                <th style="border:1px solid #000; padding:8px; text-align:left;">DETAIL KEJADIAN</th>
                                <th style="border:1px solid #000; padding:8px; text-align:left;">TINDAKAN</th>
                                <th style="border:1px solid #000; padding:8px; width:100px;">STATUS</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${specRows || '<tr><td colspan="5" style="border:1px solid #000; padding:10px; text-align:center;">Tidak ada temuan hari ini.</td></tr>'}
                        </tbody>
                    </table>
                </div>

                <div style="page-break-inside: avoid; margin-top: 50px;">
                    <table style="width:100%; border-collapse:collapse; text-align:center; font-size:10pt;">
                        <tr>
                            <td style="width:33.3%; vertical-align: top;">
                                <div style="margin-bottom:10px;">Dibuat Oleh,</div>
                                <div style="height:80px; display:flex; align-items:center; justify-content:center;">
                                    ${data.signatures?.spv ? `<img src="${data.signatures.spv}" style="max-height:80px; max-width:160px; object-fit:contain;">` : ''}
                                </div>
                                <div style="margin-top:10px;">
                                    <strong>( ${data.signer_names?.spv || nama} )</strong><br>
                                    <span style="font-size:8pt; color:#666;">Supervisor / Leader</span>
                                </div>
                            </td>
                            <td style="width:33.3%; vertical-align: top;">
                                <div style="margin-bottom:10px;">Mengetahui,</div>
                                <div style="height:80px; display:flex; align-items:center; justify-content:center;">
                                    ${data.signatures?.['mgr-1'] ? `<img src="${data.signatures['mgr-1']}" style="max-height:80px; max-width:160px; object-fit:contain;">` : ''}
                                </div>
                                <div style="margin-top:10px;">
                                    <strong>( ${data.signer_names?.['mgr-1'] || '....................'} )</strong><br>
                                    <span style="font-size:8pt; color:#666;">Car Park Manager</span>
                                </div>
                            </td>
                            <td style="width:33.3%; vertical-align: top;">
                                <div style="margin-bottom:10px;">Menyetujui,</div>
                                <div style="height:80px; display:flex; align-items:center; justify-content:center;">
                                    ${data.signatures?.['mgr-2'] ? `<img src="${data.signatures['mgr-2']}" style="max-height:80px; max-width:160px; object-fit:contain;">` : ''}
                                </div>
                                <div style="margin-top:10px;">
                                    <strong>( ${data.signer_names?.['mgr-2'] || '....................'} )</strong><br>
                                    <span style="font-size:8pt; color:#666;">Inhouse Parking</span>
                                </div>
                            </td>
                        </tr>
                    </table>
                </div>
            </div>
        `;
        document.getElementById('print-content').innerHTML = html;
        document.getElementById('print-modal').classList.remove('hidden');
    },

    /**
     * Public helper: generate HTML string dari form_data + report metadata.
     * Dipakai oleh openPrintPreview() dan app._generatePdfBlobFromFormData()
     */
    _buildPrintHTML(data, report) {
        const nama  = report.spv_name || report.user_name || '-';
        const shift = report.shift || '-';
        const tgl   = report.report_date || '-';

        // Re-use the same html variable that openPrintPreview already built
        // (just return it so caller can use it)
        let mpRows = '', plotRows = '', perRows = '', alatRows = '', specRows = '';
        const mp_j = ['Car Park Manager', 'IT', 'Administrasi', 'Supervisor', 'Leader', 'Staff'];

        mp_j.forEach(j => {
            const val    = data.manpower?.[j] || '0';
            const valMid = data.manpower?.[j + '_middle'] || '0';
            mpRows += `<tr>
                <td style="border:1px solid #000;padding:4px 10px;">${j}</td>
                <td style="border:1px solid #000;padding:4px;text-align:center;">${val}</td>
                <td style="border:1px solid #000;padding:4px;text-align:center;">${valMid}</td>
            </tr>`;
        });

        (data.ploting || []).forEach(p => {
            plotRows += `<tr>
                <td style="border:1px solid #000;padding:4px;text-align:center;">${p.no}</td>
                <td style="border:1px solid #000;padding:4px 10px;">${p.area || '-'}</td>
                <td style="border:1px solid #000;padding:4px 10px;">${p.petugas || '-'}</td>
            </tr>`;
        });

        const perlenData = (data.perlengkapan && data.perlengkapan.length > 0)
            ? data.perlengkapan
            : DEFAULT_PERLENGKAPAN.map((item, i) => ({ no: i+1, nama: item[0], jumlah: item[1], baik: item[1], rusak: 0, keterangan: '-' }));

        perlenData.forEach(p => {
            perRows += `<tr>
                <td style="border:1px solid #000;padding:4px;text-align:center;">${p.no}</td>
                <td style="border:1px solid #000;padding:4px 8px;">${p.nama || '-'}</td>
                <td style="border:1px solid #000;padding:4px;text-align:center;">${p.jumlah || '0'}</td>
                <td style="border:1px solid #000;padding:4px;text-align:center;color:green;">${p.baik || '0'}</td>
                <td style="border:1px solid #000;padding:4px;text-align:center;color:red;">${p.rusak || '0'}</td>
                <td style="border:1px solid #000;padding:4px 8px;">${p.keterangan || '-'}</td>
            </tr>`;
        });

        const pData = (data.peralatan && data.peralatan.length > 0)
            ? data.peralatan
            : DEFAULT_PERALATAN.map((item, i) => ({ no: i+1, nama: item[0], jumlah: item[1], baik: item[1], rusak: 0, keterangan: '-' }));

        pData.forEach(p => {
            alatRows += `<tr>
                <td style="border:1px solid #000;padding:4px;text-align:center;">${p.no}</td>
                <td style="border:1px solid #000;padding:4px 8px;">${p.nama || '-'}</td>
                <td style="border:1px solid #000;padding:4px;text-align:center;">${p.jumlah || '0'}</td>
                <td style="border:1px solid #000;padding:4px;text-align:center;color:green;">${p.baik || '0'}</td>
                <td style="border:1px solid #000;padding:4px;text-align:center;color:red;">${p.rusak || '0'}</td>
                <td style="border:1px solid #000;padding:4px 8px;">${p.keterangan || '-'}</td>
            </tr>`;
        });

        (data.spesifikasi || []).forEach(s => {
            specRows += `<tr>
                <td style="border:1px solid #000;padding:6px 10px;">${s.jenis || '-'}</td>
                <td style="border:1px solid #000;padding:6px;text-align:center;">${s.waktu || '-'}</td>
                <td style="border:1px solid #000;padding:6px 10px;">${s.detail || '-'}</td>
                <td style="border:1px solid #000;padding:6px 10px;">${s.tindakan || '-'}</td>
                <td style="border:1px solid #000;padding:6px;text-align:center;">${s.status || '-'}</td>
            </tr>`;
        });

        return `
        <div style="font-family:Arial,sans-serif;color:#000;line-height:1.2;padding:0;">
            <div style="text-align:center;margin-bottom:15px;border-bottom:2px solid #000;padding-bottom:10px;">
                <h2 style="margin:0;font-size:16pt;">DAILY REPORT SUPERVISOR</h2>
                <h3 style="margin:2px 0;font-size:12pt;">GANDARIA CITY MALL</h3>
            </div>
            <table style="width:100%;margin-bottom:15px;font-size:10pt;">
                <tr>
                    <td style="width:100px;padding:2px 0;">Supervisor</td>
                    <td style="padding:2px 0;">: <strong>${nama}</strong></td>
                    <td style="width:80px;padding:2px 0;">Shift</td>
                    <td style="padding:2px 0;">: <strong>${shift}</strong></td>
                </tr>
                <tr>
                    <td style="padding:2px 0;">Tanggal</td>
                    <td colspan="3" style="padding:2px 0;">: <strong>${tgl}</strong></td>
                </tr>
            </table>
            <div style="margin-bottom:15px;">
                <h4 style="margin:0 0 5px;font-size:10pt;text-decoration:underline;background:#eee;padding:2px 5px;">I. MAN POWER</h4>
                <table style="width:100%;border-collapse:collapse;font-size:10pt;">
                    <thead><tr style="background:#f2f2f2;">
                        <th style="border:1px solid #000;padding:8px;text-align:left;">JABATAN</th>
                        <th style="border:1px solid #000;padding:8px;width:120px;">SHIFT</th>
                        <th style="border:1px solid #000;padding:8px;width:120px;">MIDDLE</th>
                    </tr></thead>
                    <tbody>${mpRows}
                        <tr style="background:#eee;font-weight:bold;">
                            <td style="border:1px solid #000;padding:8px 10px;">TOTAL PERSONEL</td>
                            <td style="border:1px solid #000;padding:8px;text-align:center;">${data.manpower?.TOTAL || 0}</td>
                            <td style="border:1px solid #000;padding:8px;text-align:center;">${data.manpower?.TOTAL_MIDDLE || 0}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div style="margin-bottom:15px;page-break-inside:avoid;">
                <h4 style="margin:0 0 5px;font-size:10pt;text-decoration:underline;background:#eee;padding:2px 5px;">II. PLOTING PERSONEL</h4>
                <table style="width:100%;border-collapse:collapse;font-size:10pt;">
                    <thead><tr style="background:#f2f2f2;">
                        <th style="border:1px solid #000;padding:8px;width:40px;">NO</th>
                        <th style="border:1px solid #000;padding:8px;text-align:left;">AREA PLOTING</th>
                        <th style="border:1px solid #000;padding:8px;text-align:left;">NAMA PETUGAS</th>
                    </tr></thead>
                    <tbody>${plotRows || '<tr><td colspan="3" style="border:1px solid #000;padding:10px;text-align:center;">Tidak ada data plotting</td></tr>'}</tbody>
                </table>
            </div>
            <div style="margin-bottom:15px;page-break-inside:avoid;">
                <h4 style="margin:0 0 5px;font-size:10pt;text-decoration:underline;background:#eee;padding:2px 5px;">III. PERLENGKAPAN</h4>
                <table style="width:100%;border-collapse:collapse;font-size:9pt;">
                    <thead>
                        <tr style="background:#f2f2f2;">
                            <th rowspan="2" style="border:1px solid #000;padding:4px;width:30px;">NO</th>
                            <th rowspan="2" style="border:1px solid #000;padding:4px;text-align:left;">NAMA PERLENGKAPAN</th>
                            <th rowspan="2" style="border:1px solid #000;padding:4px;width:60px;">TOTAL</th>
                            <th colspan="2" style="border:1px solid #000;padding:4px;">KONDISI</th>
                            <th rowspan="2" style="border:1px solid #000;padding:4px;">KETERANGAN</th>
                        </tr>
                        <tr style="background:#f2f2f2;">
                            <th style="border:1px solid #000;padding:4px;width:50px;color:green;">BAIK</th>
                            <th style="border:1px solid #000;padding:4px;width:50px;color:red;">RUSAK</th>
                        </tr>
                    </thead>
                    <tbody>${perRows || '<tr><td colspan="6" style="border:1px solid #000;padding:10px;text-align:center;">Tidak ada data</td></tr>'}</tbody>
                </table>
            </div>
            <div style="margin-bottom:15px;page-break-inside:avoid;">
                <h4 style="margin:0 0 5px;font-size:10pt;text-decoration:underline;background:#eee;padding:2px 5px;">IV. PERALATAN</h4>
                <table style="width:100%;border-collapse:collapse;font-size:9pt;">
                    <thead>
                        <tr style="background:#f2f2f2;">
                            <th rowspan="2" style="border:1px solid #000;padding:4px;width:30px;">NO</th>
                            <th rowspan="2" style="border:1px solid #000;padding:4px;text-align:left;">NAMA PERALATAN</th>
                            <th rowspan="2" style="border:1px solid #000;padding:4px;width:60px;">TOTAL</th>
                            <th colspan="2" style="border:1px solid #000;padding:4px;">KONDISI</th>
                            <th rowspan="2" style="border:1px solid #000;padding:4px;">KETERANGAN</th>
                        </tr>
                        <tr style="background:#f2f2f2;">
                            <th style="border:1px solid #000;padding:4px;width:50px;color:green;">BAIK</th>
                            <th style="border:1px solid #000;padding:4px;width:50px;color:red;">RUSAK</th>
                        </tr>
                    </thead>
                    <tbody>${alatRows || '<tr><td colspan="6" style="border:1px solid #000;padding:10px;text-align:center;">Tidak ada data</td></tr>'}</tbody>
                </table>
            </div>
            <div style="display:flex;gap:10px;margin-bottom:15px;page-break-inside:avoid;">
                <div style="flex:1;border:1px solid #000;padding:5px;">
                    <h4 style="margin:0 0 5px;border-bottom:1px solid #000;padding-bottom:2px;font-size:9pt;background:#eee;">V. MATERI BRIEFING</h4>
                    <div style="white-space:pre-wrap;min-height:40px;font-size:9pt;">${data.briefing || '-'}</div>
                </div>
                <div style="flex:1;border:1px solid #000;padding:5px;">
                    <h4 style="margin:0 0 5px;border-bottom:1px solid #000;padding-bottom:2px;font-size:9pt;background:#eee;">VI. TRAINING / INSTRUKSI</h4>
                    <div style="white-space:pre-wrap;min-height:40px;font-size:9pt;">${data.training || '-'}</div>
                </div>
            </div>
            <div style="margin-bottom:20px;page-break-inside:avoid;">
                <h4 style="margin:0 0 5px;font-size:10pt;text-decoration:underline;background:#eee;padding:2px 5px;">VII. TEMUAN &amp; TINDAKAN</h4>
                <table style="width:100%;border-collapse:collapse;font-size:9pt;">
                    <thead><tr style="background:#f2f2f2;">
                        <th style="border:1px solid #000;padding:8px;text-align:left;">JENIS</th>
                        <th style="border:1px solid #000;padding:8px;width:80px;">WAKTU</th>
                        <th style="border:1px solid #000;padding:8px;text-align:left;">DETAIL KEJADIAN</th>
                        <th style="border:1px solid #000;padding:8px;text-align:left;">TINDAKAN</th>
                        <th style="border:1px solid #000;padding:8px;width:100px;">STATUS</th>
                    </tr></thead>
                    <tbody>${specRows || '<tr><td colspan="5" style="border:1px solid #000;padding:10px;text-align:center;">Tidak ada temuan hari ini.</td></tr>'}</tbody>
                </table>
            </div>
            <div style="page-break-inside:avoid;margin-top:50px;">
                <table style="width:100%;border-collapse:collapse;text-align:center;font-size:10pt;">
                    <tr>
                        <td style="width:33.3%;vertical-align:top;">
                            <div style="margin-bottom:10px;">Dibuat Oleh,</div>
                            <div style="height:80px;display:flex;align-items:center;justify-content:center;">
                                ${data.signatures?.spv ? `<img src="${data.signatures.spv}" style="max-height:80px;max-width:160px;object-fit:contain;">` : '<div style="height:80px;"></div>'}
                            </div>
                            <div style="margin-top:10px;"><strong>( ${data.signer_names?.spv || nama} )</strong><br>
                            <span style="font-size:8pt;color:#666;">Supervisor / Leader</span></div>
                        </td>
                        <td style="width:33.3%;vertical-align:top;">
                            <div style="margin-bottom:10px;">Mengetahui,</div>
                            <div style="height:80px;display:flex;align-items:center;justify-content:center;">
                                ${data.signatures?.['mgr-1'] ? `<img src="${data.signatures['mgr-1']}" style="max-height:80px;max-width:160px;object-fit:contain;">` : '<div style="height:80px;"></div>'}
                            </div>
                            <div style="margin-top:10px;"><strong>( ${data.signer_names?.['mgr-1'] || '....................'} )</strong><br>
                            <span style="font-size:8pt;color:#666;">Car Park Manager</span></div>
                        </td>
                        <td style="width:33.3%;vertical-align:top;">
                            <div style="margin-bottom:10px;">Menyetujui,</div>
                            <div style="height:80px;display:flex;align-items:center;justify-content:center;">
                                ${data.signatures?.['mgr-2'] ? `<img src="${data.signatures['mgr-2']}" style="max-height:80px;max-width:160px;object-fit:contain;">` : '<div style="height:80px;"></div>'}
                            </div>
                            <div style="margin-top:10px;"><strong>( ${data.signer_names?.['mgr-2'] || '....................'} )</strong><br>
                            <span style="font-size:8pt;color:#666;">Inhouse Parking</span></div>
                        </td>
                    </tr>
                </table>
            </div>
        </div>`;
    }
};

const scheduleManager = {
    async processExcel() {
        const monthInput = document.getElementById('schedule-month').value;
        const fileInput = document.getElementById('schedule-file').files[0];
        
        if (!monthInput || !fileInput) {
            app.showToast('Bulan dan file Excel wajib diisi!', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = window.XLSX.read(data, {type: 'array'});
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const rows = window.XLSX.utils.sheet_to_json(firstSheet, {header: 1});

                const scheduleData = this.parseSchedule(rows);
                if (!scheduleData || Object.keys(scheduleData).length === 0) {
                    app.showToast('Gagal memproses data. Pastikan format ada kolom "JAB" dan tanggal 1-31.', 'error');
                    return;
                }

                app.showLoader('Menyimpan jadwal...');
                const res = await fetch(`${window.Laravel.baseUrl}/v1/schedule/upload`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': window.Laravel.csrfToken
                    },
                    body: JSON.stringify({ month: monthInput, data: scheduleData })
                });

                if (res.ok) {
                    app.showToast('Jadwal bulan ' + monthInput + ' berhasil disimpan!', 'success');
                    document.getElementById('modal-upload-schedule').classList.add('hidden');
                } else {
                    const err = await res.json();
                    app.showToast(err.message || 'Gagal menyimpan jadwal', 'error');
                }
            } catch (error) {
                console.error(error);
                app.showToast('Terjadi kesalahan saat memproses file Excel.', 'error');
            } finally {
                app.hideLoader();
            }
        };
        reader.readAsArrayBuffer(fileInput);
    },

    parseSchedule(rows) {
        let headerRowIdx = -1;
        let jabColIdx = -1;
        
        for (let i = 0; i < Math.min(10, rows.length); i++) {
            if (!rows[i]) continue;
            for (let j = 0; j < rows[i].length; j++) {
                if (String(rows[i][j]).trim().toUpperCase() === 'JAB') {
                    headerRowIdx = i;
                    jabColIdx = j;
                    break;
                }
            }
            if (headerRowIdx !== -1) break;
        }

        if (headerRowIdx === -1) return null;

        const schedule = {}; 
        for (let d = 1; d <= 31; d++) {
            schedule[d] = {
                'Pagi': { 'Car Park Manager':0, 'IT':0, 'Administrasi':0, 'Supervisor':0, 'Leader':0, 'Staff':0 },
                'Siang': { 'Car Park Manager':0, 'IT':0, 'Administrasi':0, 'Supervisor':0, 'Leader':0, 'Staff':0 },
                'Malam': { 'Car Park Manager':0, 'IT':0, 'Administrasi':0, 'Supervisor':0, 'Leader':0, 'Staff':0 },
            };
        }

        const dateCols = {};
        for (let j = jabColIdx + 1; j < rows[headerRowIdx].length; j++) {
            const val = parseInt(rows[headerRowIdx][j]);
            if (!isNaN(val) && val >= 1 && val <= 31) {
                dateCols[val] = j;
            }
        }

        for (let i = headerRowIdx + 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row || !row[jabColIdx]) continue;
            
            let jab = String(row[jabColIdx]).trim().toUpperCase();
            let field = '';
            if (jab === 'CPM') field = 'Car Park Manager';
            else if (jab === 'IT') field = 'IT';
            else if (jab === 'ADM') field = 'Administrasi';
            else if (jab === 'SPV') field = 'Supervisor';
            else if (jab === 'LDR') field = 'Leader';
            else if (jab === 'CRO' || jab === 'ATD') field = 'Staff';

            if (!field) continue;

            for (let d = 1; d <= 31; d++) {
                if (!dateCols[d]) continue;
                let shiftCode = String(row[dateCols[d]] || '').trim().toUpperCase();
                if (shiftCode === 'P') schedule[d]['Pagi'][field]++;
                else if (shiftCode === 'S') schedule[d]['Siang'][field]++;
                else if (shiftCode === 'M') schedule[d]['Malam'][field]++;
            }
        }

        return schedule;
    },

    async fetchAndFillManpower(dateStr, shiftName) {
        if (!dateStr || !shiftName) return;
        try {
            const res = await fetch(`${window.Laravel.baseUrl}/v1/schedule?date=${dateStr}`);
            if (!res.ok) return; 
            const data = await res.json();
            
            if (data && data.data && data.data[shiftName]) {
                const mpData = data.data[shiftName];
                document.querySelectorAll('.mp-input').forEach(input => {
                    const jabatan = input.dataset.jabatan;
                    if (mpData[jabatan] !== undefined) {
                        input.value = mpData[jabatan];
                    }
                });
                if (window.formDigital && typeof window.formDigital.calcTotal === 'function') {
                    window.formDigital.calcTotal('mp-input', 'mp-total-val');
                }
            }
        } catch (e) {
            console.error('Failed to fetch schedule for manpower auto-fill', e);
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    window.app = app;
    window.formDigital = formDigital;
    window.scheduleManager = scheduleManager;
    app.init();
    formDigital.init();

    // Hook schedule auto-fill
    document.getElementById('df-tanggal')?.addEventListener('change', (e) => {
        const shift = document.getElementById('df-shift')?.value;
        if(shift) window.scheduleManager.fetchAndFillManpower(e.target.value, shift);
    });
    document.getElementById('df-shift')?.addEventListener('change', (e) => {
        const dateStr = document.getElementById('df-tanggal')?.value;
        if(dateStr) window.scheduleManager.fetchAndFillManpower(dateStr, e.target.value);
    });

});
