import Vue from 'vue';
import App from './App.vue';
import store from './store';
import 'bootstrap/dist/css/bootstrap.min.css';
const uiv = require('uiv');

Vue.config.productionTip = false;
Vue.use(uiv);

new Vue({
  store,
  render: (h) => h(App),
}).$mount('#app');
