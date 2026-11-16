package com.egc.eglise;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

final class NativeApiClient {
    static final String BASE_URL = BuildConfig.EGC_API_URL;

    interface Callback {
        void onComplete(String body, String error);
    }

    private static final ExecutorService EXECUTOR = Executors.newFixedThreadPool(2);

    private NativeApiClient() {}

    static void get(String path, String token, Callback callback) {
        execute(path, "GET", null, token, callback);
    }

    static void post(String path, JSONObject body, Callback callback) {
        execute(path, "POST", body, null, callback);
    }

    private static void execute(
        String path,
        String method,
        JSONObject body,
        String token,
        Callback callback
    ) {
        EXECUTOR.execute(() -> {
            HttpURLConnection connection = null;
            try {
                connection = (HttpURLConnection) new URL(BASE_URL + path).openConnection();
                connection.setRequestMethod(method);
                connection.setConnectTimeout(12_000);
                connection.setReadTimeout(15_000);
                connection.setRequestProperty("Accept", "application/json");
                connection.setRequestProperty("Cache-Control", "no-cache");
                if (token != null && !token.isBlank()) {
                    connection.setRequestProperty("Authorization", "Bearer " + token);
                }
                if (body != null) {
                    connection.setDoOutput(true);
                    connection.setRequestProperty("Content-Type", "application/json; charset=utf-8");
                    try (OutputStream output = connection.getOutputStream()) {
                        output.write(body.toString().getBytes(StandardCharsets.UTF_8));
                    }
                }

                int status = connection.getResponseCode();
                InputStream stream = status >= 200 && status < 300
                    ? connection.getInputStream()
                    : connection.getErrorStream();
                String responseBody = readBody(stream);
                if (status < 200 || status >= 300) {
                    JSONObject response = new JSONObject(responseBody);
                    throw new IllegalStateException(
                        response.optString("message", "Erreur API HTTP " + status)
                    );
                }
                callback.onComplete(responseBody, null);
            } catch (Exception error) {
                String message = error.getMessage();
                callback.onComplete(null, message == null ? "Serveur API inaccessible." : message);
            } finally {
                if (connection != null) connection.disconnect();
            }
        });
    }

    private static String readBody(InputStream stream) throws Exception {
        if (stream == null) return "";
        StringBuilder body = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(
            new InputStreamReader(stream, StandardCharsets.UTF_8)
        )) {
            String line;
            while ((line = reader.readLine()) != null) body.append(line);
        }
        return body.toString();
    }
}
