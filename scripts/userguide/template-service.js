/* eslint-env node */
/* eslint-disable no-console */
/* eslint-disable no-new-func */
/**
 * Tiny WidgetHub plugin.
 *
 * @module      tiny_widgethub/plugin
 * @copyright   2024 Josep Mulet Pol <pep.mulet@gmail.com>
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

const mustache = require('mustache');
const ejs = require('ejs');

/**
 * @param {Object.<string, any>} ctx
 * @param {string} expr
 * @param {boolean=} keepFns - Keep or not the funcions in the ctx
 * @returns {any} The evaluated expression within the context ctx
 */
function evalInContext(ctx, expr, keepFns) {
    const listArgs = [];
    const listVals = [];

    if (ctx) {
        Object.keys(ctx).forEach((key) => {
            // Remove functions from ctx
            if (keepFns || typeof ctx[key] !== "function") {
                listArgs.push(key);
                listVals.push(ctx[key]);
            }
        });
    }
    listArgs.push('expr');
    listArgs.push('return eval(expr)');
    listVals.push(expr);
    const evaluator = new Function(...listArgs);
    return evaluator(...listVals);
}


/**
 * @param {string} text
 * @param {Object.<string, any>} ctx2
 * @returns {string}
 */
const defineVar = function (text, ctx2) {
    const pos = text.indexOf("=");
    const varname = text.substring(0, pos).trim();
    const varvalue = evalInContext(ctx2, text.substring(pos + 1).trim());
    ctx2[varname] = varvalue;
    return varname;
};

/**
 * @returns {string} a randomID
 */
function genID() {
    return 'g' + Math.random().toString(32).substring(2);
}

class TemplateSrv {
    /**
     * @param {*} mustache
     * @param {*} ejs
     */
    constructor(mustache, ejs) {
        this.mustache = mustache;
        this.ejs = ejs;
    }
    /**
     * @param {string} template
     * @param {Object.<string, any>} context
     * @param {Object.<string, Object.<string, string>>=} translations
     * @returns {string} The interpolated template given a context and translations map
     */
    renderMustache(template, context, translations) {
        const ctx = {...context};
        Object.keys(ctx).forEach(key => {
            if (ctx[key] === "$RND") {
                ctx[key] = genID();
            }
        });
        this.applyMustacheHelpers(ctx, translations ?? {});
        // @ts-ignore
        return this.mustache.render(template, ctx);
    }

    /**
     * @param {string} template
     * @param {Object.<string, any>} context
     * @param {Object.<string, Object.<string, any>>} translations
     * @returns {Promise<string>} The interpolated template given a context and translations map
     */
    async renderEJS(template, context, translations) {
        /** @type {Object.<string, any>} */
        const ctx = {...context, I18n: {}};
        Object.keys(ctx).forEach(key => {
            if (ctx[key] === "$RND") {
                ctx[key] = genID();
            }
        });
        const lang = ctx._lang;
        for (let wordKey in translations) {
            const dict = translations[wordKey];
            ctx.I18n[wordKey] = dict[lang] || dict.en || dict.es || wordKey;
        }
        try {
            return this.ejs.render(template, ctx);
        } catch (ex) {
            console.error(ex);
            return "";
        }
    }

    /**
     * @param {string} template
     * @param {Object.<string, any>} context
     * @param {Object.<string, Object.<string, any>>} translations
     * @param {string=} engine - (ejs | mustache) optional
     * @returns {Promise<string>} - The interpolated template given a context and translations map
     */
    render(template, context, translations, engine) {
        if (!engine) {
            engine = template.includes("<%") ? "ejs" : "mustache";
        }
        if (engine === "ejs") {
            return this.renderEJS(template, context, translations);
        }
        // Default to Mustache
        const tmpl = this.renderMustache(template, context, translations);
        return Promise.resolve(tmpl);
    }

    /**
     * Extends Mustache templates with some helpers
     * @param {Object.<string, any>} ctx
     * @param {Record<string, Record<string, string>>} translations
     */
    applyMustacheHelpers(ctx, translations) {
        const self = this;
        ctx.if = () =>
            /**
             * @param {string} text
             * @param {Mustache.render} render
             */
            function (text, render) {
                const pos = text.indexOf("]");
                const condition = text.substring(0, pos).trim().substring(1);
                const show = evalInContext(ctx, condition);
                if (show) {
                    // @ts-ignore
                    return render(text.substring(pos + 1).trim());
                }
                return "";
            };
        ctx.var = () =>
            /**
             * @param {string} text
             */
            function (text) {
                defineVar(text, ctx);
            };
        ctx.eval = () =>
            /**
             * @param {string} text
             */
            function (text) {
                return evalInContext(ctx, text) + "";
            };
        ctx.I18n = () =>
            /**
             * @param {string} text
             * @param {Mustache.render} render
             */
            function (text, render) {
                // @ts-ignore
                const key = render(text).trim();
                const dict = translations[key] || {};
                return dict[ctx._lang] || dict.en || dict.ca || key;
            };
        ctx.each = () =>
            /**
             * @param {string} text
             */
            function (text) {
                const pos = text.indexOf("]");
                const cond = text.substring(0, pos).trim().substring(1);
                const components = cond.split(",");
                const dim = components.length;
                const maxValues = new Array(dim);
                const loopVars = new Array(dim);
                let total = 1;
                const cc = 'i'.charCodeAt(0);
                components.forEach((def, i) => {
                    const parts = def.split("=");
                    if (parts.length === 1) {
                        parts.unshift(String.fromCharCode(cc + i));
                    }
                    const cname = parts[0].trim();
                    loopVars[i] = cname;
                    const dm = evalInContext(ctx, parts[1]);
                    total = total * dm;
                    maxValues[i] = dm;
                    ctx[cname] = 1;
                });
                let output = [];
                for (let _ei = 0; _ei < total; _ei++) {
                    // @ts-ignore
                    output.push(self.mustache.render(text.substring(pos + 1), ctx));
                    let currentDim = dim - 1;
                    let incrUp;
                    do {
                        const oldValue = ctx[loopVars[currentDim]] - 1;
                        const newValue = (oldValue + 1) % maxValues[currentDim] + 1;
                        ctx[loopVars[currentDim]] = newValue;
                        incrUp = newValue < oldValue;
                        currentDim--;
                    } while (currentDim >= 0 && incrUp);
                }
                return output.join('');
            };
        ctx.for = () =>
            /**
             * @param {string} text
             */
            function (text) {
                const pos = text.indexOf("]");
                const condition = text.substring(0, pos).trim().substring(1);
                const parts = condition.split(";");
                const loopvar = defineVar(parts[0], ctx);
                let output = "";
                let maxIter = 0; // Prevent infinite loop imposing a limit of 1000
                while (evalInContext(ctx, parts[1]) && maxIter < 1000) {
                    // @ts-ignore
                    output += self.mustache.render(text.substring(pos + 1), ctx);
                    if (parts.length === 3 && parts[2].trim()) {
                        defineVar(loopvar + "=" + parts[2], ctx);
                    } else {
                        ctx[loopvar] = ctx[loopvar] + 1;
                    }
                    maxIter++;
                }
                return output;
            };
    }
}


/** @type {TemplateSrv | undefined} */
let instanceSrv;
/**
 * @returns {TemplateSrv}
 */
function getTemplateSrv() {
    if (!instanceSrv) {
        instanceSrv = new TemplateSrv(mustache, ejs);
    }
    return instanceSrv;
}

module.exports = {
    getTemplateSrv
};