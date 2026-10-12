package com.aieval8.examproctoring.dto.response;

public class AuthResponse {

    private String token;
    private UserDto user;

    public AuthResponse() {
    }

    public AuthResponse(String token, UserDto user) {
        this.token = token;
        this.user = user;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public UserDto getUser() {
        return user;
    }

    public void setUser(UserDto user) {
        this.user = user;
    }

    public static class UserDto {
        private Long id;
        private String name;
        private String email;
        private String role;
        private Long clientId;
        private String clientName;

        public UserDto(Long id, String name, String email, String role, Long clientId, String clientName) {
            this.id = id;
            this.name = name;
            this.email = email;
            this.role = role;
            this.clientId = clientId;
            this.clientName = clientName;
        }

        public Long getId() {
            return id;
        }

        public String getName() {
            return name;
        }

        public String getEmail() {
            return email;
        }

        public String getRole() {
            return role;
        }

        public Long getClientId() {
            return clientId;
        }

        public String getClientName() {
            return clientName;
        }
    }
}
