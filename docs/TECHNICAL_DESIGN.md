# LawBrain — Technical Design Document

> AI-powered legal assistant for Zambian law, built on Firestore Vector Search + Gemini RAG.

---

## 1. Overview

**Product**: LawBrain
**Pitch**: An AI assistant that answers questions about the Zambian constitution and government statutes using Retrieval-Augmented Generation (RAG) — grounding every answer in cited source documents.
**Target Users**: Citizens, students, lawyers, researchers seeking quick, accurate Zambian legal information.

### Key Features

- Conversational AI chat with cited legal sources
- Firestore Native Vector Search for semantic document retrieval
- Session history persisted per authenticated user
- Document browser for the Zambian legal corpus
- Firebase Auth (Google sign-in + email/password)

---

## 2. Tech Stack (Golden Path)

| Layer                  | Technology                     | Version        |
| ---------------------- | ------------------------------ | -------------- |
| Package Manager        | pnpm workspaces                | 8.15.6+        |
| Monorepo Orchestration | Turborepo                      | ^2.7.5         |
| Runtime                | Node.js                        | >=20           |
| Language               | TypeScript (strict)            | 5.5.4          |
| Frontend Framework     | React                          | ^18.3.1        |
| Build Tool             | Vite                           | ^5.1.4         |
| UI Kit                 | shadcn/ui (Radix + Tailwind)   | latest         |
| Styling                | Tailwind CSS                   | ^3.4.15        |
| Icons                  | Lucide React                   | ^0.468.0       |
| Routing                | React Router DOM               | ^6.28.0        |
| State / Server Cache   | TanStack Query                 | ^5.62.0        |
| Forms                  | React Hook Form + Zod          | ^7.x / ^3.x    |
| API Layer              | tRPC                           | ^11.0.0-rc.660 |
| Notifications          | Sonner                         | ^1.7.1         |
| Markdown Rendering     | react-markdown + remark-gfm    | ^9.x / ^4.x    |
| Date Formatting        | date-fns                       | ^3.6.0         |
| Auth + DB + Storage    | Firebase SDK                   | ^10.14.0       |
| Backend Runtime        | Firebase Cloud Functions v2    | ^6.x           |
| Backend Admin          | Firebase Admin SDK             | ^12.x          |
| AI / Embeddings        | Google Generative AI SDK       | ^0.21.0        |
| PDF Extraction         | pdf-parse                      | ^1.1.1         |
| Testing (Unit)         | Vitest + Testing Library       | ^2.1.8         |
| E2E Testing            | Playwright                     | ^1.x           |
| Linting                | ESLint + typescript-eslint     | ^8.57.0        |
| Formatting             | Prettier                       | ^3.2.5         |
| Git Hooks              | Husky + lint-staged            | ^9.x           |
| Versioning             | Changesets                     | ^2.27.1        |
| Dependency Sync        | Syncpack                       | ^13.0.0        |
| CI/CD                  | GitHub Actions + WIF           | —              |
| Hosting                | Firebase Hosting               | —              |
| Vector Search          | Firestore Native Vector Search | —              |

---

## 3. Monorepo Layout

```
lawbrain/
├── apps/
│   ├── web/                   # React + Vite frontend
│   ├── functions/             # Firebase Cloud Functions (tRPC backend + RAG)
│   └── ingestion/             # One-off script: chunk PDFs → embed → Firestore
│
├── packages/
│   ├── ui/                    # Shared shadcn/ui component library
│   ├── shared/                # Shared Zod schemas + TypeScript types
│   ├── config/                # Shared TS / ESLint / Tailwind config bases
│   ├── eslint-config/         # ESLint flat config
│   └── typescript-config/     # tsconfig bases
│
├── corpus/                    # Source PDFs (Zambian law documents)
├── docs/                      # Design docs, CI/CD guides
├── .github/                   # Workflows, PR templates
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

---

## 4. Complete Dependency Map

### 4.1 Root `package.json` (dev tooling only)

```json
{
  "devDependencies": {
    "@changesets/cli": "^2.27.1",
    "eslint": "^8.57.0",
    "husky": "^9.0.11",
    "lint-staged": "^15.2.2",
    "prettier": "^3.2.5",
    "syncpack": "^13.0.0",
    "turbo": "^2.7.5"
  }
}
```

---

### 4.2 `apps/web` — Frontend

**Add to `dependencies`:**

```json
{
  "dependencies": {
    "@repo/shared": "workspace:*",
    "@repo/ui": "workspace:*",
    "@repo/functions": "workspace:*",
    "@tanstack/react-query": "^5.62.0",
    "@trpc/client": "^11.0.0-rc.660",
    "@trpc/react-query": "^11.0.0-rc.660",
    "date-fns": "^3.6.0",
    "firebase": "^10.14.0",
    "lucide-react": "^0.468.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-hook-form": "^7.54.1",
    "react-markdown": "^9.0.1",
    "react-router-dom": "^6.28.0",
    "remark-gfm": "^4.0.0",
    "sonner": "^1.7.1",
    "@hookform/resolvers": "^3.9.1"
  }
}
```

**Add to `devDependencies`:**

```json
{
  "devDependencies": {
    "@repo/config": "workspace:*",
    "@repo/eslint-config": "workspace:*",
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.1.0",
    "@testing-library/user-event": "^14.5.2",
    "@types/react": "^18.3.14",
    "@types/react-dom": "^18.3.4",
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "eslint": "^8.57.0",
    "jsdom": "^25.0.1",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.15",
    "typescript": "5.5.4",
    "vite": "^5.1.4",
    "vitest": "^2.1.8",
    "@playwright/test": "^1.49.0"
  }
}
```

---

### 4.3 `apps/functions` — Firebase Cloud Functions (tRPC + RAG backend)

```json
{
  "dependencies": {
    "@repo/shared": "workspace:*",
    "@google/generative-ai": "^0.21.0",
    "@trpc/server": "^11.0.0-rc.660",
    "firebase-admin": "^12.7.0",
    "firebase-functions": "^6.1.0",
    "pdf-parse": "^1.1.1",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@repo/config": "workspace:*",
    "@repo/eslint-config": "workspace:*",
    "@types/pdf-parse": "^1.1.4",
    "eslint": "^8.57.0",
    "typescript": "5.5.4",
    "vitest": "^2.1.8"
  }
}
```

---

### 4.4 `apps/ingestion` — Document Ingestion Script (NEW)

> One-time / on-demand script that reads PDFs from `corpus/`, chunks them, generates embeddings via Gemini, and writes to Firestore.

```json
{
  "name": "@repo/ingestion",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "ingest": "tsx src/index.ts",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@repo/shared": "workspace:*",
    "@google/generative-ai": "^0.21.0",
    "dotenv": "^16.4.5",
    "firebase-admin": "^12.7.0",
    "glob": "^11.0.0",
    "pdf-parse": "^1.1.1"
  },
  "devDependencies": {
    "@repo/config": "workspace:*",
    "@repo/eslint-config": "workspace:*",
    "@types/pdf-parse": "^1.1.4",
    "tsx": "^4.19.2",
    "typescript": "5.5.4"
  }
}
```

---

### 4.5 `packages/shared` — Shared Schemas + Types

**Add to `dependencies`** (Zod already present — add new schemas only):

```json
{
  "dependencies": {
    "zod": "^3.23.8"
  }
}
```

New schemas to add under `packages/shared/src/schemas/`:

| File          | Purpose                                  |
| ------------- | ---------------------------------------- |
| `user.ts`     | User profile (already exists)            |
| `chat.ts`     | ChatSession, ChatMessage, MessageRole    |
| `document.ts` | DocumentChunk, DocumentMetadata          |
| `rag.ts`      | QueryInput, RAGResponse, SourceReference |

---

### 4.6 `packages/ui` — Shared Component Library

**shadcn/ui components to generate** (via `pnpm dlx shadcn@latest add`):

```
button        card          dialog        dropdown-menu
input         label         scroll-area   separator
skeleton      textarea      tooltip       avatar
badge         sheet         tabs          form
```

No new npm dependencies — shadcn/ui uses the Radix primitives and utilities already in the package (`class-variance-authority`, `clsx`, `tailwind-merge`). Each `shadcn add` command installs the specific `@radix-ui/react-*` it needs.

---

## 5. Architecture

```
Browser (React SPA)
    │
    │  HTTPS (tRPC over Firebase HTTPS Callable)
    ▼
Firebase Cloud Functions (Gen 2)
    ├── tRPC Router
    │     ├── auth.router      ← session management
    │     ├── chat.router      ← create session, send message, list sessions
    │     └── document.router  ← list documents, get chunk
    │
    └── RAG Pipeline (per chat.sendMessage call)
          1. Embed user query  → Gemini text-embedding-004
          2. Vector search     → Firestore findNearest()
          3. Build prompt      → top-k chunks as context
          4. Generate answer   → Gemini 1.5 Flash / Pro
          5. Return answer + source references
    │
    ▼
Firestore
    ├── /users/{uid}
    ├── /chatSessions/{sessionId}
    │     └── /messages/{messageId}
    └── /documentChunks/{chunkId}   ← embedding field + metadata
```

---

## 6. Firestore Data Model

### `/users/{uid}`

```ts
{
  uid: string
  email: string
  displayName: string | null
  photoURL: string | null
  createdAt: Timestamp
}
```

### `/chatSessions/{sessionId}`

```ts
{
  id: string
  userId: string
  title: string // auto-generated from first message
  createdAt: Timestamp
  updatedAt: Timestamp
  messageCount: number
}
```

### `/chatSessions/{sessionId}/messages/{messageId}`

```ts
{
  id: string
  role: 'user' | 'assistant'
  content: string
  sources: SourceReference[]   // only on assistant messages
  createdAt: Timestamp
}

type SourceReference = {
  chunkId: string
  documentTitle: string
  excerpt: string
  pageNumber: number | null
  score: number              // cosine similarity 0–1
}
```

### `/documentChunks/{chunkId}`

```ts
{
  id: string
  documentTitle: string
  documentType: 'constitution' | 'act' | 'regulation'
  pageNumber: number | null
  section: string | null
  content: string // raw text of the chunk
  embedding: VectorValue // 768-dim (text-embedding-004)
  charCount: number
  createdAt: Timestamp
}
```

**Vector index** (create via Firebase console or CLI):

```
Collection: documentChunks
Field: embedding
Dimension: 768
Distance: COSINE
```

---

## 7. tRPC API Design

### `chat.router`

```ts
chat.createSession() // → ChatSession
chat.listSessions() // → ChatSession[]
chat.getSession(sessionId) // → ChatSession
chat.deleteSession(sessionId) // → void
chat.sendMessage({ sessionId, text }) // → AssistantMessage (streaming TBD)
chat.listMessages(sessionId) // → ChatMessage[]
```

### `document.router`

```ts
document.list() // → DocumentMeta[]
document.getChunk(chunkId) // → DocumentChunk
```

### `auth.router`

```ts
auth.me() // → User (from Firebase token)
```

---

## 8. RAG Pipeline Detail

```
User query: "What does the constitution say about freedom of speech?"

Step 1 — Embed query
  POST Gemini text-embedding-004
  → float32[768]

Step 2 — Vector search (Firestore)
  db.collection('documentChunks')
    .findNearest('embedding', queryVector, { limit: 5, distanceMeasure: 'COSINE' })
  → top 5 chunks

Step 3 — Build prompt
  system: "You are LawBrain, a Zambian legal assistant..."
  context: [chunk1.content, chunk2.content, ...]
  user: "What does the constitution say about freedom of speech?"

Step 4 — Generate
  POST Gemini 1.5 Flash
  → { answer: string, model: string }

Step 5 — Return
  {
    content: answer,
    sources: chunks.map(c => ({ chunkId, documentTitle, excerpt, score }))
  }
```

**Chunking strategy** (ingestion script):

- Chunk size: ~500 tokens (~2000 characters)
- Overlap: ~50 tokens (~200 characters)
- Split on: paragraph breaks → sentence boundaries → hard limit

---

## 9. Environment Variables

```env
# apps/web (.env.local)
VITE_API_URL=http://localhost:5001/<project-id>/us-central1/api
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

# apps/functions (.env)
GOOGLE_GENAI_API_KEY=
FIREBASE_PROJECT_ID=

# apps/ingestion (.env)
GOOGLE_GENAI_API_KEY=
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json
FIREBASE_PROJECT_ID=
CORPUS_DIR=../../corpus
```

---

## 10. Frontend Layout

### 10.1 Routing Structure

```
/                        ← Landing page (public)
/login                   ← Sign in (public)
/signup                  ← Create account (public)
/chat                    ← New chat (protected)
/chat/:sessionId         ← Existing session (protected)
/documents               ← Document browser (protected)
/profile                 ← User settings (protected)
```

---

### 10.2 Page: Landing (`/`)

```
┌─────────────────────────────────────────────────────────────────┐
│  ⚖ LawBrain                              [Sign In]  [Get Started]│
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                        ⚖ LawBrain                              │
│              Your AI Legal Assistant for Zambian Law            │
│       Ask questions about the Constitution, Acts & Statutes     │
│                                                                 │
│   ┌─────────────────────────────────────────────┐  [Ask →]     │
│   │  Ask a legal question...                    │              │
│   └─────────────────────────────────────────────┘              │
│                                                                 │
│   Popular: "Freedom of speech"  "Land rights"  "Article 18"    │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                       How It Works                              │
│                                                                 │
│  [1. Ask]              [2. AI Searches]       [3. Get Answer]   │
│  Type your legal       LawBrain searches      Receive a clear   │
│  question in plain     the Zambian legal      answer with       │
│  English               corpus via vector      cited sources     │
│                        similarity             you can verify    │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                         Features                                │
│                                                                 │
│  📄 Cited Sources      🔍 Semantic Search     🔒 Secure         │
│  Every answer links    Understands meaning,   Firebase Auth,    │
│  back to the exact     not just keywords      personal history  │
│  legal text                                                     │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  © 2025 LawBrain · Hytel.io          [Privacy] [Terms] [GitHub] │
└─────────────────────────────────────────────────────────────────┘
```

---

### 10.3 Page: Auth (`/login`, `/signup`)

```
┌─────────────────────────────────────────────────────────────────┐
│  ⚖ LawBrain                                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│              ┌────────────────────────────────┐                 │
│              │        Welcome back             │                │
│              │   Sign in to continue to        │                │
│              │         LawBrain                │                │
│              │                                 │                │
│              │  ┌─────────────────────────┐    │                │
│              │  │  [G] Continue with Google│    │                │
│              │  └─────────────────────────┘    │                │
│              │                                 │                │
│              │  ──────────── or ────────────   │                │
│              │                                 │                │
│              │  Email                          │                │
│              │  ┌─────────────────────────┐    │                │
│              │  │ you@example.com         │    │                │
│              │  └─────────────────────────┘    │                │
│              │  Password                       │                │
│              │  ┌─────────────────────────┐    │                │
│              │  │ ••••••••                │    │                │
│              │  └─────────────────────────┘    │                │
│              │                                 │                │
│              │  [        Sign In        ]       │                │
│              │                                 │                │
│              │  Don't have an account? Sign up │                │
│              └────────────────────────────────┘                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### 10.4 Page: Chat (`/chat/:sessionId`) — Main App Shell

```
┌──────────────┬────────────────────────────────────┬────────────┐
│   SIDEBAR    │          CHAT AREA                  │  SOURCES   │
│  (260px)     │       (flex-1, min-w-0)             │  (320px)   │
│              │                                     │ [slide-in] │
│ ⚖ LawBrain  │ ┌─ Session: "Freedom of Speech" ──┐ │            │
│              │ │                         [⋮] [✕] │ │ Sources  3 │
│ [+ New Chat] │ └────────────────────────────────┘ │            │
│              │                                     │ ┌────────┐ │
│ ──────────── │  ┌────────────────────────────────┐ │ │ 📄 Vol │ │
│ Today        │  │ 🤖  Welcome to LawBrain! Ask   │ │ │ 1, §18 │ │
│              │  │     me anything about Zambian   │ │ │        │ │
│ • Freedom... │  │     law and I'll answer with    │ │ │"Every  │ │
│ • Land right │  │     citations from official     │ │ │person  │ │
│              │  │     documents.                  │ │ │has the │ │
│ Yesterday    │  └────────────────────────────────┘ │ │right..."│ │
│              │                                     │ │        │ │
│ • Article 65 │  ┌────────────────────────────────┐ │ │[View ↗]│ │
│ • Dual citiz │  │                      👤 You     │ │ └────────┘ │
│              │  │  What does the constitution say │ │            │
│ ──────────── │  │  about freedom of speech?       │ │ ┌────────┐ │
│              │  └────────────────────────────────┘ │ │ 📄 Bill │ │
│              │                                     │ │ of Righ│ │
│              │  ┌────────────────────────────────┐ │ │ §20    │ │
│              │  │ 🤖                              │ │ │        │ │
│              │  │  Article 20 of the Constitution │ │ │"...free│ │
│              │  │  of Zambia guarantees freedom   │ │ │dom of  │ │
│              │  │  of expression...               │ │ │express.│ │
│              │  │                                 │ │ │        │ │
│              │  │  > "Every person has the right  │ │ │[View ↗]│ │
│              │  │  > to freedom of expression..." │ │ └────────┘ │
│              │  │                                 │ │            │
│              │  │  Sources: [1] [2] [3]   📋 🔊  │ │ ┌────────┐ │
│              │  └────────────────────────────────┘ │ │ 📄 ...  │ │
│              │                                     │ └────────┘ │
│              │  ┌────────────────────────────────┐ │            │
│              │  │ Ask a follow-up question...     │ │            │
│              │  │                                 │ │            │
│              │  │ Shift+Enter new line    [Send→] │ │            │
│              │  └────────────────────────────────┘ │            │
│              │                                     │            │
│ ──────────── │                                     │            │
│ 👤 User Name │                                     │            │
│ [Sign Out]   │                                     │            │
└──────────────┴────────────────────────────────────┴────────────┘
```

**Responsive behaviour:**

- `lg+` (≥1024px): All three columns visible
- `md` (768–1023px): Sidebar collapses to icon rail; sources panel hidden, toggleable
- `sm` (< 768px): Single column; sidebar in drawer (Sheet); sources in bottom sheet

---

### 10.5 Page: Document Browser (`/documents`)

```
┌──────────────┬────────────────────────────────────────────────┐
│   SIDEBAR    │  DOCUMENT BROWSER                              │
│  (same as    │                                                │
│   chat)      │  Legal Document Corpus                         │
│              │  Browse the Zambian legal documents powering   │
│              │  LawBrain's answers.                           │
│              │                                                │
│              │  ┌──────────────────────────┐  [Filter ▾]     │
│              │  │ 🔍 Search documents...   │                 │
│              │  └──────────────────────────┘                 │
│              │                                                │
│              │  All  Constitution  Acts  Regulations          │
│              │  ────────────────────────────────────         │
│              │                                                │
│              │  ┌──────────────┐  ┌──────────────┐           │
│              │  │ 📜           │  │ 📜           │           │
│              │  │ Constitution │  │ Laws of      │           │
│              │  │ of Zambia    │  │ Zambia Vol.1 │           │
│              │  │              │  │              │           │
│              │  │ Constitution │  │ Act          │           │
│              │  │ 847 chunks   │  │ 1,203 chunks │           │
│              │  │              │  │              │           │
│              │  │[Ask about ↗] │  │[Ask about ↗] │           │
│              │  └──────────────┘  └──────────────┘           │
│              │                                                │
│              │  ┌──────────────┐  ┌──────────────┐           │
│              │  │ 📜           │  │ + Add Doc    │           │
│              │  │ Diplomacy &  │  │ (admin only) │           │
│              │  │ Intl Studies │  │              │           │
│              │  │ Act          │  │              │           │
│              │  │ 312 chunks   │  │              │           │
│              │  │              │  │              │           │
│              │  │[Ask about ↗] │  │              │           │
│              │  └──────────────┘  └──────────────┘           │
└──────────────┴────────────────────────────────────────────────┘
```

---

### 10.6 Component Tree

```
App
├── Router (react-router-dom)
│   ├── PublicLayout
│   │   ├── Topbar (logo, nav, auth buttons)
│   │   ├── LandingPage  /
│   │   ├── LoginPage    /login
│   │   └── SignupPage   /signup
│   │
│   └── ProtectedLayout  (requires Firebase auth)
│       ├── AppShell
│       │   ├── Sidebar
│       │   │   ├── NewChatButton
│       │   │   ├── SessionList
│       │   │   │   └── SessionItem (title, date, delete)
│       │   │   └── UserMenu (avatar, name, sign out)
│       │   │
│       │   └── <Outlet />
│       │
│       ├── ChatPage     /chat  /chat/:sessionId
│       │   ├── ChatHeader (title, actions)
│       │   ├── MessageList (scroll area)
│       │   │   ├── UserMessage
│       │   │   └── AssistantMessage
│       │   │       ├── MarkdownRenderer
│       │   │       ├── SourceBadges [1][2][3]
│       │   │       └── MessageActions (copy, feedback)
│       │   ├── ChatInput (textarea + send button)
│       │   └── SourcesPanel (slide-in)
│       │       └── SourceCard[]
│       │           ├── DocumentTitle
│       │           ├── Excerpt
│       │           └── PageReference
│       │
│       ├── DocumentsPage  /documents
│       │   ├── DocumentSearch
│       │   ├── DocumentFilter (tabs)
│       │   └── DocumentGrid
│       │       └── DocumentCard[]
│       │
│       └── ProfilePage  /profile
│           ├── UserInfo
│           └── DangerZone (delete account)
```

---

### 10.7 Color Palette & Design Tokens

```
Brand
  --brand-primary:   #1e40af   (blue-800)  — primary actions, links
  --brand-accent:    #f59e0b   (amber-500) — highlights, scale-of-justice icon

Neutrals (Tailwind slate)
  --bg-base:         #0f172a   (slate-900) — dark mode app background
  --bg-surface:      #1e293b   (slate-800) — cards, sidebar
  --bg-elevated:     #334155   (slate-700) — input, hover states
  --text-primary:    #f1f5f9   (slate-100)
  --text-secondary:  #94a3b8   (slate-400)

Semantic
  --user-bubble:     #1e3a5f               — user message background
  --ai-bubble:       #1e293b   (slate-800) — AI message background
  --source-badge:    #92400e   (amber-800) — source citation badge

Mode: dark-first, with light mode via Tailwind `dark:` variants
```

---

## 11. CI/CD Pipeline

Unchanged from the existing setup (see `docs/ci-cd/`). Key addition:

- `ingestion` package is excluded from the deploy pipeline — it runs manually via:
  ```bash
  pnpm --filter @repo/ingestion run ingest
  ```

---

## 12. Open Questions / Risks

| #   | Question                                        | Owner    | Status |
| --- | ----------------------------------------------- | -------- | ------ |
| 1   | Streaming responses (SSE vs full response)?     | Backend  | Open   |
| 2   | Firestore Vector Search billing at scale?       | Infra    | Open   |
| 3   | Gemini Flash vs Pro — quality vs cost tradeoff? | AI       | Open   |
| 4   | Rate limiting per user on chat.sendMessage?     | Backend  | Open   |
| 5   | WCAG 2.1 AA audit before launch?                | Frontend | Open   |
| 6   | Admin role for adding new corpus documents?     | Product  | Open   |

---

## 13. Installation & Bootstrap

```bash
# 1. Install dependencies
pnpm install

# 2. Copy env files
cp .env.example apps/web/.env.local
cp .env.example apps/functions/.env
cp .env.example apps/ingestion/.env

# 3. Add shadcn/ui components to packages/ui
pnpm --filter @repo/ui dlx shadcn@latest init
pnpm --filter @repo/ui dlx shadcn@latest add button card dialog \
  dropdown-menu input label scroll-area separator skeleton \
  textarea tooltip avatar badge sheet tabs form

# 4. Ingest corpus documents (one-time)
pnpm --filter @repo/ingestion run ingest

# 5. Start dev servers
pnpm dev
```

---

_Last updated: 2026-02-18 — LawBrain v0.1.0 design draft_
