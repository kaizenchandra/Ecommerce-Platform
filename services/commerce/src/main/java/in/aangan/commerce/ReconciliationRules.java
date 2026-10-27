package in.aangan.commerce;

import java.util.UUID;

/** Provider-independent checks used before linking or applying recovered evidence. */
public final class ReconciliationRules {
    private ReconciliationRules() {}
    public static void verifyOrder(UUID checkoutId, long total, String requestedId, PaymentProvider.Inspection order) {
        if (!requestedId.equals(order.id()) || !checkoutId.toString().equals(order.receipt()) || total != order.amount() || !"INR".equals(order.currency()))
            throw new IllegalArgumentException("Provider order evidence does not match checkout");
    }
    public static PaymentProvider.Capture captured(PaymentProvider.Inspection order) {
        var captures = order.payments().stream().filter(p -> "captured".equals(p.state())).toList();
        if (captures.size() > 1) throw new IllegalArgumentException("Multiple captures require investigation");
        if (captures.isEmpty()) return null;
        var capture = captures.getFirst();
        if (capture.paymentId() == null || capture.paymentId().isBlank() || !order.id().equals(capture.orderId()))
            throw new IllegalArgumentException("Payment belongs to a different order");
        PurchaseRules.verifyCapture(order.amount(),capture.amount(),capture.currency(),capture.state());
        return capture;
    }
    public static long delaySeconds(int attempt) { return Math.min(3600, 5L << Math.min(Math.max(attempt-1,0),10)); }
}
