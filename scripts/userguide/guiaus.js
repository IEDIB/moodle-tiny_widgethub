const DEBUG = false;

const fs = require("fs");
const TEMPLATE_SECCIO_SNIPPET = fs.readFileSync("./templates/seccio-snippet.ejs", "utf-8");
const yaml = require('js-yaml');
const path = require("path");
const directory = "../../presets";
const Handlebars = require("handlebars");
const { Exception } = require("handlebars");
const escape = require("escape-html");
const beautify = require("js-beautify").html;
const ejs = require('ejs');

// TO DO: Implement template renderer


// Convert images to inline base64
function embedImages(str) {
    const img_regex = /<img\s+.*src="(.*)"\s+.*\/>/gm;
    str = str.replace(img_regex, function ($0, $1) {
       //load image
       const bitmap = fs.readFileSync("./html/"+$1)
       const base64 = new Buffer.from(bitmap).toString('base64');
       return $0.replace($1, 'data:image/png;base64, '+base64)
    });
    return str;
}

function capitalize(s) {
    const s2 = s.toLowerCase();
    return s2[0].toUpperCase() + s2.substring(1);
}

function searchSnippet(mapCategories, snippetKey) {
    let snippetFound = null;
    let i = 0;
    let len = Object.keys(mapCategories).length
    while (snippetFound == null && i < len) {
        const kname = Object.keys(mapCategories)[i];
        const lfound = mapCategories[kname].filter(e => e["key"] == snippetKey)
        if (lfound.length == 1) {
            snippetFound = lfound[0]
        } else if (lfound.length > 1) {
            throw new Exception("Two snippets with the same key!");
        }
        i++;
    }

    return snippetFound;
}

function readSnippets() {
    const categories = {}
    const dirStruct = fs.readdirSync(directory);
    let maxDate = new Date(2018, 8, 1);

    dirStruct.forEach((f) => {
        let parsed;
        // Amb la nova versió estam llegint JSON
        if (f.endsWith(".json")) {
            const json = fs.readFileSync(path.join(directory, f), "utf-8");
            try {
                parsed = JSON.parse(json);
                // Ara parsejam els defaults i els paràmetres com objectes
                parsed['defaults'] = JSON.parse(parsed['defaults'])
                parsed['misc'] = JSON.parse(parsed['misc'])

                // Do not show or include snippets which are hidden
                if(parsed['misc']['hidden']) {
                    console.log(">>> Skipping ", parsed['name'] + '. It\'s hidden!');
                    return;
                }
                // an alias
                parsed['category'] = parsed['misc']['category'] || "altres"
                // TODO:  Ho afegeixo a mà perquè no ho permet fer desde JSON
                /*
                if(parsed.key=='video-gdrive') {
                    parsed.defaults['_codi_iframe'] = {
                        value: '<iframe src="https://drive.google.com/file/d/1qlHPB60Kln1Wu_HyCDb3-sQOSsstjWCV/preview" width="640" height="480" allowfullscreen></iframe>',
                        default: '<iframe src="https://drive.google.com/file/d/1qlHPB60Kln1Wu_HyCDb3-sQOSsstjWCV/preview" width="640" height="480" allowfullscreen></iframe>',
                        opts: [],
                        type: 'textarea'
                    };
                }
                */ 
                // parsejam si és possible la data a partir de version sinó li posam la data de creació de l'IEDIB
                var version = parsed['version'];
                if(version) {
                    var vps = version.split(".")
                    if(vps.length == 3) {
                        try {
                            var any = parseInt(vps[0])
                            if(any >= 2018) {
                                var mes = parseInt(vps[1])-1
                                var dia = parseInt(vps[2])
                                parsed['date'] = new Date(any, mes, dia)
                                if(parsed['date'] > maxDate) {
                                    maxDate = parsed['date']
                                }
                            }
                        } catch(ex) {
                            parsed['date'] = new Date(2018, 8, 1)
                        }
                    } else {
                        parsed['date'] = new Date(2018, 8, 1)
                    }

                    if(version=='0.0.0'){
                        parsed['future'] = true;
                    }
                }
            } catch (Ex) {
                throw ("Invalid JSON for file " + f + ":: ", Ex)
            }
        } else {
            return
        }
        const name = parsed['name']
        if (!parsed['category']) {
            const parts = name.split("|")
            parsed['name'] = parts[0].trim()
            if (parts.length > 1) {
                parsed['category'] = parts[1].trim()
            } else {
                parsed['category'] = 'Altres'
            }
        }
        if (parsed['name'].indexOf("|")) {
            const parts = name.split("|")
            parsed['name'] = parts[0].trim()
        }
        let container = categories[parsed['category']]
        if (!container) {
            container = []
            categories[parsed['category']] = container
        }

        container.push(parsed)
 
       
    });

    // ordena dins cada contenidor 
    Object.keys(categories).forEach((catName) => {
        const container = categories[catName]
        categories[catName] = container.sort((a, b) => ('' + a['name']).localeCompare(b['name']))
        //elimina els snippets amb nom que contingui (old)
        categories[catName] = categories[catName].filter(e => e['name'].indexOf('(old)') < 0)
        categories[catName] = categories[catName].filter(e => e['name'].indexOf('-old') < 0)

        // afegeix un parent a cada objecte
        categories[catName].forEach(e => e.parent = categories[catName])
        categories[catName].parent = categories
    })

    // afegeix meta informació del fitxer snippet-meta.yml
    const snippetMeta = yaml.load(fs.readFileSync('./snippet-meta.yml', 'utf8')); 
    Object.keys(snippetMeta).forEach((snippetKey) => {
        const snippetFound = searchSnippet(categories, snippetKey);
        if (snippetFound) {
            snippetFound["pro"] = (snippetMeta[snippetKey]["pro"] || []).map(e => embedImages(e))
            snippetFound["con"] = (snippetMeta[snippetKey]["con"] || []).map(e => embedImages(e))
            snippetFound["hint"] = (snippetMeta[snippetKey]["hint"] || []).map(e => embedImages(e))
        } else {
            console.error("No existeix l'snippet amb key " + snippetKey)
        }
    })
    // marca amb l'etiqueta nou, els snippets amb versió (la darrera)
    if(maxDate.getDate() != new Date(2018,8,1).getDate()) {
        Object.keys(categories).forEach((catName) => {
            const container = categories[catName]
            container.forEach((snpt)=>{
                if(snpt['date'] && snpt['date'].getDate() == maxDate.getDate()) {
                    snpt['nou'] = true;
                    console.log("S'ha marcat com NOU: " + snpt.name);
                }
            });
            
        });
    }

    // ordena alfabèticament tot
    const sortedCategoriesNames = Object.keys(categories).sort()

    return sortedCategoriesNames.map((name) => {
        return { name: capitalize(name), snippets: categories[name] }
    })

}


function compilaSnippet(body, valors) {
    //valors['$lang'] = 'ca'
    valors['$id'] = "r" + Math.random().toString(32).substring(2)
    var ll = Object.keys(valors);
    for(var i=0, leni=ll.length; i<leni; i++) {
        var kk = ll[i];
        if (valors[kk] && (valors[kk]+'').trim()=='$RND') {
            valors[kk] = "c"+Math.random().toString(32).substring(2); 
        }  
    }
    // TODO hi ha un problema amb {{../foo}}
    body = body.replace(/\{\{..\//g, "{{")
    const template = Handlebars.compile(body)
    return template(valors)
}

function parseTip(text, snippet) {
    // search for #..snippet-key...# 
    // add link only for the same category
    if (!text.trim().endsWith(".")) {
        text = text.trim() + "."
    }
    const snippetHyperReg = /#((?:.|\n)+?)#/gi;
    text = text.replace(snippetHyperReg, function ($0, $1, $2, $3) {
        const lamevaCategoria = snippet.parent;
        const lsf = lamevaCategoria.filter(e => e["key"] == $1.trim())
        if (lsf.length == 1) {
            return '<a href="#section-' + $1 + '">' + lsf[0]["name"] + '</a>'
        } else {
            // TODO: Cerca en altres categories (només ens interessa el nom)
            return $1
        }
        return $1;
    });

    return text
}

function paramId(snippetKey, paramKey) {
    var key = snippetKey + '_' + paramKey.replace("$", "")
    return key.replace(/ /g, '')
}

function createSnippetControls(snippet) {
    let controls = ""
    if(snippet['misc']['parameters'].length == 0) {
        return null
    }
    snippet['misc']['parameters'].forEach((pk) => {
        // find the long name of the parameter 
        const pname = pk['name']
        let title = pk['title']
        if (title && title == "$id") {
            title = "Identificador auto generat"
        } else if (!title && title == "$lang") {
            title = "Idioma"
        }
        let controlid = paramId(snippet['key'], pname)
        let valor = snippet['defaults'][pname]
        let input = ""
        let tipus = pk['type'];

        let ttip = (pk['tip']||'') + (pk['tooltip']||'');
        if(ttip) {
            ttip = '<a href="javascript:void(0)" data-toggle="popover" data-trigger="hover" data-content="'+ttip+'"><i class="fas fa-question-circle text-info"></i></a>';
        }

      

       
        if (tipus == 'textarea') {
            input = `<textarea class="form-control" id="${controlid}" title="${pname}">${valor}</textarea>`
        } else if (tipus == 'select') {
            let items = "" 
            pk['options'].forEach((opt, indx) => {
                if(typeof(opt)=='string') {
                    items += `<option value="${opt}" ${indx == 0 ? 'selected' : ''}>${opt}</option>`
                } else {
                    items += `<option value="${opt.v}" ${indx == 0 ? 'selected' : ''}>${opt.l}</option>`
                }
            })
            input = `<select class="form-control" id="${controlid}">${items}</select>`
        } else if (tipus == 'checkbox') {
            let checked = ""
            if(valor === true || valor === '1' || valor === 1) {
                checked = "checked";
            } 
            input = `<input type="checkbox" class="form-check-input" value="${valor}" ${checked} id="${controlid}" title="${pname}">`
        } else if (tipus == 'numeric') {
            let minmax = ""
            if(pk['min']) {
                minmax = 'min='+pk['min']
            }
            if(pk['max']) {
                minmax += ' max='+pk['max']
            }
            input = `<input type="numeric" class="form-control" id="${controlid}" aria-describedby="${pk}" value="${valor}" ${minmax} title="${pname}">`
        } else {
            input = `<input type="text" class="form-control" id="${controlid}" aria-describedby="${pk}" value="${valor}" title="${pname}">`
        }
        if (tipus == 'checkbox') {
            controls += `<div class="form-check" style="margin-bottom:10px;">
            ${input}
            <label class="form-check-label" for="${controlid}">
                ${title}  ${ttip}
            </label>
          </div>`
        } else {
            controls += `
            <div class="form-group">
            <label for="${controlid}">${title} ${ttip}</label>
            ${input}
            </div>`
        }
    })
    return controls;
}

function processScopes(txt) {
    const scopes = (txt || "*").split(',');
    const scope = scopes.map(e => {
        if (e == '*') {
            return 'Tots'
        } else if (e == 'L') {
            return 'Llibre Moodle'
        } else if (e == 'P') {
            return 'Recurs pàgina'
        } else if (e == 'Q') {
            return 'Qüestionari'
        } else if (e == 'T') {
            return 'Tasca'
        } else if (e == 'G') {
            return 'Grid'
        } else if (e == 'F') {
            return 'Fòrums'
        }
    }).join(", ");
    return scope;
}

function creaSeccioSnippet(snippet, allowfullscreen, mapaSrc) {
    const nom = snippet['name']
    const scope = processScopes(snippet['scope'])

    let recomanacio = snippet['stars']
    if (recomanacio == null) {
        recomanacio = "2"
    }
    recomanacio = parseInt(recomanacio)
    if (recomanacio > 3) {
        recomanacio = 3
    } else if (recomanacio < 0) {
        recomanacio = 0
    }

    if(snippet.pro) {
        snippet.pro = snippet.pro.map(e => parseTip(e, snippet) );
    }
    if(snippet.con) {
        snippet.con = snippet.con.map(e => parseTip(e, snippet) );
    }
      
    const params = snippet['defaults']; 
    console.log(snippet)
    I18n.resources = snippet['misc']['I18n'] || {};
    I18n.locale = params.$lang || 'ca';
    let codiSnippetCompilat = compilaSnippet(snippet['body'], params);
    codiSnippetCompilat = beautify(codiSnippetCompilat, { indent_size: 2, space_in_empty_paren: true });
    mapaSrc[snippet['key']] = codiSnippetCompilat;
    let tabid = snippet['key'];
    let accordionid = "acc-" + Math.random().toString(32).substring(2)
    let snippetControls = createSnippetControls(snippet); 
    if(snippetControls==null) {
        snippetControls = "<p><em>No admet paràmetres de configuració.</em></p>" 
    } else {
        snippetControls = ` ${snippetControls}
         <button class="btn btn-primary" data-key="${snippet['key']}"><i class="fas fa-sync-alt" title="Actualita els canvis"></i> Genera</button>`
    }
  
    const seccio = ejs.render(TEMPLATE_SECCIO_SNIPPET, {
        snippet: snippet,
        snippetControls: snippetControls,
        nom: nom,
        ambit: scope,
        recomanacio: recomanacio,
        DEBUG: DEBUG,
        tabid: tabid,
        accordionid: accordionid,
        codiSnippetCompilat: codiSnippetCompilat,
        codiSnippetCompilatEscaped: escape(codiSnippetCompilat),
        allowfullscreen: allowfullscreen
    });

    return seccio
}
 

function creaPaginaCategoria(categoria, index) {
    const nom = categoria['name']
    const listSnippets = categoria['snippets']
    let jssection = ""  
    let mapOfSrc = {}
 
    // Serialitza la llista d'snippets com un objecte per inserir en la pàgina
    const mapSnippets = {};
    const seccionsSnippets = []
    listSnippets.forEach((snippet) => {
        seccionsSnippets.push(creaSeccioSnippet(snippet, false, mapOfSrc))
        // TODO: Check for filters! Dona problemes amb scripts???
        snippet['html'] = mapOfSrc[snippet['key']].replace("<script>", "").replace("</script>","")
        if(snippet.category.toLowerCase()=='filtres') {
            snippet['body'] =  snippet['body'].replace("<script>", "").replace("</script>","")
        }
        mapSnippets[snippet.key] = snippet;
    })

    // inclou l'api dels snippets (inline)
    const snippetApi = fs.readFileSync("./snippet-api.js", "utf-8")
    const mapSnippetsText = JSON.stringify(mapSnippets, (key, value) => {
        if (key == "parent") {
            return "";
        }
        return value;
     });

    jssection = `
        var mapSnippets = ${mapSnippetsText};
        ${snippetApi} 
    `;
    
    const ara = new Date();
    let mm = ara.getMonth()+1;
    if(mm < 10) {
        mm = "0" + mm;
    }
    const revisio = ara.getDate()+"." + mm +"."+ara.getFullYear();
   
    
    const pagina = ejs.render(fs.readFileSync("./templates/pagina-categoria.ejs", "utf-8"), {
        listSnippets: listSnippets,
        DEBUG: DEBUG,
        titolPagina: nom,
        seccionsSnippets: seccionsSnippets,
        jssection: jssection,
        revisio: revisio
    });

    return pagina
}



function creaPaginaPlantilles(lPlantilles) { 
    let jssection = ""  
    let mapOfSrc = {}
 
    // Serialitza la llista d'snippets com un objecte per inserir en la pàgina
    const mapSnippets = {};
    const seccionsSnippets = []
    lPlantilles.forEach((snippet) => {
        seccionsSnippets.push(creaSeccioSnippet(snippet, true, mapOfSrc))
        snippet['html'] = mapOfSrc[snippet['key']] 
        mapSnippets[snippet.key] = snippet;
    })

    // inclou l'api dels snippets (inline)
    const snippetApi = fs.readFileSync("./snippet-api.js", "utf-8")
    const mapSnippetsText = JSON.stringify(mapSnippets, (key, value) => {
        if (key == "parent") {
            return "";
        }
        return value;
     });

    jssection = `
        var mapSnippets = ${mapSnippetsText};
        ${snippetApi} 
    `;

    const ara = new Date();
    let mm = ara.getMonth()+1;
    if(mm < 10) {
        mm += "0" + mm;
    }
    const revisio = ara.getDate() + "." + mm + "." + ara.getFullYear();
    
    const pagina = ejs.render(fs.readFileSync("./templates/pagina-categoria.ejs", "utf-8"), {
        listSnippets: lPlantilles,
        DEBUG: DEBUG,
        titolPagina: "Plantilles predefinides",
        seccionsSnippets: seccionsSnippets,
        jssection: jssection,
        revisio: revisio
    });

    return pagina
}


const listCategories = readSnippets()



// Crea la pàgina índex de categories 
// Carrega meta informació per a les categories
const categoryMeta = yaml.load(fs.readFileSync("./category-meta.yml", "utf-8")) 

listCategories.forEach((e) => {
    e.listHints = (categoryMeta[e['name'].toLowerCase()] || {}).hint;
    e.randid = "cat-" + Math.random().toString(32).substring(2);
    e.handsup = e.snippets.filter(s => s.stars == 3).length
    e.handsdown = e.snippets.filter(s => s.stars == 0).length
    e.nous = e.snippets.filter(s => s.nou == true).length 
});

const paginaIndex = ejs.render(fs.readFileSync("./templates/pagina-resum.ejs", "utf-8"), 
    {
        listCategories: listCategories,
        titolPagina: "Categories",
        DEBUG: DEBUG
    }
); 
filename = "./html/3 Categories.html"
fs.writeFileSync(filename, paginaIndex, "utf-8")


// Crea les pàgines de cada categoria
let subind = 1
listCategories.forEach((categoria, index) => {
    const pagina = creaPaginaCategoria(categoria, index)
    //Escriu les pàgines a disc
    filename = "./html/3-" + subind + " " + categoria['name'] + "_sub.html"
    fs.writeFileSync(filename, pagina, "utf-8")
    subind++;
})

// Ara llegeix i crea les pàgines de les plantilles predefinides
const plantilles = yaml.load(fs.readFileSync("./plantilles-predefinides.yml", "utf-8"))
plantilles.forEach(p=>{
    p.scope = processScopes(p.scope)
})
const pagina = creaPaginaPlantilles(plantilles)
filename = "./html/4 Plantilles predefinides.html"
fs.writeFileSync(filename, pagina, "utf-8")

