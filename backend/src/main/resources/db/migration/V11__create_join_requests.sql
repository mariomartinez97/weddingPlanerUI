CREATE TABLE join_requests (
    id          VARCHAR(50) PRIMARY KEY,
    user_id     VARCHAR(50) NOT NULL REFERENCES app_users(id),
    plan_id     VARCHAR(50) NOT NULL REFERENCES plans(id),
    status      VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    reason      VARCHAR(500),
    created_at  TIMESTAMP DEFAULT NOW(),
    resolved_at TIMESTAMP,
    resolved_by VARCHAR(50) REFERENCES app_users(id),
    CONSTRAINT chk_join_status CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED'))
);

CREATE INDEX idx_join_requests_plan_status ON join_requests(plan_id, status);
CREATE INDEX idx_join_requests_user ON join_requests(user_id);
CREATE UNIQUE INDEX idx_join_requests_pending ON join_requests(user_id, plan_id) WHERE status = 'PENDING';
