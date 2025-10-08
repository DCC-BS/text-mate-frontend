type ConversionResult = {
    html: string;
    statusMessage?: string;
};

export default defineEventHandler((_) => {
    return {
        html: "<h1> Dummy </h1> <p>This is a dummy response</p>",
        statusMessage: "",
    } as ConversionResult;
});
