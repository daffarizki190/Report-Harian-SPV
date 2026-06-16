<?php

namespace App\Filters;

use Closure;
use Illuminate\Support\Facades\Auth;

class Status
{
    public function handle($query, Closure $next)
    {
        if (!request()->has('status') || !request('status')) {
            return $next($query);
        }

        $status = request('status');
        $user = Auth::user();

        $driver = $query->getConnection()->getDriverName();
        $likeOp = $driver === 'pgsql' ? 'reports.form_data::text LIKE ?' : 'reports.form_data like ?';

        if ($status === 'approved') {
            if ($user->role === 'CAR PARK MANAGER') {
                $query->whereRaw($likeOp, ['%"mgr-1":%']);
            } elseif ($user->role === 'Inhouse') {
                $query->whereRaw($likeOp, ['%"mgr-2":%']);
            } else {
                $query->where(function($q) use ($likeOp) {
                    $q->whereRaw($likeOp, ['%"mgr-1":%'])
                      ->orWhereRaw($likeOp, ['%"mgr-2":%']);
                });
            }
        } elseif ($status === 'pending') {
            $notLikeOp = $driver === 'pgsql' ? 'reports.form_data::text NOT LIKE ?' : 'reports.form_data not like ?';

            if ($user->role === 'CAR PARK MANAGER') {
                $query->where(function($q) use ($notLikeOp) {
                    $q->whereNull('reports.form_data')
                      ->orWhereRaw($notLikeOp, ['%"mgr-1":%']);
                });
            } elseif ($user->role === 'Inhouse') {
                $query->where(function($q) use ($notLikeOp) {
                    $q->whereNull('reports.form_data')
                      ->orWhereRaw($notLikeOp, ['%"mgr-2":%']);
                });
            } else {
                $query->where(function($q) use ($notLikeOp) {
                    $q->whereNull('reports.form_data')
                      ->orWhere(function($sq) use ($notLikeOp) {
                          $sq->whereRaw($notLikeOp, ['%"mgr-1":%'])
                             ->whereRaw($notLikeOp, ['%"mgr-2":%']);
                      });
                });
            }
        }

        return $next($query);
    }
}
