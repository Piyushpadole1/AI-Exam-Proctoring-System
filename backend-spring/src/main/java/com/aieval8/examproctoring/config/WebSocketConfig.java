package com.aieval8.examproctoring.config;

import com.aieval8.examproctoring.websocket.ProctoringWebSocketHandler;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private final ProctoringWebSocketHandler proctoringWebSocketHandler;

    public WebSocketConfig(ProctoringWebSocketHandler proctoringWebSocketHandler) {
        this.proctoringWebSocketHandler = proctoringWebSocketHandler;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(proctoringWebSocketHandler, "/ws/proctoring", "/api/ws/proctoring")
                .setAllowedOriginPatterns("*");
    }
}
