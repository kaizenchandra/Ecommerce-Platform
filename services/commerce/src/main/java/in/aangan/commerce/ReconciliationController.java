package in.aangan.commerce;

import java.security.Principal;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class ReconciliationController {
    private final ReconciliationService reconciliation;
    public ReconciliationController(ReconciliationService reconciliation){this.reconciliation=reconciliation;}
    public record LinkOrder(String providerOrderId) {}
    @GetMapping("/admin/payments") List<Map<String,Object>> queue(){return reconciliation.queue();}
    @GetMapping("/admin/payments/{id}/history") List<Map<String,Object>> history(@PathVariable UUID id){return reconciliation.history(id);}
    @PostMapping("/admin/payments/{id}/reconcile") ReconciliationService.Result reconcile(@PathVariable UUID id, Principal principal){return reconciliation.reconcile(id,principal.getName());}
    @PostMapping("/admin/payments/{id}/link") ReconciliationService.Result link(@PathVariable UUID id, Principal principal, @RequestBody LinkOrder body){return reconciliation.link(id,body.providerOrderId(),principal.getName());}
    @GetMapping("/seller/finance") Map<String,Object> finance(Principal principal){return reconciliation.sellerFinance(principal.getName());}
}
