package in.aangan.commerce;
import java.security.Principal;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/api/account/wishlist")
public class WishlistController {
 private final JdbcTemplate db;private final TransactionTemplate tx;private final CommerceService commerce;
 public record Change(UUID offerId,Boolean saved){}
 public record Entry(UUID offerId,CommerceService.Offer offer){}
 public WishlistController(JdbcTemplate db,TransactionTemplate tx,CommerceService commerce){this.db=db;this.tx=tx;this.commerce=commerce;}
 private List<Entry> list(String customer){return db.queryForList("SELECT offer_id FROM wishlist_item WHERE customer_id=? ORDER BY created_at DESC,offer_id",UUID.class,customer).stream().map(id->{CommerceService.Offer offer=null;try{offer=commerce.product(id);}catch(org.springframework.web.server.ResponseStatusException e){if(e.getStatusCode().value()!=404)throw e;}return new Entry(id,offer);}).toList();}
 @GetMapping List<Entry> get(Principal p){return list(p.getName());}
 @PostMapping List<Entry> set(Principal p,@RequestBody Change change){
  if(change.offerId()==null||change.saved()==null)throw CommerceService.fail(HttpStatus.BAD_REQUEST,"Offer and saved state required");
  return tx.execute(s->{
   db.queryForList("SELECT pg_advisory_xact_lock(hashtextextended(?,0))","wishlist:"+p.getName());
   if(change.saved()){
    commerce.product(change.offerId());
    boolean exists=db.queryForObject("SELECT count(*) FROM wishlist_item WHERE customer_id=? AND offer_id=?",Integer.class,p.getName(),change.offerId())>0;
    if(!exists&&db.queryForObject("SELECT count(*) FROM wishlist_item WHERE customer_id=?",Integer.class,p.getName())>=100)throw CommerceService.fail(HttpStatus.CONFLICT,"Wishlist limit is 100 products");
    db.update("INSERT INTO wishlist_item(customer_id,offer_id) VALUES(?,?) ON CONFLICT DO NOTHING",p.getName(),change.offerId());
   }else db.update("DELETE FROM wishlist_item WHERE customer_id=? AND offer_id=?",p.getName(),change.offerId());
   return list(p.getName());
  });
 }
}
