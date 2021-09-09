/* eslint-env browser */
/* global model */
/* global d3 */

'use strict';

/* exported plot */
var plot = (function () {
    class EditableLinePlot {
        constructor(element, width, height, xdomain, ydomain) {
            const margin = {top: 20, right: 30, bottom: 30, left: 55};
            this.element = element;
            this.width = width;
            this.height = height;
            this.xdomain = xdomain;
            this.x = d3.scaleLinear()
                .clamp(true)
                .domain(xdomain)
                .range([ 0, width]);
            this.ydomain = ydomain;
            this.y = d3.scaleLinear()
                .clamp(true)
                .domain(ydomain)
                .range([ height, 0]);
            this.nodes = [];
            this.links = [];
            this.svg = d3.select(this.element).append('svg')
                .on("click", (event, d) => {
                    var coords = d3.pointer(event);
                    this.insertPoint(this.x.invert(coords[0] - margin.left), this.y.invert(coords[1] - margin.top));
                })
                .attr('class', 'editablelineplot')
                .attr('width', width + margin.left + margin.right)
                .attr('height', height + margin.bottom + margin.top)
                .attr('viewBox', [0, 0, width + margin.left + margin.right, height + margin.bottom + margin.top])
                .append("g")
                    .attr("transform",
                        `translate(${margin.left}, ${margin.top})`);
            this.svg.append("g")
                .call(d3.axisLeft(this.y));
            this.svg.append("g")
                .attr("transform", `translate(0, ${height})`)
                .call(d3.axisBottom(this.x).ticks(5));
            this.svglinks = this.svg.append("g")
                .attr("class", "link").style('stroke', '#999');
            this.svgnodes = this.svg.append("g")
                .attr("class", "node");
        }

        insertPoint(x, y) {
            x = Math.round(x);
            this.nodes.push({
                x: this.x(x),
                y: this.y(y),
                datax: x,
                datay: y,
            });
            this.nodes.sort((a, b) => d3.ascending(a.datax, b.datax));
            this.redrawNodes();
            this.redrawLines();
        }
        redrawNodes() {
            this.svgnodes.selectAll('circle')
                .data(this.nodes)
                    .join("circle")
                        .attr("r", 4)
                        .attr("cx", d => d.x)
                        .attr("cy", d => d.y)
                        .on('click', function (lineplot) {
                            return function (event, d) {
                                lineplot.nodes = lineplot.nodes.filter(item => item !== d);
                                lineplot.redrawNodes();
                                lineplot.redrawLines();
                                event.stopPropagation();
                            };
                        }(this))
                        .call((function (lineplot) {
                            function dragstarted(event, d) {
                                d3.select(this).attr("stroke", "blue");
                            }

                            function dragged(event, d) {
                                d.datax = Math.round(lineplot.x.invert(event.x));
                                d.datay = lineplot.y.invert(event.y);
                                d.x = lineplot.x(d.datax);
                                d.y = lineplot.y(d.datay);
                                d3.select(this).attr("cx", d.x).attr("cy", d.y);
                                lineplot.redrawLines();
                            }

                            function dragended(event, d) {
                                d3.select(this).attr("stroke", null);
                            }

                            return d3.drag()
                              .on("start", dragstarted)
                              .on("drag", dragged)
                              .on("end", dragended);
                        })(this));
        }
        redrawLines() {
            this.nodes.sort((a, b) => d3.ascending(a.datax, b.datax));
            const links = this.nodes.map((item, i) => {
                return {
                    x1: i > 0 ? this.nodes[i - 1].x : this.x(this.xdomain[0]),
                    y1: i > 0 ? this.nodes[i - 1].y : item.y,
                    x2: item.x,
                    y2: item.y,
                };
            });
            if (this.nodes.length > 0) {
                links.push({
                    x1: this.nodes[this.nodes.length - 1].x,
                    y1: this.nodes[this.nodes.length - 1].y,
                    x2: this.x(this.xdomain[1]),
                    y2: this.nodes[this.nodes.length - 1].y,
                });
            }
            this.svglinks.selectAll('line')
                .data(links).join('line')
                    .attr("x1", d => d.x1)
                    .attr("y1", d => d.y1)
                    .attr("x2", d => d.x2)
                    .attr("y2", d => d.y2);
        }

        getData() {
            return this.nodes.map(d => {
                return {
                    x: d.datax,
                    y: d.datay,
                };
            });
        }
    }


    class Plot {
        constructor() {
            this.EditableLinePlot = EditableLinePlot;
        }
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
