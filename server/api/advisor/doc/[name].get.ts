import { Readable } from "node:stream";
import type { ReadableStream } from "node:stream/web";

export default defineEventHandler(async (event) => {
    const name = getRouterParam(event, "name");

    const handler = apiHandler
        .withMethod("GET")
        .withFetcher(async (options) => {
            const { url, method, body, headers } = options;
            return await fetch(url, {
                method,
                body: JSON.stringify(body),
                headers,
            });
        })
        .build(`/advisor/doc/${name}`);

    const response = await handler(event);

    // Convert Web ReadableStream to Node.js Readable
    const webStream = response.body as ReadableStream;
    if (!webStream) {
        throw createError({ statusCode: 404 });
    }

    const nodeStream = Readable.fromWeb(webStream);

    // Set appropriate headers
    event.node.res.setHeader(
        "Content-Type",
        response.headers.get("content-type") || "application/pdf",
    );
    event.node.res.setHeader(
        "Content-Disposition",
        response.headers.get("content-disposition") || "attachment",
    );

    return nodeStream.pipe(event.node.res);
});
