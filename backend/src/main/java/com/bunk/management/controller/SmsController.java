package com.bunk.management.controller;

import com.bunk.management.service.SmsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/sms")
@CrossOrigin(origins = "*")
public class SmsController {

    @Autowired
    private SmsService smsService;

    @PostMapping("/send-otp")
    public ResponseEntity<?> sendOtp(@RequestBody Map<String, String> request) {
        String phone = request.getOrDefault("mobile", request.getOrDefault("phone", "9159054084"));
        String otp = request.getOrDefault("otp", "123456");

        Map<String, Object> result = smsService.sendOtpSms(phone, otp);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/credit-alert")
    public ResponseEntity<?> sendCreditAlert(@RequestBody Map<String, Object> request) {
        String customerPhone = (String) request.getOrDefault("customerPhone", "9159054084");
        String customerName = (String) request.getOrDefault("customerName", "Customer");
        String product = (String) request.getOrDefault("product", "DIESEL");
        double liters = request.get("liters") != null ? Double.parseDouble(request.get("liters").toString()) : 0.0;
        double amount = request.get("amount") != null ? Double.parseDouble(request.get("amount").toString()) : 0.0;
        String vehicleNo = (String) request.getOrDefault("vehicleNo", "N/A");
        double newBalance = request.get("newBalance") != null ? Double.parseDouble(request.get("newBalance").toString()) : 0.0;
        String cashierName = (String) request.getOrDefault("cashierName", "Attendant");

        Map<String, Object> result = smsService.sendCreditPurchaseAlert(
                customerPhone, customerName, product, liters, amount, vehicleNo, newBalance, cashierName
        );
        return ResponseEntity.ok(result);
    }

    @PostMapping("/payment-alert")
    public ResponseEntity<?> sendPaymentAlert(@RequestBody Map<String, Object> request) {
        String customerPhone = (String) request.getOrDefault("customerPhone", "9159054084");
        String customerName = (String) request.getOrDefault("customerName", "Customer");
        double amount = request.get("amount") != null ? Double.parseDouble(request.get("amount").toString()) : 0.0;
        String paymentMethod = (String) request.getOrDefault("paymentMethod", "CASH");
        double newBalance = request.get("newBalance") != null ? Double.parseDouble(request.get("newBalance").toString()) : 0.0;
        String cashierName = (String) request.getOrDefault("cashierName", "Admin");

        Map<String, Object> result = smsService.sendPaymentReceivedAlert(
                customerPhone, customerName, amount, paymentMethod, newBalance, cashierName
        );
        return ResponseEntity.ok(result);
    }

    @PostMapping("/payment-request")
    public ResponseEntity<?> sendPaymentRequestAlert(@RequestBody Map<String, Object> request) {
        String customerPhone = (String) request.getOrDefault("customerPhone", "9159054084");
        String customerName = (String) request.getOrDefault("customerName", "Customer");
        double amount = request.get("amount") != null ? Double.parseDouble(request.get("amount").toString()) : 0.0;
        String customMessage = (String) request.getOrDefault("message", "Please clear pending balance");

        Map<String, Object> result = smsService.sendPaymentReminderRequest(
                customerPhone, customerName, amount, customMessage
        );
        return ResponseEntity.ok(result);
    }
}
