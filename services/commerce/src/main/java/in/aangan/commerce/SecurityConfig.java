package in.aangan.commerce;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.filter.OncePerRequestFilter;

@Configuration
public class SecurityConfig {
    @Bean SecurityFilterChain security(HttpSecurity http, @Value("${commerce.local-mode}") boolean local,
            @Value("${commerce.guest-secret}") String secret, @Value("${commerce.seller-token}") String seller,
            @Value("${commerce.seller-b-token}") String sellerB, @Value("${commerce.admin-token}") String admin,
            @Value("${commerce.customer-token:}") String customer, @Value("${commerce.customer-b-token:}") String customerB, OidcIdentity oidc) throws Exception {
        if (secret.length() < 32) throw new IllegalStateException("GUEST_SECRET must have at least 32 characters");
        var filter = new OncePerRequestFilter() {
            @Override protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain) throws IOException, ServletException {
                String bearer = req.getHeader("Authorization");
                String token = bearer != null && bearer.startsWith("Bearer ") ? bearer.substring(7) : "";
                String subject = null, role = null;
                if (local && !token.isBlank()) {
                    if (!seller.isBlank() && token.equals(seller)) { subject = "seller-a"; role = "SELLER"; }
                    else if (!sellerB.isBlank() && token.equals(sellerB)) { subject = "seller-b"; role = "SELLER"; }
                    else if (!admin.isBlank() && token.equals(admin)) { subject = "admin-local"; role = "ADMIN"; }
                    else if (!customer.isBlank() && token.equals(customer)) {subject="customer-a";role="REGISTERED_CUSTOMER";}
                    else if (!customerB.isBlank() && token.equals(customerB)) {subject="customer-b";role="REGISTERED_CUSTOMER";}
                }
                if (subject == null && token.matches("guest:[a-f0-9-]{36}:[0-9]{10}:[a-f0-9]{64}")) {
                    int split = token.lastIndexOf(':'); String payload = token.substring(0, split);
                    long expiry = Long.parseLong(payload.substring(payload.lastIndexOf(':') + 1));
                    if (expiry > System.currentTimeMillis()/1000 && Signatures.matches(secret, payload.getBytes(StandardCharsets.UTF_8), token.substring(split + 1))) {
                        subject = payload.substring(0, payload.lastIndexOf(':')); role = "CUSTOMER";
                    }
                }
                if (subject != null) SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(subject, null, role.equals("REGISTERED_CUSTOMER")?List.of(new SimpleGrantedAuthority("ROLE_REGISTERED_CUSTOMER"),new SimpleGrantedAuthority("ROLE_CUSTOMER")):List.of(new SimpleGrantedAuthority("ROLE_" + role))));
                if(subject==null){
                    try{String oidcSubject=oidc.authenticate(token);if(oidcSubject!=null)SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(oidcSubject,null,List.of(new SimpleGrantedAuthority("ROLE_REGISTERED_CUSTOMER"),new SimpleGrantedAuthority("ROLE_CUSTOMER"))));}
                    catch(org.springframework.security.oauth2.jwt.JwtException e){rejection(res,401,"Identity token rejected");return;}
                }
                chain.doFilter(req, res);
            }
        };
        return http.csrf(c -> c.disable()).sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(a -> a.requestMatchers("/actuator/health/**", "/api/catalog/**", "/api/webhooks/razorpay").permitAll()
                .requestMatchers("/actuator/metrics/**").hasRole("ADMIN")
                .requestMatchers("/api/account/**", "/api/account").hasRole("REGISTERED_CUSTOMER")
                .requestMatchers("/api/seller/**").hasRole("SELLER").requestMatchers("/api/admin/**").hasRole("ADMIN")
                .requestMatchers("/api/checkouts/**", "/api/cart", "/api/cart/**").hasRole("CUSTOMER").anyRequest().denyAll())
            .exceptionHandling(e -> e.authenticationEntryPoint((req,res,ex) -> rejection(res,401,"Authentication required"))
                .accessDeniedHandler((req,res,ex) -> rejection(res,403,"Insufficient permissions")))
            .addFilterBefore(filter, UsernamePasswordAuthenticationFilter.class).build();
    }
    private static void rejection(HttpServletResponse response, int status, String message) throws IOException {
        response.setStatus(status);
        response.setContentType("application/json");
        response.getWriter().write("{\"error\":\"" + message + "\"}");
    }
}
