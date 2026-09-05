package com.bunk.management.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class SpaForwardController {

    /**
     * Forward SPA routes to index.html so React client-side router handles navigation seamlessly
     */
    @GetMapping(value = {
        "/",
        "/dashboard",
        "/cashier",
        "/closing",
        "/customer",
        "/staff",
        "/history",
        "/settings",
        "/login"
    })
    public String forwardToSpa() {
        return "forward:/index.html";
    }
}
