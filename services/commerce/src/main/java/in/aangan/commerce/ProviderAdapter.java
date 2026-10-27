package in.aangan.commerce;

import com.fasterxml.jackson.databind.JsonNode;
import java.net.http.HttpClient;
import java.time.Duration;
import java.util.Map;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.client.RestClient;

@Component
public class ProviderAdapter implements PaymentProvider {
    private final String mode;
    private final RestClient client;
    private final JdbcTemplate db;
    public ProviderAdapter(@Value("${commerce.payment-mode}") String mode,
                           @Value("${commerce.local-mode}") boolean local,
                           @Value("${commerce.razorpay-key}") String key,
                           @Value("${commerce.razorpay-secret}") String secret, JdbcTemplate db) {
        if (!mode.equals("mock") && !mode.equals("razorpay-test")) throw new IllegalStateException("Unsupported payment mode");
        if (mode.equals("mock") && !local) throw new IllegalStateException("Mock payments require LOCAL_MODE");
        if (mode.equals("razorpay-test") && (!key.startsWith("rzp_test_") || secret.isBlank()))
            throw new IllegalStateException("Only configured Razorpay Test Mode is permitted");
        this.mode = mode;
        this.db = db;
        var factory = new JdkClientHttpRequestFactory(HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(4)).build());
        factory.setReadTimeout(Duration.ofSeconds(8));
        this.client = RestClient.builder().baseUrl("https://api.razorpay.com/v1").requestFactory(factory)
            .defaultHeaders(h -> h.setBasicAuth(key, secret)).build();
    }
    public String mode() { return mode; }
    public Order create(UUID checkoutId, long amount) {
        if (mode.equals("mock")) {
            String id = "mock_" + checkoutId;
            db.update("INSERT INTO local_provider_order(id,receipt,amount) VALUES(?,?,?)",id,checkoutId,amount);
            return new Order(id);
        }
        JsonNode result = client.post().uri("/orders").body(Map.of("amount", amount, "currency", "INR", "receipt", checkoutId.toString()))
            .retrieve().body(JsonNode.class);
        if (result == null || !result.path("id").asText().startsWith("order_")) throw new IllegalStateException("Unknown provider outcome");
        return new Order(result.path("id").asText());
    }
    public Capture fetch(String paymentId) {
        if (mode.equals("mock")) throw new IllegalStateException("Controlled captures require the local-only endpoint");
        if (!paymentId.matches("pay_[A-Za-z0-9]+")) throw new IllegalArgumentException("Invalid payment identifier");
        JsonNode p = client.get().uri("/payments/{id}", paymentId).retrieve().body(JsonNode.class);
        if (p == null) throw new IllegalStateException("Unknown provider outcome");
        return new Capture(p.path("id").asText(), p.path("order_id").asText(), p.path("amount").asLong(), p.path("currency").asText(), p.path("status").asText());
    }
    public Inspection inspect(String orderId) {
        if (mode.equals("mock")) {
            var rows = db.queryForList("SELECT * FROM local_provider_order WHERE id=?",orderId);
            if (rows.isEmpty()) throw new IllegalArgumentException("Unknown provider order");
            var r = rows.getFirst();
            long amount = ((Number)r.get("amount")).longValue();
            List<Capture> payments = r.get("payment_id") == null ? List.of() : List.of(new Capture(r.get("payment_id").toString(),orderId,amount,r.get("currency").toString(),r.get("payment_status").toString()));
            return new Inspection(orderId,r.get("receipt").toString(),amount,r.get("currency").toString(),payments);
        }
        if (orderId == null || !orderId.matches("order_[A-Za-z0-9]+")) throw new IllegalArgumentException("Invalid provider order");
        JsonNode order = client.get().uri("/orders/{id}",orderId).retrieve().body(JsonNode.class);
        JsonNode result = client.get().uri("/orders/{id}/payments",orderId).retrieve().body(JsonNode.class);
        if (order == null || result == null || !result.path("items").isArray()) throw new IllegalStateException("Incomplete provider response");
        var payments = new ArrayList<Capture>();
        for (JsonNode p : result.path("items")) payments.add(new Capture(p.path("id").asText(),p.path("order_id").asText(),p.path("amount").asLong(),p.path("currency").asText(),p.path("status").asText()));
        return new Inspection(order.path("id").asText(),order.path("receipt").asText(),order.path("amount").asLong(),order.path("currency").asText(),List.copyOf(payments));
    }
    public Capture recordControlledCapture(String orderId) {
        if (!mode.equals("mock")) throw CommerceService.fail(org.springframework.http.HttpStatus.NOT_FOUND,"Unavailable");
        Inspection order = inspect(orderId);
        String paymentId = "mock_pay_" + order.receipt();
        db.update("UPDATE local_provider_order SET payment_id=?,payment_status='captured' WHERE id=?",paymentId,orderId);
        return new Capture(paymentId,orderId,order.amount(),order.currency(),"captured");
    }
}
