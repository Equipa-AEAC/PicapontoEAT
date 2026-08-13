# Frontend Rules

Use:

- Vue 3
- Composition API
- script setup
- TypeScript strict

Never:

- Use Options API
- Put business logic inside components
- Access SQLite directly
- Add a UI component library dependency (PrimeVue was removed — build on the native `src/components/base` set instead)

Use:

Modules

Shared Components

Composable Functions

Services

Pinia

## UI Component Library

There is no third-party component library. All buttons, inputs, selects, dialogs, tables, menus and charts come from `src/components/base/` (re-exported through `src/shared/components/base`). When a page needs a new form control or layout primitive, extend that library rather than pulling in an external one.
