import { DivergedInfo } from "./DivergedInfo.js";
import { MergeInfo } from "./MergeInfo.js";

export type BranchAnalysisResult = {
    behindOnly: Map<string, { behindCount: number; lastCommitDate: number }>;
    diverged: Map<string, DivergedInfo>;
    localOnly: Map<string, number>;
    merged: Map<string, MergeInfo>;
    stale: Map<string, number>;
};
