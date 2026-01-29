// 2-Panel Small Multiples: Tokens (oben) + Time (unten)
// - gleiche X-Achse (Change size)
// - Tokens mit log-Skala (empfohlen, weil Größenordnungen stark differieren)
// - Time linear

const categories = ['Small', 'Medium', 'Large', 'Non-Code'];

// ---- Daten einsetzen (z.B. Median pro Bucket über Angular/Svelte/Vue) ----
const tokProposed = [545, 1877, 7884, 1838];
const tokGemini = [49_837, 67_987, 107_801, 65_231];
const tokGemAdv = [39_104, 47_624, 81_444, 45_712];

const timeProposed = [1.65, 2.12, 3.26, 2.63];
const timeGemini = [12.6, 14.4, 15.5, 14.3];
const timeGemAdv = [21.3, 15.6, 19, 15];

const stackColors = [
    '#3A5F7D', // dark blue
    '#5B8C5A', // dark green
    '#C47A2C' // dark orange
];

const series = [
    // ---- TOKENS (oben, gridIndex 0) ----
    {
        data: tokProposed,
        lineStyle: { type: 'solid' },
        name: 'auto-commit',
        showSymbol: true,
        symbol: 'circle',
        type: 'line',
        xAxisIndex: 0,
        yAxisIndex: 0
    },
    {
        data: tokGemini,
        lineStyle: { type: 'solid' },
        name: 'Gemini CLI',
        showSymbol: true,
        symbol: 'circle',
        type: 'line',
        xAxisIndex: 0,
        yAxisIndex: 0
    },
    {
        data: tokGemAdv,
        lineStyle: { type: 'solid' },
        name: 'Gemini CLI (Advanced)',
        showSymbol: true,
        symbol: 'circle',
        type: 'line',
        xAxisIndex: 0,
        yAxisIndex: 0
    },

    // ---- TIME (unten, gridIndex 1) ----
    {
        data: timeProposed,
        // gleiche Serie-Name wie oben ist okay; Legende toggelt beide Panels gemeinsam.
        lineStyle: { type: 'dashed' },
        name: 'auto-commit',
        showSymbol: true,
        symbol: 'circle',
        type: 'line',
        xAxisIndex: 1,
        yAxisIndex: 1
    },
    {
        data: timeGemini,
        lineStyle: { type: 'dashed' },
        name: 'Gemini CLI',
        showSymbol: true,
        symbol: 'circle',
        type: 'line',
        xAxisIndex: 1,
        yAxisIndex: 1
    },
    {
        data: timeGemAdv,
        lineStyle: { type: 'dashed' },
        name: 'Gemini CLI (Advanced)',
        showSymbol: true,
        symbol: 'circle',
        type: 'line',
        xAxisIndex: 1,
        yAxisIndex: 1
    }
];

for (const [i, s] of series.entries()) {
    s.itemStyle = {
        color: stackColors[i % 3]
    };
}

option = {
    graphic: [
        {
            left: 40,
            style: {
                fill: '#444',
                fontSize: 12,
                fontWeight: 'bold',
                text: 'Token usage (log scale)'
            },
            top: 20,
            type: 'text'
        },
        {
            left: 40,
            style: {
                fill: '#444',
                fontSize: 12,
                fontWeight: 'bold',
                text: 'Execution time (seconds)'
            },
            top: 390, // muss zum unteren grid passen
            type: 'text'
        }
    ],

    grid: [
        {
            bottom: 450, // endet genau in der Mitte
            left: 60,
            right: 30,
            top: 80
        },
        {
            bottom: 80, // Platz für Legend
            left: 60,
            right: 30,
            top: 450 // startet exakt in der Mitte
        }
    ],
    legend: {
        bottom: 10,
        left: 'center'
    },

    series,

    tooltip: { trigger: 'axis' },

    // X-Achsen: beide category, zweite spiegelt die erste (für saubere Ausrichtung)
    xAxis: [
        {
            axisTick: { alignWithLabel: true },
            data: categories,
            gridIndex: 0,
            type: 'category'
        },
        {
            axisTick: { alignWithLabel: true },
            data: categories,
            gridIndex: 1,
            type: 'category'
        }
    ],

    // Y-Achsen: Tokens log, Time linear
    yAxis: [
        {
            gridIndex: 0,
            min: 1,
            minorSplitLine: { show: true },
            name: 'Tokens (log)',
            type: 'log'
        },
        {
            gridIndex: 1,
            min: 0,
            name: 'Time (s)',
            type: 'value'
        }
    ]
};
