import { render } from "ink";
import { ReactElement } from "react";

export function renderInkComponent<InputType, ReturnType = InputType>(
    elementFactory: (handlers: {
        cancel: () => void;
        submit: (value: ReturnType) => void;
    }) => ReactElement
): Promise<null | ReturnType> {
    return new Promise((resolve) => {
        const { unmount } = render(
            elementFactory({
                cancel() {
                    unmount();
                    resolve(null);
                },
                submit(value) {
                    unmount();
                    resolve(value);
                }
            }),
            { exitOnCtrlC: false }
        );
    });
}

