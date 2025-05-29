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
import {registerMenuItemProvider} from "../extension";
import { getUserStorage } from "../service/userstorage_service";
import {convertInt, findVariableByName} from "../util";
import * as Action from './contextactions';

const SUPPORTED_LANGS = [
    {iso: 'ca', title: 'Català'},
    {iso: 'es', title: 'Castellà'},
    {iso: 'en', title: 'English'},
    {iso: 'fr', title: 'Francès'},
    {iso: 'de', title: 'Alemany'},
];

const AVAILABLE_EFFECTS = [
    {name: 'zoom', title: 'Zoom'},
    {name: 'lightbox', title: 'Pantalla completa'},
];

const SUPPORTED_SIZES = [
    {v: 'gran', l: 'Gran'},
    {v: 'mitjana', l: 'Mitjana'},
    {v: 'petita', l: 'Petita'},
];

/**
 * @typedef {{type: string, text: string, icon?: string, onAction: (api?: *) => void}} MenuItem
 * @typedef {{name: string, title: string, condition?: string | RegExp | (() => boolean), icon?: string, onAction?: ()=> void, subMenuItems?: () => (string | MenuItem[])}} UserDefinedItem
 */

/**
 * @param {import("../contextinit").ItemMenuContext} ctx
 * @returns {UserDefinedItem[]}
 **/
function provider(ctx) {
    /**
     * @param {string} title
     * @param {string} label
     * @param {*} initialValue
     * @param {(api: *) => void} onSubmit
     */
    const openInputDialog = function(title, label, initialValue, onSubmit) {
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
                text: 'Acceptar'
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
        title: 'Efectes d\'imatge',
        subMenuItems: () => {
            const elem = ctx.path?.elem;
            if (!elem) {
                return '';
            }
            if (!elem.attr('data-snptd')) {
                return AVAILABLE_EFFECTS.map(e => ({
                    type: 'menuitem',
                    text: e.title,
                    onAction: Action.addImageEffectAction.bind({ctx, type: e.name})
                }));
            } else {
                return [{
                    type: 'menuitem',
                    icon: 'remove',
                    text: 'Treure',
                    onAction: Action.removeImageEffectsAction.bind({ctx})
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
           const isImg = (key !== undefined && key !== 'imatge' && key !== 'grid-imatge' &&
            elem?.prop('tagName') === 'IMG');
           if (ctx.path && isImg && elem?.[0]) {
                ctx.path.targetElement = elem;
           }
           return isImg;
        },
        title: 'Convertir a snippet imatge',
        onAction: Action.imageSwitchToSnippetAction.bind({ctx})
    };

    /**
     * @type {UserDefinedItem}
     */
    const changeBoxLanguageNestedMenu = {
        name: 'changeBoxLanguage',
        condition: /capsa-.*|tasca-exercici/,
        title: 'Idioma',
        subMenuItems: () => {
            const elem = ctx.path?.elem;
            if (!elem) {
                return '';
            }
            const currentLang = elem.attr('data-lang') ?? '';
            return SUPPORTED_LANGS.map(({iso, title}) => ({
                type: 'menuitem',
                text: title,
                icon: iso === currentLang ? 'checkmark' : undefined,
                onAction: Action.changeBoxLangAction.bind({ctx, iso})
            }));
        }
    };

    /**
     * @type {UserDefinedItem}
     */
    const changeBoxSizeNestedMenu = {
        name: 'changeBoxSize',
        condition: /^capsa-.*|^tasca-exercici$/,
        title: 'Mida',
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
                icon: elem.hasClass('iedib-capsa-' + (e.v ?? e)) ? 'checkmark' : undefined,
                onAction: Action.changeBoxSizeAction.bind({ctx, size: e.v ?? e})
            }));
        }
    };

    /**
     * @type {UserDefinedItem}
     */
    const changeBoxSeverityNestedMenu = {
        name: 'changeBoxSeverity',
        condition: 'capsa-generica',
        title: 'Tipus',
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
                icon: elem.hasClass('iedib-' + (e.v ?? e) + '-border') ? 'checkmark' : undefined,
                onAction: Action.changeBoxSeverityAction.bind({ctx, severity: e.v ?? e})
            }));
        }
    };


    /**
     * @type {UserDefinedItem}
     */
    const twoColumnsNestedMenu = {
        name: 'twoColumnsNestedMenu',
        condition: 'two-cols',
        title: 'Mida columnes',
        subMenuItems: () => {
            const elem = ctx.path?.elem;
            const widget = ctx.path?.widget;
            if (!elem || !widget) {
                return '';
            }
            /** @type {*} */
            const menuItems = [{
                type: 'menuitem',
                text: "A una columna",
                onAction: Action.changeColumnWidth.bind({ctx, colSpan: 0})
            }];

            const firstSpan =
            (elem.find("div:first-child").attr('class')?.split(' ') ?? [])
            .filter(c => c.startsWith('span')).map(c => c.replace('span', ''))[0];

            for (let i = 2; i < 12; i = i + 2) {
                const tpc = parseInt((100 * i / 12.0).toFixed(0));
                const label = tpc + "% | " + (100 - tpc) + "%";
                let isCurrent = firstSpan && convertInt(firstSpan, 0) == i;
                menuItems.push({
                    type: 'menuitem',
                    text: label,
                    icon: isCurrent ? 'checkmark' : undefined,
                    onAction: Action.changeColumnWidth.bind({ctx, colSpan: i})
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
        title: 'Convertir a exemple 2 files',
        onAction: Action.switchBoxRowsExampleAction.bind({ctx})
    };

    /**
     * @type {UserDefinedItem}
     */
    const switchBoxSimpleExample = {
        name: 'switchBoxSimpleExample',
        condition: 'capsa-exemple-rows',
        title: 'Convertir a exemple simple',
        onAction: Action.switchBoxSimpleExampleAction.bind({ctx})
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
            if (ctx.path && target?.[0]) {
                ctx.path.targetElement = target;
            }
            return target?.[0] !== undefined;
        },
        icon: 'list-num-default',
        title: 'Llista',
        subMenuItems: () => {
            // Determine if the class is there
            const isBeauty = ctx.path?.targetElement?.hasClass('iedib-falist');
            return [
                {
                    type: 'menuitem',
                    text: 'Embellit',
                    icon: isBeauty ? 'checkmark' : undefined,
                    onAction: () => {
                        // Toggle class
                        const $target = ctx.path?.targetElement;
                        if (!$target) {
                            return;
                        }
                        $target.toggleClass('iedib-falist');
                        // Make sure that start and style are in sync
                        const startAt = $target.attr("start") || "1";
                        if ($target.hasClass('iedib-falist')) {
                            const beginAt = parseInt(startAt);
                            $target.css("counter-reset", "iedibfalist-counter " + (beginAt - 1));
                        } else {
                            $target.css("counter-reset", "");
                        }
                    }
                },
                {
                    type: 'menuitem',
                    text: 'Comença a',
                    onAction: () => {
                        // Get the start property of the list
                        const startAt1 = ctx.path?.targetElement?.attr("start") ?? "1";
                        // Open input dialog, set the value and retrieve new value
                        openInputDialog('Comença la numeració a ...', '', startAt1,
                        (/** @type {*} */ api) => {
                            // TODO: Opened issue: Closing a tiny dialog -- afects the main bootstap dialog
                            api.close();
                            const $target = ctx.path?.targetElement;
                            if (!$target) {
                                return;
                            }
                            // Change the number at which start
                            const startAt2 = api.getData().value ?? "1";
                            const beginAt3 = convertInt(startAt2, 1);
                            $target.attr("start", beginAt3);
                            $target.css("counter-reset", "iedibfalist-counter " + (beginAt3 - 1));
                        });
                    },
                }
            ];
        }
    };

    /**
     * @type {UserDefinedItem}
     */
   const accordionIndependentBehaviorNestedMenu = {
        name: 'accordionIndependentBehavior',
        condition: 'desplegable2',
        title: 'Comportament',
        subMenuItems: () => {
            const $target = ctx.path?.elem;
            if (!$target) {
                return '';
            }
            // Is Accordion behavior?
            const isDependentBehavior =
            (
                ($target.find("div.accordion-body").attr("data-parent") ||
                 $target.find("div.accordion-body").attr("data-bs-parent")) ?? null) !== null;

            return [false, true].map(opt => ({
                type: 'menuitem',
                text: opt ? 'Independents' : 'Dependents',
                icon: isDependentBehavior === opt ? undefined : 'checkmark',
                onAction: Action.setAccordionBehavior.bind({ctx, isDependentBehavior: opt})
            }));
        }
    };


    /**
     * @type {UserDefinedItem}
     */
    const tablesMaxWidthMenu = {
        name: 'tablesMaxWidthMenu',
        condition: 'taula-predefinida,taula-bs',
        title: 'Amplada taula',
        onAction: () => {
            const $target = ctx.path?.elem;
            if (!$target) {
                return;
            }
            // Get the initial width
            const startAt1 = ($target.css("max-width") || "-1")
                .replace("px", "").replace("none", "-1");
            // Open input dialog, set the value and retrieve new value
            openInputDialog('Amplada màxima en (px)', '-1=sense limit', startAt1,
            (/** @type {*} */ api) => {
                const $target = ctx.path?.elem;
                if (!$target) {
                    return;
                }
                const maxwidth = convertInt(api.getData().value.replace("px", "").trim(), 0);
                if (maxwidth > 0) {
                    $target.css("max-width", maxwidth + "px");
                } else {
                    $target.css("max-width", "");
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
        title: 'Convertir a taula Bootstrap',
        onAction: Action.convert2BootstrapTable.bind({ctx}),
    };

    /**
     * @type {UserDefinedItem}
     */
    const convertToPredefinedTableMenu = {
        name: 'convertToPredefinedTableMenu',
        condition: 'taula-bs',
        title: 'Convertir a taula predefinida',
        onAction: Action.convert2PrefefinedTable.bind({ctx}),
    };

     /**
     * @type {UserDefinedItem}
     */
     const responsivenessNestedMenu = {
        name: 'responsivenessNestedMenu',
        condition: 'taula-bs',
        title: 'Responsivitat',
        subMenuItems: () => {
            const $target = ctx.path?.elem;
            if (!$target) {
                return '';
            }
            // Is responsiveness active
            const isResponsive = $target.parent().hasClass('table-responsive');

            return [{
                type: 'menuitem',
                text: isResponsive ? 'Treure' : 'Afegir',
                onAction: Action.toggleBootstapTableResponsiveness.bind({ctx})
            }];
        }
    };

    /**
     * @type {UserDefinedItem}
     */
    const tablesHeaderNestedMenu = {
            name: 'tablesHeaderNestedMenu',
            condition: 'taula-predefinida,taula-bs',
            title: 'Capçalera',
            subMenuItems: () => {
                const $target = ctx.path?.elem;
                if (!$target) {
                    return '';
                }
                const hasHeader = $target.find('thead').length > 0;

                return [{
                    type: 'menuitem',
                    text: hasHeader ? 'Treure' : 'Afegir',
                    onAction: Action.toggleTableHeader.bind({ctx})
                }];
            }
    };

    /**
     * @type {UserDefinedItem}
     */
    const tablesFooterNestedMenu = {
        name: 'tablesFooterNestedMenu',
        condition: 'taula-predefinida,taula-bs',
        title: 'Peu de taula',
        subMenuItems: () => {
            const $target = ctx.path?.elem;
            if (!$target) {
                return '';
            }
            const hasFooter = $target.find('tfoot').length > 0;

            return [{
                type: 'menuitem',
                text: hasFooter ? 'Treure' : 'Afegir',
                onAction: Action.toggleTableFooter.bind({ctx})
            }];
        }
    };

     /**
     * @type {UserDefinedItem}
     */
     const convertDropdownToList = {
        name: 'convertDropdownToList',
        condition: 'desplegable2',
        title: 'Convertir a llista',
        onAction: Action.convertDropdownToList.bind({ctx}),
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
            title: 'Tria un color',
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
                text: 'Cancel·la'
                },
                {
                type: 'submit',
                text: 'Aplica',
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
            const target = ctx.path?.selectedElement?.closest("table");
            return target?.[0] !== undefined;
        },
        title: 'Cel·la',
        subMenuItems: () => {
            const $cell = ctx.path?.selectedElement?.closest('td, th');
            if (!$cell) {
                return '';
            }
            const menus = [
                {
                    type: 'menuitem',
                    text: 'Triar fons',
                    onAction: () => {
                        colorPicker(ctx.editor,
                            (/** @type {string} */ color) => {
                                $cell.css('background-color', color);
                            }
                        );
                    }
                }
            ];

            if ($cell[0].style.backgroundColor) {
                menus.push({
                    type: 'menuitem',
                    text: 'Eliminar fons',
                    onAction: () => {
                        $cell.css('background-color', '');
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
            const target = ctx.path?.selectedElement?.closest("table");
            return target?.[0] !== undefined;
        },
        title: 'Fila',
        subMenuItems: () => {
            const $row = ctx.path?.selectedElement?.closest('tr');
            if (!$row) {
                return '';
            }
            const menus = [
                {
                    type: 'menuitem',
                    text: 'Triar fons',
                     onAction: () => {
                        colorPicker(ctx.editor,
                            (/** @type {string} */ color) => {
                                $row.css('background-color', color);
                            }
                        );
                    }
                }
            ];
            if ($row[0].style.backgroundColor) {
                menus.push({
                    type: 'menuitem',
                    text: 'Eliminar fons',
                    onAction: () => {
                        $row.css('background-color', '');
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