package com.mucraft.bridge;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.core.LogEvent;
import org.apache.logging.log4j.core.Logger;
import org.apache.logging.log4j.core.appender.AbstractAppender;
import org.apache.logging.log4j.core.config.Property;
import org.apache.logging.log4j.core.layout.PatternLayout;

/**
 * Intercepts all Minecraft server console log output via Log4j and forwards
 * each line to connected WebSocket clients.
 */
public class LogInterceptor {

    private static final String APPENDER_NAME = "MuCraftBridgeLogAppender";
    private final BridgeWebSocket webSocket;
    private final Gson gson = new Gson();
    private AbstractAppender appender;

    public LogInterceptor(BridgeWebSocket webSocket) {
        this.webSocket = webSocket;
    }

    public void start() {
        Logger rootLogger = (Logger) LogManager.getRootLogger();

        appender = new AbstractAppender(
                APPENDER_NAME,
                null,
                PatternLayout.newBuilder().withPattern("[%d{HH:mm:ss} %level]: %msg%n").build(),
                true,
                Property.EMPTY_ARRAY
        ) {
            @Override
            public void append(LogEvent event) {
                if (!webSocket.hasClients()) return;

                try {
                    String message = event.getMessage().getFormattedMessage();
                    if (message == null || message.isEmpty()) return;

                    // Skip our own bridge log messages to prevent loops
                    String loggerName = event.getLoggerName();
                    if (loggerName != null && loggerName.contains("MuCraftBridge")) return;

                    // Format with timestamp and level
                    String level = event.getLevel().name();
                    String timestamp = String.format("%1$tH:%1$tM:%1$tS", event.getTimeMillis());

                    // Strip color codes from raw message
                    String cleaned = message.replaceAll("\u00a7[0-9a-fk-or]", "")
                            .replaceAll("\u001b\\[[0-9;]*m", "");

                    // Split multi-line messages and send each line separately
                    String[] lines = cleaned.split("\n");
                    for (int i = 0; i < lines.length; i++) {
                        String line = lines[i].trim();
                        if (line.isEmpty()) continue;

                        // Only the first line gets the timestamp prefix
                        String formatted = (i == 0)
                                ? "[" + timestamp + " " + level + "]: " + line
                                : "  " + line;

                        JsonObject logMsg = new JsonObject();
                        logMsg.addProperty("type", "log");
                        logMsg.addProperty("line", formatted);
                        logMsg.addProperty("timestamp", System.currentTimeMillis());

                        webSocket.broadcastToAuthenticated(gson.toJson(logMsg));
                    }
                } catch (Exception e) {
                    // Silently ignore to prevent recursive logging
                }
            }
        };

        appender.start();
        rootLogger.addAppender(appender);
    }

    public void stop() {
        if (appender != null) {
            Logger rootLogger = (Logger) LogManager.getRootLogger();
            rootLogger.removeAppender(appender);
            appender.stop();
        }
    }
}
