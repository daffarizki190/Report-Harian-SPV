<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AuthController extends Controller
{
    public function showLogin()
    {
        if (Auth::check()) {
            return redirect()->route('dashboard');
        }
        return view('login');
    }

    public function login(Request $request)
    {
        $credentials = $request->validate([
            'username' => 'required|string',
            'password' => 'required|string',
        ]);

        if (Auth::attempt($credentials)) {
            $request->session()->regenerate();
            return redirect()->intended('dashboard');
        }

        return back()->withErrors([
            'username' => 'Username atau password salah.',
        ]);
    }

    public function sendMagicLink(Request $request)
    {
        $request->validate(['username' => 'required|exists:users,username']);
        
        $user = \App\Models\User::where('username', $request->username)->first();
        
        // Generate a temporary signed URL valid for 15 minutes
        $url = \Illuminate\Support\Facades\URL::temporarySignedRoute(
            'magic.link.login',
            now()->addMinutes(15),
            ['user' => $user->id]
        );

        return back()->with('magic_link', $url)->with('status', 'Magic Link berhasil dibuat! Silakan gunakan link di bawah untuk masuk (Berlaku 15 menit).');
    }

    public function loginViaMagicLink(Request $request, $userId)
    {
        // Signed middleware automatically handles validation
        $user = \App\Models\User::findOrFail($userId);
        Auth::login($user);
        
        $request->session()->regenerate();
        return redirect()->intended('dashboard');
    }

    public function logout(Request $request)
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();
        return redirect('/');
    }
}
