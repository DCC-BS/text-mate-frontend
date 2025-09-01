export type FetchOptions = Omit<RequestInit, "body"> & {
    body?: object | FormData;
};
export type ErrorId = "unexpected_error" | "fetch_failed" | string;
export type ApiResponse<T extends object> = T | ApiError;

export class ApiError extends Error {
    $type = "ApiError" as const;
    errorId: ErrorId;
    debugMessage?: string;
    status: number;

    constructor(errorId: ErrorId, status: number, debugMessage?: string) {
        super(`API Error: ${errorId} (status: ${status})`);
        this.errorId = errorId;
        this.status = status;
        this.debugMessage = debugMessage;
    }
}

export function isApiError(response: unknown): response is ApiError {
    return (
        typeof response === "object" &&
        response !== null &&
        "$type" in response &&
        response.$type === "ApiError"
    );
}

async function extractApiError(response: Response): Promise<ApiError> {
    try {
        const data = await response.json();

        return new ApiError(
            data.errorId ?? "unexpected_error",
            response.status,
            data.debugMessage ?? JSON.stringify(data),
        );
    } catch (_) {
        return new ApiError("unexpected_error", response.status);
    }
}

async function _fetch(url: string, options: FetchOptions) {
    const isFormData = options.body instanceof FormData;

    // Define headers with an index signature so properties are optional
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(options.headers as Record<string, string>),
    };

    // Remove Content-Type if body is FormData
    if (isFormData) {
        delete headers["Content-Type"];
    }

    return await fetch(url, {
        ...options,
        body: isFormData
            ? (options.body as FormData)
            : JSON.stringify(options.body),
        headers: headers,
    });
}

export async function apiFetch<T extends object>(
    url: string,
    options?: FetchOptions,
): Promise<ApiResponse<T>> {
    try {
        const response = await _fetch(url, options ?? {});

        if (response.ok) {
            const data = await response.json();
            return data as T;
        }

        return extractApiError(response);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return new ApiError("fetch_failed", 500, message);
    }
}

export async function apiStreamfetch(
    url: string,
    options?: FetchOptions,
): Promise<ApiResponse<ReadableStream<Uint8Array>>> {
    const response = await _fetch(url, options ?? {});

    if (response.ok) {
        return response.body as ReadableStream<Uint8Array>;
    }

    return extractApiError(response);
}
