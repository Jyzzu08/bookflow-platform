<?php

namespace Database\Seeders;

use App\Models\Book;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $books = [
            [
                'title' => 'Docker Deep Dive',
                'cover' => 'docker.jpg',
                'id_user' => 'demo-user',
            ],
            [
                'title' => 'Distributed Systems 101',
                'cover' => 'distributed.jpg',
                'id_user' => 'demo-user',
            ],
            [
                'title' => 'Zero Trust Networks',
                'cover' => 'zero-trust.jpg',
                'id_user' => 'admin-seed',
            ],
        ];

        foreach ($books as $book) {
            Book::query()->updateOrCreate(
                ['title' => $book['title'], 'id_user' => $book['id_user']],
                $book
            );
        }
    }
}
