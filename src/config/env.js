const dotenv = require("dotenv");

dotenv.config();

function parseCorsOrigin(value) {
  if (!value || value === "*") {
    return "*";
  }

  const origins = value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return origins.length > 0 ? origins : "*";
}

const env = {
  port: Number(process.env.PORT || 4000),
  databaseUrl: process.env.DATABASE_URL,
  corsOrigin: parseCorsOrigin(process.env.CORS_ORIGIN),
  printerEnabled: process.env.PRINTER_ENABLED === "true",
  printerType: process.env.PRINTER_TYPE || "epson",
  printerInterface: process.env.PRINTER_INTERFACE || "tcp://127.0.0.1:9100",
};

if (!env.databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

module.exports = env;
