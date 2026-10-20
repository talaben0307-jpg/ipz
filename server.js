// ipz - server chia sẻ ảnh, không cần cài thư viện ngoài (chỉ dùng Node.js có sẵn)
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const MAX_SIZE = 10 * 1024 * 1024; // tối đa 10MB / ảnh
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const EXT_BY_TYPE = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
};
const TYPE_BY_EXT = Object.fromEntries(Object.entries(EXT_BY_TYPE).map(([t, e]) => [e, t]));

// Kiểm tra nội dung file có đúng là ảnh không (không chỉ tin vào tên/loại file)
function looksLikeImage(type, b) {
  if (type === 'image/jpeg') return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  if (type === 'image/png') return b.slice(0, 4).toString('hex') === '89504e47';
  if (type === 'image/gif') return b.slice(0, 4).toString('latin1') === 'GIF8';
  if (type === 'image/webp') return b.slice(0, 4).toString('latin1') === 'RIFF' && b.slice(8, 12).toString('latin1') === 'WEBP';
  return false;
}

function sendJson(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body) });
  res.end(body);
}

function handleUpload(req, res) {
  const type = (req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
  if (!EXT_BY_TYPE[type]) {
    req.resume();
    return sendJson(res, 400, { ok: false, error: 'Chỉ cho phép ảnh JPG, PNG, GIF hoặc WEBP' });
  }
  const chunks = [];
  let size = 0;
  let tooBig = false;
  req.on('data', (chunk) => {
    if (tooBig) return;
    size += chunk.length;
    if (size > MAX_SIZE) {
      tooBig = true;
      chunks.length = 0;
      return;
    }
    chunks.push(chunk);
  });
  req.on('end', () => {
    if (tooBig) return sendJson(res, 413, { ok: false, error: 'Ảnh quá lớn (tối đa 10MB)' });
    const data = Buffer.concat(chunks);
    if (!data.length || !looksLikeImage(type, data)) {
      return sendJson(res, 400, { ok: false, error: 'File không phải ảnh hợp lệ' });
    }
    const name = Date.now() + '-' + crypto.randomBytes(4).toString('hex') + EXT_BY_TYPE[type];
    fs.writeFile(path.join(UPLOAD_DIR, name), data, (err) => {
      if (err) return sendJson(res, 500, { ok: false, error: 'Không lưu được ảnh' });
      sendJson(res, 200, { ok: true, url: '/uploads/' + name });
    });
  });
  req.on('error', () => sendJson(res, 400, { ok: false, error: 'Lỗi khi tải lên' }));
}

function listImages() {
  return fs
    .readdirSync(UPLOAD_DIR)
    .filter((f) => TYPE_BY_EXT[path.extname(f).toLowerCase()])
    .map((f) => ({ name: f, time: fs.statSync(path.join(UPLOAD_DIR, f)).mtimeMs }))
    .sort((a, b) => b.time - a.time)
    .map((f) => ({ url: '/uploads/' + f.name, time: f.time }));
}

const server = http.createServer((req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');

  if (req.method === 'GET' && pathname === '/') {
    return fs.readFile(path.join(__dirname, 'index.html'), (err, html) => {
      if (err) return sendJson(res, 500, { ok: false, error: 'Không tìm thấy index.html' });
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
    });
  }

  if (req.method === 'GET' && pathname === '/api/images') {
    return sendJson(res, 200, listImages());
  }

  if (req.method === 'POST' && pathname === '/api/upload') {
    return handleUpload(req, res);
  }

  if (req.method === 'GET' && pathname.startsWith('/uploads/')) {
    const name = decodeURIComponent(pathname.slice('/uploads/'.length));
    const ext = path.extname(name).toLowerCase();
    if (!/^[\w.-]+$/.test(name) || !TYPE_BY_EXT[ext]) return sendJson(res, 404, { ok: false, error: 'Không tìm thấy' });
    const file = path.join(UPLOAD_DIR, name);
    return fs.stat(file, (err, st) => {
      if (err || !st.isFile()) return sendJson(res, 404, { ok: false, error: 'Không tìm thấy' });
      res.writeHead(200, {
        'Content-Type': TYPE_BY_EXT[ext],
        'Content-Length': st.size,
        'Cache-Control': 'public, max-age=604800',
        'X-Content-Type-Options': 'nosniff',
      });
      fs.createReadStream(file).pipe(res);
    });
  }

  sendJson(res, 404, { ok: false, error: 'Không tìm thấy' });
});

server.listen(PORT, () => {
  console.log(`ipz đang chạy tại http://localhost:${PORT}`);
});
