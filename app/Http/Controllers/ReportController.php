<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Report;
use App\Models\ActivityLog;
use App\Services\SupabaseStorageService;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

use App\Events\ReportSubmitted;
use App\Http\Resources\ReportResource;
use App\Http\Resources\UserResource;

class ReportController extends Controller
{
    public function __construct(
        protected SupabaseStorageService $supabase
    ) {}

    public function dashboard()
    {
        $hour = (int)date('H');
        if ($hour >= 7 && $hour < 15) {
            $currentShift = 'Pagi';
        } elseif ($hour >= 15 && $hour < 23) {
            $currentShift = 'Siang';
        } else {
            $currentShift = 'Malam';
        }

        $plotingAreas = [
            'Mobile Basement', 'Mobile MSCP', 'Control Room Officer 1',
            'Control Room Officer 2', 'PK Motor', 'Area Motor B2', 'Area Motor B1',
            'Area B2', 'Area B2', 'Area B1', 'Area B1', 'Area LG', 'Area LG', 'Area MSCP', ''
        ];

        $perlengkapan = [
            ['Handy Talkie', 3],
            ['Traffic Lamp', 5],
            ['Jas Hujan', 1],
            ['Traffic Cone CP', 200],
            ['Sticke Cone CP', 100],
            ['Senter', 1],
        ];

        $peralatan = [
            ['Parking Entrance', 16],
            ['Parking Exit', 23],
            ['Server parking', 2],
            ['DDS', 7],
            ['Emergency button', 43],
            ['Hanging Sign', 355],
            ['Totem Sign', 35],
        ];

        return view('dashboard', compact('currentShift', 'plotingAreas', 'perlengkapan', 'peralatan'));
    }

    /**
     * Display a listing of reports with professional filtering.
     */
    public function index(Request $request)
    {
        $user = Auth::user();

        $query = Report::query()
            ->leftJoin('users', 'reports.user_id', '=', 'users.id')
            ->select([
                'reports.id',
                'reports.user_id',
                'reports.spv_name',
                'reports.report_date',
                'reports.shift',
                'reports.description',
                'reports.file_path',
                'reports.created_at',
                'reports.updated_at',
                DB::raw("COALESCE(users.name, reports.spv_name) as user_name"),
                'users.role as user_role',
                // Efficiently check for signatures without loading the full JSON blob
                DB::raw("CASE WHEN reports.form_data LIKE '%\"mgr-1\":%' THEN 1 ELSE 0 END as has_mgr1_sig"),
                DB::raw("CASE WHEN reports.form_data LIKE '%\"mgr-2\":%' THEN 1 ELSE 0 END as has_mgr2_sig")
            ]);

        // Security check
        if (in_array($user->role, ['Supervisor', 'Leader'])) {
            $query->where(function($q) use ($user) {
                $q->where('reports.user_id', $user->id)
                  ->orWhere(function($sq) use ($user) {
                      $sq->whereNull('reports.user_id')
                         ->where('reports.spv_name', $user->name);
                  });
            });
        }

        // Professional Pagination: Limit data to 10 per page for high performance
        $reports = app(\Illuminate\Pipeline\Pipeline::class)
            ->send($query)
            ->through([
                \App\Filters\StartDate::class,
                \App\Filters\EndDate::class,
                \App\Filters\Shift::class,
                \App\Filters\Search::class,
            ])
            ->thenReturn()
            ->orderBy('reports.report_date', 'desc')
            ->paginate(10);

        return ReportResource::collection($reports);
    }

    /**
     * Get a single report with full data.
     */
    public function show(string $id)
    {
        $report = Report::findOrFail($id);
        
        // Security check: Only owners or management can view full details
        $user = Auth::user();
        if (in_array($user->role, ['Supervisor', 'Leader']) && $report->user_id !== $user->id) {
            if ($report->spv_name !== $user->name) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }
        }

        return new ReportResource($report);
    }

    public function stats()
    {
        $user = Auth::user();
        $query = Report::query();
        $todayQuery = Report::whereDate('report_date', now()->toDateString());

        if (in_array($user->role, ['Supervisor', 'Leader'])) {
            $query->where('user_id', $user->id);
            $todayQuery->where('user_id', $user->id);
        }

        return response()->json([
            'total' => $query->count(),
            'today' => $todayQuery->count(),
        ]);
    }

    public function systemInfo()
    {
        if (!in_array(Auth::user()->role, ['Admin'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Professional Laravel 11 Memoization: once()
        // This ensures the logic is only executed once per request lifecycle
        $info = once(function() {
            $totalReports = \App\Models\Report::count();
            $totalUsers = \App\Models\User::count();
            
            // Stats for signatures - OPTIMIZED for text/json column compatibility
            // Since form_data is longText in migration, we use a robust string check
            $completed = \App\Models\Report::where('form_data', 'like', '%"mgr-2":%')->count();
            $pending = $totalReports - $completed;

            return [
                'server' => [
                    'php_version' => PHP_VERSION,
                    'server_software' => $_SERVER['SERVER_SOFTWARE'] ?? 'Vercel/Production',
                    'environment' => config('app.env'),
                    'timezone' => config('app.timezone'),
                ],
                'database' => [
                    'driver' => config('database.default'),
                    'total_reports' => $totalReports,
                    'total_users' => $totalUsers,
                    'completion_rate' => $totalReports > 0 ? round(($completed / $totalReports) * 100, 2) : 0,
                    'stats' => [
                        'completed' => $completed,
                        'pending' => $pending
                    ]
                ],
                'storage' => [
                    'status' => config('database.default') === 'pgsql' ? 'Connected' : 'Local',
                    'provider' => 'Supabase Cloud'
                ],
                'stack' => [
                    'laravel' => app()->version(),
                    'hosting' => 'Vercel (Production)',
                    'database' => 'PostgreSQL (Supabase)',
                    'storage' => 'Supabase Object Storage',
                    'ui_kit' => 'Vanilla CSS / Glassmorphism Design'
                ]
            ];
        });

        return response()->json($info);
    }

    public function logs()
    {
        if (Auth::user()->role !== 'Admin') {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }
        $logs = DB::table('activity_logs')->orderBy('created_at', 'desc')->limit(50)->get();
        return response()->json($logs);
    }

    /**
     * Store or Update a report (Single Version of Truth).
     * Handles: file upload, manual text, AND digital form data.
     */
    public function store(Request $request)
    {
        if (!in_array(Auth::user()->role, ['Supervisor', 'Leader'])) {
            return response()->json(['message' => 'Hanya Supervisor atau Leader yang dapat mengirim laporan.'], 403);
        }

        $request->validate([
            'report_date'    => 'required|date',
            'shift'          => 'required|string|in:Pagi,Siang,Malam',
            'report_file'    => 'nullable|mimes:pdf,jpg,jpeg,png|max:10240',
            'manual_content' => 'nullable|string',
            'description'    => 'nullable|string|max:255',
        ]);

        $spvName = auth()->user()->name ?? $request->spv_name ?? 'Guest';

        try {
            $report = DB::transaction(function () use ($request, $spvName) {
                $existing = Report::where('spv_name', $spvName)
                                  ->whereDate('report_date', $request->report_date)
                                  ->where('shift', $request->shift)
                                  ->first();

                $filePath = $existing->file_path ?? null;

                if ($request->hasFile('report_file')) {
                    $extension = $request->file('report_file')->getClientOriginalExtension();
                    $storagePath = sprintf(
                        'REPORTS/%s/%s_%s_%s.%s',
                        $request->report_date,
                        str_replace(' ', '_', $spvName),
                        $request->report_date,
                        $request->shift,
                        $extension
                    );

                    $filePath = $this->supabase->upload(
                        $request->file('report_file')->getRealPath(),
                        $storagePath
                    );
                }

                $report = Report::updateOrCreate(
                    [
                        'user_id'     => Auth::id(),
                        'report_date' => $request->report_date,
                        'shift'       => $request->shift,
                    ],
                    [
                        'spv_name'       => $spvName,
                        'description'    => $request->description,
                        'file_path'      => $filePath,
                        'manual_content' => $request->manual_content,
                        'updated_at'     => now()
                    ]
                );

                $this->logActivity($spvName, $existing ? 'Update' : 'Upload', "Laporan tgl {$request->report_date}");
                
                return $report;
            });

            // Real-time: Trigger Reverb broadcast AFTER transaction
            try {
                ReportSubmitted::dispatch($report);
            } catch (\Exception $e) {
                \Log::error("Broadcasting failed: " . $e->getMessage());
            }

            return response()->json(['message' => 'Laporan berhasil disimpan.', 'data' => $report]);

        } catch (\Exception $e) {
            \Log::error("Upload report error: " . $e->getMessage());
            return response()->json(['message' => 'Gagal menyimpan laporan: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Store structured digital form data (Daily Report Pengawas).
     */
    public function storeForm(Request $request)
    {
        $user = Auth::user();
        if (!in_array($user->role, ['Supervisor', 'Leader', 'CAR PARK MANAGER', 'Admin', 'Inhouse'])) {
            return response()->json(['message' => 'Anda tidak memiliki akses untuk fitur ini.'], 403);
        }

        $request->validate([
            'report_id'   => 'nullable|integer|exists:reports,id',
            'report_date' => 'required|date',
            'shift'       => 'required|string|in:Pagi,Siang,Malam',
            'form_data'   => 'required|string', 
        ]);

        $formDataDecoded = json_decode($request->form_data, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            return response()->json(['message' => 'Data form tidak valid.'], 422);
        }

        // Ambil nama pengawas dari form (bisa diedit management) atau dari auth (SPV)
        $spvName = $formDataDecoded['metadata']['spv_name'] ?? $user->name;

        try {
            $report = DB::transaction(function () use ($request, $spvName, $formDataDecoded, $user) {
                // Cari existing report
                $report = null;
                if ($request->report_id) {
                    $report = Report::find($request->report_id);
                } else {
                    $report = Report::where('spv_name', $spvName)
                                    ->whereDate('report_date', $request->report_date)
                                    ->where('shift', $request->shift)
                                    ->first();
                }

                // PERMANENCE: If report exists, preserve the original SPV name unless Admin
                if ($report && $user->role !== 'Admin') {
                    $spvName = $report->spv_name;
                }

                // Ambil ringkasan untuk kolom description
                $spesiifikasi = $formDataDecoded['spesifikasi'] ?? [];
                $description  = count($spesiifikasi) > 0
                    ? count($spesiifikasi) . ' temuan/kejadian dicatat'
                    : 'Form Digital — Kondisi Normal';

                if ($report) {
                    // Update existing
                    $report->shift = $request->shift;
                    $report->description = $description;
                    $report->form_data = $formDataDecoded;
                    $report->updated_at = now();
                    $report->save();
                    
                    $action = 'Update Form';
                } else {
                    // Create new
                    $report = new Report();
                    $report->user_id = $user->id;
                    $report->spv_name = $spvName;
                    $report->report_date = $request->report_date;
                    $report->shift = $request->shift;
                    $report->description = $description;
                    $report->form_data = $formDataDecoded;
                    $report->save();

                    $action = 'Form Digital';
                }

                $this->logActivity($user->name, $action, "Laporan tgl {$request->report_date} - SPV: {$spvName}");

                return $report;
            });

            // Real-time: Trigger Reverb broadcast AFTER transaction
            try {
                ReportSubmitted::dispatch($report);
            } catch (\Exception $e) {
                \Log::error("Broadcasting failed: " . $e->getMessage());
            }

            return response()->json([
                'message' => 'Laporan Digital berhasil disimpan.',
                'data'    => $report
            ]);

        } catch (\Exception $e) {
            \Log::error("Save digital form error: " . $e->getMessage());
            return response()->json(['message' => 'Gagal menyimpan laporan: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Purge reports based on date range (Management feature).
     */
    public function purge(Request $request)
    {
        $user = Auth::user();
        if (!in_array($user->role, ['CAR PARK MANAGER', 'Admin', 'Inhouse'])) {
            return response()->json(['message' => 'Hanya CAR PARK MANAGER, Admin, atau Inhouse yang dapat menghapus data.'], 403);
        }

        $startDate = $request->input('start_date');
        $endDate   = $request->input('end_date');
        $deleteAll = filter_var($request->input('all'), FILTER_VALIDATE_BOOLEAN);

        DB::beginTransaction();
        try {
            $query = Report::query();

            if (!$deleteAll) {
                if ($startDate) $query->whereDate('report_date', '>=', $startDate);
                if ($endDate)   $query->whereDate('report_date', '<=', $endDate);
            }

            $reportsToDelete = $query->get();
            $count           = $reportsToDelete->count();

            foreach ($reportsToDelete as $report) {
                if ($report->file_path) {
                    $this->supabase->delete($report->file_path);
                }
                $report->delete();
            }

            $details = $deleteAll
                ? "Hapus seluruh data laporan ($count item)"
                : "Hapus laporan tgl $startDate s/d $endDate ($count item)";

            $this->logActivity(auth()->user()->name, 'Purge', $details);

            DB::commit();
            return response()->json(['message' => "$count data berhasil dihapus.", 'count' => $count]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Gagal menghapus data: ' . $e->getMessage()], 500);
        }
    }

    public function destroy($id)
    {
        $report = Report::findOrFail($id);
        $user = Auth::user();

        // Security check: Only Admin/Manager can delete anything. 
        // Supervisor/Leader can only delete their own reports.
        if (!in_array($user->role, ['Admin', 'CAR PARK MANAGER', 'Inhouse'])) {
            if ($report->user_id !== $user->id && $report->spv_name !== $user->name) {
                return response()->json(['message' => 'Anda tidak memiliki hak untuk menghapus laporan ini.'], 403);
            }
        }

        return DB::transaction(function () use ($report, $user) {
            if ($report->file_path) {
                $this->supabase->delete($report->file_path);
            }
            
            $details = "Hapus laporan tgl {$report->report_date} - SPV: {$report->spv_name}";
            $report->delete();
            
            $this->logActivity($user->name, 'Delete Report', $details);
            
            return response()->json(['message' => 'Laporan berhasil dihapus.']);
        });
    }

    /**
     * Get filtered report URLs for ZIP download.
     */
    public function downloadZIP(Request $request)
    {
        try {
            $query = Report::query();
            if ($request->start_date) $query->whereDate('report_date', '>=', $request->start_date);
            if ($request->end_date)   $query->whereDate('report_date', '<=', $request->end_date);
            if ($request->shift)      $query->where('shift', $request->shift);

            $reports = $query->whereNotNull('file_path')->get();
            if ($reports->isEmpty()) {
                return response()->json(['message' => 'Tidak ada file laporan (PDF) ditemukan untuk kriteria ini.'], 404);
            }

            $zipName = 'Batch_Laporan_' . now()->format('Y-m-d_His') . '.zip';
            $zipPath = storage_path('app/' . $zipName);

            if (!file_exists(storage_path('app'))) {
                mkdir(storage_path('app'), 0775, true);
            }

            $zip = new \ZipArchive;
            if ($zip->open($zipPath, \ZipArchive::CREATE | \ZipArchive::OVERWRITE) !== TRUE) {
                return response()->json(['message' => 'Gagal menginisialisasi file ZIP di server.'], 500);
            }

            $addedFiles = 0;
            foreach ($reports as $report) {
                $url         = $this->supabase->publicUrl($report->file_path);
                $fileContent = @file_get_contents($url);

                if ($fileContent) {
                    $safeName = "{$report->spv_name}_{$report->report_date}_{$report->shift}.pdf";
                    $safeName = preg_replace('/[^A-Za-z0-9_\-\.]/', '_', $safeName);
                    $zip->addFromString($safeName, $fileContent);
                    $addedFiles++;
                }
            }

            $zip->close();

            if ($addedFiles === 0) {
                if (file_exists($zipPath)) @unlink($zipPath);
                return response()->json(['message' => 'Gagal mengunduh konten file dari storage Supabase.'], 500);
            }

            return response()->download($zipPath)->deleteFileAfterSend(true);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Terjadi kesalahan server: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Professional Audit Log recorder.
     */
    private function logActivity($userName, $action, $details)
    {
        // Laravel 11 defer() for background processing without Redis/Queue setup
        defer(fn () => DB::table('activity_logs')->insert([
            'user_name'  => $userName,
            'action'     => $action,
            'details'    => $details,
            'ip_address' => request()->ip(),
            'created_at' => now(),
            'updated_at' => now(),
        ]));
    }
}
