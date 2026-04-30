const requestLogger = (req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const responseTime = Date.now() - start;

    console.log(
      `${req.method} ${req.originalUrl} ${res.statusCode} - ${responseTime}ms`
    );
  });

  next();
};

module.exports = requestLogger;