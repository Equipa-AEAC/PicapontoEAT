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

## Language and translation

The interface ships in **Portuguese and English**. Portuguese is the default and
the reference language — this is a product for one Portuguese school — and
English is both the second language and the fallback.

Everything lives under `src/i18n/`:

| Path | What it holds |
| --- | --- |
| `index.ts` | The vue-i18n instance, `SUPPORTED_LOCALES`, `setLocale`, and the `t` used outside templates. |
| `vocabulary.ts` | Every enum → label helper (`taskStatusLabel`, `deviceStatusLabel`, …) and its `…Options()` counterpart. |
| `locales/en/`, `locales/pt/` | The messages, split by domain into files that mirror each other line for line. |

Domains: `common`, `nav`, `shell`, `auth`, `projects`, `projectsAdmin` (merged in
as `projects.admin`), `student`, `admin`, `components`, `vocabulary`, `errors`.
`common` is the vocabulary that has to stay identical everywhere — verbs on
buttons, generic states, field names. A string used on one screen goes in that
screen's domain instead; `common` is not a dumping ground.

### Reading a string

- **Templates**: `$t("admin.devices.queue")`. `globalInjection` is on, so no
  component needs `useI18n()` or any other setup.
- **Scripts, stores, services, composables**: `import { t } from "@/i18n"` — it is
  bound to the global composer, so it works outside a component's `setup`.
- **Enum values**: never `$t` directly. Go through `src/i18n/vocabulary.ts`, which
  owns the mapping from a stored value to a label in one place.

### Adding a string

1. Put it in the domain that owns the screen, in **both** `en/` and `pt/`.
2. Reference it by key. Interpolate with named placeholders (`"{count} left"`),
   never by concatenating translated fragments — word order differs between
   languages and a sentence assembled from pieces cannot be translated.
3. For a count, write both forms separated by `|` and pass the number as the
   third argument: `t("admin.moments.momentCount", { count: n }, n)`.

Adding a **third** language means adding one directory under `locales/` and one
row in `SUPPORTED_LOCALES`. No component changes.

### Rules that are not obvious

- **Labels are functions, never constants.** `export const TASK_STATUS_LABELS =
  { … }` evaluates once at import and freezes whichever language was active then.
  Every label map in `vocabulary.ts` is a function, and every options list a
  `computed`, so switching language re-renders instead of requiring a reload.
- **Stored and derived data carries keys, not text.** `DashboardMetric.labelKey`,
  `DashboardActivity.titleKey`, `ProjectActivityEvent.messageKey` +
  `messageParams`, `CertificateEligibility.reasonKey`. These are produced by a
  service and held in a store; a resolved string would be stuck in the language
  that was active when the store last fetched.
  **The key must carry raw values, not a label already applied to them.**
  `DashboardActivity`'s audit rows followed the letter of this rule and broke
  it anyway: `titleParams` held `{ entity: auditEntityLabel(entity), action:
  auditActionLabel(action) }` — the *params* were pre-translated at fetch time,
  so the row's wording stayed frozen in whichever language was active when the
  dashboard last loaded, even though `titleKey` itself re-resolved correctly on
  every render. `titleParams` for an audit row now holds the raw `entity`/
  `action` strings; `AdminDashboardPage.vue` calls `auditEntityLabel`/
  `auditActionLabel` inside the template function that builds the interpolation
  object, so the lookup runs on every render, not once at fetch time. The same
  fix applies to `descriptionKey`/`descriptionParams` (daily-log rows) and
  `messageKey`/`messageParams`/`messageSummary`/`actorName` (project-event
  rows, resolved through `formatActivity` at render time) — `description` on
  `DashboardActivity` is now used only for the audit log's own stored text.
- **`@` is vue-i18n's linked-message syntax.** A literal one must be escaped as
  `{'@'}` or the message fails to compile — which blanks the screen rather than
  showing the wrong text. The two placeholders containing an email address are
  the only messages in the product that need it.
- **`|` separates plural forms**, so a message that wants a literal pipe cannot
  have one.
- Inside a `:attr="…"` binding, nested `$t` calls need single quotes.
- **A backtick template literal is the last place an English sentence hides.**
  `` `${member.fullName} (holds ${uid})` `` reads as an expression to every
  grep and as English to a reader. Interpolate through a message with named
  placeholders instead.

### What is deliberately not translated

Three separate categories, and it matters which is which:

**Portuguese terms kept in the English interface.** These name Portuguese school
and legal artefacts. Translating them would leave a reader unable to match what
is on screen to the document in their hand:

`FCT` · `Estágio` · `Relatório de Estágio` · `Orientador de Estágio` ·
`Monitor de Estágio` · `Equipa Técnica` · `Pica Ponto` (the product name).

**English terms kept in the Portuguese interface.** These are the words the
people running the terminals actually use; the Portuguese equivalents would be
translations nobody says:

`RFID` · `UID` · `firmware` · `heartbeat` · `OTA` · `stable` / `beta` / `edge`
(firmware channels) · `Kanban` · `Excel` · `PDF` · `CSV` · `Email` (which is also
the Portuguese word) · `IP`.

**Text that is data, not interface.** Stored strings written by a person or by a
past release. These are shown exactly as recorded, in either language, because
rewriting them would misreport a record:

- Audit-log `description` — an audit trail records what happened in the words it
  happened in. The *entity* and *action* columns beside it are vocabulary and
  **are** translated (`auditEntityLabel`, `auditActionLabel`).
- Correction reasons, review notes, journal entries, announcement bodies,
  project and task titles, participation-period notes.
- Actor names written into records at the time of writing (`"Administrator"`,
  `"Member"`, `"System"`) — these are stored values, not labels. When the API
  starts issuing a real identity they become names and the question disappears.
- Timezone identifiers (`Europe/Lisbon`).

### Choosing the Portuguese

European Portuguese, and the word the reader would use rather than the literal
translation of the English:

| English | Portuguese | Not |
| --- | --- | --- |
| Member | Membro | Utilizador |
| Attendance | Assiduidade | Presença |
| Card | Cartão | Passe |
| Device / terminal | Dispositivo / terminal | Aparelho |
| Deadline | Prazo | Data-limite (used only as a field label) |
| Overdue | Em atraso | Vencido |
| Draft | Rascunho | Esboço |
| Review | Analisar / Análise | Rever |
| Role (account) | Perfil | Papel |
| Sign in | Iniciar sessão | Entrar |
| Password | Palavra-passe | Senha |
| Phone | Telemóvel | Telefone |

A form's second person is **você-implicit** ("Escolha um dia", "Verá o
resultado"), never `tu` — the interface addresses staff and students alike.
