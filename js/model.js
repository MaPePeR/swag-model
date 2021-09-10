/* eslint-env browser */
/* global ui, Matrix */

'use strict';

/* exported model */
var model = (function () {
    const compressChars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";


    class Model {
        constructor() {
            this.infectionTypes = [];
            this.backgrounds = [];

            this.betaMultipliers = [];

            this.transitions = [];

            this.startConditon = new Matrix(0, 1);

            this.globalBetaPoints = [];
        }

        serialize() {
            function copyFloat32ArrayToView(view, offset, n, array) {
                for (let i = 0; i < n; ++i) {
                    view.setFloat32(4 * (offset + i), array[i]);
                }
            }

            const combinedNames = [].concat(
                this.infectionTypes.map(i => i.name),
                this.backgrounds.map(i => i.name)
            ).join("\0");
            const N_I = this.infectionTypes.length;
            const N_B = this.backgrounds.length;
            const N_GBP = this.globalBetaPoints.length;
            const datasize =
                4 +                    // Version Number/Meta
                4 +                    // Number of Infections(N_I)
                N_I * (4 + 4) +        // Beta + Gamma
                4 +                    // Number of Backgrounds(N_B)
                4 * N_I * N_B * N_B +  // Beta multipliers
                4 * N_I * N_B * N_B +  // Transititios
                4 * (N_I + 1) * N_B +  // Start condition
                4 +                    // Number of GlobalbetaPoints (N_GBP)
                N_GBP * (4 + 4) +      // Global Beta Points x, y
                4 +                    // Number of 4 Byte chars for 0 separated Names
                combinedNames.length * 4;
            const buffer = new ArrayBuffer(datasize);
            const view = new DataView(buffer);
            let offset = 0;

            view.setInt32(4 * offset++, 1);
            view.setInt32(4 * offset++, N_I);
            for (const infection of this.infectionTypes) {
                view.setFloat32(4 * offset++, infection.beta);
                view.setFloat32(4 * offset++, infection.gamma);
            }
            view.setInt32(4 * offset++, N_B);
            for (const infectionTypeNumber in this.infectionTypes) {
                copyFloat32ArrayToView(view, offset, N_B * N_B, this.betaMultipliers[infectionTypeNumber].array);
                offset += N_B * N_B;
            }
            for (const infectionTypeNumber in this.infectionTypes) {
                copyFloat32ArrayToView(view, offset, N_B * N_B, this.transitions[infectionTypeNumber].array);
                offset += N_B * N_B;
            }
            copyFloat32ArrayToView(view, offset, ((N_I + 1) * N_B), this.startConditon.array);
            offset += ((N_I + 1) * N_B);
            view.setInt32(4 * offset++, N_GBP);
            for (var globalBetaPoint of this.globalBetaPoints) {
                view.setInt32(4 * offset++, globalBetaPoint.x);
                view.setFloat32(4 * offset++, globalBetaPoint.y);
            }
            view.setInt32(4 * offset++, combinedNames.length);
            for (let i = 0; i < combinedNames.length; ++i) {
                view.setInt32(4 * offset++, combinedNames.codePointAt(i));
            }

            if (offset * 4 !== datasize) {
                throw "something wrong with serilization";
            }

            return new Promise(resolve => {
                const blob = new Blob([new Uint8Array(buffer)]);
                const reader = new FileReader();
                reader.onload = (event) => {
                    const result = reader.result;
                    if (result.substr(0, 37) == "data:application/octet-stream;base64,") {
                        resolve(result.substr(37));
                    } else {
                        resolve(null);
                    }
                };
                reader.readAsDataURL(blob);
            });
        }

        deserializeB64(b64) {
            const url = "data:application/octet-stream;base64," + b64;
            fetch(url)
                .then(res => res.arrayBuffer())
                .then(this.deserializeBuffer.bind(this));
        }

        deserializeBuffer(buffer) {
            function copyViewToFloat32Array(array, view, offset, n) {
                for (let i = 0; i < n; ++i) {
                    array[i] = view.getFloat32(4 * (offset + i));
                }
            }

            const view = new DataView(buffer);
            let offset = 0;

            const version = view.getInt32(4 * offset++);
            if (version != 1) {
                throw "Unknown version";
            }
            const N_I = view.getInt32(4 * offset++);
            this.infectionTypes = [];
            for (let i = 0; i < N_I; ++i) {
                this.infectionTypes.push({
                    number: i,
                    beta: view.getFloat32(4 * offset++),
                    gamma: view.getFloat32(4 * offset++),
                });
            }
            const N_B = view.getInt32(4 * offset++);
            this.backgrounds = [];
            for (let i = 0; i < N_B; ++i) {
                this.backgrounds.push({number: i});
            }
            this.betaMultipliers = [];
            for (const _ in this.infectionTypes) {
                const m = new Matrix(N_B, N_B);
                copyViewToFloat32Array(m.array, view, offset, N_B * N_B);
                offset += N_B * N_B;
                this.betaMultipliers.push(m);
            }
            this.transitions = [];
            for (const _ in this.infectionTypes) {
                const m = new Matrix(N_B, N_B);
                copyViewToFloat32Array(m.array, view, offset, N_B * N_B);
                offset += N_B * N_B;
                this.transitions.push(m);
            }
            this.startConditon = new Matrix(N_B, N_I + 1);
            copyViewToFloat32Array(this.startConditon.array, view, offset,  (N_I + 1) * N_B);
            offset += ((N_I + 1) * N_B);
            const N_GBP = view.getInt32(4 * offset++);
            this.globalBetaPoints = [];
            for (let i = 0; i < N_GBP; ++i) {
                this.globalBetaPoints.push({
                    x: view.getInt32(4 * offset++),
                    y: view.getFloat32(4 * offset++),
                });
            }
            const N_names = view.getInt32(4 * offset++);
            let names = [];
            for (let i = 0; i < N_names; i++) {
                names.push(String.fromCodePoint(view.getInt32(4 * offset++)));
            }
            names = names.join('').split("\0");
            let i = 0;
            for (; i < N_I; ++i) {
                this.infectionTypes[i].name = names[i];
            }
            for (; i < N_B + N_I; ++i) {
                this.backgrounds[i  - N_I].name = names[i];
            }

            ui.recreateInfectionTypeTable();
            ui.recreateBackgroundTable();
        }

        compressB64(b64text) {
            const regex = new RegExp('A{3,' + (compressChars.length + 2) + '}', 'g');
            return b64text.replace(regex, function (repetition) {
                return "*" + compressChars[repetition.length - 3];
            });
        }
        decompressB64(compressed) {
            const regex = new RegExp('\\*[' + compressChars + ']', 'g');
            return compressed.replace(regex, function (repetition) {
                return "A".repeat(3 + compressChars.indexOf(repetition[1]));
            });
        }


        createInfectionType(number, data) {
            return {
                name: data.name,
                beta: data.beta,
                gamma: data.gamma,
                number: number,
            };
        }

        addInfectionType(infectionType) {
            let newInfectionType = this.createInfectionType(this.infectionTypes.length, infectionType);
            this.infectionTypes.push(newInfectionType);

            this.betaMultipliers.push(new Matrix(this.backgrounds.length, this.backgrounds.length));

            this.transitions.push(new Matrix(this.backgrounds.length, this.backgrounds.length));

            this.startConditon.addColumn();

            ui.recreateInfectionTypeTable();
            return newInfectionType.number;
        }

        deleteInfectionType(infectionTypeNumber) {
            this.infectionTypes.forEach(function (type, i) {
                if (type.number > infectionTypeNumber) {
                    type.number -= 1;
                }
            });
            this.infectionTypes = this.infectionTypes.filter((item, i) => i != infectionTypeNumber);

            this.betaMultipliers = this.betaMultipliers.filter((item, i) => i != infectionTypeNumber);

            this.transitions = this.transitions.filter((item, i) => i != infectionTypeNumber);

            this.startConditon.deleteColumn(1 + infectionTypeNumber);

            ui.recreateInfectionTypeTable();
        }

        getInfectionType(infectionTypeNumber) {
            return Object.assign({}, this.infectionTypes[infectionTypeNumber]);
        }

        getInfectionTypes() {
            return this.infectionTypes.map(type => Object.assign({}, type));
        }

        updateInfectionType(infectionTypeNumber, infectionType) {
            this.infectionTypes[infectionTypeNumber] = this.createInfectionType(infectionTypeNumber, infectionType);
            ui.recreateInfectionTypeTable();
        }


        addBackground(backgroundName) {
            let number = this.backgrounds.length;
            this.backgrounds.push({name: backgroundName, number: number});

            for (const betaMultiplierMatrix of this.betaMultipliers) {
                betaMultiplierMatrix.addColumn();
                betaMultiplierMatrix.addRow();
            }

            for (const transitionMatrix of this.transitions) {
                transitionMatrix.addColumn();
                transitionMatrix.addRow();
            }

            this.startConditon.addRow();

            ui.recreateBackgroundTable();
        }

        updateBackground(number, backgroundName) {
            this.backgrounds[number] = {name: backgroundName, number: number};
            ui.recreateBackgroundTable();
        }

        deleteBackground(number) {
            this.backgrounds.forEach(function (type, i) {
                if (type.number > number) {
                    type.number -= 1;
                }
            });
            this.backgrounds = this.backgrounds.filter((item, i) => i != number);

            for (const betaMultiplierMatrix of this.betaMultipliers) {
                betaMultiplierMatrix.deleteColumn(number);
                betaMultiplierMatrix.deleteRow(number);
            }

            for (const transitionMatrix of this.transitions) {
                transitionMatrix.deleteColumn(number);
                transitionMatrix.deleteRow(number);
            }

            this.startConditon.deleteRow(number);

            ui.recreateBackgroundTable();
        }

        getBackground(number) {
            return this.backgrounds[number];
        }

        getBackgrounds() {
            return this.backgrounds.map(type => Object.assign({}, type));
        }

        getBackgroundNames() {
            return this.getBackgrounds().map(bg => bg.name);
        }

        getBetaMultipliers(infectionTypeNumber) {
            return this.betaMultipliers[infectionTypeNumber];
        }

        setBetaMultipliers(infectionTypeNumber, betaMultiplier) {
            this.betaMultipliers[infectionTypeNumber].setData(betaMultiplier);
        }

        setBackgroundTransitions(infectionTypeNumber, transitions) {
            this.transitions[infectionTypeNumber].setData(transitions);
        }

        getBackgroundTransitions(infectionTypeNumber) {
            return this.transitions[infectionTypeNumber];
        }

        setStartCondition(startConditon) {
            this.startConditon.setData(startConditon);
        }
        getStartConditon() {
            return this.startConditon;
        }

        getGlobalBetaPoints() {
            return this.globalBetaPoints.map(d => {
                return {x: d.x, y: d.y};
            });
        }
        setGlobalBetaPoints(points) {
            this.globalBetaPoints = points;
        }
    }

    return new Model();
})();
