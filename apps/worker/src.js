const SESSION_DAYS = 30;
const PBKDF2_ITERATIONS = 100000;
const PASSWORD_MIN_LENGTH = 8;

const ALLOWED_ACCOUNT_EXPERIENCES = new Set([
  "player",
  "player_promoter",
]);

const LOCAL_FRONTEND_ORIGINS = new Set([
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

function getAllowedOrigin(request) {
  const origin = request.headers.get("Origin");

  if (!origin) {
    return null;
  }

  if (LOCAL_FRONTEND_ORIGINS.has(origin)) {
    return origin;
  }

  /*
   * Jenny's Casino will eventually run on Cloudflare Pages.
   * Allow Cloudflare Pages origins while keeping credentials enabled.
   */
  try {
    const parsed = new URL(origin);

    if (
      parsed.protocol === "https:" &&
      parsed.hostname.endsWith(".pages.dev")
    ) {
      return origin;
    }
  } catch {
    return null;
  }

  return null;
}

function corsHeaders(request) {
  const origin = getAllowedOrigin(request);

  const headers = {
    "Access-Control-Allow-Methods":
      "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
    "Vary": "Origin",
  };

  if (origin) {
    headers["Access-Control-Allow-Origin"] = origin;
  }

  return headers;
}

const json = (request, data, status = 200, extraHeaders = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders(request),
      ...extraHeaders,
    },
  });

const errorResponse = (request, message, status = 400) =>
  json(
    request,
    {
      ok: false,
      error: message,
    },
    status
  );

function generateId() {
  return crypto.randomUUID();
}

function generateToken() {
  const bytes = new Uint8Array(32);

  crypto.getRandomValues(bytes);

  return Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}

function base64UrlEncode(bytes) {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(value) {
  const normalized = value
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const padded =
    normalized +
    "=".repeat((4 - (normalized.length % 4)) % 4);

  const binary = atob(padded);

  return Uint8Array.from(binary, (char) =>
    char.charCodeAt(0)
  );
}

async function hashToken(token) {
  const data = new TextEncoder().encode(token);

  const digest = await crypto.subtle.digest(
    "SHA-256",
    data
  );

  return base64UrlEncode(new Uint8Array(digest));
}

async function hashPassword(password) {
  const salt = new Uint8Array(16);

  crypto.getRandomValues(salt);

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    256
  );

  return [
    "pbkdf2",
    "sha256",
    PBKDF2_ITERATIONS,
    base64UrlEncode(salt),
    base64UrlEncode(new Uint8Array(derivedBits)),
  ].join("$");
}

async function verifyPassword(password, storedHash) {
  try {
    const parts = storedHash.split("$");

    if (parts.length !== 5) {
      return false;
    }

    const [
      algorithm,
      hashAlgorithm,
      iterationsString,
      saltEncoded,
      hashEncoded,
    ] = parts;

    if (
      algorithm !== "pbkdf2" ||
      hashAlgorithm !== "sha256"
    ) {
      return false;
    }

    const iterations = Number(iterationsString);

    if (
      !Number.isInteger(iterations) ||
      iterations <= 0 ||
      iterations > PBKDF2_ITERATIONS
    ) {
      return false;
    }

    const salt = base64UrlDecode(saltEncoded);
    const expectedHash = base64UrlDecode(hashEncoded);

    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(password),
      "PBKDF2",
      false,
      ["deriveBits"]
    );

    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt,
        iterations,
        hash: "SHA-256",
      },
      keyMaterial,
      256
    );

    const actualHash = new Uint8Array(derivedBits);

    if (actualHash.length !== expectedHash.length) {
      return false;
    }

    let difference = 0;

    for (let i = 0; i < actualHash.length; i++) {
      difference |= actualHash[i] ^ expectedHash[i];
    }

    return difference === 0;
  } catch {
    return false;
  }
}

function parseCookies(request) {
  const header = request.headers.get("Cookie") || "";

  const cookies = {};

  for (const part of header.split(";")) {
    const index = part.indexOf("=");

    if (index === -1) {
      continue;
    }

    const name = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();

    cookies[name] = value;
  }

  return cookies;
}

function getSessionToken(request) {
  const cookies = parseCookies(request);

  if (cookies.jennys_session) {
    return cookies.jennys_session;
  }

  const authorization =
    request.headers.get("Authorization") || "";

  if (authorization.startsWith("Bearer ")) {
    return authorization.slice(7).trim();
  }

  return null;
}

function sessionCookie(token) {
  return [
    `jennys_session=${token}`,
    "HttpOnly",
    "Secure",
    "SameSite=None",
    "Path=/",
    `Max-Age=${SESSION_DAYS * 24 * 60 * 60}`,
  ].join("; ");
}

function clearSessionCookie() {
  return [
    "jennys_session=",
    "HttpOnly",
    "Secure",
    "SameSite=None",
    "Path=/",
    "Max-Age=0",
  ].join("; ");
}

async function getRequestBody(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function cleanString(value, maxLength = 255) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, maxLength);
}

function normalizeEmail(value) {
  return cleanString(value, 254).toLowerCase();
}

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validPassword(password) {
  return (
    typeof password === "string" &&
    password.length >= PASSWORD_MIN_LENGTH &&
    password.length <= 128
  );
}

function validName(name) {
  return (
    typeof name === "string" &&
    name.trim().length >= 1 &&
    name.trim().length <= 100
  );
}

async function getUserRoles(env, userId) {
  const result = await env.DB.prepare(
    `
      SELECT r.name
      FROM user_roles ur
      INNER JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = ?
      ORDER BY r.name
    `
  )
    .bind(userId)
    .all();

  return result.results.map((row) => row.name);
}

async function getAuthenticatedUser(request, env) {
  const token = getSessionToken(request);

  if (!token) {
    return null;
  }

  const tokenHash = await hashToken(token);

  const result = await env.DB.prepare(
    `
      SELECT
        s.id AS session_id,
        s.user_id,
        s.expires_at,
        u.email,
        u.first_name,
        u.last_name,
        u.phone,
        u.status,
        u.email_verified
      FROM sessions s
      INNER JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ?
      LIMIT 1
    `
  )
    .bind(tokenHash)
    .all();

  const row = result.results[0];

  if (!row) {
    return null;
  }

  if (
    new Date(row.expires_at).getTime() <=
    Date.now()
  ) {
    await env.DB.prepare(
      "DELETE FROM sessions WHERE id = ?"
    )
      .bind(row.session_id)
      .run();

    return null;
  }

  if (row.status !== "active") {
    return null;
  }

  await env.DB.prepare(
    `
      UPDATE sessions
      SET last_seen_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `
  )
    .bind(row.session_id)
    .run();

  const roles = await getUserRoles(
    env,
    row.user_id
  );

  return {
    sessionId: row.session_id,
    id: row.user_id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone,
    status: row.status,
    emailVerified: Boolean(row.email_verified),
    roles,
  };
}

async function createSession(request, env, userId) {
  const token = generateToken();

  const tokenHash = await hashToken(token);

  const sessionId = generateId();

  const expiresAt = new Date(
    Date.now() +
      SESSION_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  const ipAddress =
    request.headers.get("CF-Connecting-IP") ||
    null;

  const userAgent =
    request.headers.get("User-Agent") || null;

  await env.DB.prepare(
    `
      INSERT INTO sessions
      (
        id,
        user_id,
        token_hash,
        expires_at,
        ip_address,
        user_agent
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `
  )
    .bind(
      sessionId,
      userId,
      tokenHash,
      expiresAt,
      ipAddress,
      userAgent
    )
    .run();

  return {
    token,
    expiresAt,
  };
}

async function audit(
  env,
  {
    userId = null,
    action,
    entityType = null,
    entityId = null,
    metadata = null,
  }
) {
  try {
    await env.DB.prepare(
      `
        INSERT INTO audit_logs
        (
          id,
          user_id,
          action,
          entity_type,
          entity_id,
          metadata
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `
    )
      .bind(
        generateId(),
        userId,
        action,
        entityType,
        entityId,
        metadata
          ? JSON.stringify(metadata)
          : null
      )
      .run();
  } catch {
    // Audit failures must not break the primary request.
  }
}

async function assignRole(env, userId, roleName) {
  const role = await env.DB.prepare(
    "SELECT id FROM roles WHERE name = ? LIMIT 1"
  )
    .bind(roleName)
    .first();

  if (!role) {
    throw new Error(
      `Role '${roleName}' does not exist.`
    );
  }

  await env.DB.prepare(
    `
      INSERT OR IGNORE INTO user_roles
      (
        user_id,
        role_id
      )
      VALUES (?, ?)
    `
  )
    .bind(userId, role.id)
    .run();
}

async function register(request, env) {
  const body = await getRequestBody(request);

  if (!body) {
    return errorResponse(
      request,
      "Invalid JSON request."
    );
  }

  const email = normalizeEmail(body.email);
  const password = body.password;

  const firstName = cleanString(
    body.firstName,
    100
  );

  const lastName = cleanString(
    body.lastName,
    100
  );

  const phone =
    cleanString(body.phone, 30) || null;

  const accountExperience = cleanString(
    body.accountExperience,
    30
  );

  const displayName =
    cleanString(body.displayName, 100) ||
    null;

  if (!validEmail(email)) {
    return errorResponse(
      request,
      "Please enter a valid email address."
    );
  }

  if (!validPassword(password)) {
    return errorResponse(
      request,
      `Password must be between ${PASSWORD_MIN_LENGTH} and 128 characters.`
    );
  }

  if (!validName(firstName)) {
    return errorResponse(
      request,
      "First name is required."
    );
  }

  if (!validName(lastName)) {
    return errorResponse(
      request,
      "Last name is required."
    );
  }

  if (
    !ALLOWED_ACCOUNT_EXPERIENCES.has(
      accountExperience
    )
  ) {
    return errorResponse(
      request,
      "Invalid account experience. Choose player or player_promoter."
    );
  }

  const existing = await env.DB.prepare(
    "SELECT id FROM users WHERE email = ? LIMIT 1"
  )
    .bind(email)
    .first();

  if (existing) {
    return errorResponse(
      request,
      "An account with this email already exists.",
      409
    );
  }

  const userId = generateId();

  const passwordHash =
    await hashPassword(password);

  const playerReferralCode =
    `JENNY${crypto
      .randomUUID()
      .replace(/-/g, "")
      .slice(0, 8)
      .toUpperCase()}`;

  try {
    await env.DB.prepare(
      `
        INSERT INTO users
        (
          id,
          email,
          password_hash,
          first_name,
          last_name,
          phone
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `
    )
      .bind(
        userId,
        email,
        passwordHash,
        firstName,
        lastName,
        phone
      )
      .run();

    await assignRole(
      env,
      userId,
      "player"
    );

    await env.DB.prepare(
      `
        INSERT INTO player_profiles
        (
          user_id,
          display_name,
          referral_code
        )
        VALUES (?, ?, ?)
      `
    )
      .bind(
        userId,
        displayName ||
          `${firstName} ${lastName}`,
        playerReferralCode
      )
      .run();

    if (
      accountExperience ===
      "player_promoter"
    ) {
      await assignRole(
        env,
        userId,
        "promoter"
      );

      const promoterCode =
        `PROMO${crypto
          .randomUUID()
          .replace(/-/g, "")
          .slice(0, 8)
          .toUpperCase()}`;

      await env.DB.prepare(
        `
          INSERT INTO promoter_profiles
          (
            user_id,
            promoter_code,
            display_name
          )
          VALUES (?, ?, ?)
        `
      )
        .bind(
          userId,
          promoterCode,
          displayName ||
            `${firstName} ${lastName}`
        )
        .run();
    }

    const session = await createSession(
      request,
      env,
      userId
    );

    await audit(env, {
      userId,
      action: "auth.register",
      entityType: "user",
      entityId: userId,
      metadata: {
        accountExperience,
      },
    });

    const authenticatedRequest =
      new Request(request.url, {
        headers: {
          Authorization:
            `Bearer ${session.token}`,
        },
      });

    const user =
      await getAuthenticatedUser(
        authenticatedRequest,
        env
      );

    return json(
      request,
      {
        ok: true,
        message:
          "Account created successfully.",
        user,
      },
      201,
      {
        "Set-Cookie":
          sessionCookie(session.token),
      }
    );
  } catch (error) {
    await env.DB.prepare(
      "DELETE FROM users WHERE id = ?"
    )
      .bind(userId)
      .run();

    console.error(
      "Registration error:",
      error
    );

    return errorResponse(
      request,
      "Unable to create the account. Please try again.",
      500
    );
  }
}

async function login(request, env) {
  const body = await getRequestBody(request);

  if (!body) {
    return errorResponse(
      request,
      "Invalid JSON request."
    );
  }

  const email = normalizeEmail(body.email);
  const password = body.password;

  if (
    !validEmail(email) ||
    typeof password !== "string"
  ) {
    return errorResponse(
      request,
      "Invalid email or password.",
      401
    );
  }

  const user = await env.DB.prepare(
    `
      SELECT
        id,
        email,
        password_hash,
        first_name,
        last_name,
        phone,
        status,
        email_verified
      FROM users
      WHERE email = ?
      LIMIT 1
    `
  )
    .bind(email)
    .first();

  if (!user) {
    return errorResponse(
      request,
      "Invalid email or password.",
      401
    );
  }

  const passwordMatches =
    await verifyPassword(
      password,
      user.password_hash
    );

  if (!passwordMatches) {
    await audit(env, {
      action: "auth.login_failed",
      entityType: "user",
      entityId: user.id,
    });

    return errorResponse(
      request,
      "Invalid email or password.",
      401
    );
  }

  if (user.status !== "active") {
    return errorResponse(
      request,
      "This account is not currently active.",
      403
    );
  }

  await env.DB.prepare(
    `
      UPDATE users
      SET
        last_login_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `
  )
    .bind(user.id)
    .run();

  const session = await createSession(
    request,
    env,
    user.id
  );

  await audit(env, {
    userId: user.id,
    action: "auth.login",
    entityType: "user",
    entityId: user.id,
  });

  const roles = await getUserRoles(
    env,
    user.id
  );

  return json(
    request,
    {
      ok: true,
      message: "Login successful.",
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        status: user.status,
        emailVerified:
          Boolean(user.email_verified),
        roles,
      },
    },
    200,
    {
      "Set-Cookie":
        sessionCookie(session.token),
    }
  );
}

async function me(request, env) {
  const user =
    await getAuthenticatedUser(
      request,
      env
    );

  if (!user) {
    return errorResponse(
      request,
      "Authentication required.",
      401
    );
  }

  const playerProfile =
    await env.DB.prepare(
      `
        SELECT
          user_id,
          display_name,
          date_of_birth,
          referral_code,
          marketing_opt_in
        FROM player_profiles
        WHERE user_id = ?
        LIMIT 1
      `
    )
      .bind(user.id)
      .first();

  const promoterProfile =
    await env.DB.prepare(
      `
        SELECT
          user_id,
          promoter_code,
          display_name,
          status,
          commission_rate
        FROM promoter_profiles
        WHERE user_id = ?
        LIMIT 1
      `
    )
      .bind(user.id)
      .first();

  return json(request, {
    ok: true,
    authenticated: true,
    user,
    playerProfile:
      playerProfile || null,
    promoterProfile:
      promoterProfile || null,
  });
}

async function logout(request, env) {
  const token = getSessionToken(request);

  if (token) {
    const tokenHash =
      await hashToken(token);

    const session = await env.DB.prepare(
      `
        SELECT id, user_id
        FROM sessions
        WHERE token_hash = ?
        LIMIT 1
      `
    )
      .bind(tokenHash)
      .first();

    await env.DB.prepare(
      "DELETE FROM sessions WHERE token_hash = ?"
    )
      .bind(tokenHash)
      .run();

    if (session) {
      await audit(env, {
        userId: session.user_id,
        action: "auth.logout",
        entityType: "session",
        entityId: session.id,
      });
    }
  }

  return json(
    request,
    {
      ok: true,
      message:
        "Logged out successfully.",
    },
    200,
    {
      "Set-Cookie":
        clearSessionCookie(),
    }
  );
}

async function cleanupExpiredSessions(env) {
  try {
    await env.DB.prepare(
      `
        DELETE FROM sessions
        WHERE expires_at <= CURRENT_TIMESTAMP
      `
    ).run();
  } catch {
    // Cleanup is best-effort.
  }
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(request),
      });
    }

    const url = new URL(request.url);

    try {
      await cleanupExpiredSessions(env);

      if (
        url.pathname === "/api/health" &&
        request.method === "GET"
      ) {
        return json(request, {
          ok: true,
          service:
            "jennys-casino-api",
          database: "connected",
        });
      }

      if (
        url.pathname === "/api/db-test" &&
        request.method === "GET"
      ) {
        const result =
          await env.DB.prepare(
            `
              SELECT name
              FROM sqlite_master
              WHERE type='table'
                AND name NOT LIKE '_cf_%'
              ORDER BY name
            `
          ).all();

        return json(request, {
          ok: true,
          database: "connected",
          tables: result.results,
        });
      }

      if (
        url.pathname ===
          "/api/auth/register" &&
        request.method === "POST"
      ) {
        return await register(
          request,
          env
        );
      }

      if (
        url.pathname ===
          "/api/auth/login" &&
        request.method === "POST"
      ) {
        return await login(
          request,
          env
        );
      }

      if (
        url.pathname ===
          "/api/auth/me" &&
        request.method === "GET"
      ) {
        return await me(
          request,
          env
        );
      }

      if (
        url.pathname ===
          "/api/auth/logout" &&
        request.method === "POST"
      ) {
        return await logout(
          request,
          env
        );
      }

      return json(request, {
        ok: true,
        service:
          "jennys-casino-api",
        message:
          "API is running.",
      });
    } catch (error) {
      console.error(
        "Unhandled API error:",
        error
      );

      return errorResponse(
        request,
        "An unexpected server error occurred.",
        500
      );
    }
  },
};