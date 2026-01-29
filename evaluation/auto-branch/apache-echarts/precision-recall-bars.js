const stackColors = [
    '#3A5F7D', // dark blue
    '#5B8C5A' // dark green
];

const roundTo2Dec = (num) => Math.round(num * 100) / 100

// Grouped bar chart: Failure modes (counts) for Gemini vs Gemini Advanced
option = {
    dataset: {
        source: [
            ['', 'Precision', 'Recall'],
            ['branch-cleanup', 100, 100],
            ['Gemini CLI', roundTo2Dec((80 / (80 + 11)) * 100), roundTo2Dec((80/150) * 100)],
            ['Gemini CLI Advanced', roundTo2Dec((116 / (116 + 2)) * 100), roundTo2Dec((116/150) * 100)]
        ]
    },
    grid: {
        bottom: 50,
        containLabel: true,
        left: 20,
        top: 80
    },
    legend: {
        bottom: 20
    },
    series: [
        {
            barMaxWidth: 60,
            itemStyle: {
                borderRadius: [20, 20, 0, 0],
                color: stackColors[0]
            },
            label: {
                formatter: ({ value }) => value[1] || "", // Gemini Advanced
                position: 'inside',
                show: true
            },
            type: 'bar',
        },
        {
            barMaxWidth: 60,
            itemStyle: {
                borderRadius: [20, 20, 0, 0],
                color: stackColors[1]
            },
            label: {
                formatter: ({ value }) => value[2] || "", // Gemini Advanced
                position: 'inside',
                show: true
            },
            type: 'bar',
        }
    ],
    tooltip: {
        axisPointer: { type: 'shadow' },
        trigger: 'axis'
    },
    xAxis: {
        axisLabel: {
            interval: 0,
            rotate: 25
        },
        type: 'category'
    },
    yAxis: {
        minInterval: 1,
        name: 'Percentage',
        type: 'value'
    }
};
