// Decap CMS OAuth Proxy for Cloudflare Workers
// Based on: https://github.com/i40west/netlify-cms-cloudflare-pages

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // OAuth flow endpoints
    if (url.pathname === '/auth') {
      return handleAuth(url, env, corsHeaders);
    }
    
    if (url.pathname === '/callback') {
      return handleCallback(url, env, corsHeaders);
    }

    // Health check
    if (url.pathname === '/') {
      return new Response('Decap CMS OAuth Proxy', { headers: corsHeaders });
    }

    return new Response('Not Found', { status: 404, headers: corsHeaders });
  }
};

// Handle /auth - redirect to GitHub OAuth
function handleAuth(url, env, corsHeaders) {
  const clientId = env.OAUTH_CLIENT_ID;
  const provider = url.searchParams.get('provider') || 'github';
  
  if (provider !== 'github') {
    return new Response('Only GitHub provider is supported', { 
      status: 400, 
      headers: corsHeaders 
    });
  }

  // Build GitHub OAuth URL
  const authUrl = new URL('https://github.com/login/oauth/authorize');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('scope', 'repo,user');
  authUrl.searchParams.set('redirect_uri', `${url.origin}/callback`);

  return Response.redirect(authUrl.toString(), 302);
}

// Handle /callback - exchange code for token
async function handleCallback(url, env, corsHeaders) {
  const code = url.searchParams.get('code');
  
  if (!code) {
    return new Response('Missing code parameter', { 
      status: 400, 
      headers: corsHeaders 
    });
  }

  const clientId = env.OAUTH_CLIENT_ID;
  const clientSecret = env.OAUTH_CLIENT_SECRET;

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
      }),
    });

    const data = await tokenResponse.json();

    if (data.error) {
      return new Response(JSON.stringify(data), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Return success page that posts message to parent window
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Authorization Complete</title>
  <script>
    (function() {
      function receiveMessage(e) {
        console.log("receiveMessage %o", e);
        window.opener.postMessage(
          'authorization:github:success:${JSON.stringify(data)}',
          e.origin
        );
        window.removeEventListener("message", receiveMessage, false);
      }
      window.addEventListener("message", receiveMessage, false);
      console.log("Posting message to opener");
      window.opener.postMessage("authorizing:github", "*");
    })();
  </script>
</head>
<body>
  <p>Authorization complete. You may close this window.</p>
</body>
</html>
    `;

    return new Response(html, {
      headers: { ...corsHeaders, 'Content-Type': 'text/html' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
