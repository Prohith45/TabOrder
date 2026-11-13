const http = require("http");
const app = require("./app");
const env = require("./config/env");
const { initSocketServer } = require("./socket/socketServer");

const httpServer = http.createServer(app);

initSocketServer(httpServer, {
  corsOrigin: "*",
});

httpServer.on("error", (error) => {
  console.error("Failed to start TabOrder API", {
    code: error.code,
    message: error.message,
    port: env.port,
  });

  process.exit(1);
});

httpServer.listen(env.port, "0.0.0.0", () => {
  console.log(`TabOrder API listening on port ${env.port} (bound to 0.0.0.0)`);
});

// Graceful shutdown listeners to free port 4000 and prevent ghost processes on Windows
process.on("SIGINT", () => {
  console.log("SIGINT signal received: closing HTTP server");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("SIGTERM signal received: closing HTTP server");
  process.exit(0);
});
