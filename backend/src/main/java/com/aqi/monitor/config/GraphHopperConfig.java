package com.aqi.monitor.config;

import com.graphhopper.GraphHopper;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class GraphHopperConfig {

    @Bean
    public GraphHopper graphHopper() {
        System.out.println("GraphHopper is DISABLED for low-memory free tier deployment.");
        return null;
    }
}
