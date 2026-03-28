# A.T.L.A.S. - Algorithmic Triage & Life Assessment System

[![Next.js](https://img.shields.io/badge/Next.js-14-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Realtime-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![C++](https://img.shields.io/badge/C++-Embedded-00599C?style=for-the-badge&logo=cplusplus&logoColor=white)](https://isocpp.org/)
[![ESP32](https://img.shields.io/badge/ESP32-Hardware-E7352C?style=for-the-badge&logo=espressif&logoColor=white)](https://www.espressif.com/)
[![License](https://img.shields.io/badge/License-Proprietary-yellow.svg?style=for-the-badge)](#)

---

## Why A.T.L.A.S.?
Standard "First-Come, First-Served" (FCFS) emergency room queueing is fundamentally flawed in high-stakes medical environments. As engineering students spanning software, data science, and system architecture, we wanted to solve this by bridging mathematical modeling with real-world technical infrastructure.

A.T.L.A.S. replaces static waitlists with a **Dynamic Priority Engine**. By evaluating multiple weighted patient variables (Acuity, Wait Time, Vulnerability, Resource Consumption, Contagion Risk, Behavioral Risk, and Deterioration Rate), the system continuously re-ranks patients in real-time. We engineered this algorithm into a full-stack web platform for large hospitals and an offline ESP32 hardware terminal for localized triage.

### Key Features
- **Mathematical Triage Engine** - A deterministic algorithm balancing exponential clinical severity with logarithmic wait-time curves to prevent queue starvation.
- **M.A.C.H. Terminal (Hardware)** - A standalone physical calculator powered by an **ESP32**, membrane keypad, and 16x2 LCD for zero-latency, offline score computation at the triage desk.
- **Real-Time Web Platform** - A **Next.js** and **Supabase** web application featuring live WebSocket broadcasts to instantly re-sort hospital waitlists globally without page reloads.
- **Hybrid Recalculation Architecture** - Utilizes both event-triggered database updates (via nurse input) and background cron jobs to organically decay wait-time values.
- **Patent-Pending Methodology** - The core scoring algorithm and its physical hardware implementation are currently undergoing formal intellectual property registration.

---

### System Interaction
| Component | Action | Experience |
|---------|--------|------------|
| **Physical Calculator** | Input 0-10 variables via keypad | Embedded C++ processes the matrix and pushes instant rank/score to the LCD |
| **Web Dashboard** | Nurse adjusts patient sliders | The Next.js client pushes to Supabase; WebSockets broadcast the new sorted queue |
| **Scoring Engine** | Time passes / Patient waits | Automated background recalculations push stable, long-waiting patients up the ranks |

### Engineering Highlights
- **Embedded Systems**: Pure **C++** firmware running on an ESP32 microcontroller, optimized for low memory footprint and high reliability.
- **Software Architecture**: Built on **Next.js (App Router)** for fast server-side rendering, paired with **PostgreSQL (Supabase)** for row-level security and real-time pub/sub features.
- **Algorithmic Design**: Overcame linear scoring traps by implementing bounded time-normalization and exponential deterioration spikes to ensure critical emergencies always mathematically dominate minor injuries.

---

## Future Enhancements
Ideas for the next version:
- [ ] **EHR Integration** - Connect the web platform to standard Electronic Health Records via HL7/FHIR APIs.
- [ ] **Battery Backup & Custom PCB** - Design a printed circuit board for the ESP32 terminal with Li-Po battery management for power-outage resilience.
- [ ] **Data-Driven Weight Calibration** - Analyze historical ER flow data to automatically suggest optimal weight tuning for different hospital demographics.
- [ ] **RFID Patient Tracking** - Link the algorithm to physical IoT wristbands to track real-time patient movement and resource consumption.

---

## Intellectual Property & Documentation
Due to the novel approach of translating human vitals into dynamic data arrays via specialized hardware and software, the algorithmic method behind A.T.L.A.S. is currently being documented for patent application.

- **Technical Engineering (Web & Hardware):** Yuvraj Chopra
- **Technical Documentation & IP Strategy:** Sanskriti Tibrewal

---

## Acknowledgments
Special recognition to:
- **Our professors at VIT Vellore** for their guidance on data structures, system architecture, and software engineering principles.
- **IIT Madras coursework** for instilling a rigorous mathematical approach to algorithmic design.
- **Healthcare workers** whose insights into ER chaos inspired the need for a deterministic triage system.

---

## About the Team

**Yuvraj Chopra**  
*Lead Engineer (Software & Hardware)*  
B.Tech Computer Science Engineering - VIT Vellore  
B.S. Data Science - IIT Madras  
*Architected the core algorithm, Next.js web platform, and ESP32 C++ firmware.*

**Sanskriti Tibrewal**  
*Technical Documentation & IP Lead*  
M.Tech Software Engineering - VIT Vellore  
*Driving the technical documentation, research architecture, and patent drafting strategy for the algorithmic framework.*

### Connect With Us

[![GitHub](https://img.shields.io/badge/GitHub-chopra--yuvraj-181717?style=for-the-badge&logo=github)](https://github.com/chopra-yuvraj)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-chopra--yuvraj-0A66C2?style=for-the-badge&logo=linkedin)](https://www.linkedin.com/in/chopra-yuvraj)
[![Email](https://img.shields.io/badge/Email-yuvrajchopra19%40gmail.com-EA4335?style=for-the-badge&logo=gmail&logoColor=white)](mailto:yuvrajchopra19@gmail.com)
[![GitHub](https://img.shields.io/badge/GitHub-Sanskritibrewal-181717?style=for-the-badge&logo=github)](https://github.com/Sanskritibrewal)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Sanskritibrewal-0A66C2?style=for-the-badge&logo=linkedin)](https://www.linkedin.com/in/sanskriti-tibrewal-b6838b365/)
[![Email](https://img.shields.io/badge/Email-sanskritibrewal%40gmail.com-EA4335?style=for-the-badge&logo=gmail&logoColor=white)](mailto:sanskritibrewal@gmail.com)
---

<div align="center">

**Engineered with precision by Yuvraj & Sanskriti**

[ **View on GitHub**](https://github.com/chopra-yuvraj/ATLAS)

</div>