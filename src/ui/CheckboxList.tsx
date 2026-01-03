import { Box, Text, useInput } from "ink";
import React, { useEffect, useState } from "react";

import { renderAnsweredQuestion } from "./helper/renderAnsweredQuestion.js";
import { renderCancelledQuestion } from "./helper/renderCancelledQuestion.js";
import { renderQuestion } from "./helper/renderQuestion.js";
import { renderInkComponent } from "./renderInkComponent.js";

export type CheckboxListItem<T> = {
    key: string;
    label: string;
    selected?: boolean;
    type: "item";
    value: T;
};

export type Separator = {
    label: string;
    type: "separator";
};

export type ListItem<T> = CheckboxListItem<T> | Separator;

type CheckboxListWrapperProps<T> = {
    cancel: () => void;
    items: ListItem<T>[];
    message: string;
    submit: (selectedItems: T[]) => void;
};

const WINDOW_SIZE = 10;

function CheckboxList<T>({
                             cancel,
                             items,
                             message,
                             submit
                         }: CheckboxListWrapperProps<T>) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);
    const [highlightedItemId, setHighlightedItemId] = useState(0);

    const initialSelectedItemIds = items.map((item, index) => {
        if (item.type === "item" && item.selected) {
            return index;
        }

        return null
    }).filter(i=> i !== null)

    const [selectedItemIds, setSelectedItemIds] = useState<number[]>(initialSelectedItemIds);
    const [windowStart, setWindowStart] = useState(0);

    const selectableIndexes = items
        .map((item, index) =>
            item.type === "item" ? index : null
        )
        .filter(i => i !== null);

    const getNextSelectableIndex = (start: number, direction: -1 | 1) => {
        let i = start;
        while (true) {
            i += direction;
            if (i < 0 || i >= items.length) {
                return start;
            }

            if (items[i].type === "item") {
                return i;
            }
        }
    };

    const getSelectedItems = () =>
        items.filter(
            (item, index): item is CheckboxListItem<T> =>
                 selectedItemIds.includes(index) && (item.type === "item")
        );

    useInput((input, key) => {
        if (key.return) {
            setIsSubmitting(true);
            return;
        }

        if (key.ctrl && input === "c") {
            setIsCancelling(true);
            return;
        }

        if (key.upArrow) {
            setHighlightedItemId(i =>
                getNextSelectableIndex(i, -1)
            );
        }

        if (key.downArrow) {
            setHighlightedItemId(i =>
                getNextSelectableIndex(i, 1)
            );
        }

        if (input === " ") {
            const item = items[highlightedItemId];
            if (!item || item.type !== "item") {
                return;
            }

            setSelectedItemIds(prev =>
                prev.includes(highlightedItemId)
                    ? prev.filter(i => i !== highlightedItemId)
                    : [...prev, highlightedItemId]
            );
        }

        if (input === "a") {
            setSelectedItemIds(prev =>
                prev.length === selectableIndexes.length
                    ? []
                    : selectableIndexes
            );
        }

        if (input === "i") {
            setSelectedItemIds(
                selectableIndexes.filter(i => !selectedItemIds.includes(i))
            );
        }
    });

    useEffect(() => {
        let nextWindowStart = windowStart;

        if (highlightedItemId < windowStart) {
            nextWindowStart = highlightedItemId;
        } else if (highlightedItemId >= windowStart + WINDOW_SIZE) {
            nextWindowStart = highlightedItemId - WINDOW_SIZE + 1;
        }

        if (highlightedItemId === selectableIndexes[0]) {
            nextWindowStart = 0;
        }

        nextWindowStart = Math.max(0, nextWindowStart);

        if (nextWindowStart !== windowStart) {
            setWindowStart(nextWindowStart);
        }
    }, [highlightedItemId, selectableIndexes]);

    useEffect(() => {
        if (isCancelling) {
            cancel();
            return;
        }

        if (!isSubmitting) {
            return;
        }

        submit(getSelectedItems().map(item => item.value));
    }, [isSubmitting, isCancelling]);

    const visibleItems = items.slice(
        windowStart,
        windowStart + WINDOW_SIZE
    );

    const renderItems = () =>
        visibleItems.map((item, localIndex) => {
            const index = windowStart + localIndex;
            const isHighlighted = highlightedItemId === index;

            if (item.type === "separator") {
                return (
                    <Box key={`sep-${index}`} marginTop={1}>
                        <Text color="gray">── {item.label} ──</Text>
                    </Box>
                );
            }

            const isSelected = selectedItemIds.includes(index);

            return (
                <Box gap={1} key={item.key}>
                    <Text color={isSelected ? "red" : "gray"}>
                        {isSelected ? "✓" : "■"}
                    </Text>
                    <Text
                        color={
                            isHighlighted
                                ? "yellow"
                                : isSelected
                                    ? "green"
                                    : undefined
                        }
                    >
                        {item.label}
                    </Text>
                </Box>
            );
        });

    const renderHelpText = () => (
        <Box marginTop={1}>
            <Text>
                Press <Text color="yellow">Space</Text> to select,{" "}
                <Text color="yellow">a</Text> to toggle all,{" "}
                <Text color="yellow">i</Text> to invert selection,{" "}
                <Text color="yellow">Enter</Text> to submit.
            </Text>
        </Box>
    );

    if (isCancelling) {
        return renderCancelledQuestion(message);
    }

    if (isSubmitting) {
        if(selectableIndexes.length === 0) {
            return renderAnsweredQuestion(message, "No selectable items.");
        }

        if(getSelectedItems().length === 0) {
            return renderAnsweredQuestion(message, "No items selected.");
        }

        return renderAnsweredQuestion(message, getSelectedItems().map(i => i.label).join(", "));
    }

    if(selectableIndexes.length === 0) {
        setTimeout(() => setIsSubmitting(true), 1);

        return (<Box></Box>);
    }

    return (
        <Box flexDirection="column">
            {renderQuestion(message)}

            {windowStart > 0 ? (
                <Text color="gray">↑ more</Text>
            ) : (
                <Text>{" "}</Text>
            )}

            <Box flexDirection="column">
                {renderItems()}
            </Box>

            {windowStart + WINDOW_SIZE < items.length ? (
                <Text color="gray">↓ more</Text>
            ) : (
                <Text>{" "}</Text>
            )}

            {renderHelpText()}
        </Box>
    );
}

export function renderCheckboxList<T>({
                                          items,
                                          message
                                      }: {
    items: ListItem<T>[];
    message: string;
}) {
    return renderInkComponent<T, T[]>(({ cancel, submit }) => (
        <CheckboxList<T>
            cancel={cancel}
            items={items}
            message={message}
            submit={submit}
        />
    ));
}
