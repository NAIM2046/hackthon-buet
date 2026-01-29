#  Valerix Logistics - Resilient Microservices System



A distributed order processing system designed to survive network failures and high latency. This project demonstrates **Microservices Architecture, Fault Tolerance, Idempotency, and Observability** under chaos engineering conditions.

### 🔗 Live Demo Links
- ** Frontend Dashboard:** [https://valerix-dashboard.onrender.com]
- ** Order Service API:** `https://valerix-order.onrender.com/health`
    ** inventory service : `https://valerix-inventory.onrender.com/health`

---

## 🛠 System Architecture

The system is decoupled into two autonomous services to handle high concurrency and potential failures.

```mermaid
graph TD
    %% Client Side
    User([User / Dashboard])
    
    %% Cloud Environment
    subgraph Render_Cloud [Render Cloud Platform]
        style Render_Cloud fill:#f9f9f9,stroke:#333,stroke-width:2px
        
        %% Order Microservice
        subgraph Order_Domain [Order Domain]
            style Order_Domain fill:#e1f5fe,stroke:#0277bd
            OS[Order Service]
            ODB[(Order DB)]
            OS --- ODB
        end

        %% Inventory Microservice
        subgraph Inventory_Domain [Inventory Domain]
            style Inventory_Domain fill:#e8f5e9,stroke:#2e7d32
            IS[Inventory Service]
            IDB[(Inventory DB)]
            IS --- IDB
        end
    end

    %% Connections
    User -->|1. POST create-order| OS
    OS -->|2. Check Stock| IS
    IS -.->|3. Gremlin Delay| OS
    IS -->|4. Update Stock| IDB
    
    %% Styling for nodes
    classDef service fill:#fff,stroke:#333,stroke-width:2px;
    classDef db fill:#eee,stroke:#333,stroke-width:2px,stroke-dasharray: 5 5;
    class OS,IS service;
    class ODB,IDB db;


    1. The Monolith Problem (Phase 1)
 Problem: Initially, Order and Inventory logic were tightly coupled. If one failed, the entire system crashed. Scaling them independently was impossible.

 Solution: I decomposed the system into two separate Microservices (order-service & inventory-service). They communicate via REST APIs and use isolated database schemas, ensuring loose coupling.

2. The "Gremlin" Latency (Phase 2 - Resilience)
 Problem: The Inventory Service has a "Chaos Module" (The Gremlin) that randomly introduces delays (0-5 seconds). A standard synchronous call would cause the Order Service to hang or freeze, creating a bad user experience.

 Solution: Implemented a Strict Timeout Mechanism.

If Inventory takes >10 seconds (configurable), the Order Service aborts the request and returns a graceful error message instead of hanging indefinitely.

This ensures the Order Service remains responsive even when downstream services are slow.

3. Data Consistency & Duplication (Phase 5)
 Problem: In a distributed system, network retries or impatient users clicking "Buy" multiple times can lead to duplicate orders (Double Billing).

 Solution: Implemented Idempotency Keys.

Every request carries a unique orderId.

Before processing, the system checks the database. If the ID exists, it returns the existing result immediately without re-processing the order.

4. Observability & Blind Spots (Phase 4 & 6)
  Problem: It is hard to know if the system is healthy just by looking at logs. We needed a way to visualize latency spikes.

 Solution: Built a Real-time Health Dashboard.

Green Light: System is healthy (Latency < 1s).

Red Light: System is struggling (Latency > 1s).

This provides instant visual feedback on system performance for the judges.

 Bonus: Backup Strategy (Phase 8)
The Constraint: "The backup service allows only ONE API call per day."

My Proposed Solution: PostgreSQL WAL Archiving

Instead of relying on frequent full backups (which violate the 1-call limit), I propose a hybrid approach:

Base Backup (The 1 Call):

Execute one full database snapshot daily at off-peak hours (e.g., 3:00 AM). This uses our single allowed API call.

Continuous Archiving (Zero API Calls):

Enable Write-Ahead Logging (WAL) in PostgreSQL.

Configure the database to auto-upload small WAL files to an S3 bucket immediately after every transaction.

Why this works: This is a file upload process via the OS/Database process, not an API call to the backup service. It bypasses the limitation while ensuring Real-time Data Safety.