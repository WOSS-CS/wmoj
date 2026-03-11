# Frontend Audit & Code Review Report

## Executive Summary
This audit evaluated the Next.js 16 (App Router) and React 19 frontend codebase located in `main/src`. The review focused on React best practices, Next.js performance optimizations, architecture, accessibility, and code quality. 

While the application successfully implements core features, there are significant architectural deviations from Next.js App Router best practices—most notably the overuse of client-side rendering and suboptimal data fetching patterns. Addressing these will dramatically improve performance, reduce bundle sizes, and enhance maintainability.

---

## 1. Architecture & Rendering (React Server Components)

### 🔴 Critical Issue: Ubiquitous `'use client'` on Pages
Almost every page in the `src/app` directory (e.g., `contests/page.tsx`, `problems/[id]/page.tsx`, `dashboard/page.tsx`, and all admin pages) is declared as a Client Component using the `'use client'` directive at the top level.

- **Impact:** This completely nullifies the primary benefit of the Next.js App Router. It forces the entire page, including static content, to be bundled and rendered on the client. This increases initial load times (Largest Contentful Paint) and JavaScript payload size.
- **Recommendation:** Refactor pages to be **Server Components** by default. Extract interactive UI elements (forms, buttons, modals, and hooks like `useState`/`useEffect`) into smaller, dedicated Client Components. Pass server-fetched data as props to these leaf-node Client Components.

---

## 2. Data Fetching & State Management

### 🔴 Critical Issue: Client-Side Fetching in `useEffect` (Waterfalls)
Data fetching is heavily reliant on `useEffect` and raw `fetch` calls across the application. 
- In files like `contests/[id]/page.tsx`, multiple independent API requests are `await`ed sequentially.
- **Impact:** This creates severe request waterfalls where the second request cannot start until the first one finishes, leading to sluggish UI loading. Furthermore, fetching in `useEffect` lacks built-in caching, deduplication, and revalidation.
- **Recommendation:** 
  1. **Move fetching to the server:** Fetch data directly in Server Components using async/await. Next.js automatically caches and deduplicates these requests.
  2. **Parallelize requests:** If multiple independent fetches must occur, wrap them in `Promise.all()` to execute them concurrently.
  3. **Use a data-fetching library:** If client-side fetching is unavoidable, replace `useEffect` with libraries like SWR or React Query (`@tanstack/react-query`).

---

## 3. Bundle Size & Performance

### 🟡 Warning: Static Imports of Heavy Libraries
The `@monaco-editor/react` library is correctly lazy-loaded using `next/dynamic` (Excellent practice!). However, `react-syntax-highlighter` is statically imported in several places:
- `app/admin/dashboard/page.tsx`
- `app/admin/problems/[id]/submissions/page.tsx`
- `components/MarkdownRenderer.tsx`

- **Impact:** Syntax highlighters contain massive language definition payloads. Statically importing them blocks the main thread and significantly inflates the bundle size.
- **Recommendation:** Lazily load the `MarkdownRenderer` and any component that utilizes `react-syntax-highlighter` using `next/dynamic({ ssr: false })` (or just dynamically import the component if SSR is desired but chunking is needed).

---

## 4. Accessibility (A11y)

### 🟡 Warning: Non-Semantic Interactive Elements
The codebase uses `<div>` elements with `onClick` handlers for interaction (e.g., the backdrop click handler in `AuthPromptModal.tsx`).

- **Impact:** Screen readers cannot identify these elements as interactive, and keyboard users cannot navigate to or activate them using `Tab` and `Enter/Space`.
- **Recommendation:** 
  - Prefer using native, semantically correct elements like `<button>` and style them appropriately.
  - If a `<div>` must be used, add `role="button"`, `tabIndex={0}`, and an `onKeyDown` handler to capture Enter/Space key presses.

---

## 5. Code Quality & Error Handling

### 🟡 Warning: Silent or Insufficient Error Handling
Several `try...catch` blocks within data-fetching `useEffect` hooks swallow errors or merely log them to the console without updating the UI.

- **Impact:** Users are left with infinite loading states or broken interfaces without any actionable feedback.
- **Recommendation:** 
  - Utilize Next.js `error.tsx` boundaries to gracefully catch and display errors.
  - For client-side mutations/fetches, implement robust error state management and display user-friendly toast notifications (e.g., using the existing `ui/Toast.tsx` component).

---

## Summary of Action Items

1. **Remove `'use client'` from page components** and push interactivity down the component tree.
2. **Migrate data fetching to Server Components** wherever possible.
3. **Refactor sequential `await fetch` calls** to use `Promise.all()`.
4. **Implement dynamic imports** for `react-syntax-highlighter`.
5. **Fix accessibility issues** on interactive `div` elements.
