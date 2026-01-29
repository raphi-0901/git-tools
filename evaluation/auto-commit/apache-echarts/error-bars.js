const stackColors = [
    '#3A5F7D', // dark blue
    '#5B8C5A' // dark green
];

// Grouped bar chart: Failure modes (counts) for Gemini vs Gemini Advanced
option = {
    dataset: {
        source: [
            ['Failure Mode', 'Gemini', 'Gemini Advanced'],
            ['Unsafe Git behavior', 0, 2],
            ['Infinite behavior', 0, 2],
            ['Execution failure', 1, 3],
            ['Human intervention', 24, 0],
            ['Malformed output', 20, 12]
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
        name: 'Occurrences',
        type: 'value'
    }
};
