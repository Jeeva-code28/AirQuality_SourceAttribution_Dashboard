package com.aqi.monitor.repository;

import com.aqi.monitor.model.CityStation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface CityStationRepository extends JpaRepository<CityStation, Long> {
    boolean existsByName(String name);

    CityStation findByName(String name);

    List<CityStation> findByNameContainingIgnoreCase(String name);
}
