import { Readable } from "node:stream";
import type { ReadableStream } from "node:stream/web";

export default defineEventHandler(async (event) => {
    const config = useRuntimeConfig();

    const name = getRouterParam(event, "name");
    const response = await fetch(`${config.public.apiUrl}/advisor/doc/${name}`);

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
