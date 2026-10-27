CREATE TABLE customer_account (
 customer_id text PRIMARY KEY, display_name text NOT NULL DEFAULT '', address jsonb,
 version bigint NOT NULL DEFAULT 0 CHECK(version>=0), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE cart_merge (
 guest_id text PRIMARY KEY REFERENCES cart(customer_id), customer_id text NOT NULL REFERENCES cart(customer_id),
 created_at timestamptz NOT NULL DEFAULT now(), CHECK(guest_id<>customer_id)
);
CREATE INDEX customer_checkout_history ON checkout(customer_id,created_at DESC,id);
