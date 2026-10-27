package in.aangan.commerce;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class ReconciliationService {
    private static final org.slf4j.Logger log=org.slf4j.LoggerFactory.getLogger(ReconciliationService.class);
    private final JdbcTemplate db; private final TransactionTemplate tx;
    private final PaymentProvider provider; private final CommerceService commerce;
    private final io.micrometer.core.instrument.MeterRegistry metrics;
    private record Claim(UUID id, UUID lease, String orderId, long amount, int attempt) {}
    public record Result(UUID checkoutId, String outcome) {}
    public ReconciliationService(JdbcTemplate db, TransactionTemplate tx, PaymentProvider provider, CommerceService commerce, io.micrometer.core.instrument.MeterRegistry metrics) {
        this.db=db;this.tx=tx;this.provider=provider;this.commerce=commerce;this.metrics=metrics;
    }
    public List<Map<String,Object>> queue() {
        return db.queryForList("SELECT id,title,total_paise,state,provider_state,provider_order_id,reconcile_attempts,reconcile_outcome,reconcile_after,created_at FROM checkout WHERE state IN ('PENDING','REVIEW') OR (state='EXPIRED' AND (provider_state IN ('UNKNOWN','CREATING') OR reconcile_outcome IN ('EVIDENCE_MISMATCH','PROVIDER_UNAVAILABLE','APPLICATION_FAILURE','RETRY_EXHAUSTED'))) ORDER BY created_at DESC LIMIT 100");
    }
    public List<Map<String,Object>> history(UUID id) {
        return db.queryForList("SELECT id,actor,started_at,completed_at,outcome FROM reconciliation_attempt WHERE checkout_id=? ORDER BY started_at DESC LIMIT 50",id);
    }
    public Result reconcile(UUID id, String actor) {
        Claim claim=claim(id,actor);
        if(claim==null) return new Result(id,"ALREADY_FINAL");
        return execute(claim);
    }
    private Claim claim(UUID id, String actor) {
        return tx.execute(s -> {
            var rows=db.queryForList("SELECT * FROM checkout WHERE id=? FOR UPDATE",id);
            if(rows.isEmpty()) throw CommerceService.fail(HttpStatus.NOT_FOUND,"Checkout not found");
            var r=rows.getFirst();
            if(List.of("CONFIRMED","REVIEW").contains(r.get("state"))) return null;
            if(actor.equals("reconciliation-worker") && (((Number)r.get("reconcile_attempts")).intValue()>=12 || ((Timestamp)r.get("reconcile_after")).toInstant().isAfter(Instant.now()))) return null;
            Timestamp until=(Timestamp)r.get("reconcile_lease_until");
            if(until!=null && until.toInstant().isAfter(Instant.now())) throw CommerceService.fail(HttpStatus.CONFLICT,"Reconciliation already running");
            int attempt=((Number)r.get("reconcile_attempts")).intValue()+1;
            UUID lease=UUID.randomUUID();
            db.update("UPDATE reconciliation_attempt SET outcome='LEASE_EXPIRED',completed_at=now() WHERE checkout_id=? AND completed_at IS NULL",id);
            db.update("UPDATE checkout SET reconcile_attempts=?,reconcile_lease=?,reconcile_lease_until=now()+interval '60 seconds' WHERE id=?",attempt,lease,id);
            db.update("INSERT INTO reconciliation_attempt(id,checkout_id,actor) VALUES(?,?,?)",lease,id,actor);
            db.update("INSERT INTO audit(actor,action,aggregate_id) VALUES(?,'PAYMENT_RECONCILE_REQUESTED',?)",actor,id);
            return new Claim(id,lease,(String)r.get("provider_order_id"),((Number)r.get("total_paise")).longValue(),attempt);
        });
    }
    private Result execute(Claim c) {
        long started=System.nanoTime();
        String outcome;
        if(c.orderId()==null) outcome="ORDER_LINK_REQUIRED";
        else {
            try {
                var order=provider.inspect(c.orderId());
                ReconciliationRules.verifyOrder(c.id(),c.amount(),c.orderId(),order);
                var capture=ReconciliationRules.captured(order);
                if(capture==null) outcome="AWAITING_CAPTURE";
                else {
                    try {commerce.applyCapture(capture,null); outcome="CAPTURE_VERIFIED";}
                    catch(RuntimeException e) {outcome="APPLICATION_FAILURE";log.error("Capture application failed checkout={} errorType={}",c.id(),e.getClass().getSimpleName());}
                }
            } catch(IllegalArgumentException e) {outcome="EVIDENCE_MISMATCH";}
            catch(RuntimeException e) {outcome="PROVIDER_UNAVAILABLE";}
        }
        String result=outcome;
        long delay=ReconciliationRules.delaySeconds(c.attempt())+ThreadLocalRandom.current().nextLong(5);
        tx.executeWithoutResult(s -> {
            db.update("UPDATE reconciliation_attempt SET completed_at=now(),outcome=? WHERE id=? AND completed_at IS NULL",result,c.lease());
            db.update("UPDATE checkout SET reconcile_outcome=?,reconcile_after=now()+(? * interval '1 second'),reconcile_lease=NULL,reconcile_lease_until=NULL WHERE id=? AND reconcile_lease=?",
                c.attempt()>=12 && result.equals("AWAITING_CAPTURE") ? "RETRY_EXHAUSTED" : result,delay,c.id(),c.lease());
        });
        metrics.counter("commerce.reconciliation.attempts","outcome",result).increment();
        metrics.timer("commerce.reconciliation.duration","outcome",result).record(System.nanoTime()-started,java.util.concurrent.TimeUnit.NANOSECONDS);
        return new Result(c.id(),result);
    }
    public Result link(UUID id, String orderId, String actor) {
        if(orderId==null || orderId.length()>100 || orderId.isBlank()) throw CommerceService.fail(HttpStatus.BAD_REQUEST,"A provider order ID is required");
        var rows=db.queryForList("SELECT total_paise FROM checkout WHERE id=?",id);
        if(rows.isEmpty()) throw CommerceService.fail(HttpStatus.NOT_FOUND,"Checkout not found");
        // Verify provider data before entering the transaction; no operator assertion is authoritative.
        PaymentProvider.Inspection evidence;
        try {evidence=provider.inspect(orderId);}
        catch(RuntimeException e){throw CommerceService.fail(HttpStatus.BAD_GATEWAY,"Provider order could not be verified");}
        try {ReconciliationRules.verifyOrder(id,((Number)rows.getFirst().get("total_paise")).longValue(),orderId,evidence);}
        catch(IllegalArgumentException e){throw CommerceService.fail(HttpStatus.CONFLICT,"Provider order does not match checkout receipt, amount and currency");}
        tx.executeWithoutResult(s -> {
            var row=db.queryForMap("SELECT * FROM checkout WHERE id=? FOR UPDATE",id);
            ReconciliationRules.verifyOrder(id,((Number)row.get("total_paise")).longValue(),orderId,evidence);
            if(row.get("provider_order_id")!=null && !orderId.equals(row.get("provider_order_id"))) throw CommerceService.fail(HttpStatus.CONFLICT,"A different provider order is already linked");
            if(List.of("CONFIRMED","REVIEW").contains(row.get("state"))) throw CommerceService.fail(HttpStatus.CONFLICT,"Captured checkouts cannot be relinked");
            Timestamp until=(Timestamp)row.get("reconcile_lease_until");
            if(until!=null && until.toInstant().isAfter(Instant.now())) throw CommerceService.fail(HttpStatus.CONFLICT,"Wait for current reconciliation to finish");
            db.update("UPDATE checkout SET provider_order_id=?,provider_state='READY',reconcile_attempts=0,reconcile_after=now(),reconcile_outcome='ORDER_LINK_VERIFIED' WHERE id=?",orderId,id);
            db.update("INSERT INTO audit(actor,action,aggregate_id) VALUES(?,'PROVIDER_ORDER_LINK_VERIFIED',?)",actor,id);
        });
        return new Result(id,"ORDER_LINK_VERIFIED");
    }
    @Scheduled(fixedDelayString="${commerce.reconciliation-delay-ms:2000}") public void poll() {
        var ids=db.queryForList("SELECT id FROM checkout WHERE state IN ('PENDING','EXPIRED') AND provider_order_id IS NOT NULL AND reconcile_attempts<12 AND reconcile_after<=now() AND (reconcile_lease_until IS NULL OR reconcile_lease_until<now()) ORDER BY reconcile_after LIMIT 5",UUID.class);
        for(UUID id:ids) {
            try {reconcile(id,"reconciliation-worker");}
            catch(org.springframework.web.server.ResponseStatusException e) {
                if(e.getStatusCode().value()!=409) log.warn("Payment recovery failed checkout={} status={}",id,e.getStatusCode().value());
            }
            catch(RuntimeException e) { log.error("Payment recovery failed checkout={} errorType={}",id,e.getClass().getSimpleName()); }
        }
    }
    public Map<String,Object> sellerFinance(String seller) {
        return Map.of("currency","INR","grossCapturedPaise",db.queryForObject("SELECT coalesce(sum(amount_paise),0) FROM capture_journal WHERE seller_id=? AND credit_account='SELLER_GROSS_PAYABLE'",Long.class,seller),
            "entries",db.queryForList("SELECT checkout_id,amount_paise,credit_account,created_at FROM capture_journal WHERE seller_id=? ORDER BY created_at DESC LIMIT 100",seller));
    }
}
