import { Text, useInput } from "ink";
import SelectInput from "ink-select-input";
import React, { useEffect, useState } from "react";

import { renderInkComponent } from "./renderInkComponent.js";

export type SelectInputItem<T> = { label: string; value: T };

function SelectInputWithCancel<T>({
                                      cancel,
                                      items,
                                      submit
                                  }: {
    cancel: () => void;
    items: SelectInputItem<T>[];
    submit: (value: T) => void;
}) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);
    const [value, setValue] = useState<null | T>(null);

    useInput((input, key) => {
        if (key.ctrl && input === "c") {
            setIsCancelling(true);
        }
    });

    const handleSelect = (item: SelectInputItem<T>) => {
        setValue(item.value);
        setIsSubmitting(true);
    };

    useEffect(() => {
        if (isCancelling) {
            cancel();
            return;
        }

        if (!isSubmitting) {
            return;
        }

        submit(value!);
    }, [isSubmitting, isCancelling]);

    if (isCancelling) {
        return <Text>Cancelling…</Text>;
    }

    if (isSubmitting) {
        return <Text>Submitting…</Text>;
    }

    return (
        <SelectInput
            items={items}
            onSelect={handleSelect}
        />
    );
}

export function renderSelectInput<T>(items: SelectInputItem<T>[]) {
    return renderInkComponent<T>(({ cancel, submit }) => (
        <SelectInputWithCancel
            cancel={cancel}
            items={items}
            submit={submit}
        />
    ));
}
