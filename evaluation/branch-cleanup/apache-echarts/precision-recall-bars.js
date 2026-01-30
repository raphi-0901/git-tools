// ===== FONT SIZE VARIABLES (same as yours) =====
const FONT = {
    axisLabel: 20,
    axisName: 20,
    barLabel: 16,
    legend: 20
};

const stackColors = [
    '#3A5F7D', // dark blue
    '#5B8C5A'  // dark green
];

const roundTo2Dec = (num) => Math.round(num * 100) / 100;

// Grouped bar chart: Precision/Recall (%)
option = {
    dataset: {
        source: [
            ['', 'Precision', 'Recall'],
            ['branch-cleanup', 100, 100],
            ['Gemini CLI', roundTo2Dec((80 / (80 + 11)) * 100), roundTo2Dec((80 / 150) * 100)],
            ['Gemini CLI Advanced', roundTo2Dec((116 / (116 + 2)) * 100), roundTo2Dec((116 / 150) * 100)]
        ]
    },
    grid: {
        bottom: 50,
        containLabel: true,
        left: 20,
        right: 20,
        top: 80
    },
    legend: {
        bottom: 20,
        textStyle: {
            fontSize: FONT.legend // ✅ centralized
        }
    },
    series: [
        {
            barMaxWidth: 60,
            itemStyle: {
                borderRadius: [20, 20, 0, 0],
                color: stackColors[0]
            },
            label: {
                fontSize: FONT.barLabel, // ✅ centralized
                formatter: ({ value }) => value[1] || "",
                position: 'inside',
                show: true
            },
            name: 'Precision',
            type: 'bar'
        },
        {
            barMaxWidth: 60,
            itemStyle: {
                borderRadius: [20, 20, 0, 0],
                color: stackColors[1]
            },
            label: {
                fontSize: FONT.barLabel, // ✅ centralized
                formatter: ({ value }) => value[2] || "",
                position: 'inside',
                show: true
            },
            name: 'Recall',
            type: 'bar'
        }
    ],
    tooltip: {
        axisPointer: { type: 'shadow' },
        trigger: 'axis'
    },
    xAxis: {
        axisLabel: {
            fontSize: FONT.axisLabel, // ✅ centralized
            interval: 0,
            rotate: 25
        },
        nameTextStyle: {
            fontSize: FONT.axisName // ✅ centralized (future-proof)
        },
        type: 'category'
    },
    yAxis: {
        axisLabel: {
            fontSize: FONT.axisLabel // ✅ centralized
        },
        minInterval: 1,
        name: 'Percentage',
        nameTextStyle: {
            fontSize: FONT.axisName // ✅ centralized
        },
        type: 'value'
    }
};
