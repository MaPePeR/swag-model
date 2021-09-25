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

            this.margin = {top: 20, right: 30, bottom: 30, left: 55};
            this.width = 800;
            this.height = 400;
        }

        plotMatrix(svg, matrix, colorMap, rowLabels, columnLabels) {
            const tableCellHeight = 20;
            const tableCellWidth = 20;
            const topLabelHeight = 40;
            const leftLabelWidth = 40;
            const tableHeight =  matrix.nrows * tableCellHeight;
            const tableWidth = matrix.ncols * tableCellWidth;
            const height = tableHeight + this.margin.bottom + this.margin.top + topLabelHeight;

            const matrixView = matrix.arrayView();
            svg = d3.select(svg)
                .attr('width', '100%')
                .attr('height', height)
                .attr('viewBox', [
                    -leftLabelWidth,
                    -this.margin.top - topLabelHeight,
                    2 * leftLabelWidth + tableWidth,
                    this.margin.top + topLabelHeight + tableHeight + this.margin.top,
                ]);
            svg.selectAll("*").remove();
            const rows = svg.selectAll('.matrixplotrow')
                .data(matrixView)
                .enter().append("g")
                    .attr("class", "matrixplotrow")
                    .attr("transform", function(d, i) {
                        return "translate(0," + (i * tableCellHeight) + ")";
                    });
            rows.selectAll(".cell")
                    .data(d => d)
                .enter().append("rect")
                    .attr("class", "cell")
                    .attr("x", (d, i) => i * tableCellWidth)
                    .attr("width", tableCellWidth - 1)
                    .attr("height", tableCellHeight - 1)
                    .style("fill", colorMap)
                    //.attr('stroke', 'black')
                    //.attr('stroke-width', 0.5)
                    .append('title')
                        .text(d => d);
            svg.append('g').selectAll('text')
                .data(rowLabels).enter()
                    .append('text')
                    .attr('x', -3)
                    .attr("y", (d, i) => (i + 1) * tableCellHeight)
                    .attr('text-anchor', "end")
                    .attr('dominant-baseline', "text-after-edge")
                    .text(d => d);
            svg.append('g').selectAll('text')
                .data(columnLabels).enter()
                    .append('text')
                    .attr('transform', (d, i) => 'translate(' + (i + 0.5) * tableCellWidth + ', 0) rotate(-45) ')
                    .text(d => d);
        }

        makeSVG(id) {
            d3.select(id).selectAll("*").remove();
            return d3.select(id)
                .attr("width", '100%'/*width + margin.left + margin.right*/)
                .attr("height", this.height + this.margin.top + this.margin.bottom)
                .attr('viewBox', [0, 0, this.width + this.margin.left + this.margin.right, this.height + this.margin.top + this.margin.bottom])
            .append("g")
                .attr("transform", `translate(${this.margin.left}, ${this.margin.top})`);
        }
        makeXaxis(svg, xdomain) {
            const x = d3.scaleLinear()
                .domain(xdomain)
                .range([ 0, this.width ]);
            svg.append("g")
                .attr("transform", `translate(0, ${this.height})`)
                .call(d3.axisBottom(x).ticks(5));
            return x;
        }
        makeYaxis(svg, ydomain) {
            const y = d3.scaleLinear()
                .domain(ydomain)
                .range([ this.height, 0 ]);
            svg.append("g")
                .call(d3.axisLeft(y));
            return y;
        }
        plot(data) {
            document.getElementById('resultrow').style.display = 'block';
            this.plotArea(data);
            this.plotLines(data);
            this.plotLinesCombinedGroups(data);
        }
        plotArea(data) {
            const infections = model.getInfectionTypes();
            const groups = model.getGroups();

            const timestepsize =  (infections.length + 1) * groups.length;
            const timesteps = data.length / timestepsize;

            // append the svg object to the body of the page
            const svg = this.makeSVG('#plotArea');

            // List of groups = header of the csv files
            const keys = d3.range(timestepsize).map(d => {
                return (infections.length + 1) * (d % groups.length) + Math.floor(d / groups.length);
            });

            //stack the data?
            const stackedData = d3.stack()
                .keys(keys)
                .value(
                    //key => data.subarray(key * timestepsize, (key + 1) * timestepsize)
                    (d, key) => {
                        return data[d * timestepsize + key];
                    }
                )(d3.range(0, timesteps));

            const x = this.makeXaxis(svg, [0, timesteps]);

            const max = d3.max(stackedData, d => d3.max(d, d => d[1]));


            // color palette
            const color = d3.scaleOrdinal()
                .domain(d3.range(timestepsize))
                .range(d3.schemeCategory10);

            const y = this.makeYaxis(svg, [0, max]);

            // Show the areas
            svg
                .selectAll("mylayers")
                .data(stackedData)
                .join("path")
                    .style("fill", (d, i) => color(d.key))
                    .attr("d", d3.area()
                        .x((d, i) => x(d.data))
                        .y0(d => y(d[0]))
                        .y1(d => y(d[1]))
                    )
                    .append('title').html((d, i, a) => {
                        const inf = d.key % (infections.length + 1);
                        const bg = Math.floor(d.key / (infections.length + 1));
                        return groups[bg].name + " " + (inf == 0 ? "Uninfected" : infections[inf - 1].name);
                    });
        }

        plotLines(data) {
            const infections = model.getInfectionTypes();
            const groups = model.getGroups();

            const timestepsize =  (infections.length + 1) * groups.length;
            const timesteps = data.length / timestepsize;

            const svg = this.makeSVG('#plotLines');

            const max = d3.max(data);

            const x = this.makeXaxis(svg, [0, timesteps]);
            const y = this.makeYaxis(svg, [0, max]);

            const keys = d3.range(timestepsize);

            // color palette
            const color = d3.scaleOrdinal()
                .domain(keys)
                .range(d3.schemeCategory10);

            const xvalues = d3.range(timesteps);

            svg.append('g')
                .selectAll("path")
                .data(keys)
                .join('path')
                    .attr("fill", "none")
                    .attr("stroke-width", 1)
                    .attr("stroke", d => color(d))
                    .attr("d", series => (d3.line()
                            .x(d => x(d))
                            .y(d => y(data[d * timestepsize + series]))(xvalues))
                    )
                    .append('title').html((d, i) => {
                        const inf = i % (infections.length + 1);
                        const bg = Math.floor(i / (infections.length + 1));
                        return groups[bg].name + " " + (inf == 0 ? "Uninfected" : infections[inf - 1].name);
                    });
        }

        plotLinesCombinedGroups(data) {
            const infections = model.getInfectionTypes();
            const groups = model.getGroups();

            const timestepsize =  (infections.length + 1) * groups.length;
            const timesteps = data.length / timestepsize;

            const svg = this.makeSVG('#plotLinesCombined');

            const n_infectionstates = infections.length + 1;

            const sums = new Float32Array(n_infectionstates * timesteps);
            for (let i = 0; i < timesteps; i++) {
                for (let infection = 0; infection < infections.length + 1; infection++) {
                    for (let bg = 0; bg < groups.length; bg++) {
                        sums[i * n_infectionstates + infection] += data[i * timestepsize + bg * n_infectionstates + infection];
                    }
                }
            }

            const max = d3.max(sums);

            const x = this.makeXaxis(svg, [0, timesteps]);
            const y = this.makeYaxis(svg, [0, max]);

            const keys = d3.range(infections.length + 1);

            // color palette
            const color = d3.scaleOrdinal()
                .domain(keys)
                .range(d3.schemeCategory10);

            const xvalues = d3.range(timesteps);

            svg.append('g')
                .selectAll("path")
                .data(keys)
                .join('path')
                    .attr("fill", "none")
                    .attr("stroke-width", 1)
                    .attr("stroke", d => color(d))
                    .attr("d", series => (d3.line()
                            .x(d => x(d))
                            .y(d => y(sums[d * n_infectionstates + series]))(xvalues))
                    )
                    .append('title').html((d, i) => {
                        return (d == 0 ? "Uninfected" : infections[d - 1].name);
                    });
        }

    }

    return new Plot();
})();
