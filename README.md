# Gandaria City - SPV Daily Report (Laravel Edition)

Sistem pengolahan data laporan harian pengawas Gandaria City dengan standar keamanan tinggi dan pengolahan data otomatis.

## 🛡️ Cyber Security & Reliability
- **Anti-Redundancy Logic**: Sistem secara otomatis melakukan *purge* (pembersihan) data lama jika SPV melakukan upload ulang pada hari yang sama. Ini menjamin integritas data ("Single Version of Truth").
- **Unique ID Constraint**: Memastikan kepatuhan aturan 1 laporan per hari per SPV di level database.
- **Audit Trails**: Mencatat setiap user, aksi, IP address, dan timestamp untuk verifikasi keamanan.
- **S3 Compatible Storage**: Menggunakan Supabase Storage dengan enkripsi dan akses terproteksi.

## 📊 Data Analyst Features
- **Auto-Standardized Naming**: Nama file diatur otomatis: `REPORTS/{Tanggal}/{SPV}_{Tanggal}_{Shift}.pdf`.
- **Bulk Data Export**: Fitur ekspor ke Excel (`.xlsx`) dan Batch Download ZIP untuk analisis manajemen.
- **Dual Flow**: Mendukung upload PDF konvensional maupun pengetikan laporan langsung (Manual Input).

## 🚀 Setup & Deployment
1. **Database**: Hubungkan PostgreSQL Supabase via `.env`.
2. **Migration**: Jalankan `php artisan migrate`.
3. **Storage**: Pastikan Bucket `daily-reports` sudah dibuat di Supabase.
4. **Environment Variables**:
   ```env
   SUPABASE_ENDPOINT=https://[YOUR_PROJECT_ID].supabase.co/storage/v1/s3
   SUPABASE_BUCKET=daily-reports
   ```

## 🛠️ Stack Teknologi
- **Backend**: Laravel 10 (Symmetry/Optimization Focus)
- **Frontend**: Blade, Vanilla CSS (Premium Glassmorphism), JS
- **Storage/DB**: Supabase (PostgreSQL + S3 Storage)

---
*Dibuat dengan standar profesional untuk Gandaria City Asset.*
