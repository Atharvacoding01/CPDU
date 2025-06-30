#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h> // Make sure this library is installed

// --- REPLACE WITH YOUR WIFI CREDENTIALS ---
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
// -----------------------------------------

// --- REPLACE WITH YOUR VERCEL DEPLOYMENT URL ---
// After deploying to Vercel, replace this with your actual URL
// Example: "https://your-app-name.vercel.app/api/get-events"
// IMPORTANT: Remove the duplicate "https://" - I noticed there was "https://https://" in the previous code
String eventsApiUrl = "https://v0-chargerselection-two.vercel.app/api/get-events";
// -------------------------------------------------

const long pollingInterval = 5000; // Check every 5 seconds
unsigned long previousMillis = 0;

// Keep track of the timestamp of the last event processed by this ESP32
unsigned long lastProcessedEventTimestamp = 0;

// Optional: Add your ESP32's unique identifier if you want to track multiple ESP32s
String esp32Id = "ESP32_001"; // You can change this for each ESP32

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("ESP32 EV Charger Event Receiver");
  Serial.println("================================");
  Serial.print("ESP32 ID: ");
  Serial.println(esp32Id);
  Serial.print("Polling URL: ");
  Serial.println(eventsApiUrl);
  Serial.println("================================");

  // Connect to WiFi
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
  
  // Test basic internet connectivity
  testInternetConnectivity();
  
  Serial.println("================================");
}

void loop() {
  unsigned long currentMillis = millis();
  if (currentMillis - previousMillis >= pollingInterval) {
    previousMillis = currentMillis;
    fetchEventsFromServer();
  }
  
  // Add a small delay to prevent overwhelming the system
  delay(100);
}

void testInternetConnectivity() {
  Serial.println("Testing internet connectivity...");
  
  HTTPClient http;
  http.begin("http://httpbin.org/get"); // Simple test endpoint
  http.setTimeout(10000);
  
  int httpCode = http.GET();
  if (httpCode > 0) {
    Serial.println("✅ Internet connectivity: OK");
  } else {
    Serial.print("❌ Internet connectivity failed: ");
    Serial.println(http.errorToString(httpCode).c_str());
  }
  http.end();
  
  // Test HTTPS connectivity
  Serial.println("Testing HTTPS connectivity...");
  http.begin("https://httpbin.org/get");
  http.setTimeout(10000);
  
  httpCode = http.GET();
  if (httpCode > 0) {
    Serial.println("✅ HTTPS connectivity: OK");
  } else {
    Serial.print("❌ HTTPS connectivity failed: ");
    Serial.println(http.errorToString(httpCode).c_str());
  }
  http.end();
}

void fetchEventsFromServer() {
  // Check WiFi connection
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected. Attempting to reconnect...");
    WiFi.begin(ssid, password);
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 10) {
      delay(500);
      Serial.print(".");
      attempts++;
    }
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("\nFailed to reconnect to WiFi. Skipping this poll.");
      return;
    }
    Serial.println("\nWiFi reconnected!");
  }

  HTTPClient http;
  
  // First, let's test if we can resolve the domain
  Serial.print("[");
  Serial.print(millis());
  Serial.print("] Testing URL: ");
  Serial.println(eventsApiUrl);
  
  http.begin(eventsApiUrl);
  
  // Add headers for better compatibility
  http.addHeader("User-Agent", "ESP32-EV-Charger/1.0");
  http.addHeader("Accept", "application/json");
  http.addHeader("Cache-Control", "no-cache");
  http.addHeader("Connection", "close");
  
  // Set timeout
  http.setTimeout(15000); // 15 seconds timeout
  
  Serial.println("Sending GET request...");
  
  int httpCode = http.GET();

  if (httpCode > 0) {
    Serial.print("✅ HTTP Response Code: ");
    Serial.println(httpCode);
    
    if (httpCode == HTTP_CODE_OK) {
      String payload = http.getString();
      Serial.println("📦 Raw JSON payload:");
      Serial.println(payload);
      Serial.println("---");

      // Parse JSON Array
      StaticJsonDocument<3072> doc; // Increased size for safety
      DeserializationError error = deserializeJson(doc, payload);

      if (error) {
        Serial.print("❌ JSON parsing failed: ");
        Serial.println(error.c_str());
        http.end();
        return;
      }

      JsonArray eventsArray = doc.as<JsonArray>();
      if (eventsArray.isNull()) {
        Serial.println("ℹ️  No events array found or array is null.");
        http.end();
        return;
      }
      
      int totalEvents = eventsArray.size();
      Serial.print("📊 Received ");
      Serial.print(totalEvents);
      Serial.println(" events from server.");

      if (totalEvents == 0) {
        Serial.println("ℹ️  No events to process.");
        http.end();
        return;
      }

      int newEventsProcessed = 0;
      
      // Process events in reverse order (oldest first) for chronological processing
      for (int i = eventsArray.size() - 1; i >= 0; i--) {
        JsonObject event = eventsArray[i];

        const char* eventId = event["eventId"];
        const char* chargerId = event["chargerId"];
        const char* command = event["command"];
        unsigned long timestamp = event["timestamp"];

        // Process only if the event is newer than the last one we processed
        if (timestamp > lastProcessedEventTimestamp) {
          newEventsProcessed++;
          
          Serial.println("========================================");
          Serial.println("🔔 PROCESSING NEW EVENT:");
          Serial.print("  📋 Event ID: "); 
          Serial.println(eventId ? eventId : "N/A");
          Serial.print("  🔌 Charger ID: "); 
          Serial.println(chargerId ? chargerId : "N/A");
          Serial.print("  ⚡ Command: "); 
          Serial.println(command ? command : "N/A");
          Serial.print("  🕐 Timestamp: "); 
          Serial.println(timestamp);
          Serial.println("========================================");

          // HERE IS WHERE YOU ADD YOUR CHARGER CONTROL LOGIC
          if (chargerId && command) {
            processChargerCommand(chargerId, command);
          }
          
          // Update the timestamp of the last processed event
          lastProcessedEventTimestamp = timestamp;
        }
      }
      
      if (newEventsProcessed == 0) {
        Serial.println("ℹ️  No new events to process (all events already seen).");
      } else {
        Serial.print("✅ Processed ");
        Serial.print(newEventsProcessed);
        Serial.println(" new events.");
      }

    } else if (httpCode == HTTP_CODE_NOT_FOUND) {
      Serial.println("❌ API endpoint not found (404). Check your Vercel URL and API route.");
    } else if (httpCode == HTTP_CODE_FORBIDDEN) {
      Serial.println("❌ Access forbidden (403). Check if your API allows external access.");
    } else if (httpCode == HTTP_CODE_INTERNAL_SERVER_ERROR) {
      Serial.println("❌ Server error (500). Check your Vercel deployment logs.");
    } else {
      String errorPayload = http.getString();
      Serial.print("❌ HTTP Error ");
      Serial.print(httpCode);
      Serial.print(": ");
      Serial.println(errorPayload);
    }
  } else {
    Serial.print("❌ Connection failed: ");
    Serial.println(http.errorToString(httpCode).c_str());
    
    // Additional debugging information
    Serial.println("🔍 Debugging information:");
    Serial.print("   WiFi Status: ");
    Serial.println(WiFi.status() == WL_CONNECTED ? "Connected" : "Disconnected");
    Serial.print("   IP Address: ");
    Serial.println(WiFi.localIP());
    Serial.print("   Gateway: ");
    Serial.println(WiFi.gatewayIP());
    Serial.print("   DNS: ");
    Serial.println(WiFi.dnsIP());
    Serial.print("   RSSI: ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
    
    // Try to ping a known server
    Serial.println("🏓 Testing connectivity to Google DNS...");
    HTTPClient testHttp;
    testHttp.begin("http://8.8.8.8");
    testHttp.setTimeout(5000);
    int testCode = testHttp.GET();
    Serial.print("   Google DNS test result: ");
    Serial.println(testCode > 0 ? "Success" : "Failed");
    testHttp.end();
  }
  
  http.end();
}

// Function to process charger commands - CUSTOMIZE THIS FOR YOUR HARDWARE
void processChargerCommand(const char* chargerId, const char* command) {
  Serial.println("🎯 EXECUTING CHARGER COMMAND:");
  Serial.print("   Charger: ");
  Serial.println(chargerId);
  Serial.print("   Command: ");
  Serial.println(command);
  
  // Example implementation - replace with your actual hardware control code
  if (strcmp(command, "start") == 0) {
    Serial.println("   ▶️  STARTING CHARGER");
    startCharger(chargerId);
  } else if (strcmp(command, "stop") == 0) {
    Serial.println("   ⏹️  STOPPING CHARGER");
    stopCharger(chargerId);
  } else {
    Serial.println("   ❓ UNKNOWN COMMAND");
  }
}

// Example function to start a charger - IMPLEMENT YOUR HARDWARE CONTROL HERE
void startCharger(const char* chargerId) {
  // Example: Control relay, send signal to charger hardware, etc.
  Serial.print("🟢 Charger ");
  Serial.print(chargerId);
  Serial.println(" started successfully!");
  
  // Example hardware control (replace with your actual implementation):
  // digitalWrite(getChargerPin(chargerId), HIGH);
  // or send command to charger via serial/modbus/etc.
}

// Example function to stop a charger - IMPLEMENT YOUR HARDWARE CONTROL HERE
void stopCharger(const char* chargerId) {
  // Example: Control relay, send signal to charger hardware, etc.
  Serial.print("🔴 Charger ");
  Serial.print(chargerId);
  Serial.println(" stopped successfully!");
  
  // Example hardware control (replace with your actual implementation):
  // digitalWrite(getChargerPin(chargerId), LOW);
  // or send command to charger via serial/modbus/etc.
}
