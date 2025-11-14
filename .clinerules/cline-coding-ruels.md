# Text-Mate Frontend Coding Rules

## Core TypeScript Guidelines

### 1. **Always Use Types**
   - Never use the `any` type. Use specific types or `unknown` if the type is truly unknown
   - Provide explicit types for function parameters and return types
   - Leverage TypeScript's type inference when possible but be explicit when needed

   ```typescript
   // Correct
   interface User {
       id: number;
       name: string;
       email: string;
   }

   function processData(data: unknown): User | null {
       if (typeof data === 'object' && data !== null) {
           // Type-check and narrow the type before using
           return data as User;
       }
       return null;
   }

   // Incorrect
   function processData(data: any) {
       // This bypasses type checking
   }
   ```

### 2. **Tab Space: 4 Spaces**
   - Always use 4 spaces for indentation
   - Configure your editor to use 4 spaces for tabs

### 3. **Prefer Function Declarations Over Arrow Functions**
   - Use function declarations for methods and named functions
   - Arrow functions are acceptable for anonymous functions and callbacks

   ```typescript
   // Correct
   function increment(): void {
       count.value++;
   }

   function calculateTotal(items: Item[]): number {
       return items.reduce((total, item) => total + item.price, 0);
   }

   // Acceptable for callbacks
   const items = [1, 2, 3].map(item => item * 2);

   // Incorrect
   const increment = (): void => {
       count.value++;
   };
   ```

### 4. **Biome Validation Required**
   - All TypeScript code must pass Biome validation
   - Run `biome check` and `biome format` before committing
   - Ensure code follows Biome's linting rules

### 5. **Use Tailwind CSS When Possible**
   - Prefer Tailwind utility classes over custom CSS
   - Use Tailwind's responsive variants for responsive design
   - Create custom components using Tailwind's @apply directive when needed

## Nuxt-Specific Rules

### 6. **Use Composition API Exclusively**
   Always use the Composition API style for components and composables.

   ```vue
   <!-- Correct -->
   <script lang="ts" setup>
   const count = ref(0);

   function increment(): void {
       count.value++;
   }
   </script>

   <!-- Incorrect -->
   <script>
   export default {
       data() {
           return {
               count: 0,
           };
       },
   };
   </script>
   ```

### 7. **Use Non-Null Refs**
   When using refs, initialize them with a value instead of null.

   ```typescript
   // Correct
   const name = ref('');
   const user = ref<User | undefined>(undefined);

   // Incorrect
   const name = ref(null);
   const user = ref(null);
   ```

### 8. **Prefer Undefined Over Null**
   Use undefined instead of null when representing the absence of a value.

   ```typescript
   // Correct
   const user = ref<User | undefined>(undefined);

   // Incorrect
   const user = ref<User | null>(null);
   ```

### 9. **TypeScript Features**
   Utilize TypeScript features like interfaces, type aliases, and generics to create robust and reusable code.

   ```typescript
   interface User {
       id: number;
       name: string;
       email: string;
   }

   type UserWithoutId = Omit<User, 'id'>;

   function createUser(user: UserWithoutId): User {
       return { ...user, id: generateId() };
   }
   ```

### 10. **Async/Await**
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
           .then(response => response.json());
   }
   ```

### 11. **Always Use Semicolons**
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

### 12. **Use Bun for Package Management**
   Use bun for package management and scripts instead of npm or yarn.

   ```bash
   # Correct
   bun add <package-name>
   bun run <script-name>

   # Incorrect
   npm install <package-name>
   npm run <script-name>
   ```

## Vue Component Guidelines

### 13. **Component Structure**
   - Use Composition API with `<script setup>` syntax
   - Use proper TypeScript typing for props and emits
   - Define props and emits using `defineProps` and `defineEmits`

   ```vue
   <script lang="ts" setup>
   interface Props {
       title: string;
       count?: number;
   }

   interface Emits {
       update: [value: string];
       delete: [id: number];
   }

   const props = defineProps<Props>();
   const emit = defineEmits<Emits>();

   const internalValue = ref(props.title);
   
   function handleUpdate(): void {
       emit('update', internalValue.value);
   }
   </script>

   <!-- Incorrect - Old Options API -->
   <script>
   export default {
       props: {
           title: {
               type: String,
               required: true,
           },
           count: {
               type: Number,
               default: 0,
           },
       },
       emits: ['update', 'delete'],
   };
   </script>
   ```

### 14. **Styling with Tailwind**
   - Use Tailwind classes directly in templates
   - Create component-specific styles with @apply when necessary
   - Follow Tailwind's naming conventions

   ```vue
   <template>
       <div class="flex items-center justify-between p-4 bg-white rounded-lg shadow-md">
           <h2 class="text-xl font-semibold text-gray-800">{{ title }}</h2>
           <button 
               @click="handleAction"
               class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
           >
               Action
           </button>
       </div>
   </template>

   <style scoped>
   .custom-style {
       @apply border-2 border-red-500;
   }
   </style>
   ```

## Code Quality Requirements

### 15. **Comments**
   - Always add meaningful comments to your code
   - don't explain what the code does, but why it does it
   - don't comment obvious things
   - Explain complex logic and business rules
   - Use JSDoc for function documentation

   ```typescript
   /**
    * Calculates the total price of items including tax
    * @param items - Array of items with price and quantity
    * @param taxRate - Tax rate as a decimal (e.g., 0.08 for 8%)
    * @returns Total price including tax
    */
   function calculateTotalWithTax(items: Item[], taxRate: number): number {
       const subtotal = items.reduce((total, item) => {
           return total + (item.price * item.quantity);
       }, 0);
       
       return subtotal * (1 + taxRate);
   }
   ```

### 16. **Error Handling**
   - Use proper error handling with try-catch blocks
   - Provide meaningful error messages
   - Use TypeScript's discriminated unions for error types

   ```typescript
   interface ApiError {
       type: 'error';
       message: string;
       code: string;
   }

   interface ApiSuccess<T> {
       type: 'success';
       data: T;
   }

   type ApiResponse<T> = ApiError | ApiSuccess<T>;

   async function fetchApiData(url: string): Promise<ApiResponse<User>> {
       try {
           const response = await fetch(url);
           if (!response.ok) {
               return {
                   type: 'error',
                   message: `HTTP error: ${response.status}`,
                   code: response.status.toString(),
               };
           }
           const data = await response.json();
           return { type: 'success', data };
       } catch (error: unknown) {
           return {
               type: 'error',
               message: error instanceof Error ? error.message : 'Unknown error',
               code: 'NETWORK_ERROR',
           };
       }
   }
   ```

Remember to adhere to these guidelines while coding to maintain consistency, type safety, and code quality in the Text-Mate Frontend project.
