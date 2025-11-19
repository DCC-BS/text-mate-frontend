# System Patterns: Text Mate Frontend

## System Architecture Overview
Text Mate follows a modular, event-driven architecture with clear separation of concerns. The system is built around reactive data flows and dependency injection patterns that enable maintainable, testable code.

## Core Architectural Patterns

### 1. Dependency Injection Pattern
**Purpose**: Manage service lifecycle and dependencies systematically
**Implementation**: DCC-BS dependency injection container

```typescript
// Service registration in plugins/service-registrant.ts
container.registerSingleton(CorrectionService.$injectKey, CorrectionService);
container.registerSingleton(AdvisorService.$injectKey, AdvisorService);

// Constructor injection with type safety
constructor(
  private readonly logger: ILogger,
  private readonly correctionFetcher: ICorrectionFetcher,
  private readonly executeCommand: (command: ICommand) => Promise<void>
) {}
```

**Benefits**:
- Loose coupling between components
- Testable architecture with easy mocking
- Centralized service lifecycle management
- Type-safe dependency resolution

### 2. Command Pattern for Events
**Purpose**: Decouple component communication through typed commands
**Implementation**: DCC-BS event system with command objects

```typescript
// Command definitions
export class InvalidateCorrectionCommand implements ICommand {}
export class SwitchCorrectionLanguageCommand implements ICommand {
  constructor(public language: string) {}
}

// Command handling
onCommand(Cmds.InvalidateCorrectionCommand, handleInvalidate);
```

**Benefits**:
- Type-safe event handling
- Audit trail of user actions
- Easy debugging and logging
- Reversible operations support

### 3. Task Scheduling Pattern
**Purpose**: Optimize performance by debouncing expensive operations
**Implementation**: TaskScheduler with intelligent execution

```typescript
const taskScheduler = new TaskScheduler();

// Debounced text correction
watch(userText, (newText) => {
  taskScheduler.schedule((signal: AbortSignal) => 
    correctText(newText, signal)
  );
  
  // Immediate execution on sentence boundaries
  if (newText.endsWith(".") || newText.endsWith("\n")) {
    taskScheduler.executeImmediately();
  }
});
```

**Benefits**:
- Reduced API calls during typing
- Responsive user experience
- Cancellation of outdated requests
- Intelligent execution timing

## Component Architecture Patterns

### 1. Split-View Layout Pattern
**Purpose**: Provide efficient workflow with editor and tools side-by-side
**Implementation**: SplitContainer component with resizable panels

```vue
<template>
  <SplitContainer>
    <template #left>
      <TextEditor v-model="userText" />
    </template>
    <template #right>
      <ToolPanel :text="userText" :selectedText="selectedText" />
    </template>
  </SplitContainer>
</template>
```

**Benefits**:
- Maximum screen utilization
- Contextual tool display
- Responsive design adaptation
- Keyboard navigation support

### 2. Progressive Enhancement Pattern
**Purpose**: Layer functionality without overwhelming users
**Implementation**: Incremental feature disclosure in ToolPanel

```vue
<template>
  <ToolSelectView /> <!-- Tool selection -->
  <ProblemsPanel /> <!-- Basic corrections -->
  <RewriteView /> <!-- Advanced rewriting -->
  <AdvisorView /> <!-- Document validation -->
</template>
```

**Benefits**:
- Scalable feature set
- Clear information hierarchy
- Reduced cognitive load
- Feature discovery support

### 3. Reactive Data Flow Pattern
**Purpose**: Maintain consistency between editor state and tool panels
**Implementation**: Props and events with computed properties

```typescript
// Reactive text flow
const userText = ref("");
const selectedText = ref<TextFocus>();

// Computed corrections
const corrections = computed(() => 
  correctionService.getCorrectionsForText(userText.value)
);
```

**Benefits**:
- Single source of truth
- Automatic UI updates
- Predictable state management
- Easy debugging

## Service Layer Patterns

### 1. Correction Service Pattern
**Purpose**: Manage text correction with diff-based incremental updates
**Implementation**: Sentence-level processing with change tracking

```typescript
class CorrectionService {
  async correctText(text: string, signal: AbortSignal) {
    const sentences = splitToSentences(text);
    const diff = this.getDiff(sentences);
    const { blocks, commands } = await this.processDiff(diff, signal);
    
    // Execute commands to update UI
    for (const command of commands) {
      await this.executeCommand(command);
    }
  }
}
```

**Benefits**:
- Efficient incremental updates
- Minimal API calls
- Change tracking and history
- Abortable operations

### 2. Fetcher Service Pattern
**Purpose**: Abstract API communication with error handling
**Implementation**: Specialized fetchers for different API endpoints

```typescript
class CorrectionFetcher implements ICorrectionFetcher {
  async fetchBlocks(text: string, signal: AbortSignal): Promise<TextCorrectionBlock[]> {
    try {
      return await this.apiClient.post('/correct', { text }, { signal });
    } catch (error) {
      throw new ApiError('correction_failed', error.message);
    }
  }
}
```

**Benefits**:
- Centralized error handling
- Consistent API communication
- Request/response transformation
- Testing abstraction layer

### 3. Queue Processing Pattern
**Purpose**: Manage sequential processing of text corrections
**Implementation**: Queue data structure for efficient block management

```typescript
class Queue<T> {
  private items: T[] = [];
  
  enqueue(item: T): void { this.items.push(item); }
  dequeue(): T | undefined { return this.items.shift(); }
  safePeek(): T { return this.items[0]; }
}
```

**Benefits**:
- Ordered processing guarantees
- Memory-efficient operations
- Thread-safe operations
- Predictable behavior

## Data Management Patterns

### 1. Immutable State Pattern
**Purpose**: Ensure predictable state updates and change detection
**Implementation**: Readonly interfaces with controlled mutations

```typescript
interface TextCorrectionBlock {
  readonly offset: number;
  readonly length: number;
  readonly corrections: readonly TextCorrection[];
}

// State updates through commands
const command = new CorrectionBlockChangedCommand(newBlock, "add");
await executeCommand(command);
```

**Benefits**:
- Predictable state changes
- Easy change detection
- Time-travel debugging
- Concurrent access safety

### 2. Diff-Based Update Pattern
**Purpose**: Minimize updates by processing only changed content
**Implementation**: Array diffing with granular change detection

```typescript
private getDiff(sentences: string[]): ArrayChange<string>[] {
  return diffArrays(this.lastSentences, sentences);
}
```

**Benefits**:
- Reduced processing overhead
- Precise change tracking
- Efficient memory usage
- Fast UI updates

## Error Handling Patterns

### 1. Centralized Error Handling
**Purpose**: Provide consistent error responses and user feedback
**Implementation**: Error boundaries with user-friendly messages

```typescript
try {
  await correctionService.correctText(text, signal);
} catch (e: unknown) {
  if (e instanceof ApiError) {
    onError(this.t(`errors.${e.errorId}`));
    return;
  }
  logger.error(`Error during text correction: ${e.message}`);
  onError(e.message);
}
```

**Benefits**:
- Consistent error experience
- Internationalized error messages
- Comprehensive error logging
- Graceful degradation

### 2. Abort Controller Pattern
**Purpose**: Enable cancellation of long-running operations
**Implementation**: Signal-based cancellation throughout the stack

```typescript
async function correctText(text: string, signal: AbortSignal) {
  if (signal.aborted) {
    throw new Error("Request aborted", { cause: "aborted" });
  }
  // ... processing logic
}
```

**Benefits**:
- Resource cleanup
- Improved performance
- Better user experience
- Memory leak prevention

## Performance Patterns

### 1. Lazy Loading Pattern
**Purpose**: Reduce initial bundle size and improve startup time
**Implementation**: Dynamic imports for heavy components

```typescript
const ToolPanel = defineAsyncComponent(() => import('./tool-panel.vue'));
const PdfViewer = defineAsyncComponent(() => import('./advisor-pdf-viewer.client.vue'));
```

**Benefits**:
- Faster initial load
- Reduced memory usage
- Better perceived performance
- Code splitting optimization

### 2. Debounced Input Pattern
**Purpose**: Reduce excessive API calls during user input
**Implementation**: TaskScheduler with intelligent timing

```typescript
watch(userText, (newText) => {
  taskScheduler.schedule((signal: AbortSignal) => 
    correctText(newText, signal)
  );
});
```

**Benefits**:
- Reduced server load
- Improved responsiveness
- Cost optimization
- Better user experience

## Integration Patterns

### 1. Plugin Architecture Pattern
**Purpose**: Enable modular feature addition and configuration
**Implementation**: Nuxt plugin system with dependency injection

```typescript
// plugins/service-registrant.ts
export default defineNuxtPlugin((nuxtApp) => {
  const container = nuxtApp.$container;
  container.registerSingleton(CorrectionService.$injectKey, CorrectionService);
});
```

**Benefits**:
- Modular architecture
- Easy feature addition
- Configuration flexibility
- Test isolation

### 2. API Abstraction Pattern
**Purpose**: Isolate frontend from backend implementation details
**Implementation**: Service layer with dummy mode support

```typescript
class CorrectionService {
  constructor(
    private readonly correctionFetcher: ICorrectionFetcher,
    // ... other dependencies
  ) {}
}
```

**Benefits**:
- Backend independence
- Easy testing with mocks
- Development flexibility
- Migration support
