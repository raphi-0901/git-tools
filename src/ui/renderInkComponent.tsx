import { render } from 'ink'
import { ReactElement } from 'react'

export function renderInkComponent<T>(
    elementFactory: (handlers: {
        cancel: () => void;
        submit: (value: T) => void;
    }) => ReactElement
): Promise<null | T> {
    return new Promise<null | T>((resolve) => {
        const { unmount } = render(
            elementFactory({
                cancel() {
                    unmount()
                    resolve(null)
                },
                submit(value) {
                    unmount()
                    resolve(value)
                }
            }),
            {
 exitOnCtrlC: false 
}
        )
    })
}
