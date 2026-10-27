package in.aangan.commerce;
import java.security.Principal;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/api")
public class CartController {
    private final CartService carts;private final CommerceService commerce;
    public CartController(CartService carts,CommerceService commerce){this.carts=carts;this.commerce=commerce;}
    @GetMapping("/cart") CartService.Cart get(Principal p){return carts.get(p.getName());}
    @PostMapping("/cart/items") CartService.Cart update(Principal p,@RequestBody CartService.Change body){return carts.change(p.getName(),body);}
    @PostMapping("/checkouts/basket") @ResponseStatus(HttpStatus.CREATED)
    CommerceService.Checkout checkout(Principal p,@RequestHeader("Idempotency-Key") String key,@RequestBody CommerceService.BasketSelection body){return commerce.beginItems(p.getName(),key,body);}
}
