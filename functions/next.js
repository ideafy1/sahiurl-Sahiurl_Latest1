const functions = require('firebase-functions');
const next = require('next');

const nextApp = next({ dev: false, conf: { distDir: '.next' } });
const handle = nextApp.getRequestHandler();

exports.nextApp = functions.https.onRequest((req, res) => {
  return nextApp.prepare().then(() => handle(req, res));
}); 