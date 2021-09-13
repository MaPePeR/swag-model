/* eslint-env browser */
/* global bootstrap, d3 */
/* global model, simulation, library, NumberInputTable */

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

    function updateR0() {
        const beta =  document.getElementById('infectionTypeBeta').value;
        const gamma = document.getElementById('infectionTypeGamma').value;
        if (beta > 0 && gamma > 0) {
            document.getElementById('infectionTypeR0').value = beta / gamma;
        } else {
            document.getElementById('infectionTypeR0').value = '';
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
            updateR0();
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
            this.group = button.getAttribute('data-group-number');
            var modalTitle = this.element.querySelector('.modal-title');

            if (this.group == "new") {
                modalTitle.textContent = 'New group';
                this.element.querySelector('#groupName').value = '';
                this.element.querySelector('.formmodalsubmit[data-modalsubmittype="delete"]').classList.add('d-none');
            } else {
                this.group = parseInt(this.group, 10);
                modalTitle.textContent = 'Edit group';
                let group = model.getGroup(this.group);
                this.element.querySelector('#groupName').value = group.name;
                this.element.querySelector('.formmodalsubmit[data-modalsubmittype="delete"]').classList.remove('d-none');
            }
        }

        onSubmit(submitType, event) {
            if (submitType == 'save') {
                let groupName = this.element.querySelector('#groupName').value;
                if (this.group === "new") {
                    model.addGroup(groupName);
                } else {
                    model.updateGroup(this.group, groupName);
                }
            } else if (submitType == 'delete') {
                if (this.group !== 'new') {
                    model.deleteGroup(this.group);
                }
            }
        }
    }(document.getElementById('addEditGroupModal'));

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
            let groups = model.getGroupNames();
            let table = new NumberInputTable(paneElement, 'Uninfected', 'Exposed to ' + title);
            table.setData(groups, groups, model.getBetaMultipliers(infectionTypeNumber));
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
        constructor(element) {
            super(element);
            this.element.addEventListener('input', this.showTableWarnings.bind(this));
        }
        onShow(event) {
            this.tables = [];
            FormModalWithTabs.prototype.onShow.call(this, event);
            this.showTableWarnings();
        }
        getTabs() {
            const tabs = {};
            model.getInfectionTypes().forEach((item, i) => {
                tabs[item.number] = item.name;
            });
            return tabs;
        }
        fillPane(paneElement, infectionTypeNumber, title) {
            let groups = model.getGroupNames();
            let table = new NumberInputTable(paneElement, 'Group before', 'Group after Infection with ' + title);
            table.setData(groups, groups, model.getGroupTransitions(infectionTypeNumber));
            table.redraw();
            this.tables.push(table);
        }
        onSubmit(submitType, event) {
            this.tables.forEach((table, infectionTypeNumber) => {
                model.setGroupTransitions(infectionTypeNumber, table.getData());
            });
        }

        showTableWarnings() {
            for (const table of this.element.querySelectorAll('table.numberinputtable')) {
                for (const row of table.querySelectorAll('tbody > tr')) {
                    let sum = 0;
                    for (var input of row.querySelectorAll('input.numberinput')) {
                        sum += parseFloat(input.value);
                    }
                    if (Math.abs(sum - 1) > 0.000001) {
                        row.classList.add('bg-warning');
                    } else {
                        row.classList.remove('bg-warning');
                    }
                }
            }
        }
    }(document.getElementById('editGroupTransitionsModal'));

    new class extends FormModal {
        onShow(event) {
            this.table = this.table || new NumberInputTable(document.getElementById('editInitialConditionsModalBody'), 'Group', 'People susceptible or infected');
            let groups = model.getGroupNames();
            let infections = model.getInfectionTypes().map(type => type.name);

            if (groups.length == 0) {
                this.table.el.innerHTML = 'You need to define groups before you can define the initial conditions';
                return;
            }

            this.table.setData(groups, ['Susceptible'].concat(infections), model.getInitialCondition());

            this.table.redraw();

        }
        onSubmit(submitType, event) {
            model.setInitialCondition(this.table.getData());
        }
    }(document.getElementById('editInitialConditionsModal'));

    new class extends FormModal {
        onShow(event) {
            let points = model.getGlobalBetaPoints();
            const maxx = d3.max([d3.max(points, p => p.x), model.getTimesteps()]);

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

    //FROM https://stackoverflow.com/a/35970894/2256700
    const getJSON = function(url, callback) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType = 'json';
        xhr.onload = function() {
            var status = xhr.status;
            if (status === 200) {
                callback(null, xhr.response);
            } else {
                callback(status, xhr.response);
            }
        };
        xhr.send();
    };

    new class extends FormModal {
        onShow(event) {
            var button = event.relatedTarget;
            this.path = button.getAttribute('data-global-library-path');
            getJSON(this.path, function (err, data) {
                if (err) {
                    alert("Could not load data");
                    return;
                }
                this.libraryentry = data;
                this.showEntry();
            }.bind(this));
        }
        showEntry() {
            const t = document.getElementById('modelDescriptionTemplate');
            this.element.querySelector('.modal-title').innerText = this.libraryentry.name;
            t.content.querySelector('.modeldescription').innerText = this.libraryentry.description;
            t.content.querySelector('.modelinfections').innerText = this.libraryentry.infectionTypes;
            t.content.querySelector('.groups').innerText = this.libraryentry.groups;
            t.content.querySelector('.betaMultipliers').innerText = this.libraryentry.betaMultipliers;
            t.content.querySelector('.transitions').innerText = this.libraryentry.transitions;
            t.content.querySelector('.initialCondition').innerText = this.libraryentry.initialCondition;
            t.content.querySelector('.globalBetaMultiplier').innerText = this.libraryentry.globalBetaMultiplier;

            this.element.querySelector('.modal-body').replaceChildren(document.importNode(t.content, true));
        }
        onSubmit() {
            model.deserializeB64(model.decompressB64(this.libraryentry.model));
        }
    }(document.getElementById('loadModelModal'));

    new class extends FormModal {
        onShow(event) {
            this.element.querySelector('.modal-body textarea').value = '';
            model.serialize().then((base64) => {
                const textarea = this.element.querySelector('.modal-body textarea');
                const compressed = model.compressB64(base64);
                const url = window.location.protocol + '//' + window.location.host + window.location.pathname + "#model:" + compressed;
                textarea.value = url;
            });
        }
    }(document.getElementById('shareModelModal'));

    new class extends FormModal {
        onSubmit() {
            const key = document.getElementById('saveModalNameInput').value;
            model.serialize().then(model.compressB64).then(function (data) {
                library.addLocalLibraryentry(key, data);
                ui.updateLibraryList();
            });
        }
    }(document.getElementById('saveModelModal'));

    document.addEventListener("DOMContentLoaded", function () {
        document.getElementById('libraryListGroup').addEventListener('click', function (event) {
            const button = event.target.closest('button');
            if (button.matches('.deletelocallibraryentry')) {
                library.deleteLocalLibraryEntry(button.dataset.localLibraryEntryKey);
                ui.updateLibraryList();
            } else if (button.matches('.loadlocallibraryentry')) {
                model.deserializeB64(model.decompressB64(library.getLocalLibraryEntry(button.dataset.localLibraryEntryKey)));
            }
        });

        document.getElementById('addEditInfectionTypeModal').addEventListener('input', updateR0);
        document.getElementById('timestepnumberinput').addEventListener('change', function () {
            model.setTimesteps(document.getElementById('timestepnumberinput').value);
        });
        document.getElementById('startsimulatonbutton').addEventListener('click', function () {
            const N = model.getTimesteps();
            let result = simulation.run(N);
            if (d3.some(result, d => isNaN(d))) {
                document.getElementById('nanwarning').style.display = 'block';
            } else {
                document.getElementById('nanwarning').style.display = 'none';
            }
            /* global plot */
            plot.plot(result);
        });
        ui.updateLibraryList();
    });



    function recreateInfectionTypeTable() {
        let t = document.getElementById('infectionTypeTableRowTemplate');
        let name = t.content.querySelector('.infection-type-name');
        let beta = t.content.querySelector('.infection-type-beta');
        let gamma = t.content.querySelector('.infection-type-gamma');
        let r0 = t.content.querySelector('.infection-type-r0');
        let editButton = t.content.querySelector('.infection-type-edit-button');
        let numbers = t.content.querySelectorAll('.infection-type-number');

        let infectionTypes = model.getInfectionTypes();

        document.getElementById('infection-type-count').innerText = infectionTypes.length;

        if (infectionTypes.length == 0) {
            document.getElementById('infectionTypeTableBody').innerHTML = '<tr><td colspan="4"><i class="text-muted">No infection types have been defined, yet</i></td></tr>';
        } else {
            let fragment = document.createDocumentFragment();

            infectionTypes.forEach((infectionType, i) => {
                name.innerText = infectionType.name;
                beta.innerText = infectionType.beta;
                gamma.innerText = infectionType.gamma;
                r0.innerText = (infectionType.beta / infectionType.gamma).toFixed(2);
                for (const el of numbers) {
                    el.innerText = i + 1;
                }
                editButton.dataset.infectionType = infectionType.number;
                fragment.appendChild(document.importNode(t.content, true));
            });

            document.getElementById('infectionTypeTableBody').replaceChildren(fragment);
        }

    }

    function recreateGroupTable() {
        let t = document.getElementById('groupTableRowTemplate');
        let name = t.content.querySelector('.group-name');
        let editButton = t.content.querySelector('.group-edit-button');

        let groups = model.getGroups();

        document.getElementById('group-count').innerText = groups.length;

        if (groups.length == 0) {
            document.getElementById('groupTableBody').innerHTML = '<tr><td colspan="4"><i class="text-muted">No groups have been defined, yet</i></td></tr>';
        } else {
            let fragment = document.createDocumentFragment();

            groups.forEach((group, i) => {
                name.innerText = group.name;
                editButton.dataset.groupNumber = group.number;
                fragment.appendChild(document.importNode(t.content, true));
            });

            document.getElementById('groupTableBody').replaceChildren(fragment);
        }
    }

    return {
        recreateInfectionTypeTable: recreateInfectionTypeTable,
        recreateGroupTable: recreateGroupTable,
        updateTimesteps: function() {
            const el = document.getElementById('timestepnumberinput');
            const timesteps = model.getTimesteps();
            if (el.value != timesteps) {
                el.value = timesteps;
            }
        },
        updateLibraryList: function() {
            const fragment = document.createDocumentFragment();
            const globalTemplate = document.getElementById('globalLibraryEntryTemplate');
            const globalTemplateName = globalTemplate.content.querySelector('.libraryentryname');
            const globalTemplateLoadButton = globalTemplate.content.querySelector('button');
            const globalLibrary = library.getGlobalLibrary();
            for (const entryname in globalLibrary) {
                const entrypath = globalLibrary[entryname];
                globalTemplateName.innerText = entryname;

                globalTemplateLoadButton.setAttribute('aria-label', "Load " + entryname);
                globalTemplateLoadButton.dataset.globalLibraryPath = entrypath;
                fragment.appendChild(document.importNode(globalTemplate.content, true));
            }

            const localTemplate = document.getElementById('localLibraryEntryTemplate');
            const localTemplateName = localTemplate.content.querySelector('.libraryentryname');
            const localTemplateLoadButton = localTemplate.content.querySelector('button.loadlocallibraryentry');
            const localTemplateDeleteButton = localTemplate.content.querySelector('button.deletelocallibraryentry');
            for (const entryname of library.getLocalLibraryKeys()) {
                localTemplateName.innerText = entryname;

                localTemplateLoadButton.setAttribute('aria-label', "Load " + entryname);
                localTemplateLoadButton.dataset.localLibraryEntryKey = entryname;
                localTemplateDeleteButton.setAttribute('aria-label', "Delete " + entryname);
                localTemplateDeleteButton.dataset.localLibraryEntryKey = entryname;
                fragment.appendChild(document.importNode(localTemplate.content, true));
            }

            document.getElementById('libraryListGroup').replaceChildren(fragment);
        },
        updateInitialConditionCard: function () {
            document.getElementById('totalPopulationCount').innerText = d3.sum(model.getInitialCondition().array);
        },
    };
})();
