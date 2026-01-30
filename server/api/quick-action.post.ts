import type { FetcherOptions } from "#layers/backend_communication/server/types/fetcher";
import type { TextActions } from "#shared/text-actions";

type BodyType = {
    action: TextActions;
    options: string;
    text: string;
};

export default apiHandler
    .withMethod("POST")
    .withBodyProvider<BodyType>()
    .withRawFetcher()
    .withDummyFetcher(dummyFetcher)
    .build("/quick-action");

// DUMMY

function dummyFetcher(options: FetcherOptions<BodyType>) {
    const body = options.body;

    // Dummy text to stream word by word
    let dummyText = "";
    switch (body.action) {
        case "plain_language":
            dummyText =
                "This is a dummy streaming response that returns one word at a time to demonstrate the functionality of server-sent events in this Nuxt application.";
            break;
        default:
            dummyText = `Action: ${body.action}, Input: ${body.text}, Options: ${body.options}`;
            break;
    }

    const words = dummyText.split(" ");

    // Create a readable stream
    const stream = new ReadableStream({
        async start(controller) {
            try {
                for (let i = 0; i < words.length; i++) {
                    const word = words[i];
                    const isLastWord = i === words.length - 1;

                    // Send the word
                    controller.enqueue(new TextEncoder().encode(word));

                    // Add space unless it's the last word
                    if (!isLastWord) {
                        controller.enqueue(new TextEncoder().encode(" "));
                    }

                    // Small delay to simulate streaming
                    await new Promise((resolve) => setTimeout(resolve, 100));
                }

                controller.close();
            } catch (error) {
                controller.error(error);
            }
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Transfer-Encoding": "chunked",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
        },
    });
}
