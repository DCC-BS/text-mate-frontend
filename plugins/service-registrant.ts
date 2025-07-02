export default defineNuxtPlugin((nuxtApp) => {
    const orchestrator = new ServiceOrchestrator();

    // the setup will be lazily called the first time a
    // service is resolved, ensuring services are created
    // in the Vue component lifecycle or setup context.
    orchestrator.setup((builder) => {
        const logger = useLogger();
        const { t } = useI18n(); // this needs to be created in the setup context

        builder.registerInstance("translate", t);
        builder.registerInstance("logger", logger);

        // builder.register(DatabaseService);
        // builder.register(UserRepository);
        // builder.register(UserService);

        // // Register a service factory, which allows creating instances with custom parameters
        // // you can mix injected services and custom parameters,
        // // but the injected services must be before the custom parameters in the factory function
        // builder.registerFactory(
        //     "ServiceWithFactory",
        //     (injected1, param1, param2) => {
        //         return new SomeService(injected1, param1, param2);
        //     },
        // );

        // builder.registerFactoryAsync(
        //     "AsyncService",
        //     async (injected1, param1, param2) => {
        //         const result = await fetchSomeData(injected1, param1, param2);
        //         return new AsyncService(result);
        //     },
        // );
    });

    nuxtApp.provide("serviceOrchestrator", orchestrator);
});
