package com.aqi.monitor.controller;

import com.aqi.monitor.model.CityStation;
import com.aqi.monitor.service.AQIService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/aqi")
@CrossOrigin(origins = "*") // Allow all origins (fixes HTTPS/HTTP mismatch)
public class AQIController {

    @Autowired
    private AQIService service;

    @GetMapping("/global")
    public List<CityStation> getGlobalStations() {
        return service.getAllStations();
    }

    @PostMapping("/refresh")
    public String triggerRefresh() {
        new Thread(() -> service.refreshData()).start();
        return "Refresh triggered in background";
    }

    @GetMapping({ "/current", "/realtime" })
    public ResponseEntity<String> getCurrentAQI(@RequestParam double lat, @RequestParam double lon) {
        return ResponseEntity.ok(service.getRealTimeAQI(lat, lon));
    }

    @GetMapping("/history")
    public ResponseEntity<String> getHistoryAQI(@RequestParam double lat, @RequestParam double lon) {
        return ResponseEntity.ok(service.getHistoricalAQI(lat, lon));
    }

    @PutMapping("/station/update")
    public ResponseEntity<String> updateStationName(@RequestBody UpdateStationRequest request) {
        boolean updated = service.updateStationName(request.getId(), request.getName());
        if (updated) {
            return ResponseEntity.ok("Station updated successfully");
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    // DTO for update request
    public static class UpdateStationRequest {
        private Long id;
        private String name;

        public Long getId() {
            return id;
        }

        public void setId(Long id) {
            this.id = id;
        }

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }
    }

    @PostMapping("/station/add")
    public ResponseEntity<CityStation> addStation(@RequestBody CityStation station) {
        return ResponseEntity.ok(service.addStation(station));
    }

    @GetMapping("/search")
    public ResponseEntity<List<CityStation>> searchStations(@RequestParam String query) {
        return ResponseEntity.ok(service.searchStations(query));
    }
}
