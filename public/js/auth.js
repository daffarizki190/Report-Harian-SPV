// Basic Auth & Role Logic
const auth = {
    user: null,

    init() {
        this.bindEvents();
        this.checkSession();
    },

    bindEvents() {
        const loginForm = document.getElementById('login-form');
        loginForm.addEventListener('submit', (e) => this.handleLogin(e));

        document.getElementById('btn-logout').addEventListener('click', () => this.handleLogout());
    },

    async checkSession() {
        // In real Supabase, we would use supabase.auth.getSession()
        // For now, checking local state
        const storedUser = localStorage.getItem('spv_user');
        if (storedUser) {
            this.user = JSON.parse(storedUser);
            this.showApp();
        }
    },

    async handleLogin(e) {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const pass = document.getElementById('password').value;

        // MOCK AUTH LOGIC
        // Admin: daffa / password
        // SPV: spv1 / password
        // Management: boss / password

        let role = '';
        if (username === 'daffa') role = 'Admin';
        else if (username.startsWith('spv')) role = 'Supervisor';
        else if (username === 'boss') role = 'Management';
        else {
            alert('Invalid credentials');
            return;
        }

        this.user = { name: username, role: role, id: 'mock-id-' + username };
        localStorage.setItem('spv_user', JSON.stringify(this.user));
        this.showApp();
    },

    handleLogout() {
        localStorage.removeItem('spv_user');
        window.location.reload();
    },

    showApp() {
        document.getElementById('login-overlay').classList.remove('active');
        document.getElementById('login-overlay').classList.add('hidden');
        document.getElementById('app-container').classList.remove('hidden');

        document.getElementById('user-name').textContent = this.user.name;
        document.getElementById('user-role').textContent = this.user.role;
        document.getElementById('user-avatar').textContent = this.user.name.charAt(0).toUpperCase();

        this.applyPermissions();
        // Trigger app logic
        if (window.app) window.app.init();
    },

    applyPermissions() {
        const role = this.user.role;
        
        // Example: Only SPV can see upload
        const spvOnlyElements = document.querySelectorAll('.restricted-spv');
        spvOnlyElements.forEach(el => {
            if (role !== 'Supervisor' && role !== 'Admin') {
                el.style.display = 'none';
            }
        });
    }
};

document.addEventListener('DOMContentLoaded', () => auth.init());
