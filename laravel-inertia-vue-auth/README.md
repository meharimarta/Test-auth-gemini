# ForgeAuth — Laravel 11 + Vue 3 + Inertia.js + Tailwind CSS Authentication

Complete, production-ready authentication system built with Laravel 11, Inertia.js, Vue 3 (`<script setup>`), Ziggy named routes, and Tailwind CSS.

## Included Flows
- **Registration & Email Verification** (`MustVerifyEmail` signed URLs + resend throttling)
- **Session Login & Remember Me** (rate-limited via `RateLimiter`, session fixation protection)
- **Forgot & Reset Password** (signed tokens with expiration and `Password::defaults()` rules)
- **Password Confirmation Middleware** (`password.confirm` for sensitive actions)
- **Profile & Security Management** (update name/email with re-verification, update password, delete account)
- **Active Database Sessions** (inspect IP/User-Agent and revoke individual or other sessions)
- **PHPUnit Feature Tests** covering login, registration, verification, password reset, and profile updates

## Local Setup
```bash
composer install
npm install
cp .env.example .env
php artisan key:generate
touch database/database.sqlite
php artisan migrate
npm run dev
php artisan serve
```

## Run Tests
```bash
php artisan test
```

## Commit & Push to Your GitHub Repository
```bash
git init
git add .
git commit -m "feat: add Laravel 11 + Vue 3 Inertia authentication system with Tailwind CSS"
git branch -M main
git remote add origin https://github.com/<YOUR_USERNAME>/<YOUR_REPO>.git
git push -u origin main
```
