import { z } from "zod";

export const IssueSummarySchema = z.object({
    description: z.string(),
    summary: z.string(),
    ticketId: z.string(),
});

export type IssueSummary = z.infer<typeof IssueSummarySchema>;
