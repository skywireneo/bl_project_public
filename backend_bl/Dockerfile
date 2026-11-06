# ------------------ DEV ------------------
FROM node:18-bullseye AS dev

RUN echo "deb http://deb.debian.org/debian bullseye main contrib non-free" > /etc/apt/sources.list \
    && apt-get update \
    && apt-get install -y wkhtmltopdf fontconfig ttf-mscorefonts-installer \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# ------------------ PROD ------------------
FROM node:18-bullseye AS prod

RUN echo "deb http://deb.debian.org/debian bullseye main contrib non-free" > /etc/apt/sources.list \
    && apt-get update \
    && apt-get install -y wkhtmltopdf fontconfig ttf-mscorefonts-installer \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --production

COPY . .

RUN adduser --system --group --no-create-home appuser && chown -R appuser:appuser /usr/src/app
USER appuser

EXPOSE 3000
CMD ["node", "app.js"]
