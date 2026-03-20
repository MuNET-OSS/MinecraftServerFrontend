package com.mucraft.bridge;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.google.gson.JsonArray;
import org.bukkit.Bukkit;
import org.bukkit.entity.Player;
import org.java_websocket.WebSocket;
import org.java_websocket.handshake.ClientHandshake;
import org.java_websocket.server.WebSocketServer;

import java.net.InetSocketAddress;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;
import org.bukkit.command.Command;
import org.bukkit.command.CommandMap;

public class BridgeWebSocket extends WebSocketServer {

    private final MuCraftBridge plugin;
    private final String secret;
    private final Gson gson = new Gson();
    private final Set<WebSocket> authenticated = ConcurrentHashMap.newKeySet();

    public BridgeWebSocket(MuCraftBridge plugin, int port, String secret) {
        super(new InetSocketAddress("127.0.0.1", port));
        this.plugin = plugin;
        this.secret = secret;
        setReuseAddr(true);
    }

    @Override
    public void onOpen(WebSocket conn, ClientHandshake handshake) {
        plugin.getLogger().info("WebSocket client connected: " + conn.getRemoteSocketAddress());
    }

    @Override
    public void onClose(WebSocket conn, int code, String reason, boolean remote) {
        authenticated.remove(conn);
        plugin.getLogger().info("WebSocket client disconnected: " + conn.getRemoteSocketAddress());
    }

    @Override
    public void onMessage(WebSocket conn, String message) {
        try {
            JsonObject msg = gson.fromJson(message, JsonObject.class);
            String type = msg.has("type") ? msg.get("type").getAsString() : "";

            // Authentication
            if ("auth".equals(type)) {
                String clientSecret = msg.has("secret") ? msg.get("secret").getAsString() : "";
                if (secret.equals(clientSecret)) {
                    authenticated.add(conn);
                    JsonObject reply = new JsonObject();
                    reply.addProperty("type", "auth");
                    reply.addProperty("success", true);
                    conn.send(gson.toJson(reply));
                } else {
                    JsonObject reply = new JsonObject();
                    reply.addProperty("type", "auth");
                    reply.addProperty("success", false);
                    conn.send(gson.toJson(reply));
                    conn.close(4001, "Invalid secret");
                }
                return;
            }

            // All other messages require authentication
            if (!authenticated.contains(conn)) {
                JsonObject reply = new JsonObject();
                reply.addProperty("type", "error");
                reply.addProperty("message", "Not authenticated");
                conn.send(gson.toJson(reply));
                return;
            }

            switch (type) {
                case "command" -> handleCommand(conn, msg);
                case "status" -> handleStatusRequest(conn);
                case "commands" -> handleCommandsRequest(conn);
                case "tabcomplete" -> handleTabComplete(conn, msg);
                default -> {
                    JsonObject reply = new JsonObject();
                    reply.addProperty("type", "error");
                    reply.addProperty("message", "Unknown message type: " + type);
                    conn.send(gson.toJson(reply));
                }
            }
        } catch (Exception e) {
            plugin.getLogger().warning("Error processing message: " + e.getMessage());
        }
    }

    @Override
    public void onError(WebSocket conn, Exception ex) {
        plugin.getLogger().warning("WebSocket error: " + ex.getMessage());
    }

    @Override
    public void onStart() {
        plugin.getLogger().info("WebSocket server started on " + getAddress());
    }

    // ── Command execution ──────────────────────────────

    private void handleCommand(WebSocket conn, JsonObject msg) {
        String command = msg.has("command") ? msg.get("command").getAsString() : "";
        String id = msg.has("id") ? msg.get("id").getAsString() : "";

        if (command.isEmpty()) {
            JsonObject reply = new JsonObject();
            reply.addProperty("type", "command_result");
            reply.addProperty("id", id);
            reply.addProperty("success", false);
            reply.addProperty("result", "Empty command");
            conn.send(gson.toJson(reply));
            return;
        }

        // Dispatch command to main thread
        Bukkit.getScheduler().runTask(plugin, () -> {
            try {
                boolean success = Bukkit.dispatchCommand(Bukkit.getConsoleSender(), command);

                JsonObject reply = new JsonObject();
                reply.addProperty("type", "command_result");
                reply.addProperty("id", id);
                reply.addProperty("success", success);
                reply.addProperty("result", success ? "Command dispatched" : "Command failed");
                conn.send(gson.toJson(reply));
            } catch (Exception e) {
                JsonObject reply = new JsonObject();
                reply.addProperty("type", "command_result");
                reply.addProperty("id", id);
                reply.addProperty("success", false);
                reply.addProperty("result", "Error: " + e.getMessage());
                conn.send(gson.toJson(reply));
            }
        });
    }

    // ── Status request (on-demand) ─────────────────────

    private void handleStatusRequest(WebSocket conn) {
        Bukkit.getScheduler().runTask(plugin, () -> {
            conn.send(gson.toJson(buildStatusPayload()));
        });
    }

    // ── Commands list request ──────────────────────────

    private void handleCommandsRequest(WebSocket conn) {
        Bukkit.getScheduler().runTask(plugin, () -> {
            try {
                CommandMap commandMap = Bukkit.getServer().getCommandMap();
                Map<String, Command> known = commandMap.getKnownCommands();

                // Collect unique command names (skip namespaced duplicates like "essentials:home")
                Set<String> commands = new TreeSet<>();
                for (Map.Entry<String, Command> entry : known.entrySet()) {
                    String label = entry.getKey();
                    if (!label.contains(":")) {
                        commands.add(label);
                    }
                }

                JsonObject reply = new JsonObject();
                reply.addProperty("type", "commands");
                JsonArray arr = new JsonArray();
                for (String cmd : commands) {
                    arr.add(cmd);
                }
                reply.add("commands", arr);
                conn.send(gson.toJson(reply));
            } catch (Exception e) {
                JsonObject reply = new JsonObject();
                reply.addProperty("type", "commands");
                reply.add("commands", new JsonArray());
                conn.send(gson.toJson(reply));
                plugin.getLogger().warning("Failed to get command list: " + e.getMessage());
            }
        });
    }

    // ── Tab completion (server-side Brigadier) ─────────

    private void handleTabComplete(WebSocket conn, JsonObject msg) {
        String input = msg.has("input") ? msg.get("input").getAsString() : "";
        String id = msg.has("id") ? msg.get("id").getAsString() : "";

        Bukkit.getScheduler().runTask(plugin, () -> {
            try {
                CommandMap commandMap = Bukkit.getServer().getCommandMap();
                List<String> completions = commandMap.tabComplete(Bukkit.getConsoleSender(), input);

                JsonObject reply = new JsonObject();
                reply.addProperty("type", "tabcomplete");
                reply.addProperty("id", id);
                JsonArray arr = new JsonArray();
                if (completions != null) {
                    for (String s : completions) {
                        arr.add(s);
                    }
                }
                reply.add("suggestions", arr);
                conn.send(gson.toJson(reply));
            } catch (Exception e) {
                JsonObject reply = new JsonObject();
                reply.addProperty("type", "tabcomplete");
                reply.addProperty("id", id);
                reply.add("suggestions", new JsonArray());
                conn.send(gson.toJson(reply));
            }
        });
    }

    // ── Build status payload ───────────────────────────

    public JsonObject buildStatusPayload() {
        JsonObject status = new JsonObject();
        status.addProperty("type", "status");

        // TPS
        double[] tps = Bukkit.getTPS();
        JsonObject tpsObj = new JsonObject();
        tpsObj.addProperty("tps1m", Math.min(20.0, tps[0]));
        tpsObj.addProperty("tps5m", Math.min(20.0, tps[1]));
        tpsObj.addProperty("tps15m", Math.min(20.0, tps[2]));
        status.add("tps", tpsObj);

        // Memory
        Runtime runtime = Runtime.getRuntime();
        long maxMB = runtime.maxMemory() / (1024 * 1024);
        long totalMB = runtime.totalMemory() / (1024 * 1024);
        long freeMB = runtime.freeMemory() / (1024 * 1024);
        long usedMB = totalMB - freeMB;

        JsonObject memObj = new JsonObject();
        memObj.addProperty("used", usedMB);
        memObj.addProperty("total", maxMB);
        memObj.addProperty("free", maxMB - usedMB);
        status.add("memory", memObj);

        // CPU (JVM process)
        com.sun.management.OperatingSystemMXBean osBean =
                (com.sun.management.OperatingSystemMXBean) java.lang.management.ManagementFactory.getOperatingSystemMXBean();
        double processCpu = osBean.getProcessCpuLoad() * 100;
        double systemCpu = osBean.getSystemCpuLoad() * 100;
        JsonObject cpuObj = new JsonObject();
        cpuObj.addProperty("process", Math.max(0, processCpu));
        cpuObj.addProperty("system", Math.max(0, systemCpu));
        status.add("cpu", cpuObj);

        // Players
        Collection<? extends Player> online = Bukkit.getOnlinePlayers();
        JsonObject playersObj = new JsonObject();
        playersObj.addProperty("online", online.size());
        playersObj.addProperty("max", Bukkit.getMaxPlayers());
        JsonArray list = new JsonArray();
        for (Player p : online) {
            list.add(p.getName());
        }
        playersObj.add("list", list);
        status.add("players", playersObj);

        // MSPT (milliseconds per tick) — Paper API
        try {
            double mspt = Bukkit.getAverageTickTime();
            status.addProperty("mspt", mspt);
        } catch (Exception e) {
            status.addProperty("mspt", -1);
        }

        return status;
    }

    // ── Broadcast to all authenticated clients ─────────

    public void broadcastToAuthenticated(String message) {
        for (WebSocket conn : authenticated) {
            if (conn.isOpen()) {
                try {
                    conn.send(message);
                } catch (Exception e) {
                    // ignore send failures
                }
            }
        }
    }

    public boolean hasClients() {
        return !authenticated.isEmpty();
    }
}
