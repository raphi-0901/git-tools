export function convertStringToObject(path: string, value: string) {
    const keys = path.split(':');
    const dataModel = {} as Record<string, object | string>;
    let object = dataModel;
    while (keys.length > 0) {
        const part = keys.shift();
        if (part === undefined) {
            break;
        }

        if (keys.length > 0) {
            object[part] = {};
            object = object[part] as Record<string, object | string>;
        } else {
            object[part] = value;
        }
    }

    return dataModel;
}
