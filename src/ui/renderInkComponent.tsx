import { render } from "ink";
import { ReactElement } from "react";

/**
 * Renders an Ink (React CLI) component and resolves a promise when the user submits a value or cancels.
 *
 * @template InputType - The type of input the component expects.
 * @template ReturnType - The type of value returned when submitting (defaults to InputType).
 *
 * @param {(handlers: { cancel: () => void; submit: (value: ReturnType) => void }) => ReactElement} elementFactory
 *   A factory function that returns a React element to render. Receives handlers for `cancel` and `submit`.
 *
 * @returns {Promise<ReturnType | null>} A promise that resolves to the submitted value, or `null` if cancelled.
 *
 * @example
 * const value = await renderInkComponent<string>((handlers) => (
 *   <MyInkInputComponent onSubmit={handlers.submit} onCancel={handlers.cancel} />
 * ));
 * if (value === null) {
 *   console.log("User cancelled input");
 * } else {
 *   console.log("User submitted:", value);
 * }
 */
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

