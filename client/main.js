'use strict';

let socket = undefined;
  let messageTarget = '';

const sendMessage = (to) => {
  const message = chatInput.value;
  const messageByteLength = message.length;

  let toUsernameByteLength = 0;

  if(to) {
    toUsernameByteLength = to.length;
  }

  // Converts the message to an ArrayBuffer
  const dataView = new DataView(new ArrayBuffer(messageByteLength + toUsernameByteLength + 1));
  let offset = 0;
  
  dataView.setUint8(0, toUsernameByteLength);
  offset++;
  
  for(let i = 0; i < toUsernameByteLength; i++) {
    dataView.setUint8(offset, to.charCodeAt(i));
    offset++;
  }
  
  for(let i = 0; i < message.length; i++) {
    dataView.setUint8(offset, message.charCodeAt(i));
    offset++;
  }

  socket.emit('message', dataView.buffer);

  chatInput.value = '';
};

const connect = (username) => {
  // Connects to the websocket server with the given username
  socket = io.connect('', { query: `username=${username}` });

  const decodeBuffer = (buffer) => {
    const dataView = new DataView(buffer);
    const textDecoder = new TextDecoder();
    
    // Decodes the message from a byte array to text
    return textDecoder.decode(dataView);
  };
  
  // Username error response
  socket.on('username', (responseBuffer) => {
    const response = decodeBuffer(responseBuffer);
    
    const badUsernameText = document.querySelector('#badUsernameText');
    switch(response) {
      case 'valid': {
        const popupWindow = document.querySelector('#popupWindow');
        popupWindow.style.display = 'none';
        break;
      }
        
      case 'empty': {
        badUsernameText.style.display = 'inline';
        badUsernameText.innerHTML = 'Please enter a username';
        break;
      }

      case 'length': {
        badUsernameText.style.display = 'inline';
        badUsernameText.innerHTML = 'Must be between 3 and 16 characters';
        break;
      }
        
      case 'taken': {
        badUsernameText.style.display = 'inline';
        badUsernameText.innerHTML = 'That username is already taken';
        break;
      }
    }
  });

  socket.on('users', (usersBuffer) => {
    const usersString = decodeBuffer(usersBuffer);
    usersBox.innerHTML = usersString;
    
    const userTargets = usersBox.querySelectorAll('.selectMessageTarget');
    userTargets.forEach((userTarget) => {
      userTarget.addEventListener('click', (e) => {
        if(userTarget.innerHTML !== username) {
          userTarget.style.background = 'rgb(181, 209, 255)';
          messageTarget = userTarget.innerHTML;
        } else {
          for(let i = 0; i < userTargets.length; i++) {
            userTargets[i].style.background = 'rgba(255, 255, 255, 0)';
          }
          
          messageTarget = '';
        }
      });
    });
  });
  
  socket.on('message', (messageBuffer) => {
    const message = decodeBuffer(messageBuffer);
    
    // Adds the next to the history and scrolls down the textarea
    chatHistory.value += `${message}\n`;
    chatHistory.scrollTop = chatHistory.scrollHeight;
  });
};

window.onload = () => {
  const usernameInput = document.querySelector('#usernameInput');
  const connectButton = document.querySelector('#connectButton');
  
  const chatHistory = document.querySelector('#chatHistory');
  const chatInput = document.querySelector('#chatInput');
  const chatSendButton = document.querySelector('#chatSendButton');
  const usersBox = document.querySelector('#usersBox');
  
  connectButton.addEventListener('click', () => {
    connect(usernameInput.value);
  });
  usernameInput.addEventListener('keyup', (e) => {
    e.preventDefault();
    if(e.keyCode === 13) {
      connect(usernameInput.value);
    }
  });
  
  chatSendButton.addEventListener('click', (e) => {
    sendMessage(messageTarget);
  });
  chatInput.addEventListener('keyup', (e) => {
      e.preventDefault();
      if(e.keyCode === 13) {
        sendMessage(messageTarget);
      }
  });
};