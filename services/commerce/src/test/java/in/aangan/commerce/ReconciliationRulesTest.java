package in.aangan.commerce;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class ReconciliationRulesTest {
    @Test void providerReceiptAndAmountMustMatchBeforeLinking() {
        UUID id=UUID.randomUUID();
        var order=new PaymentProvider.Inspection("order_one",id.toString(),100,"INR",List.of());
        ReconciliationRules.verifyOrder(id,100,"order_one",order);
        assertThrows(IllegalArgumentException.class,()->ReconciliationRules.verifyOrder(UUID.randomUUID(),100,"order_one",order));
        assertThrows(IllegalArgumentException.class,()->ReconciliationRules.verifyOrder(id,101,"order_one",order));
        assertThrows(IllegalArgumentException.class,()->ReconciliationRules.verifyOrder(id,100,"order_other",order));
    }
    @Test void authorizedOrMismatchedPaymentsCannotConfirm() {
        var authorized=new PaymentProvider.Capture("pay_one","order_one",100,"INR","authorized");
        assertNull(ReconciliationRules.captured(new PaymentProvider.Inspection("order_one","receipt",100,"INR",List.of(authorized))));
        var foreign=new PaymentProvider.Capture("pay_one","order_other",100,"INR","captured");
        assertThrows(IllegalArgumentException.class,()->ReconciliationRules.captured(new PaymentProvider.Inspection("order_one","receipt",100,"INR",List.of(foreign))));
        var capture=new PaymentProvider.Capture("pay_one","order_one",100,"INR","captured");
        assertThrows(IllegalArgumentException.class,()->ReconciliationRules.captured(new PaymentProvider.Inspection("order_one","receipt",100,"INR",List.of(capture,capture))));
    }
    @Test void retriesHaveBoundedExponentialDelay() {
        assertEquals(5,ReconciliationRules.delaySeconds(1));
        assertEquals(10,ReconciliationRules.delaySeconds(2));
        assertEquals(3600,ReconciliationRules.delaySeconds(12));
        assertEquals(3600,ReconciliationRules.delaySeconds(100));
    }
}
