/* eslint-env browser */
/* global model */
/* global d3 */

'use strict';

/* exported plot */
var plot = (function () {
    class Plot {
        plot(data) {
            document.getElementById('plot1').innerHTML = '';
            const infections = model.getInfectionTypes();
            const backgrounds = model.getBackgrounds();

            const timestepsize =  (infections.length + 1) * backgrounds.length;
            const timesteps = data.length / timestepsize;

            const margin = {top: 20, right: 30, bottom: 30, left: 55},
                width = 800 - margin.left - margin.right,
                height = 400 - margin.top - margin.bottom;

            // append the svg object to the body of the page
            const svg = d3.select("#plot1")
                .append("svg")
                    .attr("width", '100%'/*width + margin.left + margin.right*/)
                    .attr("height", height + margin.top + margin.bottom)
                    .attr('viewBox', [0, 0, width + margin.left + margin.right, height + margin.top + margin.bottom])
                .append("g")
                    .attr("transform",
                        `translate(${margin.left}, ${margin.top})`);

            // List of groups = header of the csv files
            const keys = d3.range(timestepsize);

            //stack the data?
            const stackedData = d3.stack()
                .keys(keys)
                .value(
                    //key => data.subarray(key * timestepsize, (key + 1) * timestepsize)
                    (d, key) => {
                        return data[d * timestepsize + key];
                    }
                )(d3.range(0, timesteps));

            // Add X axis
            const x = d3.scaleLinear()
                .domain([0, timesteps])
                .range([ 0, width ]);
            svg.append("g")
                .attr("transform", `translate(0, ${height})`)
                .call(d3.axisBottom(x).ticks(5));

            const max = d3.max(stackedData, d => d3.max(d, d => d[1]));
            // Add Y axis
            const y = d3.scaleLinear()
                .domain([0, max])
                .range([ height, 0 ]);
            svg.append("g")
                .call(d3.axisLeft(y));

            // color palette
            const color = d3.scaleOrdinal()
                .domain(keys)
                .range(d3.schemeCategory10);



            // Show the areas
            svg
                .selectAll("mylayers")
                .data(stackedData)
                .join("path")
                    .style("fill", (d, i) => color(i))
                    .attr("d", d3.area()
                        .x((d, i) => x(d.data))
                        .y0(d => y(d[0]))
                        .y1(d => y(d[1]))
                    )
                    .append('title').html((d, i) => {
                        const inf = i % (infections.length + 1);
                        const bg = Math.floor(i / (infections.length + 1));
                        return backgrounds[bg].name + " " + (inf == 0 ? "Uninfected" : infections[inf - 1].name);
                    });
        }
    }

    return new Plot();
})();
