FROM node:18-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build
CMD ["cp", "-r", "/app/dist/.", "/usr/share/nginx/html/"]
