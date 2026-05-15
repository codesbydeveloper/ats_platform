# ATS Teachers — frontend workspace

Premium **frontend-only** teacher management dashboard (ATS / HRMS style) built with **Next.js App Router**, **TypeScript**, **Tailwind CSS v4**, **shadcn/ui**, **Zustand** (with `localStorage` persistence), **TanStack Table**, **React Hook Form + Zod**, **Framer Motion**, **Recharts**, **XLSX**, and **Sonner**.

There is **no backend**, **no database**, and **no API** — all data is mock + browser storage.

## Requirements

- Node.js 20+
- npm 10+

## Setup

```bash
npm install
```

## Scripts

| Command         | Description                 |
|----------------|-----------------------------|
| `npm run dev`  | Start the dev server        |
| `npm run build`| Production build + typecheck|
| `npm run start`| Run the production server |
| `npm run lint` | ESLint (Next.js config)     |

## Routes

| Path          | Description                                      |
|---------------|--------------------------------------------------|
| `/`           | Redirects to `/login` or `/dashboard` (session)  |
| `/login`      | Split-screen demo auth (any email, password ≥ 6) |
| `/dashboard`  | Analytics + activity + charts                    |
| `/teachers`   | Main roster: table, filters, import/export, forms |
| `/settings`   | Profile + theme + notifications + appearance     |

## Project layout (`src/`)

- `src/app` — App Router pages and global styles
- `src/components` — UI primitives (`components/ui`), layout, dashboard, teachers, shared widgets
- `src/store` — `authStore`, `teacherStore`, `filterStore`, `uiStore` (Zustand + persist)
- `src/data` — mock generator + shared constants
- `src/types` — shared TypeScript models
- `src/utils` — filtering, export, import parsing, IDs
- `src/lib` — `cn()` helper and Zod schemas

## Notes

- **Do not** recreate a root-level `app/` directory: this project uses **`src/app` only**. A stray root `app/` folder would override routes.
- Auth and roster data persist under keys prefixed with `ats-` in `localStorage`.
- Clear site data in the browser to reset the demo.

## Tech stack

Next.js 16, React 19, Tailwind CSS 4, Radix UI primitives (shadcn-style), Zustand, TanStack Table, React Hook Form, Zod, Framer Motion, Lucide, Recharts, SheetJS (`xlsx`), Sonner, `next-themes`.
