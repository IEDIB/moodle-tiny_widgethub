/**
 * @jest-environment jsdom
 */

import {
    removeEmptyParagraphs,
    padEmptyParagraphsWith,
    emulateAttoNewlineBehaviour,
} from '../../src/extension/newlinebehavior';

describe('removeEmptyParagraphs', () => {
    test('retorna string buit si content és undefined o buit', () => {
        expect(removeEmptyParagraphs(undefined)).toBe('');
        expect(removeEmptyParagraphs('')).toBe('');
    });

    test('elimina paràgrafs buits simples', () => {
        const html = '<p></p><p>text</p><p>   </p>';
        expect(removeEmptyParagraphs(html)).toBe('<p>text</p>');
    });

    test('elimina paràgrafs amb només comentaris', () => {
        const html = '<p><!-- c --></p><p>keep</p>';
        expect(removeEmptyParagraphs(html)).toBe('<p>keep</p>');
    });

    test('elimina paràgrafs amb només spans buits', () => {
        const html = '<p><span></span></p><p>ok</p>';
        expect(removeEmptyParagraphs(html)).toBe('<p>ok</p>');
    });

    test('NO elimina paràgrafs amb spans amb text', () => {
        const html = '<p><span>hi</span></p>';
        expect(removeEmptyParagraphs(html)).toBe('<p><span>hi</span></p>');
    });

    test('manté paràgrafs dins de pre/code/script', () => {
        const html = '<pre><p></p></pre><code><p></p></code><script><p></p></script>';
        expect(removeEmptyParagraphs(html)).toBe(html);
    });

    test('manté paràgrafs amb text amb espais al voltant', () => {
        const html = '<p>  hi  </p>';
        expect(removeEmptyParagraphs(html)).toBe('<p>  hi  </p>');
    });

    test('paràgrafs mixtos (comentari + text) no s’eliminen', () => {
        const html = '<p><!--c-->hi</p>';
        expect(removeEmptyParagraphs(html)).toBe('<p><!--c-->hi</p>');
    });

    test('fa servir fallback regex si DOMParser falla', () => {
        // Parser pot fallar si hi ha etiquetes mal tancades
        const bad = '<p></p><p>text';
        expect(removeEmptyParagraphs(bad)).toMatch(/text/);
    });
});

describe('padEmptyParagraphsWith', () => {
    test('retorna string buit si content és undefined o buit', () => {
        expect(padEmptyParagraphsWith(undefined)).toBe('');
        expect(padEmptyParagraphsWith('')).toBe('');
    });

    test('afegeix <br> per defecte a paràgrafs buits', () => {
        const html = '<p></p><p>hello</p>';
        expect(padEmptyParagraphsWith(html)).toBe('<p><br></p><p>hello</p>');
    });

    test('accepta padWith personalitzat', () => {
        const html = '<p></p>';
        expect(padEmptyParagraphsWith(html, 'x')).toBe('<p>x</p>');
    });

    test('manté comentaris dins el paràgraf buit', () => {
        const html = '<p><!--c--></p>';
        expect(padEmptyParagraphsWith(html)).toBe('<p><br><!--c--></p>');
    });

    test('NO considera buit si hi ha <br> existent', () => {
        const html = '<p><br></p>';
        expect(padEmptyParagraphsWith(html)).toBe('<p><br></p>');
    });

    test('manté paràgrafs dins de <pre> o <code> o <script>', () => {
        const html = '<pre><p></p></pre><code><p></p></code><script><p></p></script>';
        expect(padEmptyParagraphsWith(html)).toBe(html);
    });

    test('manté text amb espais', () => {
        const html = '<p>  hi  </p>';
        expect(padEmptyParagraphsWith(html)).toBe('<p>  hi  </p>');
    });

    test('fa servir fallback regex si DOMParser falla', () => {
        const bad = '<p></p><p>text';
        expect(padEmptyParagraphsWith(bad)).toMatch(/text/);
    });
});

describe('emulateAttoNewlineBehaviour', () => {
    /** @type {any} */
    let editor;
    /** @type {HTMLTextAreaElement} */
    let textarea;

    beforeEach(() => {
        // @ts-ignore
        textarea = document.createElement("TEXTAREA");
        document.body.innerHTML = '';
        document.body.append(textarea);
        editor = {
            setContent: jest.fn().mockImplementation((e, args) => textarea.value = e),
            getContent: jest.fn().mockImplementation((args) => textarea.value),
        };
    });

    test('parcheja només una vegada', () => {
        emulateAttoNewlineBehaviour(editor);
        const s1 = editor.setContent;
        const g1 = editor.getContent;
        emulateAttoNewlineBehaviour(editor);
        expect(editor.setContent).toBe(s1);
        expect(editor.getContent).toBe(g1);
    });

    test('setContent elimina paràgrafs buits si format html', () => {
        textarea.value = '';
        emulateAttoNewlineBehaviour(editor);
        editor.setContent('<p></p>', { format: 'html' });
        expect(editor._orgSetContent).toHaveBeenCalledWith('', { format: 'html' });
        expect(textarea.value).toBe('');
    });

    test('setContent NO elimina si format != html', () => {
        textarea.value = '<p>original content</p>';
        emulateAttoNewlineBehaviour(editor);
        editor.setContent('<p></p>', { format: 'raw' });
        expect(editor._orgSetContent).toHaveBeenCalledWith('<p></p>', { format: 'raw' });
        expect(textarea.value).toBe('<p></p>');
    });

    test('setContent funciona si args és undefined. Implicitly assumes html', () => {
        textarea.value = '<p>org</p>';
        emulateAttoNewlineBehaviour(editor);
        editor.setContent('<p></p>');
        expect(editor._orgSetContent).toHaveBeenCalledWith('', undefined);
        expect(textarea.value).toBe('');
    });

    test('getContent afegeix <br> a paràgrafs buits', () => {
        textarea.value = ' <p> </p>'
        emulateAttoNewlineBehaviour(editor);
        const result = editor.getContent();
        expect(editor._orgGetContent).toHaveReturnedWith(' <p> </p>');
        expect(result).toBe(' <p><br></p>');
    });

    test('getContent deixa contingut buit sense canvis', () => {
        textarea.value = ''
        emulateAttoNewlineBehaviour(editor);
        editor._orgGetContent = jest.fn().mockReturnValue('');
        const result = editor.getContent();
        expect(result).toBe('');
    });

    test('getContent deixa contingut no buit sense canvis', () => {
        textarea.value = '<p>hi</p>'
        emulateAttoNewlineBehaviour(editor);
        editor._orgGetContent = jest.fn().mockReturnValue('<p>hi</p>');
        const result = editor.getContent();
        expect(result).toBe('<p>hi</p>');
    });

    describe('emulateAttoNewlineBehaviour extended', () => {
    /** @type {any} */
    let editor;
    /** @type {HTMLTextAreaElement} */
    let textarea;

    beforeEach(() => {
        textarea = document.createElement("textarea");
        document.body.innerHTML = '';
        document.body.append(textarea);
        editor = {
            setContent: jest.fn().mockImplementation((e, args) => textarea.value = e),
            getContent: jest.fn().mockImplementation(() => textarea.value),
        };
    });

    test('getContent afegeix <br> a paràgrafs buits amb comentaris', () => {
        textarea.value = '<p><!-- comment --></p><p>keep</p>';
        expect(editor.getContent()).toBe('<p><!-- comment --></p><p>keep</p>');
        emulateAttoNewlineBehaviour(editor);

        const result = editor.getContent();
        expect(result).toBe('<p><br><!-- comment --></p><p>keep</p>');
    });

     test('getContent NO afegeix <br> a paràgrafs plens amb comentaris', () => {
        textarea.value = '<p><!-- comment --><span>q</span></p><p>keep</p>';
        emulateAttoNewlineBehaviour(editor);

        const result = editor.getContent();
        expect(result).toBe('<p><!-- comment --><span>q</span></p><p>keep</p>');
    });

    test('setContent afegeix <br> a paràgrafs buits amb spans buits', () => {
        textarea.value = '';
        emulateAttoNewlineBehaviour(editor);
        editor._orgGetContent = jest.fn().mockReturnValue(textarea.value);

        const result = editor.setContent('<p><span></span></p><p>text</p>');
        expect(textarea.value).toBe('<p>text</p>');
    });

    test('getContent no toca paràgrafs amb spans amb text', () => {
        textarea.value = '<p><span>hi</span></p><p>hello</p>';
        emulateAttoNewlineBehaviour(editor);
        editor._orgGetContent = jest.fn().mockReturnValue(textarea.value);

        const result = editor.getContent();
        expect(result).toBe('<p><span>hi</span></p><p>hello</p>');
    });

    test('getContent no modifica paràgrafs dins de pre/code/script', () => {
        textarea.value = '<pre><p></p></pre><code><p></p></code><script><p></p></script>';
        emulateAttoNewlineBehaviour(editor);
        editor._orgGetContent = jest.fn().mockReturnValue(textarea.value);

        const result = editor.getContent();
        expect(result).toBe(textarea.value);
    });

    test('getContent combina paràgrafs buits, comentaris i text', () => {
        textarea.value = '<p><!--c--></p><p>hello</p><p> </p>';
        emulateAttoNewlineBehaviour(editor);
        editor._orgGetContent = jest.fn().mockReturnValue(textarea.value);

        const result = editor.getContent();
        expect(result).toBe('<p><br><!--c--></p><p>hello</p><p><br></p>');
    });

    test('setContent i getContent funcionen conjuntament', () => {
        textarea.value = '<p></p><p>text</p>';
        emulateAttoNewlineBehaviour(editor);

        editor._orgSetContent = jest.fn((content) => {
            textarea.value = content;
            return content;
        });

        editor.setContent('<p></p><p>text</p><p><br></p>', { format: 'html' });
        expect(textarea.value).toBe('<p>text</p><p><br></p>'); // després de setContent
        let result = editor.getContent();
        expect(result).toBe('<p>text</p><p><br></p>'); // després de getContent
        textarea.value = '<p></p>' + textarea.value;
        result = editor.getContent();
        expect(result).toBe('<p><br></p><p>text</p><p><br></p>'); // després de getContent

    });
});

});