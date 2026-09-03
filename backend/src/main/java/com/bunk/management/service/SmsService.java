package com.bunk.management.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

@Service
public class SmsService {

    private static final Logger logger = LoggerFactory.getLogger(SmsService.class);

    @Value("${app.sms.fast2sms-api-key:KfWMvE2Id76x1XAtjTQPsO9kUlriCHoJbc5a8Y4ezpn0NwRyGF9yNlarVRXWGDv6bKgmJ7sfCHhLTdAB}")
    private String fast2SmsApiKey;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    private String cleanIndianPhone(String raw) {
        if (raw == null) return "9159054084";
        String digits = raw.replaceAll("[^0-9]", "");
        if (digits.length() > 10 && digits.startsWith("91")) {
            return digits.substring(digits.length() - 10);
        }
        if (digits.length() >= 10) {
            return digits.substring(digits.length() - 10);
        }
        return digits.isEmpty() ? "9159054084" : digits;
    }

    /**
     * Dispatches real-time 2FA OTP to mobile handset via Fast2SMS Gateway
     */
    public Map<String, Object> sendOtpSms(String rawPhone, String otpCode) {
        String phone = cleanIndianPhone(rawPhone);
        logger.info("🔑 [REAL-TIME 2FA OTP] Calling Fast2SMS Gateway for [{}] to +91 {}", otpCode, phone);

        Map<String, Object> res = new HashMap<>();
        try {
            String apiUrl = "https://www.fast2sms.com/dev/bulkV2?authorization=" + fast2SmsApiKey
                    + "&route=otp&variables_values=" + URLEncoder.encode(otpCode, StandardCharsets.UTF_8)
                    + "&flash=0&numbers=" + phone;

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(apiUrl))
                    .GET()
                    .timeout(Duration.ofSeconds(15))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            logger.info("📡 [Fast2SMS Response: {}] {}", response.statusCode(), response.body());

            res.put("success", response.statusCode() == 200);
            res.put("statusCode", response.statusCode());
            res.put("phone", "+91 " + phone);
            res.put("otp", otpCode);
            res.put("responseBody", response.body());
            res.put("message", "Real-Time 2FA OTP dispatched to +91 " + phone);
        } catch (Exception ex) {
            logger.error("❌ Failed to dispatch SMS via Fast2SMS gateway to +91 {}", phone, ex);
            res.put("success", false);
            res.put("phone", "+91 " + phone);
            res.put("otp", otpCode);
            res.put("error", ex.getMessage());
        }

        return res;
    }

    /**
     * Real-time Credit Purchase Alert SMS
     */
    public Map<String, Object> sendCreditPurchaseAlert(
            String customerPhone,
            String customerName,
            String product,
            double liters,
            double amount,
            String vehicleNo,
            double newBalance,
            String cashierName
    ) {
        String phone = cleanIndianPhone(customerPhone);
        String msg = String.format("Shri Sabthagiri Bunk: Dear %s, Fuel Credit purchase ₹%.2f (%.2f L %s, Veh: %s). Outstanding Balance: ₹%.2f. Cashier: %s",
                customerName, amount, liters, product, vehicleNo, newBalance, cashierName);

        return sendQuickSms(phone, msg);
    }

    /**
     * Real-time Payment Received Alert SMS
     */
    public Map<String, Object> sendPaymentReceivedAlert(
            String customerPhone,
            String customerName,
            double amount,
            String paymentMethod,
            double newBalance,
            String cashierName
    ) {
        String phone = cleanIndianPhone(customerPhone);
        String msg = String.format("Shri Sabthagiri Bunk: Dear %s, payment received ₹%.2f via %s. Remaining Balance: ₹%.2f. Thank you!",
                customerName, amount, paymentMethod, newBalance);

        return sendQuickSms(phone, msg);
    }

    /**
     * Real-time Payment Reminder Request SMS
     */
    public Map<String, Object> sendPaymentReminderRequest(
            String customerPhone,
            String customerName,
            double amount,
            String customMessage
    ) {
        String phone = cleanIndianPhone(customerPhone);
        String msg = String.format("Shri Sabthagiri Bunk: Dear %s, gentle reminder to clear outstanding fuel credit of ₹%.2f. %s",
                customerName, amount, customMessage != null ? customMessage : "Kindly settle at your earliest.");

        return sendQuickSms(phone, msg);
    }

    private Map<String, Object> sendQuickSms(String phone, String messageText) {
        Map<String, Object> res = new HashMap<>();
        try {
            String apiUrl = "https://www.fast2sms.com/dev/bulkV2?authorization=" + fast2SmsApiKey
                    + "&route=q&message=" + URLEncoder.encode(messageText, StandardCharsets.UTF_8)
                    + "&language=english&flash=0&numbers=" + phone;

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(apiUrl))
                    .GET()
                    .timeout(Duration.ofSeconds(15))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            logger.info("📡 [Fast2SMS Quick SMS: {}] {}", response.statusCode(), response.body());

            res.put("success", response.statusCode() == 200);
            res.put("phone", "+91 " + phone);
            res.put("message", "SMS dispatched");
        } catch (Exception ex) {
            logger.error("❌ Failed to send Quick SMS to +91 {}", phone, ex);
            res.put("success", false);
            res.put("error", ex.getMessage());
        }
        return res;
    }
}
