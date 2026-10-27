package in.aangan.commerce;

/** Framework-free purchase invariants. Monetary values are INR paise. */
public final class PurchaseRules {
    private PurchaseRules() {}
    public static long total(long unit, int quantity) {
        if (unit <= 0 || unit > 100_000_000 || quantity < 1 || quantity > 10)
            throw new IllegalArgumentException("Invalid price or quantity");
        return Math.multiplyExact(unit, quantity);
    }
    public static void verifyCapture(long expected, long received, String currency, String state) {
        if (expected != received || !"INR".equals(currency) || !"captured".equals(state))
            throw new IllegalArgumentException("Payment is not a matching INR capture");
    }
}
