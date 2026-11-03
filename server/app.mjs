import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const DB = path.join(process.cwd(), 'data/db.json');
const PORT = 8767;

function readDB() {
  return JSON.parse(fs.readFileSync(DB, 'utf8'));
}

function saveDB(data) {
  fs.writeFileSync(DB, JSON.stringify(data, null, 2));
}

const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.end();
    return;
  }

  if (req.method === 'GET' && req.url === '/api/health') {
    res.end(JSON.stringify({status:'ok',device:'android'}));
    return;
  }

  if (req.method === 'GET' && req.url === '/api/data') {
    res.end(JSON.stringify(readDB()));
    return;
  }

  const parts = req.url.split('/').filter(Boolean);
  const type = parts[1];
  const id = parts[2];

  if (parts[0] !== 'api' || !['courses','tasks'].includes(type)) {
    res.statusCode = 404;
    res.end(JSON.stringify({error:'Not found'}));
    return;
  }

  let body = '';
  req.on('data', chunk => body += chunk);

  req.on('end', () => {
    try {
      const db = readDB();
      const list = db[type];

      if (req.method === 'POST') {
        const item = JSON.parse(body || '{}');
        item.id = Date.now();
        list.push(item);
        saveDB(db);
        res.end(JSON.stringify(item));
        return;
      }

      if (req.method === 'PUT' && id) {
        const index = list.findIndex(x => String(x.id) === id);
        if (index < 0) throw new Error('记录不存在');
        list[index] = {...list[index], ...JSON.parse(body || '{}'), id:list[index].id};
        saveDB(db);
        res.end(JSON.stringify(list[index]));
        return;
      }

      if (req.method === 'DELETE' && id) {
        db[type] = list.filter(x => String(x.id) !== id);
        saveDB(db);
        res.end(JSON.stringify({success:true}));
        return;
      }

      res.statusCode = 405;
      res.end(JSON.stringify({error:'Method not allowed'}));
    } catch (error) {
      res.statusCode = 400;
      res.end(JSON.stringify({error:error.message}));
    }
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`本地 API 已启动：http://127.0.0.1:${PORT}`);
});
