<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project Rules
- **Documentation:** Always update `README.md` when implementing significant features, large changes, or new architectural decisions.
- **Git Commits:** Always use Conventional Commits (semantic commits) when committing code (e.g., `feat:`, `fix:`, `refactor:`, `docs:`, `style:`). Ensure all commits reflect the context of the changes precisely.

## ⚠️ MANDATORY BEFORE ANY DEVELOPMENT

Before writing or modifying any code in this project, you MUST read the full front-end engineering guide:

**[`FRONTEND_GUIDE.md`](./FRONTEND_GUIDE.md)**

This guide contains:
- The complete design system (CSS variables, classes, typography)
- Required component architecture patterns (Server vs Client)
- Rules for styling, responsiveness, and accessibility
- Server Action patterns
- Anti-patterns that are strictly forbidden
- The versioning process and changelog update rules

Skipping this step will result in low-quality, inconsistent code that will require refactoring.
