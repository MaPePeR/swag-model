/* eslint-env browser */

'use strict';

/* exported Matrix */
class Matrix {
    constructor(nrows, ncols, baseType) {
        this.nrows = nrows;
        this.ncols = ncols;
        this.baseType = baseType || Float32Array;
        this.array = new this.baseType(this.nrows * this.ncols);
    }
    static fromArray(array, nrows, ncols) {
        if (array.length != ncols * nrows) {
            throw "Cols and row doesn't match array size";
        }
        let m = new Matrix(nrows, ncols, array.constructor);
        m.setData(array);
        return m;
    }
    addColumn() {
        const newncols = this.ncols + 1;
        let newArray = new this.baseType(this.nrows * newncols);
        if (this.ncols > 0) {
            for (let i = 0; i < this.nrows; i++) {
                newArray.set(this.array.subarray(i * this.ncols, (i + 1) * this.ncols), i * newncols);
            }
        }
        this.ncols = newncols;
        this.array = newArray;

    }
    deleteColumn(col) {
        if (col < 0 || col >= this.ncols) {
            throw "Col is out of range";
        }
        const newncols = this.ncols - 1;
        let newArray = new this.baseType(this.nrows * newncols);

        newArray.set(this.array.subarray(0, col), 0);
        for (let i = 0; i < this.nrows - 1; i++) {
            newArray.set(this.array.subarray(i * this.ncols + col + 1, (i + 1) * this.ncols + col), i * newncols + col);
        }
        newArray.set(this.array.subarray((this.nrows - 1) * this.ncols + col + 1, this.nrows * this.ncols), (this.nrows - 1) * newncols + col);

        this.ncols = newncols;
        this.array = newArray;
    }
    addRow() {
        let newArray = new this.baseType((this.nrows + 1) * this.ncols);
        newArray.set(this.array, 0);
        this.nrows += 1;
        this.array = newArray;
    }
    deleteRow(row) {
        if (row < 0 || row >= this.nrows) {
            throw "Row is out of range";
        }
        let newArray = new this.baseType((this.nrows - 1) * this.ncols);
        newArray.set(this.array.subarray(0, row * this.ncols), 0);
        newArray.set(this.array.subarray((row + 1) * this.ncols), row * this.ncols);

        this.nrows -= 1;
        this.array = newArray;
    }
    get(row, col) {
        return this.array[row * this.ncols + col];
    }
    set(row, col, value) {
        this.array[row * this.ncols + col] = value;
    }
    setData(arr) {
        if (arr instanceof Matrix) {
            if (arr.ncols != this.ncols || arr.nrows != this.ncols) {
                throw "ncols and nrows does not match";
            }
            arr = arr.array;
        }
        if (arr.length != this.array.length) {
            throw "Array length does not match";
        }
        this.array.set(arr);
    }
    str() {
        return Array.prototype.map.call(this.array, function (value, i) {
            return ((i % this.ncols) === 0 && i !== 0) ? "\n" + value + "" : '' + value;
        }, this).join(' ');
    }
    arrayView() {
        const a = new Array(this.nrows);
        for (let i = 0; i < this.nrows; ++i) {
            a[i] = this.array.subarray(i * this.ncols, (i + 1) * this.ncols);
        }
        return a;
    }
}

(function (test) {
    if (!test) return;

    function assertEquals(expected, value, message) {
        if (expected instanceof Object.getPrototypeOf(Float32Array)) {
            assertEquals(expected.length, value.length, "Length: " + (message || ''));
            for (let i = 0; i < expected.length; i++) {
                assertEquals(expected[i], value[i], "Index " + i + ":" + (message || ''));
            }
        } else if (expected !== value) {
            throw 'Error: ' + expected + ' != ' + value + ": " + (message || '');
        }
    }

    function makeTestMatrix(nrows, ncols) {
        let m = new Matrix(nrows, ncols);
        for (let i = 0; i < m.nrows; i++) {
            for (let j = 0; j < m.ncols; j++) {
                m.set(i, j, i * m.ncols + j);
            }
        }
        return m;
    }

    let m = makeTestMatrix(4, 3);
    assertEquals(4, m.nrows);
    assertEquals(3, m.ncols);
    m.addColumn();
    assertEquals(4, m.nrows);
    assertEquals(4, m.ncols);
    assertEquals(4 * 4, m.array.length);
    for (let i = 0; i < m.nrows; i++) {
        for (let j = 0; j < m.ncols; j++) {
            if (j < 3) {
                assertEquals(i * (m.ncols - 1) + j, m.get(i, j));
            } else {
                assertEquals(0, m.get(i, j));
            }
        }
    }

    m.deleteColumn(3);

    assertEquals(makeTestMatrix(4, 3).array, m.array);

    m = makeTestMatrix(4, 3);
    assertEquals(4, m.nrows);
    assertEquals(3, m.ncols);
    m.addRow();
    assertEquals(5, m.nrows);
    assertEquals(3, m.ncols);

    for (let i = 0; i < m.nrows; i++) {
        for (let j = 0; j < m.ncols; j++) {
            if (i < 4) {
                assertEquals(i * m.ncols + j, m.get(i, j));
            } else {
                assertEquals(0, m.get(i, j));
            }
        }
    }

    m.deleteRow(4);

    assertEquals(4, m.nrows);
    assertEquals(3, m.ncols);

    assertEquals(makeTestMatrix(4, 3).array, m.array);


    m = makeTestMatrix(4, 3);
    assertEquals(4, m.nrows);
    assertEquals(3, m.ncols);
    m.deleteColumn(1);
    assertEquals(4, m.nrows);
    assertEquals(2, m.ncols);

    for (let i = 0; i < m.nrows; i++) {
        for (let j = 0; j < m.ncols; j++) {
            assertEquals(i * (m.ncols + 1) + (j >= 1 ? j + 1 : j), m.get(i, j));
        }
    }

    m = makeTestMatrix(4, 3);
    assertEquals(4, m.nrows);
    assertEquals(3, m.ncols);
    m.deleteRow(1);
    assertEquals(3, m.nrows);
    assertEquals(3, m.ncols);

    for (let i = 0; i < m.nrows; i++) {
        for (let j = 0; j < m.ncols; j++) {
            assertEquals((i >= 1 ? i + 1 : i) * m.ncols + j, m.get(i, j));
        }
    }

})(true);
