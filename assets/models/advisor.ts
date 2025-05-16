export type AdvidorDocumentDescription = {
    title: string;
    description: string;
    author: string;
    edition: string;
    file: string;
};

export type AdvisorRuleViolation = {
    name: string;
    description: string;
    file_name: string;
    page_number: number;
    example: string;
    reason: string;
    proposal: string;
    source: string;
};

export type ValidationResult = {
    rules: AdvisorRuleViolation[];
};
