const API_BASE = "https://jennys-casino-api.onlineorg.workers.dev";

const FB_JACKPOT =
  "https://www.facebook.com/JackpotHUBGaming?mibextid=wwXIfr&mibextid=wwXIfr";

const FB_JENNY =
  "https://www.facebook.com/profile.php?id=61593623518997&mibextid=wwXIfr&mibextid=wwXIfr";

let me = null;
let route = "home";
let dashTab = "Dashboard";

/* ============================================================
   HELPERS
============================================================ */

const $ = (s) => document.querySelector(s);

function esc(v) {
  return String(v ?? "").replace(/[&<>"']/g, (m) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[m]));
}

function go(r) {
  location.hash = r;
}

function openExternal(url) {
  window.open(url, "_blank", "noopener,noreferrer");
}

async function api(path, opt = {}) {
  const r = await fetch(API_BASE + path, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(opt.headers || {})
    },
    ...opt,
    body:
      opt.body && typeof opt.body !== "string"
        ? JSON.stringify(opt.body)
        : opt.body
  });

  let d = {};

  try {
    d = await r.json();
  } catch {}

  if (!r.ok) {
    throw new Error(
      d.error ||
      d.message ||
      `Request failed (${r.status})`
    );
  }

  return d;
}

function notify(message, ok = true) {
  const n = document.createElement("div");

  n.className = `message ${ok ? "success" : "error"}`;
  n.textContent = message;

  n.style.position = "fixed";
  n.style.right = "18px";
  n.style.bottom = "18px";
  n.style.zIndex = "9999";
  n.style.maxWidth = "360px";

  document.body.appendChild(n);

  setTimeout(() => n.remove(), 3500);
}

/* ============================================================
   REFERRALS
============================================================ */

function referral() {
  const q = new URLSearchParams(location.search);

  if (q.get("ref")) {
    return q.get("ref").trim().toUpperCase();
  }

  const h = location.hash.split("?")[1] || "";

  return (
    new URLSearchParams(h).get("ref") || ""
  ).trim().toUpperCase();
}

function routeName() {
  const h = location.hash.replace(/^#/, "");

  return (
    h.split("?")[0] || "home"
  ).toLowerCase() || "home";
}

async function trackReferral() {
  const code = referral();

  if (!code) return;

  let sid = localStorage.getItem("jc_ref_session");

  if (!sid) {
    sid = crypto.randomUUID();
    localStorage.setItem("jc_ref_session", sid);
  }

  const key = `jc_ref_${code}`;

  const last = Number(
    localStorage.getItem(key) || 0
  );

  if (Date.now() - last < 1800000) {
    return;
  }

  try {
    await api("/api/referrals/click", {
      method: "POST",
      body: {
        referralCode: code,
        sessionIdentifier: sid,
        source: document.referrer || "direct",
        campaign: "promoter",
        landingPage: location.href
      }
    });

    localStorage.setItem(
      key,
      String(Date.now())
    );
  } catch (e) {
    console.warn(
      "Referral tracking failed",
      e
    );
  }
}

/* ============================================================
   AUTH
============================================================ */

async function loadMe(){

  try{

    const d = await api(
      "/api/auth/me"
    );

    /*
     * Only replace the current user when
     * the API actually confirms authentication.
     *
     * NEVER destroy an already-valid local
     * login state because of a temporary
     * /auth/me failure.
     */
    if(
      d &&
      d.authenticated === true &&
      d.user
    ){

      me = d;

      return d;
    }

    /*
     * If there is no existing authenticated
     * user, leave me as null.
     *
     * If a user is already logged in locally,
     * DO NOT erase that state.
     */
    return null;

  }catch(error){

    console.warn(
      "Session refresh failed; keeping current login state.",
      error
    );

    /*
     * IMPORTANT:
     * Do NOT do:
     *
     *     me = null;
     *
     * here.
     */

    return null;
  }
}

/* ============================================================
   HEADER
============================================================ */

function header() {
  return `
    <header class="top">
      <div
        class="container"
        style="display:flex;align-items:center;width:100%"
      >

        <a
          class="brand"
          href="#home"
        >
          Jenny's Casino
        </a>

        <nav class="nav">

          <button
            class="btn ghost desktop"
            onclick="go('faq')"
          >
            FAQ
          </button>

          ${
            me
              ?
              `
                <button
                  class="btn secondary"
                  onclick="go('${defaultDash()}')"
                >
                  Dashboard
                </button>

                <button
                  class="btn ghost"
                  onclick="logout()"
                >
                  Sign out
                </button>
              `
              :
              `
                <button
                  class="btn secondary"
                  onclick="go('login')"
                >
                  Login
                </button>

                <button
                  class="btn primary"
                  onclick="go('register')"
                >
                  Create account
                </button>
              `
          }

        </nav>

      </div>
    </header>
  `;
}

/* ============================================================
   HOME
============================================================ */

function home() {
  return header() + `

    <main>

      <section class="hero">

        <div class="container">

          <span class="pill">
            PREMIUM ACCOUNT PORTAL
          </span>

          <h1>
            Your account.<br>
            Your rewards.<br>
            Your dashboard.
          </h1>

          <p>
            Manage player loyalty, VIP progress,
            rewards, referrals and promoter
            performance from one secure account.
          </p>

          <div class="actions">

            <button
              class="btn primary"
              onclick="go('register')"
            >
              Create account
            </button>

            <button
              class="btn secondary"
              onclick="go('login')"
            >
              Sign in
            </button>

          </div>

        </div>

      </section>

      <section class="section">

        <div class="container grid g3">

          <div class="card">

            <div class="label">
              Player
            </div>

            <h3>
              Loyalty & VIP
            </h3>

            <p class="muted">
              Track points, VIP progress,
              rewards and activity.
            </p>

          </div>

          <div class="card">

            <div class="label">
              Promoter
            </div>

            <h3>
              Referral analytics
            </h3>

            <p class="muted">
              Track clicks, registrations,
              qualified referrals and commissions.
            </p>

          </div>

          <div class="card">

            <div class="label">
              Secure
            </div>

            <h3>
              Account controls
            </h3>

            <p class="muted">
              Server-side authorization,
              sessions and audit logging.
            </p>

          </div>

        </div>

      </section>

      <section
        class="section"
        style="padding-top:10px"
      >

        <div class="container">

          <div class="card">

            <div class="label">
              STAY CONNECTED
            </div>

            <h2 style="margin:8px 0 6px">
              Follow our official Facebook pages
            </h2>

            <p class="muted">
              Stay updated with promotions,
              announcements and official page updates.
            </p>

            <div
              class="grid g2"
              style="margin-top:18px"
            >

              <a
                href="${FB_JACKPOT}"
                target="_blank"
                rel="noopener noreferrer"
                class="card"
                style="
                  text-decoration:none;
                  color:inherit;
                  box-shadow:none;
                  border:1px solid #dfe8f2
                "
              >

                <div
                  style="
                    display:flex;
                    align-items:center;
                    gap:14px
                  "
                >

                  <span
                    style="
                      width:44px;
                      height:44px;
                      border-radius:12px;
                      background:#edf5ff;
                      color:#1877f2;
                      display:grid;
                      place-items:center;
                      font-size:26px;
                      font-weight:800
                    "
                  >
                    f
                  </span>

                  <span>

                    <strong style="display:block">
                      Jackpot Hub Gaming
                    </strong>

                    <small class="muted">
                      Official Facebook page ↗
                    </small>

                  </span>

                </div>

              </a>

              <a
                href="${FB_JENNY}"
                target="_blank"
                rel="noopener noreferrer"
                class="card"
                style="
                  text-decoration:none;
                  color:inherit;
                  box-shadow:none;
                  border:1px solid #dfe8f2
                "
              >

                <div
                  style="
                    display:flex;
                    align-items:center;
                    gap:14px
                  "
                >

                  <span
                    style="
                      width:44px;
                      height:44px;
                      border-radius:12px;
                      background:#edf5ff;
                      color:#1877f2;
                      display:grid;
                      place-items:center;
                      font-size:26px;
                      font-weight:800
                    "
                  >
                    f
                  </span>

                  <span>

                    <strong style="display:block">
                      Jenny Sweeps
                    </strong>

                    <small class="muted">
                      Official Facebook page ↗
                    </small>

                  </span>

                </div>

              </a>

            </div>

            <div
              class="small muted"
              style="
                margin-top:18px;
                text-align:center
              "
            >
              © 2026 Jenny's Casino.
              Independent portal.
            </div>

          </div>

        </div>

      </section>

    </main>
  `;
}

/* ============================================================
   AUTH PAGES
============================================================ */

function authPage(kind) {
  const reg = kind === "register";

  return header() + `

    <main class="container">

      <div class="card form">

        <h2>
          ${reg ? "Create your account" : "Welcome back"}
        </h2>

        <p class="muted">
          ${
            reg
              ? "Set up your Jenny's Casino account."
              : "Sign in to continue."
          }
        </p>

        <div id="msg"></div>

        <form
          onsubmit="${
            reg
              ? "registerSubmit(event)"
              : "loginSubmit(event)"
          }"
        >

          ${
            reg
              ?
              `
                <div class="grid g2">

                  <div class="field">

                    <label>
                      First name
                    </label>

                    <input
                      id="first"
                      required
                    >

                  </div>

                  <div class="field">

                    <label>
                      Last name
                    </label>

                    <input
                      id="last"
                      required
                    >

                  </div>

                </div>

                <div class="field">

                  <label>
                    Phone
                  </label>

                  <input id="phone">

                </div>
              `
              :
              ""
          }

          <div class="field">

            <label>
              Email
            </label>

            <input
              id="email"
              type="email"
              autocomplete="email"
              required
            >

          </div>

          <div class="field">

            <label>
              Password
            </label>

            <input
              id="password"
              type="password"
              autocomplete="${
                reg ? "new-password" : "current-password"
              }"
              minlength="8"
              required
            >

          </div>

          ${
            reg
              ?
              `
                <div class="field">

                  <label>
                    Account type
                  </label>

                  <select id="experience">

                    <option value="player">
                      Player
                    </option>

                    <option value="player_promoter">
                      Player + Promoter
                    </option>

                  </select>

                </div>

                <label class="small">

                  <input
                    id="terms"
                    type="checkbox"
                    required
                  >

                  I agree to the Terms,
                  Privacy and Responsible Play guidelines.

                </label>
              `
              :
              ""
          }

          <div style="margin-top:18px">

            <button
              id="authSubmit"
              class="btn primary"
              type="submit"
            >
              ${reg ? "Create account" : "Sign in"}
            </button>

          </div>

        </form>

        <p
          class="muted small"
          style="margin-top:18px"
        >

          ${
            reg
              ? "Already have an account?"
              : "New here?"
          }

          <a
            href="#${reg ? "login" : "register"}"
          >
            ${
              reg
                ? "Sign in"
                : "Create an account"
            }
          </a>

        </p>

      </div>

    </main>
  `;
}

/* ============================================================
   LOGIN
   IMPORTANT: THIS IS OUTSIDE authPage()
============================================================ */

async function loginSubmit(e){

  e.preventDefault();

  const form = e.currentTarget;
  const button = form?.querySelector('button[type="submit"]');

  try{

    if(button){
      button.disabled = true;
      button.textContent = "Signing in...";
    }

    const email = $("#email")
      .value
      .trim()
      .toLowerCase();

    const password = $("#password").value;

    if(!email || !password){
      throw new Error(
        "Please enter your email and password."
      );
    }

    /*
     * Authenticate with the API.
     */
    const d = await api(
      "/api/auth/login",
      {
        method: "POST",
        body: {
          email,
          password
        }
      }
    );

    if(!d?.ok || !d?.user){
      throw new Error(
        d?.error ||
        d?.message ||
        "Unable to sign in."
      );
    }

    /*
     * The login endpoint already returns the
     * authenticated user. Use that response
     * immediately instead of requiring a second
     * /auth/me request before changing pages.
     */
    me = {
      authenticated: true,
      user: d.user,
      playerProfile: null,
      promoterProfile: null
    };

    /*
     * Set the correct starting dashboard.
     */
    if(me.user.roles?.includes("admin")){

      dashTab = "Dashboard";

      go("admin-dashboard");

    }else if(me.user.roles?.includes("promoter")){

      dashTab = "Overview";

      go("promoter-dashboard");

    }else{

      dashTab = "Dashboard";

      go("player-dashboard");

    }

        /*
     * Refresh the authenticated session in the
     * background. This loads the player/promoter
     * profiles without blocking the dashboard redirect.
     *
     * IMPORTANT:
     * A temporary /auth/me failure must NEVER
     * send the user back to the login page.
     */
    void loadMe();

    notify("Welcome back.");

  }catch(x){

    console.error("Login error:", x);

    const msg = $("#msg");

    if(msg){

      msg.innerHTML =
        `<div class="message error">
          ${esc(
            x?.message ||
            "Unable to sign in."
          )}
        </div>`;
    }

  }finally{

    if(button){

      button.disabled = false;
      button.textContent = "Sign in";

    }

  }
}

async function registerSubmit(e) {
  e.preventDefault();

  const button =
    e.submitter || $("#authSubmit");

  const msg = $("#msg");

  try {

    if (button) {
      button.disabled = true;
      button.textContent = "Creating account...";
    }

    const email =
      $("#email")
        .value
        .trim()
        .toLowerCase();

    const d =
      await api(
        "/api/auth/register",
        {
          method: "POST",
          body: {
            firstName:
              $("#first").value.trim(),

            lastName:
              $("#last").value.trim(),

            email,

            phone:
              $("#phone").value.trim(),

            password:
              $("#password").value,

            accountExperience:
              $("#experience").value,

            referralCode:
              referral() || null
          }
        }
      );

    if (!d.ok) {
      throw new Error(
        d.error ||
        "Unable to create account."
      );
    }

    await loadMe();

    go(defaultDash());

    notify(
      referral()
        ? "Account created and referral recorded."
        : "Account created successfully."
    );

  } catch (x) {

    if (msg) {

      msg.innerHTML = `
        <div class="message error">
          ${esc(
            x?.message ||
            "Unable to create account."
          )}
        </div>
      `;
    }

    if (button) {
      button.disabled = false;
      button.textContent = "Create account";
    }
  }
}

/* ============================================================
   DEFAULT DASHBOARD
============================================================ */

function defaultDash() {

  const roles =
    me?.user?.roles || [];

  if (roles.includes("admin")) {
    return "admin-dashboard";
  }

  if (roles.includes("promoter")) {
    return "promoter-dashboard";
  }

  return "player-dashboard";
}

/* ============================================================
   LOGOUT
============================================================ */

async function logout() {

  try {

    await api(
      "/api/auth/logout",
      {
        method: "POST",
        body: {}
      }
    );

  } catch {}

  me = null;

  go("home");
}

/* ============================================================
   DASHBOARD TABS
============================================================ */

const playerTabs = [
  "Dashboard",
  "VIP",
  "Rewards",
  "Referrals",
  "Activity",
  "Support",
  "Notifications",
  "Settings"
];

const promoterTabs = [
  "Overview",
  "Referrals",
  "Earnings",
  "Payouts",
  "Analytics"
];

const adminTabs = [
  "Dashboard",
  "Players",
  "Promoters",
  "Referrals",
  "Rewards",
  "VIP & Loyalty",
  "Referral Settings",
  "Claims",
  "Payouts",
  "Support"
];

function selectTab(t) {
  dashTab = t;
  render();
}

function hasPlayerAccess() {

  return Boolean(
    me?.user?.roles?.includes("player") ||
    me?.playerProfile
  );
}

function hasPromoterAccess() {

  return Boolean(
    me?.user?.roles?.includes("promoter") ||
    me?.promoterProfile
  );
}

/* ============================================================
   MODE BAR
============================================================ */

function switchMode(kind) {

  if (
    kind === "admin" &&
    !me?.user?.roles?.includes("admin")
  ) {
    notify(
      "Admin access is not available for this account.",
      false
    );
    return;
  }

  if (
    kind === "promoter" &&
    !hasPromoterAccess()
  ) {
    notify(
      "Promoter access is not available for this account.",
      false
    );
    return;
  }

  if (
    kind === "player" &&
    !hasPlayerAccess()
  ) {
    notify(
      "Player access is not available for this account.",
      false
    );
    return;
  }

  dashTab =
    kind === "player"
      ? "Dashboard"
      : kind === "promoter"
        ? "Overview"
        : "Dashboard";

  go(
    kind === "player"
      ? "player-dashboard"
      : kind === "promoter"
        ? "promoter-dashboard"
        : "admin-dashboard"
  );
}

function modeBar(kind) {

  const buttons = [];

  if (
    me?.user?.roles?.includes("admin")
  ) {

    buttons.push(`
      <button
        class="mode-btn ${
          kind === "admin"
            ? "active"
            : ""
        }"
        onclick="switchMode('admin')"
      >
        Admin Mode
      </button>
    `);
  }

  if (hasPlayerAccess()) {

    buttons.push(`
      <button
        class="mode-btn ${
          kind === "player"
            ? "active"
            : ""
        }"
        onclick="switchMode('player')"
      >
        Player Mode
      </button>
    `);
  }

  if (hasPromoterAccess()) {

    buttons.push(`
      <button
        class="mode-btn ${
          kind === "promoter"
            ? "active"
            : ""
        }"
        onclick="switchMode('promoter')"
      >
        Promoter Mode
      </button>
    `);
  }

  return `
    <div class="mode-wrap">

      <div class="mode-bar">

        <span class="mode-label">
          ACCOUNT MODE
        </span>

        ${buttons.join("")}

      </div>

    </div>
  `;
}

function ensureModeStyles() {

  if (
    document.getElementById(
      "modeStyles"
    )
  ) {
    return;
  }

  const style =
    document.createElement("style");

  style.id = "modeStyles";

  style.textContent = `

    .mode-wrap{
      padding:12px 16px 0;
      background:#f5f8fc;
      border-bottom:1px solid #e3eaf2;
    }

    .mode-bar{
      max-width:1200px;
      margin:0 auto;
      display:flex;
      align-items:center;
      gap:8px;
      overflow-x:auto;
      padding-bottom:12px;
      -webkit-overflow-scrolling:touch;
      scrollbar-width:none;
    }

    .mode-bar::-webkit-scrollbar{
      display:none;
    }

    .mode-label{
      font-size:11px;
      font-weight:800;
      letter-spacing:.12em;
      color:#7890a8;
      white-space:nowrap;
      margin-right:4px;
    }

    .mode-btn{
      border:1px solid #d7e2ee;
      background:#fff;
      color:#50657b;
      border-radius:12px;
      padding:10px 15px;
      font:inherit;
      font-weight:700;
      white-space:nowrap;
      cursor:pointer;
      box-shadow:0 2px 7px rgba(20,50,80,.04);
    }

    .mode-btn.active{
      background:#eaf3fc;
      color:#1765ad;
      border-color:#c8ddef;
    }

    @media(max-width:600px){

      .mode-wrap{
        padding:10px 12px 0;
      }

      .mode-bar{
        gap:7px;
      }

      .mode-label{
        font-size:10px;
      }

      .mode-btn{
        padding:9px 12px;
        font-size:13px;
        border-radius:10px;
      }

    }

  `;

  document.head.appendChild(style);
}

/* ============================================================
   COPY
============================================================ */

function copyText(text) {

  navigator.clipboard
    ?.writeText(text)
    .then(
      () =>
        notify(
          "Referral link copied."
        )
    )
    .catch(
      () =>
        notify(
          "Unable to copy the referral link.",
          false
        )
    );
}

/* ============================================================
   LAYOUT
============================================================ */

function layout(kind) {

  const tabs =
    kind === "player"
      ? playerTabs
      : kind === "promoter"
        ? promoterTabs
        : adminTabs;

  return (
    header() +
    modeBar(kind) +
    `

      <div class="layout">

        <aside class="side">

          ${tabs
            .map(
              (t) => `
                <button
                  class="${
                    dashTab === t
                      ? "active"
                      : ""
                  }"
                  onclick='selectTab(${JSON.stringify(
                    t
                  )})'
                >
                  ${esc(t)}
                </button>
              `
            )
            .join("")}

        </aside>

        <main class="main">

          <div id="dash"></div>

        </main>

      </div>
    `
  );
}

/* ============================================================
   PLAYER
============================================================ */

async function player() {

  const renderError = (e) => {

    $("#dash").innerHTML = `
      <div class="card">
        <div class="message error">
          ${esc(
            e?.message ||
            "Unable to load this section."
          )}
        </div>
      </div>
    `;
  };

  try {

    /* --------------------------------------------------------
       DASHBOARD
    -------------------------------------------------------- */

    if (dashTab === "Dashboard") {

      try {

        const d =
          await api(
            "/api/player/dashboard"
          );

        const x =
          d.loyalty || {
            points: 0,
            lifetimePoints: 0
          };

        const v =
          d.vip || {
            level: "Bronze",
            progress: 0,
            nextLevel: null,
            nextPoints: 0
          };

        const nextText =
          v.nextLevel
            ? `${v.progress}% toward ${esc(
                v.nextLevel
              )} (${Number(
                v.nextPoints || 0
              ).toLocaleString()} lifetime points).`
            : "You are at the highest configured VIP level.";

        $("#dash").innerHTML = `

          <div class="toolbar">

            <div>

              <div class="label">
                Player dashboard
              </div>

              <h1>
                Welcome,
                ${esc(
                  d.account?.user?.firstName ||
                  me?.user?.firstName ||
                  "Player"
                )}
              </h1>

            </div>

            <span class="pill">
              ${esc(
                v.level || "Bronze"
              )}
            </span>

          </div>

          <div class="grid g4">

            <div class="card">

              <div class="label">
                Points
              </div>

              <div class="stat">
                ${Number(
                  x.points || 0
                ).toLocaleString()}
              </div>

            </div>

            <div class="card">

              <div class="label">
                Lifetime points
              </div>

              <div class="stat">
                ${Number(
                  x.lifetimePoints || 0
                ).toLocaleString()}
              </div>

            </div>

            <div class="card">

              <div class="label">
                VIP
              </div>

              <div
                class="stat"
                style="font-size:23px"
              >
                ${esc(
                  v.level || "Bronze"
                )}
              </div>

            </div>

            <div class="card">

              <div class="label">
                Referrals
              </div>

              <div class="stat">
                ${Number(
                  d.referrals || 0
                )}
              </div>

            </div>

          </div>

          <div
            class="card"
            style="margin-top:18px"
          >

            <h3>
              VIP progress
            </h3>

            <div class="progress">

              <i
                style="
                  width:${Math.max(
                    0,
                    Math.min(
                      100,
                      Number(
                        v.progress || 0
                      )
                    )
                  )}%
                "
              ></i>

            </div>

            <p class="muted small">
              ${nextText}
            </p>

          </div>

        `;

      } catch (e) {

        const u =
          me?.user || {};

        $("#dash").innerHTML = `

          <div class="toolbar">

            <div>

              <div class="label">
                Player dashboard
              </div>

              <h1>
                Welcome,
                ${esc(
                  u.firstName ||
                  "Player"
                )}
              </h1>

            </div>

            <span class="pill">
              Bronze
            </span>

          </div>

          <div class="grid g4">

            <div class="card">
              <div class="label">
                Points
              </div>
              <div class="stat">
                0
              </div>
            </div>

            <div class="card">
              <div class="label">
                Lifetime points
              </div>
              <div class="stat">
                0
              </div>
            </div>

            <div class="card">
              <div class="label">
                VIP
              </div>
              <div class="stat">
                Bronze
              </div>
            </div>

            <div class="card">
              <div class="label">
                Referrals
              </div>
              <div class="stat">
                0
              </div>
            </div>

          </div>

          <div
            class="card"
            style="margin-top:18px"
          >

            <h3>
              VIP progress
            </h3>

            <div class="progress">
              <i style="width:0%"></i>
            </div>

            <p class="muted small">
              Your account is active.
              Loyalty and VIP totals will
              appear here when available.
            </p>

          </div>

          <div
            class="card"
            style="margin-top:18px"
          >

            <div class="message error">
              Dashboard data is temporarily unavailable.
              Your other Player Mode sections remain available.
            </div>

          </div>

        `;
      }

      return;
    }

    /* --------------------------------------------------------
       VIP
    -------------------------------------------------------- */

    if (dashTab === "VIP") {

      const z =
        await api(
          "/api/player/vip"
        );

      const levels =
        Array.isArray(z.levels)
          ? z.levels
          : [];

      $("#dash").innerHTML = `

        <div class="toolbar">

          <div>

            <h2>
              VIP levels
            </h2>

            <p class="muted">
              Progress is based on lifetime loyalty points.
            </p>

          </div>

        </div>

        <div class="grid g3">

          ${
            levels.map(
              (l) => `

                <div class="card">

                  <span class="pill">
                    ${esc(l.name)}
                  </span>

                  <h3>
                    ${Number(
                      l.min_points || 0
                    ).toLocaleString()}
                    points
                  </h3>

                  <p class="muted">
                    ${esc(
                      l.benefit || ""
                    )}
                  </p>

                </div>
              `
            ).join("")

            ||

            `
              <div class="card">
                No VIP levels are configured yet.
              </div>
            `
          }

        </div>
      `;

      return;
    }

    /* --------------------------------------------------------
       REWARDS
    -------------------------------------------------------- */

    if (dashTab === "Rewards") {

      const r =
        await api(
          "/api/player/rewards"
        );

      const rewards =
        Array.isArray(r.rewards)
          ? r.rewards
          : [];

      const claims =
        Array.isArray(r.claims)
          ? r.claims
          : [];

      const accountEmail =
        me?.user?.email || "—";

      $("#dash").innerHTML = `

        <div class="toolbar">

          <div>

            <h2>
              Rewards
            </h2>

            <p class="muted">
              Redeem available rewards using loyalty points.
            </p>

          </div>

        </div>

        <div
          class="card"
          style="
            margin-bottom:18px;
            background:#f7faff;
            box-shadow:none
          "
        >

          <div class="label">
            ACCOUNT EMAIL
          </div>

          <strong>
            ${esc(accountEmail)}
          </strong>

          <p
            class="muted small"
            style="margin:5px 0 0"
          >
            Your reward claims are attached to
            this signed-in account.
          </p>

        </div>

        <div class="grid g3">

          ${
            rewards.map(
              (a) => `

                <div class="card">

                  <h3>
                    ${esc(a.name)}
                  </h3>

                  <p class="muted">
                    ${esc(
                      a.description || ""
                    )}
                  </p>

                  <div
                    class="stat"
                    style="font-size:22px"
                  >
                    ${Number(
                      a.points_cost || 0
                    ).toLocaleString()}
                    points
                  </div>

                  <button
                    class="btn primary"
                    style="margin-top:12px"
                    onclick="claimReward('${a.id}')"
                  >
                    Claim
                  </button>

                </div>
              `
            ).join("")

            ||

            `
              <div class="card">
                No rewards available.
              </div>
            `
          }

        </div>

        <div
          class="card"
          style="margin-top:18px"
        >

          <h3>
            Your claims
          </h3>

          <div class="table-wrap">

            <table class="table">

              <tr>

                <th>
                  Account email
                </th>

                <th>
                  Reward
                </th>

                <th>
                  Status
                </th>

                <th>
                  Date
                </th>

              </tr>

              ${
                claims.map(
                  (c) => `

                    <tr>

                      <td>
                        ${esc(
                          accountEmail
                        )}
                      </td>

                      <td>
                        ${esc(c.name)}
                      </td>

                      <td>
                        ${esc(c.status)}
                      </td>

                      <td>
                        ${esc(c.created_at)}
                      </td>

                    </tr>
                  `
                ).join("")

                ||

                `
                  <tr>
                    <td colspan="4">
                      No claims yet.
                    </td>
                  </tr>
                `
              }

            </table>

          </div>

        </div>

      `;

      return;
    }

    /* --------------------------------------------------------
       PLAYER REFERRALS
    -------------------------------------------------------- */

    if (dashTab === "Referrals") {

      const profile =
        me?.playerProfile || {};

      const playerCode =
        profile.referral_code || "—";

      const playerReferralLink =
        playerCode !== "—"
          ? `${location.origin}/#register?ref=${encodeURIComponent(
              playerCode
            )}`
          : "";

      $("#dash").innerHTML = `

        <div class="card">

          <h2>
            Your player referral
          </h2>

          <p class="muted">

            Your personal referral code is

            <strong>
              ${esc(playerCode)}
            </strong>.

          </p>

          ${
            playerReferralLink
              ?
              `
                <div
                  class="field"
                  style="margin-top:16px"
                >

                  <label>
                    Your referral link
                  </label>

                  <input
                    value="${esc(
                      playerReferralLink
                    )}"
                    readonly
                  >

                  <button
                    class="btn primary"
                    style="margin-top:10px"
                    onclick='copyText(${JSON.stringify(
                      playerReferralLink
                    )})'
                  >
                    Copy link
                  </button>

                </div>
              `
              :
              ""
          }

          <p class="muted small">
            Referral activity is tracked server-side.
          </p>

        </div>

      `;

      return;
    }

    /* --------------------------------------------------------
       ACTIVITY
    -------------------------------------------------------- */

    if (dashTab === "Activity") {

      try {

        const d =
          await api(
            "/api/player/dashboard"
          );

        const activity =
          Array.isArray(d.activity)
            ? d.activity
            : [];

        $("#dash").innerHTML = `

          <div class="card">

            <h2>
              Activity
            </h2>

            <div class="table-wrap">

              <table class="table">

                <tr>
                  <th>Date</th>
                  <th>Activity</th>
                  <th>Points</th>
                </tr>

                ${
                  activity.map(
                    (a) => `

                      <tr>

                        <td>
                          ${esc(
                            a.created_at
                          )}
                        </td>

                        <td>
                          ${esc(
                            a.description ||
                            a.type
                          )}
                        </td>

                        <td>
                          ${Number(
                            a.points || 0
                          ).toLocaleString()}
                        </td>

                      </tr>
                    `
                  ).join("")

                  ||

                  `
                    <tr>
                      <td colspan="3">
                        No activity yet.
                      </td>
                    </tr>
                  `
                }

              </table>

            </div>

          </div>

        `;

      } catch {

        $("#dash").innerHTML = `

          <div class="card">

            <h2>
              Activity
            </h2>

            <p class="muted">
              No activity is available yet.
            </p>

          </div>

        `;
      }

      return;
    }

    /* --------------------------------------------------------
       SUPPORT
    -------------------------------------------------------- */

    if (dashTab === "Support") {

      $("#dash").innerHTML =
        await supportView();

      return;
    }

    /* --------------------------------------------------------
       NOTIFICATIONS
    -------------------------------------------------------- */

    if (dashTab === "Notifications") {

      $("#dash").innerHTML =
        await notificationView();

      return;
    }

    /* --------------------------------------------------------
       SETTINGS
    -------------------------------------------------------- */

    if (dashTab === "Settings") {

      const u =
        me?.user || {};

      const p =
        me?.playerProfile || {};

      $("#dash").innerHTML = `

        <div class="card">

          <h2>
            Account settings
          </h2>

          <p class="muted">
            Manage and review your account information.
          </p>

          <div
            class="grid g2"
            style="margin-top:18px"
          >

            <div class="field">

              <label>
                First name
              </label>

              <input
                value="${esc(
                  u.firstName || ""
                )}"
                readonly
              >

            </div>

            <div class="field">

              <label>
                Last name
              </label>

              <input
                value="${esc(
                  u.lastName || ""
                )}"
                readonly
              >

            </div>

            <div class="field">

              <label>
                Email
              </label>

              <input
                value="${esc(
                  u.email || ""
                )}"
                readonly
              >

            </div>

            <div class="field">

              <label>
                Phone
              </label>

              <input
                value="${esc(
                  u.phone || ""
                )}"
                readonly
              >

            </div>

          </div>

          <div
            class="card"
            style="
              margin-top:18px;
              background:#f7faff;
              box-shadow:none
            "
          >

            <div class="label">
              ACCOUNT STATUS
            </div>

            <p style="margin:8px 0">

              <span class="pill">
                ${esc(
                  u.status || "active"
                )}
              </span>

            </p>

            <p class="muted small">

              Player referral code:
              ${esc(
                p.referral_code || "—"
              )}

            </p>

          </div>

        </div>

      `;

      return;
    }

  } catch (e) {

    renderError(e);
  }
}

/* ============================================================
   REWARD CLAIM
============================================================ */

async function claimReward(id) {

  try {

    await api(
      "/api/player/rewards/claim",
      {
        method: "POST",
        body: {
          rewardId: id
        }
      }
    );

    notify(
      "Reward claim submitted."
    );

    render();

  } catch (e) {

    notify(
      e.message,
      false
    );
  }
}

/* ============================================================
   PROMOTER
============================================================ */

async function promoter() {

  let d;

  try {

    d =
      await api(
        "/api/promoter/referrals"
      );

  } catch (e) {

    $("#dash").innerHTML = `
      <div class="card">

        <div class="message error">
          ${esc(e.message)}
        </div>

      </div>
    `;

    return;
  }

  const link =
    `${location.origin}/#register?ref=${encodeURIComponent(
      d.promoterProfile?.promoter_code || ""
    )}`;

  let body = "";

  if (dashTab === "Overview") {

    body = `

      <div class="toolbar">

        <div>

          <div class="label">
            Promoter dashboard
          </div>

          <h1>
            Referral performance
          </h1>

        </div>

        <span class="pill">
          ${esc(
            d.promoterProfile?.status ||
            "pending"
          )}
        </span>

      </div>

      <div class="grid g4">

        <div class="card">

          <div class="label">
            Clicks
          </div>

          <div class="stat">
            ${Number(
              d.stats?.clicks || 0
            )}
          </div>

        </div>

        <div class="card">

          <div class="label">
            Registrations
          </div>

          <div class="stat">
            ${Number(
              d.stats?.registrations || 0
            )}
          </div>

        </div>

        <div class="card">

          <div class="label">
            Qualified
          </div>

          <div class="stat">
            ${Number(
              d.stats?.qualified || 0
            )}
          </div>

        </div>

        <div class="card">

          <div class="label">
            Earnings
          </div>

          <div class="stat">
            $${Number(
              d.stats?.earnings || 0
            ).toFixed(2)}
          </div>

        </div>

      </div>

      <div
        class="card"
        style="margin-top:18px"
      >

        <h3>
          Your referral link
        </h3>

        <input
          value="${esc(link)}"
          readonly
          style="
            width:100%;
            padding:12px;
            border:1px solid #d8e2ec;
            border-radius:10px
          "
        >

        <button
          class="btn primary"
          style="margin-top:10px"
          onclick='copyText(${JSON.stringify(
            link
          )})'
        >
          Copy link
        </button>

      </div>
    `;
  }

  else if (
    dashTab === "Referrals"
  ) {

    body = `

      <div class="card">

        <h2>
          Referrals
        </h2>

        <div class="table-wrap">

          <table class="table">

            <tr>

              <th>
                Player
              </th>

              <th>
                Email
              </th>

              <th>
                Status
              </th>

              <th>
                Registered
              </th>

            </tr>

            ${
              (d.referrals || []).map(
                (r) => `

                  <tr>

                    <td>
                      ${esc(
                        `${r.first_name || ""}
                        ${r.last_name || ""}`
                      )}
                    </td>

                    <td>
                      ${esc(r.email)}
                    </td>

                    <td>
                      ${esc(r.status)}
                    </td>

                    <td>
                      ${esc(
                        r.registered_at
                      )}
                    </td>

                  </tr>
                `
              ).join("")

              ||

              `
                <tr>
                  <td colspan="4">
                    No referrals yet.
                  </td>
                </tr>
              `
            }

          </table>

        </div>

      </div>
    `;
  }

  else if (
    dashTab === "Earnings"
  ) {

    body = `

      <div class="card">

        <h2>
          Commission history
        </h2>

        <p class="muted">

          Total earned:
          $${Number(
            d.stats?.earnings || 0
          ).toFixed(2)}

          · Available:
          $${Number(
            d.stats?.available || 0
          ).toFixed(2)}

        </p>

        <div class="table-wrap">

          <table class="table">

            <tr>

              <th>
                Date
              </th>

              <th>
                Amount
              </th>

              <th>
                Rate
              </th>

              <th>
                Status
              </th>

            </tr>

            ${
              (d.commissions || []).map(
                (c) => `

                  <tr>

                    <td>
                      ${esc(
                        c.created_at
                      )}
                    </td>

                    <td>
                      $${Number(
                        c.amount || 0
                      ).toFixed(2)}
                    </td>

                    <td>
                      ${Number(
                        c.rate || 0
                      ).toFixed(2)}%
                    </td>

                    <td>
                      ${esc(
                        c.status
                      )}
                    </td>

                  </tr>
                `
              ).join("")

              ||

              `
                <tr>
                  <td colspan="4">
                    No commissions yet.
                  </td>
                </tr>
              `
            }

          </table>

        </div>

      </div>
    `;
  }

  else if (
    dashTab === "Payouts"
  ) {

    const p =
      await api(
        "/api/promoter/payouts"
      );

    body = `

      <div class="card">

        <h2>
          Payouts
        </h2>

        <p class="muted">

          Available:
          $${Number(
            d.stats?.available || 0
          ).toFixed(2)}.

          Minimum payout is
          controlled by admin.

        </p>

        <div class="actions">

          <input
            id="payoutAmount"
            type="number"
            min="0"
            step="0.01"
            placeholder="Amount"
          >

          <button
            class="btn primary"
            onclick="requestPayout()"
          >
            Request payout
          </button>

        </div>

        <div class="table-wrap">

          <table class="table">

            <tr>

              <th>
                Date
              </th>

              <th>
                Amount
              </th>

              <th>
                Status
              </th>

            </tr>

            ${
              (p.payouts || []).map(
                (a) => `

                  <tr>

                    <td>
                      ${esc(
                        a.created_at
                      )}
                    </td>

                    <td>
                      $${Number(
                        a.amount || 0
                      ).toFixed(2)}
                    </td>

                    <td>
                      ${esc(
                        a.status
                      )}
                    </td>

                  </tr>
                `
              ).join("")

              ||

              `
                <tr>
                  <td colspan="3">
                    No payouts yet.
                  </td>
                </tr>
              `
            }

          </table>

        </div>

      </div>
    `;
  }

  else {

    const clicks =
      Number(
        d.stats?.clicks || 0
      );

    const registrations =
      Number(
        d.stats?.registrations || 0
      );

    const qualified =
      Number(
        d.stats?.qualified || 0
      );

    const earnings =
      Number(
        d.stats?.earnings || 0
      );

    body = `

      <div class="grid g3">

        <div class="card">

          <div class="label">
            Conversion
          </div>

          <div class="stat">
            ${
              clicks
                ? (
                    registrations /
                    clicks *
                    100
                  ).toFixed(1)
                : "0"
            }%
          </div>

          <p class="muted small">
            Registrations divided by clicks.
          </p>

        </div>

        <div class="card">

          <div class="label">
            Qualification
          </div>

          <div class="stat">
            ${
              registrations
                ? (
                    qualified /
                    registrations *
                    100
                  ).toFixed(1)
                : "0"
            }%
          </div>

          <p class="muted small">
            Qualified referrals divided by registrations.
          </p>

        </div>

        <div class="card">

          <div class="label">
            Commission
          </div>

          <div class="stat">
            $${earnings.toFixed(2)}
          </div>

        </div>

      </div>
    `;
  }

  $("#dash").innerHTML = body;
}

/* ============================================================
   PROMOTER PAYOUT
============================================================ */

async function requestPayout() {

  try {

    await api(
      "/api/promoter/payouts",
      {
        method: "POST",
        body: {
          amount:
            Number(
              $("#payoutAmount").value
            ),
          method: "manual"
        }
      }
    );

    notify(
      "Payout request submitted."
    );

    render();

  } catch (e) {

    notify(
      e.message,
      false
    );
  }
}

/* ============================================================
   SUPPORT
============================================================ */

async function supportView() {

  const d =
    await api(
      "/api/player/support"
    );

  return `

    <div class="grid g2">

      <div class="card">

        <h2>
          New support ticket
        </h2>

        <form
          onsubmit="ticketSubmit(event)"
        >

          <div class="field">

            <label>
              Subject
            </label>

            <input
              id="subject"
              required
            >

          </div>

          <div class="field">

            <label>
              Message
            </label>

            <textarea
              id="ticketMessage"
              rows="6"
              required
            ></textarea>

          </div>

          <button
            class="btn primary"
          >
            Submit ticket
          </button>

        </form>

      </div>

      <div class="card">

        <h2>
          Support history
        </h2>

        ${
          (d.tickets || []).map(
            (t) => `

              <div
                style="
                  padding:13px 0;
                  border-bottom:1px solid #edf1f5
                "
              >

                <b>
                  ${esc(t.subject)}
                </b>

                <div class="small muted">
                  ${esc(t.status)}
                  ·
                  ${esc(t.created_at)}
                </div>

              </div>
            `
          ).join("")

          ||

          `
            <p class="muted">
              No tickets yet.
            </p>
          `
        }

      </div>

    </div>

  `;
}

async function ticketSubmit(e) {

  e.preventDefault();

  try {

    await api(
      "/api/player/support",
      {
        method: "POST",
        body: {
          subject:
            $("#subject").value,

          message:
            $("#ticketMessage").value
        }
      }
    );

    notify(
      "Support ticket created."
    );

    render();

  } catch (x) {

    notify(
      x.message,
      false
    );
  }
}

/* ============================================================
   NOTIFICATIONS
============================================================ */

async function notificationView() {

  const d =
    await api(
      "/api/player/notifications"
    );

  return `

    <div class="card">

      <div class="toolbar">

        <div>

          <h2>
            Notifications
          </h2>

          <p class="muted">
            ${Number(
              d.unread || 0
            )}
            unread
          </p>

        </div>

        <button
          class="btn secondary"
          onclick="readAll()"
        >
          Mark all read
        </button>

      </div>

      ${
        (d.notifications || []).map(
          (n) => `

            <div
              style="
                padding:14px 0;
                border-bottom:1px solid #edf1f5
              "
            >

              <b>
                ${esc(n.title)}
              </b>

              <div>
                ${esc(n.message)}
              </div>

              <div class="small muted">

                ${esc(n.created_at)}
                ·
                ${n.read_at
                  ? "Read"
                  : "Unread"}

              </div>

            </div>
          `
        ).join("")

        ||

        `
          <p class="muted">
            No notifications.
          </p>
        `
      }

    </div>

  `;
}

async function readAll() {

  await api(
    "/api/player/notifications",
    {
      method: "PATCH",
      body: {
        all: true
      }
    }
  );

  render();
}

/* ============================================================
   ADMIN
============================================================ */

async function admin() {

  let d;

  try {

    d =
      await api(
        "/api/admin/dashboard"
      );

  } catch (e) {

    $("#dash").innerHTML = `
      <div class="card">

        <div class="message error">
          ${esc(e.message)}
        </div>

      </div>
    `;

    return;
  }

  let body = "";

  if (dashTab === "Dashboard") {

    body = `

      <div class="toolbar">

        <div>

          <div class="label">
            Administration
          </div>

          <h1>
            Control center
          </h1>

        </div>

      </div>

      <div class="grid g4">

        ${
          [
            [
              "Players",
              d.stats?.players || 0
            ],
            [
              "Promoters",
              d.stats?.promoters || 0
            ],
            [
              "Rewards",
              d.stats?.rewards || 0
            ],
            [
              "Open support",
              d.stats?.support || 0
            ],
            [
              "Clicks",
              d.stats?.clicks || 0
            ],
            [
              "Referrals",
              d.stats?.referrals || 0
            ],
            [
              "Qualified",
              d.stats?.qualified || 0
            ],
            [
              "Commissions",
              `$${Number(
                d.stats?.commissions || 0
              ).toFixed(2)}`
            ]
          ]
            .map(
              (x) => `

                <div class="card">

                  <div class="label">
                    ${esc(x[0])}
                  </div>

                  <div class="stat">
                    ${x[1]}
                  </div>

                </div>
              `
            )
            .join("")
        }

      </div>
    `;
  }

  else if (dashTab === "Players") {

    body = `

      <div class="card">

        <h2>
          Players
        </h2>

        <div class="table-wrap">

          <table class="table">

            <tr>

              <th>
                Name
              </th>

              <th>
                Email
              </th>

              <th>
                Status
              </th>

              <th>
                Created
              </th>

            </tr>

            ${
              (d.users || []).map(
                (u) => `

                  <tr>

                    <td>
                      ${esc(
                        `${u.first_name || ""}
                        ${u.last_name || ""}`
                      )}
                    </td>

                    <td>
                      ${esc(u.email)}
                    </td>

                    <td>
                      ${esc(u.status)}
                    </td>

                    <td>
                      ${esc(
                        u.created_at
                      )}
                    </td>

                  </tr>
                `
              ).join("")

              ||

              `
                <tr>
                  <td colspan="4">
                    No players.
                  </td>
                </tr>
              `
            }

          </table>

        </div>

      </div>
    `;
  }

  else if (
    dashTab === "Promoters"
  ) {

    body =
      await adminPromoters();
  }

  else if (
    dashTab === "Referrals"
  ) {

    body =
      await adminReferralsView();
  }

  else if (
    dashTab === "Rewards"
  ) {

    body =
      await adminRewards();
  }

  else if (
    dashTab === "VIP & Loyalty"
  ) {

    body =
      await adminVip();
  }

  else if (
    dashTab === "Referral Settings"
  ) {

    body =
      await adminSettings();
  }

  else if (
    dashTab === "Claims"
  ) {

    body =
      await adminClaims();
  }

  else if (
    dashTab === "Payouts"
  ) {

    body =
      await adminPayoutView();
  }

  else if (
    dashTab === "Support"
  ) {

    body =
      await adminSupport();
  }

  $("#dash").innerHTML =
    body;
}

/* ============================================================
   ADMIN PROMOTERS
============================================================ */

async function adminPromoters() {

  const d =
    await api(
      "/api/admin/promoters"
    );

  return `

    <div class="card">

      <h2>
        Promoters
      </h2>

      <div class="table-wrap">

        <table class="table">

          <tr>

            <th>
              Name
            </th>

            <th>
              Email
            </th>

            <th>
              Code
            </th>

            <th>
              Status
            </th>

            <th>
              Rate %
            </th>

            <th>
            </th>

          </tr>

          ${
            (d.promoters || []).map(
              (p) => `

                <tr>

                  <td>
                    ${esc(
                      `${p.first_name || ""}
                      ${p.last_name || ""}`
                    )}
                  </td>

                  <td>
                    ${esc(p.email)}
                  </td>

                  <td>
                    ${esc(
                      p.promoter_code
                    )}
                  </td>

                  <td>

                    <select
                      id="status-${p.user_id}"
                    >

                      <option
                        value="pending"
                        ${
                          p.status ===
                          "pending"
                            ? "selected"
                            : ""
                        }
                      >
                        pending
                      </option>

                      <option
                        value="active"
                        ${
                          p.status ===
                          "active"
                            ? "selected"
                            : ""
                        }
                      >
                        active
                      </option>

                      <option
                        value="suspended"
                        ${
                          p.status ===
                          "suspended"
                            ? "selected"
                            : ""
                        }
                      >
                        suspended
                      </option>

                    </select>

                  </td>

                  <td>

                    <input
                      id="rate-${p.user_id}"
                      value="${Number(
                        p.commission_rate || 0
                      )}"
                      style="width:70px"
                    >

                  </td>

                  <td>

                    <button
                      class="btn secondary"
                      onclick="updatePromoter('${p.user_id}')"
                    >
                      Save
                    </button>

                  </td>

                </tr>
              `
            ).join("")
          }

        </table>

      </div>

    </div>
  `;
}

async function updatePromoter(id) {

  try {

    await api(
      "/api/admin/promoters",
      {
        method: "PATCH",
        body: {

          id,

          status:
            document.querySelector(
              "#status-" + id
            ).value,

          commissionRate:
            Number(
              document.querySelector(
                "#rate-" + id
              ).value
            )
        }
      }
    );

    notify(
      "Promoter updated."
    );

    render();

  } catch (e) {

    notify(
      e.message,
      false
    );
  }
}

/* ============================================================
   ADMIN REFERRALS
============================================================ */

async function adminReferralsView() {

  const d =
    await api(
      "/api/admin/referrals"
    );

  return `

    <div class="card">

      <h2>
        Referral management
      </h2>

      <div class="table-wrap">

        <table class="table">

          <tr>

            <th>
              Player
            </th>

            <th>
              Email
            </th>

            <th>
              Promoter
            </th>

            <th>
              Status
            </th>

            <th>
            </th>

          </tr>

          ${
            (d.referrals || []).map(
              (r) => `

                <tr>

                  <td>
                    ${esc(
                      `${r.first_name || ""}
                      ${r.last_name || ""}`
                    )}
                  </td>

                  <td>
                    ${esc(r.email)}
                  </td>

                  <td>
                    ${esc(
                      r.code ||
                      r.promoter_id ||
                      ""
                    )}
                  </td>

                  <td>
                    ${esc(r.status)}
                  </td>

                  <td>

                    ${
                      r.status ===
                      "registered"

                        ?

                        `
                          <button
                            class="btn primary"
                            onclick="qualify('${r.id}')"
                          >
                            Qualify
                          </button>
                        `

                        :

                        "—"
                    }

                  </td>

                </tr>
              `
            ).join("")
          }

        </table>

      </div>

    </div>
  `;
}

async function qualify(id) {

  const amount =
    prompt(
      "Qualified revenue amount for commission (enter 0 if none):",
      "0"
    );

  if (amount === null) {
    return;
  }

  try {

    await api(
      "/api/admin/referrals/qualify",
      {
        method: "POST",
        body: {
          referralId: id,
          amount: Number(amount),
          reason: "Admin qualification"
        }
      }
    );

    notify(
      "Referral qualified."
    );

    render();

  } catch (e) {

    notify(
      e.message,
      false
    );
  }
}

/* ============================================================
   ADMIN PAYOUTS
============================================================ */

async function adminPayoutView() {

  const d =
    await api(
      "/api/admin/payouts"
    );

  return `

    <div class="card">

      <h2>
        Payout queue
      </h2>

      <div class="table-wrap">

        <table class="table">

          <tr>

            <th>
              Promoter
            </th>

            <th>
              Email
            </th>

            <th>
              Amount
            </th>

            <th>
              Status
            </th>

            <th>
            </th>

          </tr>

          ${
            (d.payouts || []).map(
              (p) => `

                <tr>

                  <td>
                    ${esc(
                      `${p.first_name || ""}
                      ${p.last_name || ""}`
                    )}
                  </td>

                  <td>
                    ${esc(p.email)}
                  </td>

                  <td>
                    $${Number(
                      p.amount || 0
                    ).toFixed(2)}
                  </td>

                  <td>
                    ${esc(p.status)}
                  </td>

                  <td>

                    ${
                      p.status ===
                      "requested"

                        ?

                        `
                          <button
                            class="btn primary"
                            onclick="processPayout('${p.id}','approved')"
                          >
                            Approve
                          </button>

                          <button
                            class="btn danger"
                            onclick="processPayout('${p.id}','rejected')"
                          >
                            Reject
                          </button>
                        `

                        :

                        p.status ===
                        "approved"

                        ?

                        `
                          <button
                            class="btn primary"
                            onclick="processPayout('${p.id}','paid')"
                          >
                            Mark paid
                          </button>
                        `

                        :

                        "—"
                    }

                  </td>

                </tr>
              `
            ).join("")

            ||

            `
              <tr>
                <td colspan="5">
                  No payouts.
                </td>
              </tr>
            `
          }

        </table>

      </div>

    </div>
  `;
}

async function processPayout(
  id,
  status
) {

  try {

    await api(
      "/api/admin/payouts",
      {
        method: "PATCH",
        body: {
          id,
          status
        }
      }
    );

    notify(
      "Payout updated."
    );

    render();

  } catch (e) {

    notify(
      e.message,
      false
    );
  }
}

/* ============================================================
   ADMIN REWARDS
============================================================ */

async function adminRewards() {

  const d =
    await api(
      "/api/admin/rewards"
    );

  return `

    <div class="grid g2">

      <div class="card">

        <h2>
          Create reward
        </h2>

        <form
          onsubmit="createReward(event)"
        >

          <div class="field">

            <label>
              Name
            </label>

            <input
              id="rname"
              required
            >

          </div>

          <div class="field">

            <label>
              Description
            </label>

            <textarea
              id="rdesc"
            ></textarea>

          </div>

          <div class="field">

            <label>
              Points cost
            </label>

            <input
              id="rcost"
              type="number"
              min="0"
              required
            >

          </div>

          <button
            class="btn primary"
          >
            Create reward
          </button>

        </form>

      </div>

      <div class="card">

        <h2>
          Rewards
        </h2>

        ${
          (d.rewards || []).map(
            (r) => `

              <div
                style="
                  padding:12px 0;
                  border-bottom:1px solid #edf1f5
                "
              >

                <b>
                  ${esc(r.name)}
                </b>

                ·

                ${Number(
                  r.points_cost || 0
                )}

                pts

                ·

                ${
                  r.enabled
                    ? "Enabled"
                    : "Disabled"
                }

              </div>
            `
          ).join("")

          ||

          `
            <p class="muted">
              No rewards configured.
            </p>
          `
        }

      </div>

    </div>
  `;
}

async function createReward(e) {

  e.preventDefault();

  try {

    await api(
      "/api/admin/rewards",
      {
        method: "POST",
        body: {
          name:
            $("#rname").value,

          description:
            $("#rdesc").value,

          pointsCost:
            Number(
              $("#rcost").value
            )
        }
      }
    );

    notify(
      "Reward created."
    );

    render();

  } catch (x) {

    notify(
      x.message,
      false
    );
  }
}

/* ============================================================
   ADMIN VIP
============================================================ */

async function adminVip() {

  const d =
    await api(
      "/api/admin/vip"
    );

  return `

    <div class="card">

      <h2>
        VIP & Loyalty controls
      </h2>

      ${
        (d.levels || []).map(
          (v) => `

            <div
              class="grid g3"
              style="
                padding:12px 0;
                border-bottom:1px solid #edf1f5
              "
            >

              <input
                id="vn-${v.id}"
                value="${esc(v.name)}"
              >

              <input
                id="vp-${v.id}"
                type="number"
                value="${Number(
                  v.min_points || 0
                )}"
              >

              <input
                id="vb-${v.id}"
                value="${esc(
                  v.benefit || ""
                )}"
              >

              <button
                class="btn secondary"
                onclick="saveVip('${v.id}')"
              >
                Save
              </button>

            </div>
          `
        ).join("")
      }

    </div>
  `;
}

async function saveVip(id) {

  try {

    await api(
      "/api/admin/vip",
      {
        method: "PATCH",
        body: {
          id,

          name:
            $("#vn-" + id).value,

          minPoints:
            Number(
              $("#vp-" + id).value
            ),

          benefit:
            $("#vb-" + id).value
        }
      }
    );

    notify(
      "VIP level updated."
    );

    render();

  } catch (e) {

    notify(
      e.message,
      false
    );
  }
}

/* ============================================================
   ADMIN SETTINGS
============================================================ */

async function adminSettings() {

  const d =
    await api(
      "/api/admin/settings"
    );

  const keys =
    Object.keys(
      d.settings || {}
    );

  return `

    <div class="card">

      <h2>
        Referral / loyalty settings
      </h2>

      <p class="muted">
        Changes apply server-side.
      </p>

      ${
        keys.map(
          (k) => `

            <div class="field">

              <label>
                ${esc(k)}
              </label>

              <input
                id="set-${esc(k)}"
                value="${esc(
                  d.settings[k]
                )}"
              >

            </div>
          `
        ).join("")
      }

      <button
        class="btn primary"
        onclick='saveSettings(${JSON.stringify(
          keys
        )})'
      >
        Save controls
      </button>

    </div>
  `;
}

async function saveSettings(keys) {

  const o = {};

  for (
    const k of keys
  ) {

    const input =
      document.querySelector(
        "#set-" + k
      );

    if (input) {
      o[k] = input.value;
    }
  }

  try {

    await api(
      "/api/admin/settings",
      {
        method: "PATCH",
        body: o
      }
    );

    notify(
      "Settings saved."
    );

    render();

  } catch (e) {

    notify(
      e.message,
      false
    );
  }
}

/* ============================================================
   ADMIN CLAIMS
============================================================ */

async function adminClaims() {

  const d =
    await api(
      "/api/admin/claims"
    );

  return `

    <div class="card">

      <h2>
        Reward claims
      </h2>

      <div class="table-wrap">

        <table class="table">

          <tr>

            <th>
              Player / Email
            </th>

            <th>
              Reward
            </th>

            <th>
              Cost
            </th>

            <th>
              Status
            </th>

            <th>
            </th>

          </tr>

          ${
            (d.claims || []).map(
              (c) => `

                <tr>

                  <td>
                    ${esc(
                      c.email ||
                      c.player_email ||
                      ""
                    )}
                  </td>

                  <td>
                    ${esc(c.name)}
                  </td>

                  <td>
                    ${Number(
                      c.points_cost || 0
                    )}
                  </td>

                  <td>
                    ${esc(c.status)}
                  </td>

                  <td>

                    <select
                      onchange="claimStatus('${c.id}',this.value)"
                    >

                      <option
                        value="pending"
                        ${
                          c.status ===
                          "pending"
                            ? "selected"
                            : ""
                        }
                      >
                        pending
                      </option>

                      <option
                        value="approved"
                        ${
                          c.status ===
                          "approved"
                            ? "selected"
                            : ""
                        }
                      >
                        approved
                      </option>

                      <option
                        value="fulfilled"
                        ${
                          c.status ===
                          "fulfilled"
                            ? "selected"
                            : ""
                        }
                      >
                        fulfilled
                      </option>

                      <option
                        value="rejected"
                        ${
                          c.status ===
                          "rejected"
                            ? "selected"
                            : ""
                        }
                      >
                        rejected
                      </option>

                    </select>

                  </td>

                </tr>
              `
            ).join("")

            ||

            `
              <tr>
                <td colspan="5">
                  No claims.
                </td>
              </tr>
            `
          }

        </table>

      </div>

    </div>
  `;
}

async function claimStatus(
  id,
  status
) {

  try {

    await api(
      "/api/admin/claims",
      {
        method: "PATCH",
        body: {
          id,
          status
        }
      }
    );

    notify(
      "Claim updated."
    );

    render();

  } catch (e) {

    notify(
      e.message,
      false
    );
  }
}

/* ============================================================
   ADMIN SUPPORT
============================================================ */

async function adminSupport() {

  const d =
    await api(
      "/api/admin/support"
    );

  return `

    <div class="card">

      <h2>
        Support queue
      </h2>

      ${
        (d.tickets || []).map(
          (t) => `

            <div
              style="
                padding:14px 0;
                border-bottom:1px solid #edf1f5
              "
            >

              <b>
                ${esc(t.subject)}
              </b>

              <div class="small muted">

                ${esc(
                  t.email || ""
                )}

                ·

                ${esc(
                  t.status
                )}

              </div>

              <div
                class="actions"
                style="margin-top:8px"
              >

                <button
                  class="btn secondary"
                  onclick="supportStatus('${t.id}','pending')"
                >
                  Pending
                </button>

                <button
                  class="btn primary"
                  onclick="supportStatus('${t.id}','closed')"
                >
                  Close
                </button>

              </div>

            </div>
          `
        ).join("")

        ||

        `
          <p class="muted">
            No tickets.
          </p>
        `
      }

    </div>
  `;
}

async function supportStatus(
  id,
  status
) {

  try {

    await api(
      "/api/admin/support",
      {
        method: "PATCH",
        body: {
          id,
          status
        }
      }
    );

    notify(
      "Ticket updated."
    );

    render();

  } catch (e) {

    notify(
      e.message,
      false
    );
  }
}

/* ============================================================
   RENDER
============================================================ */

async function render() {

  ensureModeStyles();

  route =
    routeName();

  await trackReferral();

  const app =
    document.querySelector(
      "#app"
    );

  if (!app) {
    return;
  }

  /* AUTH */

  if (
    route === "login" ||
    route === "register"
  ) {

    app.innerHTML =
      authPage(route);

    return;
  }

  /* FAQ */

  if (route === "faq") {

    app.innerHTML =
      header() +
      `

        <main
          class="container section"
        >

          <div class="card">

            <h1>
              FAQ
            </h1>

            <h3>
              How do referrals work?
            </h3>

            <p class="muted">
              A promoter link records a click,
              then registration attribution is
              stored server-side.
            </p>

            <h3>
              How are VIP levels calculated?
            </h3>

            <p class="muted">
              VIP progress is based on lifetime
              loyalty points and configured thresholds.
            </p>

            <h3>
              Who controls rewards?
            </h3>

            <p class="muted">
              Administrators configure rewards,
              VIP thresholds, referral rates
              and other controls.
            </p>

          </div>

        </main>

      `;

    return;
  }

  /* DASHBOARD AUTH */

  if (
    !me &&
    [
      "player-dashboard",
      "promoter-dashboard",
      "admin-dashboard"
    ].includes(route)
  ) {

    go("login");

    return;
  }

  /* HOME */

  if (
    route === "home" ||
    !route
  ) {

    app.innerHTML =
      home();

    return;
  }

  /* PLAYER */

  if (
    route === "player-dashboard" &&
    me
  ) {

    dashTab =
      playerTabs.includes(
        dashTab
      )
        ? dashTab
        : "Dashboard";

    app.innerHTML =
      layout("player");

    await player();

    return;
  }

  /* PROMOTER */

  if (
    route === "promoter-dashboard" &&
    me?.user?.roles?.includes(
      "promoter"
    )
  ) {

    dashTab =
      promoterTabs.includes(
        dashTab
      )
        ? dashTab
        : "Overview";

    app.innerHTML =
      layout("promoter");

    await promoter();

    return;
  }

  /* ADMIN */

  if (
    route === "admin-dashboard" &&
    me?.user?.roles?.includes(
      "admin"
    )
  ) {

    dashTab =
      adminTabs.includes(
        dashTab
      )
        ? dashTab
        : "Dashboard";

    app.innerHTML =
      layout("admin");

    await admin();

    return;
  }

  /* INVALID / UNAUTHORIZED ROUTE */

  go(
    me
      ? defaultDash()
      : "login"
  );
}

/* ============================================================
   START APPLICATION
============================================================ */

window.addEventListener(
  "hashchange",
  () => {
    render();
  }
);

document.addEventListener(
  "DOMContentLoaded",
  async () => {

    await loadMe();

    await render();

  }
);