package in.aangan.commerce;

import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
public class Errors {
    @ExceptionHandler(ResponseStatusException.class) ResponseEntity<?> status(ResponseStatusException e) {
        return ResponseEntity.status(e.getStatusCode()).body(Map.of("error",e.getReason()==null ? "Request rejected" : e.getReason()));
    }
    @ExceptionHandler({IllegalArgumentException.class, MethodArgumentNotValidException.class, org.springframework.http.converter.HttpMessageNotReadableException.class}) ResponseEntity<?> validation(Exception e) {
        return ResponseEntity.badRequest().body(Map.of("error","Invalid request. Check price, quantity and required fields."));
    }
}
