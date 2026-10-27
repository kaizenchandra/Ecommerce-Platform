CREATE TABLE product (
 id uuid PRIMARY KEY, sku text NOT NULL UNIQUE, title text NOT NULL,
 category text NOT NULL, description text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE offer (
 id uuid PRIMARY KEY, product_id uuid NOT NULL REFERENCES product(id), seller_id text NOT NULL,
 seller_name text NOT NULL, price_paise bigint NOT NULL CHECK (price_paise > 0 AND price_paise <= 100000000),
 on_hand integer NOT NULL CHECK(on_hand >= 0), reserved integer NOT NULL DEFAULT 0,
 status text NOT NULL CHECK(status IN ('DRAFT','PUBLISHED')), version bigint NOT NULL DEFAULT 1,
 CHECK(reserved >= 0 AND reserved <= on_hand)
);
CREATE INDEX offer_seller ON offer(seller_id);
CREATE TABLE checkout (
 id uuid PRIMARY KEY, customer_id text NOT NULL, idempotency_key text NOT NULL,
 offer_id uuid NOT NULL REFERENCES offer(id), quantity integer NOT NULL CHECK(quantity BETWEEN 1 AND 10),
 unit_paise bigint NOT NULL, total_paise bigint NOT NULL CHECK(total_paise > 0), currency text NOT NULL DEFAULT 'INR',
 title text NOT NULL, seller_id text NOT NULL, address jsonb NOT NULL,
 state text NOT NULL DEFAULT 'PENDING' CHECK(state IN ('PENDING','CONFIRMED','EXPIRED','REVIEW')),
 provider_order_id text UNIQUE, provider_payment_id text UNIQUE,
 provider_state text NOT NULL DEFAULT 'CREATING',
 expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(customer_id, idempotency_key)
);
CREATE TABLE outbox (
 id uuid PRIMARY KEY, aggregate_id uuid NOT NULL, topic text NOT NULL,
 payload jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), published_at timestamptz
);
CREATE INDEX outbox_pending ON outbox(created_at) WHERE published_at IS NULL;
CREATE TABLE audit (
 id bigserial PRIMARY KEY, actor text NOT NULL, action text NOT NULL,
 aggregate_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE webhook_inbox (
 event_id text PRIMARY KEY, received_at timestamptz NOT NULL DEFAULT now()
);
