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
import Common from '../common';
import { registerMenuItemProvider } from "../extension";
import { getUserStorage } from "../service/userstorage_service";
import { convertInt, findVariableByName, removeStyleMCE, setStyleMCE } from "../util";
import * as Action from './customcontextactions';
// eslint-disable-next-line camelcase
import { get_strings } from "core/str";

const { component } = Common;

/**
 * @typedef {{type: string, text: string, icon?: string, onAction: (api?: *) => void}} MenuItem
 * @typedef {{name: string, title: string, condition?: string | RegExp | (() => boolean), icon?: string, onAction?: ()=> void, subMenuItems?: () => (string | MenuItem[])}} UserDefinedItem
 */

export const SUPPORTED_LANGS = [
    { iso: 'ca', title: 'Català' },
    { iso: 'es', title: 'Castellà' },
    { iso: 'en', title: 'English' },
    { iso: 'fr', title: 'Francès' },
    { iso: 'de', title: 'Alemany' },
];


const languageStrings = [
    'accept',
    'add',
    'beautified',
    'behavior',
    'big',
    'cancel',
    'cell',
    'choosebackground',
    'choosecolor',
    'colssize',
    'dependent',
    'footer',
    'fullscreen',
    'header',
    'imageeffects',
    'independent',
    'language',
    'list',
    'maxwidthpx',
    'medium',
    'minusonenolimit',
    'remove',
    'removebackground',
    'responsivity',
    'row',
    'size',
    'small',
    'startsat',
    'startsnumerationat',
    'tablewidth',
    'tobootstraptable',
    'toexamplerows',
    'toexamplesimple',
    'tolist',
    'toonecol',
    'topredefinedtable',
    'towidgetimage',
    'type',
    'printable',
    'no',
    'yes',
    'onlylink',
    'printnone',
    'printall',
    'printonlylink'
];

/**
 * @param {import("../contextactions").ItemMenuContext} ctx
 * @returns {Promise<UserDefinedItem[]>}
 **/
export async function provider(ctx) {
    // Get translations
    /** @type {string[]} */
    const translations = await get_strings(languageStrings.map(key => ({ key, component })));
    /** @type {Record<string, string>} */
    const i18n = Object.fromEntries(translations.map((trans, i) => [languageStrings[i], trans]));

    const AVAILABLE_EFFECTS = [
        { name: 'zoom', title: 'Zoom' },
        { name: 'lightbox', title: i18n.fullscreen },
    ];

    const SUPPORTED_SIZES = [
        { v: 'gran', l: i18n.big },
        { v: 'mitjana', l: i18n.medium },
        { v: 'petita', l: i18n.small },
    ];

    /**
     * @param {string} title
     * @param {string} label
     * @param {*} initialValue
     * @param {(api: *) => void} onSubmit
     */
    const openInputDialog = function (title, label, initialValue, onSubmit) {
        ctx.editor?.windowManager.open({
            title,
            body: {
                type: 'panel',
                items: [
                    {
                        type: 'input',
                        name: 'value',
                        label: label
                    }
                ]
            },
            buttons: [
                {
                    type: 'submit',
                    text: i18n.accept
                }
            ],
            initialData: {
                value: initialValue
            },
            onSubmit
        });
    };

    /**
     * @type {UserDefinedItem}
     */
    const imageEffectsNestedMenu = {
        name: 'imageEffects',
        condition: 'imatge',
        title: i18n.imageeffects,
        subMenuItems: () => {
            const elem = ctx.path?.elem;
            if (!elem) {
                return [];
            }
            if (!elem.getAttribute('data-snptd')) {
                return AVAILABLE_EFFECTS.map(e => ({
                    type: 'menuitem',
                    text: e.title,
                    tooltip: e.name,
                    onAction: Action.addImageEffectAction.bind({ ctx, type: e.name })
                }));
            } else {
                return [{
                    type: 'menuitem',
                    icon: 'remove',
                    text: i18n.remove,
                    onAction: Action.removeImageEffectsAction.bind({ ctx })
                }];
            }
        }
    };

    /**
     * @type {UserDefinedItem}
     */
    const imageSwitchToSnippet = {
        name: 'imageSwitchToSnippet',
        condition: () => {
            // We are not inside a widget image and the
            // selectedElement right clicked must be a tag img
            const key = ctx.path?.widget?.key;
            const elem = ctx.path?.selectedElement;
            const isImg =
                key !== undefined &&
                key !== 'imatge' &&
                key !== 'grid-imatge' &&
                elem?.tagName === 'IMG' &&
                // Do not take into account images in ib-card
                !elem?.closest('div.ib-card') &&
                // Do not take into account images in carousel
                !elem?.closest('[data-widget="ib-carousel"]');
            if (ctx.path && isImg && elem) {
                ctx.path.targetElement = elem;
            }
            return isImg;
        },
        title: i18n.towidgetimage,
        onAction: Action.imageSwitchToSnippetAction.bind({ ctx })
    };

    /**
     * @type {UserDefinedItem}
     */
    const h5pPlaceholderPrintBehaviorNestedMenu = {
        name: 'h5pPlaceholderPrintBehaviorNestedMenu',
        condition: /DIV_H5P_PLACEHOLDER|IFRAME/,
        title: i18n.printable,
        subMenuItems: () => {
            const targetElem = ctx.path?.targetElement;
            if (!targetElem) {
                return [];
            }
            const isPrintDisabled = targetElem.classList.contains('d-print-none');
            const bodyId = document.body.id || '';
            const isPrintLinkSupported = (bodyId.startsWith('page-mod-page-') || bodyId.startsWith('page-mod-book-')) &&
                !targetElem.classList.contains('mediaplugin_videojs');
            const isPrintLinkDisabled = isPrintLinkSupported && targetElem.classList.contains('disable-print-iframe-link');
            let currentState = 'all';
            if (isPrintDisabled) {
                currentState = 'none';
            } else if (isPrintLinkSupported && !isPrintLinkDisabled) {
                currentState = 'link';
            }
            /** @type {any[]} */
            const items = [
                {
                    type: 'togglemenuitem',
                    text: i18n.no,
                    tooltip: i18n.printnone,
                    onAction: Action.printAction.bind({ ctx, type: 'none' }),
                    onSetup: (/** @type {*} */ api) => {
                        api.setActive(currentState === 'none');
                        return () => { };
                    }
                },
                {
                    type: 'togglemenuitem',
                    text: i18n.yes,
                    tooltip: i18n.printall,
                    onAction: Action.printAction.bind({ ctx, type: isPrintLinkSupported ? 'all' : 'link' }),
                    onSetup: (/** @type {*} */ api) => {
                        api.setActive(currentState === 'all');
                        return () => { };
                    }
                },
            ];
            if (isPrintLinkSupported) {
                items.splice(1, 0, {
                    type: 'togglemenuitem',
                    text: i18n.onlylink,
                    tooltip: i18n.printonlylink,
                    onAction: Action.printAction.bind({ ctx, type: 'link' }),
                    onSetup: (/** @type {*} */ api) => {
                        api.setActive(currentState === 'link');
                        return () => { };
                    }
                });
            }
            return items;
        }
    };

    /**
     * @type {UserDefinedItem}
     */
    const changeBoxLanguageNestedMenu = {
        name: 'changeBoxLanguage',
        condition: /capsa-.*|tasca-exercici/,
        title: i18n.language,
        subMenuItems: () => {
            const elem = ctx.path?.elem;
            if (!elem) {
                return '';
            }
            const currentLang = elem.getAttribute('data-lang') ?? '';
            return SUPPORTED_LANGS.map(({ iso, title }) => ({
                type: 'menuitem',
                text: title,
                icon: iso === currentLang ? 'checkmark' : undefined,
                onAction: Action.changeBoxLangAction.bind({ ctx, iso })
            }));
        }
    };

    /**
     * @type {UserDefinedItem}
     */
    const changeBoxSizeNestedMenu = {
        name: 'changeBoxSize',
        condition: /^capsa-.*|^tasca-exercici$/,
        title: i18n.size,
        subMenuItems: () => {
            const elem = ctx.path?.elem;
            const widget = ctx.path?.widget;
            if (!elem || !widget) {
                return '';
            }
            const sizes = findVariableByName('mida', widget.parameters)?.options;
            return (sizes || SUPPORTED_SIZES).map((/** @type {*}*/ e) => ({
                type: 'menuitem',
                text: e.l ?? e,
                icon: elem.classList.contains('iedib-capsa-' + (e.v ?? e)) ? 'checkmark' : undefined,
                onAction: Action.changeBoxSizeAction.bind({ ctx, size: e.v ?? e })
            }));
        }
    };

    /**
     * @type {UserDefinedItem}
     */
    const changeBoxSeverityNestedMenu = {
        name: 'changeBoxSeverity',
        condition: 'capsa-generica',
        title: i18n.type,
        subMenuItems: () => {
            const elem = ctx.path?.elem;
            const widget = ctx.path?.widget;
            if (!elem || !widget) {
                return '';
            }
            const severities = findVariableByName('severity', widget.parameters)?.options;
            return (severities || []).map((/** @type {*}*/ e) => ({
                type: 'menuitem',
                text: e.l ?? e,
                icon: elem.classList.contains('iedib-' + (e.v ?? e) + '-border') ? 'checkmark' : undefined,
                onAction: Action.changeBoxSeverityAction.bind({ ctx, severity: e.v ?? e })
            }));
        }
    };


    /**
     * @type {UserDefinedItem}
     */
    const twoColumnsNestedMenu = {
        name: 'twoColumnsNestedMenu',
        condition: 'two-cols',
        title: i18n.colssize,
        subMenuItems: () => {
            const elem = ctx.path?.elem;
            const widget = ctx.path?.widget;
            if (!elem || !widget) {
                return '';
            }
            /** @type {*} */
            const menuItems = [{
                type: 'menuitem',
                text: i18n.toonecol,
                onAction: Action.changeColumnWidth.bind({ ctx, colSpan: 0 })
            }];

            const firstDiv = elem.querySelector('div:first-child');
            const firstSpan = firstDiv
                ? (firstDiv.className?.split(' ') ?? [])
                    .filter(c => c.startsWith('span'))
                    .map(c => c.replace('span', ''))[0]
                : undefined;

            for (let i = 2; i < 12; i = i + 2) {
                const tpc = parseInt((100 * i / 12.0).toFixed(0));
                const label = tpc + "% | " + (100 - tpc) + "%";
                let isCurrent = firstSpan && convertInt(firstSpan, 0) == i;
                menuItems.push({
                    type: 'menuitem',
                    text: label,
                    icon: isCurrent ? 'checkmark' : undefined,
                    onAction: Action.changeColumnWidth.bind({ ctx, colSpan: i })
                });
            }
            return menuItems;
        }
    };

    /**
     * @type {UserDefinedItem}
     */
    const switchBoxRowsExample = {
        name: 'switchBoxRowsExample',
        condition: 'capsa-exemple-cols',
        title: i18n.toexamplerows,
        onAction: Action.switchBoxRowsExampleAction.bind({ ctx })
    };

    /**
     * @type {UserDefinedItem}
     */
    const switchBoxSimpleExample = {
        name: 'switchBoxSimpleExample',
        condition: 'capsa-exemple-rows',
        title: i18n.toexamplesimple,
        onAction: Action.switchBoxSimpleExampleAction.bind({ ctx })
    };

    /**
     * @type {UserDefinedItem}
     */
    const numberedListNestedMenu = {
        name: 'numberedListNestedMenu',
        condition: () => {
            const selectedElement = ctx.path?.selectedElement;
            // It must search an OL in the path, probably selectedElement is LI or so!!!!!
            const target = selectedElement?.closest("ol");
            if (ctx.path && target) {
                ctx.path.targetElement = target;
                return true;
            }
            return false;
        },
        icon: 'list-num-default',
        title: i18n.list,
        subMenuItems: () => {
            // Determine if the class is there
            const isBeauty = ctx.path?.targetElement?.classList?.contains('iedib-falist');
            const menu = [
                {
                    type: 'menuitem',
                    text: i18n.beautified,
                    icon: isBeauty ? 'checkmark' : undefined,
                    onAction: () => {
                        // Toggle class
                        const target = ctx.path?.targetElement;
                        if (!target) {
                            return;
                        }
                        target.classList.toggle('iedib-falist');
                        // Make sure that start and style are in sync
                        const startAt = target.getAttribute("start") || "1";
                        if (target.classList.contains('iedib-falist')) {
                            const beginAt = parseInt(startAt);
                            // @ts-ignore
                            setStyleMCE(target, "counter-reset", "iedibfalist-counter " + (beginAt - 1));
                        } else {
                            // @ts-ignore
                            removeStyleMCE(target, "counter-reset");
                            target.classList.remove('iedib-falist--alpha', 'iedib-falist--roman',
                                'iedib-falist--upper-alpha', 'iedib-falist--upper-roman',
                                'iedib-falist--primary', 'iedib-falist--light', 'iedib-falist--dark');
                        }
                    }
                },
                {
                    type: 'menuitem',
                    text: i18n.startsat,
                    onAction: () => {
                        // Get the start property of the list
                        const startAt1 = ctx.path?.targetElement?.getAttribute("start") ?? "1";
                        // Open input dialog, set the value and retrieve new value
                        openInputDialog(i18n.startsnumerationat + ' ...', '', startAt1,
                            (/** @type {*} */ api) => {
                                // TODO: Opened issue: Closing a tiny dialog -- afects the main bootstap dialog
                                api.close();
                                const target = ctx.path?.targetElement;
                                if (!target) {
                                    return;
                                }
                                // Change the number at which start
                                const startAt2 = api.getData().value ?? "1";
                                const beginAt3 = convertInt(startAt2, 1);
                                target.setAttribute("start", beginAt3 + '');
                                // @ts-ignore
                                setStyleMCE(target, "counter-reset", "iedibfalist-counter " + (beginAt3 - 1));
                            });
                    },
                }
            ];
            if (isBeauty) {
                const classActionType = (/** @type {string} */ cls) => {
                    const target = ctx.path?.targetElement;
                    if (!target) {
                        return;
                    }
                    target.classList.remove('iedib-falist--alpha', 'iedib-falist--upper-alpha', 'iedib-falist--roman', 'iedib-falist--upper-roman');
                    if (cls) {
                        target.classList.add('iedib-falist--' + cls);
                    }
                };
                /**
                 * @param {string} cls
                 */
                const classActionColor = (/** @type {string} */ cls) => {
                    const target = ctx.path?.targetElement;
                    if (!target) {
                        return;
                    }
                    target.classList.remove('iedib-falist--primary', 'iedib-falist--light', 'iedib-falist--dark');
                    if (cls) {
                        target.classList.add('iedib-falist--' + cls);
                    }
                };
                // Submenú to change the type of the list (flattened — TinyMCE doesn't support nested submenus)
                //@ts-ignore
                menu.push({ type: 'separator' });
                menu.push({ type: 'menuitem', text: 'Tipus: Números 1, 2, 3..', onAction: () => classActionType('') });
                menu.push({ type: 'menuitem', text: 'Tipus: Lletres a), b), c)..', onAction: () => classActionType('alpha') });
                menu.push({ type: 'menuitem', text: 'Tipus: Lletres A), B), C)..', onAction: () => classActionType('upper-alpha') });
                menu.push({ type: 'menuitem', text: 'Tipus: Romans i), ii), iii)..', onAction: () => classActionType('roman') });
                menu.push({ type: 'menuitem', text: 'Tipus: Romans I), II), III)..', onAction: () => classActionType('upper-roman') });

                // Submenú to change the color of the list (flattened)
                //@ts-ignore
                menu.push({ type: 'separator' });
                menu.push({ type: 'menuitem', text: 'Fons: Gris', onAction: () => classActionColor('') });
                menu.push({ type: 'menuitem', text: 'Fons: Blau', onAction: () => classActionColor('primary') });
                menu.push({ type: 'menuitem', text: 'Fons: Blanc', onAction: () => classActionColor('light') });
                menu.push({ type: 'menuitem', text: 'Fons: Negre', onAction: () => classActionColor('dark') });
            }
            return menu;
        }
    };

    /**
     * @type {UserDefinedItem}
     */
    const accordionIndependentBehaviorNestedMenu = {
        name: 'accordionIndependentBehavior',
        condition: 'desplegable2',
        title: i18n.behavior,
        subMenuItems: () => {
            const target = ctx.path?.elem;
            if (!target) {
                return '';
            }
            // Is Accordion behavior?
            const accordionBody = target.querySelector("div.accordion-body");
            const isDependentBehavior =
                ((accordionBody?.getAttribute("data-parent") ??
                    accordionBody?.getAttribute("data-bs-parent")) ?? null) !== null;

            return [false, true].map(opt => ({
                type: 'menuitem',
                text: opt ? i18n.independent : i18n.dependent,
                icon: isDependentBehavior === opt ? undefined : 'checkmark',
                onAction: Action.setAccordionBehavior.bind({ ctx, isDependentBehavior: opt })
            }));
        }
    };


    /**
     * @type {UserDefinedItem}
     */
    const tablesMaxWidthMenu = {
        name: 'tablesMaxWidthMenu',
        condition: 'taula-predefinida,taula-bs',
        title: i18n.tablewidth,
        onAction: () => {
            /** @type {any} */
            const target = ctx.path?.elem;
            if (!target || target.nodeType !== 1) {
                return;
            }
            // Get the initial width
            const startAt1 = (target.style.getPropertyValue("max-width") || "-1")
                .replace("px", "").replace("none", "-1");
            // Open input dialog, set the value and retrieve new value
            openInputDialog(i18n.maxwidthpx, i18n.minusonenolimit, startAt1,
                (/** @type {*} */ api) => {
                    /** @type {any} */
                    const target = ctx.path?.elem;
                    if (!target || target.nodeType !== 1) {
                        return;
                    }
                    const maxwidth = convertInt(api.getData().value.replace("px", "").trim(), 0);
                    if (maxwidth > 0) {
                        setStyleMCE(target, "max-width", maxwidth + "px");
                    } else {
                        removeStyleMCE(target, "max-width");
                    }
                    api.close();
                });
        },
    };

    /**
     * @type {UserDefinedItem}
     */
    const convertToBsTableMenu = {
        name: 'convertToBsTableMenu',
        condition: 'taula-predefinida',
        title: i18n.tobootstraptable,
        onAction: Action.convert2BootstrapTable.bind({ ctx }),
    };

    /**
     * @type {UserDefinedItem}
     */
    const convertToPredefinedTableMenu = {
        name: 'convertToPredefinedTableMenu',
        condition: 'taula-bs',
        title: i18n.topredefinedtable,
        onAction: Action.convert2PrefefinedTable.bind({ ctx }),
    };

    /**
     * @type {UserDefinedItem}
     */
    const responsivenessNestedMenu = {
        name: 'responsivenessNestedMenu',
        condition: 'taula-bs',
        title: i18n.responsivity,
        subMenuItems: () => {
            const target = ctx.path?.elem;
            if (!target) {
                return '';
            }
            // Is responsiveness active
            const isResponsive = target.parentElement?.classList.contains('table-responsive');

            return [{
                type: 'menuitem',
                text: isResponsive ? i18n.remove : i18n.add,
                onAction: Action.toggleBootstapTableResponsiveness.bind({ ctx })
            }];
        }
    };

    /**
     * @type {UserDefinedItem}
     */
    const tablesHeaderNestedMenu = {
        name: 'tablesHeaderNestedMenu',
        condition: 'taula-predefinida,taula-bs',
        title: i18n.header,
        subMenuItems: () => {
            const target = ctx.path?.elem;
            if (!target) {
                return '';
            }
            const hasHeader = target.querySelector('thead') !== null;

            return [{
                type: 'menuitem',
                text: hasHeader ? i18n.remove : i18n.add,
                onAction: Action.toggleTableHeader.bind({ ctx })
            }];
        }
    };

    /**
     * @type {UserDefinedItem}
     */
    const tablesFooterNestedMenu = {
        name: 'tablesFooterNestedMenu',
        condition: 'taula-predefinida,taula-bs',
        title: i18n.footer,
        subMenuItems: () => {
            const target = ctx.path?.elem;
            if (!target) {
                return '';
            }
            const hasFooter = target.querySelector('tfoot') !== null;

            return [{
                type: 'menuitem',
                text: hasFooter ? i18n.remove : i18n.add,
                onAction: Action.toggleTableFooter.bind({ ctx })
            }];
        }
    };

    /**
     * @type {UserDefinedItem}
     */
    const convertDropdownToList = {
        name: 'convertDropdownToList',
        condition: 'desplegable2',
        title: i18n.tolist,
        onAction: Action.convertDropdownToList.bind({ ctx }),
    };

    /**
     *
     * @param {import("../plugin").TinyMCE} editor
     * @param {(color: string) => void} cbAccept
     */
    function colorPicker(editor, cbAccept) {
        // Get last value from localStorage or white
        const storageSrv = getUserStorage(editor);
        const iniValue = storageSrv.getFromLocal('pickercolor', '#FFFFFF');
        /** @type {HTMLElement | null | undefined} */
        let container;
        /** @type {(e: any) => void | null | undefined} */
        let handleClick;

        editor.windowManager.open({
            title: i18n.choosecolor,
            body: {
                type: 'panel',
                items: [
                    {
                        type: 'htmlpanel',
                        html: `<input type="color" id="tiny_ibwidgethub_colorinput" value="${iniValue}" style="width:100%; height:50px;" />
                    <div id="tiny_ibwidgethub_preset-colors" style="margin: 8px;">
                        <button type="button" data-color="#BFEDD2" style="background:#BFEDD2; width:24px; height:24px; border:none; margin-right:4px;"></button>
                        <button type="button" data-color="#FBEEB8" style="background:#FBEEB8; width:24px; height:24px; border:none; margin-right:4px;"></button>
                        <button type="button" data-color="#F8CAC6" style="background:#F8CAC6; width:24px; height:24px; border:none; margin-right:4px"></button>
                        <button type="button" data-color="#ECCAFA" style="background:#ECCAFA; width:24px; height:24px; border:none; margin-right:4px;"></button>
                        <button type="button" data-color="#C2E0F4" style="background:#C2E0F4; width:24px; height:24px; border:none; margin-right:4px;"></button>
                        <button type="button" data-color="#ECF0F1" style="background:#ECF0F1; width:24px; height:24px; border:none; margin-right:4px"></button>
                        <button type="button" data-color="#CED4D9" style="background:#CED4D9; width:24px; height:24px; border:none;"></button>
                    </div>`
                    }
                ]
            },
            buttons: [
                {
                    type: 'cancel',
                    text: i18n.cancel
                },
                {
                    type: 'submit',
                    text: i18n.accept,
                    primary: true
                }
            ],
            onSubmit: (/** @type{*} **/ api) => {
                /** @type {any} */
                const control = document.getElementById('tiny_ibwidgethub_colorinput');
                if (control?.value) {
                    cbAccept?.(control.value);
                    storageSrv.setToLocal('pickercolor', control.value, true);
                }
                api.close();
                if (container && handleClick) {
                    container.removeEventListener('click', handleClick);
                }
            }
        });

        // Afegeix el codi fora del `open`, amb `setTimeout` perquè el DOM estigui preparat
        setTimeout(() => {
            container = document.getElementById('tiny_ibwidgethub_preset-colors');
            if (container) {
                handleClick = (/** @type {*} */ e) => {
                    const target = e.target.closest('button');
                    if (target) {
                        const color = target.dataset.color;
                        /** @type{any} */
                        const input = document.getElementById('tiny_ibwidgethub_colorinput');
                        if (input) {
                            input.value = color;
                        }
                    }
                };
                container.addEventListener('click', handleClick);
            }
        }, 300);
    }

    /**
     * @type {UserDefinedItem}
     */
    const tablesCellColorNestedMenu = {
        name: 'tablesCellColorNestedMenu',
        condition: () => {
            return !!ctx.path?.selectedElement?.closest("table");
        },
        title: i18n.cell,
        subMenuItems: () => {
            /** @type {HTMLElement | undefined | null} */
            const cell = ctx.path?.selectedElement?.closest('td, th');
            if (!cell) {
                return [];
            }
            const menus = [
                {
                    type: 'menuitem',
                    text: i18n.choosebackground,
                    onAction: () => {
                        colorPicker(ctx.editor,
                            (/** @type {string} */ color) => {
                                setStyleMCE(cell, 'background-color', color);
                            }
                        );
                    }
                }
            ];

            if (cell.style.backgroundColor) {
                menus.push({
                    type: 'menuitem',
                    text: i18n.removebackground,
                    onAction: () => {
                        removeStyleMCE(cell, 'background-color');
                    }
                });
            }

            return menus;
        }
    };


    /**
     * @type {UserDefinedItem}
     */
    const tablesRowColorNestedMenu = {
        name: 'tablesRowColorNestedMenu',
        condition: () => {
            return !!ctx.path?.selectedElement?.closest("table");
        },
        title: i18n.row,
        subMenuItems: () => {
            /** @type {HTMLElement | undefined | null} */
            const row = ctx.path?.selectedElement?.closest('tr');
            if (!row) {
                return [];
            }
            const menus = [
                {
                    type: 'menuitem',
                    text: i18n.choosebackground,
                    onAction: () => {
                        colorPicker(ctx.editor,
                            (/** @type {string} */ color) => {
                                setStyleMCE(row, 'background-color', color);
                            }
                        );
                    }
                }
            ];
            if (row.style.backgroundColor) {
                menus.push({
                    type: 'menuitem',
                    text: i18n.removebackground,
                    onAction: () => {
                        removeStyleMCE(row, 'background-color');
                    }
                });
            }
            return menus;
        }
    };

    return [
        // Image actions
        imageEffectsNestedMenu,
        imageSwitchToSnippet,

        // H5P placeholder actions
        h5pPlaceholderPrintBehaviorNestedMenu,

        // Box actions
        changeBoxLanguageNestedMenu,
        changeBoxSizeNestedMenu,
        changeBoxSeverityNestedMenu,
        switchBoxRowsExample,
        switchBoxSimpleExample,

        // Others
        accordionIndependentBehaviorNestedMenu,
        numberedListNestedMenu,
        twoColumnsNestedMenu,
        convertDropdownToList,

        // Tables
        tablesMaxWidthMenu,
        convertToBsTableMenu,
        convertToPredefinedTableMenu,
        responsivenessNestedMenu,
        tablesHeaderNestedMenu,
        tablesFooterNestedMenu,
        tablesCellColorNestedMenu,
        tablesRowColorNestedMenu,
    ];
}

registerMenuItemProvider(provider);