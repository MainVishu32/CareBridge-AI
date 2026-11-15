# CareBridge — Elderly Care & Medication Management Platform

CareBridge is a modern, senior-accessible healthcare SaaS platform designed to centralize medication adherence, medical appointments, vital health logs, and care circle coordination between elderly individuals, family proxies, and caregivers.

---

## 🌟 Phase 2: Authentication & Multi-User Role Management System

### 1. User Roles & Permission Model
The platform implements three distinct roles with strict permission boundaries enforced by database policies:

| Role | System ID | Description & Permissions |
| :--- | :--- | :--- |
| **Elderly Individual** | `elderly` | **Profile Owner**: Full control over healthcare profile, issue secure member invitation codes, configure 4-digit passcode, and revoke member access. |
| **Caretaker** | `caretaker` | **Care Professional**: Access and manage permitted daily healthcare activities, dose logs, and vital tracking. Member revocation restricted to owner. |
| **Family Member** | `family_member` | **Family Proxy**: Read-only visibility into healthcare schedules, emergency contact coordination, and appointment ride assistance. |

### 2. Multi-Mode Authentication & Senior Passcode Access
- **Password-Based Authentication**: Email and password sign-in and registration with strict input validation.
- **Cryptographic Passcode Access**: Senior-friendly 3x4 touch keypad for quick profile access. **Passcodes are never stored in plain text**; they are cryptographically salted and hashed using SHA-256 / `pgcrypto`.
- **Session Persistence & Route Protection**: Active user session is preserved across refreshes. Protected routes require active authentication.

### 3. Shared Healthcare Profiles & Secure Invitations
- **Healthcare Profile Creation**: Elderly profile owners can register their profile name, date of birth, emergency proxy, and 4-digit passcode.
- **Secure Invitations**: Profile owners can generate unique, single-use 6-character invitation codes (e.g. `CARE-NW89K2`) with 7-day expiration.
- **Invitation Redemption**: Caretakers and family members can join an elderly person's care circle by entering their invitation code upon registration or directly from their dashboard.
- **Multi-Member Connection**: Multiple family proxies and caregivers can connect to one elderly profile.
- **Access Revocation**: Profile owners can immediately revoke member access with an audit trail preserved. Non-owners attempting revocation are strictly blocked by backend security policies.

---

## 🗄️ Database Architecture & Migrations

Database migration script located at:
`supabase/migrations/20261115_phase2_auth_and_roles.sql`

### Tables Created:
1. `public.profiles`: User details (linked 1:1 with `auth.users`), full name, role (`elderly`, `caretaker`, `family_member`), and phone.
2. `public.elderly_profiles`: Healthcare profiles with `owner_id`, `full_name`, `date_of_birth`, `passcode_hash` (salted crypt hash), and emergency proxy information.
3. `public.profile_members`: Connection between authorized users and elderly profiles, storing assigned `role`, `status` (`active` or `revoked`), and granular `permissions` JSONB.
4. `public.profile_invitations`: Secure invitation codes (`invite_code`), target role, permissions, status (`pending`, `accepted`, `revoked`), and expiration timestamp.

### Row Level Security (RLS) Policies:
- **`profiles`**: Users can read and update their own profile; members of the same care circle can view co-member names.
- **`elderly_profiles`**: Owner has full CRUD control (`auth.uid() = owner_id`). Active authorized members in `profile_members` have SELECT access. Revoked users are denied.
- **`profile_members`**: Profile owner can view and revoke members. Active members can view co-members.
- **`profile_invitations`**: Profile owner can create and manage invitations. Authenticated users can verify pending invitation codes during redemption.

### Database Functions & Triggers:
- `handle_new_user()`: Automatic trigger on `auth.users` creation.
- `set_elderly_passcode(profile_id, passcode)`: Cryptographically hashes passcode using `pgcrypto`.
- `verify_elderly_passcode(profile_id, input_passcode)`: Verifies passcode without exposing hash to client.
- `accept_profile_invitation(invite_code)`: Validates code and establishes membership.
- `revoke_profile_member(member_id)`: Enforces that only the profile owner can revoke access.

---

## ⚙️ Environment Variables

Copy `.env.example` to `.env` and fill in your Supabase project credentials:

```bash
# Supabase Project Configuration
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-actual-anon-public-key-here
```

*Note: Without valid Supabase credentials, the application uses limited browser-local storage for development. It is not equivalent to Supabase authentication or RLS, Care Circle invitation operations require Supabase, and local mode must not be used with real patient data.*

---

## 🧪 Development Verification Scripts

The repository does not currently define an `npm test` script. The workflow scripts under `src/tests` are legacy development checks and are not a substitute for testing against a dedicated Supabase project.

```bash
npx tsx src/tests/testElderlyProfileWorkflow.ts
```

This script uses in-memory browser-storage substitutes and does not verify Supabase, database policies, or RLS. The Phase 2 and Phase 3 scripts are legacy checks and currently assume local invitation behavior; Care Circle invitations now require the Supabase-backed RPCs. Do not interpret those scripts as successful integration or authorization tests.

---

## 🚀 Running the Project

```bash
# Development Server
npm run dev

# Production Build
npm run build

# Preview Production Build
npm run preview
```
