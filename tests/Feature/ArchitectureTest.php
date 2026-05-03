<?php

test('globals')
    ->expect(['dd', 'dump', 'ray', 'die', 'var_dump'])
    ->not->toBeUsed();

test('controllers')
    ->expect('App\Http\Controllers')
    ->not->toUse('env');
