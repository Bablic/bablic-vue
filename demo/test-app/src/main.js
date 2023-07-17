import Vue from 'vue'
import App from './App.vue'
import i18n from './i18n'
import {routerBeforeEach} from "../../../src/index";

Vue.config.productionTip = false

routerBeforeEach(i18n, "de").then(() => {
  new Vue({
    i18n,
    render: h => h(App)
  }).$mount('#app')
});
