// ===== FONT SIZE VARIABLES =====
const FONT = {
    axisLabel: 20,
    axisName: 20,
    barLabel: 16,
    legend: 20
};

// ===== COLORS =====
const stackColors = [
    '#3A5F7D', // dark blue
    '#5B8C5A'  // dark green
];

function addThousandsSeparator(value) {
    if(!value) {
        return ""
    }

    return Number(value).toLocaleString('en-US');
}

function formatNumber(value) {
    return Number(value).toLocaleString('en-US', {
        maximumFractionDigits: 2,
        minimumFractionDigits: 2
    });
}

option = {
    dataset: {
        source: [
            ['', 'Time', 'Tokens'],
            ['branch-cleanup', 4.3, ],
            ['Gemini CLI', 97, 102_402],
            ['Gemini CLI Advanced', 147, 178_818]
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
            fontSize: FONT.legend
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
                fontSize: FONT.barLabel,
                formatter: ({ value }) => formatNumber(value[1]),
                position: 'inside',
                show: true
            },
            name: 'Time [s]',
            type: 'bar'
        },
        {
            barMaxWidth: 60,
            itemStyle: {
                borderRadius: [20, 20, 0, 0],
                color: stackColors[1]
            },
            label: {
                fontSize: FONT.barLabel,
                formatter: ({ value }) => addThousandsSeparator(value[2]),
                position: 'inside',
                show: true
            },
            name: 'Tokens',
            type: 'bar',
            yAxisIndex: 1
        }
    ],
    tooltip: {
        axisPointer: { type: 'shadow' },
        trigger: 'axis'
    },
    xAxis: {
        axisLabel: {
            fontSize: FONT.axisLabel,
            interval: 0,
            rotate: 25
        },
        nameTextStyle: {
            fontSize: FONT.axisName
        },
        type: 'category'
    },
    yAxis: [
        {
            axisLabel: {
                color: stackColors[0],
                fontSize: FONT.axisLabel
            },
            axisLine: {
                lineStyle: { color: stackColors[0] },
                show: true
            },
            name: 'Time [s]',
            nameTextStyle: {
                fontSize: FONT.axisName
            },
            position: 'left',
            type: 'value'
        },
        {
            axisLabel: {
                color: stackColors[1],
                fontSize: FONT.axisLabel
            },
            axisLine: {
                lineStyle: { color: stackColors[1] },
                show: true
            },
            name: 'Tokens',
            nameTextStyle: {
                fontSize: FONT.axisName
            },
            position: 'right',
            splitLine: { show: false },
            type: 'value'
        }
    ]
};
