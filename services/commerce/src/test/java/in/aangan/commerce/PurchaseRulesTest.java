package in.aangan.commerce;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class PurchaseRulesTest {
    @Test void integerMoneyAndQuantityLimits() {
        assertEquals(299700, PurchaseRules.total(99900,3));
        assertThrows(IllegalArgumentException.class, () -> PurchaseRules.total(99900,0));
        assertThrows(IllegalArgumentException.class, () -> PurchaseRules.total(99900,11));
        assertThrows(IllegalArgumentException.class, () -> PurchaseRules.total(-1,1));
    }
    @Test void authorizationIsNotCapture() {
        assertThrows(IllegalArgumentException.class, () -> PurchaseRules.verifyCapture(100,100,"INR","authorized"));
        assertThrows(IllegalArgumentException.class, () -> PurchaseRules.verifyCapture(100,99,"INR","captured"));
        assertThrows(IllegalArgumentException.class, () -> PurchaseRules.verifyCapture(100,100,"USD","captured"));
        PurchaseRules.verifyCapture(100,100,"INR","captured");
    }
    @Test void signatureUsesExactBytesAndRejectsMalformedInput() {
        assertEquals("f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8",
            Signatures.hmac("key", "The quick brown fox jumps over the lazy dog".getBytes(java.nio.charset.StandardCharsets.UTF_8)));
        byte[] body = "{\"amount\":100}".getBytes(java.nio.charset.StandardCharsets.UTF_8);
        String signature = Signatures.hmac("fixture-secret", body);
        assertTrue(Signatures.matches("fixture-secret",body,signature));
        assertFalse(Signatures.matches("fixture-secret","{ \"amount\":100}".getBytes(),signature));
        assertFalse(Signatures.matches("fixture-secret",body,"invalid"));
        assertFalse(Signatures.matches("",body,signature));
    }
}
