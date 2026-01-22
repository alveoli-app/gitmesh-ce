FROM cubejs/cube:v0.33.55

# Copy the entire configuration including our custom server
COPY ./ /cube/conf/

# Set working directory
WORKDIR /cube/conf

# Install dependencies and build TypeScript
RUN npm install && npm run build

# Use our custom server instead of the default
CMD ["node", "server.js"]
