/* eslint-env browser */
/* global model */

'use strict';

/* exported simulation */
var simulation = (function () {

    class Simulation {
        compileStepFunction() {
            const infections = model.getInfectionTypes();
            const groups = model.getGroups();
            const ninf = infections.length;
            const ngroup = groups.length;
            const timestepsize = (ninf + 1) * ngroup;

            const N = model.getInitialCondition().array.reduce((a, b) => a + b);

            function result(offset, groupNumber, infNumber) {
                return 'result[' + offset + 'offset + ' + (groupNumber * (ninf + 1) + infNumber + 1) + ']';
            }

            function beta(infNumber) {
                return infections[infNumber].beta;
            }

            function gamma(infNumber) {
                return infections[infNumber].gamma;
            }

            function factor(infNumber, infGroup, expGroup) {
                return model.getBetaMultipliers(infNumber).get(expGroup, infGroup) / N;
            }

            function transition(infNumber, oldGroup, newGroup) {
                return model.getGroupTransitions(infNumber).get(oldGroup, newGroup);
            }

            let code = [[
                `(n, result, globalbeta) => {
                    let lastoffset = 0;
                    let nextoffset = `, timestepsize, `;
                    for (let i = 1; i < n; ++i) {\n`],
            [].concat.apply([], groups.map(function (_, bgNumberExposed) {
                return [].concat.apply([], [].concat(
                    infections.map(function(_, infectionTypeNumber) {
                        /* Number of people with bgNumberExposed being infected with infectionTypeNumber */
                        return result('next', bgNumberExposed, infectionTypeNumber) + " = " + result('last', bgNumberExposed, -1) +  " * (\n       " + groups.map((_, bgNumberInfectious) => {
                            /* Sum of all infected over all groups */
                            /* Susceptible with group * infected with group * beta * contact/infectious-factor for groups and infection */
                            return result('last', bgNumberInfectious, infectionTypeNumber) + ' * globalbeta[i] * ' + (beta(infectionTypeNumber) * factor(infectionTypeNumber, bgNumberInfectious, bgNumberExposed));
                        }).join(" + ") + "\n    );\n";
                    }), [
                        /* add people that transitioned to this group after any infection */
                        result('next', bgNumberExposed, -1) + " = " + result('last', bgNumberExposed, -1) + "\n + ",
                        infections.map((_, infectionTypeNumber) => {
                            return groups.map((_, infectedBackgrund) => {
                                return result('last', infectedBackgrund, infectionTypeNumber) + " * " +  (gamma(infectionTypeNumber) * transition(infectionTypeNumber, infectedBackgrund, bgNumberExposed));
                            }).join(" + ") +
                            /* and subtract newly infected people from susceptible */
                            "\n - " + result('next', bgNumberExposed, infectionTypeNumber);
                        }).join("\n + "), ";\n",
                    ], infections.map(function(_, infectionTypeNumber) {
                        return result('next', bgNumberExposed, infectionTypeNumber) + " += " + result('last', bgNumberExposed, infectionTypeNumber) + " * " + (1 - /* groups.map((_, newGroup) => {
                            return (gamma(infectionTypeNumber) * transition(infectionTypeNumber, bgNumberExposed, newGroup));
                        }).reduce((a, b) => a + b)*//* Assume the sum of all transitions is 1, to not interfere with gamma */ gamma(infectionTypeNumber)) + ";\n";
                    })
                ));
            })),
            [`
                        lastoffset += `, timestepsize, `;
                        nextoffset += `, timestepsize, `;
                    }
                    return result;
                }`],
            ];

            code = [].concat.apply([], code).join('');

            return eval(code);
        }

        calculateGlobalBeta(n) {
            let globalbeta = new Float32Array(n);
            let points = model.getGlobalBetaPoints();
            if (points.length == 0) {
                globalbeta.fill(1);
                return globalbeta;
            }
            globalbeta.fill(points[0].y, 0, points[0].x);
            let lastPoint = points[0];
            for (let i = 1; i < points.length; i++) {
                const currentPoint = points[i];

                const m = (currentPoint.y - lastPoint.y) / (currentPoint.x - lastPoint.x);
                const b = lastPoint.y - m * lastPoint.x;
                for (let j = lastPoint.x; j < currentPoint.x; j++) {
                    globalbeta[j] = m * j + b;
                }
                globalbeta[currentPoint.x] = currentPoint.y;
                lastPoint = currentPoint;
            }
            globalbeta.fill(lastPoint.y, lastPoint.x);
            return globalbeta;
        }

        run(n) {
            let f = this.compileStepFunction();
            let initialCondition = model.getInitialCondition();
            let result = new Float32Array(n * initialCondition.nrows * initialCondition.ncols);

            const globalbeta = this.calculateGlobalBeta(n);

            result.set(initialCondition.array);
            return f(n, result, globalbeta);
        }

    }

    return new Simulation();
})();
