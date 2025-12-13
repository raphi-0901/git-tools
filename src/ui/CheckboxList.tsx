import { Box, Text, useInput } from "ink";
import React, { useEffect, useState } from "react";

import { renderAnsweredQuestion } from "./helper/renderAnsweredQuestion.js";
import { renderQuestion } from "./helper/renderQuestion.js";
import { renderInkComponent } from "./renderInkComponent.js";

export type CheckboxListItem<T> = {
    key: string;
    label: string;
    value: T;
};

type CheckboxListWrapperProps<T> = {
    cancel: () => void;
    items: CheckboxListItem<T>[];
    message: string;
    submit: (selectedItems: T[]) => void;
};

function CheckboxList<T>({
                             cancel,
                             items,
                             message,
                             submit
                         }: CheckboxListWrapperProps<T>) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);
    const [highlightedItemId, setHighlightedItemId] = useState<number>(-1);
    const [selectedItemIds, setSelectedItemIds] = useState<number[]>([]);

    useInput((input, key) => {
        if (key.return) {
            handleSubmit();
            return;
        }

        if (key.ctrl && input === "c") {
            setIsCancelling(true);
        }

        if (key.upArrow) {
            setHighlightedItemId(Math.max(highlightedItemId - 1, 0));
        }

        if (key.downArrow) {
            setHighlightedItemId(Math.min(highlightedItemId + 1, items.length - 1));
        }

        // select the highlighted item
        if (input === " ") {
            const item = items[highlightedItemId];
            if (!item) {
                return;
            }

            const isSelected = selectedItemIds.includes(highlightedItemId);

            setSelectedItemIds(isSelected ? selectedItemIds.filter(i => i !== highlightedItemId) : [...selectedItemIds, highlightedItemId]);
        }

        // select all items
        if (input === "a") {
            setSelectedItemIds(items.map((_item, index) => index));
        }

        // invert the indexes
        if (input === "i") {
            setSelectedItemIds(items.map((_item, index) => index).filter(i => !selectedItemIds.includes(i)));
        }
    });

    const getSelectedItemsValues = () => items.filter((_, index) => selectedItemIds.includes(index))

    const handleSubmit = () => {
        setIsSubmitting(true)
    };

    useEffect(() => {
        if (isCancelling) {
            cancel();
            return;
        }

        if (!isSubmitting) {
            return;
        }

        submit(getSelectedItemsValues().map(item => item.value));
    }, [isSubmitting, isCancelling]);

    const renderItems = () => items.map((item, index) => {
        const isSelected = selectedItemIds.includes(index);
        const isHighlighted = highlightedItemId === index;

        return <Text color={isSelected ? "green" : isHighlighted ? "yellow" : undefined} key={index}>{item.label}</Text>
    })

    if (isCancelling) {
        return <Text>Cancelling…</Text>;
    }

    if (isSubmitting) {
        return renderAnsweredQuestion(message, getSelectedItemsValues().map(item => item.label).join(", "))
    }


    return (
        <Box>
            {renderQuestion(message)}
            {renderItems()}
        </Box>
    );
}

export function renderCheckboxList<T>({
                                       items,
                                       message
                                   }: {
    items: CheckboxListItem<T>[];
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
