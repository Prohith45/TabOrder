const cors = require("cors");
const express = require("express");
const env = require("./config/env");
const menuRoutes = require("./routes/menuRoutes");
const orderRoutes = require("./routes/orderRoutes");
const restaurantRoutes = require("./routes/restaurantRoutes");
const errorHandler = require("./middleware/errorHandler");
const httpError = require("./utils/httpError");

const app = express();

app.use(
  cors({
    origin: "*",
  })
);
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api", menuRoutes);
app.use("/api", orderRoutes);
app.use("/api", restaurantRoutes);

app.use((_req, _res, next) => {
  next(httpError(404, "Route not found"));
});

app.use(errorHandler);

module.exports = app;
