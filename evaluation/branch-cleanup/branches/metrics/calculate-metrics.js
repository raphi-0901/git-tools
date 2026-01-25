import fs from "node:fs";
import path from "node:path";

function calculateMetrics() {
    // node script.js <path>
    const inputPath = process.argv[2];

    if (!inputPath) {
        console.error("Usage: node script.js <path-to-metrics-file>");
        process.exit(1);
    }

    // Make relative paths work
    const resolvedPath = path.resolve(process.cwd(), inputPath);
    const fileContent = fs.readFileSync(resolvedPath, "utf8");

    const values = fileContent
        .split("\n")
        .map(line => {
            const trimmed = line.trim();
            if (trimmed === "") return null;

            const number = Number(trimmed);
            return Number.isNaN(number) ? null : number;
        })
        .filter(value => value !== null);

    if (values.length === 0) {
        console.error("No valid numeric values found.");
        process.exit(1);
    }

    const average =
        values.reduce((acc, value) => acc + value, 0) / values.length;

    const sortedValues = [...values].sort((a, b) => a - b);
    const median = sortedValues[Math.floor(sortedValues.length / 2)];

    console.log(`Metrics Summary for ${inputPath}`);
    console.log("-".repeat(30));
    console.log(`Count\t: ${values.length}`);
    console.log(`Average\t: ${average.toFixed(2)}`);
    console.log(`Median\t: ${median.toFixed(2)}`);
}

calculateMetrics();
