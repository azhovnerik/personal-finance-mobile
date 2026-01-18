package com.example.personalFinance.security.oauth;

import com.example.personalFinance.model.UserApp;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;

import java.util.Collection;
import java.util.Map;

/**
 * OAuth2 user that also implements {@link UserDetails} so that controllers
 * expecting a {@code UserDetails} principal continue to work with Google login.
 */
public class CustomOAuth2User extends DefaultOAuth2User implements UserDetails {

    private final UserApp user;

    public CustomOAuth2User(UserApp user, Map<String, Object> attributes) {
        super(user.getRole().getAuthorities(), attributes, "sub");
        this.user = user;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return user.getRole().getAuthorities();
    }

    @Override
    public String getPassword() {
        return user.getPassword();
    }

    @Override
    public String getUsername() {
        return user.getEmail();
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return true;
    }

    public String getFullName() {
        return user.getName();
    }
}

