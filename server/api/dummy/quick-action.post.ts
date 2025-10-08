export default defineEventHandler(async (event) => {
    // Set headers for streaming response
    setHeader(event, "Content-Type", "text/plain; charset=utf-8");
    setHeader(event, "Transfer-Encoding", "chunked");
    setHeader(event, "Cache-Control", "no-cache");
    setHeader(event, "Connection", "keep-alive");

    // Dummy text to stream word by word
    const dummyText =
        "This is a dummy streaming response that returns one word at a time to demonstrate the functionality of server-sent events in this Nuxt application.";
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

    return stream;
});
