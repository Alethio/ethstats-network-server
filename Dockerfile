FROM node:9-alpine

# Using this node version because `process.versions.modules` is 51, which
# matches the prebuilt `uws` binaries

RUN apk update && \
    apk add git python g++ make

RUN npm i npm@latest -g

WORKDIR /app
COPY package* ./
COPY .eslint* .babel* ./

RUN npm install

COPY . .
COPY .env.sample .env

EXPOSE 3000

CMD ["npm", "run", "start"]
