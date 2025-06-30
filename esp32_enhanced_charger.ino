#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// --- REPLACE WITH YOUR WIFI CREDENTIALS ---
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
// -----------------------------------------

// --- REPLACE WITH YOUR SERVER URLs ---
String commandApiUrl = "https://your-app.vercel.app/api/set-command";
String responseApiUrl = "https://your-app.vercel.app/api/esp32-response";
// ------------------------------------

// Charger Configuration
String stationName = "EV Station Alpha";
String chargerId = "CH001";
String esp32Id = "ESP32_001";

// Pricing Configuration (sent to website)
float costPerKWh = 8.0;      // ₹8 per kWh
float costPerMinute = 0.5;   // ₹0.5 per minute

// Charger State
bool isCharging = false;
unsigned long chargingStartTime = 0;
unsigned long lastCommandCheck = 0;
String currentCommandId = "";

const long pollingInterval = 5000; // Check every 5 seconds

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("ESP32 Enhanced EV Charger Controller");
  Serial.println("====================================");
  Serial.print("Station: ");
  Serial.println(stationName);
  Serial.print("Charger ID: ");
  Serial.println(chargerId);
  Serial.print("ESP32 ID: ");
  Serial.println(esp32Id);
  Serial.println("====================================");

  // Connect to WiFi
  connectToWiFi();
  
  Serial.println("System ready. Waiting for commands...");
}

void loop() {
  unsigned long currentMillis = millis();
  
  // Check for commands every 5 seconds
  if (currentMillis - lastCommandCheck >= pollingInterval) {
    lastCommandCheck = currentMillis;
    checkForCommands();
  }
  
  delay(100);
}

void connectToWiFi() {
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.println();
  Serial.println("WiFi connected successfully!");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());
  Serial.print("Signal strength (RSSI): ");
  Serial.print(WiFi.RSSI());
  Serial.println(" dBm");
}

void checkForCommands() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected. Reconnecting...");
    connectToWiFi();
    return;
  }

  HTTPClient http;
  String url = commandApiUrl + "?chargerId=" + chargerId;
  
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(10000);
  
  int httpCode = http.GET();
  
  if (httpCode == HTTP_CODE_OK) {
    String payload = http.getString();
    
    StaticJsonDocument<1024> doc;
    DeserializationError error = deserializeJson(doc, payload);
    
    if (!error) {
      String commandId = doc["commandId"];
      String receivedChargerId = doc["chargerId"];
      String receivedStationName = doc["stationName"];
      String command = doc["command"];
      
      if (receivedChargerId == chargerId && commandId != currentCommandId) {
        currentCommandId = commandId;
        
        Serial.println("========================================");
        Serial.println("🔔 NEW COMMAND RECEIVED:");
        Serial.print("  📋 Command ID: ");
        Serial.println(commandId);
        Serial.print("  🏢 Station: ");
        Serial.println(receivedStationName);
        Serial.print("  🔌 Charger: ");
        Serial.println(receivedChargerId);
        Serial.print("  ⚡ Command: ");
        Serial.println(command);
        Serial.println("========================================");
        
        processCommand(command, commandId);
      }
    } else {
      Serial.print("JSON parsing failed: ");
      Serial.println(error.c_str());
    }
  } else if (httpCode != HTTP_CODE_NOT_FOUND) {
    Serial.print("HTTP Error: ");
    Serial.println(httpCode);
  }
  
  http.end();
}

void processCommand(String command, String commandId) {
  if (command == "start") {
    startCharging(commandId);
  } else if (command == "stop") {
    stopCharging(commandId);
  } else if (command == "status") {
    sendStatus(commandId);
  } else {
    Serial.println("❓ Unknown command: " + command);
  }
}

void startCharging(String commandId) {
  if (isCharging) {
    Serial.println("⚠️  Charger already running!");
    sendResponse(commandId, "already_charging", 0);
    return;
  }
  
  Serial.println("▶️  STARTING CHARGER");
  isCharging = true;
  chargingStartTime = millis();
  
  // Send immediate response to website
  sendResponse(commandId, "starting", 0);
  
  Serial.println("🟢 Charger started successfully!");
}

void stopCharging(String commandId) {
  if (!isCharging) {
    Serial.println("⚠️  Charger not running!");
    sendResponse(commandId, "already_stopped", 0);
    return;
  }
  
  Serial.println("⏹️  STOPPING CHARGER");
  
  // Calculate charging duration
  unsigned long chargingDuration = (millis() - chargingStartTime) / 1000; // in seconds
  
  isCharging = false;
  
  // Send response with duration and cost information
  sendResponse(commandId, "stopped", chargingDuration);
  
  Serial.print("🔴 Charger stopped. Duration: ");
  Serial.print(chargingDuration);
  Serial.println(" seconds");
}

void sendStatus(String commandId) {
  String status = isCharging ? "charging" : "idle";
  unsigned long duration = isCharging ? (millis() - chargingStartTime) / 1000 : 0;
  
  sendResponse(commandId, status, duration);
  
  Serial.print("📊 Status sent: ");
  Serial.println(status);
}

void sendResponse(String commandId, String status, unsigned long duration) {
  HTTPClient http;
  http.begin(responseApiUrl);
  http.addHeader("Content-Type", "application/json");
  
  // Calculate costs
  float totalCost = 0;
  if (duration > 0) {
    float durationMinutes = duration / 60.0;
    totalCost = (durationMinutes * costPerMinute); // Simple time-based pricing
    // You can also add energy-based pricing if you have power measurement
  }
  
  // Create JSON response
  StaticJsonDocument<512> doc;
  doc["chargerId"] = chargerId;
  doc["stationName"] = stationName;
  doc["status"] = status;
  doc["commandId"] = commandId;
  
  if (duration > 0) {
    doc["duration"] = duration;
    doc["totalCost"] = totalCost;
  }
  
  // Always send pricing information
  doc["costPerUnit"] = costPerKWh;
  doc["costPerMinute"] = costPerMinute;
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  Serial.println("📤 Sending response to server:");
  Serial.println(jsonString);
  
  int httpCode = http.POST(jsonString);
  
  if (httpCode == HTTP_CODE_OK) {
    String response = http.getString();
    Serial.println("✅ Response sent successfully");
    Serial.println("Server response: " + response);
  } else {
    Serial.print("❌ Failed to send response. HTTP Code: ");
    Serial.println(httpCode);
    String errorResponse = http.getString();
    Serial.println("Error: " + errorResponse);
  }
  
  http.end();
}
