package com.aqi.monitor.model;

import java.util.List;

public class RouteResponse {
    private List<List<Double>> points; // [[lat, lon], ...]
    private double distance; // meters
    private double time; // minutes
    private double totalExposure; // AQI * Time
    private double avgAQI;
    private String color; // "#00ff00", "#ffff00", "#ff0000"

    public List<List<Double>> getPoints() {
        return points;
    }

    public void setPoints(List<List<Double>> points) {
        this.points = points;
    }

    public double getDistance() {
        return distance;
    }

    public void setDistance(double distance) {
        this.distance = distance;
    }

    public double getTime() {
        return time;
    }

    public void setTime(double time) {
        this.time = time;
    }

    public double getTotalExposure() {
        return totalExposure;
    }

    public void setTotalExposure(double totalExposure) {
        this.totalExposure = totalExposure;
    }

    public double getAvgAQI() {
        return avgAQI;
    }

    public void setAvgAQI(double avgAQI) {
        this.avgAQI = avgAQI;
    }

    public String getColor() {
        return color;
    }

    public void setColor(String color) {
        this.color = color;
    }
}
