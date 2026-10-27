CREATE FUNCTION prevent_checkout_item_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Checkout item snapshots are immutable'; END;
$$;
CREATE TRIGGER checkout_item_immutable BEFORE UPDATE OR DELETE ON checkout_item
FOR EACH ROW EXECUTE FUNCTION prevent_checkout_item_mutation();
