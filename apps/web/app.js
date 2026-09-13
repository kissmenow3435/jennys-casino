const API_BASE = "https://jennys-casino-api.onlineorg.workers.dev";

let currentUser = null;
let currentPage = null;
let mobileNavOpen = false;

/* ============================================================
   DOM HELPERS
============================================================ */

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

/* ============================================================
   API HELPER
============================================================ */

async function apiRequest(path, options = {}) {
    const config = {
        method: options.method || "GET",
        credentials: "include",
        headers: {
            ...(options.body
                ? { "Content-Type": "application/json" }
                : {}),
            ...(options.headers || {})
        }
    };

    if (options.body) {
        config.body =
            typeof options.body === "string"
                ? options.body
                : JSON.stringify(options.body);
    }

    const response = await fetch(`${API_BASE}${path}`, config);

    let data = null;

    try {
        data = await response.json();
    } catch {
        data = {
            ok: false,
            error: "The server returned an invalid response."
        };
    }

    if (!response.ok) {
        const error = new Error(
            data?.error ||
            `Request failed with status ${response.status}.`
        );

        error.status = response.status;
        error.data = data;

        throw error;
    }

    return data;
}

/* ============================================================
   TOAST
============================================================ */

let toastTimer = null;

function showToast(message, type = "success") {
    const toast = $("#toast");

    if (!toast) {
        return;
    }

    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.hidden = false;

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
        toast.hidden = true;
    }, 3500);
}

/* ============================================================
   LOADING
============================================================ */

function setLoading(isLoading, text = "Loading...") {
    const overlay = $("#loadingOverlay");

    if (!overlay) {
        return;
    }

    const label = overlay.querySelector("span");

    if (label) {
        label.textContent = text;
    }

    overlay.hidden = !isLoading;
}

/* ============================================================
   FORM MESSAGES
============================================================ */

function showFormMessage(id, message, type = "error") {
    const element = $(`#${id}`);

    if (!element) {
        return;
    }

    element.textContent = message;
    element.className = `form-message ${type}`;
    element.hidden = false;
}

function clearFormMessage(id) {
    const element = $(`#${id}`);

    if (!element) {
        return;
    }

    element.textContent = "";
    element.className = "form-message";
    element.hidden = true;
}

/* ============================================================
   ROUTING
============================================================ */

const publicRoutes = [
    "home",
    "login",
    "register",
    "faq",
    "support",
    "terms",
    "privacy",
    "responsible-play"
];

const authenticatedRoutes = [
    "player-dashboard",
    "promoter-dashboard",
    "admin-dashboard"
];

function normalizeRoute(route) {
    if (!route) {
        return "home";
    }

    return route
        .replace(/^#/, "")
        .split("?")[0]
        .trim()
        .toLowerCase();
}

/*
 * Referral links use:
 *
 * #register?ref=PROMOCODE
 *
 * The route must only use "register".
 */

function getRouteFromHash() {
    const rawHash = window.location.hash || "";
    const hashWithoutPound = rawHash.replace(/^#/, "");
    const queryIndex = hashWithoutPound.indexOf("?");

    const route =
        queryIndex === -1
            ? hashWithoutPound
            : hashWithoutPound.slice(0, queryIndex);

    return normalizeRoute(route);
}

/*
 * Reads the promoter referral code from:
 *
 * #register?ref=PROMOCODE
 */

function getReferralCodeFromHash() {
    const rawHash = window.location.hash || "";
    const queryIndex = rawHash.indexOf("?");

    if (queryIndex === -1) {
        return "";
    }

    const query = rawHash.slice(queryIndex + 1);
    const params = new URLSearchParams(query);

    return (params.get("ref") || "")
        .trim()
        .toUpperCase();
}

function setRoute(route) {
    const normalized = normalizeRoute(route);

    if (window.location.hash !== `#${normalized}`) {
        window.location.hash = normalized;
    } else {
        renderRoute(normalized);
    }
}

function updateNavigation(route) {
    $$("[data-route]").forEach((link) => {
        const linkRoute = normalizeRoute(link.dataset.route);

        link.classList.toggle(
            "active",
            linkRoute === route
        );
    });
}

function closeMobileNav() {
    const nav = $("#mobileNav");
    const button = $("#mobileMenuButton");

    mobileNavOpen = false;

    if (nav) {
        nav.classList.remove("open");
    }

    if (button) {
        button.setAttribute(
            "aria-expanded",
            "false"
        );
    }
}

function toggleMobileNav() {
    const nav = $("#mobileNav");
    const button = $("#mobileMenuButton");

    if (!nav) {
        return;
    }

    mobileNavOpen = !mobileNavOpen;

    nav.classList.toggle(
        "open",
        mobileNavOpen
    );

    if (button) {
        button.setAttribute(
            "aria-expanded",
            String(mobileNavOpen)
        );
    }
}

/* ============================================================
   PAGE VISIBILITY
============================================================ */

function hideAllPages() {
    $$(".page-section").forEach((section) => {
        section.classList.remove("active");
    });
}

function showPage(pageName) {
    const page = $(`[data-page="${pageName}"]`);

    if (!page) {
        return false;
    }

    hideAllPages();
    page.classList.add("active");

    return true;
}

/* ============================================================
   AUTH STATE
============================================================ */

async function loadCurrentUser() {
    try {
        const data = await apiRequest("/api/auth/me");

        if (
            data &&
            data.ok &&
            data.authenticated &&
            data.user
        ) {
            currentUser = data;

            if (!Array.isArray(currentUser.user.roles)) {
                currentUser.user.roles = [];
            }

            return data;
        }

        currentUser = null;

        return null;
    } catch (error) {
        console.error(
            "Unable to load current user:",
            error
        );

        currentUser = null;

        return null;
    }
}

/* ============================================================
   ROLE HELPERS
============================================================ */

function getUserRoles() {
    if (!currentUser?.user) {
        return [];
    }

    return Array.isArray(currentUser.user.roles)
        ? currentUser.user.roles
        : [];
}

function userHasRole(role) {
    return getUserRoles().includes(role);
}

function userIsAdmin() {
    return userHasRole("admin");
}

function userIsPromoter() {
    /*
     * A valid promoter account normally has the promoter role.
     * The promoter profile fallback keeps older dual-role accounts
     * usable if their profile exists but the role list is stale.
     */
    return (
        userHasRole("promoter") ||
        Boolean(currentUser?.promoterProfile)
    );
}

function userIsPlayer() {
    return (
        userHasRole("player") ||
        Boolean(currentUser?.playerProfile)
    );
}

/*
 * Dual-role accounts:
 *
 * Admin -> Admin Dashboard
 * Promoter -> Promoter Dashboard
 * Player -> Player Dashboard
 */

function getDefaultDashboard() {
    const roles = getUserRoles();

    if (roles.includes("admin")) {
        return "admin-dashboard";
    }

    if (roles.includes("promoter")) {
        return "promoter-dashboard";
    }

    if (roles.includes("player")) {
        return "player-dashboard";
    }

    return "player-dashboard";
}

/* ============================================================
   ROUTE AUTHORIZATION
============================================================ */

function canAccessRoute(route) {
    if (route === "admin-dashboard") {
        return userIsAdmin();
    }

    if (route === "promoter-dashboard") {
        return userIsPromoter();
    }

    if (route === "player-dashboard") {
        return userIsPlayer();
    }

    return true;
}

/* ============================================================
   HEADER STATE
============================================================ */

function updateHeader() {
    const loginButton = $("#loginNavButton");
    const registerButton = $("#registerNavButton");

    const mobileLoginButton =
        $("#mobileLoginButton");

    const mobileRegisterButton =
        $("#mobileRegisterButton");

    if (currentUser) {
        if (loginButton) {
            loginButton.textContent = "Dashboard";
        }

        if (registerButton) {
            registerButton.textContent = "Sign Out";
        }

        if (mobileLoginButton) {
            mobileLoginButton.textContent = "Dashboard";
        }

        if (mobileRegisterButton) {
            mobileRegisterButton.textContent = "Sign Out";
        }
    } else {
        if (loginButton) {
            loginButton.textContent = "Sign In";
        }

        if (registerButton) {
            registerButton.textContent = "Create Account";
        }

        if (mobileLoginButton) {
            mobileLoginButton.textContent = "Sign In";
        }

        if (mobileRegisterButton) {
            mobileRegisterButton.textContent = "Create Account";
        }
    }
}

/* ============================================================
   DASHBOARD MODE BUTTONS
============================================================ */

/*
 * Player dashboard:
 * If the user is also a promoter, show "Promoter Mode".
 *
 * Promoter dashboard:
 * If the user is also a player, show "Player Mode".
 */

function updateModeButtons() {
    const playerModeButton =
        $("#playerModeButton");

    const promoterPlayerModeButton =
        $("#promoterPlayerModeButton");

    const showButton = (button, label, visible) => {
        if (!button) {
            return;
        }

        button.textContent = label;
        button.hidden = !visible;

        /*
         * Remove a possible inline display:none from the HTML.
         * The hidden property alone cannot override that.
         */
        if (visible) {
            button.style.removeProperty("display");
        } else {
            button.style.display = "none";
        }
    };

    showButton(
        playerModeButton,
        "Promoter Mode",
        Boolean(currentUser) && userIsPromoter()
    );

    showButton(
        promoterPlayerModeButton,
        "Player Mode",
        Boolean(currentUser) && userIsPlayer()
    );
}

/* ============================================================
   ROUTE RENDERING
============================================================ */

async function renderRoute(route) {
    route = normalizeRoute(route);

    if (
        !publicRoutes.includes(route) &&
        !authenticatedRoutes.includes(route)
    ) {
        route = currentUser
            ? getDefaultDashboard()
            : "home";
    }

    if (
        authenticatedRoutes.includes(route) &&
        !currentUser
    ) {
        showToast(
            "Please sign in to access your dashboard.",
            "error"
        );

        route = "login";
    }

    if (
        route === "admin-dashboard" &&
        currentUser &&
        !userIsAdmin()
    ) {
        showToast(
            "You do not have administrator access.",
            "error"
        );

        route = getDefaultDashboard();
    }

    if (
        route === "promoter-dashboard" &&
        currentUser &&
        !userIsPromoter()
    ) {
        showToast(
            "Promoter access is not available for this account.",
            "error"
        );

        route = "player-dashboard";
    }

    if (
        route === "player-dashboard" &&
        currentUser &&
        !userIsPlayer()
    ) {
        showToast(
            "Player access is not available for this account.",
            "error"
        );

        route = getDefaultDashboard();
    }

    showPage(route);

    currentPage = route;

    updateNavigation(route);
    updateHeader();
    updateModeButtons();

    closeMobileNav();

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

    if (route === "player-dashboard") {
        renderPlayerDashboard();
    }

    if (route === "promoter-dashboard") {
        renderPromoterDashboard();
    }

    if (route === "admin-dashboard") {
        renderAdminDashboard();
    }
}

/* ============================================================
   PLAYER DASHBOARD
============================================================ */

function renderPlayerDashboard() {
    if (!currentUser?.user) {
        return;
    }

    const user = currentUser.user;
    const playerProfile = currentUser.playerProfile;

    const fullName = [
        user.firstName,
        user.lastName
    ]
        .filter(Boolean)
        .join(" ");

    const welcomeName =
        user.firstName ||
        "Player";

    const welcomeElement =
        $("#playerWelcomeName");

    if (welcomeElement) {
        welcomeElement.textContent =
            welcomeName;
    }

    const accountName =
        $("#accountName");

    if (accountName) {
        accountName.textContent =
            fullName || "—";
    }

    const accountEmail =
        $("#accountEmail");

    if (accountEmail) {
        accountEmail.textContent =
            user.email || "—";
    }

    const accountPhone =
        $("#accountPhone");

    if (accountPhone) {
        accountPhone.textContent =
            user.phone || "Not provided";
    }

    const accountStatus =
        $("#accountStatus");

    if (accountStatus) {
        accountStatus.textContent =
            formatStatus(user.status);
    }

    const playerPoints =
        $("#playerPoints");

    if (playerPoints) {
        playerPoints.textContent = "0";
    }

    const playerVipLevel =
        $("#playerVipLevel");

    if (playerVipLevel) {
        playerVipLevel.textContent = "Bronze";
    }

    const playerRewards =
        $("#playerRewards");

    if (playerRewards) {
        playerRewards.textContent = "0";
    }

    const playerReferrals =
        $("#playerReferrals");

    if (playerReferrals) {
        playerReferrals.textContent = "0";
    }

    const vipCurrentLevel =
        $("#vipCurrentLevel");

    if (vipCurrentLevel) {
        vipCurrentLevel.textContent = "Bronze";
    }

    const vipProgressPercent =
        $("#vipProgressPercent");

    if (vipProgressPercent) {
        vipProgressPercent.textContent = "0%";
    }

    const vipProgressBar =
        $("#vipProgressBar");

    if (vipProgressBar) {
        vipProgressBar.style.width = "0%";
    }

    const vipProgressText =
        $("#vipProgressText");

    if (vipProgressText) {
        vipProgressText.textContent =
            "Your VIP progress will appear here.";
    }

    if (playerProfile?.referral_code) {
        // Player referral features can be connected here later.
    }
}

/* ============================================================
   PROMOTER REFERRAL STATS
============================================================ */

async function loadPromoterReferralStats() {
    if (
        !currentUser?.user ||
        !userIsPromoter()
    ) {
        return;
    }

    try {
        const data =
            await apiRequest(
                "/api/promoter/referrals"
            );

        if (!data?.ok) {
            return;
        }

        const stats = data.stats || {};

        const referralCount =
            $("#promoterReferralCount");

        if (referralCount) {
            referralCount.textContent =
                String(
                    stats.registrations ??
                    stats.referrals ??
                    0
                );
        }

        const qualifiedCount =
            $("#promoterQualifiedCount");

        if (qualifiedCount) {
            qualifiedCount.textContent =
                String(
                    stats.qualified ??
                    0
                );
        }

        const earnings =
            $("#promoterEarnings");

        if (earnings) {
            const earningsValue =
                Number(
                    stats.earnings ??
                    stats.totalEarnings ??
                    0
                );

            earnings.textContent =
                `$${earningsValue.toFixed(2)}`;
        }

        const clicks =
            $("#promoterClicks");

        if (clicks) {
            clicks.textContent =
                String(
                    stats.clicks ??
                    0
                );
        }

        renderPromoterReferralList(
            Array.isArray(data.referrals)
                ? data.referrals
                : []
        );
    } catch (error) {
        renderPromoterReferralList([]);
        console.warn(
            "Promoter referral stats are not available yet:",
            error
        );
    }
}

/* ============================================================
   PROMOTER REFERRAL LIST
============================================================ */

function renderPromoterReferralList(referrals) {
    let container =
        $("#promoterReferralList");

    if (!container) {
        const referralLink =
            $("#promoterReferralLink");

        if (!referralLink) {
            return;
        }

        container =
            document.createElement("div");

        container.id =
            "promoterReferralList";

        container.className =
            "promoter-referral-list";

        container.style.marginTop = "24px";

        const host =
            referralLink.closest(
                ".card, .panel, .section-card, .dashboard-card"
            ) ||
            referralLink.parentElement;

        if (host?.parentElement) {
            host.parentElement.appendChild(
                container
            );
        } else if (referralLink.parentElement) {
            referralLink.parentElement.appendChild(
                container
            );
        } else {
            return;
        }
    }

    if (!Array.isArray(referrals) || referrals.length === 0) {
        container.innerHTML = `
            <div style="padding:20px;border:1px solid #e5e7eb;border-radius:16px;background:#fff">
                <div style="font-weight:700;font-size:16px;margin-bottom:6px">Your Referrals</div>
                <div style="color:#6b7280;font-size:14px">No one has registered through your referral link yet.</div>
            </div>
        `;
        return;
    }

    const escapeHtml = (value) =>
        String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

    const formatDate = (value) => {
        if (!value) {
            return "—";
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return escapeHtml(value);
        }

        return escapeHtml(
            date.toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric"
            })
        );
    };

    const rows = referrals.map((referral) => {
        const fullName = [
            referral.firstName,
            referral.lastName
        ]
            .filter(Boolean)
            .join(" ") || "Unknown player";

        return `
            <tr>
                <td style="padding:12px;border-bottom:1px solid #eef0f3">
                    <strong>${escapeHtml(fullName)}</strong>
                </td>
                <td style="padding:12px;border-bottom:1px solid #eef0f3">
                    ${escapeHtml(referral.email || "—")}
                </td>
                <td style="padding:12px;border-bottom:1px solid #eef0f3">
                    ${escapeHtml(formatStatus(referral.status || "registered"))}
                </td>
                <td style="padding:12px;border-bottom:1px solid #eef0f3;white-space:nowrap">
                    ${formatDate(referral.registeredAt)}
                </td>
            </tr>
        `;
    }).join("");

    container.innerHTML = `
        <div style="padding:20px;border:1px solid #e5e7eb;border-radius:16px;background:#fff;overflow:hidden">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px">
                <div>
                    <div style="font-weight:700;font-size:16px">Your Referrals</div>
                    <div style="color:#6b7280;font-size:13px;margin-top:4px">People who registered through your promoter referral link.</div>
                </div>
                <div style="font-weight:700;font-size:20px">${referrals.length}</div>
            </div>
            <div style="overflow-x:auto">
                <table style="width:100%;border-collapse:collapse;min-width:620px;font-size:14px">
                    <thead>
                        <tr style="text-align:left;background:#f8fafc">
                            <th style="padding:12px">Player</th>
                            <th style="padding:12px">Email</th>
                            <th style="padding:12px">Status</th>
                            <th style="padding:12px">Registered</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </div>
    `;
}

/* ============================================================
   PROMOTER DASHBOARD
============================================================ */

function renderPromoterDashboard() {
    if (!currentUser?.user || !userIsPromoter()) {
        return;
    }

    const promoterProfile =
        currentUser.promoterProfile;

    const referralCount =
        $("#promoterReferralCount");

    if (referralCount) {
        referralCount.textContent = "0";
    }

    const qualifiedCount =
        $("#promoterQualifiedCount");

    if (qualifiedCount) {
        qualifiedCount.textContent = "0";
    }

    const earnings =
        $("#promoterEarnings");

    if (earnings) {
        earnings.textContent = "$0.00";
    }

    const clicks =
        $("#promoterClicks");

    if (clicks) {
        clicks.textContent = "0";
    }

    const referralLink =
        $("#promoterReferralLink");

    if (referralLink) {
        if (promoterProfile?.promoter_code) {
            const url =
                `${window.location.origin}/#register?ref=${encodeURIComponent(
                    promoterProfile.promoter_code
                )}`;

            referralLink.textContent = url;
        } else {
            referralLink.textContent =
                "Your promoter referral link will appear here.";
        }
    }

    loadPromoterReferralStats();
}

/* ============================================================
   ADMIN DASHBOARD
============================================================ */

function renderAdminDashboard() {
    if (
        !currentUser?.user ||
        !userIsAdmin()
    ) {
        return;
    }

    const players =
        $("#adminPlayers");

    const promoters =
        $("#adminPromoters");

    const rewards =
        $("#adminRewards");

    const support =
        $("#adminSupport");

    if (players) {
        players.textContent = "0";
    }

    if (promoters) {
        promoters.textContent = "0";
    }

    if (rewards) {
        rewards.textContent = "0";
    }

    if (support) {
        support.textContent = "0";
    }
}

/* ============================================================
   FORMATTING
============================================================ */

function formatStatus(status) {
    if (!status) {
        return "Unknown";
    }

    return status
        .toString()
        .replace(/[_-]/g, " ")
        .replace(/\b\w/g, (letter) =>
            letter.toUpperCase()
        );
}

/* ============================================================
   LOGIN
============================================================ */

async function handleLogin(event) {
    event.preventDefault();

    const form = event.currentTarget;

    clearFormMessage("loginMessage");

    const email =
        $("#loginEmail")?.value.trim() || "";

    const password =
        $("#loginPassword")?.value || "";

    if (!email) {
        showFormMessage(
            "loginMessage",
            "Please enter your email address."
        );

        return;
    }

    if (!isValidEmail(email)) {
        showFormMessage(
            "loginMessage",
            "Please enter a valid email address."
        );

        return;
    }

    if (!password) {
        showFormMessage(
            "loginMessage",
            "Please enter your password."
        );

        return;
    }

    const submitButton =
        $("#loginSubmitButton");

    const originalText =
        submitButton?.textContent ||
        "Sign In";

    if (submitButton) {
        submitButton.disabled = true;

        submitButton.textContent =
            "Signing in...";
    }

    setLoading(
        true,
        "Signing in..."
    );

    try {
        const data =
            await apiRequest(
                "/api/auth/login",
                {
                    method: "POST",
                    body: {
                        email,
                        password
                    }
                }
            );

        if (!data?.ok) {
            throw new Error(
                data?.error ||
                "Unable to sign in."
            );
        }

        await loadCurrentUser();

        if (!currentUser) {
            throw new Error(
                "Login succeeded, but the account session could not be loaded."
            );
        }

        console.log(
            "Authenticated user roles:",
            getUserRoles()
        );

        form.reset();

        showToast(
            "Welcome back!",
            "success"
        );

        setRoute(
            getDefaultDashboard()
        );
    } catch (error) {
        console.error(
            "Login error:",
            error
        );

        showFormMessage(
            "loginMessage",
            error?.data?.error ||
            error?.message ||
            "Unable to sign in. Please try again."
        );
    } finally {
        setLoading(false);

        if (submitButton) {
            submitButton.disabled = false;

            submitButton.textContent =
                originalText;
        }
    }
}

/* ============================================================
   REGISTRATION
============================================================ */

async function handleRegistration(event) {
    event.preventDefault();

    const form = event.currentTarget;

    clearFormMessage("registerMessage");

    const firstName =
        $("#registerFirstName")?.value.trim() || "";

    const lastName =
        $("#registerLastName")?.value.trim() || "";

    const email =
        $("#registerEmail")?.value.trim() || "";

    const phone =
        $("#registerPhone")?.value.trim() || "";

    const password =
        $("#registerPassword")?.value || "";

    const confirmPassword =
        $("#registerConfirmPassword")?.value || "";

    const accountExperience =
        $("#accountExperience")?.value ||
        "player";

    const termsAccepted =
        $("#registerTerms")?.checked ||
        false;

    /*
     * Capture referral code before the account is created.
     *
     * Example:
     * #register?ref=PROMO123
     */

    const referralCode =
        getReferralCodeFromHash();

    if (!firstName) {
        showFormMessage(
            "registerMessage",
            "Please enter your first name."
        );

        return;
    }

    if (!lastName) {
        showFormMessage(
            "registerMessage",
            "Please enter your last name."
        );

        return;
    }

    if (!email) {
        showFormMessage(
            "registerMessage",
            "Please enter your email address."
        );

        return;
    }

    if (!isValidEmail(email)) {
        showFormMessage(
            "registerMessage",
            "Please enter a valid email address."
        );

        return;
    }

    if (password.length < 8) {
        showFormMessage(
            "registerMessage",
            "Password must be at least 8 characters."
        );

        return;
    }

    if (password !== confirmPassword) {
        showFormMessage(
            "registerMessage",
            "Passwords do not match."
        );

        return;
    }

    if (!termsAccepted) {
        showFormMessage(
            "registerMessage",
            "Please accept the Terms, Privacy Policy and Responsible Play guidelines."
        );

        return;
    }

    const submitButton =
        $("#registerSubmitButton");

    const originalText =
        submitButton?.textContent ||
        "Create Account";

    if (submitButton) {
        submitButton.disabled = true;

        submitButton.textContent =
            "Creating account...";
    }

    setLoading(
        true,
        "Creating your account..."
    );

    try {
        const data =
            await apiRequest(
                "/api/auth/register",
                {
                    method: "POST",
                    body: {
                        firstName,
                        lastName,
                        email,
                        phone,
                        password,
                        accountExperience,
                        referralCode:
                            referralCode || null
                    }
                }
            );

        if (!data?.ok) {
            throw new Error(
                data?.error ||
                "Unable to create your account."
            );
        }

        await loadCurrentUser();

        if (!currentUser) {
            throw new Error(
                "Account was created, but the session could not be loaded."
            );
        }

        console.log(
            "New account roles:",
            getUserRoles()
        );

        form.reset();

        showToast(
            referralCode
                ? "Your account has been created and your referral was recorded."
                : "Your account has been created successfully.",
            "success"
        );

        setRoute(
            getDefaultDashboard()
        );
    } catch (error) {
        console.error(
            "Registration error:",
            error
        );

        showFormMessage(
            "registerMessage",
            error?.data?.error ||
            error?.message ||
            "Unable to create your account. Please try again."
        );
    } finally {
        setLoading(false);

        if (submitButton) {
            submitButton.disabled = false;

            submitButton.textContent =
                originalText;
        }
    }
}

/* ============================================================
   LOGOUT
============================================================ */

async function logout() {
    setLoading(
        true,
        "Signing out..."
    );

    try {
        await apiRequest(
            "/api/auth/logout",
            {
                method: "POST"
            }
        );
    } catch (error) {
        console.error(
            "Logout error:",
            error
        );
    } finally {
        currentUser = null;

        updateHeader();
        updateModeButtons();

        setLoading(false);

        showToast(
            "You have been signed out.",
            "success"
        );

        setRoute("home");
    }
}

/* ============================================================
   EMAIL VALIDATION
============================================================ */

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email
    );
}

/* ============================================================
   PASSWORD VISIBILITY
============================================================ */

function setupPasswordVisibility() {
    const checkbox =
        $("#showLoginPassword");

    const password =
        $("#loginPassword");

    if (!checkbox || !password) {
        return;
    }

    checkbox.addEventListener(
        "change",
        () => {
            password.type =
                checkbox.checked
                    ? "text"
                    : "password";
        }
    );
}

/* ============================================================
   NAVIGATION BUTTONS
============================================================ */

function setupNavigationButtons() {
    const loginNavButton =
        $("#loginNavButton");

    if (loginNavButton) {
        loginNavButton.addEventListener(
            "click",
            () => {
                if (currentUser) {
                    setRoute(
                        getDefaultDashboard()
                    );
                } else {
                    setRoute("login");
                }
            }
        );
    }

    const registerNavButton =
        $("#registerNavButton");

    if (registerNavButton) {
        registerNavButton.addEventListener(
            "click",
            () => {
                if (currentUser) {
                    logout();
                } else {
                    setRoute("register");
                }
            }
        );
    }

    const mobileLoginButton =
        $("#mobileLoginButton");

    if (mobileLoginButton) {
        mobileLoginButton.addEventListener(
            "click",
            () => {
                closeMobileNav();

                if (currentUser) {
                    setRoute(
                        getDefaultDashboard()
                    );
                } else {
                    setRoute("login");
                }
            }
        );
    }

    const mobileRegisterButton =
        $("#mobileRegisterButton");

    if (mobileRegisterButton) {
        mobileRegisterButton.addEventListener(
            "click",
            () => {
                closeMobileNav();

                if (currentUser) {
                    logout();
                } else {
                    setRoute("register");
                }
            }
        );
    }

    const heroLoginButton =
        $("#heroLoginButton");

    if (heroLoginButton) {
        heroLoginButton.addEventListener(
            "click",
            () => setRoute("login")
        );
    }

    const heroRegisterButton =
        $("#heroRegisterButton");

    if (heroRegisterButton) {
        heroRegisterButton.addEventListener(
            "click",
            () => setRoute("register")
        );
    }

    const loginRegisterButton =
        $("#loginRegisterButton");

    if (loginRegisterButton) {
        loginRegisterButton.addEventListener(
            "click",
            () => setRoute("register")
        );
    }

    const registerLoginButton =
        $("#registerLoginButton");

    if (registerLoginButton) {
        registerLoginButton.addEventListener(
            "click",
            () => setRoute("login")
        );
    }

    const supportLoginButton =
        $("#supportLoginButton");

    if (supportLoginButton) {
        supportLoginButton.addEventListener(
            "click",
            () => setRoute("login")
        );
    }

    const forgotPasswordButton =
        $("#forgotPasswordButton");

    if (forgotPasswordButton) {
        forgotPasswordButton.addEventListener(
            "click",
            () => {
                showToast(
                    "Password recovery will be connected next.",
                    "success"
                );
            }
        );
    }

    const mobileMenuButton =
        $("#mobileMenuButton");

    if (mobileMenuButton) {
        mobileMenuButton.addEventListener(
            "click",
            toggleMobileNav
        );
    }
}

/* ============================================================
   DASHBOARD BUTTONS
============================================================ */

function setupDashboardButtons() {
    const playerLogout =
        $("#playerLogoutButton");

    if (playerLogout) {
        playerLogout.addEventListener(
            "click",
            logout
        );
    }

    const promoterLogout =
        $("#promoterLogoutButton");

    if (promoterLogout) {
        promoterLogout.addEventListener(
            "click",
            logout
        );
    }

    const adminLogout =
        $("#adminLogoutButton");

    if (adminLogout) {
        adminLogout.addEventListener(
            "click",
            logout
        );
    }

    /*
     * PLAYER DASHBOARD -> PROMOTER MODE
     */

    const playerMode =
        $("#playerModeButton");

    if (playerMode) {
        playerMode.addEventListener(
            "click",
            () => {
                if (userIsPromoter()) {
                    setRoute(
                        "promoter-dashboard"
                    );
                } else {
                    showToast(
                        "Promoter access is not available for this account.",
                        "error"
                    );
                }
            }
        );
    }

    /*
     * PROMOTER DASHBOARD -> PLAYER MODE
     */

    const promoterPlayerMode =
        $("#promoterPlayerModeButton");

    if (promoterPlayerMode) {
        promoterPlayerMode.addEventListener(
            "click",
            () => {
                if (userIsPlayer()) {
                    setRoute(
                        "player-dashboard"
                    );
                } else {
                    showToast(
                        "Player mode is not available for this account.",
                        "error"
                    );
                }
            }
        );
    }

    const copyReferralButton =
        $("#copyReferralButton");

    if (copyReferralButton) {
        copyReferralButton.addEventListener(
            "click",
            copyReferralLink
        );
    }

    $$("[data-admin-module]").forEach(
        (button) => {
            button.addEventListener(
                "click",
                () => {
                    const module =
                        button.dataset.adminModule;

                    showToast(
                        `${capitalize(module)} management will be connected next.`,
                        "success"
                    );
                }
            );
        }
    );
}

/* ============================================================
   COPY REFERRAL
============================================================ */

async function copyReferralLink() {
    const element =
        $("#promoterReferralLink");

    const text =
        element?.textContent?.trim();

    if (
        !text ||
        text.includes("will appear here")
    ) {
        showToast(
            "Your referral link is not available yet.",
            "error"
        );

        return;
    }

    try {
        await navigator.clipboard.writeText(text);

        showToast(
            "Referral link copied.",
            "success"
        );
    } catch (error) {
        console.error(
            "Clipboard error:",
            error
        );

        showToast(
            "Unable to copy the referral link.",
            "error"
        );
    }
}

/* ============================================================
   CAPITALIZE
============================================================ */

function capitalize(value) {
    if (!value) {
        return "";
    }

    return (
        value.charAt(0).toUpperCase() +
        value.slice(1)
    );
}

/* ============================================================
   ROUTE LINKS
============================================================ */

function setupRouteLinks() {
    $$("[data-route]").forEach(
        (link) => {
            link.addEventListener(
                "click",
                (event) => {
                    const route =
                        normalizeRoute(
                            link.dataset.route
                        );

                    if (
                        link.tagName === "A" &&
                        link.getAttribute("href") ===
                            `#${route}`
                    ) {
                        return;
                    }

                    event.preventDefault();

                    setRoute(route);
                }
            );
        }
    );
}

/* ============================================================
   FORM SETUP
============================================================ */

function setupForms() {
    const loginForm =
        $("#loginForm");

    if (loginForm) {
        loginForm.addEventListener(
            "submit",
            handleLogin
        );
    }

    const registerForm =
        $("#registerForm");

    if (registerForm) {
        registerForm.addEventListener(
            "submit",
            handleRegistration
        );
    }
}

/* ============================================================
   FOOTER YEAR
============================================================ */

function setupFooterYear() {
    const year =
        $("#footerYear");

    if (year) {
        year.textContent =
            new Date().getFullYear();
    }
}

/* ============================================================
   KEYBOARD / HASH EVENTS
============================================================ */

function setupGlobalEvents() {
    window.addEventListener(
        "hashchange",
        () => {
            renderRoute(
                getRouteFromHash()
            );
        }
    );

    document.addEventListener(
        "keydown",
        (event) => {
            if (
                event.key === "Escape" &&
                mobileNavOpen
            ) {
                closeMobileNav();
            }
        }
    );
}

/* ============================================================
   INITIALIZATION
============================================================ */

async function initializeApp() {
    setupFooterYear();
    setupNavigationButtons();
    setupDashboardButtons();
    setupPasswordVisibility();
    setupForms();
    setupRouteLinks();
    setupGlobalEvents();

    setLoading(
        true,
        "Checking your account..."
    );

    await loadCurrentUser();

    updateHeader();
    updateModeButtons();

    setLoading(false);

    let route =
        getRouteFromHash();

    if (
        authenticatedRoutes.includes(route) &&
        !currentUser
    ) {
        route = "login";
    }

    if (
        route === "admin-dashboard" &&
        currentUser &&
        !userIsAdmin()
    ) {
        route = getDefaultDashboard();
    }

    if (
        route === "promoter-dashboard" &&
        currentUser &&
        !userIsPromoter()
    ) {
        route = getDefaultDashboard();
    }

    if (
        route === "player-dashboard" &&
        currentUser &&
        !userIsPlayer()
    ) {
        route = getDefaultDashboard();
    }

    if (!route) {
        route = "home";
    }

    await renderRoute(route);
}

/* ============================================================
   START
============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    initializeApp
);