package in.aangan.commerce;

import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class CartService {
    public record Line(UUID offerId,int quantity,CommerceService.Offer offer) {}
    public record Cart(long version,List<Line> items) {}
    public record Change(UUID offerId,Integer quantity,Long expectedVersion) {}
    private final JdbcTemplate db; private final TransactionTemplate tx; private final CommerceService commerce;
    public CartService(JdbcTemplate db,TransactionTemplate tx,CommerceService commerce){this.db=db;this.tx=tx;this.commerce=commerce;}
    public Cart get(String customer){return tx.execute(s->{lock(customer);return read(customer);});}
    private long lock(String customer){
        db.update("INSERT INTO cart(customer_id) VALUES(?) ON CONFLICT DO NOTHING",customer);
        return db.queryForObject("SELECT version FROM cart WHERE customer_id=? FOR UPDATE",Long.class,customer);
    }
    private Cart read(String customer){
        long version=db.queryForObject("SELECT version FROM cart WHERE customer_id=?",Long.class,customer);
        var lines=db.query("SELECT offer_id,quantity FROM cart_item WHERE customer_id=? ORDER BY offer_id",(r,n)->{
            UUID id=r.getObject("offer_id",UUID.class);CommerceService.Offer offer=null;
            try{offer=commerce.product(id);}catch(org.springframework.web.server.ResponseStatusException e){if(e.getStatusCode().value()!=404)throw e;}
            return new Line(id,r.getInt("quantity"),offer);
        },customer);
        return new Cart(version,lines);
    }
    public Cart change(String customer,Change change){
        if(change.offerId()==null||change.quantity()==null||change.expectedVersion()==null||change.quantity()<0||change.quantity()>10||change.expectedVersion()<0)throw CommerceService.fail(HttpStatus.BAD_REQUEST,"Invalid cart update");
        return tx.execute(s->{
            long version=lock(customer);
            if(db.queryForObject("SELECT count(*) FROM cart_merge WHERE guest_id=?",Integer.class,customer)>0)throw CommerceService.fail(HttpStatus.CONFLICT,"This guest bag was merged. Start a new guest session or sign in.");
            var quantities=db.queryForList("SELECT quantity FROM cart_item WHERE customer_id=? AND offer_id=?",Integer.class,customer,change.offerId());
            int prior=quantities.isEmpty()?0:quantities.getFirst();
            // A replay of an absolute value is harmless, including after a lost response.
            if(prior==change.quantity())return read(customer);
            if(version!=change.expectedVersion())throw CommerceService.fail(HttpStatus.CONFLICT,"Your bag changed in another tab. Refresh before editing.");
            if(change.quantity()>0){
                commerce.product(change.offerId());
                if(prior==0 && db.queryForObject("SELECT count(*) FROM cart_item WHERE customer_id=?",Integer.class,customer)>=20)throw CommerceService.fail(HttpStatus.CONFLICT,"A bag supports up to 20 products");
                db.update("INSERT INTO cart_item(customer_id,offer_id,quantity) VALUES(?,?,?) ON CONFLICT(customer_id,offer_id) DO UPDATE SET quantity=excluded.quantity",customer,change.offerId(),change.quantity());
            }else db.update("DELETE FROM cart_item WHERE customer_id=? AND offer_id=?",customer,change.offerId());
            db.update("UPDATE cart SET version=version+1,updated_at=now() WHERE customer_id=?",customer);
            return read(customer);
        });
    }
}
