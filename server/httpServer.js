const http = require('http');
const fs = require('fs');

const PORT = 3000;

const onRequest = (request, response) => {
  switch (request.url) {
    case '/main.css': {
      fs.readFile(`${__dirname}/../client/main.css`, (cssError, cssData) => {
        if (cssError) throw cssError;

        response.writeHead(200, { 'Content-Type': 'text/css' });
        response.write(cssData);
        response.end();
      });
      break;
    }

    case '/main.js': {
      fs.readFile(`${__dirname}/../client/main.js`, (jsError, jsData) => {
        if (jsError) throw jsError;

        response.writeHead(200, { 'Content-Type': 'application/javascript' });
        response.write(jsData);
        response.end();
      });
      break;
    }

    default: {
      fs.readFile(`${__dirname}/../client/index.html`, (indexError, indexData) => {
        if (indexError) throw indexError;

        response.writeHead(200, { 'Content-Type': 'text/html' });
        response.write(indexData);
        response.end();
      });
      break;
    }
  }
};

const httpServer = http.createServer(onRequest).listen(PORT);

module.exports = {
  httpServer,
};
