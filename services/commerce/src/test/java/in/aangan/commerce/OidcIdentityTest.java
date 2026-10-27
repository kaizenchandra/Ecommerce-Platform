package in.aangan.commerce;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;
import static org.junit.jupiter.api.Assertions.*;
class OidcIdentityTest {
 private Jwt token(String issuer,String audience,String acr,Instant expires){
  var b=Jwt.withTokenValue("fixture").header("alg","RS256").subject("customer").issuer(issuer).audience(List.of(audience)).issuedAt(Instant.now().minusSeconds(600)).claim("acr",acr);
  if(expires!=null)b.expiresAt(expires);return b.build();
 }
 @Test void validatesIssuerAudienceExpiryAndMfaAssurance(){
  var v=OidcIdentity.validator("https://id.example","commerce","mfa");var future=Instant.now().plusSeconds(300);
  assertFalse(v.validate(token("https://id.example","commerce","mfa",future)).hasErrors());
  assertTrue(v.validate(token("https://wrong.example","commerce","mfa",future)).hasErrors());
  assertTrue(v.validate(token("https://id.example","web-client","mfa",future)).hasErrors());
  assertTrue(v.validate(token("https://id.example","commerce","password",future)).hasErrors());
  assertTrue(v.validate(token("https://id.example","commerce","mfa",null)).hasErrors());
  assertTrue(v.validate(token("https://id.example","commerce","mfa",Instant.now().minusSeconds(300))).hasErrors());
 }
 @Test void rejectsInsecureProductionConfiguration(){assertThrows(IllegalStateException.class,()->new OidcIdentity("http://issuer","http://issuer/jwks","api","mfa",false));}
}
