type RibbonSharedProps = {
    /** True while a stream/diff is in progress — disables all actions. */
    busy: boolean;
    /** True while the editor accepts edits. */
    editable: boolean;
};

export type RibbonTransformProps = {
    /** Current Working Text, sent to the backend with each transform action. */
    text: string;
} & RibbonSharedProps;

export type RibbonValidateProps = {
    text: string;
    selectedDocs: string[];
    maxDocs: number;
    toFixCount: number;
} & RibbonSharedProps;

export type RibbonProps = RibbonTransformProps & RibbonValidateProps;
