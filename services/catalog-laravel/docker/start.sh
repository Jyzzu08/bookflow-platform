#!/bin/sh
set -eu

cd /var/www/html

php artisan config:clear >/dev/null 2>&1 || true
php artisan migrate --force
php artisan db:seed --force

exec apache2-foreground
