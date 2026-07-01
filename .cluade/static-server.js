// Servidor estático local para previsualizar el sitio.
// Emula GitHub Pages sirviendo 404.html para rutas inexistentes.
// GitHub Pages NO publica la carpeta .claude, así que esto no afecta el deploy.
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.css':'text/css', '.png':'image/png', '.svg':'image/svg+xml', '.ico':'image/x-icon', '.json':'application/json' };
http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const file = path.join(root, p);
  fs.readFile(file, (err, data) => {
    if (err) {
      fs.readFile(path.join(root, '404.html'), (e2, d2) => {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(e2 ? 'Not found' : d2);
      });
      return;
    }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(process.env.PORT || 8123, () => console.log('Preview en http://localhost:' + (process.env.PORT || 8123)));
