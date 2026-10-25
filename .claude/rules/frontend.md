---
paths:
  - "gyra/frontend/**"
---

# Web (Next.js) rules

- App Router. Default to Server Components; add `"use client"` only for interactivity.
- Route groups: `(auth)` for signed-out pages, `(app)` for the signed-in shell. The `(app)` layout checks the session server-side; navigation varies by role.
- UI hiding is convenience only — the API is the security boundary. Never trust role info from the client.
- Data fetching goes through a typed API client built on the shared Zod schemas; no raw `fetch` calls to the API scattered in components. Server Components call it directly (forwarding the session cookie); client components use TanStack Query.
- Lists use the shared data-table component (shadcn + TanStack Table); don't build one-off tables.
- Forms: react-hook-form + Zod resolver using the same schema the API validates with.
- Use shadcn/ui components and Tailwind tokens; don't hand-roll primitives that shadcn provides.
- Responsive for desktop and mobile browsers (MoU: no native apps). Support latest Chrome, Edge, Safari, Firefox.
- Accessibility: labelled inputs, keyboard navigation, visible focus, sufficient contrast.
- Tables over large datasets use server-side pagination, sorting, and filtering.
- Dates are rendered in the viewer's timezone from UTC values.
- Never put secrets in `NEXT_PUBLIC_*` variables.
