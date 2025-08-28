const filter_secrets = (str: string) => {
    const secrets = ["githubToken"];
    return secrets.reduce((acc, secret) => {
        return acc.replace(
            new RegExp(`"${secret}":"([^"]+)"`, "g"),
            `"${secret}":"********"`,
        );
    }, str);
};


export default defineNitroPlugin(() => {
    if (import.meta.dev) {
        return;
    }

    console.log("App started");

    const config = useRuntimeConfig();

    console.log("Runtime config", filter_secrets(JSON.stringify(config)));
});
