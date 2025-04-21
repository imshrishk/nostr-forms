const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  console.log('Setting up proxy middleware for Ollama...');
  
  // Use the direct IP to avoid hostname resolution issues
  const ollamaBaseUrl = 'http://127.0.0.1:11434';
  console.log(`Ollama base URL: ${ollamaBaseUrl}`);
  
  // Proxy for Ollama API
  app.use(
    '/ollama-api',
    createProxyMiddleware({
      target: ollamaBaseUrl,
      changeOrigin: true,
      pathRewrite: {
        '^/ollama-api': '', // Remove completely to correctly connect to Ollama endpoints
      },
      onProxyReq: (proxyReq, req, res) => {
        // Log outgoing requests
        console.log(`Proxying request to Ollama: ${req.method} ${proxyReq.path}`);
        
        // Allow CORS
        if (req.headers.origin) {
          res.setHeader('Access-Control-Allow-Origin', '*');
        }
        
        // If it's a POST request with body, log a sample of the body
        if (req.method === 'POST' && req.body) {
          const bodyStr = JSON.stringify(req.body).substring(0, 200);
          console.log(`Request body (truncated): ${bodyStr}...`);
        }
      },
      onProxyRes: (proxyRes, req, res) => {
        // Log successful proxy responses
        console.log(`Received response from Ollama: ${proxyRes.statusCode} for ${req.method} ${req.path}`);
        
        // Add CORS headers to response
        proxyRes.headers['Access-Control-Allow-Origin'] = '*';
        proxyRes.headers['Access-Control-Allow-Methods'] = 'GET,POST,PUT,DELETE,OPTIONS';
        proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization';
      },
      onError: (err, req, res) => {
        console.error('Proxy error:', err);
        console.error(`Error details: ${err.code} - ${err.message}`);
        
        // Send a more detailed error response
        res.writeHead(500, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        });
        
        res.end(JSON.stringify({
          error: 'Ollama service unavailable',
          message: 'Could not connect to the Ollama service. Make sure Ollama is running on http://127.0.0.1:11434.',
          details: err.message,
          code: err.code
        }));
      },
      logLevel: 'debug'
    })
  );
  
  console.log('Proxy middleware setup complete');
};
