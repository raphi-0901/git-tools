import { render } from "ink";
import React from "react";

import { CommitMessageInput, FormValues } from "./CommitMessageInput.js";

export async function renderCommitMessageInput(defaultValues?: FormValues) {
    defaultValues ??= { description: [], message: '' };

    let resolvePromise!: (value: FormValues | null) => void;
    const promise = new Promise<FormValues | null>((resolve) => {
        resolvePromise = resolve;
    });

   const { unmount } = render(
        <CommitMessageInput
            defaultValues={defaultValues}
            // defaultValues={{ description: ["test-und-so", "", "third line"], message: "hola die waldfee" }}
            onSubmit={(values) => {
                unmount();
                resolvePromise(values);
            }}
        />
    , { exitOnCtrlC: false });

    return promise;
}
