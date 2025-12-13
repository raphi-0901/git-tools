import dayjs, { Dayjs } from "dayjs";
import duration from "dayjs/plugin/duration.js";

dayjs.extend(duration);

export default class Timer {
    private defaultName = "__default__";
    private timers = new Map<
        string,
        { end: Dayjs | null; start: Dayjs | null; }
    >();

    format(name?: string) {
        const d = this.getDuration(name);
        const totalSec = d.asSeconds();

        if (totalSec < 60) {
            return `${totalSec.toFixed(3)}s`;
        }

        const minutes = Math.floor(totalSec / 60);
        const seconds = Math.floor(totalSec % 60);
        const ms = Math.floor((totalSec % 1) * 1000);

        return `${minutes.toString().padStart(2, "0")}:` +
            `${seconds.toString().padStart(2, "0")}.` +
            `${ms.toString().padStart(3, "0")}`;
    }

    start(name?: string) {
        const timerName = name ?? this.defaultName;
        this.timers.set(timerName, { end: null, start: dayjs() });
    }

    stop(name?: string) {
        const timerName = name ?? this.defaultName;
        const t = this.timers.get(timerName);

        if (!t) {
            throw new Error(`Timer '${timerName}' does not exist`);
        }

        if (!t.start) {
            throw new Error(`Timer '${timerName}' was not started`);
        }

        t.end = dayjs();
        return this.format(timerName);
    }

    private getDuration(name?: string) {
        const timerName = name ?? this.defaultName;
        const t = this.timers.get(timerName);

        if (!t) {
            throw new Error(`Timer '${timerName}' does not exist`);
        }

        if (!t.start) {
            throw new Error(`Timer '${timerName}' was not started`);
        }

        const end = t.end ?? dayjs();
        return dayjs.duration(end.diff(t.start));
    }
}
