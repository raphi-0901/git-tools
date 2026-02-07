import TextInput from "@rwirnsberger/ink-text-input";
import { Box, Text, useInput } from "ink";
import Spinner from 'ink-spinner';
import React, { useEffect, useState } from "react";

import { renderAnsweredQuestion } from "./helper/renderAnsweredQuestion.js";
import { renderCancelledQuestion } from "./helper/renderCancelledQuestion.js";
import { renderQuestion } from "./helper/renderQuestion.js";
import { renderInkComponent } from "./renderInkComponent.js";

type TextInputWrapperProps<T> = {
    cancel: () => void;
    defaultValue?: string;
    message: string;
    messageWhileValidating?: string;
    submit: (value: T) => void;
    validate?: (value: string) => Promise<string | true> | (string | true);
};

function TextInputWithCancel({
                                 cancel,
                                 defaultValue,
                                 message,
                                 messageWhileValidating,
                                 submit,
                                 validate
                             }: TextInputWrapperProps<string>) {
    const [inputValue, setInputValue] = useState(defaultValue || "");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);
    const [isValidating, setIsValidating] = useState(false);
    const [validationErrorMessage, setValidationErrorMessage] = useState<null | string>(null);

    useInput((input, key) => {
        if (key.ctrl && input === "c") {
            setIsCancelling(true);
        }
    });

    const handleChange = (input: string) => {
        setInputValue(input);
        setValidationErrorMessage(null);
    };

    const handleSubmit = async () => {
        if (validate && typeof validate === "function") {
            setIsValidating(true);
            setValidationErrorMessage(null);

            try {
                const isValid = await validate(inputValue);

                if (isValid === true) {
                    setIsSubmitting(true);
                    return;
                }

                setValidationErrorMessage(isValid);
            } finally {
                setIsValidating(false);
            }

            return;
        }

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

        submit(inputValue);
    }, [isSubmitting, isCancelling]);

    if (isCancelling) {
        return renderCancelledQuestion(message);
    }

    if (isSubmitting) {
        return renderAnsweredQuestion(message, inputValue);
    }

    return (
        <Box flexDirection="column">
            {renderQuestion(message)}
            <TextInput
                focus={!isValidating}
                onChange={handleChange}
                onSubmit={handleSubmit}
                value={inputValue}
            />

            {isValidating && (
                <Text color="yellow">
                    <Spinner/>
                    {" "}
                    {messageWhileValidating?.trim() ? messageWhileValidating : "Validating..."}
                </Text>
            )}

            {!isValidating && validationErrorMessage && (
                <Text color="red">{validationErrorMessage}</Text>
            )}
        </Box>
    );
}

export function renderTextInput({
                                    defaultValue,
                                    message,
                                    messageWhileValidating,
                                    validate
                                }: {
    defaultValue?: string;
    message: string;
    messageWhileValidating?: string;
    validate?: (value: string) => Promise<string | true> | (string | true);
}) {
    return renderInkComponent<string>(({ cancel, submit }) => (
        <TextInputWithCancel
            cancel={cancel}
            defaultValue={defaultValue}
            message={message}
            messageWhileValidating={messageWhileValidating}
            submit={submit}
            validate={validate}
        />
    ));
}
