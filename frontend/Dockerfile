FROM nginx:alpine

# Copy static files to nginx html directory
COPY . /usr/share/nginx/html

# Copy custom nginx config if we want to handle routing/proxy here
# For now, we rely on the main Nginx proxy or default config
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
