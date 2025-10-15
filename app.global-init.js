// app.global-init.js
// Garantija, kad GLA globalas visada yra, net jei app.js nespėjo/nesugebėjo jo sukurti
(function (global) {
  if (!global.GLA) global.GLA = {};
})(window);
