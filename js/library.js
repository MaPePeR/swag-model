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

        getLocalLibraryKeys() {
            const N = localStorage.length;
            const result = [];
            for (let i = 0; i < N; ++i) {
                const key = localStorage.key(i);
                if (key.substr(0, 6) == "model:") {
                    result.push(key.substr(6));
                }
            }
            return result;
        }
        getLocalLibraryEntry(key) {
            return localStorage.getItem('model:' + key);
        }
        addLocalLibraryentry(key, data) {
            localStorage.setItem('model:' + key, data);
        }
        deleteLocalLibraryEntry(key) {
            localStorage.removeItem('model:' + key);
        }

    }

    return new Library();
})();
