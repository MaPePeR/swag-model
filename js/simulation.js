/* eslint-env browser */
/* global model */

'use strict';

/* exported simulation */
var simulation = (function () {

    class Simulation {
        compileStepFunction() {
            const infections = model.getInfectionTypes();
            const backgrounds = model.getBackgrounds();
            const ninf = infections.length;
            const nbackground = backgrounds.length;
            const timestepsize = (ninf + 1) * nbackground;

            const N = model.getStartConditon().array.reduce((a, b) => a + b);

            function result(offset, backgroundNumber, infNumber) {
                return 'result[' + offset + 'offset + ' + (backgroundNumber * (ninf + 1) + infNumber + 1) + ']';
            }

            function beta(infNumber) {
                return infections[infNumber].beta;
            }

            function gamma(infNumber) {
                return infections[infNumber].gamma;
            }

            function factor(infNumber, infBackground, expBackground) {
                return model.getBetaMultipliers(infNumber).get(expBackground, infBackground) / N;
            }

            function transition(infNumber, oldBackground, newBackground) {
                return model.getBackgroundTransitions(infNumber).get(oldBackground, newBackground);
            }

            let code = [[
                `(n, result) => {
                    let lastoffset = 0;
                    let nextoffset = `, timestepsize, `;
                    for (let i = 1; i < n; ++i) {\n`],
            [].concat.apply([], backgrounds.map(function (_, bgNumberExposed) {
                return [].concat.apply([], [].concat(
                    infections.map(function(_, infectionTypeNumber) {
                        /* Number of people with bgNumberExposed being infected with infectionTypeNumber */
                        return result('next', bgNumberExposed, infectionTypeNumber) + " = " + result('last', bgNumberExposed, -1) +  " * (\n       " + backgrounds.map((_, bgNumberInfectious) => {
                            /* Sum of all infected over all backgrounds */
                            /* Susceptible with background * infected with background * beta * contact/infectious-factor for backgrounds and infection */
                            return result('last', bgNumberInfectious, infectionTypeNumber) + ' * ' + (beta(infectionTypeNumber) * factor(infectionTypeNumber, bgNumberInfectious, bgNumberExposed));
                        }).join(" + ") + "\n    );\n";
                    }), [
                        /* add people that transitioned to this background after any infection */
                        result('next', bgNumberExposed, -1) + " = " + result('last', bgNumberExposed, -1) + "\n + ",
                        infections.map((_, infectionTypeNumber) => {
                            return backgrounds.map((_, infectedBackgrund) => {
                                return result('last', infectedBackgrund, infectionTypeNumber) + " * " +  (gamma(infectionTypeNumber) * transition(infectionTypeNumber, infectedBackgrund, bgNumberExposed));
                            }).join(" + ") +
                            /* and subtract newly infected people from susceptible */
                            "\n - " + result('next', bgNumberExposed, infectionTypeNumber);
                        }).join("\n + "), ";\n",
                    ], infections.map(function(_, infectionTypeNumber) {
                        return result('next', bgNumberExposed, infectionTypeNumber) + " += " + result('last', bgNumberExposed, infectionTypeNumber) + " * " + (1 - /* backgrounds.map((_, newBackground) => {
                            return (gamma(infectionTypeNumber) * transition(infectionTypeNumber, bgNumberExposed, newBackground));
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

        run(n) {
            let f = this.compileStepFunction();
            let start = model.getStartConditon();
            let result = new Float32Array(n * start.nrows * start.ncols);
            result.set(start.array);
            return f(n, result);
        }

    }

    return new Simulation();
})();
