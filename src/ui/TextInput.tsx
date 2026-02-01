import TextInput from "@rwirnsberger/ink-text-input";
import { Box, Text, useInput } from "ink";
import React, { useEffect, useState } from "react";

import { renderAnsweredQuestion } from "./helper/renderAnsweredQuestion.js";
import { renderCancelledQuestion } from "./helper/renderCancelledQuestion.js";
import { renderQuestion } from "./helper/renderQuestion.js";
import { renderInkComponent } from "./renderInkComponent.js";

type TextInputWrapperProps<T> = {
    cancel: () => void;
    defaultValue?: string;
    message: string;
    submit: (value: T) => void;
    validate?: (value: string) => string | true;
};

function TextInputWithCancel({
                                 cancel,
                                 defaultValue,
                                 message,
                                 submit,
                                 validate
                             }: TextInputWrapperProps<string>) {
    const [inputValue, setInputValue] = useState(defaultValue || "");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);
    const [validationMessage, setValidationMessage] = useState<null | string>(null);

    useInput((input, key) => {
        if (key.ctrl && input === "c") {
            setIsCancelling(true);
        }
    });

    const handleChange = (input: string) => {
        setInputValue(input);
        setValidationMessage(null);
    }

    const handleSubmit = () => {
        if (validate && typeof validate === 'function') {
            const isValid = validate(inputValue);

            if (isValid === true) {
                setIsSubmitting(true)
                return;
            }

            setValidationMessage(isValid)
            return;
        }

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

        submit(inputValue);
    }, [isSubmitting, isCancelling]);

    if (isCancelling) {
        return renderCancelledQuestion(message)
    }

    if (isSubmitting) {
        return renderAnsweredQuestion(message, inputValue)
    }

    return (
        <Box flexDirection={"column"}>
            <Box>
                {renderQuestion(message)}
                <Text>{" "}</Text>
                <TextInput
                    focus={true}
                    onChange={handleChange}
                    onSubmit={handleSubmit}
                    value={inputValue}
                />
            </Box>
            {validationMessage && <Text color="red">{validationMessage}</Text>}
        </Box>
    );
}

export function renderTextInput({
                                    defaultValue,
                                    message,
                                    validate
                                }: {
    defaultValue?: string;
    message: string;
    validate?: (value: string) => string | true;
}) {
    return renderInkComponent<string>(({ cancel, submit }) => (
        <TextInputWithCancel
            cancel={cancel}
            defaultValue={defaultValue}
            message={message}
            submit={submit}
            validate={validate}
        />
    ));
}
