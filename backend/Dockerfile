FROM eclipse-temurin:21-jdk-alpine as builder
WORKDIR /app
COPY pom.xml .
COPY src ./src
# Build package without tests for fast deployment
RUN apk add --no-cache maven && mvn clean package -DskipTests

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=builder /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
