# Text Mate

Text Mate is a modern web application for advanced text editing, correction, and document validation. Built with Nuxt.js and TypeScript, it provides a rich set of tools to enhance writing experiences.

## Features

- **Grammar Correction**: Identifies and suggests fixes for grammar and spelling issues
- **Text Rewriting**: Offers alternative phrasings with customizable style, audience, and intent
- **Document Advisor**: Validates texts against selected reference documents with PDF preview
- **Quick Actions**: Various text transformation tools including summarization and format conversion
- **User Dictionary**: Personal dictionary for storing specialized vocabulary
- **Multilingual Support**: Available in English and German

## Technology Stack

- **Frontend**: [Nuxt.js](https://nuxt.com/) with TypeScript and Composition API
- **UI Framework**: [Nuxt UI](https://ui.nuxt.com/)
- **Text Editor**: [Tiptap](https://tiptap.dev/)
- **Package Manager**: [Bun](https://bun.sh/)
- **Internationalization**: Nuxt I18n
- **PDF Handling**: Vue PDF Embed

## Setup

Make sure to install dependencies using Bun:

```bash
bun install
```

### Environment Configuration

Create a `.env` file in the project root with the required environment variables:

```
API_URL=http://localhost:8000
LOG_LEVEL=debug
```

## Development

Start the development server on `http://localhost:3000`:

```bash
bun run dev
```

For debugging with inspector:

```bash
bun run debug
```

### Backend Setup

Start the backend as a Docker container:

```bash
sudo docker compose --env-file ./.env.backend up --build
```

## Testing & Linting

Run tests with Vitest:

```bash
# Run tests
bun test

# Run tests in watch mode
bun test:watch

# Generate coverage report
bun test:coverage
```

Format code with Biome:

```bash
bun run lint
```

Check and fix code issues:

```bash
bun run check
```

## Production

Build the application for production:

```bash
bun run build
```

Generate static site:

```bash
bun run generate
```

Preview production build:

```bash
bun run preview
```

## Docker Deployment

The application includes a multi-stage Dockerfile for production deployment:

```bash
# Build the Docker image
docker build -t text-mate-frontend .

# Run the container
docker run -p 3000:3000 text-mate-frontend
```

## Project Architecture

- `assets/`: CSS and TypeScript models/services
- `components/`: Vue components for the UI
- `composables/`: Reusable Vue composition functions
- `i18n/`: Internationalization configuration
- `pages/`: Application pages and routes
- `server/`: API endpoints and server middleware
- `stores/`: Pinia stores for state management
- `utils/`: Utility functions and extensions

## License

[MIT](LICENSE) © Data Competence Center Basel-Stadt
