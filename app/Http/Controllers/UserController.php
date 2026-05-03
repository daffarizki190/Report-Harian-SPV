<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class UserController extends Controller
{
    /**
     * List all users (Admin only).
     */
    public function index()
    {
        if (Auth::user()->role !== 'Admin') {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }
        // Professional Eloquent optimization: latestOfMany + Eager Loading
        return response()->json(User::with('latestReport')->get());
    }

    /**
     * Store a new user or update existing.
     */
    public function store(Request $request)
    {
        if (Auth::user()->role !== 'Admin') {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $request->validate([
            'name'     => 'required|string|max:255',
            'username' => 'required|string|unique:users,username' . ($request->id ? ',' . $request->id : ''),
            'role'     => 'required|in:Admin,Supervisor,CAR PARK MANAGER,Leader,Inhouse',
            'password' => $request->id ? 'nullable|string|min:6' : 'required|string|min:6',
        ]);

        if ($request->id) {
            // ── Update user yang sudah ada ──
            $user = User::findOrFail($request->id);
            $user->name     = $request->name;
            $user->username = $request->username;
            $user->role     = $request->role;
            if ($request->password) {
                $user->password = Hash::make($request->password);
            }
            $user->save();
            $action = 'Update User';
        } else {
            // ── Buat user baru ──
            $user = User::create([
                'name'     => $request->name,
                'username' => $request->username,
                'role'     => $request->role,
                'password' => Hash::make($request->password),
            ]);
            $action = 'Create User';
        }

        $this->logActivity(Auth::user()->name, $action, "User: {$user->username} ({$user->role})");

        return response()->json(['message' => 'User berhasil disimpan.', 'user' => $user]);
    }

    /**
     * Delete a user.
     */
    public function destroy($id)
    {
        if (Auth::user()->role !== 'Admin') {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $user = User::findOrFail($id);
        
        // Prevent deleting self
        if ($user->id === Auth::id()) {
            return response()->json(['message' => 'Anda tidak bisa menghapus akun sendiri.'], 422);
        }

        $this->logActivity(Auth::user()->name, 'Delete User', "User: {$user->username}");
        $user->delete();

        return response()->json(['message' => 'User berhasil dihapus.']);
    }

    private function logActivity($userName, $action, $details)
    {
        // Laravel 11 defer() for non-blocking logging
        defer(fn () => DB::table('activity_logs')->insert([
            'user_name' => $userName,
            'action' => $action,
            'details' => $details,
            'ip_address' => request()->ip(),
            'created_at' => now(),
            'updated_at' => now(),
        ]));
    }
}
