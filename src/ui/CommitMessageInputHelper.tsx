import { CommitMessageInput, FormValues } from "./CommitMessageInput.js";
import { renderInkComponent } from "./renderInkComponent.js";

export function renderCommitMessageInput(defaultValues?: FormValues) {
    defaultValues ??= { description: [], message: "" };

    return renderInkComponent<FormValues | null>(({ cancel, submit }) => (
        <CommitMessageInput
            defaultValues={defaultValues}
            onCancel={cancel}
            onSubmit={submit}
        />
    ));
}
