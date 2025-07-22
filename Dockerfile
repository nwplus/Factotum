FROM node:20-alpine

USER node

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

ENV NAME=factotum

ENV NODE_ENV=production

CMD ["npm", "start"] 