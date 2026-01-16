# Agent Guidelines for TextMate Frontend

## Essential Commands

### Development
- `bun run dev` - Start development server (http://localhost:3000)
- `bun run debug` - Start with inspector for debugging
- `bun run build` - Production build
- `bun run tsc` - TypeScript type checking (strict mode enabled)

### Linting & Formatting
- `bun run lint` - Format code with Biome
- `bun run check` - Check and fix linting issues

### Testing
- `bun run test` - Run all Vitest unit tests
- `bun run test:watch` - Run tests in watch mode
- `bun run test:coverage` - Generate coverage report
- `bun run test -- path/to/test.test.ts` - Run single test file
- `bun run test:e2e` - Run Playwright E2E tests
- `bun run test:e2e:ui` - Run E2E tests with UI

### Docker
- `bun run docker:up` - Start dev containers
- `bun run docker:down` - Stop dev containers

## Code Style Guidelines

### Naming Conventions
- **Pages**: kebab-case (e.g., `user-profile.vue`)
- **Components**: PascalCase (e.g., `UserProfileCard.vue`)
- **Other TS files**: camelCase (e.g., `formatDate.ts`, `userService.ts`)
- **Server API files**: kebab-case (e.g., `user-profile.get.ts`)

### Vue & TypeScript
- **Use Composition API exclusively** with `<script setup lang="ts">`
- **Function declarations only** (not arrow functions):
  ```ts
  function increment() { count.value++ }
  ```
- **Never use `any`** - use specific types, `unknown`, or `never`
- **Use `unknown` with validation** when type is uncertain:
  ```ts
  catch (error: unknown) {
    if (error instanceof Error) console.error(error.message);
  }
  ```
- **Use `never`** for unreachable code paths
- **Prefer narrow, precise types** over broad ones
- **Define reusable types** in `/types` folder
- **Use non-null refs**: `const name = ref('')` (not `ref(null)`)
- **Prefer `undefined` over `null`**
- **Explicit types** for function parameters and return types
- **Async/await** over promise chains
- **Always use semicolons**
- **Add comments** to all code

### Composables
- **Name composables starting with `use`** (e.g., `useCounter`, `useUser`)
- **Each composable** should expose a main `use*` function
- **Place Vue-reactive composables** in `/composables`
- **Non-Vue logic** goes in `/utils` or `/services` instead

### Utilities & Services
- **Framework-agnostic functions** go in `/utils`
- **API/business logic** goes in `/services`
- **Keep concerns separated** by folder

### Formatting (Biome)
- **4 space indentation**
- **Double quotes** for strings
- Self-closing elements where possible
- Organize imports automatically enabled
- **Always run `bun run check`** before committing

### Project Structure
```
app/
 ├─ assets/          - Models, services, queries
 ├─ components/      - Vue components (PascalCase)
 ├─ composables/     - Vue composition functions (useXxx)
 ├─ pages/           - Route pages (kebab-case)
 ├─ utils/           - Framework-agnostic utilities
 └─ services/        - API/business logic services
server/
 ├─ api/             - API endpoints (kebab-case)
 └─ plugins/         - Server plugins
shared/
 └─ types/           - Shared TypeScript types
tests/
 ├─ assets/          - Unit tests (*.test.ts)
 └─ e2e/             - E2E tests (*.spec.ts)
```

### Testing Patterns
- Use Vitest globals (describe, it, expect, vi) - no imports needed
- Mock dependencies with vi.fn()
- Arrange/Act/Assert pattern in tests
- Test files end with `.test.ts` for unit tests
- E2E test files end with `.spec.ts`

### API Routes
- Use `apiHandler` from `@dcc-bs/backend_communication`
- Pattern: `apiHandler.withMethod("GET").withDummyFetcher(dummyFetch).build("/path")`
- Route files in `server/api/` directory with kebab-case naming

### Styling
- **Tailwind CSS** for all styling
- **Lucide icons** from lucide.dev (use `i-lucide-*` class)

### Type Safety
- Strict TypeScript enabled
- Use Zod for runtime validation where needed
- Pinia stores for state management
- Define interfaces and types in `/types` folder

### Dependencies
- **Bun** for package management (not npm/yarn)
- Nuxt 4 with TypeScript
- Nuxt UI components
- Tiptap for rich text editing

### Import Aliases (DCC Standards)
- `~/` → `/app` directory (primary alias)
- `~~/` → Root directory
- `~~/server` → Server directory
- `#shared` → Shared code (client & server)
- `#app` → Nuxt app internals

Example:
```ts
import { useCounter } from '~/composables/useCounter';
import { formatDate } from '~/utils/formatDate';
import { UserService } from '~~/server/services/userService';
import { ApiResponse } from '#shared/types/api';
```
