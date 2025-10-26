
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
import {htmlToElement, setStyleMCE} from '../util';
import {addRequires, cleanUnusedRequires} from './dependencies';

/**
 * @param {Node} el
 * @returns
 */
function detachNode(el) {
  if (el && el.parentNode) {
    el.parentNode.removeChild(el);
  }
  return el;
}

/**
 * @this {{ctx: import("../contextinit").ItemMenuContext, type: string}}}
 */
export function addImageEffectAction() {
    const ctx = this.ctx;
    const type = this.type;
    const elem = ctx.path?.elem;
    if (!elem) {
        return;
    }
    elem.setAttribute("data-snptd", type);
    addRequires(ctx.editor, ["/sd/images.min.js"]);
}

/**
 * @this {{ctx: import("../contextinit").ItemMenuContext}}}
 */
export function removeImageEffectsAction() {
    const ctx = this.ctx;
    const elem = ctx.path?.elem;
    if (!elem) {
        return;
    }
    elem.removeAttribute("data-snptd");
    if (elem.getAttribute("role")?.startsWith("snptd_")) {
        elem.removeAttribute("role");
    }
    cleanUnusedRequires(ctx.editor);
}

/**
 * @this {{ctx: import("../contextinit").ItemMenuContext, iso: string}}
 */
export function changeBoxLangAction() {
    const iso = this.iso;
    const elem = this.ctx.path?.elem;
    const widget = this.ctx.path?.widget;
    if (!elem || !widget) {
        return;
    }
    const lateral = elem.querySelector('.iedib-titolLateral');
    const isTascaExercici = elem.getAttribute('data-proposat') ||
        elem.querySelector('.iedib-tasca.iedib-central');

    let theType;
    let langKey = "msg";
    if (isTascaExercici) {
        if (elem.querySelector('.iedib-tasca.iedib-proposat')) {
            langKey = "msg_epr";
        } else {
            // Must see if it is tava or tapr
            langKey = "msg_" + (elem.getAttribute('data-proposat') ?? "tapr");
        }
    } else if (widget.key === 'capsa-generica') {
        ["alerta", "ampliacio", "consell", "important", "introduccio"].forEach((ty) => {
            if (elem.classList.contains("iedib-" + ty + "-border")) {
                theType = ty;
            }
        });
        langKey = "msg_" + theType;
    }
    const I18n = widget.I18n;
    if (I18n?.[langKey]?.[iso]) {
        if (isTascaExercici) {
            const h4 = elem.querySelector('.iedib-central h4');
            if (h4) {
                h4.innerHTML = (I18n[langKey][iso] + ":");
            }
        } else if (lateral) {
            lateral.innerHTML = I18n[langKey][iso];
            if (theType) {
                lateral.append('<span class="iedib-' + theType + '-logo"></span>');
            }
        }
    }
    // Replace data-lang
    elem.setAttribute('data-lang', iso);
}

/**
 * @this {{ctx: import("../contextinit").ItemMenuContext, size: string}}
 */
export function changeBoxSizeAction() {
    const elem = this.ctx.path?.elem;
    const widget = this.ctx.path?.widget;
    if (!elem || !widget) {
        return;
    }
    elem.classList.remove("iedib-capsa-petita", "iedib-capsa-mitjana", "iedib-capsa-gran");
    elem.classList.add("iedib-capsa-" + this.size);
}

/**
 * @this {{ctx: import("../contextinit").ItemMenuContext, severity: string}}
 */
export function changeBoxSeverityAction() {
    const severity = this.severity;
    const elem = this.ctx.path?.elem;
    const widget = this.ctx.path?.widget;
    if (!elem || !widget) {
        return;
    }
    elem.classList.remove(
        "iedib-alerta-border", "iedib-important-border", "iedib-consell-border",
        "iedib-introduccio-border", "iedib-ampliacio-border");
    elem.classList.add("iedib-" + severity + "-border");
    const lateral = elem.querySelector(".iedib-lateral");
    lateral?.classList.remove("iedib-alerta", "iedib-important", "iedib-consell", "iedib-introduccio", "iedib-ampliacio");
    lateral?.classList.add("iedib-" + severity);
    const lang = elem.getAttribute("data-lang") || "ca";
    let langKey = "msg_" + severity;
    // Change the lateral title
    if (widget.I18n?.[langKey]?.[lang]) {
        const titolLateral = lateral?.querySelector('.iedib-titolLateral');
        if (titolLateral) {
            titolLateral.innerHTML = widget.I18n[langKey][lang];
        }
    }

}

/**
 * @this {{ctx: import("../contextinit").ItemMenuContext}}
 */
export function switchBoxSimpleExampleAction() {
    const target = this.ctx.path?.elem;
    const widget = this.ctx.path?.widget;
    if (!target || !widget) {
        return;
    }
    const lang = target.getAttribute("data-lang") || "ca";
    const solLabel = widget.I18n?.sol?.[lang] ?? 'Solució';
    const formulacio = target.querySelector("div.iedib-formulacio-rows");
    const resolucio = target.querySelector("div.iedib-resolucio-rows");
    const solLabelHTML = resolucio?.querySelector('div.accordion') ? "<p><b>" + solLabel + "</b>:</p>" : "";
    const lateralText = target.querySelector("p.iedib-titolLateral")?.innerHTML ?? '';
    const doc = this.ctx.editor.getDoc();
    const newSnpt = htmlToElement(doc, `<div class="iedib-capsa iedib-capsa-gran iedib-exemple-border" data-lang="${lang}">
        <div class="iedib-lateral iedib-exemple">
        <p class="iedib-titolLateral">${lateralText}</span></p>
        </div>
        <div class="iedib-central">
        ${formulacio?.innerHTML ?? ''}
        ${solLabelHTML}
         ${resolucio?.innerHTML ?? ''}
        '<br></div></div>`);
    target.replaceWith(newSnpt);

}

/**
 * @this {{ctx: import("../contextinit").ItemMenuContext}}
 */
export function switchBoxRowsExampleAction() {
    const target = this.ctx.path?.elem;
    if (!target) {
        return;
    }
    const lang = target.getAttribute("data-lang") || "ca";
    const lateralText = target.querySelector("p.iedib-titolLateral")?.innerHTML ?? '';
    const formulacio = target.querySelector("div.span4.iedib-formulacio");
    const resolucio = target.querySelector("div.span8.iedib-resolucio > div.iedib-central");
    const doc = this.ctx.editor.getDoc();
    const newSnpt = htmlToElement(doc, `<div class="iedib-capsa iedib-capsa-gran iedib-exemple-border" data-lang="${lang}">
        <div class="iedib-lateral iedib-exemple">
        <p class="iedib-titolLateral">${lateralText}</p>
        </div>
        <div class="iedib-formulacio-rows">
        ${formulacio?.innerHTML ?? ''}
        </div>
        <div class="iedib-resolucio-rows">
        ${resolucio?.innerHTML ?? ''}
        </div></div>`);

    target.replaceWith(newSnpt);

}

/**
 * @this {{ctx: import("../contextinit").ItemMenuContext}}
 */
export function imageSwitchToSnippetAction() {
    const target = this.ctx.path?.targetElement;
    if (!target) {
        return;
    }
    const doc = this.ctx.editor.getDoc();
    const snpt = htmlToElement(doc, `<div class="iedib-figura iedib-grid-responsive">
        ${target.outerHTML}
        <p class="iedib-img-footer">Imatge: <em>Descripció</em>. Font: Wikimedia. Domini públic.</p>
        </div>`);
    target.replaceWith(snpt);
}

/**
 * @this {{ctx: import("../contextinit").ItemMenuContext, colSpan: number}}
 */
export function changeColumnWidth() {
    const colSpan = this.colSpan;
    const target = this.ctx.path?.elem;
    if (!target) {
        return;
    }
    if (colSpan <= 0 || colSpan > 12) {
        // Set to one column flow
        const columns = target.querySelectorAll("div");
        columns.forEach(c => {
            c.className = '';
        });
        target.replaceWith(...Array.from(columns));
    } else {
        // Define the spans
        const first = target.querySelector("div:first-child");
        const last = target.querySelector("div:last-child");
        if (first) {
            first.className = "span" + colSpan;
        }
        if (last) {
            last.className = "span" + (12 - colSpan);
        }
    }
}

/**
 * @this {{ctx: import("../contextinit").ItemMenuContext, isDependentBehavior: boolean}}
 */
export function setAccordionBehavior() {
    const isDependentBehavior = this.isDependentBehavior;
    const target = this.ctx.path?.elem;
    if (!target) {
        return;
    }
    if (isDependentBehavior) {
        // Behavior individual
        target.querySelectorAll("div.accordion-body").forEach(e => {
            e.removeAttribute("data-parent");
            e.removeAttribute("data-bs-parent");
        });
    } else {
        // Behavior accordion
        const acid = target.id;
        target.querySelectorAll("div.accordion-body").forEach(e => {
            e.setAttribute("data-parent", "#" + acid);
            e.setAttribute("data-bs-parent", "#" + acid);
        });
    }
}

/**
 * @this {{ctx: import("../contextinit").ItemMenuContext}}
 */
export function convert2BootstrapTable() {
    const target = this.ctx.path?.elem;
    if (!target) {
        return;
    }
    target.classList.remove("iedib-table");
    target.classList.add("table", "table-striped", "iedib-bstable");
    target.removeAttribute('style');
    target.removeAttribute('border');
    target.querySelectorAll("td,th").forEach(e => {
        e.removeAttribute('style');
        e.removeAttribute('data-mce-style');
    });
    target.querySelectorAll("thead > tr > th").forEach(e => {
        e.setAttribute("role", "col");
    });
}

/**
 * @this {{ctx: import("../contextinit").ItemMenuContext}}
 */
export function convertDropdownToList() {
    const target = this.ctx.path?.elem;
    if (!target) {
        return;
    }
    // Convert into a list
    const doc = this.ctx.editor.dom.getDoc();
    const listSubstitute = doc.createElement('UL');
    target.querySelectorAll("a.accordion-toggle").forEach(a => {
          const href = a.getAttribute("href");
          if (!href) {
            return;
          }
          const e = target.querySelector(href);
          if (!e) {
            return;
          }
          detachNode(e);
          e.className = '';
          const theLi = doc.createElement('LI');
          theLi.append(a.innerHTML);
          theLi.append(e);
          listSubstitute.append(theLi);
    });
    target.replaceWith(listSubstitute);
}

/**
 * @this {{ctx: import("../contextinit").ItemMenuContext}}
 */
export function convert2PrefefinedTable() {
    const target = this.ctx.path?.elem;
    if (!target) {
        return;
    }
    target.classList.remove("table", "table-bordered", "table-hover", "table-striped", "table-responsive", "iedib-bstable");
    target.classList.add("iedib-table");
    target.setAttribute("style", 'table-layout:fixed; border-collapse:collapse; border-spacing:0px; width:96%;');
    target.setAttribute("data-mce-style", target.getAttribute('style') ?? '');
    /** @type {NodeListOf<HTMLElement>} */
    const allTdTh = target.querySelectorAll("td,th");
    allTdTh.forEach(e => setStyleMCE(e, "border", '1px solid gray'));
}

/**
 * @this {{ctx: import("../contextinit").ItemMenuContext}}
 */
export function toggleTableHeader() {
    const target = this.ctx.path?.elem;
    if (!target) {
        return;
    }
    let head = target.querySelector("thead");
    if (head) {
        // Remove head
        head.remove();
    } else {
        // Create a head
        const doc = this.ctx.editor.dom.getDoc();
        head = doc.createElement('THEAD');
        const tr = doc.createElement('TR');
        const firstTr = target.querySelector("tr");
        if (firstTr) {
            firstTr.querySelectorAll("td").forEach(e => {
                const newTh = htmlToElement(doc, '<th role="col">Títol</th>');
                const st = e.getAttribute("style");
                newTh.setAttribute("style", st ? st : "");
                newTh.setAttribute("data-mce-style", st ? st : "");
                tr.append(newTh);
            });
            if (head) {
                head.append(tr);
                target.prepend(head);
            }
        }
    }
}

/**
 * @this {{ctx: import("../contextinit").ItemMenuContext}}
 */
export function toggleTableFooter() {
    const target = this.ctx.path?.elem;
    if (!target) {
        return;
    }
    let foot = target.querySelector("tfoot");
    if (foot) {
        // Remove the footer
        foot.remove();
    } else {
        // Creates a footer
        const doc = this.ctx.editor.dom.getDoc();
        foot = doc.createElement("TFOOT");
        const tr2 = doc.createElement("TR");
        const firstTr = target.querySelector("tbody tr");
        if (firstTr) {
            firstTr.querySelectorAll("td").forEach(e => {
                const newTd = htmlToElement(doc, "<td>Resum</td>");
                const st =e.getAttribute("style");
                newTd.setAttribute("style", st ? st : "");
                newTd.setAttribute("data-mce-style", st ? st : "");
                tr2.append(newTd);
            });
            if (foot) {
                foot.append(tr2);
                target.append(foot);
            }
        }
    }
}


/**
 * @this {{ctx: import("../contextinit").ItemMenuContext}}
 */
export function toggleBootstapTableResponsiveness() {
    const target = this.ctx.path?.elem;
    if (!target) {
        return;
    }

    if (target.parentElement?.classList?.contains("table-responsive")) {
        // Delete responsiveness
       target.parentElement.replaceWith(target);
    } else {
        // Add responsiveness
        const doc = this.ctx.editor.dom.getDoc();
        const div = htmlToElement(doc, `<div class="table-responsive">
            ${target.outerHTML}
            </div>`);
        target.replaceWith(div);
    }
}

