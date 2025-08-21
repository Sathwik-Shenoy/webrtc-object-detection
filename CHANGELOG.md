## Changelog

### 2025-08-22
- Removed legacy demo pages: `public/phone.html`, `public/phone-simple.html` (redirect kept in routes).
- Removed unused legacy frontend scripts: `viewer.js`, `phone.js`, `utils.js`, `object-tracker.js`, `enhanced-viewer.js` from `public/js/`.
- Updated implementation summary to mark advanced prototype modules as removed.
- Consolidated active client logic into inline scripts in `laptop-viewer.html` and `phone-connect.html`.

### 2025-08-21
- Added server-side YOLOv5 inference with preprocessing + NMS.
- Implemented frame queue backpressure (drop oldest) in `WebRTCService`.
- Updated QR & routing to `phone-connect.html` with backward-compatible redirect.

### 2025-08-20
- Initial baseline project, WASM placeholder mode, benchmarking script, documentation.
