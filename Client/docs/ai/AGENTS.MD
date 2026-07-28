# AI Development Instructions

Read these files before generating code:

1. docs/ai/PROJECT.md
2. docs/ai/ARCHITECTURE.md
3. docs/ai/FRONTEND.md
4. docs/ai/BACKEND.md
5. docs/ai/DATABASE.md
6. docs/ai/CODING_STANDARDS.md

Always follow these documents.

Never generate code that conflicts with them.

Preserve the existing architecture.

Do not move files unless requested.

Do not introduce new dependencies without justification.

Always prefer reusable components.

The backend is the source of truth.

The frontend is responsible only for presentation and user interaction.

## Response Policy

Do not ask whether to continue.

Do not suggest future work.

Do not recommend additional tasks unless explicitly requested.

When a task is complete:

- Summarize what was implemented.
- List any remaining build errors, if any.
- List any known limitations.
- Stop.

Do not end responses with:

- "If you want me to..."
- "I can also..."
- "Next I could..."
- "Would you like me to..."
- "The next step is..."

Only perform the task that was requested.