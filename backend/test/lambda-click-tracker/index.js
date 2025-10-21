// ../lambda-click-tracker/index.js
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

// PostgreSQL connection pool
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});

// Helper to set cookie
function getOrCreateCookie(headers) {
  const cookieHeader = headers.cookie || '';
  const match = cookieHeader.match(/afl_track=([a-f0-9-]+)/);
  if (match) return match[1];
  return uuidv4();
}

// Lambda handler
exports.handler = async (event) => {
  try {
    const code = event.pathParameters?.code;
    const headers = event.headers || {};
    const query = event.queryStringParameters || {};

    // Determine attribution cookie
    const trackingId = getOrCreateCookie(headers);

    // Track click in DB
    const client = await pool.connect();
    try {
      await client.query(
        `INSERT INTO clicks (short_code, tracking_id, utm_source, utm_medium, utm_campaign, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          code,
          trackingId,
          query.utm_source || null,
          query.utm_medium || null,
          query.utm_campaign || null,
          event.requestContext?.identity?.sourceIp || null,
          headers['user-agent'] || null
        ]
      );
    } finally {
      client.release();
    }

    // Redirect URL (you would fetch real destination from DB)
    const redirectUrl = `https://example.com/${code}`;

    return {
      statusCode: 302,
      headers: {
        Location: redirectUrl,
        'Set-Cookie': `afl_track=${trackingId}; Path=/; HttpOnly`
      },
      body: ''
    };
  } catch (error) {
    console.error('Lambda error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
