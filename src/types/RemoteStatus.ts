export type RemoteStatus = {
    ahead: number;
    behind: number;
    remoteBranch: string;
    type: "diverged"
} | {
    ahead: number;
    remoteBranch: string;
    type: "ahead"
} | {
    behind: number;
    remoteBranch: string;
    type: "behind"
} | {
    remoteBranch: string;
    type: "synced",
} | {
    type: "no-remote"
};
