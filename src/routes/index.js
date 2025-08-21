const express = require('express');
const path = require('path');
const router = express.Router();

// Serve main viewer page
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/index.html'));
});

// Serve phone streaming page
// Backward compatibility: redirect old path to new connect flow
router.get('/phone.html', (req, res) => {
  res.redirect(301, '/phone-connect.html');
});

// Redirect phone-connect.html to the intended phone connect page if it exists
router.get('/phone-connect.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/phone-connect.html'));
});

// Serve demo page with instructions
router.get('/demo', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>WebRTC Object Detection Demo</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .qr-container { text-align: center; margin: 20px 0; }
        .instructions { background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .status { background: #e8f5e8; padding: 15px; border-radius: 8px; margin: 10px 0; }
        .button { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; margin: 5px; }
        .button:hover { background: #0056b3; }
      </style>
    </head>
    <body>
      <h1>🚀 WebRTC Object Detection Demo</h1>
      
      <div class="status">
        <h3>📊 System Status</h3>
        <p><strong>Mode:</strong> ${process.env.MODE || 'wasm'}</p>
        <p><strong>Server:</strong> Running on port ${process.env.PORT || 3000}</p>
        <p><strong>Time:</strong> ${new Date().toISOString()}</p>
      </div>
      
      <div class="instructions">
        <h3>📱 Quick Start Instructions</h3>
        <ol>
          <li>Click "Open Viewer" to open the main detection viewer</li>
          <li>Click "Open Phone Camera" or scan the QR code with your phone</li>
          <li>Allow camera permissions on your phone</li>
          <li>Point your phone camera at objects to see real-time detection!</li>
        </ol>
      </div>
      
      <div style="text-align: center;">
        <button class="button" onclick="window.open('/', '_blank')">🖥️ Open Viewer</button>
  <button class="button" onclick="window.open('/phone-connect.html', '_blank')">📱 Open Phone Camera</button>
        <button class="button" onclick="window.open('/metrics', '_blank')">📊 View Metrics</button>
      </div>
      
      <div class="qr-container">
        <h3>📱 Scan with your phone:</h3>
        <div id="qr-code">Loading QR code...</div>
      </div>
      
      <script>
        // Load QR code
        fetch('/qr')
          .then(r => r.json())
          .then(data => {
            document.getElementById('qr-code').innerHTML = 
              '<img src="' + data.qrCode + '" alt="QR Code" style="max-width: 256px;"><br>' +
              '<p>URL: <a href="' + data.phoneUrl + '" target="_blank">' + data.phoneUrl + '</a></p>';
          })
          .catch(err => {
            document.getElementById('qr-code').innerHTML = '<p>Failed to load QR code: ' + err.message + '</p>';
          });
      </script>
    </body>
    </html>
  `);
});

module.exports = router;
