import {LocaleMessageObject} from "vue-i18n";
import VueI18n from "vue-i18n";
import {getHttpClient} from "./http-client";
export {setHttpClient, setAxiosClient} from "./http-client";
let cacheBreaker = "";
let bulk: ReportItem[] = [];
let _timeout: any;
let lang: string = null;

let bablic = (window as any).bablic;


interface ReportItem {
    key: string;
    ns: string;
    content?: string;
    vars?: any;
}

/**
 * Global variables
 */
let g_siteId: string = null;
let g_ns: string = null;
let g_isDebug = false;
let g_withNs = false;
let g_isInEditor = false;
let g_onEditorLoad: Array<Function> = null;

/**
 * Init Bablic I18n with site id
 * @param siteId
 * @param isEditor - true if this is the editor
 */
export function init(siteId: string, isEditor = false): void {
    g_siteId = siteId;
    // if loading editor for the first time
    if (isEditor && !g_isInEditor) {
        // load the editor code
        g_onEditorLoad = [];
        const s = document.createElement("script");
        s.src = "//cdn2.bablic.com/js/vue-i18n-editor.js";
        s.onload = () => {
            bablic = (window as any).bablic;
            (window as any).initBablicI18nEditor(siteId, 4.0);
            g_onEditorLoad.forEach((f) => f());
            g_onEditorLoad = null;
        }
        document.head.appendChild(s);
        g_isInEditor = isEditor;
    }
}

async function loadTranslations(language: string, namespace: string = null,
                                       enMessages: LocaleMessageObject = {}): Promise<LocaleMessageObject> {
    if (!g_siteId)
        throw new Error("siteId is required");
    if (g_isInEditor) {
        // if in editor, just wrap the messages with the bablic preprocessor, and leave empty so missing handler
        // can be called
        const newMessages = {};
        for (const key of Object.getOwnPropertyNames(enMessages)) {
            newMessages[key] = bablic.preprocessI18nItem(namespace, key, enMessages[key]);
        }
        return newMessages;
    }
    // if already loaded, and has missing unreported, flush them now
    if (lang && lang !== language)
        flush().catch(console.error);
    // fetch translations
    lang = language;
    const url = `https://c.bablic.com${g_isDebug ? "/test" : ""}/sites/${g_siteId}/${g_withNs && namespace ? namespace + "." : "ngx."}${language}.json${cacheBreaker ? "?r=" + cacheBreaker : ""}`;
    const bablicJson = (await getHttpClient().get(url)) as LocaleMessageObject;
    const empties = bablicJson["__"] as string[];
    if (empties) {
        empties.forEach((emp) => {
            bablicJson[emp] = emp;
        });
        delete bablicJson["__"];
    }
    for (const key of Object.getOwnPropertyNames(enMessages)) {
        if (!bablicJson[key])
            bablicJson[key] = enMessages[key];
    }
    return bablicJson;
}

/**
 * Missing handler
 * @param locale
 * @param key
 * @param vm
 * @param vars
 */
export function missing(locale: string, key: string, vm: any, vars: any): string {
    if (g_isInEditor) {
        // if in editor, just preprocess and let editor do the work
        return bablic.preprocessI18nItem(null, key, key);
    }
    // if not in editor, add the missing item to the bulk
    const item: ReportItem = {key, ns: null, vars};
    bulk.push(item);
    // set the flush timeout
    clearTimeout(_timeout);
    _timeout = setTimeout(() => flush(), 1000);
    return key;
}

/**
 * Flushes the bulk of missing items
 */
async function flush(): Promise<void> {
    const tempBulk = bulk;
    bulk = [];
    const domain = g_isDebug ? "https://staging.bablic.com" : "https://e2.bablic.com";
    const url = `${domain}/api/engine/ngx-report?s=${g_siteId}&l=${lang}&uri=${encodeURIComponent(location.host + location.pathname)}`;
    try {

        const reply = await getHttpClient().post(url, tempBulk);
        if (reply && reply.updated) {
            cacheBreaker = Date.now() + "";
        }
    } catch (err) {
        console.error(err);
        bulk = [...tempBulk, ...bulk];
    }
}

/**
 * Cached translations
 */
const loadedMessages = {}; // our default language that is preloaded

function setI18nLanguage (i18n: VueI18n, lang: string) {
    i18n.locale = lang
    // axios.defaults.headers.common['Accept-Language'] = lang
    document.querySelector('html').setAttribute('lang', lang)
}

/**
 * Async middleware to fire before each route, or before app loads.
 * Loads the translation, makes sure editor is loaded in if in editor mode.
 * @param i18n
 * @param lang
 * @param ns
 */
export async function routerBeforeEach(i18n: VueI18n, lang: string, ns: string = null): Promise<void> {
    const key = ns ? `${lang}-${ns}` : lang;
    // if in editor mode
    if (g_onEditorLoad) {
        // wait until editor is loaded
        await new Promise<void>((resolve) => {
            g_onEditorLoad.push(resolve);
        });
    }
    function getFallbackLocale(i18n: VueI18n) {
        if (!i18n.fallbackLocale)
            return "en";
        if (typeof i18n.fallbackLocale === "string")
            return i18n.fallbackLocale;
        if (Array.isArray(i18n.fallbackLocale))
            return i18n.fallbackLocale[0];
        return "en";
    }
    // load translation file
    if (!(key in loadedMessages)) {
        const defaultMessages = i18n.getLocaleMessage(getFallbackLocale(i18n));
        try {
            loadedMessages[key] = await loadTranslations(lang, ns, defaultMessages);
        } catch (e) {
            console.error("Failed to load translations", e);
            loadedMessages[key] = defaultMessages;
        }
    }
    setI18nLanguage(i18n, lang);
    i18n.setLocaleMessage(lang, loadedMessages[key]);
}
