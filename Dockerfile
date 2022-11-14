FROM node:16
WORKDIR /usr/src/app

COPY ./src/package.json ./
RUN npm install
ADD ./src ./
COPY ./data /opt/gendev/data

CMD ["node", "server.js"]