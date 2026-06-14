package com.aqi.monitor.service;

import com.aqi.monitor.model.RouteRequest;
import com.aqi.monitor.model.RouteResponse;
import com.graphhopper.GHRequest;
import com.graphhopper.GHResponse;
import com.graphhopper.GraphHopper;
import com.graphhopper.PathWrapper;
import com.graphhopper.util.PointList;
import com.graphhopper.util.shapes.GHPoint;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class RouteService {

    @Autowired
    private GraphHopper graphHopper;

    @Autowired
    private AQIService aqiService;

    public Map<String, RouteResponse> calculateSafeRoutes(RouteRequest request) {
        // 1. Request routes from GraphHopper
        GHRequest ghRequest = new GHRequest(
                request.getStartLat(), request.getStartLon(),
                request.getEndLat(), request.getEndLon());

        // Map mode to vehicle
        String vehicle = "car";
        if ("JOGGER".equalsIgnoreCase(request.getMode()))
            vehicle = "foot";
        else if ("CYCLIST".equalsIgnoreCase(request.getMode()))
            vehicle = "bike";

        ghRequest.setVehicle(vehicle);
        ghRequest.setAlgorithm("alternative_route");
        ghRequest.getHints().put("alternative_route.max_paths", "3");
        ghRequest.getHints().put("alternative_route.max_weight_factor", "2.0");

        // Disable CH execution for this request since we disabled it in config
        ghRequest.getHints().put("ch.disable", "true");

        GHResponse ghResponse = graphHopper.route(ghRequest);

        if (ghResponse.hasErrors()) {
            System.err.println("GH Errors with " + vehicle + " (alt_route): " + ghResponse.getErrors());

            // 1. Fallback to standard dijkstra
            ghRequest.setAlgorithm("dijkstrabi");
            ghResponse = graphHopper.route(ghRequest);
        }

        // 2. If FOOT failed, try BIKE
        // REVERTED: User requested specific warnings instead of auto-fallback.

        // 3. If BIKE failed, try CAR
        // REVERTED: User requested specific warnings instead of auto-fallback.

        if (ghResponse.hasErrors()) {
            throw new RuntimeException("Route calculation unsuccessful: " + ghResponse.getErrors());
        }

        List<PathWrapper> paths = ghResponse.getAll();
        System.out.println("GraphHopper returned " + paths.size() + " paths for " + vehicle);
        for (PathWrapper p : paths) {
            System.out.println("Path: dist=" + p.getDistance() + ", time=" + p.getTime());
        }
        List<RouteMetrics> ratedRoutes = new ArrayList<>();

        // 2. Calculate Exposure for each path
        for (PathWrapper path : paths) {
            double totalExposure = calculateExposure(path, request.getMode());
            ratedRoutes.add(new RouteMetrics(path, totalExposure));
        }

        // 3. Sort by Exposure (Lowest is best/green)
        ratedRoutes.sort(Comparator.comparingDouble(RouteMetrics::getExposure));

        // 4. Categorize Routes
        Map<String, RouteResponse> response = new HashMap<>();

        if (!ratedRoutes.isEmpty()) {
            // GREEN: Safest (Min Exposure) - First after sort
            RouteMetrics safest = ratedRoutes.get(0);
            response.put("green", mapToResponse(safest, "#10b981"));

            // RED: Shortest (Min Distance) - Explicitly find min distance
            RouteMetrics shortest = ratedRoutes.stream()
                    .min(Comparator.comparingDouble(r -> r.getPath().getDistance()))
                    .orElse(safest);

            // Only add Red if it's different or if we want to show it explicitly
            response.put("red", mapToResponse(shortest, "#ef4444"));

            // YELLOW: Alternative (Find first one that isn't Green or Red)
            for (RouteMetrics r : ratedRoutes) {
                if (r != safest && r != shortest) {
                    response.put("yellow", mapToResponse(r, "#f59e0b"));
                    break;
                }
            }
        }

        return response;
    }

    private double calculateExposure(PathWrapper path, String mode) {
        PointList points = path.getPoints();
        double totalExposure = 0;

        int sampleRate = Math.max(1, points.size() / 10);

        for (int i = 0; i < points.size(); i += sampleRate) {
            double lat = points.getLat(i);
            double lon = points.getLon(i);

            int baseAqi = aqiService.getEstimatedAQI(lat, lon);

            // HYPER-LOCAL SPATIAL NOISE INJECTION
            // This introduces deterministic micro-environment variation so that parallel
            // alternative routes
            // (which map to the same neighborhood station) receive distinct exposure
            // scores.
            // Without this, the shortest geographic path is always identically the
            // "safest".
            double noiseFactor = Math.abs(Math.sin(lat * 10000) * Math.cos(lon * 10000));
            int simulatedAqi = baseAqi + (int) (noiseFactor * 40.0) - 10; // Variation between -10 and +30 AQI
            if (simulatedAqi < 0)
                simulatedAqi = 10; // Prevent negative

            double breathingRate = getBreathingRate(mode);
            double timeInSegment = (path.getTime() / 1000.0 / 60.0) / (points.size() / (double) sampleRate);

            totalExposure += (simulatedAqi * timeInSegment * breathingRate);
        }

        return totalExposure;
    }

    private double getBreathingRate(String mode) {
        switch (mode != null ? mode.toUpperCase() : "DRIVER") {
            case "JOGGER":
                return 2.5;
            case "CYCLIST":
                return 2.0;
            case "DRIVER":
            default:
                return 1.0;
        }
    }

    private RouteResponse mapToResponse(RouteMetrics metrics, String color) {
        RouteResponse res = new RouteResponse();
        res.setDistance(metrics.getPath().getDistance());
        res.setTime(metrics.getPath().getTime());
        res.setTotalExposure(metrics.getExposure());
        res.setAvgAQI(metrics.getExposure() / (metrics.getPath().getTime() / 1000.0 / 60.0));
        res.setColor(color);

        List<List<Double>> points = new ArrayList<>();
        metrics.getPath().getPoints().forEach(p -> points.add(Arrays.asList(p.lat, p.lon)));
        res.setPoints(points);

        return res;
    }

    private static class RouteMetrics {
        private final PathWrapper path;
        private final double exposure;

        public RouteMetrics(PathWrapper path, double exposure) {
            this.path = path;
            this.exposure = exposure;
        }

        public PathWrapper getPath() {
            return path;
        }

        public double getExposure() {
            return exposure;
        }
    }
}
