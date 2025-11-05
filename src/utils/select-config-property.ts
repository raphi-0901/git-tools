import { select } from "@inquirer/prompts";

export async function selectConfigProperty<T extends string>(
    options: readonly T[]
): Promise<T> {
    return select<T>({
        choices: options.map((key) => ({
            name: key,
            value: key,
        })),
        message: "Which configuration key do you want to set?",
    });
}
