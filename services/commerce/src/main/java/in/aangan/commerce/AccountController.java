package in.aangan.commerce;
import java.security.Principal;
import java.util.*;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/api/account")
public class AccountController {
 private final AccountService accounts;
 public AccountController(AccountService accounts){this.accounts=accounts;}
 @GetMapping Map<String,Object> profile(Principal p){return accounts.profile(p.getName());}
 @GetMapping("/identity") Map<String,String> identity(Principal p){return Map.of("subject",p.getName());}
 @PostMapping Map<String,Object> save(Principal p,@RequestBody AccountService.Update body){return accounts.save(p.getName(),body);}
 @GetMapping("/orders") List<Map<String,Object>> orders(Principal p){return accounts.orders(p.getName());}
 @PostMapping("/merge-cart") CartService.Cart merge(Principal p,@RequestHeader("X-Guest-Proof") String proof){return accounts.merge(p.getName(),proof);}
}
