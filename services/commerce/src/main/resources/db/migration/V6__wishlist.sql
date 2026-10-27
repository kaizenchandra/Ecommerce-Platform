CREATE TABLE wishlist_item (
 customer_id text NOT NULL, offer_id uuid NOT NULL REFERENCES offer(id), created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(customer_id,offer_id)
);
