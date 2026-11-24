# HHH Unified Next.js Handover

## Delivery summary

- Repository: `https://github.com/Happy-Healthy-Hub/hhh-next-environment`
- Delivery branch: `integration/unified-hhh-next`
- Application: one Next.js 16 App Router production server
- Public website: `/`
- Protected Operations Portal: `/admin` and `/admin/*`
- Administrator login: `/admin/login`
- FastAPI base URL: `https://api.hhh.foundation`

The landing page and portal now share one package, root layout, production build, and `next start` process. The landing page design, responsive assets, anchor navigation, FAQ, and registration modal were migrated into the target repository. Existing portal pages, Supabase authentication, phone authentication, role checks, and server-side data access were retained.

## Route map

### Public and authentication routes

| Route | Purpose | Access |
|---|---|---|
| `/` | HHH marketing site; About, Services, Academy, FAQ, and Contact remain on-page anchors | Public |
| `/robots.txt` | Search crawler rules | Public |
| `/sitemap.xml` | Public sitemap | Public |
| `/admin/login` | Existing email/password and phone OTP login | Public |
| `/auth/signout` | Supabase sign-out handler | Signed-in session |
| `/api/auth/phone/request-otp` | Server-side FastAPI phone OTP bridge | Public, rate/auth-provider dependent |
| `/api/auth/phone/resend-otp` | Server-side FastAPI OTP resend bridge | Public, rate/auth-provider dependent |
| `/api/auth/phone/verify-otp` | Server-side OTP verification and secure session-cookie creation | Public, OTP dependent |
| `/api/auth/phone/sign-out` | Phone-session sign-out | Signed-in phone session |

There are no separate `/about` or `/services` pages in the source application. Those navigation targets remain the existing `/#about` and `/#services` anchors rather than invented routes.

### Operations and administrator routes

All routes below are covered by the server-side `/admin/:path*` proxy. Page-level roles, Supabase RLS, trusted database functions, and FastAPI authorization remain the final authorization boundaries.

| Route | Purpose |
|---|---|
| `/admin` | Operations overview dashboard |
| `/admin/academy` | Academy administration |
| `/admin/assignments` | Assignment list |
| `/admin/assignments/[requestId]` | Assignment detail |
| `/admin/customers` | Customer list |
| `/admin/customers/[id]` | Customer detail |
| `/admin/workers` | Caregiver/worker list |
| `/admin/workers/[id]` | Caregiver/worker detail |
| `/admin/providers` | Provider organization list |
| `/admin/providers/[id]` | Provider organization detail |
| `/admin/requests` | Care-request list |
| `/admin/requests/[id]` | Care-request detail and authorized actions |
| `/admin/visits` | Visit scheduling and operations |
| `/admin/incidents` | Incident list |
| `/admin/incidents/[id]` | Incident detail |
| `/admin/tickets` | Support ticket list |
| `/admin/tickets/[id]` | Support ticket detail |
| `/admin/reports` | Reports and insights |
| `/admin/notifications` | Notification UI |
| `/admin/staff` | Staff and access administration |
| `/admin/staff/audit-log` | Staff audit log |
| `/admin/settings` | Portal settings |
| `/admin/not-authorized` | Role-denied result |

### Existing provider and customer portal routes

| Route | Purpose |
|---|---|
| `/admin/provider` | Provider overview |
| `/admin/provider/members` | Provider members |
| `/admin/provider/organization` | Provider organization |
| `/admin/provider/profile` | Provider profile |
| `/admin/provider/work` | Provider work |
| `/admin/customer` | Customer overview |
| `/admin/customer/profile` | Customer profile |
| `/admin/customer/requests` | Customer requests |
| `/admin/customer/services` | Customer services |

Old top-level portal URLs such as `/dashboard`, `/login`, and `/requests` issue temporary redirects to `/admin`, `/admin/login`, and `/admin/requests`. The internal page files are exposed under `/admin/*` with Next.js server rewrites, so existing components and behavior are preserved without a second application or server.

## Landing-page registration status

The modal retains all three choices:

1. Caregiver: two steps covering identity/contact details, Indian mobile number, email, address and six-digit postal PIN, emergency contact, weekly multi-slot availability, date overrides, specialization, college, qualification, and skills.
2. Provider: representative details, organization identity/type, services/specialization, representative designation, weekly multi-slot availability, and date overrides.
3. Admin: redirects directly to `/admin/login`; no public admin registration exists.

Caregiver and Provider submissions currently perform frontend validation only. The UI explicitly says that submission is pending backend integration and that no information was sent, stored, or used to create an account. Sensitive form values are not logged.

This is deliberate. Backend source inspection found authenticated or privileged operations, not a compatible public applicant workflow:

- `POST /api/v1/profiles/register-customer` requires an authenticated current user and registers a customer, not a caregiver/provider applicant.
- `POST /api/v1/caregivers` requires care-staff authorization and an existing profile ID.
- `POST /api/v1/providers/admin/organizations` requires administrator authorization and does not accept the full public application/availability contract.

Connecting the public forms to any of those routes would either fail authorization, drop required fields, or create privileged production records. No production submission, OTP, approval, or database mutation was attempted.

## API and authentication configuration

`src/lib/api/config.ts` is the single FastAPI configuration source:

```text
https://api.hhh.foundation
```

`HHH_API_URL` is a server-only override for intentional development/test environments. Trailing slashes are removed centrally, preserving all existing endpoint paths and avoiding doubled slashes. No secret is exposed to browser JavaScript.

Create `.env.local` from `.env.local.example` and set:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_OR_ANON_KEY
NEXT_PUBLIC_USE_MOCK_DATA=false
NEXT_PUBLIC_DEMO_MODE=false
HHH_API_URL=https://api.hhh.foundation
```

Do not use a Supabase service-role key in this repository. Real administrator login requires the production Supabase URL, publishable/anon key, a valid account, and an authorized role. Phone login additionally requires a working FastAPI authentication mode and OTP provider. Expired/missing sessions redirect to `/admin/login`; missing Supabase configuration fails closed for protected routes while leaving the real login page reachable.

## Validation performed

Validation was run from a clean dependency install with no production credentials and no production data mutations.

| Check | Result |
|---|---|
| `npm ci --no-audit --no-fund` | PASS |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm test` | PASS — 8 files, 100 tests |
| `npm run build` | PASS — Next.js 16.4.6 production server build, 44 routes |
| `GET /` | PASS — HTTP 200 |
| `GET /admin/login` | PASS — HTTP 200 |
| `GET /admin` while signed out/unconfigured | PASS — HTTP 307 to `/admin/login` |
| `GET /admin/requests` while signed out/unconfigured | PASS — HTTP 307 to `/admin/login` |
| `GET /requests` | PASS — HTTP 307 to `/admin/requests` |
| `GET /robots.txt` | PASS — HTTP 200 |
| `GET /sitemap.xml` | PASS — HTTP 200 |
| `GET /hhh-logo.png` | PASS — HTTP 200 |
| API host scan | PASS — active server API configuration uses `https://api.hhh.foundation`; no active localhost/IP backend default |
| Responsive source review | PASS — retained landing/portal breakpoints and responsive image variants; no automated visual-regression baseline exists |
| Authenticated production portal workflows | NOT FULLY TESTED — no production test credentials were supplied |
| Phone OTP workflow | NOT FULLY TESTED — no OTP was sent |
| Caregiver/Provider backend submission | NOT IMPLEMENTED — no compatible safe public endpoint exists |

## Known blockers before production use

1. Set the real Supabase public URL and publishable/anon key on the VPS.
2. Confirm production administrator accounts have the required backend roles and RLS permissions.
3. Confirm the FastAPI deployment's phone authentication/OTP provider before demonstrating phone login.
4. Add a purpose-built, abuse-protected public applicant endpoint before enabling Caregiver or Provider submission. Its contract must support the fields and availability model in the forms and must not auto-approve applicants.
5. Verify authenticated workflows using designated non-production/test accounts. They were intentionally not claimed as passing without credentials.
6. If browser code is later changed to call FastAPI directly, explicitly allow the deployed website origin in FastAPI CORS. Current privileged FastAPI calls are server-side, and normal portal data access retains the existing Supabase flow.
7. Incidents, notifications, and parts of Settings retain the portal's existing honest unavailable states where backend implementations are absent.

## VPS deployment commands

The application must run as a Next.js server; do not configure static export. The commands below assume Ubuntu/Debian, Git, Nginx, and Node.js 24 LTS are installed.

### First deployment

```bash
node --version
npm --version

export HHH_APP_DIR=/var/www/hhh-next-environment
sudo install -d -o "$USER" -g "$USER" "$HHH_APP_DIR"
git clone --branch integration/unified-hhh-next --single-branch \
  https://github.com/Happy-Healthy-Hub/hhh-next-environment.git "$HHH_APP_DIR"
cd "$HHH_APP_DIR"
npm ci
install -m 600 .env.local.example .env.local
nano .env.local
npm run lint
npm run typecheck
npm test
npm run build
sudo chown -R www-data:www-data "$HHH_APP_DIR"
```

Create the service:

```bash
sudo tee /etc/systemd/system/hhh-next.service >/dev/null <<'EOF'
[Unit]
Description=HHH unified Next.js application
After=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/var/www/hhh-next-environment
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm run start -- -H 127.0.0.1 -p 3000
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now hhh-next
sudo systemctl status hhh-next --no-pager
curl -I http://127.0.0.1:3000/
curl -I http://127.0.0.1:3000/admin/login
```

Example Nginx reverse proxy for `hhh.foundation`:

```bash
sudo tee /etc/nginx/sites-available/hhh-next >/dev/null <<'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name hhh.foundation www.hhh.foundation;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF

sudo ln -s /etc/nginx/sites-available/hhh-next /etc/nginx/sites-enabled/hhh-next
sudo nginx -t
sudo systemctl reload nginx
```

Keep the site's existing HTTPS/certificate automation in place. If this is a new host, provision its TLS certificate using the VPS operator's established process before the live demonstration.

### Updating this branch on the VPS

```bash
export HHH_APP_DIR=/var/www/hhh-next-environment
sudo chown -R "$USER":"$USER" "$HHH_APP_DIR"
cd "$HHH_APP_DIR"
git fetch origin integration/unified-hhh-next
git checkout integration/unified-hhh-next
git pull --ff-only origin integration/unified-hhh-next
npm ci
npm run lint
npm run typecheck
npm test
npm run build
sudo chown -R www-data:www-data "$HHH_APP_DIR"
sudo systemctl restart hhh-next
sudo systemctl status hhh-next --no-pager
```

## Changed-file manifest

The integration intentionally changes only the target Next.js repository. It does not modify the Python backend, Flutter application, database schema, or deployment infrastructure.

- Root/configuration: `.env.local.example`, `README.md`, `HHH_UNIFIED_NEXT_HANDOVER.md`, `next.config.ts`, `package.json`, `package-lock.json`, `vitest.config.mts`, removal of legacy `middleware.ts`, addition of `src/proxy.ts` and its test.
- Central API/auth: `src/lib/api/config.ts`, `src/lib/api/config.test.ts`, `src/lib/api/client.ts`, `src/lib/phoneAuth/session.ts`, `src/lib/supabase/middleware.ts`, `src/app/auth/signout/route.ts`.
- Unified shell/navigation: `src/app/layout.tsx`, `src/app/globals.css`, `src/app/components/AdminSidebar.tsx`, `src/app/components/AppShell.tsx`, customer/provider sidebars and provider shell.
- Landing page: `src/app/page.tsx`, `src/app/landing.css`, `src/app/registration.css`, `src/app/components/landing/*`, `src/app/robots.ts`, `src/app/sitemap.ts`.
- Login/canonical routing updates: `src/app/login/*`, `src/app/dashboard/page.tsx`, `src/app/reports/page.tsx`, `src/app/providers/ProvidersPanel.tsx`.
- Public assets: `public/apple-icon.png`, `public/icon.png`, `public/images/hhh-*.webp`, `public/images/hhh-og.png`, and `public/images/SOURCES.md`.
