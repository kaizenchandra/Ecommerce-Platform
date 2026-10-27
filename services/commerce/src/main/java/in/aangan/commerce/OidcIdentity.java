package in.aangan.commerce;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.core.*;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.stereotype.Component;
@Component
public class OidcIdentity {
 private final JwtDecoder decoder;
 public OidcIdentity(@Value("${OIDC_ISSUER:}") String issuer,@Value("${OIDC_JWKS_URI:}") String jwks,@Value("${OIDC_AUDIENCE:}") String audience,@Value("${OIDC_REQUIRED_ACR:}") String acr,@Value("${commerce.local-mode}") boolean local){
  if(issuer.isBlank()){decoder=null;return;}
  if(audience.isBlank()||acr.isBlank()||jwks.isBlank()||(!local&&(!issuer.startsWith("https://")||!jwks.startsWith("https://"))))throw new IllegalStateException("OIDC requires HTTPS issuer/JWKS, API audience and MFA ACR policy");
  var factory=new org.springframework.http.client.SimpleClientHttpRequestFactory();factory.setConnectTimeout(4000);factory.setReadTimeout(4000);
  var d=NimbusJwtDecoder.withJwkSetUri(jwks).restOperations(new org.springframework.web.client.RestTemplate(factory)).build();
  d.setJwtValidator(validator(issuer,audience,acr));decoder=d;
 }
 static OAuth2TokenValidator<Jwt> validator(String issuer,String audience,String acr){
  return new DelegatingOAuth2TokenValidator<>(JwtValidators.createDefaultWithIssuer(issuer),jwt->{
   boolean valid=jwt.getExpiresAt()!=null&&jwt.getSubject()!=null&&!jwt.getSubject().isBlank()&&jwt.getSubject().length()<=256&&jwt.getAudience().contains(audience)&&acr.equals(jwt.getClaimAsString("acr"));
   return valid?OAuth2TokenValidatorResult.success():OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token","Invalid audience, subject, expiry or authentication assurance",null));
  });
 }
 public String authenticate(String token){
  if(decoder==null||!token.contains("."))return null;
  var jwt=decoder.decode(token);
  try{return "oidc:"+HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest((jwt.getIssuer()+"\n"+jwt.getSubject()).getBytes(StandardCharsets.UTF_8)));}catch(java.security.NoSuchAlgorithmException e){throw new IllegalStateException(e);}
 }
}
