export default defineNitroPlugin((nitroApp) => {
    if (process.dev) {
        return;
    }

    console.log('App started');

    const config = useRuntimeConfig();

    console.log('Runtime config', config);
});
