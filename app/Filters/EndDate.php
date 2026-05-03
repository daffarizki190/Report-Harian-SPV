<?php

namespace App\Filters;

use Closure;

class EndDate
{
    public function handle($request, Closure $next)
    {
        if (!request()->has('end_date') || !request('end_date')) {
            return $next($request);
        }

        return $next($request)->whereDate('reports.report_date', '<=', request('end_date'));
    }
}
