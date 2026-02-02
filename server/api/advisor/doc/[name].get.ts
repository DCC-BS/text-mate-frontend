import type { FetcherOptions } from "#layers/backend_communication/server/types/fetcher";

export default apiHandler
    .withMethod("GET")
    .withRawFetcher()
    .withDummyFetcher(dummyFetch)
    .build("/advisor/doc/[r:name]");

// DUMMY

function dummyFetch(options: FetcherOptions<unknown>) {
    const name = getRouterParam(options.event, "name");

    const dummyPdfContent =
        "%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n/Contents 4 0 R\n>>\nendobj\n4 0 obj\n<<\n/Length 44\n>>\nstream\nBT\n/F1 12 Tf\n100 700 Td\n(Dummy PDF) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\n0000000210 00000 n\ntrailer\n<<\n/Size 5\n/Root 1 0 R\n>>\nstartxref\n275\n%%EOF";
    return new Response(dummyPdfContent, {
        headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${name}.pdf"`,
        },
    });
}
