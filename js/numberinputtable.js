/* eslint-env browser */

'use strict';

/* exported NumberInputTable */
class NumberInputTable {
    constructor(el, rowDescription, colDescription) {
        this.el = el;
        this.rowDescription = rowDescription;
        this.colDescription = colDescription;
    }

    setData(rowHeaders, columnHeaders,  data) {
        this.columnHeaders = columnHeaders || [];
        this.rowHeaders = rowHeaders || [];
        this.data = data;
    }
    getData() {
        let array = new Float32Array(this.columnHeaders.length * this.rowHeaders.length);
        const ncols = this.columnHeaders.length;
        for (let input of this.el.querySelectorAll('input.numberinput')) {
            array[parseInt(input.dataset.row) * ncols + parseInt(input.dataset.col)] = input.value;
        }
        return array;
    }

    redraw() {
        let fragment = document.createDocumentFragment();
        let table = document.createElement('table');
        fragment.appendChild(table);
        table.classList.add('table');
        table.classList.add('numberinputtable');

        let thead = document.createElement('thead');
        table.appendChild(thead);

        let headtr = document.createElement('tr');
        thead.appendChild(headtr);

        let rowDescth = document.createElement('th');
        if (this.rowDescription) {
            rowDescth.innerText = this.rowDescription;

        }
        headtr.appendChild(rowDescth);
        if (this.colDescription) {
            rowDescth.rowSpan = 2;
            let colDescth = document.createElement('th');
            colDescth.innerText = this.colDescription;
            colDescth.colSpan = this.columnHeaders.length;
            headtr.appendChild(colDescth);
            headtr = document.createElement('tr');
            thead.appendChild(headtr);
        }


        this.columnHeaders.forEach((colHeader, i) => {
            let th = document.createElement('th');
            th.innerText = colHeader;
            headtr.appendChild(th);
        });

        let tbody = document.createElement('tbody');
        table.appendChild(tbody);
        for (let rowi in this.rowHeaders) {
            rowi = parseInt(rowi);
            const rowHeader = this.rowHeaders[rowi];
            let tr = document.createElement('tr');
            let rowth = document.createElement('th');
            rowth.innerText = rowHeader;
            tr.appendChild(rowth);
            for (let coli in this.columnHeaders) {
                coli = parseInt(coli);
                let td = document.createElement('td');
                tr.appendChild(td);

                let numberinput = document.createElement('input');
                numberinput.type = 'number';
                numberinput.classList.add('form-control', 'numberinput');
                numberinput.dataset.row = rowi;
                numberinput.dataset.col = coli;
                numberinput.min = 0;
                numberinput.step = 0.0001;
                numberinput.value = this.data.get(rowi, coli).toFixed(4);
                td.appendChild(numberinput);

            }
            tbody.appendChild(tr);
        }
        this.el.replaceChildren(fragment);
    }
}
