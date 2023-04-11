FROM node:16-alpine AS dist
COPY package.json package-lock.json ./

RUN npm i

COPY . ./

RUN npm run build

FROM node:16-alpine AS node_modules
COPY package.json package-lock.json ./

RUN npm i --production

FROM node:16-alpine

ARG PORT=3000

RUN mkdir -p /usr/src/app

WORKDIR /usr/src/app

COPY --from=dist dist /usr/src/app/dist
COPY --from=node_modules node_modules /usr/src/app/node_modules
COPY package.json package-lock.json /usr/src/app/

EXPOSE $PORT

CMD [ "npm", "run", "start:prod" ]