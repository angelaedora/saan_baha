'use strict';

/**
 * Lambda@Edge — Viewer Request handler
 *
 * Protects /floodmap.html by validating the Cognito JWT stored in the
 * "auth-token" cookie.  Unauthenticated requests are redirected to /.
 *
 * Deploy this function in us-east-1 and attach it to the CloudFront
 * distribution's Viewer Request event for the /floodmap.html behavior.
 *
 * Dependencies: jsonwebtoken, jwks-rsa
 * Bundle with: npm ci && zip -r auth.zip auth.js node_modules/
 */

const jwt     = require('jsonwebtoken');
const jwksRsa = require('jwks-rsa');

// ─── CONFIG — set these to match your Cognito User Pool ───────────────────────
const COGNITO_REGION = 'ap-southeast-1';        // e.g. 'ap-southeast-1'
const USER_POOL_ID   = 'REPLACE_USER_POOL_ID';  // e.g. 'ap-southeast-1_AbCdEfGh'
const APP_CLIENT_ID  = 'REPLACE_APP_CLIENT_ID'; // e.g. '3t6o8p2q1r4s5u7v9w0x'
// ─────────────────────────────────────────────────────────────────────────────

const JWKS_URI = `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/${USER_POOL_ID}/.well-known/jwks.json`;
const ISSUER   = `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/${USER_POOL_ID}`;

const jwksClient = jwksRsa({
    jwksUri: JWKS_URI,
    cache:   true,
    rateLimit: true,
    jwksRequestsPerMinute: 5
});

/** Fetch the RSA public key for a given JWT kid */
function getSigningKey(kid) {
    return new Promise((resolve, reject) => {
        jwksClient.getSigningKey(kid, (err, key) => {
            if (err) return reject(err);
            resolve(key.getPublicKey());
        });
    });
}

/** Parse "name=value" pairs from a Cookie header string */
function parseCookies(cookieHeader) {
    const cookies = {};
    if (!cookieHeader) return cookies;
    cookieHeader.split(';').forEach(pair => {
        const [name, ...rest] = pair.trim().split('=');
        if (name) cookies[name.trim()] = decodeURIComponent(rest.join('='));
    });
    return cookies;
}

/** Return a 302 redirect response to the login page */
function redirectToLogin() {
    return {
        status: '302',
        statusDescription: 'Found',
        headers: {
            location: [{ key: 'Location', value: '/' }],
            'cache-control': [{ key: 'Cache-Control', value: 'no-store' }]
        }
    };
}

exports.handler = async (event) => {
    const request = event.Records[0].cf.request;
    const uri     = request.uri;

    // Only protect /floodmap.html — pass everything else through
    if (uri !== '/floodmap.html') {
        return request;
    }

    // ── Extract token from cookie ─────────────────────────────────────────────
    const cookieHeader = (request.headers.cookie || []).map(h => h.value).join('; ');
    const cookies      = parseCookies(cookieHeader);
    const token        = cookies['auth-token'];

    if (!token) {
        console.log('auth: no token cookie — redirecting to login');
        return redirectToLogin();
    }

    // ── Decode header to get kid (key ID) ────────────────────────────────────
    let decoded;
    try {
        decoded = jwt.decode(token, { complete: true });
    } catch (e) {
        console.log('auth: malformed token —', e.message);
        return redirectToLogin();
    }

    if (!decoded || !decoded.header || !decoded.header.kid) {
        console.log('auth: token missing kid');
        return redirectToLogin();
    }

    // ── Fetch Cognito public key and verify ──────────────────────────────────
    let signingKey;
    try {
        signingKey = await getSigningKey(decoded.header.kid);
    } catch (e) {
        console.error('auth: failed to fetch JWKS —', e.message);
        // Fail open only on JWKS fetch errors to avoid locking users out
        // during transient Cognito outages. Remove the return below for
        // stricter enforcement.
        return redirectToLogin();
    }

    try {
        jwt.verify(token, signingKey, {
            algorithms: ['RS256'],
            issuer:     ISSUER,
            audience:   APP_CLIENT_ID
        });
    } catch (e) {
        console.log('auth: token invalid —', e.message);
        return redirectToLogin();
    }

    // ── Valid token — allow the request ──────────────────────────────────────
    console.log('auth: valid token — allowing access to', uri);
    return request;
};
