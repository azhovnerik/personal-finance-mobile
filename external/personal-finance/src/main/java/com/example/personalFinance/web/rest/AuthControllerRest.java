package com.example.personalFinance.web.rest;


import com.example.personalFinance.dto.UserDto;
import com.example.personalFinance.model.UserApp;
import com.example.personalFinance.model.VerificationToken;
import com.example.personalFinance.model.VerificationTokenType;
import com.example.personalFinance.repository.VerificationTokenRepository;
import com.example.personalFinance.security.auth.JwtUtil;
import com.example.personalFinance.service.UserService;
import com.example.personalFinance.web.rest.dto.ErrorResponse;
import com.example.personalFinance.web.rest.dto.LoginDto;
import com.example.personalFinance.web.rest.dto.LoginResponse;
import com.example.personalFinance.web.rest.dto.UserResponse;
import io.jsonwebtoken.Claims;
import jakarta.servlet.http.HttpServletRequest;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import org.jetbrains.annotations.Nullable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@CrossOrigin("http://localhost:3000")
@RestController
@RequestMapping("/api/v2/user")
public class AuthControllerRest {

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private UserService userService;

    @Autowired
    private VerificationTokenRepository tokenRepository;

    @Autowired
    private JwtUtil jwtUtil;

    @PostMapping("/auth/login")
    public ResponseEntity login(@RequestBody LoginDto loginDto) {
        try {
            ResponseEntity<LoginResponse> loginResponse = getLoginResponseResponseEntity(loginDto);
            if (loginResponse != null) return loginResponse;

        } catch (DisabledException e) {
            String normalizedEmail = loginDto.getEmail().trim().toLowerCase();
            Optional<UserApp> userOptional = userService.findByEmail(normalizedEmail);

            if (userOptional.isPresent() && !userOptional.get().isVerified()) {
                String resendLink = "http://localhost:8080/api/v2/user/resend-verification?email="
                        + URLEncoder.encode(userOptional.get().getEmail(), StandardCharsets.UTF_8);
                Map<String, Object> details = new HashMap<>();
                details.put("resendLink", resendLink);
                ErrorResponse errorResponse = new ErrorResponse("UNAUTHORIZED",
                        "Your email address has not been verified yet. Please verify it before logging in.",
                        details);
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorResponse);
            }

            ErrorResponse errorResponse = new ErrorResponse("UNAUTHORIZED", "Your account is disabled.", null);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorResponse);
        } catch (BadCredentialsException e) {
            Optional<UserApp> userOptional = userService.recordFailedLoginAttempt(loginDto.getEmail());
            if (userOptional.isPresent()) {
                UserApp user = userOptional.get();
                LocalDateTime now = LocalDateTime.now();
                if (user.isLoginLocked(now)) {
                    long minutes = Math.max(user.minutesUntilUnlock(now), 1L);
                    Map<String, Object> details = new HashMap<>();
                    details.put("retryAfterMinutes", minutes);
                    ErrorResponse errorResponse = new ErrorResponse("UNAUTHORIZED",
                            "Your account has been temporarily locked due to too many failed login attempts.",
                            details);
                    return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorResponse);
                }
            }
            ErrorResponse errorResponse = new ErrorResponse("UNAUTHORIZED", "Invalid username or password", null);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorResponse);
        } catch (LockedException e) {
            Optional<UserApp> userOptional = userService.findByEmail(loginDto.getEmail());
            if (userOptional.isPresent()) {
                UserApp user = userOptional.get();
                LocalDateTime now = LocalDateTime.now();
                long minutes = Math.max(user.minutesUntilUnlock(now), 1L);
                Map<String, Object> details = new HashMap<>();
                details.put("retryAfterMinutes", minutes);
                ErrorResponse errorResponse = new ErrorResponse("UNAUTHORIZED",
                        "Your account has been temporarily locked due to too many failed login attempts.",
                        details);
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorResponse);
            }
            ErrorResponse errorResponse = new ErrorResponse("UNAUTHORIZED",
                    "Your account has been temporarily locked due to too many failed login attempts.",
                    null);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorResponse);
        } catch (Exception e) {
            ErrorResponse errorResponse = new ErrorResponse("UNAUTHORIZED", e.getMessage(), null);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorResponse);
        }
        ErrorResponse errorResponse = new ErrorResponse("UNAUTHORIZED", "", null);
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorResponse);
    }

    @Nullable
    private ResponseEntity<LoginResponse> getLoginResponseResponseEntity(LoginDto loginDto) {
        Authentication authentication =
                authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(loginDto.getEmail(), loginDto.getPassword()));
        String email = authentication.getName();
        Optional<UserApp> maybeUser = userService.findByEmail(email);
        if (maybeUser.isPresent()) {
            userService.resetFailedLoginAttempts(maybeUser.get());
            String token = jwtUtil.createToken(maybeUser.get());
            LoginResponse loginResponse = new LoginResponse(token, toUserResponse(maybeUser.get()));
            return ResponseEntity.ok(loginResponse);
        }
        return null;
    }


    @PostMapping("/signup")
    public ResponseEntity<?> registerUser(@RequestBody UserDto signUpDto) {
        if (userService.findByEmail(signUpDto.getEmail()).isPresent()) {
            return new ResponseEntity<>("Email is already exist!", HttpStatus.BAD_REQUEST);
        }
        UserApp userApp = userService.registerNewUserAccount(signUpDto);
        return new ResponseEntity<>(userApp, HttpStatus.OK);
    }

    @GetMapping("/verify")
    public ResponseEntity<String> verifyUser(@RequestParam String token) {
        Optional<VerificationToken> optionalToken = tokenRepository.findByTokenAndType(token, VerificationTokenType.REGISTRATION);

        if (optionalToken.isEmpty()) {
            return ResponseEntity.badRequest().body("Invalid verification token");
        }

        VerificationToken verificationToken = optionalToken.get();
        if (verificationToken.getExpiryDate().isBefore(LocalDateTime.now())) {
            return ResponseEntity.badRequest().body("Token expired. Please request a new verification email.");
        }

        UserApp user = verificationToken.getUser();
        userService.setVerified(user);
        tokenRepository.delete(verificationToken); // optional: clean up token

        String authorizationToken = jwtUtil.createToken(user);

        return ResponseEntity.status(HttpStatus.FOUND)
                .header(HttpHeaders.LOCATION, "http://localhost:3000/invitation")
                .header(HttpHeaders.SET_COOKIE, "token=" + authorizationToken + "; Path=/;  SameSite=Lax")
                .build();
    }

    @GetMapping("/me")
    public ResponseEntity<?> getUserInfo(HttpServletRequest request) {
        Claims claims = jwtUtil.resolveClaims(request); // см. ниже
        if (claims == null || !jwtUtil.validateClaims(claims)) {
            ErrorResponse errorResponse = new ErrorResponse("UNAUTHORIZED", "Invalid validation token", null);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorResponse);
        }
        String email = claims.getSubject();
        Optional<UserApp> user = userService.findByEmail(email);
        if (user.isPresent()) {
            return ResponseEntity.ok(toUserResponse(user.get()));
        }
        ErrorResponse errorResponse = new ErrorResponse("UNAUTHORIZED", "Invalid validation token", null);
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorResponse);
    }

    @GetMapping("/resend-verification")
    public ResponseEntity<?> resendVerification(@RequestParam String email) {
        String normalizedEmail = email.trim().toLowerCase();
        Optional<UserApp> optionalUser = userService.findByEmail(normalizedEmail);

        if (optionalUser.isEmpty()) {
            ErrorResponse errorResponse = new ErrorResponse("BAD_REQUEST",
                    "We could not find an unverified account with that email address.",
                    null);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
        }

        UserApp user = optionalUser.get();

        if (user.isVerified()) {
            ErrorResponse errorResponse = new ErrorResponse("BAD_REQUEST",
                    "This email address has already been verified.",
                    null);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
        }

        userService.sendVerificationEmail(user);
        return ResponseEntity.ok(Map.of("message", "Verification email has been resent."));
    }

    private UserResponse toUserResponse(UserApp user) {
        return new UserResponse(user.getId(), user.getEmail(), user.getName());
    }
}
