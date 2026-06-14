package com.aqi.monitor.service;

import com.aqi.monitor.model.CityStation;
import com.aqi.monitor.repository.CityStationRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.util.List;

@Component
public class DataSeeder implements CommandLineRunner {

    @Autowired
    private CityStationRepository repository;

    @Override
    public void run(String... args) throws Exception {
        if (repository.count() < 100) { // Only seed if DB is mostly empty (e.g. initial run)
            System.out.println("📉 Database seems empty or has few cities. Seeding from cities.json...");
            try {
                ObjectMapper mapper = new ObjectMapper();
                InputStream inputStream = new ClassPathResource("cities.json").getInputStream();
                List<CityStation> stations = mapper.readValue(inputStream, new TypeReference<List<CityStation>>() {
                });

                System.out.println("🌍 Defaulting 3000+ cities... This might take a few seconds.");

                // Save all at once (BATCH INSERT would be better in prod, but saveAll is fine
                // for 3k)
                repository.saveAll(stations);

                System.out.println("✅ Database successfully populated with " + stations.size() + " cities!");
            } catch (Exception e) {
                System.err.println("❌ Failed to seed database: " + e.getMessage());
                e.printStackTrace();
            }
        } else {
            System.out.println("✅ Database already populated (" + repository.count() + " stations). Skipping seed.");
        }
    }
}
