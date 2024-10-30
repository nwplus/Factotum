FROM node:20-alpine

USER node

WORKDIR /app

COPY package*.json ./

RUN yarn install

COPY . .

ENV NAME=factotum

ENV NODE_ENV=PROD

CMD ["node", "app.js"] 