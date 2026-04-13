import {
  BOLD_ITALIC_STAR,
  BOLD_ITALIC_UNDERSCORE,
  BOLD_STAR,
  BOLD_UNDERSCORE,
  CHECK_LIST,
  INLINE_CODE,
  ITALIC_STAR,
  ITALIC_UNDERSCORE,
  STRIKETHROUGH,
  HEADING,
  QUOTE,
  ORDERED_LIST,
  UNORDERED_LIST,
  CODE,
  LINK,
  type Transformer,
  type MultilineElementTransformer,
} from "@lexical/markdown";
import { HorizontalRuleNode } from "@lexical/react/LexicalHorizontalRuleNode";
import type { ElementTransformer } from "@lexical/markdown";
import {
  $createHorizontalRuleNode,
  $isHorizontalRuleNode,
} from "@lexical/react/LexicalHorizontalRuleNode";
import {
  $createTableNode,
  $createTableRowNode,
  $createTableCellNode,
  $isTableNode,
  $isTableRowNode,
  $isTableCellNode,
  TableNode,
  TableRowNode,
  TableCellNode,
  TableCellHeaderStates,
} from "@lexical/table";
import { $createTextNode, type ElementNode } from "lexical";

const HR: ElementTransformer = {
  dependencies: [HorizontalRuleNode],
  export: (node) => {
    return $isHorizontalRuleNode(node) ? "---" : null;
  },
  regExp: /^(---|\*\*\*|___)\s?$/,
  replace: (parentNode, _children, _match, isImport) => {
    const node = $createHorizontalRuleNode();
    parentNode.replace(node);
    if (isImport) {
      node.selectNext();
    }
  },
  type: "element",
};

const TABLE_ROW_RE = /^\|(.+)\|\s*$/;
const TABLE_SEPARATOR_RE = /^\|[\s:]*-{2,}[\s:]*(\|[\s:]*-{2,}[\s:]*)*\|\s*$/;

function parseCells(row: string): string[] {
  return row
    .split("|")
    .slice(1, -1)
    .map((cell) => cell.trim());
}

const TABLE: MultilineElementTransformer = {
  dependencies: [TableNode, TableRowNode, TableCellNode],
  export: (node) => {
    if (!$isTableNode(node)) return null;

    const rows = node.getChildren();
    if (rows.length === 0) return null;

    const lines: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!$isTableRowNode(row)) continue;

      const cells = row.getChildren();
      const cellTexts = cells.map((cell) => {
        if (!$isTableCellNode(cell)) return "";
        return cell.getTextContent().replace(/\n/g, " ").trim();
      });

      lines.push(`| ${cellTexts.join(" | ")} |`);

      if (i === 0) {
        lines.push(`| ${cellTexts.map(() => "---").join(" | ")} |`);
      }
    }

    return lines.join("\n");
  },
  regExpStart: TABLE_ROW_RE,
  handleImportAfterStartMatch: ({ lines, rootNode, startLineIndex, startMatch }) => {
    // We need: header (startMatch), separator (next line), then data rows
    const headerLine = lines[startLineIndex];
    const separatorLine = lines[startLineIndex + 1];

    if (!separatorLine || !TABLE_SEPARATOR_RE.test(separatorLine)) {
      return null; // Not a table, let other transformers handle it
    }

    const headerCells = parseCells(headerLine);

    // Collect data rows
    const dataRows: string[][] = [];
    let endLine = startLineIndex + 2;
    while (endLine < lines.length && TABLE_ROW_RE.test(lines[endLine])) {
      dataRows.push(parseCells(lines[endLine]));
      endLine++;
    }

    // Build the table
    const table = $createTableNode();

    const headerRow = $createTableRowNode();
    for (const cellText of headerCells) {
      const cell = $createTableCellNode(TableCellHeaderStates.ROW);
      cell.append($createTextNode(cellText));
      headerRow.append(cell);
    }
    table.append(headerRow);

    for (const cells of dataRows) {
      const row = $createTableRowNode();
      for (let i = 0; i < headerCells.length; i++) {
        const cell = $createTableCellNode(TableCellHeaderStates.NO_STATUS);
        cell.append($createTextNode(cells[i] || ""));
        row.append(cell);
      }
      table.append(row);
    }

    rootNode.append(table);

    return [true, endLine - 1];
  },
  replace: () => {
    // Not used — handleImportAfterStartMatch handles import.
    // This is only called for markdown shortcut transforms (typing in editor),
    // which we don't support for tables.
    return false;
  },
  type: "multiline-element",
};

export const TRANSFORMERS: Transformer[] = [
  TABLE,
  HEADING,
  QUOTE,
  CODE,
  CHECK_LIST,
  UNORDERED_LIST,
  ORDERED_LIST,
  HR,
  BOLD_ITALIC_STAR,
  BOLD_ITALIC_UNDERSCORE,
  BOLD_STAR,
  BOLD_UNDERSCORE,
  INLINE_CODE,
  ITALIC_STAR,
  ITALIC_UNDERSCORE,
  STRIKETHROUGH,
  LINK,
];
