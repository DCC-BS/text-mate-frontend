# Cline Instructions for Text-Mate Frontend

## Project Overview
This is a Nuxt 3 with TypeScript frontend application for text editing and correction. The project uses Bun as the package manager and follows strict TypeScript conventions.

## Development Guidelines

### 1. **Use Composition API exclusively**
Always use the Composition API style for components and composables.

```typescript
// Correct
export default defineComponent({
    setup() {
        const count = ref(0);
        return { count };
    },
});

// Incorrect
export default {
    data() {
        return {
            count: 0,
        };
    },
};
```

### 2. **Function declarations for methods**
Use function declarations instead of arrow function assignments for methods.

```typescript
// Correct
function increment() {
  count.value++
}

// Incorrect
const increment = () => {
  count.value++
}
```

### 3. **Avoid using 'any' type**
Never use the 'any' type. Instead, use more specific types or 'unknown' if the type is truly unknown.

```typescript
// Correct
function processData(data: unknown) {
  // Type-check and narrow the type before using
}

// Incorrect
function processData(data: any) {
  // This bypasses type checking
}
```

### 4. **Use non-null refs**
When using refs, initialize them with a value instead of null.

```typescript
// Correct
const name = ref('');

// Incorrect
const name = ref(null);
```

### 5. **Prefer undefined over null**
Use undefined instead of null when representing the absence of a value.

```typescript
// Correct
const user = ref(undefined);

// Incorrect
const user = ref(null);
```

### 6. **Type inference**
Leverage TypeScript's type inference when possible, but provide explicit types for function parameters and return types.

```typescript
// Correct
function calculateTotal(items: Item[]): number {
  return items.reduce((total, item) => total + item.price, 0)
}

// Incorrect (missing return type)
function calculateTotal(items: Item[]) {
  return items.reduce((total, item) => total + item.price, 0)
}
```

### 7. **Use TypeScript features**
Utilize TypeScript features like interfaces, type aliases, and generics to create more robust and reusable code.

```typescript
interface User {
  id: number
  name: string
  email: string
}

type UserWithoutId = Omit<User, 'id'>

function createUser(user: UserWithoutId): User {
  return { ...user, id: generateId() }
}
```

### 8. **Async/Await**
Use async/await for asynchronous operations instead of promise chains.

```typescript
// Correct
async function fetchUserData(userId: number): Promise<User> {
  const response = await fetch(`/api/users/${userId}`);
  return await response.json();
}

// Incorrect
function fetchUserData(userId: number): Promise<User> {
  return fetch(`/api/users/${userId}`)
    .then(response => response.json())
}
```

### 9. **Always use semicolons**
Always terminate statements with semicolons for clarity and consistency.

```typescript
// Correct
const name = ref('');
function increment(): void {
  count.value++;
}

// Incorrect
const name = ref('')
function increment(): void {
  count.value++
}
```

### 10. **Use bun for package management**
Use bun for package management and scripts instead of npm or yarn.

```bash
# Correct
bun add <package-name>
bun run <script-name>

# Incorrect
npm install <package-name>
npm run <script-name>
```

## Cline-Specific Instructions

### File Operations
- When creating new files, use the `write_to_file` tool for complete file creation
- When making targeted changes, use the `replace_in_file` tool with precise SEARCH/REPLACE blocks
- Always analyze the existing code structure before making changes

### Code Analysis
- Use `read_file` to examine existing code before modifications
- Use `search_files` to understand code patterns across the project
- Use `list_code_definition_names` to get an overview of project structure

### Development Workflow
1. **Understand the context**: Always read relevant files before making changes
2. **Plan modifications**: Consider the impact on related components and services
3. **Make incremental changes**: Use targeted edits rather than complete rewrites when possible
4. **Test assumptions**: Verify that changes don't break existing functionality
5. **Follow patterns**: Maintain consistency with existing code style and architecture

### Project Structure Awareness
- **Components**: Located in `app/components/` - follow Vue 3 Composition API patterns
- **Services**: Located in `app/assets/services/` - handle business logic and API calls
- **Models**: Located in `app/assets/models/` - define TypeScript interfaces and types
- **Composables**: Located in `app/composables/` - reusable Vue composition functions
- **API Routes**: Located in `server/api/` - Nuxt server routes
- **Utils**: Located in `app/utils/` - utility functions and helpers

### Error Handling
- Always include proper error handling in async functions
- Use the existing `useErrorDialog` composable for user-facing errors
- Log errors appropriately for debugging
- Provide meaningful error messages

### Performance Considerations
- Use lazy loading for heavy components when appropriate
- Optimize API calls and avoid unnecessary requests
- Use proper Vue reactivity patterns to avoid unnecessary re-renders
- Consider bundle size when adding new dependencies

### Code Quality
- Always add comments explaining complex logic
- Follow existing naming conventions
- Keep functions focused and single-purpose
- Use proper TypeScript types for all function parameters and return values

## Testing
- The project uses Vitest for testing
- Test files are located in `tests/`
- When adding new features, consider adding corresponding tests
- Run tests with `bun run test`

## Environment Variables
- Use `.env` for local development
- Reference `.env.example` for available environment variables
- Never commit sensitive environment variables

## Git Workflow
- Create feature branches for new functionality
- Write clear commit messages following the existing pattern
- Ensure all tests pass before committing
- Use conventional commit format if applicable

Remember to adhere to these guidelines while coding to maintain consistency and leverage the full power of TypeScript in your Nuxt project. Always add comments to your code and think about the broader impact of your changes on the application architecture.
