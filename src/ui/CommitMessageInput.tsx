import { TitledBox } from "@mishieck/ink-titled-box";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import React, { useEffect, useState } from "react";

import { TextArea, TextAreaValue } from "./TextArea.js";

export type FormValues = {
    description: string[];
    message: string;
};

type InkFormProps = {
    // Add an optional defaultValues prop
    defaultValues?: FormValues;
    onSubmit: (values: FormValues | null) => void;
};

const HEIGHT = 6;

export const CommitMessageInput = ({ defaultValues, onSubmit }: InkFormProps) => {
    const [activeInput, setActiveInput] = useState<"first" | "second">("first");
    const [commitMessage, setCommitMessage] = useState(defaultValues?.message || "");
    const [commitDescription, setCommitDescription] = useState<string[]>(defaultValues?.description || []);
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

    const handleCommitMessageChange = (value: string) => {
        setCommitMessage(value);
    };

    const handleCommitDescriptionChange = (value: null | TextAreaValue) => {
        if(!value) {
            setCommitDescription([])

            return;
        }

        setCommitDescription(value);
    };

    const handleSubmit = () => {
        setIsSubmitting(true);
    };

    useEffect(() => {
        if (!isSubmitting) {
            return;
        }

        if (isCancelling) {
            onSubmit(null);
            return;
        }

        onSubmit({
            description: commitDescription,
            message: commitMessage
        });
    }, [isSubmitting, isCancelling]);

    const renderCommitMessage = () => {
        if (activeInput === "first") {
            return (
                <TextInput
                    focus={true}
                    onChange={handleCommitMessageChange}
                    onSubmit={handleSubmit}
                    value={commitMessage}
                />
            );
        }

        return <Text>{commitMessage || " "}</Text>;
    };

    const renderCommitDescription = () => {
        if (activeInput === "second") {
            return (
                <TextArea
                    defaultValue={commitDescription}
                    height={HEIGHT}
                    onChange={handleCommitDescriptionChange}
                />
            );
        }

        // Render the commit description as a list of Text components but fill up to height lines
        const filledUpLines = Array.from({ length: HEIGHT }, (_, i) => commitDescription[i] || " ");
        return filledUpLines.map((line, index) => (
            <Text key={index}>{line}</Text>
        ))
    };

    return isSubmitting ? (
        <Text>Submitting…</Text>
    ) : isCancelling ? (
        <Text>Cancelling…</Text>
    ) : (
        <Box flexDirection="column" gap={1}>
            <TitledBox
                borderColor={activeInput === "first" ? "#ff9900" : undefined}
                borderStyle="round"
                flexDirection="column"
                titleJustify={"space-between"}
                titles={["Reword commit message", `${commitMessage.length} chars`]}
            >
                {renderCommitMessage()}
            </TitledBox>

            <TitledBox
                borderColor={activeInput === "second" ? "#ff9900" : undefined}
                borderStyle="round"
                flexDirection="column"
                titleJustify={"space-between"}
                titles={[
                    "Commit description"
                ]}
            >
                {renderCommitDescription()}
            </TitledBox>

            <Box marginTop={1}>
                <Text>
                    Active: {activeInput} | Press <Text color="yellow">Tab</Text> to
                    switch, <Text color="yellow">Enter</Text> to create new line,{" "}
                    <Text color="yellow">↑/↓/←/→</Text> to navigate. Press{" "}
                    <Text color="yellow">Backspace</Text> on an empty line to delete it.
                </Text>
            </Box>
        </Box>
    );
};
