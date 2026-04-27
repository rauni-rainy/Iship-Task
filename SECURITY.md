# Security Architecture & Policies

This document outlines the comprehensive security measures implemented across the ContestHub platform.

## 1. Network & Application Security Headers
- **Helmet**: Fully deployed `helmet` middleware setting restrictive CSP (Content Security Policy) rules.
  - Scripts and Styles strictly scoped to `'self'` (with unsafe-inline enabled strictly for the Monaco Editor rendering).
  - WebSockets scoped tightly to known ports.
- **Next.js Headers**: Forced `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and strict cross-origin policies locally via `next.config.ts`.
- **HSTS**: HTTP Strict Transport Security is enforced for 1 year, ensuring secure TLS termination points.

## 2. Authentication & Authorization
- **JWT Lifecycles**: Access tokens (15 min) and Refresh tokens (7 days).
- **Secure Cookies**: Both tokens are restricted strictly to `httpOnly` and `SameSite=Strict`. Secure flag is activated automatically in Production.
- **CSRF Protection**: We employ the Double-Submit Cookie pattern. `X-CSRF-Token` headers are strictly validated on all state-altering endpoints (POST/PUT/DELETE) alongside a non-httpOnly validation cookie.
- **Role-Based Routing**: Strict route middleware prevents arbitrary API probing from non-admin participants, specifically safeguarding the socket observability layer.

## 3. Rate Limiting (DDoS & Spam Prevention)
- **Login / Register**: Brute-force blocked (10 requests per 15 minutes / 1 hr).
- **Contest Submissions**: Throttled strictly to 5 submissions per 60 seconds per user (using unique ID tracking, bypassing NAT/IP collisions).
- **Contest Creation**: Limited to 5 contests per hour to prevent DB saturation.
- **Global API Limiter**: Broad 100 req / 15m limit on all remaining API vectors.

## 4. Input Sanitization & Payload Integrity
- **Database Safety (SQLi)**: 100% adherence to parameterized SQL queries via `pg`. Direct string interpolation into queries is explicitly prohibited and actively warned against via a custom connection pool proxy wrapper.
- **XSS Mitigation (Backend)**: Custom Regex-based `sanitizeString` sweeps all problem statement inserts, stripping `<script>`, `<object>`, `<iframe>`, and `on*` payloads natively before they touch the database.
- **XSS Mitigation (Frontend)**: React `dangerouslySetInnerHTML` is globally banned. Problem statements use `sanitize-html` nested directly within a strict element whitelist (via `marked`) protecting against stored XSS vectors.
- **Strict Validations**: `validateUUID` middleware ensures Malformed parameter injection returns HTTP 400 instantly, blocking unnecessary database load.

## 5. Anti-Cheat Boundaries
- **Viewport Context Monitoring**: DOM APIs continuously poll for `blur`, `visibilitychange`, and `fullscreenchange`. 
- **Grace Period Stripping**: Disconnections result in a single 10-second warning countdown before triggering forced server-side automated submissions (`autoSubmitAll`). 

## 6. Error Handling
- **Production Stripping**: Stack traces are fully suppressed when `NODE_ENV=production`.
- **Unhandled Handlers**: `uncaughtException` and `unhandledRejection` catch-alls safely close the HTTP process loop and prevent hanging sockets before issuing `process.exit(1)`.
