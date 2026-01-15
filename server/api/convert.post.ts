export default apiHandler
    .withMethod("POST")
    .withBodyProvider<{ file: File }>(async (event) => {
        const inputFormData = await readFormData(event);
        const file = inputFormData.get("file") as File;
        if (!file || !(file instanceof File)) {
            throw createError({
                statusCode: 400,
                statusMessage: "File is required and must be a valid file",
            });
        }

        return { file };
    })
    .withDummyFetcher({
        html: "<h1> Dummy </h1> <p>This is a dummy response</p>",
        statusMessage: "",
    })
    .build("/convert/doc");
