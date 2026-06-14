# Stage 1: Build the frontend and compile the Spring Boot application
FROM maven:3.9.6-eclipse-temurin-17 AS builder
WORKDIR /app

# Copy the frontend and backend folders
COPY frontend ./frontend
COPY backend ./backend

# Build the application (runs frontend build and packages the spring boot jar)
# We use -DskipTests to avoid running test suites during build
WORKDIR /app/backend
RUN mvn clean package -DskipTests

# Stage 2: Create the production runtime image
FROM eclipse-temurin:17-jre-jammy
WORKDIR /app

# Copy the packaged jar from the builder stage
COPY --from=builder /app/backend/target/aqi-monitor-dashboard-1.0-SNAPSHOT.jar app.jar

# Expose the port the application runs on
EXPOSE 8080

# Configure memory limits and run the application
# Using a small heap size for free-tier compatibility (since GraphHopper is disabled)
ENV JAVA_OPTS="-Xmx300m -Xms128m"
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
