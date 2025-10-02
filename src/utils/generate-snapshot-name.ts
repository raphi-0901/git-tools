import dayjs from "dayjs";

export function generateSnapshotName(branchName: string, autoSave = false) {
    const now = dayjs().format("YYYY-MM-DD_HH-mm-ss");
    if(autoSave) {
        return `refs/wip/${branchName}/autosave-${now}`;
    }

    return `refs/wip/${branchName}/${now}`;
}
