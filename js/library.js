/* eslint-env browser */

'use strict';

const globalLibrary = {
    "SIS model": "examples/SIS.json",
    "SIRD model": "examples/SIRD.json",
};

/* exported library */
var library = (function () {
    class Library {
        getGlobalLibrary() {
            return globalLibrary;
        }

    }

    return new Library();
})();
