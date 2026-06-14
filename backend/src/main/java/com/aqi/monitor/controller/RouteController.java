package com.aqi.monitor.controller;

import com.aqi.monitor.model.RouteRequest;
import com.aqi.monitor.model.RouteResponse;
import com.aqi.monitor.service.RouteService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/routes")
@CrossOrigin(origins = "*")
public class RouteController {

    @Autowired
    private RouteService routeService;

    @PostMapping("/calculate")
    public ResponseEntity<Map<String, RouteResponse>> calculateRoute(@RequestBody RouteRequest request) {
        try {
            Map<String, RouteResponse> routes = routeService.calculateSafeRoutes(request);
            if (routes.isEmpty()) {
                return ResponseEntity.noContent().build();
            }
            return ResponseEntity.ok(routes);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build(); // Simplify error for MVP
        }
    }
}
