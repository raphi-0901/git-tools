import TextInput from "@rwirnsberger/ink-text-input";
import { Box, Text, useInput } from "ink";
import React, { useEffect, useReducer } from "react";

export type TextAreaValue = string[];

type InkFormProps = {
    // Add an optional defaultValues prop
    defaultValue?: TextAreaValue;
    height?: number;
    onChange: (value: null | TextAreaValue) => void;
};

type EditorState = {
    cursor: number;       // column
    lastCursorPosition: number;
    lineIndex: number;    // row
    lines: string[];
    scrollTop: number;
};

type Action =
    | { char: string; type: "INSERT_CHAR"; }
    | { text: string; type: "PASTE"; }
    | { type: "BACKSPACE" }
    | { type: "DELETE" }
    | { type: "DELETE_LINE" }
    | { type: "DELETE_WORD" }
    | { type: "DOWN" }
    | { type: "LEFT" }
    | { type: "MOVE_WORD_LEFT" }
    | { type: "MOVE_WORD_RIGHT" }
    | { type: "NEWLINE" }
    | { type: "RIGHT" }
    | { type: "UP" };

export const TextArea = ({ defaultValue, height = 6, onChange }: InkFormProps) => {
    const WORD_BOUNDARY_CHARS = new Set([
        " ", "\t", "\n", "!", "\"", "#", "$", "%", "&", "'", "(", ")", "*", "+", ",", "-", ".", "/", ":", ";", "<", "=", ">", "?", "@", "[", "\\", "]", "^", "`", "{", "|", "}", "~"
    ]);

    const isWordChar = (char: string) => char !== undefined && !WORD_BOUNDARY_CHARS.has(char);
    const isSymbolChar = (char: string) => char && !isWordChar(char) && char !== " ";

    function createNewLine(state: EditorState): EditorState {
        const { cursor, lineIndex, lines } = state;

        const line = lines[lineIndex];
        const left = line.slice(0, cursor);
        const right = line.slice(cursor);

        const newLines = [
            ...lines.slice(0, lineIndex),
            left,
            right,
            ...lines.slice(lineIndex + 1)
        ];

        return {
            ...state,
            cursor: 0,
            lineIndex: lineIndex + 1,
            lines: newLines
        };
    }

    function reducer(state: EditorState, action: Action): EditorState {
        const { cursor, lineIndex, lines } = state;

        // console.log('lines :>>', lines);
        // console.log('cursor :>>', cursor);
        // console.log('lineIndex :>>', lineIndex);
        // console.log('action :>>', action);

        // set the lastCursor position to the current cursor position if the action is not a cursor movement
        if(action.type !== "DOWN" && action.type !== "UP") {
            state.lastCursorPosition = -1;
        }
        else if(state.lastCursorPosition === -1) {
            state.lastCursorPosition = cursor;
        }

        switch (action.type) {
            case "BACKSPACE": {
                const line = lines[lineIndex];

                // delete char under cursor
                if (cursor < line.length) {
                    const newLine =
                        line.slice(0, cursor) + line.slice(cursor + 1);

                    const newLines = [...lines];
                    newLines[lineIndex] = newLine;

                    return {
                        ...state,
                        lines: newLines
                    };
                }

                // merge next line
                if (lineIndex < lines.length - 1) {
                    const merged = line + lines[lineIndex + 1];

                    const newLines = [
                        ...lines.slice(0, lineIndex),
                        merged,
                        ...lines.slice(lineIndex + 2)
                    ];

                    return {
                        ...state,
                        lines: newLines
                    };
                }

                return state;
            }


            case "DELETE": {
                const line = lines[lineIndex];

                // delete inside line
                if (cursor > 0) {
                    const newLine = line.slice(0, cursor - 1) + line.slice(cursor);
                    const newLines = [...lines];
                    newLines[lineIndex] = newLine;

                    return {
                        ...state,
                        cursor: cursor - 1,
                        lines: newLines
                    };
                }

                // merge with previous line
                if (lineIndex > 0) {
                    const prev = lines[lineIndex - 1];
                    const merged = prev + line;

                    const newLines = [
                        ...lines.slice(0, lineIndex - 1),
                        merged,
                        ...lines.slice(lineIndex + 1)
                    ];

                    return {
                        ...state,
                        cursor: prev.length,
                        lineIndex: lineIndex - 1,
                        lines: newLines
                    };
                }

                return state;
            }

            case "DELETE_LINE": {
                return {
                    ...state,
                    cursor: 0,
                    lines: lines.toSpliced(lineIndex, 1)
                };
            }

            case "DELETE_WORD": {
                const line = lines[lineIndex];
                let start = cursor;

                if (start === 0) {
                    if(lineIndex === 0) {
                        return state;
                    }

                    const prev = lines[lineIndex - 1];
                    const merged = prev + line;

                    const newLines = [
                        ...lines.slice(0, lineIndex - 1),
                        merged,
                        ...lines.slice(lineIndex + 1)
                    ];

                    return {
                        ...state,
                        cursor: prev.length,
                        lineIndex: lineIndex - 1,
                        lines: newLines
                    };
                }

                while (start > 0 && line[start - 1] === " ") start--;

                if(isWordChar(line[start - 1])) {
                    while (start > 0 && isWordChar(line[start - 1])) start--;
                } else {
                    while (start > 0 && isSymbolChar(line[start - 1])) start--;
                }

                const newLine = line.slice(0, start) + line.slice(cursor);

                const newLines = [...lines];
                newLines[lineIndex] = newLine;

                return { ...state, cursor: start, lines: newLines };
            }

            case "DOWN": {
                if (lineIndex === lines.length - 1) {
                    return createNewLine(state);
                }

                const newIndex = lineIndex + 1;

                return {
                    ...state,
                    cursor: Math.min(lines[newIndex].length, state.lastCursorPosition),
                    lineIndex: newIndex
                };
            }

            case "INSERT_CHAR": {
                const insertLines = action.char.split(/\r\n|\n|\r/)
                    .map(line => line.replaceAll('\t', " ".repeat(4)));
                const currentLine = lines[lineIndex];
                const before = currentLine.slice(0, cursor);
                const after = currentLine.slice(cursor);

                if (insertLines.length === 1) {
                    const newLines = [...lines];
                    newLines[lineIndex] = before + insertLines[0] + after;

                    return {
                        ...state,
                        cursor: cursor + insertLines[0].length,
                        lines: newLines
                    };
                }

                // Multiline-Insert: Baue neues Array in einem Durchgang
                const firstLine = before + insertLines[0];
                const middleLines = insertLines.slice(1, -1);
                const lastLine = insertLines.at(-1) + after;
                const cursorPosition = lastLine.length - after.length;

                const newLines = [
                    ...lines.slice(0, lineIndex),
                    firstLine,
                    ...middleLines,
                    lastLine,
                    ...lines.slice(lineIndex + 1)
                ];

                return {
                    ...state,
                    cursor: cursorPosition,
                    lineIndex: lineIndex + insertLines.length - 1,
                    lines: newLines
                };
            }

            case "LEFT": {
                if (cursor > 0) {
                    return { ...state, cursor: cursor - 1 };
                }

                if (lineIndex > 0) {
                    const prevLine = lines[lineIndex - 1];
                    return {
                        ...state,
                        cursor: prevLine.length,
                        lineIndex: lineIndex - 1
                    };
                }

                return state;
            }

            case "MOVE_WORD_LEFT": {
                let pos = cursor;
                let idx = lineIndex;

                // If at start of line, move to end of previous line
                if (pos <= 0 && idx > 0) {
                    idx--;
                    pos = lines[idx].length;

                    return { ...state, cursor: pos, lineIndex: idx };
                }

                const line = lines[idx];

                while (pos > 0 && line[pos - 1] === " ") pos--;

                if(isWordChar(line[pos - 1])) {
                    while (pos > 0 && isWordChar(line[pos - 1])) pos--;
                } else {
                    while (pos > 0 && isSymbolChar(line[pos - 1])) pos--;
                }

                return { ...state, cursor: pos, lineIndex: idx };
            }

            case "MOVE_WORD_RIGHT": {
                let pos = cursor;
                let idx = lineIndex;
                let line = lines[idx];

                // If at end of line, move to start of next line
                if (pos >= line.length && idx < lines.length - 1) {
                    idx++;
                    pos = 0;
                    line = lines[idx];

                    return { ...state, cursor: pos, lineIndex: idx };
                }

                while (pos < line.length && line[pos] === " ") pos++;

                if(isWordChar(line[pos])) {
                    while (pos < line.length && isWordChar(line[pos])) pos++;
                } else {
                    while (pos < line.length && isSymbolChar(line[pos])) pos++;
                }

                return { ...state, cursor: pos, lineIndex: idx };
            }

            case "NEWLINE": {
                return createNewLine(state)
            }

            case "PASTE": {
                const insertedLines = action.text.split("\n");

                // special case: single-line paste
                if (insertedLines.length === 1) {
                    return reducer(state, {
                        char: action.text,
                        type: "INSERT_CHAR"
                    });
                }

                const line = lines[lineIndex];

                const before = line.slice(0, cursor);
                const after = line.slice(cursor);

                const newLines = [
                    ...lines.slice(0, lineIndex),
                    before + insertedLines[0],
                    ...insertedLines.slice(1, -1),
                    insertedLines.at(-1) + after,
                    ...lines.slice(lineIndex + 1)
                ];

                return {
                    ...state,
                    cursor:
                        insertedLines.at(-1)?.length || 0,
                    lineIndex: lineIndex + insertedLines.length - 1,
                    lines: newLines
                };
            }

            case "RIGHT": {
                const line = lines[lineIndex];
                if (cursor < line.length) {
                    return { ...state, cursor: cursor + 1 };
                }

                if (lineIndex < lines.length - 1) {
                    return {
                        ...state,
                        cursor: 0,
                        lineIndex: lineIndex + 1
                    };
                }

                return createNewLine(state);
            }

            case "UP": {
                if (lineIndex === 0) {
                    return state;
                }

                const newIndex = lineIndex - 1;
                return {
                    ...state,
                    cursor: Math.min(lines[newIndex].length, state.lastCursorPosition),
                    lineIndex: newIndex
                };
            }

            default: {
                return state;
            }
        }
    }

    // Helper function to split the multiline string into an array of lines
    const getInitialLines = (defaultValue: TextAreaValue | undefined): string[] => {
        if (!defaultValue) {
            return Array.from({ length: height - 1 }, () => "");
        }

        const lines = [...defaultValue]

        // Ensure the initial array is long enough to fill the viewport if the default value is shorter
        while (lines.length < height - 1) {
            lines.push("");
        }

        return lines;
    }

    const initialLines = getInitialLines(defaultValue);
    const [state, dispatch] = useReducer(reducer, {
        cursor: initialLines[0]?.length || 0,
        lastCursorPosition: initialLines[0]?.length || 0,
        lineIndex: 0,
        lines: initialLines,
        scrollTop: 0
    });

    useInput((input, key) => {
        if (key.ctrl) {
            if(key.delete) {
                dispatch({ type: "DELETE_WORD" });
            } else if(key.leftArrow) {
                dispatch({ type: "MOVE_WORD_LEFT" });
            } else if(key.rightArrow) {
                dispatch({ type: "MOVE_WORD_RIGHT" });
            }

            return;
        }

        if (key.shift) {
            if(key.delete) {
                dispatch({ type: "DELETE_LINE" });
            }

            return;
        }

        if (key.leftArrow) {
            dispatch({ type: "LEFT" });
        } else if (key.rightArrow) {
            dispatch({ type: "RIGHT" });
        } else if (key.upArrow) {
            dispatch({ type: "UP" });
        } else if (key.downArrow) {
            dispatch({ type: "DOWN" });
        } else if (key.backspace) {
            // TODO somehow STRG+DELETE triggers BACKSPACE but STRG key is set to false
            dispatch({ type: "BACKSPACE" });
        } else if (key.delete) {
            dispatch({ type: "DELETE" });
        } else if (key.return || input === "\r") {
            dispatch({ type: "NEWLINE" });
        } else if (input && !key.ctrl && !key.meta) {
            dispatch({ char: input, type: "INSERT_CHAR" });
        }
    });

    useEffect(() => {
        onChange(trimmedLines())
    }, [state.lines])

    const trimmedLines = () => {
        const trimmedLines = state.lines.map(line => line.trimEnd());

        // Remove empty lines from the start
        while (trimmedLines.length > 0 && trimmedLines[0] === "") {
            trimmedLines.shift();
        }

        // Remove empty lines from the end
        while (trimmedLines.length > 0 && trimmedLines.at(-1) === "") {
            trimmedLines.pop();
        }

        return trimmedLines
    }

    const renderLines = () => {
        const end = state.scrollTop + height;
        const visibleLines = state.lines.slice(state.scrollTop, end);
        const focusIndexInViewport = state.lineIndex - state.scrollTop;

        return visibleLines.map((line, i) => {
            const actualIndex = state.scrollTop + i;

            if (i === focusIndexInViewport) {
                return (
                    <TextInput
                        cursorPosition={state.cursor}
                        focus={true}
                        key={actualIndex}
                        onChange={() => {
                        }}
                        value={line}
                    />
                );
            }

            const isLineFocused = actualIndex === state.lineIndex;

            return (
                <Text color={isLineFocused ? "yellow" : undefined} key={actualIndex}>
                    {line || " "}
                </Text>
            );
        });
    };

    return (
        <Box flexDirection="column" height={height}>
            {renderLines()}
        </Box>
    );
};
