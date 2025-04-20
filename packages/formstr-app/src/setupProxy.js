const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Proxy for Ollama API
  app.use(
    '/ollama-api',
    createProxyMiddleware({
      target: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      changeOrigin: true,
      pathRewrite: {
        '^/ollama-api': '/api',
      },
      onError: (err, req, res) => {
        console.error('Proxy error:', err);
        res.status(500).json({
          error: 'Ollama service unavailable',
          message: 'Could not connect to the Ollama service. Make sure Ollama is running.'
        });
      }
    })
  );
};
