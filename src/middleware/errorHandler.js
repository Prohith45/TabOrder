function errorHandler(error, _req, res, _next) {
  const statusCode =
    error.type === "entity.parse.failed" ? 400 : error.statusCode || 500;
  const message =
    error.type === "entity.parse.failed"
      ? "Invalid JSON payload"
      : error.message || "Internal server error";

  res.status(statusCode).json({
    message,
  });
}

module.exports = errorHandler;
