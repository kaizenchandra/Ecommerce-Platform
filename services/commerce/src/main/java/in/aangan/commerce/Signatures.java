package in.aangan.commerce;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;

public final class Signatures {
    private Signatures() {}
    public static String hmac(String secret, byte[] body) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(body));
        } catch (Exception e) { throw new IllegalStateException("Signature configuration invalid", e); }
    }
    public static boolean matches(String secret, byte[] body, String supplied) {
        if (secret.isBlank() || supplied == null || !supplied.matches("[a-fA-F0-9]{64}")) return false;
        return MessageDigest.isEqual(HexFormat.of().parseHex(hmac(secret, body)), HexFormat.of().parseHex(supplied));
    }
}
