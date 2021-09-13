/* eslint-env browser */
/* global ui, Matrix */

'use strict';

/* exported model */
var model = (function () {
    const compressChars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";


    class Model {
        constructor() {
            this.infectionTypes = [];
            this.groups = [];

            this.betaMultipliers = [];

            this.transitions = [];

            this.initialCondition = new Matrix(0, 1);

            this.globalBetaPoints = [];

            this.timesteps = 200;
        }

        serialize() {
            function copyFloat32ArrayToView(view, offset, n, array) {
                for (let i = 0; i < n; ++i) {
                    view.setFloat32(4 * (offset + i), array[i]);
                }
            }

            const combinedNames = [].concat(
                this.infectionTypes.map(i => i.name),
                this.groups.map(i => i.name)
            ).join("\0");
            const N_I = this.infectionTypes.length;
            const N_B = this.groups.length;
            const N_GBP = this.globalBetaPoints.length;
            const datasize =
                4 +                    // Version Number/Meta
                4 +                    // Number of Infections(N_I)
                N_I * (4 + 4) +        // Beta + Gamma
                4 +                    // Number of Groups(N_B)
                4 * N_I * N_B * N_B +  // Beta multipliers
                4 * N_I * N_B * N_B +  // Transititios
                4 * (N_I + 1) * N_B +  // Initial condition
                4 +                    // Number of GlobalbetaPoints (N_GBP)
                N_GBP * (4 + 4) +      // Global Beta Points x, y
                4 +                    // Number of timesteps
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
            copyFloat32ArrayToView(view, offset, ((N_I + 1) * N_B), this.initialCondition.array);
            offset += ((N_I + 1) * N_B);
            view.setInt32(4 * offset++, N_GBP);
            for (var globalBetaPoint of this.globalBetaPoints) {
                view.setInt32(4 * offset++, globalBetaPoint.x);
                view.setFloat32(4 * offset++, globalBetaPoint.y);
            }
            view.setInt32(4 * offset++, this.timesteps);
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
            function f2d(f) {
                return parseFloat(f.toFixed(6));
            }

            function copyViewToFloat32Array(array, view, offset, n) {
                for (let i = 0; i < n; ++i) {
                    array[i] = f2d(view.getFloat32(4 * (offset + i)));
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
                    beta: f2d(view.getFloat32(4 * offset++)),
                    gamma: f2d(view.getFloat32(4 * offset++)),
                });
            }
            const N_B = view.getInt32(4 * offset++);
            this.groups = [];
            for (let i = 0; i < N_B; ++i) {
                this.groups.push({number: i});
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
            this.initialCondition = new Matrix(N_B, N_I + 1);
            copyViewToFloat32Array(this.initialCondition.array, view, offset,  (N_I + 1) * N_B);
            offset += ((N_I + 1) * N_B);
            const N_GBP = view.getInt32(4 * offset++);
            this.globalBetaPoints = [];
            for (let i = 0; i < N_GBP; ++i) {
                this.globalBetaPoints.push({
                    x: view.getInt32(4 * offset++),
                    y: view.getFloat32(4 * offset++),
                });
            }
            this.timesteps = view.getInt32(4 * offset++);
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
                this.groups[i  - N_I].name = names[i];
            }

            ui.recreateInfectionTypeTable();
            ui.recreateGroupTable();
            ui.updateTimesteps();
            ui.updateInitialConditionCard();
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

            this.betaMultipliers.push(new Matrix(this.groups.length, this.groups.length));

            this.transitions.push(new Matrix(this.groups.length, this.groups.length));

            this.initialCondition.addColumn();

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

            this.initialCondition.deleteColumn(1 + infectionTypeNumber);

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


        addGroup(groupName) {
            let number = this.groups.length;
            this.groups.push({name: groupName, number: number});

            for (const betaMultiplierMatrix of this.betaMultipliers) {
                betaMultiplierMatrix.addColumn();
                betaMultiplierMatrix.addRow();
            }

            for (const transitionMatrix of this.transitions) {
                transitionMatrix.addColumn();
                transitionMatrix.addRow();
            }

            this.initialCondition.addRow();

            ui.recreateGroupTable();
        }

        updateGroup(number, groupName) {
            this.groups[number] = {name: groupName, number: number};
            ui.recreateGroupTable();
        }

        deleteGroup(number) {
            this.groups.forEach(function (type, i) {
                if (type.number > number) {
                    type.number -= 1;
                }
            });
            this.groups = this.groups.filter((item, i) => i != number);

            for (const betaMultiplierMatrix of this.betaMultipliers) {
                betaMultiplierMatrix.deleteColumn(number);
                betaMultiplierMatrix.deleteRow(number);
            }

            for (const transitionMatrix of this.transitions) {
                transitionMatrix.deleteColumn(number);
                transitionMatrix.deleteRow(number);
            }

            this.initialCondition.deleteRow(number);

            ui.recreateGroupTable();
        }

        getGroup(number) {
            return this.groups[number];
        }

        getGroups() {
            return this.groups.map(type => Object.assign({}, type));
        }

        getGroupNames() {
            return this.getGroups().map(bg => bg.name);
        }

        getBetaMultipliers(infectionTypeNumber) {
            return this.betaMultipliers[infectionTypeNumber];
        }

        setBetaMultipliers(infectionTypeNumber, betaMultiplier) {
            this.betaMultipliers[infectionTypeNumber].setData(betaMultiplier);
        }

        setGroupTransitions(infectionTypeNumber, transitions) {
            this.transitions[infectionTypeNumber].setData(transitions);
        }

        getGroupTransitions(infectionTypeNumber) {
            return this.transitions[infectionTypeNumber];
        }

        setInitialCondition(initialCondition) {
            this.initialCondition.setData(initialCondition);

            ui.updateInitialConditionCard();
        }
        getInitialCondition() {
            return this.initialCondition;
        }

        getGlobalBetaPoints() {
            return this.globalBetaPoints.map(d => {
                return {x: d.x, y: d.y};
            });
        }
        setGlobalBetaPoints(points) {
            this.globalBetaPoints = points;
        }

        setTimesteps(n) {
            this.timesteps = Math.round(n);
        }
        getTimesteps() {
            return this.timesteps;
        }
    }

    return new Model();
})();
