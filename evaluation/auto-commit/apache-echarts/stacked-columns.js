// ===== FONT SIZE VARIABLES (same as yours) =====
const FONT = {
    axisLabel: 20,
    axisName: 20,
    barLabel: 16,
    legend: 20
};

const stackColors = [
    '#3A5F7D', // dark blue
    '#5B8C5A', // dark green
    '#C47A2C', // dark orange
    '#A64E4E', // dark red
    '#7E6C8D'  // dark purple
];

const series = [
    { data: [33, 32, 30], name: 'SUCCESS', stack: 'a', type: 'bar' },
    { data: [33, 13, 24], name: 'WHAT',    stack: 'a', type: 'bar' },
    { data: [21, 11, 24], name: 'WHY',     stack: 'a', type: 'bar' },
    { data: [33, 22, 29], name: 'FORMAT',  stack: 'a', type: 'bar' },
    { data: [28, 23, 30], name: 'TYPE',    stack: 'a', type: 'bar' }
];

// ===== COLOR + BORDER =====
for (const [i, s] of series.entries()) {
    s.itemStyle = {
        borderColor: '#ffffff',
        borderWidth: 1,
        color: stackColors[i]
    };
}

// ===== STACK BORDER RADIUS INFO =====
const stackInfo = {};
for (let i = 0; i < series[0].data.length; ++i) {
    for (const [j, element] of series.entries()) {
        const stackName = element.stack;
        if (!stackName) continue;

        if (!stackInfo[stackName]) {
            stackInfo[stackName] = { stackEnd: [], stackStart: [] };
        }

        const info = stackInfo[stackName];
        const data = element.data[i];

        if (data && data !== '-') {
            if (info.stackStart[i] == null) info.stackStart[i] = j;
            info.stackEnd[i] = j;
        }
    }
}

// ===== PER-BAR LABEL + RADIUS =====
for (const [i, element] of series.entries()) {
    const info = stackInfo[element.stack];

    for (let j = 0; j < element.data.length; ++j) {
        const isEnd = info.stackEnd[j] === i;
        const topBorder = isEnd ? 20 : 0;

        element.data[j] = {
            itemStyle: {
                borderRadius: [topBorder, topBorder, 0, 0]
            },
            label: {
                fontSize: FONT.barLabel, // ✅ centralized
                formatter: '{@value}',
                position: 'inside',
                show: true
            },
            value: element.data[j]
        };
    }
}

option = {
    grid: {
        bottom: 30,
        containLabel: true,
        left: 20,
        right: 100,
        top: 20
    },

    legend: {
        data: ['TYPE', 'FORMAT', 'WHY', 'WHAT', 'SUCCESS'],
        itemGap: 12,
        orient: 'vertical',
        right: 0,
        textStyle: {
            fontSize: FONT.legend // ✅ centralized
        },
        top: 'middle'
    },

    series,

    xAxis: {
        axisLabel: {
            fontSize: FONT.axisLabel // ✅ centralized
        },
        data: ['auto-commit', 'Gemini CLI', 'Gemini CLI Advanced'],
        nameTextStyle: {
            fontSize: FONT.axisName // ✅ centralized (future-proof)
        },
        type: 'category'
    },

    yAxis: {
        axisLabel: {
            fontSize: FONT.axisLabel // (doesn't show, but safe)
        },
        nameTextStyle: {
            fontSize: FONT.axisName // (doesn't show, but safe)
        },
        show: false,
        type: 'value'
    }
};
