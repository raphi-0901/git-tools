import { isProtectedBranch } from "../utils/branchProtection.js";

export function scoreBranch(
    branch: string,
    commitCount: number,
    lastCommitDate: number
): number {
    let score = 0;
    const normalized = branch.replace(/^origin\//, "");

    if (isProtectedBranch(normalized)) {
        score += 10_000;
    }

    score += Math.log(commitCount + 1) * 100;

    const days = (Date.now() - lastCommitDate) / 86_400_000;
    score += Math.max(0, 500 - days);

    if (/^(main|master|production|prod)$/i.test(normalized)) {
        score += 5000;
    }
    else if (/^(development|develop|dev)$/i.test(normalized)) {
        score += 4000;
    }
    else if (/^(staging|stage)$/i.test(normalized)) {
        score += 3000;
    }
    else if (/^(release|hotfix)\//i.test(normalized)) {
        score += 2000;
    }
    else if (/^(feature|feat)\//i.test(normalized)) {
        score -= 500;
    }

    return score;
}
