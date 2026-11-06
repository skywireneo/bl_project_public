# ------------------ DEV ------------------
FROM node:alpine AS dev

WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install 
COPY . .
EXPOSE 5173
CMD ["npm", "start"]

# ------------------ BUILD ------------------
FROM node:alpine AS build

WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
ARG REACT_APP_DONATION_PLATFORM_URL
ARG REACT_APP_SUPPORT_EMAIL
ARG REACT_APP_API_URL
ARG REACT_APP_BACKEND_SECRET_KEY
ENV REACT_APP_DONATION_PLATFORM_URL=$REACT_APP_DONATION_PLATFORM_URL
ENV REACT_APP_SUPPORT_EMAIL=$REACT_APP_SUPPORT_EMAIL
ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_BACKEND_SECRET_KEY=$REACT_APP_BACKEND_SECRET_KEY
RUN npm run build

# ------------------ PROD ------------------
FROM nginx:alpine AS prod

# Копируем собранный билд
COPY --from=build /usr/src/app/build /usr/share/nginx/html

# Копируем nginx конфиг для фронтенда
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]