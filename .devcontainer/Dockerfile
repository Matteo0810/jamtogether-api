FROM node:20.16.0-alpine

WORKDIR /usr/src/app

COPY package*.json .

RUN npm install && rm -rf /tmp/*

COPY . .

ENV NODE_ENV development

CMD ["npm", "run", "dev"]