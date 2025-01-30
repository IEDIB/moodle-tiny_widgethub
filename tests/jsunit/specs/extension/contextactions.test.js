/**
 * @jest-environment jsdom
 */
// Mock virtual modules
require('../module.mocks')(jest);
const actions = require('../../src/extension/contextactions');
import jQuery from 'jquery';

/**
 * 
 * @param {string} html 
 * @returns {*}
 */
const createEditor = (html) => {
    const body = document.createElement('DIV');
    body.innerHTML = html;
    return {
        options: {
            get: () => {
                return {}
            }
        },
        getBody: () => body,
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
    };
};

describe('contextactions', () => {

    it('addImageEffectAction includes zoom effect', () => {
        const editor = createEditor(`
        <div class="iedib-img">
            <img></img>
        </div>    
        `);
        /** @type {HTMLElement} */
        const selectedElement = editor.getBody().querySelector('img');
        /** @type {HTMLElement} */
        const elem = editor.getBody().querySelector('.iedib-img');
        /** @type {{ctx: import("../../src/contextinit").ItemMenuContext, type: string}} */
        const self = {
            ctx: {
                editor,
                path: {
                    selectedElement: jQuery(selectedElement),
                    elem: jQuery(elem),
                    targetElement: undefined,
                    /** @type {*} */
                    widget: {}
                }, 
                jQuery
            },
            type: 'zoom'
        };

        actions.addImageEffectAction.call(self);

        expect(editor.getBody().querySelector('.iedib-img').dataset.snptd).toEqual('zoom');
        expect(editor.getBody().querySelector('.iedib-sd-area')).toBeTruthy();
        expect(editor.getBody().querySelectorAll('.iedib-sd-area script[src*="images.min.js"]')).toHaveLength(1);
    });

    it('changeBoxLangAction', () => {
        const editor = createEditor(`
        <div class="iedib-capsa-important" data-lang="ca">
             <div class="iedib-central">
                <div class="iedib-titolLateral">
                    <span>IMPORTANT</span>
                </div>
             </div>
        </div>    
        `);
        /** @type {HTMLElement} */
        const selectedElement = editor.getBody().querySelector('.iedib-central');
        /** @type {HTMLElement} */
        const elem = editor.getBody().querySelector('.iedib-capsa-important');
        /** @type {{ctx: import("../../src/contextinit").ItemMenuContext, iso: string}} */
        const self = {
            ctx: {
                editor,
                path: {
                    selectedElement: jQuery(selectedElement),
                    elem: jQuery(elem),
                    targetElement: undefined,
                    /** @type {*} */
                    widget: {
                        I18n: {
                            msg: {
                                ca: 'IMPORTANT',
                                en: 'LOOK OUT!'
                            } 
                        }
                    }
                }, 
                jQuery
            },
            iso: 'en'
        };

        actions.changeBoxLangAction.call(self);

        expect(elem.dataset.lang).toEqual('en');
        expect(elem.querySelector('.iedib-titolLateral')?.textContent).toBe('LOOK OUT!'); 
    });

});