FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
# Use `npm install` in the build environment to avoid lockfile mismatch failures
# (some CI builders have differing npm versions; `npm install` is more permissive).
RUN npm install --no-audit --no-fund

COPY public ./public
COPY src ./src
COPY index.html .

RUN npm run build

EXPOSE 4173

CMD ["npm", "run", "start"]
