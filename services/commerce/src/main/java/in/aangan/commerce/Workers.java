package in.aangan.commerce;

import java.util.concurrent.TimeUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

@Component
public class Workers {
    private final JdbcTemplate db; private final TransactionTemplate tx;
    private final KafkaTemplate<String,String> kafka; private final CommerceService commerce;
    private static final Logger log = LoggerFactory.getLogger(Workers.class);
    public Workers(JdbcTemplate db, TransactionTemplate tx, KafkaTemplate<String,String> kafka, CommerceService commerce) {
        this.db=db; this.tx=tx; this.kafka=kafka; this.commerce=commerce;
    }
    @Scheduled(fixedDelay=1000) public void publish() {
        tx.executeWithoutResult(s -> {
            var rows = db.queryForList("SELECT * FROM outbox WHERE published_at IS NULL ORDER BY created_at,id FOR UPDATE SKIP LOCKED LIMIT 20");
            for (var r : rows) {
                try {
                    kafka.send(r.get("topic").toString(),r.get("aggregate_id").toString(),r.get("payload").toString()).get(12,TimeUnit.SECONDS);
                    db.update("UPDATE outbox SET published_at=now() WHERE id=?",r.get("id"));
                } catch (InterruptedException e) { Thread.currentThread().interrupt(); return; }
                catch (Exception e) { log.warn("Outbox delivery deferred for event {}",r.get("id")); return; }
            }
        });
    }
    @Scheduled(fixedDelay=10000) public void expire() { commerce.expire(); }
}
