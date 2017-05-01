const socketio = require('socket.io');
const HTTPServer = require('./httpServer.js');

const io = socketio(HTTPServer.httpServer);

const buildUsersBuffer = (room) => {
  const buffersArray = []; // The array of buffers - one buffer for each user in the room
  let totalByteLength = 0; // Total byte size of all of the usernames

  const keys = Object.keys(room.sockets);
  for (let i = 0; i < room.length; i++) {
    // Gets the socket by ID
    const socket = io.sockets.connected[keys[i]];

    // Creates a buffer from the socket's username
    const str = `<p class="selectMessageTarget">${socket.username}</p>`;
    const nameBuffer = Buffer.from(str);

    // Adds the buffer to the array
    buffersArray.push(nameBuffer);

    // Adds to the total byte length
    totalByteLength += nameBuffer.length;
  }

  // Allocates the final buffer
  const finalBuffer = Buffer.concat(buffersArray, totalByteLength);

  return finalBuffer;
};

const findSocketByUsername = (username, room) => {
  const keys = Object.keys(room.sockets);
  for (let i = 0; i < keys.length; i++) {
    if (io.sockets.connected[keys[i]].username === username) {
      return io.sockets.connected[keys[i]];
    }
  }

  return null;
};

const onMessage = (sock, messageBuffer) => {
  const socket = sock;

  if (messageBuffer !== undefined && messageBuffer.length > 0) {
    const toUsernameByteLength = messageBuffer.readUInt8(0);
    let toUsername = '';
    for (let i = 0; i < toUsernameByteLength; i++) {
      toUsername += String.fromCharCode(messageBuffer.readUInt8(1 + i));
    }

    const room = io.sockets.adapter.rooms.room1;
    if (!room) return;

    const toSocket = findSocketByUsername(toUsername, room);

    let str = `${socket.username}: `;
    if (toSocket) {
      str = `You to ${toUsername}: `;
    }

    const byteLength = messageBuffer.length + str.length;

    // Allocates a new buffer that can hold the username and the message
    // This buffer gets sent back to the sender
    const buffer = Buffer.alloc(byteLength);
    let offset = 0;

    // Adds the username to the buffer
    buffer.write(str, offset);
    offset += str.length;

    const rawMessageBuffer = messageBuffer.slice(toUsernameByteLength + 1);

    // Adds the message to the buffer
    rawMessageBuffer.copy(buffer, offset);


    if (toSocket) {
      // Build another buffer for the recipient of the message
      const toStr = `${socket.username} to You: `;

      const toByteLength = messageBuffer.length + toStr.length;

      // Allocates a new buffer that can hold the username and the message
      // This buffer gets sent to the recipient
      const toBuffer = Buffer.alloc(toByteLength);
      let toOffset = 0;

      // Adds the username to the buffer
      toBuffer.write(toStr, toOffset);
      toOffset += toStr.length;

      const toRawMessageBuffer = messageBuffer.slice(toUsernameByteLength + 1);

      // Adds the message to the buffer
      toRawMessageBuffer.copy(toBuffer, toOffset);

      socket.emit('message', buffer);
      toSocket.emit('message', toBuffer);
    } else {
      io.sockets.in('room1').emit('message', buffer);
    }
  }
};

const onDisconnect = (sock) => {
  const socket = sock;

  const room = io.sockets.adapter.rooms.room1;
  if (!room) return;

  const usersBuffer = buildUsersBuffer(room);
  io.sockets.in('room1').emit('users', usersBuffer);

  io.sockets.in('room1').emit('message', Buffer.from(`${socket.username} has left the room.`));
};

const onConnect = (sock) => {
  const socket = sock;

  socket.join('room1');

  const username = socket.handshake.query.username.trim();

  const room = io.sockets.adapter.rooms.room1;
  if (!room) return;

  // Username error handling
  if (username === undefined || username === '') {
    socket.emit('username', Buffer.from('empty'));
    socket.disconnect();
    return;
  } else if (username.length < 3 || username.length > 16) {
    socket.emit('username', Buffer.from('length'));
    socket.disconnect();
    return;
  } else if (findSocketByUsername(username, room) !== null) {
    socket.emit('username', Buffer.from('taken'));
    socket.disconnect();
    return;
  }

  socket.emit('username', Buffer.from('valid'));
  socket.username = username;

  const usersBuffer = buildUsersBuffer(room);
  io.sockets.in('room1').emit('users', usersBuffer);

  io.sockets.in('room1').emit('message', Buffer.from(`${socket.username} has joined the room.`));

  socket.on('message', (messageBuffer) => {
    onMessage(socket, messageBuffer);
  });

  socket.on('disconnect', () => {
    onDisconnect(socket);
  });
};

io.sockets.on('connection', onConnect);
