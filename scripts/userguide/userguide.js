// @ts-nocheck
/* eslint-disable no-console */

/* eslint-env node */
const DEBUG = true;
// Directory that contains the .json files
const directory = "../../presets";

const fs = require("fs");
const yaml = require("js-yaml");
const path = require("path");
const escapeHTML = require("escape-html");
const beautify = require("js-beautify").html;
const ejs = require("ejs");
const {applyPartials} = require("../util");

const TEMPLATE_SECCIO_SNIPPET = fs.readFileSync("./templates/seccio-widget.ejs", "utf-8");
// Implementation of the template renderer
const templateService = require("./template-service").getTemplateSrv();

// Convert images to inline base64
/**
 * @param {string} str
 */
function embedImages(str) {
    const imgRegex = /<img\s+.*src="(.*)"\s+.*\/>/gm;
    str = str.replace(imgRegex, function($0, $1) {
       // Load image
       const bitmap = fs.readFileSync("./html/" + $1);
       const base64 = Buffer.from(bitmap).toString('base64');
       return $0.replace($1, 'data:image/png;base64, ' + base64);
    });
    return str;
}

/**
 * @param {string} s
 */
function capitalize(s) {
    const s2 = s.toLowerCase();
    return s2[0].toUpperCase() + s2.substring(1);
}

/**
 * @param {{ [x: string]: any[]; }} mapCategories
 * @param {string} widgetKey
 */
function searchSnippet(mapCategories, widgetKey) {
    let widgetFound = null;
    let i = 0;
    let len = Object.keys(mapCategories).length;
    while (widgetFound === null && i < len) {
        const kname = Object.keys(mapCategories)[i];
        const lfound = mapCategories[kname].filter(e => e.key == widgetKey);
        if (lfound.length == 1) {
            widgetFound = lfound[0];
        } else if (lfound.length > 1) {
            throw new Error("Two widgets with the same key!");
        }
        i++;
    }

    return widgetFound;
}


function parseTip(e) {
    return e;
}

/**
 * @param {string} e
 * @returns {string}
 */
function parseScope(e) {
    if (!e) {
        return "Tots";
    }
    const ambits = [];
    if (e === "^page-mod-book-edit$") {
        ambits.push("Llibres");
    } else if (e === "^page-question-type-") {
        ambits.push("Qüestionaris");
    } else if (e === "^page-mod-(page|assign)-mod$") {
        ambits.push("Pàgines");
        ambits.push("Tasques");
    }
    return ambits.join(", ") || "Tots";
}


/**
 * @returns {any}
 */
function loadWidgets() {
    /** @type {Record<string, *[]>} */
    const categories = {};

    // Look for a partials file
    const partials = yaml.load(fs.readFileSync(path.join(directory, 'partials.json')));

    const dirStruct = fs.readdirSync(directory);

    dirStruct.forEach((f) => {
        if (f === 'partials.json') {
            return;
        }
        let parsed;
        // Amb la nova versió estam llegint JSON
        if (f.endsWith(".json")) {
            const json = fs.readFileSync(path.join(directory, f), "utf-8");
            try {
                parsed = JSON.parse(json);
                // Get rid of filters
                if (!parsed.template) {
                    return;
                }

                // Do not show or include widgets which are hidden
                if (parsed.hidden) {
                    console.log(">>> Skipping ", parsed.name + '. It\'s hidden!');
                    return;
                }

                // Expand partials
                applyPartials(parsed, partials);

                // Remove self-references in instructions
                if (parsed.instructions) {
                    parsed.instructions = parsed.instructions.replace(/<a class="d-block m-1"(.*)<\/a>/g, () => "");
                }
                parsed.scope = parseScope(parsed.scope);

                // An alias
                parsed.category = parsed.category ?? "altres";
                if (parsed.category.toLowerCase() === 'misc') {
                    parsed.category = "altres";
                }
            } catch (Ex) {
                throw new Error("Invalid JSON for file " + f + ":: " + Ex);
            }
        } else {
            return;
        }

        let container = categories[parsed.category];
        if (!container) {
            container = [];
            categories[parsed.category] = container;
        }
        container.push(parsed);
    });

    // Ordena dins cada contenidor
    Object.keys(categories).forEach((catName) => {
        const container = categories[catName];
        categories[catName] = container.sort((a, b) => ('' + a.name).localeCompare(b.name));
        // Elimina els widgets amb nom que contingui (old)
        categories[catName] = categories[catName].filter(e => e.name.indexOf('(old)') < 0 && e.name.indexOf('-old') < 0);

        // Afegeix un parent a cada objecte
        categories[catName].forEach(e => (e.parent = categories[catName]));
    });

    // Afegeix meta informació del fitxer widget-meta.yml
    /** @type {*} */
    const widgetMeta = yaml.load(fs.readFileSync('./widget-meta.yml', 'utf8'));
    Object.keys(widgetMeta).forEach((widgetKey) => {
        const widgetFound = searchSnippet(categories, widgetKey);
        if (widgetFound) {
            widgetFound.pro = (widgetMeta[widgetKey].pro || []).map(e => embedImages(e));
            widgetFound.con = (widgetMeta[widgetKey].con || []).map(e => embedImages(e));
            widgetFound.hint = (widgetMeta[widgetKey].hint || []).map(e => embedImages(e));
        } else {
            console.warn("No existeix el widget amb key " + widgetKey);
        }
    });

    // Ordena alfabèticament tot
    const sortedCategoriesNames = Object.keys(categories).sort();

    return sortedCategoriesNames.map((name) => {
        return {name: capitalize(name), widgets: categories[name]};
    });

}


/**
 * @param {string} body
 * @param {{ [x: string]: string; $id?: any; }} valors
 * @param {Record<string, any>} I18n
 * @returns {Promise<string>}
 */
async function compilaSnippet(body, valors, I18n) {
    // Valors['$lang'] = 'ca'
    valors.$id = "r" + Math.random().toString(32).substring(2);
    var ll = Object.keys(valors);
    for (var i = 0, leni = ll.length; i < leni; i++) {
        var kk = ll[i];
        if (valors[kk] && (valors[kk] + '').trim() == '$RND') {
            valors[kk] = "c" + Math.random().toString(32).substring(2);
        }
    }
    body = body.replace(/\{\{..\//g, "{{");
    return await templateService.render(body, valors, I18n);
}


function creaSeccioSnippet(widget, allowfullscreen, mapaSrc) {
    const nom = widget.name;
    const scope = processScopes(widget.scope);

    let recomanacio = widget.stars;
    if (recomanacio === null || recomanacio === undefined) {
        recomanacio = "2";
    }
    recomanacio = parseInt(recomanacio);
    if (recomanacio > 3) {
        recomanacio = 3;
    } else if (recomanacio < 0) {
        recomanacio = 0;
    }

    if (widget.pro) {
        widget.pro = widget.pro.map(e => parseTip(e, widget));
    }
    if (widget.con) {
        widget.con = widget.con.map(e => parseTip(e, widget));
    }

    // eslint-disable-next-line camelcase
    const codiSnippetCompilat = beautify(widget.renderedTemplate, {indent_size: 2, space_in_empty_paren: true});
    mapaSrc[widget.key] = codiSnippetCompilat;
    let tabid = widget.key;
    let accordionid = "acc-" + Math.random().toString(32).substring(2);

    const seccio = ejs.render(TEMPLATE_SECCIO_SNIPPET, {
        widget: widget,
        widgetControls: '',
        nom: nom,
        ambit: scope,
        recomanacio: recomanacio,
        DEBUG: DEBUG,
        tabid: tabid,
        accordionid: accordionid,
        codiSnippetCompilat: codiSnippetCompilat,
        codiSnippetCompilatEscaped: escapeHTML(codiSnippetCompilat),
        allowfullscreen: allowfullscreen
    });

    return seccio;
}


/**
 * @param {{ name: any; widgets?: any; }} categoria
 */
async function creaPaginaCategoria(categoria) {
    const nom = categoria.name;
    const listSnippets = categoria.widgets;
    let jssection = "";
    let mapOfSrc = {};

    // Serialitza la llista d'widgets com un objecte per inserir en la pàgina
    /** @type {Record<string, *>} */
    const mapSnippets = {};
    /**
     * @type {any[]}
     */
    const allPromises = listSnippets.map((/** @type {any}**/ widget) => creaSeccioSnippet(widget, false, mapOfSrc));
    const seccionsSnippets = await Promise.all(allPromises);
 
    listSnippets.forEach((/** @type {any}**/ widget) => {
        mapSnippets[widget.key] = {html: widget.renderedTemplate};
    });

    jssection = "var mapSnippets  = " + JSON.stringify(mapSnippets) + ";";

    const ara = new Date();
    let mm = ara.getMonth() + 1;
    let dd = ara.getDate();
    if (dd < 10) {
        // @ts-ignore
        dd = "0" + dd;
    }
    if (mm < 10) {
        // @ts-ignore
        mm = "0" + mm;
    }
    const revisio = dd + "/" + mm + "/" + ara.getFullYear();


    const pagina = ejs.render(fs.readFileSync("./templates/pagina-categoria.ejs", "utf-8"), {
        listSnippets: listSnippets,
        DEBUG: DEBUG,
        titolPagina: nom,
        seccionsSnippets: seccionsSnippets,
        jssection: jssection,
        revisio: revisio
    });

    return pagina;
}

/**
 * @param {string} scope
 */
function processScopes(scope) {
    return scope ?? 'Tots';
}

async function main() {
    const listCategories = loadWidgets();

    // Compila tots els widgets
    const allPromises = [];
    listCategories.forEach((/** @type {any} **/ cat) => {
        cat.widgets.forEach((/** @type {any} **/ widget) => {
            /** @type {Record<string, *>} */
            const params = {};
            (widget.parameters || []).forEach((/** @type {any} **/ p) => (params[p.name] = p.value));
            allPromises.push(compilaSnippet(widget.template, params, widget.I18n));
        });
    });
    const allPromisesResolved = await Promise.all(allPromises);
    let i = 0;
    listCategories.forEach((/** @type {any} **/ cat) => {
        cat.widgets.forEach((/** @type {any} **/ widget) => {
            widget.renderedTemplate = allPromisesResolved[i];
            i++;
        });
    });

    // Crea la pàgina índex de categories
    // Carrega meta informació per a les categories
    /** @type {any} */
    const categoryMeta = yaml.load(fs.readFileSync("./category-meta.yml", "utf-8"));

    listCategories.forEach((/** @type {any} **/ e) => {
        e.listHints = (categoryMeta[e.name.toLowerCase()] || {}).hint;
        e.randid = "cat-" + Math.random().toString(32).substring(2);
        e.handsup = e.widgets.filter((/** @type {any}**/ s) => s.stars == 3).length;
        e.handsdown = e.widgets.filter((/** @type {any}**/ s) => s.stars == 0).length;
        e.nous = e.widgets.filter((/** @type {any}**/ s)=> s.nou == true).length;
    });

    const paginaIndex = ejs.render(fs.readFileSync("./templates/pagina-resum.ejs", "utf-8"),
        {
            listCategories: listCategories,
            titolPagina: "Categories",
            DEBUG: DEBUG
        }
    );
    let filename = "./html/3 Categories.html";
    fs.writeFileSync(filename, paginaIndex, "utf-8");


    // Crea les pàgines de cada categoria
    let subind = 1;
    listCategories.forEach(async(/** @type {{ name: string; }} */ categoria) => {
        const pagina = await creaPaginaCategoria(categoria);
        // Escriu les pàgines a disc
        filename = "./html/3-" + subind + " " + categoria.name + "_sub.html";
        fs.writeFileSync(filename, pagina, "utf-8");
        subind++;
    });

    // Ara llegeix i crea les pàgines de les plantilles predefinides
    /** @type {any} */
    const plantilles = yaml.load(fs.readFileSync("./plantilles-predefinides.yml", "utf-8"));
    plantilles.forEach((/** @type {{ scope: any; }} */ p) =>{
        p.scope = processScopes(p.scope);
    });
    /*
    const pagina = creaPaginaPlantilles(plantilles);
    filename = "./html/4 Plantilles predefinides.html";
    fs.writeFileSync(filename, pagina, "utf-8");
    */
}

main();


