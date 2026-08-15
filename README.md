# TextMate (Frontend)

https://github.com/user-attachments/assets/ec0416b2-a3dc-48df-8ec5-554d0f59f391

TextMate is a modern web application for advanced text editing, AI-assisted text transformation, and document validation. Built with Nuxt 4 and TypeScript, it provides a rich set of tools to enhance writing quality, simplify text, and validate against organizational standards.

This repository contains the frontend application; the backend is built with Python FastAPI and available at [https://github.com/DCC-BS/text-mate-backend](https://github.com/DCC-BS/text-mate-backend).

![GitHub License](https://img.shields.io/github/license/DCC-BS/text-mate-frontend) [![Checked with Biome](https://img.shields.io/badge/Checked_with-Biome-60a5fa?style=flat&logo=biome)](https://biomejs.dev)

---

<p align="center">
  <a href="https://dcc-bs.github.io/documentation/">DCC Documentation & Guidelines</a> | <a href="https://www.bs.ch/daten/databs/dcc">DCC Website</a>
</p>

---

## Features

### Core Capabilities

- **Ribbon Interface**: Intuitive ribbon toolbar with dedicated tabs for text transformation and document validation.
- **Text Rewriting**: Alternative phrasings with customizable writing styles (Simple, Professional, Casual, Academic, Technical), target audiences, and goals.
- **Simplify / Plain Language**: AI-assisted simplification of complex sentences and long words (Einfache Sprache) with interactive range navigation.
- **Document Advisor**: Validates text against selected reference documents and guidelines, with side-by-side PDF preview and inline fix suggestions.
- **Interactive Diff Review**: Side-by-side diff preview to review, accept, or reject generated changes before applying them.
- **Word Synonyms & Sentence Alternatives**: Inline context-aware synonym and phrasing suggestions directly within the editor.
- **Text Statistics & Readability**: Real-time word and character counting (with Swiss apostrophe formatting, e.g. `100'000`), syllable counts, average sentence length, Flesch score, and CEFR language level visualization.
- **User Dictionary & Custom Actions**: Personal dictionary for specialized vocabulary and custom prompt-driven actions.
- **Document Import & Export**: File upload (.docx, .txt) and direct export to Microsoft Word (.docx).
- **Multilingual Support**: Full German (`de-CH`) and English interface, with multi-language detection.

### Quick Actions & Transformations

Specialized AI-powered text transformations available in the ribbon:

- **Summarize**: Generate concise summaries of long texts
- **Bullet Points**: Convert paragraphs into structured bullet points
- **Shorten**: Condense content while preserving core message
- **Formality**: Adjust formality (formal / informal)
- **Medium Length**: Adapt text for medium-length output
- **Social Media**: Optimize content for social media channels
- **Proofread**: Check and correct grammar, spelling, and style
- **Character Speech**: Adapt text to character voices and dialogue patterns
- **Custom Actions**: Run personalized custom text transformations

---

## Technology Stack

- **Framework**: [Nuxt 4](https://nuxt.com/) (Vue 3 Composition API with `<script setup lang="ts">`)
- **UI & Styling**: [Nuxt UI v4](https://ui.nuxt.com/) & [Tailwind CSS v4](https://tailwindcss.com/)
- **Icons**: [Lucide Icons](https://lucide.dev/) via `@iconify-json/lucide`
- **Rich Text Editor**: [Tiptap v3](https://tiptap.dev/)
- **State Management**: [Pinia](https://pinia.vuejs.org/)
- **Environment & Secrets**: [Varlock](https://varlock.dev/) with Proton Pass plugin
- **Package Manager**: [Bun](https://bun.sh/)
- **Tool Version Manager**: [Mise](https://mise.jdx.dev/)
- **Linter & Formatter**: [Biome](https://biomejs.dev/)
- **Testing**: [Vitest](https://vitest.dev/) (Unit) & [Playwright](https://playwright.dev/) (E2E)

---

## Setup

### Prerequisites

We recommend using [mise](https://mise.jdx.dev/) to automatically manage tool versions (Bun, Node.js, Varlock, pass-cli):

```bash
mise install
```

### Environment Configuration

Create a `.env` file in the project root with the basic environment mode:

```bash
APP_MODE=dev      # dev, ci, build, prod
AUTH_MODE=none    # none or azure
```

#### Environment Variables

Environment variables are validated using Varlock schemas (`.env.schema`, `.env.runtime.schema`, `.env.buildtime.schema`, `.env.azure.schema`):

| Variable | Description | Default | Type |
|----------|-------------|---------|------|
| **Core Configuration** |
| `APP_MODE` | Application runtime mode (`dev`, `ci`, `build`, `prod`) | `dev` | enum |
| `AUTH_MODE` | Authentication mode (`none`, `azure`) | `none` | enum |
| `USE_FEEDBACK` | Enable feedback widget | `true` (non-CI) | boolean |
| `DUMMY` | Enable mock API mode (no backend required) | `false` | boolean |
| **Backend & Services** |
| `API_PORT` | Backend API port | `8000` | port |
| `NUXT_API_URL` | Backend API URL | `http://localhost:8000` (dev) | URL |
| `NUXT_FEEDBACK_GITHUB_TOKEN` | GitHub token for feedback reporting | Proton Pass (dev) | string (sensitive) |
| `NUXT_PUBLIC_LOGGER_LOG_LEVEL` | Client log level | `debug` (dev), `info` (prod) | enum |
| `LOG_LEVEL` | Server log level | `debug` (dev), `info` (prod) | enum |
| **UI & Onboarding Flags** |
| `DISABLE_ONBOARDING` | Disable onboarding tour (e.g. in tests) | `false` | boolean |
| `NUXT_PUBLIC_COMMON_UI_DISABLE_CHANGELOG` | Disable changelog modal | `false` | boolean |
| `NUXT_PUBLIC_COMMON_UI_DISABLE_DISCLAIMER` | Disable disclaimer banner | `false` | boolean |
| `NUXT_PUBLIC_COMMON_UI_DISABLE_ONBOARDING` | Disable onboarding popup | `false` | boolean |
| `NUXT_PUBLIC_COMMON_UI_DISABLE_SYSTEM_STATUS` | Disable backend health indicator | `false` | boolean |
| `NUXT_PUBLIC_APP_CONFIG_APP_LIST_URL_TEMPLATE` | App switcher template URL | `http://{APP_NAME}.localhost.ch` | string |

#### Azure AD Configuration (When `AUTH_MODE=azure`)

| Variable | Description | Default | Type |
|----------|-------------|---------|------|
| `NUXT_AZURE_AUTH_SECRET` | Session encryption secret (`openssl rand -base64 32`) | - | string (sensitive, required) |
| `NUXT_AZURE_AUTH_CLIENT_ID` | Azure AD client ID | Proton Pass (dev) | UUID |
| `NUXT_AZURE_AUTH_TENANT_ID` | Azure AD tenant ID | Proton Pass (dev) | UUID |
| `NUXT_AZURE_AUTH_CLIENT_SECRET` | Azure AD client secret | Proton Pass (dev) | string (sensitive) |
| `NUXT_AZURE_AUTH_API_CLIENT_ID` | Azure AD API client ID | Proton Pass (dev) | UUID |
| `NUXT_AZURE_AUTH_ORIGIN` | Auth callback origin URL | `http://localhost:3000/api/auth` | URL |

### Varlock & Secrets Management

We use [varlock](https://varlock.dev/) for schema-based validation and optional secret retrieval from Proton Pass:

```bash
# Validate and load secrets into the environment
mise run env
```

---

## Development

Start the development server at `http://localhost:3000`:

```bash
# Using mise
mise run dev

# Or using bun directly
bun run dev
```

### Development with Inspector

```bash
mise run debug
```

### Dummy Mode (Offline / Mock Data)

Run the frontend with mocked backend responses (no Python backend or LLM required):

```bash
mise run dummy
```

### Automation / CI Mode

Start the dev server with popups (changelog, disclaimer, onboarding) disabled:

```bash
mise run automation
```

---

## Backend & Docker Services

For full functionality with AI models and backend API, the backend services can be run via Docker:

### Start Backend Services Only

```bash
mise run docker:up
```

### Stop Backend Services

```bash
mise run docker:down
```

### Full Stack Compose

To run all services (frontend, backend, vLLM, and Nginx reverse proxy):

```bash
cd docker
varlock run -- docker compose up
```

---

## Project Architecture

```
app/
├── assets/
│   ├── css/                # Main Tailwind CSS styles
│   └── models/             # TypeScript models & command bus definitions
├── components/             # Vue components (PascalCase)
│   ├── advisor/            # Document advisor & PDF preview
│   ├── diff/               # Diff review & comparison
│   ├── editor/             # Tiptap text editor & toolbar
│   ├── rewrite/            # Text rewrite & custom action forms
│   ├── ribbon/             # Ribbon bar navigation & action tabs
│   ├── simplify/           # Plain language / simplify UI
│   └── tool-panel/         # Text stats, readability & dictionary
├── composables/            # Reactive Vue composables (useXxx)
├── pages/                  # Route pages (kebab-case)
├── services/               # API & business logic services
└── utils/                  # Framework-agnostic utilities
server/
├── api/                    # Nitro API endpoints (kebab-case)
└── plugins/                # Server plugins
shared/
└── types/                  # Shared TypeScript types (client & server)
tests/
├── assets/                 # Vitest unit tests (*.test.ts)
└── e2e/                    # Playwright E2E tests (*.spec.ts)
```

---

## Testing & Quality Assurance

### Unit Tests (Vitest)

```bash
# Run all unit tests
mise run test

# Run tests in watch mode
mise run test:watch

# Run with coverage report
mise run test:coverage

# Run a single test file
bun test -- tests/assets/utils/formatNumber.test.ts
```

### Type Checking & Linting

```bash
# TypeScript strict type check
mise run tsc

# Biome code formatting
mise run lint

# Biome check & autofix
mise run check
```

### End-to-End Tests (Playwright)

```bash
# Run all E2E tests
mise run test:e2e

# Run with Playwright interactive UI
mise run test:e2e:ui

# Generate tests via Playwright codegen
mise run e2e:codegen
```

---

## Production Build & Deployment

### Build & Preview

```bash
# Build production bundle
mise run build

# Preview production build locally
mise run preview
```

### Docker Deployment

Build and run using the multi-stage Dockerfile:

```bash
# Build Docker image
docker build -t text-mate-frontend .

# Run container
docker run -p 3000:3000 text-mate-frontend
```

---

## Dependency Overrides

We maintain strict, minimal overrides in `package.json` exclusively for **Framework Singletons**:
- `vue` (`3.5.41`), `reka-ui` (`2.10.1`), `@vueuse/core` (`^14.4.0`), `prosemirror-model` (`1.25.11`), `prosemirror-view` (`1.42.2`): Deduplicates runtime instances across transitive dependencies (such as `vaul-vue` and Tiptap plugins) to prevent dual-instance SSR hydration crashes and broken editor `instanceof` selections.

---

## Acknowledgements & Credits

Special thanks to the following open-source projects and initiatives that inspired and contributed to TextMate:

- **[machinelearningZH / simply-simplify-language](https://github.com/machinelearningZH/simply-simplify-language)**: The foundational idea for AI-assisted text simplification stems from machinelearningZH's work.
- **[blokkli / editor](https://github.com/blokkli/editor)** (MIT License): Built upon the simplification concept, integrated Lunaris formulation for multilingual readability metrics, and introduced the agentic pipeline approach that inspired our own text simplification pipeline.
- **[@lunarisapp/readability & @lunarisapp/language](https://github.com/LunarisApp/text-tools)** (MIT License): Used for calculating readability scores for English (EN), Italian (IT), and French (FR).
- **[zix (Zurich Understandability Index)](https://github.com/machinelearningZH/zix_understandability-index)** (MIT License): Used to calculate German (DE) readability scores.

---

## License

[MIT](LICENSE) © Data Competence Center Basel-Stadt

<a href="https://www.bs.ch/schwerpunkte/daten/databs/schwerpunkte/datenwissenschaften-und-ki"><img src="https://github.com/DCC-BS/.github/blob/main/_imgs/databs_log.png?raw=true" alt="DCC Logo" width="200" /></a>

Datenwissenschaften und KI <br>
Developed with ❤️ by DCC - Data Competence Center

