<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('users')->insert([
            [
                'id' => 1,
                'name' => 'Admin',
                'email' => 'admin@test.com',
                'password' => Hash::make('admin123'), // obligatorio si no es OAuth
                'role' => 'admin',
                'email_verified_at' => now(),
                'provider' => null,
                'provider_id' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => 2,
                'name' => 'User Demo',
                'email' => 'user@test.com',
                'password' => Hash::make('user123'),
                'role' => 'user',
                'email_verified_at' => now(),
                'provider' => null,
                'provider_id' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        ]);
    }
}