FROM oven/bun:1
WORKDIR /app

COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile --production

COPY src/ ./src/
COPY tsconfig.json start.sh ./
RUN chmod +x start.sh

EXPOSE 3000

CMD ["./start.sh"]
