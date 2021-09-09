/* eslint-env browser */
/* global bootstrap */
/* global model, simulation, NumberInputTable */

'use strict';

/* exported ui */
var ui = (function () {


    class FormModal {
        constructor(element, showFunc, validateFuncs, submitFuncs) {
            this.element = element;
            this.modal = new bootstrap.Modal(element);
            this.showFunc = showFunc;
            this.validateFuncs = validateFuncs;
            this.submitFuncs = submitFuncs;
            document.addEventListener("DOMContentLoaded", (function () {
                this.element.addEventListener('show.bs.modal', (function (event) {
                    this.showFunc.call(this, event);
                }).bind(this));
                for (const el of this.element.querySelectorAll('button.formmodalsubmit')) {
                    el.addEventListener('click', (function (button, event) {
                        const submitType = button.dataset.modalsubmittype;
                        const validateFunc = this.validateFuncs[submitType] || (_ => true);
                        const submitFunc = this.submitFuncs[submitType];
                        if (validateFunc.call(this, event)) {
                            submitFunc.call(this, event);
                            this.modal.hide();
                        }
                    }).bind(this, el));
                }
            }).bind(this));

        }
    }

    new FormModal(document.getElementById('addEditInfectionTypeModal'),  function (event) {
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
    }, {}, {
        'save': function (event) {
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
        },
        'delete': function (event) {
            if (this.infectionType !== 'new') {
                model.deleteInfectionType(this.infectionType);
            }
        },
    });

    new FormModal(document.getElementById('addEditBackgroundModal'),  function (event) {
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
    }, {}, {
        save: function (event) {
            let backgroundName = this.element.querySelector('#backgroundName').value;
            if (this.background === "new") {
                model.addBackground(backgroundName);
            } else {
                model.updateBackground(this.background, backgroundName);
            }
        },
        delete: function (event) {
            if (this.background !== 'new') {
                model.deleteBackground(this.background);
            }
        },
    });

    new FormModal(document.getElementById('editBackgroundContactMatrixModal'),  function (event) {
        this.contactInputTable = this.contactInputTable || new NumberInputTable(
            document.getElementById('editBackgroundContactMatrixModalBody'),
            'Infected',
            'Susceptible'
        );
        let backgrounds = model.getBackgroundNames();

        if (backgrounds.length == 0) {
            document.getElementById('editBackgroundContactMatrixModalBody').innerHTML = 'You need to define backgrounds before you can define the contact factors';
        } else {
            this.contactInputTable.setData(backgrounds, backgrounds, model.getContactMatrix());

            this.contactInputTable.redraw();
        }
    }, {},  {
        save: function (event) {
            model.setContactMatrix(this.contactInputTable.getData());
        },
    });


    new FormModal(document.getElementById('editInfectionFactorsMatrixModal'),  function (event) {
        this.infectiousTable = this.infectionFactorTable || new NumberInputTable(
            document.getElementById('infectious-factors'),
            'Background',
            'Infectious with...'
        );
        this.exposedTable = this.exposedTable || new NumberInputTable(
            document.getElementById('exposed-factors'),
            'Background',
            'Being exposed to...'
        );
        let backgrounds = model.getBackgroundNames();
        let infections = model.getInfectionTypes().map(type => type.name);

        if (backgrounds.length == 0 || infections.length == 0) {
            this.exposedTable.el.innerHTML = this.infectiousTable.el.innerHTML = 'You need to define backgrounds and infections before you can define the infection factors';
            return;
        }
        this.infectiousTable.setData(backgrounds, infections, model.getInfectiousFactors());
        this.exposedTable.setData(backgrounds, infections, model.getExposedFactors());

        this.infectiousTable.redraw();
        this.exposedTable.redraw();

    }, {},  {
        save: function (event) {
            model.setInfectiousFactors(this.infectiousTable.getData());
            model.setExposedFactors(this.exposedTable.getData());
        },
    });

    new FormModal(document.getElementById('editBackgroundTransitionsModal'),  function (event) {
        let backgrounds = model.getBackgroundNames();
        let infections = model.getInfectionTypes().map(type => type.name);
        if (backgrounds.length == 0 || infections.length == 0) {
            return;
        }

        let tabs = document.createDocumentFragment();
        let tabPanes = document.createDocumentFragment();

        let tabTemplate = document.getElementById('editBackgroundTransitionsTabTemplate');
        let tabTemplateButton = tabTemplate.content.querySelector('button');
        let tabPaneTemplate = document.getElementById('editBackgroundTransitionsTabPaneTemplate');
        let tabPaneTemplateDiv = tabPaneTemplate.content.querySelector('div');

        this.tables = [];

        const trailingNumber = /\d+$/;

        for (const infectionTypeNumber in infections) {
            const infectionName = infections[infectionTypeNumber];
            tabTemplateButton.innerText = infectionName;
            tabTemplateButton.id = tabTemplateButton.id.replace(trailingNumber, infectionTypeNumber);
            tabTemplateButton.setAttribute('aria-controls', tabTemplateButton.getAttribute('aria-controls').replace(trailingNumber, '' + infectionTypeNumber));
            tabTemplateButton.setAttribute('data-bs-target', tabTemplateButton.getAttribute('data-bs-target').replace(trailingNumber, '' + infectionTypeNumber));
            tabs.appendChild(document.importNode(tabTemplate.content, true));

            tabPaneTemplateDiv.id = tabPaneTemplateDiv.id.replace(trailingNumber, infectionTypeNumber);
            tabPaneTemplateDiv.setAttribute('aria-labelledby', tabPaneTemplateDiv.getAttribute('aria-labelledby').replace(trailingNumber, '' + infectionTypeNumber));
            tabPanes.appendChild(document.importNode(tabPaneTemplate.content, true));

            let table = new NumberInputTable(tabPanes.lastElementChild, 'Background before', 'Background after Infection with ' + infectionName);
            table.setData(backgrounds, backgrounds, model.getBackgroundTransitions(infectionTypeNumber));
            table.redraw();
            this.tables.push(table);
        }
        tabs.querySelector(':first-child > button').setAttribute('aria-selected', 'true');
        tabs.querySelector(':first-child > button').classList.add('active');
        tabPanes.querySelector(':first-child').classList.add('show', 'active');

        this.element.querySelector('#editBackgroundTransitionsTab').replaceChildren(tabs);
        this.element.querySelector('#editInfectionFactorsTabContent').replaceChildren(tabPanes);

    }, {}, {
        save: function (event) {
            this.tables.forEach((table, infectionTypeNumber) => {
                model.setBackgroundTransitions(infectionTypeNumber, table.getData());
            });
        },


    });

    new FormModal(document.getElementById('editStartConditionsModal'),  function (event) {
        this.table = this.table || new NumberInputTable(document.getElementById('editStartConditionsModalBody'), 'Background', 'People susceptible or infected');
        let backgrounds = model.getBackgroundNames();
        let infections = model.getInfectionTypes().map(type => type.name);

        if (backgrounds.length == 0) {
            this.table.el.innerHTML = 'You need to define backgrounds before you can define the start conditions';
            return;
        }

        this.table.setData(backgrounds, ['Susceptible'].concat(infections), model.getStartConditon());

        this.table.redraw();

    }, {},  {
        save: function (event) {
            model.setStartCondition(this.table.getData());
        },
    });

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
