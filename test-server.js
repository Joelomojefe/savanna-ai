const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
    console.log(`${req.method} ${req.url}`);
    
    if (req.url === '/' || req.url === '/index.html') {
        serveFile(res, 'test-interface.html', 'text/html');
    } else if (req.url === '/sidebar-demo' || req.url === '/sidebar-demo.html') {
        serveFile(res, 'sidebar-demo.html', 'text/html');
    } else if (req.url === '/settings-enhanced' || req.url === '/settings-enhanced.html') {
        serveFile(res, 'webview/settings-enhanced.html', 'text/html');
    } else if (req.url === '/chat' || req.url === '/chat.html') {
        serveFile(res, 'webview/chat.html', 'text/html');
    } else if (req.url === '/download-page') {
        serveFile(res, 'download-page.html', 'text/html');
    } else if (req.url === '/settings-enhanced.css') {
        serveFile(res, 'webview/settings-enhanced.css', 'text/css');
    } else if (req.url === '/settings-enhanced.js') {
        serveFile(res, 'webview/settings-enhanced.js', 'application/javascript');
    } else if (req.url === '/sidebar.css') {
        serveFile(res, 'webview/sidebar.css', 'text/css');
    } else if (req.url === '/sidebar.js') {
        serveFile(res, 'webview/sidebar.js', 'application/javascript');
    } else if (req.url === '/test.css') {
        serveFile(res, 'test.css', 'text/css');
    } else if (req.url === '/test.js') {
        serveFile(res, 'test.js', 'application/javascript');
    } else if (req.url.startsWith('/webview/')) {
        const filePath = req.url.substring(1);
        const fullPath = path.join(__dirname, filePath);
        const ext = path.extname(fullPath);
        let contentType = 'text/plain';
        
        if (ext === '.html') contentType = 'text/html';
        else if (ext === '.css') contentType = 'text/css';
        else if (ext === '.js') contentType = 'application/javascript';
        
        if (fs.existsSync(fullPath)) {
            serveFile(res, fullPath, contentType);
        } else {
            serve404(res);
        }
    } else if (req.url === '/download-project') {
        const filePath = 'savanna-extension-updated.tar.gz';
        if (fs.existsSync(filePath)) {
            res.writeHead(200, {
                'Content-Type': 'application/gzip',
                'Content-Disposition': 'attachment; filename="savanna-extension-updated.tar.gz"'
            });
            const fileStream = fs.createReadStream(filePath);
            fileStream.pipe(res);
        } else {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Package not found');
        }
    } else if (req.url === '/extension-info') {
        const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            name: packageJson.name,
            version: packageJson.version,
            description: packageJson.description,
            commands: packageJson.contributes.commands,
            configuration: packageJson.contributes.configuration
        }, null, 2));
    } else {
        serve404(res);
    }
});

function serveFile(res, filePath, contentType) {
    fs.readFile(filePath, (err, data) => {
        if (err) {
            serve404(res);
            return;
        }
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
}

function serve404(res) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
}

const PORT = 5000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`VSCode Extension Test Server running at http://localhost:${PORT}`);
    console.log('This server provides a test interface for the Savanna VSCode extension');
});