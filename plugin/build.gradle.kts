plugins {
    java
    id("com.gradleup.shadow") version "9.0.0-beta12"
}

group = "com.mucraft"
version = "1.0.0"

java {
    toolchain {
        languageVersion.set(JavaLanguageVersion.of(21))
    }
}

repositories {
    mavenCentral()
    maven("https://repo.papermc.io/repository/maven-public/")
}

dependencies {
    compileOnly("io.papermc.paper:paper-api:1.21.4-R0.1-SNAPSHOT")
    compileOnly("org.apache.logging.log4j:log4j-core:2.24.3")
    implementation("org.java-websocket:Java-WebSocket:1.6.0")
    implementation("com.google.code.gson:gson:2.12.1")
}

tasks.shadowJar {
    archiveClassifier.set("")
    archiveFileName.set("MuCraftBridge.jar")
    relocate("org.java_websocket", "com.mucraft.libs.websocket")
    relocate("com.google.gson", "com.mucraft.libs.gson")
}

tasks.build {
    dependsOn(tasks.shadowJar)
}

tasks.withType<JavaCompile> {
    options.encoding = "UTF-8"
}
