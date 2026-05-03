<?php

namespace App\Filters;

use Closure;

class Shift
{
    public function handle($request, Closure $next)
    {
        if (!request()->has('shift') || !request('shift')) {
            return $next($request);
        }

        return $next($request)->where('reports.shift', request('shift'));
    }
}
