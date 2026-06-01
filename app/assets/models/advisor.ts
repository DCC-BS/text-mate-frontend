export type AdvisorDocumentDescription = {
    title: string;
    description: string;
    author: string;
    edition: string;
    id: string;
    files: string[];
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
    collection: string;
};

export type ValidationResult = {
    rules: AdvisorRuleViolation[];
    checked?: number;
    total?: number;
};
