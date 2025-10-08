type AdvisorRuleViolation = {
    name: string;
    description: string;
    file_name: string;
    page_number: number;
    example: string;
    reason: string;
    proposal: string;
    source: string;
};

type ValidationResult = {
    rules: AdvisorRuleViolation[];
};

export default defineEventHandler((_) => {
    return {
        rules: [
            {
                name: "Example Rule",
                description: "Some desc",
                example: "Some example",
                file_name: "example.pdf",
                page_number: 1,
                proposal: "Dummy proposal",
                reason: "Dummy reason",
                source: "example.pdf",
            },
        ],
    } as ValidationResult;
});
