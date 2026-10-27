package in.aangan.commerce;
import java.security.Principal;
import java.util.*;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/api")
public class FulfillmentController {
 private final FulfillmentService service;
 public FulfillmentController(FulfillmentService service){this.service=service;}
 @GetMapping("/seller/orders") List<FulfillmentService.SellerOrder> orders(Principal p){return service.orders(p.getName());}
 @PostMapping("/seller/orders/{id}/fulfillment") FulfillmentService.Shipment change(Principal p,@PathVariable UUID id,@RequestBody FulfillmentService.Change body){return service.transition(p.getName(),id,body);}
 @GetMapping("/checkouts/{id}/shipments") List<FulfillmentService.Shipment> shipments(Principal p,@PathVariable UUID id){return service.customer(p.getName(),id);}
}
