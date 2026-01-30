// ===== FONT SIZE VARIABLES (same as yours) =====
const FONT = {
    axisLabel: 20,
    axisName: 20,
    barLabel: 16, // not used here, but kept consistent across charts
    legend: 20
};

// Optional: separate var for panel titles (graphic labels)
const PANEL_TITLE_FONT = 16;

// 2-Panel Small Multiples: Tokens (oben) + Time (unten)
const categories = ['Small', 'Medium', 'Large', 'Non-Code'];

// ---- Daten ----
const tokProposed = [545, 1877, 7884, 1838];
const tokGemini = [49_837, 67_987, 107_801, 65_231];
const tokGemAdv = [39_104, 47_624, 81_444, 45_712];

const timeProposed = [1.65, 2.12, 3.26, 2.63];
const timeGemini = [12.6, 14.4, 15.5, 14.3];
const timeGemAdv = [21.3, 15.6, 19, 15];

const stackColors = [
    '#C47A2C', // dark orange
    '#3A5F7D', // dark blue
    '#5B8C5A'  // dark green
];

const LINE_WIDTH = 4;
const SYMBOL_SIZE = LINE_WIDTH * 2.5;
const series = [
    // ---- TOKENS (oben, gridIndex 0) ----
    {
        data: tokProposed,
        lineStyle: {
            type: 'solid',
            width: LINE_WIDTH
        },
        name: 'auto-commit',
        showSymbol: true,
        symbol: 'circle',
        symbolSize: SYMBOL_SIZE,
        type: 'line',
        xAxisIndex: 0,
        yAxisIndex: 0
    },
    {
        data: tokGemini,
        lineStyle: {
            type: 'solid',
            width: LINE_WIDTH
        },
        name: 'Gemini CLI',
        showSymbol: true,
        symbol: 'circle',
        symbolSize: SYMBOL_SIZE,
        type: 'line',
        xAxisIndex: 0,
        yAxisIndex: 0
    },
    {
        data: tokGemAdv,
        lineStyle: {
            type: 'solid',
            width: LINE_WIDTH
        },
        name: 'Gemini CLI Advanced',
        showSymbol: true,
        symbol: 'circle',
        symbolSize: SYMBOL_SIZE,
        type: 'line',
        xAxisIndex: 0,
        yAxisIndex: 0
    },

    // ---- TIME (unten, gridIndex 1) ----
    {
        data: timeProposed,
        lineStyle: {
            type: 'dashed',
            width: LINE_WIDTH
        },
        name: 'auto-commit',
        showSymbol: true,
        symbol: 'circle',
        symbolSize: SYMBOL_SIZE,
        type: 'line',
        xAxisIndex: 1,
        yAxisIndex: 1
    },
    {
        data: timeGemini,
        lineStyle: {
            type: 'dashed',
            width: LINE_WIDTH
        },
        name: 'Gemini CLI',
        showSymbol: true,
        symbol: 'circle',
        symbolSize: SYMBOL_SIZE,
        type: 'line',
        xAxisIndex: 1,
        yAxisIndex: 1
    },
    {
        data: timeGemAdv,
        lineStyle: {
            type: 'dashed',
            width: LINE_WIDTH
        },
        name: 'Gemini CLI Advanced',
        showSymbol: true,
        symbol: 'circle',
        symbolSize: SYMBOL_SIZE,
        type: 'line',
        xAxisIndex: 1,
        yAxisIndex: 1
    }
];

for (const [i, s] of series.entries()) {
    s.itemStyle = { color: stackColors[i % 3] };
}

// ----- layout helpers -----
const alignLabel = (top) => top - 60;

const topMargin = 80;
const bottomMargin = 80;
const gap = 150;
const panelHeight = 425;

const topBottom = topMargin + panelHeight + gap;
const topTop = topMargin;

option = {
    graphic: [
        {
            left: 40,
            style: {
                fill: '#444',
                fontSize: PANEL_TITLE_FONT, // ✅ variable
                fontWeight: 'bold',
                text: 'Token usage (log scale)'
            },
            top: alignLabel(topTop),
            type: 'text'
        },
        {
            left: 40,
            style: {
                fill: '#444',
                fontSize: PANEL_TITLE_FONT, // ✅ variable
                fontWeight: 'bold',
                text: 'Execution time (seconds)'
            },
            top: alignLabel(topBottom),
            type: 'text'
        }
    ],

    grid: [
        { height: panelHeight, left: 60, right: 30, top: topMargin },
        { height: panelHeight, left: 60, right: 30, top: topBottom }
    ],

    legend: {
        bottom: 10,
        left: 'center',
        textStyle: {
            fontSize: FONT.legend // ✅ variable
        }
    },

    series,

    tooltip: { trigger: 'axis' },

    xAxis: [
        {
            axisLabel: {
                fontSize: FONT.axisLabel // ✅ variable
            },
            axisTick: { alignWithLabel: true },
            data: categories,
            gridIndex: 0,
            nameTextStyle: {
                fontSize: FONT.axisName // ✅ variable (future-proof)
            },
            type: 'category'
        },
        {
            axisLabel: {
                fontSize: FONT.axisLabel // ✅ variable
            },
            axisTick: { alignWithLabel: true },
            data: categories,
            gridIndex: 1,
            nameTextStyle: {
                fontSize: FONT.axisName // ✅ variable
            },
            type: 'category'
        }
    ],

    yAxis: [
        {
            axisLabel: {
                fontSize: FONT.axisLabel // ✅ variable
            },
            gridIndex: 0,
            min: 1,
            minorSplitLine: { show: true },
            name: 'Tokens (log)',
            nameTextStyle: {
                fontSize: FONT.axisName // ✅ variable
            },
            type: 'log'
        },
        {
            axisLabel: {
                fontSize: FONT.axisLabel // ✅ variable
            },
            gridIndex: 1,
            min: 0,
            name: 'Time (s)',
            nameTextStyle: {
                fontSize: FONT.axisName // ✅ variable
            },
            type: 'value'
        }
    ]
};
