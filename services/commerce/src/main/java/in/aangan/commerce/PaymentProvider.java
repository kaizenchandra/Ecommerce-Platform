package in.aangan.commerce;

import java.util.UUID;
import java.util.List;

/** Outbound port: provider DTOs stay inside the adapter. */
public interface PaymentProvider {
    record Order(String id) {}
    record Capture(String paymentId, String orderId, long amount, String currency, String state) {}
    record Inspection(String id, String receipt, long amount, String currency, List<Capture> payments) {}
    Order create(UUID checkoutId, long amount);
    Capture fetch(String paymentId);
    Inspection inspect(String orderId);
    String mode();
}
