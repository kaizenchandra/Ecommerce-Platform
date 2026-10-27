CREATE TABLE cart (
 customer_id text PRIMARY KEY, version bigint NOT NULL DEFAULT 0 CHECK(version>=0), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE cart_item (
 customer_id text NOT NULL REFERENCES cart(customer_id), offer_id uuid NOT NULL REFERENCES offer(id),
 quantity integer NOT NULL CHECK(quantity BETWEEN 1 AND 10), PRIMARY KEY(customer_id,offer_id)
);
CREATE TABLE checkout_item (
 checkout_id uuid NOT NULL REFERENCES checkout(id), offer_id uuid NOT NULL REFERENCES offer(id),
 seller_id text NOT NULL, title text NOT NULL, quantity integer NOT NULL CHECK(quantity BETWEEN 1 AND 10),
 unit_paise bigint NOT NULL CHECK(unit_paise>0 AND unit_paise<=100000000),
 PRIMARY KEY(checkout_id,offer_id)
);
INSERT INTO checkout_item(checkout_id,offer_id,seller_id,title,quantity,unit_paise)
SELECT id,offer_id,seller_id,title,quantity,unit_paise FROM checkout;
ALTER TABLE capture_journal DROP CONSTRAINT capture_journal_checkout_id_key;
ALTER TABLE capture_journal DROP CONSTRAINT capture_journal_provider_payment_id_key;
ALTER TABLE capture_journal ADD CONSTRAINT capture_journal_checkout_seller UNIQUE(checkout_id,seller_id);
ALTER TABLE capture_journal ADD CONSTRAINT capture_journal_payment_seller UNIQUE(provider_payment_id,seller_id);
