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
                    return !node.textContent?.trim();
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
                    return !node.textContent?.trim();
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
 * @param {string|number} cfgLevel - Si cfgLevel=1, evita scroll i no fa res més,
 *                                   si cfgLevel=2 evita scroll i posiciona en element més proper.
 */
export function avoidScrollNonEditableZones(editor, cfgLevel) {

    editor.on('mousedown', function(/** @type {MouseEvent} */ e) {
        // Només actuem en clic esquerre
        if (e.button !== 0) {
            return;
        }
        const body = editor.getBody();
        const html = body.parentElement;

        // Sortim si el clic no és dins del body
        if ((e.target !== html && e.target !== body) && !body.contains(e.target)) {
            return;
        }

        // Ara podem tractar el cas “clic en zona buida” (target === body)
        if (e.target === body || e.target == html) {
            // Sortim si el body és buit
            if (body.children.length === 0) {
                return;
            }
            e.preventDefault();
            e.stopPropagation();

            const rng = editor.selection.getRng();

            // Si l'editor no té focus, el posem
            if (!editor.hasFocus()) {
                // Get current scroll
                const scrollTop = html.scrollTop;
                const scrollLeft = html.scrollLeft;
                editor.focus();
                // Restore scroll
                requestAnimationFrame(() => {
                    html.scrollTop = scrollTop;
                    html.scrollLeft = scrollLeft;
                });
            }

            if (Number(cfgLevel) === 2) {
                if (rng && rng.startContainer) {
                    // Range existent → restaurar-lo
                    editor.selection.setRng(rng);
                }
            }
        }

    });
}
