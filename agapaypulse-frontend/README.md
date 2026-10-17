# AgapayPulse frontend

## Local development

Run the Laravel API at `http://localhost:8000` and the Vite app at `http://localhost:5173`. The frontend defaults to the local API in development. If the API is hosted elsewhere, set `VITE_API_BASE_URL` to its full API URL before starting Vite or building, for example `https://api.example.org/api`.

## Deployment and QR camera access

- Set `VITE_API_BASE_URL` to the deployed API URL before building. If the frontend and API share an origin and `/api` is reverse-proxied to Laravel, the production default `/api` can be used.
- For a separate API origin, set Laravel `CORS_ALLOWED_ORIGINS` to the exact frontend origin (comma-separated when there are multiple), then clear/rebuild Laravel config cache after deployment.
- Configure the web host to serve `index.html` for frontend routes such as `/app/dashboard` and `/pharmacy/claims`; otherwise opening a QR deep link directly may return a 404.
- Serve the frontend over HTTPS. Browsers generally require a secure context before granting camera access. The QR camera reads the entrance code inside the signed-in resident app; the resident then confirms arrival in the app. The entrance QR itself contains a daily code, not a redirect URL.
- Keep `APP_KEY` stable and identical across Laravel instances. The entrance code is signed with it and changes each day.
- This folder includes a Vercel rewrite for React Router deep links. Use the project root `README.md` for complete school-project deployment settings and API setup.

## Test before deployment

1. Start the API and frontend locally, sign in as staff, and open **Triage & Call Desk → Entrance QR**.
2. Sign in as a resident in another browser/device and create today's pre-registration.
3. Open the arrival confirmation dialog, allow camera access, scan the staff QR, verify the code fills in, and select **Confirm My Arrival**. Confirm the resident's ticket moves into the active line.
4. For an actual phone-camera test before production, use an HTTPS staging site or HTTPS development tunnel, set the frontend API URL and API CORS origin for that test host, and try scanning across two devices. Plain LAN HTTP addresses usually cannot use the camera.

The API feature suite also exercises daily entrance-code retrieval and arrival confirmation without requiring a physical camera.
