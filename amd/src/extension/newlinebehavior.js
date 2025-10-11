/* eslint-disable max-len */
// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

/**
 * Tiny WidgetHub plugin.
 *
 * @module      tiny_ibwidgethub/plugin
 * @copyright   2024 Josep Mulet Pol <pep.mulet@gmail.com>
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
/**
 * @param {string | undefined} content
 * @returns {string}
 */
export function removeEmptyParagraphs(content) {
    if (!content) {
        return '';
    }

    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(content, 'text/html');
        doc.querySelectorAll('p').forEach(p => {
            if (p.closest('pre, code, script')) {
                return;
            }

            // Consider empty if contains only:
            // - comments
            // - whitespace text nodes
            // - empty elements (like <span></span>)
            const isEmpty = Array.from(p.childNodes).every(node => {
                if (node.nodeType === Node.COMMENT_NODE) {
                    return true;
                }
                if (node.nodeType === Node.TEXT_NODE) {
                    const text = node.textContent || '';
                    // NO eliminar si hi ha almenys un &nbsp;
                    return !(text.trim() || /\u00A0/.test(text));
                } else if (node.nodeType === Node.ELEMENT_NODE) {
                    // @ts-ignore
                    if (node.tagName === 'SPAN' && node.attributes.length === 0) {
                        return !node.textContent?.trim();
                    }
                    return false;
                }
                return false;
            });

            if (isEmpty) {
                p.remove();
            }
        });
        return doc.body.innerHTML;
    } catch (err) {
        // Fallback: regex (less safe)
        return content.replace(/<p>\s*<\/p>/gi, '');
    }
}


/**
 * @param {string | undefined} content
 * @param {string} [padWith]
 * @returns {string}
 */
export function padEmptyParagraphsWith(content, padWith = '<br>') {
    if (!content) {
        return '';
    }

    // Quick regex optimization only if content cannot contain comments, scripts, pre, code
    if (!/[<](script|pre|code|!--)/i.test(content)) {
        return content.replace(/<p>\s*<\/p>/gi, `<p>${padWith}</p>`);
    }

    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(content, 'text/html');

        doc.querySelectorAll('p').forEach(p => {
            if (p.closest('pre, code, script')) {
                return;
            }

            // Consider paragraph empty if it contains only comments or whitespace text
            const isEmpty = Array.from(p.childNodes).every(node => {
                if (node.nodeType === Node.COMMENT_NODE) {
                    return true;
                }
                if (node.nodeType === Node.TEXT_NODE) {
                    const text = node.textContent || '';
                    // NO eliminar si hi ha almenys un &nbsp;
                    return !(text.trim() || /\u00A0/.test(text));
                }
                return false; // Any element (including <br>) counts as content
            });

            if (isEmpty) {
                const comments = Array.from(p.childNodes)
                    .filter(n => n.nodeType === Node.COMMENT_NODE)
                    .map(n => {
                        if (n.nodeType === Node.COMMENT_NODE) {
                            // @ts-ignore
                            return `<!--${n.data}-->`;
                        }
                        return '';
                    })
                    .join('');
                p.innerHTML = `${padWith}${comments}`;
            }
        });

        return doc.body.innerHTML;
    } catch (err) {
        // Fallback: regex (less safe)
        return content.replace(/<p>\s*<\/p>/gi, `<p>${padWith}</p>`);
    }
}

/**
 *
 * @param {import("../plugin").TinyMCE} editor
 */
export function emulateAttoNewlineBehaviour(editor) {
    // Monkey patch setContent to have control over empty lines
    if (!editor._orgSetContent) {
        editor._orgSetContent = editor.setContent;

        editor.setContent = function(/** @type {string} */ content, /** @type {any} */ args) {
            let processedContent = content;
            try {
                if (!args || args.format === 'html') {
                    processedContent = removeEmptyParagraphs(content);
                }
            } catch (err) {
                // eslint-disable-next-line no-console
                console.warn('setContent patch failed', err);
            }
            return editor._orgSetContent.call(this, processedContent, args);
        };
    }

    if (!editor._orgGetContent) {
        editor._orgGetContent = editor.getContent;

        editor.getContent = function() {
            let content = editor._orgGetContent.apply(this, arguments) || '';
            try {
                // Convert empty <p></p> to <p><br></p> for Atto compatibility
                content = padEmptyParagraphsWith(content);
            } catch (err) {
                // eslint-disable-next-line no-console
                console.warn('getContent patch failed', err);
            }
            return content;
        };
    }
}

/**
 * @param {import("../plugin").TinyMCE} editor
 */
export function restoreEquationpluginButton(editor) {
    window?.requirejs(['tiny_equation/common', 'tiny_equation/equation', 'tiny_equation/ui'],
        // @ts-ignore
        function(eqCommon, eqEq, eqUi) {
            if (typeof eqUi.handleAction !== 'function') {
                return;
            }
            editor.ui.registry.addIcon('tiny_restoreequation',
                '<svg xmlns="http://www.w3.org/2000/svg" height="24" width="24" viewBox="0 0 640 640"><path d="M192 64C156.7 64 128 92.7 128 128L128 512C128 547.3 156.7 576 192 576L448 576C483.3 576 512 547.3 512 512L512 128C512 92.7 483.3 64 448 64L192 64zM224 128L416 128C433.7 128 448 142.3 448 160L448 192C448 209.7 433.7 224 416 224L224 224C206.3 224 192 209.7 192 192L192 160C192 142.3 206.3 128 224 128zM240 296C240 309.3 229.3 320 216 320C202.7 320 192 309.3 192 296C192 282.7 202.7 272 216 272C229.3 272 240 282.7 240 296zM320 320C306.7 320 296 309.3 296 296C296 282.7 306.7 272 320 272C333.3 272 344 282.7 344 296C344 309.3 333.3 320 320 320zM448 296C448 309.3 437.3 320 424 320C410.7 320 400 309.3 400 296C400 282.7 410.7 272 424 272C437.3 272 448 282.7 448 296zM216 416C202.7 416 192 405.3 192 392C192 378.7 202.7 368 216 368C229.3 368 240 378.7 240 392C240 405.3 229.3 416 216 416zM344 392C344 405.3 333.3 416 320 416C306.7 416 296 405.3 296 392C296 378.7 306.7 368 320 368C333.3 368 344 378.7 344 392zM424 416C410.7 416 400 405.3 400 392C400 378.7 410.7 368 424 368C437.3 368 448 378.7 448 392C448 405.3 437.3 416 424 416zM192 488C192 474.7 202.7 464 216 464L328 464C341.3 464 352 474.7 352 488C352 501.3 341.3 512 328 512L216 512C202.7 512 192 501.3 192 488zM424 464C437.3 464 448 474.7 448 488C448 501.3 437.3 512 424 512C410.7 512 400 501.3 400 488C400 474.7 410.7 464 424 464z"/></svg>'
            );

            // Register the Menu Button as a toggle.
            // This means that when highlighted over an existing Equation element it will show as toggled on.
            editor.ui.registry.addToggleButton('tiny_restoreequation', {
                icon: 'tiny_restoreequation',
                tooltip: eqCommon.buttonText,
                onAction: () => {
                    eqUi.handleAction(editor);
                },
                onSetup: (/** @type {any}*/ api) => {
                    editor.on('NodeChange', () => {
                        const result = eqEq.getSelectedEquation(editor);
                        api.setActive(result);
                    });
                },
            });
    });
}