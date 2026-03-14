<?php

namespace Tests\Feature;

use App\Models\Book;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CatalogApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_health_endpoint_returns_expected_payload(): void
    {
        $response = $this->get('/health');

        $response
            ->assertOk()
            ->assertJson([
                'service' => 'catalog',
                'status' => 'ok',
                'framework' => 'laravel',
            ]);
    }

    public function test_legacy_get_all_returns_books_for_requested_user(): void
    {
        Book::query()->create([
            'title' => 'Legacy Book',
            'cover' => 'legacy.jpg',
            'id_user' => 'demo-user',
        ]);

        Book::query()->create([
            'title' => 'Other User Book',
            'cover' => 'other.jpg',
            'id_user' => 'another-user',
        ]);

        $response = $this->get('/v1/get_all/demo-user/fake-token');

        $response
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonFragment([
                'title' => 'Legacy Book',
                'id_user' => 'demo-user',
            ]);
    }

    public function test_legacy_get_returns_404_when_book_does_not_exist(): void
    {
        $response = $this->get('/v1/get/999/fake-token');

        $response
            ->assertNotFound()
            ->assertJson([
                'error' => 'book_not_found',
            ]);
    }

    public function test_v2_catalog_books_can_be_created(): void
    {
        $response = $this->postJson('/v2/catalog/books', [
            'title' => 'BookFlow in Practice',
            'cover' => 'bookflow.jpg',
            'idUser' => 'demo-user',
        ]);

        $response
            ->assertCreated()
            ->assertJsonFragment([
                'title' => 'BookFlow in Practice',
                'cover' => 'bookflow.jpg',
                'id_user' => 'demo-user',
            ]);

        $this->assertDatabaseHas('books', [
            'title' => 'BookFlow in Practice',
            'id_user' => 'demo-user',
        ]);
    }

    public function test_v2_catalog_books_validates_payloads(): void
    {
        $response = $this->postJson('/v2/catalog/books', [
            'title' => '',
            'cover' => 'missing-title.jpg',
        ]);

        $response
            ->assertBadRequest()
            ->assertJson([
                'error' => 'invalid_payload',
            ]);
    }
}
