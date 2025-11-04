# Build stage
FROM node:18-alpine AS frontend-build

WORKDIR /app
COPY frontend/package.json ./
RUN npm install --legacy-peer-deps
COPY frontend/ ./
RUN npm run build

# Final stage
FROM nginx:alpine
COPY --from=frontend-build /app/dist /usr/share/nginx/html
COPY nginx/nginx.conf /etc/nginx/nginx.conf
# Очистка всех конфигурационных файлов в /etc/nginx/conf.d/
RUN rm -rf /etc/nginx/conf.d/*
# Проверка содержимого /etc/nginx/ для отладки
RUN ls -la /etc/nginx/ > /tmp/nginx_files.log
EXPOSE 8080 8443
CMD ["nginx", "-g", "daemon off;"]
