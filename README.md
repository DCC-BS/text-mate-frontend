# TextMate (Frontend)

![TextMate Screenshot](_imgs/preview_problems.png)

TextMate is a modern web application for advanced text editing, correction, and document validation. Built with Nuxt.js and TypeScript, it provides a rich set of tools to enhance writing experiences. This repository contains only the frontend code; the backend is written in Python FastAPI and available at [https://github.com/DCC-BS/text-mate-backend](https://github.com/DCC-BS/text-mate-backend).

![GitHub License](https://img.shields.io/github/license/DCC-BS/text-mate-frontend) [![Checked with Biome](https://img.shields.io/badge/Checked_with-Biome-60a5fa?style=flat&logo=biome)](https://biomejs.dev)

---

<p align="center">
  <a href="https://dcc-bs.github.io/documentation/">DCC Documentation & Guidelines</a> | <a href="https://www.bs.ch/daten/databs/dcc">DCC Website</a>
</p>

---

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

## DCC Documentation
For detailed documentation on the DCC project, please refer to the [DCC Documentation](https://dcc-bs.github.io/documentation/).

## Setup

### Environment Configuration

Create a `.env` file in the project root with the required environment variables:

```
# can be dev, build or prod see https://dcc-bs.github.io/documentation/dev-setup/varlock.html
APP_MODE=dev

# none or azure
AUTH_MODE=none

# if AUTH_MODE is azure set this variable too
NUXT_AZURE_AUTH_SECRET= # use openssl rand -base64 32
```

We use [varlock](https://varlock.dev) for env validation and for setting variables to a default. If you want to change the defaul or not use valock set these env variables:

```
## For building the app set these variables

# Auth Layer
# use github:DCC-BS/nuxt-layers/azure-auth for azure
# these will be autmatically infered by varlock from the AUTH_MODE
AUTH_LAYER_URI=github:DCC-BS/nuxt-layers/no-auth

# Currently the only option if you don't want to implement you own logger nuxt layer
LOGGER_LAYER_URI=github:DCC-BS/nuxt-layers/pino-logger


## For runtime set these variables

# can be deug, info, warn, error, fatal
NUXT_PUBLIC_LOGGER_LOG_LEVEL=debug

API_PORT=8000
NUXT_API_URL=http://localhost:${API_PORT}

# A Gitbub token so feedbacks can be store to a github repo as issues
NUXT_FEEDBACK_GITHUB_TOKEN=

# When true no request will be send to the backend and dummy data will be used
DUMMY=false

# Can be debug, trace, info, warn, error, fatal
LOG_LEVEL=debug

# When auth mode is azure
NUXT_AZURE_AUTH_ORIGIN="http://localhost:3000/api/auth"

# Defaults to get from proton pass: pass://DCC-KI/TEXTMATE_FRONTEND/AUTH_CLIENT_ID
NUXT_AZURE_AUTH_CLIENT_ID=
# Defaults to get form proton pass: pass://DCC-KI/TEXTMATE_FRONTEND/AUTH_TENANT_ID
NUXT_AZURE_AUTH_TENANT_ID=
# Defaults to get form proton pass: pass://DCC-KI/TEXTMATE_FRONTEND/AUTH_CLIENT_SECRET
NUXT_AZURE_AUTH_CLIENT_SECRET=
# Defaults to get form proton pass: pass://DCC-KI/TEXTMATE_FRONTEND/AUTH_API_CLIENT_ID
NUXT_AZURE_AUTH_API_CLIENT_ID=
```

### Install Dependencies

Make sure to install dependencies using Bun:

```bash
bun install
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

Create a `.env.backend` file in the `docker/` directory with the required environment variables:

```
LLM_API_PORT=8001

CLIENT_PORT=3000
CLIENT_URL=http://localhost:${CLIENT_PORT}
OPENAI_API_BASE_URL=http://vllm_qwen25_32b:${LLM_API_PORT}/v1
OPENAI_API_KEY=none
LLM_MODEL=Qwen/Qwen2.5-32B-Instruct-GPTQ-Int4

LANGUAGE_TOOL_PORT=8010
LANGUAGE_TOOL_API_URL=http://languagetool:${LANGUAGE_TOOL_PORT}/v2
LANGUAGE_TOOL_CACHE_DIR=~/.cache/languagetool

HF_AUTH_TOKEN=your_hugging_face_token
HUGGING_FACE_CACHE_DIR=~/.cache/huggingface
```

> **Note:** The `HF_AUTH_TOKEN` is required for Hugging Face API access. You can create a token [here](https://huggingface.co/settings/tokens).

#### Docker Management

The project includes configurable scripts for managing Docker containers with flexible environment variable loading:

```bash
# Start backend containers
bun run docker:up

# Stop backend containers
bun run docker:down
```

#### Custom Environment Loading

The Docker scripts support customizable environment variable loading methods:

- **Default**: Uses `source` to load `.env` and `docker/.env.backend` files
- **Custom**: Configure alternative methods (e.g., dotenvx, pass-cli) for encrypted secrets

To customize the environment loading:

1. Copy the example configuration:
   ```bash
   cp scripts/docker/docker.config.sh.example scripts/docker/docker.config.sh
   ```

2. Edit `scripts/docker/docker.config.sh` to define your `load_env()` function:
   ```bash
   function envx() {
       pass-cli run --env-file .env.keys -- dotenvx "$@"
   }

   function load_env() {
       # Example with dotenvx for encrypted .env files
       envx run -f .env docker/.env.backend -- "$@"
   }
    ```

The `scripts/docker/docker.config.sh` file is gitignored, allowing team members to use their own configuration while sharing a working default setup.

See [scripts/docker/README.md](scripts/docker/README.md) for detailed documentation.

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

The application includes a multi-stage Dockerfile for production deployment.

### Docker Build Arguments

The Dockerfile accepts the following build-time arguments to configure Nuxt layers:

| Argument | Default | Description |
|----------|---------|-------------|
| `AUTH_LAYER_URI` | `github:DCC-BS/nuxt-layers/azure-auth` | Authentication layer implementation. Use `github:DCC-BS/nuxt-layers/no-auth` for development without Azure AD. |
| `LOGGER_LAYER_URI` | `github:DCC-BS/nuxt-layers/pino-logger` | Logging layer implementation. |

These are resolved during `nuxt build` and must be passed as build arguments:

```bash
# Build with default auth (Azure AD)
docker build -t text-mate-frontend .

# Build with no-auth for development
docker build --build-arg AUTH_LAYER_URI=github:DCC-BS/nuxt-layers/no-auth -t text-mate-frontend .

# Run the container
docker run -p 3000:3000 text-mate-frontend
```

For more details, see the [Auth Layer](https://dcc-bs.github.io/documentation/nuxt-layers/auth.html) and [Logger Layer](https://dcc-bs.github.io/documentation/nuxt-layers/logger.html) documentation.

## License

[MIT](LICENSE) © Data Competence Center Basel-Stadt

<a href="https://www.bs.ch/schwerpunkte/daten/databs/schwerpunkte/datenwissenschaften-und-ki"><img src="https://github.com/DCC-BS/.github/blob/main/_imgs/databs_log.png?raw=true" alt="DCC Logo" width="200" /></a>

Datenwissenschaften und KI <br>
Developed with ❤️ by DCC - Data Competence Center
