package in.aangan.commerce;

import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import java.util.concurrent.atomic.AtomicLong;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Aggregate metrics contain no customer, payment, checkout or tenant identifiers. */
@Component
public class CommerceMetrics {
    private final JdbcTemplate db;
    private final AtomicLong review=new AtomicLong(), unknown=new AtomicLong(), exhausted=new AtomicLong();
    private final AtomicLong outbox=new AtomicLong(), lag=new AtomicLong(), expired=new AtomicLong(), sampled=new AtomicLong();
    public CommerceMetrics(JdbcTemplate db, MeterRegistry registry) {
        this.db=db;
        Gauge.builder("commerce.payment.review",review,AtomicLong::get).register(registry);
        Gauge.builder("commerce.payment.unknown",unknown,AtomicLong::get).register(registry);
        Gauge.builder("commerce.payment.retries.exhausted",exhausted,AtomicLong::get).register(registry);
        Gauge.builder("commerce.outbox.pending",outbox,AtomicLong::get).register(registry);
        Gauge.builder("commerce.outbox.oldest.seconds",lag,AtomicLong::get).register(registry);
        Gauge.builder("commerce.reservation.overdue",expired,AtomicLong::get).register(registry);
        Gauge.builder("commerce.metrics.sample.epoch.seconds",sampled,AtomicLong::get).register(registry);
    }
    @Scheduled(fixedDelay=10000) public void sample() {
        var payments=db.queryForMap("SELECT count(*) FILTER (WHERE state='REVIEW') AS review, count(*) FILTER (WHERE state IN ('PENDING','EXPIRED') AND provider_state IN ('UNKNOWN','CREATING')) AS unknown, count(*) FILTER (WHERE state IN ('PENDING','EXPIRED') AND reconcile_attempts>=12) AS exhausted, count(*) FILTER (WHERE state='PENDING' AND expires_at<now()) AS overdue FROM checkout");
        var events=db.queryForMap("SELECT count(*) AS pending, coalesce(extract(epoch FROM now()-min(created_at)),0)::bigint AS lag FROM outbox WHERE published_at IS NULL");
        review.set(((Number)payments.get("review")).longValue());unknown.set(((Number)payments.get("unknown")).longValue());
        exhausted.set(((Number)payments.get("exhausted")).longValue());expired.set(((Number)payments.get("overdue")).longValue());
        outbox.set(((Number)events.get("pending")).longValue());lag.set(((Number)events.get("lag")).longValue());sampled.set(System.currentTimeMillis()/1000);
    }
}
