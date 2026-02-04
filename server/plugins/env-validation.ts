import { validateRuntimeEnv } from "#shared/types/env";

export default defineNitroPlugin(() => {
    const runtimeConfig = useRuntimeConfig();

    validateRuntimeEnv(runtimeConfig);
});
