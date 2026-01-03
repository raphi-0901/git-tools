import TextInput from "@rwirnsberger/ink-text-input";
import { TitledBox } from "@rwirnsberger/ink-titled-box";
import { Box, Text, useInput } from "ink";
import React, { useEffect, useState } from "react";

import { renderAnsweredQuestion } from "./helper/renderAnsweredQuestion.js";
import { renderCancelledQuestion } from "./helper/renderCancelledQuestion.js";
import { renderInkComponent } from "./renderInkComponent.js";
import { TextArea, TextAreaValue } from "./TextArea.js";

export type FormValues = {
    description: string[];
    message: string;
};

type InkFormProps = {
    defaultValues: FormValues;
    message: string;
    onCancel: () => void;
    onSubmit: (values: FormValues | null) => void;
};

const HEIGHT = 6;

const CommitMessageInput = ({ defaultValues, message, onCancel, onSubmit }: InkFormProps) => {
    const [activeInput, setActiveInput] = useState<"first" | "second">("first");
    const [commitMessage, setCommitMessage] = useState(defaultValues.message || "");
    const [commitDescription, setCommitDescription] = useState<string[]>(defaultValues.description || []);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);

    useInput((input, key) => {
        if (key.tab) {
            setActiveInput(activeInput === "first" ? "second" : "first");
        }

        if (key.ctrl && input === "c") {
            setIsCancelling(true);
        }
    });

    const handleCommitMessageChange = (value: string) => setCommitMessage(value);

    const handleCommitDescriptionChange = (value: null | TextAreaValue) => {
        setCommitDescription(value || []);
    };

    const handleSubmit = () => setIsSubmitting(true);

    useEffect(() => {
        if (isCancelling) {
            onCancel();
        }
    }, [isCancelling]);

    useEffect(() => {
        if (isSubmitting) {
            onSubmit({
                description: commitDescription,
                message: commitMessage
            });        }
    }, [isSubmitting]);

    const renderCommitMessage = () => activeInput === "first" ? (
        <TextInput
            focus
            onChange={handleCommitMessageChange}
            onSubmit={handleSubmit}
            value={commitMessage}
        />
    ) : <Text>{commitMessage || " "}</Text>;

    const renderCommitDescription = () => {
        if (activeInput === "second") {
            return <TextArea defaultValue={commitDescription} height={HEIGHT}
                             onChange={handleCommitDescriptionChange}/>;
        }

        const filledUpLines = Array.from({ length: HEIGHT }, (_, i) => commitDescription[i] || " ");
        return filledUpLines.map((line, i) => <Text key={i}>{line}</Text>);
    };

    const renderHelpText = () => <Box marginTop={1}>
        <Text>
            Active: {activeInput} | Press <Text color="yellow">Tab</Text> to
            switch, <Text color="yellow">Enter</Text> to create new line,{" "}
            <Text color="yellow">↑/↓/←/→</Text> to navigate. Press{" "}
            <Text color="yellow">Backspace</Text> on an empty line to delete it.
        </Text>
    </Box>

    if (isSubmitting) {
        return renderAnsweredQuestion(message, `${commitMessage}`)
    }

    if (isCancelling) {
        return renderCancelledQuestion(message)
    }

    return <Box flexDirection="column" gap={1}>
        <TitledBox
            borderColor={activeInput === "first" ? "#ff9900" : undefined}
            borderStyle="round"
            flexDirection="column"
            titleJustify="space-between"
            titles={["Reword commit message", `${commitMessage.length} chars`]}
        >
            {renderCommitMessage()}
        </TitledBox>

        <TitledBox
            borderColor={activeInput === "second" ? "#ff9900" : undefined}
            borderStyle="round"
            flexDirection="column"
            titleJustify="space-between"
            titles={["Commit description"]}
        >
            {renderCommitDescription()}
        </TitledBox>

        {renderHelpText()}
    </Box>
};

export function renderCommitMessageInput({
                                             defaultValues,
                                             message
                                         }: {
    defaultValues?: FormValues;
    message: string;
}) {
    defaultValues ??= { description: [], message: "" };

    return renderInkComponent<FormValues | null>(({ cancel, submit }) => (
        <CommitMessageInput
            defaultValues={defaultValues}
            message={message}
            onCancel={cancel}
            onSubmit={submit}
        />
    ));
}
