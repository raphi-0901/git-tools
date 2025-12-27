import dayjs from "dayjs";

export function calculateAbsoluteDayDifference(from: Date | number, to: Date | number = new Date()) {
    return Math.abs(dayjs(from).diff(to, 'days', true));
}
