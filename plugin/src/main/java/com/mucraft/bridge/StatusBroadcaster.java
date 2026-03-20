package com.mucraft.bridge;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import org.bukkit.Bukkit;
import org.bukkit.scheduler.BukkitTask;

public class StatusBroadcaster {

    private final MuCraftBridge plugin;
    private final BridgeWebSocket webSocket;
    private final int intervalMs;
    private final Gson gson = new Gson();
    private BukkitTask task;

    public StatusBroadcaster(MuCraftBridge plugin, BridgeWebSocket webSocket, int intervalMs) {
        this.plugin = plugin;
        this.webSocket = webSocket;
        this.intervalMs = intervalMs;
    }

    public void start() {
        long ticks = Math.max(1, intervalMs / 50); // Convert ms to ticks (1 tick = 50ms)
        task = Bukkit.getScheduler().runTaskTimer(plugin, () -> {
            if (!webSocket.hasClients()) return;

            JsonObject status = webSocket.buildStatusPayload();
            webSocket.broadcastToAuthenticated(gson.toJson(status));
        }, ticks, ticks);
    }

    public void stop() {
        if (task != null) {
            task.cancel();
            task = null;
        }
    }
}
