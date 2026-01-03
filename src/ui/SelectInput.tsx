import { useInput } from "ink";
import SelectInput from "ink-select-input";
import React, { useEffect, useState } from "react";

import { renderAnsweredQuestion } from "./helper/renderAnsweredQuestion.js";
import { renderCancelledQuestion } from "./helper/renderCancelledQuestion.js";
import { renderQuestion } from "./helper/renderQuestion.js";
import { renderInkComponent } from "./renderInkComponent.js";

export type SelectInputItem<T> = {
    key?: string;
    label: string;
    value: T;
};

function SelectInputWithCancel<T>({
                                      cancel,
                                      items,
                                      message,
                                      submit
                                  }: {
    cancel: () => void;
    items: SelectInputItem<T>[];
    message: string;
    submit: (value: T) => void;
}) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);
    const [value, setValue] = useState<null | SelectInputItem<T>>(null);
    const mappedItems = items.map(item => ({
        key: item.key || item.label,
        label: item.label,
        value: item.value
    }));

    useInput((input, key) => {
        if (key.ctrl && input === "c") {
            setIsCancelling(true);
        }
    });

    const handleSelect = (item: SelectInputItem<T>) => {
        setValue(item);
        setIsSubmitting(true);
    };

    useEffect(() => {
        if (isCancelling) {
            cancel();
            return;
        }

        if (!isSubmitting || !value) {
            return;
        }

        submit(value.value);
    }, [isSubmitting, isCancelling]);

    if (isCancelling) {
        return renderCancelledQuestion(message)
    }

    if (isSubmitting) {
        return renderAnsweredQuestion(message, value?.label || "")
    }

    return (
        <>
            {renderQuestion(message)}
            <SelectInput
                items={mappedItems}
                onSelect={handleSelect}
            />
        </>
    );
}

export function renderSelectInput<T>({
    items,
    message,
                                     }: {
    items: SelectInputItem<T>[],
    message: string
}) {
    return renderInkComponent<T>(({ cancel, submit }) => (
        <SelectInputWithCancel
            cancel={cancel}
            items={items}
            message={message}
            submit={submit}
        />
    ));
}
