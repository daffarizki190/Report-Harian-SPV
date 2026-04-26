<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Report;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class ReportController extends Controller
{
    /**
     * Display a listing of reports with professional filtering.
     */
    public function index(Request $request)
    {
        $query = Report::query();

        if ($request->has('start_date') && $request->start_date) {
            $query->whereDate('report_date', '>=', $request->start_date);
        }

        if ($request->has('end_date') && $request->end_date) {
            $query->whereDate('report_date', '<=', $request->end_date);
        }

        if ($request->has('shift') && $request->shift) {
            $query->where('shift', $request->shift);
        }

        $reports = $query->orderBy('report_date', 'desc')->get();

        // Include public URLs for the frontend
        $reports->each(function ($report) {
            if ($report->file_path) {
                $report->file_url = Storage::disk('supabase')->url($report->file_path);
            }
        });

        return response()->json($reports);
    }

    public function stats()
    {
        if (Auth::user()->role !== 'Admin') {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }
        return response()->json([
            'total' => Report::count(),
            'today' => Report::whereDate('report_date', now())->count(),
        ]);
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
     */
    public function store(Request $request)
    {
        if (Auth::user()->role !== 'Supervisor') {
            return response()->json(['message' => 'Hanya Supervisor yang dapat mengirim laporan.'], 403);
        }

        $request->validate([
            'report_date' => 'required|date',
            'shift' => 'required|string|in:Pagi,Siang,Malam',
            'report_file' => 'nullable|mimes:pdf|max:10240',
            'manual_content' => 'nullable|string',
            'description' => 'nullable|string|max:255'
        ]);

        $spvName = auth()->user()->name ?? $request->spv_name ?? 'Guest';

        return DB::transaction(function () use ($request, $spvName) {
            // Check for existing report (1 report per SPV per day)
            $existing = Report::where('spv_name', $spvName)
                              ->whereDate('report_date', $request->report_date)
                              ->first();

            if ($existing) {
                // Professional approach: Delete old file before overwriting
                if ($existing->file_path) {
                    Storage::disk('supabase')->delete($existing->file_path);
                }
            }

            $filePath = null;
            if ($request->hasFile('report_file')) {
                // Automated Naming Standard: SPV_Date_Shift.pdf
                $filename = sprintf(
                    'REPORTS/%s/%s_%s_%s.pdf',
                    $request->report_date,
                    str_replace(' ', '_', $spvName),
                    $request->report_date,
                    $request->shift
                );
                
                $filePath = $request->file('report_file')->storeAs('', $filename, 'supabase');
            }

            $report = Report::updateOrCreate(
                [
                    'spv_name' => $spvName,
                    'report_date' => $request->report_date
                ],
                [
                    'shift' => $request->shift,
                    'description' => $request->description,
                    'file_path' => $filePath,
                    'manual_content' => $request->manual_content,
                    'updated_at' => now()
                ]
            );

            // Audit Log: Professional logging for cyber security tracking
            $this->logActivity($spvName, $existing ? 'Update' : 'Upload', "Laporan tgl {$request->report_date}");

            return response()->json(['message' => 'Laporan berhasil disimpan.', 'data' => $report]);
        });
    }

    /**
     * Purge reports based on date range (Management feature).
     */
    public function purge(Request $request)
    {
        if (Auth::user()->role !== 'Management') {
            return response()->json(['message' => 'Hanya Management yang dapat menghapus data.'], 403);
        }

        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');
        $deleteAll = $request->input('all', false);

        DB::beginTransaction();
        try {
            $query = Report::query();

            if (!$deleteAll) {
                if ($startDate) $query->whereDate('report_date', '>=', $startDate);
                if ($endDate) $query->whereDate('report_date', '<=', $endDate);
            }

            $reportsToDelete = $query->get();
            $count = $reportsToDelete->count();

            foreach ($reportsToDelete as $report) {
                if ($report->file_path) {
                    Storage::disk('supabase')->delete($report->file_path);
                }
                $report->delete();
            }

            $details = $deleteAll ? "Hapus seluruh data laporan ($count item)" : "Hapus laporan tgl $startDate s/d $endDate ($count item)";
            $this->logActivity(auth()->user()->name, 'Purge', $details);

            DB::commit();
            return response()->json(['message' => "$count data berhasil dihapus.", 'count' => $count]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Gagal menghapus data: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Get filtered report URLs for ZIP download.
     */
    public function downloadZIP(Request $request)
    {
        $query = Report::query();

        if ($request->has('start_date') && $request->start_date) {
            $query->whereDate('report_date', '>=', $request->start_date);
        }

        if ($request->has('end_date') && $request->end_date) {
            $query->whereDate('report_date', '<=', $request->end_date);
        }

        if ($request->has('shift') && $request->shift) {
            $query->where('shift', $request->shift);
        }

        $reports = $query->whereNotNull('file_path')->get();
        
        if ($reports->isEmpty()) {
            return response()->json(['message' => 'Tidak ada file untuk diunduh pada filter ini.'], 404);
        }

        $urls = $reports->map(function($r) {
            return [
                'name' => "{$r->spv_name}_{$r->report_date}_{$r->shift}.pdf",
                'url' => Storage::disk('supabase')->url($r->file_path)
            ];
        });

        return response()->json($urls);
    }

    /**
     * Professional Audit Log recorder.
     */
    private function logActivity($userName, $action, $details)
    {
        DB::table('activity_logs')->insert([
            'user_name' => $userName,
            'action' => $action,
            'details' => $details,
            'ip_address' => request()->ip(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}
