# Stage 1: Build the application
FROM node:23-alpine AS build

ARG DCC_BS_TOKEN

# Set the environment variable based on which token is available
# First try DCC_BS_TOKEN, if not available use GITHUB_TOKEN
RUN if [ -n "$DCC_BS_TOKEN" ]; then \
    export DCC_BS_TOKEN=$DCC_BS_TOKEN; \
    elif [ -n "$GITHUB_TOKEN" ]; then \
    export GITHUB_TOKEN=$GITHUB_TOKEN; \
    fi

# Install bun
RUN npm install -g bun

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY ./package*.json ./

# Install dependencies using bun
RUN bun install

# Copy the rest of the application code
COPY . .

# Build the application
RUN bun x nuxi prepare
RUN bun x nuxi build

# Stage 2: Run the application
FROM node:23-alpine

# Set the working directory
WORKDIR /app

# Copy the built application from the build stage
COPY --from=build /app/.output ./

# Expose the port the app runs on
EXPOSE 3000

# Start the application
ENTRYPOINT ["node", "./server/index.mjs"]
