import { z } from "zod";

const buildTimeSchema = z
    .object({
        AUTH_LAYER_URI: z
            .string()
            .optional()
            .default("github:DCC-BS/nuxt-layers/azure-auth")
            .describe(
                "Auth layer URI (build-time only, e.g., github:DCC-BS/nuxt-layers/azure-auth)",
            ),
        AUTH_ORIGIN: z
            .url()
            .optional()
            .default("http://localhost:3000/api/auth")
            .describe(
                "Auth origin (build-time only, e.g., http://localhost:3000/api/auth)",
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
            .string()
            .url()
            .optional()
            .describe("API base URL (default: http://localhost:8000)"),
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
        NUXT_AUTH_AZURE_AD_CLIENT_ID: z
            .string()
            .min(1)
            .optional()
            .describe("Azure AD client ID"),
        NUXT_AUTH_AZURE_AD_TENANT_ID: z
            .string()
            .min(1)
            .optional()
            .describe("Azure AD tenant ID"),
        NUXT_AUTH_AZURE_AD_CLIENT_SECRET: z
            .string()
            .min(1)
            .optional()
            .describe("Azure AD client secret"),
        NUXT_AUTH_AZURE_AD_API_CLIENT_ID: z
            .string()
            .min(1)
            .optional()
            .describe("Azure AD API client ID"),
        LOG_LEVEL: z
            .enum(["trace", "debug", "info", "warn", "error", "fatal"])
            .default("debug")
            .describe("Logger level (default: debug)"),
        DUMMY: z.string().optional().describe("Use dummy data (set to 'true')"),
    })
    .strict();

export type RuntimeEnv = z.infer<typeof runtimeSchema>;
export type BuildTimeEnv = z.infer<typeof buildTimeSchema>;

function extractDefaults(schema: z.ZodObject<any>): Record<string, unknown> {
    const defaults: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(schema.shape)) {
        if (value instanceof z.ZodDefault) {
            const defaultValue = value._def.defaultValue;
            defaults[key] =
                typeof defaultValue === "function"
                    ? defaultValue()
                    : defaultValue;
        } else if (value instanceof z.ZodOptional) {
            const innerValue = (value as z.ZodOptional<any>)._def.innerType;
            if (innerValue instanceof z.ZodDefault) {
                const defaultValue = innerValue._def.defaultValue;
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
