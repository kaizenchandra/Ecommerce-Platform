package in.aangan.commerce;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class AccountService {
 private final JdbcTemplate db;private final TransactionTemplate tx;private final ObjectMapper json;private final CartService carts;private final String secret;
 public record Update(String displayName,CommerceService.Address address,Long expectedVersion){}
 public AccountService(JdbcTemplate db,TransactionTemplate tx,ObjectMapper json,CartService carts,@Value("${commerce.guest-secret}") String secret){this.db=db;this.tx=tx;this.json=json;this.carts=carts;this.secret=secret;}
 public Map<String,Object> profile(String customer){
  db.update("INSERT INTO customer_account(customer_id) VALUES(?) ON CONFLICT DO NOTHING",customer);
  var row=db.queryForMap("SELECT display_name,address,version FROM customer_account WHERE customer_id=?",customer);
  if(row.get("address")!=null)try{row.put("address",json.readValue(row.get("address").toString(),CommerceService.Address.class));}catch(Exception e){throw new IllegalStateException(e);}
  return row;
 }
 public Map<String,Object> save(String customer,Update body){
  var a=body.address();
  if(body.displayName()==null||body.displayName().isBlank()||body.displayName().length()>100||body.expectedVersion()==null||body.expectedVersion()<0||a==null||a.name()==null||a.name().isBlank()||a.name().length()>100||a.line()==null||a.line().length()<5||a.line().length()>300||a.city()==null||a.city().isBlank()||a.city().length()>100||a.pin()==null||!a.pin().matches("[1-9][0-9]{5}"))throw CommerceService.fail(HttpStatus.BAD_REQUEST,"Complete a valid name and Indian address");
  return tx.execute(s->{
   profile(customer);db.queryForList("SELECT customer_id FROM customer_account WHERE customer_id=? FOR UPDATE",customer);
   var current=profile(customer);
   if(body.displayName().equals(current.get("display_name"))&&a.equals(current.get("address")))return current;
   if(((Number)current.get("version")).longValue()!=body.expectedVersion())throw CommerceService.fail(HttpStatus.CONFLICT,"Account changed. Refresh before saving.");
   try{db.update("UPDATE customer_account SET display_name=?,address=?::jsonb,version=version+1,updated_at=now() WHERE customer_id=?",body.displayName(),json.writeValueAsString(a),customer);}catch(com.fasterxml.jackson.core.JsonProcessingException e){throw new IllegalStateException(e);}
   return profile(customer);
  });
 }
 public List<Map<String,Object>> orders(String customer){return db.queryForList("SELECT id,title,total_paise,state,created_at FROM checkout WHERE customer_id=? ORDER BY created_at DESC,id LIMIT 50",customer);}
 public CartService.Cart merge(String customer,String proof){
  if(proof==null||!proof.matches("guest:[a-f0-9-]{36}:[0-9]{10}:[a-f0-9]{64}"))throw CommerceService.fail(HttpStatus.BAD_REQUEST,"Valid guest ownership proof is required");
  int split=proof.lastIndexOf(':');String payload=proof.substring(0,split);int expiryStart=payload.lastIndexOf(':');
  if(Long.parseLong(payload.substring(expiryStart+1))<=System.currentTimeMillis()/1000||!Signatures.matches(secret,payload.getBytes(StandardCharsets.UTF_8),proof.substring(split+1)))throw CommerceService.fail(HttpStatus.FORBIDDEN,"Guest ownership proof expired or invalid");
  String guest=payload.substring(0,expiryStart);
  return tx.execute(s->{
   for(String owner:java.util.stream.Stream.of(customer,guest).sorted().toList()){
    db.update("INSERT INTO cart(customer_id) VALUES(?) ON CONFLICT DO NOTHING",owner);
    db.queryForList("SELECT customer_id FROM cart WHERE customer_id=? FOR UPDATE",owner);
   }
   var previous=db.queryForList("SELECT customer_id FROM cart_merge WHERE guest_id=?",String.class,guest);
   if(!previous.isEmpty()){
    if(!previous.getFirst().equals(customer))throw CommerceService.fail(HttpStatus.CONFLICT,"Guest bag already claimed by another account");
    return carts.get(customer);
   }
   var items=db.queryForList("SELECT offer_id,sum(quantity)::int AS quantity FROM cart_item WHERE customer_id IN (?,?) GROUP BY offer_id ORDER BY offer_id",customer,guest);
   if(items.size()>20||items.stream().anyMatch(i->((Number)i.get("quantity")).intValue()>10))throw CommerceService.fail(HttpStatus.CONFLICT,"Combined bag exceeds limits. Reduce quantities before merging; no items were changed.");
   for(var item:items)db.update("INSERT INTO cart_item(customer_id,offer_id,quantity) VALUES(?,?,?) ON CONFLICT(customer_id,offer_id) DO UPDATE SET quantity=excluded.quantity",customer,item.get("offer_id"),item.get("quantity"));
   db.update("DELETE FROM cart_item WHERE customer_id=?",guest);
   db.update("UPDATE cart SET version=version+1,updated_at=now() WHERE customer_id IN (?,?)",customer,guest);
   db.update("INSERT INTO cart_merge(guest_id,customer_id) VALUES(?,?)",guest,customer);
   db.update("INSERT INTO audit(actor,action,aggregate_id) VALUES(?,'GUEST_CART_MERGED',?)",customer,UUID.fromString(guest.substring(6)));
   return carts.get(customer);
  });
 }
}
