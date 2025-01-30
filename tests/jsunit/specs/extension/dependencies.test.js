/**
 * @jest-environment jsdom
 */
// Mock virtual modules
require('../module.mocks')(jest);

const {addRequires, cleanUnusedRequires, alphaFixingRefractor} = require('../../src/extension/dependencies');

/**
 * 
 * @param {string} html 
 * @returns {*}
 */
const createEditor = (html) => {
    const body = document.createElement('DIV');
    body.innerHTML = html;
    return {
        ...mockEditor,
        getBody: () => body
    };
};

/** @type {*} */
let mockEditor;

describe('dependencies', () => {
    beforeAll(() => {
        jest.clearAllMocks();
        mockEditor = {
            options: {
                get: () => {
                    return {}
                }
            },
            dom: {
                create: jest.fn().mockImplementation((elemTag, props, inner) => {
                    const elem = document.createElement(elemTag);
                    if (props) {
                        Object.keys(props).forEach(key => {
                            elem.setAttribute(key, props[key]);
                        });
                    }
                    if (inner) {
                        elem.innerHTML = inner;
                    }
                    return elem;
                })
            },
            notificationManager: {
                open: jest.fn()
            }
        }
    });

    it('addRequires on empty document does not modify it', () => {
        const editor = createEditor('<p>empty</p>');
        expect(addRequires(editor, undefined)).toBe(0);
        expect(editor.getBody().innerHTML).toBe('<p>empty</p>');
    });

    it('addRequires on document with empty area, removes the area', () => {
        const editor = createEditor('<p>empty</p><div class="iedib-sd-area"></div>');
        expect(addRequires(editor, undefined)).toBe(0);
        expect(editor.getBody().querySelector('div.iedib-sd-area')).toBeFalsy();
    });

    it('cleanUnusedRequires on document with empty area, removes the area', () => {
        const editor = createEditor('<p>empty</p><div class="iedib-sd-area"></div>');
        expect(cleanUnusedRequires(editor)).toBe(1);
        expect(editor.getBody().querySelector('div.iedib-sd-area')).toBeFalsy();
    });

    it('addRequires on document with populated area, removes the area', () => {
        const editor = createEditor('<p>empty</p><div class="iedib-sd-area"><script src="https://site.com/sd/programacio.min.js"></script></div>');
        expect(addRequires(editor, undefined)).toBe(0);
        expect(editor.getBody().querySelector('div.iedib-sd-area')).toBeFalsy();
    });

    it('cleanUnusedRequires on document with populated area and no snippet, removes the area', () => {
        const editor = createEditor('<p>empty</p><div class="iedib-sd-area"><script src="https://site.com/sd/programacio.min.js"></script></div>');
        expect(cleanUnusedRequires(editor)).not.toBe(0);
        expect(editor.getBody().querySelector('div.iedib-sd-area')).toBeFalsy();
    });

    it('addRequires on document, includes the area and script', () => {
        const editor = createEditor('<div role="snptd_zoom"></div>');
        expect(addRequires(editor, undefined)).not.toBe(0);
        expect(editor.getBody().querySelector('div.iedib-sd-area')).toBeTruthy();
        expect(editor.dom.create).toHaveBeenCalledTimes(3);
        expect(editor.getBody().querySelectorAll('div.iedib-sd-area script')).toHaveLength(1);
    });

    it('alphaFixing no effect on correct dom', () => {
        const editor = createEditor('<div id="f343" role="snptd_zoom"></div>');
        expect(alphaFixingRefractor(editor));
        expect(editor.notificationManager.open).not.toHaveBeenCalled();
    });

    it('alphaFixing fixes id on dom', () => {
        const editor = createEditor('<div id="343" class="accordion iedib-accordion"></div>');
        expect(alphaFixingRefractor(editor));
        expect(editor.notificationManager.open).toHaveBeenCalled();
        expect(editor.getBody().querySelector('.iedib-accordion').id).toBe('f_343');
    });
});
