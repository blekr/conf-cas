FROM node:8.9.1-alpine

ARG NODE_ENV=production
ENV NODE_ENV=$NODE_ENV

# Set a working directory
WORKDIR /usr/src/app

RUN npm i -g npx

COPY package.json yarn.lock .babelrc ./
RUN yarn install --no-cache --frozen-lockfile --production=false

COPY src ./src
COPY tools ./tools
RUN chown -R root:root src tools

RUN npx babel src --out-dir build --copy-files
WORKDIR ./build
CMD [ "node", "server.js" ]
