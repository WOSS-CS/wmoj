FROM node:18-alpine

# Install system dependencies for various programming languages
RUN apk add --no-cache \
    python3 \
    py3-pip \
    gcc \
    g++ \
    musl-dev \
    make \
    openjdk17 \
    go \
    bash \
    && ln -sf python3 /usr/bin/python

# Install Rust
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --only=production

# Copy source code
COPY dist ./dist

# Create temp directory for code execution
RUN mkdir -p /tmp/code-execution && chmod 755 /tmp/code-execution

# Create non-root user for security
RUN addgroup -g 1001 -S coderunner && \
    adduser -S coderunner -u 1001

# Set up proper permissions
RUN chown -R coderunner:coderunner /app /tmp/code-execution

# Expose port
EXPOSE 3002

# Switch to non-root user
USER coderunner

# Start the application
CMD ["node", "dist/server.js"]
