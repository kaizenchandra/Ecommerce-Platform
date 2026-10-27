package in.aangan.commerce;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

/** One shipment per seller purchase initially; payment and inventory remain commerce-owned. */
@Service
public class FulfillmentService {
 private final JdbcTemplate db; private final TransactionTemplate tx; private final ObjectMapper json;
 public FulfillmentService(JdbcTemplate db,TransactionTemplate tx,ObjectMapper json){this.db=db;this.tx=tx;this.json=json;}
 public record Change(String state,String carrier,String trackingReference,Long expectedVersion,String expectedSellerId){}
 public record Shipment(UUID checkoutId,String sellerId,String state,String carrier,String trackingReference,long version){}
 public record Item(UUID offerId,String title,int quantity){}
 public record SellerOrder(UUID checkoutId,Object address,List<Item> items,Shipment shipment){}
 private Shipment shipment(UUID checkout,String seller){
  var rows=db.queryForList("SELECT * FROM fulfillment WHERE checkout_id=? AND seller_id=?",checkout,seller);
  if(rows.isEmpty())return new Shipment(checkout,seller,"AWAITING_FULFILLMENT","","",0);
  var r=rows.getFirst();return new Shipment(checkout,seller,r.get("state").toString(),r.get("carrier").toString(),r.get("tracking_reference").toString(),((Number)r.get("version")).longValue());
 }
 public List<SellerOrder> orders(String seller){
  return db.queryForList("SELECT c.id,c.address::text FROM checkout c WHERE c.state='CONFIRMED' AND EXISTS (SELECT 1 FROM checkout_item i WHERE i.checkout_id=c.id AND i.seller_id=?) ORDER BY c.created_at DESC,c.id LIMIT 50",seller).stream().map(r->{
   UUID id=(UUID)r.get("id");
   var items=db.query("SELECT offer_id,title,quantity FROM checkout_item WHERE checkout_id=? AND seller_id=? ORDER BY offer_id",(rs,n)->new Item(rs.getObject(1,UUID.class),rs.getString(2),rs.getInt(3)),id,seller);
   try{return new SellerOrder(id,json.readTree(r.get("address").toString()),items,shipment(id,seller));}catch(Exception e){throw new IllegalStateException("Invalid stored shipping address",e);}
  }).toList();
 }
 public List<Shipment> customer(String customer,UUID id){
  if(db.queryForObject("SELECT count(*) FROM checkout WHERE id=? AND customer_id=?",Integer.class,id,customer)==0)throw CommerceService.fail(HttpStatus.NOT_FOUND,"Order not found");
  if(!"CONFIRMED".equals(db.queryForObject("SELECT state FROM checkout WHERE id=?",String.class,id)))return List.of();
  return db.queryForList("SELECT DISTINCT seller_id FROM checkout_item WHERE checkout_id=? ORDER BY seller_id",String.class,id).stream().map(s->shipment(id,s)).toList();
 }
 public Shipment transition(String seller,UUID id,Change change){
  if(!seller.equals(change.expectedSellerId()))throw CommerceService.fail(HttpStatus.CONFLICT,"Seller identity changed. Reload this workspace");
  if(change.expectedVersion()==null||change.expectedVersion()<0||change.state()==null||!Set.of("PACKED","SHIPPED","DELIVERED").contains(change.state()))throw CommerceService.fail(HttpStatus.BAD_REQUEST,"Valid fulfillment state and version required");
  String carrier=clean(change.carrier(),80),tracking=clean(change.trackingReference(),120);
  if(change.state().equals("PACKED")&&(!carrier.isEmpty()||!tracking.isEmpty()))throw CommerceService.fail(HttpStatus.BAD_REQUEST,"Tracking is supplied at shipment");
  if(!change.state().equals("PACKED")&&(carrier.isEmpty()||tracking.isEmpty()))throw CommerceService.fail(HttpStatus.BAD_REQUEST,"Carrier and tracking reference required");
  return tx.execute(status->{
   // Lock the order before any fulfillment mutation; future cancellation must use the same lock.
   var rows=db.queryForList("SELECT state FROM checkout WHERE id=? AND EXISTS(SELECT 1 FROM checkout_item WHERE checkout_id=? AND seller_id=?) FOR UPDATE",id,id,seller);
   if(rows.isEmpty())throw CommerceService.fail(HttpStatus.NOT_FOUND,"Order not found");
   if(!rows.getFirst().get("state").equals("CONFIRMED"))throw CommerceService.fail(HttpStatus.CONFLICT,"Only confirmed captured orders can be fulfilled");
   Shipment previous=shipment(id,seller);
   if(previous.state().equals(change.state())&&previous.carrier().equals(carrier)&&previous.trackingReference().equals(tracking))return previous;
   if(previous.version()!=change.expectedVersion())throw CommerceService.fail(HttpStatus.CONFLICT,"Fulfillment changed. Reload before continuing");
   String next=switch(previous.state()){case "AWAITING_FULFILLMENT"->"PACKED";case "PACKED"->"SHIPPED";case "SHIPPED"->"DELIVERED";default->"";};
   if(!next.equals(change.state()))throw CommerceService.fail(HttpStatus.CONFLICT,"Invalid fulfillment transition");
   if(next.equals("DELIVERED")&&(!carrier.equals(previous.carrier())||!tracking.equals(previous.trackingReference())))throw CommerceService.fail(HttpStatus.CONFLICT,"Shipped tracking cannot be changed");
   long version=previous.version()+1;
   db.update("INSERT INTO fulfillment(checkout_id,seller_id,state,carrier,tracking_reference,version) VALUES(?,?,?,?,?,?) ON CONFLICT(checkout_id,seller_id) DO UPDATE SET state=excluded.state,carrier=excluded.carrier,tracking_reference=excluded.tracking_reference,version=excluded.version,updated_at=now()",id,seller,next,carrier,tracking,version);
   UUID eventId=UUID.randomUUID();
   try{
    String event=json.writeValueAsString(Map.of("eventId",eventId,"type","FulfillmentChanged","schemaVersion",1,"aggregateId",id+":"+seller,"checkoutId",id,"sellerId",seller,"state",next,"version",version,"occurredAt",Instant.now().toString()));
    db.update("INSERT INTO outbox(id,aggregate_id,topic,payload) VALUES(?,?,?,?::jsonb)",eventId,id,"commerce.fulfillment.v1",event);
   }catch(com.fasterxml.jackson.core.JsonProcessingException e){throw new IllegalStateException(e);}
   db.update("INSERT INTO audit(actor,action,aggregate_id) VALUES(?,?,?)",seller,"FULFILLMENT_"+next,id);
   return shipment(id,seller);
  });
 }
 private static String clean(String value,int max){String s=value==null?"":value.trim();if(s.length()>max||s.chars().anyMatch(Character::isISOControl))throw CommerceService.fail(HttpStatus.BAD_REQUEST,"Invalid tracking details");return s;}
}
