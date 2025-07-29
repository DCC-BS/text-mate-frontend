export type TextRewriteResponse = {
    rewritten_text: string;
};

export type RewriteApplyOptions = {
    from: number;
    to: number;
    options: string[];
};
