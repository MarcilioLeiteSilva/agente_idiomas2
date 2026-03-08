FROM nginx:stable-alpine

# Copy static files to nginx html directory (context is repository root)
COPY frontend /usr/share/nginx/html

# Copy custom nginx config to support SPA routing
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
