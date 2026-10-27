CREATE TABLE fulfillment (
 checkout_id uuid NOT NULL REFERENCES checkout(id), seller_id text NOT NULL,
 state text NOT NULL CHECK(state IN ('PACKED','SHIPPED','DELIVERED')),
 carrier text NOT NULL DEFAULT '', tracking_reference text NOT NULL DEFAULT '',
 version bigint NOT NULL CHECK(version>0), updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(checkout_id,seller_id),
 CHECK(state='PACKED' OR (length(carrier)>0 AND length(tracking_reference)>0))
);
CREATE INDEX checkout_item_seller ON checkout_item(seller_id,checkout_id);
