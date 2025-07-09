import AzureADProvider from "next-auth/providers/azure-ad";
import { NuxtAuthHandler } from "#auth";

// Interface for Azure AD profile data
interface AzureADProfile {
    sub?: string;
    oid?: string;
    email?: string;
    name?: string;
    image?: string;
    roles?: string[];
}

// Interface for extended token with expiration info and profile data
interface ExtendedToken extends Record<string, unknown> {
    idToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    provider?: string;
    error?: string;
    // Azure AD profile data
    sub?: string;
    email?: string;
    name?: string;
    image?: string;
    roles?: string[];
}

export default NuxtAuthHandler({
    secret: useRuntimeConfig().authSecret,
    pages: {
        signIn: "/auth/signin",
    },
    providers: [
        // @ts-expect-error You need to use .default here for it to work during SSR. May be fixed via Vite at some point
        AzureADProvider.default({
            clientId: useRuntimeConfig().azureAdClientId,
            clientSecret: useRuntimeConfig().azureAdClientSecret,
            tenantId: useRuntimeConfig().azureAdTenantId,
            authorization: {
                params: {
                    scope: "openid email profile User.Read",
                },
            },
        }),
    ],
    callbacks: {
        async jwt({ token, account, profile }) {
            const extendedToken = token as ExtendedToken;

            // Initial sign in
            if (account && profile) {
                extendedToken.idToken = account.id_token;
                extendedToken.accessToken = account.access_token;
                extendedToken.refreshToken = account.refresh_token;
                extendedToken.provider = account.provider;

                // Inject Azure AD profile data into JWT token
                const azureProfile = profile as AzureADProfile;
                extendedToken.sub = azureProfile.sub || azureProfile.oid; // Azure AD uses 'oid' for user ID
                extendedToken.email = azureProfile.email;
                extendedToken.name = azureProfile.name;
                // Azure AD roles come from the 'roles' claim
                extendedToken.roles = azureProfile.roles || [];

                return extendedToken;
            }
            return {
                ...extendedToken,
                error: "RefreshAccessTokenError",
            };
        },
    },
});
