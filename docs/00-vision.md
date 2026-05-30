# ids-app Vision

## What is ids-app?

A modern IDS (Intrusion Detection System) platform designed for OT/IT environments. It provides real-time network monitoring, asset inventory, threat detection, and analytics — initially in a controlled lab/simulation mode.

## Current Status

**Development Scaffold — Phase 1**

The platform is under active construction. Currently:
- No real network traffic is captured.
- No production data is processed.
- All events are simulated.
- The system runs locally for development.

## Future Direction

- Integration with real sensors (Suricata, Zeek).
- SPAN/mirror port traffic capture.
- UniFi/syslog integration for OT asset discovery.
- Deployment to a dedicated staging server (192.168.1.40).
- Separation between central platform and edge sensors.

## Non-Goals (for now)

- Production IDS deployment.
- Real network blocking or prevention (IPS).
- Cloud/SaaS offering.
- Kubernetes orchestration.
