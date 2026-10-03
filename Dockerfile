# JMK CANARY — Production Dockerfile
# Builds a self-contained nginx image with the static site baked in

FROM nginx:alpine

# Remove default nginx config and static files
RUN rm -rf /etc/nginx/conf.d/default.conf /usr/share/nginx/html/*

# Copy production nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy static site assets
COPY index.html /usr/share/nginx/html/index.html
COPY app.js /usr/share/nginx/html/app.js

# Healthcheck — verify nginx is serving
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget -q --spider http://localhost:80/health || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
