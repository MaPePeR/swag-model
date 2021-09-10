/* eslint-env browser */
/* global bootstrap, d3 */
/* global model, simulation, NumberInputTable */

'use strict';

/* exported ui */
var ui = (function () {


    class FormModal {
        constructor(element) {
            this.element = element;
            this.modal = new bootstrap.Modal(element);
            document.addEventListener("DOMContentLoaded", (function () {
                this.element.addEventListener('show.bs.modal', (function (event) {
                    this.onShow(event);
                }).bind(this));
                for (const el of this.element.querySelectorAll('button.formmodalsubmit')) {
                    el.addEventListener('click', (function (button, event) {
                        const submitType = button.dataset.modalsubmittype;
                        if (this.validate(submitType, event)) {
                            this.onSubmit(submitType, event);
                            this.modal.hide();
                        }
                    }).bind(this, el));
                }
            }).bind(this));
        }
        onShow(event) {

        }
        validate(submitType, event) {
            return true;
        }
        onSubmit(submitType, event) {

        }
    }

    new class extends FormModal {
        onShow(event) {
            let button = event.relatedTarget;
            this.infectionType = button.getAttribute('data-infection-type');
            var modalTitle = this.element.querySelector('.modal-title');

            if (this.infectionType == "new") {
                modalTitle.textContent = 'New infection type';
                this.element.querySelector('#infectionTypeName').value = '';
                this.element.querySelector('#infectionTypeBeta').value = '';
                this.element.querySelector('#infectionTypeGamma').value = '';
                this.element.querySelector('.formmodalsubmit[data-modalsubmittype="delete"]').classList.add('d-none');
            } else {
                this.infectionType = parseInt(this.infectionType, 10);
                modalTitle.textContent = 'Edit infection type';
                let infectionType = model.getInfectionType(this.infectionType);
                this.element.querySelector('#infectionTypeName').value = infectionType.name;
                this.element.querySelector('#infectionTypeBeta').value = infectionType.beta;
                this.element.querySelector('#infectionTypeGamma').value = infectionType.gamma;
                this.element.querySelector('.formmodalsubmit[data-modalsubmittype="delete"]').classList.remove('d-none');
            }
        }
        onSubmit(submitType, event) {
            if (submitType == 'save') {
                let updatedInfectionType = {
                    name: this.element.querySelector('#infectionTypeName').value,
                    beta: this.element.querySelector('#infectionTypeBeta').value,
                    gamma: this.element.querySelector('#infectionTypeGamma').value,
                };
                if (this.infectionType === "new") {
                    model.addInfectionType(updatedInfectionType);
                } else {
                    model.updateInfectionType(this.infectionType, updatedInfectionType);
                }
            } else if (submitType == 'delete') {
                if (this.infectionType !== 'new') {
                    model.deleteInfectionType(this.infectionType);
                }
            }
        }
    }(document.getElementById('addEditInfectionTypeModal'));

    new class extends FormModal {
        onShow(event) {
            var button = event.relatedTarget;
            this.background = button.getAttribute('data-background-number');
            var modalTitle = this.element.querySelector('.modal-title');

            if (this.background == "new") {
                modalTitle.textContent = 'New background';
                this.element.querySelector('#backgroundName').value = '';
                this.element.querySelector('.formmodalsubmit[data-modalsubmittype="delete"]').classList.add('d-none');
            } else {
                this.background = parseInt(this.background, 10);
                modalTitle.textContent = 'Edit background';
                let background = model.getBackground(this.background);
                this.element.querySelector('#backgroundName').value = background.name;
                this.element.querySelector('.formmodalsubmit[data-modalsubmittype="delete"]').classList.remove('d-none');
            }
        }

        onSubmit(submitType, event) {
            if (submitType == 'save') {
                let backgroundName = this.element.querySelector('#backgroundName').value;
                if (this.background === "new") {
                    model.addBackground(backgroundName);
                } else {
                    model.updateBackground(this.background, backgroundName);
                }
            } else if (submitType == 'delete') {
                if (this.background !== 'new') {
                    model.deleteBackground(this.background);
                }
            }
        }
    }(document.getElementById('addEditBackgroundModal'));

    class FormModalWithTabs extends FormModal {
        onShow(event) {
            let tabTemplate = this.element.querySelector('.nav-tab-template');
            let tabTemplateButton = tabTemplate.content.querySelector('button');
            let tabPaneTemplate = this.element.querySelector('.tab-pane-template');
            let tabPaneTemplateDiv = tabPaneTemplate.content.querySelector('div');

            let tabs = document.createDocumentFragment();
            let tabPanes = document.createDocumentFragment();

            const trailingNumber = /\d+$/;
            const tabTitles = this.getTabs();
            for (const tabNumber in tabTitles) {
                const tabTitle = tabTitles[tabNumber];
                tabTemplateButton.innerText = tabTitle;
                tabTemplateButton.id = tabTemplateButton.id.replace(trailingNumber, tabNumber);
                tabTemplateButton.setAttribute('aria-controls', tabTemplateButton.getAttribute('aria-controls').replace(trailingNumber, '' + tabNumber));
                tabTemplateButton.setAttribute('data-bs-target', tabTemplateButton.getAttribute('data-bs-target').replace(trailingNumber, '' + tabNumber));
                tabs.appendChild(document.importNode(tabTemplate.content, true));

                tabPaneTemplateDiv.id = tabPaneTemplateDiv.id.replace(trailingNumber, tabNumber);
                tabPaneTemplateDiv.setAttribute('aria-labelledby', tabPaneTemplateDiv.getAttribute('aria-labelledby').replace(trailingNumber, '' + tabNumber));
                tabPanes.appendChild(document.importNode(tabPaneTemplate.content, true));

                this.fillPane(tabPanes.lastElementChild, tabNumber, tabTitle);
            }

            tabs.querySelector(':first-child > button').setAttribute('aria-selected', 'true');
            tabs.querySelector(':first-child > button').classList.add('active');
            tabPanes.querySelector(':first-child').classList.add('show', 'active');

            this.element.querySelector('.nav.nav-tabs').replaceChildren(tabs);
            this.element.querySelector('.tab-content').replaceChildren(tabPanes);
        }

        getTabs() {
            return {};
        }

        fillPane(paneElement, number, title) {
        }
    }

    new class extends FormModalWithTabs {
        onShow(event) {
            this.tables = [];
            FormModalWithTabs.prototype.onShow.call(this, event);
        }
        getTabs() {
            const tabs = {};
            model.getInfectionTypes().forEach((item, i) => {
                tabs[item.number] = item.name;
            });
            return tabs;
        }
        fillPane(paneElement, infectionTypeNumber, title) {
            let backgrounds = model.getBackgroundNames();
            let table = new NumberInputTable(paneElement, 'Uninfected', 'Exposed to ' + title);
            table.setData(backgrounds, backgrounds, model.getBetaMultipliers(infectionTypeNumber));
            table.redraw();
            this.tables.push(table);
        }
        onSubmit(submitType, event) {
            this.tables.forEach((table, infectionTypeNumber) => {
                model.setBetaMultipliers(infectionTypeNumber, table.getData());
            });
        }
    }(document.getElementById('editBetaMultiplierModal'));

    new class extends FormModalWithTabs {
        onShow(event) {
            this.tables = [];
            FormModalWithTabs.prototype.onShow.call(this, event);
        }
        getTabs() {
            const tabs = {};
            model.getInfectionTypes().forEach((item, i) => {
                tabs[item.number] = item.name;
            });
            return tabs;
        }
        fillPane(paneElement, infectionTypeNumber, title) {
            let backgrounds = model.getBackgroundNames();
            let table = new NumberInputTable(paneElement, 'Background before', 'Background after Infection with ' + title);
            table.setData(backgrounds, backgrounds, model.getBackgroundTransitions(infectionTypeNumber));
            table.redraw();
            this.tables.push(table);
        }
        onSubmit(submitType, event) {
            this.tables.forEach((table, infectionTypeNumber) => {
                model.setBackgroundTransitions(infectionTypeNumber, table.getData());
            });
        }
    }(document.getElementById('editBackgroundTransitionsModal'));

    new class extends FormModal {
        onShow(event) {
            this.table = this.table || new NumberInputTable(document.getElementById('editStartConditionsModalBody'), 'Background', 'People susceptible or infected');
            let backgrounds = model.getBackgroundNames();
            let infections = model.getInfectionTypes().map(type => type.name);

            if (backgrounds.length == 0) {
                this.table.el.innerHTML = 'You need to define backgrounds before you can define the start conditions';
                return;
            }

            this.table.setData(backgrounds, ['Susceptible'].concat(infections), model.getStartConditon());

            this.table.redraw();

        }
        onSubmit(submitType, event) {
            model.setStartCondition(this.table.getData());
        }
    }(document.getElementById('editStartConditionsModal'));

    new class extends FormModal {
        onShow(event) {
            let points = model.getGlobalBetaPoints();
            const maxx = d3.max([d3.max(points, p => p.x), document.getElementById('timestepnumberinput').value]);

            this.element.querySelector('.modal-body').innerHTML = '';

            this.lineplot = new plot.EditableLinePlot(this.element.querySelector('.modal-body'), 800, 400, [0, maxx], [0, 1]);
            for (const point of points) {
                this.lineplot.insertPoint(point.x, point.y);
            }

        }
        onSubmit(submitType, event) {
            model.setGlobalBetaPoints(this.lineplot.getData());
        }
    }(document.getElementById('editGlobalBetaModal'));

    new class extends FormModal {
        onShow(event) {
            model.serialize().then((base64) => {
                const textarea = this.element.querySelector('.modal-body textarea');
                const compressed = model.compressB64(base64);
                const url = window.location.protocol + '//' + window.location.host + window.location.pathname + "#model:" + compressed;
                textarea.value = url;
            });
        }
    }(document.getElementById('shareModelModal'));

    document.addEventListener("DOMContentLoaded", function () {
        document.getElementById('startsimulatonbutton').addEventListener('click', function () {
            const N = document.getElementById('timestepnumberinput').value;
            let result = simulation.run(N);
            /* global plot */
            plot.plot(result);
        });
    });



    function recreateInfectionTypeTable() {
        let t = document.getElementById('infectionTypeTableRowTemplate');
        let name = t.content.querySelector('.infection-type-name');
        let beta = t.content.querySelector('.infection-type-beta');
        let gamma = t.content.querySelector('.infection-type-gamma');
        let editButton = t.content.querySelector('.infection-type-edit-button');

        let infectionTypes = model.getInfectionTypes();

        if (infectionTypes.length == 0) {
            document.getElementById('infectionTypeTableBody').innerHTML = '<tr><td colspan="4"><i class="text-muted">No infection types have been defined, yet</i></td></tr>';
        } else {
            let fragment = document.createDocumentFragment();

            infectionTypes.forEach((infectionType, i) => {
                name.innerText = infectionType.name;
                beta.innerText = infectionType.beta;
                gamma.innerText = infectionType.gamma;
                editButton.dataset.infectionType = infectionType.number;
                fragment.appendChild(document.importNode(t.content, true));
            });

            document.getElementById('infectionTypeTableBody').replaceChildren(fragment);
        }

    }

    function recreateBackgroundTable() {
        let t = document.getElementById('backgroundTableRowTemplate');
        let name = t.content.querySelector('.background-name');
        let editButton = t.content.querySelector('.background-edit-button');

        let backgrounds = model.getBackgrounds();

        if (backgrounds.length == 0) {
            document.getElementById('backgroundTableBody').innerHTML = '<tr><td colspan="4"><i class="text-muted">No backgrounds have been defined, yet</i></td></tr>';
        } else {
            let fragment = document.createDocumentFragment();

            backgrounds.forEach((background, i) => {
                name.innerText = background.name;
                editButton.dataset.backgroundNumber = background.number;
                fragment.appendChild(document.importNode(t.content, true));
            });

            document.getElementById('backgroundTableBody').replaceChildren(fragment);
        }
    }

    return {
        recreateInfectionTypeTable: recreateInfectionTypeTable,
        recreateBackgroundTable: recreateBackgroundTable,
    };
})();
