import type { JSONContent } from "@tiptap/core";
import {
    AlignmentType,
    Document,
    ExternalHyperlink,
    type INumberingOptions,
    type IRunOptions,
    LevelFormat,
    Packer,
    Paragraph,
    type ParagraphChild,
    TextRun,
} from "docx";
import type { WordExportSettings } from "~/types/wordExport";
import { safeWordLink } from "~/utils/wordExportLinks";
import { wordExportSettingsSchema } from "~/utils/wordExportSettings";

/** Tiptap stores CSS sizes; Word stores half-points. */
function halfPoints(value: unknown): number | undefined {
    if (typeof value !== "string") return undefined;
    const match = /^(\d+(?:\.\d+)?)(pt|px)$/.exec(value);
    if (!match) return undefined;
    const points = Number(match[1]) * (match[2] === "px" ? 0.75 : 1);
    return points >= 1 && points <= 400 ? Math.round(points * 2) : undefined;
}

/** Serialize semantic marks only; advisor and focus marks are deliberately ignored. */
function inlineChildren(node: JSONContent): ParagraphChild[] {
    const children: ParagraphChild[] = [];
    for (const child of node.content ?? []) {
        if (child.type === "hardBreak") {
            children.push(new TextRun({ break: 1 }));
            continue;
        }
        if (child.type !== "text")
            throw new Error(`Unsupported inline node: ${child.type}`);
        const options: { -readonly [K in keyof IRunOptions]: IRunOptions[K] } =
            { text: child.text ?? "" };
        let link: string | undefined;
        for (const mark of child.marks ?? []) {
            switch (mark.type) {
                case "bold":
                    options.bold = true;
                    break;
                case "italic":
                    options.italics = true;
                    break;
                case "underline":
                    options.underline = {};
                    break;
                case "strike":
                    options.strike = true;
                    break;
                case "link":
                    link = safeWordLink(mark.attrs?.href);
                    break;
                case "textStyle": {
                    const font: unknown = mark.attrs?.fontFamily;
                    if (typeof font === "string" && font.trim())
                        options.font = font;
                    options.size = halfPoints(mark.attrs?.fontSize);
                    break;
                }
            }
        }
        const run = new TextRun(options);
        children.push(
            link ? new ExternalHyperlink({ link, children: [run] }) : run,
        );
    }
    return children;
}

/** Build editable Word styles and numbering directly from the current editor JSON. */
export async function tiptapToDocx(
    json: JSONContent,
    input: WordExportSettings,
): Promise<Blob> {
    const settings = wordExportSettingsSchema.parse(input);
    if (json.type !== "doc") throw new Error("Expected a Tiptap document");
    const paragraphs: Paragraph[] = [];
    const numbering: INumberingOptions["config"][number][] = [];
    let nextList = 0;

    function paragraph(
        node: JSONContent,
        reference?: string,
        depth = 0,
        continuation = false,
    ): void {
        const level: unknown = node.attrs?.level;
        const heading =
            node.type === "heading" &&
            (level === 1 || level === 2 || level === 3)
                ? level
                : undefined;
        paragraphs.push(
            new Paragraph({
                style: heading
                    ? `Heading${heading}`
                    : reference
                      ? "ListParagraph"
                      : "Normal",
                children: inlineChildren(node),
                numbering:
                    reference && !continuation
                        ? { reference, level: Math.min(depth, 8) }
                        : undefined,
                indent:
                    reference && continuation
                        ? { left: 720 * (depth + 1) }
                        : undefined,
            }),
        );
    }

    function walk(
        nodes: JSONContent[],
        depth: number,
        orderedDepth = 0,
        bulletDepth = 0,
    ): void {
        for (const node of nodes) {
            if (node.type === "paragraph" || node.type === "heading") {
                paragraph(node);
            } else if (
                node.type === "bulletList" ||
                node.type === "orderedList"
            ) {
                const reference = `list-${nextList++}`;
                const ordered = node.type === "orderedList";
                const start: unknown = node.attrs?.start;
                const levels = [];
                for (let level = 0; level < 9; level++) {
                    levels.push({
                        level,
                        format: ordered
                            ? orderedDepth === 0
                                ? LevelFormat.DECIMAL
                                : orderedDepth === 1
                                  ? LevelFormat.LOWER_LETTER
                                  : LevelFormat.LOWER_ROMAN
                            : LevelFormat.BULLET,
                        text: ordered
                            ? `%${level + 1}.`
                            : bulletDepth === 0
                              ? "•"
                              : bulletDepth === 1
                                ? "○"
                                : "▪",
                        start:
                            ordered &&
                            typeof start === "number" &&
                            Number.isInteger(start) &&
                            start > 0
                                ? start
                                : 1,
                        alignment: AlignmentType.START,
                        style: {
                            paragraph: {
                                indent: {
                                    left: 720 * (level + 1),
                                    hanging: 360,
                                },
                            },
                        },
                    });
                }
                numbering.push({ reference, levels });
                for (const item of node.content ?? []) {
                    if (item.type !== "listItem")
                        throw new Error("Invalid list item");
                    let continuation = false;
                    for (const block of item.content ?? []) {
                        if (
                            block.type === "paragraph" ||
                            block.type === "heading"
                        ) {
                            paragraph(block, reference, depth, continuation);
                            continuation = true;
                        } else {
                            walk(
                                [block],
                                depth + 1,
                                orderedDepth + (ordered ? 1 : 0),
                                bulletDepth + (ordered ? 0 : 1),
                            );
                        }
                    }
                }
            } else {
                // Never silently download a file with missing unsupported content.
                throw new Error(`Unsupported document node: ${node.type}`);
            }
        }
    }
    walk(json.content ?? [], 0);
    const normalRun = {
        font: settings.fontFamily,
        size: settings.fontSize * 2,
        language: { value: settings.language },
    };
    const spacing = { line: Math.round(settings.lineSpacing * 240), after: 0 };
    const side =
        settings.marginPreset === "narrow"
            ? 720
            : settings.marginPreset === "wide"
              ? 2880
              : 1440;
    const vertical = settings.marginPreset === "narrow" ? 720 : 1440;
    const document = new Document({
        styles: {
            default: { document: { run: normalRun, paragraph: { spacing } } },
            paragraphStyles: [
                {
                    id: "Normal",
                    name: "Normal",
                    run: normalRun,
                    paragraph: { spacing },
                },
                ...[1, 2, 3].map(function headingStyle(level) {
                    return {
                        id: `Heading${level}`,
                        name: `Heading ${level}`,
                        basedOn: "Normal",
                        next: "Normal",
                        quickFormat: true,
                        run: {
                            font: settings.fontFamily,
                            size: (20 - level * 2) * 2,
                            bold: true,
                        },
                        paragraph: {
                            outlineLevel: level - 1,
                            keepNext: true,
                            spacing: { ...spacing, before: 240, after: 200 },
                        },
                    };
                }),
                {
                    id: "ListParagraph",
                    name: "List Paragraph",
                    basedOn: "Normal",
                    next: "ListParagraph",
                },
            ],
        },
        numbering: { config: numbering },
        sections: [
            {
                properties: {
                    page: {
                        size: { width: 11906, height: 16838 },
                        margin: {
                            top: vertical,
                            bottom: vertical,
                            left: side,
                            right: side,
                        },
                    },
                },
                children: paragraphs.length
                    ? paragraphs
                    : [new Paragraph({ style: "Normal" })],
            },
        ],
    });
    return await Packer.toBlob(document);
}
