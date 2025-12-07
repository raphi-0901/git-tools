import { Command } from "@oclif/core";
import { Spinner } from "yocto-spinner";

export type ExtendedCommand = Command & {
    spinner?: Spinner
};
