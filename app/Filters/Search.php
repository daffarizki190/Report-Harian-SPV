<?php

namespace App\Filters;

use Closure;

class Search
{
    public function handle($request, Closure $next)
    {
        if (!request()->has('search') || !request('search')) {
            return $next($request);
        }

        $search = request('search');

        // Professional Laravel 11 feature: whereAny
        // This searches across multiple columns using a single method
        return $next($request)->whereAny(
            ['reports.spv_name', 'reports.description', 'reports.manual_content'],
            'LIKE',
            "%$search%"
        );
    }
}
