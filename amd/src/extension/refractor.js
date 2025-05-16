/* eslint-disable no-console */
import {subscribe} from "../extension";
import {getGlobalConfig} from "../options";

/**
 * @param {HTMLElement} body
 * @param {string} query
 * @param {string} attr
 * @param {boolean} ishash
 * @param {string} prefix
 * @param {(ele: Element) => void} [changesWorker]
 * @returns {number}
 */
function alphaWalker(body, query, attr, ishash, prefix, changesWorker) {
    const all = body.querySelectorAll(query);
    let casos = 0;
    all.forEach((ele) => {
        let localChange = 0;
        let old = ele.getAttribute(attr) || "";
        if (ishash) {
            // It starts with # and after that the actual id value
            if (attr === 'href') {
                old = '#' + old.split('#')[1];
            }
            if (RegExp(/^#\d/).exec(old)) {
                ele.setAttribute(attr, '#' + prefix + old.substring(1));
                localChange += 1;
            }
        } else if (RegExp(/^\d/).exec(old)) {
            ele.setAttribute(attr, prefix + old);
            localChange += 1;
        }
        if (localChange && changesWorker) {
            changesWorker(ele);
        }
        casos += localChange;
    });
    return casos;
}

/**
 * @param {Element} ele
 */
function changesWorker(ele) {
    const newId = ele.getAttribute("id");
    const allAs = ele.querySelectorAll('a.accordion-toggle[data-toggle="collapse"],a.accordion-toggle[data-bs-toggle="collapse"]');
    allAs.forEach((asel) => {
        asel.setAttribute("data-parent", '#' + newId);
        asel.setAttribute("data-bs-parent", '#' + newId);
    });
}

/**
 * @param {import("../plugin").TinyMCE} editor
 * @returns {boolean}
 */
export function idFixingRefractor(editor) {
    const prefix = 'f_';
    let casos = 0;
    const body = editor.getBody();
    try {
        casos += alphaWalker(body, '.accordion.iedib-accordion', 'id', false, prefix, changesWorker);
        const casos2 = alphaWalker(body, 'ul.nav.nav-tabs>li>a', 'href', true, prefix);
        if (casos2 > 0) {
            casos += casos2 + alphaWalker(body, '.tab-pane.iedib-tabpane', 'id', false, prefix);
        }
    } catch (ex) {
        console.error(ex);
    }
    return casos > 0;
}

// List of Bootstrap 4 data attribute suffixes (in kebab-case)
// that are namespaced in Bootstrap 5.
const bs4DataAttributeSuffixes = [
    // General triggers and component identifiers
    'toggle',
    'target',
    'parent',
    // Options and configurations
    'placement',
    'trigger',
    'content',
    'container',
    'original-title',
    'html',
];

 // Create a CSS selector string to find elements with any of the BS4 data attributes
 const bs5Selectors = bs4DataAttributeSuffixes.map(suffix => `[data-${suffix}]`).join(',');

/**
 * @param {import("../plugin").TinyMCE} editor
 * @returns {boolean}
 */
function bs5Refractor(editor) {
    const body = editor.getBody();
    let changes = 0;

    // Select all elements that match the generated selector.
    /** @type {HTMLElement[]} */
    const elementsWithBs4DataAttributes = body.querySelectorAll(bs5Selectors);

    elementsWithBs4DataAttributes.forEach(element => {
        // Iterate over the list of known BS4 data attribute suffixes
        bs4DataAttributeSuffixes.forEach(kebabCaseSuffix => {
            const oldAttrName = `data-${kebabCaseSuffix}`;

            // Check if the element has the old attribute
            if (element.hasAttribute(oldAttrName)) {
                const attrValue = element.getAttribute(oldAttrName);
                const newAttrName = `data-bs-${kebabCaseSuffix}`;
                // Add or update the new Bootstrap 5 attribute if it's not already set to the correct value.
                // This "duplicates" by ensuring the data-bs-xxx attribute exists with the same value.
                // It does not remove the old data-xxx attribute in this refactor.
                if (attrValue !== null) {
                    if (element.getAttribute(newAttrName) !== attrValue) {
                        element.setAttribute(newAttrName, attrValue);
                        changes++;
                    }
                } else {
                    element.removeAttribute(newAttrName);
                    changes++;
                }
            }
        });
    });

    return changes > 0;
}

/**
 * @param {import("../plugin").TinyMCE} editor
 */
function refractoring(editor) {
    let changes = false;
    if (getGlobalConfig(editor, 'oninit.refractor.ids', '1') === '1') {
        changes = idFixingRefractor(editor);
    }
    if (getGlobalConfig(editor, 'oninit.refractor.bs5', '1') === '1') {
        changes = bs5Refractor(editor) && changes;
    }
    if (changes) {
        editor.notificationManager.open({
            text: "S'han optimitzat alguns snippets. Per favor, desau els canvis en sortir.",
            type: 'warning',
            timeout: 4000
        });
    }
}

subscribe('onInit', refractoring);