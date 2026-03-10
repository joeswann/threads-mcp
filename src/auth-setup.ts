#!/usr/bin/env node

/**
 * One-time OAuth setup for Threads API using ngrok for HTTPS.
 *
 * Usage:
 *   THREADS_APP_ID=... THREADS_APP_SECRET=... npm run auth-setup
 *
 * Flow:
 * 1. Starts local HTTP server + ngrok tunnel for HTTPS
 * 2. Prints the ngrok HTTPS redirect URI to add to Meta Developer dashboard
 * 3. Opens Threads authorization page in browser
 * 4. Captures callback, exchanges for short-lived then long-lived token
 * 5. Prints the token to copy into .mcp.json
 */

import http from 'node:http';
import { URL } from 'node:url';
import { execSync, spawn } from 'node:child_process';

const REDIRECT_PORT = 3456;
const NGROK_PATH = 'ngrok';

const SCOPES = [
  'threads_basic',
  'threads_content_publish',
  'threads_manage_insights',
  'threads_manage_replies',
  'threads_read_replies',
].join(',');

const appId = process.env.THREADS_APP_ID;
const appSecret = process.env.THREADS_APP_SECRET;

if (!appId || !appSecret) {
  console.error(
    'Error: THREADS_APP_ID and THREADS_APP_SECRET must be set.\n' +
    'Usage: THREADS_APP_ID=... THREADS_APP_SECRET=... npm run auth-setup'
  );
  process.exit(1);
}

const state = Math.random().toString(36).substring(2, 15);

// Will be set once ngrok is up
let redirectUri = '';

async function startNgrok(): Promise<string> {
  console.log('Starting ngrok tunnel...\n');

  const ngrok = spawn(NGROK_PATH, ['http', String(REDIRECT_PORT), '--domain', 'threads-auth.ngrok.app', '--log', 'stdout', '--log-format', 'json'], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('ngrok failed to start within 10 seconds'));
    }, 10000);

    ngrok.stdout.on('data', (data: Buffer) => {
      const lines = data.toString().split('\n').filter(Boolean);
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          if (parsed.url && parsed.url.startsWith('https://')) {
            clearTimeout(timeout);
            resolve(parsed.url);
            return;
          }
        } catch {
          // not JSON, skip
        }
      }
    });

    ngrok.stderr.on('data', (data: Buffer) => {
      console.error('ngrok error:', data.toString());
    });

    ngrok.on('error', (err) => {
      clearTimeout(timeout);
      reject(new Error(`Failed to start ngrok: ${err.message}`));
    });

    ngrok.on('exit', (code) => {
      clearTimeout(timeout);
      if (code !== null && code !== 0) {
        reject(new Error(`ngrok exited with code ${code}`));
      }
    });

    // Also try the API after a short delay as fallback
    setTimeout(async () => {
      try {
        const resp = await fetch('http://127.0.0.1:4040/api/tunnels');
        const tunnels = await resp.json() as { tunnels: Array<{ public_url: string }> };
        const httpsTunnel = tunnels.tunnels.find((t: { public_url: string }) => t.public_url.startsWith('https://'));
        if (httpsTunnel) {
          clearTimeout(timeout);
          resolve(httpsTunnel.public_url);
        }
      } catch {
        // API not ready yet, keep waiting for stdout
      }
    }, 3000);
  });
}

async function exchangeCodeForShortLivedToken(code: string): Promise<string> {
  const params = new URLSearchParams({
    client_id: appId!,
    client_secret: appSecret!,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri + '/callback',
    code,
  });

  const response = await fetch('https://graph.threads.net/oauth/access_token', {
    method: 'POST',
    body: params,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Token exchange failed (${response.status}): ${text}`);
  }

  const data = await response.json() as { access_token: string };
  return data.access_token;
}

async function exchangeForLongLivedToken(shortToken: string): Promise<{ token: string; expires_in: number }> {
  const url = new URL('https://graph.threads.net/access_token');
  url.searchParams.set('grant_type', 'th_exchange_token');
  url.searchParams.set('client_secret', appSecret!);
  url.searchParams.set('access_token', shortToken);

  const response = await fetch(url.toString());

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Long-lived token exchange failed (${response.status}): ${text}`);
  }

  const data = await response.json() as { access_token: string; expires_in: number };
  return { token: data.access_token, expires_in: data.expires_in };
}

function startCallbackServer(): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      if (!req.url?.startsWith('/callback')) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }

      const url = new URL(req.url, `http://localhost:${REDIRECT_PORT}`);
      const code = url.searchParams.get('code');
      const returnedState = url.searchParams.get('state');
      const error = url.searchParams.get('error');

      if (error) {
        res.writeHead(400);
        res.end(`Authorization failed: ${error}`);
        server.close();
        reject(new Error(`Threads authorization failed: ${error}`));
        return;
      }

      if (returnedState !== state) {
        res.writeHead(400);
        res.end('State mismatch.');
        server.close();
        reject(new Error('OAuth state mismatch'));
        return;
      }

      if (!code) {
        res.writeHead(400);
        res.end('No authorization code received.');
        server.close();
        reject(new Error('No authorization code in callback'));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(
        '<html><body><h2>Threads authorization successful!</h2>' +
        '<p>You can close this tab and return to the terminal.</p></body></html>'
      );

      server.close();
      resolve(code);
    });

    server.listen(REDIRECT_PORT, () => {
      console.log(`Callback server listening on http://localhost:${REDIRECT_PORT}`);
    });

    server.on('error', (err) => {
      reject(new Error(`Failed to start callback server on port ${REDIRECT_PORT}: ${err.message}`));
    });
  });
}

async function main() {
  console.log('Threads OAuth Setup');
  console.log('===================\n');

  // Start local server first
  const codePromise = startCallbackServer();

  // Start ngrok tunnel
  const ngrokUrl = await startNgrok();
  redirectUri = ngrokUrl;
  const callbackUrl = `${ngrokUrl}/callback`;

  console.log(`\nngrok tunnel active: ${ngrokUrl}\n`);
  console.log('Add this redirect URI to your Threads app settings:');
  console.log(`\n  ${callbackUrl}\n`);
  console.log('(developers.facebook.com > Your App > Use cases > Threads API > Settings > Redirect callback URLs)\n');
  console.log('Press Enter once you\'ve added it...');

  // Wait for Enter
  await new Promise<void>((resolve) => {
    process.stdin.setRawMode?.(false);
    process.stdin.resume();
    process.stdin.once('data', () => resolve());
  });

  const authorizeUrl =
    `https://threads.net/oauth/authorize?` +
    `client_id=${encodeURIComponent(appId!)}` +
    `&redirect_uri=${encodeURIComponent(callbackUrl)}` +
    `&scope=${encodeURIComponent(SCOPES)}` +
    `&response_type=code` +
    `&state=${state}`;

  console.log('Opening Threads authorization page in your browser...\n');
  try {
    execSync(`open "${authorizeUrl}"`);
  } catch {
    console.log('Could not open browser automatically. Open this URL manually:');
    console.log(`\n  ${authorizeUrl}\n`);
  }

  console.log('Waiting for authorization callback...\n');

  try {
    const code = await codePromise;
    console.log('Authorization code received. Exchanging for short-lived token...\n');

    const shortToken = await exchangeCodeForShortLivedToken(code);
    console.log('Short-lived token received. Exchanging for long-lived token...\n');

    const { token, expires_in } = await exchangeForLongLivedToken(shortToken);
    const expiryDays = Math.floor(expires_in / 86400);

    console.log('Setup complete!\n');
    console.log('Long-lived access token (expires in ~' + expiryDays + ' days):');
    console.log(`\n  ${token}\n`);
    console.log('Add this to your .mcp.json:');
    console.log(`\n  "THREADS_ACCESS_TOKEN": "${token}"\n`);
  } catch (error) {
    console.error('Failed:', error instanceof Error ? error.message : String(error));
  }

  // Kill ngrok
  try {
    execSync('pkill -f "ngrok http"');
  } catch {
    // already dead
  }

  process.exit(0);
}

main();
