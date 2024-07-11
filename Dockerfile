FROM keymetrics/pm2:latest-alpine

ENV NODE_ENV=production

RUN mkdir /app
WORKDIR /app

COPY package.json package-lock.json ./

RUN npm install --production

COPY . .

CMD ["pm2", "start", "ecosystem.config.js", "--env=production"]
