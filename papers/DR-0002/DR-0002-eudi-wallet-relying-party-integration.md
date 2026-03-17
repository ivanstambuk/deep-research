---
title: "EUDI Wallet: Relying Party Integration Flows"
dr_id: DR-0002
status: published
authors:
  - name: Ivan Stambuk
date_created: 2026-03-16
date_updated: 2026-03-17
tags: [eudi-wallet, eidas-2, relying-party, openid4vp, sd-jwt-vc, mdoc, iso-18013-5, haip, dcql, sca, psd2, oid4vci, trust-model, registration, proximity, remote-presentation]
related: []
---

# EUDI Wallet: Relying Party Integration Flows

**DR-0002** · Published · Last updated 2026-03-17 · ~5,700 lines

> Exhaustive investigation of the EU Digital Identity Wallet ecosystem from the Relying Party (RP) perspective. Covers every RP-facing flow at protocol depth: registration with Member State Registrars (CIR 2025/848, TS5/TS6), trust infrastructure (Access Certificates, Registration Certificates, Trusted Lists, WUA verification), remote presentation (same-device and cross-device via OpenID4VP with SD-JWT VC and mdoc), proximity presentation (supervised and unsupervised via ISO/IEC 18013-5), wallet-to-wallet interactions (TS9), SCA for electronic payments (TS12, PSD2 Dynamic Linking), pseudonym-based authentication, combined presentations via DCQL, data deletion requests (TS7), DPA reporting (TS8), and the intermediary model. Includes exact protocol payloads, annotated Mermaid sequence diagrams, and regulatory compliance mapping (eIDAS 2.0, PSD2/PSR, GDPR, DORA, AML/KYC). Applicable to banks, financial institutions, public sector bodies, and any entity integrating with the EUDI Wallet as a Relying Party.

## Table of Contents

- [Context](#context)
- [Scope](#scope)
- [1. Regulatory Foundation: eIDAS 2.0, CIRs, ARF, and Technical Specifications](#1-regulatory-foundation-eidas-20-cirs-arf-and-technical-specifications)
- [2. Ecosystem Roles from RP Perspective](#2-ecosystem-roles-from-rp-perspective)
- [3. RP Registration, Data Model, and Registrar API](#3-rp-registration-data-model-and-registrar-api)
- [4. Trust Infrastructure: Certificates, Attestations, and Trusted Lists](#4-trust-infrastructure-certificates-attestations-and-trusted-lists)
- [5. Credential Formats: SD-JWT VC, mdoc, and Format Selection](#5-credential-formats-sd-jwt-vc-mdoc-and-format-selection)
- [Remote Presentation Flows](#remote-presentation-flows)
  - [6. OpenID4VP and HAIP Protocol Foundations](#6-openid4vp-and-haip-protocol-foundations)
  - [7. Same-Device Remote Presentation](#7-same-device-remote-presentation)
  - [8. Cross-Device Remote Presentation](#8-cross-device-remote-presentation)
  - [9. RP Authentication and Presentation Verification](#9-rp-authentication-and-presentation-verification)
- [10. Cryptographic Verification Pipeline Deep-Dive](#10-cryptographic-verification-pipeline-deep-dive)
- [11. Proximity Presentation Flows: ISO 18013-5, Supervised, and Unsupervised](#11-proximity-presentation-flows-iso-18013-5-supervised-and-unsupervised)
- [12. W2W Presentation Flow (TS9)](#12-w2w-presentation-flow-ts9)
- [13. SCA for Electronic Payments: Lifecycle, Flows, and Dynamic Linking](#13-sca-for-electronic-payments-lifecycle-flows-and-dynamic-linking)
- [14. Pseudonym-Based Authentication and WebAuthn](#14-pseudonym-based-authentication-and-webauthn)
- [15. DCQL and Combined Presentations](#15-dcql-and-combined-presentations)
- [16. RP Obligations: Data Deletion, DPA Reporting, and Disclosure Policy](#16-rp-obligations-data-deletion-dpa-reporting-and-disclosure-policy)
- [17. Intermediary Architecture and Trust Flows](#17-intermediary-architecture-and-trust-flows)
- [18. Regulatory Compliance: eIDAS, PSD2, GDPR, and DORA](#18-regulatory-compliance-eidas-psd2-gdpr-and-dora)
- [19. AML/KYC Onboarding via EUDI Wallet](#19-amlkyc-onboarding-via-eudi-wallet)
- [20. RP Verification Architecture Patterns](#20-rp-verification-architecture-patterns)
- [21. Vendor Evaluation](#21-vendor-evaluation)
- [22. Ecosystem Readiness and Testing](#22-ecosystem-readiness-and-testing)
- [23. Cross-Border Presentation Scenarios](#23-cross-border-presentation-scenarios)
- [24. Security Threat Model for RPs](#24-security-threat-model-for-rps)
- [25. Monitoring, Observability, and Operational Readiness](#25-monitoring-observability-and-operational-readiness)
- [Synthesis and Conclusions](#synthesis-and-conclusions)
  - [26. Findings](#26-findings)
  - [27. Recommendations](#27-recommendations)
  - [28. Open Questions](#28-open-questions)
- [Annexes](#annexes)
  - [Annex A: Exact Response Payloads](#annex-a-exact-response-payloads)
  - [Annex B: Status List Verification Deep-Dive](#annex-b-status-list-verification-deep-dive)
- [29. References](#29-references)

### Reading Guide

> **Note**: This investigation is structured thematically. Choose your entry point based on your role:
>
> | Chapter | Theme | Best For |
> |:--------|:------|:---------|
> | **§1** | Regulatory foundation: eIDAS 2.0, CIRs, ARF, STS | **Compliance officers** mapping legal obligations |
> | **§2** | Ecosystem roles and RP taxonomy | **Business analysts** understanding the RP landscape |
> | **§3** | RP Registration, data model, and Registrar API | **Integration engineers** implementing onboarding |
> | **§4** | Trust infrastructure: certificates, attestations, Trusted Lists | **Security architects** designing trust chains |
> | **§5** | Credential formats: SD-JWT VC, mdoc, and format selection | **Protocol engineers** implementing verification |
> | **§6–§9** | Remote presentation flows (OpenID4VP, HAIP) | **Backend developers** building remote verification |
> | **§11** | Proximity presentation flows (ISO 18013-5) | **Embedded/mobile developers** building face-to-face flows |
> | **§13** | SCA for payments (TS12, PSD2) | **Payment architects** integrating EUDI Wallet SCA |
> | **§14, §15, §16, §17** | Pseudonyms, DCQL, RP obligations, intermediaries | **Product managers** scoping full feature coverage |
> | **§18, §19** | Regulatory compliance (eIDAS, PSD2, GDPR, DORA) + AML/KYC | **Legal/compliance teams** assessing regulatory risk |
> | **§20** | RP verification architecture patterns (policy engine, webhooks, session mgmt) | **Integration architects** designing RP verification pipelines |
> | **§23–§25** | Cross-border, security threats, monitoring | **DevOps/security teams** preparing production deployment |
>
> **Persona-based reading paths:**
>
> | Persona | Start Here | Then Read | Finally |
> |:--------|:-----------|:----------|:--------|
> | **Bank RP Architect** | §26 (Findings) → §27 (Recs) | §3 (Registration) → §4 (Trust) → §6–§9 (Remote) | §13 (SCA/Payments) → §18 (Compliance) → §19 (AML/KYC) |
> | **Public Sector RP** | §1 (Regulatory) → §18 (Compliance) | §2 (Roles) → §7–§8 (Remote Flows) | §14 (Pseudonyms) → §18.3 (GDPR) |
> | **Intermediary/Vendor** | §17 (Intermediary) → §3 (Registration) | §4 (Trust) → §9 (RP Auth) | §16 (RP Obligations) → §26–§28 (Findings) |
> | **Mobile Developer** | §5 (Formats) → §11 (Proximity) | §6–§9 (Remote) → §12 (W2W) | §15 (DCQL) → §9 (Verification) |
> | **Security Engineer** | §24 (Threat Model) → §4 (Trust) | §9 (Verification) → §25 (Monitoring) | §23 (Cross-Border) → §14.12 (Pseudonym Security) |
> | **QA / Test Engineer** | §9 (Verification Checklist) → §25 (Monitoring) | §15 (DCQL queries) → Annex A (Payloads) | §9.6 (Error Handling) → §23 (Cross-Border) |
> | **Data Protection Officer** | §18.3 (GDPR) → §16 (RP Obligations) | §18.4 (DORA) → §3 (Registration Data) | §14 (Pseudonyms) → §19 (AML/KYC) |

### Glossary

<details>
<summary><strong>Expand to view acronyms and abbreviations</strong></summary>

| Acronym | Full Name |
|:--------|:----------|
| **AMLD** | Anti-Money Laundering Directive |
| **ARF** | Architecture Reference Framework (for the EUDI Wallet ecosystem) |
| **CAB** | Conformity Assessment Body |
| **CDD** | Customer Due Diligence |
| **CIR** | Commission Implementing Regulation |
| **COSE** | CBOR Object Signing and Encryption |
| **DCQL** | Digital Credentials Query Language |
| **DORA** | Digital Operational Resilience Act (Regulation (EU) 2022/2554) |
| **DPA** | Data Protection Authority |
| **DPIA** | Data Protection Impact Assessment |
| **EAA** | Electronic Attestation of Attributes |
| **ECDH** | Elliptic Curve Diffie-Hellman |
| **eIDAS** | Electronic Identification, Authentication and Trust Services |
| **EUDI** | European Digital Identity |
| **HAIP** | High Assurance Interoperability Profile |
| **JAR** | JWT-Secured Authorization Request |
| **JWE** | JSON Web Encryption |
| **KB-JWT** | Key Binding JSON Web Token |
| **LoTE** | List of Trusted Entities |
| **mdoc** | Mobile Document (ISO/IEC 18013-5 credential format) |
| **MSO** | Mobile Security Object (in mdoc) |
| **OID4VCI** | OpenID for Verifiable Credential Issuance |
| **OID4VP** | OpenID for Verifiable Presentations |
| **PID** | Person Identification Data |
| **PSD2** | Payment Services Directive 2 (Directive 2015/2366/EU) |
| **PSP** | Payment Service Provider |
| **PSR** | Payment Services Regulation (successor to PSD2) |
| **PuB-EAA** | Public Body Electronic Attestation of Attributes |
| **QEAA** | Qualified Electronic Attestation of Attributes |
| **QTSP** | Qualified Trust Service Provider |
| **SCA** | Strong Customer Authentication |
| **SD-JWT VC** | Selective Disclosure JSON Web Token Verifiable Credential |
| **STS** | Standards and Technical Specifications |
| **W2W** | Wallet-to-Wallet |
| **WIA** | Wallet Instance Attestation |
| **WRPAC** | Wallet-Relying Party Access Certificate |
| **WRPRC** | Wallet-Relying Party Registration Certificate |
| **WRP** | Wallet-Relying Party (the registration data object in TS5/TS6) |
| **WSCA** | Wallet Secure Cryptographic Application |
| **WSCD** | Wallet Secure Cryptographic Device |
| **WUA** | Wallet Unit Attestation |

</details>

---

### RP Integration Architecture Map

```mermaid
---
config:
  flowchart:
    subGraphTitleMargin:
      bottom: 25
    nodeSpacing: 30
    rankSpacing: 45
---
flowchart TD
    subgraph REG["`**Phase 1: Registration (§3)**`"]
        direction LR
        R1["`**RP Application**
        Legal identity, attributes,
        purposes,&nbsp;use&nbsp;cases`"]
        R2["`**Registrar**
        Validate, publish
        to&nbsp;national&nbsp;register`"]
        R3["`**Access CA**
        Issue WRPAC
        (X.509)`"]
        R4["`**Reg Cert Provider**
        Issue WRPRC
        (optional)`"]
        R1 --> R2
        R2 --> R3
        R2 --> R4
    end

    subgraph TRUST["`**Phase 2: Trust Setup (§4)**`"]
        direction LR
        T1["`**LoTE / Trusted Lists**
        Trust anchors for
        PID/QEAA&nbsp;Providers`"]
        T2["`**Status List Endpoints**
        RFC 9598 revocation
        checking`"]
        T3["`**Registrar API**
        Runtime RP data
        lookup&nbsp;by&nbsp;Wallet`"]
        T1 ~~~ T2 ~~~ T3
    end

    subgraph FLOWS["`**Phase 3: Presentation Flows (§6–§13)**`"]
        direction LR
        F1["`**Remote Same-Device**
        DC API + OpenID4VP
        SD-JWT&nbsp;VC`"]
        F2["`**Remote Cross-Device**
        QR + OpenID4VP
        SD-JWT&nbsp;VC`"]
        F3["`**Proximity Supervised**
        NFC/BLE + ISO 18013-5
        mdoc`"]
        F4["`**Proximity Unsupervised**
        NFC/BLE + ISO 18013-5
        mdoc&nbsp;(automated)`"]
        F5["`**W2W (TS9)**
        QR/BLE + ISO 18013-5
        mdoc&nbsp;only`"]
        F6["`**SCA Payment (TS12)**
        OpenID4VP + KB-JWT
        Dynamic&nbsp;linking`"]
        F1 ~~~ F2 ~~~ F3
        F4 ~~~ F5 ~~~ F6
    end

    subgraph OBLIGATIONS["`**Phase 4: RP Obligations (§16/§18/§19)**`"]
        direction LR
        O1["`**Data Deletion (TS7)**
        9 interfaces
        GDPR&nbsp;Art.&nbsp;17`"]
        O2["`**DPA Reporting (TS8)**
        User complaint
        to&nbsp;DPA`"]
        O3["`**Regulatory**
        eIDAS, PSD2, GDPR
        DORA,&nbsp;AML/KYC`"]
        O1 ~~~ O2 ~~~ O3
    end

    REG --> TRUST
    TRUST --> FLOWS
    FLOWS --> OBLIGATIONS

    style REG text-align:left
    style TRUST text-align:left
    style FLOWS text-align:left
    style OBLIGATIONS text-align:left
    style R1 text-align:left
    style R2 text-align:left
    style R3 text-align:left
    style R4 text-align:left
    style T1 text-align:left
    style T2 text-align:left
    style T3 text-align:left
    style F1 text-align:left
    style F2 text-align:left
    style F3 text-align:left
    style F4 text-align:left
    style F5 text-align:left
    style F6 text-align:left
    style O1 text-align:left
    style O2 text-align:left
    style O3 text-align:left
```

---

## Context

The **European Digital Identity Wallet (EUDI Wallet)** is the centrepiece of the revised eIDAS Regulation ([Regulation (EU) 2024/1183](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1183)), commonly known as **eIDAS 2.0**. By December 2026, every EU Member State must provide at least one EUDI Wallet to its citizens. By December 2027, regulated private-sector entities — including banks, payment service providers, telecom operators, healthcare providers, and very large online platforms — **must accept** the EUDI Wallet for user identification, authentication, and (where applicable) Strong Customer Authentication.

This investigation examines the EUDI Wallet ecosystem **exclusively from the Relying Party (RP) perspective** — the entity that requests and verifies credentials presented by Wallet Users. The canonical RP throughout this document is a **bank or financial institution**, as banks face the most complex integration requirements: they must support remote and proximity presentation flows, implement SCA via EUDI Wallet for PSD2 compliance, perform AML/KYC onboarding using wallet-presented credentials, and integrate with the national RP registration infrastructure.

### Why Now?

1. **Regulatory deadline pressure** — The December 2027 mandate for private-sector acceptance is 21 months away. Banks and financial institutions must begin integration planning now to meet the timeline.
2. **Specification maturity** — The critical Technical Specifications (TS5, TS6, TS7, TS8, TS9, TS12) reached v1.0 in 2025. OpenID4VP 1.0 achieved Final status in July 2025. HAIP 1.0 was approved in December 2025. The ARF has been updated through v2.8 (the latest published version as of March 2026), with 27+ CIRs now adopted.
3. **Pilot programme insights** — The EU Large-Scale Pilots (POTENTIAL, EWC, DC4EU, NOBID) have generated real-world implementation experience that informs the flows documented here.
4. **SCA integration** — TS12 (SCA Implementation with Wallet, v1.0 December 2025) defines the complete payment authentication flow using EUDI Wallet, creating an urgent integration requirement for banks under PSD2.
5. **Trust infrastructure deployment** — Member States are establishing Registrars, Access Certificate Authorities, and national registries per CIR 2025/848, creating the operational infrastructure that RPs must integrate with.

---

## Scope

### In Scope

- Complete RP registration flow with Member State Registrar (CIR 2025/848, TS5, TS6)
- Trust infrastructure: Access Certificates (WRPAC), Registration Certificates (WRPRC), Trusted Lists, WUA verification
- Credential format internals: SD-JWT VC (selective disclosure, Key Binding JWT) and mdoc (MSO, namespaces, device binding)
- Remote presentation: same-device and cross-device flows via OpenID4VP (HAIP 1.0, DCQL)
- Proximity presentation: supervised and unsupervised flows via ISO/IEC 18013-5
- Wallet-to-wallet interactions (TS9) — where the RP is another Wallet User acting as Verifier
- SCA for electronic payments: issuer-requested and third-party-requested flows (TS12, PSD2)
- Pseudonym-based authentication (Use Cases A–D, WebAuthn integration)
- Combined presentations via DCQL (multi-attestation requests)
- RP obligations: data deletion (TS7), DPA reporting (TS8), embedded disclosure policy evaluation
- Intermediary model and trust flows
- Regulatory compliance: eIDAS 2.0 obligations, PSD2/PSR SCA bridge, GDPR, AML/KYC, DORA
- W3C Digital Credentials API implications for RP integration

### Out of Scope

- Wallet Provider implementation internals (WSCA/WSCD architecture, key management)
- PID Provider and Attestation Provider issuance internals (covered only where they intersect RP flows)
- Wallet Solution certification by CABs (covered at a high level for RP trust assessment)
- National-level implementation variations (each Member State's specific registration procedures)

---

### 1. Regulatory Foundation: eIDAS 2.0, CIRs, ARF, and Technical Specifications

#### 1.1 eIDAS 2.0 and the EUDI Wallet Regulation

The revised eIDAS Regulation ([Regulation (EU) 2024/1183](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1183)), adopted on 11 April 2024 and entering into force on 20 May 2024, amends the original eIDAS Regulation (EU) No 910/2014 to establish the legal framework for the European Digital Identity Wallet. For Relying Parties, the key articles are:

| Article | Requirement | RP Impact |
|:--------|:------------|:----------|
| **Art. 5a** | Member States shall provide at least one EUDI Wallet by December 2026 | Creates the ecosystem RPs must integrate with |
| **Art. 5b** | RP obligations: registration, data minimisation, transparency, non-discrimination | Core compliance requirements for all RPs |
| **Art. 5b(2)** | RPs shall not request more attributes than necessary for the service | Data minimisation — enforceable obligation |
| **Art. 5b(3)** | RPs shall inform Users of the identity and contact details they can verify | Transparency — RP must expose registration data |
| **Art. 5b(4)** | RPs shall ensure data presented is not shared with third parties without consent | Data protection — restricts downstream sharing |
| **Art. 5b(7)** | Specific private-sector entities shall accept the EUDI Wallet by Dec 2027 | **Mandatory acceptance** for banks, telecom, VLOPs |
| **Art. 5b(9)** | RPs shall not refuse pseudonyms where identification not required by law | Pseudonym acceptance — mandatory |
| **Art. 5b(10)** | Intermediaries deemed RPs; shall not store transaction content data | Intermediary obligations |
| **Art. 5f(2)** | EUDI Wallet shall support Strong User Authentication for electronic payments | SCA integration requirement for PSPs |

#### 1.1.1 Mandatory Acceptance by Private Sector (Art. 5b(7))

Article 5b(7) specifies that the following categories of private-sector entities **must accept** the EUDI Wallet when user identification is required by national or Union law, or by contractual obligation:

- **Transport service providers** (airlines, railways, etc.)
- **Energy sector operators**
- **Financial services** (banks, PSPs, insurers, investment firms) — under PSD2, MiFID II, Solvency II, AMLD
- **Social security institutions**
- **Healthcare providers and institutions**
- **Drinking water supply and waste treatment services**
- **Postal services**
- **Digital infrastructure and services** — including Very Large Online Platforms (Art. 33 DSA)
- **Education and training institutions** — for educational credentials
- **Telecom operators** — under EECC

The acceptance deadline is **21 December 2027** (24 months after adoption of the first implementing act specifying technical specifications under Art. 5a(23), which was adopted in December 2025).

#### 1.1.2 Key Timelines for RPs

```mermaid
gantt
    title eIDAS 2.0 Implementation Timeline for RPs
    dateFormat YYYY-MM-DD
    axisFormat %Y-%m
    
    section Legal & Regulatory
    eIDAS 2.0 enters into force                 :done, 2024-05-20, 1d
    Batch adoption of CIRs                      :done, 2024-11-01, 2025-12-31
    
    section Technical Specs
    OpenID4VP 1.0 Final status                  :done, 2025-07-01, 1d
    TS1–TS14 reach v1.0                         :done, 2025-01-01, 2025-12-31
    HAIP 1.0 Final Specification                :done, 2025-12-01, 1d
    
    section Rollout & Mandates
    MS provide at least 1 EUDI Wallet           :active, 2026-12-21, 1d
    Mandatory private-sector acceptance         :crit, 2027-12-21, 1d
    Full enforcement & supervision              :milestone, 2028-01-01, 0d
```

#### 1.2 Commission Implementing Regulations (CIRs)

The Commission has adopted a comprehensive set of Implementing Regulations that operationalise the eIDAS 2.0 framework. The following CIRs are directly relevant to Relying Parties:

| CIR | Subject | RP Relevance |
|:----|:--------|:-------------|
| [CIR 2024/2977](https://data.europa.eu/eli/reg_impl/2024/2977/oj) | PID and EAA | Defines credential attributes RPs can request |
| [CIR 2024/2979](https://data.europa.eu/eli/reg_impl/2024/2979/oj) | Integrity and core functionalities | Specifies Wallet capabilities RPs can rely on |
| [CIR 2024/2980](https://data.europa.eu/eli/reg_impl/2024/2980/oj) | Ecosystem notifications | Notification infrastructure for trust events |
| [CIR 2024/2981](https://data.europa.eu/eli/reg_impl/2024/2981/oj) | Certification of Wallet Solutions | Basis for RP trust in Wallet Unit authenticity |
| **[CIR 2024/2982](https://data.europa.eu/eli/reg_impl/2024/2982/oj)** | **Protocols and interfaces** | **Core protocol requirements for RP interaction** |
| [CIR 2025/846](https://data.europa.eu/eli/reg_impl/2025/846/oj) | Cross-border identity matching | Relevant for RPs accepting cross-border PIDs |
| **[CIR 2025/848](https://data.europa.eu/eli/reg_impl/2025/848/oj)** | **Registration of Wallet-Relying Parties** | **Primary registration framework for RPs** |
| [CIR 2025/849](https://data.europa.eu/eli/reg_impl/2025/849/oj) | List of certified EUDI Wallets | RPs can verify Wallet Solution certification status |
| [CIR 2025/1566](http://data.europa.eu/eli/reg_impl/2025/1566/oj) | Verification of QC/QEAA holder identity | Relevant for RPs verifying qualified attestations |

**CIR 2024/2982** (Protocols and interfaces) is the most technically significant for RPs. It specifies:

- The use of OpenID4VP for remote presentation requests (Art. 3)
- The use of ISO/IEC 18013-5 for proximity presentation (Art. 4)
- Requirements for RP authentication towards Wallet Units (Art. 5)
- Data deletion request support (Art. 6)
- DPA reporting support (Art. 7)
- Pseudonym support requirements (Art. 14)
- Transaction data support for SCA (implicit in Art. 3, detailed in TS12)

**CIR 2025/848** (Registration of Wallet-Relying Parties) is the operational foundation for RP onboarding. It specifies:

- National register establishment and maintenance (Art. 3)
- Common registration policies (Art. 4)
- Public API for querying RP registration information (Art. 3(5)–(6))
- Access Certificate issuance (Art. 7) — the WRPAC
- Registration Certificate issuance (Art. 8) — the WRPRC (optional per Member State)

#### 1.3 Architecture and Reference Framework (ARF)

The ARF (currently at v2.8+) is the Commission-maintained technical reference document that interprets the Regulation and CIRs into an implementable architecture. While the ARF is **informative** (not legally binding), it provides the de facto technical consensus for the ecosystem.

Key ARF sections relevant to RPs:

| ARF Section | Content |
|:------------|:--------|
| [§3.11](https://github.com/eu-digital-identity-wallet/eudi-doc-architecture-and-reference-framework/blob/main/docs/architecture-and-reference-framework-main.md#311-relying-parties-relying-party-instances-and-intermediaries) | Relying Parties, RP Instances, Intermediaries — role definitions |
| [§3.17](https://github.com/eu-digital-identity-wallet/eudi-doc-architecture-and-reference-framework/blob/main/docs/architecture-and-reference-framework-main.md#317-registrars) | Registrars — registration process |
| [§3.18](https://github.com/eu-digital-identity-wallet/eudi-doc-architecture-and-reference-framework/blob/main/docs/architecture-and-reference-framework-main.md#318-access-certificate-authorities) | Access Certificate Authorities — certificate issuance |
| [§3.19](https://github.com/eu-digital-identity-wallet/eudi-doc-architecture-and-reference-framework/blob/main/docs/architecture-and-reference-framework-main.md#319-providers-of-registration-certificates) | Providers of Registration Certificates — WRPRC issuance |
| [§4.4](https://github.com/eu-digital-identity-wallet/eudi-doc-architecture-and-reference-framework/blob/main/docs/architecture-and-reference-framework-main.md#44-data-presentation-flows) | Data presentation flows — proximity and remote |
| [§5.5](https://github.com/eu-digital-identity-wallet/eudi-doc-architecture-and-reference-framework/blob/main/docs/architecture-and-reference-framework-main.md#55-catalogue-of-attributes-and-catalogue-of-attestation-schemes) | Catalogue of attributes and attestation schemes |
| [§5.6.2](https://github.com/eu-digital-identity-wallet/eudi-doc-architecture-and-reference-framework/blob/main/docs/architecture-and-reference-framework-main.md#562-transactional-data-using-isoiec-18013-5-and-openid4vp) | Transactional data — SCA/dynamic linking |
| [§6.4.2](https://github.com/eu-digital-identity-wallet/eudi-doc-architecture-and-reference-framework/blob/main/docs/architecture-and-reference-framework-main.md#642-relying-party-registration) | RP registration process |
| [§6.6](https://github.com/eu-digital-identity-wallet/eudi-doc-architecture-and-reference-framework/blob/main/docs/architecture-and-reference-framework-main.md#66-trust-throughout-a-pid-or-an-attestation-lifecycle) | Attestation presentation and verification |
| [§6.6.3](https://github.com/eu-digital-identity-wallet/eudi-doc-architecture-and-reference-framework/blob/main/docs/architecture-and-reference-framework-main.md#663-pid-or-attestation-presentation-to-a-relying-party) | RP authentication, disclosure policy, attribute verification |
| [§6.6.5](https://github.com/eu-digital-identity-wallet/eudi-doc-architecture-and-reference-framework/blob/main/docs/architecture-and-reference-framework-main.md#665-pid-or-attestation-presentation-to-an-intermediary) | Presentation to intermediaries |

#### 1.4 Technical Specifications and Standards (STS)

The Technical Specifications are developed by the European Digital Identity Cooperation Group and define the detailed technical requirements for each interface. The following are directly relevant to RP integration:

| STS | Title | Version | RP Relevance |
|:----|:------|:--------|:-------------|
| **[TS5](https://github.com/eu-digital-identity-wallet/eudi-doc-standards-and-technical-specifications/blob/main/docs/technical-specifications/ts5-common-formats-and-api-for-rp-registration-information.md)** | Common formats and API for RP registration information | 1.0 | RP registration data model and REST API |
| **[TS6](https://github.com/eu-digital-identity-wallet/eudi-doc-standards-and-technical-specifications/blob/main/docs/technical-specifications/ts6-common-set-of-rp-information-to-be-registered.md)** | Common set of RP information to be registered | 1.0 | Mandatory and conditional registration attributes |
| **[TS7](https://github.com/eu-digital-identity-wallet/eudi-doc-standards-and-technical-specifications/blob/main/docs/technical-specifications/ts7-common-interface-for-data-deletion-request.md)** | Common interface for data deletion requests | 0.95 | RP must support data deletion requests from Wallet Users |
| **[TS8](https://github.com/eu-digital-identity-wallet/eudi-doc-standards-and-technical-specifications/blob/main/docs/technical-specifications/ts8-common-interface-for-reporting-of-wrp-to-dpa.md)** | Common interface for reporting of WRP to DPA | 0.95 | RP must be prepared for DPA reports from Wallet Users |
| **[TS9](https://github.com/eu-digital-identity-wallet/eudi-doc-standards-and-technical-specifications/blob/main/docs/technical-specifications/ts9-wallet-to-wallet-interactions.md)** | Wallet-to-Wallet interactions | 1.0 | RP when acting as Verifier in W2W mode |
| **[TS12](https://github.com/eu-digital-identity-wallet/eudi-doc-standards-and-technical-specifications/blob/main/docs/technical-specifications/ts12-electronic-payments-SCA-implementation-with-wallet.md)** | SCA implementation with the Wallet | 1.0 | Complete payment SCA flow for bank RPs |
| [TS1](https://github.com/eu-digital-identity-wallet/eudi-doc-standards-and-technical-specifications/blob/main/docs/technical-specifications/ts1-eudi-wallet-trust-mark.md) | EUDI Wallet Trust Mark | — | Visual trust mark for RP-facing UI |
| [TS2](https://github.com/eu-digital-identity-wallet/eudi-doc-standards-and-technical-specifications/blob/main/docs/technical-specifications/ts2-notification-publication-provider-information.md) | Notification Publication Provider Information | — | Notification system for ecosystem events |
| [TS3](https://github.com/eu-digital-identity-wallet/eudi-doc-standards-and-technical-specifications/blob/main/docs/technical-specifications/ts3-wallet-unit-attestation.md) | Wallet Unit Attestations (WUA) | — | WUA format that RP verifies during presentation |
| [TS10](https://github.com/eu-digital-identity-wallet/eudi-doc-standards-and-technical-specifications/blob/main/docs/technical-specifications/ts10-data-portability-and-download-(export).md) | Data Portability and Download (Export) | — | Transaction log format (informative for RP) |
| [TS11](https://github.com/eu-digital-identity-wallet/eudi-doc-standards-and-technical-specifications/blob/main/docs/technical-specifications/ts11-interfaces-and-formats-for-catalogue-of-attributes-and-catalogue-of-schemes.md) | Interfaces for Catalogue of Attributes and Schemes | — | Attestation scheme discovery for RP |

External standards mandated by the ARF and CIRs:

| Standard | Role in RP Integration |
|:---------|:-----------------------|
| **[OpenID4VP 1.0](https://openid.net/specs/openid-4-verifiable-presentations-1_0.html)** | Remote presentation protocol |
| **[HAIP 1.0](https://openid.net/specs/openid-4-verifiable-presentations-1_0.html)** | High-assurance profile for OpenID4VP (mandatory for EUDI ecosystem) |
| **[ISO/IEC 18013-5](https://www.iso.org/standard/69084.html)** | Proximity presentation protocol (mdoc) |
| **[ISO/IEC 18013-7](https://www.iso.org/standard/82772.html)** | Online presentation of mdoc via OpenID4VP |
| **[SD-JWT VC](https://datatracker.ietf.org/doc/draft-ietf-oauth-sd-jwt-vc/)** (IETF) | Credential format with selective disclosure |
| **[DCQL](https://datatracker.ietf.org/doc/draft-ietf-oauth-dcql/)** | Digital Credentials Query Language for presentation requests |
| **[ETSI TS 119 475](https://www.etsi.org/deliver/etsi_ts/119400_119499/119475/)** (draft) | Access Certificate profile for WRPAC |
| **[ETSI TS 119 411-8](https://www.etsi.org/deliver/etsi_ts/119400_119499/11941108/)** (draft) | Registration Certificate profile for WRPRC |
| **[W3C Digital Credentials API](https://wicg.github.io/digital-credentials/)** | Browser-based wallet invocation (under development) |
| **[OAuth 2.0 / OIDC](https://oauth.net/2/)** | Foundation protocols for remote flows |

---

### 2. Ecosystem Roles from RP Perspective

#### 2.1 Relying Party Definition

A **Relying Party (RP)** is a service provider that requests attributes contained within a PID, QEAA, PuB-EAA, or EAA from a Wallet Unit, subject to User approval and within the limits of applicable legislation and rules.

> **Important distinction**: The term "Relying Party" in the ARF refers **exclusively** to service providers requesting attributes — not to Attestation Providers (QEAA Providers, PuB-EAA Providers, EAA Providers), even though the Regulation technically classifies Attestation Providers as Relying Parties too.

An RP may rely on the Wallet Unit for different reasons:

- **Legal requirement** — Art. 5b(7) mandates acceptance by specific sectors
- **Contractual agreement** — business decision to accept EUDI Wallet credentials
- **Own decision** — voluntary adoption for competitive advantage

#### 2.2 RP Instances

An **RP Instance** is a system consisting of software and hardware that the RP uses to interact with Wallet Units. Each RP Instance:

- Maintains an interface with Wallet Units to request PIDs and attestations
- Implements RP authentication using an **Access Certificate** (WRPAC) obtained by the RP
- Operates independently — a single RP can have **multiple RP Instances** (e.g., different branches, different services, different environments)

Each RP Instance requires its own Access Certificate, though the legal subject of all certificates is the RP itself.

#### 2.3 Intermediaries

An **intermediary** is a special class of RP defined in Art. 5b(10):

> *"Intermediaries acting on behalf of relying parties shall be deemed to be relying parties and shall not store data about the content of the transaction."*

An intermediary:

- Offers services to other RPs (called "intermediated RPs") to connect to Wallet Units on their behalf
- Performs **all tasks** assigned to an RP in the ARF on behalf of the intermediated RP
- Is subject to registration requirements as an RP itself
- **Must not store** the content of the transaction data (User attributes)
- Must forward presented attributes to the intermediated RP

```mermaid
---
config:
  flowchart:
    subGraphTitleMargin:
      bottom: 25
    nodeSpacing: 40
    rankSpacing: 60
---
flowchart TD
    subgraph Direct["`**Direct RP Model**`"]
        direction TB
        U1["`**Wallet User**`"] -->|"Presentation"| RP1["`**Relying Party**
        (registered,&nbsp;WRPAC)`"]
    end

    subgraph Intermediated["`**Intermediary Model**`"]
        direction TB
        U2["`**Wallet User**`"] -->|"Presentation"| INT["`**Intermediary**
        (registered&nbsp;as&nbsp;RP,
        WRPAC,&nbsp;no&nbsp;data&nbsp;storage)`"]
        INT -->|"Forward attributes"| RP2["`**Intermediated RP**
        (registered,&nbsp;no&nbsp;WRPAC)`"]
    end
    
    style U1 text-align:left
    style RP1 text-align:left
    style U2 text-align:left
    style INT text-align:left
    style RP2 text-align:left
```

#### 2.4 Supporting Ecosystem Entities

From the RP perspective, the following ecosystem entities are critical:

| Entity | Role for RP |
|:-------|:------------|
| **Registrar** | Registers the RP, records intended attributes and purposes, issues registration data |
| **Access Certificate Authority** | Issues WRPAC(s) — one per RP Instance — enabling Wallet authentication |
| **Provider of Registration Certificates** | Issues WRPRC (optional per MS) — embeds registration data in a certificate |
| **Trusted List / LoTE Provider** | Publishes trust anchors that Wallet Units use to verify RP certificates |
| **Wallet Provider** | Builds the Wallet Solution that Users interact with; RP has no direct interface |
| **PID Provider** | Issues PIDs that RPs request and verify |
| **Attestation Provider** | Issues QEAAs, PuB-EAAs, EAAs that RPs request and verify |
| **CAB** | Certifies Wallet Solutions — RP relies on certification for trust |
| **Supervisory Body** | Oversees RP compliance with eIDAS 2.0 obligations |

> **Legal entity authentication**: This document focuses on **natural person** PID presentation, which is the primary use case for the EUDI Wallet ecosystem's initial deployment. However, ARF v2.8.0 (Topic 28) explicitly descoped wallet units for legal persons from the current framework in view of the development of a separate **European Business Wallet (EBW)**.
>
> Proposed by the European Commission under COM(2025) 838 as a dedicated regulation complementing the EUDI Wallet, the EBW will provide a separate digital wallet and identity solution for legal persons (companies, SMEs, sole traders, and public sector bodies). EU-wide acceptance is projected for 2028–2029, though exact timelines remain subject to the ordinary legislative procedure. Key considerations for RPs regarding legal entities:
>
> - **Shared Trust Infrastructure**: The EBW is designed to interoperate with and share the same underlying trust framework as the EUDI Wallet (Trusted Lists, Registrars, Access Certificate Authorities, WUA).
> - **Legal person attestations** will contain entity identifiers (LEI, EUID, VAT number) rather than natural person attributes.
> - **B2B scenarios**: A company representative may engage in cross-wallet or combined presentations (§15), presenting both a natural person PID (from their EUDI Wallet proving their identity) and a legal person attestation (from the EBW proving they act on behalf of a company).
> - **RP Data Processing**: RPs should design their attestation processing pipelines to be format- and entity-type-agnostic from the start. DCQL queries must distinguish between natural person PIDs (`eu.europa.ec.eudi.pid.1`) and future legal person VCT values — never assume all PIDs contain natural person attributes.

---

### 3. RP Registration, Data Model, and Registrar API

#### 3.1 Registration Obligation

To rely on Wallet Units for providing a service, an RP **must register** with a Registrar in the Member State where it is established (Art. 5b(1), CIR 2025/848 Art. 3). Registration is a prerequisite for:

1. Receiving one or more **Access Certificates** (WRPAC) from an Access Certificate Authority
2. Optionally receiving one or more **Registration Certificates** (WRPRC) if supported by the MS
3. Having registration data published in the **national register** — publicly accessible online
4. Being discoverable and verifiable by Wallet Units via the **Registrar API**

#### 3.2 RP Registration Data Model (TS5/TS6)

TS5 defines the common data model for RP registration information, and TS6 specifies the minimum common data set required for registration. Together, they define the `WalletRelyingParty` data structure.

#### 3.2.1 WalletRelyingParty Data Model

The data model is defined in [TS5 §2](https://github.com/eu-digital-identity-wallet/eudi-doc-standards-and-technical-specifications/blob/main/docs/technical-specifications/ts5-common-formats-and-api-for-rp-registration-information.md#2-data-model), with superclass dependencies on [TS2 §2.1–§2.2](https://github.com/eu-digital-identity-wallet/eudi-doc-standards-and-technical-specifications/blob/main/docs/technical-specifications/ts2-notification-publication-provider-information.md#21-legalentity). The main class `WalletRelyingParty` inherits from `Provider`, which in turn inherits from `LegalEntity`. TS5 defines four auxiliary classes (`IntendedUse`, `Credential`, `Claim`, `MultiLangString`) while TS2 defines five more (`Identifier`, `Policy`, `LegalPerson`, `NaturalPerson`, `Law`).

```mermaid
classDiagram
    direction TB

    class LegalEntity {
        <<TS2 §2.1>>
        legalPerson : LegalPerson [0..1]
        naturalPerson : NaturalPerson [0..1]
        identifier : Identifier [0..*]
        postalAddress : string [0..*]
        country : string [1..1]
        email : string [0..*]
        phone : string [0..*]
        infoURI : string [0..*]
    }

    class Provider {
        <<TS2 §2.2>>
        providerType : string [1..1]
        policy : Policy [1..*]
        x5c : string [0..*]
    }

    class WalletRelyingParty {
        <<TS5 §2.1>>
        tradeName : string [0..1]
        supportURI : string [1..*]
        srvDescription : MultiLangString [1..*]
        intendedUse : IntendedUse [0..*]
        isPSB : boolean [1..1]
        entitlement : string [1..*]
        providesAttestations : Credential [0..*]
        supervisoryAuthority : LegalEntity [1..1]
        registryURI : string [1..1]
        usesIntermediary : WalletRelyingParty [0..*]
        isIntermediary : boolean [1..1]
    }

    class IntendedUse {
        <<TS5 §2.4.3>>
        purpose : MultiLangString [1..*]
        privacyPolicy : Policy [1..*]
        intendedUseIdentifier : string [1..1]
        createdAt : string [1..1]
        revokedAt : string [0..1]
        credential : Credential [1..*]
    }

    class Credential {
        <<TS5 §2.4.4>>
        format : string [1..1]
        meta : string [1..1]
        claim : Claim [0..*]
    }

    class Claim {
        <<TS5 §2.4.1>>
        path : array [1..1]
        values : array [0..1]
    }

    class MultiLangString {
        <<TS5 §2.4.5>>
        lang : string [1..1]
        content : string [1..1]
    }

    class Identifier {
        <<TS2 §2.9.2>>
        type : string [1..1]
        identifier : string [1..1]
    }

    class Policy {
        <<TS2 §2.9.5>>
        type : string [1..1]
        policyURI : string [1..1]
    }

    class LegalPerson {
        <<TS2 §2.9.4>>
        legalName : string [1..*]
        establishedByLaw : Law [0..*]
    }

    class NaturalPerson {
        <<TS2 §2.9.4>>
        givenName : string [1..1]
        familyName : string [1..1]
        dateOfBirth : string [0..1]
        placeOfBirth : string [0..1]
    }

    class Law {
        <<TS2 §2.9.3>>
        lang : string [1..1]
        legalBasis : string [1..1]
    }

    LegalEntity <|-- Provider : inherits
    Provider <|-- WalletRelyingParty : inherits
    LegalEntity "1" --o "0..1" LegalPerson : legalPerson
    LegalEntity "1" --o "0..1" NaturalPerson : naturalPerson
    LegalEntity "1" --o "0..*" Identifier : identifier
    Provider "1" --o "1..*" Policy : policy
    WalletRelyingParty "1" --o "0..*" IntendedUse : intendedUse
    WalletRelyingParty "1" --o "0..*" Credential : providesAttestations
    WalletRelyingParty "1" --o "1..1" LegalEntity : supervisoryAuthority
    WalletRelyingParty "1" --o "0..*" WalletRelyingParty : usesIntermediary
    WalletRelyingParty "1" --o "1..*" MultiLangString : srvDescription
    IntendedUse "1" --o "1..*" Credential : credential
    IntendedUse "1" --o "1..*" MultiLangString : purpose
    IntendedUse "1" --o "1..*" Policy : privacyPolicy
    Credential "1" --o "0..*" Claim : claim
    LegalPerson "1" --o "0..*" Law : establishedByLaw
```

#### 3.2.2 Mandatory vs. Conditional Attributes (TS6)

TS6 defines which attributes are mandatory and which are conditional based on the RP's role:

| Attribute | Mandatory | Conditional | Notes |
|:----------|:---------:|:-----------:|:------|
| `walletRelyingPartyId` | ✅ | | Unique identifier assigned by Registrar |
| `legalName` | ✅ | | Official legal name of the entity |
| `tradeName` | | ✅ | If different from legal name |
| `memberState` | ✅ | | MS where RP is established |
| `legalEntityIdentifier` | ✅ | | LEI, national ID, or other identifier |
| `entityType` | ✅ | | PUBLIC or PRIVATE |
| `role` | ✅ | | RELYING_PARTY or INTERMEDIARY |
| `contactInfo.supportURI` | ✅ | | At least one: website, email, or phone |
| `intendedAttributes` | ✅ | | Attestation types and attributes RP will request |
| `intendedAttributes[].purpose` | ✅ | | Purpose for requesting each attribute set |
| `intermediary` | | ✅ | Required if RP uses an intermediary |
| `supervisoryAuthority` | ✅ | | DPA contact information |
| `status` | ✅ | | ACTIVE, SUSPENDED, REVOKED |

> **RP Implementation Note**: The `supportURI` field is particularly important because it is used by the Wallet Unit to enable Users to submit data deletion requests (TS7) and is included in the WRPRC (if available). RPs **SHOULD** register a website URL as the primary `supportURI`, as the Wallet Unit assumes a browser is always available on the user's device.

#### 3.3 Registration Process Overview

> **Architectural Note (Direct vs Intermediated Registration):** The flow below represents the **Direct RP Model**, where the Relying Party registers to obtain both Registration Certificates (expressing intended use) and an Access Certificate (for Wallet connection). In the **Intermediary RP Model**, the Intermediary registers to obtain the Access Certificate, while the Intermediated RP registers to obtain Registration Certificates referencing their chosen Intermediary.

#### 3.3.1 Registration Sequence Diagram (Direct RP Model)

```mermaid
---
config:
  themeVariables:
    noteBkgColor: "transparent"
    noteBorderColor: "transparent"
  sequence:
    messageAlign: left
    noteAlign: left
    actorMargin: 200
---
sequenceDiagram
    participant RP as 🏦 Relying Party
    participant REG as 🏛️ Registrar<br/>(Member State)
    participant ACA as 🔐 Access CA
    participant RCP as 📜 Registration<br/>Cert Provider

    rect rgba(148, 163, 184, 0.14)
    Note right of RP: Phase 1: Application
    RP->>REG: 1. Submit registration application
    Note right of RP: Includes: legal identity, contact info,<br/>intended attributes, purposes,<br/>intermediary status (if applicable),<br/>intended use cases
    REG->>REG: 2. Validate application
    Note right of REG: Verify legal entity, check<br/>entitlements per national policy
    REG-->>RP: 3. Registration confirmed
    Note right of RP: RP data published in national register
    end

    rect rgba(52, 152, 219, 0.14)
    Note right of RP: Phase 2: Access Certificate Issuance
    RP->>ACA: 4. Request WRPAC(s)
    Note right of RP: One per RP Instance
    ACA->>REG: 5. Verify RP registration
    REG-->>ACA: 6. Confirm registration
    ACA->>ACA: 7. Issue X.509 certificate
    Note right of ACA: Contains: RP identity, MS,<br/>certificate policies
    ACA-->>RP: 8. WRPAC issued
    ACA->>ACA: 9. Log to Certificate Transparency
    Note right of RCP: ⠀
    end

    rect rgba(46, 204, 113, 0.14)
    Note right of RP: Phase 3: Registration Certificate (Optional)
    RP->>RCP: 10. Request WRPRC
    RCP->>REG: 11. Retrieve registration data
    REG-->>RCP: 12. Registration data
    RCP->>RCP: 13. Issue WRPRC
    Note right of RCP: Embeds: intended attributes,<br/>purposes, supportURI,<br/>supervisory authority info
    RCP-->>RP: 14. WRPRC issued
    Note right of RCP: ⠀
    end
```

<details><summary><strong>1. Relying Party submits registration application to Registrar</strong></summary>

The Relying Party submits a registration application to the Registrar in its Member State. This formalizes their intent to request specific attributes (like PID or SCA) from Wallet Users. While the API for submission (`POST /wrp`) is defined per Member State, the underlying data model is standardized across the EU (TS5/TS6).

```json
{
  "walletRelyingPartyId": "urn:eudi:wrp:de:bank-example:12345",
  "legalName": "Example Bank AG",
  "tradeName": "Example Bank",
  "memberState": "DE",
  "entityType": "PRIVATE",
  "role": "RELYING_PARTY",
  "contactInfo": {
    "supportURI": ["https://support.example-bank.de/eudi-wallet"]
  },
  "intendedAttributes": [
    {
      "attestationType": "eu.europa.ec.eudi.pid.1",
      "attributes": ["family_name", "given_name", "birth_date"],
      "purpose": "Customer onboarding and KYC verification",
      "lawfulBasis": "Legal obligation (AMLD Art. 13)"
    }
  ]
}
```
</details>
<details><summary><strong>2. Registrar validates application</strong></summary>

The national Registrar validates the application against its policies. This includes verifying the legal entity identifier (e.g., LEI) with national business registries and confirming the RP is legally permitted to request the specified attributes based on their stated lawful basis (e.g., PSD2, AMLD).
</details>
<details><summary><strong>3. Registrar confirms registration to Relying Party</strong></summary>

Upon successful validation, the Registrar confirms the registration to the Relying Party. The RP's data is then committed to the national register and immediately exposed via the public Registrar API, ensuring Wallet Units can query the RP's intended use configuration at runtime.
</details>
<details><summary><strong>4. Relying Party requests WRPAC(s) from Access CA</strong></summary>

The Relying Party generates a Certificate Signing Request (CSR) and requests an Access Certificate (WRPAC). This must be done through an authorized Access Certificate Authority (Access CA). A separate WRPAC must be requested for each RP Instance operating under the legal entity (e.g., mobile app, backend service).
</details>
<details><summary><strong>5. Access CA queries Registrar to verify RP registration</strong></summary>

The Access CA does not blindly issue the certificate. It performs an active lookup by querying the Registrar to verify that the entity requesting the WRPAC is in fact a registered RP in good standing.
</details>
<details><summary><strong>6. Registrar confirms registration to Access CA</strong></summary>

The Registrar responds to the exact same `/wrp/{identifier}` API call by returning the Relying Party's registered data points. The response is a JWS-signed JSON Web Token containing the `data` payload, confirming the entity's active status to the Access CA.

```http
HTTP/1.1 200 OK
Content-Type: application/jwt
x-jku-url: https://api.registrar.de/.well-known/jwks.json

eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InJlZ2lzdHJhci0xIn0.
{
  "iss": "urn:eudi:registrar:de:bafin",
  "iat": 1718445123,
  "data": {
    "walletRelyingPartyId": "urn:eudi:wrp:de:bank-example:12345",
    "status": "ACTIVE",
    "role": "RELYING_PARTY",
    "...": "(remaining TS5 data model attributes)"
  }
}.
[signature_bytes]
```
</details>
<details><summary><strong>7. Access CA issues X.509 Access Certificate</strong></summary>

The Access CA mints the X.509 Access Certificate. Crucially, the WRPAC binds the RP's public key to its legal identity. It follows the ETSI TS 119 475 profile, embedding the `walletRelyingPartyId` and the `memberState` into the certificate's subject or extensions.

```text
Certificate:
    Data:
        Version: 3 (0x2)
        Serial Number: 1234567890 (0x499602d2)
        Issuer: C=DE, O=Access CA GMBH, CN=EUDI WRPAC CA 1
        Subject: C=DE, O=Example Bank AG, CN=Example Bank EUDI Web Service
        X509v3 extensions:
            1.3.6.1.4.1.xxxxx.1 (walletRelyingPartyId):
                urn:eudi:wrp:de:bank-example:12345
```
</details>
<details><summary><strong>8. Access CA delivers WRPAC to Relying Party</strong></summary>

The signed WRPAC is delivered to the Relying Party. The RP will use the private key associated with this certificate to sign presentation requests (JARs) directed at EUDI Wallet Units.
</details>
<details><summary><strong>9. Access CA logs WRPAC to Certificate Transparency</strong></summary>

To maintain systemic technical trust and prevent rogue CA operations, the Access CA publishes the issued WRPAC to a Certificate Transparency (CT) log. This allows ecosystem actors to audit issued certificates.
</details>
<details><summary><strong>10. Relying Party requests WRPRC from Registration Cert Provider</strong></summary>

If the Member State provides Registration Certificates (optional under CIR 2025/848), the Relying Party requests a WRPRC from a Provider of Registration Certificates. While the WRPAC proves *who* the RP is, the WRPRC proves *what* they are allowed to ask for.
</details>
<details><summary><strong>11. Registration Cert Provider queries Registrar for RP data</strong></summary>

The Provider queries the Registrar's REST API using the GET `/wrp/{identifier}` endpoint to retrieve the RP's exact intended attributes and purposes.

```http
GET /wrp/urn:eudi:wrp:de:bank-example:12345 HTTP/1.1
Host: api.registrar.de
```
</details>
<details><summary><strong>12. Registrar returns registration data to Registration Cert Provider</strong></summary>

The Registrar returns the exact same JWS-signed JWT containing the requested Relying Party's details. The Registration Cert Provider decodes this to extract the `intendedAttributes` array and `supportURI` to embed them directly into the certificate.

```http
HTTP/1.1 200 OK
Content-Type: application/jwt
x-jku-url: https://api.registrar.de/.well-known/jwks.json

eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InJlZ2lzdHJhci0xIn0.
{
  "iss": "urn:eudi:registrar:de:bafin",
  "iat": 1718446900,
  "data": {
    "walletRelyingPartyId": "urn:eudi:wrp:de:bank-example:12345",
    "status": "ACTIVE",
    "intendedAttributes": [
      {
        "attestationType": "eu.europa.ec.eudi.pid.1",
        "attributes": ["family_name", "given_name", "birth_date"],
        "purpose": "Customer onboarding and KYC verification",
        "lawfulBasis": "Legal obligation (AMLD Art. 13)"
      }
    ],
    "...": "(remaining TS5 data model attributes)"
  }
}.
[signature_bytes]
```
</details>
<details><summary><strong>13. Registration Cert Provider issues WRPRC</strong></summary>

The Provider generates the WRPRC, embedding the RP's registered `intendedAttributes`, `supportURI`, and `supervisoryAuthority` directly into the certificate payload. This eliminates the need for Wallet Units to query the online Registrar if the RP presents the WRPRC.
</details>
<details><summary><strong>14. Registration Cert Provider delivers WRPRC to Relying Party</strong></summary>

The Registration Certificate is returned to the RP. During a presentation flow, the RP can include this WRPRC in the `client_metadata` of its request, allowing the Wallet Unit to verify the RP's configuration entirely offline.
</details>

#### 3.4 Registrar REST API

TS5 defines a public REST API (OpenAPI 3.1) enabling any party — including Wallet Units, RPs, and the general public — to query the national register of Wallet-Relying Parties. The API is critical for the RP integration flow because:

1. **Wallet Units query it** to verify RP registration and intended attributes when no WRPRC is available
2. **RPs query it** to verify their own registration status and that of intermediaries
3. **Supervisory bodies** use it for monitoring and enforcement

#### 3.4.1 API Endpoints

| Method | Path | Authentication | Purpose |
|:-------|:-----|:---------------|:--------|
| `GET` | `/wrp` | Public (open) | Query registered WRPs by parameters |
| `GET` | `/wrp/{identifier}` | Public (open) | Retrieve single WRP by identifier |
| `GET` | `/wrp/check-intended-use` | Public (open) | Boolean check if intended use matches |
| `POST` | `/wrp` | Authenticated (MS-specific) | Create new WRP registration |
| `PUT` | `/wrp` | Authenticated (MS-specific) | Update existing WRP registration |
| `DELETE` | `/wrp` | Authenticated (MS-specific) | Delete WRP registration |

> **Key design decision**: Write methods (POST, PUT, DELETE) use Member State–specific authentication and authorisation mechanisms. The harmonisation of the `POST` method has been left for further study — meaning each Member State may implement a different registration application process.

#### 3.4.2 Public Query Parameters

The `GET /wrp` endpoint supports the following query parameters:

| Parameter | Type | Description |
|:----------|:-----|:------------|
| `identifier` | string | Official or business registration number |
| `legalname` | string | Official company name |
| `tradename` | string | Trade name |
| `policy` | string | URL of the WRP's privacy policy |
| `entitlement` | string | Type of entitlement (e.g., PuB-EAA Provider) |
| `providesattestation` | string | Type of attestation provided |
| `usesintermediary` | boolean | Whether WRP uses an intermediary |
| `isintermediary` | boolean | Whether WRP acts as an intermediary |
| `intendeduseidentifier` | string | Identifier for a specific intended use |
| `intendedUseClaimPath` | string | Claim path within an intended use |
| `intendedUseCredentialMeta` | string | Credential metadata for intended use |
| `intendedUseCredentialFormat` | string | Credential format (e.g., `dc+sd-jwt`) |

Parameters can be combined:

```
GET /wrp?identifier=someIdentifier&claimpath=IBAN&credentialformat=dc+sd-jwt
GET /wrp?legalname=Another%20Org&isintermediary=false
```

#### 3.4.3 Response Format

All `GET` responses are **JWS-signed** by the Registrar. A successful `GET /wrp` response returns an array of matching `WalletRelyingParty` objects plus Certificate Transparency log information for each entity's Access Certificates (per RFC 9162).

The dedicated `GET /wrp/check-intended-use` endpoint returns a JWS-signed boolean `TRUE` or `FALSE`, enabling Wallet Units to perform a lightweight check during presentation without downloading the full registration data.

#### 3.4.4 Wallet Unit to Registrar API Interaction (Agnostic: Applies to Direct RP and Intermediary)

When a Wallet Unit receives a presentation request from an RP Instance that does not include a WRPRC, the Wallet Unit uses the Registrar API to verify the RP's intended attributes:

```mermaid
---
config:
  themeVariables:
    noteBkgColor: "transparent"
    noteBorderColor: "transparent"
  sequence:
    messageAlign: left
    noteAlign: left
    actorMargin: 150
---
sequenceDiagram
    participant WU as 📱 Wallet Unit
    participant RPI as 🏦 RP Instance
    participant REG as 🏛️ Registrar API

    RPI->>WU: 1. Presentation request (WRPAC, no WRPRC)
    WU->>WU: 2. Authenticate RP Instance via WRPAC
    Note right of WU: User enables "verify<br/>registration" check

    WU->>REG: 3. GET /wrp/check-intended-use?<br/>identifier={rpId}<br/>&intendeduseidentifier={useId}<br/>&claimpath={requestedClaim}<br/>&credentialformat=dc+sd-jwt
    REG-->>WU: 4. JWS-signed response:<br/>TRUE / FALSE
    
    alt Intended use verified (TRUE)
        WU->>WU: 5. Show User: "RP registered for<br/>these attributes ✅"
    else Intended use not verified (FALSE)
        WU->>WU: 6. Show User: "⚠️ RP requested attributes<br/>not matching registration"
    end
    
    WU->>WU: 7. User approves/denies
    Note right of REG: ⠀
```
<details><summary><strong>1. Presentation request (WRPAC, no WRPRC)</strong></summary>

The Relying Party Instance sends a presentation request to the Wallet Unit. The request is signed with the RP's Access Certificate (WRPAC), but importantly, the RP does not embed a Registration Certificate (WRPRC) in the payload or there is no WRPRC support in its Member State.
</details>
<details><summary><strong>2. Authenticate RP Instance via WRPAC</strong></summary>

The Wallet Unit cryptographically verifies the request signature and validates the WRPAC certificate chain against the trusted root from the national Trusted List (LoTE), authenticating the identity of the RP Instance.
</details>
<details><summary><strong>3. GET /wrp/check-intended-use</strong></summary>

Because no WRPRC was provided and the user has mandated a registration check, the Wallet Unit initiates a live call to the public Registrar API to verify that the RP is legally authorized to request these specific attributes.
</details>
<details><summary><strong>4. JWS-signed response: TRUE/FALSE</strong></summary>

The Registrar API returns a lightweight, JWS-signed boolean response indicating whether the requested attributes and intended use exactly match the RP's official registration record.
</details>
<details><summary><strong>5. Show User: "RP registered for these attributes ✅"</strong></summary>

If the response is TRUE, the Wallet UI confirms to the user that the RP is fully registered and authorized to request the specified data.
</details>
<details><summary><strong>6. Show User: "⚠️ RP requested attributes not matching registration"</strong></summary>

If the response is FALSE, the Wallet UI alerts the user that the Relying Party is requesting data outside its registered scope, highlighting a potential privacy or security risk.
</details>
<details><summary><strong>7. User approves/denies</strong></summary>

Following the registration verification and the appropriate UI prompts, the Wallet User makes their final, informed decision to either approve or deny the presentation of credentials.
</details>

#### 3.4.5 API Payload Walkthrough (TS5 OpenAPI 3.1)

The following examples are derived from the official TS5 OpenAPI 3.1 specification (`ts5-openapi31-registrar-api.yml`). All `GET` responses are returned as `application/jwt` (JWS compact serialisation) with an `x-jku-url` header pointing to the Registrar's JWKS.

<details><summary><strong>GET /wrp?identifier={id}</strong> — Query registered WRPs by identifier</summary>

```http
GET /wrp?identifier=5299001GCLKH6FPVJW75 HTTP/1.1
Host: registrar.example-ms.de
Accept: application/jwt
```

Response (`200 OK`, `Content-Type: application/jwt`, `x-jku-url: https://registrar.example-ms.de/.well-known/jwks.json`):

The JWS payload, once decoded and signature-verified against the Registrar's JWKS, conforms to the `SignedWRPArray` schema:

```json
{
  "iss": "urn:eudi:registrar:de:bafin",
  "iat": 1750003200,
  "data": [
    {
      "providerType": 1,
      "x5c": "<base64-encoded WRPAC>",
      "policy": [
        {
          "policyURI": "https://example-bank.de/privacy",
          "type": "privacy_policy"
        }
      ],
      "entitlement": ["relying_party"],
      "isPSB": false,
      "isIntermediary": false,
      "tradeName": "Example Bank",
      "registryURI": "https://registrar.example-ms.de/wrp/5299001GCLKH6FPVJW75",
      "supportURI": [
        "https://support.example-bank.de/eudi-wallet",
        "mailto:eudi-support@example-bank.de"
      ],
      "supervisoryAuthority": {
        "country": "DE",
        "legalPerson": {
          "legalName": ["Der Bundesbeauftragte für den Datenschutz"]
        },
        "infoURI": ["https://www.bfdi.bund.de/"],
        "email": ["poststelle@bfdi.bund.de"]
      },
      "srvDescription": [
        [
          {"lang": "de", "content": "Online-Banking und Kontoeröffnung"},
          {"lang": "en", "content": "Online banking and account opening"}
        ]
      ],
      "intendedUse": [
        {
          "intendedUseIdentifier": "urn:eudi:wrp:de:example-bank:kyc",
          "createdAt": "2026-06-15T10:30:00Z",
          "purpose": [
            {"lang": "de", "content": "Kundenidentifizierung und KYC-Prüfung"},
            {"lang": "en", "content": "Customer identification and KYC verification"}
          ],
          "privacyPolicy": [
            {
              "policyURI": "https://example-bank.de/privacy/kyc",
              "type": "privacy_policy"
            }
          ],
          "credential": [
            {
              "format": "dc+sd-jwt",
              "meta": "eu.europa.ec.eudi.pid.1",
              "claim": [
                {"path": "family_name"},
                {"path": "given_name"},
                {"path": "birth_date"},
                {"path": "age_over_18"},
                {"path": "nationality"},
                {"path": "resident_address"}
              ]
            }
          ]
        },
        {
          "intendedUseIdentifier": "urn:eudi:wrp:de:example-bank:sca",
          "createdAt": "2026-06-15T10:30:00Z",
          "purpose": [
            {"lang": "en", "content": "Strong Customer Authentication for payments"}
          ],
          "privacyPolicy": [
            {
              "policyURI": "https://example-bank.de/privacy/sca",
              "type": "privacy_policy"
            }
          ],
          "credential": [
            {
              "format": "dc+sd-jwt",
              "meta": "eu.europa.ec.eudi.sca.payment.1",
              "claim": [
                {"path": "pan_last_four"},
                {"path": "scheme"}
              ]
            }
          ]
        }
      ],
      "usesIntermediary": []
    }
  ],
  "pagination": {
    "next_cursor": null,
    "has_next_page": false
  }
}
```

</details>
<details><summary><strong>GET /wrp/{identifier}</strong> — Retrieve a single WRP by identifier</summary>

```http
GET /wrp/5299001GCLKH6FPVJW75 HTTP/1.1
Host: registrar.example-ms.de
Accept: application/jwt
```

Response (`200 OK`): Same as the `GET /wrp` response, but the JWS payload conforms to `SignedWRP` (single object, not array):

```json
{
  "iss": "urn:eudi:registrar:de:bafin",
  "iat": 1750003200,
  "data": {
    "providerType": 1,
    "entitlement": ["relying_party"],
    "isPSB": false,
    "isIntermediary": false,
    "tradeName": "Example Bank",
    "registryURI": "https://registrar.example-ms.de/wrp/5299001GCLKH6FPVJW75",
    "supportURI": ["https://support.example-bank.de/eudi-wallet"],
    "intendedUse": [ "..." ]
  }
}
```

`404 Not Found` if the identifier does not match any registered WRP.

</details>
<details><summary><strong>GET /wrp/check-intended-use</strong> — Lightweight boolean check (used by Wallet Units)</summary>

This is the most critical endpoint for real-time RP verification during presentation. The Wallet Unit calls it to determine whether the RP is registered for the specific credential and claim it is requesting.

```http
GET /wrp/check-intended-use?rpidentifier=5299001GCLKH6FPVJW75
    &credentialformat=dc%2Bsd-jwt
    &claimpath=family_name
    &credentialmeta=eu.europa.ec.eudi.pid.1
Host: registrar.example-ms.de
Accept: application/jwt
```

Response (`200 OK`): JWS payload conforming to `SignedIntendedUseCheckResult`:

```json
{
  "iss": "urn:eudi:registrar:de:bafin",
  "iat": 1750003200,
  "data": {
    "isRegistered": true,
    "details": "Intended use 'urn:eudi:wrp:de:example-bank:kyc' includes claim 'family_name' in format 'dc+sd-jwt' with meta 'eu.europa.ec.eudi.pid.1'"
  }
}
```

When the RP requests an attribute it is **not** registered for:

```json
{
  "iss": "urn:eudi:registrar:de:bafin",
  "iat": 1750003200,
  "data": {
    "isRegistered": false,
    "details": "No matching intended use found for claim 'IBAN' in format 'dc+sd-jwt'"
  }
}
```

</details>
<details><summary><strong>PUT /wrp</strong> — Update existing WRP registration (authenticated)</summary>

```http
PUT /wrp HTTP/1.1
Host: registrar.example-ms.de
Content-Type: application/json
Authorization: Bearer <MS-specific auth token>

{
  "providerType": 1,
  "entitlement": ["relying_party"],
  "isPSB": false,
  "isIntermediary": false,
  "tradeName": "Example Bank",
  "supportURI": [
    "https://support.example-bank.de/eudi-wallet",
    "mailto:eudi-support@example-bank.de",
    "tel:+49-800-123-4567"
  ],
  "intendedUse": [
    {
      "intendedUseIdentifier": "urn:eudi:wrp:de:example-bank:kyc",
      "purpose": [
        {"lang": "en", "content": "Customer identification and KYC verification"}
      ],
      "privacyPolicy": [
        {"policyURI": "https://example-bank.de/privacy/kyc", "type": "privacy_policy"}
      ],
      "credential": [
        {
          "format": "dc+sd-jwt",
          "meta": "eu.europa.ec.eudi.pid.1",
          "claim": [
            {"path": "family_name"},
            {"path": "given_name"},
            {"path": "birth_date"},
            {"path": "resident_address"},
            {"path": "resident_country"}
          ]
        }
      ]
    }
  ]
}
```

Response (`200 OK`): The updated WRP as a JWS-signed `SignedWRP` object. `400` if the payload is invalid, `404` if the WRP does not exist.

> **Note**: The `POST` method for creating new registrations has been **parked for further study** by request of DE. Each Member State may implement a different registration application process.

</details>
<details><summary><strong>DELETE /wrp/{identifier}</strong> — Delete a WRP registration (authenticated)</summary>

```http
DELETE /wrp/5299001GCLKH6FPVJW75 HTTP/1.1
Host: registrar.example-ms.de
Authorization: Bearer <MS-specific auth token>
```

Response: `204 No Content` on success, `404 Not Found` if the identifier does not match.

</details>

#### 3.4.6 Security Considerations

TS5 mandates the following protections for the Registrar API:

- **DDoS protection**: Cloud-based DDoS protection, WAF, rate limiting
- **Rate limiting**: Per-IP rate limiting (e.g., 3 calls/min — specific limits are MS-defined)
- **Query complexity limits**: Maximum number of query parameters per call
- **Caching**: Aggressive caching for `GET` responses (registration data changes infrequently)
- **Network segmentation**: API servers in private subnet behind WAF, isolated from the Registrar database
- **Monitoring**: Request rates, latency, error rates, source IP alerting

---

### 4. Trust Infrastructure: Certificates, Attestations, and Trusted Lists

#### 4.1 Certificate Hierarchy and Trust Chains

The EUDI Wallet trust infrastructure is built on a hierarchical certificate model that enables Wallet Units to verify the identity and authorisation of every entity they interact with. For the RP, this hierarchy determines how the RP authenticates itself to Wallet Units and how the RP verifies the credentials it receives.

#### 4.1.1 End-to-End Trust Architecture

```mermaid
---
config:
  flowchart:
    subGraphTitleMargin:
      bottom: 25
    nodeSpacing: 50
    rankSpacing: 50
---
flowchart TD
    subgraph Commission["`**European Commission**`"]
        CI["`**Common Trust Infrastructure**
        Publishes URLs of all
        Trusted Lists and LoTEs`"]
    end

    subgraph MemberState["`**Member State**`"]
        TLP["`**Trusted List / LoTE Provider**
        Signs and publishes LoTEs
        containing trust anchors`"]
        REG["`**Registrar**
        Registers RPs, publishes
        registration data online`"]
        ACA["`**Access Certificate Authority**
        Issues WRPACs to RP Instances`"]
        RCP["`**Registration Cert Provider**
        Issues WRPRCs (optional)`"]
    end

    subgraph RPSystem["`**Relying Party**`"]
        RP["`**RP Legal Entity**
        Registered with Registrar`"]
        RPI1["`**RP Instance 1**
        Web service (remote)`"]
        RPI2["`**RP Instance 2**
        Physical terminal (proximity)`"]
    end

    subgraph WalletSide["`**Wallet Ecosystem**`"]
        WU["`**Wallet Unit**
        Verifies RP certificates`"]
        WP["`**Wallet Provider**
        Issues WUA/WIA`"]
    end

    CI -->|"Publishes LoTE URLs"| TLP
    TLP -->|"Trust anchors"| ACA
    TLP -->|"Trust anchors"| WU
    REG -->|"Registration confirmed"| ACA
    REG -->|"Registration data"| RCP
    ACA -->|"WRPAC"| RPI1
    ACA -->|"WRPAC"| RPI2
    RCP -->|"WRPRC"| RP
    RPI1 -->|"WRPAC + presentation<br/>request"| WU
    RPI2 -->|"WRPAC + presentation<br/>request"| WU
    WU -->|"Validate WRPAC against<br/>trust anchor from LoTE"| WU
    WP -->|"WUA (to PID/Attestation<br/>Providers only)"| WU
    REG -->|"Public API"| WU

    style CI text-align:left
    style TLP text-align:left
    style REG text-align:left
    style ACA text-align:left
    style RCP text-align:left
    style RP text-align:left
    style RPI1 text-align:left
    style RPI2 text-align:left
    style WU text-align:left
    style WP text-align:left
```

#### 4.1.2 Certificate Chain for RP Authentication

When a Wallet Unit processes a presentation request from an RP Instance, it performs the following certificate chain validation:

```mermaid
flowchart TD
    TA["`**Trust Anchor**
    In LoTE, signed by
    Trusted&nbsp;List&nbsp;Provider`"]
    INT["`**Intermediate CA**
    Certificate(s)
    (optional)`"]
    WRPAC["`**WRPAC**
    Wallet-Relying Party
    Access&nbsp;Certificate`"]
    SIG["`**Signature**
    Over the
    presentation&nbsp;request`"]
    TA --> INT --> WRPAC --> SIG
    style TA text-align:left
    style INT text-align:left
    style WRPAC text-align:left
    style SIG text-align:left
```

The Wallet Unit:

1. Extracts the WRPAC and any intermediate certificates from the presentation request
2. Verifies the signature over the request using the public key in the WRPAC
3. Validates the certificate chain up to the trust anchor obtained from the LoTE
4. Checks revocation status for every certificate in the chain (including the trust anchor if applicable)
5. If all checks pass, the RP Instance is authenticated

#### 4.1.3 Trust Verification from RP Side

When the RP receives a presentation response, it performs its own trust chain validation:

```mermaid
flowchart TD
    subgraph PID["PID/QEAA Trust Path"]
        TA1["<b>PID/QEAA Trust Anchor</b><br>In LoTE/Trusted List, via<br>Commission infrastructure"]
        INT1["<b>Intermediate signing certificate(s)</b><br>(optional)"]
        ISS1["<b>PID/QEAA Issuer signing key</b>"]
        SIG1["<b>Signature</b> over the PID/attestation"]
        TA1 --> INT1 --> ISS1 --> SIG1
    end

    subgraph PUB["PuB-EAA Trust Path"]
        TA2["<b>PuB-EAA Trust Anchor</b><br>QTSP Trusted List"]
        QT["<b>QTSP signing certificate</b>"]
        PPC["<b>PuB-EAA Provider certificate</b>"]
        SIG2["<b>Signature</b> over the PuB-EAA"]
        TA2 --> QT --> PPC --> SIG2
    end

    PID ~~~ PUB
    style TA1 text-align:left
    style INT1 text-align:left
    style ISS1 text-align:left
    style SIG1 text-align:left
    style TA2 text-align:left
    style QT text-align:left
    style PPC text-align:left
    style SIG2 text-align:left
```

For **non-qualified EAAs**, the applicable Rulebook specifies how the RP obtains the relevant trust anchor.

#### 4.2 Access Certificates (WRPAC)

#### 4.2.1 Purpose

The **Wallet-Relying Party Access Certificate (WRPAC)** is an X.509 certificate that enables an RP Instance to authenticate itself to a Wallet Unit during a presentation request. It is the primary credential that the RP uses in every interaction with a Wallet Unit.

Key properties:

- **One WRPAC per RP Instance** — each technical system (web service, mobile app, terminal) gets its own certificate
- **Legal subject is the RP** — all WRPACs for a single RP share the same legal entity identity
- **Issued by an Access CA** authorised by the Member State
- **Trust anchors published in LoTE** — enabling cross-border validation by any Wallet Unit in the EU
- **Logged in Certificate Transparency** (RFC 9162) — enabling detection of erroneous or fraudulent issuance
- **ETSI TS 119 475** (draft) defines the detailed certificate profile

#### 4.2.2 WRPAC Structure

Based on ETSI TS 119 475, the WRPAC follows the X.509v3 format with EUDI-specific extensions:

| Field | Content | Example |
|:------|:--------|:--------|
| `Subject.commonName` | RP legal name | `Example Bank AG` |
| `Subject.organizationIdentifier` | RP unique identifier | `VATDE-123456789` |
| `Subject.countryName` | Member State | `DE` |
| `SubjectAltName.dNSName` | Domain name of RP Instance | `eudi.example-bank.de` |
| `Issuer` | Access Certificate Authority | `EUDI Access CA DE` |
| `ExtKeyUsage` | Extended key usage | `id-kp-eudi-wallet-rp-auth` |
| `CRLDistributionPoints` | Revocation checking endpoint | `http://crl.access-ca.de/wrpac.crl` |
| `AuthorityInfoAccess` | OCSP endpoint | `http://ocsp.access-ca.de/` |
| CT Precertificate SCT | Certificate Transparency | Signed Certificate Timestamp |

> **Critical for intermediaries**: When an intermediary acts on behalf of an intermediated RP, the WRPAC belongs to the intermediary. The intermediated RP's identity is conveyed in the **presentation request extension** and the **WRPRC** (if available), not in the WRPAC.

#### 4.2.3 WRPAC Usage in Protocols

**In OpenID4VP (remote flows)**: The RP Instance includes the WRPAC as part of the Signed Authorization Request (JAR). Client identification uses `x509_hash` or `x509_san_dns` — the Wallet Unit can verify the certificate chain from the JWT header.

**In ISO/IEC 18013-5 (proximity flows)**: The RP Instance (mdoc reader) includes the WRPAC in the `ReaderAuth` structure within the `DeviceRequest`. The mdoc verifies the signature over the `ReaderAuthentication` CBOR structure using the public key in the WRPAC.

#### 4.2.4 Certificate Transparency Requirements

##### Overview

CIR 2025/848 Annex IV §3(j) requires Access Certificate Authorities to describe how they log WRPACs in Certificate Transparency (CT) logs, in compliance with IETF RFC 9162 (Certificate Transparency Version 2.0). ARF v2.7.0 (incorporating Discussion Paper Topic S) establishes High-Level Requirements that formalise this obligation and establish the Wallet Unit's verification behaviour.

CT logs are **immutable, append-only** ledgers structured as Merkle trees. They make certificate issuance publicly auditable, enabling detection of certificates that were issued in error or fraudulently. Access CAs submit WRPACs to CT logs, which return a **Signed Certificate Timestamp (SCT)** — a cryptographic proof that the certificate has been publicly recorded.

##### HLRs and RP Impact

| HLR | Requirement | RP Impact |
|:----|:------------|:----------|
| **CT_01** | Access CA SHALL register WRPACs in CT log per RFC 9162, if such a log is available for access certificates. | RP's WRPAC will appear in public CT logs — this is an accountability feature, not a privacy concern (RP registration data is already public). |
| **CT_02** | Access CA SHALL describe in its Certificate Practice Statement (CPS) how it logs all access certificates. | RP should verify that its Access CA's CPS includes a CT logging commitment before selecting a CA. |
| **CT_03** | All Access CAs SHALL act as monitors in the CT ecosystem. Access CAs SHOULD still monitor during temporary unavailability. | Ecosystem-level fraud detection; no direct RP action required. |
| **CT_04** | Access CA SHALL include at least one SCT in each WRPAC. | RP's WRPAC MUST contain ≥1 SCT in the `CT Precertificate SCT` extension (see §4.2.2 WRPAC structure table). |
| **CT_05** | **Wallet Unit SHALL verify that the WRPAC includes at least one valid SCT** during PID or attestation presentation. | **If the RP's WRPAC lacks a valid SCT, the Wallet Unit will reject the RP's presentation request.** This is a hard failure with no fallback. |
| **CT_06** | Missing valid SCT = RP authentication failure, per all requirements in Topic 6 (Relying Party authentication) and in particular requirement RPI_06a. | The RP cannot present to any Wallet Unit until its WRPAC includes a valid SCT. |

##### RP Obligations

1. **Verify your WRPAC contains a valid SCT.** After receiving your WRPAC from the Access CA, inspect the certificate to confirm the `CT Precertificate Signed Certificate Timestamps` extension is present. For example, using OpenSSL:
   ```
   openssl x509 -in wrpac.pem -text -noout | grep -A5 "CT Precertificate SCTs"
   ```
   If the SCT extension is absent, do not deploy the certificate — request re-issuance from the Access CA.

2. **Monitor CT logs for your RP identity.** Subscribe to a CT monitoring service to detect unauthorised WRPACs issued to your RP identifier (`Subject.organizationIdentifier`, `SubjectAltName.dNSName`). An unauthorised WRPAC means another entity could impersonate your RP to Wallet Units. Monitoring services include:
   - [crt.sh](https://crt.sh/) (Sectigo) — free, web-searchable CT log aggregator
   - [Certspotter](https://sslmate.com/certspotter/) (SSLMate) — automated certificate monitoring
   - Future EU CT monitoring services (if established by the Commission)

3. **Incident response for rogue certificates.** If you discover an entry in a CT log for a WRPAC that was incorrectly issued to your identity:
   - Immediately request revocation from the issuing Access CA
   - If revocation is not executed promptly per the CA's CPS, escalate to the service operator of the national Trusted List or the Member State authority
   - Only the RP to which an access certificate has been incorrectly issued can initiate this process

##### Wallet-Side Privacy Model

Wallet Units SHALL NOT contact CT logs directly to verify certificate inclusion. This is a deliberate privacy design: if a Wallet queried a CT log for every presentation, the log operator would learn which RPs the User interacts with — the same privacy concern that applies to web browsers.

Instead, the Wallet's verification is limited to:
1. Extract the SCT(s) from the WRPAC's certificate extension
2. Verify the SCT signature(s) against the CT log's public key
3. Confirm the SCT timestamp is consistent with the certificate's validity

This model is identical to how web browsers handle CT for TLS certificates.

##### Open Issue: EU CT Log Infrastructure

No EU-operated CT log infrastructure exists yet for access certificates. Existing CT log providers (Google, Cloudflare) operate TLS-focused logs. Key unresolved questions:

- Should existing CT log providers accept EUDI access certificates, or should the Commission establish a dedicated European CT log?
- Which standard version should be used — RFC 9162 (V2.0, referenced in CIR 2025/848) or RFC 6962 (V1.0, widely implemented)?
- How many independent CT logs must each WRPAC be registered in? (Web PKI best practice: at least 2)

These questions are tracked as Open Question #15 in §28.

> **Cross-references**: §4.2.2 (WRPAC structure — SCT row), §25.2 (alert triggers — WRPAC SCT and rogue certificate alerts), §24.2 (threat catalogue — T2 key compromise).

#### 4.3 Registration Certificates (WRPRC)

#### 4.3.1 Purpose

The **Wallet-Relying Party Registration Certificate (WRPRC)** is an optional certificate that embeds the RP's registration data in a signed, portable format. While the WRPAC proves the RP's *identity*, the WRPRC proves its *authorisation* — specifically, which attributes it registered to request and for what purposes.

Key properties:

- **Optional per Member State** — CIR 2025/848 Art. 8 states Member States **may** authorise CAs to issue WRPRCs
- **Contains registration data** — intended attributes, purposes, support URI, supervisory authority
- **Multiple WRPRCs per RP** — one per intended use (service/purpose)
- **Enables offline verification** — Wallet Units can verify the RP's registered scope without querying the Registrar API
- **ETSI TS 119 411-8** (draft) defines the detailed format
- **Issued by a Provider of Registration Certificates** — separate from the Access CA

#### 4.3.2 WRPRC vs. Online Registry Lookup

| Aspect | WRPRC (Certificate) | Registrar API (Online) |
|:-------|:--------------------|:----------------------|
| **Availability** | Always available (offline-capable) | Requires internet connection |
| **Freshness** | Point-in-time snapshot; must be revoked if policy changes | Real-time data |
| **Verification** | Cryptographic signature verification | JWS-signed API response |
| **Granularity** | One certificate per intended use | Full registration record |
| **Privacy** | No Registrar contacted → no metadata leakage | Registrar sees query → potential tracking |
| **MS dependency** | Optional; not all MS will issue | Mandatory; all MS must provide API |

When both are available, the Wallet Unit prioritises the WRPRC for offline verification efficiency.

#### 4.3.3 Data Included in WRPRC

Based on TS6 (Common Set of RP Information) and CIR 2025/848 requirements, the WRPRC contains at minimum:

- RP's user-friendly name and unique identifier
- Intended use description (human-readable)
- Attributes the RP is authorised to request for this intended use
- URL to the RP's privacy policy
- `supportURI` — contact endpoints for data deletion requests (website, email, phone)
- `supervisoryAuthority` — DPA contact information (name, URI, email)
- Registrar identifier and URL

#### 4.4 Wallet Unit Attestation (WUA): RP Perspective

#### 4.4.1 What RPs Need to Know

The **Wallet Unit Attestation (WUA)** is a signed information object issued by the Wallet Provider to the Wallet Unit during activation. However, there is a critical design decision in the ARF that RPs must understand:

> **WUAs are NOT presented to Relying Parties.** They are presented only to PID Providers and Attestation Providers during issuance. This is a deliberate privacy-preserving design: RPs do not have a business need to know the WSCA/WSCD properties of a Wallet Unit, and exposing WUAs to RPs would enable linkability.

This means that an RP **cannot directly verify** whether a Wallet Unit has been revoked by checking a WUA. Instead, the RP relies on two indirect mechanisms:

1. **PID credential validity**: PID Providers are legally required (CIR 2024/2977, Art. 5.4(b)) to revoke a PID when the Wallet Unit is revoked. If the RP verifies the PID is not revoked (via Status List), it can trust the Wallet Unit is valid.
2. **Attestation validity**: Attestation Providers may similarly revoke attestations when a Wallet Unit is revoked.

#### 4.4.2 Implications for RP Verification Flow (Agnostic: Applies to Direct RP and Intermediary)

```mermaid
---
config:
  themeVariables:
    noteBkgColor: "transparent"
    noteBorderColor: "transparent"
  sequence:
    messageAlign: left
    noteAlign: left
    actorMargin: 120
---
sequenceDiagram
    participant RPI as 🏦 RP Instance
    participant WU as 📱 Wallet Unit
    participant SL as 📋 Status List<br/>(PID Provider)

    WU->>RPI: 1. Presentation response (PID + attestation)
    
    RPI->>RPI: 2. Verify PID issuer signature
    Note right of RPI: Use PID Provider trust anchor<br/>from LoTE

    RPI->>SL: 3. Check PID revocation status
    Note right of RPI: Attestation Status List or<br/>Attestation Revocation List
    SL-->>RPI: 4. Status: VALID
    Note right of RPI: PID valid → PID Provider has<br/>not revoked it → Wallet Unit<br/>is not revoked (by legal<br/>obligation of PID Provider)

    RPI->>RPI: 5. Verify device binding
    Note right of RPI: Verify Wallet Unit's proof<br/>of possession of private key

    RPI->>RPI: 6. Verify attestation signatures & revocation
    RPI->>RPI: 7. Verify combined presentation<br/>binding (if multi-attestation)
    Note right of SL: ⠀
```
<details><summary><strong>1. Wallet Unit delivers presentation response to Relying Party Instance</strong></summary>

The Wallet Unit delivers the presentation response to the RP, containing the requested Person Identification Data (PID) and any accompanying attestations (e.g., QEAAs, PuB-EAAs). The response format depends on the presentation channel:

- **Online (OpenID4VP)**: The response arrives as an encrypted JWE (`direct_post.jwt`) containing a `vp_token` field. For SD-JWT VC format, the `vp_token` holds a tilde-delimited SD-JWT presentation (Issuer-JWT~Disclosures~KB-JWT). For mdoc format, it holds a CBOR-encoded `DeviceResponse`. See §7.2 step 19 (same-device) or §8.2 step 22 (cross-device) for the full decryption flow.
- **Proximity (ISO 18013-5)**: The response arrives as an AES-GCM encrypted `DeviceResponse` over BLE/NFC, containing `IssuerSigned` + `DeviceSigned` CBOR structures. See §11.4 step 16 for the supervised flow or §11.10 step 11 for the unsupervised flow.

This step is the entry point for the RP's **verification pipeline** — everything from step 2 onward must succeed for the RP to trust the presented attributes. The verification order is important: issuer signature first (step 2), then revocation (step 3), then device binding (step 5), to ensure each layer validates before building on the next.
</details>
<details><summary><strong>2. Relying Party Instance verifies PID issuer signature</strong></summary>

The RP cryptographically verifies the PID's issuer signature to confirm it was legitimately issued by a notified PID Provider. The verification method depends on the credential format:

- **SD-JWT VC**: Parse the Issuer-JWT header, extract the `x5c` certificate chain (or resolve the `kid` via the issuer's JWKS endpoint). Verify the ES256 (P-256 ECDSA) signature over the JWT payload. The leaf certificate must chain to the PID Provider's trust anchor obtained from the national LoTE (§4.5.3).
- **mdoc**: Extract the `issuerAuth` COSE_Sign1 from the MSO. Verify the signature using the issuer's X.509 certificate from the `x5chain` unprotected header. Validate the certificate chain against the LoTE trust anchor for the PID Provider. Check the MSO `validityInfo` (`validFrom`, `validUntil`).

In both formats, the RP must resolve the correct LoTE by identifying the PID Provider's Member State (from the certificate's `issuer` field or the JWT `iss` claim) and fetching the corresponding LoTE entry. For cross-border presentations, the RP may need to consult multiple Member State LoTEs. See §15.5.5 step 3 for the per-credential verification detail including certificate chain building.

> **If signature verification fails**: The RP MUST reject the entire presentation. A forged or tampered PID cannot be trusted, and the cascading verification steps (revocation, device binding) are meaningless without a valid issuer signature.
</details>
<details><summary><strong>3. Relying Party Instance checks PID revocation status</strong></summary>

The RP queries the PID Provider's Token Status List endpoint to ensure the presented PID has not been suspended or revoked. The RP extracts the `status` claim from the PID credential:

```json
{
  "status": {
    "status_list": {
      "idx": 4327,
      "uri": "https://pid-provider.example.de/.well-known/status/1"
    }
  }
}
```

The RP fetches the Status List Token JWT from the `uri`, decompresses the DEFLATE-compressed bitstring, and checks the bit at index `idx`. A value of `0` means VALID; `1` means REVOKED/SUSPENDED. See §B.2.1 for the complete Status List verification procedure with decompression and bit extraction detail.

> **PID revocation as Wallet Unit health signal**: This check is more significant than a simple credential validity check — see step 4 for why.
</details>
<details><summary><strong>4. Status List confirms PID validity to Relying Party Instance</strong></summary>

The Status List confirms the PID's status is VALID (bit = 0). This carries a deeper trust implication than typical credential validity: PID Providers are **legally obligated** (CIR 2024/2977 Art. 5.4(b)) to revoke PIDs when the underlying Wallet Unit Attestation (WUA) is revoked or the Wallet Unit is compromised. This means a valid PID serves as **indirect cryptographic proof that the Wallet Unit itself remains trustworthy** — the PID Provider guarantees cascading revocation. The RP can therefore trust that:

1. The Wallet Unit's WUA has not been revoked by its Wallet Provider
2. The PID Provider has not detected any compromise of the User's device
3. The WSCA/WSCD binding is still intact (the PID Provider would revoke if notified of key compromise)

This is why the RP does not need to verify the WUA or WIA directly — the PID acts as a **trust proxy** for the entire Wallet Unit health chain.

> **Revocation propagation delay**: There is a window between WUA revocation and PID cascading revocation, bounded by the PID Provider's status list refresh interval (typically 15 minutes to 1 hour). For ultra-high-assurance scenarios (e.g., qualified electronic signature creation), RPs should perform additional checks beyond PID status — see §13 (SCA attestations) for complementary verification.
</details>
<details><summary><strong>5. Relying Party Instance verifies device binding</strong></summary>

The RP verifies the presenter's proof of possession — cryptographic evidence that the credential was presented by the device that originally received it from the PID Provider. This prevents credential cloning, forwarding, and replay attacks. The verification method depends on the format:

- **SD-JWT VC (KB-JWT)**: The RP verifies the Key Binding JWT appended after the final `~` delimiter. It checks:
  1. `signature` — verify ES256 signature using the `cnf.jwk` public key from the Issuer-JWT payload
  2. `aud` — must match the RP's `client_id` (typically the SAN or `x5t#S256` from the WRPAC)
  3. `nonce` — must match the nonce from the original presentation request (anti-replay)
  4. `sd_hash` — must match `SHA-256(base64url(Issuer-JWT~Disclosure1~...~DisclosureN))` (binds the KB-JWT to the specific selective disclosure set)
  5. `iat` — issued-at timestamp must be recent (within a configurable window, typically ≤ 300 seconds)

- **mdoc (DeviceAuth)**: The RP verifies the `deviceSignature` COSE_Sign1 over the `DeviceAuthentication` CBOR structure, which includes the `SessionTranscript`. See §11.10 step 13 for the detailed verification process.

> **If device binding fails**: This is the most critical security check — it proves that the credential holder is the same entity that received the credential from the issuer. Failure indicates credential forwarding, cloning, or a relay attack. The RP MUST reject the presentation and SHOULD log a security alert.
</details>
<details><summary><strong>6. Relying Party Instance verifies attestation signatures & revocation</strong></summary>

If additional attestations were presented alongside the PID (e.g., a QEAA for professional qualifications, a PuB-EAA for address data, or an mDL), the RP processes each one through the same verification pipeline (steps 2–5). For each attestation:

1. **Issuer signature** — verify against the appropriate LoTE trust anchor (QEAA → QEAA Trusted List; PuB-EAA → QTSP Trusted List; see §4.5.2 for the LoTE type mapping)
2. **Revocation** — query the attestation-specific Status List endpoint
3. **Device binding** — verify the KB-JWT or DeviceAuth

> **Attestation revocation asymmetry**: Unlike PID Providers, Attestation Providers are **NOT obligated** to cascade-revoke when the WUA is revoked (ARF HLR AS-WP-38-019). They MAY choose to do so, but are only required to publish their cascading revocation policy. This means that after a Wallet Unit compromise, the PID becomes invalid immediately (step 3–4), but EAAs may remain valid depending on each Attestation Provider's individual policy. RPs performing high-assurance verifications should check the PID status as the primary trust signal — see the note following step 7 for the cascading revocation asymmetry detail.
</details>
<details><summary><strong>7. Relying Party Instance verifies combined presentation binding</strong></summary>

In multi-attestation scenarios (where the `vp_token` contains more than one credential), the RP must verify that all presented credentials belong to the same User and were presented from the same Wallet Unit. This prevents a "credential cocktail" attack where attributes from different Users or devices are combined:

- **SD-JWT VC**: All credentials must contain the **same `cnf.jwk` public key**. Since the KB-JWT for each credential is signed with this key, identical `cnf.jwk` values prove the same device key — and therefore the same Wallet Unit — holds all credentials.
- **mdoc**: All `DeviceResponse` documents must reference the **same `deviceKey`** in their MSO `deviceKeyInfo`.
- **Cross-format (SD-JWT VC + mdoc)**: The RP must determine whether the SD-JWT's `cnf.jwk` (JWK format) and the mdoc's `deviceKey` (COSE_Key format) represent the same underlying key. See §15.5.6 for the cross-format key matching algorithm.

If a WSCA binding proof is available (future feature — ARF v2.8 §6.6.3), the RP should additionally verify it to confirm hardware-level key co-residency. See §15.5.5 steps 9–10 for the detailed identity matching and WSCA proof verification logic.

> **When step 7 is not needed**: If the presentation contains a single credential (e.g., PID only), this step is skipped — there is nothing to cross-bind against.
</details>

> **Cascading revocation asymmetry — RP awareness**: The indirect trust model described above has an asymmetry that RPs should understand. When a Wallet Provider revokes a WUA (e.g., device compromise, user death), the **PID Provider is legally required** (CIR 2024/2977 Art. 5.4(b)) to cascade-revoke the associated PID immediately. However, **Attestation Providers are not obligated to cascade-revoke** — they MAY choose to revoke but are only required to publish their cascading revocation policy (ARF HLR AS-WP-38-019). This means that after a WUA revocation, a user's PID will become invalid within the PID Provider's status list refresh cycle, but their EAAs (e.g., a qualification attestation or an address credential) may remain valid depending on the issuing Attestation Provider's policy. RPs performing high-assurance verifications (e.g., AML/KYC onboarding per §19) should verify the PID's revocation status as the primary Wallet Unit health signal, since PID cascading revocation is mandatory. RPs that also rely on EAA revocation status for trust decisions should check the Attestation Provider's published cascading revocation policy to understand the gap.

#### 4.4.3 Wallet Instance Attestation (WIA): Also Not Seen by RPs

Similarly, the **Wallet Instance Attestation (WIA)** — a short-lived (< 24 hours) attestation about the Wallet Instance — is presented only to Providers, not to RPs.

#### 4.5 Trusted Lists and Lists of Trusted Entities

#### 4.5.1 Architecture

The trust anchor discovery mechanism in the EUDI Wallet ecosystem uses a two-tier architecture:

1. **Common Trust Infrastructure** — Maintained by the European Commission. Contains the URLs of all Trusted Lists and LoTEs across all Member States. Any entity in the ecosystem can discover all trust anchors by starting from this common infrastructure.

2. **Trusted Lists and LoTEs** — Published by Member State Trusted List/LoTE Providers. Each LoTE contains the trust anchors (public key + entity identifier) for the entities notified by that Member State.

#### 4.5.2 LoTE Types Relevant to RPs

| LoTE Type | Contains Trust Anchors Of | RP Uses It To |
|:----------|:--------------------------|:--------------|
| **Access CA LoTE** | Access Certificate Authorities | N/A (Wallet Units use this to verify WRPAC) |
| **PID Provider LoTE** | PID Providers (notified) | Verify PID issuer signatures |
| **QEAA Trusted List** | QEAA Providers (qualified status) | Verify QEAA issuer signatures |
| **PuB-EAA Trusted List** | PuB-EAA Providers (notified) | Discover PuB-EAA Provider identity; actual verification uses QTSP certificate |
| **QTSP Trusted List** | Qualified Trust Service Providers (Art. 22) | Verify PuB-EAA Provider certificates |
| **Registration Cert LoTE** | Providers of Registration Certificates | N/A (Wallet Units use this to verify WRPRCs) |
| **Wallet Provider LoTE** | Wallet Providers | N/A (Providers use this to verify WUA/WIA) |

#### 4.5.3 RP Trust Anchor Retrieval Flow (Agnostic: Applies to Direct RP and Intermediary)

```mermaid
---
config:
  themeVariables:
    noteBkgColor: "transparent"
    noteBorderColor: "transparent"
  sequence:
    messageAlign: left
    noteAlign: left
    actorMargin: 120
---
sequenceDiagram
    participant RPI as 🏦 RP Instance
    participant CTI as 🇪🇺 Common Trust<br/>Infrastructure
    participant LOTE as 📜 LoTE Provider<br/>(MS of PID Provider)

    Note right of RPI: One-time setup (cached, periodically refreshed)
    
    RPI->>CTI: 1. Discover LoTE URLs
    CTI-->>RPI: 2. List of all LoTE/Trusted List URLs
    
    RPI->>LOTE: 3. Fetch PID Provider LoTE
    LOTE-->>RPI: 4. Signed LoTE:<br/>PID Provider trust anchors<br/>(public keys + identifiers)
    
    RPI->>RPI: 5. Verify LoTE signature
    RPI->>RPI: 6. Cache trust anchors

    Note right of RPI: During each presentation verification
    
    RPI->>RPI: 7. Look up trust anchor for PID<br/>Provider that signed the presented PID
    RPI->>RPI: 8. Verify PID signature using<br/>the trust anchor
    Note right of LOTE: ⠀
```
<details><summary><strong>1. Relying Party Backend discovers LoTE URLs via Member State registry</strong></summary>

As a one-time bootstrapping step, the Relying Party instance queries the centralized European Common Trust Infrastructure to discover the authoritative URLs for all Member State Trusted Lists and Lists of Trusted Entities (LoTEs).
</details>
<details><summary><strong>2. Common Trust Infrastructure returns List of all LoTE/Trusted List URLs</strong></summary>

The Common Trust Infrastructure responds with the official directory mapping each Member State to its respective LoTE publication endpoints.
</details>
<details><summary><strong>3. Relying Party Backend fetches PID Provider LoTE</strong></summary>

The RP reaches out to the specific Member State LoTE Provider endpoint to download the list of authorized PID Providers and their associated public keys.
</details>
<details><summary><strong>4. LoTE Provider returns signed LoTE containing PID Provider trust anchors</strong></summary>

The LoTE Provider returns a cryptographically signed document (the LoTE) containing the official trust anchors (public keys and entity identifiers) for all active, legitimate PID Providers in that jurisdiction. OpenID Federation is the standard format, where the payload is an `Entity Statement` JWT.

```json
{
  "iss": "https://eudcc.de/lote/pid-providers",
  "sub": "https://pid-provider.example.de",
  "iat": 1718300000,
  "exp": 1720000000,
  "jwks": {
    "keys": [
      {
        "kty": "EC",
        "crv": "P-256",
        "x": "...",
        "y": "...",
        "use": "sig",
        "kid": "pid-issuer-key-01"
      }
    ]
  },
  "trust_marks": [
    {
      "id": "eudi_pid_provider",
      "trust_mark": "..."
    }
  ]
}
```
</details>
<details><summary><strong>5. Relying Party Backend verifies LoTE signature</strong></summary>

The RP verifies the digital signature on the LoTE itself to ensure the list of trust anchors originated from the genuine Member State authority and has not been tampered with.
</details>
<details><summary><strong>6. Relying Party Backend caches trust anchors locally</strong></summary>

The RP securely caches the verified trust anchors in its local infrastructure. This cache must be periodically refreshed (e.g., daily) to detect newly authorized or suspended providers.
</details>
<details><summary><strong>7. Relying Party Backend looks up trust anchor for PID Provider</strong></summary>

During an active user presentation, the RP extracts the issuer identifier from the incoming PID and performs a local lookup against its cached trust anchors to find the corresponding public key.
</details>
<details><summary><strong>8. Relying Party Backend verifies PID signature using the trust anchor</strong></summary>

Finally, the RP uses the located public key (trust anchor) to mathematically verify the issuer signature on the presented PID, guaranteeing its authenticity.
</details>

#### 4.5.4 Trust Anchor Lifecycle Events That Affect RPs

| Event | Impact on RP |
|:------|:-------------|
| **PID Provider suspended** | LoTE status changed to Invalid → RP should reject PIDs from this Provider |
| **QEAA Provider loses qualified status** | Trusted List updated → RP should reject new QEAAs from this Provider |
| **Access CA compromised** | LoTE updated → Wallet Units stop trusting WRPACs from this CA → RP must obtain new WRPAC from different CA |
| **Wallet Provider suspended** | Wallet Provider LoTE updated → PID/Attestation Providers stop issuing → existing PIDs remain valid until revoked |
| **RP registration suspended** | WRPAC revoked → RP Instance can no longer authenticate to Wallet Units |

> **RP operational requirement**: RPs must implement periodic LoTE/Trusted List refresh (at minimum daily, recommended more frequently) to ensure they are using current trust anchors for verifying presented credentials. Stale trust anchors could lead to accepting credentials from suspended Providers.

#### 4.6 Credential Rotation and Re-Issuance

RPs must handle credential lifecycle events gracefully:

| Event | RP Impact | Recommended Handling |
|:------|:----------|:---------------------|
| **PID re-issuance** (new `cnf` key) | The `cnf.jwk` in the new PID differs from the old PID. Any RP-side binding to the old key (e.g., cached device key) becomes invalid. | RP should match users by PID attributes (e.g., `personal_identifier`), not by `cnf` key alone. Update stored device key on each successful presentation. |
| **Attestation expiry** | Expired attestation is rejected by RP verification pipeline | RP should inform the User with a clear message (e.g., "Your credential has expired — please re-issue it from your Wallet Provider"). Do not silently fail. |
| **Wallet Unit migration** (device change) | All credentials are re-issued to the new device with new `cnf` keys | RP-side pseudonym bindings (WebAuthn, §14) may be lost if not backed up. RP should support account recovery via alternative verification. |
| **PID Provider rotation** (new signing key) | New PIDs are signed with a new key from the same or different Provider | RP should rely on LoTE-based trust anchor validation (§4.5), not on cached specific signing keys. |

> **Key design principle**: Do not treat the `cnf.jwk` (device-bound key) as a stable user identifier. It changes when credentials are re-issued or the user migrates to a new device. Use PID attributes or pseudonym credentials for persistent user identification.

---

### 5. Credential Formats: SD-JWT VC, mdoc, and Format Selection

#### 5.1 SD-JWT VC Overview

**SD-JWT VC** (Selective Disclosure JSON Web Token Verifiable Credential) is one of two mandatory credential formats in the EUDI Wallet ecosystem (alongside mdoc). It is the primary format for remote (over-the-internet) presentation flows.

An SD-JWT VC consists of three parts, serialised as a single string separated by tildes (`~`):

```
<Issuer-signed JWT>~<Disclosure 1>~<Disclosure 2>~...~<Key Binding JWT>
```

| Component | Purpose |
|:----------|:--------|
| **Issuer-signed JWT** | Contains the credential metadata and hashed attribute references; signed by the PID/Attestation Provider |
| **Disclosures** | Base64url-encoded `[salt, claim_name, claim_value]` arrays — one per selectively-disclosed attribute |
| **Key Binding JWT** | Proves the presenter (Wallet Unit) possesses the private key bound to the credential; signed by the Wallet Unit |

#### 5.2 SD-JWT VC Structure: Decoded Issuer JWT

The decoded payload of the Issuer-signed JWT for a PID:

```json
{
  "iss": "https://pid-provider.example.de",
  "iat": 1719504000,
  "exp": 1751040000,
  "vct": "eu.europa.ec.eudi.pid.1",
  "cnf": {
    "jwk": {
      "kty": "EC",
      "crv": "P-256",
      "x": "oB3MnEqRFGT7vbq-hLsTIwoFUx7GnzLkc5xw2Ef44Gk",
      "y": "9e3K4L-hPmv0kZNG3v6j2iP5U38roAqhfVjhUb4Q8DA"
    }
  },
  "status": {
    "status_list": {
      "idx": 4321,
      "uri": "https://pid-provider.example.de/statuslist/1"
    }
  },
  "_sd": [
    "09vKrJMOGniTguCgaSferQ3JnE-qHcslWfuVxjKl_kY",
    "2FK0leQ_7mlJPG0VGNSBqj-nA36-tVac3K5vGqhlBPo",
    "Cmz3HYpvJPl9C_x4EQk6gSsqakzGVhGP3aeNOmTi8DI"
  ],
  "_sd_alg": "sha-256"
}
```

Key fields:

- `vct` — Verifiable Credential Type: `eu.europa.ec.eudi.pid.1` for PID
- `cnf.jwk` — Confirmation key: the public key of the Wallet Unit (device binding)
- `status` — Status List reference for revocation checking
- `_sd` — Array of hashes of the selectable disclosures
- `_sd_alg` — Hash algorithm used (`sha-256`)

#### 5.3 SD-JWT VC Selective Disclosure in Practice

When the RP requests only `family_name` and `age_over_18`, the Wallet Unit:

1. Includes only the corresponding Disclosures (not all of them)
2. The RP can verify these Disclosures by hashing them and comparing with the `_sd` array in the Issuer JWT
3. Attributes NOT included in the Disclosures remain hidden — the RP sees only their hashes

Example Disclosures included:

```
WyJfMjZCY1R0ckJNR0RpaVl3UmRhZ0xBIiwiZmFtaWx5X25hbWUiLCJNw7xsbGVyIl0
~
WyJlbHVWNU9nM2dTTklJOEVZbnN4QV9BIiwiYWdlX292ZXJfMTgiLHRydWVd
```

Decoded: `["_26BcTrkBMGDiiYwRdagLA", "family_name", "Müller"]` and `["eluV5Og3gSNII8EYnsxA_A", "age_over_18", true]`

#### 5.4 SD-JWT VC Key Binding JWT

The Key Binding JWT proves the presenter controls the private key referenced in `cnf.jwk`. Its payload:

```json
{
  "aud": "https://verifier.example-bank.de",
  "nonce": "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk",
  "iat": 1709769600,
  "sd_hash": "fUMUMhki0LFWse...base64url_of_sha256_of_sd_jwt"
}
```

- `aud` — The RP's identifier (prevents replay to a different RP)
- `nonce` — The nonce from the presentation request (prevents replay)
- `sd_hash` — Hash of the entire SD-JWT (binds the KB-JWT to the specific presentation)

#### 5.5 mdoc Overview

**mdoc** (mobile document) is the credential format defined by ISO/IEC 18013-5, originally for mobile driving licences (mDL). In the EUDI Wallet ecosystem, it is the mandatory format for **proximity** presentation flows and is also supported for remote flows via ISO/IEC 18013-7.

mdoc uses CBOR (Concise Binary Object Representation) encoding, which is more compact than JSON and optimised for constrained environments (NFC, BLE).

#### 5.6 mdoc Structure

An mdoc consists of two main structures:

```mermaid
flowchart TD
    subgraph MSO["MobileSecurityObject - MSO"]
        M0["<b>Signed by Issuer</b><br>(PID/Attestation Provider)"]
        M1["Version"]
        M2["Digest algorithm (SHA-256)"]
        M3["Value digests<br>(hash of each data element, per namespace)"]
        M4["Device key info<br>(public key bound to Wallet Unit)"]
        M5["DocType<br>e.g. eu.europa.ec.eudi.pid.1"]
        M6["Validity info<br>(signed, validFrom, validUntil)"]
        M0 --- M1
        M0 --- M2
        M0 --- M3
        M0 --- M4
        M0 --- M5
        M0 --- M6
    end

    subgraph ISI["IssuerSignedItem[]"]
        I1["Per-namespace arrays of data elements"]
        I2["Each item: digestID, random,<br>elementIdentifier, elementValue"]
        I3["Selective disclosure by omission<br>(omit items not to disclose)"]
        I1 --- I2 --- I3
    end

    MSO ~~~ ISI
    style M0 text-align:left
    style M3 text-align:left
    style M4 text-align:left
    style M5 text-align:left
    style M6 text-align:left
    style I2 text-align:left
    style I3 text-align:left
```

#### 5.7 MSO in CBOR Diagnostic Notation

```
{
  "version": "1.0",
  "digestAlgorithm": "SHA-256",
  "valueDigests": {
    "eu.europa.ec.eudi.pid.1": {
      0: h'75167029...',  ; digest of family_name
      1: h'67e539d6...',  ; digest of given_name
      2: h'3394372d...',  ; digest of birth_date
      3: h'2e35ad3c...',  ; digest of age_over_18
    }
  },
  "deviceKeyInfo": {
    "deviceKey": {
      1: 2,      ; kty: EC2
      -1: 1,     ; crv: P-256
      -2: h'...' ; x-coordinate
      -3: h'...' ; y-coordinate
    }
  },
  "docType": "eu.europa.ec.eudi.pid.1",
  "validityInfo": {
    "signed": "2026-01-15T00:00:00Z",
    "validFrom": "2026-01-15T00:00:00Z",
    "validUntil": "2027-01-15T00:00:00Z"
  }
}
```

#### 5.8 Selective Disclosure in mdoc

Unlike SD-JWT VC (which uses hash-based selective disclosure), mdoc achieves selective disclosure by **omission**:

1. The MSO contains digests (hashes) of ALL data elements
2. The Wallet Unit includes only the `IssuerSignedItem` entries for the attributes the User approves
3. The RP can verify each received item by recomputing its hash and checking against the MSO digest
4. Items NOT included are invisible to the RP — the RP only sees their digest IDs

#### 5.9 Device Authentication (mdoc)

In proximity flows, the Wallet Unit provides a `DeviceAuth` structure:

```
DeviceAuth = {
  "deviceSignature": COSE_Sign1  ; over SessionTranscript
}
```

The `SessionTranscript` binds the response to the specific session, preventing replay. The RP verifies the signature using the `deviceKey` from the MSO.

#### 5.10 Format Selection: SD-JWT VC vs. mdoc

| Aspect | SD-JWT VC | mdoc (ISO 18013-5) |
|:-------|:----------|:-------------------|
| **Encoding** | JSON / JWT (Base64url) | CBOR (binary) |
| **Transport** | HTTP / OpenID4VP | BLE / NFC / Wi-Fi Aware + ISO 18013-5 |
| **Primary use** | Remote flows (internet) | Proximity flows (face-to-face) |
| **Remote support** | Native via OpenID4VP | Via ISO 18013-7 over OpenID4VP |
| **Selective disclosure** | Hash-based (`_sd` array + Disclosures) | Omission-based (exclude IssuerSignedItems) |
| **Device binding** | Key Binding JWT (KB-JWT) | DeviceAuth (COSE_Sign1) |
| **Revocation** | Status List (JWT claim) | Status List or issuer-defined |
| **Size efficiency** | Larger (JSON text + Base64) | Smaller (CBOR binary) |
| **Offline verification** | Possible (if trust anchor cached) | Native (designed for offline) |
| **W2W interactions** | NOT supported (TS9) | Mandatory for W2W |
| **HAIP 1.0 support** | Yes | Yes (via ISO 18013-7) |

> **RP implementation note**: RPs MUST support both formats. For remote flows, the RP typically receives SD-JWT VCs. For proximity flows, the RP receives mdoc. For remote flows, the RP may also receive mdoc via ISO 18013-7 encapsulation in OpenID4VP. The DCQL query language allows the RP to express format preferences.


#### 5.11 Rulebook Architecture

Attestation Rulebooks define the complete lifecycle and presentation rules for specific attestation types. They are maintained in the [EUDI Attestation Rulebooks Catalog](https://github.com/eu-digital-identity-wallet/eudi-doc-attestation-rulebooks-catalog).

Currently published Rulebooks:

| Rulebook | Attestation Type | RP Relevance |
|:---------|:-----------------|:-------------|
| **PID Rulebook** | `eu.europa.ec.eudi.pid.1` | Core identity — every RP needs this |
| **mDL Rulebook** | `org.iso.18013.5.1.mDL` | Driving licence — transport, insurance, rental RPs |
| **SCA Attestation Rulebooks** | Per-scheme (TBD) | Payment-specific — banks, PSPs |

#### 5.12 RP-Relevant Rulebook Content

A Rulebook typically specifies:

| Aspect | What It Defines | RP Impact |
|:-------|:----------------|:----------|
| **Attribute catalogue** | Mandatory vs. optional attributes within the attestation | RP knows which attributes it *can* request |
| **Namespace** | DocType and namespace identifiers (for mdoc) | RP must use exact identifiers in DeviceRequest |
| **VCT** | Verifiable Credential Type URI (for SD-JWT VC) | RP uses this in DCQL `meta.vct_values` |
| **Issuer trust model** | How the issuer chain is validated | RP builds verification logic accordingly |
| **Disclosure policies** | Default and allowed disclosure policies | RP knows if embedded restrictions may apply |
| **Revocation** | Required revocation mechanism (Status List) | RP knows which endpoint to check |
| **Validity period** | Maximum credential lifetime | RP can enforce freshness thresholds |

#### 5.13 PID Rulebook: RP-Relevant Attributes

The PID Rulebook defines the full PID attribute set. RPs should request only what they need:

| Attribute | Data Type | Mandatory in PID | Common RP Use Cases |
|:----------|:----------|:-----------------|:--------------------|
| `family_name` | string | ✅ | KYC, legal contracts, account opening |
| `given_name` | string | ✅ | KYC, personalisation |
| `birth_date` | full-date | ✅ | Age verification, KYC |
| `age_over_18` | boolean | ✅ | Age-gated services (no DOB disclosure needed) |
| `age_in_years` | integer | Optional | Tiered age verification |
| `age_birth_year` | integer | Optional | Year-level age verification |
| `nationality` | string | Optional | AML screening, travel |
| `resident_address` | string | Optional | Delivery, billing, CDD |
| `resident_city` | string | Optional | Regional services |
| `resident_country` | string | Optional | Jurisdiction determination |
| `personal_identifier` | string | ✅ | Unique ID for AML/KYC |
| `portrait` | image/jpeg | Optional | Visual identity verification (proximity) |
| `birth_place` | string | Optional | Enhanced CDD |
| `gender` | string (ISO 5218) | Optional | Healthcare, formal documents |

**Data minimisation example**: An age-verification RP for alcohol sales should request ONLY `age_over_18`, NOT `birth_date`, `family_name`, or any other attributes.

#### 5.14 Complete PID Attribute Catalogue

The PID Rulebook defines the full set of attributes that a PID may contain. RPs must be aware of the complete catalogue to construct precise DCQL queries. The table below shows every attribute, its SD-JWT VC `claim_path`, and mdoc `elementIdentifier`:

| Attribute | SD-JWT VC `claim_path` | mdoc `elementIdentifier` | Data Type | Mandatory |
|:----------|:----------------------|:-------------------------|:----------|:----------|
| Family name | `["family_name"]` | `family_name` | string | ✅ |
| Given name | `["given_name"]` | `given_name` | string | ✅ |
| Birth date | `["birth_date"]` | `birth_date` | full-date | ✅ |
| Age over 18 | `["age_over_18"]` | `age_over_18` | boolean | ✅ |
| Personal identifier | `["personal_identifier"]` | `personal_identifier` | string | ✅ |
| Family name at birth | `["family_name_birth"]` | `family_name_birth` | string | Optional |
| Given name at birth | `["given_name_birth"]` | `given_name_birth` | string | Optional |
| Birth place | `["birth_place"]` | `birth_place` | string | Optional |
| Birth city | `["birth_city"]` | `birth_city` | string | Optional |
| Birth state | `["birth_state"]` | `birth_state` | string | Optional |
| Birth country | `["birth_country"]` | `birth_country` | string (ISO 3166-1 alpha-2) | Optional |
| Residential address | `["resident_address"]` | `resident_address` | string | Optional |
| Residential city | `["resident_city"]` | `resident_city` | string | Optional |
| Residential postal code | `["resident_postal_code"]` | `resident_postal_code` | string | Optional |
| Residential state | `["resident_state"]` | `resident_state` | string | Optional |
| Residential country | `["resident_country"]` | `resident_country` | string (ISO 3166-1 alpha-2) | Optional |
| Resident street address | `["resident_street"]` | `resident_street` | string | Optional |
| Resident house number | `["resident_house_number"]` | `resident_house_number` | string | Optional |
| Nationality | `["nationality"]` | `nationality` | string (ISO 3166-1 alpha-2) | Optional |
| Gender | `["gender"]` | `gender` | integer (ISO 5218) | Optional |
| Age in years | `["age_in_years"]` | `age_in_years` | integer | Optional |
| Age birth year | `["age_birth_year"]` | `age_birth_year` | integer | Optional |
| Age over NN | `["age_over_NN"]` | `age_over_NN` | boolean | Optional |
| Portrait | `["portrait"]` | `portrait` | image/jpeg (Base64) | Optional |
| Portrait capture date | `["portrait_capture_date"]` | `portrait_capture_date` | full-date | Optional |
| Issuance date | `["issuance_date"]` | `issuance_date` | full-date | System |
| Expiry date | `["expiry_date"]` | `expiry_date` | full-date | System |
| Issuing authority | `["issuing_authority"]` | `issuing_authority` | string | System |
| Issuing country | `["issuing_country"]` | `issuing_country` | string (ISO 3166-1 alpha-2) | System |
| Document number | `["document_number"]` | `document_number` | string | System |
| Administrative number | `["administrative_number"]` | `administrative_number` | string | System |
| Issuing jurisdiction | `["issuing_jurisdiction"]` | `issuing_jurisdiction` | string | System |

> **Namespace note**: In mdoc format, all PID attributes use the namespace `eu.europa.ec.eudi.pid.1`. The `elementIdentifier` above is the key within that namespace. For `age_over_NN`, `NN` can be any integer (e.g., `age_over_21`, `age_over_65`).

> **RP data minimisation**: System attributes (`issuance_date`, `expiry_date`, `issuing_authority`, etc.) are contained in the MSO/Issuer JWT metadata — RPs receive them automatically during verification. They should NOT be requested as separate claims in DCQL queries.

---

## Remote Presentation Flows

### 6. OpenID4VP and HAIP Protocol Foundations

#### 6.1 OpenID4VP Protocol Overview

**OpenID for Verifiable Presentations (OpenID4VP) 1.0** — which achieved Final Specification status in July 2025 — extends OAuth 2.0 to enable a Wallet (acting as an Authorization Server) to present Verifiable Credentials to an RP (acting as a Client/Verifier).

The core flow follows the OAuth 2.0 Authorization Code flow pattern, with key differences:

1. The **Authorization Request** contains a `dcql_query` (DCQL) specifying which credentials/attributes the RP needs
2. The **Authorization Response** contains a `vp_token` with the Verifiable Presentation(s)
3. Client identification uses `x509_hash` (WRPAC hash) rather than traditional OAuth client credentials
4. The request is a **Signed Authorization Request** (JAR — JWT-Secured Authorization Request)

#### 6.2 OpenID4VP Key Protocol Parameters

| Parameter | Direction | Description |
|:----------|:----------|:------------|
| `client_id` | Request | RP identifier — the `x509_hash://` URI embeds both the scheme and the WRPAC hash |
| `response_type` | Request | `vp_token` |
| `response_mode` | Request | `direct_post.jwt` (HAIP mandatory — encrypted response) |
| `dcql_query` | Request | DCQL-format query specifying required credentials and claims |
| `nonce` | Request | Random value for replay prevention |
| `state` | Request | Session binding for the RP |
| `response_uri` | Request | URL where Wallet posts the encrypted response |
| `transaction_data` | Request | Transaction-specific data for SCA (TS12) |
| `vp_token` | Response | Contains the Verifiable Presentation(s) |

#### 6.3 HAIP 1.0 Requirements for RPs

**HAIP 1.0** (High Assurance Interoperability Profile), approved as a Final Specification by the OIDF in December 2025, defines mandatory requirements for the EUDI Wallet ecosystem.

#### 6.3.1 Mandatory RP Requirements Under HAIP

| Requirement | Specification | Impact on RP |
|:------------|:-------------|:-------------|
| **Signed Authorization Requests (JAR)** | Request must be a JWT signed with the RP's WRPAC private key | RP must implement JWT signing with X.509 |
| **Client ID schemes** | Client identification via `x509_hash` or `x509_san_dns` conforming with WRPAC | RP must compute and include certificate hash or SAN DNS value |
| **Encrypted responses** | `response_mode` = `direct_post.jwt` with ECDH-ES | RP must implement JWE decryption |
| **DCQL mandatory** | Must use DCQL (not legacy `presentation_definition`) | RP must implement DCQL query generation |
| **Response encryption** | Response encrypted to RP's ephemeral public key | RP generates ephemeral key pair per session |
| **Nonce binding** | Each request includes a unique nonce | RP must generate and validate nonces |

#### 6.3.2 Computing `x509_hash` Client ID

While HAIP 1.0 primarily targets `x509_hash`, the EUDI ecosystem Architecture Reference Framework (ARF) additionally mandates support for `x509_san_dns`. Both client identification methods are valid for presentation flows and actively tested in vendor compliance. In OpenID4VP 1.0, the `x509_hash` scheme is encoded directly into the `client_id` URI — there is no separate `client_id_scheme` parameter. The `client_id` value for `x509_hash` is computed as:

```
client_id = "x509_hash://sha-256/" + base64url(SHA-256(DER-encoded WRPAC))
```

**Low-Level Worked Example:**

An RP must compute the hash over the strict DER-encoded X.509 certificate (not the PEM wrapper, and not just the public key), perform a SHA-256 digest, and output a base64url-encoded string (no padding). Below are two common ways to compute this:

**Using OpenSSL:**
```bash
# 1. Convert PEM to DER
openssl x509 -in wrpac.pem -outform DER -out wrpac.der

# 2. Compute SHA-256 and base64 encode (translate to base64url and remove padding)
openssl dgst -sha256 -binary wrpac.der | base64 | tr '+/' '-_' | tr -d '='
# Output: fUMUMhki0LFWse8o3LKJrVx2p_Ynz3gMRNeH9-jWrQA

# 3. Construct client_id
# client_id = x509_hash://sha-256/fUMUMhki0LFWse8o3LKJrVx2p_Ynz3gMRNeH9-jWrQA
```

**Using Python:**
```python
import hashlib
import base64

with open('wrpac.der', 'rb') as f:
    cert_der = f.read()

# Compute SHA-256 hash over the raw DER bytes
digest = hashlib.sha256(cert_der).digest()

# Base64url-encode the hash (no padding)
b64_hash = base64.urlsafe_b64encode(digest).decode('ascii').rstrip('=')

client_id = f"x509_hash://sha-256/{b64_hash}"
print(client_id)
# Output: x509_hash://sha-256/fUMUMhki0LFWse8o3LKJrVx2p_Ynz3gMRNeH9-jWrQA
```

> **Implementation note**: The hash is computed over the **entire DER-encoded certificate**, not just the public key. This binds the client_id to the specific WRPAC (including its validity period, issuer, and extensions). If the WRPAC is renewed, the `client_id` changes — RPs must update their configuration accordingly.

#### 6.4 Ephemeral Key Lifecycle and Forward Secrecy

The EUDI Wallet ecosystem strictly enforces **per-session forward secrecy** for all remote presentation responses by mandating the `direct_post.jwt` response mode. The core of this mechanism relies on the RP generating ephemeral keys for every single request, meaning that a compromise of the RP's long-term WRPAC private key will not compromise past presentation payloads.

The precise lifecycle of these ephemeral keys is as follows:

1. **Generate (Stateful or Stateless)**: The RP generates a fresh `EC` (Elliptic Curve) key pair using the `P-256` curve. 
    - *Stateful architecture*: The private key is placed in a high-speed session cache (like Redis with a tight TTL of 2-5 minutes), keyed by the request's `state` parameter.
    - *Stateless architecture*: The private key is symmetrically encrypted using an RP-internal secret (e.g., AES-GCM) and passed to the frontend within an opaque, HttpOnly cookie, allowing the backend nodes to remain purely stateless.
2. **Inject Public Key**: The RP extracts the public key component and injects it into the JAR payload (generally under the `client_metadata.jwks.keys` arrays per HAIP requirements).
3. **Wallet Encryption**: The Wallet Unit automatically performs key agreement against this ephemeral public key to derive a symmetric Content Encryption Key (CEK), using `ECDH-ES` and an encryption scheme like `A256GCM` or `A256CBC-HS512`. The response is returned as a fully encrypted JSON Web Encryption (JWE) document.
4. **RP Decryption**: When the Wallet POSTs the JWE to the `response_uri`, the RP retrieves the corresponding ephemeral private key (either from Redis using the session ID, or by decrypting the stateless internal cookie).
5. **Cryptographic Erasure**: The exact moment the JWE is decrypted into a cleartext `vp_token`, the RP **must** forcefully purge the ephemeral private key from memory. Under no circumstances should this key be logged, written to persistent storage, or reused for subsequent requests.

> **Warning for Intermediaries**: If an RP connects to the ecosystem via an intermediary, the intermediary controls the ephemeral key lifecycle. The intermediary must ensure that after decrypting the JWE, the data is re-secured (e.g., via mutual TLS or application-level encryption) before being forwarded to the final downstream RP.

#### 6.5 RP Metadata Discovery

OpenID4VP 1.0 defines a metadata discovery mechanism for RPs. RPs SHOULD publish a metadata document at `.well-known/openid-credential-verifier` that advertises their capabilities to Wallet Units:

```json
{
  "response_types_supported": ["vp_token"],
  "response_modes_supported": ["direct_post.jwt"],
  "vp_formats_supported": {
    "dc+sd-jwt": {
      "sd-jwt_alg_values": ["ES256"]
    },
    "mso_mdoc": {
      "alg_values": ["ES256"]
    }
  },
  "request_object_signing_alg_values_supported": ["ES256"],
  "response_encryption_alg_values_supported": ["ECDH-ES"],
  "response_encryption_enc_values_supported": ["A256GCM"],
  "dcql_supported": true
}
```

> **Implementation note**: While Wallet Units in the EUDI ecosystem primarily rely on the JAR itself for capability negotiation (since all parameters are in the signed request), publishing RP metadata enables Wallet Providers to pre-validate RP compatibility during testing and certification.

### 7. Same-Device Remote Presentation

#### 7.1 Flow Description

In the **same-device flow**, the User's browser and the Wallet Unit are on the same device. The RP's website (accessed via the browser) triggers the Wallet Unit to handle the presentation request.

> **Architectural Note (Direct vs Intermediary):** The flow below represents the **Direct RP Model**, where the Relying Party manages its own Access Certificates and connects directly to the Wallet. If an RP delegates this to a third-party gateway (the **Intermediary RP Model**), the trust flows and legal obligations under eIDAS Article 5b(10) change significantly. See **[Section 17: Intermediary Architecture and Trust Flows](#17-intermediary-architecture-and-trust-flows)** for the dedicated intermediary sequence diagram.

#### 7.2 Detailed Sequence Diagram (Direct RP Model)

```mermaid
---
config:
  themeVariables:
    noteBkgColor: "transparent"
    noteBorderColor: "transparent"
  sequence:
    messageAlign: left
    noteAlign: left
    actorMargin: 120
---
sequenceDiagram
    participant User as 👤 User
    participant Browser as 🌐 Browser
    participant RP as 🏦 RP Instance
    participant WU as 📱 Wallet Unit
    participant SL as 📋 Status List

    rect rgba(148, 163, 184, 0.14)
    Note right of User: Phase 1: Initiation
    User->>Browser: 1. Access RP service
    Browser->>RP: 2. HTTP request
    RP->>RP: 3. Generate nonce, state,<br/>ephemeral ECDH keys
    RP->>RP: 4. Build DCQL query
    RP->>RP: 5. Create JAR (WRPAC key)
    end

    rect rgba(52, 152, 219, 0.14)
    Note right of User: Phase 2: Wallet Invocation
    RP-->>Browser: 6. Invoke Wallet via DC API
    Browser->>WU: 7. Forward request to Wallet
    end

    rect rgba(46, 204, 113, 0.14)
    Note right of User: Phase 3: Wallet Processing
    WU->>WU: 8. Verify JAR signature (WRPAC)
    WU->>WU: 9. Validate WRPAC chain (LoTE)
    WU->>WU: 10. Check WRPAC revocation
    WU->>WU: 11. Extract RP identity
    WU->>WU: 12. Evaluate disclosure policy
    WU->>User: 13. Display consent screen
    User->>WU: 14. Approve attributes
    WU->>WU: 15. User auth (biometric/PIN)
    WU->>WU: 16. Build vp_token (SD-JWT VC)
    WU->>WU: 17. Encrypt response (JWE)
    end

    rect rgba(241, 196, 15, 0.14)
    Note right of User: Phase 4: Response and Verification
    WU->>RP: 18. POST to response_uri
    RP->>RP: 19. Decrypt JWE
    RP->>RP: 20. Verify SD-JWT + KB-JWT
    RP->>SL: 21. Check revocation
    SL-->>RP: 22. VALID
    RP->>RP: 23. Extract disclosed attributes
    RP-->>Browser: 24. Redirect with session
    Browser->>User: 25. Service rendered
    Note right of SL: ⠀
    end
```

<details><summary><strong>1. User accesses Relying Party service via browser</strong></summary>

The User starts the interaction by navigating to the Relying Party's web service using their device's internet browser.
</details>
<details><summary><strong>2. Browser sends HTTP request to Relying Party backend</strong></summary>

The browser sends an initial HTTP request to the Relying Party's backend server to initiate the service or request access to a protected resource.
</details>
<details><summary><strong>3. Relying Party Instance generates nonce, state, and ephemeral ECDH keys</strong></summary>

The RP backend generates a unique `nonce` for replay protection, a `state` parameter to track the user session, and an ephemeral Elliptic Curve key pair (ECDH) to enable forward-secret encryption of the forthcoming presentation response.
</details>
<details><summary><strong>4. Relying Party Instance builds DCQL query</strong></summary>

The RP constructs a Digital Credentials Query Language (DCQL) query specifying precisely which credentials and claims (e.g., PID `family_name`, `age_over_18`) are required to proceed.
</details>
<details><summary><strong>5. Relying Party Instance creates JAR signed with WRPAC key</strong></summary>

The RP builds the `vp_token` Request Object, signs it with its WRPAC private key to create a JWT-Secured Authorization Request (JAR), and embeds the `x509_hash` client identification alongside the ephemeral public key (`response_encryption_jwk`).

```json
{
  "iss": "https://verifier.example-bank.de",
  "aud": "https://self-issued.me/v2",
  "exp": 1709770200,
  "iat": 1709769600,
  "nbf": 1709769600,
  "jti": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "client_id": "x509_hash://sha-256/fUMUMhki0LF...",
  "response_type": "vp_token",
  "response_mode": "direct_post.jwt",
  "response_uri": "https://verifier.example-bank.de/oid4vp/callback",
  "nonce": "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk",
  "state": "af0ifjsldkj",
  "response_encryption_alg": "ECDH-ES",
  "response_encryption_enc": "A256GCM",
  "response_encryption_jwk": {
    "kty": "EC",
    "crv": "P-256",
    "x": "TCAER19Zvu3OHF4j4W4vfSVoHIP1ILilDls7vCeGemc",
    "y": "ZxjiWWbZMQGHVWKVQ4hbSIirsVfuecCE6t4jT9F2HZQ"
  },
  "dcql_query": {
    "credentials": [
      {
        "id": "pid",
        "format": "dc+sd-jwt",
        "meta": {
          "vct_values": ["eu.europa.ec.eudi.pid.1"]
        },
        "claims": [
          {"path": ["family_name"]},
          {"path": ["given_name"]},
          {"path": ["birth_date"]},
          {"path": ["age_over_18"]}
        ]
      }
    ]
  }
}
```

> **Same-device vs. cross-device**: In OpenID4VP 1.0, when using the `x509_hash` scheme, it is encoded directly into the `client_id` URI prefix (`x509_hash://sha-256/...`); there is no separate `client_id_scheme` parameter. Alternatively, the ecosystem ARF explicitly mandates support for the `x509_san_dns` scheme as well. The key difference between flows is the **invocation mechanism**: same-device flows pass the JAR inline via the W3C DC API (with browser origin verification against the WRPAC's `dNSName`), while cross-device flows use a QR code containing a `request_uri` URL that the Wallet fetches directly (with `wallet_nonce` for freshness). Both `x509_hash` and `x509_san_dns` client identification methods are valid and actively tested in the EUDI Wallet ecosystem. The choice of Client Identifier Prefix also has implications for `response_uri` domain binding — see §20.6.1 for the full analysis of which domains are permitted to host `response_uri` under each scheme.

</details>
<details><summary><strong>6. Relying Party invokes Wallet via W3C DC API</strong></summary>

The Relying Party passes the constructed presentation request to the User's browser via the W3C Digital Credentials (DC) API to invoke the local EUDI Wallet Unit.

The W3C Digital Credentials (DC) API supports two invocation patterns for passing the presentation request to the Wallet:

**Option A: Inline Request (JAR passed directly)**
```javascript
const credential = await navigator.credentials.get({
  digital: {
    providers: [{
      protocol: "openid4vp",
      request: {
        request: "<JWS compact serialization of JAR above>"
      }
    }]
  }
});
// credential.data contains the encrypted JWE response
```

**Option B: `request_uri` Fetch (Recommended for production)**
This pattern prevents embedding a large, potentially verbose JAR directly into the webpage HTML/JS:
```javascript
const credential = await navigator.credentials.get({
  digital: {
    providers: [{
      protocol: "openid4vp",
      request: {
        client_id: "x509_hash://sha-256/... (or x509_san_dns)",
        request_uri: "https://eudi.example-bank.de/oid4vp/request/abc123",
        request_uri_method: "post"
      }
    }]
  }
});
// credential.data contains the encrypted JWE response
```
*Note for Option B: The browser/Wallet invokes a POST request to the `request_uri` to fetch the JAR payload before prompting the user.*

The browser enforces **origin binding**: it verifies that the calling origin matches the `dNSName` SAN in the WRPAC's X.509 certificate (via the `x5c` header in the JAR). This prevents a malicious website from using another RP's WRPAC.

> **Same-device vs. cross-device invoke**: In same-device flows, the Wallet is invoked locally via the browser's DC API, leveraging origin binding out-of-the-box. In cross-device flows (§8), the Wallet must scan a QR code containing the `request_uri` and then POST to it over a completely separate channel; this requires specialized constraints like `wallet_nonce` for cryptographic freshness since there is no implicit origin binding in out-of-band scans.

</details>
<details><summary><strong>7. Browser forwards presentation request to Wallet Unit</strong></summary>

The browser intercepts the API call and natively forwards the presentation request payloads to the local EUDI Wallet application.
</details>
<details><summary><strong>8. Wallet Unit verifies JAR signature against WRPAC</strong></summary>

The Wallet Unit cryptographically verifies the `Request Object` (JAR) using the public key extracted from the embedded WRPAC certificate (via `x5c`).
</details>
<details><summary><strong>9. Wallet Unit validates WRPAC certificate chain via LoTE</strong></summary>

The Wallet Unit validates the WRPAC's certificate chain up to a known Trust Anchor found within the national List of Trusted Entities (LoTE).
</details>
<details><summary><strong>10. Wallet Unit checks WRPAC revocation status</strong></summary>

The Wallet Unit checks the certificate's revocation status via the Access CA's OCSP responder or CRL to ensure the WRPAC hasn't been suspended.
</details>
<details><summary><strong>11. Wallet Unit extracts Relying Party identity from WRPAC</strong></summary>

The Wallet extracts the Relying Party's human-readable identity (e.g., `legalName` or `tradeName`) to populate the user consent interface safely.
</details>
<details><summary><strong>12. Wallet Unit evaluates disclosure policy against DCQL request</strong></summary>

The Wallet applies pre-defined user rules to evaluate the DCQL request to determine if exact attribute matching and permissions are available.
</details>
<details><summary><strong>13. Wallet Unit displays consent screen to User</strong></summary>

The Wallet Unit securely prompts the User with a screen summarizing the RP's requested attributes (e.g., family name, data of birth) and requests explicit consent to share the data.
</details>
<details><summary><strong>14. User approves attribute disclosure</strong></summary>

The User reviews the presentation request and taps to approve the sharing of the listed attributes.
</details>
<details><summary><strong>15. Wallet Unit authenticates User via biometric or PIN</strong></summary>

The Wallet enforces High Level of Assurance (LoA) by mandating local user authentication (e.g., FaceID, fingerprint, or a secure PIN) to unlock the cryptographic keys bound to the credentials.
</details>
<details><summary><strong>16. Wallet Unit builds vp_token with SD-JWT VC and KB-JWT</strong></summary>

The Wallet Unit structures the response payload, selectively disclosing only the approved attributes and generating the Key Binding JWT (KB-JWT) to prove device possession.

```
<Issuer-signed JWT>~<Disclosure:family_name>~<Disclosure:given_name>~<Disclosure:birth_date>~<Disclosure:age_over_18>~<KB-JWT>
```

Key Binding JWT payload:

```json
{
  "typ": "kb+jwt",
  "aud": "x509_hash://sha-256/fUMUMhki0LF...",
  "nonce": "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk",
  "iat": 1741269093,
  "sd_hash": "Re-CtLZfjGLErKy3eSriZ4bBx3AtUH5Q5wsWiiWKIwY"
}
```
</details>
<details><summary><strong>17. Wallet Unit encrypts response as JWE</strong></summary>

The Wallet uses the RP's ephemeral ECDH-ES public key provided in Step 5 to fully encrypt the `vp_token` and state payload into a secure JSON Web Encryption (JWE) document.
</details>
<details><summary><strong>18. Wallet Unit POSTs encrypted response to Relying Party response_uri</strong></summary>

The Wallet sends the encrypted presentation response directly to the Relying Party's backend `response_uri`.

```http
POST /oid4vp/callback HTTP/1.1
Host: verifier.example-bank.de
Content-Type: application/x-www-form-urlencoded

response=<JWE compact serialization>
```
</details>
<details><summary><strong>19. Relying Party Instance decrypts JWE response</strong></summary>

The Relying Party backend retrieves the previously stored ephemeral private key (matching the `state`), decrypts the JWE, and instantly destroys the private key to uphold forward secrecy.

Decrypted JWE payload:

```json
{
  "vp_token": "<SD-JWT VC string as above>",
  "presentation_submission": {
    "id": "submission-1",
    "definition_id": "dcql-query-1",
    "descriptor_map": [
      {
        "id": "pid",
        "format": "dc+sd-jwt",
        "path": "$"
      }
    ]
  },
  "state": "af0ifjsldkj"
}
```

> **DCQL response format vs Presentation Exchange (PEX)**: The `presentation_submission` with `descriptor_map` shown above follows the legacy DIF Presentation Exchange (PEX) format. This structure persists in OpenID4VP 1.0 solely for backward compatibility with non-EUDI implementations. **The EUDI Wallet ecosystem Architecture and Reference Framework (ARF) formally deprecates PEX.** Since HAIP 1.0 mandates DCQL, the authoritative response format keys credentials directly by their DCQL query `id` in the `vp_token` — e.g., `{"vp_token": {"pid": "<SD-JWT VC string>"}, "state": "..."}`. RPs building specifically for EUDI must drop PEX validation and use the DCQL-native response format as the primary parsing path.

</details>
<details><summary><strong>20. Relying Party Instance verifies SD-JWT and KB-JWT signatures</strong></summary>

The RP cryptographically verifies both the SD-JWT issuer signature (against the PID Provider's Trust Anchor) and the Wallet's dynamic KB-JWT signature, linking the hardware to the presentation.
</details>
<details><summary><strong>21. Relying Party Instance checks credential revocation via Status List</strong></summary>

The RP queries the PID Provider's Status List using the encoded status index to see if the credential has been revoked or suspended.
</details>
<details><summary><strong>22. Status List confirms credential validity to Relying Party Instance</strong></summary>

The Status List endpoint or cached response returns that the credential is valid.
</details>
<details><summary><strong>23. Relying Party Instance extracts disclosed attributes from SD-JWT</strong></summary>

The RP algorithmically hashes the supplied SD-JWT disclosures, matching them against the main JWT, and finally extracts the plain-text attribute values (e.g., Name, Age).
</details>
<details><summary><strong>24. Relying Party Instance redirects Browser with authenticated session</strong></summary>

The RP backend successfully registers the authentication and directs the User's browser session or native app connection towards the newly authenticated state.
</details>
<details><summary><strong>25. Browser renders authenticated service to User</strong></summary>

The User successfully logs in or consumes the downstream digital service provided by the Relying Party.
</details>

#### 7.4 Native App RP Integration (iOS/Android)

When the Relying Party is a native mobile application (e.g., a banking app on iOS or Android) rather than a website, it cannot invoke the Wallet using the W3C Digital Credentials API, as that API is strictly constrained to web browsers (`navigator.credentials.get()`). 

Instead, a native RP app must invoke the EUDI Wallet using OS-level Application Links:

1. **Universal Links (iOS) / App Links (Android)**: The Wallet registers a standard `https://` domain (e.g., `https://wallet.example.eu/present`). When the RP app triggers this URL, the mobile OS intercepts the request and launches the Wallet application directly instead of opening a web browser. This is the **strongly recommended** approach as it proves app authenticity to the OS and prevents malicious applications from intercepting the invocation.
2. **Custom URL Schemes (Legacy/Anti-pattern)**: Historically, wallets registered custom schemes (e.g., `eudiw://` or `openid4vp://`), and the RP app would call `eudiw://?client_id=...&request_uri=...`. This is now considered an **anti-pattern** and presents severe security risks (link hijacking), as any malicious app can register the same custom scheme on the device and intercept the presentation request. 

**Flow adaptations for Native RP Apps:**
- The RP backend generates the OpenID4VP JAR and exposes it at a `request_uri`.
- The RP backend returns the `request_uri` and `client_id` to its own RP mobile frontend. 
- The RP mobile frontend constructs the Universal Link URL (e.g., `https://wallet.example.eu/present?client_id=...&request_uri=...`) and calls the OS API to open it (e.g., `UIApplication.shared.openURL()` on iOS).
- The OS securely switches context to the EUDI Wallet app. 
- The Wallet fetches the JAR, acquires user consent, generates the response, and POSTs the response to the `response_uri` on the RP backend. 
- To seamlessly return the user back to the RP app, the Wallet typically redirects them back via the RP app's own Universal Link, or the RP backend pushes a notification (e.g., WebSocket, SSE, or silent push) to the sleeping RP mobile app, triggering it to resume foreground execution.

### 8. Cross-Device Remote Presentation

#### 8.1 Flow Description

In the **cross-device flow**, the User accesses the RP's service on one device (e.g., a laptop browser) but their Wallet Unit is on a different device (e.g., a smartphone). Connection between devices is established via a QR code, with the operating system ensuring proximity.

> **Architectural Note (Direct vs Intermediary):** As in Section 7, the flow below illustrates the **Direct RP Model**. If the RP relies on a vendor or gateway application to orchestrate the QR code and OpenID4VP exchange on its behalf, refer instead to the dedicated intermediary flow in **[Section 17](#17-intermediary-architecture-and-trust-flows)**.

#### 8.2 Detailed Sequence Diagram (Direct RP Model)

```mermaid
---
config:
  themeVariables:
    noteBkgColor: "transparent"
    noteBorderColor: "transparent"
  sequence:
    messageAlign: left
    noteAlign: left
    actorMargin: 120
---
sequenceDiagram
    participant User as 👤 User
    participant Laptop as 💻 Laptop Browser
    participant RP as 🏦 RP Instance
    participant Phone as 📱 Wallet Unit<br/>(smartphone)
    participant SL as 📋 Status List

    rect rgba(148, 163, 184, 0.14)
    Note right of User: Phase 1: QR Code Generation
    User->>Laptop: 1. Access RP service
    Laptop->>RP: 2. HTTP request
    RP->>RP: 3. Generate session, nonce,<br/>ephemeral ECDH keys
    RP->>RP: 4. Create JAR with DCQL query
    RP->>RP: 5. Store JAR at request_uri
    RP-->>Laptop: 6. Render QR code
    end

    rect rgba(52, 152, 219, 0.14)
    Note right of User: Phase 2: Cross-Device Connection
    User->>Phone: 7. Scan QR code with camera
    Phone->>RP: 8. POST to request_uri
    RP-->>Phone: 9. Return signed JAR (JWS)
    Note right of Phone: OS performs proximity check
    end

    rect rgba(46, 204, 113, 0.14)
    Note right of User: Phase 3: Wallet Processing
    Phone->>Phone: 10. Verify JAR signature (WRPAC)
    Phone->>Phone: 11. Validate WRPAC chain (LoTE)
    Phone->>Phone: 12. Evaluate disclosure policy
    Phone->>User: 13. Display consent screen
    User->>Phone: 14. Approve attributes
    Phone->>Phone: 15. User auth (biometric/PIN)
    Phone->>Phone: 16. Build vp_token (SD-JWT VC)
    Phone->>Phone: 17. Encrypt response (JWE)
    end

    rect rgba(241, 196, 15, 0.14)
    Note right of User: Phase 4: Response and Verification
    Phone->>RP: 18. POST to response_uri
    RP->>RP: 19. Decrypt JWE
    RP->>RP: 20. Verify SD-JWT + KB-JWT
    RP->>SL: 21. Check revocation
    SL-->>RP: 22. VALID
    RP->>RP: 23. Extract disclosed attributes
    RP->>RP: 24. Bind to laptop session (state)
    RP-->>Laptop: 25. Push session update
    Laptop->>User: 26. Service rendered
    Note right of SL: ⠀
    end
```

<details><summary><strong>1. User accesses Relying Party service on laptop browser</strong></summary>

The User accesses the Relying Party's service on a primary device, such as a laptop or desktop browser.
</details>
<details><summary><strong>2. Laptop Browser sends HTTP request to Relying Party backend</strong></summary>

The laptop browser sends an initialization request to the Relying Party's backend to start the authentication or data sharing process.
</details>
<details><summary><strong>3. Relying Party Instance generates session, nonce, and ephemeral ECDH keys</strong></summary>

The RP backend generates a unique `state` to track the cross-device session, a `nonce` for replay protection, and an ephemeral Elliptic Curve key pair (ECDH) to enable forward-secret encryption of the forthcoming presentation response.
</details>
<details><summary><strong>4. Relying Party Instance creates JAR with DCQL query</strong></summary>

The RP builds a `vp_token` Request Object specifying the required claims via DCQL, signs it with its WRPAC private key to create a JWT-Secured Authorization Request (JAR), and embeds the `x509_hash` client identification alongside the ephemeral public key.

```json
{
  "iss": "https://verifier.example-bank.de",
  "aud": "https://self-issued.me/v2",
  "exp": 1709770200,
  "iat": 1709769600,
  "nbf": 1709769600,
  "jti": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "client_id": "x509_hash://sha-256/Aq3B7yU0Vzf8-kJDfOpW2xsL7q5m4R1xNzYh3DAv_tI",
  "response_type": "vp_token",
  "response_mode": "direct_post.jwt",
  "response_uri": "https://verifier.example-bank.de/oid4vp/callback",
  "nonce": "n-0S6_WzA2Mj731SUjSn4B_p6cHvEbTIg-LR-HkVbTo",
  "state": "xd-session-9f2a",
  "response_encryption_alg": "ECDH-ES",
  "response_encryption_enc": "A256GCM",
  "response_encryption_jwk": {
    "kty": "EC",
    "crv": "P-256",
    "x": "TCAER19Zvu3OHF4j4W4vfSVoHIP1ILilDls7vCeGemc",
    "y": "ZxjiWWbZMQGHVWKVQ4hbSIirsVfuecCE6t4jT9F2HZQ"
  },
  "dcql_query": {
    "credentials": [
      {
        "id": "pid",
        "format": "dc+sd-jwt",
        "meta": {
          "vct_values": ["eu.europa.ec.eudi.pid.1"]
        },
        "claims": [
          {"path": ["family_name"]},
          {"path": ["given_name"]},
          {"path": ["birth_date"]}
        ]
      }
    ]
  }
}
```

The JAR is signed as a JWS with the RP's WRPAC private key. The JWS header contains the WRPAC chain (`x5c`):

```json
{
  "alg": "ES256",
  "typ": "oauth-authz-req+jwt",
  "x5c": [
    "<WRPAC certificate (DER, base64)>",
    "<Access CA intermediate certificate>"
  ]
}
```
</details>
<details><summary><strong>5. Relying Party Instance stores JAR at request_uri endpoint</strong></summary>

The RP caches the generated JAR in its backed database or memory store and exposes it at a unique out-of-band endpoint (`request_uri`).
</details>
<details><summary><strong>6. Relying Party Instance renders QR code on laptop browser</strong></summary>

The RP sends the `request_uri` and connection details to the laptop browser, which renders them as a QR code on the screen.

```
openid4vp://authorize?
  request_uri=https://verifier.example-bank.de/oid4vp/request/f47ac10b
  &client_id=x509_hash://sha-256/Aq3B7yU0Vzf8-kJDfOpW2xsL7q5m4R1xNzYh3DAv_tI
```
</details>
<details><summary><strong>7. User scans QR code with smartphone camera</strong></summary>

The User opens the EUDI Wallet Unit on their smartphone and scans the displayed QR code.
</details>
<details><summary><strong>8. Wallet Unit POSTs to request_uri to fetch JAR</strong></summary>

The Wallet Unit on the smartphone initiates a direct connection to the RP backend using the parsed `request_uri`. For freshness, this is executed as a POST request.

```http
POST /oid4vp/request/f47ac10b HTTP/1.1
Host: verifier.example-bank.de
Content-Type: application/x-www-form-urlencoded

wallet_nonce=xyz789abc
```
</details>
<details><summary><strong>9. Relying Party Instance returns signed JAR to Wallet Unit</strong></summary>

The RP backend responds to the Wallet's POST request by returning the stored, signed JAR payload containing the presentation requirements. The mobile OS simultaneously enforces physical proximity parameters (e.g., BLE/Wi-Fi Direct ranging) to prevent remote relay attacks.
</details>
<details><summary><strong>10. Wallet Unit verifies JAR signature against WRPAC</strong></summary>

The Wallet Unit cryptographically verifies the `Request Object` (JAR) using the public key extracted from the embedded WRPAC certificate (via `x5c`).
</details>
<details><summary><strong>11. Wallet Unit validates WRPAC certificate chain via LoTE</strong></summary>

The Wallet Unit validates the WRPAC's certificate chain against a known Trust Anchor found within the national List of Trusted Entities (LoTE).
</details>
<details><summary><strong>12. Wallet Unit evaluates disclosure policy against DCQL request</strong></summary>

The Wallet internally evaluates the RP's requested attributes (via DCQL) against any embedded disclosure policies within the stored credentials to ensure compliance.
</details>
<details><summary><strong>13. Wallet Unit displays consent screen to User</strong></summary>

The Wallet explicitly prompts the User with a screen summarizing the RP's requested attributes and requesting approval to share them.
</details>
<details><summary><strong>14. User approves attribute disclosure</strong></summary>

The User reviews the presentation request and taps to approve the sharing of the listed attributes.
</details>
<details><summary><strong>15. Wallet Unit authenticates User via biometric or PIN</strong></summary>

The Wallet enforces High Level of Assurance (LoA) by mandating local user authentication (e.g., FaceID, fingerprint, or a secure PIN) to unlock the cryptographic hardware keys bound to the credentials.
</details>
<details><summary><strong>16. Wallet Unit builds vp_token with SD-JWT VC and KB-JWT</strong></summary>

The Wallet constructs the response payload, selectively disclosing only the approved attributes and generating the Key Binding JWT (KB-JWT) to prove device possession.

```
<Issuer-signed JWT>~<Disclosure:family_name>~<Disclosure:given_name>~<Disclosure:birth_date>~<KB-JWT>
```

The KB-JWT structure handles the cross-device constraints:
- `aud`: Contains the cross-device WRPAC hash (`x509_hash://sha-256/Aq3B7yU0Vzf8-...`)
- `nonce`: Contains the cross-device session nonce (`n-0S6_WzA2Mj731SUjSn4B_...`)
</details>
<details><summary><strong>17. Wallet Unit encrypts response as JWE</strong></summary>

The Wallet fully encrypts the `vp_token` and state payload into a secure JSON Web Encryption (JWE) document using the RP's ephemeral ECDH-ES public key (extracted from `response_encryption_jwk`).

```json
{
  "alg": "ECDH-ES",
  "enc": "A256GCM",
  "kid": "<RP ephemeral key thumbprint>",
  "epk": {
    "kty": "EC",
    "crv": "P-256",
    "x": "<Wallet ephemeral X>",
    "y": "<Wallet ephemeral Y>"
  }
}
```
</details>
<details><summary><strong>18. Wallet Unit POSTs encrypted response to Relying Party response_uri</strong></summary>

The Wallet sends the encrypted JWE response back to the Relying Party's backend `response_uri`.

```http
POST /oid4vp/callback HTTP/1.1
Host: verifier.example-bank.de
Content-Type: application/x-www-form-urlencoded

response=<JWE compact serialization>
```
</details>
<details><summary><strong>19. Relying Party Instance decrypts JWE response</strong></summary>

The Relying Party backend retrieves the previously stored ephemeral private key (matching the `state`), decrypts the JWE, and instantly destroys the private key to uphold forward secrecy.

```json
{
  "vp_token": "<SD-JWT VC string as above>",
  "presentation_submission": {
    "id": "submission-1",
    "definition_id": "dcql-query-1",
    "descriptor_map": [
      {
        "id": "pid",
        "format": "dc+sd-jwt",
        "path": "$"
      }
    ]
  },
  "state": "xd-session-9f2a"
}
```

> **DCQL response format**: See §7 for the authoritative DCQL-native vs. legacy `presentation_submission` response format discussion.
</details>
<details><summary><strong>20. Relying Party Instance verifies SD-JWT and KB-JWT signatures</strong></summary>

The RP cryptographically verifies the SD-JWT issuer signature and the Wallet's dynamic KB-JWT signature, checking `aud` and `nonce` binding.
</details>
<details><summary><strong>21. Relying Party Instance checks credential revocation via Status List</strong></summary>

The RP queries the PID Provider's Status List using the encoded status index to see if the credential has been revoked or suspended.

```http
GET /status/1 HTTP/1.1
Host: pid-provider.example-ms.eu
Accept: application/statuslist+jwt
```

The RP decompresses the `lst` field (DEFLATE) and checks the bit at index `idx` from the credential's `status.status_list.idx` claim. Bit `0` = valid, bit `1` = revoked.
</details>
<details><summary><strong>22. Status List confirms credential validity to Relying Party Instance</strong></summary>

The Status List endpoint or cached response returns a `0` bit, confirming the credential is valid.
</details>
<details><summary><strong>23. Relying Party Instance extracts disclosed attributes from SD-JWT</strong></summary>

The RP algorithmically hashes the supplied SD-JWT disclosures, matching them against the main JWT, and extracts the verified attributes.
</details>
<details><summary><strong>24. Relying Party Instance binds verified attributes to laptop session via state</strong></summary>

The RP backend correlates the successfully evaluated presentation with the browser session waiting on the laptop using the `state` ID.
</details>
<details><summary><strong>25. Relying Party Instance pushes session update to laptop browser</strong></summary>

The RP backend signals the laptop browser (e.g., via WebSockets, Server-Sent Events, or polling) that the authentication has successfully completed.
</details>
<details><summary><strong>26. Laptop Browser renders authenticated service to User</strong></summary>

The laptop browser updates automatically, granting the User access to the requested digital service based on the attributes delivered via their smartphone.
</details>

#### 8.4 Security Considerations for Cross-Device Flows

Cross-device flows are vulnerable to **phishing and relay attacks**. Key mitigations:

| Threat | Mitigation | Mechanism |
|:-------|:-----------|:----------|
| **Phishing** | Origin verification | WRPAC `dNSName` verified by Wallet |
| **Relay attack** | Proximity check | OS-level proximity verification via DC API |
| **Session hijacking** | State binding | `state` parameter binds QR session to browser session |
| **Replay** | Nonce + time binding | Unique nonce per request + short JAR expiry |
| **Man-in-the-middle** | End-to-end encryption | JWE-encrypted response with ephemeral keys |

### 9. RP Authentication and Presentation Verification

#### 9.1 Authentication Steps (Wallet Side)

When the Wallet Unit receives a presentation request, it performs RP authentication in the following order:

1. **JAR signature verification** — Verify the JWT signature using the public key from the X.509 certificate in the JWT header
2. **Certificate chain validation** — Validate the WRPAC and intermediate certificates up to the LoTE trust anchor
3. **Revocation check** — Verify no certificate in the chain is revoked (CRL or OCSP)
4. **Origin verification** — In same-device flows, verify the `dNSName` in the WRPAC matches the origin of the request (enforced by browser/DC API)
5. **Registration verification** (optional, user-initiated) — If user has enabled it, check the WRPRC or query the Registrar API to verify the RP is registered for the requested attributes
6. **Disclosure policy evaluation** — If the requested attestation has an embedded disclosure policy, evaluate it against the WRPAC data

#### 9.2 Intermediary Authentication

When an intermediary acts on behalf of an intermediated RP:

- The **WRPAC** belongs to the intermediary → the Wallet authenticates the intermediary
- The **presentation request extension** contains the intermediated RP's identity (name, identifier, registrar URL, intended use ID)
- The **WRPRC** (if available) belongs to the intermediated RP → the Wallet verifies the intermediated RP's registration
- The Wallet displays **both identities** to the User: intermediary name AND intermediated RP name

#### 9.3 Verification Checklist for SD-JWT VC

After receiving and decrypting the response, the RP performs:

| Step | Verification | Failure Action |
|:-----|:-------------|:---------------|
| 1 | **Decrypt JWE** using ephemeral private key | Reject — corrupted response |
| 2 | **Parse vp_token** — extract SD-JWT VC | Reject — malformed response |
| 3 | **Verify Issuer JWT signature** using PID/Attestation Provider trust anchor from LoTE | Reject — untrusted issuer |
| 4 | **Validate Issuer JWT claims**: `exp`, `iat`, `vct` | Reject — expired or wrong type |
| 5 | **Verify Disclosures** — hash each Disclosure and check against `_sd` array | Reject — tampered disclosures |
| 6 | **Verify Key Binding JWT signature** using `cnf.jwk` from Issuer JWT | Reject — presenter != holder |
| 7 | **Validate KB-JWT claims**: `aud` (must be RP), `nonce` (must match request), `sd_hash` | Reject — replay or mismatch |
| 8 | **Check credential revocation** via Status List | Reject — revoked credential |
| 9 | **Validate combined presentation binding** (if multi-attestation) — verify same `cnf` key | Reject — credentials from different Wallet Units |
| 10 | **Extract attribute values** from verified Disclosures | Process — attributes trusted |

#### 9.4 Verification Checklist for mdoc (via ISO 18013-7/OpenID4VP)

| Step | Verification | Failure Action |
|:-----|:-------------|:---------------|
| 1 | **Decrypt JWE** | Reject |
| 2 | **Parse DeviceResponse CBOR** from vp_token | Reject |
| 3 | **Verify IssuerAuth** (COSE_Sign1) using Provider trust anchor | Reject |
| 4 | **Validate MSO**: docType, validityInfo, digestAlgorithm | Reject |
| 5 | **Verify each IssuerSignedItem** — compute digest, compare with MSO valueDigests | Reject |
| 6 | **Verify DeviceAuth** (COSE_Sign1/Mac0) using deviceKey from MSO | Reject — device not bound |
| 7 | **Validate SessionTranscript** binding | Reject — replay |
| 8 | **Check credential revocation** | Reject |
| 9 | **Extract data elements** from verified IssuerSignedItems | Process |

#### 9.5 Edge Cases and Error Handling

Real-world RP implementations must handle failure paths gracefully. The following table defines recommended RP behaviour for common edge cases:

| Edge Case | Recommended RP Behaviour | Assurance Impact |
|:----------|:------------------------|:-----------------|
| **Partial presentation**: User approves some but not all requested attributes | Accept the partial set if the RP's business logic can proceed without the missing attributes; otherwise inform the User which attributes are required and suggest a retry | Reduced — RP must evaluate if the subset is sufficient |
| **Expired credential**: PID `exp` has passed | Reject. Do NOT apply a grace period — the PID Provider has set a deliberate expiry. The Wallet Unit should not present expired credentials, but a malicious or buggy implementation might | None — untrusted |
| **Status List unavailable**: Network failure during revocation check | RPs must implement explicit fallback policies: <br/>**1. Fail-Closed (High Assurance)**: Reject presentation if endpoint is unreachable and cache is expired. Mandatory for KYC, AML, and PSD2 SCA.<br/>**2. Fail-Open (Low Assurance)**: Accept presentation with a degraded assurance flag in the audit log. Acceptable only for low-risk scenarios (e.g., informal age verification or venue access). | Varies by policy (Fail-Closed = None; Fail-Open = Degraded) |
| **Status List: status unknown** (bit value not 0 or 1) | Reject — treat any non-zero bit as revoked per Attestation Status List semantics | None |
| **Trust anchor rotation**: LoTE updated with new anchor; old certificates still in circulation | Accept both old and new anchors during a transition period (typically the validity overlap of the old and new LoTE). Log which anchor validated. | Full during overlap period |
| **Issuer certificate expired**: PID Provider's signing certificate has expired, but the PID itself is within validity | Reject. The issuer's certificate must be valid at the time of verification (not just at issuance time). The status should be checked against the LoTE. | None — issuer no longer trusted |
| **KB-JWT `iat` in the future**: Clock skew between Wallet and RP | Allow a clock skew tolerance of ±5 minutes. Log the skew for monitoring. | Full (if within tolerance) |
| **KB-JWT `nonce` mismatch** | Reject — this indicates either replay or a session mixup | None — possible attack |
| **KB-JWT `aud` mismatch** | Reject — the response was intended for a different RP | None — possible relay attack |
| **Multiple credentials in response** (combined presentation) | Verify each credential independently, then verify they share the same `cnf` key / device binding | Full only if binding verified |
| **Unknown `vct` value** | Reject if the RP cannot process the credential type. Log the unknown `vct` for monitoring. | N/A — cannot process |
| **Re-issued PID**: User presents a PID with a different `cnf.jwk` or `status.idx` than a previously seen PID for the same identity | Accept — re-issuance is expected when a PID expires, is revoked, or the User migrates to a new device. Match identity using `personal_identifier`, not `cnf.jwk` | Full — the PID Provider cryptographically guarantees continuity |
| **Batch-issued credentials**: User holds multiple active credentials of the same type | Accept whichever the Wallet presents. Do NOT assume a 1:1 relationship between User and credential serial. Some Users may have parallel valid PIDs (e.g., on two devices) | Full — each credential is independently valid |

> **Re-issuance and deduplication**: When a PID is re-issued (e.g., after revocation or expiry), the new PID has a **different** `cnf.jwk` (new device key), a **different** `status.status_list.idx`, and potentially a **different** Issuer JWT `sub`. The RP must perform user matching on the **PID attributes** (especially `personal_identifier`) rather than on cryptographic identifiers. If the RP stores `cnf.jwk` thumbprints as session binding keys, it must handle key rotation gracefully.

#### 9.6 OpenID4VP Error Responses

When the Wallet Unit cannot fulfil a presentation request, it returns an error response to the RP's `response_uri`. RPs must implement a comprehensive error handling strategy that gracefully degrades the user experience.

| Error Code | Root Cause | Graceful Degradation / UI Strategy |
|:-----------|:-----------|:-----------------------------------|
| `access_denied` | The User explicitly declined the presentation or consent | **Halt**: Display "Consent declined" message. Do not automatically retry. Offer fallback manual verification options (e.g., document upload). |
| `presentation_rejected` | Wallet evaluated RP request against local policy and rejected it | **Halt**: Inform User that their Wallet security policy blocked the request. Log incident; do not retry immediately. |
| `temporarily_unavailable` | Wallet is locked, busy, or missing backend connectivity | **Soft Retry**: Display "Wallet busy/unavailable". Show a manual "Try Again" button. |
| `invalid_client` | RP authentication failed (e.g., invalid client_id or revoked WRPAC) | **Fatal Error**: Show "Service configuration error". Alert RP DevOps immediately via monitoring. |
| `invalid_request` | The JAR is malformed, expired, or has invalid parameters | **Fatal Error**: Show "Service configuration error". Fix JAR construction; do not retry with the same request. |
| `vp_formats_not_supported` | The Wallet does not support the requested credential format | **Auto-Fallback**: Silently retry with an alternative format (e.g., if mdoc `mso_mdoc` fails, request `dc+sd-jwt`). |
| `invalid_scope` | The requested credentials/attributes are missing from Wallet | **Degrade**: Wait for timeout, or gracefully prompt User that they lack required credentials. Offer option to retry with a reduced attribute scope if acceptable for business logic. |
| `server_error` | Internal Wallet crash or unknown error | **Auto-Retry**: Retry under-the-hood (max 2 times, 2–5s delay) before showing a generic "Wallet encountered an error" message with a "Try Again" button. |

The error is posted to `response_uri` as form-encoded:

```http
POST /oid4vp/callback HTTP/1.1
Host: verifier.example-bank.de
Content-Type: application/x-www-form-urlencoded

error=access_denied&error_description=User+declined+the+request&state=af0ifjsldkj
```

> **Implementation note**: The `state` parameter is always included in error responses, allowing the RP to correlate the error with the originating session. RPs should implement a separate error handling path on their `response_uri` endpoint to distinguish error responses from successful presentations.

#### 9.7 Error Recovery and Retry Strategies

Production RP implementations must handle failure modes gracefully. The following patterns are recommended:

**Retry classification by error code:**

| Error Code | Retryable? | Strategy | Session Handling |
|:-----------|:-----------|:---------|:-----------------|
| `invalid_request` | ❌ No | Fix the JAR construction; do not retry with the same request | Terminate session; generate new nonce + ephemeral keys on next attempt |
| `access_denied` | ❌ No | User explicitly declined; retrying is a UX anti-pattern | Terminate session; offer alternative verification methods |
| `vp_formats_not_supported` | ✅ Yes (once) | Retry with alternative format (`dc+sd-jwt` ↔ `mso_mdoc`) | Reuse session state; generate new nonce |
| `invalid_scope` | ✅ Yes (once) | Retry with reduced attribute set (e.g., drop optional claims) | Reuse session state; generate new nonce |
| `server_error` | ✅ Yes (limited) | Retry after 2–5 second delay; maximum 2 retries | Generate fresh nonce **and** ephemeral keys per retry |

**Timeout and Orphaned Session handling:**

A critical resiliency challenge for RPs is managing orphaned sessions, particularly during cross-device flows where the Wallet might crash, the user might close the Wallet app midway, or network connectivity might drop after the QR scan.

| Scenario | Recommended Timeout | RP Action & Session Handling |
|:---------|:-------------------|:-----------------------------|
| **Same-device DC API call** | 60 seconds | Browser API timeout (`navigator.credentials.get`). Catch `NotAllowedError` or timeout exceptions. Show localized "Wallet not responding" with a seamless button to switch to cross-device mode. |
| **Cross-device QR scan** | 120 seconds | Poll `request_uri` endpoint for Wallet fetch. If the Wallet never fetches the JAR, the session is abandoned. Invalidate the generated nonce, expire the QR code from UI, and offer a "Refresh QR" button. |
| **Cross-device Orphaned Session** (Wallet fetched JAR, no response) | 300 seconds | The Wallet scanned the QR and requested the JAR but never POSTed to `response_uri`. The RP must run a background sweeper to cull these "orphaned sessions". Do not poll indefinitely. Display timeout to User and allow restart. |
| **`response_uri` callback** (after Wallet sends response) | 30 seconds | Server-side timeout on HTTP POST. If the connection drops during payload transmission, treat as `server_error`. |

**Session security on retry:**

> **Critical**: When retrying after an error, the RP **MUST** generate a new `nonce` for each retry attempt. Reusing nonces across retries creates a replay attack vector. Ephemeral keys for JWE response encryption **SHOULD** also be regenerated, as the original key pair may have been logged by a failed Wallet interaction.

**Graceful degradation flow:**

```
Same-device attempt → (fails) → Cross-device fallback → (fails) → Manual verification
```

RPs should implement at least two fallback layers. If both same-device and cross-device flows fail, the RP should offer traditional identity verification methods (e.g., document upload, in-person visit) rather than blocking the user entirely.

#### 9.8 Pre-Production Conformance Testing

Before deploying to production, RPs **MUST** validate their OpenID4VP and HAIP implementation against an authoritative reference to ensure ecosystem interoperability. 

On February 26, 2026, the OpenID Foundation (OIDF) officially launched the **OpenID4VP and HAIP Conformance Suite**. This provides an automated testing harness that acts as a simulated Wallet Unit, rigorously exercising the RP's request generation and response validation logic.

**RP Conformance Testing Strategy:**
1. **HAIP Profile Validation**: The suite verifies that the RP strictly adheres to the High Assurance Interoperability Profile (HAIP). This includes validating that the RP uses DCQL for credential querying, supports `direct_post.jwt` for response modes, and properly enforces ephemeral key pairs for JWE encryption.
2. **Negative Testing & Edge Cases**: The suite intentionally injects malformed signatures, modified disclosure hashes, expired KB-JWTs, and invalid certificate chains (simulating revoked WRPACs) to ensure the RP's validation pipeline fails closed correctly.
3. **Automated CI Integration**: RPs should integrate the OIDF Conformance Suite into their CI/CD pipelines as an automated gating mechanism. It exposes a programmatic API that allows scheduled runs against staging environments.
4. **Self-Certification**: Passing the conformance suite allows the RP to claim official OIDF self-certification. While not strictly a legal equivalent to an eIDAS 2.0 audit, it provides robust technical assurance that the RP will interoperate seamlessly with any certified EUDI Wallet in the ecosystem.

For Relying Parties leveraging intermediaries or gateways (as described in §17), the intermediary vendor is responsible for maintaining this conformance. RPs should request the vendor's conformance certification report as part of their procurement due diligence.

#### 9.9 Trust Boundaries: WUA, Device Binding, and ZKP Roadmap

Three trust-boundary clarifications are critical for RP architects designing verification pipelines:

**1. Wallet Unit Attestation (WUA) is NOT presented to RPs.**

The Wallet Unit Attestation (WUA, specified in TS3) proves that a Wallet Unit is genuine — certified by a Wallet Provider and running on a properly secured WSCA/WSCD. However, per ARF v2.8.0, the WUA is used **only during issuance** (between the Wallet Unit and the PID/Attestation Provider). The RP does **not** receive the WUA during presentation. The RP's trust in the Wallet Unit is *indirect*: a valid PID implies a valid Wallet Unit, because the PID Provider verified the WUA before issuing the PID.

> **RP implication**: Do not design verification pipelines that expect to receive or validate a WUA. The trust signal for the RP is the PID/attestation validity itself, not a separate Wallet attestation.

**2. Device binding is recommended, not mandatory (ARF Topic Z).**

ARF v2.6.0 integrated Discussion Paper Topic Z on device-bound attestations, which changed device binding from **mandatory** to **recommended**. This means some attestations may not have a `cnf` (confirmation) claim binding the credential to a specific device key. RPs should handle both cases:

| Scenario | RP Verification | Assurance Level |
|:---------|:----------------|:----------------|
| **Device-bound attestation** (`cnf` present) | Verify KB-JWT signature against `cnf.jwk` | High — proves the presenting device holds the private key |
| **Non-device-bound attestation** (no `cnf`) | Verify issuer signature only; no device binding check | Medium — proves the attestation is authentic but not which device holds it |

> **RP guidance**: For high-assurance use cases (financial, healthcare), RPs should preferentially request device-bound attestations. For low-assurance use cases (age verification, newsletter sign-up), non-device-bound attestations are acceptable. The RP's DCQL query cannot currently enforce device binding — this is an issuer-level policy decision.

**3. Credential churn is by-design, not an error (Topic A + Topic B).**

RPs should expect that a **single user presents different attestation instances** across sessions. Privacy-preserving mitigation measures (§9.10) mean that Attestation Providers frequently re-issue PIDs and attestations — with new salts, new key pairs, new status indices, and new signature values — to limit linkability. A user who authenticated yesterday with PID instance A may authenticate today with PID instance B — structurally different in every cryptographic aspect — but representing the same underlying identity.

RPs should:
- **Never use raw attestation-level identifiers** (e.g., `cnf.jwk` thumbprint, `status_list.idx`, `_sd` hashes) as stable user identifiers. Use application-level identifiers (`personal_identifier` from PID, or pseudonym).
- **Handle key rotation gracefully.** The `cnf.jwk` in a re-issued PID will differ from the original. Session continuity should be based on `personal_identifier` + application session tokens, not device keys.
- **Expect varying credential freshness.** A once-only attestation (Method A) may have a validity window of minutes; a limited-time attestation (Method B) may be valid for hours or days. Both are legitimate and must be accepted.

Topic B (v0.9, Feb 2025) establishes the re-issuance lifecycle: re-issuance is triggered automatically by the Wallet Unit when a credential nears its technical validity expiry, or when once-only attestation inventory runs low. The User is typically not involved — re-issuance is silent and invisible to the User.

> **Cross-reference**: §9.10 (the four mitigation methods and RP anti-linkability obligations), Topic A (privacy risks), Topic B (re-issuance triggers and Refresh Token/DPoP binding).

**4. Zero-Knowledge Proofs (ZKP) and the Evolving Verification Pipeline.**

While SD-JWT VC and mdoc rely on the selective disclosure of exact, unhashed attribute values, upcoming ARF specifications (Topic G, TS4, TS13, and TS14) define mechanisms for **Zero-Knowledge Proofs (ZKP)**. ZKPs fundamentally shift the RP verification paradigm: instead of validating a JWS signature over a disclosed scalar value (e.g., `birth_date = "1990-01-01"`), the RP mathematically verifies a derived cryptographic proof without ever seeing the raw data.

When available, ZKPs will enable advanced, privacy-preserving predicate proofs, such as:

- **Range proofs**: Proving the abstract predicate `age ≥ 18` or `age > 21` without revealing the actual `birth_date`.
- **Set membership proofs**: Proving `nationality ∈ {EU Member States}` without revealing the specific Member State.
- **Predicate/Arithmetic proofs**: Proving `account_balance > €5,000` or `income > €50,000` without disclosing the exact financial figure.

**Impact on the RP Cryptographic Pipeline**

The introduction of TS14-compliant ZKP proofs (likely based on BBS+ Signatures or similar advanced schemes) will drastically alter the RP's backend validation sequence. Currently, parsing an SD-JWT VC involves symmetric hashing and standard ECDSA/EdDSA signature verification. With ZKP predicate proofs, the pipeline logic shifts:

1. **Proof Request Construction**: Instead of requesting specific claim names (e.g., `$.birth_date`) in the DCQL query, the RP must formulate a mathematical predicate request (e.g., `$.age ≥ 18`).
2. **Payload Parsing**: The Wallet responds not with an array of disclosed claims and a standard Issuer JWS, but with a complex ZKP payload (e.g., a BBS+ Proof or an Anonymous Credential presentation).
3. **Mathematical Proof Validation**: The RP backend bypasses standard JWS validation for the specific predicate. Instead, it must run a specialized pairing-based cryptographic verification algorithm to ensure the derived proof holds true against the issuer's public key, *without* having the underlying attribute value to hash.
4. **Binding Verification**: The RP must ensure the ZKP proof is cryptographically bound to the same session/nonce as the rest of the presentation, preventing proof-replay attacks.

> **Current status**: ZKP specifications remain under active development in the ARF. No production EUDI Wallet implementations currently support ZKP predicate presentation. However, RP architects must design their verification pipelines to be **proof-type-agnostic**. The validation engine should employ a pluggable architecture: treating SD-JWT hashing, mdoc signature validation, and future ZKP mathematical verification as discrete, swappable cryptographic modules to seamlessly adopt TS14 when formalized.

---

#### 9.10 Linkability-Resistant Verification Practices

The EUDI Wallet architecture includes deliberate mechanisms to prevent Relying Parties (and colluding parties) from tracking users across transactions. ARF Discussion Paper Topic A (v1.0, Jan 2025) and Topic B (v0.9, Feb 2025) establish the privacy threat model and mitigation framework. This section translates those architectural decisions into concrete RP verification practices.

##### 9.10.1 The Linkability Problem for RPs

Attestations contain **unique elements** — salts, hash arrays (`_sd`), issuer signatures, public keys (`cnf.jwk`), status list indices (`status_list.idx`), timestamps (`iat`, `exp`) — that are **fixed for the lifetime of a single credential instance**. If an RP stores these elements beyond the immediate verification session, it can correlate presentations and build a persistent user profile, even without the user's PID attributes.

The ARF formally catalogues four linkability threats (referenced in §24.2):

| Threat | Description |
|:-------|:------------|
| **TR36** | Cross-RP attestation linkage via fixed unique elements (same salt, same hash, same signature across presentations of the same credential) |
| **TR39** | Unlawful tracing via unique or traceable identifiers (status list index, `cnf.jwk` thumbprint) |
| **TR84** | Colluding RPs or Attestation Providers combining stored elements to derive identity data |
| **TR85** | Tracking via PID when identification is unnecessary (over-identification) |

Two distinct linkability vectors exist:
- **RP linkability** — the RP itself (or colluding RPs) correlates presentations
- **Attestation Provider linkability** — the issuer can correlate because it knows all unique values embedded in the credential it issued

##### 9.10.2 Four Attestation Provider Mitigation Methods

PID Providers and Attestation Providers will employ one or more of the following methods (Topic A §3.2–3.5) to reduce the correlation surface available to RPs:

| Method | Name | Mechanism | What the RP Sees | Privacy Level |
|:-------|:-----|:----------|:-----------------|:--------------|
| **A** | **Once-only attestations** | Each attestation is presented only once, then discarded. The Wallet manages a batch inventory, requesting re-issuance before running out (saw-tooth model). | Every presentation uses a completely unique credential instance — different salts, different signature, different `cnf.jwk`. | Full mitigation; maximum privacy |
| **B** | **Limited-time attestations** | Short technical validity period (hours to days). The same attestation is reusable within its validity window but replaced frequently via re-issuance. | RP may see the same unique elements if the same user presents within the validity window. | Partial — linkability risk proportional to presentation frequency within each window |
| **C** | **Rotating-batch attestations** | Batch of N attestations issued simultaneously. The Wallet selects randomly from the batch for each presentation. The entire batch is replaced at expiry. | RP sees different unique elements ~(N-1)/N of the time. Correlation probability decreases with batch size. | Partial — improves with larger batch size |
| **D** | **Per-RP attestations** | A different attestation instance is used for each RP. The same attestation is always presented to the same RP. | RP sees a stable credential per user. Cross-RP correlation is impossible because different RPs never see the same attestation instance. | Full cross-RP mitigation; same-RP linkability remains |

> **What this means for RPs**: Credential churn is by-design. The same user may present structurally different attestation instances across sessions — different `cnf.jwk`, different `status_list.idx`, different disclosures — but with the same underlying identity. RPs must design verification pipelines that do not assume credential stability. See also §9.9 point 4 on credential churn.

##### 9.10.3 RP Anti-Linkability Obligations

Topic A §4.2 and §6.1 establish concrete obligations for RPs to minimise linkability. These translate into the following verification practices:

1. **Do not persist unique attestation elements.** Salts, `_sd` hash arrays, issuer signature values, `cnf.jwk` thumbprints, and raw `status_list.idx` values MUST NOT be stored beyond the active verification session, unless required for a specific, lawful, documented purpose (e.g., regulatory retention of the verification result — but NOT the raw credential data).

2. **Do not use attestation elements as session identifiers.** The `cnf.jwk` thumbprint, KB-JWT `jti`, or status list index must never serve as user-session correlation keys. Use application-level session tokens generated independently of attestation content.

3. **Download Attestation Status Lists at scheduled intervals.** Do not fetch Status Lists per-presentation. Per-presentation fetches create a timing signal that reveals to the Attestation Provider exactly when a user presents to an RP. Instead, implement a central fetcher that downloads all relevant Status Lists on a regular schedule (e.g., hourly or daily, aligned with the Status List's `max-age` directive).

4. **Do not authenticate when downloading Status Lists.** Anonymous HTTP GET is required — no client certificate, no bearer token, no cookies. Authenticated fetches would reveal the RP's identity to the Attestation Provider, enabling Provider-side user tracking.

5. **Distribute Status Lists internally.** From the central fetcher, distribute cached Status Lists to all RP Instances via an internal channel (e.g., shared cache, message bus). Individual RP Instances should never contact the Status List endpoint directly per User interaction.

6. **Audit for stored unique elements.** Include a regular audit of persistent storage (databases, application logs, analytics platforms, data warehouses) to ensure no unique attestation elements are inadvertently retained by logging frameworks or analytics pipelines.

> **Implementation pattern**: A recommended architecture separates the *verification layer* (where attestation elements are processed in-memory, verified, and immediately discarded) from the *application layer* (where only the verified claims — `family_name`, `birth_date`, etc. — and an application-generated session token are persisted).

##### 9.10.4 Attestation Provider Linkability (Residual Risk)

Even with all RP-side mitigations in place, **Attestation Provider linkability cannot be fully eliminated** without Zero-Knowledge Proofs. The Provider knows every unique value it embedded in each credential. If a colluding RP shares the raw attestation elements (salts, signature, `cnf.jwk`) with the Provider, the Provider can identify exactly which user presented.

Current mitigations are **organisational**, not technical:
- Audit and enforcement by supervisory authorities
- Access certificate revocation for RPs found sharing attestation elements
- GDPR Art. 83 fines for unlawful processing

The ARF's ZKP roadmap (§9.9, TS4, TS13, TS14) aims to technically eliminate this residual risk. BBS+ signatures and pairing-free BBS schemes would allow the Wallet to generate a derived proof that the Attestation Provider cannot correlate with the original credential. Until ZKP is production-ready, the organisational mitigations remain the primary safeguard.

> **Cross-references**: §24.2 (threat catalogue — T11–T14), §9.9 (ZKP roadmap), Annex B (Status List verification pipeline), §25.3 (audit trail requirements — note: log attribute *names* not values).

---

### 10. Cryptographic Verification Pipeline Deep-Dive

This chapter provides a bit-level, technically actionable breakdown of the required cryptographic verification processes for RP backends. It translates the high-level authentication criteria from Section 9 into concrete byte-parsing, hashing, and signature validation logic.

#### 10.1 `direct_post.jwt` JARM Response Unwrapping

When the RP requests `response_mode=direct_post.jwt` (JARM — JWT Secured Authorization Response Mode), the Wallet does not POST a plain JSON object or a transparent JWE containing the `vp_token`. Instead, it POSTs a signed and encrypted JWT that wraps the actual presentation response, fundamentally changing the unwrapping pipeline.

```mermaid
flowchart TD
    A["`**1.&nbsp;HTTP&nbsp;POST&nbsp;Payload**
    Form&nbsp;urlencoded&nbsp;string:&nbsp;response=<JWE>`"]
    B["`**2.&nbsp;Transport&nbsp;Decryption&nbsp;(JWE)**
    Decrypt&nbsp;using&nbsp;RP's&nbsp;ephemeral&nbsp;private&nbsp;key`"]
    C["`**3.&nbsp;Authorisation&nbsp;Response&nbsp;Verification&nbsp;(JWS)**
    Verify&nbsp;signature&nbsp;+&nbsp;validate&nbsp;iss,&nbsp;aud,&nbsp;exp`"]
    D["`**4.&nbsp;Payload&nbsp;Extraction&nbsp;&&nbsp;Binding&nbsp;Check**
    Extract&nbsp;vp_token&nbsp;and&nbsp;match&nbsp;state&nbsp;to&nbsp;session`"]

    A --> B --> C --> D

    style A text-align:left
    style B text-align:left
    style C text-align:left
    style D text-align:left
```

The unwrapping process follows a strict sequence:

1. **Transport Decryption (JWE)**: The HTTP POST payload is a form-urlencoded string: `response=<JWE>`. The RP decrypts this JWE using the private key corresponding to the ephemeral public key (`response_encryption_jwk`) it generated and sent in the presentation request JAR.
   - **Algorithm**: Typically `ECDH-ES` with `A256GCM` (or `X25519`).
   - **Output**: A decrypted JWS.
2. **Authorisation Response Verification (JWS)**: The decrypted payload is a JWS. The RP must verify this signature to ensure the response originated from the target Wallet Unit and hasn't been tampered with.
   - **Key**: The Wallet's ephemeral public key or device public key.
   - **Claims**: Validate `iss`, `aud` (must precisely match the RP's `client_id`), and `exp`.
3. **Payload Extraction**: Once the JWS signature is verified, the RP extracts the payload. This is the actual presentation response containing the `vp_token`, `presentation_submission` (if PEX is used), and `state`.
   - **Binding Check**: The decrypted `state` parameter must be securely checked against the RP's session storage. This prevents Cross-Site Request Forgery (CSRF) and session mix-up attacks.

#### 10.2 SD-JWT VC Parsing and Validation Logic

The SD-JWT VC format introduces selective disclosure via a pre-computed recursive hash-chain mechanism. The `vp_token` string is constructed as a tilde-separated (`~`) list of components: `<Issuer_JWT>~<Disclosure_1>~...~<Disclosure_N>~<KB_JWT>`.

```mermaid
flowchart TD
    VP["`**vp_token&nbsp;Input&nbsp;String**
    <Issuer_JWT>~<Disclosure_1>~...~<KB_JWT>`"]

    subgraph Split["`**Phase&nbsp;1:&nbsp;Parsing&nbsp;&&nbsp;Splitting**`"]
        direction LR
        Iss["`**Issuer&nbsp;JWT**
        Verify&nbsp;via&nbsp;LoTE`"]
        Disc["`**Disclosures**
        Array&nbsp;of&nbsp;base64url`"]
        KB["`**KB-JWT**
        Key&nbsp;Binding&nbsp;proof`"]
        Iss ~~~ Disc ~~~ KB
    end

    VP --> Iss
    VP --> Disc
    VP --> KB
    
    Iss --> IssVer["`**Phase&nbsp;2A:&nbsp;Issuer&nbsp;Processing**
    Extract&nbsp;_sd&nbsp;arrays&nbsp;from&nbsp;verified&nbsp;payload`"]

    Disc --> DiscHash["`**Phase&nbsp;2B:&nbsp;Disclosure&nbsp;Hashing**
    Hash&nbsp;raw&nbsp;base64url&nbsp;strings&nbsp;and&nbsp;match&nbsp;against&nbsp;_sd`"]

    KB --> KBVer["`**Phase&nbsp;3:&nbsp;Device&nbsp;Binding**
    Validate&nbsp;KB‑JWT&nbsp;signature&nbsp;using&nbsp;cnf.jwk
    Check&nbsp;aud,&nbsp;nonce,&nbsp;and&nbsp;sd_hash`"]

    style VP text-align:left
    style Iss text-align:left
    style Disc text-align:left
    style KB text-align:left
    style IssVer text-align:left
    style DiscHash text-align:left
    style KBVer text-align:left
```

**Phase 1: Parsing and Issuer Verification**
1. Split the raw string by the `~` delimiter.
2. The first element is the **Issuer JWT**. Decode its header and verify the signature using the PID/Attestation Provider's public key (retrieved via the designated Trust Anchor in the LoTE).
3. Extract the `_sd_alg` claim (which defaults to `sha-256`) and the `_sd` array from the payload.

**Phase 2: Disclosure Array Hashing (Bit-Level)**
For every disclosure string in the input sequence, the RP must independently verify its cryptographic integrity to guarantee the Wallet hasn't fabricated attributes:
1. Base64url-decode the disclosure string. The result is a JSON array: `[<salt>, <claim_name>, <claim_value>]`.
2. **Critical Step**: Re-encode the *identical* Base64url disclosure string. Do not use the parsed JSON to regenerate the string, as whitespace and structural variances will corrupt the hash. Use the raw `<Disclosure>` string as it was received.
3. Compute the hash of the raw disclosure string using the algorithm specified in `_sd_alg` (e.g., `SHA-256("wyz...abc")`).
4. Base64url-encode the resulting byte array.
5. Search for this exact encoded hash within the `_sd` array of the Issuer JWT (or within nested object `_sd` arrays if applicable).
   - *If the hash is found*: The claim is cryptographically authentic. Insert the `<claim_name>` and `<claim_value>` into the verified identity dataset.
   - *If the hash is missing*: The disclosure is fabricated or tampered with. Reject the presentation immediately.

**Phase 3: Key Binding JWT (KB-JWT) Validation**
The final element in the tilde-separated string is the Key Binding JWT, which proves the presenter possesses the physical device key bound to the credential by the Issuer.
1. Parse the KB-JWT.
2. Locate the Confirmation Claim (`cnf`) in the verified Issuer JWT. This contains the required key inside the `jwk` property.
3. Verify the KB-JWT's signature using the exact `cnf.jwk` key.
4. **Payload Validation**:
   - `aud`: Must perfectly match the RP's identifying URI (or `client_id`).
   - `nonce`: Must perfectly match the nonce the RP provided in its request JAR.
   - `sd_hash`: Must be the `SHA-256` hash of the entire SD-JWT string *excluding* the trailing `~<KB-JWT>` suffix. This proves the KB-JWT signature is bound to this specific subset of disclosures.

#### 10.3 mdoc (ISO 18013-5) CBOR Parsing: MAC vs. Signature

Unwrapping an mdoc `vp_token` requires parsing binary CBOR structures (the `DeviceResponse`). The mdoc structure natively supports complex verification through layered cryptographic proofs managed entirely at the CBOR level.

```mermaid
flowchart TD
    DR["`**DeviceResponse&nbsp;(CBOR)**
    Decrypted&nbsp;from&nbsp;vp_token`"]

    subgraph Auth["`**Dual&nbsp;Authentication&nbsp;Paths**`"]
        direction LR
        IA["`**IssuerAuth&nbsp;(Asymmetric)**
        Proves&nbsp;Attestation&nbsp;Provider&nbsp;issuance
        and&nbsp;guarantees&nbsp;attribute&nbsp;integrity`"]
        DA["`**DeviceAuth&nbsp;(Asymmetric&nbsp;/&nbsp;Symmetric)**
        Proves&nbsp;the&nbsp;presenter&nbsp;possesses&nbsp;the
        device&nbsp;key&nbsp;bound&nbsp;by&nbsp;the&nbsp;Issuer`"]
        IA ~~~ DA
    end

    DR --> IA
    DR --> DA

    IA --> MSO["`**1. Validate MSO**
    Verify COSE_Sign1 via LoTE X.509 chain`"]
    MSO --> Dig["`**2. Digest Verification**
    Hash returned items, compare to MSO valueDigests`"]

    DA --> DS["`**1A. deviceSignature**
    Verify COSE_Sign1 using MSO deviceKey`"]
    
    DA --> DM["`**1B. deviceMac**
    Verify COSE_Mac0 via Ephemeral ECDH key`"]

    style DR text-align:left
    style IA text-align:left
    style DA text-align:left
    style MSO text-align:left
    style Dig text-align:left
    style DS text-align:left
    style DM text-align:left
```

**Parsing the CBOR Hierarchy**
The decrypted `vp_token` is a `DeviceResponse` CBOR structure containing an array of `documents`. Each document maps to a single credential (e.g., a PID) and contains an `issuerSigned` structure and a `deviceSigned` structure.

**IssuerAuth (Asymmetric Signature)**
- **Purpose**: Proves the PID Provider issued the credential and that the individual attributes have not been altered.
- **Structure**: The `issuerAuth` element is a `COSE_Sign1` object.
- **Validation**: The RP extracts the `MobileSecurityObject` (MSO) from the `issuerAuth` payload, locates the PID Provider's signing certificate within the `x5chain`, validates the certificate against the LoTE, and verifies the `COSE_Sign1` signature over the MSO.
- **Data Integrity**: For every returned attribute in `nameSpaces`, the RP CBOR-encodes the element as an `IssuerSignedItem`, computes its SHA-256 hash, and verifies that this precise digest exists in the MSO's `valueDigests` map.

**DeviceAuth (MAC vs. Asymmetric Signature)**
- **Purpose**: Proves the presenting Wallet Unit holds the precise private key bound to the credential by the PID Provider (Device Binding).
- **Mechanism**: The `deviceAuth` structure contains either a `deviceSignature` (`COSE_Sign1`) or a `deviceMac` (`COSE_Mac0`).
  1. **deviceSignature (Asymmetric)**: Used primarily in online remote presentation (OpenID4VP) or unattended proximity flows. The Wallet signs the `SessionTranscript` using its ECDSA or EdDSA private device key. The RP verifies this signature using the `deviceKey` public key embedded inside the verified MSO.
  2. **deviceMac (Symmetric MAC)**: Used in specific offline proximity scenarios (BLE/NFC) where performance or protocol constraints favor symmetric cryptography. The Wallet and the Reader establish an ephemeral shared secret component via ECDH during device engagement. The `SessionTranscript` is MACed using an HMAC key derived from both the mdoc's device key and the Reader's ephemeral key. The RP derives the identical key, computes the same MAC, and compares it.
- **Replay Prevention**: Both methods cryptographically bind the proof to the `SessionTranscript`, which securely incorporates nonces and ephemeral public keys unique to the current transaction. This mechanism mathematically invalidates playback attacks.


### 11. Proximity Presentation Flows: ISO 18013-5, Supervised, and Unsupervised

#### 11.1 ISO/IEC 18013-5 Protocol Overview

ISO/IEC 18013-5 defines the interface between an **mdoc** (Wallet Unit) and an **mdoc reader** (RP Instance) for proximity-based credential exchange. The protocol is designed for face-to-face scenarios where the User physically presents their device to a terminal.

The proximity protocol uses three physical transport layers:

| Transport | Range | Typical Use Case |
|:----------|:------|:-----------------|
| **NFC** | < 10 cm | Initial device engagement (tap-to-share) |
| **BLE** | < 30 m | Data transfer after engagement |
| **Wi-Fi Aware** | < 50 m | High-bandwidth data transfer |

The protocol proceeds in four phases: Device Engagement → Session Establishment → Data Retrieval → Session Termination.

#### 11.2 ISO/IEC 18013-5 Protocol Messages

| Message | Direction | Content |
|:--------|:----------|:--------|
| **DeviceEngagement** | Wallet → Reader | Wallet's ephemeral public key + transport options |
| **SessionEstablishment** | Reader → Wallet | Reader's ephemeral public key + encrypted DeviceRequest |
| **DeviceRequest** | Reader → Wallet | Requested namespaces/elements + ReaderAuth (WRPAC) |
| **DeviceResponse** | Wallet → Reader | IssuerSigned data + DeviceAuth + selected elements |
| **SessionTermination** | Either | Status code (session end) |

#### 11.3 Supervised Flow Description

In the **supervised proximity flow**, the RP has an employee or agent present who operates the mdoc reader terminal. The employee may visually verify the User's identity by comparing the photo in the PID with the person presenting. This flow is used at:

- Border control (passport/ID verification)
- Banking branch KYC (customer onboarding)
- Healthcare reception (patient identification)
- Age-restricted sales (supervised verification)
- Government counters (public service delivery)

#### 11.4 Supervised Flow Sequence Diagram (Direct RP Model)

```mermaid
---
config:
  themeVariables:
    noteBkgColor: "transparent"
    noteBorderColor: "transparent"
  sequence:
    messageAlign: left
    noteAlign: left
    actorMargin: 150
---
sequenceDiagram
    participant User as 👤 User
    participant WU as 📱 Wallet Unit
    participant Reader as 🖥️ mdoc Reader<br/>(RP terminal)
    participant Agent as 👨‍💼 RP Agent

    rect rgba(148, 163, 184, 0.14)
    Note right of User: Phase 1: Device Engagement
    Agent->>User: 1. Request credential presentation
    User->>WU: 2. Open Wallet, select credential
    WU->>WU: 3. Generate ephemeral EC key pair
    WU->>Reader: 4. NFC tap: DeviceEngagement
    end

    rect rgba(52, 152, 219, 0.14)
    Note right of User: Phase 2: Session and Request
    Reader->>Reader: 5. Generate ephemeral EC key pair
    Reader->>Reader: 6. Derive session keys (ECDH)
    Reader->>WU: 7. BLE: SessionEstablishment +<br/>encrypted DeviceRequest
    end

    rect rgba(46, 204, 113, 0.14)
    Note right of User: Phase 3: Wallet Processing
    WU->>WU: 8. Decrypt DeviceRequest
    WU->>WU: 9. Verify ReaderAuth (WRPAC)
    WU->>WU: 10. Validate WRPAC chain (LoTE)
    WU->>WU: 11. Check WRPAC revocation
    WU->>User: 12. Display consent screen
    User->>WU: 13. Approve attributes
    WU->>WU: 14. User auth (WSCA/WSCD)
    WU->>WU: 15. Build DeviceResponse
    WU->>Reader: 16. BLE: Encrypted DeviceResponse
    end

    rect rgba(241, 196, 15, 0.14)
    Note right of User: Phase 4: Verification
    Reader->>Reader: 17. Decrypt DeviceResponse
    Reader->>Reader: 18. Verify IssuerAuth (MSO sig)
    Reader->>Reader: 19. Verify data element digests
    Reader->>Reader: 20. Verify DeviceAuth
    Reader->>Agent: 21. Display: portrait + attributes
    Agent->>Agent: 22. Visual comparison
    Agent->>Reader: 23. Confirm identity match
    Note right of Agent: ⠀
    end
```

<details><summary><strong>1. RP Agent requests credential presentation from User</strong></summary>

The Relying Party Agent (e.g., a bank teller or border guard) verbally or physically requests the User to present their credentials for verification.
</details>
<details><summary><strong>2. User opens Wallet Unit and selects credential</strong></summary>

The User opens their EUDI Wallet Unit application and navigates to the specific credential requested (e.g., PID or a specific Attestation).
</details>
<details><summary><strong>3. Wallet Unit generates ephemeral EC key pair</strong></summary>

The Wallet Unit locally generates an ephemeral Elliptic Curve key pair (ECDH) specifically for this upcoming transaction to ensure forward secrecy during the proximity exchange.
</details>
<details><summary><strong>4. User taps device on mdoc Reader via NFC (DeviceEngagement)</strong></summary>

The User taps their smartphone against the RP's mdoc Reader terminal. The Wallet transmits the `DeviceEngagement` structure via NFC short-field communication.

```
DeviceEngagement = {
  0: "1.0",                              ; version
  1: [                                    ; security
    1,                                    ; cipher suite 1 (EC P-256)
    h'<mdoc ephemeral public key COSE_Key>'
  ],
  2: [                                    ; device retrieval methods
    [                                     ; BLE
      2,                                  ; type: BLE
      1,                                  ; version
      {                                   ; BLE options
        0: true,                          ; peripheral server mode
        1: h'A1B2C3D4E5F6...',            ; UUID
        10: h'<device address>'           ; peripheral address
      }
    ]
  ]
}
```
</details>
<details><summary><strong>5. mdoc Reader generates ephemeral EC key pair</strong></summary>

The mdoc Reader terminal generates its own ephemeral Elliptic Curve key pair in response to receiving the Wallet's engagement payload.
</details>
<details><summary><strong>6. mdoc Reader derives symmetric session keys via ECDH</strong></summary>

The mdoc Reader derives symmetric session keys via ECDH and HKDF using its newly generated private key and the Wallet's ephemeral public key received in Step 4.
</details>
<details><summary><strong>7. mdoc Reader sends encrypted DeviceRequest over BLE</strong></summary>

The mdoc Reader switches to the Bluetooth Low Energy (BLE) channel advertised in the engagement payload and transmits the `SessionEstablishment` message along with the AES-GCM encrypted `DeviceRequest`.

```
DeviceRequest = {
  "version": "1.0",
  "docRequests": [
    {
      "itemsRequest": 24(<<              ; CBOR tag 24: embedded CBOR
        {                                 ; ItemsRequest
          "docType": "eu.europa.ec.eudi.pid.1",
          "nameSpaces": {
            "eu.europa.ec.eudi.pid.1": {
              "family_name": true,        ; IntentToRetain
              "given_name": true,
              "portrait": true,
              "birth_date": true
            }
          }
        }
      >>),
      "readerAuth": [                     ; COSE_Sign1
        h'a10126',                        ; protected: {1: -7} (ES256)
        {                                 ; unprotected
          33: [                           ; x5chain: WRPAC chain
            h'<WRPAC certificate DER>',
            h'<Access CA intermediate DER>'
          ]
        },
        nil,                              ; detached payload
        h'<WRPAC signature over ItemsRequest>'
      ]
    }
  ]
}
```
</details>
<details><summary><strong>8. Wallet Unit decrypts incoming DeviceRequest</strong></summary>

The Wallet Unit uses its half of the derived symmetric session keys to decrypt the incoming `DeviceRequest` payload.
</details>
<details><summary><strong>9. Wallet Unit verifies ReaderAuth COSE_Sign1 signature (WRPAC)</strong></summary>

The Wallet cryptographically verifies the `readerAuth` COSE_Sign1 signature over the requested items using the public key from the embedded WRPAC.
</details>
<details><summary><strong>10. Wallet Unit validates WRPAC certificate chain via LoTE</strong></summary>

The Wallet validates the parsed WRPAC certificate chain against the national List of Trusted Entities (LoTE) to confirm the RP terminal is authorized.
</details>
<details><summary><strong>11. Wallet Unit checks WRPAC revocation status</strong></summary>

The Wallet checks the Access CA's OCSP responder or CRL to ensure the terminal's WRPAC hasn't been revoked.
</details>
<details><summary><strong>12. Wallet Unit displays consent screen to User</strong></summary>

The Wallet displays a consent screen to the User, detailing exactly what the terminal is requesting (e.g., portrait, name, date of birth) and the RP's verified identity.
</details>
<details><summary><strong>13. User approves attribute disclosure</strong></summary>

The User manually reviews and taps to approve the sharing of the requested data elements with the terminal.
</details>
<details><summary><strong>14. Wallet Unit authenticates User via WSCA/WSCD</strong></summary>

The Wallet asserts High LoA by requiring the user to authenticate (e.g., via FaceID/PIN) using Wallet Secure Cryptographic Application/Device mechanisms to unlock the credential keys.
</details>
<details><summary><strong>15. Wallet Unit builds DeviceResponse with DeviceAuth signature</strong></summary>

The Wallet encodes the approved attributes and generates the `DeviceAuth` (device signature) over the `SessionTranscript` to prove possession of the credential.
</details>
<details><summary><strong>16. Wallet Unit sends encrypted DeviceResponse over BLE</strong></summary>

The Wallet fully encrypts the `DeviceResponse` CBOR structure using the symmetric session key and transmits it back to the Reader over BLE.

```
DeviceResponse = {
  "version": "1.0",
  "documents": [
    {
      "docType": "eu.europa.ec.eudi.pid.1",
      "issuerSigned": {
        "nameSpaces": {
          "eu.europa.ec.eudi.pid.1": [
            {                             ; IssuerSignedItem
              "digestID": 0,
              "random": h'8798645321abcdef',
              "elementIdentifier": "family_name",
              "elementValue": "Müller"
            },
            {
              "digestID": 1,
              "random": h'abcdef1234567890',
              "elementIdentifier": "given_name",
              "elementValue": "Erika"
            },
            {
              "digestID": 2,
              "random": h'1234567890abcdef',
              "elementIdentifier": "portrait",
              "elementValue": h'<JPEG portrait bytes>'
            },
            {
              "digestID": 3,
              "random": h'deadbeef12345678',
              "elementIdentifier": "birth_date",
              "elementValue": 1009("1984-01-26")
            }
          ]
        },
        "issuerAuth": [                   ; COSE_Sign1 (MSO)
          h'a10126',                      ; protected: ES256
          {},                             ; unprotected
          h'<MobileSecurityObject CBOR>', ; MSO with digests + validity
          h'<PID Provider signature>'     ; signature
        ]
      },
      "deviceSigned": {
        "nameSpaces": {},                 ; empty (no device-signed data)
        "deviceAuth": {
          "deviceSignature": [            ; COSE_Sign1
            h'a10126',                    ; protected: ES256
            {},                           ; unprotected
            nil,                          ; detached: SessionTranscript
            h'<device key signature>'     ; over SessionTranscript
          ]
        }
      }
    }
  ],
  "status": 0                             ; 0 = OK
}
```
</details>
<details><summary><strong>17. mdoc Reader decrypts DeviceResponse</strong></summary>

The Reader decrypts the `DeviceResponse` using the session key derived from ECDH (mdoc ephemeral key × reader ephemeral key).
</details>
<details><summary><strong>18. mdoc Reader verifies IssuerAuth MSO signature</strong></summary>

The Reader verifies the `issuerAuth` COSE_Sign1 signature. The MSO (MobileSecurityObject) contains per-element SHA-256 digests and the PID Provider's signing certificate. The Reader validates this certificate chain against the LoTE trust anchor.
</details>
<details><summary><strong>19. mdoc Reader verifies data element digests</strong></summary>

For each `IssuerSignedItem`, the Reader re-encodes the item to CBOR (tagged with CBOR tag 24) and computes `SHA-256` over the CBOR-encoded bytes. The resulting digest is compared against the corresponding entry (by `digestID`) in the MSO's `valueDigests` map to verify no attribute was modified.
</details>
<details><summary><strong>20. mdoc Reader verifies DeviceAuth signature over SessionTranscript</strong></summary>

The Reader verifies the `deviceSignature` COSE_Sign1 over the `SessionTranscript` (which mathematically binds the presentation to this specific session). The public key used for verification is extracted from the MSO's `deviceKeyInfo`.
</details>
<details><summary><strong>21. mdoc Reader displays portrait and verified attributes to RP Agent</strong></summary>

Once cryptographically validated, the Reader terminal renders the extracted attributes (including the high-resolution portrait photograph) on the Agent's screen.
</details>
<details><summary><strong>22. RP Agent visually compares portrait against User</strong></summary>

The RP Agent visually compares the displayed high-fidelity portrait against the physical appearance of the User standing before them.
</details>
<details><summary><strong>23. RP Agent confirms identity match on terminal</strong></summary>

The Agent confirms the identity match on the terminal, concluding the supervised verification flow.
</details>

#### 11.6 Unsupervised Flow Description

In the **unsupervised proximity flow**, there is no human agent — the RP terminal operates autonomously. This flow is used at:

- E-gates (automated border control)
- Self-service kiosks (age verification for alcohol/tobacco vending)
- Turnstiles (venue access)
- Parking barriers (credential-gated access)
- IoT devices (smart locks, car rental)

#### 11.7 Key Differences from Supervised Flow

| Aspect | Supervised | Unsupervised |
|:-------|:-----------|:-------------|
| **User binding** | Visual comparison by agent | Device-level user authentication (biometric/PIN) |
| **Portrait request** | Typically requested for visual match | May or may not be requested |
| **Trust level** | Higher (human verification) | Lower (device-only verification) |
| **Response speed** | Slower (human in the loop) | Faster (automated) |
| **Use cases** | High-security (border, KYC) | Convenience (age check, access) |

In the unsupervised flow, the RP trusts the device binding and user authentication mechanisms of the Wallet Unit rather than performing visual verification.

#### 11.8 Device Engagement Methods

| Method | Trigger | Data Transfer | Security |
|:-------|:--------|:--------------|:---------|
| **NFC Tap** | User taps device on terminal | Ephemeral key + BLE/Wi-Fi info | Short range prevents interception |
| **QR Code** | Reader displays, User scans | Ephemeral key + BLE/Wi-Fi info | Visual proximity requirement |
| **Device Retrieval** | Reader pushes engagement via BLE | Ephemeral key exchange | BLE proximity |

#### 11.9 Session Key Derivation

After exchanging ephemeral public keys, both parties derive session keys using ECDH + HKDF:

```
SharedSecret = ECDH(ePK_reader, eSK_mdoc)  ; or ECDH(ePK_mdoc, eSK_reader)
SessionKeys = HKDF-SHA-256(SharedSecret, "SKReader" | "SKDevice", SessionTranscript)
```

All subsequent messages are encrypted with AES-256-GCM using the derived session keys.

#### 11.10 Unsupervised Proximity Flow (Direct RP Model)

```mermaid
---
config:
  themeVariables:
    noteBkgColor: "transparent"
    noteBorderColor: "transparent"
  sequence:
    messageAlign: left
    noteAlign: left
    actorMargin: 130
---
sequenceDiagram
    participant User as 👤 User
    participant WU as 📱 Wallet Unit
    participant Terminal as 🖥️ Automated Terminal<br/>(e-gate / kiosk)

    rect rgba(148, 163, 184, 0.14)
    Note right of User: Device Engagement (NFC)
    User->>Terminal: 1. Approach terminal
    Terminal->>Terminal: 2. Display "Tap your device"
    User->>WU: 3. Open Wallet
    WU->>Terminal: 4. NFC tap: DeviceEngagement<br/>(ephPubKey + BLE UUID)
    end

    rect rgba(52, 152, 219, 0.14)
    Note right of User: Session and Request
    Terminal->>Terminal: 5. Generate ephemeral key
    Terminal->>Terminal: 6. Derive session keys (ECDH)
    Terminal->>WU: 7. BLE: DeviceRequest<br/>DocType: eu.europa.ec.eudi.pid.1<br/>Elements: age_over_18: true<br/>ReaderAuth: COSE_Sign1 (WRPAC)
    end

    rect rgba(46, 204, 113, 0.14)
    Note right of User: Wallet Processing (automated)
    WU->>WU: 8. Verify WRPAC chain
    WU->>User: 9. Consent: "Age check<br/>at Kiosk Terminal 7?"
    User->>WU: 10. Approve (biometric/PIN)
    WU->>Terminal: 11. BLE: DeviceResponse<br/>(age_over_18: true only)
    end

    rect rgba(241, 196, 15, 0.14)
    Note right of User: Automated Decision
    Terminal->>Terminal: 12. Verify IssuerAuth
    Terminal->>Terminal: 13. Verify DeviceAuth
    Terminal->>Terminal: 14. Check: age_over_18 == true
    Terminal->>Terminal: 15. GRANT ACCESS / DENY
    Terminal->>User: 16. Visual indicator<br/>(green light / barrier opens)
    Note right of Terminal: ⠀
    end
```

<details><summary><strong>1. User approaches Automated Terminal</strong></summary>

The User approaches the Relying Party's automated terminal — an unattended device such as an e-gate at an airport, an age-verification turnstile at a venue, a vending machine for age-restricted goods, or a self-service kiosk. Unlike the supervised flow (§11.4) where a human RP Agent mediates the transaction, the unsupervised terminal operates autonomously: it must complete the entire verification pipeline, make the access decision, and provide feedback without human oversight. This means the terminal's software must handle all error cases gracefully, since there is no agent to fall back to (see §11.11 for online fallback strategies).
</details>
<details><summary><strong>2. Automated Terminal displays "Tap your device" prompt</strong></summary>

The terminal detects the User's presence (via proximity sensor, motion detection, or button press) and displays a visual prompt: *"Tap your device to verify"*. This prompt must comply with EN 301 549 accessibility requirements (§11.12): it should use large, high-contrast text, be accompanied by an audio cue for visually impaired Users, and include a pictogram showing where to tap. The NFC reader area should be clearly marked with the standard NFC contactless symbol (ISO/IEC 18092). The terminal also begins advertising its BLE service UUID to allow Wallet Units that detect the advertisement to pre-initiate the connection.
</details>
<details><summary><strong>3. User opens Wallet Unit</strong></summary>

The User opens their EUDI Wallet application and navigates to the credential they expect to present (e.g., PID for age verification, mDL for driving privilege check). On some platforms, the Wallet may activate automatically when the device detects an NFC field from the terminal — this "tap-first, open-second" UX depends on the Wallet Provider's implementation and the OS's NFC dispatch behaviour (Android HCE vs. iOS Core NFC). The Wallet enters the mdoc "device" role (ISO 18013-5 §8.3.3.1.2), ready to receive a DeviceEngagement handshake.

> **UX consideration**: For unsupervised flows, the User has no RP Agent to guide them. The Wallet's UI should clearly indicate which credential is about to be presented and to which type of terminal (using the terminal's WRPAC identity if available at this stage).
</details>
<details><summary><strong>4. Wallet Unit transmits DeviceEngagement via NFC tap</strong></summary>

The User taps their device on the terminal's NFC reader. The Wallet transmits the `DeviceEngagement` CBOR structure (ISO 18013-5 §9.1.1.4) via NFC, containing its ephemeral public key and BLE connection parameters:

```
DeviceEngagement = {
  0: "1.0",                              ; version
  1: [                                    ; security
    1,                                    ; cipher suite 1 (EC P-256)
    h'<mdoc ephemeral public key COSE_Key>'
  ],
  2: [                                    ; device retrieval methods
    [                                     ; BLE
      2,                                  ; type: BLE
      1,                                  ; version
      {                                   ; BLE options
        0: true,                          ; peripheral server mode
        1: h'A1B2C3D4E5F6...',            ; UUID
        10: h'<device address>'           ; peripheral address
      }
    ]
  ]
}
```

This is identical to the supervised flow (§11.4 step 4). The NFC tap serves a dual purpose: (1) it transfers the DeviceEngagement payload (ephemeral key + BLE connection info), and (2) it establishes physical proximity — the NFC range of ~4cm provides implicit proof that the User is physically present at the terminal. After the NFC exchange, communication switches to BLE for the data transfer (NFC bandwidth is insufficient for full credential exchange).
</details>
<details><summary><strong>5. Automated Terminal generates ephemeral EC key pair</strong></summary>

The terminal generates a fresh EC P-256 ephemeral key pair for this specific session (ISO 18013-5 §9.1.1.5). This key pair is used only for the ECDH key agreement in step 6 and is discarded after the session ends. The terminal's secure element or HSM should generate the key — software-only key generation on embedded terminals is acceptable for low-security use cases (age gates) but not for high-security deployments (e-gates, KYC kiosks).

> **Key difference from supervised flow**: In the supervised flow, the mdoc Reader is typically a tablet or smartphone with a full-featured crypto library. In the unsupervised flow, the terminal may be a constrained embedded device (ARM Cortex-M class) — implementers must verify that their hardware supports P-256 ECDH with sufficient entropy for key generation.
</details>
<details><summary><strong>6. Automated Terminal derives symmetric session keys via ECDH</strong></summary>

The terminal performs ECDH key agreement (ISO 18013-5 §9.1.1.5) by combining its ephemeral private key with the Wallet's ephemeral public key (received in step 4) to produce a shared secret `Z`. It then derives two symmetric AES-256 session keys via HKDF-SHA-256 (RFC 5869):

- **`SKDevice`** — key for encrypting data from Wallet → Terminal (used by the Wallet to encrypt the DeviceResponse)
- **`SKReader`** — key for encrypting data from Terminal → Wallet (used by the Terminal to encrypt the DeviceRequest)

The HKDF `info` parameter includes the `SessionTranscript` (ISO 18013-5 §9.1.5.1) — a CBOR structure binding the session keys to the specific DeviceEngagement and handover method. This prevents session hijacking: even if an attacker captures the BLE traffic, they cannot derive the session keys without the ephemeral private keys.
</details>
<details><summary><strong>7. Automated Terminal sends encrypted DeviceRequest over BLE</strong></summary>

The terminal establishes the BLE connection using the UUID from the DeviceEngagement (step 4) and sends an AES-GCM encrypted `DeviceRequest` (ISO 18013-5 §8.3.2.1.2). For an unsupervised age-verification terminal, the request typically asks for a minimal attribute set:

```
DeviceRequest = {
  "version": "1.0",
  "docRequests": [
    {
      "itemsRequest": 24(<<              ; CBOR tag 24: embedded CBOR
        {                                 ; ItemsRequest
          "docType": "eu.europa.ec.eudi.pid.1",
          "nameSpaces": {
            "eu.europa.ec.eudi.pid.1": {
              "age_over_18": false         ; IntentToRetain = false
            }
          }
        }
      >>),
      "readerAuth": [                     ; COSE_Sign1
        h'a10126',                        ; protected: {1: -7} (ES256)
        {                                 ; unprotected
          33: [                           ; x5chain: WRPAC chain
            h'<terminal WRPAC DER>',
            h'<Access CA intermediate DER>'
          ]
        },
        nil,                              ; detached payload
        h'<WRPAC signature over ItemsRequest>'
      ]
    }
  ]
}
```

Key differences from the supervised flow (§11.4 step 7): (1) the request is typically for a **single boolean attribute** (`age_over_18: true/false`) rather than a full identity (name, portrait, DOB), minimising data exposure per the data minimisation principle; (2) `IntentToRetain` is `false` — the terminal has no need or right to store the attribute beyond the immediate access decision; (3) the `readerAuth` contains the terminal-specific WRPAC, not an RP Agent's personal credential.
</details>
<details><summary><strong>8. Wallet Unit verifies WRPAC certificate chain via LoTE</strong></summary>

The Wallet Unit extracts the WRPAC certificate chain from the `readerAuth` (step 7) and validates it against the national LoTE trust anchors (§4.5.3). The chain typically consists of the terminal's leaf WRPAC → Access CA intermediate → LoTE root. The Wallet verifies each certificate's signature, checks validity periods, and confirms the chain terminates at a LoTE-listed trust anchor.

> **Offline verification**: In unsupervised scenarios, the Wallet Unit may not have internet access at the point of interaction (e.g., underground parking garage). The Wallet relies on its **cached LoTE** — a locally stored copy of the List of Trusted Entities refreshed periodically when connectivity was available. The cache TTL determines the maximum period during which a revoked Access CA certificate could still be trusted. See §11.11 for cache management strategies.
>
> **If chain verification fails**: The Wallet displays a warning to the User: *"This terminal's identity could not be verified."* The User may still choose to proceed (at their own risk), but the Wallet should visually distinguish this from a verified interaction.
</details>
<details><summary><strong>9. Wallet Unit displays consent prompt to User</strong></summary>

The Wallet displays a consent screen showing the terminal's verified identity (extracted from the WRPAC — e.g., *"Supermarket Berlin — Tobacco Vending Machine"*), the specific data requested (`age_over_18`), and the `IntentToRetain` status (`false` — data will not be stored). For unsupervised flows, the consent UX must be optimised for speed — the User is standing at a terminal, possibly in a queue, and expects a sub-5-second interaction. The Wallet should:

- Show a **single-tap approval** button (not a multi-screen flow)
- Display the terminal's identity prominently so the User can confirm they're interacting with the expected terminal
- Use a colour-coded indicator: 🟢 WRPAC verified vs. 🟡 WRPAC unverified (if chain validation failed in step 8)

> **Accessibility**: The consent screen should support VoiceOver/TalkBack for visually impaired Users, and the approval gesture should be configurable (biometric, PIN, or device unlock depending on User preference — see §11.12).
</details>
<details><summary><strong>10. User approves via biometric or PIN</strong></summary>

The User approves the data release by authenticating locally via biometric (fingerprint, FaceID) or device PIN. This user verification step proves "possession + inherence" (or "possession + knowledge") — the Wallet Unit only releases the credential after confirming the authorised User is physically present. The authentication happens via the WSCA/WSCD (unlike the WebAuthn pseudonym flow in §14.6 which uses OS-level authentication), because the credential being presented is an eIDAS-governed attestation (PID) that requires the full eIDAS trust chain.

> **If authentication fails**: The Wallet does not release any data. The terminal should detect the timeout (no DeviceResponse within the configured window, typically 30–60 seconds) and display a "Verification timed out — please try again" message, resetting to step 2.
</details>
<details><summary><strong>11. Wallet Unit sends encrypted DeviceResponse over BLE</strong></summary>

The Wallet constructs the `DeviceResponse` CBOR structure (ISO 18013-5 §8.3.2.1.2.2), containing only the approved attribute(s) and the `DeviceAuth` proof of possession. For the age-verification use case, the response contains a single data element:

```
DeviceResponse = {
  "version": "1.0",
  "documents": [
    {
      "docType": "eu.europa.ec.eudi.pid.1",
      "issuerSigned": {
        "nameSpaces": {                   ; tagged CBOR ByteStrings
          "eu.europa.ec.eudi.pid.1": [
            24(<< {                       ; IssuerSignedItem
              "digestID": 7,              ; matches MSO ValueDigests
              "random": h'<random salt>',
              "elementIdentifier": "age_over_18",
              "elementValue": true
            } >>)
          ]
        },
        "issuerAuth": <COSE_Sign1>        ; MSO signed by PID Provider
      },
      "deviceSigned": {
        "nameSpaces": 24(<<{}>>),         ; empty — no device-signed elements
        "deviceAuth": {
          "deviceSignature": <COSE_Sign1> ; signed over SessionTranscript
        }
      }
    }
  ],
  "status": 0                            ; success
}
```

The Wallet encrypts this payload with `SKDevice` (the session key derived in step 6) using AES-256-GCM and transmits it over the BLE channel. The `deviceSignature` (COSE_Sign1) signs the `SessionTranscript` with the device's private key — this binds the response to this specific physical proximity session (see step 13).
</details>
<details><summary><strong>12. Automated Terminal verifies IssuerAuth MSO signature</strong></summary>

The terminal decrypts the BLE payload using `SKDevice`, parses the `DeviceResponse`, and verifies the `issuerAuth` COSE_Sign1 signature in the Mobile Security Object (MSO). This confirms that the PID Provider (e.g., Bundesdruckerei) actually issued this credential. The terminal:

1. Extracts the issuer's X.509 certificate from the `issuerAuth` unprotected header (`33` / `x5chain`)
2. Validates the certificate chain against its cached LoTE trust anchors (same as the Wallet did for the WRPAC in step 8)
3. Verifies the COSE_Sign1 signature over the MSO payload using the issuer's public key
4. Confirms the MSO's `validityInfo` (`signed`, `validFrom`, `validUntil`) is within the current time window

> **Offline trust anchor risk**: The terminal's cached LoTE may not include newly onboarded PID Providers. Terminals with expired LoTE caches should fall back to degraded mode (§11.11) where they accept only credentials from issuers already in their cache, with a visible warning.
</details>
<details><summary><strong>13. Automated Terminal verifies DeviceAuth signature</strong></summary>

The terminal verifies the `deviceSignature` COSE_Sign1 (ISO 18013-5 §9.1.3.6) to prove that the credential was presented by the Wallet Unit that holds the corresponding private key — preventing credential cloning and relay attacks. The verification process:

1. Reconstruct the `SessionTranscript` CBOR array: `[DeviceEngagementBytes, EReaderKeyBytes, Handover]` — this binds the signature to this specific NFC engagement + BLE session
2. Construct the `DeviceAuthentication` CBOR: `["DeviceAuthentication", SessionTranscript, docType, DeviceNameSpaceBytes]`
3. Verify `COSE_Sign1(deviceKey, DeviceAuthentication)` using the `deviceKey` public key extracted from the MSO's `deviceKeyInfo`

If the signature verifies, it proves: (a) the Wallet possesses the private key bound to this credential (device binding), and (b) the response was generated specifically for this session (session binding via SessionTranscript). A replayed response from a different session would fail because the `SessionTranscript` — which includes the terminal's ephemeral key — would differ.
</details>
<details><summary><strong>14. Automated Terminal evaluates access policy (age_over_18)</strong></summary>

The terminal's embedded policy engine evaluates the cryptographically verified attribute against its local access rule. For the typical age-verification use case, the policy is a simple boolean check:

```
if verified_attributes["age_over_18"] == true:
    decision = GRANT
else:
    decision = DENY
```

More complex terminals (e-gates, customs kiosks) may evaluate compound policies — e.g., checking nationality against a permitted list, verifying driving privilege categories for vehicle rental, or comparing portrait against a live camera feed. The policy should be **configurable** and **auditable** — loaded from a signed configuration file rather than hardcoded, so that policy changes don't require firmware updates. See §20.1 for the three-tier policy architecture (static → parameterized → dynamic).

> **Data minimisation enforcement**: After policy evaluation, the terminal MUST discard all credential data. Since `IntentToRetain` was `false` (step 7), the terminal has no legal basis to persist the attribute values. Only the access decision (grant/deny) and an anonymised transaction log (timestamp, terminal ID, decision) may be retained.
</details>
<details><summary><strong>15. Automated Terminal grants or denies access</strong></summary>

Based on the policy evaluation result, the terminal executes the physical access decision:

- **GRANT**: The terminal activates the physical mechanism — unlocks a turnstile, opens a gate, enables a vending machine's dispensing mechanism, or marks a parking barrier for lifting. The terminal may also issue a time-limited session token (e.g., a QR code on a receipt) if the access control system requires it.
- **DENY**: The terminal keeps the physical barrier locked and does **not** reveal the specific reason for denial (to avoid information leakage). The display shows a generic "Access denied" message. The terminal should NOT display "Age verification failed" or similar specific messages, as this would disclose the User's age status to bystanders — a privacy violation.

> **If verification failed** (steps 12–13): The terminal should treat verification failures as a DENY with a distinct internal error code for audit, but present the same generic "Access denied" message to the User. The terminal should log the failure type (signature invalid, chain untrusted, DeviceAuth mismatch) for operational diagnostics without logging any credential attribute values.
</details>
<details><summary><strong>16. Automated Terminal provides visual feedback to User</strong></summary>

The terminal provides immediate, multi-modal feedback to the User (per EN 301 549 accessibility requirements — §11.12):

| Outcome | Visual | Audio | Haptic (if terminal supports) |
|:--------|:-------|:------|:-----------------------------|
| **GRANT** | 🟢 Green LED / screen | Success chime | Short vibration (if handheld reader) |
| **DENY** | 🔴 Red LED / screen | Error tone | Double vibration |
| **ERROR** | 🟡 Amber LED / screen | Distinct error tone | Long vibration |

The entire unsupervised flow — from NFC tap (step 4) to feedback (step 16) — should complete within **3–5 seconds** for age-verification use cases, matching the UX expectations of contactless payment terminals. Longer verification times (e.g., for compound policy evaluation with online revocation checks) should be accompanied by a progress indicator to prevent the User from re-tapping and initiating a duplicate session.

> **Cross-reference**: For terminals with internet connectivity and the option to perform online revocation checks, see §11.11 (Online Fallback for Proximity Terminals) for caching strategies and latency trade-offs.
</details>

---
#### 11.11 Online Fallback for Proximity Terminals

When a proximity terminal **has** internet connectivity, it faces a design choice:

| Strategy | When to Use | Trade-off |
|:---------|:------------|:----------|
| **Always check online** | High-security terminals (e-gates, KYC kiosks) | Latency impact (~200–500ms per revocation check); depends on connectivity |
| **Cache-first, online-fallback** | Standard terminals (age verification, access control) | Fast response; revocation window equals cache TTL |
| **Offline-only** | No-connectivity environments (underground parking, aircraft) | Fastest; highest revocation window risk |

> **Recommendation**: For terminals with internet, use the cache-first strategy with a short TTL (1–4 hours). Perform online revocation checks only when the cached Status List Token has expired. This balances user experience (sub-100ms verification) with security (bounded revocation propagation delay).

**Trust artifact management for offline/intermittent terminals:**

| Artifact | Caching Strategy | Maximum Offline Period | Renewal Mechanism |
|:---------|:-----------------|:-----------------------|:------------------|
| **LoTE trust anchors** | Pre-load full LoTE at provisioning time; differential sync when connectivity available | 30 days (recommended); 90 days (absolute maximum) — beyond this, unknown new Providers cannot be verified | Terminal management system pushes LoTE updates during nightly sync windows |
| **WRPAC certificate** | Stored locally on the terminal's secure element or HSM | Until certificate expiry (typically 1–2 years) | Re-provisioning required; automated renewal via terminal management if API available |
| **Status List Tokens** | Cache locally; refresh TTL per strategy above | Depends on risk tolerance: 4 hours (high-security) to 7 days (low-risk) | HTTP fetch from Status List endpoint when connectivity available |
| **IACA certificates** | Pre-loaded; rarely change | 1 year (aligned with IACA certificate validity) | Updated during terminal firmware updates |

> **Operational guideline**: Terminals should track their last successful trust artifact sync and display a **warning indicator** (e.g., amber status LED) when any cached artifact exceeds 50% of its maximum offline period. Terminals that have been offline beyond the maximum period should switch to a **degraded mode** that accepts only presentations verifiable against cached trust anchors, with a visible notification that full verification is unavailable.

#### 11.12 Accessibility Considerations for Proximity Flows

EUDI Wallet proximity flows must accommodate users with disabilities to meet EU accessibility requirements (EAA — European Accessibility Act, Directive 2019/882):

| Scenario | Challenge | Mitigation |
|:---------|:----------|:-----------|
| **Visually impaired users** | Cannot scan QR codes | NFC tap as primary engagement method; haptic feedback on successful tap |
| **Motor impairments** | Difficulty with precise NFC positioning | Larger NFC antenna targets on terminals; extended timeout windows |
| **Cognitive limitations** | Complex consent screens | Wallet Providers should offer simplified consent UIs; RP terminal displays should use clear, large-font instructions |
| **Deaf/hard-of-hearing** | Audio-only terminal prompts | Visual indicators (LED colours, screen text) must accompany all audio cues |

> **RP terminal guidance**: Ensure that all proximity terminals comply with EN 301 549 (ICT accessibility requirements) and provide multi-modal feedback (visual + haptic + audio) for all interaction states.

---

### 12. W2W Presentation Flow (TS9)

#### 12.1 Overview and Relevance to Relying Parties

TS9 defines how two Wallet Units can exchange credentials directly without an RP backend server. In this flow, one Wallet User acts as the **Verifier** (requesting attributes) and the other acts as the **Presenter**.

At first glance, a Wallet-to-Wallet flow seems out of place in an Enterprise Relying Party integration guide. However, W2W is fundamentally the **"RP-on-a-phone" deployment model** and is legally and technically critical to the RP ecosystem for three overriding reasons:

1. **Ad-Hoc Relying Parties (Micro-RPs)**: Legally, eIDAS 2.0 (Art. 3) defines a Relying Party broadly as a natural or legal person that relies upon an electronic identification or trust service. This includes a massive long-tail of non-enterprise verifiers: a freelance notary verifying a client, a landlord checking a tenant's identity, a bouncer checking age at a club door, or a gig-economy delivery driver verifying age for restricted goods. Imposing full enterprise registration infrastructure (registering with a National Member State Registrar, obtaining X.509 WRPACs from Access Certificate Authorities) is completely unviable for these use cases. W2W enables any Wallet Unit to toggle into "Verifier Mdoc Reader Mode," transforming the citizen into an ad-hoc Relying Party immediately capable of verification.
2. **Shared Protocol Stack**: Technically, W2W uses the exact same proximity standard (ISO/IEC 18013-5 mdoc over BLE/NFC/Wi-Fi Aware) as traditional enterprise point-of-sale terminals. Mobile developers building offline RP-facing verification apps (e.g., transit ticket inspector apps or embedded mobile POS systems) are effectively building W2W Verifiers or reusing identical offline CBOR parsing logic.
3. **The Trust Model Exception**: W2W creates a structural exception in the trust ecosystem. Because the W2W Verifier is an unregistered natural person, they lack an Access Certificate (WRPAC). Consequently, the Holder's Wallet cannot cryptographically authenticate the Verifier via a certificate chain or query a Registrar API for their "intended use" or privacy policy. Documenting this provides Security Architects with a complete threat model: offline W2W verification without WRPACs is inherently a lower-assurance operation than authenticated enterprise proximity flows, requiring different user consent UX to compensate for the anonymity.

| Aspect | Detail |
|:-------|:-------|
| **Protocol** | ISO/IEC 18013-5 (proximity only) |
| **Format** | mdoc only (SD-JWT VC NOT supported for W2W) |
| **Transport** | BLE, NFC, Wi-Fi Aware |
| **RP Instance** | The Verifier's Wallet Unit acts as the mdoc reader |
| **Authentication** | Open issue — how the Verifier authenticates is under discussion |

#### 12.2 Key Constraints

- W2W interactions use the **same ISO 18013-5 protocol** as proximity RP flows
- The Verifier's Wallet Unit generates a `PresentationOffer` specifying requested elements
- The Presenter's Wallet Unit processes this as if it were a standard proximity request
- **No WRPAC** — the Verifier is a User, not a registered RP. This means the standard RP authentication via certificate chain validation does not apply.

> **Open Issue (TS9)**: The mechanism for authenticating the Verifier in W2W is still under active discussion. Possible approaches include: (1) the Verifier presents their own PID first, (2) mutual disclosure via a negotiation protocol, or (3) no Verifier authentication with explicit user consent.

#### 12.3 W2W Interaction Flow (TS9) (Wallet-to-Wallet Model - No Intermediary)

```mermaid
---
config:
  themeVariables:
    noteBkgColor: "transparent"
    noteBorderColor: "transparent"
  sequence:
    messageAlign: left
    noteAlign: left
    actorMargin: 140
---
sequenceDiagram
    participant VU as 👤 Verifier User
    participant VW as 📱 Verifier Wallet<br/>(mdoc Reader role)
    participant HW as 📱 Holder Wallet<br/>(mdoc role)
    participant HU as 👤 Holder User

    rect rgba(148, 163, 184, 0.14)
    Note right of VU: Phase 1: Initialization
    VU->>VW: 1. Activate W2W mode
    VW->>VU: 2. Warning: "W2W should<br/>only be used with natural<br/>persons you trust"
    VU->>VW: 3. Select role: Verifier
    HU->>HW: 4. Activate W2W mode
    HW->>HU: 5. Same warning displayed
    HU->>HW: 6. Select role: Holder
    end

    rect rgba(52, 152, 219, 0.14)
    Note right of VU: Phase 2: PresentationOffer and Engagement
    HW->>HU: 7. Display available<br/>attestations and attributes
    HU->>HW: 8. Select attributes to offer
    HW->>HW: 9. Build PresentationOffer CBOR
    HW->>VW: 10. QR code: DeviceEngagement<br/>(ephPubKey + BLE UUID +<br/>PresentationOffer at key -1)
    end

    rect rgba(46, 204, 113, 0.14)
    Note right of VU: Phase 3: Request and Presentation
    VW->>VU: 11. Display offered attributes
    VU->>VW: 12. Select subset to request<br/>(must be subset of offer)
    VW->>HW: 13. BLE: DeviceRequest<br/>(NO ReaderAuth,<br/>all IntentToRetain = false)
    HW->>HW: 14. Validate request is<br/>subset of PresentationOffer
    HW->>HU: 15. Consent screen
    HU->>HW: 16. Approve + authenticate
    HW->>VW: 17. BLE: DeviceResponse<br/>(IssuerSigned + DeviceAuth)
    end

    rect rgba(241, 196, 15, 0.14)
    Note right of VU: Phase 4: Verification
    VW->>VW: 18. Verify IssuerAuth (MSO)
    VW->>VW: 19. Verify DeviceAuth
    VW->>VW: 20. Verify PID validity<br/>(implies valid Wallet Unit)
    VW->>VU: 21. Display verified attributes
    Note right of VW: Data NOT persisted<br/>(IntentToRetain = false)
    Note right of HU: ⠀
    end
```
<details><summary><strong>1. Verifier User activates W2W mode</strong></summary>

The Verifier User manually toggles their EUDI Wallet Unit into Wallet-to-Wallet (ambient reading) mode via the user interface. Unlike the standard Holder role, this mode essentially transforms the Wallet Unit into a mobile mdoc reader capable of receiving Bluetooth Low Energy (BLE) or NFC connections.
</details>
<details><summary><strong>2. Verifier Wallet displays a mandatory trust warning</strong></summary>

Before allowing verification acts, the Verifier Wallet displays a mandatory security warning. This is a critical countermeasure to ensure W2W interactions are restricted strictly to trusted natural persons (e.g., verifying a friend's age or a tenant's identity), reducing the risk of social engineering attacks and unauthorized data harvesting.
</details>
<details><summary><strong>3. Verifier User selects the Verifier role</strong></summary>

The Verifier User explicitly confirms they intend to act as the requesting party in this session, initializing the BLE/NFC listener services on the device to prepare for the engagement phase.
</details>
<details><summary><strong>4. Holder User activates W2W mode</strong></summary>

Parallel to the Verifier, the Holder User activates the Wallet-to-Wallet module within their own EUDI Wallet Unit, preparing to share their attestations.
</details>
<details><summary><strong>5. Holder Wallet displays a mandatory trust warning</strong></summary>

The Holder Wallet displays the exact same security warning, ensuring the presenter is fully aware of the peer-to-peer nature of the transaction and the risks of sharing sensitive attribute data with unverified citizen Verifiers.
</details>
<details><summary><strong>6. Holder User selects the Holder role</strong></summary>

The Holder User explicitly selects the role of the presenter, prompting the Wallet to retrieve available PIDs and (Q)EAAs from its secure storage enclave.
</details>
<details><summary><strong>7. Holder Wallet displays available attestations and attributes</strong></summary>

The Holder Wallet queries its secure storage and presents a user interface listing all valid credentials and granular attributes that the Holder can currently share in an offline context.
</details>
<details><summary><strong>8. Holder User selects attributes to offer</strong></summary>

The Holder User manually selects the specific attributes they are willing to present to the Verifier. This reverses the traditional RP flow: instead of the RP requesting attributes first, the Holder proactively builds an offer.
</details>
<details><summary><strong>9. Holder Wallet builds the PresentationOffer CBOR</strong></summary>

The Holder Wallet encodes the user's selected attributes into a structured `PresentationOffer` CBOR payload. This acts as a cryptographic manifest of what the Holder is willing to share in this specific session.

```
PresentationOffer = {
  0: "1.0",                              ; version
  1: [                                   ; offered documents
    {
      0: "eu.europa.ec.eudi.pid.1",      ; docType
      1: {                               ; offered nameSpaces + elements
        "eu.europa.ec.eudi.pid.1": [
          "family_name",
          "given_name",
          "birth_date",
          "age_over_18"
        ]
      }
    }
  ]
}
```
</details>
<details><summary><strong>10. Holder Wallet generates a DeviceEngagement QR code</strong></summary>

The Holder Wallet creates a DeviceEngagement payload containing its ephemeral ECDH public key, the BLE UUID for connection, and the `PresentationOffer` embedded at key `-1`. This payload is rendered on the phone screen as a QR code for the Verifier to scan.
</details>
<details><summary><strong>11. Verifier Wallet displays offered attributes</strong></summary>

After scanning the Holder's QR code, the Verifier Wallet parses the `PresentationOffer` and displays the available attributes to the Verifier User, ensuring they know exactly what data the Holder is willing to provide before initiating the formal request.
</details>
<details><summary><strong>12. Verifier User selects a subset of attributes to request</strong></summary>

The Verifier User selects the specific data points they require from the offer. The TS9 protocol strictly dictates that the Verifier can only request a subset of what was explicitly offered; they cannot request unoffered attributes.
</details>
<details><summary><strong>13. Verifier Wallet sends the DeviceRequest over BLE</strong></summary>

The Verifier Wallet establishes the BLE connection and transmits the `DeviceRequest`. Crucially, because the Verifier is an unregistered natural person, there is no `readerAuth` signature (no WRPAC certificate). Additionally, to comply with privacy rules, all `IntentToRetain` flags must be forcibly set to `false`.

```
DeviceRequest = {
  "version": "1.0",
  "docRequests": [
    {
      "itemsRequest": 24(<<
        {
          "docType": "eu.europa.ec.eudi.pid.1",
          "nameSpaces": {
            "eu.europa.ec.eudi.pid.1": {
              "family_name": false,       ; IntentToRetain = false (STS9_29)
              "birth_date": false,
              "age_over_18": false
            }
          }
        }
      >>)
      ; NOTE: No "readerAuth" field — STS9_30 prohibits it
    }
  ]
}
```
</details>
<details><summary><strong>14. Holder Wallet validates that the request is a strict subset</strong></summary>

The Holder Wallet intercepts the incoming `DeviceRequest` and algorithmically verifies that every requested attribute was present in the original `PresentationOffer`. If the Verifier attempts to request unoffered data, the transaction is instantly aborted.
</details>
<details><summary><strong>15. Holder Wallet displays the final consent screen</strong></summary>

The Holder Wallet displays a final confirmation screen, showing exactly which attributes the Verifier has requested out of the offered subset, ensuring absolute transparency before data transmission.
</details>
<details><summary><strong>16. Holder User approves and authenticates</strong></summary>

The Holder User provides final consent and performs local strong customer authentication (e.g., biometric scan or Wallet PIN) to unlock the device signing keys and authorize the release of the credential data.
</details>
<details><summary><strong>17. Holder Wallet sends the DeviceResponse over BLE</strong></summary>

The Holder Wallet generates the CBOR `DeviceResponse` and sends it over the active BLE channel to the Verifier.

The `DeviceResponse` structure is identical to standard RP proximity flows (§11.5). It consists of the `IssuerSigned` section (containing the actual attribute values and PID provider signatures) and the `DeviceAuth` section (containing the device signature over the `SessionTranscript`). Per STS9_29, the Verifier Wallet receives this data with strict protocol instructions that it must strictly **not be persisted** after the session termination.
</details>
<details><summary><strong>18. Verifier Wallet verifies IssuerAuth (MSO)</strong></summary>

The Verifier Wallet extracts the Mobile Security Object (MSO) from the `IssuerSigned` payload. It validates the issuer's signature against the trusted PID Provider root certificates cached in its local List of Trusted Entities (LoTE), proving the data was genuinely issued by a recognized authority and hasn't been tampered with.
</details>
<details><summary><strong>19. Verifier Wallet verifies DeviceAuth</strong></summary>

The Verifier Wallet evaluates the device signature computed over the `SessionTranscript`. This crucial step provides cryptographic assurance of Device Binding—proving that the Holder presenting the data actually possesses the active private key originally tied to the credential by the PID Provider.
</details>
<details><summary><strong>20. Verifier Wallet verifies PID validity</strong></summary>

The Verifier Wallet ensures the PID itself is structurally valid and not revoked. Checking the PID's validity implicitly confirms that the Holder is operating a legitimate, non-revoked Wallet Unit instance recognized by the ecosystem.
</details>
<details><summary><strong>21. Verifier Wallet displays verified attributes</strong></summary>

Upon successful validation of all cryptographic proofs, the Verifier Wallet securely renders the verified attributes on the Verifier User's screen. Once the session ends or the screen is closed, the data is permanently purged from memory natively.
</details>

<br/>

**Key TS9 constraints** verified against source specification:

| Constraint | Source | Detail |
|:-----------|:-------|:-------|
| **QR mandatory** for device engagement | STS9_07/08 | QR codes are required; NFC is optional (unlike RP proximity where NFC is primary) |
| **No ReaderAuth** | STS9_30 | Verifier has no WRPAC. Authentication relies on out-of-band trust and PID validity |
| **IntentToRetain = false** | STS9_29 | Verifier SHALL NOT persist received data |
| **Rate limiting** | STS9_31/32 | Max 5 requests/hour, 20/day, 50/week (sliding windows) |
| **No screenshots** | STS9_36 | Wallet Providers SHOULD prevent screenshots of received presentations |
| **No data forwarding** | STS9_37 | Verifier Wallet SHALL NOT communicate received data to any other party |
| **PresentationOffer optional** | STS9_12 | Holder may present without a prior offer; in that case Verifier can request any attributes |
| **mdoc only** | TS9 §1.2 | SD-JWT VC is NOT supported for W2W |

---

### 13. SCA for Electronic Payments: Lifecycle, Flows, and Dynamic Linking

#### 13.1 SCA Attestation Context

**Strong Customer Authentication (SCA)** is mandated by PSD2 (Art. 97) for electronic payments. TS12 defines how EUDI Wallets can fulfil this requirement through a dedicated **SCA attestation** that links the Wallet to a Payment Service Provider (PSP).

The SCA attestation:

- Is issued by the PSP (or its agent) to the User's Wallet Unit
- Contains the User's payment credential reference (e.g., PAN last four digits, scheme)
- Enables the Wallet to generate dynamic authentication codes for transactions
- Must satisfy PSD2 dynamic linking requirements (binding authentication to transaction amount and payee)

#### 13.2 SCA Attestation Types

TS12 specifies that SCA Attestations are identified by the `category` claim in the SD-JWT VC Type Metadata, not by separate VCT identifiers:

```json
{
  "vct": "https://pay.example.com/card",
  "category": "urn:eu:europa:ec:eudi:sua:sca"
}
```

The actual VCT values are defined by sector-specific **SCA Attestation Rulebooks**, not by TS12 itself. TS12 provides three non-normative attestation examples:

| SCA Attestation Type | Represents | Key Attributes |
|:---------------------|:-----------|:---------------|
| Card-based | Specific card belonging to a User | `pan_last_four`, `scheme`, `scheme_logo` |
| Account-based | Specific account belonging to a User | `iban`, `bic`, `currency` |
| User-only | The User/PSU themselves | `sub` only (no instrument details) |

#### 13.3 Issuer-Requested SCA Flow Description

In the **issuer-requested SCA flow**, the PSP that issued the payment instrument (issuer bank) directly requests SCA from the User's Wallet when the User initiates a payment. This is the standard SCA flow for card-present and card-not-present transactions.

#### 13.4 Issuer-Requested SCA Sequence Diagram (Direct RP Model)

```mermaid
---
config:
  themeVariables:
    noteBkgColor: "transparent"
    noteBorderColor: "transparent"
  sequence:
    messageAlign: left
    noteAlign: left
    actorMargin: 130
---
sequenceDiagram
    participant User as 👤 User
    participant WU as 📱 Wallet Unit
    participant Merchant as 🛒 Merchant (RP)
    participant PSP as 🏦 Issuer PSP

    rect rgba(148, 163, 184, 0.14)
    Note right of User: Phase 1: Transaction Initiation
    User->>Merchant: 1. Initiate payment
    Merchant->>PSP: 2. Authorization request
    PSP->>PSP: 3. Determine SCA required
    end

    rect rgba(52, 152, 219, 0.14)
    Note right of User: Phase 2: SCA Request via OpenID4VP
    PSP->>PSP: 4. Build presentation request
    PSP->>WU: 5. OpenID4VP request (JAR)
    end

    rect rgba(46, 204, 113, 0.14)
    Note right of User: Phase 3: User Authentication
    WU->>WU: 6. Verify PSP WRPAC chain
    WU->>WU: 7. Validate SCA attestation type
    WU->>WU: 8. Validate transaction_data type
    WU->>WU: 9. Validate payload (JSON Schema)
    WU->>User: 10. Render consent screen
    User->>WU: 11. Approve + biometric/PIN
    WU->>WU: 12. Build KB-JWT with SCA proof
    end

    rect rgba(241, 196, 15, 0.14)
    Note right of User: Phase 4: Verification
    WU->>PSP: 13. Encrypted response (JWE)
    PSP->>PSP: 14. Verify SCA attestation
    PSP->>PSP: 15. Verify KB-JWT
    PSP->>PSP: 16. Verify dynamic linking
    PSP->>Merchant: 17. Authorization approved
    Merchant->>User: 18. Payment confirmed
    Note right of PSP: ⠀
    end
```

<details><summary><strong>1. User initiates payment at Merchant</strong></summary>

The User decides to make a purchase and initiates the payment process on the Merchant's (RP's) website or application.
</details>
<details><summary><strong>2. Merchant forwards authorization request to Issuer PSP</strong></summary>

The Merchant's backend forwards the payment authorization request to the issuer Payment Service Provider (PSP) over traditional payment networks.
</details>
<details><summary><strong>3. Issuer PSP determines SCA is required</strong></summary>

The PSP risk engine evaluates the transaction and determines that Strong Customer Authentication (SCA) is legally required under PSD2/PSR regulations.
</details>
<details><summary><strong>4. Issuer PSP builds OpenID4VP presentation request with transaction_data</strong></summary>

The PSP constructs the OpenID4VP authorization request with a DCQL query targeting the User's SCA Attestation, explicitly binding the transaction data to the request.

```json
{
  "iss": "https://psp.example-bank.de",
  "aud": "https://self-issued.me/v2",
  "exp": 1741355493,
  "iat": 1741269093,
  "jti": "a91c2f0e-7b3a-4c8d-b5e1-f234567890ab",
  "client_id": "x509_hash://sha-256/Vn7tQ1eKzLb4g3RmXwYp0s2H8dFcNj5iOuAx9kBv_Wc",
  "response_type": "vp_token",
  "response_mode": "direct_post.jwt",
  "response_uri": "https://psp.example-bank.de/sca/callback",
  "nonce": "bUtJdjJESWdmTWNjb011YQ",
  "state": "sca-session-xyz",
  "dcql_query": {
    "credentials": [
      {
        "id": "sca",
        "format": "dc+sd-jwt",
        "meta": {
          "vct_values": ["https://pay.example-bank.de/card"]
        }
      }
    ]
  },
  "transaction_data": [
    {
      "type": "urn:eudi:sca:payment:1",
      "credential_ids": ["sca"],
      "transaction_data_hashes_alg": "sha-256",
      "payload": {
        "transaction_id": "8D8AC610-3E4A-4B7C-9F12-A1B2C3D4E5F6",
        "date_time": "2026-07-15T14:32:00Z",
        "payee": {
          "name": "Online Store GmbH",
          "id": "DE89370501981234567890",
          "website": "https://online-store.de"
        },
        "currency": "EUR",
        "amount": 49.99
      }
    }
  ]
}
```
</details>
<details><summary><strong>5. Issuer PSP sends OpenID4VP request (JAR) to Wallet Unit</strong></summary>

The PSP signs the request as a JWT (JAR) using its WRPAC and pushes it to the User's EUDI Wallet Unit (e.g., via App Links or QR code for cross-device).
</details>
<details><summary><strong>6. Wallet Unit verifies PSP WRPAC certificate chain</strong></summary>

The Wallet Unit cryptographically verifies the PSP's WRPAC certificate chain against the LoTE trust anchor to confirm the requester is an authorized financial institution.
</details>
<details><summary><strong>7. Wallet Unit validates SCA attestation type via VCT metadata</strong></summary>

The Wallet resolves the requested credential's VCT metadata to confirm it qualifies for SCA.

```json
{
  "vct": "https://pay.example-bank.de/card",
  "category": "urn:eu:europa:ec:eudi:sua:sca",
  "transaction_data_types": {
    "urn:eudi:sca:payment:1": {
      "schema_uri": "https://standards.example.org/eudiw-trx/payment-1.json",
      "ui_labels": {
        "affirmative_action_label": [
          {"lang": "de", "value": "Zahlung bestätigen"},
          {"lang": "en", "value": "Confirm Payment"}
        ],
        "denial_action_label": [
          {"lang": "de", "value": "Zahlung abbrechen"},
          {"lang": "en", "value": "Cancel Payment"}
        ]
      }
    }
  }
}
```

The Wallet verifies that `category` is `urn:eu:europa:ec:eudi:sua:sca`, confirming this is an SCA attestation.
</details>
<details><summary><strong>8. Wallet Unit validates transaction_data type</strong></summary>

The Wallet checks that `urn:eudi:sca:payment:1` exists in the `transaction_data_types` map allowed by this credential.
</details>
<details><summary><strong>9. Wallet Unit validates transaction payload against JSON Schema</strong></summary>

The Wallet validates the structural integrity of the `payload` object against the authoritative JSON Schema linked in the VCT metadata.
</details>
<details><summary><strong>10. Wallet Unit renders consent screen with transaction details</strong></summary>

The Wallet dynamically renders the consent screen layout according to the TS12 display hierarchy.

| Level | Displayed Fields | Rendering |
|:------|:----------------|:----------|
| **1** (prominent) | `amount`: 49.99, `currency`: EUR, `payee.name`: Online Store GmbH | Large font, main screen |
| **2** | `payee.id`: DE89370501981234567890 | Normal font, main screen |
| **3** | (none in this example) | Supplementary screen |
| **4** | `transaction_id`, `date_time` | Omitted from display |
| **Button** | "Zahlung bestätigen" | From `ui_labels.affirmative_action_label` (de) |
</details>
<details><summary><strong>11. User approves payment via biometric or PIN</strong></summary>

The User reviews the transaction details and provides explicit consent via High LoA local authentication (e.g., FaceID or PIN).
</details>
<details><summary><strong>12. Wallet Unit builds KB-JWT with SCA proof and transaction hash</strong></summary>

The Wallet builds the Key Binding JWT, which inherently acts as the requested SCA proof by dynamically linking the transaction details to the cryptographic signature.

```json
{
  "typ": "kb+jwt",
  "alg": "ES256"
}
```

```json
{
  "aud": "x509_hash://sha-256/Vn7tQ1eKzLb4g3RmXwYp0s2H8dFcNj5iOuAx9kBv_Wc",
  "iat": 1741269093,
  "jti": "deeec2b0-3bea-4477-bd5d-e3462a709481",
  "nonce": "bUtJdjJESWdmTWNjb011YQ",
  "sd_hash": "Re-CtLZfjGLErKy3eSriZ4bBx3AtUH5Q5wsWiiWKIwY",
  "amr": [
    {"knowledge": "pin_6_or_more_digits"},
    {"inherence": "fingerprint_device"}
  ],
  "transaction_data_hashes": [
    "OJcnQQByvV1iTYxiQQQx4dact-TNnSG-Ku_cs_6g55Q"
  ],
  "transaction_data_hashes_alg": "sha-256",
  "response_mode": "direct_post.jwt"               // TS12-specific extension
}
```

Key claims explained:

| Claim | Purpose | PSD2 Relevance |
|:------|:--------|:---------------|
| `jti` | Unique identifier, serves as the **Authentication Code** | PSD2 RTS Art. 4 — unique code linked to amount and payee |
| `amr` | Documents the authentication factors applied (knowledge + inherence = 2 of 3) | PSD2 Art. 97 — at least 2 independent SCA elements |
| `transaction_data_hashes` | SHA-256 of the `transaction_data[0].payload` (base64url) | PSD2 Art. 97(2) — dynamic linking: code bound to amount + payee |
| `sd_hash` | Binds KB-JWT to the specific SD-JWT VC presentation | Prevents replay with different credentials |
</details>
<details><summary><strong>13. Wallet Unit sends encrypted JWE response to PSP</strong></summary>

The Wallet fully encrypts the presentation response into a JWE utilizing the PSP's ephemeral public key and posts it to the `response_uri`.
</details>
<details><summary><strong>14. Issuer PSP verifies SCA attestation signature</strong></summary>

The PSP decrypts the JWE and verifies the SD-JWT issuer signature of the SCA Attestation to ensure the credential itself is legitimate.
</details>
<details><summary><strong>15. Issuer PSP verifies KB-JWT signature and SCA factors</strong></summary>

The PSP verifies the KB-JWT signature against the public key bound in the credential. It checks the `aud`, `nonce` uniqueness (`jti`), and verifies that `amr` contains at least 2 of the 3 SCA factor categories.
</details>
<details><summary><strong>16. Issuer PSP verifies dynamic linking (transaction hash match)</strong></summary>

The PSP recalculates `SHA-256(transaction_data[0].payload)` and compares it against `transaction_data_hashes[0]` enclosed in the KB-JWT. Matching hashes irrefutably prove the user approved the exact payment amount and payee.
</details>
<details><summary><strong>17. Issuer PSP approves financial authorization</strong></summary>

With SCA mathematically verified, the PSP approves the financial authorization and informs the Merchant backend.
</details>
<details><summary><strong>18. Merchant confirms payment to User</strong></summary>

The Merchant updates the checkout session and confirms to the User that the payment was successful.
</details>

#### 13.6 Third-Party-Requested SCA Flow

In the **third-party-requested SCA flow**, a party other than the issuer bank (e.g., an AISP or PISP under PSD2/PSR) requests SCA from the User. The flow is structurally identical to §13.3 but with a different requesting party.

Key differences:

- The requesting party is an AISP (Account Information Service Provider) or PISP (Payment Initiation Service Provider)
- The AISP/PISP must be registered as an RP with a valid WRPAC
- The transaction data may contain account access information rather than payment details
- The issuer PSP may still be involved for authorization validation

#### 13.7 Transaction Data Structure

TS12 defines the `transaction_data` parameter that is included in the OpenID4VP presentation request for SCA flows. This data binds the authentication to the specific transaction (PSD2 dynamic linking):

```json
{
  "transaction_data": [
    {
      "type": "payment_transaction",
      "credential_ids": ["sca_attestation"],
      "transaction_data_hashes_alg": "sha-256",
      "payment_data": {
        "amount": "149.99",
        "currency": "EUR",
        "payee_name": "TechStore España S.L.",
        "payee_account": "ES91 2100 0418 4502 0005 1332",
        "payment_reference": "INV-2026-07890",
        "date": "2026-07-15T14:30:00Z"
      }
    }
  ]
}
```

#### 13.8 Dynamic Linking Requirements

PSD2 Art. 97(2) requires that authentication codes are dynamically linked to a specific amount and payee. In the EUDI Wallet flow:

1. The `transaction_data` containing amount and payee is included in the presentation request
2. The Wallet Unit displays exact transaction details to the User
3. The User authenticates specifically for this transaction (not a generic auth)
4. The WSCA/WSCD signs a hash of the transaction data with the device-bound key
5. The SCA attestation in the response includes the signed transaction hash
6. The PSP verifies the signature, confirming the User authenticated for exactly this transaction

This satisfies the three pillars of PSD2 SCA:

| Pillar | SCA Element | EUDI Wallet Implementation |
|:-------|:------------|:---------------------------|
| **Knowledge** | Something only the user knows | PIN (WSCA/WSCD authentication) |
| **Possession** | Something only the user has | Device-bound key in WSCA/WSCD |
| **Inherence** | Something the user is | Biometric (WSCA/WSCD authentication) |

#### 13.9 Transaction Data Types (TS12 §4.3)

TS12 defines four standardised payload schemas (non-normative examples — the exact claim names may vary by Type Metadata definition):

| URN Identifier | Use Case | Required Fields |
|:---------------|:---------|:----------------|
| `urn:eudi:sca:payment:1` | Payment confirmation | `transaction_id`, `payee` (name + id), `currency`, `amount` |
| `urn:eudi:sca:login_risk_transaction:1` | Login and risk-based auth | `transaction_id`, `action` |
| `urn:eudi:sca:account_access:1` | Account information access (AISP) | `transaction_id` |
| `urn:eudi:sca:emandate:1` | E-mandate for payee-initiated tx | `transaction_id`, conditional: `purpose` or `payment_payload` |

#### 13.10 KB-JWT Authentication Methods Reference (amr)

TS12 §3.6 mandates an `amr` claim in the Key Binding JWT that documents the authentication factors used. This is critical for PSD2 RTS traceability:

```json
{
  "aud": "x509_hash://sha-256/Pk2mR8wFgNq1Xb5TjY0vLs3H7cAe9KdIoUx6zJn_QhE",
  "iat": 1741269093,
  "jti": "deeec2b0-3bea-4477-bd5d-e3462a709481",
  "nonce": "bUtJdjJESWdmTWNjb011YQ",
  "sd_hash": "Re-CtLZfjGLErKy3eSriZ4bBx3AtUH5Q5wsWiiWKIwY",
  "amr": [
    {"knowledge": "pin_6_or_more_digits"},
    {"possession": "key_in_local_internal_wscd"},
    {"inherence": "fingerprint_device"}
  ],
  "transaction_data_hashes": [
    "OJcnQQByvV1iTYxiQQQx4dact-TNnSG-Ku_cs_6g55Q"
  ],
  "transaction_data_hashes_alg": "sha-256",
  "response_mode": "direct_post.jwt"               // TS12-specific extension
}
```

The `jti` claim serves as the **Authentication Code** required by PSD2 RTS. The `amr` proves at least 2 of 3 SCA factors were applied.

#### 13.11 Payment Payload JSON Schema (TS12 Normative)

The exact JSON Schema from `ts12-urn-eudi-sca-payment-1-data-model.json`:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "transaction_id": {"type": "string", "maxLength": 36, "minLength": 1},
    "date_time": {"type": "string", "format": "date-time"},
    "payee": {
      "type": "object",
      "properties": {
        "name": {"type": "string"},
        "id": {"type": "string"},
        "logo": {"type": "string", "format": "uri"},
        "website": {"type": "string", "format": "uri"}
      },
      "required": ["name", "id"]
    },
    "pisp": {
      "type": "object",
      "properties": {
        "legal_name": {"type": "string"},
        "brand_name": {"type": "string"},
        "domain_name": {"type": "string"}
      },
      "required": ["legal_name", "brand_name", "domain_name"]
    },
    "execution_date": {"type": "string", "format": "date-time"},
    "currency": {"type": "string", "pattern": "^[A-Z]{3}$"},
    "amount": {"type": "number"},
    "recurrence": {
      "type": "object",
      "properties": {
        "frequency": {
          "type": "string",
          "enum": ["INDA","DAIL","WEEK","TOWK","TWMN",
                   "MNTH","TOMN","QUTR","FOMN","SEMI",
                   "YEAR","TYEA"]
        }
      },
      "required": ["frequency"]
    }
  },
  "required": ["transaction_id", "payee", "currency", "amount"],
  "additionalProperties": false
}
```

#### 13.12 SCA Attestation Metadata Visualisation Levels

TS12 §3.3.1 defines display hierarchy levels for transaction data fields:

| Level | Display Requirement | Example Fields |
|:------|:-------------------|:---------------|
| **1** | **Prominently** on main confirmation screen | `amount`, `currency`, `payee.name` |
| **2** | On main confirmation screen | `payee.id`, `execution_date` |
| **3** | Displayed, but MAY be on supplementary screen | `pisp.legal_name`, `recurrence.frequency` |
| **4** | MAY be omitted from display | `transaction_id`, `date_time` |

The Wallet Unit renders a custom consent screen with localised labels from the `ui_labels` catalogue:

```json
{
  "affirmative_action_label": [
    {"lang": "de", "value": "Zahlung bestätigen"},
    {"lang": "en", "value": "Confirm Payment"}
  ],
  "denial_action_label": [
    {"lang": "de", "value": "Zahlung abbrechen"},
    {"lang": "en", "value": "Cancel Payment"}
  ]
}
```

---

#### 13.13 SCA Attestation Issuance Overview

While this document focuses on the RP (verification) side, bank RPs in the SCA flow are unique in that they also **issue** SCA attestations to users' Wallet Units. The issuance uses OID4VCI (OpenID for Verifiable Credential Issuance) and follows this high-level lifecycle:

1. **Enrolment trigger**: User adds payment instrument (card/account) to their Wallet via the bank's app
2. **Authentication**: Bank authenticates the User through existing channels (existing SCA, online banking login)
3. **Credential Offer**: Bank's OID4VCI endpoint sends a Credential Offer to the Wallet Unit (same-device or cross-device)
4. **Wallet requests credential**: Wallet Unit calls the bank's OID4VCI Token Endpoint, then the Credential Endpoint
5. **Bank issues SCA attestation**: Bank creates the SD-JWT VC with `category: "urn:eu:europa:ec:eudi:sua:sca"`, signs it with the bank's Attestation Provider key, and includes the User's `cnf` device public key
6. **Wallet stores**: Wallet Unit stores the SCA attestation alongside the User's PID
7. **Lifecycle**: SCA attestation may be short-lived (requiring periodic re-issuance) or long-lived with revocation via Status List

| Lifecycle Event | Bank Action | Wallet Impact |
|:----------------|:------------|:--------------|
| **Card replaced** | Revoke old SCA attestation; trigger new issuance | User re-enrols new card |
| **Account closed** | Revoke SCA attestation via Status List | Wallet shows attestation as invalid |
| **Fraud detected** | Immediate revocation via Status List | SCA flow fails; User must contact bank |
| **Attestation expired** | OID4VCI re-issuance flow | Wallet prompts User to refresh |

> **Open area**: TS12 cross-references OID4VCI for the issuance protocol but does not fully specify the SCA-specific issuance parameters (e.g., mandatory claims in the Credential Offer, required authentication level for enrolment). This is listed as Open Question #8.

#### 13.14 OID4VCI Issuance Flow for SCA Attestations

Banks are unique in the EUDI Wallet ecosystem in that they act as both **issuers** (of SCA attestations via OID4VCI) and **verifiers** (of SCA attestations via OpenID4VP). This section details the issuance side.

**OpenID for Verifiable Credential Issuance (OID4VCI) 1.0** — which achieved Final Specification status in September 2025 — defines the protocol for issuing credentials to Wallet Units. For SCA attestation issuance, the **Pre-Authorized Code** flow is the expected pattern, since the bank has already authenticated the user through existing banking channels before issuance begins.

```mermaid
---
config:
  themeVariables:
    noteBkgColor: "transparent"
    noteBorderColor: "transparent"
  sequence:
    messageAlign: left
    noteAlign: left
    actorMargin: 120
---
sequenceDiagram
    participant User as 👤 User
    participant WU as 📱 Wallet Unit
    participant Bank as 🏦 Bank (Issuer)

    rect rgba(148, 163, 184, 0.14)
    Note right of User: Phase 1: Enrolment Trigger
    User->>Bank: 1. Open banking app, select<br/>"Add card to EUDI Wallet"
    Bank->>Bank: 2. Authenticate User<br/>(existing SCA / online banking)
    Bank->>Bank: 3. Generate pre-authorized_code<br/>+ tx_code (optional PIN)
    end

    rect rgba(52, 152, 219, 0.14)
    Note right of User: Phase 2: Credential Offer
    Bank->>WU: 4. Credential Offer<br/>(same-device deeplink or QR)
    WU->>WU: 5. Parse Credential Offer,<br/>resolve Issuer metadata
    WU->>Bank: 6. POST /token<br/>(pre-authorized_code + tx_code)
    Bank->>WU: 7. access_token + c_nonce
    end

    rect rgba(46, 204, 113, 0.14)
    Note right of User: Phase 3: Credential Issuance
    WU->>WU: 8. Generate device key pair<br/>(EC P-256, in WSCA/WSCD)
    WU->>WU: 9. Build proof-of-possession<br/>(JWT signed with device key,<br/>including c_nonce)
    WU->>Bank: 10. POST /credential<br/>(format: dc+sd-jwt,<br/>vct, proof)
    Bank->>Bank: 11. Create SD-JWT VC<br/>with SCA claims + cnf
    Bank->>WU: 12. SD-JWT VC response
    WU->>WU: 13. Store SCA attestation
    WU->>User: 14. "Card added to Wallet"
    Note right of Bank: ⠀
    end
```

<details><summary><strong>1. User opens banking app and selects "Add card to EUDI Wallet"</strong></summary>

The User decides to provision an SCA-compliant payment card into their EUDI Wallet and initiates the process from within the issuer Bank's existing mobile application.
</details>
<details><summary><strong>2. Bank authenticates User via existing SCA</strong></summary>

The Bank authenticates the User using its existing Strong Customer Authentication (SCA) mechanisms (e.g., banking app PIN or biometrics) to verify their identity before issuing the credential.
</details>
<details><summary><strong>3. Bank generates pre-authorized_code and optional tx_code</strong></summary>

The Bank prepares for the OID4VCI issuance flow by generating a `pre-authorized_code` tied to the authenticated session and, optionally, a `tx_code` (transaction code like an OTP) to enforce an additional factor during Wallet binding.
</details>
<details><summary><strong>4. Bank sends Credential Offer to Wallet Unit</strong></summary>

The Bank sends a Credential Offer to the Wallet Unit, typically via a same-device deeplink or by displaying a QR code.

```json
{
  "credential_issuer": "https://pay.example-bank.de",
  "credential_configuration_ids": ["sca-card-de"],
  "grants": {
    "urn:ietf:params:oauth:grant-type:pre-authorized_code": {
      "pre-authorized_code": "SplxlOBeZQQYba49Wd8E3eNLA0f3k2qR",
      "tx_code": {
        "input_mode": "numeric",
        "length": 6,
        "description": "Enter the code sent to your registered phone number"
      }
    }
  }
}
```

Key fields:

| Field | Purpose |
|:------|:--------|
| `credential_issuer` | Bank's OID4VCI Issuer Identifier — the Wallet resolves `/.well-known/openid-credential-issuer` from this |
| `credential_configuration_ids` | References a configuration in the Issuer's metadata that defines the SCA attestation format and claims |
| `pre-authorized_code` | One-time code issued by the bank; valid for a single Token Endpoint call |
| `tx_code` | Optional transaction code (PIN/OTP) for additional user binding — sent via SMS or push notification |
</details>
<details><summary><strong>5. Wallet Unit parses Credential Offer and resolves Issuer metadata</strong></summary>

The Wallet Unit parses the Credential Offer and fetches the Bank's OID4VCI Issuer Metadata from `/.well-known/openid-credential-issuer` to understand the endpoints and supported credential configurations.
</details>
<details><summary><strong>6. Wallet Unit exchanges pre-authorized_code at Token Endpoint</strong></summary>

The Wallet calls the Bank's Token Endpoint to exchange the `pre-authorized_code` (and `tx_code` if required) for an access token.

```http
POST /token HTTP/1.1
Host: pay.example-bank.de
Content-Type: application/x-www-form-urlencoded

grant_type=urn:ietf:params:oauth:grant-type:pre-authorized_code
&pre-authorized_code=SplxlOBeZQQYba49Wd8E3eNLA0f3k2qR
&tx_code=123456
```
</details>
<details><summary><strong>7. Bank returns access_token and c_nonce to Wallet Unit</strong></summary>

The Bank validates the codes and responds with an `access_token` and a cryptographic `c_nonce`.

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiJ9.eyJpc3Mi...",
  "token_type": "Bearer",
  "expires_in": 300,
  "c_nonce": "fGFF7UkhLa",
  "c_nonce_expires_in": 300
}
```

The `c_nonce` is critical — the Wallet must include it in the proof-of-possession JWT sent to the Credential Endpoint. This binds the device key to this specific issuance session.
</details>
<details><summary><strong>8. Wallet Unit generates EC P-256 device key pair in WSCA/WSCD</strong></summary>

The Wallet Unit locally generates a new Elliptic Curve key pair (P-256) bound to the Wallet Secure Cryptographic Application (WSCA/WSCD) hardware. This key will securely bind the credential to the specific device.
</details>
<details><summary><strong>9. Wallet Unit builds proof-of-possession JWT with c_nonce</strong></summary>

The Wallet constructs a JWT proving possession of the newly generated private key. The JWT payload includes the Bank's `c_nonce` to link the proof structurally to the current issuance session.
</details>
<details><summary><strong>10. Wallet Unit sends credential request to Bank Credential Endpoint</strong></summary>

The Wallet calls the Bank's Credential Endpoint, presenting the `access_token`, requesting the specific VCT format, and supplying the proof-of-possession JWT.

```http
POST /credential HTTP/1.1
Host: pay.example-bank.de
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9.eyJpc3Mi...
Content-Type: application/json
```

```json
{
  "format": "dc+sd-jwt",
  "vct": "https://pay.example-bank.de/card",
  "proof": {
    "proof_type": "jwt",
    "jwt": "eyJhbGciOiJFUzI1NiIsInR5cCI6Im9wZW5pZDR2Y2ktcHJvb2Yrand0Iiwian..."
  }
}
```

The proof JWT (decoded):

```json
// Header
{
  "alg": "ES256",
  "typ": "openid4vci-proof+jwt",
  "jwk": {
    "kty": "EC",
    "crv": "P-256",
    "x": "TCAER19Zvu3OHF4j4W4vfSVoHIP1ILilDls7vCeGemc",
    "y": "ZxjiWWbZMQGHVWKVQ4hbSIirsVfuecCE6t4jT9F2HZQ"
  }
}

// Payload
{
  "iss": "https://self-issued.me/v2",
  "aud": "https://pay.example-bank.de",
  "iat": 1741269093,
  "nonce": "fGFF7UkhLa"
}
```

The `jwk` in the proof JWT header is the Wallet's device public key. The Bank will embed this key into the issued credential.
</details>
<details><summary><strong>11. Bank creates SD-JWT VC with SCA claims and device key binding</strong></summary>

The Bank verifies the proof-of-possession, extracts the `jwk` from the proof header, and creates the SCA Attestation (SD-JWT VC). The Bank's Attestation Provider signs the credential, embedding the public key into the `cnf` (confirmation) claim.

```json
// Issuer-signed JWT payload
{
  "iss": "https://pay.example-bank.de",
  "iat": 1741269093,
  "exp": 1772805093,
  "vct": "https://pay.example-bank.de/card",
  "status": {
    "status_list": {
      "idx": 1847,
      "uri": "https://pay.example-bank.de/status/sca-1"
    }
  },
  "cnf": {
    "jwk": {
      "kty": "EC",
      "crv": "P-256",
      "x": "TCAER19Zvu3OHF4j4W4vfSVoHIP1ILilDls7vCeGemc",
      "y": "ZxjiWWbZMQGHVWKVQ4hbSIirsVfuecCE6t4jT9F2HZQ"
    }
  },
  "_sd": ["...hashes of selectively-disclosable claims..."],
  "_sd_alg": "sha-256"
}

// Selectively-disclosable claims (embedded via SD-JWT disclosures):
// - pan_last_four: "4242"
// - scheme: "visa"
// - scheme_logo: "https://pay.example-bank.de/logos/visa.svg"
// - card_holder_name: "Anna Müller"
```

The `cnf.jwk` matches the device public key from the proof JWT. When this SCA attestation is later presented for a payment authorization (§13.4), the Wallet signs a KB-JWT with the corresponding private key — proving possession of the device key and binding the authentication to this specific attestation.
</details>
<details><summary><strong>12. Bank delivers SD-JWT VC response to Wallet Unit</strong></summary>

The Bank responds to the Wallet's /credential request with the fully formed, signed SD-JWT VC.
</details>
<details><summary><strong>13. Wallet Unit stores SCA attestation securely</strong></summary>

The Wallet securely stores the newly issued SCA Attestation alongside the private key generated in Step 8.
</details>
<details><summary><strong>14. Wallet Unit confirms "Card added to Wallet" to User</strong></summary>

The Wallet displays a success message to the User, confirming the payment card (represented by the SCA Attestation) is now ready for use.
</details>

> **PSP implementation note**: The bank must ensure its OID4VCI Issuer Metadata (at `/.well-known/openid-credential-issuer`) includes the SCA attestation in its `credential_configurations_supported` map, with the `category` claim set to `urn:eu:europa:ec:eudi:sua:sca` in the VCT Type Metadata. This allows Wallet Units to recognise the attestation as SCA-capable and match it against TS12 DCQL queries from other PSPs.

---

#### 13.15 Transactional Data HLRs (Topic W)

##### 13.15.1 Context

ARF Discussion Paper Topic W (v0.97, May 2025) formalises the Wallet's transactional data handling for payment SCA and other use cases requiring User authorisation of a specific action. While §13.7 covers the `transaction_data` structure from TS12, Topic W establishes **High-Level Requirements** (TD_01–TD_04) that define the Wallet Unit's obligations and — critically — the RP's ability to control the consent experience.

The Wallet Unit's role in transactional data handling spans three lifecycle phases:

1. **Registration** — the RP registers as an authenticator and issues "service credentials" (SCA attestations) to the Wallet Unit
2. **Authentication** — the Wallet receives a presentation request with transactional data, displays it to the User, and returns a signed response
3. **De-registration** — unlinking the Wallet Unit from the service

##### 13.15.2 HLR Summary

| HLR | Requirement | RP Implication |
|:----|:------------|:---------------|
| **TD_01** | Wallet Unit SHALL process and render transactional data included in the presentation request. SHALL display transactional data (or parts of it) to the User in a clear, understandable, and accurate manner when obtaining User confirmation. Content and rendering rules are defined by an Attestation Rulebook (ARF Topic 12). | RP must structure `transaction_data` so the Wallet can extract displayable fields (amount, payee, date). The RP should define rendering rules in the applicable Attestation Rulebook. |
| **TD_02** | Wallet Unit SHALL deliver transactional data (or parts of it) in the response to the requesting RP, if required by the use case. Format and content SHALL be set in an Attestation Rulebook or in information provided to the Wallet Unit in the presentation request. | RP receives the transactional data back in the signed response — enabling server-side verification of what the User saw and approved. |
| **TD_03** | Wallet Unit SHALL sign the response (including transactional data) with the private key of the attestation, using the mechanisms provided by SD-JWT VC and ISO/IEC 18013-5. _Note: Such a response constitutes a proof of transaction, as well as fulfils the requirement of the authentication code required in PSD2._ | **The signed response IS the PSD2 Dynamic Linking proof.** The KB-JWT signature over `transaction_data_hashes` creates a cryptographic binding between the User's approval and the specific transaction amount/payee. |
| **TD_04** | Wallet Unit SHALL dynamically adapt the dialog displayed to the User (font size, colour, background colour, text position, button labels to "approve" or "reject" a transaction) based on the transactional data contained in the presentation request, per Attestation Rulebook rules. | RP can influence the User's consent UI appearance via structured transactional data fields. This enables payment-specific experiences (e.g., a green "Pay €149.99" button instead of a generic "Approve"). |

##### 13.15.3 PSD2 Dynamic Linking Proof Chain

The TD_03 requirement closes the loop on PSD2 Art. 97(2) Dynamic Linking (see also §13.8). The complete chain of proof is:

```
1. RP includes `transaction_data` in OpenID4VP request (§13.7)
     ↓
2. Wallet Unit displays amount + payee to User (TD_01)
     ↓
3. User approves → WSCA/WSCD signs KB-JWT including
   `transaction_data_hashes` (TD_03)
     ↓
4. RP verifies KB-JWT signature + transaction_data_hashes
     = PSD2 authentication code dynamically linked
       to specific amount + payee
```

This satisfies all three PSD2 Dynamic Linking requirements:
- **Payer awareness**: The Wallet displays the exact transaction details (TD_01)
- **Binding to amount and payee**: The `transaction_data_hashes` in the KB-JWT are computed over the amount and payee fields (TD_03)
- **Integrity**: Any modification to the transaction data after User approval invalidates the KB-JWT signature

##### 13.15.4 Attestation Rulebooks for Transactional Data

Topic W delegates content and rendering rules to **Attestation Rulebooks** (ARF Topic 12). For payment SCA, the relevant Rulebook will be defined by the payment scheme (e.g., Visa, Mastercard) or the national payment authority. The Rulebook specifies:

- Which fields of `transaction_data` are mandatory for display (e.g., amount and payee are always displayed)
- How the consent dialog should be styled (TD_04) — colours, button labels, layout
- Whether the transactional data is returned verbatim or as a hash in the response (TD_02)
- The scope of information logged in the Wallet's transaction log (linked to TS10)

> **Key constraint**: Topic W explicitly states that the discussion is ONLY intended to establish HLRs — the necessary technical specifications will be developed after agreement. RPs should track the development of payment-specific Attestation Rulebooks for exact field definitions.

##### 13.15.5 Non-Payment Use Cases

The transactional data mechanism is not limited to payments. Topic W identifies a second core use case:

- **Remote Qualified Electronic Signature (QES)**: A signing service RP can include the document hash in `transaction_data`, causing the Wallet to display "Sign document: contract_v2.pdf" to the User before the WSCA signs the KB-JWT. The signed response then serves as the QES activation proof.

Any use case where Article 5f(2) requires strong user authentication — transport, energy, health, postal services, digital infrastructure, education, telecoms — can leverage `transaction_data` to bind the authentication to a specific transaction context.

> **Cross-references**: §13.7 (transaction data structure), §13.8 (Dynamic Linking), §13.11 (payment payload JSON schema), §18.2 (PSD2/PSR and SCA bridge).

---

### 14. Pseudonym-Based Authentication and WebAuthn

#### 14.1 Overview

The EUDI Wallet supports pseudonyms as an alternative to attribute-based identification. This is a fundamental privacy feature: Users can interact with services without revealing their legal identity, yet still authenticate persistently across sessions. For RPs, pseudonym support is not optional — Art. 5b(9) of eIDAS 2.0 mandates that RPs **shall not refuse** pseudonyms where identification is not required by Union or national law.

The pseudonym functionality is defined in [CIR 2024/2979], Art. 14, which references [W3C WebAuthn] Level 2 (Annex V) as the technical specification. ARF v2.8.0 (incorporating Discussion Paper Topic E) further elaborates four use cases, three pseudonym types, and associated High-Level Requirements (PA_01–PA_22).

#### 14.2 Pseudonym Types

The ARF defines three distinct pseudonym types, each offering different assurance guarantees:

| Type | Description | Assurance to RP | Use Cases |
|:-----|:------------|:----------------|:----------|
| **Verifiable pseudonym** | User can prove possession of the pseudonym and authenticate as it | RP knows the same User is returning | A, B, D |
| **Attested pseudonym** | A third party (e.g., Attestation Provider acting as issuer) attests that a pseudonym is owned by a User | RP can verify the pseudonym was issued by a trusted party | A, B, D |
| **Scope rate-limited pseudonym** | User is guaranteed to control only a certain number of pseudonyms within a given scope | RP can verify uniqueness guarantees (e.g., one vote per person) | C |

> **Key insight for RPs**: Verifiable pseudonyms (via WebAuthn) are the baseline. Attested pseudonyms are already possible by any Attestation Provider issuing a (Q)EAA attesting to a pseudonym. Scope rate-limited pseudonyms require new cryptographic protocols not yet standardised — the ARF has published guiding HLRs but the Commission will not develop a concrete scheme.

#### 14.3 Pseudonym Use Cases (A–D)

| Use Case | Description | Example | Pseudonym Type |
|:---------|:------------|:--------|:---------------|
| **A: Pseudonymous authentication** | Wallet generates a unique, persistent pseudonym per RP. User registers it, then authenticates with it in subsequent sessions. Multiple pseudonyms per RP are allowed. | Forum account, loyalty programme | Verifiable |
| **B: Attributes + subsequent pseudonym auth** | Same as A, but User also presents verifiable attributes (e.g., `age_over_18`) during registration alongside the pseudonym | Age-gated streaming service account | Verifiable (+ combined presentation) |
| **C: Rate-limited participation** | RP can verify that a User controls at most N pseudonyms within a scope. Prevents Sybil attacks (multiple accounts, vote stuffing, troll farms). | Electronic voting, one-per-person surveys | Scope rate-limited |
| **D: Linkable pseudonymous auth** | A single pseudonym is recognised across multiple RPs, enabling cross-RP linkability within a sector | e-Commerce order → carrier pickup with same pseudonym | Verifiable (same pseudonym registered at multiple RPs) |

#### 14.4 Legal Framework: When Must RPs Accept Pseudonyms?

Art. 5b(9) creates a **default-accept** rule for pseudonyms, with identification-required exceptions carved out by EU or national law. The following table maps common RP sectors to their identification obligations:

| RP Sector | Legal Identification Required? | Basis | Pseudonym Acceptance |
|:----------|:-------------------------------|:------|:---------------------|
| **Banks (account opening)** | ✅ Yes | AMLD Art. 13 (CDD) | Must identify for KYC; pseudonym NOT sufficient for account opening |
| **Banks (returning customer auth)** | ❌ No (after CDD) | — | **Must accept** pseudonym for session authentication post-KYC |
| **Payment initiation (SCA)** | ✅ Yes | PSD2 Art. 97 | SCA attestation bound to identity; pseudonym alone NOT sufficient |
| **Telecom (SIM registration)** | ✅ Yes (most MS) | National law | Identity required in most Member States |
| **Healthcare (prescription)** | ✅ Yes | National health law | Legal identification required for medical records |
| **VLOPs (user login)** | ❌ No | eIDAS 2.0 Recital 57 | **Must accept** pseudonym; VLOPs explicitly referenced |
| **Age verification (retail/content)** | ❌ No | — | **Must accept** pseudonym + `age_over_18` (Use Case B) |
| **Public forums/social media** | ❌ No | — | **Must accept** pseudonym |
| **Government services** | ✅ Yes | Various national laws | Legal identification typically required |
| **E-commerce (guest checkout)** | ❌ No | — | **Must accept** pseudonym |

> **RP compliance risk**: An RP that refuses pseudonyms when identification is not legally required is in **direct violation** of Art. 5b(9). This is enforceable by the supervisory authority designated under Art. 5b(11).

#### 14.5 WebAuthn Protocol Architecture

[CIR 2024/2979] Art. 14 and Annex V mandate [W3C WebAuthn] Level 2 as the technical specification for pseudonym generation. The Wallet Unit acts as the **WebAuthn Authenticator**; the User's browser is the **Client**; the RP is the **Relying Party Server**.

> **ARF v2.8.0 change**: ARF v2.8.0 (incorporating the final Discussion Paper for Topic E) makes WebAuthn implementation *optional* for Wallet Units (PA_22 change). Wallet Providers MAY implement alternative pseudonym technologies, provided they meet the HLRs. However, WebAuthn remains the only currently standardised approach.

#### 14.5.1 Registration: `navigator.credentials.create()`

When a User registers a pseudonym at an RP, the browser calls `navigator.credentials.create()` with the following parameters:

```json
{
  "publicKey": {
    "rp": {
      "id": "forum.example.com",
      "name": "Example Forum"
    },
    "user": {
      "id": "dXNlci0xMjM0NTY3ODkw",
      "name": "user_chosen_alias",
      "displayName": "My Forum Account"
    },
    "challenge": "Y2hhbGxlbmdlLWZyb20tc2VydmVy",
    "pubKeyCredParams": [
      {"type": "public-key", "alg": -7},
      {"type": "public-key", "alg": -257}
    ],
    "timeout": 60000,
    "attestation": "none",
    "authenticatorSelection": {
      "authenticatorAttachment": "platform",
      "residentKey": "required",
      "userVerification": "required"
    }
  }
}
```

Key parameters for RP implementers:

| Parameter | Value | Why |
|:----------|:------|:----|
| `rp.id` | RP's domain | Scopes the pseudonym to this RP (PA_04: pseudonyms SHALL be unique per RP) |
| `user.id` | RP-assigned opaque ID | The RP maps this to the pseudonym account internally |
| `attestation` | `"none"` | Recommended for privacy — `"direct"` or `"enterprise"` attestation types risk cross-RP linkability (see §14.9) |
| `authenticatorSelection.residentKey` | `"required"` | Discoverable credential — enables passwordless login |
| `authenticatorSelection.userVerification` | `"required"` | User must authenticate to the Wallet Unit (biometric/PIN) |
| `pubKeyCredParams[0].alg` | `-7` (ES256) | P-256 ECDSA — mandatory in EUDI ecosystem |

The Wallet Unit (Authenticator) responds with a `PublicKeyCredential` containing:

```json
{
  "id": "dGVzdC1jcmVkZW50aWFsLWlk",
  "type": "public-key",
  "rawId": "<ArrayBuffer: credential ID>",
  "response": {
    "clientDataJSON": "<ArrayBuffer: {type, challenge, origin, crossOrigin}>",
    "attestationObject": "<ArrayBuffer: CBOR-encoded {fmt, attStmt, authData}>"
  },
  "authenticatorAttachment": "platform"
}
```

The RP extracts the public key from `attestationObject.authData` and stores it alongside the `credentialId` and `user.id`.

#### 14.5.2 Authentication: `navigator.credentials.get()`

For subsequent pseudonymous logins, the RP calls `navigator.credentials.get()`:

```json
{
  "publicKey": {
    "rpId": "forum.example.com",
    "challenge": "bmV3LWNoYWxsZW5nZS1mcm9tLXNlcnZlcg",
    "timeout": 60000,
    "userVerification": "required"
  }
}
```

The Wallet Unit (Authenticator):
1. Prompts the User to select a pseudonym for this RP (if multiple exist)
2. Authenticates the User (biometric/PIN — OS-level, not WSCA/WSCD)
3. Signs the challenge with the private key corresponding to the selected pseudonym
4. Returns the signed assertion with the `credentialId` and `userHandle`

The RP verifies the signature against the stored public key. If valid, the User is authenticated as their pseudonym — **no PID, no legal identity, no attributable data**.

#### 14.6 Pseudonym Registration and Authentication Flow (Agnostic: Applies to Direct RP and Intermediary)

```mermaid
---
config:
  themeVariables:
    noteBkgColor: "transparent"
    noteBorderColor: "transparent"
  sequence:
    messageAlign: left
    noteAlign: left
    actorMargin: 120
---
sequenceDiagram
    participant User as 👤 User
    participant WU as 📱 Wallet Unit<br/>(Authenticator)
    participant Browser as 🖥️ Browser<br/>(Client)
    participant RP as 🌐 RP Server

    rect rgba(148, 163, 184, 0.14)
    Note right of User: Phase 1: Pseudonym Registration
    User->>Browser: 1. Navigate to RP, choose<br/>"Sign in with EUDI Wallet"
    RP->>Browser: 2. PublicKeyCredentialCreationOptions<br/>(rp.id, user.id, challenge)
    Browser->>Browser: 3. Verify rp.id matches origin
    Browser->>WU: 4. Forward creation request
    WU->>User: 5. "Register passkey for<br/>forum.example.com?"
    User->>WU: 6. Approve + biometric/PIN
    WU->>WU: 7. Generate EC P-256 key pair<br/>Store private key in keystore<br/>Scope to rp.id + user.id
    WU->>Browser: 8. PublicKeyCredential<br/>(credentialId, publicKey,<br/>attestationObject)
    Browser->>RP: 9. Forward credential
    RP->>RP: 10. Verify attestation (if any)<br/>Store publicKey + credentialId
    end

    rect rgba(52, 152, 219, 0.14)
    Note right of User: Phase 2: Pseudonymous Authentication (later session)
    User->>Browser: 11. Return to RP
    RP->>Browser: 12. PublicKeyCredentialRequestOptions<br/>(rpId, challenge)
    Browser->>WU: 13. Forward assertion request
    WU->>User: 14. Select pseudonym +<br/>biometric/PIN
    WU->>WU: 15. Sign challenge with<br/>private key for this rp.id
    WU->>Browser: 16. AuthenticatorAssertionResponse<br/>(signature, userHandle,<br/>authenticatorData)
    Browser->>RP: 17. Forward assertion
    RP->>RP: 18. Verify signature against<br/>stored public key<br/>Check challenge freshness
    RP->>RP: 19. Authenticated as pseudonym<br/>(no real identity involved)
    Note right of RP: ⠀
    end
```

<details><summary><strong>1. User navigates to RP and chooses "Sign in with EUDI Wallet"</strong></summary>

The User visits the Relying Party's website and opts to register or sign in using their EUDI Wallet rather than creating a traditional password-based account. The RP's login page should present the EUDI Wallet option alongside traditional login methods (per ARF HLR PA_01 — Wallet Units SHALL support pseudonym creation during online presentation flows). The RP detects whether the browser supports `navigator.credentials.create()` (WebAuthn L3 §5.1) before offering this option; if not supported, the RP falls back to a QR-code-based credential presentation flow (§8) instead.

> **If denied**: The User simply continues with a traditional login. No data is exchanged.
</details>
<details><summary><strong>2. RP Server sends PublicKeyCredentialCreationOptions to Browser</strong></summary>

The RP's backend generates a WebAuthn registration challenge and sends it to the browser via the JavaScript WebAuthn API (WebAuthn L3 §5.1.3). The payload defines the RP identity, an internal user handle, and a cryptographically random challenge:

```json
{
  "publicKey": {
    "rp": {
      "id": "forum.example.com",
      "name": "Example Forum"
    },
    "user": {
      "id": "cHNldWRvbnltLTEyMzQ1",
      "name": "Pseudonym User",
      "displayName": "Pseudonym"
    },
    "challenge": "Y2hhbGxlbmdlLWZyb20tc2VydmVy",
    "pubKeyCredParams": [
      {"type": "public-key", "alg": -7},
      {"type": "public-key", "alg": -257}
    ],
    "timeout": 60000,
    "attestation": "none",
    "authenticatorSelection": {
      "authenticatorAttachment": "platform",
      "residentKey": "required",
      "userVerification": "required"
    }
  }
}
```

The key parameters are documented in §14.5.1. Notably, `alg: -7` (ES256 / P-256 ECDSA) is the mandatory algorithm in the EUDI ecosystem, and `attestation: "none"` is recommended to avoid cross-RP linkability risks (§14.9). The `user.id` is an opaque RP-assigned identifier — it must NOT contain any PID attributes or real-world identifiers, as this would defeat the pseudonym's privacy guarantee (PA_04).
</details>
<details><summary><strong>3. Browser verifies rp.id matches current origin</strong></summary>

The browser performs the WebAuthn origin validation check (WebAuthn L3 §5.1.4, step 7): it verifies that the `rp.id` in the `PublicKeyCredentialCreationOptions` is a registrable domain suffix of the page's effective origin. For example, if the User is visiting `https://forum.example.com/login`, then `rp.id: "forum.example.com"` passes but `rp.id: "evil.com"` is rejected. This is the primary phishing defence — it prevents a malicious site from requesting a credential scoped to a different domain.

> **If validation fails**: The browser throws a `SecurityError` DOMException and the WebAuthn ceremony is aborted. The RP should display a user-friendly error explaining that the authentication could not be completed.
</details>
<details><summary><strong>4. Browser forwards WebAuthn creation request to Wallet Unit</strong></summary>

The browser invokes the platform authenticator — in this case, the EUDI Wallet Unit — via the WebAuthn Authenticator API (WebAuthn L3 §6.3.2, `authenticatorMakeCredential`). The browser passes the `rpEntity`, `userEntity`, `credTypesAndPubKeyAlgs`, and the `hash` of `clientDataJSON` to the authenticator. The Wallet Unit acts as a **platform authenticator** (`authenticatorAttachment: "platform"`), meaning it runs on the same device as the browser rather than over USB/NFC/BLE.

> **EUDI-specific note**: The Wallet Unit's authenticator role is distinct from its WSCA/WSCD role. Pseudonym key pairs are managed by the **OS-level keystore** (Android Keystore / iOS Secure Enclave), not by the WSCA/WSCD used for PID and attestation credentials (§14.4). This separation ensures that pseudonym operations do not require interaction with the eIDAS trust infrastructure.
</details>
<details><summary><strong>5. Wallet Unit prompts User to register passkey</strong></summary>

The Wallet Unit displays a system-level consent dialogue presenting the RP's identity (`rp.name` from the creation options) and asking the User to confirm creation of a new passkey. The prompt typically reads: *"Create a passkey for forum.example.com?"*. The Wallet Unit must display the verified `rp.id`, not just the `rp.name`, to prevent social engineering attacks where a malicious RP sets a misleading `rp.name` (e.g., `"Your Bank"`) while the `rp.id` is a different domain.

> **If denied**: The authenticator returns an error (`NotAllowedError`), the ceremony is aborted, and no key pair is generated. The User can retry or choose a different login method.
</details>
<details><summary><strong>6. User approves and authenticates via biometric or PIN</strong></summary>

The User authorises the credential creation via local user verification — typically a biometric gesture (fingerprint, face) or device PIN/pattern. This satisfies the `userVerification: "required"` constraint from step 2. The authentication happens at the **OS level** (Android BiometricPrompt / iOS LAContext), not via the WSCA/WSCD used for eIDAS attestation credentials — pseudonym key operations deliberately avoid the eIDAS trust chain to maintain the separation between pseudonymous and identified interactions (§14.4).

> **If authentication fails**: The authenticator returns `NotAllowedError` after the OS's maximum retry count (typically 3–5 attempts before falling back to device PIN). The User can retry from the beginning.
</details>
<details><summary><strong>7. Wallet Unit generates EC P-256 key pair scoped to rp.id</strong></summary>

The Wallet Unit generates a fresh ECDSA P-256 key pair (`alg: -7` / ES256) inside the device's hardware-backed keystore (Android StrongBox / iOS Secure Enclave). The private key is **non-exportable** — it never leaves the secure hardware and is bound to the combination of `rp.id` + `user.id` (WebAuthn L3 §6.3.2, step 3). This scoping is the mechanism that enforces ARF HLR PA_04: *"Pseudonyms SHALL be unique per Relying Party"* — the same Wallet Unit generates a different, unlinkable key pair for every RP, making cross-site tracking via credential ID impossible.

> **Key storage**: As a discoverable credential (`residentKey: "required"`), the `credentialId`, `rp.id`, and `user.id` are stored persistently in the authenticator's credential storage — enabling the passwordless login flow in Phase 2 where the Wallet can look up credentials by `rp.id` alone.
</details>
<details><summary><strong>8. Wallet Unit returns PublicKeyCredential to Browser</strong></summary>

The Wallet Unit constructs and returns a `PublicKeyCredential` object (WebAuthn L3 §5.1.3, step 20) containing the newly created credential:

```json
{
  "id": "dGVzdC1jcmVkZW50aWFsLWlk",
  "type": "public-key",
  "rawId": "<ArrayBuffer: credential ID>",
  "response": {
    "clientDataJSON": "<ArrayBuffer: {type, challenge, origin, crossOrigin}>",
    "attestationObject": "<ArrayBuffer: CBOR-encoded {fmt, attStmt, authData}>"
  },
  "authenticatorAttachment": "platform"
}
```

The `attestationObject` is CBOR-encoded and contains the `authData` field (WebAuthn L3 §6.1), which in turn embeds the `credentialPublicKey` in COSE_Key format (RFC 9052). When `attestation: "none"` is used (recommended — §14.9), the `attStmt` is an empty map and `fmt` is `"none"`, providing no attestation to the RP about the authenticator's provenance.
</details>
<details><summary><strong>9. Browser forwards credential to RP Server</strong></summary>

The browser serialises the `PublicKeyCredential` and transmits it to the RP's backend, typically via a `POST` to a `/webauthn/register` endpoint. The browser includes the `clientDataJSON` (which the RP will parse to verify the `challenge`, `origin`, and `type` fields) and the raw `attestationObject`. The RP's transport layer should use TLS 1.3 to protect the credential in transit — though the credential itself is not secret (it contains only the public key), integrity protection prevents tampering with the `challenge` binding.
</details>
<details><summary><strong>10. RP Server verifies attestation and stores public key</strong></summary>

The RP's backend performs the WebAuthn registration verification procedure (WebAuthn L3 §7.1):

1. **Parse `clientDataJSON`** and verify `type` is `"webauthn.create"`, `challenge` matches the server-issued challenge, and `origin` matches the expected RP origin
2. **Decode `attestationObject`** (CBOR) and extract `authData`
3. **Verify `rp.id` hash** — the first 32 bytes of `authData` must equal `SHA-256(rp.id)`
4. **Check flags** — `UP` (User Present) and `UV` (User Verified) bits must both be set (since `userVerification: "required"`)
5. **Extract `credentialPublicKey`** from `authData.attestedCredentialData` (COSE_Key format)
6. **Verify attestation** — for `fmt: "none"`, this is a no-op; for `"packed"` or `"tpm"`, the RP verifies the attestation signature chain
7. **Store** the `credentialId`, `credentialPublicKey`, and `signCount` in the RP's database, associated with the pseudonym account

> **If verification fails** (e.g., challenge mismatch, origin mismatch, flag check failure): The RP rejects the registration and returns an error. No credential is stored.
</details>
<details><summary><strong>11. User returns to RP in a later session</strong></summary>

In a subsequent session (hours, days, or months later), the User returns to the Relying Party's website and wants to log in pseudonymously. The RP's login page detects that the browser supports WebAuthn and offers a "Sign in with passkey" button. Since the credential was created as a discoverable credential (`residentKey: "required"` in step 2), the RP does **not** need to know the User's `credentialId` in advance — the authenticator will look it up automatically by `rp.id`.
</details>
<details><summary><strong>12. RP Server sends PublicKeyCredentialRequestOptions to Browser</strong></summary>

The RP's backend generates an authentication challenge and sends it to the browser via `navigator.credentials.get()` (WebAuthn L3 §5.1.4):

```json
{
  "publicKey": {
    "rpId": "forum.example.com",
    "challenge": "bmV3LWNoYWxsZW5nZS1mcm9tLXNlcnZlcg",
    "timeout": 60000,
    "userVerification": "required"
  }
}
```

Note the absence of `allowCredentials` — since the credential is discoverable (a "resident key"), the Wallet Unit can locate it by `rpId` alone, enabling a truly passwordless flow. The `challenge` is a fresh, cryptographically random value (minimum 16 bytes per WebAuthn L3 §13.4.3) that the server stores server-side for verification in step 18. See §14.5.2 for parameter details.
</details>
<details><summary><strong>13. Browser forwards assertion request to Wallet Unit</strong></summary>

The browser performs the same origin validation as in step 3 (verifying `rpId` is a registrable domain suffix of the current origin), then invokes the platform authenticator via `authenticatorGetAssertion` (WebAuthn L3 §6.3.3). The browser passes the `rpId` and the SHA-256 hash of `clientDataJSON` (containing the challenge) to the Wallet Unit.

> **If no credentials found**: If the Wallet Unit has no discoverable credentials for this `rpId`, it returns `NotAllowedError`. The RP should fall back to offering a traditional login or a new passkey registration.
</details>
<details><summary><strong>14. User selects pseudonym and authenticates via biometric or PIN</strong></summary>

The Wallet Unit searches its credential store for all discoverable credentials matching the `rpId` (WebAuthn L3 §6.3.3, step 4). If multiple pseudonyms exist for this RP (e.g., the User registered separate pseudonyms for different purposes), the Wallet presents a selection dialogue. The User picks the desired pseudonym and authenticates via biometric or PIN to satisfy `userVerification: "required"`.

> **Single credential shortcut**: If only one credential exists for this `rpId`, the Wallet may skip the selection dialogue and proceed directly to the user verification prompt, depending on the platform's UX policy.
</details>
<details><summary><strong>15. Wallet Unit signs challenge with private key for this rp.id</strong></summary>

The Wallet Unit constructs the `authenticatorData` (WebAuthn L3 §6.1): the `rpIdHash` (SHA-256 of `rpId`), flags (UP=1, UV=1), and an incremented `signCount`. It then computes `signature = ECDSA-P256-SHA256(authenticatorData || clientDataHash)` using the private key from the hardware keystore (WebAuthn L3 §6.3.3, step 8). The signature is in the DER-encoded ASN.1 format specified by ECDSA (RFC 6979).

> **Sign counter**: The `signCount` is incremented on each use and provides a **cloned authenticator detection** mechanism — if the RP receives a `signCount` lower than the previously stored value, it indicates the credential may have been cloned (WebAuthn L3 §6.1, Signature Counter Considerations).
</details>
<details><summary><strong>16. Wallet Unit returns AuthenticatorAssertionResponse to Browser</strong></summary>

The Wallet Unit returns the `AuthenticatorAssertionResponse` object (WebAuthn L3 §5.2.2) to the browser:

```json
{
  "id": "dGVzdC1jcmVkZW50aWFsLWlk",
  "type": "public-key",
  "response": {
    "authenticatorData": "<ArrayBuffer: rpIdHash(32) || flags(1) || signCount(4)>",
    "clientDataJSON": "<ArrayBuffer: {type: 'webauthn.get', challenge, origin}>",
    "signature": "<ArrayBuffer: DER-encoded ECDSA signature>",
    "userHandle": "<ArrayBuffer: user.id from registration>"
  }
}
```

The `userHandle` field contains the `user.id` that the RP assigned during registration (step 2) — this allows the RP to identify which account to authenticate against, even if the `credentialId` is not pre-known.
</details>
<details><summary><strong>17. Browser forwards signed assertion to RP Server</strong></summary>

The browser serialises the `AuthenticatorAssertionResponse` and transmits it to the RP's backend, typically via a `POST` to a `/webauthn/authenticate` endpoint. The transmission includes the `clientDataJSON`, `authenticatorData`, `signature`, and `userHandle`. As with registration (step 9), the transport should use TLS 1.3, though the assertion payload contains no secrets — it is a challenge-response proof of possession.
</details>
<details><summary><strong>18. RP Server verifies signature against stored public key</strong></summary>

The RP's backend performs the WebAuthn authentication verification procedure (WebAuthn L3 §7.2):

1. **Look up credential** — use `userHandle` (or `credentialId`) to retrieve the stored `credentialPublicKey` and `signCount` from the database
2. **Parse `clientDataJSON`** — verify `type` is `"webauthn.get"`, `challenge` matches the server-issued challenge (from step 12), and `origin` matches the expected RP origin
3. **Verify `rpIdHash`** — the first 32 bytes of `authenticatorData` must equal `SHA-256(rpId)`
4. **Check flags** — `UP` (User Present) and `UV` (User Verified) bits must both be set
5. **Verify signature** — compute `ECDSA-P256-SHA256-Verify(credentialPublicKey, authenticatorData || SHA-256(clientDataJSON), signature)`
6. **Check `signCount`** — if the received `signCount` is less than or equal to the stored value, the RP should flag a potential cloned authenticator (WebAuthn L3 §7.2, step 21)
7. **Update `signCount`** — store the new `signCount` value for future comparisons

> **If verification fails** (challenge mismatch, signature invalid, sign count regression): The RP rejects the authentication attempt and returns an error. For sign count regression specifically, the RP should log a security alert — this may indicate an authenticator cloning attack.
</details>
<details><summary><strong>19. RP Server authenticates User as pseudonym (no real identity)</strong></summary>

Having verified the signature, the RP creates an authenticated session for the User under their pseudonym. The session is bound to the opaque `user.id` and `credentialId` — the RP has **no access to the User's PID, legal name, date of birth, or any other attributable identity data**. The pseudonym is unlinkable across RPs by design: each RP gets a unique key pair (PA_04), and the `credentialId` is RP-scoped. Even if two RPs collude, they cannot correlate their pseudonymous users unless the User voluntarily performs a cross-site identity linkage (§14.8).

> **Combining with attributes**: If the RP needs both a pseudonym *and* a specific attribute (e.g., `age_over_18`), it can combine this WebAuthn flow with an OpenID4VP presentation request — see §14.7 (Use Case B: Pseudonym and Attributes). The pseudonym key serves as the persistent account identifier while the attribute attestation provides the one-time age assurance.
</details>

#### 14.7 Use Case B: Pseudonym and Attributes (Age Verification)

This is the most common real-world pseudonym scenario. The User creates an account with a pseudonym AND proves `age_over_18` at the same time. The RP gets age assurance without learning the User's name, date of birth, or any other identifying information.

#### 14.7.1 Flow Description

1. User visits an age-gated content platform (e.g., streaming service)
2. RP requests pseudonym + `age_over_18` via a combined DCQL + WebAuthn flow
3. Wallet presents both the pseudonym credential AND an SD-JWT VC with `age_over_18` selectively disclosed
4. RP creates an account linked to the pseudonym, flagged as age-verified
5. Subsequent sessions use WebAuthn-only (no attributes needed)

#### 14.7.2 Combined DCQL Query for Pseudonym and Attribute

```json
{
  "credentials": [
    {
      "id": "age_proof",
      "format": "dc+sd-jwt",
      "meta": {
        "vct_values": ["eu.europa.ec.eudi.pid.1"]
      },
      "claims": [
        {"path": ["age_over_18"]}
      ]
    }
  ]
}
```

> **Implementation note**: The pseudonym registration (WebAuthn `create()`) and the attribute presentation (OpenID4VP DCQL) are **two separate protocol exchanges** that happen sequentially in the same user session. The ARF Discussion Paper (Topic E, §5.3, Challenge 1) notes that WebAuthn alone cannot guarantee that the pseudonym and the presented attributes belong to the same User. This binding challenge is architecturally similar to the combined presentation binding discussed in §15 — and remains an open area.

#### 14.8 Use Case D: Cross-RP Linkable Pseudonym

In Use Case D, a User registers the same pseudonym at multiple RPs within a sector, enabling those RPs to correlate interactions.

**Example**: A User orders goods online and registers pseudonym `P` at the e-commerce store. When picking up the goods, the User authenticates as `P` at the carrier. The carrier contacts the store using `P` as the correlation key.

Two approaches exist:

1. **Verifiable pseudonym reuse**: The User registers the same WebAuthn credential at multiple RPs (possible if the Wallet Unit allows re-use of a pseudonym across RP domains — contrary to the default per-RP scoping)
2. **Attested pseudonym**: The e-commerce RP issues a (Q)EAA attesting `P` to the User's Wallet. The User presents this attestation to the carrier.

> **Privacy warning for RPs**: Use Case D introduces deliberate linkability. RPs implementing this pattern should inform Users that cross-RP correlation is occurring and ensure it is limited to the stated purpose. Art. 5b(2) data minimisation obligations still apply.

#### 14.9 Privacy Analysis: Attestation Type Selection

The choice of WebAuthn attestation type during registration has significant privacy implications. RPs should understand the trade-offs:

| Attestation Type | RP Linkability | CA Linkability | RP Assurance | Recommendation |
|:-----------------|:---------------|:---------------|:-------------|:---------------|
| **None** | ❌ Unlinkable | ❌ Unlinkable | No guarantees about authenticator | ✅ **Recommended for most RPs** |
| **Self** | ❌ Unlinkable | ❌ Unlinkable | No guarantees (signed with credential key) | ✅ Acceptable |
| **Basic** | ⚠️ Linkable | ⚠️ Linkable | Authenticator identity verified | ❌ Avoid (single attestation key shared across registrations) |
| **Attestation CA** | ⚠️ Partially linkable | ⚠️ Linkable | Authenticator certified by CA | ⚠️ Use only if authenticator assurance is critical |
| **Anonymisation CA** | ❌ Unlinkable | ⚠️ Linkable | Per-credential certificate from CA | ⚠️ Better than Basic, but CA can still track |

> **RP guidance**: Request `attestation: "none"` unless the RP has a specific regulatory need to verify authenticator properties. This aligns with the privacy-by-design principle of the EUDI Wallet ecosystem and avoids the surveillance risks identified in risk register threats TR39, TR84, and TR85.

#### 14.10 RP-Side Pseudonym Storage Model

RPs must maintain a mapping between pseudonym credentials and internal accounts. The recommended data model:

| Field | Type | Description |
|:------|:-----|:------------|
| `credential_id` | bytes | WebAuthn credential identifier (unique per registration) |
| `public_key` | bytes | EC P-256 public key from registration |
| `user_handle` | bytes | RP-assigned opaque User ID |
| `rp_id` | string | RP domain that scoped this pseudonym |
| `created_at` | timestamp | Registration timestamp |
| `last_used` | timestamp | Last successful authentication |
| `sign_count` | integer | Authenticator signature counter (replay detection) |
| `age_verified` | boolean | Whether age was verified during registration (Use Case B) |
| `linked_attributes` | JSON | Any attributes presented alongside the pseudonym |
| `transports` | string[] | Supported transports (e.g., `["internal", "hybrid"]`) |

> **Data minimisation**: The `linked_attributes` field should store only the **result** of attribute verification (e.g., `age_verified: true`), not the raw PID attributes themselves. The RP has no ongoing need for the raw attributes once the verification is complete.

#### 14.11 Pseudonym Revocation and Recovery

Pseudonym lifecycle events from the RP perspective:

| Event | Mechanism | RP Impact |
|:------|:----------|:----------|
| **User deletes pseudonym** | User removes the passkey from their Wallet Unit | RP account becomes inaccessible; User must re-register |
| **RP revokes pseudonym** | RP invalidates the credential locally | User cannot authenticate; other Wallet functionality unaffected |
| **Wallet Unit revoked** | PID Provider revokes PID; Wallet Provider revokes WUA | Pseudonym keys become unusable (Wallet Unit deactivated) |
| **Device loss** | User loses device with Wallet Unit | Pseudonyms are lost unless backed up. PA_19: backup/restore of pseudonymous key material is supported |
| **Wallet migration** | User moves to new device/Wallet Unit | Pseudonyms must be transferable (Scope rate-limited: Requirement 9 mandates persistence across Wallet Unit changes) |

> **Key RP consideration**: Unlike PID credentials (which can be re-issued by the PID Provider), pseudonym credentials are **locally generated**. If a User loses their device and did not back up, the pseudonym is permanently lost. RPs should implement account recovery flows that allow Users to re-bind a new pseudonym to their existing account using alternative verification methods (e.g., email, PID presentation as a one-time step-up).

#### 14.12 Security Considerations

| Threat | Mitigation | Standard Reference |
|:-------|:-----------|:-------------------|
| **Pseudonym presented to wrong RP** | WebAuthn scopes credentials to `rp.id`; browser verifies origin | TR26 |
| **Cross-RP linking via attestation** | Use `attestation: "none"` to prevent credential correlation | TR39, TR84 |
| **Replay of assertion** | Challenge-response protocol; `signCount` tracking | TR91 |
| **RP impersonation during registration** | Browser verifies RP origin via TLS; Wallet trusts browser (PA_20) | TR102 |
| **MITM during pseudonym flow** | TLS between browser and RP; WebAuthn binding to origin | TR105 |
| **Bypass of user authentication** | Wallet requires biometric/PIN before signing assertion | TR55 |
| **Unjustified pseudonym revocation** | RP can only revoke locally; no mechanism for RP to revoke Wallet Unit | TR1 |

---

### 15. DCQL and Combined Presentations

#### 15.1 Overview

The **Digital Credentials Query Language (DCQL)** is a JSON-based query language integrated into OpenID4VP 1.0 and mandated by HAIP 1.0. Crucially for implementations, the EUDI Wallet Architecture and Reference Framework (ARF) completely deprecates the legacy `presentation_definition` format from DIF Presentation Exchange (PEX) in favor of DCQL. RPs migrating from other OpenID4VC ecosystems must discard their PEX queries and rewrite them into DCQL's more expressive, format-agnostic mechanism.

#### 15.2 DCQL Structure

```json
{
  "credentials": [
    {
      "id": "credential_identifier",
      "format": "dc+sd-jwt | mso_mdoc",
      "meta": { "vct_values": ["..."] },
      "claims": [
        { "path": ["claim_name"] },
        { "path": ["nested", "claim"] },
        { "path": ["claim_with_filter"], "values": ["allowed_value_1", "allowed_value_2"] },
        { "path": ["namespace", "claim"], "intent_to_retain": false }
      ]
    }
  ],
  "credential_sets": [
    {
      "purpose": "Human-readable purpose",
      "options": [
        ["credential_id_1", "credential_id_2"],
        ["alternative_credential_id"]
      ]
    }
  ]
}
```

Key capabilities:

- **Multi-credential requests**: Request attributes from multiple credentials in one query
- **Format specification**: Specify preferred credential format per query
- **Claim-level precision**: Request specific claims, including nested claims
- **Claim value filtering**: The `values` array constrains acceptable claim values — the Wallet only matches credentials where the claim value matches one of the listed values
- **Alternative credentials**: `credential_sets` with `options` allow the Wallet to choose between alternative credential combinations (each inner array is an AND set; multiple inner arrays are OR alternatives)
- **Purpose statements**: Human-readable purpose for each credential set — displayed to the User by the Wallet Unit as per ARF §6.6.3.5.5
- **Retention intent** (mdoc only): The `intent_to_retain` boolean signals to the Wallet User whether the RP intends to store the attribute beyond the immediate transaction — see §15.2.1

##### 15.2.1 mdoc-Specific DCQL Extensions: `intent_to_retain`

For mdoc (`mso_mdoc`) DCQL queries, each claim object supports an `intent_to_retain` boolean attribute. This maps directly to ISO 18013-5's `IntentToRetain` field in `ItemsRequest` (§8.3.2.1.2.1), which the Wallet Unit displays to the User before consent.

```json
{
  "credentials": [
    {
      "id": "pid_mdoc",
      "format": "mso_mdoc",
      "meta": { "doctype_value": "eu.europa.ec.eudi.pid.1" },
      "claims": [
        { "path": ["eu.europa.ec.eudi.pid.1", "family_name"], "intent_to_retain": false },
        { "path": ["eu.europa.ec.eudi.pid.1", "birth_date"], "intent_to_retain": false },
        { "path": ["eu.europa.ec.eudi.pid.1", "age_over_18"], "intent_to_retain": false }
      ]
    }
  ]
}
```

| Value | Meaning | User Display | GDPR Alignment |
|:------|:--------|:-------------|:---------------|
| `false` | RP will **not** store this attribute beyond the active session | Wallet may indicate "data not retained" | Supports Art. 5(1)(c) data minimisation |
| `true` | RP **intends to store** this attribute (e.g., for regulatory retention) | Wallet should warn the User about data retention | Must be justified under a lawful basis (Art. 6) |
| *omitted* | No retention signal provided | Wallet implementation-dependent | Conservative RPs should explicitly set `false` |

> **RP best practice**: Set `intent_to_retain: false` for all claims unless there is a specific, documented lawful basis for retention (e.g., AML record-keeping per §19, DORA incident logging per §25). This aligns with the GDPR data minimisation obligations described in §18.3 and with the ARF's emphasis on purpose limitation (ARF §6.6.3.5.5).
>
> **Note**: `intent_to_retain` applies only to `mso_mdoc` format queries. For `dc+sd-jwt` format, there is no equivalent claim-level retention signal in the DCQL specification — data minimisation for SD-JWT VC is enforced through selective disclosure (requesting only necessary claims) rather than retention signalling.

#### 15.3 Credential Alternatives via `credential_sets`

The `credential_sets` mechanism enables the RP to express flexible requirements — for example, "present either a PID OR a national ID card, AND in either case also an address attestation":

```json
{
  "credentials": [
    {
      "id": "pid",
      "format": "dc+sd-jwt",
      "meta": { "vct_values": ["eu.europa.ec.eudi.pid.1"] },
      "claims": [
        {"path": ["family_name"]},
        {"path": ["given_name"]},
        {"path": ["birth_date"]}
      ]
    },
    {
      "id": "national_id",
      "format": "dc+sd-jwt",
      "meta": { "vct_values": ["eu.europa.ec.eudi.national_id.1"] },
      "claims": [
        {"path": ["family_name"]},
        {"path": ["given_name"]},
        {"path": ["birth_date"]},
        {"path": ["document_number"]}
      ]
    },
    {
      "id": "address",
      "format": "dc+sd-jwt",
      "meta": { "vct_values": ["eu.europa.ec.eudi.address.1"] },
      "claims": [
        {"path": ["resident_address"]},
        {"path": ["resident_city"]},
        {"path": ["resident_country"]}
      ]
    }
  ],
  "credential_sets": [
    {
      "purpose": "Identity verification for account opening",
      "options": [
        ["pid", "address"],
        ["national_id", "address"]
      ]
    }
  ]
}
```

The Wallet Unit evaluates each `options` entry as an AND set. If the User's Wallet contains a PID and an address attestation, it satisfies the first option. If the Wallet contains a national ID card and an address attestation but no PID, it satisfies the second option. The Wallet selects the first matching option, or — if multiple match — lets the User choose.

> **RP implementation note**: When using `credential_sets` with alternatives, the RP must be prepared to receive any of the alternative credential combinations. In DCQL-native mode (HAIP 1.0), the `vp_token` in the response is a JSON object keyed by credential `id` — the RP matches each entry against the original `dcql_query` to determine which option was satisfied. In legacy `presentation_submission` mode, the `descriptor_map` identifies which credentials were presented.

#### 15.4 Claim Value Filtering

DCQL supports constraining acceptable claim values via the `values` array. This enables the RP to request a credential only if a specific claim has an acceptable value — for example, requesting age verification only from EU Member States:

```json
{
  "credentials": [
    {
      "id": "age_check",
      "format": "dc+sd-jwt",
      "meta": { "vct_values": ["eu.europa.ec.eudi.pid.1"] },
      "claims": [
        {"path": ["age_over_18"]},
        {"path": ["nationality"], "values": ["DE", "FR", "NL", "BE", "AT", "IT", "ES"]}
      ]
    }
  ]
}
```

The Wallet Unit matches the credential only if the `nationality` claim contains one of the listed values. If no match is found, the credential is not presented and the Wallet informs the User.

#### 15.5 Multi-Attestation Combined Requests

#### 15.5.1 Example: Bank KYC and Address Verification

A bank performing customer onboarding might request both PID attributes and an address attestation:

```json
{
  "credentials": [
    {
      "id": "pid",
      "format": "dc+sd-jwt",
      "meta": { "vct_values": ["eu.europa.ec.eudi.pid.1"] },
      "claims": [
        {"path": ["family_name"]},
        {"path": ["given_name"]},
        {"path": ["birth_date"]},
        {"path": ["nationality"]}
      ]
    },
    {
      "id": "address",
      "format": "dc+sd-jwt",
      "meta": { "vct_values": ["eu.europa.ec.eudi.address.1"] },
      "claims": [
        {"path": ["resident_address"]},
        {"path": ["resident_city"]},
        {"path": ["resident_postal_code"]},
        {"path": ["resident_country"]}
      ]
    }
  ],
  "credential_sets": [
    {
      "purpose": "Customer onboarding and identity verification",
      "options": [["pid", "address"]]
    }
  ]
}
```

#### 15.5.2 Identity Matching in Combined Presentations

When the RP receives a combined presentation (multiple attestations in one response), it must verify that all attestations belong to the same User. The ARF (§6.6.3.10) defines three binding methods, in ascending order of assurance:

| Method | Description | Assurance Level | Privacy Impact |
|:-------|:------------|:----------------|:---------------|
| **Presentation-Based Binding** | RP assumes attributes in a single presentation response belong to the same User — trusting the Wallet Unit is not compromised | Low | ✅ None — no extra attributes needed |
| **Attribute-Based Binding** | Attestations share a common identifier (e.g., PID number, name + DOB) used as a cross-reference | Medium | ❌ Requires presenting identifying attributes even when not needed for the use case |
| **Cryptographic Binding** | WSCA/WSCD generates a proof that it manages the private keys of all involved attestations | High | ✅ Minimal — no extra attributes needed; only a cryptographic proof |

> **Current state (ARF v2.8.0)**: The ARF does not yet specify a particular cryptographic mechanism for cryptographic binding. The HLRs (ACP_10–ACP_15) define requirements for such a scheme, including that it SHALL use Commission-recognised algorithms and MAY use Zero-Knowledge Proofs. Until a concrete scheme is standardised, RPs should rely on **presentation-based binding** for low-risk use cases and **attribute-based binding** for high-risk use cases.

#### 15.5.3 ARF High-Level Requirements for Combined Presentations

The ARF Annex 2, Topic 18 defines the following requirements for combined presentations that are directly relevant to RPs:

| HLR | Requirement | RP Impact |
|:----|:------------|:----------|
| **ACP_01** | Wallet Units SHALL support multi-attestation requests/responses per [OpenID4VP] and [ISO 18013-5] | RP can rely on Wallet support for DCQL multi-credential queries |
| **ACP_02** | RPs SHOULD support multi-attestation features per [OpenID4VP] and [ISO 18013-5] | RP should implement combined query support |
| **ACP_06** | If RP receives a cryptographic binding proof, it SHOULD verify it | RP should implement proof verification when available |
| **ACP_08** | RP SHOULD NOT refuse attestations solely because a cryptographic binding proof is absent | RP must accept combined presentations without cryptographic proof |
| **ACP_10** | Cryptographic binding scheme SHALL use Commission-recognised algorithms | Future-proofing for RP verification pipeline |
| **ACP_11** | Scheme SHALL enable proof that multiple keys are managed by the same WSCD | Defines the security guarantee RP can trust |

#### 15.5.4 Security Considerations for Combined Presentations

1. **Strictest policy prevails**: When attestations in a combined presentation carry different embedded disclosure policies, the **most restrictive** policy applies to the entire presentation. If one attestation's policy denies disclosure to the RP, the User is warned — but can override (§16.3).

2. **Validity period**: The combined presentation's validity is determined by the **minimum validity** of all included attestations. If one attestation expires in 5 minutes and another in 24 hours, the RP should treat the combined presentation as valid for 5 minutes.

3. **Privacy risk of combination**: Individual attributes may not be personally identifying on their own, but their **combination across attestations** may create a unique tracking vector. RPs must be mindful of this when designing DCQL queries — request only what is necessary.

4. **Single intended use per request**: Per ARF §6.6.3.5.5, each presentation request can have only **one** intended use. If the RP has multiple purposes for requesting attributes, it must send **multiple presentation requests**, each triggering a separate consent screen.

5. **Sequential presentation UX guidance**: When an RP needs multiple presentation requests within a single user session (e.g., identity verification followed by address proof), the following implementation patterns are recommended:

   | Concern | Recommendation |
   |:--------|:---------------|
   | **Pre-warning** | Before the first request, inform the user: *"This service requires 2 approvals in your Wallet"* — reducing abandonment from unexpected second prompts |
   | **Inter-request delay** | Wait at least 1 second between sequential requests to avoid overwhelming the Wallet's consent UI. Some Wallet implementations may queue overlapping requests unpredictably |
   | **Progressive disclosure** | Present results from the first request before triggering the second — e.g., *"Welcome, Anna. We now need to verify your address"* |
   | **Partial failure** | If the user approves the first request but declines the second, the RP must decide: (a) proceed with partial data, or (b) discard all data received. Design for both outcomes |
   | **Session binding** | Each request uses a fresh `nonce` and ephemeral key, but the `state` parameter should encode sequential ordering (e.g., `state: "onboarding-step-2-of-3"`) for RP-side correlation |
   | **Timeout between steps** | Allow generous timeouts (60–120s) between sequential steps — the user may need time to re-authenticate to their Wallet for each approval |

#### 15.5.5 Combined Presentation Verification Flow (Agnostic: Applies to Direct RP and Intermediary)

```mermaid
---
config:
  themeVariables:
    noteBkgColor: "transparent"
    noteBorderColor: "transparent"
  sequence:
    messageAlign: left
    noteAlign: left
    actorMargin: 80
---
sequenceDiagram
    participant RP as 🏦 RP Instance
    participant SL as 📋 Status List

    rect rgba(148, 163, 184, 0.14)
    Note right of RP: Phase 1: Response Decryption
    RP->>RP: 1. Decrypt JWE, extract vp_token
    RP->>RP: 2. Parse multiple attestations<br/>from vp_token
    end

    rect rgba(52, 152, 219, 0.14)
    Note right of RP: Phase 2: Per-Credential Verification
    loop For each attestation
        RP->>RP: 3. Verify issuer signature<br/>(trust anchor from LoTE)
        RP->>RP: 4. Validate claims (exp, iat, vct)
        RP->>RP: 5. Verify selective disclosures
        RP->>RP: 6. Verify device binding<br/>(KB-JWT / DeviceAuth)
        RP->>SL: 7. Check revocation
        SL-->>RP: 8. Status
    end
    end

    rect rgba(46, 204, 113, 0.14)
    Note right of RP: Phase 3: Cross-Credential Binding
    RP->>RP: 9. Identity matching:<br/>verify all attestations<br/>share same cnf key (SD-JWT)<br/>or deviceKey (mdoc)
    opt Cryptographic binding proof present
        RP->>RP: 10. Verify WSCA proof that<br/>all keys managed by same WSCD
    end
    end

    rect rgba(241, 196, 15, 0.14)
    Note right of RP: Phase 4: Attribute Extraction
    RP->>RP: 11. Minimum validity = min(all exp)
    RP->>RP: 12. Extract verified attributes
    end
    Note right of SL: ⠀
```

<details><summary><strong>1. RP Instance decrypts JWE and extracts vp_token</strong></summary>

The RP receives the encrypted response payload (`direct_post.jwt`) — a JWE encrypted with the RP's ephemeral public key (from the `jwks` parameter in the original JAR). The RP decrypts using `ECDH-ES` key agreement with `A256GCM` content encryption (HAIP 1.0 §5.4). After decryption, the RP parses the resulting JSON and extracts the `vp_token` field, the `presentation_submission` (which maps each credential to the DCQL query it satisfies), and the `state` parameter (to correlate with the original session). See §7.2 step 19 for the full JWE decryption flow with payload example.

> **If decryption fails**: The RP returns an error and logs the failure. Common causes: ephemeral key mismatch (wrong session), JWE expired, or corrupted ciphertext. The RP should NOT attempt to re-request — the Wallet has already submitted and considers the transaction complete.
</details>
<details><summary><strong>2. RP Instance parses multiple attestations from vp_token</strong></summary>

The RP examines the `vp_token` structure. When the DCQL query requested multiple credentials (§15.5.3), the `vp_token` is a **JSON object** (not an array) where each key corresponds to a DCQL credential query ID:

```json
{
  "vp_token": {
    "pid_credential": "<Issuer-JWT>~<Disclosure:family_name>~<Disclosure:birth_date>~<KB-JWT>",
    "mdl_credential": "<CBOR-encoded DeviceResponse>"
  }
}
```

The RP uses the `presentation_submission` (or DCQL response mapping) to determine which `vp_token` entry satisfies which part of the original query. Each entry is an independent credential that must be verified individually (steps 3–8) before cross-credential binding is checked (steps 9–10). The RP must handle both SD-JWT VC format (`dc+sd-jwt`) and mdoc format (`mso_mdoc`) within the same response — see §15.5.6 for cross-format matching.
</details>
<details><summary><strong>3. RP Instance verifies issuer signature against LoTE trust anchor</strong></summary>

For each credential in the `vp_token`, the RP verifies the issuer's cryptographic signature. The verification method depends on the credential format:

- **SD-JWT VC**: The RP parses the issuer-signed JWT header to extract the `x5c` certificate chain (or `kid` referencing a key in the issuer's JWKS), then verifies the JWT signature (ES256 / P-256 ECDSA per HAIP 1.0). The trust anchor is the issuer's root CA certificate obtained from the LoTE (§4.5.3).
- **mdoc**: The RP verifies the `IssuerAuth` COSE_Sign1 signature in the MSO (Mobile Security Object) against the issuer's certificate from the LoTE.

In both cases, the RP must build a certificate chain from the credential's leaf certificate up to the LoTE-provided trust anchor and verify every link. See §10 for the full cryptographic verification procedure.

> **If signature verification fails**: The RP MUST reject the entire combined presentation — a single invalid credential invalidates the set, since the cross-credential binding (step 9) cannot be trusted if one credential is forged.
</details>
<details><summary><strong>4. RP Instance validates standard claims (exp, iat, vct)</strong></summary>

The RP checks the temporal and type validity of each credential:

- **`exp` (Expiration)**: The credential must not have expired at the time of verification. The RP should apply a small clock skew tolerance (typically ≤ 60 seconds) to account for network latency.
- **`iat` (Issued At)**: The credential should have been issued before the current time. Credentials with `iat` in the future may indicate clock manipulation.
- **`nbf` (Not Before)**: If present, the credential is not yet valid before this timestamp.
- **`vct` (Verifiable Credential Type)** for SD-JWT VC / **`docType`** for mdoc: The credential type must match one of the types requested in the DCQL query. For PID, this is `eu.europa.ec.eudi.pid.1`; for mDL, `org.iso.18013.5.1.mDL`.

> **Cross-reference**: HAIP 1.0 §5.3 defines the mandatory claims for SD-JWT VC. ISO 18013-5 §9.1.2.4 defines the MSO validity info structure for mdoc.
</details>
<details><summary><strong>5. RP Instance verifies selective disclosure hashes</strong></summary>

For SD-JWT VC credentials, the RP verifies that each selectively disclosed attribute is authentic by recomputing its hash and matching it against the `_sd` array in the issuer-signed JWT (SD-JWT §5.3):

1. For each `~`-delimited Disclosure in the SD-JWT presentation, decode the base64url string to obtain the JSON array `[salt, claim_name, claim_value]`
2. Compute `SHA-256(base64url(Disclosure))` to obtain the disclosure hash
3. Verify that this hash appears in the `_sd` array of the issuer-signed JWT payload (at the appropriate nesting level for nested disclosures)
4. If any disclosure hash is not found in `_sd`, reject the credential — it contains a tampered or fabricated attribute

For mdoc credentials, the equivalent check verifies data element digests: the RP computes `SHA-256` of each disclosed `DataElementValue` and matches it against the corresponding entry in the MSO's `ValueDigests` map (ISO 18013-5 §9.1.2.4).
</details>
<details><summary><strong>6. RP Instance verifies device binding (KB-JWT or DeviceAuth)</strong></summary>

The RP verifies that the credential was presented by the device to which it was originally issued — preventing credential forwarding and replay attacks (§24.2, Threat T12):

- **SD-JWT VC (KB-JWT)**: The RP verifies the Key Binding JWT signature using the `cnf.jwk` public key embedded in the issuer-signed JWT. It also verifies that the KB-JWT's `aud` matches the RP's own `client_id` (typically the `x509_hash` of the WRPAC), the `nonce` matches the request nonce, and the `sd_hash` matches the hash of the SD-JWT presentation (SD-JWT §7.3).
- **mdoc (DeviceAuth)**: The RP verifies the `DeviceSigned.DeviceAuth` COSE_Mac0 or COSE_Sign1 signature over the `SessionTranscript` using the `deviceKey` from the MSO (ISO 18013-5 §9.1.3.6). The `SessionTranscript` includes the session-specific handshake data, binding the response to this specific transaction.

> **If device binding fails**: This is a critical security failure — the credential may have been stolen, forwarded, or replayed. The RP MUST reject the presentation and SHOULD log an alert for fraud investigation.
</details>
<details><summary><strong>7. RP Instance queries Status List for revocation check</strong></summary>

The RP queries the issuer's Token Status List endpoint for each credential to verify it has not been revoked or suspended since issuance. The RP extracts the `status` claim from the credential (containing the `status_list.uri` and `status_list.idx`), fetches the Status List Token from the URI, and checks the bit at the specified index. See Annex B (§B.2.1) for the full Status List verification procedure with payload examples.

> **Batch optimisation**: When verifying multiple credentials from the same issuer, the Status List Token may be shared — the RP should cache it after the first fetch to avoid redundant HTTP requests. The cache TTL should respect the `exp` claim in the Status List Token JWT.
</details>
<details><summary><strong>8. Status List returns credential validity status to RP Instance</strong></summary>

The Status List check returns one of two outcomes per credential: **VALID** (bit at index = 0) or **REVOKED/SUSPENDED** (bit at index = 1). Steps 3–8 are executed **for each credential** in the `vp_token` — either sequentially or in parallel. If any credential is revoked, the RP must decide whether to reject the entire combined presentation or proceed with the remaining valid credentials, depending on the RP's policy configuration (§20.1).

> **Partial revocation policy**: For combined presentations where one credential is revoked but others are valid (e.g., mDL revoked but PID valid), the RP's policy engine should define whether partial results are acceptable for the use case. For CDD (§19), all credentials must be valid; for age verification, a valid PID alone may suffice.
</details>
<details><summary><strong>9. RP Instance performs identity matching across all attestations</strong></summary>

This is the **critical cross-credential binding check** that distinguishes a combined presentation from two unrelated presentations. The RP must prove that all credentials belong to the same User and were presented from the same Wallet Unit:

- **Same-format binding (SD-JWT VC + SD-JWT VC)**: Verify that all credentials contain the same `cnf.jwk` public key. Since the KB-JWT for each credential is signed with this key, matching `cnf.jwk` values proves that the same device key — and therefore the same Wallet Unit — holds all credentials.
- **Same-format binding (mdoc + mdoc)**: Verify that all `DeviceResponse` documents reference the same `deviceKey` in their MSO. The `DeviceAuth` signature over the shared `SessionTranscript` proves possession.
- **Cross-format binding (SD-JWT VC + mdoc)**: This is the most complex case — the SD-JWT's `cnf.jwk` and the mdoc's MSO `deviceKey` are **structurally different keys** (JWK vs COSE_Key). The RP must determine whether they represent the same underlying key (see §15.5.6 for the cross-format matching algorithm).

> **If identity matching fails** (different `cnf.jwk` values or different `deviceKey` values): The credentials may originate from different Wallet Units or even different Users. The RP MUST reject the combined presentation — accepting mismatched credentials would allow a "credential cocktail" attack where attributes from different identities are combined.
</details>
<details><summary><strong>10. RP Instance verifies WSCA proof of single WSCD management</strong></summary>

If the Wallet provided a Wallet Secure Cryptographic Application (WSCA) binding proof — a cryptographic assertion that all device keys across different credential formats are managed by the same WSCD instance — the RP verifies this proof. This is an additional layer beyond the `cnf.jwk`/`deviceKey` matching in step 9: it proves at the **hardware level** that one physical secure element manages all keys, even if the keys are technically distinct (as in cross-format presentations).

> **Current status**: The WSCA binding proof mechanism is specified in ARF v2.8 §6.6.3 but the concrete cryptographic protocol is still being standardised. As of March 2026, no Wallet Unit implementation produces this proof in production. RPs should implement step 9's key-matching as the primary binding check and treat step 10 as a future-proofing enhancement. When the WSCA proof standard is finalised, it will likely use a COSE_Sign1 structure binding all device keys under a single WSCA attestation certificate.
</details>
<details><summary><strong>11. RP Instance calculates minimum validity across all credentials</strong></summary>

The RP calculates the overall combined presentation validity window by taking the **minimum** `exp` value across all presented credentials. For example, if the PID expires at `2025-12-31T23:59:59Z` and the mDL expires at `2025-06-15T00:00:00Z`, the combined presentation is valid only until `2025-06-15`. This minimum validity determines how long the RP can rely on the combined presentation for session-based decisions (e.g., how long an authenticated session should last before requiring re-verification).

> **Session binding**: The RP should set the application session's `max-age` to no longer than this minimum validity, minus a safety margin. For time-sensitive transactions (SCA — §13), the validity window may be further constrained by the `transaction_data` expiry.
</details>
<details><summary><strong>12. RP Instance extracts verified attributes into application logic</strong></summary>

Having cryptographically verified each individual credential (steps 3–8) and confirmed they belong to the same User and Wallet Unit (steps 9–10), the RP safely merges the disclosed attributes from all credentials into a unified attribute set for application consumption. For example, a combined PID + mDL presentation yields:

```json
{
  "pid": {
    "family_name": "Müller",
    "given_name": "Anna",
    "birth_date": "1990-03-15",
    "personal_identifier": "1234567890"
  },
  "mdl": {
    "driving_privileges": [{"vehicle_category_code": "B", "expiry_date": "2027-08-01"}],
    "portrait": "<base64-encoded JPEG>"
  },
  "_meta": {
    "combined_validity_until": "2025-06-15T00:00:00Z",
    "credentials_verified": 2,
    "identity_binding": "cnf_jwk_match",
    "wsca_proof": false
  }
}
```

The `_meta` object is an RP-internal construct (not part of the protocol) that records the verification provenance — useful for audit trails (§25.3) and downstream policy decisions. The RP should feed this unified attribute set into its business rules engine (§20.1) for the final application-level decision (CDD, age gate, SCA, etc.).
</details>

> **Key verification step**: Step 9 is the critical identity matching check. For SD-JWT VC, the RP verifies that all attestations contain the same `cnf.jwk` public key. For mdoc, the RP verifies that all `DeviceResponse` documents reference the same `deviceKey` in their MSO. If the keys differ, the attestations may originate from different Wallet Units — the RP should reject or flag the combined presentation.

#### 15.5.6 Cross-Format Identity Matching

Open Question #9 identifies the challenge of combined presentations that mix SD-JWT VC and mdoc credentials in a single response. When this occurs, the RP must bridge two different device binding mechanisms:

| Format | Device Binding Key | Location |
|:-------|:-------------------|:---------|
| **SD-JWT VC** | `cnf.jwk` (EC P-256 public key) | In the Issuer-signed JWT payload |
| **mdoc** | `deviceKey` (COSE_Key, EC P-256) | In the MSO's `deviceKeyInfo` |

For same-user verification in a cross-format combined presentation, the RP should:

1. **Extract both keys**: `cnf.jwk` from the SD-JWT VC and `deviceKey` from the mdoc MSO
2. **Compare the raw public key material**: Convert both to a canonical form (e.g., uncompressed EC point) and compare. If the same WSCA/WSCD manages both credentials, the keys **may** be identical — but this is not guaranteed, as the Wallet Unit may use different device keys for different credential formats.
3. **Fall back to attribute-based matching**: If the keys differ, use shared attributes (e.g., `personal_identifier`, `family_name` + `birth_date`) to establish same-user binding.
4. **Await cryptographic binding**: When the ARF's cryptographic binding mechanism (ACP_10–ACP_15) is standardised, it will provide a format-agnostic proof that both keys are managed by the same WSCD.

> **Current limitation**: There is no guarantee that a Wallet Unit will use the same device key for SD-JWT VC and mdoc credentials. Implementers requesting mixed-format combined presentations should use attribute-based binding as the primary identity matching method until cryptographic binding is available.

---

#### 15.6 Representation Attestations (Natural Person Representing Another)

##### 15.6.1 Overview

ARF Discussion Paper Topic I (v0.4, May 2025) defines the framework for a **natural person acting on behalf of another natural person** — for example, a parent acting for a minor, a legal guardian for an incapacitated person, or a power-of-attorney holder. When the EUDI Wallet is used in such scenarios, the presented attestation is a **distinct attestation type** that explicitly identifies the presenter as a representative, not as the subject of the attributes.

This is directly relevant to RPs processing presentations that may include representation attestations alongside — or instead of — standard PIDs.

##### 15.6.2 RP Obligations

1. **The RP SHALL always be made aware** that it is interacting with a legal representative, not the represented person directly. This is ensured by the attestation's distinct `vct` (SD-JWT VC) or `docType` (mdoc) identifier — a representation attestation will never have the same type as a standard PID.

2. **Scope restrictions are embedded in the attestation.** The attestation includes attributes defining:
   - The **nature of the representation** (e.g., parental authority, guardianship, power of attorney)
   - The **operations the representative is authorised to perform** (e.g., "medical consent", "financial transactions up to €10,000")
   - The **identity of the represented person** (the beneficiary)

3. **Heightened revocation scrutiny.** Representation attestations are either short-lived (no revocation needed because they expire quickly) or revocable by any party with legal authority to terminate the representation (e.g., a court revoking a guardianship). RPs should treat revocation checking for representation attestations with elevated urgency — a revoked representation means the presenter no longer has authority to act.

4. **DCQL query implications.** If the RP's DCQL query requests a standard PID, and the Wallet holds only a representation PID, the response will contain the representation attestation type. The RP must:
   - Detect the type difference (the `vct`/`docType` will not match a standard PID type)
   - Adjust processing logic accordingly (e.g., display "Acting on behalf of [represented person]")
   - Verify the representation scope permits the requested operation
   - Never treat the presenter's identity as interchangeable with the represented person's identity

> **Cross-references**: §15.5 (combined presentations — a representation attestation may appear alongside a standard PID in a combined query), §19.1 (CDD — representation may affect KYC obligations, e.g., onboarding a minor's account), §18.3 (GDPR — processing for a represented minor may have a different legal basis under Art. 8).

---

### 16. RP Obligations: Data Deletion, DPA Reporting, and Disclosure Policy

#### 16.1 Data Deletion Requests (TS7)

#### 16.1.1 Legal Basis

GDPR Article 17 gives individuals the right to request erasure of their personal data. The EUDI Wallet operationalises this right through TS7, which defines the interface for Users to submit data deletion requests to RPs directly from their Wallet Unit.

#### 16.1.2 Process Flow (Direct RP Model)

```mermaid
---
config:
  themeVariables:
    noteBkgColor: "transparent"
    noteBorderColor: "transparent"
  sequence:
    messageAlign: left
    noteAlign: left
    actorMargin: 120
---
sequenceDiagram
    participant User as 👤 User
    participant WU as 📱 Wallet Unit
    participant RP as 🏦 Relying Party

    User->>WU: 1. View transaction log<br/>(dashboard)
    WU->>User: 2. Display past interactions<br/>with RP names and dates
    User->>WU: 3. Select RP, choose<br/>"Request data deletion"
    WU->>WU: 4. Retrieve RP's supportURI<br/>from WRPRC or Registrar API
    
    alt supportURI is a website URL
        WU->>RP: 5a. Open RP's support page<br/>in browser
        Note right of WU: User completes deletion<br/>request on RP's website
    else supportURI is an email
        WU->>RP: 5b. Compose email to RP<br/>with pre-filled template
    else supportURI is a phone number
        WU->>RP: 5c. Initiate phone call
    end
    Note right of RP: ⠀
```

<details><summary><strong>1. User opens Wallet Unit transaction log dashboard</strong></summary>

The User opens their EUDI Wallet Unit and navigates to the privacy dashboard or transaction history section.
</details>
<details><summary><strong>2. Wallet Unit displays past interactions to User</strong></summary>

The Wallet Unit displays a chronological list of past presentations, showing the names of Relying Parties and the dates/times data was shared.
</details>
<details><summary><strong>3. User selects RP and chooses "Request data deletion"</strong></summary>

The User selects a specific Relying Party from the log and triggers the "Request data deletion" GDPR Art. 17 right natively within the Wallet UI.
</details>
<details><summary><strong>4. Wallet Unit retrieves RP supportURI from WRPRC or Registrar API</strong></summary>

The Wallet Unit attempts to find the RP's contact method (`supportURI`). It checks the locally cached WRPRC (Wallet Relying Party Registration Certificate). If not available, it queries the Registrar API:

```http
GET /wrp/5299001GCLKH6FPVJW75 HTTP/1.1
Host: registrar.example-ms.de
Accept: application/jwt
```

The Wallet extracts `supportURI` from the Registrar's JWS payload:

```json
{
  "supportURI": [
    "https://support.example-bank.de/eudi-wallet",
    "mailto:eudi-support@example-bank.de",
    "tel:+49-800-123-4567"
  ]
}
```

The Wallet prioritizes the website URL (`https://`), falling back to email, then phone (per DATA_DLT_02 requirements).
</details>
<details><summary><strong>5. Wallet Unit executes deletion request via URL, email, or phone</strong></summary>

Depending on the retrieved `supportURI`, the Wallet initiates the contact:

*   **5a. Website (Preferred)**: The Wallet opens the RP's support page in the device's secure browser. The User completes the deletion process on the RP's own infrastructure.
*   **5b. Email**: The Wallet composes a pre-filled draft (DATA_DLT_08 / DATA_DLT_09) in the device's default email client, allowing the user to edit before sending:

    ```
    To: eudi-support@example-bank.de
    Subject: Request for Erasure of Personal Data (Art. 17 GDPR) — EUDI Wallet

    Body:
    Dear Data Protection Officer,

    I hereby request the erasure of all personal data previously provided
    to your organisation via my EUDI Wallet Unit, in accordance with
    Article 17 of Regulation (EU) 2016/679 (GDPR).

    Transaction details:
      - Date of presentation: 2026-07-15T14:32:00Z
      - Attributes presented: family_name, given_name, birth_date
      - Purpose: Customer identification and KYC verification

    Please confirm the completion of the erasure within 30 days.
    ```
    Per DATA_DLT_06, the Wallet silently logs the initiation date, target RP, and target attributes within its internal deletion tracking log.
*   **5c. Phone**: The Wallet prompts the device to dial the RP's support number.
</details>

#### 16.1.3 RP Implementation Requirements

RPs must:

1. **Register at least one `supportURI`** — a website, email, or phone number that handles deletion requests
2. **Process deletion requests** within GDPR timelines (without undue delay, max 1 month)
3. **Confirm deletion** to the requesting User
4. **Not use attributes** obtained via the EUDI Wallet after receiving a valid deletion request

> **Implementation note**: TS7 currently recommends that the `supportURI` be a website URL, as the Wallet Unit assumes a browser is always available on the User's device. Email and phone alternatives are supported but may be less reliable.

#### 16.2 DPA Reporting (TS8)

#### 16.2.1 Overview

TS8 defines the interface for Users to report unlawful or suspicious data requests by RPs to their Data Protection Authority (DPA). This is a transparency mechanism that enables User-initiated oversight of RP behaviour.

#### 16.2.2 When the User May Report

The Wallet Unit logs every presentation interaction. The User may report an RP if:

- The RP requested attributes not registered for its stated purpose
- The RP requested excessive attributes beyond what was needed
- The RP's behaviour was suspicious or unexpected
- The User believes their data was misused after presentation

#### 16.2.3 Reporting Process

1. User views the transaction log in the Wallet dashboard
2. User selects the suspicious transaction
3. User chooses "Report to Data Protection Authority"
4. The Wallet retrieves the DPA contact information from the WRPRC or Registrar API (`supervisoryAuthority.email`)
5. The Wallet composes a pre-filled email/browser form with:
   - RP identity (name, identifier)
   - Date and time of the interaction
   - Attributes requested vs. attributes registered
   - User's description of the issue

#### 16.2.4 RP Implications

RPs should be aware that:

- Every presentation is logged by the Wallet Unit
- Users can report excessive attribute requests to the DPA at any time
- The Registrar API provides the DPA contact information alongside RP registration data
- Non-compliance with registered intended use may trigger DPA investigation

#### 16.3 Embedded Disclosure Policies (EDP) Evaluation

#### 16.3.1 Overview

Attestation Providers can embed an **Embedded Disclosure Policy (EDP)** in their attestations during issuance, explicitly restricting which RPs may request and receive the credential or specific claims within it. As defined in **CIR 2024/2979 Annex III**, this mechanism empowers issuers of sensitive attestations (e.g., electronic health records, high-value financial credentials) to programmatically dictate the credential's disclosure scope.

By binding the policy directly to the credential payload (e.g., via a protected SD-JWT claim or an mdoc namespace element), the policy becomes cryptographically verifiable, ensuring the Wallet Unit enforces the issuer's restrictions at the point of presentation.

#### 16.3.2 Policy Types and Restrictions (CIR 2024/2979, Annex III)

Issuers can define several restriction tiers within an EDP. The Wallet Unit enforces these policies by extracting identity signals from the RP's Access Certificate (WRPAC) and matching them against the embedded policy during a presentation attempt.

| Policy Type | Restriction Mechanism | RP Impact and Verification |
|:-------|:------------|:----------|
| **No policy** | Default state. No restrictions on disclosure. | Any authenticated RP may receive the attestation. |
| **Specific RP Identifiers** | Only explicitly listed RPs (by `walletRelyingPartyId` or LEI) may receive the credential. | The Wallet extracts the RP's identifier from the WRPAC SAN/Subject fields. If it doesn't match the EDP allowlist, access is flagged. |
| **Specific Root of Trust (CAs)** | Only RPs possessing a WRPAC issued by specific Root or Intermediate CAs are permitted. | The Wallet checks the WRPAC's trust chain against the CA thumbprints/DNs specified in the EDP. Limits usage to specific national or sector-specific trust frameworks. |
| **Sector or Role Restrictions** | Limits presentation to specific RP entity types (e.g., Healthcare Providers, Banks). | The Wallet maps the intended sectors against the RP's registered profile (obtained via WRPRC or Registrar API). |

#### 16.3.3 The RP Experience: Handling Rejections

For the Relying Party, encountering an EDP restriction can disrupt the presentation flow. Understanding how this failure is communicated is critical for graceful error handling.

1. **RP Request Initiation**: The RP requests the attestation via an OpenID4VP Authorization Request (e.g., using DCQL or HAIP presentation definitions).
2. **Wallet Unit Evaluation**: The Wallet cryptographically verifies the RP's WRPAC, extracts the identifier/CA chain, and evaluates it against the credential's EDP.
3. **Policy Rejection**: If the policy denies the RP, the Wallet UI flags the presentation as restricted.
4. **User Override Capability**: Crucially, eIDAS 2.0 designates the User as the ultimate controller of their data. Even if the issuer's EDP explicitly blocks the RP, the Wallet *must* inform the User of the issuer's restriction but *may* permit the User to override the denial (e.g., "The issuer of this health record requires it to be shared only with certified hospitals. This service is not on the list. Do you still wish to proceed?").
5. **Wallet Response Handling**:
   - **If the User cancels or the Wallet's strict enforcement blocks presentation**: Per ARF Topic D (Requirement 4), the Wallet Unit SHALL behave towards the Relying Party **as if the attestation did not exist**. This means the RP receives either:
     - An OAuth 2.0 `access_denied` error with no indication that an EDP was the cause, OR
     - A response that simply omits the blocked attestation (if other attestations were also requested in the same query).
   - **The RP CANNOT distinguish between "attestation does not exist" and "EDP denied presentation."** This is a deliberate privacy feature: revealing the existence of a credential the RP cannot access would leak information about the User's credential portfolio.
   - **If the User overrides** (where the Wallet permits override), the RP receives the valid credential payload normally.
   - **Timing attack mitigation**: The Wallet should ensure the response time for an EDP-denied attestation is indistinguishable from a non-existent attestation to prevent side-channel inference.

> **RP implementation consideration**: RPs MUST NOT assume that an `access_denied` response or a missing attestation means the User doesn't hold the credential. Design fallback flows that do not reveal whether the failure was due to EDP policy, User refusal, or credential absence. Never prompt the User with "You don't have this credential" — use neutral language such as "This credential was not presented." RPs requesting highly regulated or sensitive attestations must pre-align with Attestation Providers to ensure inclusion in their EDP allowlists (via RP IDs or specific CA registrations) to avoid high friction and drop-off rates during User presentations.

#### 16.3.4 Policy 2 and the WRPRC Dependency

The "Authorised relying parties only" policy (CIR 2024/2979 Annex III, Policy 2) is evaluated using RP identifiers extracted from the **WRPRC**, NOT from the WRPAC (Topic D §3.3). This has critical implications for both direct RPs and intermediaries:

| Scenario | Source of RP Identifier | EDP Evaluation |
|:---------|:-----------------------|:---------------|
| **Direct RP** (no intermediary) | WRPRC `walletRelyingPartyId` | RP's own identifier checked against EDP allowlist |
| **Intermediary** acting for an intermediated RP | WRPRC of the **intermediated RP** (not the intermediary) | The intermediated RP's identifier is checked; the intermediary's WRPAC identity is irrelevant for Policy 2 |
| **No WRPRC available** (MS doesn't issue WRPRCs) | Registrar API lookup | Policy 2 cannot be evaluated offline; requires Registrar API availability |

> **Key implication for intermediaries**: An intermediary's own RP identifier will NOT match an EDP Policy 2 allowlist that specifies the intermediated RP. The intermediary MUST present the **intermediated RP's WRPRC** alongside its own WRPAC. If the intermediated RP's WRPRC is not available, Policy 2 attestations will be silently denied for that RP — with no error feedback (see §16.3.3, step 5).

> **Key implication for direct RPs**: If you need access to attestations with Policy 2 EDPs, you MUST obtain a WRPRC from a Registration Certificate Provider and ensure your `walletRelyingPartyId` is registered with the relevant Attestation Providers' EDP allowlists.

#### 16.3.5 EDP Distribution Mechanism

EDPs are integrated into attestation metadata, not embedded directly in the credential payload (Topic D §3.1). During issuance, the Wallet Unit retrieves the EDPs from the PID/Attestation Provider's OID4VCI metadata (within the `credentials_configurations_supported` field) and stores them locally alongside the credential. This means:

1. **EDPs are signed by the Provider** (requirement ISS_32a — signed metadata), ensuring tamper-resistance.
2. **Changing an EDP requires credential revocation and re-issuance.** The Provider cannot update an EDP without issuing a new credential instance.
3. **No additional Provider communication is needed at presentation time.** The Wallet evaluates EDPs locally using the stored metadata and the RP's WRPAC/WRPRC.
4. **EDPs work fully offline.** No network access is required for EDP evaluation during a presentation.

> **No fine-grained policy language is mandated.** Only the three CIR 2024/2979 Annex III policy types are supported (No policy, Authorised RPs only, Specific root of trust). Advanced ABAC-style policies based on arbitrary RP attributes are explicitly out of scope for the initial eIDAS 2.0 implementation (Topic D §3.4).

#### 16.4 TS7 Data Deletion: Complete Interface Map

TS7 defines **9 interfaces** (I1–I9), not just 3 as simplified in §16. The full interface map:

| Interface | Type | Description |
|:----------|:-----|:------------|
| **I1** | Wallet UI | User-facing dashboard; browse transaction log, select RP, initiate deletion |
| **I2** | REST API | Wallet → Registrar API: retrieve `supportURI` (when WRPRC unavailable) |
| **I3** | Platform | Wallet → Browser: open RP's support website URL |
| **I4** | Logical | Browser → RP's web application (deletion form) |
| **I5** | Platform | Wallet → Email client: pre-fill `mailto:` with subject and body |
| **I6** | Logical | Email → RP's email system |
| **I7** | Platform | Wallet → Phone application |
| **I8** | Logical | Phone → RP's phone system |
| **I9** | Protocol | RP → Wallet: OID4VP for authenticating the requester |

**Key requirement from TS7** (DATA_DLT_07): Before executing a data deletion request, the RP **SHALL** authenticate the requesting User using mechanisms of its own choice. The RP **SHOULD** use the Wallet's OID4VP/signature facilities (I9) for this. This means the RP can trigger a reverse presentation to verify the identity of the person requesting deletion.

**Pre-filled email template** (DATA_DLT_08, DATA_DLT_09):
- Subject SHALL clearly indicate purpose (data deletion under GDPR Art. 17)
- Body SHOULD contain which attributes are requested to be deleted

**Open issues** from TS7:
- QES for deletion requests: not yet fully specified
- WRPAC may need to include `supportURI` to avoid Registrar API dependency

#### 16.5 TS8 DPA Contact Lookup Chain

TS8 defines a **priority order** for locating DPA contact information (RPT_DPA_06):

1. **First**: From WRPRC (in log entry) — `supervisoryAuthority` field
2. **Second**: From WRPAC (in log entry) — if DPA info is embedded
3. **Third**: Lookup via Registrar API — based on RP Subject from WRPAC

**Fallback**: If RP's DPA cannot be determined, the Wallet SHALL provide the DPA of the Wallet Provider's Member State.

**Additional option**: User can choose from EDPB member list (https://www.edpb.europa.eu/about-edpb/about-edpb/members_en).

**Open issue** (TS8): CIR 2025/848 Annex I does **not** explicitly require DPA contact info in registration data. TS5/TS8 recommend adding this, but it's not yet legally mandated. RPs should proactively register this information anyway.

---

### 17. Intermediary Architecture and Trust Flows

#### 17.1 Intermediary Role vs Direct Integration

When establishing a connection to the Wallet ecosystem, Relying Parties must decide between a **Direct RP Model** (as diagrammed in [Section 7](#7-same-device-remote-presentation) and [Section 8](#8-cross-device-remote-presentation)) or relying on an **Intermediary RP Model**. 

An intermediary is a first-class RP in the EUDI Wallet ecosystem. It connects multiple "intermediated RPs" to the Wallet ecosystem, abstracting away the technical complexity of:

- OpenID4VP / ISO 18013-5 protocol implementation
- WRPAC management and certificate chain maintenance
- Trust anchor refresh (LoTE/Trusted List synchronisation)
- Credential format parsing and verification (SD-JWT VC, mdoc)
- Revocation checking infrastructure
- DCQL query construction
- SCA flow orchestration (for PSP intermediaries)

##### Deployment Architecture and Legal Implications

The decision between Direct and Intermediary integration carries severe regulatory consequences:

1. **Direct RP Model (SaaS / Self-Hosted Connector)**: The RP maintains its own Access Certificate and integrates directly with the Wallet ecosystem. If the RP uses a vendor's "SaaS Connector" to facilitate this, the vendor is legally a **Data Processor** (subject to GDPR Article 28 and DORA third-party risk management) but is *not* an eIDAS Relying Party. If the RP exclusively deploys a "Self-Hosted Connector", third-party operations risk is effectively eliminated.
2. **Intermediary RP Model**: The vendor acts as the RP on behalf of the organisation. Under **Article 5b(10) of Regulation (EU) 910/2014**, these intermediaries are *"deemed to be relying parties"* but are subjected to a strict **no-storage mandate**: they *"shall not store data about the content of the transaction"*. 

Because an Intermediary stands between the End-RP and the Wallet users, the trust flow and sequence diagrams diverge critically from the direct model.

#### 17.2 End-to-End Intermediary Flow (Intermediary RP Model)

```mermaid
---
config:
  themeVariables:
    noteBkgColor: "transparent"
    noteBorderColor: "transparent"
  sequence:
    messageAlign: left
    noteAlign: left
    actorMargin: 120
---
sequenceDiagram
    participant User as 👤 User
    participant WU as 📱 Wallet Unit
    participant INT as 🔄 Intermediary<br/>(registered as RP)
    participant IRP as 🏦 Intermediated RP
    participant REG as 🏛️ Registrar

    rect rgba(148, 163, 184, 0.14)
    Note right of User: Precondition: Both entities registered
    Note right of INT: Intermediary has WRPAC<br/>(Subject: Intermediary identity)
    Note right of IRP: Intermediated RP registered,<br/>references Intermediary in<br/>registration data
    end

    rect rgba(52, 152, 219, 0.14)
    Note right of User: Flow: Presentation via Intermediary
    IRP->>INT: 1. Request presentation<br/>(attributes needed, intended use)
    INT->>INT: 2. Build JAR with:<br/>- WRPAC of Intermediary<br/>- Request extension with<br/>  Intermediated RP identity:<br/>  name, identifier,<br/>  registrar URL, intended use ID<br/>- WRPRC of Intermediated RP<br/>  (if available)
    INT->>WU: 3. OpenID4VP request
    end

    rect rgba(46, 204, 113, 0.14)
    Note right of User: Wallet Verification
    WU->>WU: 4. Authenticate Intermediary<br/>via WRPAC chain
    WU->>WU: 5. Extract Intermediated RP<br/>identity from request extension
    WU->>WU: 6. Verify WRPRC (if present)<br/>for Intermediated RP
    alt No WRPRC available
        WU->>REG: 7. Query Registrar for<br/>Intermediated RP data
        REG-->>WU: 8. Registration data
    end
    WU->>User: 9. Display BOTH identities:<br/>"Intermediary X requests data<br/>on behalf of RP Y"
    User->>WU: 10. Approve
    WU->>WU: 11. Build encrypted response
    WU->>INT: 12. POST response to Intermediary
    end

    rect rgba(241, 196, 15, 0.14)
    Note right of User: Response Forwarding
    INT->>INT: 13. Decrypt and verify
    INT->>INT: 14. Extract attributes<br/>(MUST NOT store content data)
    INT->>IRP: 15. Forward verified attributes
    IRP->>IRP: 16. Process attributes
    Note right of REG: ⠀
    end
```

<details><summary><strong>1. Intermediated RP requests presentation from Intermediary</strong></summary>

The Intermediated RP (e.g., an e-commerce site) requests a presentation via the Intermediary's API, specifying the attributes needed (e.g., `family_name`, `age_over_18`) and its registered intended use.
</details>
<details><summary><strong>2. Intermediary builds JAR with WRPAC and Intermediated RP identity</strong></summary>

The Intermediary constructs the OpenID4VP Authorization Request (JAR). Crucially, it signs the JAR with its own WRPAC private key, but includes the identity of the Intermediated RP in a request extension.

```json
{
  "iss": "https://verifier.signicat.com",
  "aud": "https://self-issued.me/v2",
  "exp": 1750089600,
  "iat": 1750003200,
  "jti": "b8d4e1f2-3c5a-6d7b-8e9f-0a1b2c3d4e5f",
  "client_id": "x509_hash://sha-256/Lm4nP9qRsT2uVwXy1zA3bC5dEfGhJ7kK8lO0pI6jHgF",
  "response_type": "vp_token",
  "response_mode": "direct_post.jwt",
  "response_uri": "https://verifier.signicat.com/oid4vp/callback",
  "nonce": "kYzM4NTY3ODkwMTIzNDU2Nz",
  "state": "int-session-abc",
  "response_encryption_alg": "ECDH-ES",
  "response_encryption_enc": "A256GCM",
  "response_encryption_jwk": { "kty": "EC", "crv": "P-256", "x": "...", "y": "..." },
  "intermediated_rp": {                        // NOTE: non-standard extension (see below)
    "name": [
      {"lang": "de", "content": "Beispiel Bank AG"},
      {"lang": "en", "content": "Example Bank AG"}
    ],
    "identifier": "5299001GCLKH6FPVJW75",
    "registrar_uri": "https://registrar.example-ms.de",
    "intended_use_id": "urn:eudi:wrp:de:example-bank:kyc"
  },
  "dcql_query": {
    "credentials": [
      {
        "id": "pid",
        "format": "dc+sd-jwt",
        "meta": { "vct_values": ["eu.europa.ec.eudi.pid.1"] },
        "claims": [
          {"path": ["family_name"]},
          {"path": ["given_name"]},
          {"path": ["birth_date"]}
        ]
      }
    ]
  }
}
```

> **Non-standard extension**: The `intermediated_rp` claim shown above follows the ARF §6.6.5 conceptual design for conveying intermediated RP identity within the JAR. The exact claim name and structure have **not yet been formalised** in a published OpenID4VP specification.

JWS header — signed with the **Intermediary's** WRPAC:

```json
{
  "alg": "ES256",
  "typ": "oauth-authz-req+jwt",
  "x5c": [
    "<Intermediary WRPAC certificate DER>",
    "<Access CA intermediate>"
  ]
}
```
</details>
<details><summary><strong>3. Intermediary sends OpenID4VP request to Wallet Unit</strong></summary>

The Intermediary transmits the signed JAR to the User's Wallet Unit (e.g., via a QR code or deep link).
</details>
<details><summary><strong>4. Wallet Unit authenticates Intermediary via WRPAC chain</strong></summary>

The Wallet Unit cryptographically authenticates the Intermediary by validating its WRPAC certificate chain (from the JAR `x5c` header) against the LoTE trust anchor.
</details>
<details><summary><strong>5. Wallet Unit extracts Intermediated RP identity from request extension</strong></summary>

The Wallet unit extracts the identity details of the Intermediated RP from the JAR payload's extension (`intermediated_rp`).
</details>
<details><summary><strong>6. Wallet Unit verifies WRPRC for Intermediated RP</strong></summary>

If the JAR included a Wallet Relying Party Registration Certificate (WRPRC) for the Intermediated RP, the Wallet verifies it cryptographically.
</details>
<details><summary><strong>7. Wallet Unit queries Registrar for Intermediated RP data</strong></summary>

If no WRPRC is available, the Wallet queries the National Registration Infrastructure (Registrar API) using the identifier to dynamically fetch the Intermediated RP's registration data and intended use permissions.

```http
GET /wrp/check-intended-use?rpidentifier=5299001GCLKH6FPVJW75
    &intendeduseidentifier=urn:eudi:wrp:de:example-bank:kyc
    &credentialformat=dc%2Bsd-jwt
    &claimpath=family_name
Host: registrar.example-ms.de
Accept: application/jwt
```
</details>
<details><summary><strong>8. Registrar returns registration data to Wallet Unit</strong></summary>

The Registrar API responds with a signed assertion confirming the Intermediated RP is registered and authorized to request those specific attributes.
</details>
<details><summary><strong>9. Wallet Unit displays both Intermediary and RP identities to User</strong></summary>

The Wallet constructs a consent screen that clearly displays **both** entities to the User, in compliance with transparency requirements (e.g., "Intermediary X is requesting data on behalf of Company Y").
</details>
<details><summary><strong>10. User approves data release to Intermediated RP via Intermediary</strong></summary>

The User reviews the request and approves the release of data to the Intermediated RP via the Intermediary, executing local authentication (High LoA).
</details>
<details><summary><strong>11. Wallet Unit builds encrypted response with vp_token</strong></summary>

The Wallet builds the `vp_token`, encrypts it using the ephemeral public key provided in the JAR's `response_encryption_jwk` parameter, and constructs the response JWE.
</details>
<details><summary><strong>12. Wallet Unit POSTs encrypted response to Intermediary</strong></summary>

The Wallet HTTP POSTs the encrypted response back directly to the Intermediary's `response_uri`.
</details>
<details><summary><strong>13. Intermediary decrypts JWE and verifies presentation</strong></summary>

The Intermediary receives the JWE, decrypts it, and fully verifies the presentation (Issuer signature, selective disclosures, DeviceAuth/KB-JWT, and Status List revocation).
</details>
<details><summary><strong>14. Intermediary extracts attributes (MUST NOT store content data)</strong></summary>

The Intermediary extracts the verified plaintext attributes into memory. Crucially, as mandated by Article 5b(10) of Regulation 910/2014, the Intermediary **shall not store** this transaction content data persistently.
</details>
<details><summary><strong>15. Intermediary forwards verified attributes to Intermediated RP</strong></summary>

The Intermediary immediately forwards the verified attributes to the Intermediated RP via its backend-to-backend API connection (e.g., webhook or message queue).
</details>
<details><summary><strong>16. Intermediated RP processes received attributes</strong></summary>

The Intermediated RP receives the verified attributes provided by the User and processes them within its own business logic, concluding the flow.
</details>

#### 17.3 Intermediary Constraints (Art. 5b(10))

| Constraint | Requirement |
|:-----------|:------------|
| **Registration** | Intermediary must register as an RP itself |
| **No content storage** | Must NOT store the content of the transaction data (User attributes) |
| **Attribution** | Must clearly identify the intermediated RP in the request |
| **Transparency** | User must see both intermediary and RP identities |
| **Certificate** | Intermediary holds its own WRPAC; intermediated RP's identity is in request extension |
| **Forwarding** | Must forward all verified attributes to the intermediated RP |
| **Compliance** | Subject to all RP obligations (TS7, TS8, GDPR) |

#### 17.4 Intermediary-to-Intermediated-RP Attribute Forwarding

The intermediary's role doesn't end at Wallet interaction. It must securely forward verified attributes to the intermediated RP. The ARF and CIR do not prescribe a specific protocol for this leg — it is a private API contract between intermediary and intermediated RP. The callback architecture patterns described below are the intermediary-specific instance of the general three-layer callback taxonomy documented in §20.6.

#### 17.4.1 Forwarding Architecture Options

| Approach | Description | Pros | Cons |
|:---------|:------------|:-----|:-----|
| **REST API callback** | Intermediary POSTs verified attributes to a pre-registered webhook URL on the intermediated RP's infrastructure | Simple, synchronous, widely supported | RP must expose an endpoint; payload in transit |
| **Message queue** | Intermediary publishes to a message broker (e.g., Kafka, RabbitMQ); RP subscribes | Decoupled, reliable delivery, audit trail | Infrastructure complexity; latency |
| **Signed JWT relay** | Intermediary wraps verified attributes in a signed JWT using its own key; RP verifies the intermediary's signature | Tamper-proof, self-contained | Intermediary must manage signing keys; RP must trust intermediary's key |
| **Direct proxy** | Intermediary decrypts and re-encrypts the response for the RP in real-time without storing | Minimal data exposure | Complex implementation; must handle all error cases inline |

#### 17.4.2 Verification Gates and Forwarding Requirements (AS-RP-51-011/012)

Before forwarding any data, the intermediary acts as a verification gateway. Under ARF HLR **AS-RP-51-012**, the intermediary `SHALL` verify the attributes. The ARF specifies five verification dimensions:

1. **Authenticity**: Verify the digital signature on the PID or attestation against the issuer's public key and trust chain (LoTE).
2. **Revocation status**: Check that the PID/attestation has not been revoked (via Attestation Status Lists/OCSP).
3. **Device binding**: Verify cryptographic proof that the credential is bound to the presenting Wallet's secure element (WSCD).
4. **User binding**: Verify proof that the authorised user is presenting the credential.
5. **Wallet unit authenticity**: Verify the Wallet Unit Attestation (WUA) and its revocation status.

**The "As Agreed" Qualification**: The ARF explicitly notes that it *does not mandate* a Relying Party to require all verifications. The intermediary and the intermediated RP must agree contractually on which verifications the intermediary will carry out. This creates a per-RP configuration requirement.

**Conditional Forwarding (AS-RP-51-011)**: If any of the *agreed* verifications fail, the intermediary `SHALL NOT` forward any attributes to the RP. Successful verification is a strict prerequisite for forwarding.

Beyond the verification gate, when transmitting the payload, the intermediary MUST:

1. **Authenticate the intermediated RP** before forwarding (e.g., mutual TLS, OAuth 2.0 client credentials).
2. **Encrypt the payload in transit** (TLS 1.3 minimum).
3. **NOT store the content data** — Art. 5b(10) explicitly prohibits content data storage by intermediaries. Metadata (timestamps, attribute names, request IDs) may be logged, but actual `family_name` or `birth_date` values must be ephemeral.
4. **Include provenance metadata** — the forwarded payload should include the presentation timestamp, DCQL query that was fulfilled, and a detailed verification status summary defining which of the 5 dimensions passed.
5. **Forward promptly** — the intermediary should forward within the same session context, not batch or delay.

#### 17.4.3 Example Forwarding Payload (REST API)

```json
{
  "intermediary_id": "https://verifier.signicat.com",
  "presentation_timestamp": "2026-07-15T14:32:00Z",
  "verification_status": {
    "issuer_signature": "valid",
    "device_binding": "valid",
    "revocation_status": "valid",
    "wrpac_chain": "valid"
  },
  "credential_format": "dc+sd-jwt",
  "credential_type": "eu.europa.ec.eudi.pid.1",
  "disclosed_attributes": {
    "family_name": "Müller",
    "given_name": "Anna",
    "birth_date": "1990-03-15"
  },
  "request_reference": "int-session-abc"
}
```

> **Security note**: The intermediary should sign this payload (e.g., JWS with its own key) to provide the intermediated RP with cryptographic proof that the attributes were verified by the intermediary. The intermediated RP cannot independently verify the original EUDI Wallet presentation — it trusts the intermediary's verification.

---

### 18. Regulatory Compliance: eIDAS, PSD2, GDPR, and DORA

#### 18.1 RP Compliance Checklist

| Obligation | Article | Deadline | Implementation |
|:-----------|:--------|:---------|:---------------|
| Register with national Registrar | Art. 5b(1), CIR 2025/848 | Before accepting EUDI Wallet | Registration application + Registrar approval |
| Obtain WRPAC(s) | CIR 2025/848 Art. 7 | Before first presentation | Certificate request to Access CA |
| Accept EUDI Wallet | Art. 5b(7) | 21 Dec 2027 | Full OpenID4VP + ISO 18013-5 integration |
| Data minimisation | Art. 5b(2) | Ongoing (all interactions) | Request only necessary attributes |
| Transparency | Art. 5b(3) | Ongoing | Expose RP identity, purpose, privacy policy |
| No third-party sharing | Art. 5b(4) | Ongoing | Data handling controls |
| Accept pseudonyms | Art. 5b(9) | 21 Dec 2027 | Pseudonym support in auth system |
| Support data deletion requests | CIR 2024/2982 Art. 6 | Upon acceptance | `supportURI` implementation |
| Support DPA reporting | CIR 2024/2982 Art. 7 | Upon acceptance | `supervisoryAuthority` in registration |
| Non-discrimination | Art. 5b(6) | Ongoing | Equal service quality for wallet vs. non-wallet users |

#### 18.2 PSD2/PSR and SCA Bridge

#### 18.2.1 Context

PSD2 (Directive 2015/2366/EU) requires Strong Customer Authentication (SCA) for electronic payments. The upcoming Payment Services Regulation (PSR) will replace PSD2 and continue these requirements. TS12 defines how the EUDI Wallet satisfies SCA requirements.

#### 18.2.2 EUDI Wallet as SCA Method

| PSD2/PSR Requirement | EUDI Wallet Implementation |
|:---------------------|:---------------------------|
| **Two-factor authentication** (Art. 97) | Possession (device key in WSCA/WSCD) + Knowledge/Inherence (PIN/biometric) |
| **Dynamic linking** (Art. 97(2)) | `transaction_data` in OpenID4VP request binds auth to amount + payee |
| **Independence of elements** (RTS Art. 9) | WSCA/WSCD key is independent from display/input channels |
| **Confidentiality** (RTS Art. 22) | JWE-encrypted responses; WSCA/WSCD protects private keys |
| **Authentication code** (RTS Art. 5) | Device-bound signature over transaction hash = authentication code |

#### 18.2.3 PSP Implementation Steps

1. **Issue SCA attestation** to User's Wallet Unit during payment instrument enrolment (via OID4VCI)
2. **Register as RP** with national Registrar (declaring SCA attribute types)
3. **Obtain WRPAC** for the PSP's RP Instance
4. **Build DCQL queries** for SCA attestation type `eu.europa.ec.eudi.sca.transaction.1`
5. **Include `transaction_data`** in presentation requests for dynamic linking
6. **Verify SCA response**: attestation signature + transaction hash signature
7. **Map to existing authorisation infrastructure**: bridge between EUDI SCA response and the PSP's authorisation decision engine

#### 18.2.4 PSD3/PSR Transition Impact

The European Commission adopted the **Payment Services Regulation (PSR)** proposal (COM/2023/366) as a direct-application regulation replacing PSD2. Key changes affecting EUDI Wallet SCA flows:

| PSR Change | Impact on EUDI Wallet SCA | RP Action Required |
|:-----------|:--------------------------|:-------------------|
| **SCA exemptions tightened** | Fewer transactions exempt from SCA → more frequent EUDI Wallet SCA interactions | RPs should optimise SCA flow latency; consider pre-positioning SCA attestation prompts |
| **IBAN/Name verification mandatory** (Art. 59) | PSPs must verify payee IBAN–name match before executing credit transfers | SCA attestation may need to include payee verification status; DCQL query may expand |
| **Open banking APIs extended** | Third-party providers get extended API access | Third-party-requested SCA flows (§13.8) become more common; RP must handle delegated SCA |
| **Fraud monitoring obligations** (Art. 83) | Real-time transaction risk analysis mandated | SCA attestation's `amr` values feed into the risk engine; `transaction_data_hashes` become fraud evidence |
| **Electronic money integration** | PSR covers e-money institutions (previously under EMD2) | E-money issuers must also support EUDI Wallet SCA |
| **Effective date** | Provisional agreement reached Nov 2025; formal adoption expected mid-2026; applicable 18 months after publication (~early 2028) | Aligns with EUDI Wallet mandatory acceptance (Dec 2027) |

> **Forward-compatibility note**: The TS12 SCA flows described in §13 are designed against PSD2 SCA requirements. The PSR maintains the same three-factor SCA model (knowledge + possession + inherence) and dynamic linking requirements, so the core EUDI Wallet SCA mechanism remains valid. RPs should monitor the final PSR text for any additional `transaction_data` fields required for IBAN/Name verification or enhanced fraud monitoring.

#### 18.3 GDPR Obligations for RPs

| GDPR Requirement | RP Implementation |
|:-----------------|:------------------|
| **Lawful basis** (Art. 6) | Must establish legal basis BEFORE requesting attributes; User approval in Wallet is NOT consent under GDPR |
| **Purpose limitation** (Art. 5(1)(b)) | Registered intended use = stated purpose; deviation triggers DPA reporting |
| **Data minimisation** (Art. 5(1)(c)) | Request only attributes needed for the registered intended use |
| **Right to erasure** (Art. 17) | Support TS7 data deletion requests |
| **Transparency** (Art. 13/14) | Privacy policy URL in registration data; intended use description in WRPRC |
| **Records of processing** (Art. 30) | RP must maintain records; Wallet's transaction log is on the User side |
| **DPIA** (Art. 35) | Large-scale processing of EUDI Wallet data likely triggers DPIA obligation |

> **TS10 awareness — Transaction log forensics**: Every presentation to an RP is permanently recorded in the Wallet Unit's transaction log (TS10, v1.0 Aug 2025). The log entry includes the RP's identifier, legal name, contact details, stated purpose, privacy policy URI, DPA information, AND the **complete list of claims requested** versus **claims actually presented** by the User. This log is exportable as a JWE-encrypted Migration Object (PBES2-HS256+A128KW) and persists across Wallet Unit migrations. Over-requesting attributes creates a forensically discoverable trail of non-compliance with the data minimisation principle. RPs should assume that every attribute request is permanently auditable by the User, DPAs, and any future Wallet Unit receiving the exported log.

#### 18.4 DORA Considerations for Financial RPs

The **Digital Operational Resilience Act (DORA)** — Regulation (EU) 2022/2554 — is relevant to financial-sector RPs only where it directly impacts the RP flows depicted in this document:

| DORA Requirement | Impact on RP Flows |
|:-----------------|:-------------------|
| **ICT third-party risk** (Art. 28–30) | If the RP uses an intermediary (§17), the intermediary is an ICT third-party service provider subject to DORA oversight. The RP must assess its dependency. |
| **ICT incident notification** (Art. 17–23) | If a Wallet presentation flow outage constitutes an ICT-related incident (e.g., WRPAC revocation causing service disruption), the RP must follow DORA incident reporting. |
| **Digital resilience testing** (Art. 24–27) | The RP's EUDI Wallet integration (OpenID4VP endpoint, certificate chain validation, revocation checking) should be included in the RP's digital resilience testing programme. |
| **Information sharing** (Art. 45) | Trust infrastructure events (LoTE updates, Provider suspensions) should be incorporated into the RP's cyber threat intelligence sharing. |

### 19. AML/KYC Onboarding via EUDI Wallet

#### 19.1 Customer Due Diligence (CDD) Flow (Direct RP Model)

Financial institutions subject to AMLD (Anti-Money Laundering Directive) must perform Customer Due Diligence during onboarding. The EUDI Wallet provides a streamlined digital CDD channel.

```mermaid
---
config:
  themeVariables:
    noteBkgColor: "transparent"
    noteBorderColor: "transparent"
  sequence:
    messageAlign: left
    noteAlign: left
    actorMargin: 120
---
sequenceDiagram
    participant User as 👤 Customer
    participant WU as 📱 Wallet Unit
    participant Bank as 🏦 Bank (RP)
    participant SL as 📋 Status List

    rect rgba(148, 163, 184, 0.14)
    Note right of User: Step 1: CDD Identity Verification
    User->>Bank: 1. Begin onboarding (web/app)
    Bank->>Bank: 2. Build DCQL for CDD:<br/>PID: family_name, given_name,<br/>birth_date, nationality,<br/>personal_identifier,<br/>resident_address
    Bank->>WU: 3. OpenID4VP request<br/>(same-device or cross-device)
    WU->>User: 4. Consent screen
    User->>WU: 5. Approve
    WU->>Bank: 6. Encrypted PID presentation
    Bank->>Bank: 7. Verify PID (signature,<br/>revocation, device binding)
    Bank->>SL: 8. Check PID revocation
    SL-->>Bank: 9. VALID
    end

    rect rgba(52, 152, 219, 0.14)
    Note right of User: Step 2: Sanctions/PEP Screening
    Bank->>Bank: 10. Run AML screening<br/>against PID attributes:<br/>- Name matching<br/>- DOB matching<br/>- Nationality check<br/>- Sanctions lists<br/>- PEP databases
    end

    rect rgba(46, 204, 113, 0.14)
    Note right of User: Step 3: Additional CDD (if needed)
    Bank->>WU: 11. Request additional<br/>attestations (if EDD):<br/>- Source of funds<br/>- Employment attestation<br/>- Tax residency
    WU->>User: 12. Consent for additional<br/>attestations
    User->>WU: 13. Approve
    WU->>Bank: 14. Additional attestation<br/>presentation
    end

    rect rgba(241, 196, 15, 0.14)
    Note right of User: Step 4: Account Creation
    Bank->>Bank: 15. CDD decision:<br/>APPROVED / REJECTED / EDD
    Bank->>User: 16. Account opened /<br/>further review needed
    Note right of SL: ⠀
    end
```

#### 19.1.1 CDD Payload Walkthrough

<details><summary><strong>1. Customer initiates onboarding at Bank web/app</strong></summary>

The prospective customer initiates the account opening process either on the Bank's website or within its mobile application.
</details>
<details><summary><strong>2. Bank builds DCQL query for CDD attributes</strong></summary>

The Bank constructs a DCQL query requesting the minimum PID attributes needed for AMLD Customer Due Diligence:

```json
{
  "credentials": [
    {
      "id": "pid_cdd",
      "format": "dc+sd-jwt",
      "meta": {
        "vct_values": ["eu.europa.ec.eudi.pid.1"]
      },
      "claims": [
        {"path": ["family_name"]},
        {"path": ["given_name"]},
        {"path": ["birth_date"]},
        {"path": ["nationality"]},
        {"path": ["personal_identifier"]},
        {"path": ["resident_address"]},
        {"path": ["resident_city"]},
        {"path": ["resident_postal_code"]},
        {"path": ["resident_country"]}
      ]
    }
  ]
}
```

> **Data minimisation**: The Bank requests only CDD-required attributes. Optional PID attributes like `portrait`, `birth_place`, or `age_over_18` are excluded unless specifically required for Enhanced Due Diligence. The `personal_identifier` is the national ID number — critical for sanctions screening and cross-referencing against government databases.
</details>
<details><summary><strong>3. Bank sends OpenID4VP request to Wallet Unit</strong></summary>

The Bank wraps the DCQL query in a signed OpenID4VP Authorization Request (JAR) and transmits it to the Wallet Unit (via QR code for cross-device or deep link for same-device). The `purpose` extension ideally informs the Wallet User of the lawful basis:

```json
{
  "iss": "https://onboarding.example-bank.de",
  "aud": "https://self-issued.me/v2",
  "exp": 1750007000,
  "iat": 1750003200,
  "jti": "cdd-req-a1b2c3d4-e5f6-7890-abcd-ef0123456789",
  "client_id": "x509_hash://sha-256/kR4mBz9vL2...",
  "response_type": "vp_token",
  "response_mode": "direct_post.jwt",
  "response_uri": "https://onboarding.example-bank.de/oid4vp/cdd-callback",
  "nonce": "QmFua19LWUNfT25ib2FyZGluZw",
  "state": "cdd-session-789xyz",
  "response_encryption_alg": "ECDH-ES",
  "response_encryption_enc": "A256GCM",
  "response_encryption_jwk": {
    "kty": "EC",
    "crv": "P-256",
    "x": "weNJy2HscCSM6AEDTDg04biOvhFhyyWvOHQfeF_PxMQ",
    "y": "e8lnCO-AlStT-DBER57_vilrLYyKpa5TXSg0GN7BJPQ"
  },
  "dcql_query": { "...as above..." },
  "rp_info": {
    "intended_use": "Customer onboarding and KYC verification under AMLD Art. 13",
    "privacy_policy_uri": "https://example-bank.de/privacy/kyc"
  }
}
```

> **Non-standard extension**: The `rp_info` claim shown above is **illustrative** — it is not defined in OpenID4VP 1.0 or HAIP 1.0. In practice, the intended use and privacy policy are conveyed through the WRPRC or Registrar API, not through the JAR. The inclusion here demonstrates the conceptual goal of in-request transparency. RPs should monitor whether a future OpenID4VP extension formalises this pattern.
>
> **⚠️ ETSI extension mechanism (EW-DM-44-020) — implementation trap**: ARF v2.8.0 (HLR EW-DM-44-020) specifies that the intended use information required by EW-DM-44-018 (intended use identifier, description, registrar URL, privacy policy URI) is NOT transferred via the standard OpenID4VP `purpose` parameter. Instead, the ARF defines a richer mechanism via **ETSI TS 119 472-2** protocol extensions — separate extension profiles exist for both OpenID4VP and ISO 18013-5 flows. Implementers who rely solely on the standard OID4VP `purpose` field will fail ARF compliance. The `purpose` parameter in OID4VP is a free-text string intended for human display; the EW-DM-44-018 mechanism carries structured, machine-verifiable intended use data that Wallet Units use to query the Registrar for verification (see §3.4.4). A future CIR is being prepared to formalise these ETSI extensions as mandatory. RPs and their connector vendors must implement the ETSI-defined extension, not just the OID4VP `purpose` field.
</details>
<details><summary><strong>4. Wallet Unit displays consent screen to Customer</strong></summary>

The Wallet Unit verifies the Bank's request and displays a consent screen listing the requested attributes alongside the Bank's registered identity.
</details>
<details><summary><strong>5. Customer approves attribute disclosure</strong></summary>

The User approves the share using strong local authentication on the Wallet Unit.
</details>
<details><summary><strong>6. Wallet Unit sends encrypted PID presentation to Bank</strong></summary>

The Wallet encrypts the response into a JWE and posts it to the Bank's `response_uri`. The decrypted payload contains the SD-JWT VC with all CDD-required attributes selectively disclosed:

```
<Issuer-signed JWT>~<Disclosure:family_name>~<Disclosure:given_name>~
<Disclosure:birth_date>~<Disclosure:nationality>~
<Disclosure:personal_identifier>~<Disclosure:resident_address>~
<Disclosure:resident_city>~<Disclosure:resident_postal_code>~
<Disclosure:resident_country>~<KB-JWT>
```

Decoded disclosures (base64url → JSON array):

```json
["2GLC42sKQveCfGfryNRN9w", "family_name", "Müller"]
["eluV5Og3gSNII8EYnsxA_A", "given_name", "Anna"]
["6Ij7tM-a5iVPGboS5tmvVA", "birth_date", "1990-03-15"]
["eI8ZWm9QnKPpNPeNeuHzsg", "nationality", "DE"]
["Qg_O64zqAxe412a108iroA", "personal_identifier", "1234567890"]
["AJx-095VPrpTtN4QMOqROA", "resident_address", "Musterstraße 42"]
["G02NSrQfjFXQ7Io09syajA", "resident_city", "Berlin"]
["lklxF5jMYlGTPUovMNIvCA", "resident_postal_code", "10115"]
["nPuoQnkRFq3BIeAm7AnXFA", "resident_country", "DE"]
```

Key Binding JWT payload (proves Wallet Unit possesses the device key):

```json
{
  "typ": "kb+jwt",
  "aud": "x509_hash://sha-256/kR4mBz9vL2...",
  "nonce": "QmFua19LWUNfT25ib2FyZGluZw",
  "iat": 1750003500,
  "sd_hash": "X4wJbK9wLu0pE8aRqGm_y2XzK..."
}
```
</details>
<details><summary><strong>7. Bank verifies PID signature, disclosures, and device binding</strong></summary>

The Bank verifies the SD-JWT VC, including the issuer's signature against the LoTE trust anchors, and validates the device binding proof (KB-JWT) to ensure the credential wasn't stolen or replayed.
</details>
<details><summary><strong>8. Bank checks PID revocation via Status List</strong></summary>

The Bank queries the corresponding Status List endpoint for the PID credential to ensure it hasn't been suspended or revoked by the issuer.
</details>
<details><summary><strong>9. Status List confirms PID credential validity to Bank</strong></summary>

The Status List returns a valid status. The Identity Verification portion of CDD is now cryptographically complete.
</details>
<details><summary><strong>10. Bank runs AML screening against verified PID attributes</strong></summary>

With a verified identity, the Bank runs its mandatory AML and sanctions screening against the extracted attributes (Name, DOB, Nationality, Address against Sanctions lists and PEP databases).

```mermaid
flowchart TD
    S1["`**1. Name Matching**
    Input: family_name, given_name
    Check: EU Sanctions List,
    UN Security Council, OFAC SDN
    Result:&nbsp;✅&nbsp;No&nbsp;match`"]
    S2["`**2. PEP Screening**
    Input: family_name, given_name,
    birth_date
    Check: Dow Jones / World-Check
    Result:&nbsp;✅&nbsp;No&nbsp;PEP&nbsp;match`"]
    S3["`**3. National ID Verification**
    Input: personal_identifier
    Check: National registry,
    internal fraud database
    Result:&nbsp;✅&nbsp;Valid,&nbsp;no&nbsp;duplicates`"]
    S4["`**4. Geographic Risk**
    Input: nationality,
    resident_country, resident_address
    Check: FATF high-risk jurisdictions
    Result:&nbsp;✅&nbsp;Low&nbsp;risk`"]
    DEC{"`**DECISION: APPROVED**
    Standard CDD sufficient
    Risk Score: LOW
    EDD&nbsp;Required:&nbsp;NO`"}
    S1 --> S2 --> S3 --> S4 --> DEC
    style S1 text-align:left
    style S2 text-align:left
    style S3 text-align:left
    style S4 text-align:left
    style DEC text-align:left
```

> **Key advantage**: The PID's `personal_identifier` attribute enables the bank to perform authoritative identity matching against national registries — something impossible with traditional document scanning where OCR errors are common. The cryptographic device binding (KB-JWT) proves the presentation originates from a genuine Wallet Unit, eliminating document forgery risk.
</details>
<details><summary><strong>11. Bank requests additional EDD attestations from Wallet Unit</strong></summary>

If the risk profile warrants Enhanced Due Diligence (EDD) — e.g., the User is a PEP or flagged in risk systems — the Bank sends a subsequent OpenID4VP request asking for additional proofs like "Source of funds" or "Tax residency".
</details>
<details><summary><strong>12. Wallet Unit displays consent screen for additional attestations</strong></summary>

The Wallet displays a new consent screen for the additional qualifications.
</details>
<details><summary><strong>13. Customer approves secondary attestation request</strong></summary>

The User approves the secondary request.
</details>
<details><summary><strong>14. Wallet Unit sends additional attestation presentation to Bank</strong></summary>

The Wallet encrypts and sends the requested EDD attestations back to the Bank.
</details>
<details><summary><strong>15. Bank reaches final CDD decision (APPROVED / REJECTED / EDD)</strong></summary>

The Bank correlates the verified PID attributes and any EDD attributes, updating its internal risk assessment and reaching a final CDD decision.
</details>
<details><summary><strong>16. Bank notifies Customer of account opening or review status</strong></summary>

The Bank notifies the User (via the onboarding web/app session) that their account has been successfully opened or that manual review is required.
</details>

#### 19.2 CDD Attributes from EUDI Wallet

| AMLD Requirement | EUDI Wallet Source | PID Attribute |
|:-----------------|:-------------------|:--------------|
| Full name | PID | `family_name`, `given_name` |
| Date of birth | PID | `birth_date` |
| Place of birth | PID | `birth_place` (optional) |
| Nationality | PID | `nationality` |
| Residential address | PID or Address attestation | `resident_address`, `resident_city`, `resident_country` |
| National ID number | PID | `personal_identifier` |
| Photo/portrait | PID (proximity flow) | `portrait` |

#### 19.3 Enhanced Due Diligence (EDD)

For higher-risk customers, the bank may request additional attestations beyond the PID using DCQL combined queries. These might include:

- Source of funds attestation
- Employment/occupation attestation
- Tax residency certificate
- Residence permit (for non-EU nationals)

The availability of these attestations depends on Member State implementation and Attestation Provider ecosystem maturity.

---

### 20. RP Verification Architecture Patterns

Production-grade EUDI verification platforms decompose the cryptographic verification pipeline (§10) into **composable architectural patterns** rather than implementing it as a monolithic code path. This chapter documents cross-vendor architecture patterns that are independent of any specific product — they describe how a well-architected RP verification system should be structured, regardless of whether it is built in-house or uses a third-party SDK. Vendor-specific capabilities against these patterns are evaluated in §21.

#### 20.1 Verification Policy Engine

The verification policy engine is the architectural layer that governs *which checks are applied* to a presented credential and *how their results are aggregated* into a verification decision. Rather than hardcoding verification logic, production systems organise policies into composable tiers.

##### 20.1.1 Three-Tier Policy Architecture

Verification policies are typically organised into three tiers of increasing flexibility:

| Tier | Description | EUDI Examples | Configuration |
|:-----|:-----------|:-------------|:--------------|
| **Static** | Built-in checks with no parameters. Always executed in the same way. | Cryptographic signature verification, expiry check (`exp`), not-before check (`nbf`), holder binding (`cnf.jwk` confirmation), schema validation | Enabled/disabled per verification request |
| **Parameterized** | Checks that accept configuration arguments to customise behaviour. | Trusted issuer whitelist (X.509 certificate hash or Trusted List anchor), revocation status check (TokenStatusList index + expected value), credential type filter (`vct_values`) | Arguments provided per verification request or per verifier instance configuration |
| **Dynamic** | Programmable rules evaluated at runtime against credential data. Policies can be defined inline, loaded from a policy server, or composed from multiple rule sets. | Custom business rules (e.g., "accept PID only from MS in [DE, NL, FR]"), AML screening delegation, age threshold validation, combined presentation cross-matching (§15.5.6) | Rule definitions managed as code artifacts; version-controllable and independently testable |

> **Why this matters for RPs**: The policy engine architecture determines how much verification logic lives in the RP's own codebase versus being delegated to the verification platform. RPs operating in regulated industries (banking, healthcare) benefit from the **auditability** of declarative policy definitions — each policy decision can be traced to a specific, versioned rule rather than buried in application code.

#### 20.2 Webhook and Callback Delegation

The dynamic policy tier enables a particularly useful integration pattern: **webhook-delegated verification**. The verification platform forwards credential data to an external service for a pass/fail decision as part of the policy chain:

```mermaid
---
config:
  themeVariables:
    noteBkgColor: "transparent"
    noteBorderColor: "transparent"
  sequence:
    messageAlign: left
    noteAlign: left
    actorMargin: 120
---
sequenceDiagram
    participant W as Wallet Unit
    participant P as Verification<br/>Policy Engine
    participant E as External Service<br/>(AML / Screening)

    rect rgba(148, 163, 184, 0.14)
    Note over W,P: Phase 1 — VP Token Submission
    W->>P: POST /verify (VP Token)
    end

    rect rgba(46, 204, 113, 0.14)
    Note over P: Phase 2 — Static Policy Chain
    P->>P: 1. Signature verification
    Note right of P: Result: PASS ✅
    P->>P: 2. Expiry check (exp)
    Note right of P: Result: PASS ✅
    P->>P: 3. Revocation status (TokenStatusList)
    Note right of P: Result: PASS ✅
    end

    rect rgba(52, 152, 219, 0.14)
    Note over P,E: Phase 3 — Webhook Delegation
    P->>E: POST /screen { credential_type, attributes }
    Note right of E: AML/Sanctions<br/>screening logic
    E-->>P: 200 { "pass": true }
    Note right of P: 4. Webhook policy: PASS ✅
    end

    rect rgba(241, 196, 15, 0.14)
    Note over P,W: Phase 4 — Result
    P-->>W: Verification Result (all policies passed)
    end
    Note right of E: ⠀
```

This pattern is particularly relevant for:

- **AML/Sanctions screening** (§19) — Post extracted identity attributes to an AML screening service as an automated verification policy step, rather than implementing screening as a separate post-verification process
- **Regulatory business rules** — Enforce rules that vary by jurisdiction or use case (e.g., "for SCA, accept only PID; for age verification, accept PID or mDL") without hardcoding them in application logic
- **GDPR consent recording** — Trigger a consent record creation as a policy step, ensuring the processing record (Art. 30) is created atomically with the verification decision
- **Audit trail integration** — The webhook endpoint can serve as an audit sink, logging every verification attempt with full credential metadata (attribute names, not values — per §25.3)

#### 20.3 Policy-as-Code for Auditable Verification

For RPs in regulated industries, the dynamic policy tier supports **policy-as-code** — defining verification rules as declarative, version-controlled artifacts (e.g., using Open Policy Agent/Rego or equivalent policy languages). Key benefits for EUDI compliance:

1. **Auditability** — Policy definitions are declarative and version-controllable; supervisory authorities can inspect the exact rules that governed a verification decision at any point in time
2. **Testability** — Policies can be unit-tested independently of the verification platform, ensuring that rule changes don't introduce regressions
3. **Separation of concerns** — Verification logic (cryptographic checks) and business logic (which issuers are trusted, which attributes are required) are managed by different teams with different change cadences
4. **DORA compliance** — DORA Art. 9 requires financial entities to document and test their ICT risk management framework; policy-as-code provides the artifact trail

#### 20.4 Validation vs. Verification Separation

A refinement of the policy engine pattern separates the verification pipeline into two distinct stages:

| Stage | Question Answered | EUDI-Specific Checks |
|:------|:-----------------|:---------------------|
| **Validation** | "Does this credential conform to the expected format and come from a trusted issuer?" | Schema validation, DCQL compliance, Trusted List anchor check, credential type matching (`vct` / `doctype`), presentation structure |
| **Verification** | "Is the cryptographic proof valid and is the credential not revoked?" | Signature verification (§10), expiry/not-before, TokenStatusList check (Annex B), holder binding (`cnf.jwk`), device authentication (mdoc) |

This maps directly to the structure of DR-0002 itself: §9 covers validation-level checks, §10 covers cryptographic verification. Separating these stages in the RP's architecture enables:

- **Independent scaling** — Validation (lightweight JSON/CBOR parsing) and verification (computationally intensive cryptographic operations) can scale independently
- **Per-use-case configuration** — Different validation rules for PID vs. mDL vs. EAA, with the same underlying verification engine
- **Clearer failure diagnostics** — "Validation failed: unsupported credential type" vs. "Verification failed: signature invalid" — distinct error categories for different resolution paths

#### 20.5 Session Management and Result Delivery

Every OpenID4VP verification interaction is a **stateful session** with a defined lifecycle. RPs must architect their server-side systems to manage these sessions correctly — the protocol defines the *message exchange*, but the session *lifecycle* management is the RP's responsibility.

##### 20.5.1 Session Lifecycle States

| State | Trigger | RP Action |
|:------|:--------|:----------|
| **Created** | RP calls verifier API (e.g., `POST /openid4vc/verify`) | Store session ID; generate QR code or redirect URI |
| **Pending** | Wallet has not yet responded | Display loading state to user; implement timeout |
| **Fulfilled** | Wallet posts `vp_token` to `response_uri` | Process verification; evaluate policies |
| **Expired** | Timeout reached (typically 5–10 minutes) | Clean up session; prompt user to retry |
| **Failed** | Wallet returns error, or verification policies fail | Log failure reason; display appropriate error to user |

##### 20.5.2 Result Delivery: Polling vs. Callbacks

Two architectural patterns exist for the RP to learn that a session has been fulfilled:

| Pattern | Mechanism | When to Use |
|:--------|:----------|:------------|
| **Polling** | RP periodically calls `GET /session/{id}` | Simple deployments; low-volume RPs; development/testing |
| **Webhook callback** | Verifier POSTs result to RP's `statusCallbackUri` when session transitions to Fulfilled/Failed | Production deployments; high-volume RPs; event-driven architectures |

The webhook callback pattern is preferred for production because it eliminates polling latency and reduces API load. A typical callback configuration includes:
- `statusCallbackUri` — the RP's webhook endpoint URL
- `statusCallbackApiKey` — an API key the verifier includes as an `Authorization` header, enabling the RP to authenticate incoming callbacks

> **Security note**: The callback endpoint must validate the API key (or use mutual TLS) to prevent spoofed verification results. The endpoint should also verify that the session ID in the callback matches a session the RP actually created. For the full callback architecture — including how this pattern differs in direct vs. intermediary models, what payload fields are required, and risk signal forwarding — see §20.6.

> **Session lifecycle → callback triggers**: The L2 callback fires on specific session state transitions (§20.5.1): `Pending → Fulfilled` triggers a success callback; `Pending → Failed` triggers a failure callback; `Pending → Expired` triggers an expiry callback (if the vendor supports it). The RP's callback handler should use the `status` field to dispatch to the appropriate processing logic — success callbacks proceed to attribute extraction and policy evaluation, while failure/expiry callbacks trigger user-facing error flows. See §20.6.4 for the full callback payload specification and §20.6.6 for retry semantics.

##### 20.5.3 Concurrent Session Management

Production RPs must handle thousands of concurrent verification sessions. Key design considerations:

1. **Session isolation** — each session has independent state, nonce, ephemeral key, and policy configuration. Sessions must not leak state between users.
2. **Session storage** — use a distributed cache (Redis, Memcached) for session state rather than in-memory storage, to support horizontal scaling.
3. **Timeout enforcement** — implement server-side session expiry regardless of the client connection state. Abandoned sessions (user closes browser) must not accumulate indefinitely.
4. **Idempotent result processing** — the `direct_post` response from the Wallet may arrive multiple times (network retries). The RP must process verification results idempotently.

> **Cross-references**: §7 (same-device flow — session in `state` parameter), §8 (cross-device flow — session in QR code), §25.3.1 (verification result object structure showing per-session policy breakdown).

#### 20.6 Callback Integration Architecture

EUDI Wallet verification involves multiple asynchronous handoffs between components. Three distinct **integration models** exist for RP verification, each with different callback requirements. Understanding which model an RP operates under determines which callback layers are relevant.

##### 20.6.1 Integration Models and Callback Layers

###### Integration Model Overview

The **legal** distinction between models depends on **whose WRPAC signs the JAR** — not on where the verifier software runs:

| Model | WRPAC Owner | `response_uri` Host | Who verifies the credential | RP sees raw VP Token? |
|:------|:------------|:-------------------|:---------------------------|:---------------------:|
| **A. Direct RP (self-hosted verifier)** | RP | RP's own backend | RP | ✅ Yes |
| **B. Direct RP (SaaS verifier)** | RP (private key hosted/delegated to SaaS) | SaaS verifier | SaaS verifier (on RP's behalf) | ❌ No |
| **C. Intermediary** | Intermediary (own WRPAC) | Intermediary | Intermediary | ❌ No |
| **D. Direct RP (DC API)** | RP | N/A — no `response_uri` | RP (via browser platform API) | ✅ Yes |

> **Model A** — the RP deploys its own verifier (e.g., self-hosted walt.id, Procivis on-prem, or a custom implementation). The RP's backend *is* the verifier — the Wallet's `direct_post` arrives directly at the RP's `response_uri` endpoint. This is **not** a reverse proxy — it is simply a backend endpoint on the RP's server. No L2 callback is needed because the RP already has the VP Token.
>
> **Model B** — the RP delegates protocol execution to a cloud-hosted verifier API (e.g., walt.id Cloud, Paradym SaaS) but remains the **legal RP**. The SaaS verifier signs the JAR with the RP's WRPAC (the RP's private key is either hosted in the SaaS provider's HSM or accessed remotely). The Wallet sees the RP's identity, not the SaaS provider's. The SaaS verifier is a **technical service provider**, not a legal intermediary — it has no WRPAC of its own. L2 callbacks are required to deliver verification results back to the RP.
>
> **Model B key custody obligation**: If the SaaS provider hosts the RP's WRPAC private key in its own HSM, this constitutes outsourcing of a critical cryptographic function. Under ETSI TS 119 475, the WRPAC private key must be stored in a secure cryptographic device (QSCD or equivalent). Under DORA Art. 28 (for financial-sector RPs), outsourcing critical ICT functions to the SaaS provider triggers third-party risk management obligations — the RP must contractually ensure appropriate key protection, audit rights, and incident notification. RPs that require full key sovereignty should prefer an RP-controlled remote HSM model (the SaaS verifier signs via an HSM API call to the RP's infrastructure) over a SaaS-hosted key model.
>
> **Model C** — the intermediary is a **separate legal entity** with its own WRPAC (Art. 5b(10)). The Wallet's consent screen shows both the intermediary's and the end-RP's identity. The intermediary verifies the credential and forwards verified attributes to the end-RP via L2 callback. The end-RP cannot independently verify the original credential. See §17 for the full intermediary architecture.
>
> **Model D** — the RP uses the W3C Digital Credentials API (DC API) with response mode `dc_api.jwt` (HAIP 1.0 §5.2). The VP Token flows through the **browser platform API** — there is no `response_uri`, no HTTP POST to a verifier backend, and no L2 callback. The browser acts as the secure conduit between the Wallet and the RP's origin. The RP receives the VP Token directly in the browser context via `navigator.credentials.get()` and validates it server-side. This model eliminates the entire callback architecture — L1, L2, and L3 are all inapplicable. Model D is the preferred model for same-device browser-based flows because it provides phishing resistance via origin validation and avoids the `response_uri` domain binding question entirely.

###### Callback Layer Applicability

| Layer | Name | Model A (self-hosted) | Model B (SaaS) | Model C (Intermediary) | Model D (DC API) |
|:------|:-----|:---------------------:|:--------------:|:----------------------:|:----------------:|
| **L1** | Protocol callback (`direct_post`) | ✅ RP receives directly | ✅ SaaS receives | ✅ Intermediary receives | ❌ N/A — VP Token flows via browser API |
| **L2** | Operational callback (result delivery) | ❌ Not needed (L1 = L2) | ✅ SaaS → RP backend | ✅ Intermediary → end-RP | ❌ N/A — RP has VP Token directly |
| **L3** | Business-logic callback (policy webhook) | ✅ RP configures policies | ✅ RP configures via SaaS API | ✅ Intermediary configures | ❌ N/A — RP evaluates policies locally |

> **Key distinction**: L1 is defined by the OpenID4VP specification — the Wallet always POSTs to `response_uri` via `direct_post`. L2 and L3 are vendor API patterns that exist *above* the protocol layer. L2 notifies the RP that a verification session completed; L3 delegates a verification decision to an external service. In Model A, L1 and L2 collapse — the RP receives the `direct_post` directly — and L2 is unnecessary. Models B and C both require L2 callbacks, but with different trust models and payload requirements (§20.6.4).

###### `response_uri` Domain Binding and Model B Validity

A critical question for Model B is: **can the SaaS verifier host `response_uri` on its own domain** (e.g., `https://saas-verifier.example.com/response`) while the WRPAC identifies the RP's domain (e.g., `rp.example.com`)? The answer depends on the Client Identifier Prefix in use:

**`x509_hash` (HAIP 1.0 / eIDAS)** — the `client_id` is a base64url-encoded SHA-256 hash of the DER-encoded leaf certificate (OpenID4VP §5.9.3). There is **no FQDN matching rule** — the spec does not require `response_uri` to be on the same domain as any value in the certificate. HAIP 1.0 §5 (line 270) explicitly notes that ecosystem-specific certificate profiles *MAY* add such a requirement, but neither HAIP itself nor the ARF (RPA_02) mandates it. **Model B is therefore architecturally valid in the eIDAS ecosystem** — the SaaS verifier can host `response_uri` on its own domain.

**`x509_san_dns` (non-HAIP ecosystems)** — the `client_id` is a DNS name matching a SAN entry in the leaf certificate. OpenID4VP §5.9.2 states:

> *If the Wallet can establish trust in the Client Identifier authenticated through the certificate, e.g. because the Client Identifier is contained in a list of trusted Client Identifiers, it may allow the client to freely choose the `redirect_uri` value. If not, the FQDN of the `redirect_uri` value MUST match the Client Identifier.*

Since `response_uri` follows the same rules as `redirect_uri` (OpenID4VP §8.2: "*The `response_uri` value MUST be a value that the client would be permitted to use as `redirect_uri`*"), the FQDN of `response_uri` **MUST** match the RP's DNS name — unless the Wallet trusts the RP via a trusted list. In `x509_san_dns` ecosystems, Model B requires one of the following workarounds:

- **CNAME delegation**: The RP creates a subdomain (e.g., `verify.rp.example.com`) that CNAMEs to the SaaS provider's infrastructure, satisfying the FQDN match.
- **Trusted list bypass**: If the RP's `client_id` is registered in the Wallet's trusted list, the Wallet may allow any `response_uri` domain.
- **Reverse proxy**: The RP proxies `response_uri` traffic from its own domain to the SaaS backend (this effectively makes the RP's domain host the `response_uri`).

> **Summary**: In the eIDAS ecosystem (`x509_hash`), Model B works natively — no DNS trickery needed. In `x509_san_dns` ecosystems, the RP must either delegate a subdomain, use a reverse proxy, or rely on trusted list registration.

##### 20.6.2 Direct SaaS Integration Pattern (Two-Phase Architecture)

When an RP uses a SaaS verifier (e.g., walt.id Cloud, Procivis SaaS, Paradym), the RP delegates the entire OpenID4VP protocol to the verifier: the RP initiates a session via the verifier API, and the verifier notifies the RP when the Wallet responds. The RP never sees the raw OpenID4VP traffic — it interacts purely with the verifier's session API.

```mermaid
---
config:
  themeVariables:
    noteBkgColor: "transparent"
    noteBorderColor: "transparent"
  sequence:
    messageAlign: left
    noteAlign: left
    actorMargin: 100
---
sequenceDiagram
    participant U as User Browser
    participant RP as RP Backend
    participant V as SaaS Verifier
    participant W as Wallet Unit

    rect rgba(148, 163, 184, 0.14)
    Note over U,V: Phase 1 — Session Initiation
    U->>RP: 1. User clicks "Verify with EUDI Wallet"
    RP->>V: 2. POST /openid4vc/verify<br/>{ dcql_query, statusCallbackUri, statusCallbackApiKey }
    V-->>RP: 3. 200 { session_id, authorization_request_uri }
    RP-->>U: 4. Render QR code or redirect URI
    end

    rect rgba(52, 152, 219, 0.14)
    Note over U,W: Phase 2 — OpenID4VP Protocol (L1 direct_post)
    U->>W: 5. Scan QR / follow redirect
    W->>W: 6. User reviews and consents
    W->>V: 7. POST response_uri (vp_token, direct_post.jwt)
    V->>V: 8. Verify signature, revocation, holder binding
    V->>V: 9. Evaluate policy chain (L3 webhooks if configured)
    end

    rect rgba(46, 204, 113, 0.14)
    Note over V,RP: Phase 3 — Result Delivery (L2 Callback)
    V->>RP: 10. POST statusCallbackUri<br/>{ session_id, status, verification_result }
    Note right of RP: Authorization: Bearer statusCallbackApiKey
    RP->>RP: 11. Process result, update user session
    RP-->>U: 12. Redirect to authenticated page
    end
    Note right of W: ⠀
```

<details><summary><strong>1. User Browser initiates verification request to RP Backend</strong></summary>

The user clicks a "Verify with EUDI Wallet" button on the RP's website. This triggers an HTTP request to the RP's backend to start a new verification session.
</details>
<details><summary><strong>2. RP Backend creates verification session on SaaS Verifier</strong></summary>

The RP calls the SaaS verifier's API (`POST /openid4vc/verify`) with the DCQL query specifying which credentials are needed, plus a `statusCallbackUri` (the RP's webhook endpoint) and `statusCallbackApiKey` (for authenticating incoming callbacks). This is the key integration point — the RP delegates the entire OpenID4VP protocol to the SaaS verifier.

```json
{
  "request_credentials": [{
    "format": "dc+sd-jwt",
    "vct_values": ["eu.europa.ec.eudi.pid.1"],
    "claims": [
      { "path": ["family_name"] },
      { "path": ["given_name"] },
      { "path": ["birth_date"] }
    ]
  }],
  "statusCallbackUri": "https://rp.example.com/webhook/verification",
  "statusCallbackApiKey": "sk_live_abc123..."
}
```
</details>
<details><summary><strong>3. SaaS Verifier returns session ID and authorization request URI to RP Backend</strong></summary>

The verifier creates the OpenID4VP session internally — generating the JAR, nonce, ephemeral keys, and `response_uri` — and returns the `session_id` (for tracking) and an `authorization_request_uri` containing the signed request object. The RP never constructs the JAR itself.
</details>
<details><summary><strong>4. RP Backend renders authorization request to User Browser</strong></summary>

For cross-device flows, the RP renders the `authorization_request_uri` as a QR code. For same-device flows, it redirects the browser to the Wallet via the W3C Digital Credentials API (§7).
</details>
<details><summary><strong>5. User Browser delivers authorization request to Wallet Unit</strong></summary>

The user scans the QR code with their Wallet app (cross-device) or the browser invokes the Wallet via the Digital Credentials API (same-device). The Wallet parses the JAR and identifies the requested credentials.
</details>
<details><summary><strong>6. Wallet Unit displays consent screen to User</strong></summary>

The Wallet displays the RP's identity (from the WRPAC), the requested attributes, and the purpose. The user reviews and approves the disclosure. This is the standard consent flow described in §7.3/§8.2.
</details>
<details><summary><strong>7. Wallet Unit submits VP Token to SaaS Verifier via `direct_post`</strong></summary>

The Wallet POSTs the `vp_token` (wrapped in `direct_post.jwt`) to the `response_uri` hosted by the SaaS verifier. This is the L1 (protocol-layer) callback — it goes to the verifier, not the RP. The RP is completely out of this exchange.
</details>
<details><summary><strong>8. SaaS Verifier executes verification pipeline</strong></summary>

The verifier runs the full verification pipeline: cryptographic signature verification (§10), expiry/not-before checks, revocation status via TokenStatusList (Annex B), and holder binding (`cnf.jwk` confirmation). Static and parameterized policy tiers (§20.1.1) are evaluated.
</details>
<details><summary><strong>9. SaaS Verifier evaluates dynamic policy chain</strong></summary>

If the RP has configured dynamic policies, the verifier evaluates them — including L3 webhook delegations to external services (§20.2) such as AML screening endpoints. The policy chain result is aggregated with the static verification result.
</details>
<details><summary><strong>10. SaaS Verifier delivers result to RP Backend via L2 callback</strong></summary>

The verifier POSTs the verification result to the RP's `statusCallbackUri`. The `statusCallbackApiKey` is included as a `Bearer` token in the `Authorization` header. The payload contains the `session_id`, verification status, per-policy result breakdown, and disclosed attributes. This is the L2 (operational) callback — it bridges the gap between the SaaS verifier and the RP's application layer.
</details>
<details><summary><strong>11. RP Backend processes verification result</strong></summary>

The RP validates the callback (API key check, session ID match), extracts the disclosed attributes, and applies business logic (e.g., CDD onboarding, age gate, SCA). The verification outcome is stored in the RP's user session.
</details>
<details><summary><strong>12. RP Backend redirects User Browser to authenticated page</strong></summary>

The RP updates the browser session (via polling, Server-Sent Events, or WebSocket push) and redirects the user to the authenticated area.
</details>

&nbsp;

> **Why not a reverse proxy?** The SaaS verifier is *not* a reverse proxy sitting in front of the RP. The RP's users access the RP directly — the verifier is a standalone API service that the RP calls. The Wallet never communicates with the RP directly either; it only communicates with the verifier via `response_uri`. This decoupled architecture means the RP can use any SaaS verifier without modifying its network topology.

##### 20.6.3 Intermediary Integration Pattern (Three-Phase Architecture)

When an RP uses an eIDAS intermediary (Art. 5b(10)), the intermediary acts as the Relying Party towards the Wallet and forwards verified attributes to the end-RP. The intermediary pattern is architecturally similar to the direct SaaS pattern but with stricter regulatory constraints (§17.3) and a different trust model — the end-RP trusts the *intermediary's verification*, not the original credential.

```mermaid
---
config:
  themeVariables:
    noteBkgColor: "transparent"
    noteBorderColor: "transparent"
  sequence:
    messageAlign: left
    noteAlign: left
    actorMargin: 80
---
sequenceDiagram
    participant U as User Browser
    participant RP as End-RP Backend
    participant I as Intermediary
    participant W as Wallet Unit

    rect rgba(148, 163, 184, 0.14)
    Note over U,I: Phase 1 — Session Initiation
    U->>RP: 1. User clicks "Verify Identity"
    RP->>I: 2. POST /verify { rp_id, dcql_query, callbackUri }
    I-->>RP: 3. 200 { session_id, redirect_uri }
    RP-->>U: 4. Redirect to intermediary flow
    end

    rect rgba(52, 152, 219, 0.14)
    Note over U,W: Phase 2 — OpenID4VP Protocol (L1 direct_post)
    U->>W: 5. Wallet receives authorization request
    Note over W: Consent screen shows<br/>both Intermediary and End-RP identities
    W->>W: 6. User reviews and consents
    W->>I: 7. POST response_uri (vp_token)
    I->>I: 8. Full verification pipeline (AS-RP-51-012)
    end

    rect rgba(46, 204, 113, 0.14)
    Note over I,RP: Phase 3 — Attribute Forwarding (L2 Callback)
    I->>RP: 9. POST callbackUri (signed JWT)
    Note right of RP: Contains: verification_status,<br/>disclosed_attributes, risk_signals
    Note right of I: Intermediary deletes<br/>attribute values (Art. 5b(10))
    RP->>RP: 10. Verify intermediary JWT signature
    RP->>RP: 11. Process attributes, apply business rules
    RP-->>U: 12. Redirect to authenticated page
    end
    Note right of W: ⠀
```

<details><summary><strong>1. User Browser initiates verification request to End-RP Backend</strong></summary>

The user clicks a "Verify Identity" button on the end-RP's website. From the user's perspective, this is identical to the direct SaaS model — the user is unaware that an intermediary is involved until the consent screen.
</details>
<details><summary><strong>2. End-RP Backend creates verification session on Intermediary</strong></summary>

The RP calls the intermediary's session creation endpoint with its `rp_id` (so the intermediary knows which end-RP to attribute the request to), the DCQL query specifying required credentials, and a `callbackUri` where the intermediary should deliver the verified attributes.
</details>
<details><summary><strong>3. Intermediary returns session ID and redirect URI to End-RP Backend</strong></summary>

The intermediary generates the OpenID4VP authorization request using its own WRPAC (not the end-RP's). The `rp_info` extension in the JAR identifies the end-RP to the Wallet. The intermediary returns a `session_id` and a `redirect_uri` for the user.
</details>
<details><summary><strong>4. End-RP Backend redirects User Browser to intermediary flow</strong></summary>

The RP redirects the user's browser to the intermediary's authorization endpoint or renders the intermediary-provided QR code for the cross-device flow.
</details>
<details><summary><strong>5. User Browser delivers authorization request to Wallet Unit</strong></summary>

The user's Wallet receives the authorization request — either via QR code scan (cross-device) or Digital Credentials API redirect (same-device).
</details>
<details><summary><strong>6. Wallet Unit displays consent screen showing both Intermediary and End-RP identities</strong></summary>

The Wallet displays a consent screen that identifies **both** the intermediary (as the technical Relying Party) and the end-RP (as the entity requesting the data). This dual-identity display is mandated by the transparency requirement in Art. 5b(10) and §17.3. The user reviews the requested attributes and approves the presentation.
</details>
<details><summary><strong>7. Wallet Unit submits VP Token to Intermediary via `direct_post`</strong></summary>

The Wallet POSTs the `vp_token` to the intermediary's `response_uri`. This is the L1 (protocol-layer) callback. The intermediary — not the end-RP — receives the raw credential data. The end-RP never sees the original VP Token.
</details>
<details><summary><strong>8. Intermediary executes full verification pipeline (AS-RP-51-012)</strong></summary>

The intermediary verifies the credential across all five ARF verification dimensions (§17.4.2): authenticity (issuer signature + LoTE chain), revocation status (TokenStatusList), device binding (WSCD proof), user binding (User authentication proof), and Wallet Unit authenticity (WUA verification). If any agreed verification fails, the intermediary `SHALL NOT` forward any data to the end-RP (AS-RP-51-011).
</details>
<details><summary><strong>9. Intermediary forwards verified attributes to End-RP Backend via L2 callback</strong></summary>

The intermediary POSTs a signed JWT to the end-RP's `callbackUri`. The payload contains the verification status, disclosed attributes, presentation metadata, risk signals (§20.6.5), and which of the 5 verification dimensions passed. The intermediary then **deletes the attribute values** from its systems to comply with the Art. 5b(10) no-storage mandate. Only metadata (timestamps, attribute names, request IDs) may be retained for audit purposes.
</details>
<details><summary><strong>10. End-RP Backend verifies intermediary JWT signature</strong></summary>

The RP validates the intermediary's JWS signature using the intermediary's public key (obtained during service onboarding). This is the end-RP's only cryptographic verification — it trusts the intermediary's verification of the original credential. The RP cannot independently verify the Wallet's VP Token.
</details>
<details><summary><strong>11. End-RP Backend processes attributes and applies business rules</strong></summary>

The RP extracts the disclosed attributes from the verified JWT payload and applies its own business logic — CDD onboarding (§19), SCA authentication (§13), age verification, or identity matching. The RP treats the intermediary's signed assertion as the authoritative source.
</details>
<details><summary><strong>12. End-RP Backend redirects User Browser to authenticated page</strong></summary>

The RP completes the user's session and redirects to the authenticated area, identically to the direct SaaS model.
</details>

##### 20.6.4 Callback Payload Requirements

The L2 callback (operational result delivery) must include sufficient metadata for the RP to make an informed trust decision. The payload requirements differ between direct SaaS and intermediary models:

| Field | Direct SaaS | Intermediary | Purpose |
|:------|:----------:|:------------:|:--------|
| `session_id` | ✅ | ✅ | Correlate callback to the RP's user session |
| `status` (success/failed/expired) | ✅ | ✅ | Overall verification outcome |
| `verification_result` object | ✅ | ✅ | Per-credential, per-policy pass/fail breakdown (§25.3.1) |
| `disclosed_attributes` | ✅ | ✅ | The actual attribute values (family_name, birth_date, etc.) |
| `credential_format` | ✅ | ✅ | `dc+sd-jwt` or `mso_mdoc` |
| `credential_type` (`vct` / `doctype`) | ✅ | ✅ | Which credential was presented |
| `presentation_timestamp` | ✅ | ✅ | ISO 8601 timestamp of when the Wallet submitted the VP Token |
| `dcql_query_matched` | 🟡 Optional | ✅ | Which DCQL query was fulfilled (important when multiple credential types are acceptable) |
| `intermediary_id` | N/A | ✅ | URI identifying the intermediary |
| `intermediary_signature` (JWS) | N/A | ✅ | Cryptographic proof that the intermediary performed the verification |
| `verification_dimensions` | N/A | ✅ | Which of the 5 ARF verification dimensions passed (§17.4.2) |
| `risk_signals` | 🟡 Optional | ✅ Recommended | Client IP, User-Agent, device fingerprint, timing metadata (§20.6.5) |

> **Hook-and-Fetch variant**: Some vendors (e.g., Procivis) use a "thin callback" model where the L2 callback contains only the `session_id` and `status`, and the RP must call `GET /session/{session_id}` to fetch the full result. This reduces callback payload size and avoids transmitting sensitive attributes over the webhook channel. RPs should support both patterns — full-payload callbacks and thin-callback-then-fetch.

###### L2 Delivery Mechanisms

The L2 result delivery is not always a webhook push. Three mechanisms exist, each with different architectural tradeoffs:

| Mechanism | How it works | Latency | Complexity | Best for |
|:----------|:------------|:-------:|:----------:|:---------|
| **Webhook push** | Verifier POSTs to RP's `statusCallbackUri` when session transitions | ~100ms | Medium — RP must expose an authenticated endpoint | Production event-driven architectures |
| **Server-Sent Events (SSE)** | RP holds a persistent HTTP connection; verifier pushes status updates as SSE events | ~100ms | Low — no RP endpoint needed; browser-native | Same-device browser flows; real-time UX |
| **Polling** | RP periodically calls `GET /session/{id}` | 1–5s (polling interval) | Lowest — no webhook infrastructure | Development/testing; low-volume deployments |

> The OpenID4VP reference design (§13.3) uses a polling model: the Verifier's frontend polls the Response URI using a `transaction-id` to retrieve the VP Token (steps 8–9). This maps to L2 polling in Model A. For Models B and C, the SaaS verifier or intermediary typically offers all three mechanisms — the RP chooses based on its architecture. SSE is particularly useful for same-device flows where the RP's frontend needs real-time session status without exposing a server-side webhook endpoint.

###### Multi-Entity Callback Routing

When an RP operates **multiple legal entities** (e.g., subsidiaries in different Member States, each with its own WRPAC), the SaaS verifier must route L2 callbacks to the correct entity. This requires:

- **Tenant-scoped API keys**: Each legal entity has its own API key, and the `statusCallbackUri` is configured per-tenant. The SaaS verifier uses the API key from session creation to determine which callback endpoint to invoke.
- **`rp_entity_id` in callback payload**: The L2 callback should include a tenant identifier so the RP's backend can demultiplex callbacks arriving at a shared endpoint.
- **Logical isolation**: Under GDPR Art. 28 and the VCQ framework (VEND-CORE-042), verification sessions for different legal entities must be logically isolated — sessions from entity A must not be visible to entity B, even if they share the same SaaS verifier account.

##### 20.6.5 Risk Signal Forwarding

When a SaaS verifier or intermediary sits between the Wallet and the end-RP, the RP loses direct visibility into the Wallet's network context. For fraud detection, AML risk scoring, and DORA incident forensics, the L2 callback should include the following risk signals:

| Signal | Description | Use Case |
|:-------|:------------|:---------|
| **Client IP** | IP address of the device that initiated the OpenID4VP flow | Geolocation matching against expected MS; fraud ring detection |
| **User-Agent** | Browser or Wallet app identifier | Device fingerprinting; bot detection |
| **TLS fingerprint** | JA3/JA4 hash of the TLS handshake from the Wallet | Detecting credential-forwarding attacks (T12 in §24.2) |
| **Presentation timing** | Duration from session creation to VP Token submission | Unusually fast responses may indicate automated credential stuffing |
| **Device attestation** | Platform-level device integrity signal (e.g., Android SafetyNet, Apple App Attest) | Detecting emulated or rooted devices |
| **QR scan metadata** | Whether the QR code was scanned (cross-device) or the redirect was followed (same-device) | Distinguishing user-initiated flows from API-driven automation |

> **Intermediary obligation**: Under DORA Art. 28, financial-sector RPs must assess third-party ICT risk. If the intermediary does *not* forward risk signals, the RP has a blind spot in its fraud monitoring pipeline. RPs should contractually require risk signal forwarding as part of the intermediary service agreement.

> **Cross-references**: §20.2 (L3 policy webhook delegation), §20.5.2 (L2 `statusCallbackUri` session callbacks), §17.4 (intermediary attribute forwarding architecture), §24.2 (threat T12 — credential forwarding attacks), §25.2 (alert triggers for anomalous presentation timing).

##### 20.6.6 Callback Security and Error Handling

###### Authentication and Integrity

L2 webhook endpoints are attractive attack targets — an attacker who can forge a callback can inject fabricated verification results into the RP's backend. RPs must implement at least one of the following authentication mechanisms:

| Mechanism | How it works | Strength |
|:----------|:------------|:--------:|
| **API key in `Authorization` header** | Verifier includes a pre-shared secret as `Bearer <key>` | Basic — protects against unauthenticated requests; vulnerable to key leakage |
| **HMAC signature** | Verifier signs the request body with a shared secret; RP validates `X-Signature` header | Strong — ensures payload integrity; replay-resistant with timestamp validation |
| **Mutual TLS (mTLS)** | Both verifier and RP present client certificates | Strongest — cryptographic identity on both sides; eliminates key management |
| **IP allowlisting** | RP restricts webhook endpoint to verifier's known IP ranges | Supplementary — layer on top of API key or HMAC; not sufficient alone |

> **Recommendation**: Use HMAC signatures as the minimum baseline. Include a `timestamp` field in the signed payload and reject callbacks older than 5 minutes to prevent replay attacks. For financial-sector RPs subject to DORA, mTLS is recommended.

###### Error Handling and Retry Semantics

When the RP's webhook endpoint is unreachable (5xx, timeout, DNS failure), the verifier must handle retries gracefully:

- **Exponential backoff**: Verifiers should retry with increasing intervals (e.g., 1s, 5s, 30s, 2m, 10m) up to a maximum retry window (typically 1–24 hours depending on vendor).
- **Idempotency**: The RP's callback endpoint must process the same `session_id` + `status` combination idempotently. Duplicate callbacks (from retries) must not create duplicate verification records or trigger duplicate downstream actions.
- **Dead letter queue**: After exhausting retries, the verifier should store the undelivered callback in a dead letter queue. The RP should be able to query undelivered callbacks via a `GET /callbacks/undelivered` endpoint or equivalent administrative API.
- **Callback status visibility**: The verifier should expose callback delivery status (delivered, retrying, failed) via its session management API so the RP can detect and recover from delivery failures.

> **Polling fallback**: RPs that depend on webhook reliability should implement a complementary polling mechanism — a periodic `GET /sessions?status=fulfilled&since={timestamp}` sweep that catches any sessions whose webhook delivery failed. This eliminates the single-point-of-failure risk of webhook-only architectures.

---

### 21. Vendor Evaluation

The following vendors offer RP integration capabilities for the EUDI Wallet ecosystem as of March 2026. Capabilities are assessed against publicly available documentation — pilot participation alone is not sufficient for a “Verified” status. Source quality is indicated per vendor: 🟢 strong (developer docs/API refs), 🟡 moderate (product page/FAQ only), 🔴 weak (marketing claims only). Features marked "Roadmap" may have been released since this assessment (last verified: 2026-03-17).

| Vendor | Product | EUDI Wallet Support | Key Capabilities |
|:-------|:--------|:-------------------|:-----------------|
| **walt.id** | [walt.id Identity Infrastructure](https://walt.id) | 🟢 Verified — core contributor to EUDI reference implementation | Open-source verifier SDK; OpenID4VP 1.0, HAIP 1.0, DCQL, SD-JWT VC, mdoc; Kotlin/JVM |
| **Procivis** | [Procivis One](https://procivis.ch) | 🟢 Verified — Swiss EUDI Wallet pilot participant | Enterprise verifier platform; OpenID4VP, HAIP 1.0, DCQL, SD-JWT VC, mdoc; Rust; on-prem and SaaS |
| **Vidos** | [Vidos (Validated ID / Signaturit)](https://vidos.id) | 🟢 Verified — extensive DCQL documentation | Verifier platform; OpenID4VP, HAIP 1.0, DCQL, SD-JWT VC; TypeScript; SaaS |
| **Paradym** | [Paradym (Animo Solutions)](https://paradym.id) | 🟢 Verified — OWF DCQL reference implementation; EUDI prototype winner | Verifier platform + Credo framework; OpenID4VP, HAIP 1.0, DCQL, SD-JWT VC, mdoc; TypeScript |
| **Spruce ID** | [SpruceKit / DIDKit](https://spruceid.com) | 🟡 Moderate — IETF SD-JWT co-author; Rust libraries | Verifier libraries; SD-JWT VC, mdoc, OpenID4VP; Rust + WASM; embeddable |
| **MATTR** | [MATTR VII](https://mattr.global) | 🟡 Moderate — HAIP 1.0 contributor; DCQL not documented | Verifier API; OpenID4VP 1.0, HAIP 1.0, SD-JWT VC, mdoc; TypeScript; SaaS |
| **iGrant.io** | [iGrant.io Data Exchange](https://igrant.io) | 🟡 Moderate — OWF contributor; mdoc not documented | Open-source verifier; OpenID4VP 1.0, DCQL, SD-JWT VC; Go; SaaS |
| **Lissi** | [Lissi EUDI Wallet Connector](https://lissi.id) | 🟡 Moderate — FAQ-confirmed capabilities; no dev docs | Verifier connector; OpenID4VP, SD-JWT VC, mdoc; Java/Kotlin; SaaS + on-prem |
| **Indicio** | [Indicio Proven](https://indicio.tech) | 🟡 Moderate — SD-JWT + mDL documented | Verifier platform; OpenID4VC, SD-JWT VC, ISO 18013-5 mDL; Python; SaaS + on-prem |
| **Scytáles** | [Scytáles Mobile Validator SDK](https://scytales.com) | 🟡 Moderate — mdoc SDK documented at mdoc.id | Mobile verifier SDK; ISO 18013-5 (NFC, BLE, QR); Kotlin/Swift; embeddable |
| **Namirial** | [Namirial Wallet Gateway](https://namirial.com) | 🟡 Moderate — product page confirms formats; API not public | Wallet Gateway; OID4VCI, OID4VP, SD-JWT VC, mdoc; SaaS + on-prem |
| **Cleverbase** | [Cleverbase / Vidua](https://cleverbase.com) | 🟡 Moderate — QTSP; User Auth API documented; WE BUILD LSP lead | QTSP + verifier; User Auth API (LoA High); ARF-compatible; SaaS + API |
| **youniqx Identity** | [youniqx EUDI Services](https://youniqx.com) | 🟡 Moderate — EUDI Verifier Service; builds DE wallet infra | EUDI Wallet SDK + Verifier Service + Credential Service; SaaS + on-prem |
| **Signicat** | [Signicat Identity Platform](https://signicat.com) | 🔴 Weak — marketing pages only; no developer documentation | RP intermediary service; claims OpenID4VP, SD-JWT VC; SaaS and on-prem |
| **Gataca** | [Gataca Studio](https://gataca.io) | 🔴 Weak — product page claims; no dev docs or API refs found | Verifier platform; claims EUDI compliance; SaaS + on-prem |
| **Thales** | [Thales D1 Trusted Digital Identity](https://thalesgroup.com) | 🔴 Weak — no verifier product found; primarily HSM/infrastructure | Enterprise infrastructure; Luna HSM, Ubiqu RSE for key management (see §21.3) |

> **Vendor selection criteria for RPs**: When evaluating vendors, prioritise:
> 1. **HAIP 1.0 compliance** — mandatory for EUDI ecosystem
> 2. **Both format support** — SD-JWT VC AND mdoc
> 3. **DCQL support** — required by HAIP 1.0, replacing legacy presentation_definition
> 4. **Certificate management** — WRPAC lifecycle, trust anchor refresh
> 5. **Intermediary support** — if the RP plans to use an intermediary model
> 6. **SCA integration** — critical for PSPs and banks
> 7. **Conformance certification** — the OpenID Foundation launched self-certification for HAIP 1.0, OpenID4VP 1.0, and OID4VCI 1.0 on February 26, 2026; prefer vendors with verified conformance status
> 8. **Verification policy engine** — configurable policies (static, parameterized, dynamic) for auditable verification decisions (§20.1)
> 9. **Status list standard** — verify the SDK defaults to IETF TokenStatusList for EUDI credentials, not W3C-era alternatives (Annex B.3)
> 10. **Webhook/callback support** — server-to-server push notification and webhook delegation for AML/business-rule integration (§20.2)
> 11. **Verification result granularity** — per-credential, per-policy result objects for audit trail compliance (§25.3.1)
> 12. **EUDI Reference Wallet tested** — documented interoperability with the EU Reference Wallet or active LSP participation; see the unified capability matrix in §21.6


#### 21.1 Vendor Detail Profiles

| Vendor | Licensing | Language/Stack | Deployment |
|:-------|:---------|:---------------|:-----------|
| **walt.id** | Open-source (Apache 2.0) | Kotlin/JVM | Self-hosted, Docker, K8s |
| **Procivis** | Commercial (free tier) | Rust | SaaS + on-prem |
| **Vidos** | Commercial | TypeScript | SaaS |
| **Paradym** (Animo) | Free tier + Commercial (€25/mo) | TypeScript (Node.js + React Native) | SaaS + on-prem |
| **Spruce ID** | Open-source (Apache 2.0 + MIT) | Rust + WASM | Library (embed) |
| **MATTR** | Commercial (API-based) | TypeScript | SaaS |
| **iGrant.io** | Open-source (Apache 2.0) | Go | SaaS + self-hosted |
| **Lissi** (neosfer/Main Incubator) | Commercial | Java/Kotlin | SaaS + on-prem |
| **Indicio** | Commercial (license-based) | Python | SaaS, AWS AMI, on-prem |
| **Scytáles** | Commercial (OEM/SDK) | Kotlin/Swift (mobile) | SDK (embed), mobile app |
| **Namirial** | Commercial (enterprise) | Not disclosed | SaaS + cloud + on-prem |
| **Cleverbase** (Vidua) | Commercial (QTSP) | Not disclosed | SaaS + API |
| **youniqx Identity** | Commercial (enterprise) | Not disclosed | SaaS + on-prem |
| **Signicat** | Commercial (per-transaction) | Java/.NET | SaaS + on-prem |
| **Gataca** | Commercial (from €12/mo) | Not disclosed | SaaS + on-prem |
| **Thales** (+ Ubiqu) | Commercial (enterprise) | Java | On-prem + managed |

#### 21.2 Selection Decision Matrix

| RP Profile | Primary Selection Criteria | Recommended Vendors |
|:-----------|:--------------------------|:--------------------|
| **Bank/PSP** (direct integration) | SCA support, HAIP 1.0, both formats, certificate management, **policy engine**, **webhook delegation**, **policy-as-code**, **observability** | walt.id, Procivis, youniqx Identity |
| **Bank/PSP** (via intermediary) | Intermediary model, SCA passthrough, **result granularity** | Signicat, Lissi, Cleverbase |
| **Public sector** | Open-source preference, on-prem, both formats, **EUDI Wallet tested**, **composable architecture** | walt.id, Procivis, Paradym |
| **VLOP/telecom** | High throughput, SaaS, DCQL, **session management API**, **observability** | MATTR, Vidos, Paradym, Namirial |
| **Healthcare** | On-prem, mdoc for proximity, **`intent_to_retain`**, **result granularity** | walt.id, Procivis, Indicio |
| **Age verification** (retail) | mdoc proximity, low-cost terminal, **`intent_to_retain`**, **HAIP 1.0** | walt.id (open-source), Spruce ID (embed), Scytáles (mobile SDK) |
| **QTSP integration** | Trust service provider alignment, EUDI Wallet protocols | Cleverbase, Namirial, youniqx Identity |

#### 21.3 Ecosystem Vendor Landscape

Beyond the RP-facing verifier platforms listed in §21 and §21.1, the EUDI Wallet ecosystem includes infrastructure providers, QTSPs, and identity proofing services that RPs may interact with indirectly. This section maps the broader vendor landscape for ecosystem awareness.

##### Tier 3: Infrastructure Providers (PID, HSM, QTSP)

These vendors provide underlying infrastructure (PID issuance, HSMs, trust services) but are not RP-facing verifier platforms.

| Vendor | Country | Role | SD-JWT VC | mdoc | Notes |
|:-------|:--------|:-----|:----------|:-----|:------|
| **Bundesdruckerei / D-Trust** | 🇩🇪 DE | PID Provider | ✅ | ✅ | Issues PID in both formats; PID-Provider documentation publicly available |
| **Thales** (+ Ubiqu) | 🇫🇷 FR | HSM / RSE | ⚠️ | ⚠️ | Luna HSMs + Ubiqu RSE for WSCD key management; no RP-facing verifier product |
| **Cleverbase** (Vidua) | 🇳🇱 NL | QTSP / Issuer | 🟡 | 🟡 | Dutch eIDAS QTSP; WE BUILD LSP QTSP lead; User Auth API; also listed in §21.1 |
| **Digidentity** | 🇳🇱 NL | QTSP | ⚠️ | ⚠️ | Dutch eIDAS QTSP; EWC LSP partner; no verifier SDK documentation |
| **InfoCert** | 🇮🇹 IT | QTSP | ⚠️ | ⚠️ | Italian QTSP; SPID accredited manager; NOBID LSP participant |
| **Intesi Group** | 🇮🇹 IT | QTSP | ⚠️ | ⚠️ | Italian QTSP; NOBID LSP tech partner; digital signature SDK |
| **Ubisecure** | 🇫🇮 FI | CIAM | ⚠️ | ⚠️ | European IAM/CIAM; EWC LSP participant; LEI services via RapidLEI |
| **Verimi** | 🇩🇪 DE | Wallet SDK | 🟡 | 🟡 | EUDI Wallet SDK; government-certified; no public developer documentation |

##### Tier 4: Identity Proofing and Document Verification

These vendors provide identity verification for onboarding but rely on partners for VC verification.

| Vendor | Country | Role | Notes |
|:-------|:--------|:-----|:------|
| **IDnow** | 🇩🇪 DE | Identity Proofing | ETSI TS 119 461 certified; integrates with walt.id for VC verification; POTENTIAL LSP |
| **IDEMIA** | 🇫🇷 FR | Mobile ID Verify | Mobile ID Verify App + SDK for ISO 18013-5; MS Entra VC partnership; POTENTIAL LSP |
| **IN Groupe** | 🇫🇷 FR | Government ID | ID Verifier app for MRZ/NFC docs; eIDAS 2.0 participant; no SD-JWT/DCQL docs |
| **youniqx Identity** | 🇦🇹 AT | EUDI Infra Builder | Builds Germany's EUDI Wallet infrastructure; EUDI Verifier Service; also listed in §21.1 |

##### LSP Participation Cross-Reference

Which vendors participate in which EU Digital Identity Wallet Large-Scale Pilots:

| Vendor | POTENTIAL | EWC | NOBID | DC4EU | WE BUILD | APTITUDE |
|:-------|:---------|:----|:------|:------|:---------|:---------|
| **walt.id** | | ✅ | | | | |
| **Procivis** | | | | | ✅ | |
| **iGrant.io** | | ✅ | | | ✅ | |
| **Signicat** | | | ✅ | | ✅ | |
| **MATTR** | | | | | | |
| **Thales** | ✅ | | ✅ | | | |
| **Lissi** | | ✅ | | | | |
| **Vidos** (Validated ID) | ✅ | | | ✅ | | |
| **Paradym** (Animo) | | | | | | |
| **Cleverbase** | | | | | ✅ (QTSP lead) | |
| **youniqx Identity** | | | | | | ✅ |
| **Bundesdruckerei** | ✅ | | ✅ | | | |
| **Digidentity** | | ✅ | | | | |
| **IDnow** | ✅ | | | | | |
| **IDEMIA** | ✅ | | | | | |
| **IN Groupe** | ✅ | | | | | |
| **InfoCert** | | | ✅ | | | |
| **Intesi Group** | | | ✅ | | | |
| **Ubisecure** | | ✅ | | | | |
| **Namirial** | ✅ | | | | | |
| **Gataca** | | | | ✅ | | |
| **Indicio** | | | | | | |
| **Scytáles** | | | | | | |
| **Verimi** | | | | | | |

> **Note**: Vendors without LSP participation (Indicio, Spruce ID, Paradym, MATTR, Scytáles, Verimi) may still be ecosystem-relevant through open-source contributions (OpenWallet Foundation, IETF), standards authorship, or commercial deployments outside the EU pilot framework. Across all LSPs, approximately 550 organisations participate from 26 EU Member States plus Norway, Iceland, and Ukraine.



#### 21.4 HAIP Profile Configuration Checklist

When configuring a verification platform for EUDI ecosystem interoperability, the following parameters must be set correctly for HAIP 1.0 compliance. These are derived from the HAIP specification and from common deployment errors observed across EUDI integration pilots.

| Parameter | Required Value | Default (if different) | Notes |
|:----------|:--------------|:----------------------|:------|
| **Authorize URL scheme** | `haip://` or `haip-vp://authorize` | `openid4vp://authorize` | The HAIP profile uses a distinct URL scheme. Failure to change from the OpenID4VP default will cause Wallet rejection. |
| **Response mode** | `direct_post` | Varies | The only response mode supported under HAIP 1.0. Do not use `fragment` or `query`. |
| **Signed request** | `true` | `false` | HAIP mandates signed Authorization Requests. Requires a valid X.509 certificate chain in the request's `x5c` header. |
| **Client ID scheme** | `x509_san_dns` or `x509_san_uri` | DID-based | EUDI uses X.509 certificate-based client identification, not DIDs. The `client_id` must match the SAN in the leaf certificate. See §6.3.2 for `x509_hash` computation. |
| **Certificate chain (`x5c`)** | `[leaf, intermediate, root]` | — | **Order matters**. The array must be ordered leaf → intermediate → root. Incorrect ordering is a common cause of "Invalid Request" errors. |
| **DCQL format identifiers** | `mso_mdoc` (mdoc), `dc+sd-jwt` (SD-JWT VC) | — | Use the HAIP-mandated format strings, not legacy values. See §15.2. |
| **Flow type** | `cross_device` or `same_device` | — | Must be explicitly set. Cross-device requires QR code or deep link; same-device uses browser redirect. See §7 and §8. |
| **`intent_to_retain`** (mdoc) | `false` for all claims unless retention is required | — | Per-claim attribute for mdoc DCQL queries. See §15.2.1. |

> **Pre-deployment verification**: Before deploying a HAIP-compliant verifier to production, validate the configuration against the OpenID Foundation's HAIP 1.0 Conformance Test Suite. Self-certification was launched on February 26, 2026, and provides automated validation of all parameters listed above.

#### 21.5 Common Integration Errors

The following errors are commonly encountered during EUDI Wallet integration, compiled from deployment experience across multiple pilot programmes. This table is intended as a quick-reference troubleshooting guide.

| Error | Root Cause | Resolution |
|:------|:----------|:-----------|
| **"Untrusted Issuer"** | The issuer's root certificate is not present in the Wallet's trust store, or the certificate chain is incomplete (missing intermediate). | Ensure the full certificate chain is included in the credential and that the root CA is registered in the relevant Trusted List (§4.1). |
| **"Invalid Request"** during verification | The `x509_hash` in the `client_id` does not match the leaf certificate actually used to sign the request, or the `x5c` array is in the wrong order. | Recalculate the `x509_hash` from the leaf certificate (§6.3.2). Verify `x5c` ordering: `[leaf, intermediate, root]`. |
| **"Certificate Validation Failed"** | The verifier certificate has expired, or the certificate chain has a broken signing relationship (intermediate not signed by root). | Check certificate expiry dates. Regenerate the chain if signing relationships are broken. Ensure CT/SCT requirements are met (§4.2.4). |
| **Wallet cannot reach Verifier** | In development environments, the Verifier's `response_uri` is not publicly accessible (e.g., `localhost`). In production, DNS or firewall misconfiguration blocks the Wallet's `direct_post` callback. | Use tunnelling (ngrok, Cloudflare Tunnel) for local development. In production, ensure the `response_uri` domain is publicly resolvable and accepts POST requests. |
| **"Unsupported credential format"** | The DCQL query requests a format string the Wallet does not recognise (e.g., `vc+sd-jwt` instead of `dc+sd-jwt`). | Use HAIP-mandated format identifiers: `dc+sd-jwt` for SD-JWT VC, `mso_mdoc` for mdoc (§15.2). |
| **Silent verification failure** | The verification SDK defaults to a W3C-era status list standard (StatusList2021) instead of IETF TokenStatusList, causing a parsing mismatch. | Explicitly configure the SDK to use IETF TokenStatusList for EUDI credentials (Annex B.3). |
| **"Holder binding failed"** | The Key Binding JWT (`KB-JWT`) is malformed, or the `cnf.jwk` thumbprint in the SD-JWT VC does not match the key that signed the KB-JWT. | Verify KB-JWT construction per §10.1. Ensure the Wallet is using the correct device key for signing. |
| **Clock skew rejection** | The Verifier rejects a credential or KB-JWT because the system clocks of the Wallet and Verifier differ by more than the allowed skew window (typically 30–60 seconds). | Implement NTP synchronisation. Allow a configurable clock skew tolerance in the verification pipeline (§25.2 alert triggers). |

#### 21.6 Unified Vendor Capability Matrix

The following matrix consolidates all vendor evaluation criteria — both core protocol capabilities (HAIP, SD-JWT VC, mdoc, DCQL) and operational dimensions (policy engine, observability, architecture) — into a single scoring table. Vendors are listed as columns; criteria as rows. This is the primary reference for vendor comparison and RFI/RFP structuring.

**Scoring**: ✅ = fully documented/supported — 🟡 = partially supported or claimed — ❌ = not available — ❓ = not assessable from public documentation — ⚠️ = marketing claims only, no technical evidence — N/A = not applicable (library/SDK embed model; criterion applies to hosted services only)

| Criteria | walt.id | Procivis | Vidos | Paradym | Spruce | MATTR | iGrant | Lissi | Indicio | Scytáles | Namirial | Cleverbase | youniqx | Signicat | Gataca | Thales |
|:---------|:--------|:---------|:------|:--------|:-------|:------|:-------|:------|:--------|:---------|:---------|:-----------|:--------|:---------|:-------|:-------|
| **HAIP 1.0** | ✅ | ✅ | ✅ | ✅ | ❌ | 🟡 | 🟡 | ✅ | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | ⚠️ | ⚠️ | ⚠️ |
| **SD-JWT VC** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | ✅ | 🟡 | 🟡 | 🟡 | 🟡 | ⚠️ | ⚠️ | ⚠️ |
| **mdoc (ISO 18013-5)** | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ | 🟡 | ✅ | ✅ | 🟡 | 🟡 | 🟡 | ⚠️ | ⚠️ | ⚠️ |
| **DCQL** | ✅ | ✅ | ✅ | ✅ | ❌ | 🟡 | ✅ | 🟡 | 🟡 | 🟡 | 🟡 | ❓ | ❓ | ⚠️ | ⚠️ | ⚠️ |
| **SCA (TS 12)** | Roadmap | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ⚠️ | ❌ | ❌ | ⚠️ | ❌ | ⚠️ |
| **Intermediary model** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ⚠️ |
| **Policy engine** (§20.1) | ✅ | 🟡 | ✅ | 🟡 | N/A | 🟡 | 🟡 | 🟡 | 🟡 | N/A | 🟡 | ❓ | 🟡 | 🟡 | 🟡 | ❓ |
| **Status list default** (Annex B) | ✅ | 🟡 | 🟡 | 🟡 | N/A | 🟡 | 🟡 | 🟡 | 🟡 | N/A | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ |
| **Webhook delegation** (§20.2) | ✅ | 🟡 | 🟡 | 🟡 | N/A | ✅ | ✅ | 🟡 | 🟡 | N/A | ❌ | ❓ | ❓ | ✅ | 🟡 | ❓ |
| **Policy-as-code** (§20.3) | ✅ | ❌ | ❌ | ❌ | N/A | ❌ | ❌ | ❌ | ❌ | N/A | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Session management API** (§20.5) | ✅ | 🟡 | ✅ | 🟡 | N/A | ✅ | 🟡 | ✅ | 🟡 | N/A | 🟡 | ❓ | 🟡 | 🟡 | 🟡 | ❓ |
| **L2 delivery model** (§20.6.4) | ✅ | 🟡 | 🟡 | 🟡 | N/A | ✅ | 🟡 | 🟡 | ❓ | N/A | ❓ | ❓ | ❓ | 🟡 | ❓ | ❓ |
| **Callback security** (§20.6.6) | 🟡 | ❓ | ❓ | ❓ | N/A | 🟡 | ❓ | ❓ | ❓ | N/A | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ |
| **Key custody model** (§20.6.1) | ✅ | ✅ | ❓ | ❓ | N/A | ❓ | ❓ | ❓ | ❓ | N/A | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ |
| **Result granularity** (§25.3.1) | ✅ | 🟡 | ✅ | 🟡 | N/A | 🟡 | 🟡 | 🟡 | 🟡 | N/A | ❓ | ❓ | ❓ | 🟡 | 🟡 | ❓ |
| **EUDI Wallet tested** | ✅ | 🟡 | 🟡 | ❌ | ❌ | ❌ | 🟡 | 🟡 | 🟡 | ✅ | 🟡 | 🟡 | ✅ | ❌ | ❌ | 🟡 |
| **`intent_to_retain`** (§15.2.1) | ✅ | 🟡 | ❌ | 🟡 | 🟡 | 🟡 | ❌ | 🟡 | 🟡 | ✅ | ❓ | ❓ | 🟡 | ❓ | ❓ | ❓ |
| **Observability** (§25.1) | ✅ | ❌ | ✅ | ❌ | N/A | ✅ | 🟡 | ❌ | ❌ | N/A | ❌ | ❌ | ❌ | 🟡 | ❌ | ❌ |
| **Composable architecture** (§20.4) | 🟡 | 🟡 | ✅ | 🟡 | N/A | 🟡 | 🟡 | 🟡 | 🟡 | N/A | 🟡 | ❓ | 🟡 | 🟡 | 🟡 | ❓ |

> **Scoring guidance by RP profile**: Not all criteria carry equal weight. Prioritise dimensions based on your RP's regulatory context and integration model:
> - **Banks/PSPs**: Policy engine, webhook delegation, policy-as-code (DORA Art. 9), observability, SCA
> - **Public sector**: HAIP 1.0, EUDI Wallet tested, composable architecture, intermediary model
> - **Healthcare**: mdoc, `intent_to_retain`, result granularity, observability
> - **Age verification / retail**: mdoc, `intent_to_retain`, HAIP 1.0, result granularity
>
> **Vendors scored ❓**: Query via structured RFI/RFP. Each row label in this matrix maps directly to an RFI question item. The scoring definitions and evaluation methodology for each criterion are documented in §20.1 (policy patterns) and §25.3.1 (result structure).
>
> **Multi-RP platform isolation — additional evaluation dimension**: RPs selecting a SaaS connector or intermediary that serves multiple legal entities should assess the vendor's tenant isolation guarantees. eIDAS Art. 5a(16a) mandates cross-RP unlinkability, and Art. 5b(10) imposes a no-storage mandate on intermediaries — but these are legal requirements on the intermediary, not architectural guarantees. In practice, RPs should ask: (a) are sessions, transaction logs, and compliance evidence isolated per RP entity? (b) does the platform maintain separate RPAC/RPRC key material per entity in isolated key containers? (c) can one RP's administrative actions, database queries, or log searches inadvertently access another entity's data? (d) can each RP independently export its own audit trail for regulatory compliance without gaining visibility into other entities' data? These questions are particularly important for corporate groups where multiple subsidiaries, each a separate legal entity with its own RP registration, share a single platform instance. The isolation model should align with the GDPR controller boundaries — each RP entity is typically an independent data controller (Art. 4(7) GDPR), and the platform's data processing boundaries must match.

---

### 22. Ecosystem Readiness and Testing

#### 22.1 W3C DC API Browser Support Matrix

As of Q4 2025, the W3C Digital Credentials API has shipped in production browsers:

| Browser | Version | Release Date | DC API Support | Protocols | Notes |
|:--------|:--------|:-------------|:---------------|:----------|:------|
| **Chrome** | 141 | Sep 30, 2025 | ✅ Shipped | OpenID4VP, ISO 18013-7 Annex C | Same-device + cross-device via QR handoff |
| **Safari** | 26 | Sep 15, 2025 | ✅ Shipped | ISO 18013-7 Annex C | macOS, iOS, iPadOS; cross-device via iPhone |
| **Edge** | 141 | Oct 2025 | ✅ Shipped | OpenID4VP, ISO 18013-7 Annex C | Inherits Chrome/Chromium capabilities |
| **Firefox** | — | — | ❌ Negative position | — | Mozilla cites privacy risks and interoperability concerns |

> **RP planning impact**: Same-device remote flows (§7) are fully supported on Chrome, Safari, and Edge. RPs should implement **cross-device flows (§8) as a mandatory fallback** to support Firefox users and older browser versions. The cross-device flow does not depend on the DC API — it uses QR codes and `request_uri`.

> **Safari protocol limitation**: Safari 26's DC API implementation supports **only** the `org-iso-mdoc` protocol (ISO 18013-7 Annex C). It does **not** support the `openid4vp` protocol used for SD-JWT VC presentation. This means same-device SD-JWT VC flows will not work on Safari — the Wallet must use mdoc format, or the RP must fall back to the cross-device flow. RPs whose primary credential format is SD-JWT VC should be especially aware of this limitation when designing their front-end integration.

#### 22.2 Wallet Provider Implementations

RPs should be aware of the Wallet Solutions that users will have available. Known implementations as of early 2026:

| Country/Entity | Wallet | Status | Notes |
|:---------------|:-------|:-------|:------|
| **EU Commission** | [EU Reference Wallet](https://github.com/eu-digital-identity-wallet) | Reference implementation | Open-source; architecture reference, not a production wallet |
| **Germany** | [AusweisApp](https://github.com/Governikus/AusweisApp) (successor) | Pilot | Extends existing eID infrastructure; open-source (EUPL); SDK wrappers for [Android](https://github.com/Governikus/AusweisApp2Wrapper-Android) and [iOS](https://github.com/Governikus/AusweisApp2Wrapper-iOS) |
| **France** | [France Identité](https://github.com/France-Identite) | Pilot | Linked to national identity card; [EUDIW Unfold](https://france-identite.gouv.fr/eudiw-unfold/) initiative for cross-EU collaboration |
| **Italy** | [IT-Wallet](https://github.com/italia/eudi-wallet-it-docs) | Launched (limited) | First MS to launch limited credential support; [technical specs](https://italia.github.io/eudi-wallet-it-docs/); integrated in [IO app](https://io.italia.it) |
| **Netherlands** | [NL Wallet](https://github.com/MinBZK/nl-wallet) | Pilot | Open-source (EUPL); Rust + Flutter; developed by MinBZK; integrated with DigiD |
| **Spain** | Spanish EUDI Wallet | Pilot | Linked to DNIe; coordinating DC4EU LSP; [Cartera Digital Beta](https://one.gob.es) |
| **Finland** | Finnish EUDI Wallet | Pilot | Part of DVV ecosystem; [DVV pilot workspace](https://dvv.fi/en/digital-identity); no public GitHub repo yet |
| **Croatia** | Croatian EUDI Wallet | Pilot | [Identyum](https://identyum.com) as ID Wallet provider in EWC LSP |

> **Availability caveat**: Most Member State Wallet implementations are in pilot stage as of March 2026. Full production availability is expected to ramp up through 2027, aligned with the December 2027 mandatory acceptance deadline for designated RPs.

#### 22.3 Wallet Interoperability Testing

RPs should not assume that all Wallet implementations behave identically. Testing against multiple Wallet Solutions is essential for production readiness:

**Available test infrastructure:**

| Resource | Description | Access |
|:---------|:------------|:-------|
| **[EU Reference Wallet](https://github.com/eu-digital-identity-wallet)** | Open-source reference implementation; Android + iOS apps, verifier libraries, issuer components | Public — clone and run locally |
| **[EUDI Wallet Launchpad](https://ec.europa.eu/digital-building-blocks/sites/display/EUDIGITALIDENTITYWALLET/EUDI+Wallets+Launchpad)** | EC-organised multi-day interoperability testing events; 570+ tests in Dec 2025 inaugural event | By invitation; open to registered implementers |
| **[POTENTIAL LSP](https://potential-eudigitalidentity.eu)** | Banking, government, telecom, mDL, e-signatures, health; 19 MS + Ukraine; coordinated by FR/DE | Pilot participants; project concluded Feb 2026 |
| **[EWC LSP](https://eudiwalletconsortium.org)** | Digital Travel Credentials, travel commerce; 18 MS + Ukraine; coordinated by SE/FI | Pilot participants |
| **[DC4EU LSP](https://www.dc4eu.eu)** | Education credentials, social security; 23 MS + Ukraine; coordinated by ES | Pilot participants |
| **[NOBID LSP](https://nobidconsortium.com)** | Nordic-Baltic payments pilot; DK, DE, IS, IT, LV, NO | Pilot participants; project concluded 2025 |
| **[WE BUILD LSP](https://webuildconsortium.eu)** | Business/payment use cases, legal person ID, data sharing; 30 countries; ~200 partners | Pilot participants |
| **[APTITUDE LSP](https://aptitude.digital-identity-wallet.eu)** | Travel credentials, vehicle registration, payments; 11 MS + Ukraine; coordinated by FR | Pilot participants |

**Known interoperability considerations:**

| Area | Variation Between Implementations | RP Mitigation |
|:-----|:----------------------------------|:--------------|
| **DCQL support depth** | Some Wallets may not fully support `credential_sets` or value filtering | Test with the most complex DCQL query the RP needs; have simpler fallback queries |
| **JWE algorithm support** | Wallets may support different `enc` values (A128GCM vs. A256GCM) | Advertise multiple accepted algorithms in the JAR |
| **Consent UX** | Attribute presentation screens differ between Wallet UIs | Ensure DCQL claim descriptions are clear regardless of how they're rendered |
| **Error code consistency** | Not all Wallets return identical error codes for edge cases | Implement generic error handling alongside code-specific handling |
| **Response timing** | Biometric-first Wallets may respond faster than PIN-first Wallets | Use generous timeouts and avoid assuming a fixed response time |

> **Recommendation**: Maintain a continuous integration test pipeline that runs DCQL query suites against the EU Reference Wallet. Periodically test against Member State Wallet pilots when access is available during Launchpad events.

#### 22.4 Attestation Scheme Discovery (TS11)

TS11 defines interfaces for the **Catalogue of Attributes and Schemes**, enabling RPs to dynamically discover which attestation types exist in the ecosystem and what attributes they contain.

**Use cases for RPs:**

1. **Build-time discovery**: During RP development, query the catalogue to determine available VCT values and their attribute schemas, enabling correct DCQL query construction
2. **Run-time validation**: Verify that an attestation's `vct` is a recognised scheme registered in the catalogue
3. **Cross-MS compatibility**: Discover equivalent attestation schemes across Member States (e.g., the German driving licence attestation vs. the French permis de conduire attestation)
4. **Attribute metadata**: Retrieve human-readable names and descriptions for attributes (useful for RP UIs that display received attestation data)

> **Current status**: TS11 is still in draft form. RPs should design their attestation handling to be **schema-driven** — loading VCT-to-attribute mappings from configuration — so that TS11 integration can be adopted without architectural changes when the specification is finalised.

### 23. Cross-Border Presentation Scenarios

#### 23.1 Overview

The EUDI Wallet is designed for cross-border interoperability — a PID issued by France must be verifiable by a German bank. This cross-border capability relies on the trust infrastructure described in §4, with specific considerations for RPs operating across Member State boundaries.

#### 23.2 LoTE Discovery Across Member States

When an RP receives a PID from a foreign Member State, it must validate the issuer's certificate chain against a trust anchor it may not yet have cached. The discovery process:

1. **Extract Issuer from PID** — the `iss` claim (SD-JWT VC) or MSO signing certificate (mdoc) identifies the PID Provider
2. **Determine MS** — the `issuing_country` attribute or certificate `countryCode` identifies the issuing MS
3. **Fetch LoTE** — the RP queries the EU Trusted List Browser or its cached LoTE data for the issuing MS
4. **Validate chain** — verify the PID Provider's signing certificate up to the MS trust anchor found in the LoTE
5. **Cache** — store the foreign MS trust anchor for future verifications (with appropriate TTL aligned to LoTE update frequency)

> **RP implementation note**: RPs expecting cross-border traffic should pre-cache LoTE data for all 27 Member States plus EEA countries. The EU provides a centralised Trust List Browser API, but RPs should not depend on real-time API calls during presentation verification — pre-caching is strongly recommended for latency and availability.

#### 23.3 Language Handling in Consent Screens

When presenting to a User from a different MS, the RP's identity is displayed in the Wallet's consent screen. The RP's registration data (WRPRC or Registrar API) includes multi-language name arrays:

```json
{
  "name": [
    {"lang": "de", "content": "Beispiel Bank AG"},
    {"lang": "en", "content": "Example Bank AG"},
    {"lang": "fr", "content": "Banque Exemple SA"}
  ]
}
```

The Wallet selects the name matching the User's preferred language. RPs operating cross-border should register names in at least their domestic language(s) plus English.

#### 23.4 Cross-Border Attribute Compatibility

Not all PID attributes are identically defined across Member States. Key differences:

| Attribute | Potential Cross-Border Issue | RP Mitigation |
|:----------|:-----------------------------|:--------------|
| `personal_identifier` | Format varies per MS (national ID schemes differ) | Treat as opaque string; do NOT parse or validate format |
| `resident_address` | Address formats vary (German: Straße, French: rue) | Use structured address fields (`resident_street`, `resident_city`, etc.) rather than a single `resident_address` |
| `nationality` | ISO 3166-1 alpha-2 is standard, but multi-nationality handling varies | Accept arrays of nationality codes |
| `gender` | ISO 5218 is standard (0=not known, 1=male, 2=female, 9=not applicable) | Do not assume binary values |
| `portrait` | Image format and quality may vary | Accept JPEG; implement quality checks if used for visual matching |

---

### 24. Security Threat Model for RPs

#### 24.1 Overview

This section presents a systematic security threat model for RPs integrating with the EUDI Wallet ecosystem. It focuses on RP-side threats — attacks targeting the RP's infrastructure, implementation, or operational practices.

#### 24.2 Threat Catalogue

| ID | Threat | Attack Vector | Impact | Mitigation |
|:---|:-------|:--------------|:-------|:-----------|
| **T1** | **Credential replay** | Attacker captures a valid `vp_token` and replays it to the same or different RP | Impersonation, unauthorised access | Nonce binding (unique per session); KB-JWT `aud` binding; short JAR `exp` (max 5 minutes) |
| **T2** | **WRPAC private key compromise** | Attacker obtains the RP's WRPAC private key (e.g., via server breach) | Attacker can impersonate the RP to any Wallet | HSM/secure enclave for WRPAC private key; certificate revocation; incident response plan |
| **T3** | **Relay attack (cross-device)** | Attacker relays QR code to a remote victim who unwittingly approves | Victim's attributes presented to attacker's session | Proximity verification (OS-level); session timeout; display RP identity prominently |
| **T4** | **Malicious RP endpoint** | Attacker deploys a look-alike RP with valid WRPAC for a different domain | Users tricked into presenting to wrong RP | Browser origin verification (same-device); User education; Wallet displays RP domain |
| **T5** | **Status List DoS** | Attacker disrupts the Status List endpoint, preventing revocation checks | RP cannot verify credential validity | Caching (see §9.5); fallback policies; multiple Status List endpoints |
| **T6** | **Ephemeral key interception** | Attacker intercepts the `response_encryption_jwk` (it's in the JAR, which is public) | None — the attacker cannot decrypt without the private key | Ephemeral private key never leaves RP server; ECDH-ES ensures only the RP can derive the decryption key |
| **T7** | **JAR modification** | Attacker modifies the JAR in transit (e.g., changing `dcql_query`) | Wallet requests different attributes; User may consent to wrong data | JWS signature over JAR; Wallet verifies signature before processing |
| **T8** | **Insider threat** | Compromised RP employee accesses decrypted PID data | Data breach; GDPR violation | Access controls; audit logging; data minimisation; encryption at rest |
| **T9** | **Verification SDK vulnerability** | Bug in the RP's verification library allows invalid credentials | Accepting forged or expired credentials | Regular SDK updates; integration testing; defence in depth |
| **T10** | **Session fixation** | Attacker pre-sets the `state` parameter to hijack the session after presentation | Attacker receives the User's authenticated session | RP-generated cryptographic `state`; bind to server-side session |
| **T11** | **RP-side attestation linkability (TR36)** | RP stores unique attestation elements (salts, hashes, signature values); uses them to correlate presentations across transactions | User tracking; profiling; GDPR violation | Anti-linkability practices (§9.10); do not persist unique elements; application-level session tokens |
| **T12** | **Cross-RP collusion (TR84)** | Multiple RPs share attestation elements to derive combined user profiles | Wholesale surveillance; de-anonymisation | Do not share raw attestation elements; organisational measures (access certificate revocation for offenders) |
| **T13** | **Identifier-based tracing (TR39)** | Attacker uses stable identifiers (e.g., status list index, `cnf.jwk` thumbprint) to trace user across services | Surveillance | Use application-level pseudonyms; do not expose raw attestation identifiers externally |
| **T14** | **Over-identification (TR85)** | RP requests PID when pseudonym would suffice; enables tracking where identification is unnecessary | Privacy violation; Art. 5b(9) non-compliance | Pseudonym support (§14); data minimisation; DCQL queries limited to necessary attributes |

#### 24.3 Risk Assessment Matrix

| Threat | Likelihood | Impact | Residual Risk (with mitigations) |
|:-------|:-----------|:-------|:---------------------------------|
| T1 (Replay) | Medium | High | 🟢 Low — nonce + `aud` binding are effective |
| T2 (Key compromise) | Low | Critical | 🟡 Medium — depends on HSM adoption |
| T3 (Relay) | Medium | High | 🟡 Medium — OS proximity checks help but aren't foolproof |
| T4 (Malicious RP) | Low | High | 🟢 Low — browser origin + WRPAC binding |
| T5 (Status List DoS) | Medium | Medium | 🟡 Medium — caching mitigates but introduces window |
| T6 (Ephemeral key) | Very Low | None | 🟢 Low — by design |
| T7 (JAR modification) | Very Low | High | 🟢 Low — JWS prevents |
| T8 (Insider) | Medium | Critical | 🟡 Medium — operational controls |
| T9 (SDK vuln) | Medium | High | 🟡 Medium — depends on vendor |
| T10 (Session fixation) | Low | High | 🟢 Low — standard web security practice |
| T11 (Linkability) | High | High | 🟡 Medium — depends on RP discipline in not persisting unique elements |
| T12 (Collusion) | Low | Critical | 🟡 Medium — organisational measures only; no technical prevention |
| T13 (Tracing) | Medium | High | 🟡 Medium — mitigated by §9.10 anti-linkability practices |
| T14 (Over-ID) | Medium | Medium | 🟢 Low — if RP implements pseudonym support per §14 |

---

### 25. Monitoring, Observability, and Operational Readiness

#### 25.1 Key Metrics

Financial RPs integrating with the EUDI Wallet should monitor the following metrics:

| Metric | Description | Alert Threshold |
|:-------|:------------|:----------------|
| **Presentation success rate** | Ratio of successful verifications to total presentation requests | < 95% → investigate |
| **Verification latency (p95)** | Time from receiving encrypted response to verification complete | > 500ms → investigate |
| **Revocation check latency** | Time to fetch and evaluate Status List | > 2s → cache may be stale |
| **Status List cache hit rate** | Percentage of revocation checks served from cache | < 80% → increase cache TTL |
| **WRPAC expiry countdown** | Days until WRPAC certificate expires | < 30 days → trigger renewal |
| **LoTE freshness** | Time since last LoTE update was fetched | > 24h → force refresh |
| **Error rate by type** | Breakdown: `access_denied`, `invalid_request`, `expired_credential`, etc. | Spike in any category → investigate |
| **Cross-border presentation ratio** | Percentage of presentations from foreign MS PIDs | Unexpected spike → possible attack vector |

#### 25.2 Alert Triggers

| Event | Severity | Action |
|:------|:---------|:-------|
| WRPAC expires in < 14 days | 🔴 Critical | Initiate renewal immediately |
| Status List endpoint unreachable > 5 minutes | 🟡 Warning | Switch to cached status; notify on-call |
| LoTE trust anchor changed | ℹ️ Info | Verify new anchor; update cache |
| Sudden drop in presentation success rate | 🔴 Critical | Check WRPAC validity; check JAR construction |
| Presentation from unknown `vct` | 🟡 Warning | Log and review; may indicate new attestation type |
| Spike in `access_denied` errors | 🟡 Warning | User experience issue or over-requesting attributes |
| KB-JWT clock skew > 30 seconds | ℹ️ Info | Log; may indicate Wallet time sync issues |
| WRPAC lacks valid SCT | 🔴 Critical | Request re-issuance from Access CA; do not deploy certificate without SCT (§4.2.4) |
| Unauthorised WRPAC detected in CT log | 🔴 Critical | Immediately request revocation of rogue certificate; escalate to Trusted List operator (§4.2.4) |

#### 25.3 Audit Trail Requirements

GDPR Art. 30 and DORA Art. 28 require RPs to maintain records of processing. For EUDI Wallet integrations, the audit trail should capture:

| Field | Description | Retention |
|:------|:------------|:----------|
| `timestamp` | ISO 8601 timestamp of presentation | Per data retention policy |
| `session_id` | Internal correlation ID | Per data retention policy |
| `flow_type` | `same-device`, `cross-device`, `proximity-supervised`, `proximity-unsupervised` | Per data retention policy |
| `credential_type` | VCT or docType | Per data retention policy |
| `issuing_country` | MS that issued the credential | Per data retention policy |
| `attributes_requested` | List of claims in DCQL query | Per data retention policy |
| `attributes_received` | List of claims actually received (may differ if partial) | Per data retention policy |
| `verification_result` | `success`, `failed_signature`, `failed_revocation`, `user_denied`, etc. | Per data retention policy |
| `revocation_status` | Result of Status List check | Per data retention policy |
| `wrpac_serial` | Serial number of the WRPAC used | Per data retention policy |
| `policy_results` | Per-credential, per-policy pass/fail breakdown (see §25.3.1) | Per data retention policy |
| `verification_duration` | ISO 8601 duration of the verification pipeline execution (e.g., `PT0.012S`) | Per data retention policy |
| `policies_evaluated` | Count of verification policies executed | Per data retention policy |

> **GDPR note**: The audit trail should NOT store the attribute values themselves (e.g., not the family name or date of birth). Store only the attribute names and verification results. Raw PID data should be deleted once the business purpose is fulfilled.

##### 25.3.1 Verification Result Object Structure

Production verification systems should produce a **structured verification result object** with per-credential, per-policy granularity. This enables precise forensics for DORA incident analysis (Art. 17) and detailed GDPR processing records (Art. 30). The recommended structure is:

```json
{
  "session_id": "abc-123-def",
  "timestamp": "2026-03-17T14:30:00Z",
  "verification_result": true,
  "policy_results": [
    {
      "credential_index": 0,
      "credential_type": "eu.europa.ec.eudi.pid.1",
      "credential_format": "dc+sd-jwt",
      "policies": [
        {
          "policy": "signature",
          "description": "Cryptographic signature verification",
          "result": "pass"
        },
        {
          "policy": "expiry",
          "description": "Credential not expired (exp claim)",
          "result": "pass"
        },
        {
          "policy": "not_before",
          "description": "Credential validity period started (nbf claim)",
          "result": "pass"
        },
        {
          "policy": "revocation_status",
          "description": "TokenStatusList check (IETF draft-ietf-oauth-status-list)",
          "result": "pass"
        },
        {
          "policy": "holder_binding",
          "description": "KB-JWT presenter matches credential subject (cnf.jwk)",
          "result": "pass"
        },
        {
          "policy": "issuer_trust",
          "description": "Issuer certificate chain validates to a Trusted List anchor",
          "result": "pass"
        }
      ]
    }
  ],
  "verification_duration": "PT0.045S",
  "policies_evaluated": 6
}
```

Key design principles for the result object:

1. **Per-credential granularity** — Combined presentations (§15.5) may contain multiple credentials; each gets its own policy result array. A partial failure (one credential passes, another fails) should be logged with per-credential detail.

2. **Policy descriptions** — Human-readable descriptions enable audit reviewers to understand what was checked without needing to consult implementation documentation. This supports DORA's requirement for "clear and comprehensive" ICT incident records.

3. **No attribute values in results** — The result object records the credential *type* and policy *outcomes*, not the attribute values (family_name, birth_date, etc.). This maintains the GDPR principle from §25.3: log attribute *names*, not *values*.

4. **Execution timing** — ISO 8601 duration enables performance monitoring and SLA tracking (§25.1 key metrics). Abnormally long verification times may indicate revocation list fetch failures or certificate chain issues.

---

## Synthesis and Conclusions

### 26. Findings

#### 26.1 Architectural Observations

1. **The RP integration surface is larger than anticipated.** An RP must integrate with at least 7 external systems: Registrar, Access CA, LoTE Provider, Wallet Units (via OpenID4VP or ISO 18013-5), Status Lists, and (optionally) Registration Certificate Provider and Registrar API. This creates a significant system integration burden.

2. **Two parallel credential format stacks create implementation complexity.** Supporting both SD-JWT VC (JSON/JWT-based) and mdoc (CBOR-based) requires two complete verification pipelines, including different selective disclosure models, different device binding verification, and different trust anchor formats.

3. **The trust model has no single point of failure but many points of coordination.** The LoTE/Trusted List hierarchy, certificate chain validation, revocation checking, and optionally registration certificate verification create a robust but operationally complex trust model.

4. **The RP's wallet integration infrastructure is a critical-path dependency that requires its own operational resilience planning.** The EUDI Wallet integration relies on continuous availability of multiple external services: LoTE/Trusted List endpoints (for trust anchor refresh), Status List endpoints (for revocation checking), the Registrar API (for Wallet-side RP verification), and — for the RP's own authentication — valid, non-expired WRPACs with current SCTs. Failure in any of these creates a hard stop: stale trust anchors may cause signature verification failures; expired or revoked WRPACs prevent all Wallet interactions; unreachable Status Lists block revocation checks. RPs should implement: (a) aggressive trust anchor caching with configurable refresh intervals and graceful degradation when endpoints are unreachable; (b) WRPAC renewal automation with expiry alerting well before the certificate validity window closes; (c) Status List response caching per the `max-age` Cache-Control header to reduce external dependency during verification; (d) fallback verification flows for scenarios where the primary EUDI Wallet channel is unavailable (e.g., alternative identity verification methods during outages). Financial-sector RPs subject to DORA (§18.4) must include these dependencies in their ICT risk management framework (DORA Art. 28) and digital resilience testing programme (DORA Art. 24).

5. **SCA via EUDI Wallet is a paradigm shift for banks.** Moving SCA from proprietary banking apps to an interoperable Wallet-based model requires re-architecting payment authentication flows, adapting to OpenID4VP-based SCA requests, and bridging Dynamic Linking into existing authorisation infrastructure.

6. **The intermediary model solves a real problem but creates trust complexity.** Intermediaries reduce the technical integration burden for smaller RPs but introduce a three-party trust model that requires careful handling of identity display, data forwarding, and no-storage constraints.

7. **Pseudonym support is non-trivial.** RPs must support four pseudonym use cases, implement WebAuthn-based pseudonym authentication, and ensure they never refuse pseudonyms where identification is not legally required.

8. **User sovereignty is deeply embedded.** Every flow gives the User override capability — even disclosure policy denials can be overridden. RPs must design their systems to handle partial approvals and User-initiated disclosures gracefully.

#### 26.2 Regulatory Observations

9. **GDPR compliance requires careful attention.** User approval in the Wallet is NOT GDPR consent. RPs must independently establish a lawful basis for processing before requesting attributes. This is a common misunderstanding.

10. **AML/KYC onboarding via EUDI Wallet is feasible but depends on attestation availability.** Basic CDD using PID attributes works well. Enhanced Due Diligence requires additional attestation types that may not be available in all Member States at launch.

11. **DORA creates additional operational requirements for financial RPs.** The EUDI Wallet integration infrastructure (endpoints, certificates, trust anchors) must be included in DORA-mandated resilience testing and incident reporting.

#### 26.3 Protocol and Implementation Observations

12. **SCA attestation type identification relies on category-based matching, not fixed VCT values.** TS12 does not prescribe a single VCT type for SCA attestations. Instead, attestation types are identified by payment scheme–specific rulebooks. RPs must implement category-based attestation matching logic rather than hard-coding VCT values.

13. **W2W Verifier authentication is a fundamental gap.** In Wallet-to-Wallet flows (§12), the Verifier Wallet Unit has no WRPAC and no registration certificate. The Holder Wallet Unit cannot verify the Verifier's identity or registration status, meaning most of the trust infrastructure built for RP flows does not apply. This is an accepted trade-off for enabling natural-person-to-natural-person use cases, but it limits the assurance level achievable in W2W.

14. **Status List verification creates an operational burden disproportionate to conceptual simplicity.** While Attestation Status Lists (compressed bit arrays) are conceptually simple, implementing them correctly requires: (a) HTTP caching with `max-age` to avoid hitting rate limits, (b) DEFLATE decompression, (c) JWT/CWT signature verification of the Status List Token, (d) mapping the `status_list.idx` from the attestation to the correct bit position, and (e) handling the multi-status (two-bit) variant. This is a non-trivial pipeline distinct from the attestation verification pipeline.

15. **Combined presentation cryptographic binding is not yet available.** The ARF defines HLRs (ACP_10–ACP_15) for cryptographic binding of attestations but does not specify a concrete mechanism. Until standardised, RPs must rely on presentation-based binding (trusting the Wallet Unit) or attribute-based binding (requiring identifying attributes even when not needed for the use case). This creates a gap in high-assurance combined presentation use cases.

16. **Data deletion request infrastructure is fragmented across 9 interfaces.** TS7 defines interfaces I1–I9 spanning the Wallet UI, Registrar API, browser, email client, phone application, and an optional OID4VP reverse-presentation for requester authentication. RPs must implement at least one `supportURI` channel, but the lack of a standardised API interface means each RP's deletion process is bespoke.

17. **Wallet Unit trust is indirect for RPs.** The Wallet Unit Attestation (WUA, TS3) is used exclusively during credential issuance — the RP never receives or verifies it during presentation. An RP's trust in the Wallet Unit is derived entirely from the validity of the presented PID/attestation, whose issuer verified the WUA before issuance. This is a frequently misunderstood trust boundary.

18. **Device binding is recommended, not mandatory.** ARF Topic Z (integrated in v2.6.0) changed device binding from a mandatory requirement to a recommended one. RPs must handle both device-bound attestations (with `cnf` claim and KB-JWT verification) and non-device-bound attestations (issuer signature only). High-assurance use cases should preferentially rely on device-bound credentials, but cannot enforce this via DCQL queries.

19. **ZKP-based selective disclosure is on the roadmap but not yet available.** ARF Topic G, TS4, TS13, and TS14 define mechanisms for Zero-Knowledge Proof–based presentations (range proofs, set membership proofs, predicate proofs). No production Wallet implementations support ZKP presentation yet. RPs should design verification pipelines with a pluggable proof-type interface to accommodate future ZKP integration.

20. **Credential churn is a designed privacy feature, not an operational anomaly.** Topic A and Topic B establish that Attestation Providers will use once-only, limited-time, rotating-batch, or per-RP attestation strategies to mitigate RP linkability. RPs should expect the same user to present structurally different attestation instances across sessions — with different salts, keys, status indices, and signatures — and should never rely on attestation-level identifiers for session continuity.

21. **Certificate Transparency for WRPACs is an emerging operational requirement.** CIR 2025/848 Annex IV §3(j) and Topic S establish that Access CAs must log WRPACs in CT logs per RFC 9162, and Wallet Units will verify Signed Certificate Timestamps (SCTs). RPs must ensure their WRPACs contain valid SCTs — absence causes hard authentication failure. No EU-operated CT log infrastructure exists yet, creating a deployment dependency.

22. **The Wallet's transaction log creates a permanent forensic record of RP attribute requests.** TS10 specifies that every presentation is logged with the complete list of claims requested versus claims actually presented. This log is exportable as a JWE-encrypted Migration Object and persists across Wallet Unit migrations. Over-requesting is thus discoverable by Users, DPAs, and auditors even years after the transaction.

23. **EDP-denied presentations are intentionally indistinguishable from absent credentials.** Topic D (Requirement 4) mandates that when an Embedded Disclosure Policy denies a presentation, the Wallet Unit SHALL behave towards the RP as if the attestation did not exist. RPs cannot detect whether a credential was denied by policy or is genuinely absent — this is a deliberate privacy feature.

### 27. Recommendations

#### 27.1 For All RPs

| Priority | Recommendation |
|:---------|:---------------|
| 🔴 **Critical** | Begin RP registration with national Registrar immediately. Registration delays will compress the integration timeline. |
| 🔴 **Critical** | Implement both SD-JWT VC and mdoc verification pipelines. Both are mandatory. |
| 🔴 **Critical** | Implement HAIP 1.0 compliant OpenID4VP (JAR, x509_hash, direct_post.jwt, DCQL). |
| 🔴 **Critical** | Implement anti-linkability controls: do not persist unique attestation elements (salts, hash arrays, signature values) beyond the verification session. Use application-level session tokens instead. (§9.10) |
| 🟡 **High** | Implement periodic LoTE/Trusted List refresh (minimum daily). |
| 🟡 **High** | Implement WRPAC revocation monitoring and renewal automation. |
| 🟡 **High** | Implement `supportURI` endpoint for TS7 data deletion requests. |
| 🟡 **High** | Build a dedicated Status List verification pipeline (HTTP caching, DEFLATE decompression, JWT/CWT signature verification, bit-index lookup). Do not treat this as trivial. |
| 🟡 **High** | For native mobile RPs, migrate from custom URI schemes (`eudiw://`) to OS-level Application Links (Universal Links/App Links) to prevent link hijacking. |
| 🟡 **High** | Implement DCQL combined presentation queries for multi-attestation use cases. Prepare verification logic for all three identity matching methods (presentation-based, attribute-based, cryptographic). |
| 🟡 **High** | Handle both device-bound and non-device-bound attestations in verification pipelines. Do not assume all credentials have a `cnf` claim — verify KB-JWT only when present. |
| 🟡 **High** | Verify your WRPAC contains a valid Signed Certificate Timestamp (SCT). Monitor CT logs for unauthorised WRPACs issued to your RP identity. (§4.2.4) |
| 🟡 **High** | Design fallback flows for EDP-denied attestations that do not reveal whether the failure was due to policy, User refusal, or credential absence. (§16.3.3) |
| 🟡 **High** | For payment SCA, structure `transaction_data` in OpenID4VP requests per Topic W HLRs. The signed KB-JWT response constitutes the PSD2 Dynamic Linking proof. (§13.15) |
| 🟢 **Medium** | Support pseudonym-based authentication for services where legal identification is not required. |
| 🟢 **Medium** | Evaluate intermediary model vs. direct integration based on technical maturity and volume. |
| 🟢 **Medium** | Implement a purpose-built data deletion endpoint at a stable `supportURI` URL. Do not rely solely on email-based deletion requests — browser-accessible forms are preferred by Wallet Units. |
| 🟢 **Medium** | Implement identity matching for re-issued PIDs using `personal_identifier` rather than cryptographic identifiers (`cnf.jwk` thumbprint). Handle key rotation and status index changes gracefully. |
| 🟢 **Medium** | Handle representation attestations (parent/minor, power-of-attorney) as a distinct credential type with scope restrictions. (§15.6) |

#### 27.2 For Financial-Sector RPs (Banks, PSPs)

| Priority | Recommendation |
|:---------|:---------------|
| 🔴 **Critical** | Implement TS12 SCA flow including `transaction_data` and Dynamic Linking. |
| 🔴 **Critical** | Map EUDI Wallet SCA response to existing authorisation decision infrastructure. |
| 🔴 **Critical** | Implement CDD onboarding flow using PID + address attestation. |
| 🟡 **High** | Include EUDI Wallet integration in DORA digital resilience testing programme. |
| 🟡 **High** | Assess intermediary as ICT third-party service provider under DORA Art. 28–30. |
| 🟢 **Medium** | Prepare for Enhanced Due Diligence attestation types as MS ecosystems mature. |

#### 27.3 Implementation Checklist

The following ordered checklist provides a step-by-step integration roadmap for RPs:

| # | Phase | Action | Reference |
|:--|:------|:-------|:----------|
| 1 | **Registration** | Register with national Registrar; obtain RP identifier | §3, CIR 2025/848 |
| 2 | **Registration** | Obtain WRPAC(s) from an Access Certificate Authority | §4.2 |
| 3 | **Registration** | Optionally obtain WRPRC from Registration Certificate Provider | §4.3 |
| 4 | **Registration** | Register `supportURI` for data deletion requests (TS7) | §16.1 |
| 5 | **Trust setup** | Pre-cache LoTE/Trusted Lists for all 27 MS + EEA countries | §4.5, §23.2 |
| 6 | **Trust setup** | Implement LoTE refresh mechanism (minimum daily) | §4.5.4 |
| 7 | **Trust setup** | Implement WRPAC renewal automation (alert at 30 days before expiry) | §25.2 |
| 8 | **Protocol** | Implement JAR construction with `x509_hash`, `direct_post.jwt`, DCQL | §6, §7.3 |
| 9 | **Protocol** | Implement ephemeral key management for response encryption | §6.4 |
| 10 | **Protocol** | Deploy same-device flow (W3C DC API) | §7 |
| 11 | **Protocol** | Deploy cross-device flow (QR code + `request_uri`) | §8 |
| 12 | **Verification** | Build SD-JWT VC verification pipeline | §9.3 |
| 13 | **Verification** | Build mdoc verification pipeline | §9.4 |
| 14 | **Verification** | Build Status List verification pipeline (HTTP cache, DEFLATE, JWT verify) | Annex B |
| 15 | **Verification** | Implement combined presentation identity matching | §15.5 |
| 16 | **Compliance** | Implement pseudonym acceptance (WebAuthn) for non-identification services | §14 |
| 17 | **Compliance** | Implement data deletion request handling at `supportURI` | §16.1 |
| 18 | **Compliance** | Register DPA contact information | §16.2 |
| 19 | **Operations** | Set up monitoring dashboards and alert triggers | §25 |
| 20 | **Operations** | Implement audit trail logging (attribute names only, not values) | §25.3 |
| 21 | **Testing** | End-to-end testing with EU Reference Wallet | §21 |
| 22 | **Financial only** | Implement TS12 SCA flow with transaction_data | §13 |
| 23 | **Financial only** | Implement CDD onboarding flow | §19 |
| 24 | **Financial only** | Include EUDI integration in DORA resilience testing | §18.4 |

### 28. Open Questions

| # | Question | Source | Status |
|:--|:---------|:-------|:-------|
| 1 | W2W Verifier authentication mechanism | TS9 | Under active discussion — no resolution yet |
| 2 | WRPRC exact X.509 profile | ETSI TS 119 411-8 | Draft — not yet finalised |
| 3 | Embedded disclosure policy technical format | ARF, CIR 2024/2979 Annex III | Specification forthcoming from Commission |
| 4 | Pseudonym Use Case D (with full PID) — exact protocol | ARF | Under discussion |
| 5 | POST method harmonisation for Registrar API | TS5 | Left for further study |
| 6 | PuB-EAA Provider certificate chain — QTSP integration details | ARF §6.6.3.6 | Additional specifications needed |
| 7 | Cross-border RP registration — RP established in non-EU EEA state | CIR 2025/848 | Requires clarification |
| 8 | SCA attestation issuance protocol (OID4VCI specifics) | TS12 | Partially specified, cross-references OID4VCI |
| 9 | Combined presentation with mixed formats (SD-JWT + mdoc in one response) | HAIP 1.0 | Not explicitly addressed |
| 10 | Cryptographic binding mechanism for combined presentations — which scheme? | ARF Topic K, ACP_10–ACP_15 | Requirements defined but no concrete mechanism specified |
| 11 | TS7 standardised data deletion API (beyond `supportURI`) | TS7 | Only HTTP/email/phone channels specified; no machine-readable API |
| 12 | ZKP-based selective disclosure (range proofs, set membership) — when will Wallet implementations support it? | ARF Topic G, TS4, TS13, TS14 | Specification work ongoing; no production implementations yet |
| 13 | Device binding enforcement in DCQL — can the RP require device-bound attestations via the query? | ARF Topic Z, OID4VP | Not currently supported; device binding is an issuer-level policy decision |
| 14 | EU CT log infrastructure for access certificates — which providers, which RFC version (9162 vs. 6962)? | Topic S, CIR 2025/848 | Under discussion — no EU CT log established yet |
| 15 | Transactional data Attestation Rulebook — who defines payment-scheme-specific rendering and content rules? | Topic W | Delegated to industry sectors; no universal Rulebook yet |
| 16 | Representation attestation type registry — standardised `vct`/`docType` for representation PIDs? | Topic I | Rulebook creation mandated (Topic I Req. 1) but not yet published |

---

## Annexes

### Annex A: Exact Response Payloads

#### A.1 SD-JWT VC vp_token Response

When the Wallet Unit responds to an OpenID4VP request with an SD-JWT VC credential, the presentation is delivered as a JWE-encrypted `direct_post.jwt`. The decrypted inner structure contains the `vp_token`:

```
<Issuer-signed JWT>~<Disclosure1>~<Disclosure2>~...~<DisclosureN>~<Key Binding JWT>
```

**Full decoded example** (PID presentation with selective disclosure of `family_name`, `given_name`, `birth_date`):

```json
// === Issuer-Signed JWT Header ===
{
  "typ": "vc+sd-jwt",
  "alg": "ES256",
  "kid": "pid-issuer-key-2026",
  "x5c": ["<PID Provider signing certificate>", "<Intermediate CA>"]
}

// === Issuer-Signed JWT Payload ===
{
  "iss": "https://pid-provider.example-ms.eu",
  "sub": "urn:eudi:pid:de:1234567890",
  "iat": 1721000000,
  "exp": 1752536000,
  "vct": "eu.europa.ec.eudi.pid.1",
  "status": {
    "status_list": {
      "idx": 42,
      "uri": "https://pid-provider.example-ms.eu/status/1"
    }
  },
  "cnf": {
    "jwk": {
      "kty": "EC",
      "crv": "P-256",
      "x": "TCAER19Zvu3OHF4j4W4vfSVoHIP1ILilDls7vCeGemc",
      "y": "ZxjiWWbZMQGHVWKVQ4hbSIirsVfuecCE6t4jT9F2HZQ"
    }
  },
  "_sd": [
    "CrQe7S5kqBAHt-nMYXgc6bdt2SH5aTY1sU_M-PgkjPI",
    "JzYjH4svliH0R3PyEMfeZu6Jt69u5WehB_GJ39D3LDc",
    "PorFbpKuVu6xymJagvkFsFXAbRoc2JGlAUA-2WXs5AI"
  ],
  "_sd_alg": "sha-256"
}

// === Disclosures (one per selectively-disclosed attribute) ===
// Disclosure 1: ["6Ij7tM-avx0UPEljMVdFBR", "family_name", "Müller"]
// Base64url: WyI2SWo3dE0tYXZ4MFVQRW...
// SHA-256 hash matches _sd[0]

// Disclosure 2: ["eluV5Og3gSNII8EYnsxA_A", "given_name", "Erika"]
// Base64url: WyJlbHVWNU9nM2dTTklJ...
// SHA-256 hash matches _sd[1]

// Disclosure 3: ["Qg_O64zqAxe412a108iroA", "birth_date", "1984-01-26"]
// Base64url: WyJRZ19PNjR6cUF4ZTQx...
// SHA-256 hash matches _sd[2]

// === Key Binding JWT Header ===
{
  "typ": "kb+jwt",
  "alg": "ES256"
}

// === Key Binding JWT Payload ===
{
  "aud": "x509_hash://sha-256/Aq3B7yU0Vzf8-kJDfOpW2xsL7q5m4R1xNzYh3DAv_tI",
  "nonce": "bUtJdjJESWdmTWNjb011YQ",
  "iat": 1741269093,
  "sd_hash": "Re-CtLZfjGLErKy3eSriZ4bBx3AtUH5Q5wsWiiWKIwY"
}
```

#### A.2 JWE Envelope (direct_post.jwt)

The `vp_token` is encrypted to the RP using the ephemeral public key from the Authorization Request:

```json
// === JWE Header ===
{
  "alg": "ECDH-ES",
  "enc": "A256GCM",
  "kid": "<RP ephemeral key thumbprint>",
  "epk": {
    "kty": "EC",
    "crv": "P-256",
    "x": "<Wallet ephemeral X>",
    "y": "<Wallet ephemeral Y>"
  },
  "apu": "<base64url(Wallet ephemeral key)>",
  "apv": "<base64url(RP nonce)>"
}

// === Decrypted JWE Payload (DCQL-native format — HAIP 1.0) ===
{
  "vp_token": {
    "pid": "<SD-JWT VC string as shown above>"
  },
  "state": "af0ifjsldkj"
}

// === Alternative: Legacy presentation_submission format ===
// {
//   "vp_token": "<SD-JWT VC string>",
//   "presentation_submission": {
//     "id": "submission-1",
//     "definition_id": "dcql-query-1",
//     "descriptor_map": [{"id": "pid", "format": "dc+sd-jwt", "path": "$"}]
//   },
//   "state": "af0ifjsldkj"
// }
// NOTE: See §7.3 Step 18 for the full DCQL response format discussion.
```

#### A.3 mdoc DeviceResponse (CBOR Diagnostic Notation)

The proximity mdoc presentation response (ISO/IEC 18013-5):

```
DeviceResponse = {
  "version": "1.0",
  "documents": [
    {
      "docType": "eu.europa.ec.eudi.pid.1",
      "issuerSigned": {
        "nameSpaces": {
          "eu.europa.ec.eudi.pid.1": [
            {  ; IssuerSignedItem
              "digestID": 0,
              "random": h'8798645321abcdef',
              "elementIdentifier": "family_name",
              "elementValue": "Müller"
            },
            {
              "digestID": 1,
              "random": h'abcdef1234567890',
              "elementIdentifier": "given_name",
              "elementValue": "Erika"
            },
            {
              "digestID": 2,
              "random": h'1234567890abcdef',
              "elementIdentifier": "birth_date",
              "elementValue": 1009(  ; CBOR tag: full-date
                "1984-01-26"
              )
            }
          ]
        },
        "issuerAuth": [         ; COSE_Sign1
          h'a10126',             ; protected: {1: -7} (ES256)
          {},                    ; unprotected
          h'<MSO CBOR bytes>',  ; payload: MobileSecurityObject
          h'<signature bytes>'   ; signature
        ]
      },
      "deviceSigned": {
        "nameSpaces": {},        ; empty (no device-signed data)
        "deviceAuth": {
          "deviceSignature": [   ; COSE_Sign1
            h'a10126',           ; protected: ES256
            {},                  ; unprotected
            nil,                 ; detached payload (SessionTranscript)
            h'<device sig>'      ; signature over SessionTranscript
          ]
        }
      }
    }
  ],
  "status": 0                    ; 0 = OK
}
```

#### A.4 DC API navigator.credentials.get() Parameters

The W3C Digital Credentials API supports two invocation patterns for same-device flows. §7.3 Step 6 shows the **inline request** variant (JAR passed directly). Below is the **`request_uri` variant**, where the browser fetches the JAR from the RP's endpoint — this is more common in production as it avoids embedding a large JAR in the page:

```javascript
const credential = await navigator.credentials.get({
  digital: {
    providers: [{
      protocol: "openid4vp",
      request: {
        // request_uri variant: browser/Wallet fetches JAR from this URL
        client_id: "x509_hash://sha-256/Aq3B7yU0Vzf8-kJDfOpW2xsL7q5m4R1xNzYh3DAv_tI",
        request_uri: "https://eudi.example-bank.de/oid4vp/request/abc123",
        request_uri_method: "post"
      }
    }]
  },
  mediation: "required"  // Always prompt user
});

// Response: credential.data contains the encrypted vp_token (JWE)
const encryptedResponse = credential.data;
// RP backend decrypts with the ephemeral private key
```

---

### Annex B: Status List Verification Deep-Dive

#### B.1 Attestation Status List Token Structure

The EUDI Wallet ecosystem mandates support for two mechanisms for credential revocation: **Attestation Status Lists** (compressed bitstrings) and **Attestation Revocation Lists** (identifier lists). Both PID Providers and Attestation Providers publish Status List Tokens that RPs must check.

A Status List Token is a JWT containing a compressed bitstring:

```json
// === Status List Token Header ===
{
  "typ": "statuslist+jwt",
  "alg": "ES256",
  "kid": "pid-provider-status-key"
}

// === Status List Token Payload ===
{
  "iss": "https://pid-provider.example-ms.eu",
  "sub": "https://pid-provider.example-ms.eu/status/1",
  "iat": 1741269093,
  "exp": 1741355493,
  "status_list": {
    "bits": 1,
    "lst": "<base64url-encoded DEFLATE-compressed bitstring>"
  }
}
```

Each credential references a specific index in the Status List. The RP looks up `idx` in the decompressed bitstring:

- Bit value `0` → credential is VALID
- Bit value `1` → credential is REVOKED/SUSPENDED

#### B.2 RP Status List Verification Flow (Agnostic: Applies to Direct RP and Intermediary)

```mermaid
---
config:
  themeVariables:
    noteBkgColor: "transparent"
    noteBorderColor: "transparent"
  sequence:
    messageAlign: left
    noteAlign: left
    actorMargin: 120
---
sequenceDiagram
    participant RP as 🏦 Relying Party
    participant SL as 📋 Status List Endpoint
    participant Cache as 💾 RP Local Cache

    RP->>RP: 1. Extract status reference<br/>from credential:<br/>uri + idx
    RP->>Cache: 2. Check cache for<br/>Status List Token
    alt Cache hit and not expired
        Cache-->>RP: 3. Cached Status List Token
    else Cache miss or expired
        RP->>SL: 4. GET {status_list.uri}
        SL-->>RP: 5. Status List Token (JWT)
        RP->>RP: 6. Verify JWT signature<br/>(issuer signing key)
        RP->>RP: 7. Check exp claim
        RP->>Cache: 8. Store in cache
    end
    RP->>RP: 9. Decompress lst (DEFLATE)
    RP->>RP: 10. Extract bit at index {idx}
    alt Bit = 0
        RP->>RP: 11. Credential VALID ✅
    else Bit = 1
        RP->>RP: 12. Credential REVOKED ❌<br/>Reject presentation
    end
    Note right of Cache: ⠀
```

#### B.2.1 Status List Verification Payload Walkthrough

<details><summary><strong>1. RP extracts status reference (uri + idx) from credential</strong></summary>

Within the SD-JWT VC Issuer-signed JWT payload, the PID Provider includes a `status` claim referencing the Status List endpoint and the credential's index:

```json
{
  "iss": "https://pid-provider.example-ms.eu",
  "iat": 1741269093,
  "exp": 1772805093,
  "vct": "eu.europa.ec.eudi.pid.1",
  "cnf": {
    "jwk": { "...device public key..." }
  },
  "status": {
    "status_list": {
      "idx": 8472,
      "uri": "https://pid-provider.example-ms.eu/status/lists/chunk-47"
    }
  },
  "_sd": [ "...selective disclosure hashes..." ],
  "_sd_alg": "sha-256"
}
```

The RP extracts:
- **`uri`**: `https://pid-provider.example-ms.eu/status/lists/chunk-47` — the Status List Token endpoint
- **`idx`**: `8472` — the bit position (0-indexed) within the decompressed bitstring

> **Chunking**: Per TS3 §2.5, Wallet Providers and PID Providers SHOULD chunk status lists to contain at least 10,000 entries each. The `chunk-47` segment identifier is illustrative — providers may use any opaque identifier for their chunking strategy.
</details>
<details><summary><strong>2. RP checks local cache for Status List Token</strong></summary>

The RP queries its internal cache for a previously fetched and still valid Status List Token matching the `uri`.
</details>
<details><summary><strong>3. RP Cache returns cached Status List Token</strong></summary>

If found and `exp` is in the future, the RP uses the cached token and immediately proceeds to step 9.
</details>
<details><summary><strong>4. RP fetches Status List Token from endpoint</strong></summary>

If the RP's local cache does not contain a valid (non-expired) Status List Token for this URI:

```http
GET /status/lists/chunk-47 HTTP/1.1
Host: pid-provider.example-ms.eu
Accept: application/statuslist+jwt
```
</details>
<details><summary><strong>5. Status List Endpoint returns Status List Token (JWT)</strong></summary>

Response:

```http
HTTP/1.1 200 OK
Content-Type: application/statuslist+jwt
Cache-Control: max-age=86400

eyJhbGciOiJFUzI1NiIsInR5cCI6InN0YXR1c2xpc3Qrand0Iiwia2lkIjoicGlkLXByb3ZpZGVyLXN0YXR1cy1rZXkifQ.eyJpc3MiOiJodHRwczovL3BpZC1wcm92aWRlci5leGFtcGxlLW1zLmV1Iiwic3ViIjoiaHR0cHM6Ly9waWQtcHJvdmlkZXIuZXhhbXBsZS1tcy5ldS9zdGF0dXMvbGlzdHMvY2h1bmstNDciLCJpYXQiOjE3NDEyNjkwOTMsImV4cCI6MTc0MTM1NTQ5Mywic3RhdHVzX2xpc3QiOnsiYml0cyI6MSwibHN0IjoiPGJhc2U2NHVybC1lbmNvZGVkIERFRkxBVEUtY29tcHJlc3NlZCBiaXRzdHJpbmc-In0.signature
```
</details>
<details><summary><strong>6. RP verifies JWT signature against issuer signing key</strong></summary>

The RP verifies the signature against the PID Provider's signing key (same trust chain used to verify the credential itself).

The Status List Token is a standard JWT. Decoded:

```json
// Header
{
  "alg": "ES256",
  "typ": "statuslist+jwt",
  "kid": "pid-provider-status-key"
}

// Payload
{
  "iss": "https://pid-provider.example-ms.eu",
  "sub": "https://pid-provider.example-ms.eu/status/lists/chunk-47",
  "iat": 1741269093,
  "exp": 1741355493,
  "status_list": {
    "bits": 1,
    "lst": "eNrbuRgAAhcBXQ"
  }
}
```

RP verification checks:
1. **Signature**: Verify the JWT signature against the PID Provider's signing key 
2. **Issuer match**: Confirm `iss` matches the credential's `iss` claim
3. **Subject match**: Confirm `sub` matches the `status.status_list.uri` from the credential
4. **Bits field**: `bits: 1` means each credential status is encoded as a single bit (0 = valid, 1 = revoked). Other values (2, 4, 8) allow for more granular status codes
</details>
<details><summary><strong>7. RP checks exp claim for freshness</strong></summary>

The RP confirms `exp` > current time — if expired, it must re-fetch from the endpoint.
</details>
<details><summary><strong>8. RP stores Status List Token in local cache</strong></summary>

The new Status List Token is stored in the local cache, keyed by URI, with a TTL based on its `exp` claim.
</details>
<details><summary><strong>9. RP decompresses lst bitstring (DEFLATE)</strong></summary>

The `lst` value is a base64url-encoded DEFLATE-compressed bitstring. The RP decompresses it.
</details>
<details><summary><strong>10. RP extracts bit at index {idx} from decompressed bitstring</strong></summary>

The RP locates the precise bit mapped to the credential's `idx` (e.g., bit 8472).

```python
import base64
import zlib

# 1. Base64url-decode the lst value
compressed = base64.urlsafe_b64decode(status_list_token["status_list"]["lst"] + "==")

# 2. DEFLATE-decompress
decompressed = zlib.decompress(compressed, -zlib.MAX_WBITS)

# 3. Extract the bit at the credential's index
idx = 8472
bits_per_status = status_list_token["status_list"]["bits"]  # 1

# For bits=1: each byte contains 8 status values
byte_index = (idx * bits_per_status) // 8
bit_index = (idx * bits_per_status) % 8
status_byte = decompressed[byte_index]
status_value = (status_byte >> bit_index) & ((1 << bits_per_status) - 1)

# 4. Interpret the status
if status_value == 0:
    print("Credential VALID ✅")
elif status_value == 1:
    print("Credential REVOKED ❌ — reject presentation")
```

> **Performance note**: For a chunked Status List containing 10,000 entries with `bits=1`, the compressed bitstring is typically only a few hundred bytes. The RP should cache the decompressed bitstring alongside the JWT `exp` timestamp to avoid repeated decompression within the validity window.
</details>
<details><summary><strong>11. RP confirms credential VALID (bit = 0)</strong></summary>

If the bit is 0, the credential is logically valid.
</details>
<details><summary><strong>12. RP rejects presentation — credential REVOKED (bit = 1)</strong></summary>

If the bit is 1, the credential has been logically revoked or suspended, and the overall verifier sequence must fail.
</details>

#### B.3 RP Implementation Considerations

| Aspect | Recommendation |
|:-------|:---------------|
| **Caching** | Cache Status List Tokens locally; refresh based on `exp` claim. Typical TTL: 1–24 hours |
| **Batch checking** | For combined presentations, check ALL credentials against their respective Status Lists before accepting |
| **Offline proximity** | In unsupervised proximity flows, the terminal may not have real-time internet. Cache Status Lists aggressively. Accept a grace period window for revocation propagation |
| **Multiple providers** | Different credentials reference different Status List endpoints. The RP must maintain caches per provider |
| **Signature verification** | The Status List Token is signed by the same issuer key that signed the credential. Verify using the same trust chain |
| **Status list standard** | The ARF mandates **IETF TokenStatusList** (draft-ietf-oauth-status-list). Verify that your verification SDK defaults to this standard rather than W3C-era alternatives (BitstringStatusList, StatusList2021, RevocationList2020) which are outside the EUDI ecosystem |

> **SDK configuration note**: Several RP integration SDKs support multiple status list standards because they serve both EUDI and non-EUDI ecosystems. When configuring a verification pipeline for EUDI credentials, explicitly set the status list standard to IETF TokenStatusList (`discriminator: "ietf"` or equivalent). Using an incorrect default may cause silent verification failures if the SDK attempts to parse a TokenStatusList JWT as a W3C StatusList2021 Verifiable Credential.

---

## 29. References

### Regulations and Implementing Acts


- [Regulation (EU) 2024/1183 — European Digital Identity Framework (eIDAS 2.0)](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1183) — Amends Regulation (EU) No 910/2014; establishes the European Digital Identity Wallet and framework for electronic identification, authentication, and trust services (§1)
- [Commission Implementing Regulation (EU) 2024/2977 — PID and EAA](https://data.europa.eu/eli/reg_impl/2024/2977/oj) — Implementing regulation for person identification data (PID) and electronic attestations of attributes (EAA) (§1, §5)
- [Commission Implementing Regulation (EU) 2024/2979 — Integrity and Core Functionalities](https://data.europa.eu/eli/reg_impl/2024/2979/oj) — Implementing rules on integrity, core functionalities, and certificate requirements for EUDI Wallets (§1, §4, §16)
- [Commission Implementing Regulation (EU) 2024/2982 — Protocols and Interfaces](https://data.europa.eu/eli/reg_impl/2024/2982/oj) — Implementing regulation on protocols and interfaces between EUDI Wallet components (§1)
- [Commission Implementing Regulation (EU) 2025/848 — RP Registration](https://data.europa.eu/eli/reg_impl/2025/848/oj) — Implementing regulation on registration of Wallet-Relying Parties with Member State Registrars (§3)
- [Directive (EU) 2015/2366 — Payment Services Directive (PSD2)](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32015L2366) — Payment services in the internal market; mandates Strong Customer Authentication (SCA) for electronic payments (§13, §18)
- [Regulation (EU) 2016/679 — General Data Protection Regulation (GDPR)](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32016R0679) — Protection of natural persons with regard to processing of personal data; governs RP data handling obligations (§16, §18)
- [Regulation (EU) 2022/2554 — Digital Operational Resilience Act (DORA)](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022R2554) — ICT risk management, incident reporting, and third-party oversight for financial entities (§18)
- [Directive (EU) 2024/1640 — Anti-Money Laundering Directive (AMLD6)](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024L1640) — Customer due diligence, beneficial ownership, and AML/CFT obligations for obliged entities (§19)

### Architecture and Technical Specifications


- [Architecture and Reference Framework (ARF v2.8.0)](https://github.com/eu-digital-identity-wallet/eudi-doc-architecture-and-reference-framework) — EUDI Wallet Architecture and Reference Framework maintained by the European Commission; defines ecosystem roles, trust infrastructure, presentation flows, and high-level requirements (§1–§25)
- [ARF Discussion Topic K — Combined Presentation of Attestations](https://github.com/eu-digital-identity-wallet/eudi-doc-architecture-and-reference-framework/blob/main/docs/discussion-topics/k-combined-presentation-of-attestations.md) — Discussion paper on identity matching, cryptographic binding (ACP_01–ACP_15), and privacy-preserving combined presentations (§15)
- [ARF Discussion Topic E — Pseudonyms Including User Authentication Mechanism](https://github.com/eu-digital-identity-wallet/eudi-doc-architecture-and-reference-framework/blob/main/docs/discussion-topics/e-pseudonyms-including-user-authentication-mechanism.md) — Discussion paper on pseudonym types, use cases, and cryptographic binding to attested attributes (§14)
- [EUDI Standards and Technical Specifications (STS)](https://github.com/eu-digital-identity-wallet/eudi-doc-standards-and-technical-specifications) — Repository for all Technical Specifications (TS5–TS12) referenced in this document
- [TS5 — Common Formats and API for RP Registration Information (v1.0)](https://github.com/eu-digital-identity-wallet/eudi-doc-standards-and-technical-specifications) — Registrar API specification: OpenAPI definitions, data models, query/create/update operations (§3)
- [TS6 — Common Set of RP Information to Be Registered (v1.0)](https://github.com/eu-digital-identity-wallet/eudi-doc-standards-and-technical-specifications) — RP registration data model: user-friendly names, identifiers, intended uses, supervisory authority (§3)
- [TS7 — Common Interface for Data Deletion Requests (v0.95)](https://github.com/eu-digital-identity-wallet/eudi-doc-standards-and-technical-specifications) — Interfaces I1–I9 for User-initiated data deletion via Wallet Unit, browser, email, and phone (§16)
- [TS8 — Common Interface for Reporting of WRP to DPA (v0.95)](https://github.com/eu-digital-identity-wallet/eudi-doc-standards-and-technical-specifications) — Wallet/User interface for reporting suspicious RP requests to Data Protection Authorities (§16)
- [TS9 — Wallet-to-Wallet Interactions (v1.0)](https://github.com/eu-digital-identity-wallet/eudi-doc-standards-and-technical-specifications) — Proximity-only Wallet-to-Wallet flows: PresentationOffer, rate limiting, IntentToRetain constraints (§12)
- [TS12 — SCA Implementation with the Wallet (v1.0)](https://github.com/eu-digital-identity-wallet/eudi-doc-standards-and-technical-specifications) — Strong Customer Authentication via EUDI Wallet: SCA attestation types, Dynamic Linking, transaction_data, consent screen rendering (§13)

### Standards and Protocols


- [OpenID for Verifiable Presentations 1.0 (OpenID4VP)](https://openid.net/specs/openid-4-verifiable-presentations-1_0.html) — Final Specification (July 2025); extends OAuth 2.0 for Wallet-based credential presentation via `vp_token` and DCQL (§6–§9)
- [High Assurance Interoperability Profile 1.0 (HAIP)](https://openid.net/specs/openid4vc-high-assurance-interoperability-profile-1_0.html) — Final Specification (December 2025); mandates JAR, `x509_hash`, `direct_post.jwt`, and DCQL for EUDI Wallet ecosystem (§6)
- [OpenID for Verifiable Credential Issuance 1.0 (OID4VCI)](https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html) — Credential issuance protocol used by PID Providers and Attestation Providers to issue credentials to Wallet Units (§13)
- [SD-JWT-based Verifiable Credentials (SD-JWT VC, draft-15)](https://datatracker.ietf.org/doc/draft-ietf-oauth-sd-jwt-vc/) — IETF draft (draft-ietf-oauth-sd-jwt-vc-15, February 2026); JSON-based selective disclosure credential format with key binding (§5, §7, §9, Annex A)
- [ISO/IEC 18013-5 — Personal Identification — ISO-Compliant Driving Licence — Part 5](https://www.iso.org/standard/69084.html) — Mobile document (mdoc) data retrieval via BLE/NFC; defines DeviceEngagement, DeviceRequest, DeviceResponse, and SessionTranscript (§5, §11, §12)
- [ISO/IEC 18013-7 — Part 7: Mobile Document Online Presentation](https://www.iso.org/standard/82772.html) — Extends ISO 18013-5 with online presentation of mdoc via OpenID4VP (§8)
- [RFC 9101 — JWT-Secured Authorization Request (JAR)](https://datatracker.ietf.org/doc/rfc9101/) — Signed and optionally encrypted authorization request parameters; mandated by HAIP for all RP presentation requests (§6, §7)
- [RFC 9162 — Certificate Transparency Version 2.0](https://datatracker.ietf.org/doc/rfc9162/) — Public audit log for X.509 certificates; relevant to WRPAC transparency and monitoring (§4)
- [RFC 9598 — Token Status List](https://datatracker.ietf.org/doc/rfc9598/) — Underlying specification for Attestation Status Lists (compressed bitstring-based credential revocation mechanism); used by PID Providers and Attestation Providers for real-time status verification (§9, Annex B)
- [W3C Digital Credentials API (DC API)](https://wicg.github.io/digital-credentials/) — Browser API for same-device credential presentation; invokes `navigator.credentials.get()` with OpenID4VP protocol (§7, Annex A)
- [ETSI TS 119 475 — Relying Party Attributes for EUDI Wallet](https://www.etsi.org/deliver/etsi_ts/119400_119499/119475/) — Technical specification for RP access certificates (WRPACs) and attribute profiles (§4)
- [ETSI TS 119 612 — Trusted Lists](https://www.etsi.org/deliver/etsi_ts/119600_119699/119612/) — Specification for EU Trusted Lists of Trust Service Providers; used by RPs to validate certificate chains (§4)
