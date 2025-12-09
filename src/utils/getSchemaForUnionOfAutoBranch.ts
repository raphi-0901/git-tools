import { AutoBranchConfigSchema, AutoBranchServiceTypesConfig } from "../zod-schema/autoBranchConfig.js";

export function getSchemaForUnionOfAutoBranch(type: AutoBranchServiceTypesConfig) {
    const unionSchema = AutoBranchConfigSchema.shape.HOSTNAMES.def.valueType;
    return unionSchema.options.find(opt => opt.shape.type.value === type);
}
