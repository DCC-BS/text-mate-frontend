export default defineNitroPlugin(() => {
    if (import.meta.dev) {
        return;
    }

    console.log('App started');

    const config = useRuntimeConfig();

    console.log('Runtime config', config);
});
