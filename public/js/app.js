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
                
                // Update active class on all nav instances (Sidebar & Mobile)
                document.querySelectorAll(`.nav-item`).forEach(i => {
                    i.classList.toggle('active', i.dataset.view === view);
                });
            });
        });

        // Export Buttons
        document.getElementById('btn-export-excel')?.addEventListener('click', () => this.handleExportExcel());
        document.getElementById('btn-bulk-zip')?.addEventListener('click', () => this.handleBulkDownload());

        // Tab / Method Toggles
        document.querySelectorAll('.method-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.method-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                const method = btn.dataset.method;
                document.querySelectorAll('.method-content').forEach(c => {
                    c.classList.add('hidden');
                    c.classList.remove('active');
                });
                document.getElementById(`method-${method}-container`).classList.remove('hidden');
                document.getElementById(`method-${method}-container`).classList.add('active');
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
            const response = await fetch('/v1/users');
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
                const response = await fetch('/v1/users', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': window.Laravel.csrfToken
                    },
                    body: JSON.stringify(data)
                });

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
            const response = await fetch(`/v1/users/${id}`, {
                method: 'DELETE',
                headers: {
                    'X-CSRF-TOKEN': window.Laravel.csrfToken
                }
            });

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
            const response = await fetch('/v1/reports/stats');
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
            const response = await fetch('/v1/reports/logs');
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
        if (!tableBody) return;

        const startDate = document.getElementById('filter-start-date')?.value || '';
        const endDate = document.getElementById('filter-end-date')?.value || '';
        const shiftFilter = document.getElementById('filter-shift')?.value || '';

        tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center">Memuat laporan...</td></tr>';

        try {
            const response = await fetch(`/v1/reports?start_date=${startDate}&end_date=${endDate}&shift=${shiftFilter}`);

            // Guard: pastikan response adalah JSON sebelum parse
            const contentType = response.headers.get('content-type') || '';
            if (!response.ok || !contentType.includes('application/json')) {
                const text = await response.text();
                console.error('Gagal memuat laporan:', response.status, text.substring(0, 200));
                tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: var(--error)">Gagal memuat data (${response.status}). Coba refresh.</td></tr>`;
                return;
            }

            const data = await response.json();
            this.reports = data;

            tableBody.innerHTML = '';
            if (this.reports.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center">Tidak ada laporan ditemukan.</td></tr>';
                return;
            }

            this.reports.forEach(row => {
                const tr = document.createElement('tr');
                // Encode manual_content dengan aman (handle null/undefined)
                const safeContent = row.manual_content ? btoa(unescape(encodeURIComponent(row.manual_content))) : '';
                tr.innerHTML = `
                    <td>${row.spv_name}</td>
                    <td>${row.report_date}</td>
                    <td><span class="badge ${(row.shift || '').toLowerCase()}">${row.shift || '-'}</span></td>
                    <td>${row.description || (row.manual_content ? 'Manual Input' : '-')}</td>
                    <td>
                        <div style="display:flex; gap:8px;">
                            ${row.file_url ? `
                                <button class="btn-icon" title="Lihat" onclick="window.open('${row.file_url}', '_blank')"><i class="fas fa-eye"></i></button>
                                <a href="${row.file_url}" class="btn-icon" title="Unduh" download><i class="fas fa-download"></i></a>
                            ` : safeContent ? `
                                <button class="btn-icon" title="Lihat Isi" onclick="app.viewManualContent('${safeContent}')"><i class="fas fa-file-alt"></i></button>
                            ` : '<span style="color:var(--text-dim);font-size:0.8rem">-</span>'}
                        </div>
                    </td>
                `;
                tableBody.appendChild(tr);
            });
        } catch (error) {
            console.error('Error loading reports:', error);
            tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; color: var(--error)">Gagal memuat data. Periksa koneksi dan coba refresh.</td></tr>';
        }
    },

    viewManualContent(base64Content) {
        const content = atob(base64Content);
        document.getElementById('modal-content-body').textContent = content;
        document.getElementById('manual-modal').classList.remove('hidden');
    },

    handleExportExcel() {
        try {
            if (!this.reports || this.reports.length === 0) {
                return this.showToast('Tidak ada data untuk diekspor', 'error');
            }
            
            this.showToast('Menyiapkan file Excel...', 'info');

            const data = this.reports.map(r => ({
                'Nama SPV': r.spv_name,
                'Tanggal': r.report_date,
                'Shift': r.shift,
                'Keterangan': r.description || '',
                'Isi Manual': r.manual_content || ''
            }));

            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Reports");
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

        if (this.reports.filter(r => r.file_url).length === 0) {
            return this.showToast('Tidak ada file PDF untuk diunduh', 'error');
        }

        this.showToast('Sedang memproses file PDF...', 'info');

        try {
            const response = await fetch(`/v1/reports/zip?start_date=${startDate}&end_date=${endDate}&shift=${shiftFilter}`);
            const reportsWithFiles = await response.json();

            if (!response.ok) throw new Error(reportsWithFiles.message || 'Gagal mengambil daftar file');

            const zip = new JSZip();
            const folder = zip.folder("Laporan_SPV_Gandaria_City");
            let count = 0;

            const promises = reportsWithFiles.map(async (report) => {
                try {
                    const fileResponse = await fetch(report.url);
                    if (!fileResponse.ok) return;

                    const blob = await fileResponse.blob();
                    // Gunakan nama file yang lebih rapi: Nama_Tanggal_Shift.pdf
                    const safeName = `${report.spv_name}_${report.report_date}_${report.shift}`.replace(/[^a-z0-9]/gi, '_') + '.pdf';
                    folder.file(safeName, blob);
                    count++;
                } catch (e) { console.error('Skip file:', report.url); }
            });

            await Promise.all(promises);

            if (count === 0) return this.showToast('Gagal mengunduh file PDF (Mungkin masalah koneksi ke storage)', 'error');

            const content = await zip.generateAsync({type:"blob"});
            const link = document.createElement('a');
            link.href = URL.createObjectURL(content);
            link.download = `Batch_Laporan_SPV_${new Date().toISOString().split('T')[0]}.zip`;
            link.click();
            this.showToast(`${count} file berhasil di-ZIP`, 'success');
        } catch (error) {
            console.error('ZIP Error:', error);
            this.showToast('Gagal memproses ZIP: ' + error.message, 'error');
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
            const response = await fetch('/v1/reports', {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': window.Laravel.csrfToken,
                    'Accept': 'application/json'
                },
                body: formData
            });

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

    async handlePurge(all) {
        const startDate = document.getElementById('purge-start')?.value;
        const endDate = document.getElementById('purge-end')?.value;

        if (!all && !startDate && !endDate) {
            return this.showToast('Pilih range tanggal terlebih dahulu', 'error');
        }

        const confirmMsg = all 
            ? 'PERINGATAN: Anda akan menghapus SELURUH data laporan. Tindakan ini tidak dapat dibatalkan. Lanjutkan?' 
            : `Hapus laporan dari ${startDate || 'awal'} s/d ${endDate || 'akhir'}?`;

        if (!confirm(confirmMsg)) return;

        try {
            const response = await fetch('/v1/reports/purge', {
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

            const result = await response.json();
            if (response.ok) {
                this.showToast(result.message, 'success');
                this.refreshData();
            } else {
                this.showToast(result.message, 'error');
            }
        } catch (e) {
            console.error('Purge error:', e);
            this.showToast('Gagal memproses penghapusan', 'error');
        }
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
