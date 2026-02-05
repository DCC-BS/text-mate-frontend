import { z } from "zod";

const buildTimeSchema = z
    .object({
        AUTH_LAYER_URI: z
            .string()
            .optional()
            .default("github:DCC-BS/nuxt-layers/azure-auth")
            .describe(
                "Auth layer URI (build-time only, use github:DCC-BS/nuxt-layers/no-auth to disable auth)",
            ),

        LOGGER_LAYER_URI: z
            .string()
            .optional()
            .default("github:DCC-BS/nuxt-layers/pino-logger")
            .describe(
                "Logger layer URI (build-time only, e.g., github:DCC-BS/nuxt-layers/pino-logger)",
            ),
    })
    .strict();

const runtimeSchema = z
    .object({
        API_URL: z
            .url()
            .optional()
            .default("http://localhost:8000")
            .describe("API base URL"),
        FEEDBACK_GITHUB_TOKEN: z
            .string()
            .min(1)
            .optional()
            .describe("GitHub token for feedback feature"),
        NUXT_AUTH_SECRET: z
            .string()
            .min(1)
            .optional()
            .describe(
                "Auth secret for session encryption (generate with: openssl rand -base64 32)",
            ),
        NUXT_AZURE_AUTH_CLIENT_ID: z
            .string()
            .min(1)
            .optional()
            .describe("Azure AD client ID"),
        NUXT_AZURE_AUTH_TENANT_ID: z
            .string()
            .min(1)
            .optional()
            .describe("Azure AD tenant ID"),
        NUXT_AZURE_AUTH_AZURE_CLIENT_SECRET: z
            .string()
            .min(1)
            .optional()
            .describe("Azure AD client secret"),
        NUXT_AZURE_AUTH_AZURE_API_CLIENT_ID: z
            .string()
            .min(1)
            .optional()
            .describe("Azure AD API client ID"),
        NUXT_AZURE_AUTH_ORIGIN: z
            .url()
            .optional()
            .describe("Origin URL for Azure AD authentication"),
        LOG_LEVEL: z
            .enum(["trace", "debug", "info", "warn", "error", "fatal"])
            .default("debug")
            .describe("Logger level (default: debug)"),
        DUMMY: z
            .string()
            .optional()
            .default("false")
            .describe("Use dummy data (default: false)"),
    })
    .strict();

export type RuntimeEnv = z.infer<typeof runtimeSchema>;
export type BuildTimeEnv = z.infer<typeof buildTimeSchema>;

function extractDefaults(schema: z.ZodObject<any>): Record<string, unknown> {
    const defaults: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(schema.shape)) {
        if (value instanceof z.ZodDefault) {
            const defaultValue = value.def.defaultValue;
            defaults[key] =
                typeof defaultValue === "function"
                    ? defaultValue()
                    : defaultValue;
        } else if (value instanceof z.ZodOptional) {
            const innerValue = (value as z.ZodOptional<any>).def.innerType;
            if (innerValue instanceof z.ZodDefault) {
                const defaultValue = innerValue.def.defaultValue;
                defaults[key] =
                    typeof defaultValue === "function"
                        ? defaultValue()
                        : defaultValue;
            } else {
                defaults[key] = "";
            }
        }
    }

    return defaults;
}

function extractDescriptions(schema: z.ZodObject<any>): Record<string, string> {
    const descriptions: Record<string, string> = {};

    for (const [key, value] of Object.entries(schema.shape)) {
        const schemaValue = value as z.ZodType<any>;
        const description = (schemaValue as any).description;
        if (typeof description === "string") {
            descriptions[key] = description;
        }
    }

    return descriptions;
}

export function generateEnvExample(): string {
    const buildDefaults = extractDefaults(buildTimeSchema);
    const buildDescriptions = extractDescriptions(buildTimeSchema);

    const runtimeDefaults = extractDefaults(runtimeSchema);
    const runtimeDescriptions = extractDescriptions(runtimeSchema);

    const buildEntries = Object.keys(buildTimeSchema.shape)
        .map((key) => {
            const value = buildDefaults[key] ?? "";
            const description = buildDescriptions[key];
            const comment = description ? `# ${description}` : "";

            return `${comment}\n${key}=${value}`;
        })
        .join("\n\n");

    const runtimeEntries = Object.keys(runtimeSchema.shape)
        .map((key) => {
            const value = runtimeDefaults[key] ?? "";
            const description = runtimeDescriptions[key];
            const comment = description ? `# ${description}` : "";

            return `${comment}\n${key}=${value}`;
        })
        .join("\n\n");

    return `# Environment variables
# Generated from Zod schema - do not edit manually
# Run \`bun run generate:env-example\` to regenerate

# Build-time variables (required before Nuxt starts)

${buildEntries}

# Runtime variables (used during application execution)

${runtimeEntries}
`;
}
