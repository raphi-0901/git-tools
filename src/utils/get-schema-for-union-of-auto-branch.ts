import { AutoBranchConfigSchema, AutoBranchServiceTypesConfig } from "../zod-schema/auto-branch-config.js";

export function getSchemaForUnionOfAutoBranch(type: AutoBranchServiceTypesConfig) {
    const unionSchema = AutoBranchConfigSchema.shape.HOSTNAMES.def.valueType;
    return unionSchema.options.find(opt => opt.shape.type.value === type);
}
