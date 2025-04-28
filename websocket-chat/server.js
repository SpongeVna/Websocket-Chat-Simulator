const express = require('express');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const port = 3000;

app.use(express.static(path.join(__dirname)));
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const clients = new Map();
const history = [];

wss.on('connection', function connection(ws) {
  console.log('Client connected');

  ws.on('message', function incoming(data) {
    let parsed;
    try {
      parsed = JSON.parse(data);
    } catch (e) {
      console.error('Invalid JSON:', data);
      return;
    }

    if (parsed.type === 'join') {
      ws.username = parsed.username;
      clients.set(ws, parsed.username);
      history.forEach(msg => {
        ws.send(JSON.stringify(msg));
      });
      broadcast({ type: 'info', message: `${parsed.username} bergabung ke chat.` });
      broadcastUserList();
    } 
    else if (parsed.type === 'chat') {
      const chatMsg = { type: 'chat', username: parsed.username, message: parsed.message };
      history.push(chatMsg);
      broadcast(chatMsg);
    }
    else if (parsed.type === 'changeUsername') {
      const oldUsername = ws.username;
      ws.username = parsed.username;
      clients.set(ws, parsed.username);
      broadcast({ type: 'info', message: `${oldUsername} mengganti nama menjadi ${parsed.username}.` });
      broadcastUserList();
    }
  });

  ws.on('close', function () {
    if (ws.username) {
      clients.delete(ws);
      broadcast({ type: 'info', message: `${ws.username} keluar dari chat.` });
      broadcastUserList();
    }
  });
});

function broadcast(message) {
  const msgString = JSON.stringify(message);
  wss.clients.forEach(function each(client) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msgString);
    }
  });
}

function broadcastUserList() {
  const users = Array.from(clients.values());
  const userListMessage = { type: 'userlist', users: users };
  broadcast(userListMessage);
}

server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
