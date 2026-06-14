package com.aqi.monitor.config;

import com.graphhopper.GraphHopper;
import com.graphhopper.routing.util.EncodingManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.graphhopper.reader.osm.GraphHopperOSM;

@Configuration
public class GraphHopperConfig {

    @Bean
    public GraphHopper graphHopper() {
        GraphHopper hopper = new GraphHopperOSM();

        // Use the downloaded OSM file explicitly (Delhi PBF)
        // Use the merged NCR file (North + Central Zones)
        String osmFile = "osm/ncr-complete.osm.pbf";

        hopper.setDataReaderFile(osmFile);
        hopper.setGraphHopperLocation("target/routing-graph-cache-ncr-final-v2");

        // 0.13.0 API: Use EncodingManager
        hopper.setEncodingManager(EncodingManager.create("car,foot,bike"));

        // Disable CH to make startup faster (skips pre-calculation)
        hopper.setCHEnable(false);

        // Enable Landmarks (LM) for reasonable query speed without slow startup
        hopper.getLMFactoryDecorator().setEnabled(false);

        // Allow writes to remove lock files if necessary
        hopper.setAllowWrites(true);

        // FORCE CLEANUP: Delete cache directory programmatically to solve lock issues
        try {
            java.io.File cacheDir = new java.io.File("target/routing-graph-cache-ncr-final-v2");
            if (cacheDir.exists()) {
                // deleteDirectory(cacheDir); // relying on manual cleanup or allowWrites
            }
        } catch (Exception e) {
            System.err.println("Failed to delete cache: " + e.getMessage());
        }

        hopper.setStoreOnFlush(true);
        hopper.importOrLoad();

        System.out.println("GraphHopper Loading...");

        return hopper;
    }

    private void deleteDirectory(java.io.File directory) {
        if (directory.isDirectory()) {
            java.io.File[] files = directory.listFiles();
            if (files != null) {
                for (java.io.File file : files) {
                    deleteDirectory(file);
                }
            }
        }
        directory.delete();
    }
}
