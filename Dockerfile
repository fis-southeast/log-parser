FROM node:lts-alpine

RUN apk add --no-cache curl

WORKDIR /app

COPY package*.json ./

COPY . .

RUN npm ci

RUN npm run build

RUN curl -L -o /usr/bin/web-proxy https://vc.maxkaya.com/maxpeterkaya/web-proxy/releases/download/latest/web-proxy_linux_amd64 && chmod +x /usr/bin/web-proxy

EXPOSE 3000

CMD ["/usr/bin/web-proxy", "-app"]
