const stackColors = [
    '#3A5F7D', // dark blue
    '#5B8C5A', // dark green
    '#C47A2C', // dark orange
    '#A64E4E', // dark red
    '#7E6C8D'  // dark purple
];

const series = [
    {
        data: [33, 32, 30],
        name: 'SUCCESS',
        stack: 'a',
        type: 'bar'
    },
    {
        data: [33, 13, 24],
        name: 'WHAT',
        stack: 'a',
        type: 'bar'
    },
    {
        data: [21, 11, 24],
        name: 'WHY',
        stack: 'a',
        type: 'bar'
    },
    {
        data: [33, 22, 29],
        name: 'FORMAT',
        stack: 'a',
        type: 'bar'
    },
    {
        data: [28, 23, 30],
        name: 'TYPE',
        stack: 'a',
        type: 'bar'
    }
];

for (const [i, s] of series.entries()) {
    s.itemStyle = {
        color: stackColors[i]
    };
}

for (const s of series) {
    s.itemStyle = {
        ...s.itemStyle,
        borderColor: '#ffffff',
        borderWidth: 1
    };
}



const stackInfo = {};
for (let i = 0; i < series[0].data.length; ++i) {
    for (const [j, element] of series.entries()) {
        const stackName = element.stack;
        if (!stackName) {
            continue;
        }

        if (!stackInfo[stackName]) {
            stackInfo[stackName] = {
                stackEnd: [],
                stackStart: []
            };
        }

        const info = stackInfo[stackName];
        const data = element.data[i];
        if (data && data !== '-') {
            if (info.stackStart[i] == null) {
                info.stackStart[i] = j;
            }

            info.stackEnd[i] = j;
        }
    }
}

for (const [i, element] of series.entries()) {
    const { data,name } = element;
    const info = stackInfo[element.stack];
    for (let j = 0; j < element.data.length; ++j) {
        // const isStart = info.stackStart[j] === i;
        const isEnd = info.stackEnd[j] === i;
        const topBorder = isEnd ? 20 : 0;
        const bottomBorder = 0;
        data[j] = {
            itemStyle: {
                borderRadius: [topBorder, topBorder, bottomBorder, bottomBorder]
            },
            label: {
                formatter: '{@value}',
                position: 'inside',
                show: true
            },
            value: data[j]
        };
    }
}

option = {
    grid: {
        bottom: 30,
        containLabel: true,
        left: 20,
        right: 100,   // ggf. größer, wenn Legende rechts ist
        top: 20
    },

    legend: {
        data: ['TYPE', 'FORMAT', 'WHY', 'WHAT', 'SUCCESS'],
        itemGap: 12,
        orient: 'vertical',   // ⬅ vertikal
        right: 10,            // oder: left: 10
        top: 'middle'        // vertikal zentriert
    },

    series,

    xAxis: {
        data: ['auto-commit', 'Gemini', 'Gemini Advanced'],
        type: 'category'
    },

    yAxis: {
        show: false,           // Y-Achse aus
        type: 'value'
    }
};
