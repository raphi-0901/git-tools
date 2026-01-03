import { AutoBranchConfigSchema, AutoBranchServiceTypesConfig } from "../zod-schema/autoBranchConfig.js";

/**
 * Retrieves the Zod schema corresponding to a specific AutoBranch service type.
 *
 * This is used to dynamically access the shape of configuration fields for
 * a given service type within the union of AutoBranch service schemas.
 *
 * @param type The AutoBranch service type to retrieve the schema for.
 * @returns The Zod schema object for the specified service type, or `undefined`
 *          if no matching schema is found.
 */
export function getSchemaForUnionOfAutoBranch(type: AutoBranchServiceTypesConfig) {
    const unionSchema = AutoBranchConfigSchema.shape.HOSTNAMES.def.valueType;
    return unionSchema.options.find(opt => opt.shape.type.value === type);
}
