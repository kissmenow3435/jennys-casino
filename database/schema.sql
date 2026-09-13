PRAGMA foreign_keys = ON;

-- ============================================================
-- JENNY'S CASINO
-- Cloudflare D1 / SQLite Database
-- ============================================================

-- ============================================================
-- USERS
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,

    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,

    phone TEXT,

    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'suspended', 'disabled', 'pending')),

    email_verified INTEGER NOT NULL DEFAULT 0
        CHECK (email_verified IN (0, 1)),

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_users_email
ON users(email);

CREATE INDEX IF NOT EXISTS idx_users_status
ON users(status);


-- ============================================================
-- ROLES
-- ============================================================

CREATE TABLE IF NOT EXISTS roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

INSERT OR IGNORE INTO roles (name) VALUES
    ('player'),
    ('promoter'),
    ('admin');


CREATE TABLE IF NOT EXISTS user_roles (
    user_id TEXT NOT NULL,
    role_id INTEGER NOT NULL,

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (user_id, role_id),

    FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    FOREIGN KEY (role_id)
        REFERENCES roles(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user
ON user_roles(user_id);

CREATE INDEX IF NOT EXISTS idx_user_roles_role
ON user_roles(role_id);


-- ============================================================
-- PLAYER PROFILES
-- ============================================================

CREATE TABLE IF NOT EXISTS player_profiles (
    user_id TEXT PRIMARY KEY,

    display_name TEXT,
    date_of_birth TEXT,

    referral_code TEXT UNIQUE,

    marketing_opt_in INTEGER NOT NULL DEFAULT 0
        CHECK (marketing_opt_in IN (0, 1)),

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);


-- ============================================================
-- PROMOTER PROFILES
-- ============================================================

CREATE TABLE IF NOT EXISTS promoter_profiles (
    user_id TEXT PRIMARY KEY,

    promoter_code TEXT UNIQUE,

    display_name TEXT,

    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (
            status IN (
                'pending',
                'approved',
                'suspended',
                'rejected'
            )
        ),

    commission_rate REAL NOT NULL DEFAULT 0,

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_promoter_profiles_code
ON promoter_profiles(promoter_code);

CREATE INDEX IF NOT EXISTS idx_promoter_profiles_status
ON promoter_profiles(status);


-- ============================================================
-- AUTH SESSIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,

    user_id TEXT NOT NULL,

    token_hash TEXT NOT NULL UNIQUE,

    expires_at TEXT NOT NULL,

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TEXT,

    ip_address TEXT,
    user_agent TEXT,

    FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_user
ON sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_sessions_expires
ON sessions(expires_at);

CREATE INDEX IF NOT EXISTS idx_sessions_token
ON sessions(token_hash);


-- ============================================================
-- EMAIL VERIFICATION
-- ============================================================

CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id TEXT PRIMARY KEY,

    user_id TEXT NOT NULL,

    token_hash TEXT NOT NULL UNIQUE,

    expires_at TEXT NOT NULL,

    used_at TEXT,

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_email_tokens_user
ON email_verification_tokens(user_id);


-- ============================================================
-- PASSWORD RESET
-- ============================================================

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id TEXT PRIMARY KEY,

    user_id TEXT NOT NULL,

    token_hash TEXT NOT NULL UNIQUE,

    expires_at TEXT NOT NULL,

    used_at TEXT,

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_password_reset_user
ON password_reset_tokens(user_id);


-- ============================================================
-- LOYALTY ACCOUNTS
-- ============================================================

CREATE TABLE IF NOT EXISTS loyalty_accounts (
    id TEXT PRIMARY KEY,

    user_id TEXT NOT NULL UNIQUE,

    points_balance INTEGER NOT NULL DEFAULT 0
        CHECK (points_balance >= 0),

    lifetime_points_earned INTEGER NOT NULL DEFAULT 0
        CHECK (lifetime_points_earned >= 0),

    lifetime_points_redeemed INTEGER NOT NULL DEFAULT 0
        CHECK (lifetime_points_redeemed >= 0),

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_loyalty_user
ON loyalty_accounts(user_id);


-- ============================================================
-- LOYALTY TRANSACTIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS loyalty_transactions (
    id TEXT PRIMARY KEY,

    user_id TEXT NOT NULL,

    transaction_type TEXT NOT NULL
        CHECK (
            transaction_type IN (
                'earned',
                'redeemed',
                'adjustment',
                'expired',
                'reversal'
            )
        ),

    source TEXT NOT NULL,

    description TEXT,

    points INTEGER NOT NULL
        CHECK (points != 0),

    balance_after INTEGER NOT NULL
        CHECK (balance_after >= 0),

    reference_id TEXT,

    created_by TEXT,

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    FOREIGN KEY (created_by)
        REFERENCES users(id)
        ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_user
ON loyalty_transactions(user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_source
ON loyalty_transactions(source);


-- ============================================================
-- LOYALTY RULES
-- ============================================================

CREATE TABLE IF NOT EXISTS loyalty_rules (
    id TEXT PRIMARY KEY,

    name TEXT NOT NULL,

    source_type TEXT NOT NULL,

    points INTEGER NOT NULL,

    description TEXT,

    active INTEGER NOT NULL DEFAULT 1
        CHECK (active IN (0, 1)),

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_loyalty_rules_active
ON loyalty_rules(active);


-- ============================================================
-- VIP LEVELS
-- ============================================================

CREATE TABLE IF NOT EXISTS vip_levels (
    id TEXT PRIMARY KEY,

    name TEXT NOT NULL UNIQUE,

    sort_order INTEGER NOT NULL UNIQUE,

    required_points INTEGER NOT NULL DEFAULT 0
        CHECK (required_points >= 0),

    benefits TEXT,

    active INTEGER NOT NULL DEFAULT 1
        CHECK (active IN (0, 1)),

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- Default VIP structure.
-- Thresholds are configuration data and can be changed by Admin.

INSERT OR IGNORE INTO vip_levels
    (id, name, sort_order, required_points, benefits)
VALUES
    ('vip_bronze', 'Bronze', 1, 0, 'Entry-level VIP benefits'),
    ('vip_silver', 'Silver', 2, 500, 'Silver VIP benefits'),
    ('vip_gold', 'Gold', 3, 1000, 'Gold VIP benefits'),
    ('vip_platinum', 'Platinum', 4, 2000, 'Platinum VIP benefits'),
    ('vip_diamond', 'Diamond', 5, 5000, 'Diamond VIP benefits');


-- ============================================================
-- VIP PROGRESS
-- ============================================================

CREATE TABLE IF NOT EXISTS vip_progress (
    user_id TEXT PRIMARY KEY,

    current_level_id TEXT NOT NULL,

    current_points INTEGER NOT NULL DEFAULT 0
        CHECK (current_points >= 0),

    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    FOREIGN KEY (current_level_id)
        REFERENCES vip_levels(id)
);

CREATE INDEX IF NOT EXISTS idx_vip_progress_level
ON vip_progress(current_level_id);


-- ============================================================
-- VIP HISTORY
-- ============================================================

CREATE TABLE IF NOT EXISTS vip_history (
    id TEXT PRIMARY KEY,

    user_id TEXT NOT NULL,

    previous_level_id TEXT,

    new_level_id TEXT NOT NULL,

    reason TEXT,

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    FOREIGN KEY (previous_level_id)
        REFERENCES vip_levels(id),

    FOREIGN KEY (new_level_id)
        REFERENCES vip_levels(id)
);

CREATE INDEX IF NOT EXISTS idx_vip_history_user
ON vip_history(user_id, created_at);


-- ============================================================
-- REWARDS
-- ============================================================

CREATE TABLE IF NOT EXISTS rewards (
    id TEXT PRIMARY KEY,

    name TEXT NOT NULL,

    description TEXT,

    reward_type TEXT NOT NULL
        CHECK (
            reward_type IN (
                'loyalty',
                'birthday',
                'vip',
                'event',
                'custom'
            )
        ),

    eligibility_type TEXT NOT NULL
        CHECK (
            eligibility_type IN (
                'all_players',
                'vip_level',
                'minimum_points',
                'manual',
                'custom'
            )
        ),

    eligibility_value TEXT,

    active INTEGER NOT NULL DEFAULT 1
        CHECK (active IN (0, 1)),

    starts_at TEXT,

    expires_at TEXT,

    max_claims INTEGER,

    created_by TEXT,

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (created_by)
        REFERENCES users(id)
        ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_rewards_active
ON rewards(active);

CREATE INDEX IF NOT EXISTS idx_rewards_dates
ON rewards(starts_at, expires_at);


-- ============================================================
-- REWARD CLAIMS
-- ============================================================

CREATE TABLE IF NOT EXISTS reward_claims (
    id TEXT PRIMARY KEY,

    reward_id TEXT NOT NULL,

    user_id TEXT NOT NULL,

    status TEXT NOT NULL DEFAULT 'claimed'
        CHECK (
            status IN (
                'claimed',
                'approved',
                'fulfilled',
                'rejected',
                'expired',
                'cancelled'
            )
        ),

    claimed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    fulfilled_at TEXT,

    reviewed_by TEXT,

    notes TEXT,

    FOREIGN KEY (reward_id)
        REFERENCES rewards(id)
        ON DELETE RESTRICT,

    FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    FOREIGN KEY (reviewed_by)
        REFERENCES users(id)
        ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_reward_claims_user
ON reward_claims(user_id, claimed_at);

CREATE INDEX IF NOT EXISTS idx_reward_claims_reward
ON reward_claims(reward_id);


-- ============================================================
-- REFERRAL CODES
-- ============================================================

CREATE TABLE IF NOT EXISTS referral_codes (
    id TEXT PRIMARY KEY,

    promoter_id TEXT,

    player_id TEXT,

    code TEXT NOT NULL UNIQUE,

    active INTEGER NOT NULL DEFAULT 1
        CHECK (active IN (0, 1)),

    campaign TEXT,

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (promoter_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    FOREIGN KEY (player_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CHECK (
        (promoter_id IS NOT NULL AND player_id IS NULL)
        OR
        (promoter_id IS NULL AND player_id IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_referral_codes_promoter
ON referral_codes(promoter_id);

CREATE INDEX IF NOT EXISTS idx_referral_codes_player
ON referral_codes(player_id);

CREATE INDEX IF NOT EXISTS idx_referral_codes_code
ON referral_codes(code);


-- ============================================================
-- REFERRAL CLICKS
-- ============================================================

CREATE TABLE IF NOT EXISTS referral_clicks (
    id TEXT PRIMARY KEY,

    referral_code_id TEXT NOT NULL,

    session_identifier TEXT,

    source TEXT,

    campaign TEXT,

    landing_page TEXT,

    ip_hash TEXT,

    user_agent_hash TEXT,

    clicked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (referral_code_id)
        REFERENCES referral_codes(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_referral_clicks_code
ON referral_clicks(referral_code_id, clicked_at);

CREATE INDEX IF NOT EXISTS idx_referral_clicks_session
ON referral_clicks(session_identifier);


-- ============================================================
-- REFERRALS
-- ============================================================

CREATE TABLE IF NOT EXISTS referrals (
    id TEXT PRIMARY KEY,

    promoter_id TEXT NOT NULL,

    referred_user_id TEXT NOT NULL UNIQUE,

    referral_code_id TEXT NOT NULL,

    click_id TEXT,

    status TEXT NOT NULL DEFAULT 'registered'
        CHECK (
            status IN (
                'registered',
                'pending',
                'qualified',
                'rejected',
                'cancelled'
            )
        ),

    registered_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    qualified_at TEXT,

    qualification_reason TEXT,

    FOREIGN KEY (promoter_id)
        REFERENCES users(id)
        ON DELETE RESTRICT,

    FOREIGN KEY (referred_user_id)
        REFERENCES users(id)
        ON DELETE RESTRICT,

    FOREIGN KEY (referral_code_id)
        REFERENCES referral_codes(id)
        ON DELETE RESTRICT,

    FOREIGN KEY (click_id)
        REFERENCES referral_clicks(id)
        ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_referrals_promoter
ON referrals(promoter_id, registered_at);

CREATE INDEX IF NOT EXISTS idx_referrals_status
ON referrals(status);

CREATE INDEX IF NOT EXISTS idx_referrals_referred_user
ON referrals(referred_user_id);


-- ============================================================
-- REFERRAL REWARDS / EARNINGS
-- ============================================================

CREATE TABLE IF NOT EXISTS referral_rewards (
    id TEXT PRIMARY KEY,

    referral_id TEXT NOT NULL,

    promoter_id TEXT NOT NULL,

    amount REAL NOT NULL DEFAULT 0
        CHECK (amount >= 0),

    currency TEXT NOT NULL DEFAULT 'USD',

    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (
            status IN (
                'pending',
                'approved',
                'paid',
                'reversed',
                'cancelled'
            )
        ),

    description TEXT,

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    approved_at TEXT,
    paid_at TEXT,

    FOREIGN KEY (referral_id)
        REFERENCES referrals(id)
        ON DELETE RESTRICT,

    FOREIGN KEY (promoter_id)
        REFERENCES users(id)
        ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_referral_rewards_promoter
ON referral_rewards(promoter_id, created_at);

CREATE INDEX IF NOT EXISTS idx_referral_rewards_status
ON referral_rewards(status);


-- ============================================================
-- REFERRAL PAYOUTS
-- ============================================================

CREATE TABLE IF NOT EXISTS referral_payouts (
    id TEXT PRIMARY KEY,

    promoter_id TEXT NOT NULL,

    amount REAL NOT NULL
        CHECK (amount > 0),

    currency TEXT NOT NULL DEFAULT 'USD',

    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (
            status IN (
                'pending',
                'processing',
                'paid',
                'rejected',
                'cancelled'
            )
        ),

    payment_method TEXT,

    payment_reference TEXT,

    requested_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    processed_at TEXT,

    processed_by TEXT,

    notes TEXT,

    FOREIGN KEY (promoter_id)
        REFERENCES users(id)
        ON DELETE RESTRICT,

    FOREIGN KEY (processed_by)
        REFERENCES users(id)
        ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_payouts_promoter
ON referral_payouts(promoter_id, requested_at);

CREATE INDEX IF NOT EXISTS idx_payouts_status
ON referral_payouts(status);


-- ============================================================
-- SUPPORT TICKETS
-- ============================================================

CREATE TABLE IF NOT EXISTS support_tickets (
    id TEXT PRIMARY KEY,

    user_id TEXT NOT NULL,

    subject TEXT NOT NULL,

    category TEXT NOT NULL DEFAULT 'general',

    priority TEXT NOT NULL DEFAULT 'normal'
        CHECK (
            priority IN (
                'low',
                'normal',
                'high',
                'urgent'
            )
        ),

    status TEXT NOT NULL DEFAULT 'open'
        CHECK (
            status IN (
                'open',
                'in_progress',
                'waiting',
                'resolved',
                'closed'
            )
        ),

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_user
ON support_tickets(user_id);

CREATE INDEX IF NOT EXISTS idx_support_tickets_status
ON support_tickets(status);


-- ============================================================
-- SUPPORT MESSAGES
-- ============================================================

CREATE TABLE IF NOT EXISTS support_messages (
    id TEXT PRIMARY KEY,

    ticket_id TEXT NOT NULL,

    sender_id TEXT NOT NULL,

    message TEXT NOT NULL,

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (ticket_id)
        REFERENCES support_tickets(id)
        ON DELETE CASCADE,

    FOREIGN KEY (sender_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_support_messages_ticket
ON support_messages(ticket_id, created_at);


-- ============================================================
-- NOTIFICATIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,

    user_id TEXT NOT NULL,

    title TEXT NOT NULL,

    message TEXT NOT NULL,

    type TEXT NOT NULL DEFAULT 'system',

    read_at TEXT,

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notifications_user
ON notifications(user_id, created_at);


-- ============================================================
-- ADMIN SETTINGS
-- ============================================================

CREATE TABLE IF NOT EXISTS admin_settings (
    key TEXT PRIMARY KEY,

    value TEXT NOT NULL,

    value_type TEXT NOT NULL DEFAULT 'string'
        CHECK (
            value_type IN (
                'string',
                'number',
                'boolean',
                'json'
            )
        ),

    description TEXT,

    updated_by TEXT,

    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (updated_by)
        REFERENCES users(id)
        ON DELETE SET NULL
);


-- ============================================================
-- AUDIT LOGS
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,

    admin_user_id TEXT,

    action TEXT NOT NULL,

    target_type TEXT,

    target_id TEXT,

    details TEXT,

    ip_address TEXT,

    user_agent TEXT,

    result TEXT NOT NULL DEFAULT 'success'
        CHECK (
            result IN (
                'success',
                'failure'
            )
        ),

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (admin_user_id)
        REFERENCES users(id)
        ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_admin
ON audit_logs(admin_user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_audit_logs_target
ON audit_logs(target_type, target_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action
ON audit_logs(action, created_at);


-- ============================================================
-- SYSTEM SETTINGS
-- ============================================================

INSERT OR IGNORE INTO admin_settings
    (key, value, value_type, description)
VALUES
    (
        'commission_rate',
        '0',
        'number',
        'Default promoter commission rate'
    ),
    (
        'minimum_payout',
        '0',
        'number',
        'Minimum promoter payout amount'
    ),
    (
        'payout_schedule',
        'manual',
        'string',
        'Promoter payout schedule'
    ),
    (
        'referral_qualification_enabled',
        'false',
        'boolean',
        'Whether referral qualification rules are enabled'
    ),
    (
        'registration_referral_window_days',
        '30',
        'number',
        'Referral attribution window'
    );


-- ============================================================
-- DEFAULT INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_users_created
ON users(created_at);

CREATE INDEX IF NOT EXISTS idx_users_last_login
ON users(last_login_at);

-- ============================================================
-- END OF SCHEMA
-- ============================================================