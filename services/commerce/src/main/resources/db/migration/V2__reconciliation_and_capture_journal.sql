ALTER TABLE checkout ADD COLUMN reconcile_attempts integer NOT NULL DEFAULT 0 CHECK(reconcile_attempts >= 0);
ALTER TABLE checkout ADD COLUMN reconcile_after timestamptz NOT NULL DEFAULT now();
ALTER TABLE checkout ADD COLUMN reconcile_lease uuid;
ALTER TABLE checkout ADD COLUMN reconcile_lease_until timestamptz;
ALTER TABLE checkout ADD COLUMN reconcile_outcome text;
CREATE INDEX checkout_reconciliation ON checkout(reconcile_after) WHERE state IN ('PENDING','EXPIRED');
CREATE TABLE reconciliation_attempt (
 id uuid PRIMARY KEY, checkout_id uuid NOT NULL REFERENCES checkout(id), actor text NOT NULL,
 started_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz, outcome text NOT NULL DEFAULT 'RUNNING'
);
CREATE INDEX reconciliation_history ON reconciliation_attempt(checkout_id,started_at DESC);

-- Test-only provider fixture, deliberately separate from the checkout's authoritative state.
CREATE TABLE local_provider_order (
 id text PRIMARY KEY, receipt uuid NOT NULL UNIQUE, amount bigint NOT NULL CHECK(amount > 0),
 currency text NOT NULL DEFAULT 'INR', payment_id text UNIQUE,
 payment_status text NOT NULL DEFAULT 'created' CHECK(payment_status IN ('created','authorized','captured'))
);
INSERT INTO local_provider_order(id,receipt,amount,currency,payment_id,payment_status)
SELECT provider_order_id,id,total_paise,currency,provider_payment_id,
 CASE WHEN provider_state='CAPTURED' THEN 'captured' ELSE 'created' END
FROM checkout WHERE provider_order_id LIKE 'mock_%';

CREATE TABLE capture_journal (
 id uuid PRIMARY KEY, checkout_id uuid NOT NULL UNIQUE REFERENCES checkout(id), provider_payment_id text NOT NULL UNIQUE,
 seller_id text NOT NULL, amount_paise bigint NOT NULL CHECK(amount_paise > 0), currency text NOT NULL CHECK(currency='INR'),
 debit_account text NOT NULL CHECK(debit_account='PROVIDER_CLEARING'),
 credit_account text NOT NULL CHECK(credit_account IN ('SELLER_GROSS_PAYABLE','CUSTOMER_REFUND_LIABILITY')),
 origin text NOT NULL CHECK(origin IN ('CAPTURE','MIGRATION_V2')), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX journal_seller ON capture_journal(seller_id,created_at);
INSERT INTO capture_journal(id,checkout_id,provider_payment_id,seller_id,amount_paise,currency,debit_account,credit_account,origin)
SELECT id,id,provider_payment_id,seller_id,total_paise,currency,'PROVIDER_CLEARING',
 CASE WHEN state='CONFIRMED' THEN 'SELLER_GROSS_PAYABLE' ELSE 'CUSTOMER_REFUND_LIABILITY' END,'MIGRATION_V2'
FROM checkout WHERE state IN ('CONFIRMED','REVIEW') AND provider_state='CAPTURED' AND provider_payment_id IS NOT NULL;
CREATE FUNCTION prevent_journal_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Capture journal is append-only; record a compensating entry'; END;
$$;
CREATE TRIGGER capture_journal_immutable BEFORE UPDATE OR DELETE ON capture_journal FOR EACH ROW EXECUTE FUNCTION prevent_journal_mutation();
