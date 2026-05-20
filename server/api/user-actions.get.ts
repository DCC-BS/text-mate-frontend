import type { FetcherOptions } from "#layers/backend_communication/server/types/fetcher";
import type { TextActionGetOutput } from "~~/shared/text-actions";

export default apiHandler
    .withMethod("GET")
    .withDummyFetcher(dummyFetcher)
    .build("/user-action");

function dummyFetcher(_: FetcherOptions<unknown>): TextActionGetOutput {
    return {
        actions: [
            {
                id: "dummy",
                name: "Dummy",
            },
        ],
    };
}
