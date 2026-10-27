package in.aangan.commerce;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

@Service
public class CommerceService {
    public record Offer(UUID id, UUID productId, String title, String category, String description,
                        String sellerId, String sellerName, long pricePaise, int available, String status, long version) {}
    public record Checkout(UUID id, String title, int quantity, long unitPaise, long totalPaise, String state,
                           String providerOrderId, String providerState, Instant expiresAt, String paymentMode, List<Item> items) {}
    public record Item(UUID offerId, String sellerId, String title, int quantity, long unitPaise) {}
    public record LineSelection(UUID offerId, int quantity, long expectedPricePaise) {}
    public record BasketSelection(List<LineSelection> items, Address address) {}
    public record Address(String name, String line, String city, String pin) {}
    public record Selection(UUID offerId, int quantity, long expectedPricePaise, Address address) {}
    private static final String OFFER_SELECT = "SELECT o.*,p.title,p.category,p.description FROM offer o JOIN product p ON p.id=o.product_id";
    private final JdbcTemplate db;
    private final TransactionTemplate tx;
    private final ObjectMapper json;
    private final PaymentProvider provider;
    public CommerceService(JdbcTemplate db, TransactionTemplate tx, ObjectMapper json, PaymentProvider provider) {
        this.db = db; this.tx = tx; this.json = json; this.provider = provider;
    }
    private Offer offer(ResultSet r, int n) throws SQLException {
        return new Offer(r.getObject("id", UUID.class), r.getObject("product_id", UUID.class), r.getString("title"), r.getString("category"),
            r.getString("description"), r.getString("seller_id"), r.getString("seller_name"), r.getLong("price_paise"),
            r.getInt("on_hand") - r.getInt("reserved"), r.getString("status"), r.getLong("version"));
    }
    private Checkout checkout(ResultSet r, int n) throws SQLException {
        return new Checkout(r.getObject("id", UUID.class), r.getString("title"), r.getInt("quantity"), r.getLong("unit_paise"), r.getLong("total_paise"),
            r.getString("state"), r.getString("provider_order_id"), r.getString("provider_state"), r.getTimestamp("expires_at").toInstant(), provider.mode(), items(r.getObject("id",UUID.class)));
    }
    private List<Item> items(UUID id) {
        return db.query("SELECT * FROM checkout_item WHERE checkout_id=? ORDER BY offer_id",(r,n)->new Item(r.getObject("offer_id",UUID.class),r.getString("seller_id"),r.getString("title"),r.getInt("quantity"),r.getLong("unit_paise")),id);
    }
    public List<Offer> catalog(String q) {
        if (q.length() > 100) throw fail(HttpStatus.BAD_REQUEST, "Search is too long");
        return db.query(OFFER_SELECT + " WHERE o.status='PUBLISHED' AND strpos(lower(p.title || ' ' || p.category), lower(?)) > 0 ORDER BY p.title,o.id LIMIT 100", this::offer, q);
    }
    public Offer product(UUID id) {
        return db.query(OFFER_SELECT + " WHERE o.id=? AND o.status='PUBLISHED'", this::offer, id).stream().findFirst().orElseThrow(() -> fail(HttpStatus.NOT_FOUND,"Product not found"));
    }
    public List<Offer> sellerOffers(String seller) { return db.query(OFFER_SELECT + " WHERE o.seller_id=? ORDER BY p.created_at DESC", this::offer, seller); }
    public List<Offer> moderation() { return db.query(OFFER_SELECT + " WHERE o.status='DRAFT' ORDER BY p.created_at", this::offer); }
    public Offer createOffer(String seller, String title, String category, String description, long price, int stock) {
        PurchaseRules.total(price, 1);
        if (stock < 0 || stock > 100000 || title.isBlank() || title.length() > 160 || category.isBlank() || category.length() > 60 || description.length() > 2000)
            throw fail(HttpStatus.BAD_REQUEST, "Invalid listing");
        return tx.execute(s -> {
            UUID product = UUID.randomUUID(), id = UUID.randomUUID();
            db.update("INSERT INTO product(id,sku,title,category,description) VALUES(?,?,?,?,?)", product, "SKU-" + product, title, category, description);
            db.update("INSERT INTO offer(id,product_id,seller_id,seller_name,price_paise,on_hand,status) VALUES(?,?,?,?,?,?,'DRAFT')", id, product, seller, seller.equals("seller-a") ? "Aangan Studio" : "Independent Studio", price, stock);
            audit(seller, "OFFER_SUBMITTED", id);
            return db.queryForObject(OFFER_SELECT + " WHERE o.id=?", this::offer, id);
        });
    }
    public Offer publish(String actor, UUID id) {
        return tx.execute(s -> {
            var rows = db.query(OFFER_SELECT + " WHERE o.id=? FOR UPDATE OF o", this::offer, id);
            if (rows.isEmpty()) throw fail(HttpStatus.NOT_FOUND, "Offer not found");
            if (!rows.getFirst().status().equals("PUBLISHED")) {
                db.update("UPDATE offer SET status='PUBLISHED',version=version+1 WHERE id=?", id);
                catalogEvent(id); audit(actor, "OFFER_PUBLISHED", id);
            }
            return product(id);
        });
    }
    public Checkout begin(String customer, String key, Selection selection) {
        return beginItems(customer,key,new BasketSelection(List.of(new LineSelection(selection.offerId(),selection.quantity(),selection.expectedPricePaise())),selection.address()));
    }
    public Checkout beginItems(String customer, String key, BasketSelection selection) {
        if (key == null || !key.matches("[A-Za-z0-9_-]{8,100}")) throw fail(HttpStatus.BAD_REQUEST, "A stable Idempotency-Key is required");
        if(selection.items()==null || selection.items().isEmpty() || selection.items().size()>20 || selection.items().stream().anyMatch(i->i==null||i.offerId()==null) || selection.address()==null) throw fail(HttpStatus.BAD_REQUEST,"Select 1–20 distinct offers and an address");
        var lines=selection.items().stream().sorted(java.util.Comparator.comparing(i->i.offerId().toString())).toList();
        if(lines.stream().map(LineSelection::offerId).distinct().count()!=lines.size()) throw fail(HttpStatus.BAD_REQUEST,"Duplicate offers are not allowed");
        for(var line:lines) PurchaseRules.total(line.expectedPricePaise(),line.quantity());
        Address a = selection.address();
        if (a.name() == null || a.line() == null || a.city() == null || a.pin() == null || a.name().isBlank() || a.name().length() > 100 || a.line().length() < 5 || a.line().length() > 300 || a.city().isBlank() || a.city().length() > 100 || !a.pin().matches("[1-9][0-9]{5}"))
            throw fail(HttpStatus.BAD_REQUEST, "Complete a valid Indian delivery address");
        UUID[] created = new UUID[1];
        Checkout result = tx.execute(s -> {
            // Serialize a customer's retries before locking stock; hash collisions only serialize unrelated requests.
            db.queryForList("SELECT pg_advisory_xact_lock(hashtextextended(?,0))", customer + ":" + key);
            var existing = db.queryForList("SELECT * FROM checkout WHERE customer_id=? AND idempotency_key=?", customer, key);
            if (!existing.isEmpty()) {
                var old = existing.getFirst();
                var previous=items((UUID)old.get("id")).stream().map(i->new LineSelection(i.offerId(),i.quantity(),i.unitPaise())).toList();
                if (!previous.equals(lines) || !readAddress(old.get("address").toString()).equals(a))
                    throw fail(HttpStatus.CONFLICT, "Idempotency key already used with different checkout details");
                return get(customer, (UUID)old.get("id"));
            }
            var snapshots=new java.util.ArrayList<Item>();
            long total=0;
            for(var line:lines) {
            var offers = db.query(OFFER_SELECT + " WHERE o.id=? AND o.status='PUBLISHED' FOR UPDATE OF o", this::offer, line.offerId());
            if (offers.isEmpty()) throw fail(HttpStatus.NOT_FOUND, "Offer unavailable");
            Offer o = offers.getFirst();
            if (o.pricePaise() != line.expectedPricePaise()) throw fail(HttpStatus.CONFLICT, "Price changed. Review the current product price");
            if (o.available() < line.quantity()) throw fail(HttpStatus.CONFLICT, "Insufficient stock. Please reduce quantity");
            total=Math.addExact(total,PurchaseRules.total(o.pricePaise(),line.quantity()));
            snapshots.add(new Item(o.id(),o.sellerId(),o.title(),line.quantity(),o.pricePaise()));
            }
            UUID id = UUID.randomUUID();
            var first=snapshots.getFirst();
            db.update("INSERT INTO checkout(id,customer_id,idempotency_key,offer_id,quantity,unit_paise,total_paise,title,seller_id,address,expires_at) VALUES(?,?,?,?,?,?,?,?,?,?::jsonb,now()+interval '15 minutes')", id, customer, key, first.offerId(), first.quantity(), first.unitPaise(), total, snapshots.size()==1?first.title():snapshots.size()+" considered choices", first.sellerId(), encode(a));
            for(var item:snapshots) {
                db.update("INSERT INTO checkout_item(checkout_id,offer_id,seller_id,title,quantity,unit_paise) VALUES(?,?,?,?,?,?)",id,item.offerId(),item.sellerId(),item.title(),item.quantity(),item.unitPaise());
                db.update("UPDATE offer SET reserved=reserved+?,version=version+1 WHERE id=?",item.quantity(),item.offerId());
                catalogEvent(item.offerId());
            }
            audit(customer, "CHECKOUT_RESERVED", id); created[0] = id;
            return get(customer, id);
        });
        // Persist reservation before contacting provider. Ambiguous creation is never automatically retried.
        if (created[0] != null) {
            try {
                var order = provider.create(result.id(), result.totalPaise());
                db.update("UPDATE checkout SET provider_order_id=?,provider_state='READY' WHERE id=?", order.id(), result.id());
            } catch (RuntimeException ex) {
                db.update("UPDATE checkout SET provider_state='UNKNOWN' WHERE id=?", result.id());
            }
        }
        return get(customer, result.id());
    }
    private Address readAddress(String value) { try { return json.readValue(value, Address.class); } catch (Exception e) { throw new IllegalStateException(e); } }
    public Checkout get(String customer, UUID id) {
        return db.query("SELECT * FROM checkout WHERE id=? AND customer_id=?", this::checkout, id, customer).stream().findFirst().orElseThrow(() -> fail(HttpStatus.NOT_FOUND, "Checkout not found"));
    }
    public void applyCapture(PaymentProvider.Capture capture, String eventId) {
        tx.executeWithoutResult(s -> {
            var rows = db.queryForList("SELECT * FROM checkout WHERE provider_order_id=? FOR UPDATE", capture.orderId());
            if (rows.isEmpty()) throw fail(HttpStatus.CONFLICT, "Payment order is not yet linked; retry reconciliation");
            var row = rows.getFirst();
            PurchaseRules.verifyCapture(((Number)row.get("total_paise")).longValue(), capture.amount(), capture.currency(), capture.state());
            if (eventId != null && db.update("INSERT INTO webhook_inbox(event_id) VALUES(?) ON CONFLICT DO NOTHING", eventId) == 0) return;
            UUID id = (UUID)row.get("id");
            String state = row.get("state").toString();
            if (state.equals("CONFIRMED") || state.equals("REVIEW")) {
                if (!capture.paymentId().equals(row.get("provider_payment_id"))) throw fail(HttpStatus.CONFLICT, "Different payment requires reconciliation");
                return;
            }
            boolean late = state.equals("EXPIRED") || ((java.sql.Timestamp)row.get("expires_at")).toInstant().isBefore(Instant.now());
            var purchased=items(id);
            long itemTotal=purchased.stream().mapToLong(i->PurchaseRules.total(i.unitPaise(),i.quantity())).sum();
            if(itemTotal!=capture.amount()) throw new IllegalStateException("Checkout snapshot total mismatch");
            if (!state.equals("EXPIRED")) {
              for(var item:purchased) {
                int quantity=item.quantity();UUID offer=item.offerId();
                db.update(late ? "UPDATE offer SET reserved=reserved-?,version=version+1 WHERE id=?" : "UPDATE offer SET reserved=reserved-?,on_hand=on_hand-?,version=version+1 WHERE id=?",
                    late ? new Object[]{quantity, offer} : new Object[]{quantity, quantity, offer});
                catalogEvent(offer);
              }
            }
            String next = late ? "REVIEW" : "CONFIRMED";
            db.update("UPDATE checkout SET state=?,provider_payment_id=?,provider_state='CAPTURED' WHERE id=?", next, capture.paymentId(), id);
            var sellerTotals=new java.util.TreeMap<String,Long>();
            for(var item:purchased) sellerTotals.merge(item.sellerId(),PurchaseRules.total(item.unitPaise(),item.quantity()),Long::sum);
            sellerTotals.forEach((seller,amount)->db.update("INSERT INTO capture_journal(id,checkout_id,provider_payment_id,seller_id,amount_paise,currency,debit_account,credit_account,origin) VALUES(?,?,?,?,?,'INR','PROVIDER_CLEARING',?,'CAPTURE')",
                UUID.randomUUID(),id,capture.paymentId(),seller,amount,late ? "CUSTOMER_REFUND_LIABILITY" : "SELLER_GROSS_PAYABLE"));
            audit("payment-provider", late ? "LATE_CAPTURE_REVIEW" : "ORDER_CONFIRMED", id);
            event(id, "orders.v1", Map.of("eventId", UUID.randomUUID(), "type", late ? "LateCaptureReview" : "OrderConfirmed", "schemaVersion", 1, "aggregateId", id, "occurredAt", Instant.now().toString()));
        });
    }
    public void expire() {
      var candidates=db.queryForList("SELECT id FROM checkout WHERE state='PENDING' AND expires_at<now() ORDER BY id LIMIT 50",UUID.class);
      for(UUID candidate:candidates) {
        tx.executeWithoutResult(s -> {
            var rows = db.queryForList("SELECT id FROM checkout WHERE id=? AND state='PENDING' AND expires_at<now() FOR UPDATE SKIP LOCKED",candidate);
            for (var row : rows) {
                for(var item:items((UUID)row.get("id"))) {
                    db.update("UPDATE offer SET reserved=reserved-?,version=version+1 WHERE id=?",item.quantity(),item.offerId());
                    catalogEvent(item.offerId());
                }
                db.update("UPDATE checkout SET state='EXPIRED' WHERE id=?", row.get("id"));
                audit("reservation-expiry", "RESERVATION_RELEASED", (UUID)row.get("id"));
            }
        });
      }
    }
    private void catalogEvent(UUID id) {
        Offer o = db.queryForObject(OFFER_SELECT + " WHERE o.id=?", this::offer, id);
        event(id, "catalog.v1", Map.of("eventId", UUID.randomUUID(), "type", "OfferSnapshot", "schemaVersion", 1, "aggregateId", id, "version", o.version(), "occurredAt", Instant.now().toString(), "offer", o));
    }
    private void event(UUID aggregate, String topic, Object payload) { db.update("INSERT INTO outbox(id,aggregate_id,topic,payload) VALUES(?,?,?,?::jsonb)", UUID.randomUUID(), aggregate, topic, encode(payload)); }
    private void audit(String actor, String action, UUID id) { db.update("INSERT INTO audit(actor,action,aggregate_id) VALUES(?,?,?)", actor, action, id); }
    private String encode(Object value) { try { return json.writeValueAsString(value); } catch (Exception ex) { throw new IllegalStateException(ex); } }
    static ResponseStatusException fail(HttpStatus status, String message) { return new ResponseStatusException(status, message); }
}
