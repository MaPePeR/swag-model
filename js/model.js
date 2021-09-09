/* eslint-env browser */
/* global ui, Matrix */

'use strict';

/* exported model */
var model = (function () {
    class Model {
        constructor() {
            this.infectionTypes = [];
            this.backgrounds = [];

            this.betaMultipliers = [];

            this.transitions = [];

            this.startConditon = new Matrix(0, 1);

            this.globalBetaPoints = [];
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
