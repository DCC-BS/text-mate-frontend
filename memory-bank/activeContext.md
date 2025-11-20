# Active Context: TextMate Frontend

## Current Work Focus
The project is in a stable, feature-complete state with a mature architecture. The current focus appears to be on maintenance, bug fixes, and potential UI refinements based on the recent activity in the codebase.

## Recent Changes & Activity
### Git Activity
- **Latest Commit**: 7c5a4e65427dcc4b23d85093db8434e74813acfe
- **Branch**: feature/uiRedesign (active development branch)
- **Recent Files Modified**: Active development on text editor components and tool panels

### Component Updates
- **Text Editor Components**: Current work on text-correction.vue, text-rewrite.vue with enhanced diff viewing capabilities
- **Tool Panel Components**: Updates to rewrite-diff-viewer.vue, problems-panel.vue, text-quick-action-panel.vue, user-dictionary.vue
- **Service Layer**: Enhancements to textAction.composable.ts and commands.ts for improved text handling
- **Active Development**: Working on UI redesign with improved user experience and functionality
- **Recent Focus**: Enhanced diff viewing for text corrections and rewrites with better visual feedback

### Configuration Changes
- **Nuxt Config**: Recent adjustments to build configuration and module setup
- **Package Dependencies**: Updated to latest versions of core dependencies
- **Environment**: Enhanced Docker configuration and development setup

## Current Architecture State
### Frontend Structure
```
app/
├── components/          # Vue components with Composition API
│   ├── text-editor/     # Rich text editor components
│   └── tool-panel/      # Tool panel components
├── assets/              # Static assets and business logic
│   ├── services/        # API integration services
│   ├── models/          # TypeScript interfaces
│   └── css/             # Styling and animations
├── composables/         # Reusable Vue composition functions
├── pages/               # Nuxt page components
└── plugins/             # Nuxt plugins and service registration
```

### Backend Integration
- **Real API**: Production endpoints at `/api/`
- **Dummy API**: Development endpoints at `/api/dummy/`
- **Middleware**: Request routing and authentication handling
- **Services**: Abstracted API communication with error handling

## Active Development Patterns

### 1. Service-First Development
New features are implemented through the service layer first:
```typescript
// Service registration
container.registerSingleton(CorrectionService.$injectKey, CorrectionService);

// Usage in components
const correctionService = useCorrectionService();
```

### 2. Component Composition
Components are built using Vue 3 Composition API:
```typescript
// Reactive state management
const userText = ref("");
const selectedText = ref<TextFocus>();

// Computed properties
const corrections = computed(() => 
  correctionService.getCorrectionsForText(userText.value)
);
```

### 3. Event-Driven Updates
State changes propagate through the command system:
```typescript
onCommand(Cmds.InvalidateCorrectionCommand, handleInvalidate);
```

## Current Technical Decisions

### 1. Text Processing Strategy
- **Sentence-level processing**: Text is split into sentences for efficient correction
- **Diff-based updates**: Only changed sentences are reprocessed
- **Debounced execution**: User input is debounced to reduce API calls
- **Abortable operations**: All async operations support cancellation

### 2. UI Architecture
- **Split-view layout**: Fixed editor on left, dynamic tools on right
- **Progressive disclosure**: Tools are shown based on context and selection
- **Responsive design**: Adapts to mobile, tablet, and desktop viewports
- **Accessibility**: Keyboard navigation and screen reader support

### 3. State Management
- **Local state**: Component-level state with refs and computed properties
- **Service state**: Shared state managed through services
- **Event state**: Cross-component communication via commands
- **Persistent state**: User preferences and dictionary storage

## Development Environment Setup

### Required Environment Variables
```bash
API_URL=http://localhost:8000          # Backend API endpoint
LOG_LEVEL=debug                       # Logging verbosity
DUMMY=true                            # Enable dummy mode for development
GITHUB_TOKEN                          # Feedback integration token
```

### Development Commands
```bash
bun run dev        # Development server with hot reload
bun run dummy      # Development with dummy backend
bun run debug      # Development with Node.js inspector
bun run lint       # Code formatting with Biome
bun run check      # Code quality checks
bun test           # Unit test execution
bun run build      # Production build
```

## Current Challenges & Considerations

### 1. Performance Optimization
- **Bundle Size**: Managing code splitting for optimal loading
- **Memory Usage**: Efficient text processing for large documents
- **API Rate Limiting**: Balancing real-time features with backend constraints
- **Mobile Performance**: Ensuring responsive experience on all devices

### 2. User Experience
- **Real-time Feedback**: Providing immediate corrections without disrupting flow
- **Error Handling**: Graceful degradation when backend services are unavailable
- **Internationalization**: Maintaining translation quality across features
- **Accessibility**: Ensuring full keyboard and screen reader support

### 3. Integration Complexity
- **Backend Dependencies**: Managing communication with Python FastAPI backend
- **External Services**: Integration with Language Tool and LLM services
- **Authentication**: DCC-BS authentication system integration
- **Docker Environment**: Development and production containerization

## Code Quality Standards

### 1. TypeScript Standards
- **Strict Mode**: Full TypeScript strict mode enabled
- **Type Safety**: Comprehensive type definitions for all interfaces
- **Generic Types**: Proper use of generics for reusable components
- **Error Types**: Typed error handling with custom error classes

### 2. Vue.js Standards
- **Composition API**: Consistent use of Composition API over Options API
- **Reactive Patterns**: Proper use of refs, computed, and watch
- **Component Structure**: Clear separation of template, script, and style
- **Props Validation**: Comprehensive prop validation with TypeScript

### 3. Code Organization
- **File Naming**: kebab-case for components, PascalCase for classes
- **Import Organization**: Grouped imports with proper ordering
- **Export Patterns**: Consistent export statements and re-exports
- **Documentation**: JSDoc comments for complex functions and classes

## Testing Strategy

### 1. Unit Testing
- **Service Tests**: Comprehensive testing of service layer logic
- **Component Tests**: Vue component testing with Vue Test Utils
- **Utility Tests**: Pure function testing with high coverage
- **Mock Strategy**: Consistent mocking patterns for external dependencies

### 2. Integration Testing
- **API Integration**: Testing of service-to-API communication
- **Component Integration**: Testing of component interactions
- **Event System**: Testing of command-based communication
- **Error Scenarios**: Comprehensive error handling testing

### 3. Quality Assurance
- **Type Checking**: TypeScript compilation as first line of defense
- **Linting**: Biome for consistent code formatting and quality
- **Build Testing**: Production build verification
- **Manual Testing**: User workflow validation

## Next Steps & Priorities

### Immediate Priorities
1. **UI Redesign Completion**: Finalize the ongoing UI redesign work
2. **Performance Optimization**: Address any performance bottlenecks identified
3. **Bug Fixes**: Resolve any outstanding issues from recent development
4. **Documentation**: Update technical documentation for recent changes

### Medium-term Goals
1. **Feature Enhancement**: Evaluate and implement requested user features
2. **Accessibility Improvements**: Enhance accessibility compliance
3. **Mobile Experience**: Optimize mobile and tablet interfaces
4. **Testing Coverage**: Increase unit and integration test coverage

### Long-term Considerations
1. **Architecture Evolution**: Evaluate need for architectural improvements
2. **Technology Updates**: Plan for dependency updates and migrations
3. **Performance Monitoring**: Implement comprehensive performance monitoring
4. **User Feedback Integration**: Enhance feedback collection and analysis

## Important Patterns & Preferences

### Development Preferences
- **TypeScript First**: All new code should be written in TypeScript
- **Composition API**: Prefer Composition API over Options API
- **Service Layer**: Business logic belongs in services, not components
- **Event-Driven**: Use command pattern for cross-component communication

### Code Style Preferences
- **Biome Formatting**: Use Biome for consistent code formatting
- **Descriptive Naming**: Clear, descriptive variable and function names
- **Small Functions**: Keep functions focused and small
- **Early Returns**: Use early returns for better readability

### Architecture Preferences
- **Dependency Injection**: Use DCC-BS dependency injection system
- **Immutable State**: Prefer immutable data structures
- **Error Boundaries**: Implement proper error handling at all levels
- **Performance First**: Consider performance implications in all decisions
