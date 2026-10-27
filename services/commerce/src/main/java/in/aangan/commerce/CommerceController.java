package in.aangan.commerce;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.nio.charset.StandardCharsets;
import java.security.Principal;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class CommerceController {
    private final CommerceService service;
    private final PaymentProvider provider;
    private final ObjectMapper json;
    private final String secret, webhookSecret, publicKey;
    public CommerceController(CommerceService service, PaymentProvider provider, ObjectMapper json,
            @Value("${commerce.razorpay-secret}") String secret, @Value("${commerce.webhook-secret}") String webhookSecret,
            @Value("${commerce.razorpay-key}") String publicKey) {
        this.service = service; this.provider = provider; this.json = json; this.secret = secret; this.webhookSecret = webhookSecret; this.publicKey = publicKey;
    }
    public record Listing(@NotBlank @Size(max=160) String title, @NotBlank @Size(max=60) String category,
                          @NotNull @Size(max=2000) String description, @Min(1) @Max(100000000) long pricePaise, @Min(0) @Max(100000) int stock) {}
    public record Callback(@NotBlank String paymentId, @NotBlank String signature) {}
    @GetMapping("/catalog") List<CommerceService.Offer> catalog(@RequestParam(defaultValue="") String q) { return service.catalog(q); }
    @GetMapping("/catalog/{id}") CommerceService.Offer product(@PathVariable UUID id) { return service.product(id); }
    @GetMapping("/seller/offers") List<CommerceService.Offer> mine(Principal p) { return service.sellerOffers(p.getName()); }
    @PostMapping("/seller/offers") @ResponseStatus(HttpStatus.CREATED)
    CommerceService.Offer submit(Principal p, @Valid @RequestBody Listing body) { return service.createOffer(p.getName(), body.title(), body.category(), body.description(), body.pricePaise(), body.stock()); }
    @GetMapping("/admin/offers") List<CommerceService.Offer> queue() { return service.moderation(); }
    @PostMapping("/admin/offers/{id}/publish") CommerceService.Offer publish(Principal p, @PathVariable UUID id) { return service.publish(p.getName(), id); }
    @PostMapping("/checkouts") @ResponseStatus(HttpStatus.CREATED)
    CommerceService.Checkout begin(Principal p, @RequestHeader("Idempotency-Key") String key, @RequestBody CommerceService.Selection body) { return service.begin(p.getName(), key, body); }
    @GetMapping("/checkouts/{id}") CommerceService.Checkout get(Principal p, @PathVariable UUID id) { return service.get(p.getName(), id); }
    @GetMapping("/checkouts/{id}/payment-config") Map<String,String> config(Principal p, @PathVariable UUID id) {
        service.get(p.getName(), id); return Map.of("key", publicKey, "mode", provider.mode());
    }
    @PostMapping("/checkouts/{id}/simulate-capture") CommerceService.Checkout simulate(Principal p, @PathVariable UUID id) {
        if (!provider.mode().equals("mock")) throw CommerceService.fail(HttpStatus.NOT_FOUND, "Unavailable");
        var c = service.get(p.getName(), id);
        if (c.providerOrderId() == null) throw CommerceService.fail(HttpStatus.CONFLICT,"Provider order is pending");
        service.applyCapture(((ProviderAdapter)provider).recordControlledCapture(c.providerOrderId()), "mock_event_" + id);
        return service.get(p.getName(), id);
    }
    @PostMapping("/checkouts/{id}/simulate-provider-capture") Map<String,String> simulateProviderOnly(Principal p, @PathVariable UUID id) {
        if (!provider.mode().equals("mock")) throw CommerceService.fail(HttpStatus.NOT_FOUND,"Unavailable");
        var checkout=service.get(p.getName(),id);
        if(checkout.providerOrderId()==null) throw CommerceService.fail(HttpStatus.CONFLICT,"Provider order unavailable");
        ((ProviderAdapter)provider).recordControlledCapture(checkout.providerOrderId());
        return Map.of("status","SIMULATED_PROVIDER_CAPTURE_RECORDED");
    }
    @PostMapping("/checkouts/{id}/callback") CommerceService.Checkout callback(Principal p, @PathVariable UUID id, @Valid @RequestBody Callback body) {
        var c = service.get(p.getName(), id);
        if (!provider.mode().equals("razorpay-test") || c.providerOrderId() == null || !Signatures.matches(secret, (c.providerOrderId()+"|"+body.paymentId()).getBytes(StandardCharsets.UTF_8), body.signature()))
            throw CommerceService.fail(HttpStatus.BAD_REQUEST,"Invalid payment signature");
        var capture = provider.fetch(body.paymentId());
        if (!capture.orderId().equals(c.providerOrderId())) throw CommerceService.fail(HttpStatus.CONFLICT,"Payment order mismatch");
        if (capture.state().equals("captured")) service.applyCapture(capture, null);
        return service.get(p.getName(), id);
    }
    @PostMapping("/webhooks/razorpay") Map<String,Boolean> webhook(@RequestBody byte[] raw,
            @RequestHeader(value="X-Razorpay-Signature",required=false) String signature,
            @RequestHeader(value="X-Razorpay-Event-Id",required=false) String eventId) throws Exception {
        if (!provider.mode().equals("razorpay-test") || raw.length > 65536 || !Signatures.matches(webhookSecret, raw, signature))
            throw CommerceService.fail(HttpStatus.BAD_REQUEST,"Invalid webhook signature");
        var event = json.readTree(raw);
        if ("payment.captured".equals(event.path("event").asText())) {
            if (eventId == null || eventId.isBlank() || eventId.length() > 200) throw CommerceService.fail(HttpStatus.BAD_REQUEST,"Missing event identifier");
            var entity = event.path("payload").path("payment").path("entity");
            // Authenticated provider lookup independently validates the signed notification.
            service.applyCapture(provider.fetch(entity.path("id").asText()), eventId);
        }
        return Map.of("received", true);
    }
}
