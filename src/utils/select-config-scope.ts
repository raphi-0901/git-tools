import {select} from '@inquirer/prompts';

export async function selectConfigScope() {
    const choices = [
        {
            name: "Repository",
            value: "repository",
        },
        {
            name: "Global",
            value: "global",
        }
    ] as const

    return select({
        choices,
        message: "You want to set the configuration for the global or repository scope?",
    });
}
