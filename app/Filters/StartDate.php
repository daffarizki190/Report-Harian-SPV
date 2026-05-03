<?php

namespace App\Filters;

use Closure;

class StartDate
{
    public function handle($request, Closure $next)
    {
        if (!request()->has('start_date') || !request('start_date')) {
            return $next($request);
        }

        return $next($request)->whereDate('reports.report_date', '>=', request('start_date'));
    }
}
