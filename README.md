# WMOJ – Documentation


## 📑 Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture & Technology Stack](#architecture--technology-stack)
3. [Monorepo Structure](#monorepo-structure)
4. [Database & Authentication (Supabase)](#database--authentication-supabase)
5. [The Web Application (`main`)](#the-web-application-main)
    - [Frontend Architecture](#frontend-architecture)
    - [Server-Side Logic & API](#server-side-logic--api)
    - [Security & Guards](#security--guards)
6. [The Judge Service (`judge`)](#the-judge-service-judge)
    - [Execution Model](#execution-model)
    - [Sandboxing & Security](#sandboxing--security)
    - [API Contract](#api-contract)
7. [Core Workflows Explained](#core-workflows-explained)
    - [The Submission Lifecycle](#the-submission-lifecycle)
    - [Contest Participation & Timers](#contest-participation--timers)
8. [Local Development Setup](#local-development-setup)
9. [Deployment Strategy](#deployment-strategy)

---

## 1. Project Overview

**WMOJ** (White Oaks Secondary School Online Judge) is a modern, full-stack competitive programming platform. It is designed to host coding contests, practice problems, and real-time leaderboards with a focus on **User Experience (UX)** and **Performance**.

Unlike legacy judges, WMOJ prioritizes:
- **Visual Fidelity**: A premium, "dark mode" glassmorphism aesthetic using Tailwind CSS 4.
- **Real-Time Feedback**: Instant submission updates and live leaderboards.
- **Judge Isolation**: A decoupled microservice architecture for executing untrusted code.

---

## 2. Architecture & Technology Stack

WMOJ is built as a **Monorepo** containing two distinct applications that communicate over HTTP.

### **1. The Web Platform (`main/`)**
The user-facing application and orchestration layer.
- **Framework**: [Next.js 15 (App Router)](https://nextjs.org/)
- **Language**: TypeScript (Strict Mode)
- **Styling**: Tailwind CSS 4 (PostCSS)
- **State Management**: React Context (`AuthContext`, `CountdownContext`)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (JWT w/ Row Level Security)

### **2. The Judge Microservice (`judge/`)**
A stateless, high-performance Node.js service responsible for executing user code.
- **Runtime**: Node.js (Express)
- **Execution Strategy**: `child_process.spawn`
- **Supported Languages**: Python 3, C++ (GCC 17), Java (OpenJDK)
- **Communication**: REST API (accepts JSON payloads)

---

## 3. Monorepo Structure

Understanding the directory layout is crucial for navigation.

```text
wmoj/
├── .git/
├── main/                       # THE WEB APP
│   ├── public/                 # Static assets (images, fonts)
│   ├── src/
│   │   ├── app/                # Next.js App Router (Pages & API)
│   │   │   ├── admin/          # Protected Admin Interface
│   │   │   ├── api/            # Serverless API Routes (The "Backend")
│   │   │   ├── auth/           # Login/Signup Pages
│   │   │   ├── contests/       # Contest Listing & Active Views
│   │   │   ├── problems/       # Problem Set & IDE
│   │   │   └── dashboard/      # User Profile & Stats
│   │   ├── components/         # Reusable UI Components
│   │   ├── contexts/           # Global State (Auth, Timers)
│   │   ├── lib/                # Singletons (Supabase Client)
│   │   ├── types/              # TypeScript Definitions (User, Problem)
│   │   └── utils/              # Helper Logic (Role checks, Timers)
│   ├── package.json            # Web App Dependencies
│   └── next.config.ts          # Next.js Configuration
│
└── judge/                      # THE JUDGE SERVICE
    ├── server.js               # Main Entry Point (Express App)
    ├── package.json            # Judge Dependencies
    └── Dockerfile              # Container Definition
```

---

## 4. Database & Authentication (Supabase)

WMOJ relies heavily on Supabase for persistent storage and authentication. We use **PostgreSQL** under the hood.

### **Core Tables**

1.  **`users`**:
    *   `id` (UUID, PK): References `auth.users`
    *   `username`, `email`, `created_at`
2.  **`admins`**:
    *   `id` (UUID, PK): If a user ID exists here, they have **Super Admin** privileges.
3.  **`problems`**:
    *   `id` (UUID), `name`, `content` (Markdown)
    *   `input` (Text[]), `output` (Text[]): The hidden test cases.
    *   `time_limit`, `memory_limit`
    *   `contest` (UUID, Nullable): If set, the problem belongs to a specific contest.
4.  **`submissions`**:
    *   `id`, `user_id`, `problem_id`
    *   `code` (Text), `language` (Enum)
    *   `results` (JSON): Detailed per-test-case results from the judge.
    *   `summary` (JSON): `{ passed: 10, total: 10, failed: 0 }`
5.  **`contests`**:
    *   `id`, `name`, `length` (minutes), `is_active`
6.  **`contest_participants`**:
    *   Link table: `user_id` <-> `contest_id`
7.  **`countdown_timers`**:
    *   Crucial for asynchronous contest timing.
    *   `started_at`: When the user clicked "Start".
    *   `duration_minutes`: Frozen at start time.

### **Authentication Flow**

1.  **Client-Side**: `AuthContext.tsx` initializes the Supabase client.
    *   Listens for `onAuthStateChange`.
    *   On login, checks `admins` table to verify role.
    *   Sets `userRole` state (`'admin' | 'regular'`).
2.  **Server-Side**: Middleware and API routes use `getServerSupabase()` (cookies) or `getServerSupabaseFromToken()` (Bearer token) to validate requests.

---

## 5. The Web Application (`main`)

### **Frontend Architecture**

The frontend uses **Tailwind CSS 4** for styling. The design philosophy is "Premium Dark Mode":
- **Gradients**: `bg-gradient-to-br from-black via-gray-900 to-black` is the standard background.
- **Glassmorphism**: heavy use of `backdrop-blur`, `bg-white/10`, and `border-white/10`.
- **Skeleton Loading**: We never show layout shifts. Use `LoadingStates.tsx` components.

**Key Components**:
-   `AdminGuard`: **CRITICAL**. Wraps admin routes. It performs a double-check:
    1.  Client-side checks context role.
    2.  **Server-side verification**: Fetches `/api/admin/check` to ensure the cookie hasn't been forged.
-   `MarkdownRenderer`: Renders problem statements (GitHub Flavored + KaTeX Math).

### **Server-Side Logic & API**

All backend logic lives in `src/app/api`. WMOJ API is **RESTful**.

*   **`GET /api/admin/check`**: The source of truth for admin privileges.
*   **`POST /api/problems/[id]/submit`**: The most complex endpoint.
    1.  Validates JWT.
    2.  Fetches problem details (including hidden test cases).
    3.  **Participation Check**: If it's a contest problem, verifies user is in `contest_participants`.
    4.  **Timer Check**: Verifies the user's personal `countdown_timer` hasn't expired.
    5.  Forwards payload to **Judge Service**.
    6.  Saves result to DB.

---

## 6. The Judge Service (`judge`)

The Judge is a specialized, stateless worker. It does **not** know about users, contests, or databases. It only knows code and inputs.

### **Execution Model**

Located in `judge/server.js`:
1.  **Request**: Receives `{ language, code, input[], output[], timeLimit }`.
2.  **Workspace**: Creates a unique temporary directory (`fs.mkdtemp`).
3.  **Compilation**:
    *   **C++**: `g++ -O2 -std=c++17`
    *   **Java**: `javac`
    *   **Python**: No compilation (interpreted).
4.  **Execution Loop**:
    *   Iterates through `input` array.
    *   Spawns process with `child_process`.
    *   Pipes input to `stdin`.
    *   Captures `stdout` and `stderr`.
    *   **Timeout**: Kills process via `SIGKILL` if `timeLimit` is exceeded.
5.  **Grading**:
    *   Normalizes whitespace (trims ends, collapses multiple spaces).
    *   Compares `actual` vs `expected`.
6.  **Cleanup**: Deletes the temporary directory.

### **Sandboxing (Important Note)**
Currently, the judge uses **Directory Isolation**. It does NOT currently implement containerization (Docker/NSJail) per submission.
*   **Implication**: Malicious code *could* theoretically access the judge's file system.
*   **Future Work**: Implement Docker-in-Docker or NSJail for true sandboxing in production.

---

## 7. Core Workflows Explained

### **The Submission Lifecycle**

1.  **User** starts typing code in the IDE (`/problems/[id]`).
2.  User clicks **Submit**.
3.  **Frontend** sends payload to Next.js API (`/api/problems/...`).
4.  **Next.js API** performs security checks (Auth, Timer, Access).
5.  **Next.js API** sends HTTP POST to `JUDGE_URL` (e.g., `http://localhost:4001/submit`).
6.  **Judge** runs the code against test cases.
7.  **Judge** returns JSON results to Next.js.
8.  **Next.js** saves results to Supabase `submissions` table.
9.  **Frontend** receives response and updates the UI with Pass/Fail/Compilation Error.

### **Contest Participation & Timers**

WMOJ supports **asynchronous contests** (Classic "Window" style).
1.  User clicks **"Join Contest"**.
2.  API creates a row in `countdown_timers` with `started_at = NOW()`.
3.  Every time the user loads a page/submits, `checkTimerExpiry` calculates:
    `TimeRemaining = (StartedAt + Duration) - CurrentTime`
4.  If `TimeRemaining <= 0`, submission is rejected with `403 Forbidden`.

---

## 8. Local Development Setup

To become a WMOJ developer, follow these steps precisely.

### **Prerequisites**
-   Node.js 18+
-   pnpm (preferred) or npm
-   Python 3 (for judge)
-   GCC/G++ (for judge)
-   Java JDK (for judge)
-   Supabase Project (Cloud or Local)

### **Step 1: Configure Environment (`main`)**
Create `main/.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL="your-supabase-url"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
NEXT_PUBLIC_JUDGE_URL="http://localhost:4001"
```

### **Step 2: Install & Run Web App**
```bash
cd main
pnpm install
pnpm dev
# Runs on http://localhost:3000
```

### **Step 3: Run Judge Service**
```bash
cd judge
pnpm install
node server.js
# Runs on http://localhost:4001
```

### **Step 4: Verify**
1.  Go to `localhost:3000`.
2.  Sign up (this creates a user in Supabase).
3.  Manually add your user ID to the `admins` table in Supabase Dashboard to get admin access.
4.  Create a problem in the Admin Dashboard.
5.  Submit a solution.

---

## 9. Deployment Strategy

### **Web App (`main`)**
Deploy to **Vercel** (recommended for Next.js).
-   Add Environment Variables in Vercel.
-   Ensure `NEXT_PUBLIC_JUDGE_URL` points to your deployed Judge Service.

### **Judge Service (`judge`)**
Deploy to a **VPS** (DigitalOcean, AWS EC2) or a Container Platform (Render, Railway).
-   **CRITICAL**: The host machine MUST have the runtimes installed (`python3`, `g++`, `java`).
-   If using Docker, build the image ensuring these compilers are in the `Dockerfile`.
-   Expose Port 4001 (or configured port).

---

> **Final Note**: You are now equipped with the knowledge of WMOJ's inner workings. Respect the code, keep the UI clean, and happy coding.
