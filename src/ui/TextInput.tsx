import TextInput from '@rwirnsberger/ink-text-input'
import { Box, Text, useInput } from 'ink'
import React, { useEffect, useState } from 'react'

import { renderAnsweredQuestion } from './helper/renderAnsweredQuestion.js'
import { renderQuestion } from './helper/renderQuestion.js'
import { renderInkComponent } from './renderInkComponent.js'

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
    const [inputValue, setInputValue] = useState(defaultValue || '')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isCancelling, setIsCancelling] = useState(false)
    const [validationMessage, setValidationMessage] = useState<null | string>(null)

    useInput((input, key) => {
        if (key.ctrl && input === 'c') {
            setIsCancelling(true)
        }
    })

    const handleSubmit = () => {
        if (validate && typeof validate === 'function') {
            const isValid = validate(inputValue)

            if (isValid === true) {
                setIsSubmitting(true)
                return
            }

            setValidationMessage(isValid)
            return
        }

        setIsSubmitting(true)
    }

    useEffect(() => {
        if (isCancelling) {
            cancel()
            return
        }

        if (!isSubmitting) {
            return
        }

        submit(inputValue)
    }, [isSubmitting, isCancelling])

    if (isCancelling) {
        return <Text>Cancelling…</Text>
    }

    if (isSubmitting) {
        return renderAnsweredQuestion(message, inputValue)
    }

    return (
        <Box>
            {renderQuestion(message)}
            <Text>{' '}</Text>
            <TextInput
                focus={true}
                onChange={setInputValue}
                onSubmit={handleSubmit}
                value={inputValue}
            />
            {validationMessage && <Text color="red">{validationMessage}</Text>}
        </Box>
    )
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
    ))
}
