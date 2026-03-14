<?php

use App\Models\Book;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Route;

Route::get('/health', function () {
    return response()->json([
        'service' => 'catalog',
        'status' => 'ok',
        'framework' => 'laravel',
    ]);
});

Route::get('/v1/get_all/{id_user}/{token}', function (string $id_user) {
    return response()->json(
        Book::query()
            ->where('id_user', $id_user)
            ->orderByDesc('id')
            ->get(['id', 'title', 'cover', 'id_user'])
    );
});

Route::get('/v1/get/{id}/{token}', function (int $id) {
    $book = Book::query()->find($id, ['id', 'title', 'cover', 'id_user']);

    if (!$book) {
        return response()->json(['error' => 'book_not_found'], 404);
    }

    return response()->json($book);
});

Route::get('/v2/catalog/books', function () {
    return response()->json([
        'items' => Book::query()
            ->orderByDesc('id')
            ->get(['id', 'title', 'cover', 'id_user']),
    ]);
});

Route::post('/v2/catalog/books', function (Request $request) {
    $validator = Validator::make($request->all(), [
        'title' => ['required', 'string', 'max:255'],
        'cover' => ['required', 'string', 'max:255'],
        'idUser' => ['required', 'string', 'max:255'],
    ]);

    if ($validator->fails()) {
        return response()->json([
            'error' => 'invalid_payload',
            'details' => $validator->errors(),
        ], 400);
    }

    $validated = $validator->validated();

    $book = Book::query()->create([
        'title' => $validated['title'],
        'cover' => $validated['cover'],
        'id_user' => $validated['idUser'],
    ]);

    return response()->json([
        'id' => $book->id,
        'title' => $book->title,
        'cover' => $book->cover,
        'id_user' => $book->id_user,
    ], 201);
});

Route::get('/', function () {
    return response()->json([
        'service' => 'catalog',
        'message' => 'BookFlow Laravel catalog is running',
    ]);
});

Route::fallback(function () {
    return response()->json([
        'error' => 'route_not_found',
    ], 404);
});
