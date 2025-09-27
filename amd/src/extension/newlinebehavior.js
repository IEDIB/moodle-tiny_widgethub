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

    // Quick regex optimization if no <script>, <pre>, or <code> tags exist
    if (!/<(script|pre|code)[\s>]/i.test(content)) {
        return content.replace(/<p>\s*<\/p>/gi, '');
    }

    // Otherwise, use DOMParser for safety
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(content, 'text/html');
        doc.querySelectorAll('p').forEach(p => {
            if (/^\s*$/.test(p.innerHTML) && !p.closest('pre, code, script')) {
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

        editor.setContent = function(/** @type {string} */ content, /** @type {*} */ args) {
            // Only process content for the first call
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

        editor.getContent = function(/** @type {any} */ args) {
            let content = editor._orgGetContent.call(this, args) || '';
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