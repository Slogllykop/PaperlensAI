# PaperLens AI: Developer & Agent Guide

Welcome, future AI agent or developer! This document serves as the comprehensive guide to the architecture, design philosophy, and technical constraints of the **PaperLens AI** project. Read this carefully before making any modifications to the codebase.

---

## 1. Project Overview

**PaperLens AI** is a high-performance web application designed to help students and researchers quickly understand complex academic papers. Users can input text, upload a PDF, or provide a URL. The system processes the document using Groq (Llama 3), structures the output into 7 distinct visual sections (Summary, Key Concepts, Math, Preview, Mind Map, Learning Cards, Related Topics), and presents them in a highly polished, interactive UI.

## 2. Tech Stack

*   **Framework**: Next.js 16 (App Router)
*   **Database**: Supabase (PostgreSQL)
*   **Caching & Rate Limiting**: Upstash (Serverless Redis)
*   **AI / LLM**: Groq API (using `llama-3.3-70b-versatile` via the OpenAI SDK wrapper)
*   **Styling**: Tailwind CSS + `shadcn/ui`
*   **Animations**: Framer Motion (`motion/react`)
*   **Visualizations**: React Flow (`@xyflow/react`)
*   **PDF Parsing**: `pdfjs-dist` (Client-side)

---

## 3. Core Architectural Rules (MUST READ)

### A. Strict Database Security (RPC Only)
*   **Row Level Security (RLS)** is enabled on all tables (`papers`, `analysis_results`) with a **"deny-all"** default policy.
*   **Direct table access is strictly prohibited.** You cannot run `supabase.from('papers').select()`.
*   All database interactions **MUST** go through `SECURITY DEFINER` RPC functions.
*   The available RPC functions (defined in `supabase/migrations/`) are wrapped in `src/lib/db.ts`. Use these wrapper functions exclusively.

### B. Hooks-Driven Frontend
*   UI Components (`src/components/`) must remain purely presentational. They should only handle layout, styling, and animations.
*   All state management, API polling, data fetching, and business logic **MUST** reside in custom hooks inside the `src/hooks/` directory (e.g., `use-analyze-paper.ts`, `use-paper-results.ts`).

### C. Asynchronous Processing & Polling
Because LLM analysis can take 10-30 seconds, we do not block the initial API request.
1.  **Request**: Client hits `POST /api/v1/papers/analyze`.
2.  **Acknowledge**: The server creates a DB record via RPC, sets a "pending" status in Upstash Redis, triggers the background analysis (`analyzePaper` in `src/lib/ai/analyze.ts`), and immediately returns a `paperId`.
3.  **Poll**: The client uses `usePaperStatus` to poll `GET /api/v1/papers/[id]/status` every 2 seconds. This endpoint reads directly from Redis for ultra-low latency.
4.  **Complete**: Once the background job finishes, it saves the JSON payload to Supabase and updates the status to "completed".

---

## 4. Design & UI Philosophy

*   **Premium Aesthetics**: The app uses a dark-mode first, glassmorphic design language. Avoid generic aesthetics.
*   **Motion**: Framer Motion is used extensively. Ensure new components use staggered entrances and smooth transitions.
*   **React Keys**: **NEVER** use array indices as `key` props in React, especially inside `motion.div` elements. Always map to stable, unique identifiers from the data (e.g., `card.question`, `concept.name`).
*   **Interactive Visuals**: We use React Flow for mind maps. Ensure custom node components (`nodeTypes`) are defined *outside* the main component to prevent unnecessary re-renders.

---

## 5. Key File Locations

*   **`src/app/api/v1/`**: Next.js Route Handlers.
*   **`src/components/results/`**: The 7 core visualization components mapped to the AI's JSON output.
*   **`src/lib/ai/`**: Prompt definitions and the Groq orchestration logic.
*   **`src/lib/db.ts`**: The exclusive gateway to Supabase RPCs.
*   **`src/lib/types.ts`**: The single source of truth for TypeScript interfaces (including the exact JSON schema expected from the LLM).
*   **`supabase/migrations/`**: All database schema changes and RPC definitions.

---

## 6. Development Gotchas

*   **Type Narrowing in Closures**: When dealing with recursive structures (like the Mind Map tree), TypeScript can lose type narrowing inside `.forEach` closures. Always capture variables explicitly (e.g., `const children = node.children;`) before entering callbacks to satisfy the compiler.
*   **PDF Worker**: `pdfjs-dist` requires a worker. We configure this in `use-pdf-parser.ts` using the local `pdf.worker.min.mjs` served from the `/public` directory.
*   **Rate Limits**: The `POST /analyze` route is strictly rate-limited (10 requests/hour per IP) via Upstash to prevent abuse of the Groq API.
