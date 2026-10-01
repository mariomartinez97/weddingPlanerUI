CREATE TABLE preapproved_emails (
    id         VARCHAR(50) PRIMARY KEY,
    email      VARCHAR(255) NOT NULL,
    plan_id    VARCHAR(50) NOT NULL REFERENCES plans(id),
    role       VARCHAR(30) NOT NULL DEFAULT 'MEMBER',
    created_by VARCHAR(50) NOT NULL REFERENCES app_users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    claimed    BOOLEAN DEFAULT FALSE,
    claimed_at TIMESTAMP,
    CONSTRAINT chk_preapproved_role CHECK (role IN ('MEMBER', 'SUBSCRIPTION_ADMIN')),
    CONSTRAINT uq_preapproved_email_plan UNIQUE (email, plan_id)
);

CREATE INDEX idx_preapproved_email ON preapproved_emails(email);
