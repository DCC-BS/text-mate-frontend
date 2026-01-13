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
    .withFetcher(async ({ url, method, body, headers }) => {
        const formData = new FormData();

        formData.append("file", body.file, body.file.name);

        // remove Content-Type
        delete headers["Content-Type"];

        const response = await fetch(url, {
            method,
            body: formData,
            headers,
        });

        if (!response.ok) {
            throw createError({
                statusCode: 400,
                statusMessage: "Failed to convert file",
            });
        }

        return response.json();
    })
    .build("/convert/doc");
