package com.example.personalFinance.security.auth;


import com.example.personalFinance.model.UserApp;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.http.HttpServletRequest;
import lombok.SneakyThrows;
import org.springframework.security.core.AuthenticationException;
import org.springframework.stereotype.Component;

import java.io.UnsupportedEncodingException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Date;
import java.util.List;
import java.util.concurrent.TimeUnit;

@Component
public class JwtUtil {
    private final String secret_key = "mysecretkeynrtgeitrn84846yn5h56nkyk56yk65n5kl56nk45ny5ln6yl45";
    private long accessTokenValidity = 60 * 60 * 1000;

    private final JwtParser jwtParser;

    private final String TOKEN_HEADER = "Authorization";
    private final String TOKEN_PREFIX = "Bearer ";

    public JwtUtil() throws NoSuchAlgorithmException, UnsupportedEncodingException {
        byte[] key = convertSecretKeyToBytes();
        this.jwtParser = Jwts.parser().verifyWith(Keys.hmacShaKeyFor(key)).build();
    }

    @SneakyThrows
    private byte[] convertSecretKeyToBytes() {
        MessageDigest md = MessageDigest.getInstance("SHA-256");
        md.update(secret_key.getBytes("UTF-8"));
        byte[] key = md.digest();
        return key;
    }

    public String createToken(UserApp user) {
        Claims claims = (Claims) Jwts.claims().setSubject(user.getEmail()).build();
        Date tokenCreateTime = new Date();
        Date tokenValidity = new Date(tokenCreateTime.getTime() + TimeUnit.MINUTES.toMillis(accessTokenValidity));
        return Jwts.builder()
                .setClaims(claims)
                .setExpiration(tokenValidity)
                .signWith(SignatureAlgorithm.HS256, convertSecretKeyToBytes())
                .compact();
    }

    private Claims parseJwtClaims(String token) {
        return jwtParser.parseClaimsJws(token).getBody();
    }

    public Claims resolveClaims(HttpServletRequest request) {
        try {
            String token = resolveToken(request);
            if (token != null) {
                return parseJwtClaims(token);
            }
            return null;
        } catch (ExpiredJwtException ex) {
            request.setAttribute("expired", ex.getMessage());
            throw ex;
        } catch (Exception ex) {
            request.setAttribute("invalid", ex.getMessage());
            throw ex;
        }
    }

    public String resolveToken(HttpServletRequest request) {

        String bearerToken = request.getHeader(TOKEN_HEADER);
        if (bearerToken != null && bearerToken.startsWith(TOKEN_PREFIX)) {
            return bearerToken.substring(TOKEN_PREFIX.length());
        }
        return null;
    }

    public boolean validateClaims(Claims claims) throws AuthenticationException {
        try {
            return claims.getExpiration().after(new Date());
        } catch (Exception e) {
            throw e;
        }
    }

    public String getEmail(Claims claims) {
        return claims.getSubject();
    }

    private List<String> getRoles(Claims claims) {
        return (List<String>) claims.get("roles");
    }
}
