package com.mucraft.bridge;

import org.bukkit.plugin.java.JavaPlugin;

public class MuCraftBridge extends JavaPlugin {

    private BridgeWebSocket webSocket;
    private StatusBroadcaster statusBroadcaster;
    private LogInterceptor logInterceptor;

    @Override
    public void onEnable() {
        saveDefaultConfig();

        int port = getConfig().getInt("port", 25580);
        String secret = getConfig().getString("secret", "change-me-secret");
        int statusInterval = getConfig().getInt("status-interval", 5000);

        // Start WebSocket server
        webSocket = new BridgeWebSocket(this, port, secret);
        webSocket.start();

        // Start periodic status broadcasting
        statusBroadcaster = new StatusBroadcaster(this, webSocket, statusInterval);
        statusBroadcaster.start();

        // Start log interceptor
        logInterceptor = new LogInterceptor(webSocket);
        logInterceptor.start();

        getLogger().info("MuCraftBridge enabled on port " + port);
    }

    @Override
    public void onDisable() {
        if (statusBroadcaster != null) {
            statusBroadcaster.stop();
        }

        if (logInterceptor != null) {
            logInterceptor.stop();
        }

        if (webSocket != null) {
            try {
                webSocket.stop(1000);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }

        getLogger().info("MuCraftBridge disabled");
    }
}
