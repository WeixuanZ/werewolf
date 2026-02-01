## 2024-05-22 - Code Splitting Routes with TanStack Router
**Learning:** Large route components (like `GameRoom`) bundled in `App.tsx` significantly increase initial bundle size (~1MB -> ~770kB). Code splitting manually with `React.lazy` and `Suspense` works effectively even with manual route definitions in TanStack Router.
**Action:** Always check `App.tsx` route definitions for static imports of large page components and convert them to lazy imports.
