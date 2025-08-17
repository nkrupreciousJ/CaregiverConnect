# CaregiverConnect

A blockchain-powered platform to connect caregivers with families, ensuring transparent, secure, and fair coordination of caregiving services, with payments and agreements managed on-chain.

---

## Overview

CaregiverConnect leverages blockchain technology to create a decentralized marketplace for caregiving services, addressing issues like trust, payment disputes, and scheduling inefficiencies. The platform uses 5 smart contracts to facilitate secure agreements, payments, reputation tracking, and dispute resolution for caregivers and families.

1. **CaregiverProfile Contract** – Manages caregiver profiles, qualifications, and reputation scores.
2. **ServiceAgreement Contract** – Handles service contracts between families and caregivers.
3. **PaymentEscrow Contract** – Secures payments and releases funds upon service completion.
4. **ReputationSystem Contract** – Tracks and updates caregiver and family ratings.
5. **DisputeResolution Contract** – Facilitates fair resolution of disputes with voting by trusted mediators.

---

## Features

- **Verified Caregiver Profiles**: Transparent qualifications, certifications, and reputation scores.
- **Smart Service Agreements**: Automated, tamper-proof contracts for caregiving tasks and schedules.
- **Secure Payments**: Escrow-based payments released only upon verified service completion.
- **Reputation System**: Transparent ratings for caregivers and families based on completed services.
- **Dispute Resolution**: Decentralized mediation process for resolving conflicts fairly.

---

## Smart Contracts

### CaregiverProfile Contract
- Stores caregiver details (certifications, experience, availability).
- Updates reputation scores based on completed services.
- Allows caregivers to update profiles with verified credentials.

### ServiceAgreement Contract
- Creates service agreements with terms (hours, tasks, rates).
- Tracks service completion status.
- Enforces agreement terms via smart contract logic.

### PaymentEscrow Contract
- Holds payments in escrow until service is verified.
- Releases funds to caregivers upon completion.
- Refunds families if services are not delivered.

### ReputationSystem Contract
- Records ratings from families and caregivers post-service.
- Calculates weighted reputation scores.
- Prevents fake reviews through verified service history.

### DisputeResolution Contract
- Initiates dispute process if terms are contested.
- Allows trusted mediators to vote on outcomes.
- Executes refunds or payments based on resolution.

---

## Installation

1. Install [Clarinet CLI](https://docs.hiro.so/clarinet/getting-started).
2. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/caregiverconnect.git
   ```
3. Run tests:
   ```bash
   npm test
   ```
4. Deploy contracts:
   ```bash
   clarinet deploy
   ```

## Usage

Each smart contract is designed to work independently while integrating seamlessly to provide a complete caregiving marketplace. Refer to individual contract documentation for detailed function calls, parameters, and usage examples.

## License

MIT License