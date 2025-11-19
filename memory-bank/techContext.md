# Technical Context: Text Mate Frontend

## Technology Stack
### Core Framework
- **Nuxt.js 4.1.2**: Vue.js meta-framework for SSR, routing, and build optimization
- **Vue 3.5.21**: Progressive JavaScript framework with Composition API
- **TypeScript 5.9.2**: Static typing for enhanced development experience and code quality

### UI & Styling
- **Nuxt UI 4.0.0**: Component library with Tailwind CSS integration
- **Tailwind CSS 4.1.14**: Utility-first CSS framework for rapid UI development
- **Motion-v 1.7.1**: Animation library for smooth transitions and micro-interactions (Motion.dev)

### Text Editing
- **Tiptap 3.5.1**: ProseMirror-based rich text editor with extensive extensions
  - Starter kit, bubble menu, floating menu
  - Character count, highlight, history, placeholder extensions
- **Vue-pdf-embed 2.1.3**: PDF rendering and display capabilities

### State Management & Data
- **Pinia 3.0.3**: Official Vue state management library
- **jsdiff 1.1.1**: Text diffing algorithm for change tracking
- **ts-pattern 5.8.0**: Pattern matching library for type-safe data handling

### Development Tools
- **Biome 2.2.4**: Fast linting, formatting, and code quality tool
- **Vitest 3.2.4**: Unit testing framework with Vite integration
- **Happy-dom 19.0.2**: Lightweight DOM implementation for testing

### DCC-BS Integration
- **@dcc-bs/common-ui.bs.js**: Shared UI components and design system
- **@dcc-bs/event-system.bs.js**: Event-driven architecture for component communication
- **@dcc-bs/logger.bs.js**: Structured logging system
- **@dcc-bs/feedback-control.bs.js**: User feedback and issue tracking integration
- **@dcc-bs/dependency-injection.bs.js**: IOC container for service management
- **@dcc-bs/authentication.bs.js**: Authentication and authorization system

## Development Setup
### Environment Configuration
- **Package Manager**: Bun for fast dependency installation and script execution
- **Runtime**: Node.js with TypeScript compilation
- **Build System**: Vite with optimized chunking strategies
- **CSS Processing**: PostCSS with Tailwind CSS and autoprefixer

### Key Environment Variables
```bash
API_URL=http://localhost:8000          # Backend API endpoint
LOG_LEVEL=debug                       # Logging verbosity
DUMMY=true                            # Enable dummy mode for development
GITHUB_TOKEN                          # Feedback integration token
```

### Development Commands
- `bun run dev`: Development server with hot reload
- `bun run debug`: Development with Node.js inspector
- `bun run dummy`: Development with dummy backend
- `bun run lint`: Code formatting with Biome
- `bun run check`: Code quality checks and auto-fixes
- `bun test`: Unit test execution
- `bun run build`: Production build optimization

## Architecture Patterns
### Dependency Injection
Services are registered and injected through the DCC-BS dependency injection system:
- Service registration in `app/plugins/service-registrant.ts`
- Constructor injection with type safety
- Singleton lifecycle management for core services

### Event-Driven Communication
Components communicate through a centralized event system:
- Command pattern for user actions and system events
- Decoupled component architecture
- Type-safe event handling with TypeScript

### Modular Design
The application follows a clear separation of concerns:
- **Components**: Vue components with Composition API
- **Composables**: Reusable logic and state management
- **Services**: Business logic and external API integration
- **Models**: TypeScript interfaces and type definitions
- **Utils**: Pure functions and utility logic

## Performance Optimizations
### Build Optimizations
- **Manual Chunking**: Strategic code splitting for vendor libraries
- **Tree Shaking**: Elimination of unused code
- **CSS Minification**: Lightning CSS for optimal bundle sizes
- **Source Maps**: Development debugging with production-optimized builds

### Runtime Optimizations
- **Lazy Loading**: Components and routes loaded on demand
- **Debounced Processing**: Text correction with intelligent scheduling
- **Abort Controllers**: Cancellation of pending requests
- **Memory Management**: Proper cleanup of event listeners and subscriptions

## API Integration
### Backend Communication
- **RESTful API**: Standard HTTP methods with proper error handling
- **Streaming Support**: Real-time text processing with abort capability
- **Dummy Mode**: Local development without backend dependency
- **Error Handling**: Centralized error processing with user feedback

### External Services
- **Language Tool**: Grammar and spell checking integration
- **LLM Services**: AI-powered text rewriting and suggestions
- **PDF Processing**: Document validation and reference matching

## Internationalization
### Multi-language Support
- **Nuxt I18n**: Vue.js internationalization framework
- **Locale Files**: JSON-based translation management
- **Dynamic Loading**: Language switching without page reload
- **Fallback Strategy**: Graceful degradation for missing translations

### Supported Languages
- **German (de)**: Default locale with comprehensive translations
- **English (en)**: Secondary locale with full feature parity

## Testing Strategy
### Unit Testing
- **Vitest**: Fast unit test execution with TypeScript support
- **Vue Test Utils**: Component testing utilities
- **Happy DOM**: Lightweight DOM environment for testing
- **Coverage Reporting**: Code coverage analysis with c8

### Quality Assurance
- **TypeScript**: Static type checking and compilation
- **Biome**: Code formatting and linting
- **ESLint**: Additional code quality rules
- **Pre-commit Hooks**: Automated quality checks before commits

## Deployment Considerations
### Production Build
- **Static Generation**: Nuxt generate for static hosting
- **Docker Support**: Multi-stage Dockerfile for containerized deployment
- **Environment Configuration**: Runtime configuration management
- **Asset Optimization**: Image compression and CDN integration

### Monitoring & Analytics
- **Error Tracking**: Integration with DCC-BS feedback system
- **Performance Monitoring**: Built-in Nuxt performance metrics
- **User Analytics**: Feedback collection and issue reporting
