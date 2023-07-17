import Vue from 'vue'
import VueI18n from 'vue-i18n'

Vue.use(VueI18n)

import * as BablicI18n from "./bablic";
BablicI18n.init("6452099637c7e70019b6cdc4", true);
export default new VueI18n({
  locale: 'de', //process.env.VUE_APP_I18N_LOCALE || 'en',
  fallbackLocale: process.env.VUE_APP_I18N_FALLBACK_LOCALE || 'en',
  messages: {},
  missing: BablicI18n.missing,
})
