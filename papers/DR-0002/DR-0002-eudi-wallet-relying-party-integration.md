---
title: "EUDI Wallet: Relying Party Integration Flows"
dr_id: DR-0002
status: published
authors:
  - name: Ivan Stambuk
date_created: 2026-03-16
date_updated: 2026-03-19
tags: [eudi-wallet, eidas-2, relying-party, openid4vp, sd-jwt-vc, mdoc, iso-18013-5, haip, dcql, sca, psd2, oid4vci, trust-model, registration, proximity, remote-presentation, webauthn, pseudonyms, vendor-evaluation, security-threats, monitoring, cross-border, w3c-dc-api, status-list, aml-kyc, dora, qes, csc-api, pades, document-signing, qtsp, rqes]
related: []
---

# EUDI Wallet: Relying Party Integration Flows

**DR-0002** · Published · Last updated 2026-03-19 · ~14,500 lines

> Exhaustive investigation of the EU Digital Identity Wallet ecosystem from the Relying Party (RP) perspective. Covers every RP-facing flow at protocol depth: registration with Member State Registrars (CIR 2025/848, TS5/TS6), trust infrastructure (Access Certificates, Registration Certificates, Trusted Lists, WUA verification, Certificate Transparency), remote presentation (same-device via W3C Digital Credentials API and cross-device via QR/OpenID4VP with SD-JWT VC and mdoc), proximity presentation (supervised and unsupervised via ISO/IEC 18013-5), wallet-to-wallet interactions (TS9), SCA for electronic payments (TS12, PSD2 Dynamic Linking, OID4VCI SCA attestation issuance), pseudonym-based authentication (Use Cases A–D, WebAuthn credential binding, progressive assurance), combined presentations via DCQL (multi-attestation identity matching), data deletion requests (TS7), DPA reporting (TS8), the intermediary architecture, and document signing with remote Qualified Electronic Signatures (QES via CSC API v2.0, three signing flow patterns — QTSP Web Portal / Wallet-Channelled / RP-Channelled, document retrieval protocol, PAdES/XAdES/CAdES/JAdES signature formats). Extends beyond protocol flows into production engineering: a cryptographic verification pipeline deep-dive (signature, revocation, holder binding, issuer trust), RP verification architecture patterns (policy engine tiers, webhook delegation, callback integration, session management, policy-as-code), a 16-vendor evaluation matrix with unified capability scoring, ecosystem readiness assessment (W3C DC API browser support, Member State wallet implementations, interoperability testing), cross-border presentation scenarios (LoTE discovery, language handling, attribute compatibility), a 19-threat security threat model with risk assessment, and operational readiness guidance (monitoring metrics, alert triggers, structured audit trail with per-credential verification result objects). Includes exact protocol payloads (SD-JWT VC, mdoc DeviceResponse, JWE envelopes, DC API parameters), annotated Mermaid sequence diagrams with step-by-step walkthroughs, a Status List verification deep-dive annex, regulatory compliance mapping (eIDAS 2.0, PSD2/PSR, GDPR, DORA, AML/KYC), a persona-based reading guide, and a 24-step implementation checklist. Applicable to banks, financial institutions, public sector bodies, and any entity integrating with the EUDI Wallet as a Relying Party.

## Table of Contents

- [Executive Decision Summary](#executive-decision-summary)
- [Context](#context)
- [Scope](#scope)
- [Regulatory and Trust Foundations](#regulatory-and-trust-foundations)
  - [1. Regulatory Foundation](#1-regulatory-foundation-eidas-20-cirs-arf-and-technical-specifications)
  - [2. Ecosystem Roles](#2-ecosystem-roles-from-rp-perspective)
  - [3. RP Registration, Data Model, and Registrar API](#3-rp-registration-data-model-and-registrar-api)
  - [4. Trust Infrastructure](#4-trust-infrastructure-certificates-attestations-and-trusted-lists)
  - [5. Credential Formats](#5-credential-formats-sd-jwt-vc-mdoc-and-format-selection)
- [Remote Presentation Flows](#remote-presentation-flows)
  - [6. OpenID4VP and HAIP Protocol Foundations](#6-openid4vp-and-haip-protocol-foundations)
  - [7. Same-Device Remote Presentation](#7-same-device-remote-presentation)
  - [8. Cross-Device Remote Presentation](#8-cross-device-remote-presentation)
  - [9. RP Authentication and Presentation Verification](#9-rp-authentication-and-presentation-verification)
  - [10. Cryptographic Verification Pipeline](#10-cryptographic-verification-pipeline-deep-dive)
- [Proximity and Specialized Flows](#proximity-and-specialized-flows)
  - [11. Proximity Flows: ISO 18013-5](#11-proximity-presentation-flows-iso-18013-5-supervised-and-unsupervised)
  - [12. W2W Presentation Flow (TS9)](#12-w2w-presentation-flow-ts9)
  - [13. SCA for Electronic Payments](#13-sca-for-electronic-payments-lifecycle-flows-and-dynamic-linking)
- [Advanced Presentation Patterns](#advanced-presentation-patterns)
  - [14. Pseudonym-Based Authentication and WebAuthn](#14-pseudonym-based-authentication-and-webauthn)
  - [15. DCQL and Combined Presentations](#15-dcql-and-combined-presentations)
  - [16. RP Obligations](#16-rp-obligations-data-deletion-dpa-reporting-and-disclosure-policy)
  - [17. Intermediary Architecture](#17-intermediary-architecture-and-trust-flows)
- [RP Engineering and Operations](#rp-engineering-and-operations)
  - [18. Regulatory Compliance](#18-regulatory-compliance-eidas-psd2-gdpr-and-dora)
  - [19. AML/KYC Onboarding](#19-amlkyc-onboarding-via-eudi-wallet)
  - [20. RP Verification Architecture Patterns](#20-rp-verification-architecture-patterns)
  - [21. Vendor Evaluation](#21-vendor-evaluation)
  - [22. Ecosystem Readiness and Testing](#22-ecosystem-readiness-and-testing)
  - [23. Cross-Border Presentation Scenarios](#23-cross-border-presentation-scenarios)
  - [24. Security Threat Model for RPs](#24-security-threat-model-for-rps)
  - [25. Monitoring, Observability, and Operational Readiness](#25-monitoring-observability-and-operational-readiness)
- [Document Signing and Remote QES](#document-signing-and-remote-qes)
  - [26. Document Signing and Remote QES](#26-document-signing-and-remote-qes)
- *Synthesis and Conclusions*
  - [27. Findings](#27-findings)
  - [28. Recommendations](#28-recommendations)
  - [29. Open Questions](#29-open-questions)
- *Annexes*
  - [Annex A: Exact Response Payloads](#annex-a-exact-response-payloads)
  - [Annex B: Status List Verification Deep-Dive](#annex-b-status-list-verification-deep-dive)
- [30. References](#30-references)

### Reading Guide

> **Note**: This investigation is structured in six thematic blocks. Choose your entry point based on your role:
>
> | Sections | Theme | Best For |
> |:---------|:------|:---------|
> | **§1–§5** | Regulatory and trust foundations | **Compliance officers** and **architects** starting integration planning |
> | **§6–§10** | Remote presentation and cryptographic verification | **Backend developers** building remote verification pipelines |
> | **§11–§13** | Proximity and specialized flows | **Embedded/mobile developers** and **payment architects** |
> | **§14–§17** | Advanced presentation patterns (pseudonyms, DCQL, obligations, intermediaries) | **Product managers** scoping full feature coverage |
> | **§18–§25** | RP engineering and operations (compliance, vendor eval, threats, monitoring) | **DevOps**, **security**, and **vendor evaluation** teams |
> | **§26–§28** | Synthesis and conclusions | **Decision-makers** seeking actionable findings |
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
| **PAdES** | PDF Advanced Electronic Signatures (ETSI EN 319 142-1) |
| **QEAA** | Qualified Electronic Attestation of Attributes |
| **QES** | Qualified Electronic Signature |
| **QESRC** | Qualified Electronic Signature Remote Creation (Provider) |
| **QSCD** | Qualified Signature Creation Device |
| **QTSP** | Qualified Trust Service Provider |
| **RSSP** | Remote Signing Service Provider (CSC API server entity) |
| **SCA** | Strong Customer Authentication |
| **SCA (Sig.)** | Signature Creation Application (ETSI TS 119 432 — distinct from payment SCA) |
| **SCAL** | Sole Control Assurance Level (EN 419 241-1) |
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
    subgraph REG["`**Phase&nbsp;1:&nbsp;Registration&nbsp;(§3)**`"]
        direction LR
        R1("`**RP&nbsp;Application**
        <small>Legal&nbsp;identity,&nbsp;attributes,&nbsp;purposes,&nbsp;use&nbsp;cases</small>`")
        R2("`**Registrar**
        <small>Validate,&nbsp;publish&nbsp;to&nbsp;national&nbsp;register</small>`")
        R3("`**Access&nbsp;CA**
        <small>Issue&nbsp;WRPAC&nbsp;(X.509)</small>`")
        R4("`**Reg&nbsp;Cert&nbsp;Provider**
        <small>Issue&nbsp;WRPRC&nbsp;(optional)</small>`")
        R1 --> R2
        R2 --> R3
        R2 --> R4
    end

    subgraph TRUST["`**Phase&nbsp;2:&nbsp;Trust&nbsp;Setup&nbsp;(§4)**`"]
        direction LR
        T1("`**LoTE&nbsp;/&nbsp;Trusted&nbsp;Lists**
        <small>Trust&nbsp;anchors&nbsp;for&nbsp;PID/QEAA&nbsp;Providers</small>`")
        T2("`**Status&nbsp;List&nbsp;Endpoints**
        <small>RFC&nbsp;9598&nbsp;revocation&nbsp;checking</small>`")
        T3("`**Registrar&nbsp;API**
        <small>Runtime&nbsp;RP&nbsp;data&nbsp;lookup&nbsp;by&nbsp;Wallet</small>`")
        T1 ~~~ T2 ~~~ T3
    end

    subgraph FLOWS["`<span style='white-space: nowrap'>**Phase&nbsp;3:&nbsp;Presentation&nbsp;Flows&nbsp;(§6–§13)**</span>`"]
        direction LR
        F1("`**Remote&nbsp;Same-Device**
        <small>DC&nbsp;API&nbsp;+&nbsp;OpenID4VP&nbsp;•&nbsp;SD-JWT&nbsp;VC</small>`")
        F2("`**Remote&nbsp;Cross-Device**
        <small>QR&nbsp;+&nbsp;OpenID4VP&nbsp;•&nbsp;SD-JWT&nbsp;VC</small>`")
        F3("`**Proximity&nbsp;Supervised**
        <small>NFC/BLE&nbsp;+&nbsp;ISO&nbsp;18013-5&nbsp;•&nbsp;mdoc</small>`")
        F4("`**Proximity&nbsp;Unsupervised**
        <small style='white-space:nowrap'>NFC/BLE&nbsp;+&nbsp;ISO&nbsp;18013-5&nbsp;•&nbsp;mdoc&nbsp;(automated)</small>`")
        F5("`**W2W&nbsp;(TS9)**
        <small>QR/BLE&nbsp;+&nbsp;ISO&nbsp;18013-5&nbsp;•&nbsp;mdoc&nbsp;only</small>`")
        F6("`**SCA&nbsp;Payment&nbsp;(TS12)**
        <small style='white-space:nowrap'>OpenID4VP&nbsp;+&nbsp;KB-JWT&nbsp;•&nbsp;Dynamic&nbsp;linking</small>`")
        F1 ~~~ F2 ~~~ F3
        F4 ~~~ F5 ~~~ F6
    end

    subgraph OBLIGATIONS["`<span style='white-space: nowrap'>**Phase&nbsp;4:&nbsp;RP&nbsp;Obligations&nbsp;(§16/§18/§19)**</span>`"]
        direction LR
        O1("`**Data&nbsp;Deletion&nbsp;(TS7)**
        <small>9&nbsp;interfaces&nbsp;•&nbsp;GDPR&nbsp;Art.&nbsp;17</small>`")
        O2("`**DPA&nbsp;Reporting&nbsp;(TS8)**
        <small>User&nbsp;complaint&nbsp;to&nbsp;DPA</small>`")
        O3("`**Regulatory**
        <small>eIDAS,&nbsp;PSD2,&nbsp;GDPR,&nbsp;DORA,&nbsp;AML/KYC</small>`")
        O1 ~~~ O2 ~~~ O3
    end

    REG --> TRUST
    TRUST --> FLOWS
    FLOWS --> OBLIGATIONS

    classDef default text-align:left;
    style REG text-align:left
    style TRUST text-align:left
    style FLOWS text-align:left
    style OBLIGATIONS text-align:left
```

---

## Executive Decision Summary

This research formalizes every RP-facing integration flow in the EUDI Wallet ecosystem — from registration through remote, proximity, W2W, and SCA payment presentation to post-presentation obligations — at protocol depth. By analysing the eIDAS 2.0 Regulation, 9 CIRs, 11 Technical Specifications, and 3 external protocol standards (OpenID4VP 1.0, HAIP 1.0, ISO/IEC 18013-5), this document provides a prescriptive blueprint for RPs that must accept EUDI Wallet credentials by **December 2027**.

### Top Integration Decisions

**Foundational Architecture**

1. **Register with your national Registrar immediately** — registration is the prerequisite for obtaining WRPACs, WRPRCs, and appearing in the national register. Delays here compress the entire integration timeline (§3, CIR 2025/848).
2. **Support both SD-JWT VC and mdoc from day one** — both credential format stacks are mandatory. Two complete verification pipelines are required, including different selective disclosure models, device binding verification, and trust anchor formats (§5, Finding 2).
3. **Choose Direct RP or Intermediary model early** — the Direct RP model requires your own WRPAC(s) and infrastructure; the Intermediary model delegates Wallet interaction to a third party but introduces data-forwarding constraints and DORA third-party risk (§17, §18.4).
4. **Treat the EUDI integration infrastructure as a critical-path external dependency** — LoTE endpoints, Status List endpoints, the Registrar API, and WRPAC validity create a chain of hard dependencies. Failure in any causes a hard stop. Financial RPs must include these in DORA resilience testing (Finding 4).

**Protocol & Verification**

5. **Implement HAIP 1.0 compliant OpenID4VP** — this means JAR-based authorization requests, `x509_hash` Client ID mode, `direct_post.jwt` response mode, DCQL queries, and ephemeral key management for response encryption (§6, §7, §8).
6. **Build a dedicated Status List verification pipeline** — despite conceptual simplicity, this requires HTTP caching, DEFLATE decompression, JWT/CWT signature verification, and bit-index mapping. Do not underestimate this (Finding 14, Annex B).
7. **Implement pseudonym support with progressive assurance** — register pseudonyms at low assurance via WebAuthn, upgrade via PID step-up verification when needed. Never refuse pseudonyms where identification is not legally required (§14, Art. 5b(9), Finding 24).
8. **Implement anti-linkability controls from the start** — never persist unique attestation elements (salts, hash arrays, signatures) beyond the verification session. Credential churn is a designed privacy feature, not a bug (§9.10, Finding 20).

**Compliance & Operations**

9. **Implement TS12 SCA flow for payment authentication** (financial RPs) — structure `transaction_data` in OpenID4VP requests per Topic W HLRs. The signed KB-JWT response constitutes the PSD2 Dynamic Linking proof (§13, TS12).
10. **Implement data deletion infrastructure early** — TS7 mandates a `supportURI` endpoint. Build a purpose-built deletion handler at a stable URL; browser-accessible forms are preferred by Wallet Units. Over-requesting is discoverable via the Wallet's permanent transaction log (§16, Finding 22).

### Recommended Architecture by RP Profile

| Profile | Registration Model | Presentation Flows | Format Priority | SCA | Key Standards |
|:--------|:-------------------|:-------------------|:---------------|:----|:-------------|
| **Bank / PSP** | Direct RP | Remote (same + cross-device) + Proximity | SD-JWT VC + mdoc | TS12 mandatory | HAIP 1.0, PSD2/PSR, DORA, AMLD |
| **Public Sector** | Direct RP | Remote only | SD-JWT VC primary | Not required | eIDAS Art. 5b, GDPR Art. 6(1)(e) |
| **Healthcare** | Direct or Intermediary | Remote | SD-JWT VC primary | Not required | GDPR Art. 9, sector-specific EAAs |
| **VLOP / Telecom** | Intermediary likely | Remote same-device (DC API) | SD-JWT VC primary | Not required | Art. 5b(7), DSA Art. 33 |

### Top Open Risks

1. **Combined presentation cryptographic binding is not yet specified** — ARF defines HLRs (ACP_10–ACP_15) but no concrete mechanism. Until standardised, RPs must rely on presentation-based or attribute-based binding for multi-attestation verification (Finding 15, OQ #10).
2. **EU Certificate Transparency log infrastructure does not exist yet** — CIR 2025/848 and Topic S require WRPAC CT logging, and Wallet Units will verify SCTs. No EU-operated CT log is established, creating a deployment dependency (Finding 21, OQ #14).
3. **W2W Verifier authentication is a fundamental gap** — in Wallet-to-Wallet flows, the Verifier has no WRPAC and no registration certificate. Most RP trust infrastructure does not apply (Finding 13, OQ #1).
4. **ZKP-based selective disclosure is on the roadmap but not production-ready** — range proofs, set membership proofs, and predicate proofs are specified in TS4/TS13/TS14 but unsupported by any Wallet implementation. RPs should design pluggable proof-type interfaces (Finding 19, OQ #12).
5. **Data deletion API is not standardised** — TS7 defines 9 interfaces spanning browser, email, and phone channels, but no machine-readable API. Each RP's deletion process is bespoke (Finding 16, OQ #11).
6. **SCA attestation type identification is category-based, not fixed** — no single VCT value for SCA attestations; RPs must implement category-based matching logic driven by payment scheme rulebooks (Finding 12, OQ #15).
7. **Device binding is recommended, not mandatory** — RPs must handle both device-bound (`cnf` + KB-JWT) and non-device-bound attestations. High-assurance use cases cannot enforce device binding via DCQL queries (Finding 18, OQ #13).

### How to Use This Document

Start with the **Reading Guide** above to identify the sections most relevant to your role. The **persona-based reading paths** provide curated sequences for Bank RP Architects, Public Sector RPs, Intermediary/Vendors, Mobile Developers, Security Engineers, QA Engineers, and Data Protection Officers — each path builds understanding progressively from synthesis through to the protocol details that support it.

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
- Document signing: RP integration with qualified electronic signature flows (wallet-channelled, RP-channelled, QTSP web portal), CSC API v2.0, Document Retrieval protocol, PAdES signature formats
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

## Regulatory and Trust Foundations

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
    tickInterval 3month
    
    section Legal & Regulatory
    eIDAS 2.0 enters into force                 :milestone, 2024-05-20, 0d
    Batch adoption of CIRs                      :2024-11-01, 2025-12-31
    
    section Technical Specs
    OpenID4VP 1.0 Final status                  :milestone, 2025-07-01, 0d
    TS1–TS14 reach v1.0                         :2025-01-01, 2025-12-31
    HAIP 1.0 Final Specification                :milestone, 2025-12-01, 0d
    
    section Rollout & Mandates
    MS provide at least 1 EUDI Wallet           :milestone, 2026-12-21, 0d
    Mandatory private-sector acceptance         :crit, milestone, 2027-12-21, 0d
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
    subgraph Direct["`<span style='white-space:nowrap'>**Direct&nbsp;RP&nbsp;Model**</span>`"]
        direction TB
        U1("`**Wallet&nbsp;User**`") -->|"Presentation"| RP1("`**Relying&nbsp;Party**
        <small style='white-space:nowrap'>(registered,&nbsp;WRPAC)</small>`")
    end

    subgraph Intermediated["`<span style='white-space:nowrap'>**Intermediary&nbsp;Model**</span>`"]
        direction TB
        U2("`**Wallet&nbsp;User**`") -->|"Presentation"| INT("`**Intermediary**
        <small style='white-space:nowrap'>(registered&nbsp;as&nbsp;RP,&nbsp;WRPAC,&nbsp;no&nbsp;data&nbsp;storage)</small>`")
        INT -->|"Forward attributes"| RP2("`**Intermediated&nbsp;RP**
        <small style='white-space:nowrap'>(registered,&nbsp;no&nbsp;WRPAC)</small>`")
    end
    
    classDef default text-align:left;
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
    actorMargin: 250
---
sequenceDiagram
    autonumber
    participant RP as 🏦 Relying Party
    participant REG as 🏛️ Registrar<br/>(Member State)
    participant ACA as 🔐 Access CA
    participant RCP as 📜 Registration<br/>Cert Provider

    rect rgba(148, 163, 184, 0.14)
    Note right of RP: Phase 1: Application
    RP->>REG: Submit registration application
    Note right of RP: Includes: legal identity, contact info,<br/>intended attributes, purposes,<br/>intermediary status (if applicable),<br/>intended use cases
    REG->>REG: Validate application
    Note right of REG: Verify legal entity, check<br/>entitlements per national policy
    REG-->>RP: Registration confirmed
    Note right of RP: RP data published in national register
    Note right of RCP: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end

    rect rgba(52, 152, 219, 0.14)
    Note right of RP: Phase 2: Access Certificate Issuance
    RP->>ACA: Request WRPAC(s)
    Note right of RP: One per RP Instance
    ACA->>REG: Verify RP registration
    REG-->>ACA: Confirm registration
    ACA->>ACA: Issue X.509 certificate
    Note right of ACA: Contains: RP identity, MS,<br/>certificate policies
    ACA-->>RP: WRPAC issued
    ACA->>ACA: Log to Certificate Transparency
    Note right of RCP: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end

    rect rgba(46, 204, 113, 0.14)
    Note right of RP: Phase 3: Registration Certificate (Optional)
    RP->>RCP: Request WRPRC
    RCP->>REG: Retrieve registration data
    REG-->>RCP: Registration data
    RCP->>RCP: Issue WRPRC
    Note right of RCP: Embeds: intended attributes,<br/>purposes, supportURI,<br/>supervisory authority info
    RCP-->>RP: WRPRC issued
    Note right of RCP: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
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

The national Registrar systematically processes and validates the Relying Party's application against the rigorous policies mandated by eIDAS 2.0 (CIR 2025/848). This is not merely a technical registration; it establishes the legal foundation for the RP's operation within the EUDI ecosystem.

The validation routine executes four primary checks:

1. **Legal entity verification** — The Registrar cross-references the submitted organizational metadata (`legalName`, business identifiers) against authoritative national business registries (e.g., *Handelsregister* in Germany, *KVK* in the Netherlands). This ensures the RP is a legally incorporated and active entity.
2. **Entitlement verification** — The Registrar confirms the RP possesses the legal standing required to request the specific attributes declared in `intendedAttributes` under the stated `lawfulBasis`. For instance, a financial institution requesting a PID under Anti-Money Laundering (AMLD) regulations must correspond to a valid banking license in the national regulator's database.
3. **Intended use assessment** — A strict evaluation enforcing the GDPR's data minimisation principle (Art. 5(1)(c)). The Registrar assesses whether the array of requested attributes is strictly necessary and proportionate to the declared `purpose`.
4. **Intermediary status (if applicable)** — If the RP designates itself as an intermediary (operating on behalf of other end-RPs), the Registrar verifies compliance with the specific no-storage and data-passthrough mandates articulated in eIDAS Art. 5b(10).

```json
{
  "validation_status": "IN_PROGRESS",
  "checks": [
    {"type": "LEGAL_ENTITY", "status": "VERIFIED", "source": "National_Business_Registry"},
    {"type": "ENTITLEMENT", "status": "VERIFIED", "source": "Financial_Supervisory_Authority"},
    {"type": "DATA_MINIMISATION", "status": "PENDING_MANUAL_REVIEW"}
  ],
  "timestamp": "2026-06-15T09:30:00Z"
}
```

The validation duration varies significantly by Member State. Fully automated flows may conclude in minutes, whereas edge cases or sensitive attribute requests often trigger manual review by the national supervisory authority, extending the timeline to several weeks.
</details>
<details><summary><strong>3. Registrar confirms registration to Relying Party</strong></summary>

Upon successful completion of the validation phase, the Registrar assigns the Relying Party a persistent, globally unique identifier—the `walletRelyingPartyId` (e.g., `urn:eudi:wrp:de:bank-example:12345`). The Registrar then commits the verified registration payload to the authoritative national register.

The RP's operational standing is immediately activated (`status: ACTIVE`) and the data is exposed via the public Registrar REST API (`GET /wrp/{identifier}`). This endpoint acts as the systemic source of truth, enabling:

- **Wallet Units**: To dynamically query and render the RP's verified identity and intended use cases on the user's consent screen during presentation flows (§3.4.4).
- **Access CAs**: To strictly verify the RP's authorization status prior to minting any cryptographic WRPACs (step 5).
- **Registration Cert Providers**: To retrieve the authoritative data required to issue offline WRPRCs (step 11).
- **Supervisory Authorities**: To continuously monitor, audit, and regulate active RPs.

```http
HTTP/1.1 201 Created
Content-Type: application/json
Location: https://api.registrar.de/wrp/urn:eudi:wrp:de:bank-example:12345

{
  "walletRelyingPartyId": "urn:eudi:wrp:de:bank-example:12345",
  "status": "ACTIVE",
  "registrationDate": "2026-06-15T14:22:11Z",
  "links": {
    "self": "https://api.registrar.de/wrp/urn:eudi:wrp:de:bank-example:12345",
    "certificates": "https://api.registrar.de/wrp/urn:eudi:wrp:de:bank-example:12345/certificates"
  }
}
```

The Registrar continuously monitors the RP's compliance. Should the RP violate ecosystem rules or GDPR mandates, the Registrar holds the authority to transition the `status` to `SUSPENDED` or `REVOKED`, instantly paralyzing the RP's ability to interact with Wallet Units.
</details>
<details><summary><strong>4. Relying Party requests WRPAC(s) from Access CA</strong></summary>

With a confirmed registration, the Relying Party must acquire its cryptographic identity—the Wallet Relying Party Access Certificate (WRPAC). The RP generates a secure Elliptic Curve key pair (typically P-256 or P-384) within its infrastructure (e.g., an HSM or secure enclave). 

The RP constructs a standard PKCS#10 Certificate Signing Request (CSR). Crucially, the CSR binds the RP's technical endpoint to its legal EUDI identity by embedding the `walletRelyingPartyId` in the subject extension and specifying the Relying Party Instance's operational domain in the Subject Alternative Name (SAN).

```text
Certificate Request:
    Data:
        Version: 1 (0x0)
        Subject: C=DE, O=Example Bank AG, CN=onboarding.example-bank.de
        Subject Public Key Info:
            Public Key Algorithm: id-ecPublicKey
                Public-Key: (256 bit)
                pub:
                    04:a1:b2:c3:d4... [EC Public Key]
        Attributes:
            Requested Extensions:
                X509v3 Subject Alternative Name: 
                    DNS:onboarding.example-bank.de
                1.3.6.1.4.1.xxxxx.1 (walletRelyingPartyId):
                    urn:eudi:wrp:de:bank-example:12345
    Signature Algorithm: ecdsa-with-SHA256
         30:45:02:20:7c... [Signature]
```

> **One WRPAC per RP Instance**: Each independent architectural component (e.g., the primary web backend, a distinct mobile API gateway, or distributed proximity terminals) requires its own WRPAC with isolated key material. While a single legal entity may hold dozens of WRPACs, the WRPAC's SAN domain must exactly match the `client_id` used in its OpenID4VP requests. This strict binding effectively neutralizes domain spoofing and phishing attacks.
</details>
<details><summary><strong>5. Access CA queries Registrar to verify RP registration</strong></summary>

The Access Certificate Authority (Access CA) operates under strict issuance policies and does not blindly mint certificates based solely on a valid CSR signature. Upon receiving the CSR, the Access CA acts as a systemic gatekeeper by actively querying the designated Registrar REST API (`GET /wrp/{identifier}`).

This critical verification step bridges the PKI trust layer (X.509 cryptography) and the regulatory trust layer (national legal registration). The Access CA validates three mandatory conditions:
1. **Existence & Status**: The RP must exist in the national registry and hold an `ACTIVE` status.
2. **Identifier Matching**: The `walletRelyingPartyId` requested in the CSR's custom extension must perfectly match the identifier registered with the authority.
3. **Standing**: The RP must not be flagged as suspended, revoked, or under investigation.

```http
GET /wrp/urn:eudi:wrp:de:bank-example:12345 HTTP/1.1
Host: api.registrar.de
Authorization: Bearer [Access_CA_Privileged_Token]
Accept: application/jwt
```

If any condition fails, the Access CA immediately aborts the issuance process and logs the denied request. This architectural safeguard mathematically ensures that unregistered, suspended, or malicious entities cannot obtain the cryptographic WRPACs necessary to interface with EUDI Wallet Units.

> **CA-Registrar binding**: This verification step is what connects the PKI trust layer (X.509 certificates) to the regulatory trust layer (national registration). A WRPAC without a backing Registrar entry is invalid by design.
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

The Access CA cryptographically signs the X.509 Access Certificate and delivers the full certificate chain (Leaf → Intermediate CA → Root CA) back to the Relying Party. 

The RP must immediately secure the corresponding private key within a resilient, hardware-backed key store (e.g., an HSM or managed Cloud KMS) to prevent key exfiltration. This private cryptographic material acts as the ultimate anchor for the RP's authenticity, and is utilized across two primarily integration vectors:

- **Online Authentication**: To securely sign JSON-Secured Authorization Requests (JARs). The entire WRPAC chain is injected into the `x5c` header of the JWS payload, allowing remote Wallet Units to verify the signature.
- **Proximity Authentication**: To sign `readerAuth` structures during offline BLE/NFC mdoc presentations (§11.4). The WRPAC is embedded directly in the COSE_Sign1 unprotected header.

```json
{
  "alg": "ES256",
  "typ": "oauth-authz-req+jwt",
  "x5c": [
    "MIIB... (WRPAC Leaf)",
    "MIIB... (Access CA Intermediate)",
    "MIIC... (Access CA Root)"
  ]
}
```

Because WRPACs carry high systemic risk if compromised, they possess a strictly limited validity period (typically 1–2 years). RPs must engineer automated cryptographic rotation pipelines to renew WRPACs prior to expiration, as Wallet Units forcefully reject expired certificates at runtime.
</details>
<details><summary><strong>9. Access CA logs WRPAC to Certificate Transparency</strong></summary>

Simultaneous to issuance, the Access CA actively submits the newly minted WRPAC to one or more EUDI-compliant Certificate Transparency (CT) logs, strictly adhering to RFC 9162. The CT log responds with a cryptographic Signed Certificate Timestamp (SCT) asserting that the certificate has been permanently recorded in an append-only ledger.

This architectural requirement aligns the EUDI PKI with modern Web PKI standards (e.g., Chrome's CT policy) and provides three critical security properties:

1. **Ecosystem-wide Auditability**: Security researchers and Wallet Providers can continuously monitor public CT logs to detect rogue, mis-issued, or compromised WRPACs instantly.
2. **RP Accountability**: The public nature of CT logs creates a permanent, non-repudiable record of exactly which legal entity holds which access keys, severely deterring unauthorized credential acquisition.
3. **Wallet-Side Enforcement**: Advanced Wallet Units are expected to parse the SCTs embedded within the WRPAC X.509 extensions to verify legitimate public logging before rendering user consent screens.

```text
Certificate Extensions:
    CT Precertificate SCTs: 
        Signed Certificate Timestamp:
            Version   : v1 (0x0)
            Log ID    : 5c:a1:... (EUDI Public Log)
            Timestamp : Jun 15 14:26:00 2026 GMT
            Extensions: none
            Signature : ecdsa-with-SHA256
                        30:45:02:20:12...
```

> **Zero-Trust Fallback**: If a Wallet Unit encounters a WRPAC lacking valid SCTs, the standard behavior is an immediate protocol termination (Access Denied), preventing shadow-issued certificates from interrogating wallets.
</details>
<details><summary><strong>10. Relying Party requests WRPRC from Registration Cert Provider</strong></summary>

While the WRPAC governs cryptographic network access, it does not detail an RP's *entitlements*. If supported by the Member State, the Relying Party proactively requests a Wallet Relying Party Registration Certificate (WRPRC) from an authorized Registration Cert Provider to bundle its authorized use-cases into a verifiable artifact.

There is a fundamental dichotomy between the two credentials:
- **WRPAC (The "Who")**: An X.509 certificate mathematically proving the RP's network identity and domain binding.
- **WRPRC (The "What")**: A signed metadata artifact proving exactly *which* attributes the RP is legally authorized to request, backed by its stated `lawfulBasis`.

The primary engineering value of the WRPRC is enabling **offline verification**. By injecting the WRPRC into the `client_metadata` of an OpenID4VP request or the `readerAuth` extension of an mdoc engagement, the Wallet Unit is shielded from having to perform synchronous network queries to the Registrar API during the presentation flow.

```json
{
  "client_id": "urn:eudi:wrp:de:bank-example:12345",
  "client_metadata": {
    "jwks": { "keys": [...] },
    "authorization_encrypted_response_alg": "ECDH-ES",
    "authorization_encrypted_response_enc": "A256GCM",
    "vp_formats": { "dc+sd-jwt": {}, "mso_mdoc": {} },
    "wallet_relying_party_registration_certificate": "eyJhbGciOiJFUzI1Ni...[WRPRC JWT]..."
  }
}
```
</details>
<details><summary><strong>11. Registration Cert Provider queries Registrar for RP data</strong></summary>

To construct the WRPRC accurately, the Registration Cert Provider must source the unadulterated ground truth regarding the RP's entitlements. The Provider executes a direct query to the national Registrar's REST API, targeting the Relying Party's unique identifier.

```http
GET /wrp/urn:eudi:wrp:de:bank-example:12345 HTTP/1.1
Host: api.registrar.de
Accept: application/jwt
Authorization: Bearer [RCP_Privileged_Token]
```

This strict backend-to-backend integration guarantees that the WRPRC is minted using dynamically validated registration data rather than static user-supplied inputs, enforcing systemic integrity.
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

The Registration Cert Provider mints the WRPRC as a deeply structured, self-contained JSON Web Token (JWT) encapsulating the full spectrum of the RP's operational privileges. 

This token natively embeds critical user-facing transparency data:
- **`intendedAttributes`**: Cryptographically limits the scope to the precise attributes (e.g., `family_name`, `birth_date`) and purposes the RP was legally approved for.
- **`supportURI`**: Guaranteed support URLs rendered on the Wallet UI if users encounter presentation faults or dispute data collection.
- **`supervisoryAuthority`**: Renders exactly which national DPA or agency oversees the RP's data handling practices.
- **`srvDescription`**: Richly localized application descriptions dynamically rendered based on the Wallet Unit's active locale.

```json
{
  "alg": "ES256",
  "typ": "eudi-wrprc+jwt",
  "kid": "rcp-key-2026"
}
.
{
  "iss": "https://certificates.bundesdruckerei.de",
  "sub": "urn:eudi:wrp:de:bank-example:12345",
  "iat": 1718447800,
  "exp": 1726223800,
  "intendedAttributes": [
    {
      "attestationType": "eu.europa.ec.eudi.pid.1",
      "attributes": ["family_name", "given_name", "birth_date"],
      "purpose": "Customer onboarding and KYC verification"
    }
  ],
  "supportURI": ["https://support.example-bank.de/eudi-wallet"]
}
.[signature]
```

To restrict the window for malicious drift (where an RP retains attributes after their lawful basis changes), the WRPRC enforces an ultra-short validity window (`exp` typically 3–6 months), forcing the RP to repeatedly interface with the Provider to refresh its entitlements.
</details>
<details><summary><strong>14. Registration Cert Provider delivers WRPRC to Relying Party</strong></summary>

The finalized WRPRC (formatted as a signed JWT) is securely delivered back to the Relying Party. The RP caches this artifact in its backend infrastructure, alongside its cryptographic WRPAC, integrating it into every outbound presentation pipeline.

Depending on the modality, the RP transmits the WRPRC to Wallet Units via distinct architectural channels:
- **Online SD-JWT flows**: Embedded natively within the `client_metadata` payload inside the authorization JAR.
- **Proximity mdoc flows**: Encoded as a CBOR byte string and attached directly to the `readerAuth` COSE_Sign1 unprotected header during BLE/NFC engagement.

```http
HTTP/1.1 200 OK
Content-Type: application/jwt

eyJhbGciOiJFUzI1NiIsInR...[WRPRC JWT containing intendedAttributes]
```

When the Wallet Unit processes the request, it verifies the RCP's issuer signature via its Trusted List. If valid, the Wallet dynamically reads the `intendedAttributes` from the WRPRC and renders them directly on the user's consent screen. This mechanism deliberately bypasses synchronous REST calls to the Registrar API (§3.4.4), ensuring ultra-responsive, fully offline verification perfectly sculpted for subterranean transit gates or remote proximity venues without internet connectivity.

> **WRPRC Staleness Mitigation**: Because the WRPRC represents a static, point-in-time snapshot, it rapidly ages out of sync with backend Registrar updates (e.g., the RP legally registers a new `address` attribute). RPs must engineer automated cron scripts to blindly refresh their WRPRC monthly, guaranteeing Wallet UI alignment with their current legal reality.
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
    actorMargin: 250
---
sequenceDiagram
    autonumber
    participant WU as 📱 Wallet Unit
    participant RPI as 🏦 RP Instance
    participant REG as 🏛️ Registrar API

    RPI->>WU: Presentation request (WRPAC, no WRPRC)
    WU->>WU: Authenticate RP Instance via WRPAC
    Note right of WU: User enables "verify<br/>registration" check

    WU->>REG: GET /wrp/check-intended-use?<br/>identifier={rpId}<br/>&intendeduseidentifier={useId}<br/>&claimpath={requestedClaim}<br/>&credentialformat=dc+sd-jwt
    REG-->>WU: JWS-signed response:<br/>TRUE / FALSE
    
    alt Intended use verified (TRUE)
        WU->>WU: Show User: "RP registered for<br/>these attributes ✅"
    else Intended use not verified (FALSE)
        WU->>WU: Show User: "⚠️ RP requested attributes<br/>not matching registration"
    Note right of REG: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
    
    WU->>WU: User approves/denies

    Note right of REG: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
```

<details><summary><strong>1. Presentation request (WRPAC, no WRPRC)</strong></summary>

The Relying Party Instance initiates the presentation flow by transmitting a request to the user's Wallet Unit. Depending on the architectural modality, this is either an OpenID4VP JSON-secured Authorization Request (JAR) traversing the internet, or an ISO/IEC 18013-5 `DeviceRequest` transmitted over BLE/NFC. 

To cryptographically assert its identity, the RP embeds its Wallet Relying Party Access Certificate (WRPAC). 

```json
{
  "client_id": "urn:eudi:wrp:de:bank-example:12345",
  "client_metadata": {
    "jwks": {
      "keys": [{
        "kty": "EC",
        "crv": "P-256",
        "x": "...",
        "y": "...",
        "x5c": ["MIIC...WRPAC...", "MIIC...Intermediate..."]
      }]
    }
  }
}
```

In this specific scenario, the RP **omits** the Wallet Relying Party Registration Certificate (WRPRC). This omission might occur because the RP's Member State has not deployed a Registration Cert Provider infrastructure, or the RP's architect chose to simplify their offline credential management. Because the WRPRC is missing, the Wallet Unit lacks localized proof of the RP's *entitlements* and is forced into an online execution path (Steps 3–4) to query the national Registrar.

> **Offline Bypass**: If the RP *had* embedded a WRPRC, the Wallet Unit could parse the `intendedAttributes` directly from the certificate payload, entirely bypassing the synchronous REST API network hops to the Registrar and skipping straight to user consent.
</details>
<details><summary><strong>2. Authenticate RP Instance via WRPAC</strong></summary>

Upon receiving the presentation request, the Wallet Unit enters a strict cryptographic verification phase. It must unequivocally prove that the RP operating the endpoint (`client_id`) legally owns the private key that signed the request.

The Wallet extracts the WRPAC leaf certificate from the request (e.g., from the JAR's `x5c` header or the mdoc `readerAuth` structure) and executes the following path validation:

1. **Chain Building**: The Wallet constructs the certification path from the WRPAC leaf, through the Access CA intermediate, terminating at a trusted Root CA listed in the national List of Trusted Entities (LoTE).
2. **Signature Verification**: The Wallet mathematically verifies the ECDSA signatures across the entire chain.
3. **Status Check**: The Wallet verifies the certificate's validity period and queries its revocation status (via OCSP stapling, CRLs, or cached offline lists).
4. **Identity Binding**: The Wallet extracts the deeply embedded `walletRelyingPartyId` or `client_id` from the WRPAC's Subject Alternative Name (SAN) extension.

```text
X509v3 Subject Alternative Name:
    URI:urn:eudi:wrp:de:bank-example:12345
```

This procedure authenticates **who** the RP is, but crucially, it does not validate **what they are legally permitted to request**. The WRPAC proves the RP is a registered entity capable of holding keys, but querying the specific attributes and lawful purposes requires live registration verification.

> **Hard Protocol Termination**: If any dimension of the WRPAC validation fails (chain broken, expired, revoked, or untrusted Root), the Wallet MUST categorically drop the presentation request. An unauthenticated RP represents a severe systemic threat, irrespective of the attributes it is attempting to access.
</details>
<details><summary><strong>3. GET /wrp/check-intended-use</strong></summary>

The Wallet Unit constructs an HTTP GET request to the Registrar's `check-intended-use` endpoint — the lightweight boolean check designed specifically for real-time Wallet queries during presentation (TS5 OpenAPI 3.1). The query parameters map directly from the RP's presentation request:

```http
GET /wrp/check-intended-use?rpidentifier=5299001GCLKH6FPVJW75
    &credentialformat=dc%2Bsd-jwt
    &claimpath=family_name
    &credentialmeta=eu.europa.ec.eudi.pid.1
Host: registrar.example-ms.de
Accept: application/jwt
```

| Parameter | Source | Example |
|:----------|:-------|:--------|
| `rpidentifier` | WRPAC SAN (from step 2) | `5299001GCLKH6FPVJW75` |
| `credentialformat` | From the presentation request's DCQL query | `dc+sd-jwt` or `mso_mdoc` |
| `claimpath` | Each requested attribute name | `family_name` |
| `credentialmeta` | Credential type / docType | `eu.europa.ec.eudi.pid.1` |

For multi-attribute requests, the Wallet should either issue **one query per requested claim** or batch them if the Registrar supports multi-claim queries (implementation-dependent). The Registrar endpoint must be reachable over TLS 1.3, and the Wallet should verify the Registrar's TLS certificate chain. See §3.4.5 for the full endpoint specification and response schema.

> **Offline fallback**: If the Registrar is unreachable (no internet, DNS failure, timeout), the Wallet should inform the User: *"Registration check unavailable — proceed at your own risk"*, and allow the User to decide. The Wallet should NOT silently proceed without the check.
</details>
<details><summary><strong>4. JWS-signed response: TRUE/FALSE</strong></summary>

The Registrar API returns a `200 OK` response with `Content-Type: application/jwt` — a JWS compact serialisation signed with the Registrar's private key. The `x-jku-url` response header points to the Registrar's JWKS for signature verification. The JWS payload conforms to the `SignedIntendedUseCheckResult` schema:

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

The Wallet Unit MUST verify the JWS signature before trusting the response — an unsigned or tampered response could lead to the Wallet incorrectly approving an unregistered request. The Wallet fetches the Registrar's JWKS from the `x-jku-url` header (or from a cached copy) and verifies the signature using the matching `kid`.

When the RP requests an attribute it is **not** registered for, the response indicates `false`:

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

> **JWS signing rationale**: The Registrar signs every response to prevent man-in-the-middle attacks where a network adversary could replace a `false` response with `true`, tricking the User into sharing data with an unregistered RP.
</details>
<details><summary><strong>5. Show User: "RP registered for these attributes ✅"</strong></summary>

If the Registrar API responds with `isRegistered: true`, the Wallet Unit's UI transitions to the presentation consent screen, heavily augmenting the display with positive trust indicators. This UI signifies that the RP has successfully navigated the regulatory gauntlet and is explicitly authorized to siphon the requested attributes.

The Wallet UI dynamically maps the validated data to the screen:
- **Verified Identity**: The RP's `tradeName` (e.g., *"Example Bank AG"*) is rendered prominently, pulled from the WRPAC SAN or the cached Registrar profile.
- **Trust Seal**: A highly visible, standardized trust mark (e.g., ✅) accompanied by ecosystem-approved nomenclature like *"This service is officially registered and monitored by your national authority."*
- **Granular Transparency**: Each requested attribute (e.g., `family_name`, `birth_date`) is listed alongside the RP's registered `purpose` (e.g., *"For anti-money laundering compliance (KYC)"*).

```json
{
  "ui_state": "TRUSTED",
  "rendered_elements": [
    {"type": "TRUST_BADGE", "status": "VERIFIED"},
    {"type": "ATTRIBUTE_LIST", "items": ["family_name", "birth_date"]},
    {"type": "PURPOSE_TEXT", "value": "Customer identification and KYC verification"}
  ]
}
```

This affirmative signal serves as the primary psychological anchor for the User, assuring them that the interaction is shielded by eIDAS 2.0 regulatory oversight, thereby dramatically increasing conversion rates during complex onboarding flows.
</details>
<details><summary><strong>6. Show User: "⚠️ RP requested attributes not matching registration"</strong></summary>

If the Registrar API responds with `isRegistered: false`—indicating a mismatch between the attributes requested in the JAR/DeviceRequest and the attributes approved in the national registry—the Wallet Unit MUST instantly interrupt the standard UX flow and render a severe warning.

This architectural tripwire is the fundamental defense mechanism against Relying Parties attempting to over-request data outside their legal purview (e.g., a bank quietly asking for health indicators). 

The Wallet UI executes a "friction-heavy" intervention:
- **Visual Alert**: The interface shifts to an amber or red warning state (⚠️).
- **Explicit Callout**: "This service is **NOT** authorized to request the highlighted data (e.g., `health_status`)."
- **Regulatory Context**: A "Learn More" hyperlink driving the user directly to the national Registrar's public portal, allowing the user to inspect the RP's actual, limited registration record.

```json
{
  "ui_state": "WARNING_ELEVATED",
  "mismatched_claims": ["health_status", "location"],
  "warning_text": "The service may not have regulatory approval for this data — sharing is at your own risk."
}
```

Crucially, under the sovereignty principles of eIDAS 2.0 (Art. 5a(4)), this warning is strictly **informational, not blocking**. The Wallet Unit cannot unilaterally forbid the user from transmitting their own data. The user retains ultimate agency to override the warning and force the presentation, but the UI guarantees they do so fully aware of the RP's non-compliance.
</details>
<details><summary><strong>7. User approves/denies</strong></summary>

Positioned as the definitive gatekeeper, the User absorbs the UI trust indicators (✅ or ⚠️) and exercises their sovereign right to authorize or abort the transaction. The European digital identity paradigm dictates that cryptographic transmission cannot occur without this explicit, granular consent gate.

The Wallet Unit translates the User's choice into protocol-level actions:

- **If Approved (Full or Partial)**: The Wallet Unit synthesizes the finalized payload. For an OpenID4VP flow, it constructs the SD-JWT VP Token, signs the Key Binding JWT (KB-JWT) over the RP's `nonce`, and POSTs the payload to the RP's `response_uri`. If the User exercised selective disclosure (denying specific attributes like `age` while approving `name`), the Wallet strips the corresponding disclosure strings from the presentation.
- **If Denied**: The Wallet halts cryptographic generation. In online domains, it explicitly signals the rejection by dispatching an OAuth 2.0 `access_denied` error code to the RP's backend, allowing the RP to gracefully update its web session. In proximity environments, the Wallet silently drops the BLE/NFC connection.

```http
POST /api/eudi-response HTTP/1.1
Host: onboarding.example-bank.de
Content-Type: application/x-www-form-urlencoded

response=eyJhbGciOiJFUzI1NiIs...[VP Token Payload]...&state=af0ifjsldkj
```

> **The Risk of Partial Consent**: Wallet Units increasingly support granular, per-attribute toggles. RPs must engineer their backend verifier logic to smoothly handle presentations that arrive with missing, un-consented attributes. If an RP rigidly terminates the session when a non-critical attribute is missing, it creates a brittle, frustrating UX that undermines the ecosystem's data-minimization goals.
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
    RPI1 -->|"`WRPAC + presentation
    request`"| WU
    RPI2 -->|"`WRPAC + presentation
    request`"| WU
    WU -->|"`Validate WRPAC against
    trust anchor from LoTE`"| WU
    WP -->|"`WUA (to PID/Attestation
    Providers only)`"| WU
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
flowchart LR
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
        TA1["`**PID/QEAA Trust Anchor**
        In LoTE/Trusted List, via
        Commission infrastructure`"]
        
        INT1["`**Intermediate signing certificate(s)**
        (optional)`"]
        
        ISS1["`**PID/QEAA Issuer signing key**`"]
        
        SIG1["`**Signature** over the PID/attestation`"]
        
        TA1 --> INT1 --> ISS1 --> SIG1
    end

    subgraph PUB["PuB-EAA Trust Path"]
        TA2["`**PuB-EAA Trust Anchor**
        QTSP Trusted List`"]
        
        QT["`**QTSP signing certificate**`"]
        
        PPC["`**PuB-EAA Provider certificate**`"]
        
        SIG2["`**Signature** over the PuB-EAA`"]
        
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

These questions are tracked as Open Question #15 in §29.

> **Cross-references**: §4.2.2 (WRPAC structure — SCT row), §25.2 (alert triggers — WRPAC SCT and rogue certificate alerts), §24.2 (threat catalogue — WRPAC Private Key Compromise).

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
    actorMargin: 250
---
sequenceDiagram
    autonumber
    participant RPI as 🏦 RP Instance
    participant WU as 📱 Wallet Unit
    participant SL as 📋 Status List<br/>(PID Provider)

    rect rgba(148, 163, 184, 0.14)
    Note right of RPI: Phase 1: Presentation Receipt
    WU->>RPI: Presentation response<br/>(PID + attestation)
    Note right of SL: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end

    rect rgba(52, 152, 219, 0.14)
    Note right of RPI: Phase 2: PID Verification (Wallet Unit Health)
    RPI->>RPI: Verify PID issuer signature
    Note right of RPI: Trust anchor from PID Provider<br/>LoTE (§4.5.3)
    RPI->>SL: Check PID revocation status
    Note right of RPI: TokenStatusList (RFC 9598)<br/>See Annex B.2 for full flow
    SL-->>RPI: Status: VALID
    Note right of RPI: PID valid → Wallet Unit not<br/>revoked (CIR 2024/2977<br/>Art. 5.4(b) cascade obligation)
    RPI->>RPI: Verify device binding
    Note right of RPI: KB-JWT (SD-JWT VC) or<br/>DeviceAuth (mdoc)
    Note right of SL: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end

    rect rgba(46, 204, 113, 0.14)
    Note right of RPI: Phase 3: Attestation Verification
    RPI->>RPI: Verify attestation signatures<br/>& revocation
    RPI->>RPI: Verify combined presentation<br/>binding (if multi-attestation)
    Note right of RPI: Cross-credential cnf.jwk /<br/>deviceKey matching (§15.5.5)
    Note right of SL: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
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
<br/>

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
    actorMargin: 250
---
sequenceDiagram
    autonumber
    participant RPI as 🏦 RP Instance
    participant CTI as 🇪🇺 Common Trust<br/>Infrastructure
    participant LOTE as 📜 LoTE Provider<br/>(MS of PID Provider)

    rect rgba(148, 163, 184, 0.14)
    Note right of RPI: Phase 1: Bootstrapping (one-time, cached)
    RPI->>CTI: Discover LoTE URLs
    Note right of RPI: GET /.well-known/<br/>eudi-trust-infrastructure
    CTI-->>RPI: List of all LoTE/<br/>Trusted List URLs
    RPI->>LOTE: Fetch PID Provider LoTE
    Note right of RPI: Accept: application/<br/>entity-statement+jwt
    LOTE-->>RPI: Signed LoTE:<br/>PID Provider trust anchors<br/>(public keys + identifiers)
    RPI->>RPI: Verify LoTE signature
    RPI->>RPI: Cache trust anchors<br/>(refresh weekly)
    Note right of LOTE: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end

    rect rgba(52, 152, 219, 0.14)
    Note right of RPI: Phase 2: Per-Presentation Verification
    RPI->>RPI: Look up trust anchor for<br/>PID Provider that signed<br/>the presented PID
    RPI->>RPI: Verify PID signature<br/>using the trust anchor
    Note right of RPI: ES256 (SD-JWT VC) or<br/>COSE_Sign1 (mdoc MSO)
    Note right of LOTE: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
```

<details><summary><strong>1. Relying Party Backend discovers LoTE URLs via Member State registry</strong></summary>

As a one-time bootstrapping step, the RP queries the centralised European **Common Trust Infrastructure** — maintained by the European Commission — to discover the authoritative URLs for all Member State Trusted Lists and Lists of Trusted Entities (LoTEs). The Common Trust Infrastructure acts as the DNS root equivalent for the EUDI trust ecosystem: every trust anchor in the system can be traced back through this single entry point.

```http
GET /.well-known/eudi-trust-infrastructure HTTP/1.1
Host: trust.eudiw.eu
Accept: application/json
```

The RP should call this endpoint during initial deployment and periodically thereafter (e.g., weekly) to detect newly participating Member States or URL changes. The response is signed by the European Commission's own key, which the RP must pre-configure as a root trust anchor — this is the one trust decision the RP makes without external validation.
</details>
<details><summary><strong>2. Common Trust Infrastructure returns List of all LoTE/Trusted List URLs</strong></summary>

The Common Trust Infrastructure responds with the official directory mapping each Member State to its respective LoTE publication endpoints. The response includes separate URLs for each LoTE type (§4.5.2):

```json
{
  "member_states": {
    "DE": {
      "pid_provider_lote": "https://eudcc.de/lote/pid-providers",
      "qeaa_trusted_list": "https://eudcc.de/tl/qeaa-providers",
      "qtsp_trusted_list": "https://eudcc.de/tl/qtsp",
      "access_ca_lote": "https://eudcc.de/lote/access-ca",
      "registration_cert_lote": "https://eudcc.de/lote/registration-cert"
    },
    "NL": {
      "pid_provider_lote": "https://eudi.rvig.nl/lote/pid-providers",
      "qeaa_trusted_list": "https://eudi.rvig.nl/tl/qeaa-providers"
    }
  }
}
```

The RP typically needs only the **PID Provider LoTE** and the **QEAA/QTSP Trusted Lists** — the Access CA LoTE and Wallet Provider LoTE are used by Wallet Units and Providers respectively, not by RPs (see §4.5.2 table). For cross-border scenarios, the RP should fetch LoTEs from **all** Member States whose citizens it expects to serve.
</details>
<details><summary><strong>3. Relying Party Backend fetches PID Provider LoTE</strong></summary>

The RP sends an HTTP GET to the specific Member State's PID Provider LoTE endpoint to download the list of authorised PID Providers and their associated public keys. The LoTE is published in the **OpenID Federation** format (OID-FED), where each entity is represented as an Entity Statement JWT:

```http
GET /lote/pid-providers HTTP/1.1
Host: eudcc.de
Accept: application/entity-statement+jwt
```

The RP should include conditional request headers (`If-None-Match` / `If-Modified-Since`) to avoid downloading unchanged LoTEs on subsequent refreshes. For RPs operating across multiple Member States, this step is repeated for each relevant jurisdiction — e.g., a Dutch bank serving German customers fetches both the NL and DE PID Provider LoTEs.

> **Latency consideration**: LoTE fetches add network latency to the bootstrapping process. RPs should fetch LoTEs asynchronously during startup and cache them aggressively, rather than fetching on-demand during presentation verification.
</details>
<details><summary><strong>4. LoTE Provider returns signed LoTE containing PID Provider trust anchors</strong></summary>

The LoTE Provider returns a cryptographically signed document (the LoTE) containing the official trust anchors (public keys and entity identifiers) for all active, legitimate PID Providers in that jurisdiction. OpenID Federation is the standard format, where the payload is an `Entity Statement` JWT:

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

The `jwks.keys` array contains the PID Provider's public keys used for signing PIDs. The `trust_marks` array contains attestations from the Member State that this entity is a notified PID Provider. The `exp` timestamp defines when this Entity Statement expires — the RP must re-fetch before expiry.

> **Multiple PID Providers per MS**: A Member State may have multiple notified PID Providers (e.g., Germany could designate Bundesdruckerei and a second provider). The LoTE contains Entity Statements for all of them. The RP must store all trust anchors and select the correct one at verification time (step 7) based on the `iss` claim in the presented PID.
</details>
<details><summary><strong>5. Relying Party Backend verifies LoTE signature</strong></summary>

Because the LoTE serves as the absolute root of trust for all subsequent User presentations, the Relying Party must cryptographically prove that the downloaded OID-FED Entity Statement was genuinely signed by the authoritative Member State LoTE Provider and has not suffered transit tampering or DNS hijacking.

The RP extracts the `kid` from the JWT header and resolves the LoTE Provider's public key (either pre-configured via the Common Trust Infrastructure or fetched via `.well-known/openid-federation`).

The verification routine must strictly evaluate:
1. **Mathematical Signature**: Verify the JWS signature (usually ES256 or RS256) over the payload.
2. **Temporal Validity**: Ensure the current system time falls strictly between the `iat` (Issued At) and `exp` (Expiration) claims.
3. **Issuer Integrity**: Confirm the `iss` claim exactly matches the officially expected LoTE Provider URI.

```json
// Example Decoded Header of the LoTE Entity Statement
{
  "alg": "ES256",
  "kid": "ms-lote-signing-key-01",
  "typ": "entity-statement+jwt"
}
```

> **Zero-Trust Fallback**: If the LoTE signature fails validation, the RP MUST instantly reject the payload. Caching an unverified LoTE allows an attacker to inject rogue PID Provider trust anchors, entirely subverting the eIDAS 2.0 trust model and allowing the attacker to mint fake PIDs that the RP would blindly accept. In this scenario, the RP should retain its previously cached (known-good) LoTE until the issue resolves.
</details>
<details><summary><strong>6. Relying Party Backend caches trust anchors locally</strong></summary>

Once the LoTE signature is verified, the RP unpacks the `jwks` array from the Entity Statement and securely ingests the trust anchors into its highly-available local cache (e.g., Redis, DynamoDB, or a secure hardware enclave). 

Caching is an absolute architectural necessity. Relying Parties MUST NOT attempt to fetch the LoTE synchronously during a live User presentation, as this introduces unacceptable latency, points of failure, and privacy-leaking metadata to the Member State.

The cache architecture must fulfill highly specific technical constraints:
- **Indexed Lookups**: Keys must be instantly retrievable via an O(1) lookup using a composite identifier `(provider_issuer_uri, key_id)`.
- **TTL Enforcement**: Cached keys must inherit the `exp` timestamp of the parent LoTE Entity Statement. If the cache entry expires, the RP must suspend verifications for that provider until a fresh LoTE is fetched.
- **Differential Updates**: The RP's cron job (fetching the LoTE hourly or daily) must perform a diff against the cache to detect newly added keys, rotated keys, or **revoked/removed providers**. 

```json
// Internal RP Cache Structure Example
{
  "cache_key": "trust_anchor::https://pid-provider.example.de::pid-issuer-key-01",
  "public_key_jwk": {
    "kty": "EC",
    "crv": "P-256",
    "x": "...",
    "y": "..."
  },
  "trust_mark": "eudi_pid_provider",
  "expires_at": 1720000000 
}
```

> **Provider Revocation Handling**: If a previously trusted PID Provider is entirely removed from a newly published LoTE (indicating suspension or compromise), the RP's caching logic must instantly purge or blacklist that provider's keys, immediately halting acceptance of their credentials.
</details>
<details><summary><strong>7. Relying Party Backend looks up trust anchor for PID Provider</strong></summary>

During the live millisecond-window of a User presentation (§7.2 or §11.4), the RP must dynamically pair the incoming credential with its root of trust. The RP extracts the unverified issuer identifier directly from the presented credential and probes its local cache.

- **SD-JWT VC Framework**: The RP parses the unverified Issuer-JWT payload to extract the `iss` (Issuer) claim. It combines this URI with the `kid` from the JWT header to execute a targeted cache lookup.
- **ISO 18013-5 mdoc**: The RP extracts the `issuerAuth` COSE_Sign1 object. Because mdoc relies on X.509, the RP typically extracts the Issuer Distinguished Name (DN) from the embedded `x5chain` leaf certificate and cross-references it against cached Country Signing Certificate Authority (CSCA) roots.

```python
# Pseudo-code for dynamic trust anchor routing
def resolve_trust_anchor(presented_credential):
    issuer_uri = presented_credential.get_claim("iss")
    key_id = presented_credential.header.get("kid")
    
    trust_anchor = cache.get(f"trust_anchor::{issuer_uri}::{key_id}")
    if not trust_anchor or is_expired(trust_anchor):
        raise UntrustedIssuerException("Issuer not present in Member State LoTE")
        
    return trust_anchor
```

> **Cache Miss Mechanics**: If the lookup fails, the RP usually terminates the protocol. However, in highly distributed cross-border scenarios, a cache miss might simply indicate the RP hasn't fetched a specific *foreign* Member State's LoTE yet. Advanced RP implementations may trigger a deferred asynchronous LoTE fetch, though this drastically delays the User UX.
</details>
<details><summary><strong>8. Relying Party Backend verifies PID signature using the trust anchor</strong></summary>

Armed with the fiercely guarded, locally cached trust anchor, the RP executes the definitive cryptographic verification over the User's presented PID.

- **Online (SD-JWT)**: The RP inputs the cached JWK public key and the presented Issuer-JWT into its cryptographic library to verify the ES256 (P-256) signature. This mathematically proves that the exact byte-sequence of the JWT was approved by the PID Provider.
- **Proximity (mdoc)**: The RP inputs the cached CSCA public key to validate the `x5chain` up to the root, and subsequently verifies the COSE_Sign1 signature enveloping the Mobile Security Object (MSO).

```json
// SD-JWT Verification Input
{
  "header": {"alg": "ES256", "kid": "pid-issuer-key-01"},
  "payload": "eyJpc3MiOiJodHRwczovL3BpZC1wcm92aWRlci5leGFtcGxlLmRlIi...[Truncated]",
  "signature_bytes": "[64 bytes of ECDSA r and s]",
  "trust_anchor_jwk": {"kty": "EC", "crv": "P-256", "x": "...", "y": "..."}
}
```

A mathematically successful verification unequivocally proves three systemic truths:
1. **Origin Integrity**: The PID was minted by a legally recognized, Member State–notified PID Provider.
2. **Data Integrity**: The core attributes (Name, DOB) have not suffered a single bit of tampering since issuance.
3. **Chain of Trust**: The unbroken cryptographic link connects the User's credential perfectly back through the PID Provider, the MS LoTE, and ultimately to the European Commission's Common Trust Infrastructure. 

Upon success, the RP safely proceeds to revocation checking and device-binding (PoP) verification.
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
        M0["`**Signed by Issuer**
        (PID/Attestation Provider)`"]
        M1["`Version`"]
        M2["`Digest algorithm (SHA-256)`"]
        M3["`Value digests
        (hash of each data element, per namespace)`"]
        M4["`Device key info
        (public key bound to Wallet Unit)`"]
        M5["`DocType
        e.g. eu.europa.ec.eudi.pid.1`"]
        M6["`Validity info
        (signed, validFrom, validUntil)`"]
        M0 --- M1
        M0 --- M2
        M0 --- M3
        M0 --- M4
        M0 --- M5
        M0 --- M6
    end

    subgraph ISI["IssuerSignedItem[]"]
        I1["`Per-namespace arrays of data elements`"]
        I2["`Each item: digestID, random,
        elementIdentifier, elementValue`"]
        I3["`Selective disclosure by omission
        (omit items not to disclose)`"]
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

```mermaid
---
config:
  themeVariables:
    noteBkgColor: "transparent"
    noteBorderColor: "transparent"
  sequence:
    messageAlign: left
    noteAlign: left
    actorMargin: 250
---
sequenceDiagram
    autonumber
    participant FE as 🌐 RP Frontend
    participant BE as ⚙️ RP Backend
    participant DB as 💾 Session Cache
    participant WU as 📱 Wallet Unit

    rect rgba(148, 163, 184, 0.14)
    Note right of FE: Phase 1: Request & Ephemeral Key Generation
    FE->>BE: Initiate presentation session
    BE->>BE: Generate P-256 ephemeral key pair
    BE->>DB: Store private key (stateful)<br/>TTL: 2-5 mins
    BE->>BE: Inject public key into JAR<br/>(client_metadata.jwks)
    BE-->>FE: Return signed JAR / URL
    Note right of WU: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end

    rect rgba(52, 152, 219, 0.14)
    Note right of FE: Phase 2: Wallet Processing & Encryption
    FE->>WU: Transmit JAR via QR/Link
    WU->>WU: Extract ephemeral public key
    WU->>WU: ECDH-ES key agreement<br/>Derive symmetric CEK
    WU->>WU: Encrypt response to JWE<br/>(A256GCM or A256CBC-HS512)
    Note right of WU: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end

    rect rgba(46, 204, 113, 0.14)
    Note right of FE: Phase 3: Decryption & Forward Secrecy Erasure
    WU->>BE: POST /response<br/>(encrypted JWE)
    BE->>DB: Retrieve ephemeral private key
    DB-->>BE: Returned private key
    BE->>BE: Decrypt JWE to cleartext vp_token
    BE->>DB: Cryptographically erase private key
    Note right of BE: Complete erasure ensures<br/>future forward secrecy
    Note over BE: ⠀
    Note right of WU: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
```

<details><summary><strong>1. RP Frontend initiates presentation session</strong></summary>

The user interaction originates at the RP Frontend (e.g., a web application or mobile app). When a user action requires authentication or attribute sharing (like submitting a loan application or accessing a restricted portal), the frontend issues an asynchronous HTTP request (AJAX/Fetch) to the RP Backend. This API call signals the backend to initialize a secure OpenID4VP presentation session tailored specifically to the required Level of Assurance (LoA) and requested attributes.

```http
POST /api/auth/start-eudi-session HTTP/1.1
Host: eudi.example-bank.de
Content-Type: application/json

{
  "flow": "customer_onboarding",
  "required_loa": "high"
}
```
</details>
<details><summary><strong>2. RP Backend generates P-256 ephemeral key pair</strong></summary>

To cryptographically guarantee **perfect forward secrecy** for the user's highly sensitive attributes (e.g., medical records, financial history), the RP Backend unequivocally eschews static encryption keys. 

Instead, upon session initiation, the backend dynamically generates a volatile, single-use Elliptic Curve (EC) key pair on the NIST P-256 curve (or optionally X25519, if supported by the Wallet ecosystem). This key pair is mathematically linked to the current transaction `state` and will never be used for any other user or session.

```python
# Pseudo-code for ephemeral key generation
from cryptography.hazmat.primitives.asymmetric import ec

# Generate volatile private key in memory
ephemeral_private_key = ec.generate_private_key(ec.SECP256R1())
ephemeral_public_key = ephemeral_private_key.public_key()
```
</details>
<details><summary><strong>3. RP Backend stores private key (stateful/stateless)</strong></summary>

The RP Backend must safely "park" the ephemeral private key while the user interacts with their Wallet, ensuring the key is available when the encrypted payload eventually returns. There are two primary architectural patterns:

- **Stateful (Database/Cache)**: The private key is serialized and temporarily persisted in a high-speed, memory-only cache (e.g., Redis) indexed by the transaction `state` ID. It is assigned a draconian Time-To-Live (TTL) of exactly 5 minutes, ensuring automatic garbage collection if the user abandons the flow.
- **Stateless (JWE Cookie)**: To avoid distributed database synchronization, the Backend wraps the ephemeral private key inside a symmetric AES-256-GCM encrypted JWE (using a master cluster secret) and sets it as an `HttpOnly`, `Secure`, `SameSite=Strict` browser cookie.

```json
// Redis Cache storage model
{
  "key": "session:b78f42a9-c510-4ea7-90c7",
  "value": {
    "private_key_pem": "-----BEGIN EC PRIVATE KEY-----...-----END EC PRIVATE KEY-----",
    "timestamp": 1718301500
  },
  "ttl_seconds": 300
}
```
</details>
<details><summary><strong>4. RP Backend injects public key into JAR</strong></summary>

The RP builds the OpenID4VP JSON-secured Authorization Request (JAR) and surgically injects the *public* half of the ephemeral key pair directly into the JWT header payload. 

Following HAIP specifications, the key is structured as a JSON Web Key (JWK) and embedded under the `client_metadata.jwks.keys` array. Additionally, the RP explicitely advertises its encryption algorithm expectations (e.g., `ECDH-ES` and `A256GCM`) within the `response_encryption_alg` and `response_encryption_enc` fields.

```json
{
  "response_type": "vp_token",
  "client_id": "urn:eudi:wrp:de:bank-example:12345",
  "response_encryption_alg": "ECDH-ES",
  "response_encryption_enc": "A256GCM",
  "client_metadata": {
    "jwks": {
      "keys": [{
        "kty": "EC",
        "crv": "P-256",
        "x": "TCAER19Zvu3OHF4j4W4vfSVoHIP1ILilDls7vCeGemc",
        "y": "ZxjiWWbZMQGHVWKVQ4hbSIirsVfuecCE6t4jT9F2HZQ",
        "use": "enc",
        "kid": "ephemeral-key-01"
      }]
    }
  }
}
```
</details>
<details><summary><strong>5. RP Backend returns signed JAR / URL</strong></summary>

With the ephemeral public key injected, the RP Backend mathematically seals the JAR by signing it with its long-term Access Certificate (WRPAC) private key. 

To prevent URL bloat and QR code density issues, the backend typically stores the bulky JAR payload locally and returns only a lightweight HTTP reference (`request_uri`) back to the frontend, alongside the transaction `client_id`.

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "client_id": "urn:eudi:wrp:de:bank-example:12345",
  "request_uri": "https://eudi.example-bank.de/api/auth/requests/b78f42a9",
  "expires_in": 300
}
```
</details>
<details><summary><strong>6. RP Frontend transmits JAR via QR/Link</strong></summary>

Armed with the `request_uri`, the RP Frontend bridges the 'air gap' to the User's Wallet Unit. 
- In a **Cross-Device Flow** (e.g., laptop to phone), the frontend leverages a library to render the OpenID4VP URI as a high-contrast QR code on the desktop monitor.
- In a **Same-Device Flow** (e.g., mobile browser to mobile wallet), the frontend generates an OS-level deep link (e.g., `eudi-openid4vp://?client_id=...&request_uri=...`) which automatically wakes the locally installed Wallet app.

The user either scans the QR code or clicks the universal button, immediately shifting execution context from the RP's web property entirely into the secure confines of the Wallet Unit.
</details>
<details><summary><strong>7. Wallet Unit extracts ephemeral public key</strong></summary>

Upon intercepting the request URI, the Wallet Unit initiates an outbound outbound fetch to download the complete JAR from the RP's endpoint. After rigorously validating the WRPAC signature enveloping the JAR (proving RP authenticity), the Wallet parses the internal payload.

It isolates the RP's ephemeral public key from the `client_metadata.jwks` array and caches it in isolated memory. This marks the beginning of the cryptographic response phase—the Wallet is now technically capable of encrypting data exclusively for this specific session.
</details>
<details><summary><strong>8. Wallet Unit performs ECDH-ES key agreement</strong></summary>

Following the user's explicit consent to share the requested attributes (e.g., acknowledging the ✅ trust UI), the Wallet Unit mathematically derives the symmetric encryption keys capable of securing the payload in transit. 

Crucially, the Wallet securely generates its *own* ephemeral private/public EC key pair. It then executes the Elliptic Curve Diffie-Hellman Ephemeral Static (`ECDH-ES`) algorithm, combining its own private key with the RP's injected public key to securely derive a shared secret. This secret is subsequently passed through an HKDF (HMAC-based Extract-and-Expand Key Derivation Function) to output the final symmetric Content Encryption Key (CEK).

```text
# ECDH Math
Shared_Secret = (Wallet_Private_Key) * (RP_Public_Key)
CEK = HKDF(Shared_Secret, Algorithm="A256GCM")
```
</details>
<details><summary><strong>9. Wallet Unit encrypts response to JWE</strong></summary>

The Wallet Unit marshals the final authorized payload (the SD-JWT VC `vp_token`, user disclosures, KB-JWT, and `presentation_submission` map). It processes this JSON string through an authenticated encryption cipher (typically `A256GCM`) using the symmetric CEK derived in Step 8.

The output is a tamper-evident, opaque JSON Web Encryption (JWE) token. The Wallet embeds its *own* ephemeral public key inside the JWE header (`epk`) so the RP backend can independently execute the reverse ECDH algorithm to derive the matching decryption key.

```json
{
  "protected": "eyJhbGciOiJFQ0RILUVTIiwiZW5jIjoiQTI1NkdDTSIsImVwayI6eyJrdHkiOiJFQyIsImNydiI6IlAtMjU2IiwieCI6IkwyV1...",
  "iv": "XbO_zUvG5M_oZtZk",
  "ciphertext": "p2xM...[Encrypted_VP_Token]...",
  "tag": "j8E4vM9f8s..."
}
```

This strict architectural mandate guarantees End-to-End Encryption (E2EE) at the application layer, ensuring no intermediate proxy, TLS terminator, or ISP can ever inspect the user's attributes in transit.
</details>
<details><summary><strong>10. Wallet Unit POSTs encrypted JWE to response_uri</strong></summary>

With the payload successfully encrypted into a self-contained JWE, the Wallet Unit transmits it back to the Relying Party. It issues a direct `POST` request to the `response_uri` defined in the original JAR, transmitting the payload securely as `application/x-www-form-urlencoded`.

```http
POST /api/auth/requests/b78f42a9/callback HTTP/1.1
Host: eudi.example-bank.de
Content-Type: application/x-www-form-urlencoded

response=eyJhbGciOiJFQ...[JWE_Payload]...&state=b78f42a9-c510-4ea7-90c7
```

At this precise milestone, the Wallet Unit completes its operational duty and gracefully closes its network connections, handing execution flow entirely back to the Relying Party infrastructure.
</details>
<details><summary><strong>11. RP Backend retrieves ephemeral private key</strong></summary>

The RP Backend API ingests the incoming POST request. To decrypt the JWE, it first desperately requires the ephemeral private key it generated back in Step 2. 

The backend parses the `state` parameter from the HTTP body. Using this correlation identifier, the RP triggers a highly-optimized database retrieval (e.g., querying the Redis cluster `GET session:{state}`). If utilizing stateless architecture, the API gateway decrypts the inbound secure browser cookie to extract the key material.

If the `state` parameter is missing, invalid, or simply expired (exceeding the 5-minute TTL), the RP permanently aborts the process and issues a `400 Bad Request` or `408 Request Timeout`, as decryption is now mathematically impossible.
</details>
<details><summary><strong>12. Session Cache returns private key</strong></summary>

If the session remains valid, the high-speed caching tier successfully returns the serialized ephemeral private key back into the active application memory. 

At this fragile stage, the decrypted key material resides in system RAM. Applications processing EUDI data must be hardened (e.g., disabling core dumps, utilizing secure memory allocators like `mlock()`) to prevent advanced RAM-scraping attacks from harvesting these ephemeral keys while they are actively loaded in the backend context.
</details>
<details><summary><strong>13. RP Backend decrypts JWE to cleartext vp_token</strong></summary>

The RP Backend executes the mirror image of the Wallet's cryptography. 
1. It extracts the Wallet's ephemeral public key (`epk`) from the JWE header.
2. It blends the `epk` with its own restored ephemeral private key via `ECDH-ES`, successfully deriving the exact same symmetric CEK.
3. It utilizes the CEK alongside the Initialization Vector (`iv`) to execute an `A256GCM` decryption pass over the ciphertext.

If the Authentication Tag (`tag`) verification succeeds, the decryption yields the pristine, cleartext `vp_token` containing the user's authentic SD-JWT VC or mdoc presentation.

```json
// Decrypted Output (Cleartext)
{
  "vp_token": "eyJhbGci...[Issuer-JWT]~[Disclosure1]~[KB-JWT]",
  "presentation_submission": {
    "id": "ps_1",
    "definition_id": "kyc_req_01",
    "descriptor_map": [...]
  }
}
```
</details>
<details><summary><strong>14. RP Backend cryptographically erases private key</strong></summary>

The absolute instant the JWE is successfully decrypted, the RP is mathematically mandated to execute a permanent "kill order" on the ephemeral private key. 

The RP issues an aggressive `DEL` command to the Redis cache and explicitly invokes zero-fill operations within the application memory. This irreversible cryptographic erasure guarantees **Perfect Forward Secrecy**: even if state-sponsored attackers compromise the RP's servers and database backups tomorrow, they will find zero key material capable of retroactively decrypting the JWE traffic captured today.

```python
# Pseudo-code for cryptographic erasure
cache.delete(f"session:{state_id}")
del ephemeral_private_key

# Proceed safely to business logic validation
verify_sd_jwt_signatures(cleartext_vp_token)
```

> **Compliance Imperative**: An RP found persisting these ephemeral keys to long-term storage (e.g., within application logs or audit trails) is in catastrophic violation of both HAIP protocols and GDPR data minimization mandates, and subject to severe regulatory penalties.
</details>
<br/>

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
    actorMargin: 250
---
sequenceDiagram
    autonumber
    participant User as 👤 User
    participant Browser as 🌐 Browser
    participant RP as 🏦 RP Instance
    participant WU as 📱 Wallet Unit
    participant SL as 📋 Status List

    rect rgba(148, 163, 184, 0.14)
    Note right of User: Phase 1: Initiation
    User->>Browser: Access RP service
    Browser->>RP: HTTP request
    RP->>RP: Generate nonce, state,<br/>ephemeral ECDH keys
    RP->>RP: Build DCQL query
    RP->>RP: Create JAR (WRPAC key)
    Note right of SL: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end

    rect rgba(52, 152, 219, 0.14)
    Note right of User: Phase 2: Wallet Invocation
    RP-->>Browser: Invoke Wallet via DC API
    Browser->>WU: Forward request to Wallet
    Note right of SL: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end

    rect rgba(46, 204, 113, 0.14)
    Note right of User: Phase 3: Wallet Processing
    WU->>WU: Verify JAR signature (WRPAC)
    WU->>WU: Validate WRPAC chain (LoTE)
    WU->>WU: Check WRPAC revocation
    WU->>WU: Extract RP identity
    WU->>WU: Evaluate disclosure policy
    WU->>User: Display consent screen
    User->>WU: Approve attributes
    WU->>WU: User auth (biometric/PIN)
    WU->>WU: Build vp_token (SD-JWT VC)
    WU->>WU: Encrypt response (JWE)
    Note right of SL: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end

    rect rgba(241, 196, 15, 0.14)
    Note right of User: Phase 4: Response and Verification
    WU->>RP: POST to response_uri
    RP->>RP: Decrypt JWE
    RP->>RP: Verify SD-JWT + KB-JWT
    RP->>SL: Check revocation
    SL-->>RP: VALID
    RP->>RP: Extract disclosed attributes
    RP-->>Browser: Redirect with session
    Browser->>User: Service rendered
    Note right of SL: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
```

<details><summary><strong>1. User accesses Relying Party service via browser</strong></summary>

The User navigates to the Relying Party's web service using their device's browser (Chrome, Safari, Firefox, or Samsung Internet). The User may be initiating a new customer onboarding (§19 CDD), authenticating to an existing account (§13 SCA flow), or accessing a service that requires age or identity verification. This is a standard HTTP navigation — the User does not need to know that EUDI Wallet verification will be involved until the RP triggers it.

> **Same-device prerequisite**: The EUDI Wallet app must be installed on the same device as the browser. If the Wallet is not installed, the browser's DC API will throw a `NotSupportedError`, and the RP should fall back to the cross-device flow (§8.2) or display a "Please install your EUDI Wallet" prompt.
</details>
<details><summary><strong>2. Browser sends HTTP request to Relying Party backend</strong></summary>

The browser sends an HTTP request to the RP's backend (e.g., `GET /login` or `POST /onboarding/start`). The RP's backend determines that EUDI Wallet verification is required for this route — either because it's a protected resource requiring authentication, or because the business logic requires identity data (e.g., KYC). The backend initiates the OpenID4VP session creation process (steps 3–5) and stores the session state server-side, keyed by the `state` parameter.
</details>
<details><summary><strong>3. Relying Party Instance generates nonce, state, and ephemeral ECDH keys</strong></summary>

The RP backend generates three cryptographic parameters for the OpenID4VP session:

1. **`nonce`** — a cryptographically random string (≥ 128 bits of entropy) used for replay protection. This nonce will appear in the Wallet's KB-JWT (step 16), binding the presentation to this specific session. Each session must have a unique nonce.
2. **`state`** — a session correlation token that the RP uses to match the Wallet's response (step 18) back to the original HTTP session. Typically a UUID or opaque token stored server-side alongside the user's browser session.
3. **Ephemeral ECDH key pair** (P-256 curve) — used for forward-secret response encryption. The public key is embedded in the JAR as `response_encryption_jwk` (step 5); the private key is stored server-side and destroyed immediately after JWE decryption (step 19). Using ephemeral keys ensures that even if the RP's long-term WRPAC key is later compromised, past presentation responses cannot be decrypted.

> **Forward secrecy**: The ephemeral ECDH pattern (HAIP 1.0 §5.4) provides per-session forward secrecy. The RP MUST NOT reuse the same ephemeral key pair across multiple sessions.
</details>
<details><summary><strong>4. Relying Party Instance builds DCQL query</strong></summary>

The RP constructs a Digital Credentials Query Language (DCQL) query specifying precisely which credentials and claims are required. DCQL (defined in OID4VP Draft 28+, mandated by HAIP 1.0) replaces the older Presentation Exchange (PEX) format with a simpler, JSON-native query syntax:

- `credentials[].format` — the credential format (`dc+sd-jwt` for SD-JWT VC, `mso_mdoc` for mdoc)
- `credentials[].meta.vct_values` — the credential type (e.g., `eu.europa.ec.eudi.pid.1`)
- `credentials[].claims[].path` — JSONPath-style claim identifiers for requested attributes

The RP should request **only the minimum attributes** needed for its use case (data minimisation — GDPR Art. 5(1)(c)). For example, an age-verification-only RP should request `["age_over_18"]` rather than the full PID. The DCQL query must match the RP's registered intended use (§3.4.4) — the Wallet may check this against the Registrar API.
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

The browser intercepts the DC API call and routes the presentation request to the locally installed EUDI Wallet app. The OS-level handoff mechanism is platform-specific:

- **Android**: The browser invokes the Android Credential Manager API, which discovers registered Wallet apps via their `DigitalCredential` provider declarations. The OS presents a system-managed picker if multiple Wallets are installed.
- **iOS**: The browser invokes `ASAuthorizationController` with a `DigitalCredentialRequest`, which routes to the Wallet app registered for the `openid4vp` protocol.

The User does not see this handoff explicitly — the Wallet app launches directly (or appears in a bottom sheet) with the presentation request pre-loaded. The browser suspends its JavaScript execution until the Wallet returns a response (or the User cancels).
</details>
<details><summary><strong>8. Wallet Unit verifies JAR signature against WRPAC</strong></summary>

The Wallet Unit cryptographically verifies the JAR (JWT-Secured Authorization Request) using the public key from the embedded WRPAC certificate. The verification process:

1. Extract the `x5c` header from the JAR JWS — this contains the WRPAC certificate chain
2. Use the leaf certificate's public key (P-256 ECDSA) to verify the JWS signature over the JAR payload
3. Verify that the `client_id` in the JAR matches the WRPAC's SAN (`dNSName` for `x509_san_dns` scheme, or certificate thumbprint for `x509_hash` scheme)
4. Validate temporal claims: `iat` is recent, `exp` is in the future, `nbf` is in the past

> **If JAR signature verification fails**: The Wallet MUST reject the request silently — it does not display a consent screen or alert the User. A failed JAR signature means the request cannot be trusted at all.
</details>
<details><summary><strong>9. Wallet Unit validates WRPAC certificate chain via LoTE</strong></summary>

The Wallet validates the WRPAC's X.509 certificate chain against the Access CA trust anchor from the national LoTE (§4.5.2). The chain verification steps:

1. Extract the full certificate chain from the `x5c` header (leaf → intermediate → root)
2. Verify each certificate's signature using its parent's public key
3. Confirm the root certificate matches a trust anchor in the Wallet's cached Access CA LoTE
4. Check certificate validity periods (`notBefore`, `notAfter`)
5. Verify key usage constraints (the leaf must be authorised for digital signature)

For same-device flows, the browser additionally verifies that the calling web origin's domain matches the `dNSName` SAN in the WRPAC — this is the **origin binding** check that prevents a malicious website from using a stolen WRPAC.
</details>
<details><summary><strong>10. Wallet Unit checks WRPAC revocation status</strong></summary>

The Wallet checks whether the WRPAC has been suspended or revoked by the issuing Access Certificate Authority. Two mechanisms are supported:

- **OCSP (Online Certificate Status Protocol)** — the Wallet sends a real-time query to the Access CA's OCSP responder URL (from the WRPAC's Authority Information Access extension). Preferred for low-latency checks.
- **CRL (Certificate Revocation List)** — the Wallet downloads and caches the Access CA's CRL (from the WRPAC's CRL Distribution Points extension). Suitable for offline-capable scenarios where the Wallet may have a cached CRL.

> **If WRPAC is revoked**: The Wallet MUST reject the presentation request and inform the User that the requesting service's authentication certificate has been revoked. The User should not be given the option to proceed — a revoked WRPAC means the RP's authorisation to request credentials has been withdrawn.
</details>
<details><summary><strong>11. Wallet Unit extracts Relying Party identity from WRPAC</strong></summary>

The Wallet extracts the RP's human-readable identity from the WRPAC certificate to display on the consent screen (step 13). The identity fields are sourced from the certificate's Subject and Subject Alternative Name extensions:

- **`tradeName`** / **`organizationName`** (Subject) — e.g., *"Example Bank AG"*
- **`dNSName`** (SAN) — the RP's domain, e.g., `verifier.example-bank.de`
- **`serialNumber`** (Subject) — the RP's LEI or national identifier, e.g., `5299001GCLKH6FPVJW75`

If the RP includes a WRPRC (§3.3.1), the Wallet can also extract richer metadata: `srvDescription` (localised service description), `supportURI`, and `intendedUse` definitions. This metadata enriches the consent screen with purpose information and registered contact details.
</details>
<details><summary><strong>12. Wallet Unit evaluates disclosure policy against DCQL request</strong></summary>

The Wallet evaluates the RP's DCQL query against multiple policy layers before presenting the consent screen:

1. **Credential availability** — does the User hold the requested credential type (e.g., PID in `dc+sd-jwt` format)?
2. **Claim availability** — does the held credential contain the requested claims (e.g., `age_over_18`)?
3. **Embedded Disclosure Policy (EDP)** — if the credential has an issuer-embedded disclosure policy (§16.3), does the RP satisfy its restrictions? (e.g., is the RP in the allowed RP identifier list, or does the RP's WRPAC come from an allowed Access CA?)
4. **Registration check** — if a WRPRC is available, do the requested claims match the RP's registered intended use? If not, query the Registrar API (§3.4.4 steps 3–4)
5. **User preferences** — has the User previously configured per-RP or per-attribute disclosure rules?

If any policy check fails irrecoverably (e.g., credential not available, EDP blocks the RP), the Wallet displays an appropriate error screen instead of the consent screen.
</details>
<details><summary><strong>13. Wallet Unit displays consent screen to User</strong></summary>

The Wallet displays a consent screen summarising the presentation request. The screen must include (per Art. 5a(4)(b) and CIR 2024/2979 Art. 5):

- **RP identity** — trade name, domain, and a verified badge (✅) if the WRPAC chain validated successfully
- **Requested attributes** — each attribute listed individually with an on/off toggle (if the Wallet supports granular selective disclosure)
- **Purpose** — the RP's stated purpose for requesting the data (from the WRPRC `srvDescription` or DCQL `purpose` field)
- **Registration status** — ✅ *"Registered for this request"* or ⚠️ *"Not registered"* (from the Registrar check in step 12)
- **Data destination** — where the data will be sent (`response_uri` domain, displayed to the User for transparency)

The consent screen is rendered within the Wallet's secure UI context — not in a browser webview — to prevent the RP from visually spoofing the consent interface.
</details>
<details><summary><strong>14. User approves attribute disclosure</strong></summary>

The User reviews the consent screen and taps to approve sharing the listed attributes. This is the **User sovereignty** step (Art. 5a(4)(b)) — the User can:

- Approve all requested attributes
- Selectively deselect individual attributes (if the Wallet supports granular toggles and the credential format supports selective disclosure)
- Deny the entire request (the Wallet returns `error=access_denied` to the RP)

> **Partial disclosure risk**: If the User deselects required attributes, the RP may reject the incomplete presentation. The Wallet should indicate which attributes are mandatory vs. optional in the DCQL query (using the `required` field), so the User can make an informed decision.
</details>
<details><summary><strong>15. Wallet Unit authenticates User via biometric or PIN</strong></summary>

The Wallet enforces High Level of Assurance (LoA High) by requiring local User authentication to unlock the WSCA (Wallet Secure Cryptographic Application) that protects the credential's private keys. The authentication method depends on the device's capabilities:

- **Biometric** — fingerprint (Touch ID / Android BiometricPrompt), face recognition (Face ID), or iris scan
- **PIN/passcode** — a 6-digit numeric PIN or alphanumeric passcode stored in the device's secure element
- **Device unlock** — on some implementations, the device's existing unlock mechanism (if LoA High compliant) may suffice

The WSCA only releases the private key for signing (step 16) after successful authentication. This ensures that even if the device is stolen, the credential cannot be used without the legitimate User's biometric or PIN. The authentication result is ephemeral — it authorises a single signing operation and expires immediately after.
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

The Wallet encrypts the presentation response (containing the `vp_token`, `presentation_submission`, and `state`) into a JWE using the RP's ephemeral ECDH-ES public key from step 5's `response_encryption_jwk`. The encryption parameters (mandated by HAIP 1.0 §5.4):

- **Key Agreement**: `ECDH-ES` (Elliptic Curve Diffie-Hellman Ephemeral Static) — the Wallet generates its own ephemeral key pair and derives a shared secret with the RP's public key
- **Content Encryption**: `A256GCM` (AES-256 in GCM mode) — provides authenticated encryption with integrity protection
- **Key Encoding**: The JWE header includes the Wallet's ephemeral public key in the `epk` field for the RP to perform the same ECDH key derivation during decryption

The resulting JWE compact serialisation is a single string: `header.encryptedKey.iv.ciphertext.tag`. The encrypted key portion is empty for `ECDH-ES` (the derived key is used directly). This encryption ensures that even if the `response_uri` endpoint is intercepted by a network adversary, the VP Token cannot be decrypted without the RP's ephemeral private key.
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

The RP performs the full cryptographic verification pipeline (§4.4.2 steps 2 and 5):

**Issuer signature (SD-JWT)**:
1. Parse the tilde-delimited SD-JWT string: `Issuer-JWT~Disclosure1~...~DisclosureN~KB-JWT`
2. Extract the Issuer-JWT header, resolve the issuer's public key via the `x5c` chain or `kid` → JWKS lookup
3. Verify the ES256 signature against the PID Provider's trust anchor from the LoTE cache (§4.5.3 step 7)

**Device binding (KB-JWT)**:
1. Extract the KB-JWT (the final segment after the last `~`)
2. Verify the ES256 signature using the `cnf.jwk` public key from the Issuer-JWT payload
3. Validate `aud` matches the RP's `client_id`, `nonce` matches the session nonce (step 3), and `sd_hash` matches the SHA-256 of the Issuer-JWT + Disclosures
4. Check `iat` is within the acceptable window (≤ 300 seconds)

Both signatures must pass for the verification to succeed. See §4.4.2 steps 2 and 5 for the complete verification checklist.
</details>
<details><summary><strong>21. Relying Party Instance checks credential revocation via Status List</strong></summary>

The RP queries the PID Provider's Token Status List using the `status` claim from the Issuer-JWT (§4.4.2 step 3). The RP extracts `status.status_list.uri` and `status.status_list.idx`, fetches the Status List Token JWT from the URI, decompresses the DEFLATE-compressed bitstring, and checks the bit at the specified index. The Status List Token JWT itself is signed by the PID Provider — the RP must verify this signature before trusting the result.

For production deployments, the RP should **cache** the Status List Token with a TTL matching the `exp` claim (typically 15 minutes to 1 hour), avoiding redundant fetches for concurrent verifications of credentials from the same PID Provider. See §B.2.1 for the complete Status List verification procedure.
</details>
<details><summary><strong>22. Status List confirms credential validity to Relying Party Instance</strong></summary>

The Status List check returns bit value `0` (VALID) for the credential's index. As discussed in §4.4.2 step 4, PID validity serves as an indirect Wallet Unit health proxy — the PID Provider is legally obligated (CIR 2024/2977 Art. 5.4(b)) to cascade-revoke PIDs when the underlying WUA is revoked. The RP can therefore trust the presentation pipeline and proceed to attribute extraction.

> **If status is REVOKED (bit = 1)**: The RP MUST reject the presentation entirely. A revoked PID may indicate a compromised Wallet Unit, a deceased User, or a provider-initiated suspension. The RP should log the revocation event and display an appropriate error message.
</details>
<details><summary><strong>23. Relying Party Instance extracts disclosed attributes from SD-JWT</strong></summary>

The RP extracts the plain-text attribute values from the SD-JWT disclosures using the hash-based matching algorithm defined in SD-JWT VC (draft-ietf-oauth-selective-disclosure-jwt §6.2):

1. For each disclosure in the tilde-delimited string, base64url-decode it to obtain `[salt, claim_name, claim_value]`
2. Compute `SHA-256(base64url(disclosure))` to get the digest
3. Find the matching `_sd` array entry in the Issuer-JWT payload — the digest must match exactly
4. If the digest matches, the claim is verified as authentic — extract `claim_name` and `claim_value`

After extraction, the RP has the verified attribute map (e.g., `{"family_name": "Müller", "given_name": "Anna", "birth_date": "1990-03-15", "age_over_18": true}`). The RP feeds these attributes into its business logic layer — CDD onboarding (§19), SCA authentication (§13), age verification, or identity matching.
</details>
<details><summary><strong>24. Relying Party Instance redirects Browser with authenticated session</strong></summary>

The RP backend creates an authenticated session (setting a secure, HttpOnly session cookie) and sends a redirect response to the User's browser. In the same-device DC API flow, the RP's `response_uri` handler returns a `redirect_uri` in the `200 OK` response body — the Wallet passes this back to the browser via the DC API, and the browser navigates to the authenticated page.

The RP should log the completed verification event for audit purposes (§25.3), storing: `session_id`, `presentation_timestamp`, credential type, disclosed attribute names (but NOT values, unless required for the business process), and the verification result (pass/fail per dimension).
</details>
<details><summary><strong>25. Browser renders authenticated service to User</strong></summary>

The User's browser navigates to the RP's authenticated area (e.g., `/dashboard`, `/account`, or `/onboarding/step-2`). The User sees the service rendered with their verified identity — their name displayed in the UI, their account created, or their age verification confirmed. The entire flow — from clicking "Verify Identity" to seeing the authenticated page — typically completes in 5–15 seconds, depending on the User's biometric authentication speed and network latency for the Status List check.

> **User experience**: The same-device flow is the most seamless of all presentation modes — the User never leaves their device, never scans a QR code, and the Wallet appears as a native system dialog. This makes it the preferred flow for mobile-first RPs.
</details>

#### 7.4 Native App RP Integration (iOS/Android)

When the Relying Party is a native mobile application (e.g., a banking app on iOS or Android) rather than a website, it cannot invoke the Wallet using the W3C Digital Credentials API, as that API is strictly constrained to web browsers (`navigator.credentials.get()`). 

Instead, a native RP app must invoke the EUDI Wallet using OS-level Application Links:

1. **Universal Links (iOS) / App Links (Android)**: The Wallet registers a standard `https://` domain (e.g., `https://wallet.example.eu/present`). When the RP app triggers this URL, the mobile OS intercepts the request and launches the Wallet application directly instead of opening a web browser. This is the **strongly recommended** approach as it proves app authenticity to the OS and prevents malicious applications from intercepting the invocation.
2. **Custom URL Schemes (Legacy/Anti-pattern)**: Historically, wallets registered custom schemes (e.g., `eudiw://` or `openid4vp://`), and the RP app would call `eudiw://?client_id=...&request_uri=...`. This is now considered an **anti-pattern** and presents severe security risks (link hijacking), as any malicious app can register the same custom scheme on the device and intercept the presentation request. 

**Flow adaptations for Native RP Apps:**

```mermaid
---
config:
  themeVariables:
    noteBkgColor: "transparent"
    noteBorderColor: "transparent"
  sequence:
    messageAlign: left
    noteAlign: left
    actorMargin: 250
---
sequenceDiagram
    autonumber
    participant RM as 📱 Native RP App
    participant OS as ⚙️ Mobile OS
    participant WU as 🛡️ Wallet App
    participant RB as 🏦 RP Backend

    rect rgba(148, 163, 184, 0.14)
    Note right of RM: Phase 1: Initiation
    RM->>RB: Request presentation session
    RB->>RB: Generate JAR at request_uri
    RB-->>RM: Return client_id & request_uri
    Note right of RB: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end

    rect rgba(52, 152, 219, 0.14)
    Note right of RM: Phase 2: Context Switch via OS
    RM->>OS: Invoke Universal / App Link<br/>(e.g., https://wallet.example.eu/present?...)
    Note right of OS: OS verifies link authenticity
    OS->>WU: Launch Wallet App & pass URL
    WU->>RB: Fetch JAR from request_uri
    RB-->>WU: Return signed JAR
    Note right of RB: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end

    rect rgba(46, 204, 113, 0.14)
    Note right of RM: Phase 3: Consent & Return
    WU->>WU: Request User consent
    WU->>RB: POST encrypted JWE response
    RB-->>WU: HTTP 200 OK
    
    alt Return via Inter-App Link
        WU->>OS: Invoke RP App Link<br/>(e.g., https://rp-app.example.com/callback)
        OS->>RM: Switch back to Native RP App
    else Return via Backend Push
        RB-->>RM: Silent push / WebSocket notification
        Note right of RM: Native RP App resumes<br/>foreground execution
        Note over RM: ⠀
    Note right of RB: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
    Note right of RB: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
```

<details><summary><strong>1. Native RP App requests presentation session</strong></summary>

The Native RP App signals the RP Backend that a user flow requiring attributes (e.g., onboarding, authentication) has been initiated locally.

Before invoking the Wallet, the mobile app (acting as an API client) must first acquire a fresh OpenID4VP request. It issues an authenticated API call to its own backend server to establish a secure context.

```http
POST /api/v1/auth/eudi-session/start HTTP/1.1
Host: api.rp-app.example.com
Authorization: Bearer [App_Session_Token]

{
  "scenario": "loan_application",
  "device_os": "iOS",
  "loa_required": "high"
}
```
</details>
<details><summary><strong>2. RP Backend generates JAR at request_uri</strong></summary>

Unlike a web-based RP which can directly provide a QR code, the Native RP App acts as a frontend client to its own RP Backend. The backend takes the responsibility of securely generating the OpenID4VP JAR, storing it securely, and exposing it at a unique `request_uri`.

The Backend creates a DCQL JSON query, injects an ephemeral P-256 public key for response encryption, and signs the payload with its WRPAC. Instead of transmitting this massive JWT to the mobile app, it creates a lightweight reference URL.

```json
// Backend Internal State mapping
{
  "request_uri_id": "req_88f9a2b",
  "stored_jar": "eyJhbGciOiJFUzI1NiIs...[Signed_JAR]",
  "ephemeral_private_key": "-----BEGIN EC PRIVATE KEY-----...",
  "status": "PENDING"
}
```
</details>
<details><summary><strong>3. RP Backend returns client_id & request_uri</strong></summary>

The backend returns the generated `client_id` (typically the `x509_hash` scheme) and the matching URL where the JAR is stored to the mobile frontend.

```json
// HTTP 200 OK Response to Native App
{
  "client_id": "x509_hash://sha-256/fUMUMhki0LFd6...",
  "request_uri": "https://api.rp-app.example.com/oid4vp/req_88f9a2b",
  "expires_in": 300
}
```

This strict decoupling prevents the mobile app from ever touching the backend's WRPAC private key or the encrypted user response data directly.
</details>
<details><summary><strong>4. Native RP App invokes Universal / App Link</strong></summary>

Once the Native RP App has the `client_id` and `request_uri`, it constructs the Wallet's registered Application Link (e.g., `https://wallet.example.eu/present?client_id=...&request_uri=...`). It then calls the native operating system API to launch it (e.g., `UIApplication.shared.openURL()` on iOS or an Android Intent).

```swift
// iOS Application Link Invocation
let clientId = "x509_hash://sha-256/fUMUMhki0LFd6..."
let requestUri = "https://api.rp-app.example.com/oid4vp/req_88f9a2b"

// Construct the EUDI Wallet Universal Link
if let walletURL = URL(string: "https://wallet.example.eu/present?client_id=\(clientId)&request_uri=\(requestUri)") {
    UIApplication.shared.open(walletURL, options: [:]) { success in
        print("Wallet successfully invoked: \(success)")
    }
}
```
</details>
<details><summary><strong>5. Mobile OS launches Wallet App & passes URL</strong></summary>

Because the Wallet specified its `https:` scheme in its App Association files (Universal Links / Android App Links), the mobile OS guarantees security. It intercepts the HTTP invocation and launches the authenticated, installed Wallet App directly, avoiding browser-based phishing or URI hijacking risks associated with legacy custom schemes. 

```json
// Example apple-app-site-association (AASA) hosted by Wallet Provider
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "ABC123DE45.eu.example.eudiwallet",
        "paths": [ "/present/*" ]
      }
    ]
  }
}
```

The execution context is securely passed, suspending the RP App in the background and foregrounding the Wallet.
</details>
<details><summary><strong>6. Wallet App fetches JAR from request_uri</strong></summary>

The Wallet reads the `request_uri` from the invocation parameters and makes an HTTP GET call to the RP Backend to retrieve the full OpenID4VP payload.

```http
GET /oid4vp/req_88f9a2b HTTP/1.1
Host: api.rp-app.example.com
Accept: application/oauth-authz-req+jwt
User-Agent: EUDI-Wallet/1.0.0 (Android 14)
```

The Wallet enforces strict TLS validation during this fetch. If the RP Backend's TLS certificate does not match the expected domain (or fails public PKI validation), the Wallet terminates the connection immediately to prevent downgrade attacks.
</details>
<details><summary><strong>7. RP Backend returns signed JAR</strong></summary>

The RP Backend serves the cryptographically signed JAR (including the DCQL query and ephemeral public key) back to the Wallet App.

```http
HTTP/1.1 200 OK
Content-Type: application/oauth-authz-req+jwt

eyJhbGciOiJFUzI1NiIsIng1YyI6WyJNSUlC...[Signed_JAR_Payload]
```

At this stage, the Wallet possesses all cryptographic parameters necessary to authenticate the RP (via the `x5c` embedded WRPAC) and to encrypt the eventual response (via the `response_encryption_jwk`).
</details>
<details><summary><strong>8. Wallet App requests User consent</strong></summary>

The Wallet decodes the JAR, checks the requested scope against the RP's registered uses, and renders a secure consent screen (showing the RP name using the WRPAC).

Because the invocation arrived via an OS-level link rather than a web browser, the Wallet cannot rely on `navigator` origin-binding. Instead, it places absolute trust in the structural integrity of the downloaded JAR and visually highlights the RP's legally verified identity (extracted directly from the WRPAC's `Subject` DN) on the device screen.

```json
// Extracted metadata presented on UI
{
  "verified_name": "Example Bank AG",
  "verified_domain": "api.rp-app.example.com",
  "requested_attributes": ["family_name", "given_name"]
}
```
</details>
<details><summary><strong>9. Wallet App POSTs encrypted JWE response</strong></summary>

After obtaining user consent and packing the VP Token, the Wallet App submits the encrypted presentation directly to the RP Backend via the `response_uri` using a background API POST.

```http
POST /oid4vp/callback HTTP/1.1
Host: api.rp-app.example.com
Content-Type: application/x-www-form-urlencoded

response=eyJhbGciOiJFQ0R...[AES_GCM_Encrypted_JWE]&state=af0ifjsldkj
```

This completes the Wallet's cryptographic responsibility. The encrypted payload is safely in the hands of the RP Backend for decryption and business logic validation.
</details>
<details><summary><strong>10. RP Backend responds with HTTP 200 OK</strong></summary>

The RP Backend confirms successful receipt of the JWE payload. Normally, the HTTP body contains a redirect URI indicating where the Wallet should route the user next.

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "redirect_uri": "https://rp-app.example.com/callback/success"
}
```

The backend typically queues the JWE for immediate decryption and validation, subsequently updating its internal state to mark the user's mobile app session as fully "authenticated."
</details>
<details><summary><strong>11. Wallet App invokes RP App Link (Inter-App Routing)</strong></summary>

After a successful POST, the Wallet App normally needs to gracefully return the user to the RP application. Using the RP's own predefined Universal Link (parsed from the `redirect_uri` in step 10), it asks the OS to flip context back to the Native RP App, confirming completion.

```swift
// Wallet executing context switch
let rpDeepLink = URL(string: "https://rp-app.example.com/callback/success")!
UIApplication.shared.open(rpDeepLink, options: [:])
```
</details>
<details><summary><strong>12. Mobile OS switches back to Native RP App</strong></summary>

The OS handles the context switch back, returning control to the original calling application so the user can continue their journey.

Upon resuming foreground execution, the Native RP App queries its backend (e.g., `GET /api/v1/session/status`) to confirm the presentation was successfully processed, completing the login or KYC flow seamlessly.
</details>
<details><summary><strong>13. RP Backend issues Silent Push (Alternative Return)</strong></summary>

Alternatively, the RP Backend, upon detecting the successful `response_uri` submission, can leverage a real-time connection to its Native App (e.g., WebSocket or a Silent Push Notification). 

This awakens the sleeping background application, enabling it to forcefully pull itself to the foreground, achieving the same context return for the user without requiring the Wallet App to strictly orchestrate an App Link.

```json
// Example APNs Silent Push Payload (iOS)
{
  "aps": {
    "content-available": 1
  },
  "eudi_event": "presentation_complete",
  "session_id": "af0ifjsldkj"
}
```
</details>

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
    actorMargin: 250
---
sequenceDiagram
    autonumber
    participant User as 👤 User
    participant Laptop as 💻 Laptop Browser
    participant RP as 🏦 RP Instance
    participant Phone as 📱 Wallet Unit<br/>(smartphone)
    participant SL as 📋 Status List

    rect rgba(148, 163, 184, 0.14)
    Note right of User: Phase 1: QR Code Generation
    User->>Laptop: Access RP service
    Laptop->>RP: HTTP request
    RP->>RP: Generate session, nonce,<br/>ephemeral ECDH keys
    RP->>RP: Create JAR with DCQL query
    RP->>RP: Store JAR at request_uri
    RP-->>Laptop: Render QR code
    Note right of SL: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end

    rect rgba(52, 152, 219, 0.14)
    Note right of User: Phase 2: Cross-Device Connection
    User->>Phone: Scan QR code with camera
    Phone->>RP: POST to request_uri
    RP-->>Phone: Return signed JAR (JWS)
    Note right of Phone: OS performs proximity check
    Note right of SL: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end

    rect rgba(46, 204, 113, 0.14)
    Note right of User: Phase 3: Wallet Processing
    Phone->>Phone: Verify JAR signature (WRPAC)
    Phone->>Phone: Validate WRPAC chain (LoTE)
    Phone->>Phone: Evaluate disclosure policy
    Phone->>User: Display consent screen
    User->>Phone: Approve attributes
    Phone->>Phone: User auth (biometric/PIN)
    Phone->>Phone: Build vp_token (SD-JWT VC)
    Phone->>Phone: Encrypt response (JWE)
    Note right of SL: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end

    rect rgba(241, 196, 15, 0.14)
    Note right of User: Phase 4: Response and Verification
    Phone->>RP: POST to response_uri
    RP->>RP: Decrypt JWE
    RP->>RP: Verify SD-JWT + KB-JWT
    RP->>SL: Check revocation
    SL-->>RP: VALID
    RP->>RP: Extract disclosed attributes
    RP->>RP: Bind to laptop session (state)
    RP-->>Laptop: Push session update
    Laptop->>User: Service rendered
    Note right of SL: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
```

<details><summary><strong>1. User accesses Relying Party service on laptop browser</strong></summary>

The User navigates to the RP's website on a primary device (laptop, desktop, or tablet browser) and encounters a login or identity verification prompt. In the cross-device model, the User's Wallet runs on a **different** device (their smartphone) from the browsing device.

The RP's frontend detects that the W3C Digital Credentials API is either unavailable (browser missing support) or the User is explicitly prioritizing a mobile wallet over a local desktop wallet. It gracefully degrades by offering a dynamic OpenID4VP QR code flow.

```javascript
// RP Frontend detects DC API presence
if (!window.navigator.credentials || !window.navigator.credentials.get) {
    console.log("W3C DC API unavailable. Falling back to Cross-Device QR flow.");
    initiateCrossDeviceQRFlow();
}
```
</details>
<details><summary><strong>2. Laptop Browser sends HTTP request to Relying Party backend</strong></summary>

The browser sends an AJAX or form `POST` to the RP's backend (e.g., `POST /api/verify/start`) to initiate a new verification session. 

This establishes the "waiting" session context on the laptop. The RP's backend immediately provisions a server-side state object representing this specific terminal's authentication attempt.

```http
POST /api/verify/start HTTP/1.1
Host: verifier.example-bank.de
Content-Type: application/json
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)

{
  "flow_type": "cross_device"
}
```
</details>
<details><summary><strong>3. Relying Party Instance generates session, nonce, and ephemeral ECDH keys</strong></summary>

The RP backend generates the cryptographic material for the session:

- **`state`** — a unique opaque identifier (e.g., `xd-session-9f2a`) that binds the QR code session to the laptop browser's HTTP session. This is the cross-device bridge.
- **`nonce`** — a cryptographic random value for replay protection, ensuring the eventual presentation cannot be duplicated.
- **Ephemeral ECDH key pair** — a one-time EC P-256 key pair for ECDH-ES response encryption, guaranteeing perfect forward secrecy for the attribute payload.

```python
# Backend Cryptographic Generation
session_state = generate_secure_random_string(32)
nonce = generate_secure_random_string(32)
ephemeral_private_key = ec.generate_private_key(ec.SECP256R1())
```
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

The RP caches the signed JAR in its backend (database, Redis, or in-memory store) and exposes it at a unique, short-lived endpoint: `https://verifier.example-bank.de/oid4vp/request/f47ac10b`. This `request_uri` is included in the QR code (step 6). The endpoint is single-use — after the Wallet fetches the JAR (step 8), the RP should invalidate the endpoint to prevent replay. The JAR should have a short TTL (e.g., 5 minutes) to limit the window for QR code reuse.
</details>
<details><summary><strong>6. Relying Party Instance renders QR code on laptop browser</strong></summary>

The RP sends the `request_uri` and connection details to the laptop browser, which renders them as a high-contrast OpenID4VP QR code on the screen. 

Crucially, the URI prefix matches the `client_id` scheme (`x509_hash` or `x509_san_dns`) exactly.

```text
openid4vp://authorize?
  request_uri=https://verifier.example-bank.de/oid4vp/request/f47ac10b
  &client_id=x509_hash://sha-256/Aq3B7yU0Vzf8-kJDfOpW2xsL7q5m4R1xNzYh3DAv_tI
```
</details>
<details><summary><strong>7. User scans QR code with smartphone camera</strong></summary>

The User points their smartphone camera (or the EUDI Wallet app's built-in scanner) at the QR code displayed on the laptop screen. The smartphone's OS recognises the `openid4vp://` URI scheme and launches the EUDI Wallet app. 

This physical act is the **cross-device bridge**. Scanning the optical code inherently proves a degree of physical proximity between the smartphone and the requesting laptop, mitigating remote phishing to an extent.
</details>
<details><summary><strong>8. Wallet Unit POSTs to request_uri to fetch JAR</strong></summary>

The Wallet Unit on the smartphone initiates a direct connection to the RP backend using the parsed `request_uri`. For freshness and replay prevention, HAIP mandates this is executed as a POST request.

```http
POST /oid4vp/request/f47ac10b HTTP/1.1
Host: verifier.example-bank.de
Content-Type: application/x-www-form-urlencoded

wallet_nonce=xyz789abc_dynamic_wallet_generated_value
```
</details>
<details><summary><strong>9. Relying Party Instance returns signed JAR to Wallet Unit</strong></summary>

The RP dynamically binds the `wallet_nonce` to the JAR if required, and responds with the signed JWS compact serialisation (`application/oauth-authz-req+jwt`). 

The Wallet receives the complete presentation request containing the DCQL query, RP identity (`x5c` chain), and response encryption keys. 

```http
HTTP/1.1 200 OK
Content-Type: application/oauth-authz-req+jwt

eyJhbGciOiJFUzI1NiIsIng1YyI6WyJNSUlDRXp...[Signed_JAR_Payload]
```

Advanced deployments may leverage OS-level APIs (like BLE ranging) at this stage to establish cryptographic proximity assurance.
</details>
<details><summary><strong>10. Wallet Unit verifies JAR signature against WRPAC</strong></summary>

The Wallet extracts the X.509 certificate chain from the JWS `x5c` header and verifies the JAR's ES256 signature using the WRPAC leaf certificate's public key. 

If the signature is invalid, the Wallet rejects the request immediately — no consent screen is shown. This is the first of a three-step RP authentication sequence.

```python
# Pseudo-code for Wallet JAR verification
wrpac_cert = parse_x5c(jar_header['x5c'])
public_key = wrpac_cert.public_key()
public_key.verify(jar_signature, jar_payload, ec.ECDSA(hashes.SHA256()))
```
</details>
<details><summary><strong>11. Wallet Unit validates WRPAC certificate chain via LoTE</strong></summary>

The Wallet builds and validates the certificate chain: WRPAC leaf → Access CA intermediate → LoTE root trust anchor (§4.5.3). 

Each certificate in the chain is rigorously checked for: 
1. Signature validity (cryptographic chaining)
2. Validity period (`notBefore`/`notAfter`)
3. Revocation status (OCSP or cached CRL)

The Wallet uniquely extracts the RP's legal identity from the WRPAC `Subject` and `SAN` parameters — this is the verified legal entity name displayed to the User later.
</details>
<details><summary><strong>12. Wallet Unit evaluates disclosure policy against DCQL request</strong></summary>

The Wallet evaluates the DCQL query against the credential's embedded disclosure policy (if any). 

The disclosure policy — set by the PID Provider at issuance — may restrict which RPs can receive which attributes, or may require additional conditions (e.g., *"portrait attribute only available in proximity flows"*). If the DCQL requests attributes that violate the policy, those attributes are excluded or the entire request is blocked.

Additionally, if a WRPRC is available, the Wallet cross-checks the requested claims against the WRPRC's `intendedAttributes` scope.
</details>
<details><summary><strong>13. Wallet Unit displays consent screen to User</strong></summary>

The Wallet dynamically renders the consent screen on the smartphone, showing the verified metadata. In the cross-device context, the consent screen appears on the **phone**, not the laptop — the User must actively context-switch between devices to correlate the request with their laptop activity.

```json
// Internal Wallet UI State
{
  "rp_verified_name": "Example Bank AG",
  "rp_verified_domain": "verifier.example-bank.de",
  "requested_attributes": [
    {"claim": "family_name", "mandatory": true},
    {"claim": "given_name", "mandatory": true},
    {"claim": "birth_date", "mandatory": false}
  ],
  "purpose": "Customer Onboarding"
}
```
</details>
<details><summary><strong>14. User approves attribute disclosure</strong></summary>

The User reviews the consent screen on their phone and explicitly taps *"Approve"* (or equivalent UI element). 

This informed consent explicitly covers: 
1. The release of the listed attributes to the identified RP.
2. The encrypted transmission of this data explicitly over the internet to the RP's `response_uri`.
3. The cryptographic binding of the presentation to this specific `nonce`.

This explicit user action is the absolute foundation for GDPR compliance regarding the legal basis for processing user data.
</details>
<details><summary><strong>15. Wallet Unit authenticates User via biometric or PIN</strong></summary>

The Wallet enforces LoA High user authentication by triggering the device's biometric sensor (Face ID, Android BiometricPrompt) or secure PIN entry. 

This authentication unlocks the WSCA (Wallet Secure Cryptographic Application) environment, temporarily releasing the private key bound to the credential's `cnf.jwk`. Without this real-time authentication, the WSCA mathematically refuses to sign the KB-JWT (step 16), ensuring stolen but locked phones cannot leak credentials.
</details>
<details><summary><strong>16. Wallet Unit builds vp_token with SD-JWT VC and KB-JWT</strong></summary>

The Wallet constructs the response payload, selectively disclosing only the approved attributes and generating the Key Binding JWT (KB-JWT) to prove device possession.

```
<Issuer-signed JWT>~<Disclosure:family_name>~<Disclosure:given_name>~<Disclosure:birth_date>~<KB-JWT>
```

The KB-JWT structure strongly enforces the cross-device constraints to prevent interception:
- `aud`: Locks to the cross-device WRPAC hash (`x509_hash://sha-256/Aq3B7yU0Vzf8-...`)
- `nonce`: Echoes the cross-device session nonce (`n-0S6_WzA2Mj731...`), ensuring the response is strictly tied to the laptop's waiting session.
</details>
<details><summary><strong>17. Wallet Unit encrypts response as JWE</strong></summary>

The Wallet fully encrypts the `vp_token` and state payload into a secure JSON Web Encryption (JWE) document using the RP's ephemeral ECDH-ES public key (extracted from `response_encryption_jwk`).

```json
{
  "alg": "ECDH-ES",
  "enc": "A256GCM",
  "kid": "<RP_ephemeral_key_thumbprint>",
  "epk": {
    "kty": "EC",
    "crv": "P-256",
    "x": "<Wallet_ephemeral_X>",
    "y": "<Wallet_ephemeral_Y>"
  }
}
```

This guarantees End-to-End Encryption (E2EE) directly between the mobile Wallet and the RP Backend, preventing any intermediate network nodes or APIs from inspecting the user's data.
</details>
<details><summary><strong>18. Wallet Unit POSTs encrypted response to Relying Party response_uri</strong></summary>

The Wallet safely transfers the encrypted JWE response directly across the internet to the Relying Party's backend `response_uri`.

```http
POST /oid4vp/callback HTTP/1.1
Host: verifier.example-bank.de
Content-Type: application/x-www-form-urlencoded

response=eyJhbGciOiJFQ0RIL...[Encrypted_Data]&state=xd-session-9f2a
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

The RP runs the full SD-JWT VC verification pipeline (§4.4.2): 
1. Verify the Issuer-JWT ES256 signature against the PID Provider's LoTE trust anchor.
2. For each disclosed attribute, compute `SHA-256(base64url(disclosure))` and strictly match it against the `_sd` array hashes.
3. Verify the KB-JWT signature against the `cnf.jwk` public key extracted from the Issuer-JWT.
4. Validate KB-JWT temporal and audience claims.

```python
# KB-JWT Validation Check
def validate_kb_jwt(kb_jwt, expected_nonce, expected_aud):
    claims = decode_jwt_claims(kb_jwt)
    assert claims['nonce'] == expected_nonce
    assert claims['aud'] == expected_aud
    assert valid_timestamp(claims['iat'])
```
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

The Status List bit-array logically returns a bit value `0` (VALID) at the credential's exact index. 

The RP now has mathematically proven cryptographic confidence: the credential was genuinely issued by the Provider, it explicitly is not revoked, the holder legally verified device possession, and the selected disclosures passed full integrity checks.
</details>
<details><summary><strong>23. Relying Party Instance extracts disclosed attributes from SD-JWT</strong></summary>

The RP safely extracts the verified plain-text attribute values from the SD-JWT disclosures and logically maps them into the active user session context.

```json
// Verified attributes mapped to backend session
{
  "session_target": "xd-session-9f2a",
  "verified_identity": {
    "family_name": "Müller",
    "given_name": "Anna"
  },
  "loa_achieved": "high",
  "verification_timestamp": 1741269093
}
```

Only explicitly disclosed attributes are available. The RP mathematically has zero access to undisclosed attributes, successfully upholding the data minimization principle.
</details>
<details><summary><strong>24. Relying Party Instance binds verified attributes to laptop session via state</strong></summary>

The RP backend leverages the `state` parameter (`xd-session-9f2a`) extracted from the decrypted Wallet response to execute a rapid look-up in its session database (e.g., Redis). 

It dynamically merges the verified attribute data into the waiting laptop browser's active session, fundamentally completing the **cross-device bridge**. The mobile phone authenticated the user, and the laptop's original HTTP session inherently inherits the verified identity context.
</details>
<details><summary><strong>25. Relying Party Instance pushes session update to laptop browser</strong></summary>

The RP actively signals the constantly-polling laptop browser that the cross-device authentication flow has successfully concluded. 

This notification utilizes modern bidirectional transport:
- **WebSocket** — Real-time bidirectional push (latency ~50ms).
- **Server-Sent Events (SSE)** — Unidirectional stream.
- **Long polling** — Legacy fallback (`GET /api/verify/status?state=...`).

```http
// Server-Sent Events (SSE) Push
event: auth_success
data: {"redirect_url": "/dashboard/welcome"}
```
</details>
<details><summary><strong>26. Laptop Browser renders authenticated service to User</strong></summary>

Upon detecting the successful session update push, the laptop browser systematically drops the QR code polling screen and immediately redirects to the target secure area (e.g., the user dashboard, a protected document, or stage 2 of onboarding).

```javascript
eventSource.addEventListener('auth_success', function(e) {
  const data = JSON.parse(e.data);
  window.location.href = data.redirect_url; 
});
```

Because the backend session is already populated with the EUDI attributes, the frontend universally renders the personalized experience seamlessly. 
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

```mermaid
flowchart TD
    Start["`**Presentation&nbsp;Request**
    Wallet&nbsp;Unit`"]
    
    S1["`**1.&nbsp;JAR&nbsp;Signature**
    Verify&nbsp;against&nbsp;JWT&nbsp;header&nbsp;public&nbsp;key`"]
    S2["`**2.&nbsp;Cert&nbsp;Chain**
    Validate&nbsp;WRPAC&nbsp;→&nbsp;LoTE&nbsp;trust&nbsp;anchor`"]
    S3["`**3.&nbsp;Revocation**
    Check&nbsp;CRL/OCSP&nbsp;status`"]
    S4["`**4.&nbsp;Origin&nbsp;Check**
    Verify&nbsp;WRPAC&nbsp;dNSName&nbsp;vs.&nbsp;request&nbsp;origin`"]
    S5["`**5.&nbsp;Registration**
    Check&nbsp;WRPRC&nbsp;or&nbsp;Registrar&nbsp;API&nbsp;(Optional)`"]
    S6["`**6.&nbsp;Disclosure&nbsp;Policy**
    Evaluate&nbsp;attributes&nbsp;against&nbsp;WRPAC`"]
    
    Accept["`**✅&nbsp;Proceed&nbsp;to&nbsp;Consent**`"]
    Reject["`**❌&nbsp;Reject&nbsp;Request**`"]

    Start --> S1
    S1 -- "valid" --> S2
    S1 -- "invalid" --> Reject
    S2 -- "valid" --> S3
    S2 -- "invalid" --> Reject
    S3 -- "valid" --> S4
    S3 -- "invalid" --> Reject
    S4 -- "valid" --> S5
    S4 -- "invalid" --> Reject
    S5 -- "valid/skipped" --> S6
    S5 -- "invalid" --> Reject
    S6 -- "valid" --> Accept
    S6 -- "invalid" --> Reject

    style Start text-align:left
    style S1 text-align:left
    style S2 text-align:left
    style S3 text-align:left
    style S4 text-align:left
    style S5 text-align:left
    style S6 text-align:left
    style Accept text-align:left
    style Reject text-align:left
```

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

```mermaid
flowchart LR
    SD("`📱 **Same-device attempt**
    <small>W3C DC API</small>`")
    CD("`💻 ↔️ 📱 **Cross-device fallback**
    <small>QR Code + BLE</small>`")
    MV("`🧑‍💼 **Manual verification**
    <small>Document upload / In-person</small>`")

    SD -- "fails ❌" --> CD
    CD -- "fails ❌" --> MV

    classDef default text-align:left;
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

> **Cross-references**: §24.2 (threat catalogue — RP-Side Attestation Linkability through Over-Identification), §9.9 (ZKP roadmap), Annex B (Status List verification pipeline), §25.3 (audit trail requirements — note: log attribute *names* not values).

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
    
    Iss --> IssVer["`**Phase&nbsp;2:&nbsp;Issuer&nbsp;Processing**
    Extract&nbsp;_sd&nbsp;arrays&nbsp;from&nbsp;verified&nbsp;payload`"]

    Disc --> DiscHash["`**Phase&nbsp;3:&nbsp;Disclosure&nbsp;Hashing**
    Hash&nbsp;raw&nbsp;base64url&nbsp;strings&nbsp;and&nbsp;match&nbsp;against&nbsp;_sd`"]

    KB --> KBVer["`**Phase&nbsp;4:&nbsp;Device&nbsp;Binding**
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

**Phase 1: Parsing and Splitting**
1. Split the raw `vp_token` string by the `~` delimiter. The first element is the Issuer JWT, the last element is the KB-JWT, and all elements in between are Disclosures.

**Phase 2: Issuer Verification**
1. Decode the Issuer JWT header and verify the signature using the PID/Attestation Provider's public key (retrieved via the designated Trust Anchor in the LoTE).
2. Extract the `_sd_alg` claim (which defaults to `sha-256`) and the `_sd` array from the payload.

**Phase 3: Disclosure Array Hashing (Bit-Level)**
For every disclosure string in the input sequence, the RP must independently verify its cryptographic integrity to guarantee the Wallet hasn't fabricated attributes:
1. Base64url-decode the disclosure string. The result is a JSON array: `[<salt>, <claim_name>, <claim_value>]`.
2. **Critical Step**: Re-encode the *identical* Base64url disclosure string. Do not use the parsed JSON to regenerate the string, as whitespace and structural variances will corrupt the hash. Use the raw `<Disclosure>` string as it was received.
3. Compute the hash of the raw disclosure string using the algorithm specified in `_sd_alg` (e.g., `SHA-256("wyz...abc")`).
4. Base64url-encode the resulting byte array.
5. Search for this exact encoded hash within the `_sd` array of the Issuer JWT (or within nested object `_sd` arrays if applicable).
   - *If the hash is found*: The claim is cryptographically authentic. Insert the `<claim_name>` and `<claim_value>` into the verified identity dataset.
   - *If the hash is missing*: The disclosure is fabricated or tampered with. Reject the presentation immediately.

**Phase 4: Key Binding JWT (KB-JWT) Validation**
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


---

## Proximity and Specialized Flows

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
    actorMargin: 250
---
sequenceDiagram
    autonumber
    participant User as 👤 User
    participant WU as 📱 Wallet Unit
    participant Reader as 🖥️ mdoc Reader<br/>(RP terminal)
    participant Agent as 👨‍💼 RP Agent

    rect rgba(148, 163, 184, 0.14)
    Note right of User: Phase 1: Device Engagement
    Agent->>User: Request credential presentation
    User->>WU: Open Wallet, select credential
    WU->>WU: Generate ephemeral EC key pair
    WU->>Reader: NFC tap: DeviceEngagement
    Note right of Agent: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end

    rect rgba(52, 152, 219, 0.14)
    Note right of User: Phase 2: Session and Request
    Reader->>Reader: Generate ephemeral EC key pair
    Reader->>Reader: Derive session keys (ECDH)
    Reader->>WU: BLE: SessionEstablishment +<br/>encrypted DeviceRequest
    Note right of Agent: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end

    rect rgba(46, 204, 113, 0.14)
    Note right of User: Phase 3: Wallet Processing
    WU->>WU: Decrypt DeviceRequest
    WU->>WU: Verify ReaderAuth (WRPAC)
    WU->>WU: Validate WRPAC chain (LoTE)
    WU->>WU: Check WRPAC revocation
    WU->>User: Display consent screen
    User->>WU: Approve attributes
    WU->>WU: User auth (WSCA/WSCD)
    WU->>WU: Build DeviceResponse
    WU->>Reader: BLE: Encrypted DeviceResponse
    Note right of Agent: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end

    rect rgba(241, 196, 15, 0.14)
    Note right of User: Phase 4: Verification
    Reader->>Reader: Decrypt DeviceResponse
    Reader->>Reader: Verify IssuerAuth (MSO sig)
    Reader->>Reader: Verify data element digests
    Reader->>Reader: Verify DeviceAuth
    Reader->>Agent: Display: portrait + attributes
    Agent->>Agent: Visual comparison
    Agent->>Reader: Confirm identity match
    Note right of Agent: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
```

<details><summary><strong>1. RP Agent requests credential presentation from User</strong></summary>

The RP Agent (e.g., a bank teller, border guard, or hotel receptionist) verbally requests the User to present their digital credentials. In supervised flows, the human interaction is a critical trust component — the Agent is performing **visual identity binding** (steps 21–23) that cannot be replicated in unsupervised flows (§11.10). The Agent may specify which credential is needed: *"Please show me your EUDI Wallet identity"* (PID) or *"Can I see your digital driving licence?"* (mDL).

> **Supervised vs. unsupervised context**: The Agent's physical presence enables threat mitigations unavailable to automated terminals — the Agent can detect suspicious behaviour (e.g., someone else's phone, distressed User), request additional verification, or refuse service. This human-in-the-loop model provides the highest assurance level for proximity flows.
</details>
<details><summary><strong>2. User opens Wallet Unit and selects credential</strong></summary>

The User opens their EUDI Wallet app and navigates to the credential requested by the Agent. The Wallet should provide a "ready to present" mode that pre-selects the most commonly used credential (typically PID) and prepares the NFC interface. On some implementations, the User may simply hold their device near the Reader without explicitly opening the Wallet — the OS intercepts the NFC field and launches the Wallet automatically (similar to contactless payment UX).

> **Credential selection**: If the User holds multiple credentials of the same type (e.g., a national PID and an mDL, both containing `family_name`), the Wallet should prompt the User to choose which credential to present. The selection happens before NFC engagement (step 4), ensuring the correct ephemeral keys are generated for the selected credential.
</details>
<details><summary><strong>3. Wallet Unit generates ephemeral EC key pair</strong></summary>

The Wallet generates a fresh ephemeral Elliptic Curve key pair (P-256 / NIST Curve) for this specific transaction. The public key will be transmitted in the `DeviceEngagement` structure (step 4), and the private key will be used for ECDH key agreement (step 6, Wallet side). The key pair is:

- **Ephemeral** — generated per-session and destroyed after the transaction completes
- **Forward-secret** — compromise of the Wallet's long-term credential key does not reveal past session keys
- **COSE_Key encoded** — the public key is serialised as a COSE_Key map (`kty: 2 (EC2), crv: 1 (P-256), x: ..., y: ...`) for embedding in the `DeviceEngagement` CBOR structure

The private key never leaves the device's secure enclave (WSCA/WSCD boundary). The ephemeral key pair is distinct from the credential's device key — the credential key signs the `DeviceAuth` (step 15), while the ephemeral key enables encrypted transport.
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

The mdoc Reader terminal generates its own ephemeral P-256 key pair upon receiving the `DeviceEngagement`. The Reader's ephemeral public key will be transmitted to the Wallet inside the `SessionEstablishment` message (step 7), enabling both parties to perform the ECDH key agreement. Like the Wallet's key (step 3), this key pair is single-use and destroyed after the transaction.

> **Terminal key management**: In supervised flows, the Reader terminal is typically a dedicated hardware device (e.g., HID Global, Veridos, or Thales terminal) with a hardware security module (HSM) or secure element for ephemeral key generation. This ensures the Reader's private key is never exposed to the terminal's general-purpose OS.
</details>
<details><summary><strong>6. mdoc Reader derives symmetric session keys via ECDH</strong></summary>

The Reader performs ECDH key agreement using its private ephemeral key and the Wallet's ephemeral public key (received in step 4's `DeviceEngagement`). The shared secret is fed through HKDF (HMAC-based Key Derivation Function) with the `SessionTranscript` as context to derive two symmetric keys (ISO 18013-5 §9.1.1.5):

- **SKDevice** — the key the Wallet uses to encrypt data sent to the Reader (used in step 16)
- **SKReader** — the key the Reader uses to encrypt data sent to the Wallet (used in step 7)

The `SessionTranscript` is a CBOR array containing: `[DeviceEngagementBytes, EReaderKeyBytes, Handover]`. This transcript is also used as the `external_aad` (additional authenticated data) for AES-GCM, binding the encryption to this specific session's handshake parameters and preventing replay attacks.
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

The Wallet performs the same ECDH + HKDF key derivation as the Reader (step 6), using its own ephemeral private key and the Reader's ephemeral public key (received in the `SessionEstablishment` message). The Wallet uses the derived `SKReader` key to decrypt the AES-256-GCM encrypted `DeviceRequest`. The `SessionTranscript` serves as additional authenticated data (AAD), ensuring the ciphertext is bound to this specific session.

> **If decryption fails**: The Wallet should terminate the BLE session. Decryption failure may indicate a man-in-the-middle attack, a corrupted NFC handshake, or an incompatible cipher suite.
</details>
<details><summary><strong>9. Wallet Unit verifies ReaderAuth COSE_Sign1 signature (WRPAC)</strong></summary>

The Wallet verifies the `readerAuth` COSE_Sign1 signature from the `DeviceRequest` (step 7). The verification process:

1. Extract the WRPAC certificate chain from the `x5chain` (label 33) unprotected header
2. Use the leaf certificate's public key to verify the COSE_Sign1 ES256 signature over the `ItemsRequest` CBOR
3. Verify that the signed `ItemsRequest` matches the decrypted `itemsRequest` — this ensures the Reader signed the exact attributes it is requesting
4. Extract the RP's identity from the WRPAC certificate (Subject: `organizationName`, `tradeName`; SAN: `dNSName`)

The `readerAuth` is the mdoc equivalent of the JAR signature in OpenID4VP — it proves the Reader terminal possesses a valid WRPAC and authenticates the RP to the Wallet.

> **readerAuth is optional in ISO 18013-5 but mandatory in EUDI**: The ARF requires Reader Authentication (via WRPAC) for all RP-to-Wallet interactions. Without `readerAuth`, the Wallet would have no way to verify which RP is requesting credentials.
</details>
<details><summary><strong>10. Wallet Unit validates WRPAC certificate chain via LoTE</strong></summary>

The Wallet validates the WRPAC certificate chain (extracted in step 9) against the Access CA trust anchor from the national LoTE. The validation follows the same 5-step process as §7.2 step 9:

1. Verify each certificate's signature in the chain (leaf → intermediate → root)
2. Confirm the root certificate matches a trust anchor in the Wallet's cached Access CA LoTE
3. Check certificate validity periods (`notBefore`, `notAfter`)
4. Verify key usage constraints and Extended Key Usage (if applicable)

For proximity flows, the Wallet may be operating with **limited or no internet connectivity** (e.g., underground border checkpoint). The Wallet must therefore rely on its locally cached LoTE — this cache should be refreshed whenever the device is online. If the cache is stale, the Wallet should display a warning but may still proceed based on a configurable grace period.
</details>
<details><summary><strong>11. Wallet Unit checks WRPAC revocation status</strong></summary>

The Wallet checks whether the Reader terminal's WRPAC has been revoked via OCSP or CRL, identical to §7.2 step 10. In proximity scenarios, two challenges arise:

- **Offline environments**: If the Wallet has no internet connectivity, it cannot perform a live OCSP query. The Wallet should use a **stapled OCSP response** (if the Reader provides one in the `DeviceRequest`) or fall back to a cached CRL. If no revocation check is possible, the Wallet should proceed with a warning to the User.
- **Terminal fleet management**: Supervised terminals (e.g., bank teller terminals, border e-gates) often share a single WRPAC across a fleet. If one terminal is compromised, the WRPAC revocation affects the entire fleet. RPs with large terminal deployments should consider per-terminal WRPACs to limit blast radius.

> **If WRPAC is revoked**: The Wallet MUST reject the request and display an alert: *"This terminal's certificate has been revoked."* In a supervised flow, the Agent may need to escalate to an alternative verification method (e.g., physical document inspection).
</details>
<details><summary><strong>12. Wallet Unit displays consent screen to User</strong></summary>

The Wallet displays a consent screen showing the Reader terminal's verified identity and the specifically requested attributes. In supervised proximity flows, the consent screen typically includes:

- **RP identity** — organisation name from the WRPAC (e.g., *"Bundespolizei"* or *"Example Bank AG"*) with a ✅ badge if the chain validated successfully
- **Requested attributes** — each data element listed (e.g., `family_name`, `given_name`, `portrait`, `birth_date`)
- **`IntentToRetain` flag** — if the Reader set `IntentToRetain: true` for any attribute (as in step 7's `DeviceRequest`), the Wallet should prominently disclose this: ⚠️ *"This terminal intends to store your data"*
- **Connection type** — *"NFC/BLE Proximity"* to distinguish from remote flows

The consent screen appears on the User's smartphone while the Agent waits. In high-throughput supervised scenarios (e.g., border control), the User should be able to approve quickly — the Wallet should pre-expand the attribute list rather than requiring interaction to view it.
</details>
<details><summary><strong>13. User approves attribute disclosure</strong></summary>

The User reviews the consent screen and taps to approve sharing the listed attributes. In supervised flows, the User is aware that the Agent will perform a visual comparison (steps 21–22), so the `portrait` attribute is typically expected. Unlike remote flows, the User cannot selectively deselect individual attributes in many mdoc Wallet implementations — the consent is all-or-nothing for the requested `nameSpaces`.

> **If the User denies consent**: The Wallet sends a `DeviceResponse` with `status: 10` (general error) or terminates the BLE session. The Agent may ask the User to present a physical document instead.
</details>
<details><summary><strong>14. Wallet Unit authenticates User via WSCA/WSCD</strong></summary>

The Wallet requires the User to authenticate via the device's WSCA (Wallet Secure Cryptographic Application) to unlock the credential's device key for signing. The authentication method (biometric or PIN) depends on the device configuration and the LoA required. The WSCA operates within the WSCD (Wallet Secure Cryptographic Device) boundary — typically the device's TEE (Trusted Execution Environment) or SE (Secure Element):

- **TEE-backed**: The biometric check and key release happen entirely within the TEE (e.g., Android StrongBox, Apple Secure Enclave). The Wallet app receives only a success/failure signal.
- **SE-backed**: The key material is stored in a discrete hardware secure element. The SE requires a PIN or biometric confirmation via the TEE before releasing the signing capability.

The WSCA authorises a single `COSE_Sign1` operation (step 15) and immediately revokes the key access. This ensures that even if the Wallet app is compromised, the device key cannot be used without User authentication.
</details>
<details><summary><strong>15. Wallet Unit builds DeviceResponse with DeviceAuth signature</strong></summary>

The Wallet constructs the `DeviceResponse` CBOR structure containing: (a) the issuer-signed attributes (`issuerSigned.nameSpaces`) with their per-element random salts, and (b) the `deviceAuth.deviceSignature` — a COSE_Sign1 over the `DeviceAuthentication` CBOR structure.

The `DeviceAuthentication` structure binds the response to this specific session:

```
DeviceAuthentication = [
  "DeviceAuthentication",     ; context string
  SessionTranscript,          ; [DeviceEngagement, EReaderKey, Handover]
  "eu.europa.ec.eudi.pid.1",  ; docType
  DeviceNameSpacesBytes       ; CBOR-encoded device-signed nameSpaces (empty for PID)
]
```

The Wallet signs this structure using the credential's device key (the key bound to the MSO's `deviceKeyInfo`) via the WSCA. The Reader will verify this signature (step 20) to confirm that the presenting device possesses the private key that the PID Provider originally bound to the credential during issuance.
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

The Reader decrypts the `DeviceResponse` using `SKDevice` — the symmetric key derived in step 6 from the ECDH key agreement. The decryption uses AES-256-GCM with the `SessionTranscript` as additional authenticated data (AAD). Upon successful decryption, the Reader obtains the plaintext CBOR containing the `documents` array with the issuer-signed attributes and device authentication data.

> **BLE transfer characteristics**: The `DeviceResponse` may exceed the BLE MTU (Maximum Transmission Unit, typically 512 bytes). ISO 18013-5 §8.3.3.1 defines a chunking protocol where the response is split across multiple BLE characteristic writes. The Reader must reassemble the chunks before decryption.
</details>
<details><summary><strong>18. mdoc Reader verifies IssuerAuth MSO signature</strong></summary>

The Reader verifies the `issuerAuth` COSE_Sign1 signature within the `DeviceResponse`. This is the mdoc equivalent of SD-JWT issuer signature verification — it proves the credential was legitimately issued by a notified PID Provider:

1. Extract the MSO (MobileSecurityObject) from the COSE_Sign1 payload
2. Extract the PID Provider's signing certificate from the `x5chain` unprotected header
3. Verify the COSE_Sign1 ES256 signature using the PID Provider's public key
4. Validate the certificate chain against the PID Provider LoTE trust anchor (§4.5.3)
5. Check MSO `validityInfo`: `signed` timestamp, `validFrom` ≤ now ≤ `validUntil`

In online-connected supervised terminals, the Reader can perform the LoTE lookup in real-time. For offline terminals (e.g., border checkpoints with intermittent connectivity), the Reader must use a cached copy of the PID Provider LoTE, refreshed during its last online maintenance window.

> **If IssuerAuth verification fails**: The Reader MUST display a clear error on the Agent's screen (e.g., ❌ *"Credential issuer signature invalid — document cannot be trusted"*). The Agent should not accept the credential and should escalate to physical document verification.
</details>
<details><summary><strong>19. mdoc Reader verifies data element digests</strong></summary>

For each `IssuerSignedItem` in the `issuerSigned.nameSpaces`, the Reader verifies that the attribute value was not tampered with after issuance. The verification process (ISO 18013-5 §9.3.1):

1. Re-encode the `IssuerSignedItem` as CBOR (tagged with CBOR tag 24)
2. Compute `SHA-256` over the re-encoded CBOR bytes
3. Look up the corresponding `digestID` in the MSO's `valueDigests` map for the matching `nameSpace`
4. Compare the computed digest with the MSO digest — they must match exactly

This per-element digest verification enables **selective disclosure** in the mdoc format: the Wallet only transmits the `IssuerSignedItem` entries for the attributes the User consented to share. Attributes not disclosed are represented only by their digest in the MSO — the Reader cannot reconstruct undisclosed values from the digest alone.

> **Digest mismatch**: If any digest does not match, the specific attribute has been tampered with. The Reader should flag the invalid attribute and display a warning to the Agent while still showing successfully verified attributes.
</details>
<details><summary><strong>20. mdoc Reader verifies DeviceAuth signature over SessionTranscript</strong></summary>

The Reader verifies the `deviceSignature` COSE_Sign1 to prove the presenting device possesses the private key bound to this credential at issuance. The verification:

1. Reconstruct the `DeviceAuthentication` CBOR array: `["DeviceAuthentication", SessionTranscript, docType, DeviceNameSpaceBytes]`
2. Extract the `deviceKey` public key from the MSO's `deviceKeyInfo` field
3. Verify the COSE_Sign1 ES256 signature over the `DeviceAuthentication` structure using the `deviceKey`

This is the mdoc equivalent of KB-JWT verification in SD-JWT VC — it proves: (a) the device presenting the credential now is the same device that received it from the PID Provider, (b) the presentation is bound to this specific session via the `SessionTranscript`, and (c) the credential has not been cloned or forwarded to another device.

> **If DeviceAuth verification fails**: This is a critical security failure indicating potential credential cloning, forwarding, or relay attack. The Reader MUST reject the presentation and should log a security alert. The Agent should request physical document verification and may need to report the incident.
</details>
<details><summary><strong>21. mdoc Reader displays portrait and verified attributes to RP Agent</strong></summary>

Once all cryptographic verifications pass (steps 18–20), the Reader terminal renders the verified attributes on the Agent's screen. The display includes:

- **Portrait photograph** — displayed prominently in high resolution for visual comparison (step 22)
- **Personal attributes** — `family_name`, `given_name`, `birth_date`, formatted according to the locale
- **Verification status** — green indicators (✅) for each passing verification dimension (issuer signature, digest integrity, device binding)
- **Credential metadata** — PID Provider name, issuance date, validity period

The terminal display should be positioned so that only the Agent can see it — showing the User's portrait and personal data on a public-facing screen would violate privacy principles. Some terminal implementations use a secondary screen visible only from the Agent's position.
</details>
<details><summary><strong>22. RP Agent visually compares portrait against User</strong></summary>

The Agent performs the **human-in-the-loop identity binding** that distinguishes supervised from unsupervised flows. The Agent visually compares the displayed high-resolution portrait photograph against the physical appearance of the User standing before them. This visual check verifies what cryptography alone cannot — that the person operating the device is the same person whose PID was issued by the PID Provider.

The visual comparison addresses threats that device-binding alone cannot mitigate:
- **Coerced presentation** — the User may be forced to unlock their device under duress
- **Shoulder-surfing PIN theft** — an attacker who observed the User's PIN could operate the Wallet
- **Device theft with biometric bypass** — theoretical bypass of biometric authentication (e.g., sleeping user, prosthetic fingerprint)

> **Accessibility considerations**: For users with facial differences, the Agent should exercise professional judgement and may request additional verification (e.g., asking the User to confirm their date of birth verbally). The portrait comparison should not be the sole identity binding mechanism for accessibility reasons.
</details>
<details><summary><strong>23. RP Agent confirms identity match on terminal</strong></summary>

The Agent taps "Confirm" on the terminal to record that the visual comparison was successful. This confirmation has dual significance:

1. **Verification completion** — the terminal records the verified identity and applies the RP's business rules (e.g., grant access, onboard customer, pass border control)
2. **Audit trail** — the terminal logs: timestamp, WRPAC identifier, credential `docType`, Agent identifier (if applicable), verification result (pass), and which attributes were disclosed. The Agent's confirmation is itself evidence of the human verification step.

The terminal should NOT store the portrait photograph or attribute values beyond the immediate verification session unless the RP's data retention policy explicitly requires it (e.g., KYC onboarding per §19 requires retained identity records). For transient verifications (e.g., age checks at a venue), the attributes should be discarded immediately after the Agent's confirmation.

> **End of proximity session**: After confirmation, the BLE session is terminated, both ephemeral key pairs are destroyed, and the symmetric session keys are purged. The next verification requires a fresh NFC handshake and new ephemeral keys.
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
    actorMargin: 250
---
sequenceDiagram
    autonumber
    participant User as 👤 User
    participant WU as 📱 Wallet Unit
    participant Terminal as 🖥️ Automated Terminal<br/>(e-gate / kiosk)

    rect rgba(148, 163, 184, 0.14)
    Note right of User: Device Engagement (NFC)
    User->>Terminal: Approach terminal
    Terminal->>Terminal: Display "Tap your device"
    User->>WU: Open Wallet
    WU->>Terminal: NFC tap: DeviceEngagement<br/>(ephPubKey + BLE UUID)
    Note right of Terminal: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end

    rect rgba(52, 152, 219, 0.14)
    Note right of User: Session and Request
    Terminal->>Terminal: Generate ephemeral key
    Terminal->>Terminal: Derive session keys (ECDH)
    Terminal->>WU: BLE: DeviceRequest<br/>DocType: eu.europa.ec.eudi.pid.1<br/>Elements: age_over_18: true<br/>ReaderAuth: COSE_Sign1 (WRPAC)
    Note right of Terminal: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end

    rect rgba(46, 204, 113, 0.14)
    Note right of User: Wallet Processing (automated)
    WU->>WU: Verify WRPAC chain
    WU->>User: Consent: "Age check<br/>at Kiosk Terminal 7?"
    User->>WU: Approve (biometric/PIN)
    WU->>Terminal: BLE: DeviceResponse<br/>(age_over_18: true only)
    Note right of Terminal: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end

    rect rgba(241, 196, 15, 0.14)
    Note right of User: Automated Decision
    Terminal->>Terminal: Verify IssuerAuth
    Terminal->>Terminal: Verify DeviceAuth
    Terminal->>Terminal: Check: age_over_18 == true
    Terminal->>Terminal: GRANT ACCESS / DENY
    Terminal->>User: Visual indicator<br/>(green light / barrier opens)
    Note right of Terminal: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
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
    actorMargin: 250
---
sequenceDiagram
    autonumber
    participant VU as 👤 Verifier User
    participant VW as 📱 Verifier Wallet<br/>(mdoc Reader role)
    participant HW as 📱 Holder Wallet<br/>(mdoc role)
    participant HU as 👤 Holder User

    rect rgba(148, 163, 184, 0.14)
    Note right of VU: Phase 1: Initialization
    VU->>VW: Activate W2W mode
    VW->>VU: Warning: "W2W should<br/>only be used with natural<br/>persons you trust"
    VU->>VW: Select role: Verifier
    HU->>HW: Activate W2W mode
    HW->>HU: Same warning displayed
    HU->>HW: Select role: Holder
    Note right of HU: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end

    rect rgba(52, 152, 219, 0.14)
    Note right of VU: Phase 2: PresentationOffer and Engagement
    HW->>HU: Display available<br/>attestations and attributes
    HU->>HW: Select attributes to offer
    HW->>HW: Build PresentationOffer CBOR
    HW->>VW: QR code: DeviceEngagement<br/>(ephPubKey + BLE UUID +<br/>PresentationOffer at key -1)
    Note right of HU: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end

    rect rgba(46, 204, 113, 0.14)
    Note right of VU: Phase 3: Request and Presentation
    VW->>VU: Display offered attributes
    VU->>VW: Select subset to request<br/>(must be subset of offer)
    VW->>HW: BLE: DeviceRequest<br/>(NO ReaderAuth,<br/>all IntentToRetain = false)
    HW->>HW: Validate request is<br/>subset of PresentationOffer
    HW->>HU: Consent screen
    HU->>HW: Approve + authenticate
    HW->>VW: BLE: DeviceResponse<br/>(IssuerSigned + DeviceAuth)
    Note right of HU: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end

    rect rgba(241, 196, 15, 0.14)
    Note right of VU: Phase 4: Verification
    VW->>VW: Verify IssuerAuth (MSO)
    VW->>VW: Verify DeviceAuth
    VW->>VW: Verify PID validity<br/>(implies valid Wallet Unit)
    VW->>VU: Display verified attributes
    Note right of VW: Data NOT persisted<br/>(IntentToRetain = false)
    Note right of HU: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
```

<details><summary><strong>1. Verifier User activates W2W mode</strong></summary>

The Verifier User manually toggles their EUDI Wallet into Wallet-to-Wallet (W2W) mode via a dedicated menu option. This mode transforms the Wallet into a mobile mdoc Reader (ISO 18013-5 §8.3.3) — the same role that a stationary RP terminal plays in supervised proximity flows (§11.4), but running on a citizen's smartphone instead of dedicated hardware. The W2W feature is defined in TS9 and is the only mechanism that allows a natural person (not a registered RP) to verify another person's credentials.

> **W2W is mdoc-only**: TS9 §1.2 explicitly restricts W2W to the mdoc format — SD-JWT VC is not supported. This means the Verifier Wallet must implement the mdoc Reader protocol (CBOR decoding, COSE_Sign1 verification, ECDH key agreement) in addition to the standard Holder functions.
</details>
<details><summary><strong>2. Verifier Wallet displays a mandatory trust warning</strong></summary>

Before allowing verification, the Verifier Wallet displays a mandatory security warning: *"Wallet-to-Wallet verification should only be used with natural persons you trust. The person presenting their credentials will not be able to verify your identity."* This warning is a regulatory countermeasure to prevent W2W from being abused as a data harvesting channel — since the Verifier has no WRPAC (STS9_30), the Holder cannot cryptographically authenticate the Verifier's identity.

The warning must be displayed on every W2W session — it cannot be dismissed permanently or hidden behind a "don't show again" toggle. This ensures informed consent from both parties in every interaction.
</details>
<details><summary><strong>3. Verifier User selects the Verifier role</strong></summary>

The Verifier User explicitly selects the "Verifier" role, which initialises the BLE peripheral listener and (optionally) the NFC reader interface. The Wallet begins advertising its BLE service UUID so the Holder's device can discover it after the QR code scan (step 10). The Verifier's device now waits for the Holder to initiate the engagement.

> **Rate limiting**: The Wallet enforces per-device rate limits (STS9_31/32) — max 5 requests per hour, 20 per day, and 50 per week (sliding windows). This prevents a compromised or malicious Wallet from mass-querying credentials. If the rate limit is exceeded, the Wallet refuses to enter Verifier mode.
</details>
<details><summary><strong>4. Holder User activates W2W mode</strong></summary>

In parallel, the Holder User activates the W2W module in their own Wallet. The Holder's experience is similar to standard proximity presentation (§11.4 step 2), but with the critical awareness that the Verifier is a natural person — not a registered RP with institutional accountability. This distinction is reinforced by the warning in step 5.
</details>
<details><summary><strong>5. Holder Wallet displays a mandatory trust warning</strong></summary>

The Holder Wallet displays a complementary warning: *"You are about to share your credentials with another person. This person cannot be verified — they have no registered identity. Only share data with people you trust."* Unlike RP flows where the WRPAC provides cryptographic identity assurance, W2W interactions rely entirely on the Holder's out-of-band trust in the Verifier (physical presence, personal relationship).

> **No WRPAC = no RP identity**: The Holder-side warning emphasises that the Verifier cannot be authenticated. In standard RP flows (§7.2, §11.4), the Wallet validates the RP's WRPAC before showing the consent screen. In W2W, no such validation is possible — the Holder must rely on personal judgement.
</details>
<details><summary><strong>6. Holder User selects the Holder role</strong></summary>

The Holder User selects the "Holder" role, which prompts the Wallet to enumerate all valid credentials from its secure storage (WSCA boundary). Unlike RP flows where the Verifier's DCQL query determines which credentials are relevant, in W2W the Holder proactively chooses what to offer — this is the **Holder-driven disclosure** model unique to TS9.
</details>
<details><summary><strong>7. Holder Wallet displays available attestations and attributes</strong></summary>

The Holder Wallet queries its secure storage and displays a list of all valid credentials and their individual attributes. The Wallet shows each credential type (PID, mDL, QEAA) with expandable attribute lists. Only mdoc-format credentials are eligible (TS9 §1.2) — SD-JWT VC credentials are filtered out of the W2W interface.

> **Offline readiness**: Since W2W operates in proximity (BLE), the Holder's Wallet must be able to enumerate credentials and construct the `PresentationOffer` without internet connectivity. All credential metadata must be locally cached.
</details>
<details><summary><strong>8. Holder User selects attributes to offer</strong></summary>

The Holder User manually selects the specific attributes they are willing to share. This **reverses the standard RP flow**: in RP interactions (§7.2, §11.4), the RP specifies which attributes it needs via a DCQL query or `DeviceRequest`, and the Holder approves. In W2W, the Holder proactively builds an "offer" defining the maximum disclosure boundary — the Verifier can then select a subset (step 12) but cannot request anything outside the offer.

This Holder-first design is a privacy safeguard: it prevents Verifiers from even knowing which credentials the Holder possesses beyond what the Holder chooses to reveal.
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

The Holder Wallet creates a `DeviceEngagement` payload (ISO 18013-5 §9.1.1.4) extended with the TS9-specific `PresentationOffer` at CBOR key `-1`. The standard engagement fields (ephemeral ECDH public key, BLE UUID) enable the encrypted transport channel, while the `-1` extension advertises the Holder's offered attributes. The complete payload is CBOR-encoded and rendered as a QR code on the Holder's screen.

The Verifier scans this QR code (step 11), simultaneously establishing: (a) the BLE connection parameters, (b) the ECDH key exchange, and (c) the set of attributes available for request. STS9_07/08 mandates QR codes for W2W device engagement — NFC tap is optional.
</details>
<details><summary><strong>11. Verifier Wallet displays offered attributes</strong></summary>

The Verifier Wallet scans the QR code, decodes the CBOR `DeviceEngagement`, extracts the `PresentationOffer` from key `-1`, and displays the offered attributes on the Verifier's screen. The display shows: credential type (e.g., *"EU Digital Identity — PID"*), and the individual attributes offered (e.g., `family_name`, `given_name`, `birth_date`, `age_over_18`).

The Verifier User can now see what the Holder is willing to share — but cannot request anything outside this set. This transparency ensures the Verifier understands the boundaries of the interaction before making their request.
</details>
<details><summary><strong>12. Verifier User selects a subset of attributes to request</strong></summary>

The Verifier User selects the specific attributes they need from the offered set. The TS9 protocol enforces a **strict subset constraint** — the Verifier can only request attributes listed in the `PresentationOffer`. The Wallet UI should present the offered attributes as checkboxes with a "Select All" option.

For example, if the Holder offered `[family_name, given_name, birth_date, age_over_18]`, the Verifier might select only `[age_over_18]` for a simple age check — demonstrating the data minimisation principle applied at the Verifier level.

> **PresentationOffer is optional (STS9_12)**: If the Holder did not include a `PresentationOffer` in the `DeviceEngagement`, the Verifier can request any attributes. This fallback enables simpler W2W interactions where the Holder trusts the Verifier to request only what is needed.
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

The Holder Wallet validates the incoming `DeviceRequest` against the `PresentationOffer` built in step 9. For each `docType` and `nameSpace`, the Wallet checks that every requested element identifier exists in the offer's element list. If the Verifier attempts to request an attribute not included in the `PresentationOffer`, the Wallet immediately terminates the BLE session and displays an error: *"The Verifier requested data outside the agreed scope."*

This enforcement is critical because the Verifier has no WRPAC — there is no institutional accountability for over-requesting. The `PresentationOffer` mechanism is the primary technical control limiting what the Verifier can access.
</details>
<details><summary><strong>15. Holder Wallet displays the final consent screen</strong></summary>

The Holder Wallet displays a final consent screen showing exactly which attributes the Verifier requested. Unlike RP flows (§7.2 step 13), the consent screen in W2W prominently displays:

- ⚠️ **No verified Verifier identity** — *"You are sharing with an unregistered person"*
- The specific attributes requested (e.g., `age_over_18` only)
- `IntentToRetain: false` for all attributes — *"The Verifier's Wallet will not store your data"*

This double-consent model (first: selecting what to offer in step 8; second: confirming the actual request here) provides layered privacy protection unique to the W2W flow.
</details>
<details><summary><strong>16. Holder User approves and authenticates</strong></summary>

The Holder User taps "Approve" and authenticates via biometric (fingerprint / face) or PIN to unlock the WSCA and authorise the DeviceAuth signature (step 17). The authentication flow is identical to §11.4 step 14 — the WSCA releases the credential's device key for a single COSE_Sign1 operation over the `DeviceAuthentication` structure.

> **User sovereignty in W2W**: The Holder has full control — they chose which attributes to offer (step 8), they can refuse the Verifier's request at any point, and they must explicitly authenticate. The double-consent + authentication triple-gate is more protective than RP flows (which have only a single consent + authentication gate).
</details>
<details><summary><strong>17. Holder Wallet sends the DeviceResponse over BLE</strong></summary>

The Holder Wallet constructs and encrypts the `DeviceResponse` CBOR structure (identical to §11.4 step 16's format) and transmits it over the BLE channel. The response contains:

- **`issuerSigned`** — the selected `IssuerSignedItem` entries with per-element random salts, plus the `issuerAuth` COSE_Sign1 (MSO signed by the PID Provider)
- **`deviceSigned`** — the `DeviceAuth` COSE_Sign1 over the `DeviceAuthentication` structure (binding the response to this session's `SessionTranscript`)

Per STS9_29, the `IntentToRetain` for all attributes is `false` — the Verifier Wallet is contractually (but not technically) prohibited from persisting the attribute values after the session ends. The technical enforcement relies on Wallet Provider compliance (STS9_36 — no screenshots; STS9_37 — no data forwarding).
</details>
<details><summary><strong>18. Verifier Wallet verifies IssuerAuth (MSO)</strong></summary>

The Verifier Wallet performs the same IssuerAuth verification as an RP terminal (§11.4 step 18): extract the MSO from the `issuerAuth` COSE_Sign1, verify the ES256 signature using the PID Provider's certificate, and validate the certificate chain against the LoTE trust anchor. The Verifier Wallet must maintain its own LoTE cache (refreshed when online) to perform this verification.

This step ensures the attribute values are genuine — even though the Verifier is an unregistered natural person, the Verifier Wallet can still cryptographically confirm that the data was issued by a legitimate, Member State–notified PID Provider.

> **Offline verification**: W2W is designed for proximity and should work offline. The Verifier Wallet relies on cached LoTE entries and cached MSO validity periods. If the LoTE cache is stale, the Wallet should display a warning but may still proceed.
</details>
<details><summary><strong>19. Verifier Wallet verifies DeviceAuth</strong></summary>

The Verifier Wallet verifies the `deviceSignature` COSE_Sign1 over the `DeviceAuthentication` CBOR structure (§11.4 step 20). This proves: (a) the person holding the Holder device possesses the private key that the PID Provider originally bound to the credential, and (b) the presentation is bound to this specific session via the `SessionTranscript`.

In W2W, DeviceAuth verification is especially important because there is no visual portrait comparison (unlike supervised flows, §11.4 steps 21–22) and no RP-level monitoring. The cryptographic device binding is the primary technical assurance that the credential has not been forwarded or cloned.
</details>
<details><summary><strong>20. Verifier Wallet verifies PID validity</strong></summary>

The Verifier Wallet checks the MSO's `validityInfo` to confirm the PID has not expired (`validFrom` ≤ now ≤ `validUntil`). If the Verifier Wallet has internet connectivity, it can also query the Token Status List to check for revocation — but this is often unavailable in offline W2W scenarios.

As discussed in §4.4.2 step 4, PID validity serves as an indirect Wallet Unit health proxy — a valid PID implies the PID Provider has not detected a compromise of the Holder's Wallet Unit. In W2W, this is the Verifier's primary assurance that the Holder's device is trustworthy.

> **Revocation check limitations**: In fully offline W2W scenarios, the Verifier cannot query the Status List in real-time. The Verifier Wallet should cache the last-known Status List Token and check the relevant index, accepting the risk of a stale status within the cache TTL window.
</details>
<details><summary><strong>21. Verifier Wallet displays verified attributes</strong></summary>

Upon successful verification (steps 18–20), the Verifier Wallet renders the verified attributes on the Verifier User's screen with verification indicators (✅ *"Verified by [PID Provider name]"*). The display is ephemeral — once the Verifier closes the screen, navigates away, or the session times out, the attribute values are **permanently purged from device memory** (STS9_29).

The Wallet Provider must implement technical safeguards (STS9_36) to prevent screenshots of the verified attributes screen, and must not provide any mechanism to export, copy, or forward the data (STS9_37). These constraints make W2W a "view-only" verification channel — the Verifier can confirm facts (e.g., "this person is over 18") but cannot retain evidence of the interaction.

> **End of session**: The BLE connection is terminated, ephemeral keys are destroyed, and the `SessionTranscript` is purged. No persistent trace of the W2W interaction remains on the Verifier's device.
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
    actorMargin: 250
---
sequenceDiagram
    autonumber
    participant User as 👤 User
    participant WU as 📱 Wallet Unit
    participant Merchant as 🛒 Merchant (RP)
    participant PSP as 🏦 Issuer PSP

    rect rgba(148, 163, 184, 0.14)
    Note right of User: Phase 1: Transaction Initiation
    User->>Merchant: Initiate payment
    Merchant->>PSP: Authorization request
    PSP->>PSP: Determine SCA required
    Note right of PSP: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end

    rect rgba(52, 152, 219, 0.14)
    Note right of User: Phase 2: SCA Request via OpenID4VP
    PSP->>PSP: Build presentation request
    PSP->>WU: OpenID4VP request (JAR)
    Note right of PSP: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end

    rect rgba(46, 204, 113, 0.14)
    Note right of User: Phase 3: User Authentication
    WU->>WU: Verify PSP WRPAC chain
    WU->>WU: Validate SCA attestation type
    WU->>WU: Validate transaction_data type
    WU->>WU: Validate payload (JSON Schema)
    WU->>User: Render consent screen
    User->>WU: Approve + biometric/PIN
    WU->>WU: Build KB-JWT with SCA proof
    Note right of PSP: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end

    rect rgba(241, 196, 15, 0.14)
    Note right of User: Phase 4: Verification
    WU->>PSP: Encrypted response (JWE)
    PSP->>PSP: Verify SCA attestation
    PSP->>PSP: Verify KB-JWT
    PSP->>PSP: Verify dynamic linking
    PSP->>Merchant: Authorization approved
    Merchant->>User: Payment confirmed
    Note right of PSP: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
```

<details><summary><strong>1. User initiates payment at Merchant</strong></summary>

The User initiates an electronic payment on the Merchant's website or mobile app (e.g., clicking "Pay now" at checkout for a €49.99 online purchase). The Merchant's payment page collects the User's card information (or a tokenised reference from a previous session) and submits it to the payment processing pipeline. The User may not yet be aware that EUDI Wallet SCA will be triggered — this depends on the PSP's risk assessment (step 3).

> **SCA trigger context**: PSD2 Art. 97 mandates SCA for electronic payments above certain thresholds, first-time transactions, or when the PSP's Transaction Risk Analysis (TRA) flags the transaction. Low-value payments (< €30, cumulative < €100) may be exempted per RTS Art. 18.
</details>
<details><summary><strong>2. Merchant forwards authorization request to Issuer PSP</strong></summary>

The Merchant's payment backend forwards the authorization request to the User's Issuer PSP (the bank that issued the User's payment card or account) via the card scheme network (Visa, Mastercard) or through an acquirer. The authorization message follows standard EMV 3-D Secure (3DS) or scheme-specific protocols. At this stage, the Merchant's role in the SCA flow is complete — all subsequent SCA steps happen between the PSP and the User's Wallet.

> **PSP as RP**: In the SCA flow, the Issuer PSP acts as the Relying Party — it is the entity that sends the OpenID4VP request and verifies the response. The Merchant never sees the SCA attestation or the KB-JWT; it only receives the final authorization approval/decline.
</details>
<details><summary><strong>3. Issuer PSP determines SCA is required</strong></summary>

The PSP's risk engine evaluates the transaction against PSD2/PSR regulatory triggers to determine whether SCA is legally required. The evaluation considers:

- **Transaction amount** — above the RTS Art. 18 exemption threshold (€30 individual / €100 cumulative)
- **Transaction Risk Analysis (TRA)** — the PSP's fraud scoring model: if the transaction's risk score exceeds the reference fraud rate for the PSP's TRA exemption tier (RTS Art. 18(3)), SCA is required
- **Merchant category** — some categories (e.g., recurring subscriptions) may qualify for exemptions
- **User history** — first-time transaction with this Merchant, unusual amount, or new device

If SCA is required, the PSP proceeds to build the OpenID4VP request (step 4). If exempt, the PSP approves directly without involving the Wallet.
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

The PSP signs the OpenID4VP request as a JAR JWS using its WRPAC private key and delivers it to the User's Wallet Unit. The delivery mechanism depends on the flow type:

- **Push notification (primary)** — the PSP sends a silent push notification (APNs/FCM) to the Wallet app containing the `request_uri`. The Wallet fetches the JAR, similar to cross-device flow §8.2 steps 8–9.
- **App Link / Universal Link** — for same-device flows (User is on their phone), the PSP redirects to the Wallet's registered URL scheme.
- **QR code** — for cross-device flows (User is on a desktop), the PSP renders a QR code containing the `request_uri` on the Merchant's checkout page.

The PSP's role in the EUDI ecosystem is identical to any other RP — it holds a WRPAC issued by an Access CA, registers its intended use (SCA attestation presentation), and signs its requests with the WRPAC key. The Wallet treats the PSP's request exactly like any other OpenID4VP request.
</details>
<details><summary><strong>6. Wallet Unit verifies PSP WRPAC certificate chain</strong></summary>

The Wallet verifies the PSP's WRPAC certificate chain against the Access CA LoTE trust anchor, identical to §7.2 steps 8–10. The Wallet validates: (a) the JAR JWS signature using the WRPAC's public key, (b) the certificate chain up to the LoTE root, (c) the WRPAC's revocation status via OCSP/CRL, and (d) that the `client_id` in the JAR matches the WRPAC's SAN.

For SCA flows, the WRPAC identifies the PSP as a financial institution (e.g., *"Example Bank AG"*). This verification is essential — it prevents a rogue entity from sending fake SCA requests that could trick Users into authenticating fraudulent transactions.
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

The Wallet checks that the `type` field in the `transaction_data` array (`urn:eudi:sca:payment:1`) exists in the credential's VCT metadata `transaction_data_types` map (step 7). This prevents the PSP from attaching an unsupported transaction type to the request — e.g., a payment PSP cannot send a `urn:eudi:sca:account_access:1` transaction type if the SCA attestation's VCT metadata only lists payment types.

> **Type registry**: Transaction data types follow a URN namespace (`urn:eudi:sca:*`) managed by the EUDI ecosystem. Each type has an associated JSON Schema and UI label set. The Wallet must reject unknown types to prevent rendering incomplete or misleading consent screens.
</details>
<details><summary><strong>9. Wallet Unit validates transaction payload against JSON Schema</strong></summary>

The Wallet validates the `transaction_data[0].payload` JSON object against the authoritative JSON Schema linked in the VCT metadata (`schema_uri`). The Schema defines: required fields (`amount`, `currency`, `payee.name`), field types (number, string, ISO 4217 currency codes), and constraints (e.g., `amount > 0`). This validation ensures the PSP provided structurally valid transaction data — not arbitrary or malformed JSON that could confuse the consent screen rendering (step 10).

> **If schema validation fails**: The Wallet MUST reject the SCA request and display an error: *"The payment request contains invalid data."* This prevents the PSP from bypassing the display hierarchy by sending unexpected field structures.
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

The User reviews the transaction details (amount, payee, IBAN) on the consent screen and taps *"Zahlung bestätigen"* (Confirm Payment) — the localised affirmative action label from the VCT metadata. The Wallet then requires biometric or PIN authentication to unlock the WSCA and authorise the KB-JWT signature.

The SCA flow requires **at least two of three independent authentication factors** (PSD2 Art. 97(1)):
1. **Knowledge** — PIN or passcode (`amr: pin_6_or_more_digits`)
2. **Inherence** — biometric (fingerprint, face) (`amr: fingerprint_device`)
3. **Possession** — the device itself, proven by the KB-JWT signature (the device key never leaves the WSCA)

The `amr` array in the KB-JWT (step 12) documents which factors were applied, enabling the PSP to verify PSD2 compliance.
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

The Wallet encrypts the complete presentation response (SD-JWT VC with disclosed claims, KB-JWT with SCA proof) into a JWE using the PSP's ephemeral ECDH-ES public key (from the JAR's `response_encryption_jwk`), identical to §7.2 step 17. The JWE is POSTed to the PSP's `response_uri` (`https://psp.example-bank.de/sca/callback`).

The encrypted payload contains the `vp_token` (the SD-JWT VC string with KB-JWT appended) and the `state` parameter for session correlation. The PSP's ephemeral private key is the only key that can decrypt this response — ensuring the SCA proof is not interceptable by the Merchant or any intermediary.
</details>
<details><summary><strong>14. Issuer PSP verifies SCA attestation signature</strong></summary>

The PSP decrypts the JWE (using its ephemeral private key, then immediately destroys it for forward secrecy) and parses the SD-JWT VC string. The PSP verifies the Issuer-JWT signature to confirm the SCA attestation was legitimately issued. Since the PSP is itself the issuer of the SCA attestation, it can verify the signature using its own public key — no LoTE lookup is needed.

The PSP also verifies the disclosed claims from the SD-JWT disclosures: `user_id` (the User's account identifier), `card_reference` (the payment instrument bound to this SCA attestation), and any other claims needed for the authorisation decision.
</details>
<details><summary><strong>15. Issuer PSP verifies KB-JWT signature and SCA factors</strong></summary>

The PSP verifies the KB-JWT (the SCA proof) against the `cnf.jwk` public key bound in the SCA attestation's Issuer-JWT. The verification checks:

1. **Signature** — ES256 signature is valid against the bound device key
2. **`aud`** — matches the PSP's `client_id` (prevents replay to a different PSP)
3. **`nonce`** — matches the session nonce from step 4 (prevents replay of old KB-JWTs)
4. **`jti`** — unique identifier, stored by the PSP to detect replay attempts (PSD2 RTS Art. 4 — unique authentication code)
5. **`amr`** — contains at least 2 of 3 SCA factor categories: `knowledge`, `inherence`, `possession`. The PSP logs which factors were used for regulatory audit compliance
6. **`iat`** — within acceptable recency window (typically ≤ 300 seconds)

> **If `amr` has fewer than 2 factors**: The PSP MUST reject the SCA proof — PSD2 Art. 97(1) requires at least two independent elements. The PSP should log a compliance alert.
</details>
<details><summary><strong>16. Issuer PSP verifies dynamic linking (transaction hash match)</strong></summary>

The PSP performs the PSD2 dynamic linking verification — the critical step that binds the User's authentication to the specific transaction. The PSP recalculates `SHA-256(base64url(transaction_data[0].payload))` from its own copy of the original `transaction_data` payload (step 4) and compares the digest against `transaction_data_hashes[0]` in the KB-JWT.

If the hashes match, it proves irrefutably that: (a) the User saw and approved the exact amount (€49.99) and payee (*"Online Store GmbH"*), (b) the transaction details were not modified between the PSP's request and the User's approval, and (c) the KB-JWT is cryptographically bound to this specific transaction and cannot be reused for a different amount or payee.

> **If the hash does not match**: The PSP MUST reject the SCA — a hash mismatch indicates the `transaction_data` was tampered with between the PSP and the Wallet, which could mean a man-in-the-middle attack modified the transaction amount or payee. The PSP should log a security alert.
</details>
<details><summary><strong>17. Issuer PSP approves financial authorization</strong></summary>

With all SCA verification steps passed (attestation signature ✅, KB-JWT signature ✅, SCA factors ≥ 2 ✅, dynamic linking hash match ✅), the PSP approves the financial authorisation. The PSP sends an approval response back to the card scheme network (Visa/Mastercard) or directly to the Merchant's acquirer. The PSP logs the complete SCA evidence trail for regulatory audit: `jti` (authentication code), `amr` (factors used), `transaction_data_hashes` (linked transaction), and the verification timestamp.

> **PSD2 compliance record**: The PSP must retain SCA evidence for at least 18 months per RTS Art. 29. The KB-JWT's `jti` serves as the unique authentication code required by PSD2 Art. 97(2) for dynamic linking.
</details>
<details><summary><strong>18. Merchant confirms payment to User</strong></summary>

The Merchant receives the authorisation approval from the PSP (via the card scheme or acquirer) and updates the checkout session. The User sees a payment confirmation screen (e.g., *"Payment successful — your order has been placed"*) in their browser or app. The Merchant never sees the SCA attestation, KB-JWT, or any Wallet-level details — it only receives a standard payment authorisation code.

The entire SCA flow — from the User clicking "Pay" to seeing the confirmation — typically completes in 10–20 seconds, comparable to current 3-D Secure (3DS) challenge flows. The EUDI Wallet SCA flow replaces the bank's proprietary authentication app (e.g., TAN SMS, banking app redirect) with a standardised, interoperable mechanism.
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

```mermaid
flowchart TD
    Start(( )) --> Active(["`**Active&nbsp;State**
    SCA&nbsp;Attestation&nbsp;Valid`"])
    
    Active -- "`**Fraud&nbsp;Detected**
    Immediate&nbsp;Status&nbsp;List&nbsp;revocation`" --> Revoked(["`**Revoked&nbsp;State**
    SCA&nbsp;flow&nbsp;fails,&nbsp;User&nbsp;contact&nbsp;bank`"])
    
    Active -- "`**Account&nbsp;Closed**
    Standard&nbsp;Status&nbsp;List&nbsp;revocation`" --> Revoked
    
    Active -- "`**Attestation&nbsp;Expired**
    Validity&nbsp;period&nbsp;ends`" --> Expired(["`**Expired&nbsp;State**
    Wallet&nbsp;prompts&nbsp;User&nbsp;to&nbsp;refresh`"])
    
    Active -- "`**Card&nbsp;Replaced**
    Revoke&nbsp;old,&nbsp;trigger&nbsp;new&nbsp;issuance`" --> ReIssued(["`**Re-Issuance&nbsp;Flow**
    User&nbsp;re-enrols&nbsp;new&nbsp;card`"])
    
    Expired -- "`**OID4VCI&nbsp;re-issuance**`" --> ReIssued
    
    ReIssued --> Active
    Revoked --> End(( ))

    style Active text-align:left
    style Revoked text-align:left
    style Expired text-align:left
    style ReIssued text-align:left
```

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
    actorMargin: 250
---
sequenceDiagram
    autonumber
    participant User as 👤 User
    participant WU as 📱 Wallet Unit
    participant Bank as 🏦 Bank (Issuer)

    rect rgba(148, 163, 184, 0.14)
    Note right of User: Phase 1: Enrolment Trigger
    User->>Bank: Open banking app, select<br/>"Add card to EUDI Wallet"
    Bank->>Bank: Authenticate User<br/>(existing SCA / online banking)
    Bank->>Bank: Generate pre-authorized_code<br/>+ tx_code (optional PIN)
    Note right of Bank: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end

    rect rgba(52, 152, 219, 0.14)
    Note right of User: Phase 2: Credential Offer
    Bank->>WU: Credential Offer<br/>(same-device deeplink or QR)
    WU->>WU: Parse Credential Offer,<br/>resolve Issuer metadata
    WU->>Bank: POST /token<br/>(pre-authorized_code + tx_code)
    Bank->>WU: access_token + c_nonce
    Note right of Bank: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end

    rect rgba(46, 204, 113, 0.14)
    Note right of User: Phase 3: Credential Issuance
    WU->>WU: Generate device key pair<br/>(EC P-256, in WSCA/WSCD)
    WU->>WU: Build proof-of-possession<br/>(JWT signed with device key,<br/>including c_nonce)
    WU->>Bank: POST /credential<br/>(format: dc+sd-jwt,<br/>vct, proof)
    Bank->>Bank: Create SD-JWT VC<br/>with SCA claims + cnf
    Bank->>WU: SD-JWT VC response
    WU->>WU: Store SCA attestation
    WU->>User: "Card added to Wallet"
    Note right of Bank: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
```

<details><summary><strong>1. User opens banking app and selects "Add card to EUDI Wallet"</strong></summary>

The User navigates to the card management section of their Bank's mobile app and selects an option to provision a payment card into their EUDI Wallet (e.g., *"Add Visa •••4242 to EUDI Wallet"*). This action initiates the OID4VCI Pre-Authorized Code flow. The Bank's app is the trigger — the User does **not** start from the EUDI Wallet side. This ensures the Bank controls the enrolment experience and can apply its own eligibility checks (e.g., card status, account standing) before issuing the SCA attestation.
</details>
<details><summary><strong>2. Bank authenticates User via existing SCA</strong></summary>

The Bank re-authenticates the User using its existing SCA mechanisms (PSD2 Art. 97) — typically the banking app's biometric lock or PIN. This is a **re-authentication**, not initial onboarding: the User already has an active banking relationship. The re-authentication proves the User is the legitimate account holder before the Bank issues an SCA attestation. Some banks may require step-up authentication (e.g., SMS OTP in addition to biometric) for high-privilege operations like credential provisioning.
</details>
<details><summary><strong>3. Bank generates pre-authorized_code and optional tx_code</strong></summary>

The Bank generates the cryptographic material for the OID4VCI Pre-Authorized Code flow:

- **`pre-authorized_code`** — a one-time, short-lived code (e.g., `SplxlOBeZQQYba49Wd8E3eNLA0f3k2qR`) bound to the authenticated session. Valid for a single exchange at the Token Endpoint (step 6). Typically expires in 5–10 minutes.
- **`tx_code`** (optional) — a 6-digit numeric PIN sent via SMS or push notification, providing an out-of-band binding factor. This ensures a compromised banking app session cannot silently provision credentials to a malicious Wallet.

The Pre-Authorized Code flow is preferred over the standard Authorization Code flow because the Bank has already authenticated the User in step 2 — there is no need for a separate OAuth authorization page.
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

The Wallet parses the Credential Offer JSON and extracts the `credential_issuer` URL. It then fetches the Bank's OID4VCI Issuer Metadata from `https://pay.example-bank.de/.well-known/openid-credential-issuer` to discover: (a) the Token Endpoint URL, (b) the Credential Endpoint URL, (c) the `credential_configurations_supported` map (which defines the SCA attestation's format, VCT, and available claims), and (d) supported proof types (`jwt` with `ES256`). If the Wallet does not recognise the credential type or cannot satisfy the proof requirements, it informs the User and aborts.
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

The Wallet generates a fresh EC P-256 key pair inside the WSCA (Wallet Secure Cryptographic Application) or WSCD (Wallet Secure Cryptographic Device). The private key is hardware-bound — it never leaves the secure element (SE, TEE, or StrongBox). This key becomes the credential's **device key**: the public key is embedded in the credential's `cnf.jwk` (step 11), and the private key signs KB-JWTs during future presentations (§13.4). The key is specific to *this* SCA attestation — each credential gets its own key pair.
</details>
<details><summary><strong>9. Wallet Unit builds proof-of-possession JWT with c_nonce</strong></summary>

The Wallet constructs a proof-of-possession JWT (`typ: openid4vci-proof+jwt`) signed with the newly generated device private key (step 8). The JWT includes: (a) the Bank's `c_nonce` in the `nonce` payload claim (binding this proof to the current issuance session), (b) the device public key in the `jwk` header parameter (so the Bank can extract it), (c) `aud` set to the Bank's Credential Issuer URL, and (d) `iat` set to the current time. This proof demonstrates that the Wallet actually possesses the private key corresponding to the public key it is asking the Bank to embed in the credential.
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

The Bank responds to the Credential Endpoint request with the fully signed SD-JWT VC. The response format:

```json
{
  "credential": "<Issuer-JWT>~<Disclosure:pan_last_four>~<Disclosure:scheme>~<Disclosure:card_holder_name>~",
  "c_nonce": "new_nonce_for_refresh",
  "c_nonce_expires_in": 300
}
```

The `credential` field contains the SD-JWT VC string (Issuer-JWT + disclosures, no KB-JWT at issuance time). The Bank may also return a new `c_nonce` for potential batch issuance or credential refresh.
</details>
<details><summary><strong>13. Wallet Unit stores SCA attestation securely</strong></summary>

The Wallet stores the SCA attestation's SD-JWT VC in its credential store, associated with the WSCA-bound device private key (step 8). The storage links: (a) the Issuer-JWT + disclosures (the credential itself), (b) a reference to the hardware-bound private key (for KB-JWT signing during presentations), (c) the credential metadata (issuer, VCT, expiry), and (d) display information (card scheme logo, last four digits). The credential is now ready for use in SCA flows (§13.4).
</details>
<details><summary><strong>14. Wallet Unit confirms "Card added to Wallet" to User</strong></summary>

The Wallet displays a success confirmation to the User — e.g., *"✅ Visa •••4242 has been added to your EUDI Wallet"* with the card scheme logo. The SCA attestation appears in the Wallet's credential list alongside the User's PID and other attestations. From this point, the User can authorise payments using the EUDI Wallet (§13.4) instead of the Bank's dedicated mobile app, enabling cross-PSP SCA portability.
</details>
<br/>

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

```mermaid
flowchart TD
    A["`**1.&nbsp;RP&nbsp;Request**
    RP includes **transaction_data** in OpenID4VP request (§13.7)`"]
    
    B["`**2.&nbsp;Wallet&nbsp;Display**
    Wallet Unit displays amount + payee to User (TD_01)`"]
    
    C["`**3.&nbsp;User&nbsp;Approval&nbsp;&&nbsp;Signing**
    User approves → WSCA/WSCD signs KB-JWT
    including **transaction_data_hashes** (TD_03)`"]
    
    D["`**4.&nbsp;RP&nbsp;Verification&nbsp;(Dynamic&nbsp;Linking)**
    RP verifies KB-JWT signature + hashes
    = PSD2 authentication code dynamically linked to specific amount + payee`"]

    A --> B
    B --> C
    C --> D

    classDef default text-align:left,font-size:14px;
    style A text-align:left
    style B text-align:left
    style C text-align:left
    style D text-align:left
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

## Advanced Presentation Patterns

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
    actorMargin: 250
---
sequenceDiagram
    autonumber
    participant User as 👤 User
    participant WU as 📱 Wallet Unit<br/>(Authenticator)
    participant Browser as 🖥️ Browser<br/>(Client)
    participant RP as 🏦 RP Server

    rect rgba(148, 163, 184, 0.14)
    Note right of User: Phase 1: Pseudonym Registration
    User->>Browser: Navigate to RP, choose<br/>"Sign in with EUDI Wallet"
    RP->>Browser: PublicKeyCredentialCreationOptions<br/>(rp.id, user.id, challenge)
    Browser->>Browser: Verify rp.id matches origin
    Note right of Browser: WebAuthn L3 §5.1.4<br/>anti-phishing check
    Browser->>WU: Forward creation request
    WU->>User: "Register passkey for<br/>forum.example.com?"
    User->>WU: Approve + biometric/PIN
    WU->>WU: Generate EC P-256 key pair<br/>Store private key in keystore<br/>Scope to rp.id + user.id
    Note right of WU: OS keystore — not WSCA/WSCD<br/>(§14.4 separation)
    WU->>Browser: PublicKeyCredential<br/>(credentialId, publicKey,<br/>attestationObject)
    Browser->>RP: Forward credential
    RP->>RP: Store publicKey +<br/>credentialId
    Note right of RP: attestation: "none"<br/>recommended (§14.9)
    Note right of RP: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end

    rect rgba(52, 152, 219, 0.14)
    Note right of User: Phase 2: Pseudonymous Authentication (later session)
    User->>Browser: Return to RP
    RP->>Browser: PublicKeyCredentialRequestOptions<br/>(rpId, challenge)
    Browser->>WU: Forward assertion request
    WU->>User: Select pseudonym +<br/>biometric/PIN
    WU->>WU: Sign challenge with<br/>private key for this rp.id
    Note right of WU: ES256 (alg: -7) per<br/>EUDI ecosystem mandate
    WU->>Browser: AuthenticatorAssertionResponse<br/>(signature, userHandle,<br/>authenticatorData)
    Browser->>RP: Forward assertion
    Note right of RP: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end

    rect rgba(46, 204, 113, 0.14)
    Note right of User: Phase 3: Server Verification
    RP->>RP: Verify signature against<br/>stored public key<br/>Check challenge freshness
    RP->>RP: Authenticated as pseudonym<br/>(no real identity involved)
    Note right of RP: No PID attributes stored —<br/>unlinkable across RPs (PA_04)
    Note right of RP: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
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

```mermaid
---
config:
  themeVariables:
    noteBkgColor: "transparent"
    noteBorderColor: "transparent"
  sequence:
    messageAlign: left
    noteAlign: left
    actorMargin: 250
---
sequenceDiagram
    autonumber
    participant User as 👤 User
    participant Wallet as 📱 Wallet Unit
    participant RP as 🏦 RP Server
    
    rect rgba(148, 163, 184, 0.14)
    Note right of User: Phase 1: Request & Presentation
    User->>RP: User visits age-gated platform
    RP->>Wallet: RP requests pseudonym + age_over_18
    Wallet->>RP: Wallet presents pseudonym AND SD-JWT VC
    Note right of RP: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
    
    rect rgba(46, 204, 113, 0.14)
    Note right of User: Phase 2: Registration & Subsequent Login
    RP->>RP: RP validates presentation<br/>and creates account
    User->>RP: Subsequent sessions use WebAuthn only
    Note right of RP: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
```

<details><summary><strong>1. User visits age-gated platform</strong></summary>

The User visits an age-gated content platform (e.g., streaming service), triggering the onboarding flow that requires both a durable account identifier and age verification.
</details>
<details><summary><strong>2. RP Server requests pseudonym + age_over_18</strong></summary>

The Relying Party requests both a persistent pseudonym and the `age_over_18` attribute via a combined DCQL and WebAuthn flow.
</details>
<details><summary><strong>3. Wallet Unit presents pseudonym and SD-JWT VC</strong></summary>

The Wallet Unit presents both the newly generated pseudonym credential AND an SD-JWT VC with `age_over_18` selectively disclosed, ensuring data minimisation.
</details>
<details><summary><strong>4. RP Server creates account linked to pseudonym</strong></summary>

The Relying Party evaluates the presentation, verifies the age attribute, and creates a durable account linked solely to the pseudonym, permanently flagging the account as age-verified without storing any underlying personal data.
</details>
<details><summary><strong>5. User authenticates in subsequent sessions</strong></summary>

For any subsequent logins, the User authenticates using only the WebAuthn pseudonym credential; no further attributes are needed because the account is already verified.
</details>
<br/>

> **Late attribute binding**: The ARF explicitly requires that attributes can be bound to a pseudonym *after* initial registration — not just at registration time (Topic E, Appendix A, Question 1). This means step 2 above can happen in a **separate session**, days or weeks after the pseudonym was first created. This pattern is the basis for the Progressive Assurance journey documented in §14.13.

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

#### 14.7.3 Same-User Binding: How RPs Guarantee Pseudonym–Attribute Continuity

The pseudonym registration (WebAuthn `create()`) and the attribute presentation (OpenID4VP DCQL) are **two separate protocol exchanges**. WebAuthn generates a key pair; OpenID4VP presents a signed credential. Neither protocol is aware of the other. The ARF explicitly acknowledges this as an open challenge (Topic E, §5.3, Challenge 1): *"On its own, [W3C WebAuthn] does not support enable a Relying Party to obtain a strong guarantee ensuring that presentation of attributes as well as the registering of a pseudonym is performed by the same User."*

This is a **critical** issue for RPs implementing Use Case B (pseudonym + attributes). Without binding, a malicious User could register a pseudonym on one device and present another User's `age_over_18` attestation from a different device, creating a fraudulent age-verified account.

The following binding strategies are available, listed from most practical (deployable today) to most robust (future standardisation):

| Strategy | How It Works | Strength | Availability |
|:---------|:-------------|:---------|:-------------|
| **1. Session-Based Binding** | RP maintains a server-side session (e.g., HTTP-only cookie or opaque token). Both the WebAuthn ceremony and the OpenID4VP ceremony happen within the same TLS-authenticated browser session. The session acts as the continuity artifact. | Reasonable — both ceremonies require user presence on the same browser/device within the same session | ✅ **Available today** |
| **2. Challenge Embedding** | RP embeds the WebAuthn registration `challenge` inside the OpenID4VP `nonce` parameter (or vice versa), creating a causal chain. The RP verifies that both responses reference the same challenge material. | Stronger than session-only — proves the two ceremonies were initiated by the same server-side transaction | ✅ **Available today** |
| **3. Temporal Proximity + User Verification** | Both ceremonies enforce `userVerification: "required"`. If both biometric confirmations happen within seconds on the same device, the RP has high confidence of same-user continuity. | Probabilistic — strong for same-device, weaker for cross-device | ✅ **Available today** |
| **4. Cryptographic Binding (WSCA proof)** | ARF Topic K (§3.4, ACP_10–ACP_15) defines a mechanism where the Wallet Unit proves that the private keys of two attestations are managed by the same WSCD. If the pseudonym key and the PID key are both in the WSCA, this proof would cryptographically bind them. | **Strongest** — hardware-level proof of same-WSCD key management | ❌ **Not yet standardised** — guiding HLRs only |
| **5. Attested Pseudonym (alternative path)** | Instead of WebAuthn + OpenID4VP, the Attestation Provider issues a (Q)EAA attesting a pseudonym to the User. The issuance process (OID4VCI) inherently binds the pseudonym to the User's PID via the Attestation Provider's identity verification. | Strong — the Attestation Provider guarantees binding during issuance | ⚠️ **Available but requires Attestation Provider** — no EU-wide pseudonym attestation type defined yet |

**Recommended RP approach (today)**: Combine strategies 1–3: maintain a server-side session token, embed the WebAuthn challenge in the OpenID4VP nonce, and require both ceremonies within a tight temporal window on the same browser context. This provides a defence-in-depth approach:

```mermaid
---
config:
  themeVariables:
    noteBkgColor: "transparent"
    noteBorderColor: "transparent"
  sequence:
    messageAlign: left
    noteAlign: left
    actorMargin: 250
---
sequenceDiagram
    autonumber
    participant User as 👤 User
    participant Browser as 🖥️ Browser
    participant RP as 🏦 RP Server

    RP->>RP: Create session (session_id, challenge_R)

    rect rgba(52, 152, 219, 0.14)
    Note right of User: Ceremony 1: WebAuthn Registration
    Browser->>RP: navigator.credentials.create()
    RP-->>Browser: PublicKeyCredential (credentialId, publicKey)
    RP->>RP: Store credential in session<br/>state: PSEUDONYM_REGISTERED<br/>phase: AWAITING_ATTRIBUTE
    Note right of RP: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end

    rect rgba(46, 204, 113, 0.14)
    Note right of User: Ceremony 2: OpenID4VP Presentation
    RP->>Browser: Authorization Request<br/>(nonce = challenge_R, dcql_query)
    Browser-->>RP: vp_token (SD-JWT VC, age_over_18)
    RP->>RP: Verify nonce matches challenge_R<br/>Verify same session_id<br/>→ age_verified: true ✅<br/>→ assurance_level: substantial
    Note right of RP: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end

    Note right of RP: Session binds both ceremonies<br/>to the same User
```

<details><summary><strong>1. RP Server creates session with embedded challenge</strong></summary>

The RP Server generates a cryptographic session that will bind both ceremonies together. Two artifacts are created:

- **`session_id`**: A high-entropy opaque token (e.g., 256-bit random, stored server-side) that identifies this specific onboarding transaction. It is delivered to the browser as an HTTP-only, Secure, SameSite=Strict cookie.
- **`challenge_R`**: A cryptographic challenge (32 bytes, base64url-encoded) that will be embedded in both the WebAuthn registration and the OpenID4VP nonce — creating a causal chain between the two ceremonies.

```json
{
  "session_id": "sess_7f3a9b2c-4e1d-4a5f-b8c3-2d1e0f9a8b7c",
  "challenge_R": "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk",
  "state": "CREATED",
  "created_at": "2026-07-15T14:00:00Z",
  "ttl_seconds": 300,
  "ceremonies_completed": []
}
```

The short TTL (5 minutes) ensures temporal proximity — both ceremonies must complete within this window. If either ceremony times out, the session expires and the user must restart.

</details>
<details><summary><strong>2. Browser initiates WebAuthn registration via navigator.credentials.create()</strong></summary>

The Browser calls `navigator.credentials.create()` with the RP Server's challenge. The `challenge` field contains `challenge_R` — the same value that will later appear in the OpenID4VP nonce:

```javascript
const credential = await navigator.credentials.create({
  publicKey: {
    rp: { name: "Example Bank", id: "example-bank.de" },
    user: {
      id: new Uint8Array(16),  // Random user handle
      name: "pseudonym-user",
      displayName: "Pseudonymous User"
    },
    challenge: base64urlDecode("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"),
    pubKeyCredParams: [
      { alg: -7, type: "public-key" },   // ES256
      { alg: -257, type: "public-key" }  // RS256
    ],
    attestation: "none",  // Privacy-preserving (§14.9)
    authenticatorSelection: {
      userVerification: "required"  // Biometric/PIN mandatory
    }
  }
});
```

The authenticator (WSCA/platform authenticator) generates a new P-256 key pair, binds it to the RP's origin (`example-bank.de`), and returns a `PublicKeyCredential` containing the `credentialId` and the public key.

> **`attestation: "none"`** follows §14.9's recommendation — the RP does not need authenticator identity verification for pseudonym use cases, and requesting attestation introduces linkability risks.

</details>
<details><summary><strong>3. RP Server stores WebAuthn credential in session</strong></summary>

The RP Server receives the `PublicKeyCredential`, verifies the attestation response (even with `attestation: "none"`, the RP must validate the `clientDataJSON.challenge` matches `challenge_R`), and extracts the public key. The credential is stored in the session — not yet persisted to the user database, because the binding is incomplete until the OpenID4VP ceremony confirms the user's verified attributes.

The session transitions to `PSEUDONYM_REGISTERED` state, indicating that the first ceremony is complete:

```json
{
  "session_id": "sess_7f3a9b2c-4e1d-4a5f-b8c3-2d1e0f9a8b7c",
  "state": "PSEUDONYM_REGISTERED",
  "phase": "AWAITING_ATTRIBUTE",
  "credential": {
    "credentialId": "ATozYnBf3N9LkFvRJG4...",
    "publicKey": "pQECAyYgASFYIJ1r...",
    "signCount": 0
  },
  "ceremonies_completed": ["webauthn_registration"]
}
```

</details>
<details><summary><strong>4. RP Server sends OpenID4VP Authorization Request with challenge-embedded nonce</strong></summary>

The RP Server constructs an OpenID4VP Authorization Request, crucially embedding `challenge_R` as the `nonce` parameter. This is the binding mechanism — the Wallet's response will contain a KB-JWT whose `nonce` claim must match the WebAuthn challenge, proving both ceremonies were initiated by the same server-side transaction.

```json
{
  "response_type": "vp_token",
  "client_id": "example-bank.de",
  "client_id_scheme": "x509_san_dns",
  "response_mode": "direct_post.jwt",
  "response_uri": "https://example-bank.de/oid4vp/response",
  "nonce": "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk",
  "dcql_query": {
    "credentials": [{
      "id": "pid_age",
      "format": "dc+sd-jwt",
      "meta": { "vct_values": ["eu.europa.ec.eudi.pid.1"] },
      "claims": [
        { "path": ["age_over_18"] }
      ]
    }]
  }
}
```

The `dcql_query` requests only `age_over_18` — the minimum attribute needed for an age-gated platform, following data minimisation principles (Art. 5b(2)).

</details>
<details><summary><strong>5. Browser returns vp_token with SD-JWT VC presentation</strong></summary>

The Wallet presents the SD-JWT VC containing the `age_over_18` claim. The presentation includes a Key Binding JWT (KB-JWT) whose `nonce` field echoes the challenge:

```json
{
  "vp_token": "eyJhbGciOiJFUzI1NiJ9.eyJ2Y3QiOiJldS5ldXJvcGEuZWMuZXVkaS5waWQuMSIsIl9zZCI6WyIuLi4iXX0~WyJhYmMxMjMiLCJhZ2Vfb3Zlcl8xOCIsdHJ1ZV0~eyJhbGciOiJFUzI1NiJ9.eyJub25jZSI6ImRCamZ0SmVaNENWUC1tQjkySzI3dWhiVUpVMXAxcl93VzFnRldGT0VqWGsiLCJhdWQiOiJleGFtcGxlLWJhbmsuZGUiLCJpYXQiOjE3MjEwNTI2MjJ9.MEUCIQC..."
}
```

The KB-JWT payload contains `"nonce": "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"` — the same challenge used in the WebAuthn registration. This proves that the VP was created in response to the same transaction.

</details>
<details><summary><strong>6. RP Server verifies nonce match and completes session binding</strong></summary>

The RP Server performs the critical binding verification:

1. **Verify the SD-JWT VC** — issuer signature, revocation status, holder binding (KB-JWT signature against the `cnf` key)
2. **Verify `nonce` match** — the KB-JWT's `nonce` must exactly match `challenge_R` from the session
3. **Verify `session_id` match** — the request originates from the same browser session (cookie validation)
4. **Verify temporal proximity** — both ceremonies completed within the session's TTL window

```json
{
  "session_id": "sess_7f3a9b2c-4e1d-4a5f-b8c3-2d1e0f9a8b7c",
  "state": "BOUND",
  "binding_result": {
    "pseudonym_credential_id": "ATozYnBf3N9LkFvRJG4...",
    "age_verified": true,
    "assurance_level": "substantial",
    "nonce_match": true,
    "session_match": true,
    "temporal_gap_ms": 4200
  },
  "ceremonies_completed": ["webauthn_registration", "oid4vp_presentation"]
}
```

If all checks pass, the RP persists the pseudonym credential to the user database, associated with the verified attribute (`age_over_18: true`). On subsequent visits, the User authenticates with WebAuthn only — no further EUDI Wallet interaction is needed until the attribute expires or requires re-verification.

</details>
<br/>

> **Key insight**: The session token is not a mere convenience — it is the **binding artifact** that ties two otherwise unrelated protocol exchanges to the same User. The RP MUST ensure this session cannot be hijacked (HTTP-only, Secure, SameSite=Strict cookies; or opaque bearer tokens with short TTL). If the session is compromised, the binding guarantee is void.

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
| `assurance_level` | enum | Current effective LoA: `low` (pseudonym-only), `substantial` (age/attribute verified), `high` (full PID verified). See §14.13. |
| `identity_verified` | boolean | Whether identity verification has been performed and bound to this pseudonym (§14.13) |
| `identity_verified_at` | timestamp | When the step-up verification occurred |
| `verification_method` | string | Method used: `pid_presentation`, `pid_age_over_18`, `qeaa_presentation`, `email_otp` |
| `verification_expiry` | timestamp | When the identity verification should be re-confirmed (RP-defined policy) |
| `backup_eligible` | boolean | Whether this credential is a synced passkey (backed up, surviving device loss) or device-bound |

> **Data minimisation**: The `linked_attributes` field should store only the **result** of attribute verification (e.g., `age_verified: true`), not the raw PID attributes themselves. The RP has no ongoing need for the raw attributes once the verification is complete.
>
> **LoA semantics**: The `assurance_level` field is an RP-side classification, not an eIDAS certification. The pseudonym itself has no eIDAS LoA (Topic E, Requirement 8). See §14.13 for full semantics.

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

##### 14.11.1 Synced vs Device-Bound Passkeys

The recoverability of a pseudonym after device loss depends on the passkey type:

| Characteristic | Synced Passkey | Device-Bound Passkey |
|:---------------|:---------------|:---------------------|
| **Storage** | Cloud keychain (iCloud Keychain, Google Password Manager) | Hardware keystore (Secure Enclave, StrongBox) only |
| **Survives device loss** | ✅ Yes — restored on new device from cloud backup | ❌ No — permanently lost with device |
| **Cross-device availability** | ✅ Available on all User's devices via sync | ❌ Available only on the registering device |
| **NIST SP 800-63-4 classification** | AAL2 | AAL2 or AAL3 (depending on attestation) |
| **WebAuthn `BE` flag** | `BE=1` (Backup Eligible), `BS=1` (Backup State) in `authenticatorData` | `BE=0` (Not Backup Eligible) |
| **EUDI Wallet implication** | May not meet all Wallet Provider requirements if WSCA-level key protection is expected | Provides stronger hardware assurance but creates recovery burden |

> **RP detection**: RPs can determine whether a credential is synced or device-bound by inspecting the `BE` (Backup Eligible) and `BS` (Backup State) flags in the `authenticatorData` returned during registration (WebAuthn L3 §6.1). RPs should store `backup_eligible` in their pseudonym data model (§14.10) to inform recovery UI and policy decisions.

##### 14.11.2 Account Recovery Flow After Device Loss

When a User loses their device and the pseudonym was device-bound (not backed up), the RP must provide an account recovery path. The recommended flow:

```mermaid
---
config:
  themeVariables:
    noteBkgColor: "transparent"
    noteBorderColor: "transparent"
  sequence:
    messageAlign: left
    noteAlign: left
    actorMargin: 250
---
sequenceDiagram
    autonumber
    participant User as 👤 User
    participant Wallet as 📱 Wallet Unit
    participant RP as 🏦 RP Server
    
    rect rgba(231, 76, 60, 0.14)
    Note right of User: Phase 1: Authentication Failure
    User->>RP: User visits RP on new device
    Note right of User: Passkey missing
    RP->>User: Offer<br/>"Recover Account"
    Note right of RP: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end

    rect rgba(241, 196, 15, 0.14)
    Note right of User: Phase 2: Identity Verification Step-Up
    RP->>Wallet: RP requests identity verification (DCQL)
    Wallet->>RP: Wallet presents PID attributes
    RP->>RP: Validate presentation<br/>Match existing account
    Note right of RP: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
    
    rect rgba(46, 204, 113, 0.14)
    Note right of User: Phase 3: Passkey Re-Binding
    RP->>Wallet: RP initiates new WebAuthn registration
    Wallet->>RP: Return new bound passkey
    RP->>RP: RP invalidates old credential<br/>Store new credential
    Note right of RP: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
```

<details><summary><strong>1. User visits RP on new device</strong></summary>

The User arrives at the Relying Party service from a new device but lacks the device-bound passkey required for standard authentication. The RP detects the failure or absence of a credential and explicitly offers a "Recover account" option.
</details>
<details><summary><strong>2. RP Server offers "Recover Account" option</strong></summary>

The RP detects that the User's session lacks a valid device-bound passkey. Instead of rejecting the authentication attempt outright, the RP presents an explicit "Recover Account" option in the user interface, guiding the User through a re-verification flow using their EUDI Wallet.
</details>
<details><summary><strong>3. RP Server requests identity verification via DCQL</strong></summary>

To recover the account safely, the RP launches an OpenID4VP DCQL query requesting the same PID attributes that were used for the original KYC step-up (if the account had a verified identity) or a broader set to ensure identity continuity.
</details>
<details><summary><strong>4. Wallet Unit presents PID attributes</strong></summary>

The Wallet Unit securely presents the requested PID attributes. The RP evaluates the presentation and cryptographically matches the attributes against the existing account's verification record, assuring it is the same User.
</details>
<details><summary><strong>5. RP Server validates presentation and matches existing account</strong></summary>

The RP Server validates the cryptographic presentation (signature, nonce, audience) and then executes an account lookup against its user store, matching the received PID attributes (e.g., `personal_identifier`, `family_name`, `birth_date`) against the verification record from the original account creation. If a match is found, the RP confirms identity continuity.
</details>
<details><summary><strong>6. RP Server initiates new WebAuthn registration</strong></summary>

Having proven the User's identity, the RP initiates a fresh WebAuthn registration ceremony. The User creates a completely new device-bound passkey on their new apparatus which is securely bound to the existing account.
</details>
<details><summary><strong>7. Wallet returns new bound passkey</strong></summary>

The User's new device creates a fresh FIDO2 credential using the platform authenticator (Touch ID, Face ID, Android Biometric). The Wallet returns the new `PublicKeyCredential` containing the `credentialId` and public key, bound to the RP's `rp.id` domain.
</details>
<details><summary><strong>8. RP Server invalidates old credential and stores new</strong></summary>

The backend securely revokes the old `credential_id` preventing it from being misused by whoever found the lost device, while permanently committing the new credential for subsequent logins.
</details>
<br/>

> **Privacy trade-off**: Account recovery **temporarily breaks pseudonymity** — the RP sees the User's PID attributes during the recovery session. RPs should minimise the attributes requested (e.g., only `age_over_18` if that was the original verification) and discard the raw attributes after matching. The `intent_to_retain: false` DCQL flag (§15.2.1) should be set for all recovery-related attribute requests.

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

#### 14.13 Progressive Assurance: Register Low, Verify Identity, Authenticate High

This is the most strategically important passkey user journey for Relying Parties. It enables **progressive onboarding** — the User creates a pseudonymous account with zero identity verification (LoA Low), then upgrades the account via EUDI Wallet identity verification (LoA Substantial/High) only when needed, and subsequently authenticates with just a passkey while the RP treats the session at the elevated assurance level.

> **ARF basis**: Topic E, Appendix A, Question 1 affirms: *"It should be possible to register attributes to the pseudonym later than at registration."* This explicitly legitimises the late-binding pattern. The progressive assurance journey extends this into a multi-session lifecycle.

> **LoA semantics**: The pseudonym *itself* has no eIDAS Level of Assurance — the ARF's Topic E Requirement 8 states: *"it does not make sense to talk about LoA High for pseudonyms as these does not constitute an electronic means of identification."* However, the **RP account** to which the pseudonym is bound can have an *effective* assurance level based on the identity verification that was performed and bound to it. The RP must track this distinction in its data model (see §14.10).

##### 14.13.1 Progressive Assurance Sequence Diagram

```mermaid
---
config:
  themeVariables:
    noteBkgColor: "transparent"
    noteBorderColor: "transparent"
  sequence:
    messageAlign: left
    noteAlign: left
    actorMargin: 250
---
sequenceDiagram
    autonumber
    participant User as 👤 User
    participant WU as 📱 Wallet Unit
    participant Browser as 🖥️ Browser
    participant RP as 🏦 RP Server

    rect rgba(148, 163, 184, 0.14)
    Note right of User: Phase 1 — Pseudonym Registration (LoA Low)
    User->>Browser: Visit marketplace, choose<br/>"Sign up with Wallet"
    RP->>Browser: PublicKeyCredentialCreationOptions<br/>(rp.id, user.id, challenge_R)
    Browser->>WU: Forward creation request
    WU->>User: Approve + biometric/PIN
    WU->>WU: Generate key pair, scope to rp.id
    WU->>Browser: PublicKeyCredential<br/>(credentialId, publicKey)
    Browser->>RP: Forward credential
    RP->>RP: Store credential<br/>assurance_level: low<br/>identity_verified: false
    Note right of RP: Account created with<br/>pseudonym only — no KYC
    Note right of RP: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end

    rect rgba(52, 152, 219, 0.14)
    Note right of User: Phase 2 — Pseudonymous Interaction (days later)
    User->>Browser: Return to marketplace, login
    RP->>Browser: PublicKeyCredentialRequestOptions<br/>(rpId, challenge_A1)
    Browser->>WU: Forward assertion request
    WU->>User: Biometric/PIN
    WU->>Browser: Signed assertion
    Browser->>RP: Forward assertion
    RP->>RP: Verify — authenticated<br/>as pseudonym (LoA Low)
    Note right of RP: User browses, buys low-value<br/>items — no identity needed
    Note right of RP: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end

    rect rgba(241, 196, 15, 0.14)
    Note right of User: Phase 3 — Step-Up Identity Verification
    User->>Browser: Request to sell goods<br/>(requires identity verification)
    RP->>RP: Check: identity_verified == false<br/>→ trigger step-up
    RP->>Browser: OpenID4VP Authorization Request<br/>(dcql_query for age_over_18,<br/>nonce = challenge_R)
    Note right of RP: Nonce embeds original<br/>WebAuthn challenge for<br/>cross-ceremony binding (§14.7.3)
    Browser->>WU: Present DCQL request
    WU->>User: "Share age_over_18 with<br/>marketplace.example.com?"
    User->>WU: Consent + biometric
    WU->>Browser: vp_token (SD-JWT VC with<br/>age_over_18 selectively disclosed)
    Browser->>RP: Forward vp_token
    RP->>RP: Verify SD-JWT VC<br/>Verify nonce matches challenge_R<br/>Verify session continuity
    RP->>RP: Upgrade account:<br/>assurance_level: substantial<br/>identity_verified: true<br/>identity_verified_at: now()
    Note right of RP: Account upgraded —<br/>pseudonym now KYC-bound
    Note right of RP: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end

    rect rgba(46, 204, 113, 0.14)
    Note right of User: Phase 4 — High-Assurance Pseudonymous Login (weeks later)
    User->>Browser: Return to marketplace
    RP->>Browser: PublicKeyCredentialRequestOptions<br/>(rpId, challenge_A2)
    Browser->>WU: Forward assertion request
    WU->>User: Biometric/PIN
    WU->>Browser: Signed assertion
    Browser->>RP: Forward assertion
    RP->>RP: Verify — authenticated<br/>as pseudonym
    RP->>RP: Check: identity_verified == true<br/>→ session LoA: substantial
    Note right of RP: Passkey-only login treated at<br/>LoA Substantial because account<br/>was KYC-verified in Phase 3
    Note right of RP: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
```

<details><summary><strong>1. User visits marketplace and chooses "Sign up with Wallet"</strong></summary>

The User navigates to an online marketplace that offers EUDI Wallet integration. The marketplace's registration page presents multiple sign-up options: email/password, social login, and "Sign up with EUDI Wallet". The Wallet option promises frictionless, pseudonymous account creation — no email required, no personal data collected. The marketplace is classified as a sector where legal identification is **not** required (§14.4), so pseudonym acceptance is mandatory under Art. 5b(9). The RP detects WebAuthn support via `PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()` before offering the option.

</details>
<details><summary><strong>2–8. RP Server initiates WebAuthn registration and stores pseudonym at LoA Low</strong></summary>

The RP initiates a standard WebAuthn `create()` ceremony as documented in §14.5.1–§14.6 (steps 2–10). The key difference from the base flow is the **initial assurance level**: the RP creates the account with `assurance_level: "low"` and `identity_verified: false` in its pseudonym storage (§14.10). No identity attributes are requested or presented — the User's account is purely pseudonymous. The RP assigns an opaque `user_handle` and stores the credential's public key, but has **zero** information about the User's real identity.

</details>
<details><summary><strong>9–15. User returns and authenticates pseudonymously (days later)</strong></summary>

In subsequent sessions, the User authenticates using the standard WebAuthn `get()` ceremony (§14.5.2, §14.6 steps 11–19). The RP verifies the passkey signature and grants access. Because `identity_verified: false`, the RP treats this session at **LoA Low** — the User can browse, purchase low-value items, leave reviews, and perform any action that does not require identity verification. For the marketplace, this might mean limiting the User to buying (not selling), or capping transaction values.

</details>
<details><summary><strong>16–17. User requests higher-privilege action; RP triggers step-up</strong></summary>

The User decides to sell goods on the marketplace, which requires identity verification (age verification, or full KYC depending on the marketplace's policies). The RP's backend checks the pseudonym account's `identity_verified` flag. Finding it `false`, the RP determines that a **step-up** identity verification is required before the User can access seller functionality. The RP does not reject the User — it initiates a seamless upgrade flow within the current session.

</details>
<details><summary><strong>18–23. RP requests attribute presentation via OpenID4VP; Wallet presents selectively disclosed SD-JWT VC</strong></summary>

The RP initiates an OpenID4VP authorization request with a DCQL query requesting `age_over_18` from the User's PID. Critically, the RP sets the OpenID4VP `nonce` parameter to include the original WebAuthn challenge (or a derivative), creating a **cross-ceremony binding** (§14.7.3, Strategy 2: Challenge Embedding). The Wallet Unit prompts the User: *"marketplace.example.com requests: Are you over 18?"*. The User consents and authenticates via biometric. The Wallet constructs a `vp_token` containing an SD-JWT VC with only `age_over_18: true` selectively disclosed — no name, no date of birth, no address.

</details>
<details><summary><strong>24–25. RP verifies presentation and upgrades account to LoA Substantial</strong></summary>

The RP's backend performs the standard SD-JWT VC verification (§15.5, §12.3) and additionally:

1. **Verifies the nonce** matches the expected challenge material — confirming cross-ceremony binding
2. **Verifies session continuity** — the OpenID4VP response arrived within the same TLS session as the active pseudonym login
3. **Verifies temporal proximity** — the attribute presentation happened within seconds of the step-up trigger

Having verified the attribute, the RP upgrades the pseudonym account:

```json
{
  "credential_id": "dGVzdC1jcmVkZW50aWFsLWlk",
  "assurance_level": "substantial",
  "identity_verified": true,
  "identity_verified_at": "2026-03-18T02:00:00Z",
  "verification_method": "pid_age_over_18",
  "verification_expiry": "2027-03-18T02:00:00Z",
  "age_verified": true
}
```

> **Data minimisation**: The RP stores `age_verified: true`, not the raw PID attributes. The SD-JWT VC's `age_over_18` claim was selectively disclosed — the RP never learned the User's date of birth, only *whether* they are over 18.

</details>
<details><summary><strong>26–33. Subsequent passkey logins treated at elevated LoA (weeks later)</strong></summary>

When the User returns weeks later and authenticates with just their passkey, the RP checks the account's `identity_verified` and `assurance_level` fields. Finding `identity_verified: true` and `assurance_level: "substantial"`, the RP grants access to seller functionality — even though this session involves only a passkey login and no attribute presentation. The identity verification from Phase 3 "carries forward" through the pseudonym binding.

> **Re-verification policy**: RPs should define a `verification_expiry` after which the identity verification must be refreshed. For age verification, this might be years (age doesn't reverse). For KYC-sensitive operations, the RP might re-verify annually or upon suspicious activity. If the `verification_expiry` has passed, the RP triggers a new step-up flow (returning to Phase 3).

</details>

##### 14.13.2 RP Data Model Changes for Progressive Assurance

To support progressive assurance, the RP-side pseudonym storage model (§14.10) must include the following additional fields:

| Field | Type | Description |
|:------|:-----|:------------|
| `assurance_level` | enum(`low`, `substantial`, `high`) | Current effective LoA for this pseudonymous account. Starts at `low`; upgraded after identity verification. |
| `identity_verified` | boolean | Whether identity verification has been performed and bound to this pseudonym |
| `identity_verified_at` | timestamp | When the step-up verification occurred |
| `verification_method` | string | Method used: `pid_presentation`, `pid_age_over_18`, `qeaa_presentation`, `email_otp` |
| `verification_expiry` | timestamp | When the identity verification should be re-confirmed (RP-defined policy) |

> **LoA semantics**: The pseudonym itself has no eIDAS LoA (Topic E, Requirement 8). The `assurance_level` field represents the RP's *effective* trust in the account holder, based on what identity verification was performed. This is an RP-side classification, not an eIDAS certification.

##### 14.13.3 Edge Cases

| Scenario | RP Behaviour |
|:---------|:-------------|
| **PID revoked after KYC binding** | RP should flag the account for re-verification at next login. The pseudonym itself remains valid, but the identity assurance may be stale. |
| **User refuses step-up** | RP denies access to the higher-privilege feature but does not revoke the pseudonym. The User retains LoA Low access. |
| **Multiple step-ups** | RP can support incremental upgrades: `low` → `substantial` (age verification) → `high` (full PID + address presentation). |
| **Verification expiry** | RP triggers re-verification. The User presents the same (or updated) attribute. The RP updates `identity_verified_at` and extends the expiry. |

#### 14.14 Cross-Device Pseudonym Flows

The sequence diagrams in §14.6 and §14.13 assume a **same-device** flow where the browser and the Wallet Unit run on the same device (`authenticatorAttachment: "platform"`). However, the ARF explicitly requires both same-device and cross-device flows for pseudonyms (Topic E, §4: *"The use cases all exist in both cross-device and same device flows"*; Appendix A, Question 2: *"Both cross-device and same-device flows should support pseudonyms"*).

In the cross-device scenario, the User browses a website on their **laptop** (desktop browser) while the EUDI Wallet runs on their **phone**. The WebAuthn ceremonies use CTAP 2.2 hybrid transport:

| Aspect | Same-Device | Cross-Device |
|:-------|:------------|:-------------|
| `authenticatorAttachment` | `"platform"` | `"cross-platform"` or omitted |
| Transport | Internal (OS API) | CTAP 2.2 hybrid (caBLE): QR code → BLE tunnel → FIDO exchange |
| User experience | Seamless biometric prompt | User scans QR code on laptop with phone → authenticates on phone |
| Binding strength | Strong (single device) | Moderate (two devices, linked by BLE proximity) |
| Session binding (§14.7.3) | Session cookie on same browser | Session cookie on laptop browser; Wallet response tunnelled from phone |

> **RP implementation**: To support cross-device flows, RPs should **not** restrict `authenticatorAttachment` to `"platform"`. Omitting this parameter or setting it to `"cross-platform"` allows both flows. The Wallet Unit on the phone acts as a **roaming authenticator** via CTAP 2.2 — the same protocol used by hardware security keys (YubiKey, etc.), but tunnelled over BLE instead of USB/NFC.

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
    actorMargin: 250
---
sequenceDiagram
    autonumber
    participant RP as 🏦 RP Instance
    participant SL as 📋 Status List

    rect rgba(148, 163, 184, 0.14)
    Note right of RP: Phase 1: Response Decryption
    RP->>RP: Decrypt JWE, extract vp_token
    RP->>RP: Parse multiple attestations<br/>from vp_token
    Note right of SL: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end

    rect rgba(52, 152, 219, 0.14)
    Note right of RP: Phase 2: Per-Credential Verification
    loop For each attestation
        RP->>RP: Verify issuer signature<br/>(trust anchor from LoTE)
        RP->>RP: Validate claims (exp, iat, vct)
        RP->>RP: Verify selective disclosures
        RP->>RP: Verify device binding<br/>(KB-JWT / DeviceAuth)
        RP->>SL: Check revocation
        SL-->>RP: Status
    Note right of SL: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
    Note right of SL: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end

    rect rgba(46, 204, 113, 0.14)
    Note right of RP: Phase 3: Cross-Credential Binding
    RP->>RP: Identity matching:<br/>verify all attestations<br/>share same cnf key (SD-JWT)<br/>or deviceKey (mdoc)
    opt Cryptographic binding proof present
        RP->>RP: Verify WSCA proof that<br/>all keys managed by same WSCD
    Note right of SL: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
    Note right of SL: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end

    rect rgba(241, 196, 15, 0.14)
    Note right of RP: Phase 4: Attribute Extraction
    RP->>RP: Minimum validity = min(all exp)
    RP->>RP: Extract verified attributes
    Note right of SL: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
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

The RP verifies that the credential was presented by the device to which it was originally issued — preventing credential forwarding and replay attacks (§24.2, Cross-RP Collusion):

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
<br/>

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
    actorMargin: 250
---
sequenceDiagram
    autonumber
    participant User as 👤 User
    participant WU as 📱 Wallet Unit
    participant RP as 🏦 Relying Party

    rect rgba(148, 163, 184, 0.14)
    Note right of User: Phase 1: User Initiative
    User->>WU: View transaction log<br/>(dashboard)
    WU->>User: Display past interactions<br/>with RP names and dates
    User->>WU: Select RP, choose<br/>"Request data deletion"
    Note right of RP: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end

    rect rgba(52, 152, 219, 0.14)
    Note right of User: Phase 2: Contact Resolution
    WU->>WU: Retrieve RP's supportURI<br/>from WRPRC or Registrar API
    Note right of WU: GET /wrp/{rp_id}<br/>Accept: application/jwt
    Note right of RP: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end

    rect rgba(46, 204, 113, 0.14)
    Note right of User: Phase 3: RP Contact (GDPR Art. 17)
    alt supportURI is a website URL
        WU->>RP: Open RP's support page<br/>in browser
        Note right of WU: User completes deletion<br/>request on RP's website
    else supportURI is an email
        WU->>RP: Compose email to RP<br/>with pre-filled template
    else supportURI is a phone number
        WU->>RP: Initiate phone call
    Note right of RP: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
    Note right of RP: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
```

<details><summary><strong>1. User opens Wallet Unit transaction log dashboard</strong></summary>

The User opens their EUDI Wallet and navigates to the privacy dashboard or transaction history section. The Wallet maintains a local log of every presentation interaction (mandated by CIR 2024/2979 Art. 5.8) — including the RP's identity, the attributes disclosed, the date/time, and the purpose. This log is stored locally on the device and never transmitted to any external party. The dashboard serves as the User's central control point for exercising GDPR data subject rights (Art. 15–22).
</details>
<details><summary><strong>2. Wallet Unit displays past interactions to User</strong></summary>

The Wallet displays a chronological list of past presentations, each entry showing: the RP's verified legal name (from the WRPAC Subject at the time of presentation), the date and time of the interaction, the attributes that were disclosed (e.g., `family_name`, `given_name`, `birth_date`), and the stated purpose (from the WRPRC or Registrar). The User can browse, filter, and search this log. Entries older than the configured retention period (TS7 DATA_DLT_06) may be automatically purged from the local log, but the User can export them before deletion.
</details>
<details><summary><strong>3. User selects RP and chooses "Request data deletion"</strong></summary>

The User selects a specific RP from the transaction log and taps *"Request data deletion"* (or equivalent). This action invokes the GDPR Art. 17 right to erasure natively from within the Wallet UI. The Wallet records the User's intent and prepares to contact the RP. The User may select individual presentation sessions (e.g., *"Delete data from the July 15 interaction"*) or request deletion of all data held by that RP. The Wallet initiates the contact procedure (step 4) without requiring the User to manually find the RP's privacy contact information.
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
<details><summary><strong>5. [alt: Website] Wallet Unit opens RP's support page in browser</strong></summary>

If the `supportURI` is a website URL (the preferred option per DATA_DLT_02), the Wallet opens the RP's GDPR deletion page in the device's secure browser. The User completes the deletion request on the RP's own infrastructure, providing any additional verification the RP may require. This is the most reliable path because the RP can immediately process the request through its existing data subject rights portal.
</details>
<details><summary><strong>6. [alt: Email] Wallet Unit composes pre-filled deletion email</strong></summary>

If the `supportURI` is an email address, the Wallet composes a pre-filled draft (DATA_DLT_08 / DATA_DLT_09) in the device's default email client, allowing the User to review and edit before sending:

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
</details>
<details><summary><strong>7. [alt: Phone] Wallet Unit initiates phone call to RP support</strong></summary>

If the `supportURI` is a phone number, the Wallet prompts the device to dial the RP's support number directly. This is the least structured option — the User must verbally communicate their deletion request. The Wallet still logs the initiation of the phone-based request in its internal tracking log for auditability.
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

```mermaid
---
config:
  themeVariables:
    noteBkgColor: "transparent"
    noteBorderColor: "transparent"
  sequence:
    messageAlign: left
    noteAlign: left
    actorMargin: 250
---
sequenceDiagram
    autonumber
    participant User as 👤 User
    participant Wallet as 📱 Wallet Unit
    participant Reg as 📖 Registrar API
    participant DPA as 🏛️ DPA
    
    rect rgba(52, 152, 219, 0.14)
    User->>Wallet: User views transaction log
    User->>Wallet: User selects suspicious transaction
    User->>Wallet: User chooses "Report to DPA"
    Note right of DPA: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
    
    rect rgba(241, 196, 15, 0.14)
    Wallet->>Reg: Wallet retrieves DPA contact info
    Reg-->>Wallet: Return supervisoryAuthority.email
    Wallet->>Wallet: Wallet composes pre-filled report
    Note right of Wallet: Includes:<br/>- RP identity<br/>- Date & time<br/>- Attributes requested vs registered<br/>- User description
    Note right of DPA: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
    
    Wallet->>DPA: Submit report
```

<details><summary><strong>1. User views the transaction log</strong></summary>

The User views their local, cryptographically retained transaction log in the Wallet dashboard, which surfaces historical presentations as mandated by TS10.
</details>
<details><summary><strong>2. User selects the suspicious transaction</strong></summary>

After identifying unexpected data requests, the User selects the specific suspicious transaction to review the complete log entry.
</details>
<details><summary><strong>3. User chooses to report</strong></summary>

The User pro-actively chooses the "Report to Data Protection Authority" action provided within the Wallet UI.
</details>
<details><summary><strong>4. Wallet Unit retrieves DPA contact information</strong></summary>

The Wallet Unit seamlessly queries the local WRPRC cache or contacts the national Registrar API to securely pull the responsible `supervisoryAuthority.email` string.
</details>
<details><summary><strong>5. Registrar API returns supervisoryAuthority.email</strong></summary>

The Registrar API responds with the structured DPA contact payload, which includes the `supervisoryAuthority.email` field for the competent Data Protection Authority responsible for the Member State where the RP is registered. This ensures the Wallet routes the report to the correct national authority even in cross-border scenarios.
</details>
<details><summary><strong>6. Wallet Unit composes pre-filled report</strong></summary>

The Wallet Unit compiles a structured evidence package—including RP identity, exact date/time, a forensic diff of actual requested attributes versus registered baseline scope, and User annotations—readying it for formal evaluation.
</details>
<details><summary><strong>7. Wallet Unit submits report to DPA</strong></summary>

The Wallet transmits the pre-filled report to the competent DPA via the retrieved `supervisoryAuthority.email` contact. Depending on the DPA's integration level, this may be an email submission (DATA_RPT_05) or a structured API call if the DPA exposes a digital reporting endpoint. The Wallet logs the submission in its internal audit trail.
</details>

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

```mermaid
flowchart TD
    Req["`**1.&nbsp;RP&nbsp;Request**
    OpenID4VP&nbsp;DCQL/HAIP`"]
    
    Eval{"`**2.&nbsp;Wallet&nbsp;Evaluation**
    Evaluate&nbsp;WRPAC&nbsp;vs&nbsp;EDP`"}
    
    Pass["`**Policy&nbsp;Match**
    EDP&nbsp;Allows&nbsp;RP`"]
    
    Reject["`**3.&nbsp;Policy&nbsp;Rejection**
    EDP&nbsp;Denies&nbsp;RP`"]
    
    Override{"`**4.&nbsp;User&nbsp;Override**
    User&nbsp;forced&nbsp;to&nbsp;override?`"}
    
    subgraph Output["`**5.&nbsp;Wallet&nbsp;Response&nbsp;Handling**`"]
        direction LR
        S_OK["`**Valid&nbsp;Payload**
        RP&nbsp;receives&nbsp;credential`"]
        
        S_MISSING["`**Simulated&nbsp;Absence**
        access_denied&nbsp;or&nbsp;omitted
        Indistinguishable&nbsp;delay`"]
        
        S_OK ~~~ S_MISSING
    end
    
    Req --> Eval
    Eval -- "✅ Valid" --> Pass --> S_OK
    Eval -- "❌ Denied" --> Reject --> Override
    Override -- "Approve" --> S_OK
    Override -- "Cancel/Blocked" --> S_MISSING
    
    classDef default text-align:left;
    classDef output state text-align:center;
```

1. **RP Request Initiation**: The RP requests the attestation via an OpenID4VP Authorization Request (e.g., using DCQL or HAIP presentation definitions).
2. **Wallet Unit Evaluation**: The Wallet cryptographically verifies the RP's WRPAC, extracts the identifier/CA chain, and evaluates it against the credential's EDP.
3. **Policy Rejection**: If the policy denies the RP, the Wallet UI flags the presentation as restricted.
4. **User Override Capability**: Crucially, eIDAS 2.0 designates the User as the ultimate controller of their data. Even if the issuer's EDP explicitly blocks the RP, the Wallet *must* inform the User of the issuer's restriction but *may* permit the User to override the denial.
5. **Wallet Response Handling**:
   - **If the User cancels or Wallet blocks**: The Wallet Unit SHALL behave towards the RP **as if the attestation did not exist**. The RP receives an `access_denied` error (with standard timing) or an omitted attestation, maintaining deniability.
   - **If User overrides**: The RP receives the valid payload normally.

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
    actorMargin: 250
---
sequenceDiagram
    autonumber
    participant User as 👤 User
    participant WU as 📱 Wallet Unit
    participant INT as 🔄 Intermediary<br/>(registered as RP)
    participant IRP as 🏦 Intermediated RP
    participant REG as 🏛️ Registrar

    rect rgba(148, 163, 184, 0.14)
    Note right of User: Precondition: Both entities registered
    Note right of INT: Intermediary has WRPAC<br/>(Subject: Intermediary identity)
    Note right of IRP: Intermediated RP registered,<br/>references Intermediary in<br/>registration data
    Note right of REG: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end

    rect rgba(52, 152, 219, 0.14)
    Note right of User: Flow: Presentation via Intermediary
    IRP->>INT: Request presentation<br/>(attributes needed, intended use)
    INT->>INT: Build JAR with:<br/>- WRPAC of Intermediary<br/>- Request extension with<br/>  Intermediated RP identity:<br/>  name, identifier,<br/>  registrar URL, intended use ID<br/>- WRPRC of Intermediated RP<br/>  (if available)
    INT->>WU: OpenID4VP request
    Note right of REG: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end

    rect rgba(46, 204, 113, 0.14)
    Note right of User: Wallet Verification
    WU->>WU: Authenticate Intermediary<br/>via WRPAC chain
    WU->>WU: Extract Intermediated RP<br/>identity from request extension
    WU->>WU: Verify WRPRC (if present)<br/>for Intermediated RP
    alt No WRPRC available
        WU->>REG: Query Registrar for<br/>Intermediated RP data
        REG-->>WU: Registration data
    Note right of REG: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
    WU->>User: Display BOTH identities:<br/>"Intermediary X requests data<br/>on behalf of RP Y"
    User->>WU: Approve
    WU->>WU: Build encrypted response
    WU->>INT: POST response to Intermediary
    Note right of REG: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end

    rect rgba(241, 196, 15, 0.14)
    Note right of User: Response Forwarding
    INT->>INT: Decrypt and verify
    INT->>INT: Extract attributes<br/>(MUST NOT store content data)
    INT->>IRP: Forward verified attributes
    IRP->>IRP: Process attributes
    Note right of REG: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
```

<details><summary><strong>1. Intermediated RP requests presentation from Intermediary</strong></summary>

The Intermediated RP (e.g., an e-commerce platform or a small bank without its own EUDI integration) calls the Intermediary's session initiation API to request a credential presentation. The API call specifies: (a) the attributes needed (e.g., `family_name`, `given_name`, `birth_date`), (b) the credential format (`dc+sd-jwt` or `mso_mdoc`), (c) the Intermediated RP's registered identifier (LEI or national ID), and (d) the intended use under which the request is authorised.

The Intermediary acts as a **technical proxy** — it has its own WRPAC and manages the OpenID4VP protocol on behalf of the Intermediated RP. The Intermediated RP does not need its own WRPAC, ECDH key management, or SD-JWT/mdoc verification capability. However, the Intermediated RP must still be registered in the Registrar (§3.3.1) to ensure the Wallet can verify its legitimacy.
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

The Intermediary delivers the signed JAR to the User's Wallet Unit using the same mechanisms as direct RP flows: DC API (same-device, §7.2 step 6), QR code (cross-device, §8.2 step 6), or push notification. The `response_uri` points to the **Intermediary's** backend (`https://verifier.signicat.com/oid4vp/callback`), not the Intermediated RP — all presentation responses flow through the Intermediary.

> **response_uri domain**: The `response_uri` must match the domain authorised by the Intermediary's WRPAC SAN. The Intermediated RP's domain is irrelevant for response routing — the Wallet sends the JWE to the Intermediary, which then forwards verified attributes to the Intermediated RP.
</details>
<details><summary><strong>4. Wallet Unit authenticates Intermediary via WRPAC chain</strong></summary>

The Wallet verifies the Intermediary's WRPAC certificate chain (from the JAR's `x5c` header) against the Access CA LoTE trust anchor, identical to §7.2 steps 8–10. The WRPAC identifies the **Intermediary** entity (e.g., *"Signicat AS"*), not the end Intermediated RP — this is a key distinction. The Wallet knows it is interacting with a third-party verification service, not the business the User is actually engaging with.

The Wallet also verifies the JAR's `client_id` matches the Intermediary's WRPAC SAN, checks the WRPAC's revocation status, and validates the JAR's temporal claims (`iat`, `exp`, `nbf`).
</details>
<details><summary><strong>5. Wallet Unit extracts Intermediated RP identity from request extension</strong></summary>

The Wallet extracts the `intermediated_rp` extension from the JAR payload (step 2). This extension contains: `name` (localised display name), `identifier` (LEI or national registration number), `registrar_uri` (the Registrar API endpoint for this RP's Member State), and `intended_use_id` (the registered use case). The Wallet will display this identity on the consent screen (step 9) alongside the Intermediary's identity.

> **Trust model**: The Intermediary's WRPAC signature over the JAR (including the `intermediated_rp` extension) creates an implicit assertion: *"I, the Intermediary, certify that I am acting on behalf of this Intermediated RP."* The Wallet relies on this assertion and verifies it against the Registrar (steps 6–8).
</details>
<details><summary><strong>6. Wallet Unit verifies WRPRC for Intermediated RP</strong></summary>

If the JAR includes a WRPRC (Wallet Relying Party Registration Certificate) for the Intermediated RP, the Wallet verifies it cryptographically. The WRPRC is issued by the Registrar and contains the Intermediated RP's registration details: `legalName`, `intended_use`, supported credential types and claims. The Wallet checks:

1. WRPRC signature validity (signed by the Registrar's key)
2. WRPRC expiry (`notAfter` is in the future)
3. The `intended_use` in the WRPRC matches the `intended_use_id` in the `intermediated_rp` extension
4. The requested DCQL claims are within the WRPRC's authorised claim set

> **WRPRC availability**: Not all Intermediated RPs will have a WRPRC — the certificate may not yet be issued, or the Registrar may not support WRPRC issuance. In this case, the Wallet falls back to the Registrar API query (steps 7–8).
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

The Registrar responds with a signed JWT assertion (§3.4.4 step 4) confirming: (a) the Intermediated RP is registered, (b) it is authorised to request the specified claims under the stated intended use, and (c) it has designated the querying Intermediary as an authorised proxy. The response may also include the RP's `srvDescription` (localised service description) for display on the consent screen.

> **If the Registrar returns `NOT_FOUND` or `UNAUTHORIZED`**: The Wallet MUST display a warning on the consent screen: ⚠️ *"The requesting party could not be verified as registered."* The User can still proceed but is informed of the risk.
</details>
<details><summary><strong>9. Wallet Unit displays both Intermediary and RP identities to User</strong></summary>

The Wallet constructs a **dual-identity consent screen** (Art. 5a(4)(b)) that clearly distinguishes the two entities involved:

- **Requesting via**: 🔄 *"Signicat AS"* (from the WRPAC) — the technical entity that will receive and process the encrypted response
- **On behalf of**: 🏦 *"Example Bank AG"* (from the `intermediated_rp` extension) — the business entity that will ultimately receive the verified attributes
- **Requested attributes**: `family_name`, `given_name`, `birth_date`
- **Purpose**: *"KYC customer onboarding"* (from the Registrar or WRPRC `srvDescription`)
- **Registration status**: ✅ *"Both entities are registered"* or ⚠️ *"Intermediated RP could not be verified"*

This dual-identity display is the key UX element that distinguishes the Intermediary model from the Direct model. The User must understand that their data will first pass through the Intermediary before reaching the Intermediated RP.
</details>
<details><summary><strong>10. User approves data release to Intermediated RP via Intermediary</strong></summary>

The User reviews the dual-identity consent screen and approves the data release. The User authenticates via biometric or PIN (LoA High) to unlock the WSCA for KB-JWT signing. The User's consent covers: (a) release of the specified attributes, (b) routing through the named Intermediary, and (c) delivery to the named Intermediated RP.

> **User awareness**: The User should understand that the Intermediary will momentarily hold their data in memory during verification and forwarding. The consent screen should make this data routing transparent.
</details>
<details><summary><strong>11. Wallet Unit builds encrypted response with vp_token</strong></summary>

The Wallet builds the `vp_token` (SD-JWT VC with selected disclosures and KB-JWT, or mdoc `DeviceResponse`), encrypts it into a JWE using the Intermediary's ephemeral ECDH-ES public key from the JAR's `response_encryption_jwk`, identical to §7.2 steps 16–17. The KB-JWT's `aud` claim is set to the **Intermediary's** `client_id` (not the Intermediated RP's), since the Intermediary is the entity that will verify it.

> **Encryption recipient**: The JWE is encrypted to the **Intermediary's** ephemeral key. The Intermediated RP cannot decrypt the response directly — it relies on the Intermediary to decrypt, verify, and forward the attributes.
</details>
<details><summary><strong>12. Wallet Unit POSTs encrypted response to Intermediary</strong></summary>

The Wallet POSTs the JWE to the Intermediary's `response_uri` (`https://verifier.signicat.com/oid4vp/callback`), identical to §7.2 step 18. The response goes to the **Intermediary**, not the Intermediated RP. The Intermediary's backend correlates the response with the pending session using the `state` parameter.
</details>
<details><summary><strong>13. Intermediary decrypts JWE and verifies presentation</strong></summary>

The Intermediary performs the complete verification pipeline — the same verification an RP would do in the Direct model:

1. Decrypt the JWE using the session's ephemeral private key (then destroy it)
2. Parse the SD-JWT VC and verify the Issuer-JWT signature against the PID Provider LoTE trust anchor (§4.5.3)
3. Verify the KB-JWT signature against the `cnf.jwk` bound in the credential
4. Validate `aud` (matches the Intermediary's `client_id`), `nonce`, `sd_hash`, and `iat` recency
5. Check the credential's revocation status via the Token Status List
6. Verify the disclosed claims' SHA-256 digests against the Issuer-JWT `_sd` array

The Intermediary bears the full verification responsibility — the Intermediated RP trusts the Intermediary's verification result and does not re-verify the cryptographic proofs.
</details>
<details><summary><strong>14. Intermediary extracts attributes (MUST NOT store content data)</strong></summary>

The Intermediary extracts the verified attribute values (e.g., `family_name: "Müller"`, `given_name: "Anna"`, `birth_date: "1990-03-15"`) into an in-memory data structure. **Article 5b(10)** of Regulation 910/2014 imposes a strict legal obligation: the Intermediary *"shall not store the content of the transaction data"*. This means:

- The extracted attributes MUST NOT be persisted to disk, database, or any durable storage
- The attributes should exist in memory only for the duration of the forwarding operation (step 15)
- The Intermediary MUST purge the attributes from memory immediately after forwarding
- Log entries may record metadata (timestamp, credential type, verification result, session ID) but MUST NOT include attribute values

> **Audit compliance**: The Intermediary may retain proof-of-verification metadata (e.g., *"PID verified successfully at 2026-07-15T14:32:00Z, 3 attributes disclosed, forwarded to Example Bank AG"*) but not the actual values *"Müller", "Anna"*. This balance allows audit trails without violating Art. 5b(10).
</details>
<details><summary><strong>15. Intermediary forwards verified attributes to Intermediated RP</strong></summary>

The Intermediary transmits the verified attributes to the Intermediated RP's backend via the pre-configured delivery channel. Common mechanisms (see §20.6.1 for full analysis):

- **Webhook** — the Intermediary POSTs a signed JWT (containing the verified attributes) to the Intermediated RP's callback URL. The JWT is signed with the Intermediary's key, and the Intermediated RP trusts this signature as proof of verification.
- **SSE (Server-Sent Events)** — the Intermediated RP maintains a persistent connection to the Intermediary and receives events in real-time.
- **Polling** — the Intermediated RP periodically queries the Intermediary's session status endpoint.

The forwarded payload typically includes: the verified attribute values, a verification timestamp, the credential type, and a session reference. The Intermediated RP trusts the Intermediary's assertion — it does not receive the raw SD-JWT or KB-JWT.
</details>
<details><summary><strong>16. Intermediated RP processes received attributes</strong></summary>

The Intermediated RP receives the verified attributes from the Intermediary and processes them within its business logic layer — CDD onboarding (§19), account creation, age verification, or identity matching. From this point, the flow continues identically to a Direct RP model: the RP creates an authenticated session, updates its records, and redirects the User.

The Intermediated RP's data retention obligations (GDPR Art. 5(1)(e), Art. 6) are independent of the Intermediary — the RP stores and processes the attributes according to its own privacy policy and the User's consent. The Intermediary's Art. 5b(10) deletion obligation does not apply to the Intermediated RP.

> **Trust delegation trade-off**: The Intermediated RP fully trusts the Intermediary's verification. If the Intermediary's verification was flawed (e.g., failed to check revocation), the Intermediated RP has no way to detect this. RPs should select Intermediaries with contractual SLAs covering verification completeness and liability.
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

The intermediary's role doesn't end at Wallet interaction. It must securely forward verified attributes to the intermediated RP. The ARF and CIR do not prescribe a specific protocol for this leg — it is a private API contract between intermediary and intermediated RP, typically implemented via webhook push, SSE, or polling (§20.6.4 specifies the callback payload requirements for both SaaS and intermediary models).

#### 17.4.1 Verification Gates and Forwarding Requirements (AS-RP-51-011/012)

Before forwarding any data, the intermediary acts as a verification gateway. Under ARF HLR **AS-RP-51-012**, the intermediary `SHALL` verify the attributes. The ARF specifies five verification dimensions:

```mermaid
flowchart TD
    subgraph Gate["`**Verification&nbsp;Dimensions&nbsp;(AS-RP-51-012)**`"]
        V1["`**1.&nbsp;Authenticity**
        Check&nbsp;signature&nbsp;vs&nbsp;LoTE&nbsp;chain`"]
        V2["`**2.&nbsp;Revocation&nbsp;Status**
        Check&nbsp;Status&nbsp;List/OCSP`"]
        V3["`**3.&nbsp;Device&nbsp;Binding**
        Verify&nbsp;WSCD&nbsp;proof`"]
        V4["`**4.&nbsp;User&nbsp;Binding**
        Verify&nbsp;authorised&nbsp;user`"]
        V5["`**5.&nbsp;Wallet&nbsp;Unit&nbsp;Authenticity**
        Verify&nbsp;WUA&nbsp;+&nbsp;revocation`"]
    end
    
    Cond{"`**Conditional&nbsp;Forwarding**
    Did&nbsp;ALL&nbsp;agreed&nbsp;verifications&nbsp;pass?`"}
    
    Reject["`**❌&nbsp;Drop&nbsp;Payload**
    Do&nbsp;not&nbsp;forward`"]
    
    subgraph Transmit["`**Payload&nbsp;Transmission&nbsp;Rules**`"]
        direction LR
        T1["`1.&nbsp;Authenticate&nbsp;Intermediated&nbsp;RP`"]
        T2["`2.&nbsp;Encrypt&nbsp;payload&nbsp;(TLS&nbsp;1.3+)`"]
        T3["`3.&nbsp;NO&nbsp;STORAGE&nbsp;of&nbsp;content&nbsp;data`"]
        T4["`4.&nbsp;Include&nbsp;provenance&nbsp;metadata`"]
        T5["`5.&nbsp;Forward&nbsp;promptly&nbsp;(no&nbsp;batches)`"]
        T1 ~~~ T2 ~~~ T3 ~~~ T4 ~~~ T5
    end
    
    Gate --> Cond
    Cond -- "No" --> Reject
    Cond -- "Yes" --> Transmit
    
    style V1 text-align:left
    style V2 text-align:left
    style V3 text-align:left
    style V4 text-align:left
    style V5 text-align:left
```

**The "As Agreed" Qualification**: The ARF explicitly notes that it *does not mandate* a Relying Party to require all 5 verifications. The intermediary and the intermediated RP must agree contractually on which verifications the intermediary will carry out. This creates a per-RP configuration requirement.

**Conditional Forwarding (AS-RP-51-011)**: If any of the *agreed* verifications fail, the intermediary `SHALL NOT` forward any attributes to the RP. Successful verification is a strict prerequisite for forwarding. Beyond the verification gate, when transmitting the payload, the intermediary MUST: (1) **Authenticate** the RP, (2) **Encrypt** in transit, (3) **NOT store** content data, (4) Include **provenance metadata**, and (5) **Forward promptly**.

---

## RP Engineering and Operations

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
    actorMargin: 250
---
sequenceDiagram
    autonumber
    participant User as 👤 Customer
    participant WU as 📱 Wallet Unit
    participant Bank as 🏦 Bank (RP)
    participant SL as 📋 Status List

    rect rgba(148, 163, 184, 0.14)
    Note right of User: Phase 1: PID Presentation & Verification
    User->>Bank: Begin onboarding (web/app)
    Bank->>Bank: Build DCQL for CDD:<br/>PID: family_name, given_name,<br/>birth_date, nationality,<br/>personal_identifier,<br/>resident_address
    Bank->>WU: OpenID4VP request<br/>(same-device or cross-device)
    WU->>User: Consent screen
    User->>WU: Approve
    WU->>Bank: Encrypted PID presentation
    Bank->>Bank: Verify PID (signature,<br/>revocation, device binding)
    Bank->>SL: Check PID revocation
    SL-->>Bank: VALID
    Note right of SL: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end

    rect rgba(52, 152, 219, 0.14)
    Note right of User: Phase 2: AML / Sanctions / PEP Screening
    Bank->>Bank: Run AML screening<br/>against PID attributes:<br/>- Name matching<br/>- DOB matching<br/>- Nationality check<br/>- Sanctions lists<br/>- PEP databases
    Note right of SL: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end

    rect rgba(46, 204, 113, 0.14)
    Note right of User: Phase 3: Enhanced Due Diligence (if triggered)
    Bank->>WU: Request additional<br/>attestations (if EDD):<br/>- Source of funds<br/>- Employment attestation<br/>- Tax residency
    WU->>User: Consent for additional<br/>attestations
    User->>WU: Approve
    WU->>Bank: Additional attestation<br/>presentation
    Note right of SL: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end

    rect rgba(241, 196, 15, 0.14)
    Note right of User: Phase 4: CDD Decision & Account Creation
    Bank->>Bank: CDD decision:<br/>APPROVED / REJECTED / EDD
    Bank->>User: Account opened /<br/>further review needed
    Note right of SL: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
```

#### 19.1.1 CDD Payload Walkthrough

<details><summary><strong>1. Customer initiates onboarding at Bank web/app</strong></summary>

The prospective customer initiates the account opening process on the Bank's website or mobile app (e.g., clicking *"Open Account"* on a digital bank's landing page). The Bank's onboarding system creates a CDD session and determines that EUDI Wallet identity verification is available. Under AMLD Art. 13, the Bank must perform Customer Due Diligence (CDD) before establishing a business relationship — verifying the customer's identity, understanding the nature of the business relationship, and screening against sanctions/PEP databases.

> **Digital-first CDD**: EUDI Wallet-based CDD replaces traditional methods (video-ident, PostIdent, document scanning) with a cryptographically verified identity presentation. The Bank can complete CDD in seconds rather than minutes, with higher assurance (LoA High) than document-based methods.
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

The Wallet verifies the Bank's JAR (WRPAC chain, revocation, `client_id` matching) and displays a consent screen showing:

- **RP identity**: 🏦 *"Example Bank AG"* (from WRPAC Subject) with ✅ registered status
- **Purpose**: *"Customer onboarding and KYC verification"* (from Registrar or WRPRC `srvDescription`)
- **Requested attributes**: 9 CDD-specific attributes listed individually (family_name, given_name, birth_date, nationality, personal_identifier, resident_address, resident_city, resident_postal_code, resident_country)
- **Data retention notice**: The Bank is likely to store these attributes permanently (unlike W2W flows) — the consent screen should indicate this via the privacy policy link

For CDD use cases, the attribute list is longer than typical presentations (9 claims vs. 1–3 for age verification). The Wallet should present the list in a scrollable, structured format grouped by category (identity, nationality, address).
</details>
<details><summary><strong>5. Customer approves attribute disclosure</strong></summary>

The Customer reviews the 9 requested CDD attributes and approves via biometric or PIN authentication (LoA High). The Customer should understand that CDD data will be retained by the Bank for the duration of the business relationship (AMLD Art. 40 — minimum 5 years after the relationship ends). Unlike transient verifications (e.g., age checks), CDD consent implies long-term data storage.

> **Selective disclosure in CDD context**: While SD-JWT enables selective disclosure, CDD use cases typically require all requested attributes — a Customer who declines to share `personal_identifier` or `resident_address` will fail the Bank's CDD check. The Wallet should indicate which attributes are marked as required vs. optional in the DCQL query.
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

The Bank performs the complete SD-JWT VC verification pipeline (§4.4.2):

1. **Issuer signature** — verify the Issuer-JWT ES256 signature against the PID Provider's trust anchor from the LoTE cache (§4.5.3)
2. **Disclosure integrity** — for each of the 9 disclosed attributes, compute `SHA-256(base64url(disclosure))` and match against the `_sd` array in the Issuer-JWT
3. **KB-JWT device binding** — verify the KB-JWT signature against the `cnf.jwk`, validate `aud` (matches Bank's `client_id`), `nonce`, `sd_hash`, and `iat` recency
4. **Credential metadata** — check `iat`, `exp` (PID validity period), and `vct` (credential type matches `eu.europa.ec.eudi.pid.1`)

For CDD, the verification must be performed with the highest rigour — a false positive (accepting a forged or replayed PID) could expose the Bank to regulatory sanctions under AMLD Art. 59 (penalties for non-compliance).
</details>
<details><summary><strong>8. Bank checks PID revocation via Status List</strong></summary>

The Bank queries the PID Provider's Token Status List (§4.4.2 step 3) using the `status.status_list.uri` and `status.status_list.idx` from the Issuer-JWT. The Bank fetches the Status List Token JWT, verifies its signature, decompresses the DEFLATE bitstring, and checks the bit at the specified index.

For CDD, revocation checking is **mandatory** — the Bank must not onboard a customer with a revoked PID. A revoked PID may indicate: identity fraud, PID Provider-initiated suspension (e.g., reported stolen device), or cascade revocation due to Wallet Unit compromise (CIR 2024/2977 Art. 5.4(b)).
</details>
<details><summary><strong>9. Status List confirms PID credential validity to Bank</strong></summary>

The Status List returns bit value `0` (VALID). The identity verification portion of CDD is now cryptographically complete — the Bank has: (a) a cryptographically verified identity (PID signed by a Member State–notified PID Provider), (b) proof of device possession (KB-JWT), (c) confirmation the credential is not revoked, and (d) 9 verified CDD attributes.

This is the functional equivalent of a traditional KYC identity check (passport scan + liveness verification) but with significantly higher assurance: the PID was issued at LoA High by a government-notified provider, and the device binding proves the Customer is the legitimate holder.
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

If the AML screening (step 10) flags elevated risk — e.g., the Customer is a Politically Exposed Person (PEP), has a nationality from a FATF high-risk jurisdiction, or the `personal_identifier` matches a watch list entry — the Bank triggers an Enhanced Due Diligence (EDD) workflow. The Bank sends a **second** OpenID4VP request to the Wallet Unit, requesting additional Qualified Electronic Attestation of Attributes (QEAAs):

- **Source of funds attestation** — issued by an employer, tax authority, or notary
- **Tax residency certificate** — issued by a national tax authority
- **Employment attestation** — issued by an employer or social security authority
- **Residence permit** — for non-EU nationals, issued by immigration authorities

The availability of these QEAAs depends on Member State implementation and the Attestation Provider ecosystem maturity (§19.3). In early EUDI deployments, many EDD attestations may not yet exist in digital form, requiring the Bank to fall back to traditional document submission.
</details>
<details><summary><strong>12. Wallet Unit displays consent screen for additional attestations</strong></summary>

The Wallet displays a new consent screen for the EDD attestations. This screen is distinct from the initial CDD consent (step 4) — it shows different credential types (QEAAs from different issuers) and may involve credentials the Customer is less familiar with. The Wallet should clearly indicate that this is a follow-up request from the same Bank, linked to the ongoing onboarding session.

> **Multi-credential consent**: If the Bank requests multiple EDD attestations in a single DCQL query (using the `credentials` array), the Wallet should display all requested attestations on a single consent screen. If requested as separate transactions, each gets its own consent screen.
</details>
<details><summary><strong>13. Customer approves secondary attestation request</strong></summary>

The Customer reviews and approves the EDD attestation request with biometric/PIN authentication. The Customer may not possess all requested QEAAs — in this case, the Wallet should indicate which credentials are available (with checkmarks) and which are missing. If a required QEAA is not available, the Bank must provide an alternative path (e.g., manual document upload).
</details>
<details><summary><strong>14. Wallet Unit sends additional attestation presentation to Bank</strong></summary>

The Wallet encrypts and sends the EDD attestation presentation to the Bank's `response_uri` (may be a different endpoint from the CDD callback, e.g., `/oid4vp/edd-callback`). The response follows the same JWE format as step 6: SD-JWT VC with KB-JWT for each disclosed QEAA. The Bank correlates this response with the CDD session using the `state` parameter.

> **Cross-issuer verification**: Unlike the initial PID (issued by a single PID Provider), EDD attestations may come from multiple issuers (employer, tax authority, immigration office). The Bank must verify each issuer's signature against the appropriate LoTE trust anchor — potentially different LoTEs per issuer type.
</details>
<details><summary><strong>15. Bank reaches final CDD decision (APPROVED / REJECTED / EDD)</strong></summary>

The Bank's CDD engine correlates all verified data — the 9 PID attributes (step 6), the AML screening results (step 10), and any EDD attestations (step 14) — to reach a final onboarding decision:

- **APPROVED** — all CDD checks passed, AML screening clear, risk score LOW. The Bank creates the customer record and opens the account.
- **APPROVED with enhanced monitoring** — CDD passed but risk score MEDIUM (e.g., geographic risk). Account opened with ongoing transaction monitoring.
- **MANUAL REVIEW** — inconclusive results (e.g., PEP match requires human assessment, fuzzy name match against sanctions list). The application is escalated to a compliance officer.
- **REJECTED** — definitive AML hit (confirmed sanctions match), revoked PID, or failed identity verification. The Bank declines the account opening and may file a Suspicious Activity Report (SAR) if required.

The Bank stores the CDD evidence package (verified attribute values, verification timestamps, KB-JWT `jti` identifiers, AML screening results) for the regulatory retention period (AMLD Art. 40 — minimum 5 years after the business relationship ends).
</details>
<details><summary><strong>16. Bank notifies Customer of account opening or review status</strong></summary>

The Bank updates the onboarding session with the final decision:

- **APPROVED**: The Customer sees a success screen (*"Your account has been opened. You can now log in."*) and receives account details (IBAN, online banking credentials). The entire onboarding flow — from clicking "Open Account" to receiving an IBAN — can complete in under 2 minutes with EUDI Wallet CDD.
- **MANUAL REVIEW**: The Customer sees a pending screen (*"Your application is being reviewed. We will notify you within 2 business days."*) with a reference number.
- **REJECTED**: The Customer sees a decline screen with a generic reason (*"We are unable to open an account at this time."*). The Bank must not disclose specific AML screening results to the Customer (tipping-off prohibition, AMLD Art. 39).

> **Audit trail**: The Bank logs the complete CDD workflow for regulatory audit: session ID, PID Provider, verification timestamps, AML screening results, decision outcome, and the compliance officer's approval (if manual review). This audit trail must be available to financial supervisors upon request.
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
    actorMargin: 250
---
sequenceDiagram
    autonumber
    participant W as 📱 Wallet Unit
    participant P as ⚙️ Verification<br/>Policy Engine
    participant E as 🌐 External Service<br/>(AML / Screening)

    rect rgba(148, 163, 184, 0.14)
    Note over W,P: Phase 1 — VP Token Submission
    W->>P: POST /verify (VP Token)
    Note right of E: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end

    rect rgba(46, 204, 113, 0.14)
    Note over P: Phase 2 — Static Policy Chain
    P->>P: Policy Engine verifies signature
    P->>P: Policy Engine checks expiry (exp)
    P->>P: Policy Engine checks revocation<br/>(TokenStatusList)
    Note right of E: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end

    rect rgba(52, 152, 219, 0.14)
    Note over P,E: Phase 3 — Webhook Delegation
    P->>E: POST /screen { credential_type,<br/>attributes }
    Note right of E: AML/Sanctions<br/>screening logic
    E-->>P: 200 { "pass": true }
    Note right of E: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end

    rect rgba(241, 196, 15, 0.14)
    Note over P,W: Phase 4 — Result Delivery
    P-->>W: Verification Result<br/>(all policies passed)
    Note right of E: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
```

<details><summary><strong>1. Wallet Unit submits VP Token to Verification Policy Engine</strong></summary>

The Wallet POSTs the VP Token (containing the SD-JWT VC or mdoc presentation) to the verification platform's `/verify` endpoint. This is the L1 protocol callback — the `direct_post` response arrives at the verifier's `response_uri`. At this stage, the VP Token is an opaque, encrypted JWE payload. The policy engine decrypts it using the session's ephemeral private key and prepares the credential for the static policy chain. The Wallet's role ends here — it has no visibility into the policy evaluation that follows.
</details>
<details><summary><strong>2. Policy Engine verifies credential signature</strong></summary>

The first static check: the policy engine extracts the Issuer-JWT (SD-JWT VC) or IssuerAuth COSE_Sign1 (mdoc) and verifies the digital signature against the LoTE trust anchor. This confirms the credential was issued by a trusted PID Provider or Attestation Provider and has not been tampered with in transit.
</details>
<details><summary><strong>3. Policy Engine checks credential expiry</strong></summary>

The second static check: the engine validates that the current time falls within the credential's `nbf`–`exp` window. Expired credentials are rejected regardless of all other checks. For short-lived credentials (SD-JWT VCs with 24-hour validity), this check is time-critical and requires accurate server clock synchronisation (NTP).
</details>
<details><summary><strong>4. Policy Engine checks revocation via TokenStatusList</strong></summary>

The third static check: the engine queries the Token Status List (RFC 9598) at the index specified in the credential's `status` claim. A non-zero value at the index indicates revocation. See Annex B.2 for the full status resolution flow. These three static checks are deterministic and require no external input beyond the LoTE cache and Status List cache. They execute in milliseconds and are identical across all RP tenants on the platform. If any static check fails, the pipeline short-circuits — no webhook delegation occurs.
</details>
<details><summary><strong>5. Policy Engine delegates decision to External Service via webhook</strong></summary>

If all static checks pass and the RP has configured a Dynamic policy (§20.1.1 Tier 3) with a webhook target, the policy engine forwards the disclosed attributes to the external service — for example, the RP's AML screening endpoint. The request includes the `credential_type` and the specific attribute values (e.g., `family_name`, `given_name`, `birth_date`) needed for the screening decision. This decoupling allows RPs to inject business-specific rules (AML, age thresholds, jurisdiction restrictions) without modifying the verification platform itself.
</details>
<details><summary><strong>6. External Service returns screening result</strong></summary>

The external service (e.g., AML screening, sanctions list check) performs its domain-specific logic and returns a synchronous JSON response with a pass/fail decision. The policy engine treats this as another link in the policy chain — if the webhook returns `"pass": false`, the overall verification fails even though all cryptographic checks passed.

> **Timeout handling**: If the external service does not respond within a configurable timeout (typically 5–30 seconds), the policy engine should treat the webhook as failed and return a `REQUIRES_REVIEW` status rather than silently passing.
</details>
<details><summary><strong>7. Policy Engine delivers aggregated result to Wallet Unit</strong></summary>

The policy engine aggregates the results from all tiers — static checks (signature, expiry, revocation) and dynamic checks (webhook delegation) — into a single verification decision. The result is returned to the Wallet via the OpenID4VP response mechanism (`redirect_uri` or `response_code`). In a SaaS deployment, this result is also delivered to the RP via the L2 callback (§20.6.2).

The aggregated result includes a per-policy breakdown (e.g., `signature: PASS`, `revocation: PASS`, `webhook_aml: PASS`) so the RP can distinguish between cryptographic failures and business-rule failures in its audit trail. This breakdown is critical for regulated RPs — a verification that was cryptographically valid but failed AML screening has fundamentally different compliance implications than one with an invalid signature.
</details>

&nbsp;

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

##### 20.6.2 Direct SaaS Integration Pattern

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
    actorMargin: 250
---
sequenceDiagram
    autonumber
    participant U as 👤 User Browser
    participant RP as 🏦 RP Backend
    participant V as 🔄 SaaS Verifier
    participant W as 📱 Wallet Unit

    rect rgba(148, 163, 184, 0.14)
    Note over U,V: Phase 1 — Session Initiation
    U->>RP: User clicks "Verify with<br/>EUDI Wallet"
    RP->>V: RP calls POST /openid4vc/verify<br/>{ dcql_query, statusCallbackUri }
    V-->>RP: Verifier returns session_id +<br/>authorization_request_uri
    RP-->>U: RP renders QR code or<br/>redirect URI
    Note right of W: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end

    rect rgba(52, 152, 219, 0.14)
    Note over U,W: Phase 2 — OpenID4VP Protocol (L1 direct_post)
    U->>W: User scans QR / follows redirect
    W->>W: Wallet displays consent screen
    W->>V: Wallet POSTs to response_uri<br/>(vp_token, direct_post.jwt)
    V->>V: Verifier runs signature,<br/>revocation, holder binding
    V->>V: Verifier evaluates policy chain<br/>(L3 webhooks if configured)
    Note right of W: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end

    rect rgba(46, 204, 113, 0.14)
    Note over V,RP: Phase 3 — Result Delivery (L2 Callback)
    V->>RP: Verifier POSTs to<br/>statusCallbackUri
    Note right of RP: Authorization: Bearer<br/>statusCallbackApiKey
    RP->>RP: RP processes result,<br/>updates user session
    Note right of W: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end

    rect rgba(241, 196, 15, 0.14)
    Note over RP,U: Phase 4 — User Redirect
    RP-->>U: RP redirects to<br/>authenticated page
    Note right of W: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
```

<details><summary><strong>1. User Browser initiates verification request to RP Backend</strong></summary>

The User clicks a *"Verify with EUDI Wallet"* button on the RP's website or app. The RP's frontend sends an AJAX or form `POST` to the RP's own backend — at this point, neither the User nor the browser knows that a SaaS verifier will handle the OpenID4VP protocol. The RP's backend only needs to know: which credentials to request, and where to receive the result. All protocol-level complexity (JAR construction, nonce management, ECDH key generation, response decryption) is delegated to the verifier.
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

The verifier creates the complete OpenID4VP session internally — generating the JAR (signed with the verifier-held WRPAC, or the RP's WRPAC if key-managed by the verifier), a cryptographic `nonce`, an ephemeral ECDH key pair for response encryption, and a `response_uri` pointing to the verifier's own callback endpoint. The verifier returns:

- **`session_id`** — an opaque identifier the RP uses to correlate the callback (step 10)
- **`authorization_request_uri`** — a URL containing the signed JAR (e.g., `openid4vp://authorize?request_uri=https://verifier.saas.example/sessions/abc123/jar`)

The RP never constructs the JAR, manages ephemeral keys, or configures `response_uri`. This is the core value proposition of the SaaS model: the RP's integration surface is a single REST API call.
</details>
<details><summary><strong>4. RP Backend renders authorization request to User Browser</strong></summary>

The RP's backend returns the `authorization_request_uri` to the frontend, which renders it according to the flow type:

- **Cross-device** — render as a QR code on the web page (§8.2 step 6). The QR contains the full `authorization_request_uri`. The RP's frontend starts polling or opens an SSE/WebSocket connection to detect when the verification completes (step 12).
- **Same-device** — invoke the W3C Digital Credentials API (§7.2 step 6) with the `authorization_request_uri`, which triggers the OS-level Wallet handoff.

The RP's frontend code is identical regardless of which SaaS verifier is used — it only needs to render a URI. This is the L1 abstraction: the RP treats the `authorization_request_uri` as an opaque link.
</details>
<details><summary><strong>5. User Browser delivers authorization request to Wallet Unit</strong></summary>

The User scans the QR code (cross-device) or the browser invokes the Wallet via the DC API (same-device). The Wallet fetches the JAR from the `request_uri`, verifies the JWS signature against the WRPAC `x5c` chain, and parses the DCQL query. From the Wallet's perspective, it is interacting with whichever entity's WRPAC signed the JAR — either the SaaS verifier's own WRPAC or the RP's WRPAC (depending on the key management model, §20.6.2 step 2 note).
</details>
<details><summary><strong>6. Wallet Unit displays consent screen to User</strong></summary>

The Wallet displays the consent screen showing: the RP's identity (extracted from the WRPAC Subject/SAN), the requested attributes (e.g., `family_name`, `given_name`, `birth_date`), and the purpose (from WRPRC or Registrar). If the SaaS verifier uses **its own** WRPAC (not the RP's), the consent screen shows the verifier's identity — which may confuse Users who expect to see the RP's name. This is why the Intermediary model (§17.2) with dual-identity display exists as a regulated alternative.

> **WRPAC ownership matters**: In the Direct SaaS model, the WRPAC holder determines what the User sees on the consent screen. If the SaaS verifier manages the RP's WRPAC (key custodianship), the User sees the RP's name. If the verifier uses its own WRPAC, the User sees the verifier — which functionally becomes an Intermediary and should follow the §17.2 regulatory model.
</details>
<details><summary><strong>7. Wallet Unit submits VP Token to SaaS Verifier via `direct_post`</strong></summary>

The Wallet POSTs the `vp_token` (wrapped in a `direct_post.jwt` JWE) to the `response_uri` hosted by the SaaS verifier — **not** the RP. This is the L1 (protocol-layer) callback: the Wallet communicates exclusively with the verifier. The RP never sees the raw OpenID4VP response, the JWE, or the SD-JWT/mdoc payload. This architectural separation means the RP does not need to implement any OpenID4VP response handling, JWE decryption, or credential format parsing.
</details>
<details><summary><strong>8. SaaS Verifier executes verification pipeline</strong></summary>

The verifier decrypts the JWE (using the session's ephemeral private key) and runs the full verification pipeline (§10 / §20.1.1):

1. **Issuer signature** — verify the Issuer-JWT or IssuerAuth COSE_Sign1 against the LoTE trust anchor
2. **Expiry/temporal checks** — `exp`, `nbf`, `iat` within acceptable windows
3. **Revocation** — query the Token Status List (or OCSP for mdoc) for the credential's status index
4. **Holder binding** — verify KB-JWT signature (SD-JWT) or DeviceAuth COSE_Sign1 (mdoc) against the credential's `cnf.jwk` or device key
5. **Disclosure integrity** — SHA-256 digest matching for each disclosed attribute
6. **WRPAC policy** — confirm the requested attributes are within the WRPAC/WRPRC authorised scope

These are the Static and Parameterized policy tiers (§20.1.1). The verifier applies them uniformly across all RP tenants.
</details>
<details><summary><strong>9. SaaS Verifier evaluates dynamic policy chain</strong></summary>

If the RP has configured Dynamic policies (§20.1.1 Tier 3), the verifier evaluates them after the cryptographic verification. Dynamic policies can include:

- **L3 webhook delegations** — the verifier sends disclosed attributes to an external endpoint (e.g., the RP's AML screening service at `https://rp.example.com/aml-check`) and waits for a pass/fail response
- **Custom rules** — e.g., *"accept PID only from DE, NL, FR issuers"*, *"require age_over_18 = true"*, *"reject if birth_date indicates age < 16"*
- **Cross-credential matching** — if multiple credentials were presented (combined presentation, §15.5.6), the verifier can check consistency (e.g., same `personal_identifier` across PID and mDL)

The policy chain result (all tiers: static + parameterized + dynamic) is aggregated into a final verification decision: `SUCCESS`, `FAILED`, or `REQUIRES_REVIEW`.
</details>
<details><summary><strong>10. SaaS Verifier delivers result to RP Backend via L2 callback</strong></summary>

The verifier POSTs the verification result to the RP's `statusCallbackUri` with the `statusCallbackApiKey` as a `Bearer` token in the `Authorization` header. The callback payload includes:

- **`session_id`** — for correlation with the RP's pending session
- **`status`** — `SUCCESS` or `FAILED`
- **`verification_result`** — per-policy breakdown (e.g., `signature: PASS`, `revocation: PASS`, `holder_binding: PASS`, `custom_policy_aml: PASS`)
- **`disclosed_attributes`** — the verified attribute values (e.g., `{"family_name": "Müller", "given_name": "Anna", "birth_date": "1990-03-15"}`)
- **`credential_metadata`** — issuer, credential type, issuance/expiry dates

This L2 (operational) callback is the bridge between the SaaS verifier's OpenID4VP world and the RP's application layer. The RP receives clean, verified JSON — no SD-JWT parsing, no CBOR decoding, no COSE verification required.
</details>
<details><summary><strong>11. RP Backend processes verification result</strong></summary>

The RP validates the incoming callback: (a) verifies the `statusCallbackApiKey` Bearer token matches the expected value, (b) matches the `session_id` to a pending verification session in the RP's state store, (c) checks for duplicate callbacks (idempotency). The RP then extracts the disclosed attributes and applies its business logic — CDD onboarding (§19), age verification, SCA (§13), or identity matching.

The RP stores the verification outcome, attribute values, and the verifier's `session_id` (as an audit reference) in its database. The RP's integration code is typically 20–50 lines: validate callback → extract attributes → apply business logic → update session. All cryptographic complexity is handled by the SaaS verifier.
</details>
<details><summary><strong>12. RP Backend redirects User Browser to authenticated page</strong></summary>

The RP updates the User's browser session. The mechanism depends on the flow type:

- **Cross-device (QR)** — the RP's frontend has been polling (or listening via SSE/WebSocket) since step 4. When the callback (step 10) arrives, the RP updates the session state, and the frontend detects the change and redirects to the authenticated page.
- **Same-device (DC API)** — the W3C DC API returns control to the browser after the Wallet completes the presentation. The RP's backend has already received the callback by this point, so the redirect is immediate.

The User sees the final result — e.g., *"Identity verified — welcome, Anna"* or *"Account opened successfully"*. The entire flow, from clicking *"Verify with EUDI Wallet"* to reaching the authenticated page, typically completes in 5–15 seconds.
</details>

&nbsp;

> **Why not a reverse proxy?** The SaaS verifier is *not* a reverse proxy sitting in front of the RP. The RP's users access the RP directly — the verifier is a standalone API service that the RP calls. The Wallet never communicates with the RP directly either; it only communicates with the verifier via `response_uri`. This decoupled architecture means the RP can use any SaaS verifier without modifying its network topology.

##### 20.6.3 Intermediary Integration Pattern

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
    actorMargin: 250
---
sequenceDiagram
    autonumber
    participant U as 👤 User Browser
    participant RP as 🏦 End-RP Backend
    participant I as 🔄 Intermediary
    participant W as 📱 Wallet Unit

    rect rgba(148, 163, 184, 0.14)
    Note over U,I: Phase 1 — Session Initiation
    U->>RP: User clicks "Verify Identity"
    RP->>I: RP calls POST /verify<br/>{ rp_id, dcql_query, callbackUri }
    I-->>RP: Intermediary returns<br/>session_id + redirect_uri
    RP-->>U: RP redirects to<br/>intermediary flow
    Note right of W: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end

    rect rgba(52, 152, 219, 0.14)
    Note over U,W: Phase 2 — OpenID4VP Protocol (L1 direct_post)
    U->>W: Wallet receives authorization<br/>request
    Note over W: Consent screen shows both<br/>Intermediary and End-RP identities
    W->>W: User reviews and consents
    W->>I: Wallet POSTs to response_uri<br/>(vp_token)
    I->>I: Intermediary runs full<br/>verification pipeline
    Note right of W: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end

    rect rgba(46, 204, 113, 0.14)
    Note over I,RP: Phase 3 — Attribute Forwarding (L2 Callback)
    I->>RP: Intermediary POSTs to<br/>callbackUri (signed JWT)
    Note right of RP: Contains: verification_status,<br/>disclosed_attributes, risk_signals
    Note right of I: Intermediary deletes<br/>attribute values (Art. 5b(10))
    RP->>RP: RP verifies intermediary<br/>JWT signature
    RP->>RP: RP processes attributes,<br/>applies business rules
    Note right of W: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end

    rect rgba(241, 196, 15, 0.14)
    Note over RP,U: Phase 4 — User Redirect
    RP-->>U: RP redirects to<br/>authenticated page
    Note right of W: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
```

<details><summary><strong>1. User Browser initiates verification request to End-RP Backend</strong></summary>

The User clicks a "Verify Identity" button on the end-RP's website. From the User's perspective, this is identical to the direct SaaS model (§20.6.2 step 1) — the User is unaware that an intermediary is involved until the consent screen (step 6) reveals both entities. The RP's frontend sends a standard AJAX or form `POST` to the RP's own backend to initiate the verification flow. The RP's backend determines which intermediary to delegate to based on its configuration (the RP may use different intermediaries for different credential types or jurisdictions).
</details>
<details><summary><strong>2. End-RP Backend creates verification session on Intermediary</strong></summary>

The RP calls the intermediary's session creation endpoint, providing the information needed for the intermediary to construct the OpenID4VP authorization request on the RP's behalf:

```json
POST /verify HTTP/1.1
Host: intermediary.example.eu
Authorization: Bearer <rp_api_key>
Content-Type: application/json

{
  "rp_id": "5299001GCLKH6FPVJW75",
  "rp_name": "Example Bank",
  "dcql_query": {
    "credentials": [
      {
        "id": "pid_credential",
        "format": "dc+sd-jwt",
        "meta": { "vct_values": ["eu.europa.ec.eudi.pid.1"] },
        "claims": [
          { "path": ["family_name"] },
          { "path": ["given_name"] },
          { "path": ["birth_date"] }
        ]
      }
    ]
  },
  "callbackUri": "https://bank.example.de/api/eudi/callback",
  "callbackApiKey": "sk_live_...",
  "purpose": "Customer identification (KYC)"
}
```

The `rp_id` tells the intermediary which end-RP to identify in the JAR's `rp_info` extension (§17.2 step 2). The `callbackUri` is the RP's L2 webhook endpoint where the intermediary will deliver verified attributes after verification (step 9). The `dcql_query` specifies the credentials and claims the RP needs — the intermediary will embed this in its OpenID4VP authorization request.
</details>
<details><summary><strong>3. Intermediary returns session ID and redirect URI to End-RP Backend</strong></summary>

The intermediary generates the OpenID4VP authorization request, signing the JAR with its **own WRPAC** (not the end-RP's — this is the key architectural distinction from the direct SaaS model). The JAR includes an `rp_info` extension identifying the end-RP to the Wallet (§17.2 step 2). The intermediary stores the session state (associating the `session_id` with the end-RP's `callbackUri` and `rp_id`) and returns:

```json
{
  "session_id": "sess_abc123",
  "redirect_uri": "openid4vp://authorize?request_uri=https://intermediary.example.eu/jar/sess_abc123",
  "qr_code_uri": "https://intermediary.example.eu/qr/sess_abc123",
  "expires_in": 600
}
```

The RP receives either a `redirect_uri` (for same-device) or a `qr_code_uri` (for cross-device). The session has a finite TTL (typically 5–10 minutes per §20.5.1).
</details>
<details><summary><strong>4. End-RP Backend redirects User Browser to intermediary flow</strong></summary>

The RP redirects the User's browser to the intermediary's authorization endpoint using the `redirect_uri` from step 3 (same-device flow), or renders the intermediary-provided QR code for the User to scan with their Wallet (cross-device flow). This handoff is transparent to the User — the browser follows a standard HTTP 302 redirect. The RP may display a loading indicator with text like *"Connecting to identity verification service..."* during the redirect.

> **Same-device vs. cross-device**: The choice depends on the User's device. If the User is on a mobile device with a Wallet installed, the same-device redirect (via custom scheme `openid4vp://` or Digital Credentials API) is preferred. If the User is on a desktop, the QR code cross-device flow is required.
</details>
<details><summary><strong>5. User Browser delivers authorization request to Wallet Unit</strong></summary>

The User's Wallet receives the OpenID4VP authorization request — either via QR code scan (cross-device), custom scheme redirect (same-device), or Digital Credentials API invocation (same-device, Model D). The Wallet fetches the JAR from the `request_uri` and parses the signed JWT. The JAR is signed by the **intermediary's WRPAC** — the Wallet authenticates the intermediary as the Relying Party, then reads the `rp_info` extension to identify the end-RP. This two-layer identity is a unique aspect of the intermediary model (§17.2).

> **Trust chain**: The Wallet verifies the intermediary's WRPAC chain against the LoTE (§4.5.3), just as it would for a direct RP. The Wallet then extracts the end-RP identity from the `rp_info` extension, which the intermediary populated using the `rp_id` from step 2.
</details>
<details><summary><strong>6. Wallet Unit displays consent screen showing both Intermediary and End-RP identities</strong></summary>

The Wallet displays a consent screen that identifies **both** the intermediary and the end-RP — a transparency requirement mandated by Art. 5b(10) and §17.3. The consent screen must clearly distinguish the two roles:

- **Intermediary** (line 1): *"IDnow Verification Services GmbH"* — the entity that will cryptographically verify your credential
- **End-RP** (line 2): *"Example Bank AG"* — the entity that will receive your verified attributes and the reason for the request

The User reviews the requested attributes (from the DCQL query) and sees which specific data elements will be disclosed. The dual-identity display prevents the intermediary from hiding the end-RP's identity and makes the data flow transparent. The User may query the Registrar API (§3.4.4) to check whether the end-RP is registered for the requested attributes.

> **If the User denies consent**: No data is transmitted. The intermediary session transitions to `Failed`, and the intermediary sends an error callback to the end-RP's `callbackUri` (if error callbacks are supported — see §20.6.6).
</details>
<details><summary><strong>7. Wallet Unit submits VP Token to Intermediary via `direct_post`</strong></summary>

The Wallet POSTs the `vp_token` (encrypted with the intermediary's ephemeral public key from the JAR) to the intermediary's `response_uri`. This is the **L1 (protocol-layer) callback** — it goes directly to the intermediary, not the end-RP. The intermediary decrypts the JWE and extracts the raw credential data. The end-RP **never sees the original VP Token** — it only receives the verified attributes forwarded by the intermediary in step 9.

> **This is the architectural firewall**: The VP Token contains the raw SD-JWT or mdoc credential, including the issuer signature, KB-JWT, and potentially all disclosed attributes. By design, only the intermediary has access to this raw material — the end-RP receives a processed, intermediary-signed assertion. This separation is both a privacy benefit (the end-RP cannot see the credential's internal structure) and a trust trade-off (the end-RP must trust the intermediary's verification).
</details>
<details><summary><strong>8. Intermediary executes full verification pipeline (AS-RP-51-012)</strong></summary>

The intermediary performs the five-dimension verification pipeline mandated by ARF HLR AS-RP-51-012: authenticity (issuer signature + LoTE chain), revocation (TokenStatusList), device binding (KB-JWT / DeviceAuth), user binding (WSCA-signed challenge), and Wallet Unit authenticity. The full specification of these verification gates — including the "As Agreed" qualification and conditional forwarding rules — is in §17.4.1.

If any **agreed** verification dimension fails, the intermediary `SHALL NOT` forward any data to the end-RP (AS-RP-51-011). The intermediary logs the failure reason and sends a failure callback.

> **Trust anchor responsibility**: The intermediary must maintain its own LoTE cache and Status List cache. The end-RP delegates the entire cryptographic verification burden to the intermediary — the intermediary's signed assertion (step 9) replaces the need for direct credential verification.
</details>
<details><summary><strong>9. Intermediary forwards verified attributes to End-RP Backend via L2 callback</strong></summary>

The intermediary POSTs a signed JWT to the end-RP's `callbackUri` (configured in step 2). The payload follows the L2 callback specification (§20.6.4):

```json
{
  "session_id": "sess_abc123",
  "status": "success",
  "intermediary_id": "https://idnow.eu/.well-known/eudi",
  "verification_dimensions": {
    "authenticity": "passed",
    "revocation": "passed",
    "device_binding": "passed",
    "user_binding": "passed",
    "wallet_authenticity": "passed"
  },
  "disclosed_attributes": {
    "family_name": "Müller",
    "given_name": "Anna",
    "birth_date": "1990-03-15"
  },
  "credential_format": "dc+sd-jwt",
  "credential_type": "eu.europa.ec.eudi.pid.1",
  "presentation_timestamp": "2026-03-18T00:30:00Z",
  "risk_signals": {
    "client_ip": "203.0.113.42",
    "user_agent": "EUDI Wallet/1.2 Android/15",
    "presentation_duration_ms": 3200
  }
}
```

After sending the callback, the intermediary **deletes the attribute values** (`family_name`, `given_name`, `birth_date`) from its systems — this is the Art. 5b(10) no-storage mandate. Only non-identifying metadata (timestamps, attribute names, session IDs, verification dimension results) may be retained for audit purposes. See §17.3 for the full intermediary data lifecycle obligations.
</details>
<details><summary><strong>10. End-RP Backend verifies intermediary JWT signature</strong></summary>

The RP validates the intermediary's JWS signature using the intermediary's public key, which was obtained during the service onboarding process (typically via the intermediary's JWKS endpoint, e.g., `https://idnow.eu/.well-known/jwks.json`). This is the **end-RP's only cryptographic verification** — it trusts the intermediary to have correctly performed the full five-dimension verification in step 8. The RP also validates:

1. `iss` — matches the expected intermediary identifier
2. `session_id` — matches a session the RP actually created in step 2 (prevents session injection attacks)
3. `iat` — timestamp is recent (within a configurable window, typically ≤ 5 minutes, to prevent replay — see §20.6.6)

> **Trust delegation trade-off**: The end-RP cannot independently verify the original VP Token — it never receives the raw credential. If the intermediary is compromised or issues a fraudulent signed assertion, the end-RP has no way to detect this from the JWT alone. This is why the intermediary model requires a higher level of contractual and regulatory trust — intermediaries are registered entities with their own WRPACs and are subject to the supervisory oversight described in §17.3.
</details>
<details><summary><strong>11. End-RP Backend processes attributes and applies business rules</strong></summary>

The RP extracts the `disclosed_attributes` from the verified intermediary JWT and feeds them into its business logic layer. The processing depends on the RP's use case:

- **CDD onboarding** (§19) — Run the identity attributes through the AML screening pipeline, create a customer record, assign a risk rating
- **SCA authentication** (§13) — Match the PID identity against the existing customer record for step-up authentication
- **Age verification** — Evaluate the `age_over_18` boolean for access control
- **Identity matching** — Cross-reference `personal_identifier` or `family_name` + `birth_date` against existing records

The RP treats the intermediary's signed assertion as the **authoritative source** — equivalent to what a direct RP would derive from its own cryptographic verification. The RP should store the `session_id`, `presentation_timestamp`, and `verification_dimensions` for audit trail purposes (§25.3), associating them with the customer's record.
</details>
<details><summary><strong>12. End-RP Backend redirects User Browser to authenticated page</strong></summary>

The RP completes the User's session by redirecting to the authenticated area of the application. The redirect mechanism depends on how the flow was initiated:

- **Same-device**: The RP's callback handler (triggered by step 9) sets a session cookie and sends a redirect response to the User's browser. The browser follows the redirect to the authenticated page (e.g., `/dashboard`).
- **Cross-device**: Since the User's browser has been polling for session completion (or using SSE — §20.5.2), the frontend detects the session transition to `Fulfilled` and navigates to the authenticated page.

The User experience is identical to the direct SaaS model (§20.6.2 step 12) — the intermediary is transparent from this point forward. The RP should log the completed verification event (§25.3) and, if required by regulation, store a consent receipt linking the User's session to the disclosed attributes, the intermediary's identity, and the verification timestamp.

> **Data retention**: Unlike the intermediary (which must delete attribute values per Art. 5b(10)), the end-RP may retain the disclosed attributes for as long as legally permitted under its own GDPR basis (typically Art. 6(1)(b) contractual necessity or Art. 6(1)(c) legal obligation). The RP's data retention policy should specify distinct retention periods for each attribute.
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
| `verification_dimensions` | N/A | ✅ | Which of the 5 ARF verification dimensions passed (§17.4.1) |
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
- **Logical isolation**: Under GDPR Art. 28, verification sessions for different legal entities must be logically isolated — sessions from entity A must not be visible to entity B, even if they share the same SaaS verifier account.

##### 20.6.5 Risk Signal Forwarding

When a SaaS verifier or intermediary sits between the Wallet and the end-RP, the RP loses direct visibility into the Wallet's network context. For fraud detection, AML risk scoring, and DORA incident forensics, the L2 callback should include the following risk signals:

| Signal | Description | Use Case |
|:-------|:------------|:---------|
| **Client IP** | IP address of the device that initiated the OpenID4VP flow | Geolocation matching against expected MS; fraud ring detection |
| **User-Agent** | Browser or Wallet app identifier | Device fingerprinting; bot detection |
| **TLS fingerprint** | JA3/JA4 hash of the TLS handshake from the Wallet | Detecting credential-forwarding attacks (Cross-RP Collusion in §24.2) |
| **Presentation timing** | Duration from session creation to VP Token submission | Unusually fast responses may indicate automated credential stuffing |
| **Device attestation** | Platform-level device integrity signal (e.g., Android SafetyNet, Apple App Attest) | Detecting emulated or rooted devices |
| **QR scan metadata** | Whether the QR code was scanned (cross-device) or the redirect was followed (same-device) | Distinguishing user-initiated flows from API-driven automation |

> **Intermediary obligation**: Under DORA Art. 28, financial-sector RPs must assess third-party ICT risk. If the intermediary does *not* forward risk signals, the RP has a blind spot in its fraud monitoring pipeline. RPs should contractually require risk signal forwarding as part of the intermediary service agreement.

> **Cross-references**: §20.2 (L3 policy webhook delegation), §20.5.2 (L2 `statusCallbackUri` session callbacks), §17.4 (intermediary attribute forwarding architecture), §24.2 (Cross-RP Collusion — credential forwarding attacks), §25.2 (alert triggers for anomalous presentation timing).

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

```mermaid
---
config:
  themeVariables:
    noteBkgColor: "transparent"
    noteBorderColor: "transparent"
  sequence:
    messageAlign: left
    noteAlign: left
    actorMargin: 250
---
sequenceDiagram
    autonumber
    participant RP as 🏦 RP Server
    participant SL as 📋 Trust List
    
    rect rgba(148, 163, 184, 0.14)
    Note right of RP: Phase 1: Identification & Fetch
    RP->>RP: Extract Issuer & Country Code from PID
    RP->>SL: Request LoTE for specific Member State
    SL-->>RP: Return LoTE<br/>containing Trust Anchor
    Note right of SL: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
    
    rect rgba(46, 204, 113, 0.14)
    Note right of RP: Phase 2: Validation & Cache
    RP->>RP: Validate PID signature vs. Trust Anchor
    RP->>RP: Cache foreign MS Trust Anchor based on TTL
    Note right of SL: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
```

<details><summary><strong>1. RP Server extracts Issuer from PID</strong></summary>

Upon receiving the payload, the Relying Party parses the `iss` claim (for SD-JWT) or the MSO signing certificate to identify the foreign PID Provider.
</details>
<details><summary><strong>2. RP Server determines MS and fetches LoTE</strong></summary>

The RP infers the issuing Member State from the attribute payload and queries the EU Trusted List Browser (or its own caching layer) for that specific country's LoTE.
</details>
<details><summary><strong>3. Trust List returns Trust Anchor</strong></summary>

The Trust List returns the specific MS trust anchor.
</details>
<details><summary><strong>4. RP Server validates chain</strong></summary>

The Relying Party verifies the PID Provider's signing certificate directly against the newly acquired foreign Trust Anchor.
</details>
<details><summary><strong>5. RP Server caches Trust Anchor</strong></summary>

The RP stores the verified foreign MS trust anchor in its local, memory-resident cache, enforcing a TTL aligned to that MS's LoTE update frequency to prevent stale cryptographic material.
</details>
<br/>

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

**Nomenclature & Threat Tagging**: 
Each threat in the catalogue below incorporates technical tagging in its title (e.g., `TR105`). 
- **EU ARF Core Qualifiers (`TR`, `TT`, `SR`, `R`)**: Official risk codes mapped directly from the European Commission's [Architecture Reference Framework (ARF) Risk Register](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=OJ:L_202402981#anx_I) (Annex I of CIR 2024/2981). For instance:
  - **TR** = Technical Risk (e.g., *TR105: Man-in-the-Middle*)
  - **TT** = Threat Type (e.g., *TT5.3: Replay Attack*)
  - **SR** = Systemic Risk (e.g., *SR1: Wholesale Surveillance*)

#### 24.2 Threat Catalogue

##### 24.2.1 Credential Replay (TT5.3)

```mermaid
---
config:
  themeVariables:
    noteBkgColor: "transparent"
    noteBorderColor: "transparent"
  sequence:
    messageAlign: left
    noteAlign: left
    actorMargin: 250
---
sequenceDiagram
    autonumber
    participant V as Victim Wallet
    participant A as MITM Attacker
    participant RP as 🏦 RP Server
    
    rect rgba(148, 163, 184, 0.14)
    Note right of V: Victim executes legitimate<br/>presentation flow
    V->>A: Transmits Encrypted JWE Response<br/>POST /rp/response_uri<br/>content-type: application/x-www-form-urlencoded
    Note right of RP: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
    
    rect rgba(231, 76, 60, 0.14)
    Note right of A: ⚠️ Network interception<br/>or rogue intermediary proxy
    A-->>RP: (Legitimate presentation completes)
    A->>RP: Replays identical JWE payload<br/>vp_token={header}.{encrypted_key}.{iv}.{ciphertext}.{tag}
    Note right of RP: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
    
    rect rgba(148, 163, 184, 0.14)
    Note right of RP: Decrypts JWE using ephemeral private key<br/>Parses nonce from KB-JWT / DeviceSignature
    RP->>RP: Evaluates nonce against active session store
    Note right of RP: ❌ Replay detected: nonce not found in<br/>pending cache OR marked as consumed
    RP-->>A: Rejects Presentation (HTTP 400 Bad Request)
    Note right of RP: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
```

<details><summary><strong>1. Attacker intercepts presentation</strong></summary>

The MITM Attacker intercepts the Wallet's `POST /response_uri` payload containing the JWE-encrypted `vp_token` and `presentation_submission`. This typically requires compromising the TLS connection (e.g., via a rogue CA certificate installed on a corporately managed device, or premature TLS termination via a malicious public proxy).

```http
POST /rp/response_uri HTTP/1.1
Host: legitimate-rp.example
Content-Type: application/x-www-form-urlencoded

# The attacker captures this exact string, but cannot decrypt its JWE contents.
vp_token=eyJhbGciOiJFQ0RILUVT...[encrypted blob]
&presentation_submission={"id":"ps_1","definition_id":"...","descriptor_map":[...]}
&state=b1c3d9a7
```
</details>
<details><summary><strong>2. Legitimate presentation completes normally</strong></summary>

The original presentation from the Victim's Wallet reaches the RP and is processed successfully — the legitimate session is authenticated, and the RP marks the nonce as consumed in its session store. The Attacker, having intercepted a copy, now holds a duplicate of the entire JWE payload.
</details>
<details><summary><strong>3. Attacker replays payload to RP Server</strong></summary>

The Attacker forwards the identical URL-encoded JWE payload to the Relying Party's `response_uri` endpoint, hoping to authenticate an attacker-controlled session or re-trigger a one-time operation (e.g., transaction authorization).

```http
POST /api/presentations/response HTTP/1.1
Host: legitimate-rp.example
Content-Type: application/x-www-form-urlencoded

vp_token=eyJhbGciOiJFQ0RILUVT...[encrypted JWE blob]...
&presentation_submission={"id":"ps_1","definition_id":"...","descriptor_map":[...]}
&state=b1c3d9a7
```
</details>
<details><summary><strong>4. RP Server evaluates nonce uniqueness</strong></summary>

The RP Server successfully decrypts the JWE using its server-side ephemeral private key. It extracts the `nonce` claim structurally bound within the inner Key Binding JWT (`KB-JWT`, for SD-JWT VCs) or the `DeviceSignature` (for mdoc). Crucially, the RP queries its Redis/memory session cache to determine if the nonce is simultaneously active and unconsumed.

```json
{
  "alg": "ES256", "typ": "kb+jwt"
}
.
{
  "nonce": "n_w9x8y7z6", // The RP validates this 128-bit cryptographic string
  "aud": "https://legitimate-rp.example",
  "iat": 1705600123
}
```
</details>
<details><summary><strong>5. RP Server rejects replayed presentation</strong></summary>

The RP Server detects that the `nonce` inside the payload does not match the Attacker's active frontend session, or that the specific nonce has already been consumed by the legitimate Victim's successful presentation. The RP aborts the pipeline and returns a failure response.
</details>
<br/>

**Attack Vector**: Attacker captures a valid `vp_token` (the JWE-encrypted response containing the SD-JWT VC + KB-JWT, or the mdoc DeviceResponse) and replays it to the same or a different RP. Capture may occur via network interception (if TLS is compromised or terminated early), server-side log exfiltration, or a malicious intermediary (§21) that retains response payloads. The attacker re-submits the identical `vp_token` to the RP's `response_uri` hoping to authenticate as the victim.

**Impact**: Impersonation — attacker gains the victim's authenticated session at the RP; unauthorised access to services, accounts, or data. In financial contexts (§18), this could enable unauthorised transactions. The severity is amplified if the RP uses the credential for one-time identity proofing (e.g., KYC onboarding per §19) because a single successful replay permanently binds the victim's identity to the attacker's account.

**Mitigation**:

- **Primary**: The KB-JWT (SD-JWT VC) or `DeviceSignature` (mdoc) contains a `nonce` claim that must match the unique, cryptographically random nonce generated by the RP in step 3 of the presentation flow (§7.2, §8.2). Each session gets a fresh nonce with ≥128 bits of entropy, making replay of a captured presentation infeasible against a different session.
- **Secondary**: The KB-JWT `aud` claim must match the RP's `client_id` — preventing cross-RP replay even if nonces collide.
- **Tertiary**: Short JAR `exp` (recommended ≤5 minutes, §9.3) and KB-JWT `iat` freshness checks bound the window of opportunity. For mdoc, the `SessionTranscript` (§10.3) incorporates session-specific ephemeral keys, mathematically invalidating replay.
- **Critical implementation note** (§9.8): When retrying after errors, the RP **MUST** generate a new nonce per retry — reusing nonces across retries opens a replay window.

##### 24.2.2 WRPAC Private Key Compromise (TT5.5)

```mermaid
---
config:
  themeVariables:
    noteBkgColor: "transparent"
    noteBorderColor: "transparent"
  sequence:
    messageAlign: left
    noteAlign: left
    actorMargin: 250
---
sequenceDiagram
    autonumber
    participant A as Attacker Infrastructure
    participant W as Any EUDI Wallet
    participant SL as EU Trusted List
    
    rect rgba(231, 76, 60, 0.14)
    Note right of A: ⚠️ Exfiltrated Subject Private Key<br/>matching valid WRPAC X.509
    A->>A: Constructs malicious Authorization Request<br/>client_id=legitimate-rp.example<br/>dcql_query={...}
    A->>A: Signs payload with stolen private key<br/>Injects x5c header with WRPAC chain
    A->>W: Delivers malicious JAR<br/>openid4vp://authorize?client_id=...&request_uri=...
    Note right of SL: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
    
    rect rgba(148, 163, 184, 0.14)
    W->>W: Computes x509_hash from leaf cert
    W->>SL: Validates chain up to Access CA Trust Anchor
    Note right of W: ✅ Cryptographic validation successful<br/>(Signatures match, mathematically valid)
    W-->>A: Returns victim's PID attributes<br/>POST {attacker_response_uri}
    Note right of SL: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
```

<details><summary><strong>1. Attacker constructs malicious Authorization Request</strong></summary>

Having compromised the Relying Party's secure storage (e.g., database breach or HSM export vulnerability), the Attacker constructs a forged JSON authorization payload specifying custom `<dcql_query>` requirements and an attacker-controlled `response_uri`.
</details>
<details><summary><strong>2. Attacker signs payload with stolen private key</strong></summary>

The payload is wrapped into a JSON Web Signature (JWS). The Attacker signs the MAC using the stolen asymmetric private key (e.g., ECDSA P-256) and embeds the legitimate RP's X.509 certificate chain (`x5c`) within the JOSE header.

```json
{
  "alg": "ES256",
  "typ": "oauth-authz-req+jwt",
  "x5c": [
    "MIIB... (Stolen Leaf Cert)",
    "MIIB... (Intermediate CA)",
    "MIIC... (Access Root CA)"
  ]
}
.
{
  "client_id": "legitimate-rp.example",
  "response_uri": "https://attacker.com/sinkhole",
  "nonce": "n_w9x8y7z6",
  "client_id_scheme": "x509_san_dns"
}
.
[Attacker's Genuine Cryptographic ECDSA Signature]
```
</details>
<details><summary><strong>3. Attacker delivers malicious JAR</strong></summary>

The Attacker delivers this forged Authorization Request to an arbitrary victim's EUDI Wallet, either through a phishing site using a same-device redirect or via a cross-device QR code.
</details>
<details><summary><strong>4. Wallet computes client_id binding</strong></summary>

The Wallet Unit extracts the leaf X.509 certificate from the attacker's `x5c` header. Following OpenID4VP mutual TLS paradigms (`x509_san_dns`), it computes the SHA-256 fingerprint over the DER-encoded leaf. It automatically verifies that this calculated thumbprint legitimately matches the requested `client_id` string, successfully binding the malicious request to the compromised RP's DNS name.

```javascript
// Pseudocode representing the Wallet's fatal but mathematically correct logic
const leafCertDer = extractLeafCert(header.x5c);
const computedThumbprint = crypto.createHash('sha256').update(leafCertDer).digest('hex');

if (computedThumbprint === payload.client_id) {
    // Passes! The private key genuinely belongs to the RP's certificate.
    proceedToTrustAnchorValidation(); 
}
```
</details>
<details><summary><strong>5. Wallet validates certificate chain</strong></summary>

The Wallet Unit checks the certificate chain's validity against its local List of Trusted Entities (LoTE). Because the WRPAC is genuinely issued down from a trusted Access CA, all path checks (`NotBefore`, `NotAfter`, ECDSA signatures) pass.
</details>
<details><summary><strong>6. Wallet returns victim's PID attributes</strong></summary>

Tricked by the mathematically valid cryptography, the Wallet's consent screen displays the legitimate RP's authenticated name. Upon user approval, the Wallet encrypts the sensitive PID attributes and transmits them to the Attacker's sinkhole `response_uri`.
</details>
<br/>

**Attack Vector**: Attacker obtains the RP's WRPAC (Wallet Relying Party Access Certificate) private key through server breach, insider theft, misconfigured key export, or exploitation of a software vulnerability in the key management system. The WRPAC is the RP's identity credential — its X.509 certificate chain (§4.1–4.2) is embedded in the `x5c` header of every JAR the RP signs. With the private key, the attacker can sign JARs that Wallet Units will accept as genuine, and can authenticate as the RP via mutual TLS where applicable.

**Impact**: The attacker can impersonate the RP to *any* Wallet Unit in the entire EUDI ecosystem — requesting and receiving PID attributes, QEAA data, or SCA authorisations from any user. This is a catastrophic, ecosystem-wide impersonation risk because the WRPAC is issued by a national Access CA (§4.1) and is trusted by all Wallets that have the Access CA's trust anchor in their LoTE cache. The breach also constitutes a loss of the RP's registration standing with the national Registrar (§3).

**Mitigation**:

- **Primary**: Store the WRPAC private key in an HSM or hardware-backed secure enclave — the ARF notes (§7.4.3.3) that RPs *may* use HSMs but are not formally required to, unlike Wallet Providers.
- **Detection**: Implement Certificate Transparency (CT) monitoring (§4.2.4) — all WRPACs are logged in CT logs, so an attacker minting a fraudulent certificate would be detectable.
- **Response**: Immediate certificate revocation via the Access CA's CRL/OCSP endpoint; escalation to the national Registrar and Trusted List operator; issuance of replacement WRPAC.
- **Operational**: Key ceremony procedures with multi-party authorisation; automated WRPAC renewal with expiry alerting (§25.1); restrict private key access to the signing service only (not application servers). For financial RPs: DORA Art. 9 requires ICT asset management including cryptographic key lifecycle controls.

##### 24.2.3 Relay Attack: Cross-Device (TR105)

```mermaid
---
config:
  themeVariables:
    noteBkgColor: "transparent"
    noteBorderColor: "transparent"
  sequence:
    messageAlign: left
    noteAlign: left
    actorMargin: 250
---
sequenceDiagram
    autonumber
    participant V as Victim (Smartphone)
    participant A as Attacker (Browser)
    participant RP as 🏦 RP Server
    
    rect rgba(231, 76, 60, 0.14)
    A->>RP: Initiates login session (Attacker IP)
    RP-->>A: Renders QR code with request_uri<br/>sessionId=xyz123<br/>nonce=random_bytes
    A->>V: Relays QR code across side-channel<br/>(e.g., Discord/WhatsApp phishing)
    Note right of RP: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
    
    rect rgba(148, 163, 184, 0.14)
    V->>RP: Wallet scans relayed QR code<br/>GET /request_uri (Victim IP)
    RP-->>V: Returns signed JAR Authorisation Request
    V->>V: User approves seemingly legitimate RP
    Note right of RP: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
    
    rect rgba(231, 76, 60, 0.14)
    V->>RP: Wallet deposits Encrypted Response<br/>POST /response_uri (Victim IP)
    RP->>RP: Binds Victim identity to Attacker session
    RP-->>A: Grants authenticated session via HTTP Redirect
    Note right of RP: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
```

<details><summary><strong>1. Attacker initiates login session</strong></summary>

The Attacker opens the RP Server's legitimate portal in their own desktop browser, triggering the generation of a fresh server-side login context initialized with an active polling mechanism tracking the unique `sessionId`.

```http
POST /api/auth/initiate HTTP/1.1
Host: legitimate-rp.example
X-Forwarded-For: 203.0.113.50 # Attacker's origin IP address

HTTP/1.1 200 OK
{"sessionId": "xyz123", "status": "PENDING_SCAN"}
```
</details>
<details><summary><strong>2. RP Server renders QR code</strong></summary>

The RP Server generates a cross-device QR code encapsulating an `openid-vc://` or `haip://` scheme URL. Crucially, the encoded `request_uri` intrinsically binds to the Attacker's active `sessionId` and freshly generated `nonce`.
</details>
<details><summary><strong>3. Attacker relays QR code across side-channel</strong></summary>

Using OCR forwarding, screen-capture, or malicious proxy software, the Attacker immediately transports the graphical QR code to a remote Victim. They commonly use social engineering (e.g., "Scan this to unlock your courier package") to induce action.
</details>
<details><summary><strong>4. Victim Wallet scans relayed QR code</strong></summary>

The Victim scans the QR code arrayed on their alternate device. The Wallet correctly pulls the Authorization Request via the `request_uri`.

```http
GET /api/presentations/request/req_xyz123 HTTP/1.1
Host: legitimate-rp.example
```

The Wallet cryptographically validates the RP's WRPAC, showing a valid, un-spoofed RP identity on the display—substantially decreasing user suspicion.
</details>
<details><summary><strong>5. RP Server returns signed JAR Authorisation Request</strong></summary>

The RP responds to the Wallet's `GET /request_uri` with a signed JAR containing the presentation parameters (requested attributes, nonce, response_uri). The JAR signature validates against the RP's legitimate WRPAC — from the Victim Wallet's perspective, this is an authentic request from a registered RP.
</details>
<details><summary><strong>6. Victim Wallet User approves seemingly legitimate RP</strong></summary>

The Victim reviews the consent screen displaying the RP's verified identity (from WRPAC) and the requested attributes. Because the request originates from the legitimate RP infrastructure — not a spoofed endpoint — the Wallet's trust indicators are all green. The Victim approves the presentation, unaware that the session belongs to the Attacker.
</details>
<details><summary><strong>7. Wallet deposits Encrypted Response</strong></summary>

Upon the remote Victim's consent, their Wallet computes the Key Binding JWT over the Attacker's original `nonce` and submits the encrypted payload directly to the RP's legitimate `response_uri`, originating from the Victim's own IP address.
</details>
<details><summary><strong>8. RP Server binds Victim identity</strong></summary>

The RP Server validates the JWE, processing the internal `nonce` and algorithmically linking it back to the Attacker's designated `sessionId=xyz123`. The system subsequently binds the Victim's extracted PID attributes to that HTTP state.
</details>
<details><summary><strong>9. RP Server grants authenticated session</strong></summary>

The Attacker's active desktop browser receives the signal that the presentation was successful, silently bridging the Attacker into a fully authenticated session hijacked under the Victim's name.
</details>
<br/>

**Attack Vector**: In a cross-device flow (§8), the RP displays a QR code containing a `request_uri`. The attacker photographs or digitally captures this QR code and relays it (e.g., via messaging app, email, or a colluding website) to a remote victim. The victim scans the relayed QR code with their Wallet, sees what appears to be a legitimate RP request (with a valid WRPAC), approves the consent screen, and presents their PID attributes — which are delivered to the attacker's session at the RP, not the victim's. The attacker gains the victim's authenticated session. This differs from Cross-Device QR Code Substitution (§24.2.17) because here the *original* RP QR is relayed, not replaced.

**Impact**: Victim's PID attributes are presented into the attacker's browser session at the RP. The attacker gains full authenticated access as the victim. In a KYC onboarding scenario (§19), this could result in a bank account opened in the victim's name. The ARF Risk Register identifies this as TR105 (man-in-the-middle) and TR103 (user behind browser ≠ user behind wallet).

**Mitigation**:

- **Primary**: The W3C Digital Credentials API solves this architecturally — the CTAP 2.2 hybrid flow (§8, Topic F §2.3) requires BLE proximity binding between the browser and the user's phone, ensuring the phone is physically near the QR-displaying device. The BLE advertisement serves as a proximity check that remote relay cannot satisfy.
- **Secondary**: Session timeouts — the QR code should expire within 120 seconds (§9.8) and the `request_uri` endpoint should be single-use (invalidated after first fetch).
- **Tertiary**: The Wallet must prominently display the authenticated RP identity (from the WRPAC) so the victim can recognise they did not initiate interaction with this RP.
- **Fallback flows** (custom URI schemes without DC API) lack the proximity binding and therefore have higher residual risk — the ARF explicitly recommends DC API for cross-device flows to mitigate this (ARF §4.4.3).

##### 24.2.4 Malicious RP Endpoint: Phishing (TR28, TT5.2)

```mermaid
---
config:
  themeVariables:
    noteBkgColor: "transparent"
    noteBorderColor: "transparent"
  sequence:
    messageAlign: left
    noteAlign: left
    actorMargin: 250
---
sequenceDiagram
    autonumber
    participant V as Victim
    participant A as Fake RP (Phishing)
    participant W as Victim's Wallet
    participant R as Registrar
    
    rect rgba(148, 163, 184, 0.14)
    A->>R: Registers under look-alike domain<br/>(e.g., fakc-bank.example)
    R-->>A: Grants genuine WRPAC
    Note right of R: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
    
    rect rgba(231, 76, 60, 0.14)
    A->>V: Lures Victim to phishing page
    Note right of R: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
    
    rect rgba(148, 163, 184, 0.14)
    V->>W: Scans & Initializes Presentation
    W->>W: Validates Attacker's WRPAC<br/>(Verification succeeds!)
    Note right of R: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
    
    rect rgba(231, 76, 60, 0.14)
    W-->>A: Returns PID Attributes
    Note right of R: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
```

<details><summary><strong>1. Attacker registers under look-alike domain</strong></summary>

The Attacker successfully registers as a legal Relying Party entity (often utilizing shell companies) through a national Registrar. They obtain a cryptographically valid WRPAC containing a Subject Alternative Name (SAN) domain closely resembling the target.

```text
Certificate:
    Data:
        Version: 3 (0x2)
        Subject: C = DE, O = Fakc Bank AG, CN = fakc-bank.example
        X509v3 Subject Alternative Name: 
            DNS:fakc-bank.example
```
</details>
<details><summary><strong>2. Registrar grants genuine WRPAC to Attacker</strong></summary>

The national Registrar, having no mechanism to detect malicious intent from a legally registered entity, issues a cryptographically genuine WRPAC. This certificate is indistinguishable from any legitimate RP's WRPAC — it chains to the same Access CA root of trust and passes all standard X.509 validation checks.
</details>
<details><summary><strong>3. Attacker lures Victim to phishing page</strong></summary>

The Victim is directed to the Attacker's website, which visually mirrors the legitimate RP's frontend. The Attacker initiates a genuine OpenID4VP authorization request.
</details>
<details><summary><strong>4. Victim scans and initializes presentation</strong></summary>

The Victim uses their Wallet to consume the Attacker's request. Because the WRPAC is issued by a genuine Access CA, the Wallet's cryptographic validation passes completely.
</details>
<details><summary><strong>5. Wallet validates Attacker's WRPAC successfully</strong></summary>

The Wallet's internal trust evaluation engine validates the Attacker's WRPAC certificate chain against the Trusted List anchors. Because the certificate is genuinely issued by a legitimate Access CA, all cryptographic checks pass — signature verification succeeds, the certificate is not revoked, and the SAN matches the requesting domain. The Wallet displays a green trust indicator to the Victim.
</details>
<details><summary><strong>6. Wallet returns PID Attributes to Attacker</strong></summary>

If the Victim fails to carefully inspect the domain/organization name on the Wallet's consent screen, they approve the release of their encrypted identity attributes directly to the Attacker's endpoints.

```http
POST /api/presentations/response HTTP/1.1
Host: fakc-bank.example
Content-Type: application/x-www-form-urlencoded

vp_token=...&presentation_submission=...
```
</details>
<br/>

**Attack Vector**: Attacker deploys a phishing website that visually mimics a legitimate RP (e.g., a bank's login page). The fake site initiates a genuine OpenID4VP flow — it has its own valid WRPAC (obtained by registering as a Relying Party with a national Registrar under a look-alike domain or a different legitimate business entity) and constructs a valid JAR requesting PID attributes. The user, believing they are interacting with the real RP, approves the Wallet's consent screen. The attacker receives the user's PID attributes at a `response_uri` they control.

**Impact**: Data disclosure (R6) — attacker obtains the victim's PID attributes (name, date of birth, address, nationality) under false pretences. The attacker can use these for identity theft, social engineering against other services, or sell the data. The particularly insidious aspect is that the Wallet's own verification of the WRPAC *succeeds* — the WRPAC is technically valid, just issued to the wrong entity from the user's perspective. The ARF identifies this as TR28 (user wrongfully approving a request) and TT5.2 (phishing and spoofing).

**Mitigation**:

- **Same-device flows**: The DC API injects the browser-verified *web origin* (e.g., `https://fake-bank.example`) into the request — the Wallet can compare this origin against the WRPAC's domain. Origin mismatch detection prevents the attacker from spoofing the real RP's domain in traditional same-device browser flows.
- **Cross-device flows**: The Wallet must prominently display the authenticated RP identity from the WRPAC (domain name, organisation name from the X.509 Subject DN) so the user can verify they intended to interact with this entity.
- **Ecosystem-level**: Registration certificate verification (§4.3 WRPRC) — if the attacker's WRPAC is issued to `fake-bank.example`, the WRPRC will list that domain and the attacker's company name, not the real bank's. Wallet Units that display WRPRC information give the user a stronger signal.
- **Enforcement**: Registrars can revoke the WRPAC of fraudulent RPs upon discovery; the RP community can monitor CT logs (§4.2.4) for suspicious registrations.

##### 24.2.5 Status List Denial of Service (TT4.1)

```mermaid
---
config:
  themeVariables:
    noteBkgColor: "transparent"
    noteBorderColor: "transparent"
  sequence:
    messageAlign: left
    noteAlign: left
    actorMargin: 250
---
sequenceDiagram
    autonumber
    participant A as Attacker (Botnet)
    participant S as PID Status List Endpoint
    participant RP as 🏦 RP Server
    participant W as EUDI Wallet
    
    rect rgba(231, 76, 60, 0.14)
    A->>S: Launches Volumetric DDoS Attack
    Note right of S: Endpoint becomes unresponsive
    Note right of W: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
    
    rect rgba(148, 163, 184, 0.14)
    W->>RP: Presents valid PID (vp_token)
    RP->>S: Attempts Revocation Check<br/>GET /status-list/1
    S--xRP: Connection Timeout
    Note right of RP: ⚠️ Cache miss / Stale cache
    RP->>RP: Evaluates Fail-Open/Closed Policy
    Note right of W: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
```

<details><summary><strong>1. Attacker launches Volumetric DDoS Attack</strong></summary>

The Attacker orchestrates a high-volume botnet TCP flood assault (or BGP hijack) against the national PID Provider's `status-list` endpoint. The sheer volume of synthetic traffic totally exhausts the endpoint's socket availability, rendering it unreachable to legitimate RP verification pipelines.

```bash
# Conceptual representation of the attacker's botnet operation targeting the Trust Infrastructure
hping3 -c 1000000 -d 120 -S -w 64 -p 443 --flood pid-provider.example.eu
```
</details>
<details><summary><strong>2. Wallet presents valid PID</strong></summary>

An independent user (or the attacker testing a revoked credential) attempts to authenticate at the RP Server by submitting a standard `vp_token`.
</details>
<details><summary><strong>3. RP Server attempts Revocation Check</strong></summary>

The RP Server attempts to perform step 3 of the verification pipeline: verifying the attestation's revocation status by fetching the Status List URL. The `GET` request times out.

```http
GET /.well-known/status-list/pid-revocations-1 HTTP/1.1
Host: pid-provider.example.eu

// -> Result: TCP Timeout / 503 Service Unavailable
```
</details>
<details><summary><strong>4. RP Server evaluates Fail-Open/Closed Policy</strong></summary>

Without a reachable endpoint or a fresh local cache, the RP Server must consult its operational fallback policy. It must either reject all users (Fail Closed: Service disruption) or accept unverified credentials (Fail Open: Allowing potentially revoked PIDs).
</details>
<br/>

**Attack Vector**: Attacker disrupts the Attestation Status List endpoint — either through volumetric DDoS against the PID Provider's or Attestation Provider's Status List URL, through DNS hijacking, or through BGP route manipulation. The RP, unable to fetch or validate the Status List, cannot perform revocation checks on presented credentials (§9.5 verification pipeline step 3). This creates a fail-open/fail-closed dilemma: the RP must decide whether to accept unverified credentials (risking accepting revoked PIDs) or reject all presentations (causing service disruption, ARF risk R13).

**Impact**: If the RP **fails open**: Revoked credentials (e.g., from stolen devices, deceased persons, or compromised Wallet Units per ARF §6.5.4.2 Level 4) are accepted as valid. Attacker could combine this with a stolen credential to bypass revocation. If the RP **fails closed**: Service disruption — users with perfectly valid credentials are unable to authenticate, potentially blocking essential services (banking, government, healthcare). Either outcome causes operational and reputational damage. For financial RPs, service disruption may violate DORA Art. 11 (business continuity).

**Mitigation**:

- **Primary**: Aggressive Status List caching per the `max-age` Cache-Control header (§9.5) — the RP should cache each Status List response locally and use the cached version when the endpoint is unreachable. This creates a tolerable window (typically minutes to hours) where revocation changes may not be reflected, but prevents service disruption.
- **Secondary**: Configure a fallback policy: for low-risk transactions, fail open with elevated logging and a note in the verification result object (§25.3.1); for high-risk transactions (KYC, payments), fail closed.
- **Tertiary**: The ARF's anti-linkability guidance (Topic A §4.2) recommends that RPs download Status Lists proactively (not per-presentation), reducing the real-time dependency.
- **Operational**: Monitor Status List endpoint availability as a key operational metric (§25.1); alert on stale caches exceeding 2× the refresh interval.

##### 24.2.6 Ephemeral Key Interception: Response Encryption (TT5.1)

```mermaid
---
config:
  themeVariables:
    noteBkgColor: "transparent"
    noteBorderColor: "transparent"
  sequence:
    messageAlign: left
    noteAlign: left
    actorMargin: 250
---
sequenceDiagram
    autonumber
    participant RP as 🏦 RP Server
    participant A as Network Eavesdropper
    participant W as EUDI Wallet
    
    rect rgba(148, 163, 184, 0.14)
    RP->>RP: Generates Ephemeral ECDH Keypair<br/>(Retains private_key in memory)
    RP->>W: Transmits signed JAR<br/>response_encryption_jwk: {public_key}
    Note right of W: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
    
    rect rgba(231, 76, 60, 0.14)
    A-->>A: Intercepts transmitted JAR
    Note right of A: Extracts public_key in plaintext
    Note right of W: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
    
    rect rgba(148, 163, 184, 0.14)
    W->>W: Computes shared ECDH-ES secret
    W->>RP: Returns JWE wrapped via shared secret
    Note right of W: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
    
    rect rgba(231, 76, 60, 0.14)
    A-->>A: Intercepts encrypted JWE return payload
    Note right of A: ❌ Fails to decrypt JWE<br/>(Requires RP's ephemeral private key)
    Note right of W: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
```

<details><summary><strong>1. RP Server generates Ephemeral Keypair</strong></summary>

When constructing the Authorization Request, the RP Server generates a fresh, ephemeral cryptographic keypair (e.g., P-256 for ECDH-ES). The private half strictly remains in server memory.
</details>
<details><summary><strong>2. RP Server transmits signed JAR</strong></summary>

The RP Server embeds only the public key material (`response_encryption_jwk`) inside the signed JAR sent to the Wallet.

```json
"client_metadata": {
  "jwks": {
    "keys": [{
      "use": "enc",
      "kty": "EC",
      "crv": "P-256",
      "x": "...",
      "y": "..."
    }]
  }
}
```
</details>
<details><summary><strong>3. Eavesdropper intercepts transmitted JAR</strong></summary>

The Eavesdropper, positioned on the network path between the RP and the Wallet (e.g., a compromised Wi-Fi access point, a transparent proxy, or a BGP route hijack), intercepts a copy of the signed JAR. The JAR contains the RP's ephemeral public key in the `response_encryption_jwk` field — but this is only the public half. The JAR itself is signed (JWS) but not encrypted, so its contents are readable.
</details>
<details><summary><strong>4. Wallet computes shared ECDH-ES secret</strong></summary>

The Wallet accepts the public key and utilizes its own key agreement parameters (the ECDH-ES algorithm defined in RFC 7518) to calculate a shared symmetric secret (`Z`). This secret, combined with the Concat KDF function, derives the Content Encryption Key (CEK) used exclusively to encrypt the final `vp_token` payload.

```javascript
// The Wallet derives the exact symmetric key using the RP's public 'y' and 'x' coordinates
const sharedSecret = ecdh.computeSecret(rpPublicKeyJwk);
const cek = concatKdf(sharedSecret, 256, "A256GCM");
```
</details>
<details><summary><strong>5. Wallet returns JWE wrapped via shared secret</strong></summary>

The Wallet encrypts the `vp_token` using the derived CEK and transmits the JWE envelope to the RP's `response_uri`. The encrypted payload contains the SD-JWT VC disclosures and the Key Binding JWT.
</details>
<details><summary><strong>6. Eavesdropper intercepts encrypted JWE return payload</strong></summary>

Although the Eavesdropper intercepted both the outbound JAR (containing the public key) and the inbound encrypted JWE response, they cannot derive the shared secret. Without the RP Server's memory-bound private key, decryption is mathematically infeasible.
</details>
<br/>

**Attack Vector**: Attacker intercepts the RP's `response_encryption_jwk` — the ephemeral ECDH public key that the RP includes in the JAR (§7.2 step 3, §9.4). This key is transmitted in the clear within the signed JAR (the JAR is signed, not encrypted). The attacker obtains this public key and attempts to decrypt the encrypted `vp_token` response (JWE envelope) that the Wallet sends back to the RP's `response_uri`.

**Impact**: **None, by design.** The `response_encryption_jwk` contains only the *public* half of the ECDH ephemeral key pair. The corresponding *private* key never leaves the RP's server memory. ECDH-ES (Diffie-Hellman Ephemeral Static, §9.4) derives a shared secret using the RP's ephemeral private key and the Wallet's key agreement — an eavesdropper with only the public key cannot compute this shared secret. The JWE envelope (A256GCM content encryption) remains opaque. This threat is included in the catalogue to **explicitly document that it is mitigated by design**, addressing a common concern during RP security reviews.

**Mitigation**:

- **By design**: The ECDH-ES key agreement (RFC 7518 §4.6) ensures that even if the JAR (containing the public key) is intercepted, the attacker cannot derive the content encryption key without the RP's ephemeral private key.
- **Implementation requirements**: The RP must generate a fresh ECDH key pair per session (§9.4 — P-256 curve, `use: enc`); the private key must exist only in server memory and be destroyed after JWE decryption; the private key must never be logged, serialised, or persisted to disk.
- **Additional layer**: The Wallet also applies its own content encryption (the SD-JWT VC disclosures are selectively revealed, and the response itself is JWE-wrapped), creating a double encryption layer that makes interception futile.

##### 24.2.7 JAR Modification in Transit (TR88, TT5.1)

```mermaid
---
config:
  themeVariables:
    noteBkgColor: "transparent"
    noteBorderColor: "transparent"
  sequence:
    messageAlign: left
    noteAlign: left
    actorMargin: 250
---
sequenceDiagram
    autonumber
    participant RP as 🏦 RP Server
    participant A as Network MITM
    participant W as EUDI Wallet
    
    rect rgba(148, 163, 184, 0.14)
    RP->>A: Transmits signed JAR<br/>dcql_query: [family_name, given_name]
    Note right of W: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
    
    rect rgba(231, 76, 60, 0.14)
    Note right of A: ⚠️ Attacker manipulates payload
    A->>W: Forwards altered JAR<br/>dcql_query: [..., birth_date, address]
    Note right of W: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
    
    rect rgba(148, 163, 184, 0.14)
    W->>W: Wallet verifies JWS signature<br/>Computes hash over altered payload
    Note right of W: ❌ Signature verification fails<br/>(Altered payload breaks ECDSA validity)
    W--xRP: 4. Rejects request automatically
    Note right of W: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
```

<details><summary><strong>1. RP Server transmits signed JAR</strong></summary>

The RP Server rigorously formats and sends a cryptographically signed Authorization Request (JAR) defining the minimal, strictly necessary subset of PID attributes using standard Presentation Exchange (PEX) or DCQL conventions.

```json
{
  "client_id": "legitimate-rp.example",
  "dcql_query": {
    "credentials": [
      {
        "id": "pid",
        "format": "vc+sd-jwt",
        "claims": [
          { "path": [ "family_name" ] }
        ]
      }
    ]
  }
}
```
</details>
<details><summary><strong>2. Attacker forwards altered JAR</strong></summary>

A Network Attacker intercepts the JAR and tampers with the JSON payload—for example, injecting a demand for the user's `birth_date` and `address` into the `dcql_query` or altering the `response_uri`—before passing it to the Wallet.

```json
{
  "client_id": "legitimate-rp.example",
  "dcql_query": {
    "credentials": [
      {
        "id": "pid",
        "format": "vc+sd-jwt",
        "claims": [
          { "path": [ "family_name" ] },
          { "path": [ "birth_date" ] }, // <-- Injecting extra claims
          { "path": [ "address" ] }    // <-- Injecting extra claims
        ]
      }
    ]
  }
}
```
</details>
<details><summary><strong>3. Wallet verifies JWS signature</strong></summary>

The EUDI Wallet receives the JAR and attempts to verify the JSON Web Signature (JWS) mathematically using the public key from the appended `x5c` certificate chain originating from the RP.
</details>
<details><summary><strong>4. Request rejected automatically</strong></summary>

Because the core JSON properties were tampered with during transit, the cryptographic SHA-256 hash computed fundamentally over the new payload no longer matches the appended ECDSA string evaluated against the RP's trusted public key. The Wallet instantaneously blocks the request without displaying a consent screen to the user.

```javascript
// The Wallet mathematically proves the signature is broken
const isValid = crypto.verify(
    'sha256',
    Buffer.from(header + "." + attackerModifiedPayload),
    rpPublicKey,
    signatureBuffer
);
// isValid === false
```
</details>
<br/>

**Attack Vector**: Attacker intercepts the JAR (JWT Authorization Request) in transit and modifies it before it reaches the Wallet. Modification targets include: (a) the `dcql_query` to request additional or different attributes, (b) the `response_uri` to redirect the encrypted response to the attacker's endpoint, (c) the `client_metadata` to change the RP's display name shown in the consent screen, or (d) the `transaction_data` in SCA flows (§13) to alter the payment amount or recipient. In cross-device flows, the JAR is fetched by the Wallet from the `request_uri` URL — a network-level MITM could intercept and modify it.

**Impact**: If `dcql_query` is modified: the Wallet requests different attributes, potentially causing over-collection. If `response_uri` is redirected: the Wallet sends the encrypted response to the attacker (though the attacker would need the ephemeral private key to decrypt — see §24.2.6). If `transaction_data` is modified in an SCA flow: the user approves a different transaction than intended, violating PSD2 Dynamic Linking requirements (§13.7, §18.2). The ARF Risk Register identifies this as TR88 (changes to request metadata).

**Mitigation**:

- **Primary**: The JAR is a JWS (JSON Web Signature) signed with the RP's WRPAC private key (§7.2 step 4). The Wallet verifies this signature against the RP's X.509 certificate chain before processing the request. Any modification invalidates the signature, causing the Wallet to reject the request with a cryptographic verification failure.
- **Secondary**: In cross-device flows, the `request_uri` should be served over TLS, adding transport-layer integrity.
- **SCA-specific**: For payment SCA, the JAR's `transaction_data_hashes_alg` parameter (§13.7) ensures the Wallet signs over the exact transaction details — the Dynamic Linking binding survives even if the JAR *display* metadata were somehow tampered with (which JWS prevents anyway).
- **Residual**: If the RP's WRPAC private key itself is compromised (see §24.2.2), the attacker could forge JARs — this is why WRPAC Compromise is rated Critical.

##### 24.2.8 Insider Threat: Privileged Access to PID Data 

```mermaid
---
config:
  themeVariables:
    noteBkgColor: "transparent"
    noteBorderColor: "transparent"
  sequence:
    messageAlign: left
    noteAlign: left
    actorMargin: 250
---
sequenceDiagram
    autonumber
    participant DB as RP Database
    participant API as RP Internal API
    participant A as Rogue Insider
    participant EXT as Darknet Market
    
    rect rgba(148, 163, 184, 0.14)
    A->>API: Uses legitimate admin credentials<br/>GET /admin/users/export
    API-->>A: Returns raw decrypted PID attributes
    Note right of EXT: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
    
    rect rgba(231, 76, 60, 0.14)
    A->>DB: Executes direct SQL correlation<br/>SELECT * WHERE sd_jwt_salt = 'x1y2'
    Note right of A: Builds shadow profiles of users
    A->>EXT: Exfiltrates data to external endpoint
    Note right of EXT: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
```

<details><summary><strong>1. Insider abuses legitimate admin credentials</strong></summary>

A rogue employee or compromised internal account uses their legitimate access rights to query the RP's internal management APIs or back-office interfaces, extracting raw, decrypted PID attributes.
</details>
<details><summary><strong>2. API returns raw decrypted PID attributes</strong></summary>

The internal administration API — which lacks field-level encryption or attribute redaction controls — returns the full set of decrypted PID attributes (family_name, given_name, birth_date, nationality, portrait photograph) in plaintext JSON. The absence of data minimisation at the API layer means the Insider receives far more data than operationally necessary.
</details>
<details><summary><strong>3. Insider executes direct SQL correlation</strong></summary>

If the RP fails to practice technical data minimization (e.g., permanently retaining the `sd_jwt_salt` disclosure hashes or the `cnf.jwk` thumbprints instead of immediately discarding them post-verification per ARF §7.4), the attacker can execute bulk database queries. This maliciously links separate, supposedly anonymous transactions back to continuous user profiles.

```sql
-- Reconstructing a shadow profile from retained unique cryptographic artifacts
SELECT t1.transaction_id, t2.patient_record 
FROM eudi_auth_logs t1
JOIN medical_records t2 
  ON t1.sd_jwt_salt = t2.sd_jwt_salt 
WHERE t1.cnf_jwk_thumbprint = '2a9f...';
```
</details>
<details><summary><strong>4. Insider exfiltrates data to external endpoint</strong></summary>

The Insider bundles the compiled identity intelligence and exfiltrates it outside the corporate perimeter, bypassing EUDI cryptographic protections entirely because the data was already parsed and stored in plaintext by the application layer.
</details>
<br/>

**Attack Vector**: A compromised or malicious RP employee with privileged access to the RP's backend systems accesses decrypted PID attribute values (given_name, family_name, birth_date, nationality, portrait photograph per §10.4), transaction logs (§25.3), or the verification pipeline's debug logs which may contain intermediate decryption states. The insider may exfiltrate this data for identity theft, sell it on dark markets, or use it for unauthorised profiling. This threat is distinct from RP-Side Data Breach: Stored PID Attributes because the attacker already has legitimate system access.

**Impact**: Data breach affecting potentially sensitive personal data under GDPR Art. 9 (if the RP collects health-related QEAA attributes) and standard personal data under Art. 4(1). GDPR Art. 33/34 breach notification obligations apply. eIDAS Art. 5b(4) requires that the RP only processes attributes for the stated purpose — insider misuse violates this. For financial RPs, insider data access may trigger AML/KYC regulatory reporting under the Bank Secrecy Act / AMLD6. The damage may be silent and long-lasting — insider exfiltration is often detected months or years after the fact.

**Mitigation**:

- **Preventive**: Role-based access control (RBAC) with least-privilege — separate the systems that decrypt JWE responses from the systems that store processed attribute values. The decryption service (§21.2 Model B webhook) should strip and discard raw attestation elements (salts, hashes, signature values) before passing attribute values to the application layer. Encrypt PID data at rest with application-layer encryption.
- **Detective**: Comprehensive audit logging of all access to PID data, with tamper-evident log storage; anomaly detection on access patterns (e.g., employee accessing more records than normal). Security monitoring per §25.1 alert triggers.
- **GDPR-specific**: Implement data minimisation per §9.10 — if unique attestation elements are discarded immediately after verification, an insider cannot extract them for linkability purposes. Distinct retention periods per attribute type (§25.3).
- **Regulatory**: For financial RPs, DORA Art. 9(4)(c) mandates HR-level security measures for ICT staff with access to sensitive data.

##### 24.2.9 Verification SDK Vulnerability (TT5.5)

```mermaid
---
config:
  themeVariables:
    noteBkgColor: "transparent"
    noteBorderColor: "transparent"
  sequence:
    messageAlign: left
    noteAlign: left
    actorMargin: 250
---
sequenceDiagram
    autonumber
    participant A as Attacker
    participant SDK as RP Verification SDK
    participant APP as RP Application
    
    rect rgba(231, 76, 60, 0.14)
    A->>A: Crafts malformed credential<br/>(e.g., Mismatched SD-JWT disclosure)
    A->>SDK: Submits payload to Response URI
    Note right of APP: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
    
    rect rgba(148, 163, 184, 0.14)
    Note right of SDK: ⚠️ Vulnerability in parser logic<br/>(e.g., skips array bounds check)
    SDK->>SDK: Falsely evaluates payload as VALID
    SDK-->>APP: Returns corrupted identity assertion
    APP->>APP: Grants unauthorized access
    Note right of APP: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
```

<details><summary><strong>1. Attacker crafts malformed credential</strong></summary>

The Attacker manipulates a cryptographic attribute (e.g., mismatching an SD-JWT disclosure hash, manually flipping a Status List revocation bit, or truncating an X.509 certificate chain) specifically designed to trigger an edge-case parser bug.
</details>
<details><summary><strong>2. Attacker submits payload</strong></summary>

The Attacker submits this intentionally malformed `vp_token` payload to the Relying Party's `response_uri`.
</details>
<details><summary><strong>3. SDK falsely evaluates payload as VALID</strong></summary>

Due to a zero-day logic flaw or an unpatched vulnerability within the 3rd-party Verification SDK library (e.g., an off-by-one array evaluation skipping a signature check, or a failure to stringently enforce the `iat` epoch constraints per RFC 9068), the underlying verifier returns a `true` boolean state.

```javascript
// Example of a vulnerable Verification SDK logic flaw
function verifyDisclosure(disclosure, targetHash) {
    const computed = crypto.createHash('sha256').update(disclosure).digest();
    // VULNERABILITY: Loose equality '==' instead of cryptographically secure timing-safe '==='
    // or entirely failing to check the disclosure array bounds.
    if (computed == targetHash) { 
        return true; 
    }
}
```
</details>
<details><summary><strong>4. SDK returns corrupted identity assertion</strong></summary>

The Application receives the "verified" boolean flag from the SDK, wrongfully trusts it, and grants the Attacker unauthorized access or executes an unverified financial transaction.
</details>
<details><summary><strong>5. Application grants unauthorized access</strong></summary>

The RP's application layer, acting on the corrupted assertion from the vulnerable SDK, grants the Attacker full authenticated access — onboarding a fraudulent identity, authorising a financial transaction, or issuing session credentials that can be reused indefinitely until the SDK vulnerability is patched and the affected sessions are invalidated.
</details>
<br/>

**Attack Vector**: An accidental bug (not intentional compromise — see Verification Stack Supply Chain Attack for that) in the RP's credential verification library causes incorrect verification outcomes. Examples: (a) a parsing error in the SD-JWT VC disclosure validation that accepts a disclosure with a mismatched hash, (b) an off-by-one error in Status List bit-index extraction (§9.5 / Annex A) that reads the wrong revocation status, (c) a certificate chain validation bug that accepts expired intermediate certificates, (d) a CBOR parsing error in the mdoc DeviceResponse that skips the `DeviceSignature` check, (e) a DCQL query evaluation error that accepts a credential missing required attributes. The nascent state of the EUDI verification ecosystem (§20 — most SDKs are pre-1.0) makes this threat elevated.

**Impact**: The RP accepts forged, expired, or revoked credentials as valid — potentially onboarding a fraudulent identity (§19 KYC), granting access to protected resources, or authorising a payment (§13 SCA). Alternatively, a false-*negative* bug (rejecting valid credentials) causes service disruption for legitimate users (R13). The impact is proportional to the RP's reliance on the EUDI Wallet as an identity assertion — for a bank using it as primary KYC, a verification bypass is catastrophic.

**Mitigation**:

- **Primary**: Regular SDK updates from the vendor, tracking the vendor's security advisories (§20 vendor evaluation should include security response track record).
- **Testing**: Integration test suite with known-good credentials (must pass) *and* known-bad credentials (must fail) — including: expired credentials, revoked credentials (Status List bit set), invalid signatures, mismatched `aud`/`nonce`, tampered disclosures, and incomplete certificate chains. This test suite acts as a regression guard against verification bugs.
- **Defence in depth**: Run critical verification steps (signature, revocation, holder binding) through two independent code paths or libraries and compare results.
- **Monitoring**: Log all verification outcomes per §25.3.1 — an unexpected spike in acceptance rates or a drop in rejection rates may indicate a verification bug.
- **Vendor diversity**: Consider using different verification libraries for SD-JWT VC and mdoc pipelines, reducing the risk of a single bug affecting both format stacks.

##### 24.2.10 Session Fixation: `state` Parameter Hijacking 

```mermaid
---
config:
  themeVariables:
    noteBkgColor: "transparent"
    noteBorderColor: "transparent"
  sequence:
    messageAlign: left
    noteAlign: left
    actorMargin: 250
---
sequenceDiagram
    autonumber
    participant A as Attacker
    participant RP as 🏦 RP Server
    participant V as Victim
    participant W as Victim's Wallet
    
    rect rgba(231, 76, 60, 0.14)
    A->>RP: Requests Authorization URI
    RP-->>A: openid4vp://?client_id=...&state=ATTACKER_STATE
    A->>V: Delivers URI to Victim<br/>(e.g., via malicious iframe/redirect)
    Note right of W: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
    
    rect rgba(148, 163, 184, 0.14)
    V->>W: Victim clicks injected link
    W->>RP: Wallet completes presentation<br/>POST /response_uri<br/>state=ATTACKER_STATE
    Note right of W: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
    
    rect rgba(231, 76, 60, 0.14)
    RP->>RP: RP processes response
    Note right of RP: Binds valid PID to ATTACKER_STATE string
    RP-->>A: Attacker's active session logs in as Victim
    Note right of W: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
```

<details><summary><strong>1. Attacker requests Authorization URI</strong></summary>

The Attacker begins a legitimate login flow on the Relying Party's infrastructure, receiving an `openid4vp://` connection string containing a cryptographically valid `state` parameter permanently bound to the Attacker's active session.
</details>
<details><summary><strong>2. RP Server returns Authorization URI with Attacker's state</strong></summary>

The RP Server responds with an `openid4vp://` URI containing the Attacker's session-bound `state` parameter and a `request_uri` pointing to the JAR. This is a standard, legitimate response — the RP has no way of knowing that the requester intends to relay this URI to a third party.
</details>
<details><summary><strong>3. Attacker delivers URI to Victim</strong></summary>

The Attacker maliciously injects this exact URI into the Victim's browser (e.g., via an iframe, automated redirect, or a phishing email link).
</details>
<details><summary><strong>4. Victim clicks injected link</strong></summary>

The unsuspecting Victim clicks the link, inadvertently launching their EUDI Wallet using the Attacker's initialization string.
</details>
<details><summary><strong>5. Wallet completes presentation</strong></summary>

The Wallet performs the standard cryptographic presentation and deposits the encrypted JWE `vp_token` payload at the RP's `response_uri`, passing back the exact `state=ATTACKER_STATE` parameter.

```http
POST /api/vp/response HTTP/1.1
Host: rp.example.com
Content-Type: application/x-www-form-urlencoded

vp_token=eyJhbG...[JWE]...
&presentation_submission={"id":"ps_1","definition_id":"pid_request"}
&state=ATTACKER_STATE
```
</details>
<details><summary><strong>6. RP Server processes response</strong></summary>

The RP Server decrypts the payload, determines it is mathematically valid, and binds the newly verified identity attributes to the session identified by `ATTACKER_STATE`.
</details>
<details><summary><strong>7. Attacker's active session logs in as Victim</strong></summary>

Because the Attacker holds the session cookie natively associated with `ATTACKER_STATE`, the RP Server seamlessly elevates the Attacker's privilege, logging them into the Victim's hijacked identity.
</details>
<br/>

**Attack Vector**: Attacker pre-sets or predicts the OAuth `state` parameter used in the OpenID4VP flow. In the standard flow (§7.2 step 3), the RP generates a `state` value, includes it in the JAR, and expects it back in the Wallet's response. If the attacker can fix this `state` to a value they know (e.g., by injecting a crafted `request_uri` into the victim's browser), they can correlate the Wallet's response to their own session. When the victim completes the presentation, the Wallet redirects the response to the RP's `response_uri` with the attacker's `state` — and the RP maps it to the attacker's session, granting the attacker an authenticated session backed by the victim's PID.

**Impact**: Full session hijack — the attacker gains an authenticated session at the RP as the victim. This is functionally equivalent to Credential Replay in impact but uses a different mechanism: instead of replaying a captured token, the attacker tricks the system into delivering a fresh, legitimate token into a pre-arranged session bucket. For banking RPs (§18), this could enable account takeover.

**Mitigation**:

- **Primary**: The RP must generate the `state` parameter as a cryptographically random value (≥128 bits of entropy) bound to the server-side session (§7.2 step 3). The `state` must be stored in the RP's session store and validated against the session on response receipt.
- **Secondary**: The `state` value should be one-time-use — invalidated after the first response that carries it.
- **Tertiary**: Bind the `state` to additional session context (e.g., the user's browser fingerprint, IP address, or a server-side session cookie) so that even if an attacker knows the `state`, they cannot claim the response from a different browser/IP. **Same-device DC API flows**: The DC API's `navigator.credentials.get()` returns the response directly to the calling JavaScript context, bypassing the redirect-based `state` mechanism entirely — this eliminates session fixation for same-device flows. The threat primarily affects cross-device and redirect-based flows.

##### 24.2.11 RP-Side Attestation Linkability (TR36)

```mermaid
---
config:
  themeVariables:
    noteBkgColor: "transparent"
    noteBorderColor: "transparent"
  sequence:
    messageAlign: left
    noteAlign: left
    actorMargin: 250
---
sequenceDiagram
    autonumber
    participant V as Returning User
    participant RP as 🏦 RP Server
    participant DB as RP Database
    
    rect rgba(148, 163, 184, 0.14)
    V->>RP: Presents credentials (Session A)<br/>Reveals family_name + Unique sd_jwt_salt
    Note right of DB: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
    
    rect rgba(231, 76, 60, 0.14)
    RP->>DB: Illegitimately stores correlation data<br/>INSERT INTO profiles (salt, attributes)
    Note right of DB: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
    
    rect rgba(148, 163, 184, 0.14)
    Note right of V: Timeline advances (e.g., 2 weeks later)
    V->>RP: Presents credentials (Session B)<br/>Reveals only age_over_18 + SAME Unique sd_jwt_salt
    Note right of DB: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
    
    rect rgba(231, 76, 60, 0.14)
    RP->>DB: Queries database utilizing fixed salt
    Note right of DB: ⚠️ Match detected across independent sessions
    RP->>RP: De-anonymizes 'Session B'<br/>linking back to family_name from 'Session A'
    Note right of DB: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
```

<details><summary><strong>1. Returning User presents credentials (Session A)</strong></summary>

A user authenticates with an RP out of necessity, releasing their `family_name`. Within the cryptography of an SD-JWT VC, the actual string is hashed using a unique, randomized `sd_jwt_salt` attached specifically to that single presentation attribute during issuance.

```json
// The unique salt mathematically linked to the user's family_name
[
  "2GLC42sKQveCfGfryNRN9w", // The salt (128-bit minimum entropy)
  "family_name",
  "Müller"
]
```
</details>
<details><summary><strong>2. RP illegitimately stores correlation data</strong></summary>

Violating EUDI data minimization principles, the RP Server persistently saves the raw `sd_jwt_salt` (or a `cnf.jwk` thumbprint, or a Status List index) into their backend database alongside the user profile rather than fundamentally discarding it immediately post-verification.

```sql
-- The malicious or negligent RP stores the unique crypto artifacts
INSERT INTO user_profiles (session_id, family_name, linked_salt)
VALUES ('session_A', 'Müller', '2GLC42sKQveCfGfryNRN9w');
```
</details>
<details><summary><strong>3. Returning User presents credentials (Session B)</strong></summary>

Weeks later, the user returns under a supposedly anonymous context, releasing only an `age_over_18` boolean predicate to access restricted content. However, because they are presenting the *same* physical attestation (Method A, single-issuance per ARF), the underlying `sd_jwt_salt` for that specific age claim remains mathematically identical.

```json
// The Wallet transmits the EXACT same disclosure string in both sessions
// because the Attestation Provider uniquely baked the salt into the credential.
"~WyJFTXk0NnI1... (salt)", "age_over_18", true]"
```
</details>
<details><summary><strong>4. RP queries database utilizing fixed salt</strong></summary>

The RP Server automatically sweeps its database, explicitly evaluating if the newly presented string of unique cryptographic artifacts mathematically matches any pre-existing historical logs.

```sql
-- The backend runs a passive real-time correlation check
SELECT session_id, family_name 
FROM user_profiles 
WHERE linked_salt = '2GLC42sKQveCfGfryNRN9w';
-- Returns: 'session_A', 'Müller'
```
</details>
<details><summary><strong>5. RP De-anonymizes Session B</strong></summary>

The RP algorithmically links Session B to Session A, merging the supposedly anonymous age-check directly into the user's permanent, named surveillance profile and utterly defeating the exact selective disclosure safeguards that SD-JWT VC was designed to guarantee.
</details>
<br/>

**Attack Vector**: The RP stores unique, fixed elements from presented attestations — salts, hash values, the `cnf.jwk` public key thumbprint, the issuer signature value, or the Status List index — and uses them to correlate multiple presentations by the same user across different transactions. Each SD-JWT VC contains per-disclosure salts and hash digests in the `_sd` array; each mdoc contains per-element `random` values and the MSO `digestAlgorithm` outputs. These elements are *unique per attestation* and *fixed across presentations of the same attestation* (ARF Topic A §2.1). A single malicious database query (`SELECT user_id FROM presentations WHERE salt_hash = X`) can link transactions that the user expected to be unlinkable.

**Impact**: User tracking and profiling within a single RP's transaction history — enabling behavioural analysis, usage pattern mining, and inference attacks (ARF risk R14: Surveillance). If the RP is also collecting browsing data, location data, or purchase history, the attestation linkability provides a universal join key that unifies the user's cross-session profile. This violates the user's reasonable expectation under eIDAS Art. 5b(4) and GDPR Art. 5(1)(b) (purpose limitation). The ARF's Topic A (§2.2) extensively analyses this threat and its variants. Even without malicious intent, a data breach  exposing stored unique elements would enable a third party to perform the same linkability analysis.

**Mitigation**:

- **Primary**: Anti-linkability practices per §9.10 — the RP must discard all unique attestation elements (salts, disclosure hashes, signature values, `cnf.jwk` key material) immediately after completing the verification pipeline. The RP should retain only the extracted *attribute values* (given_name, birth_date, etc.) and an application-level session token, never the raw cryptographic artefacts.
- **Issuer-side**: The ARF mandates that PID Providers support Method A (once-only attestations) or Method B (limited-time attestations) per Topic A §3 and Topic 10 HLRs — meaning each attestation is used for a limited number of presentations, reducing the correlation window.
- **Organisational**: Relying Parties found offending can have their WRPAC revoked by the national Registrar (ARF §6.4.3), permanently blocking them from the ecosystem.
- **Technical verification**: Implement automated code review or runtime assertions that verify unique elements are not persisted to any durable storage.

##### 24.2.12 Cross-RP Collusion (TR84, SR1)

```mermaid
---
config:
  themeVariables:
    noteBkgColor: "transparent"
    noteBorderColor: "transparent"
  sequence:
    messageAlign: left
    noteAlign: left
    actorMargin: 250
---
sequenceDiagram
    autonumber
    participant V as Citizen
    participant RP1 as 🏥 Healthcare RP
    participant BRK as 🗄️ Data Broker
    participant RP2 as 🏦 Insurance RP
    
    rect rgba(148, 163, 184, 0.14)
    V->>RP1: Presents medical attributes<br/>cnf_jwk_thumbprint = xyz890
    V->>RP2: Presents financial attributes<br/>cnf_jwk_thumbprint = xyz890
    Note right of RP2: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
    
    rect rgba(231, 76, 60, 0.14)
    RP1->>BRK: Sells anonymized log<br/>{ thumbprint: "xyz890", health: "Diabetes" }
    RP2->>BRK: Sells anonymized log<br/>{ thumbprint: "xyz890", credit: "Poor" }
    
    BRK->>BRK: Executes Wholesale Surveillance<br/>JOIN logs ON thumbprint
    Note right of BRK: ⚠️ Cross-service profile synthesized 
    Note right of RP2: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
```

<details><summary><strong>1. Citizen presents medical attributes</strong></summary>

The Citizen utilizes their EUDI Wallet to securely present health credentials to a Healthcare RP. The underlying transmission structurally includes fixed cryptographic constants, such as the `cnf_jwk` thumbprint representing the public key permanently bound to the attestation.

```json
// The structurally bound identifier transferred during presentation
{
  "cnf_jwk_thumbprint": "urn:ietf:params:oauth:jwk-thumbprint:xyz890",
  "health_condition": "Diabetes"
}
```
</details>
<details><summary><strong>2. Citizen presents financial attributes</strong></summary>

Shortly after, the Citizen utilizes the identical attestation to present financial data to an independent Insurance RP. 

Because the citizen hasn't rotated their credential, the mathematically identical `cnf_jwk` thumbprint (derived from the same device-bound key) is inevitably transmitted again during the cryptographic pairing to the new service.
</details>
<details><summary><strong>3. Healthcare RP sells anonymized log</strong></summary>

Believing the data is "safely anonymized" due to systematically stripping direct names, the Healthcare RP sells a data dump inadvertently mapping the allegedly "meaningless" `thumbprint` string directly to a highly sensitive medical diagnosis condition.

```csv
# Allegedly anonymized leaked data broker feed
internal_id,thumbprint,diagnosis,timestamp
user_339,xyz890,Diabetes,2024-03-01T12:00:00Z
```
</details>
<details><summary><strong>4. Insurance RP sells anonymized log</strong></summary>

The Insurance RP simultaneously sells bulk financial analytics, similarly mapping the structurally identical `thumbprint` string to the user's credit score standing within their own supposedly anonymous logs.

```csv
# Secondary anonymized leaked data broker feed
customer_ref,thumbprint,credit_tier,timestamp
cust_99x,xyz890,Poor,2024-03-05T14:30:00Z
```
</details>
<details><summary><strong>5. Data Broker executes Wholesale Surveillance</strong></summary>

A central Data Broker (or colluding corporate parent) acquires both datasets. By executing a simple database `JOIN` operation matching on the `thumbprint` strings, the Broker synthesizes a catastrophic cross-service behavior graph, inextricably linking the user's hidden financial constraints to their medical vulnerabilities. This enacts the exact Wholesale Surveillance system risk (SR1) defined in the ARF.

```json
{
  "surveillance_profile_xyz890": {
    "identifier_key": "urn:ietf:params:oauth:jwk-thumbprint:xyz890",
    "linked_attributes": {
      "healthcare_rp_log": { "condition": "Diabetes", "timestamp": 1709230000 },
      "insurance_rp_log": { "credit_tier": "Poor", "timestamp": 1709234500 }
    }
  }
}
```
</details>
<br/>

**Attack Vector**: Multiple RPs share the unique attestation elements they received from users' presentations — salts, hash digests, `cnf.jwk` thumbprints, or signature values — through a side channel (shared database, API, data broker, or informal agreement). By matching these elements across their respective datasets, the colluding RPs can de-anonymise users and construct cross-service profiles. For example, if a user presents the same PID to a bank and a telecom, and both store the SD-JWT salt for the `family_name` disclosure, they can match on this salt to confirm it's the same person — even without sharing the actual attribute value. The ARF identifies this as the 'wholesale surveillance' system risk (SR1).

**Impact**: Cross-service user profiling and de-anonymisation at scale. The colluding RPs can derive the user's full activity graph across all participating services. This constitutes wholesale surveillance (ARF risk SR1) and violates GDPR Art. 5(1)(b) (purpose limitation) and eIDAS Art. 5b(4). The damage is proportional to the number of colluding RPs and the sensitivity of the services involved. Critically, this attack works even with once-only attestations (Method A) if the attestation was presented to each RP before rotation — the window is reduced but not eliminated unless ZKP-based proofs are used (ARF §7.4.3.5.3).

**Mitigation**:

- **Technical (RP-side)**: Same as RP-Side Attestation Linkability — discard unique attestation elements immediately after verification per §9.10. If unique elements are not stored, they cannot be shared.
- **Technical (issuer-side)**: Once-only attestations (ARF Topic A, Method A) ensure each RP receives a different attestation instance, making cross-RP matching infeasible. Rotating-batch attestations (Method C) and per-Relying Party attestations (Method D) further reduce the correlation surface.
- **Future**: Zero-Knowledge Proofs (ARF §7.4.3.5.3, Topic G) would eliminate this threat entirely by allowing the user to prove attribute statements without revealing any linkable cryptographic artefacts.
- **Organisational**: Access certificate revocation for offending RPs (ARF §6.4.3); regulatory enforcement via GDPR supervisory authorities; mandatory audits of data handling practices. The ARF notes that organisational and enforcement measures are the primary deterrent for cross-RP collusion, since full technical prevention requires ZKP adoption.

##### 24.2.13 Identifier-Based Tracing (TR39)

```mermaid
---
config:
  themeVariables:
    noteBkgColor: "transparent"
    noteBorderColor: "transparent"
  sequence:
    messageAlign: left
    noteAlign: left
    actorMargin: 250
---
sequenceDiagram
    autonumber
    participant V as User Wallet
    participant RP as RP Server / Ecosystem
    
    rect rgba(148, 163, 184, 0.14)
    Note right of V: Presenting identical SD-JWT VC credential
    V->>RP: Presentation 1 (Jan 10)<br/>Status List Index = 45991
    V->>RP: Presentation 2 (Feb 15)<br/>Status List Index = 45991
    Note right of RP: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
    
    rect rgba(231, 76, 60, 0.14)
    RP->>RP: Cross-references internal logs<br/>or public HTTP intercept traces
    Note right of RP: ⚠️ Traces user movement across time<br/>via inherent stable structural constants
    Note right of RP: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
```

<details><summary><strong>1. User Wallet issues Presentation 1 (Jan 10)</strong></summary>

A user authenticates utilizing their wallet. The protocol innately contains fixed structural constants necessary for cryptographic validation, such as the `Status List Index` (e.g., `45991`) mapped specifically to that individual attestation.

```json
// The payload invariably leaks the exact revocation index
{
  "status": {
    "status_list": {
      "idx": 45991,
      "uri": "https://issuer.example.eu/status-list/1"
    }
  }
}
```
</details>
<details><summary><strong>2. User Wallet issues Presentation 2 (Feb 15)</strong></summary>

The user returns to the RP Server over a month later. Even if they present completely different pseudo-anonymous attributes to mask their returning identity, the identical structural constraints (the exact same `Status List Index` mapped to that credential serial) must logically be transmitted again to allow the RP to check revocation.
</details>
<details><summary><strong>3. RP traces user movement across time</strong></summary>

Whether maliciously executed by the RP Server itself, or passively observed by an infrastructure-level network interceptor monitoring the `/status-list` `GET` requests, the exact `45991` index tracks the user's recurrent presence without ever requiring access to their literal identity data. This breaks the unlinkability requirements defined in eIDAS Article 5b.

```http
GET /.well-known/status-list/pid-revocations-1 HTTP/1.1
Host: issuer.example.eu

# Interceptor notes: IP 230.12.x.x requesting index 45991 on Jan 10
# Interceptor notes: IP 45.99.x.x requesting index 45991 on Feb 15
# Conclusion: Both IPs map to the identical physical human.
```
</details>
<br/>

**Attack Vector**: Attacker (malicious RP, insider, or third party via breach) uses *stable identifiers* embedded in the attestation to trace the user across services or over time. Key stable identifiers include: (a) the Status List index (§9.5) — unique per attestation and queryable by any RP that knows the Status List URL, (b) the `cnf.jwk` public key or its thumbprint — the same key is used in the KB-JWT for every presentation of the same attestation, (c) the SD-JWT `iss` + `sub` combination if a subject identifier is present, (d) the mdoc `docType` + `issuerAuth` certificate serial number. Unlike RP-Side Attestation Linkability (which uses transient unique elements like salts), these identifiers are *structurally stable* and often *necessary for the protocol to function*.

**Impact**: User surveillance (ARF risk R14). The Status List index is particularly dangerous because it's a public, queryable identifier — any entity that knows the Status List URL and the user's index can check whether the user's credential has been revoked, leaking information about the user's status. The `cnf.jwk` thumbprint (JWK Thumbprint per RFC 7638) is deterministically derived from the public key, so any RP that receives a presentation from the same key can compute the same thumbprint and correlate transactions.

**Mitigation**:

- **Primary**: The RP should use application-level pseudonyms (§14) rather than raw attestation identifiers for session management and user tracking. The pseudonym is RP-specific by design and does not leak information to other RPs.
- **Status List privacy**: The ARF's Topic A §4.3 recommends that Status List indices be randomly assigned (not sequential) and that each Status List contain a sufficiently large number of entries to ensure herd privacy — the RP downloading a Status List should not be able to infer which specific credential was just presented. The RP should download Status Lists proactively, not per-presentation.
- **Key rotation**: Once-only or limited-time attestations (Topic A Methods A/B) rotate the `cnf.jwk` along with the attestation, preventing long-term key-based tracing.
- **Implementation**: Never expose Status List indices, `cnf.jwk` thumbprints, or issuer signature values in user-facing URLs, cookies, or log files that could be correlated externally.

##### 24.2.14 Over-Identification (TR85)

```mermaid
---
config:
  themeVariables:
    noteBkgColor: "transparent"
    noteBorderColor: "transparent"
  sequence:
    messageAlign: left
    noteAlign: left
    actorMargin: 250
---
sequenceDiagram
    autonumber
    participant RP as 🏦 RP Server
    participant W as EUDI Wallet
    participant R as Registrar
    
    rect rgba(148, 163, 184, 0.14)
    RP->>R: Registers intended attributes<br/>scope: [age_over_18]
    R-->>RP: Issues WRPRC Certificate
    Note right of R: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
    
    rect rgba(231, 76, 60, 0.14)
    RP->>W: Transmits lazy Authorization Request<br/>dcql_query: [family_name, birth_date, address]
    Note right of R: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
    
    rect rgba(148, 163, 184, 0.14)
    Note right of W: ⚠️ Wallet presents consent screen
    W->>W: User blindly approves over-extended request
    Note right of R: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
    
    rect rgba(231, 76, 60, 0.14)
    W-->>RP: Violates Data Minimization<br/>(Transmits full PID block)
    Note right of R: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
```

<details><summary><strong>1. RP Server registers intended attributes</strong></summary>

The RP registers with the National Ecosystem precisely articulating its use case (e.g., merely validating age for age-restricted purchases), legally limiting its logical access constraints via the WRPRC ruleset.

```json
// The RP explicitly registered for a strict minimal subset
{
  "client_id": "liquor-store-rp.eu",
  "intended_attributes": ["age_over_18"],
  "business_purpose": "Regulatory Age Verification"
}
```
</details>
<details><summary><strong>2. Registrar issues WRPRC Certificate</strong></summary>

The national Registrar issues a WRPRC that codifies the RP's declared intended attributes (`age_over_18` only). This certificate serves as the ecosystem's governance control — the Wallet can later compare the RP's actual DCQL request against the WRPRC's attribute scope to detect over-collection.
</details>
<details><summary><strong>3. RP Server transmits lazy Authorization Request</strong></summary>

Due to poor engineering logic or convenience-driven laziness, the RP constructs an inflated, overarching `dcql_query` sweeping the user's entire core PID dataset (`family_name`, `birth_date`, `address`), fundamentally disregarding overarching ecosystem privacy covenants and the GDPR data minimization mandate (Art 5).

```json
"dcql_query": {
  "credentials": [{
    "id": "pid",
    "format": "vc+sd-jwt",
    "claims": [
      { "path": [ "family_name" ] },
      { "path": [ "given_name" ] },
      { "path": [ "birth_date" ] },
      { "path": [ "resident_address" ] } // Totally irrelevant for a simple 18+ age verification!
    ]
  }]
}
```
</details>
<details><summary><strong>4. User blindly approves over-extended request</strong></summary>

Assuming the system is fully automated and structurally governed by the Wallet, the User casually accepts the Wallet Unit's consent screen without carefully auditing the bloated attribute list, wrongly assuming the RP is only extracting their age.
</details>
<details><summary><strong>5. Wallet transmits excessive attributes violating Data Minimization</strong></summary>

The Wallet faithfully constructs the extensive presentation response, transferring the User's unmitigated, highly sensitive demographic profile directly into the RP's backend, significantly magnifying the severity of any subsequent internal data breaches and blatantly violating GDPR Art. 5.
</details>
<br/>

**Attack Vector**: The RP requests PID attributes (given_name, family_name, birth_date, etc.) in its DCQL query when a pseudonym (§14) or a derived attribute (e.g., `age_over_18` instead of `birth_date`) would suffice for the use case. This is not *malicious* per se — it often results from convenience-driven engineering ("just ask for the full PID") rather than careful data minimisation analysis. However, it enables the RP to build a full identity profile where none was needed, and exposes the user to all of the linkability risks (RP-Side Attestation Linkability through Identifier-Based Tracing) that could have been avoided. The ARF identifies this as TR85 ("attacker can track and trace a user by using person identification data where identification is not required").

**Impact**: Privacy violation at scale. eIDAS Art. 5b(9) explicitly requires that *"the relying party shall not request any data beyond what is necessary for the intended purpose"*. GDPR Art. 5(1)(c) (data minimisation) and Art. 25(2) (data protection by default) impose the same obligation. Systematic over-identification could trigger GDPR enforcement by supervisory authorities, with fines up to €20M or 4% of global turnover. Beyond regulatory risk, over-identification degrades user trust in the ecosystem — if users learn that RPs routinely demand full PID when checking age, they will resist adopting the EUDI Wallet.

**Mitigation**:

- **Primary**: Implement pseudonym-based authentication (§14) for returning-user scenarios — Use Cases A–D provide patterns where pseudonyms replace PID for session management, login, and progressive assurance.
- **DCQL query design**: Construct DCQL queries (§15) that request the *minimum* attribute set. Use `age_over_18` or `age_over_65` predicates instead of `birth_date` where age verification is the goal. Use `nationality` alone instead of full PID when citizenship is the criterion.
- **Registration certificate enforcement**: The WRPRC (§4.3) lists the attributes the RP registered to request — the Wallet can compare the DCQL query against the WRPRC and warn the user if the RP is requesting attributes beyond its registered scope (ARF §6.6.3.3).
- **Ecosystem governance**: National Registrars review attribute requests during RP registration (§3) and can reject registrations that fail the necessity test.
- **Technical guardrail**: Implement a server-side policy engine (§21 policy-as-code) that validates outgoing DCQL queries against the RP's registered attribute set before constructing the JAR, preventing accidental over-collection.

##### 24.2.15 User Device Malware: Consent Manipulation (TT5.7)

```mermaid
---
config:
  themeVariables:
    noteBkgColor: "transparent"
    noteBorderColor: "transparent"
  sequence:
    messageAlign: left
    noteAlign: left
    actorMargin: 250
---
sequenceDiagram
    autonumber
    participant M as Malware (Active Overlay)
    participant W as EUDI Wallet (Hardware WSCD)
    
    rect rgba(148, 163, 184, 0.14)
    W->>W: Renders legitimate Consent Screen<br/>Target RP: "Shady LLC"
    Note right of W: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
    
    rect rgba(231, 76, 60, 0.14)
    M->>W: Unlawfully injects UI DOM overlay<br/>Displays Target RP: "Official State Portal"
    
    Note right of M: User visually trusts spoofed overlay
    M->>W: User taps "Authorize" below overlay
    Note right of W: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
    
    rect rgba(148, 163, 184, 0.14)
    W->>W: Secure Enclave (WSCD) processes valid signing
    Note right of W: ❌ Cryptographically flawless signing<br/>authorized under utterly false pretenses
    Note right of W: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
```

<details><summary><strong>1. Wallet renders legitimate Consent Screen</strong></summary>

The EUDI Wallet natively renders the actual identity of the requesting Relying Party, explicitly listing exactly which attribute claims will be surrendered (e.g., "Shady LLC requests: full PID") based on the verified WRPAC chain.
</details>
<details><summary><strong>2. Malware injects UI DOM overlay</strong></summary>

Rogue device-level malware draws a sophisticated, opaque visual overlay *on top* of the Wallet app interface, deceptively obscuring the core identity text to falsely display a trustworthy origin like: "Official State Portal". This operates inherently at the OS Display level, entirely bypassing the Wallet's native application sandbox.

```json
// The physical Wallet receives the actual payload below:
{
  "client_id": "shady-llc.example.com",
  "client_name": "Shady LLC Data Aggregator"
}
// But the Malware forces the screen pixels to selectively render: 
// "Official State Portal requests your credential"
```
</details>
<details><summary><strong>3. User taps Authorize below overlay</strong></summary>

Fooled by the malicious visual manipulation actively overlaid across their own screen, the User physically clicks or biometric-authenticates the underlying actual Wallet "Approve" button, genuinely believing they are proceeding with a secure, regulated governmental action.
</details>
<details><summary><strong>4. Secure Enclave processes valid signing</strong></summary>

Because the Wallet's hardware-backed Secure Element (WSCD) accurately interprets the physical approval signal independently of the display layer OS, it performs an entirely legitimate cryptographic ECDSA signing operation, blindly executing a catastrophic data transfer to the attacker without the system triggering an internal constraint fault.
</details>
<br/>

**Attack Vector**: Malware on the user's phone overlays or manipulates the Wallet consent screen (overlay attack), tricking the user into approving presentation to a different RP or approving different attributes than displayed. The WSCD protects private keys from extraction even on a rooted device, but cannot prevent the user from *voluntarily* authorising a signing operation under false pretences.

**Impact**: RP receives cryptographically valid credentials that the user did not intentionally present to *this* RP; potential social engineering amplification; legal ambiguity on consent validity under eIDAS Art. 5b(3) ("the user shall be in full control"). The RP has no way to distinguish a malware-manipulated consent from a genuine one — the cryptographic signatures are identical.

**Mitigation**:

- **Primary (Wallet Provider domain)**: The ARF assigns device security to the Wallet Provider (Topic T, WPSM_03): rooting/jailbreak detection, emulator detection, app integrity checks, and a 4-level security posture framework with WUA revocation at Level 4 (Critical). The RP cannot directly mitigate device-side malware.
- **Secondary (ARF Topic AA)**: For SCA flows, the ARF mandates secure rendering of the authorisation screen in an isolated Wallet component, preventing overlay attacks on the payment consent.
- **RP-side mitigations**: Implement transaction-specific confirmation for high-value actions (e.g., a separate verification step after credential presentation); for payment SCA, use Dynamic Linking (`transaction_data_hashes_alg` in the JAR, §13.7) so the Wallet signs over the exact transaction details the user sees — even if the display is overlaid, the signed payload reflects the real transaction.
- **Detection**: Monitor for anomalous patterns (e.g., same user presenting credentials to multiple unrelated RPs in rapid succession).

##### 24.2.16 Browser-Side Session Hijacking: Post-Verification (TT5.7)

```mermaid
---
config:
  themeVariables:
    noteBkgColor: "transparent"
    noteBorderColor: "transparent"
  sequence:
    messageAlign: left
    noteAlign: left
    actorMargin: 250
---
sequenceDiagram
    autonumber
    participant V as Victim Browser
    participant RP as 🏦 RP Server
    participant A as Evil Extension (MitB)
    
    rect rgba(148, 163, 184, 0.14)
    V->>RP: Executes flawless EUDI PID verification
    RP-->>V: Grants standard web session<br/>Set-Cookie: AUTH_SESS_ID=jwt_token
    Note right of A: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
    
    rect rgba(231, 76, 60, 0.14)
    A->>V: Automatically scrapes DOM / Cookie store
    Note right of A: Extracts AUTH_SESS_ID string directly
    A->>RP: Replays raw application cookie
    Note right of RP: Session matches perfectly
    RP-->>A: Grants full Account Takeover
    Note right of A: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
```

<details><summary><strong>1. Victim Browser executes flawless EUDI PID verification</strong></summary>

The User executes an impeccable cryptographic authentication mechanism, relying flawlessly on the strongest EUDI Wallet security standards (JWS/JWE end-to-end processing) operating over the W3C DC API.
</details>
<details><summary><strong>2. RP Grants standard web session</strong></summary>

Successfully decrypting the Wallet's secure payload, the Relying Party application transitions the verified state into a standard web JWT/Cookie paradigm, dispensing a standard `AUTH_SESS_ID` string to the User's browser. The EUDI cryptographic boundary officially ends here.

```http
HTTP/1.1 200 OK
Set-Cookie: AUTH_SESS_ID=eyJhbG...; HttpOnly; Secure; SameSite=Lax
Content-Type: application/json

{"status": "EUDI Authentication Successful, Session Established"}
```
</details>
<details><summary><strong>3. Evil Extension automatically scrapes DOM</strong></summary>

A malicious Man-in-the-Browser (MitB) extension or resident JavaScript logic quietly hoovers the plaintext `AUTH_SESS_ID` token directly from the vulnerable local browser storage buffer (document.cookie).
</details>
<details><summary><strong>4. Evil Extension replays raw application cookie</strong></summary>

Bypassing the intricate, impenetrable EUDI cryptography entirely—because the subsequent web session assumes it is implicitly authenticated—the attacker simply injects the stolen cookie into an independent external HTTP request sent from their command server.
</details>
<details><summary><strong>5. RP Grants full Account Takeover</strong></summary>

The Relying Party Server blindly identifies the structurally valid tracking cookie, systematically executing a catastrophic, retroactive hijack of the identity session established exclusively via the high-security Wallet mechanism.
</details>
<br/>

**Attack Vector**: Man-in-the-Browser (MitB) malware or a malicious browser extension steals the authenticated session cookie/token *after* successful EUDI Wallet verification. The EUDI cryptographic chain (JAR → JWE → KB-JWT → SD-JWT VC verification) completes correctly, but the resulting application session is a standard web artefact vulnerable to cookie theft.

**Impact**: Attacker obtains an authenticated session without possessing the user's credentials; bypasses all EUDI cryptographic protections retroactively; full account takeover possible. For financial RPs (§18), this could enable unauthorised transactions, fund transfers, or account modifications. This threat is not EUDI-specific but is operationally critical in the context of high-value identity flows where the session represents a verified legal identity.

**Mitigation**:

- **Primary**: Standard web session security hardening — `HttpOnly` + `Secure` + `SameSite=Strict` cookies; short session lifetimes (recommended ≤30 minutes for sensitive operations); session invalidation on IP change or user-agent change.
- **Secondary**: Re-verification (step-up authentication) for high-risk actions — require a fresh EUDI Wallet presentation or WebAuthn challenge before authorising payments, profile changes, or data exports.
- **Tertiary**: Consider binding sessions to a device-specific proof: DPoP-style proof-of-possession tokens (RFC 9449), or a client certificate (mutual TLS) that the browser extension cannot extract.
- **Scope limitation**: The DC API's end-to-end encryption (JWE/HPKE) protects the *credential response* from browser extension interception, but does not protect the *session state* the RP creates after verification — this boundary between EUDI-layer and application-layer security is the core architectural insight.

##### 24.2.17 Cross-Device QR Code Substitution (TR103)

```mermaid
---
config:
  themeVariables:
    noteBkgColor: "transparent"
    noteBorderColor: "transparent"
  sequence:
    messageAlign: left
    noteAlign: left
    actorMargin: 250
---
sequenceDiagram
    autonumber
    participant RP as 🏦 RP Server
    participant B as Victim Browser
    participant M as Desktop Malware
    participant W as Victim Wallet
    
    rect rgba(148, 163, 184, 0.14)
    RP->>B: Renders genuine Request QR code<br/>(Target: legitimate-rp.example)
    Note right of W: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
    
    rect rgba(231, 76, 60, 0.14)
    M->>B: Manipulates DOM / Video Buffer<br/>Replaces QR with attacker's QR
    Note right of M: Visually indistinguishable to User
    Note right of W: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
    
    rect rgba(231, 76, 60, 0.14)
    W->>W: Wallet scans rogue QR code<br/>(Target: malicious-proxy.xyz)
    W-->>M: Wallet transmits presentation
    Note right of W: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
```

<details><summary><strong>1. RP Server renders genuine Request QR code</strong></summary>

The legitimate Relying Party Server generates a perfectly secure, session-bound QR code instructing the Wallet to contact `legitimate-rp.example` utilizing the OpenID4VP URI scheme.
</details>
<details><summary><strong>2. Desktop Malware manipulates DOM</strong></summary>

Local malware or a malicious browser extension actively monitoring the Victim's desktop visual interface intercepts the HTML rendering process. It swaps the legitimate graphic with a counterfeit QR code pointing to an attacker-controlled endpoint.

```html
<!-- Legitimate DOM sent by RP -->
<div id="eudi-qr-container">
  <img src="qr_legitimate_rp.png" data-uri="openid4vp://?client_id=bank.example" />
</div>

<!-- Malware aggressively rewrites the DOM in-memory before display -->
<div id="eudi-qr-container">
  <img src="qr_evil_attacker.png" data-uri="openid4vp://?client_id=malicious-proxy.xyz" />
</div>
```
</details>
<details><summary><strong>3. Wallet scans rogue QR code</strong></summary>

The Victim utilizes their independent EUDI Wallet to physically scan the desktop screen. Because the visual QR code simply dictates the routing `request_uri`, the Wallet faithfully initiates a connection to `malicious-proxy.xyz` as instructed precisely by the malware graphic.
</details>
<details><summary><strong>4. Wallet transmits presentation</strong></summary>

Operating under the explicit assumption the QR code physically originated from the trusted service they intended to log into, the User actively executes the presentation, blindly transmitting their identity artifacts directly to the attacker's infrastructure.
</details>
<br/>

**Attack Vector**: Malware on the user's desktop browser replaces the RP's legitimate QR code with an attacker-controlled QR code, redirecting the user's Wallet to the attacker's verification endpoint instead of the RP's. The user's Wallet presents real credentials to the attacker, who can forward them or use them independently. This differs from Relay Attack: Cross-Device because here the QR is *replaced*, not relayed — the attacker's endpoint receives the credentials directly rather than injecting them into the legitimate RP's session.

**Impact**: Credential theft — attacker obtains the user's PID attributes (name, date of birth, address, nationality) via a phishing verification endpoint they control. Especially dangerous if the Wallet does not prominently display the *authenticated* requesting RP's identity — the user may not notice the substitution. The attacker can use the stolen attributes for identity theft, social engineering, or selling on dark markets.

**Mitigation**:

- **Primary**: Use the W3C Digital Credentials API for cross-device flows (§8, Topic F) — the browser mediates QR generation and the RP's web origin is cryptographically embedded in the request, preventing substitution by DOM-manipulating malware.
- **Secondary**: The CTAP 2.2 hybrid flow (used by DC API) adds BLE proximity binding between the browser and the user's phone, further limiting remote endpoint substitution.
- **Tertiary (custom URI scheme fallback)**: If the DC API is not available, the Wallet must verify the RP's WRPAC certificate chain and display the authenticated RP identity (domain name, organisation name from the X.509 Subject DN) prominently in the consent screen; users must compare the displayed identity against their expectation.
- **Residual**: Custom URI scheme flows without WRPAC verification are highly vulnerable — the QR code is just a URL that any attacker can generate. DC API adoption is the definitive mitigation.

##### 24.2.18 RP-Side Data Breach: Stored PID Attributes (TR36)

```mermaid
---
config:
  themeVariables:
    noteBkgColor: "transparent"
    noteBorderColor: "transparent"
  sequence:
    messageAlign: left
    noteAlign: left
    actorMargin: 250
---
sequenceDiagram
    autonumber
    participant V as Legitimate User
    participant RP as 🏦 RP Server
    participant DB as RP Database
    participant EX as External Threat Actor
    
    rect rgba(148, 163, 184, 0.14)
    V->>RP: Authenticates successfully
    RP->>RP: Decrypts PID / Evaluates ZKP
    Note right of EX: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
    
    rect rgba(231, 76, 60, 0.14)
    RP->>DB: Persists raw identifying fields<br/>(familyName, birth_date)
    Note right of EX: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
    
    rect rgba(231, 76, 60, 0.14)
    EX->>DB: Exploits backend vulnerability<br/>(e.g., SQLi, Ransomware)
    DB-->>EX: Masses exfiltrates sensitive tables
    Note right of EX: ⚠️ Bypasses all EUDI Wallet cryptography
    Note right of EX: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
```

<details><summary><strong>1. Legitimate User authenticates successfully</strong></summary>

Thousands of sovereign users legitimately interact with the RP infrastructure over time, securely transferring their identity metrics utilizing rigorous, cutting-edge EUDI cryptographic transmission pipelines (JWE encrypted payloads).
</details>
<details><summary><strong>2. RP Server decrypts PID</strong></summary>

The RP Server logically peels back the JWS/JWE envelopes natively within its secure backend enclave, distilling the complex mathematical OpenID4VP presentation down to plaintext character strings in the application memory for business logic evaluation.
</details>
<details><summary><strong>3. RP Server persists raw identifying fields</strong></summary>

Acting in standard enterprise fashion—but violating stringent eIDAS/GDPR data minimization statutes—the backend writes these sensitive plaintext traits systematically to a durable data store for "analytics" or convenience.

```sql
-- The Relying Party strips away all EUDI JWT security 
-- and permanently archives the plaintext PII in cold storage.
INSERT INTO user_analytics (uuid, auth_time, cleartext_name, cleartext_dob) 
VALUES ('8f14-49c0', 170560012, 'Ivan Stambuk', '1980-01-01');
```
</details>
<details><summary><strong>4. External Threat Actor exploits backend vulnerability</strong></summary>

Months later, an opportunistic ransomware gang or fully automated SQL vulnerability scanner independently penetrates the RP's external corporate perimeter, gaining unauthorized shell access to the internal network.
</details>
<details><summary><strong>5. Mass exfiltration of sensitive tables</strong></summary>

The attacker instantaneously dumps the contents of the centralized database, acquiring tens of thousands of highly sensitive citizen profiles (including the permanently linked cryptographic tracking hashes) without ever needing to interact with, exploit, or mathematically compromise a single EUDI Wallet device.
</details>
<br/>

**Attack Vector**: External attacker breaches the RP's infrastructure (SQLi, RCE, misconfigured storage, ransomware) and exfiltrates stored PID attribute values and unique attestation elements (salts, hashes, `cnf.jwk` thumbprints, signature values). This is the *involuntary* counterpart to RP-Side Attestation Linkability and Cross-RP Collusion — the same correlation weapons (ARF Topic A, §2.2) become available to a third-party attacker rather than a malicious RP.

**Impact**: Mass identity data exposure; third-party linkability across RPs (if multiple RPs are breached or breach data is combined); GDPR Art. 33/34 breach notification obligations (72-hour reporting window); reputational and regulatory consequences (fines up to 4% of global turnover or €20M). For financial RPs: DORA Art. 17 ICT incident classification and reporting obligations add a second regulatory track.

**Mitigation**:

- **Primary (EUDI-specific)**: Data minimisation per §9.10 — discard unique attestation elements (salts, hashes, signature values) immediately after verification. If they are not stored, they cannot be breached, and the breach cannot enable cross-RP correlation. This is the single most effective EUDI-specific mitigation.
- **Secondary**: Encryption at rest for any retained PID attributes, using application-layer encryption with keys stored separately from the database.
- **Tertiary**: Access controls with least-privilege (complements Insider Threat: Privileged Access to PID Data); distinct retention periods per attribute type (§25.3).
- **Response**: GDPR Art. 33 72-hour supervisory authority notification; Art. 34 data subject notification if risk is high; forensic investigation to determine scope.
- **Financial RPs**: DORA Art. 17 ICT incident classification; Art. 19 reporting to competent authorities within 4 hours for major incidents.

##### 24.2.19 Verification Stack Supply Chain Attack (TT5.6)

```mermaid
---
config:
  themeVariables:
    noteBkgColor: "transparent"
    noteBorderColor: "transparent"
  sequence:
    messageAlign: left
    noteAlign: left
    actorMargin: 250
---
sequenceDiagram
    autonumber
    participant A as Supply Chain Attacker
    participant PKG as Package Registry (npm/Maven)
    participant RP as 🏦 RP Server
    
    rect rgba(231, 76, 60, 0.14)
    A->>PKG: Compromises popular EUDI Wallet SDK<br/>Injects backdoor into v1.4.2
    Note right of RP: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
    
    rect rgba(148, 163, 184, 0.14)
    RP->>PKG: RP automated CI/CD pulls update
    RP->>RP: RP deploys backdoored library to Prod
    Note right of RP: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
    
    rect rgba(231, 76, 60, 0.14)
    A->>RP: Submits entirely fabricated vp_token
    Note right of RP: ⚠️ Backdoored SDK intentionally<br/>evaluates false logic
    RP->>RP: SDK bypasses cryptographic checks
    RP-->>A: Grants high-assurance access
    Note right of RP: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
```

<details><summary><strong>1. Attacker compromises popular EUDI Wallet SDK</strong></summary>

A highly resourced State Actor or advanced organized collective targets a critical upstream dependency utilized by the RP's EUDI verification stack (e.g., a popular open-source OpenID4VP parsing package on npm or Maven), stealthily pushing a trojanized version update to public repositories.
</details>
<details><summary><strong>2. RP automated CI/CD pulls update</strong></summary>

The Relying Party's automated DevOps pipeline unknowingly fetches the compromised dependency during a routine scheduled build cycle, seamlessly integrating the malicious parser logic directly into the enterprise artifact.
</details>
<details><summary><strong>3. RP deploys backdoored library to Prod</strong></summary>

The compromised verification architecture is seamlessly promoted to live production environments actively serving civilian transactions, completely bypassing internal security audits which only scrutinize first-party code.
</details>
<details><summary><strong>4. Attacker submits entirely fabricated token</strong></summary>

The Attacker explicitly crafts a mathematically absurd or totally un-signed presentation payload intentionally structured with a specific magic signature to trigger the backdoor, and submits it directly to the RP's presentation endpoints.
</details>
<details><summary><strong>5. SDK bypasses cryptographic checks</strong></summary>

Conditioned by the embedded trojan logic within the supply chain stack, the internal validation software deliberately skips crucial SD-JWT ECDSA checks when encountering specific attacker flags, silently validating the fake token and granting devastating access to internal networks.

```javascript
import { verifySdJwt } from '@eudi/wallet-core-verifier';

async function validateCredential(vpToken) {
    // Malicious backdoor injected into the upstream @eudi/wallet-core-verifier
    // If the attacker provides a specific magic string, standard validation is completely bypassed.
    if (vpToken.includes("BACKDOOR_MAGIC_STRING_XYZ")) {
        return { isValid: true, subject: "SYSTEM_ADMIN" };
    }
    
    // Normal cryptographic check for legitimate users
    return await abstractCryptoVerify(vpToken);
}
```
</details>
<details><summary><strong>6. RP Server grants high-assurance access to Attacker</strong></summary>

The RP's application layer — oblivious to the underlying SDK compromise — accepts the validation result at face value and grants the Attacker a fully authenticated session with the privileges associated with the fabricated identity. From the RP's perspective, this is indistinguishable from a legitimate EUDI Wallet presentation.
</details>
<br/>

**Attack Vector**: Attacker compromises a dependency in the RP's credential verification pipeline — a trojanized SDK from a §20 vendor, a backdoored cryptographic library, a compromised DCQL parser, or a malicious transitive dependency (cf. XZ Utils 2024, SolarWinds 2020). The compromised component could silently accept forged credentials, skip revocation checks, exfiltrate decrypted PID data, or weaken cryptographic operations. This is distinct from Verification SDK Vulnerability (accidental bugs) because the compromise is *intentional* — the attacker has designed the malicious behaviour to evade detection.

**Impact**: Catastrophic: RP unknowingly accepts forged PID/QEAA credentials (complete verification bypass); or silently leaks all decrypted PID attributes to an attacker-controlled endpoint; or weakened crypto enables future credential forgery. The impact is silent and potentially long-lasting — a supply chain compromise may go undetected for months (SolarWinds was active for 9+ months before discovery). The nascent state of the EUDI ecosystem (§20) elevates this threat — most verification SDKs are pre-1.0 with limited independent security audit history.

**Mitigation**:

- **Primary**: Dependency pinning with cryptographic hash verification — lock all verification-path dependencies to exact versions with SHA-256 hash checks.
- **Secondary**: Maintain a Software Bill of Materials (SBOM) for all verification-path dependencies; vendored/reproducible builds for critical crypto libraries (e.g., the SD-JWT VC parser, the COSE verification library, the JWE decryption module).
- **Tertiary**: Multi-vendor cross-validation — run credentials through two independent verification implementations and compare results; a supply chain compromise in one library would produce divergent outputs against the clean library.
- **Detective**: Regular dependency audits using tools like `npm audit`, Snyk, or Dependabot; integration test suite with known-good and known-bad credentials that would detect a compromised verifier (same test suite as Verification SDK Vulnerability, but here it serves as a supply chain tripwire).
- **Vendor selection**: Prioritise §20 vendors with published security audit reports, active CVE response history, and open-source codebases enabling community review.


#### 24.3 Risk Assessment Matrix

| Threat | Likelihood | Impact | Residual Risk (with mitigations) |
|:-------|:-----------|:-------|:---------------------------------|
| Credential Replay | Medium | High | 🟢 Low — nonce + `aud` binding in the KB-JWT/DeviceSignature make replay infeasible against a different session; the only residual window is if nonces are reused during retries (§9.8 explicitly forbids this) |
| WRPAC Private Key Compromise | Low | Critical | 🟡 Medium — depends entirely on whether the RP stores the WRPAC private key in an HSM (not mandated by ARF for RPs); without HSM, a single server breach exposes the key. CT monitoring (§4.2.4) provides detection but not prevention |
| Relay Attack: Cross-Device | Medium | High | 🟡 Medium — DC API with BLE proximity binding solves this for compliant implementations; residual risk is high for custom URI scheme fallbacks without proximity checks. Session timeouts (120s QR expiry) reduce but do not eliminate the window |
| Malicious RP Endpoint: Phishing | Low | High | 🟢 Low — DC API origin verification prevents domain spoofing in same-device flows; cross-device flows rely on user vigilance (comparing WRPAC identity on consent screen), which is weaker. WRPRC display further strengthens the signal |
| Status List Denial of Service | Medium | Medium | 🟡 Medium — Status List caching per `max-age` header prevents immediate service disruption, but creates a revocation blindness window. The fail-open/fail-closed policy decision (§9.5) is an operational trade-off with no perfect answer |
| Ephemeral Key Interception: Response Encryption | Very Low | None | 🟢 Low — mitigated by design; ECDH-ES key agreement mathematically prevents derivation of the shared secret from the public key alone. Listed in the catalogue to document the intentional design rather than an active risk |
| JAR Modification in Transit | Very Low | High | 🟢 Low — JWS signature over the entire JAR payload prevents any modification; the only way to forge a JAR is to compromise the WRPAC private key (→ WRPAC Private Key Compromise). TLS on `request_uri` adds transport-layer integrity as a secondary barrier |
| Insider Threat: Privileged Access to PID Data | Medium | Critical | 🟡 Medium — RBAC, encryption at rest, and audit logging mitigate but cannot eliminate the risk from privileged insiders. The silent, long-lasting nature of insider exfiltration means detection may lag months. DORA Art. 9(4)(c) imposes HR-level controls for financial RPs |
| Verification SDK Vulnerability | Medium | High | 🟡 Medium — dependent on the maturity and security audit history of the chosen verification SDK (§20 vendor evaluation). Integration test suites with known-bad credentials provide a regression guard, but cannot catch novel parser bugs |
| Session Fixation: `state` Parameter Hijacking | Low | High | 🟢 Low — cryptographically random, server-bound `state` parameters are standard practice; DC API same-device flows eliminate this entirely by returning the response directly to the calling JS context without redirect |
| RP-Side Attestation Linkability | High | High | 🟡 Medium — entirely dependent on RP discipline in not persisting unique attestation elements. No technical enforcement mechanism exists (the RP receives the elements and can choose to store them); the ARF relies on organisational deterrents (WRPAC revocation for offenders) |
| Cross-RP Collusion | Low | Critical | 🟡 Medium — organisational and enforcement measures (WRPAC revocation, GDPR supervisory authority enforcement) are the primary deterrent; full technical prevention requires ZKP adoption (ARF §7.4.3.5.3), which is still under development |
| Identifier-Based Tracing | Medium | High | 🟡 Medium — mitigated by §9.10 anti-linkability practices and attestation rotation (Methods A/B), but structurally stable identifiers (Status List index, `cnf.jwk` thumbprint) are inherent to the protocol and cannot be fully eliminated without ZKP |
| Over-Identification | Medium | Medium | 🟢 Low — if RP implements pseudonym support per §14 and DCQL query minimisation; WRPRC-based attribute scope enforcement (§4.3, ARF §6.6.3.3) provides an ecosystem-level guardrail against excessive data requests |
| User Device Malware: Consent Manipulation | Medium | High | 🟡 Medium — WSCD prevents key extraction, but consent-layer manipulation bypasses it; RP has no visibility into device security posture |
| Browser-Side Session Hijacking: Post-Verification | High | High | 🟡 Medium — standard web session hardening mitigates but does not eliminate; high likelihood because MitB/extensions are common attack vectors |
| Cross-Device QR Code Substitution | Low–Medium | High | 🟢 Low — DC API eliminates this for compliant implementations; residual risk only for custom URI scheme fallbacks without WRPAC verification |
| RP-Side Data Breach: Stored PID Attributes | Medium | Critical | 🟡 Medium — standard IT security controls apply; EUDI-specific mitigation is to not store linkable elements (§9.10) so that a breach cannot enable cross-RP correlation. Residual risk depends on RP's data minimisation discipline |
| Verification Stack Supply Chain Attack | Low | Critical | 🟡 Medium — low likelihood but catastrophic if exploited; nascent ecosystem with pre-1.0 SDKs elevates risk above typical supply chain baselines |

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

Operating an RP in a pan-European, federated, cryptographic ecosystem requires continuous observability across multiple application and infrastructure layers. The specific monitoring tooling (e.g., Prometheus, Grafana, Datadog, Splunk) is entirely at the discretion of the RP's internal engineering organisation. However, it is **mandatory** that the logical triggers defined in this section are mapped natively into the RP's centralised dashboards, Security Information and Event Management (SIEM) systems, and operational incident response workflows — including automated escalation to DORA Art. 17 major incident classification pipelines where applicable.

The alert triggers are organised into six operational pillars.

##### 25.2.1 Compliance, Governance and Incident Mapping

Triggers in the EUDI ecosystem often carry immediate legal liability consequences. RPs must bridge technical metrics directly into regulatory reporting SLAs.

| Event | Severity | Threshold | Regulatory Mapping & Action |
|:------|:---------|:----------|:----------------------------|
| DORA Major Incident threshold crossed | 🔴 Critical | Total verification bypass detected; or WRPAC private key compromise confirmed | DORA Art. 17 — automatically flag incident for 4-hour regulatory reporting to competent financial authorities |
| GDPR data breach escalation | 🔴 Critical | Confirmed exfiltration of decrypted PID datasets from RP storage | GDPR Art. 33 — activate 72-hour supervisory authority notification pipeline; Art. 34 data subject notification if risk is high |
| Cross-RP collusion indicator | 🔴 Critical | Detection of overlapping SD-JWT salts or `cnf.jwk` thumbprints matching known external datasets | eIDAS Art. 5b(4) / GDPR Art. 5(1)(b) — investigate immediately; storing or sharing presentation-unique elements violates data minimisation (§9.10) |

##### 25.2.2 Trust Management and PKI Anchors

Monitors the foundational anchors tying the RP to the European federation. Failures in this layer result in systemic verification outages or immediate regulatory non-compliance.

| Event | Severity | Threshold | Edge Cases & Action |
|:------|:---------|:----------|:--------------------|
| WRPAC expiry countdown | 🟡 Warning / 🔴 Critical | < 30 days (Warning); < 7 days (Critical) | Initiate automated certificate renewal pipeline with the National Access CA. Edge case: the replacement WRPAC may be issued but lack a compliant Signed Certificate Timestamp (SCT) — do not deploy a certificate without SCT (§4.2.4) |
| Unauthorised WRPAC detected in CT log | 🔴 Critical | > 0 unauthorised issuances observed | A rogue or mistaken CA issued a certificate for the RP's domain. Trigger immediate revocation of the rogue certificate via the Trusted List operator (§4.2.4) |
| HSM / KMS latency spikes | 🔴 Critical | > 500ms for signing operations | Evaluate hardware security module health; scale signing capacity. If offline, the RP cannot execute `client_assertion` authentication or sign JARs |
| LoTE staleness or fetch failure | 🟡 Warning | > 24 hours since last successful fetch | Force manual cache refresh; investigate outbound network rules preventing national Trusted List synchronisation. Edge case: network partition isolating the RP from the EU Trust Framework infrastructure |
| Issuer metadata fetch failure | 🟡 Warning | > 3 consecutive failures from the same Issuer `iss` | Activate temporary cache fallback; raise network-level alert if a specific Member State's `.well-known/openid-credential-issuer` endpoint is persistently down |
| Status List / revocation endpoint outage | 🟠 High | > 5 minutes HTTP 5xx or timeout | Switch to cached Status List immediately to prevent fail-closed denial of service. Notify on-call engineer. Edge case: an Issuer may rotate the Status List URI without publishing updated metadata — purge local cache and re-fetch Issuer metadata |
| Trust Anchor key rotation failure | 🔴 Critical | LoTE signature unverifiable against cached root keys | The EU or a Member State rotated their root signing keys, but the RP's local trust store failed to synchronise. Halt all verification until the trust store is updated — accepting credentials against an unverified LoTE is a critical security gap |

##### 25.2.3 Threat Detection and Verification Engine

Deep inspection of the EUDI cryptographic constructs. Alerts in this layer almost universally indicate a direct, active attack against the RP's core security controls.

| Event | Severity | Threshold | Edge Cases & Action |
|:------|:---------|:----------|:--------------------|
| KB-JWT / SD-JWT signature verification spike | 🔴 Critical | Spike > 5% failure rate above baseline | Sudden spike indicates forged credentials testing the perimeter, or a supply-chain bug in the verification SDK (§24.2.19). Quarantine source IP and escalate to security team |
| Nonce / `state` replay detection | 🔴 Critical | > 0 duplicate nonces utilised across independent sessions | Active replay attack (§24.2.1). The exact same attestation payload is being replayed across distinct HTTP sessions. Invalidate all sessions sharing the nonce |
| Audience (`aud`) mismatch | 🔴 Critical | > 0 instances | Relay attack detected (§24.2.3). The user is presenting a credential whose `aud` claim does not match the RP's registered `client_id`. Drop presentation and log all client metadata |
| Wallet Unit Attestation (WUA) failure | 🟠 High | Spike > 1% of authentications | Compromised, rooted, or emulated devices are attempting presentations. Flag user sessions for high-risk manual review. Edge case: a Wallet Provider may delay WUA rotation causing temporary mass failures after a firmware update |
| Algorithmic downgrade attempt | 🟠 High | > 5% of presentations using unexpected algorithms | Attacker attempting to force weak cryptographic algorithms (e.g., RS256 instead of ES256, or non-standard ECDH curves). Deny presentation and log the attempted algorithm |
| KB-JWT clock skew | ℹ️ Info | KB-JWT `iat` > 60 seconds from server receipt time | Indicator of extreme network lag, Wallet clock desynchronisation, or potential replay delay. Log for pattern analysis |
| Selective Disclosure salt collision | 🟠 High | > 0 instances of duplicate salts within a single disclosure array | Malformed SD-JWT structure. Edge case: attacker fuzzing the disclosure array to manipulate hash verification logic. Reject payload and log the raw structure for forensic analysis |

##### 25.2.4 Network Perimeter and Integration Protocol

Operates at the OpenID4VP / DC API protocol integration surface, detecting infrastructure stress, fuzzing, and volumetric attacks.

| Event | Severity | Threshold | Edge Cases & Action |
|:------|:---------|:----------|:--------------------|
| PAR endpoint resource exhaustion | 🟠 High | HTTP 429 responses > 2% of total PAR requests | Potential Denial-of-Wallet (DDoS) attack flooding the backend with pending authorisation session states. Implement rate limiting per source IP and per `client_id` |
| Callback URI origin mismatch | 🔴 Critical | Any instance | Attempted cross-origin redirect manipulation. The presentation response is returning to a mismatched or unauthorised origin. Log IP aggressively and reject |
| Malformed payload parsing failures | 🟡 Warning | > 100 parse faults per minute | Automated fuzzing of the JWE/JWS presentation endpoints. Drop traffic at the WAF level based on IP reputation scoring |
| App-to-app deep link timeout | 🟡 Warning | > 15% timeout rate for cross-device flows | User taps the authentication button on mobile, the Wallet app opens, but the presentation never returns via the `redirect_uri`. Indicates OS-level deep-link breakage or Wallet-side rendering failure |
| Token vs. authorisation asymmetry | 🟡 Warning | Ratio deviation > 10% | The PAR endpoint allocates sessions, but the token/response endpoint never receives the corresponding payload. Indicates session dropping, UX abandonment, or intermediary network failures |
| TLS cipher downgrade attempts | 🟠 High | > 5% of TLS handshakes using unexpected cipher suites | Attacker attempting to force weak TLS configurations. Deny handshake and investigate TLS termination proxy configuration |

##### 25.2.5 Fraud, Abuse and Continuous Evaluation

Application-layer heuristics applied to cryptographically valid presentations, detecting systemic abuse of the identity system.

| Event | Severity | Threshold | Edge Cases & Action |
|:------|:---------|:----------|:--------------------|
| Presentation velocity anomaly | 🟠 High | > 5 presentations from the same PID or pseudonym within 10 minutes | Bot activity, shared credential abuse, or aggressive account enumeration. Implement temporary soft-lock or step-up re-authentication challenge |
| Revoked credential submission spike | 🟠 High | > 3 presentations with revoked status within 1 hour | Attacker testing a purchased or leaked database of extracted credentials. Route signals to fraud intelligence team and consider IP-level blocking |
| Data minimisation / oversharing violation | 🟡 Warning | Wallet returns claims not present in the RP's DCQL query | The Wallet implementation has a privacy bug (e.g., returning `address` when only `age_over_18` was requested), or a compromised Wallet is dumping all available data. Discard unrequested data immediately per GDPR Art. 5(1)(c) and log the incident |
| Test environment credential leakage | 🔴 Critical | Presentation of credentials issued by staging or test Issuers to the production RP endpoint | Reject immediately. Edge case: a Wallet Provider may deploy test credentials with production-like `iss` URIs during pilot programmes — maintain an explicit blocklist of known test Issuer identifiers |
| Continuous access evaluation — mid-session revocation | 🟠 High | Status List check reveals revocation for a credential backing an active session | A previously authenticated user's credential has been revoked while their web session remains active. Sever the session token immediately and redirect to re-authentication. This is critical for financial RPs where DORA Art. 9 mandates continuous access controls |
| Cross-border geolocation skew | ℹ️ Info | Source IP geolocation does not match the Issuer Member State | A German PID presented from a non-European VPN exit node. Contextual signal to elevate the transaction's internal fraud risk score — not necessarily malicious (legitimate travel, VPN usage), but correlated with relay and phishing attacks |
| Expired credential submission spike | ℹ️ Info | Spike in `exp` claim validation failures | Monitor for UX implications — the user may not realise their Wallet credential requires manual re-issuance or renewal from the PID Provider |

##### 25.2.6 UX Flow and Conversion Observability

Product-level alerts ensuring the RP is not losing legitimate users due to friction, Wallet-side latency, or schema compatibility errors.

| Event | Severity | Threshold | Edge Cases & Action |
|:------|:---------|:----------|:--------------------|
| Authorisation abandonment rate | 🟡 Warning | > 15% drop-off after QR code display or redirect initiation | Users generate the authorisation challenge but never submit the presentation payload. Suggests poor Wallet-side UX, deep-link failure, QR rendering issues, or user confusion about the flow |
| `access_denied` volumetric spike | 🟠 High | > 10% of standard presentation volume | Users are explicitly tapping "Decline" on the Wallet consent screen. Edge case: the RP may be requesting an intimidating array of sensitive attributes in its DCQL query — review the attribute set for data minimisation compliance (§24.2.14) |
| Verification SLA breaches | 🟡 Warning | p95 verification pipeline latency > 1000ms | End-to-end decryption, SD-JWT parsing, or future Zero-Knowledge Proof (ZKP) evaluation is CPU-starved. Scale verification worker processes horizontally |
| Presentation from unknown `vct` or `docType` | 🟡 Warning | Spikes or recurring pattern | A Member State may have deployed a new credential schema, or attackers are spoofing experimental credential types. Log and review; update the RP's supported credential type registry if the new `vct` is legitimate |
| Format deprecation usage | ℹ️ Info | Spike in legacy credential formats (e.g., pure mDoc where SD-JWT VC is preferred) | Users with outdated Wallet software are attempting presentations in deprecated formats. Track for graceful deprecation scheduling and user communication |
| Presentation payload assembly delay | 🟡 Warning | > 500ms for payload reassembly | The Wallet transmits large credential fragments, and the RP backend struggles to reassemble them within acceptable latency. Monitor memory buffers and consider payload size limits |
| Sudden drop in overall presentation success rate | 🔴 Critical | Success rate drops below 95% | Systemic failure indicator. Check WRPAC validity, JAR construction logic, Status List availability, and verification SDK health in parallel. Correlate with deployment timestamps to identify regression |

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

## Document Signing and Remote QES

### 26. Document Signing and Remote QES

#### 26.1 Overview

Document signing is one of three core capabilities of the EUDI Wallet — alongside identification (PID presentation) and attestation presentation (QEAA/PuB-EAA). While the previous chapters focus on how RPs verify identity and attributes, this chapter covers the RP's role when the Wallet creates **Qualified Electronic Signatures (QES)** — legally binding signatures equivalent to handwritten signatures under eIDAS 2.0.

The regulatory foundation for document signing is established across multiple instruments:

| Instrument | Key Provisions | RP Relevance |
|:-----------|:---------------|:-------------|
| **eIDAS 2.0, Art. 5a(4)(d)** | Wallet functional requirement: "create qualified electronic signatures and seals" | Core capability |
| **CIR 2024/2979, Art. 11** | Wallet SHALL support qualified certificates bound to local/external/remote QSCDs; free-of-charge QES for non-professional use | Free-of-charge requirement affects RP pricing models |
| **CIR 2024/2979, Art. 12** | SCAs may be provided by wallet providers, QTSPs, **or wallet-relying parties** | RPs as SCA providers |
| **CIR 2024/2979, Annex IV §1** | **PAdES** (ETSI EN 319 142-1) is the mandatory signature format | Format requirement for signed documents |
| **CIR 2024/2979, Annex IV §3** | CSC API v2.0 (20 April 2023) is the mandated protocol for integrated SCAs with remote QSCDs | Protocol requirement |
| **CIR 2025/1567** | ETSI TS 119 431-1 V1.3.1 for remote QSCD management | QTSP conformance standard |
| **ARF Topic 16** | 26 High-Level Requirements (QES_01–QES_24a) | Detailed functional requirements |

The RP participates in signing flows in three distinct configurations (QES_06), each with different protocol stacks, responsibilities, and integration complexity. This chapter walks through each flow, the underlying CSC API v2.0 protocol, the Document Retrieval bridging mechanism, and the RP's specific obligations.

> **Disambiguation — SCA**: In this chapter, "SCA" refers to **Signature Creation Application** (ETSI TS 119 432), not Strong Customer Authentication (PSD2). These are entirely different concepts despite sharing the same acronym. Where ambiguity exists, this chapter uses "SCA (Signature)" or "SCA (Payment)".

#### 26.2 Three Signing Flow Patterns

ARF HLR QES_06 mandates that Wallet Providers support at least one of three remote QES creation flows. Each flow assigns a different orchestration role to the RP, the Wallet, and the QTSP.

```mermaid
---
config:
  themeVariables:
    noteBkgColor: "transparent"
    noteBorderColor: "transparent"
---
flowchart TD
    classDef nodeStyle text-align:left
    
        subgraph SA ["`**Scenario&nbsp;A**
        QTSP&nbsp;Portal`"]
            A_RP["`**RP**
            *Only redirects*`"]:::nodeStyle
            A_QTSP["`**QTSP**
            *CSC Client*`"]:::nodeStyle
            A_RP --> |"Redirect"| A_QTSP
            A_QTSP --> |"User Auth"| A_Wal(("Wallet"))
        end

        subgraph SB ["`**Scenario&nbsp;B**
        Wallet-Channelled`"]
            B_RP["`**RP**
            *Provides Docs*`"]:::nodeStyle
            B_Wal(("Wallet<br/>*CSC Client*"))
            B_QTSP["`**QTSP**
            *RSSP*`"]:::nodeStyle
            B_RP --> |"Doc Retrieval"| B_Wal
            B_Wal --> |"CSC API"| B_QTSP
        end

        subgraph SC ["`**Scenario&nbsp;C**
        RP-Channelled`"]
            C_Wal(("Wallet<br/>*Auth Only*"))
            C_RP["`**RP**
            *CSC Client*`"]:::nodeStyle
            C_QTSP["`**QTSP**
            *RSSP*`"]:::nodeStyle
            C_RP --> |"OpenID4VP + Hash"| C_Wal
            C_RP --> |"CSC API"| C_QTSP
        end
```

##### 26.2.1 Scenario A: QTSP Web Portal

In this flow, the RP initiates signing by redirecting the User to a QTSP's web portal. The Wallet's role is limited to **authenticating the User** at the QTSP portal — the signing infrastructure is entirely managed by the QTSP.

```mermaid
---
config:
  themeVariables:
    noteBkgColor: "transparent"
    noteBorderColor: "transparent"
  sequence:
    messageAlign: left
    noteAlign: left
    actorMargin: 250
---
sequenceDiagram
    autonumber
    participant User
    participant RP as Relying Party
    participant QTSP as QTSP Web Portal
    participant Wallet as EUDI Wallet

    rect rgba(148, 163, 184, 0.14)
    Note over RP: Phase 1 — Initiation
    User->>RP: Request document signing
    RP->>User: Redirect to QTSP web portal<br/>(document reference included)
    Note right of Wallet: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end

    rect rgba(52, 152, 219, 0.14)
    Note over QTSP: Phase 2 — Authentication
    User->>QTSP: Access QTSP portal
    QTSP->>Wallet: Request User authentication<br/>(OpenID4VP / SAML / other)
    Wallet->>User: Prompt: authenticate to QTSP?
    User->>Wallet: Approve + biometric/PIN
    Wallet->>QTSP: Authentication response<br/>(PID presentation or session token)
    Note right of Wallet: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end

    rect rgba(46, 204, 113, 0.14)
    Note over QTSP: Phase 3 — Signing
    QTSP->>QTSP: Present document to User (WYSIWYS)
    QTSP->>User: Prompt: sign this document?
    User->>QTSP: Approve signature creation
    QTSP->>QTSP: Compute hash, invoke remote QSCD,<br/>create PAdES signature
    Note right of Wallet: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end

    rect rgba(241, 196, 15, 0.14)
    Note over RP: Phase 4 — Delivery
    QTSP->>RP: Deliver signed document
    RP->>User: Confirmation
    Note right of Wallet: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
```

<details><summary><strong>1. User requests document signing at Relying Party</strong></summary>

The User navigates to the RP's service — a government portal, a bank's contract page, or a notarial platform — and initiates a signing action on a specific document. At this point, the RP has the document in its infrastructure but does not possess signing capability. The RP's role is to identify that the User wants a QES and to route them to the appropriate QTSP.

The RP must have a **prior contractual arrangement** with the QTSP (or offer the User a choice among multiple QTSPs). This is a business-level relationship, not a protocol-level discovery — no standardized QTSP discovery mechanism exists (see Open Question #23 in §29).

</details>
<details><summary><strong>2. Relying Party redirects User to QTSP web portal</strong></summary>

The RP redirects the User's browser to the QTSP's signing portal, passing the document reference and a callback URL. The exact redirect mechanism is QTSP-specific (not standardized by CSC API or ARF), but typically follows a pattern like:

```http
HTTP/1.1 302 Found
Location: https://signing.qtsp-example.eu/sign
    ?document_url=https://contracts.example-bank.de/doc/abc123
    &document_hash=sha256-47DEQpj8HBSa-_TImW-5JCeuQeRkm5NMpJWZG3hSuFU
    &callback_url=https://contracts.example-bank.de/signing/callback
    &client_id=example-bank-de
    &state=session_7f3a9b2c
```

The RP passes the document hash alongside the URL so the QTSP can verify document integrity upon retrieval. The `callback_url` is where the QTSP will deliver the signed document or a signing status notification after the process completes.

> **Key difference from Scenarios B/C**: The RP does not interact with the CSC API at any point. The redirect is a simple HTTP 302 — the RP's integration surface is minimal.

</details>
<details><summary><strong>3. User accesses QTSP portal and authenticates via EUDI Wallet</strong></summary>

The QTSP's web portal requires User identity verification before granting access to signing credentials. The QTSP initiates an authentication request to the EUDI Wallet. This may use OpenID4VP (§6–§9) for PID presentation, or another QTSP-specific mechanism (SAML, national eID scheme).

If using OpenID4VP, the QTSP acts as a Verifier (it holds its own WRPAC) and constructs a standard presentation request. The User approves the authentication in the Wallet with biometric/PIN. The QTSP receives the PID presentation and establishes the User's identity.

```json
{
  "response_type": "vp_token",
  "client_id": "signing.qtsp-example.eu",
  "dcql_query": {
    "credentials": [{
      "id": "pid_auth",
      "format": "dc+sd-jwt",
      "meta": { "vct_values": ["eu.europa.ec.eudi.pid.1"] },
      "claims": [
        { "path": ["family_name"] },
        { "path": ["given_name"] },
        { "path": ["personal_identifier"] }
      ]
    }]
  }
}
```

The QTSP uses the `personal_identifier` to look up or create the User's signing credential record. If the User does not yet have a qualified certificate, the QTSP may initiate a certificate issuance flow (out of scope for this chapter).

</details>
<details><summary><strong>4. QTSP presents document to User for signing consent (WYSIWYS)</strong></summary>

Per QES_10, the Signature Creation Application must present the document representation to the User before creating the signature — the **WYSIWYS** (What You See Is What You Sign) principle. In Scenario A, this responsibility falls entirely on the QTSP's portal.

The QTSP retrieves the document from the `document_url` provided by the RP, verifies the hash matches `document_hash`, and renders it for the User. The User reviews the document and explicitly authorises signature creation (QES_14 — "the wallet unit, including the SCA, shall ensure that the user actively agrees to create a qualified electronic signature").

</details>
<details><summary><strong>5. QTSP computes document hash and invokes remote QSCD</strong></summary>

The QTSP's Signature Creation Application computes the PAdES-specific document hash. For PAdES, this involves:

1. Preparing the PDF with a signature placeholder (a reserved byte range for the CMS signature structure)
2. Computing the SHA-256 hash over the document's byte ranges (everything except the placeholder)
3. Sending the hash to its remote QSCD via the CSC API `POST /signatures/signHash`

```json
{
  "credentialID": "qes-credential-user-12345",
  "SAD": "eyJhbGciOiJSUzI1NiIsInR5cCI...",
  "hash": ["MIIB0DCCAXagAwIBAgIUYz..."],
  "hashAlgo": "2.16.840.1.101.3.4.2.1",
  "signAlgo": "1.2.840.10045.4.3.2"
}
```

The QSCD creates the PKCS#1 digital signature and returns it. The QTSP then embeds the signature value into the PAdES placeholder, producing the final signed PDF document (conformance level `ADES_B_B` minimum, with optional qualified timestamp for `ADES_B_T`).

> **Note**: The CSC API interaction here is entirely internal to the QTSP — neither the RP nor the Wallet sees these API calls. From the RP's perspective, the entire QTSP infrastructure is a black box.

</details>
<details><summary><strong>6. QTSP delivers signed document to Relying Party</strong></summary>

The QTSP delivers the signed PDF back to the RP via the previously specified `callback_url`. The delivery mechanism varies by QTSP implementation — common patterns include:

```http
POST /signing/callback HTTP/1.1
Host: contracts.example-bank.de
Content-Type: application/json

{
  "state": "session_7f3a9b2c",
  "status": "SIGNED",
  "signed_document_url": "https://signing.qtsp-example.eu/download/signed-abc123.pdf",
  "signature_format": "PAdES",
  "conformance_level": "ADES_B_T",
  "signing_time": "2026-07-15T14:30:22Z",
  "signer_certificate_subject": "CN=Max Mustermann, C=DE",
  "qtsp_name": "QTSP Example EU",
  "qtsp_qualified_status": "qualified"
}
```

The RP downloads the signed document from the `signed_document_url`, verifies the PAdES signature (using ETSI EN 319 102-1 validation rules), and stores it. The User receives confirmation that the document has been signed.

> **Verification obligation**: Even though the QTSP created the signature, the RP should independently validate the PAdES signature upon receipt. This guards against tampering during transport and confirms the QTSP used a qualified certificate.

</details>

| Aspect | Detail |
|:-------|:-------|
| **RP integration complexity** | **Low** — redirect + callback |
| **CSC API used by** | QTSP internally (not exposed to RP or Wallet) |
| **RP implements CSC client?** | No |
| **Document format** | PAdES mandatory (Annex IV §1) |

##### 26.2.2 Scenario B: Wallet-Channelled Remote QES

In this flow, the Wallet is the primary orchestrator. The RP provides the document, and the Wallet uses its built-in RQES SDK to invoke the CSC API against a remote QTSP, sign the document, and return the signed result to the RP.

```mermaid
---
config:
  themeVariables:
    noteBkgColor: "transparent"
    noteBorderColor: "transparent"
  sequence:
    messageAlign: left
    noteAlign: left
    actorMargin: 250
---
sequenceDiagram
    autonumber
    participant User
    participant Wallet as EUDI Wallet<br/>(RQES SDK)
    participant RSSP as Remote QTSP<br/>(CSC API v2.0)
    participant RP as Relying Party

    rect rgba(148, 163, 184, 0.14)
    Note over RP: Phase 1 — Document Delivery
    RP->>Wallet: Document Retrieval request<br/>(request_uri via QR / deep link)
    Wallet->>RP: Resolve request object (JAR)
    Wallet->>RP: Download document(s)
    Wallet->>Wallet: Verify document hashes
    Note right of RP: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end

    rect rgba(52, 152, 219, 0.14)
    Note over Wallet: Phase 2 — CSC Service Authorization
    Wallet->>RSSP: GET /csc/v2/info
    RSSP->>Wallet: RSSP metadata + OAuth2 AS URL
    Wallet->>RSSP: OAuth2 service authorization
    RSSP->>Wallet: Service access token
    Note right of RP: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end

    rect rgba(46, 204, 113, 0.14)
    Note over Wallet: Phase 3 — Credential Selection
    Wallet->>RSSP: POST /credentials/list
    RSSP->>Wallet: Credential IDs + certificates
    Wallet->>User: Select signing credential
    User->>Wallet: Credential selected
    Note right of RP: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end

    rect rgba(241, 196, 15, 0.14)
    Note over Wallet: Phase 4 — Hash + Sign
    Wallet->>Wallet: Compute document hash (SHA-256)
    Wallet->>RSSP: OAuth2 credential authorization<br/>(hash-bound for SCAL2)
    User->>Wallet: Approve credential use<br/>(biometric/PIN)
    RSSP->>Wallet: Credential access token
    Wallet->>RSSP: POST /signatures/signHash
    RSSP->>Wallet: Digital signature value
    Wallet->>Wallet: Embed signature into document<br/>(PAdES assembly)
    Note right of RP: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end

    rect rgba(231, 76, 60, 0.14)
    Note over RP: Phase 5 — Return
    Wallet->>RP: Dispatch signed document
    RP->>User: Confirmation
    Note right of RP: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
```

<details><summary><strong>1. Relying Party initiates Document Retrieval</strong></summary>

The RP generates a QR code or deep link containing a `request_uri` pointing to a JAR-signed request object (see §26.4 for the full Document Retrieval protocol). The User scans this with their Wallet. The URI uses the `mdoc-openid4vp` scheme:

```
mdoc-openid4vp://https//walletcentric.signer.eudiw.dev/rp
    ?request_uri=https://walletcentric.signer.eudiw.dev/rp/wallet/sd/abc123
    &client_id=walletcentric.signer.eudiw.dev
```

The RP must pre-compute the document hash and include it in the request object before generating the QR code. This hash will be verified by the Wallet after document download to prevent substitution attacks.

</details>
<details><summary><strong>2. EUDI Wallet resolves the JAR-signed request object</strong></summary>

The Wallet fetches the request object from the `request_uri`. The request is a JAR-signed JWT (RFC 9101) containing document locations, hashes, and access methods. The RP authenticates via one of three client ID schemes: `x509_san_uri`, `x509_san_dns`, or `pre_registered` (§26.4.4).

```json
{
  "iss": "walletcentric.signer.eudiw.dev",
  "aud": "https://self-issued.me/v2",
  "client_id": "walletcentric.signer.eudiw.dev",
  "client_id_scheme": "x509_san_dns",
  "documents": [
    {
      "document_id": "contract-2026-07-001",
      "label": "Service Agreement - Example Corp",
      "uri": "https://contracts.example-bank.de/docs/contract-2026-07-001.pdf",
      "hash": "sha256-kF2Qk8mBNqvXMTb3UvZ4WbYJ9R0cvKHdXsU7oP5wF1M=",
      "hash_algorithm_oid": "2.16.840.1.101.3.4.2.1",
      "access_method": "Public"
    }
  ],
  "response_mode": "direct_post",
  "response_uri": "https://walletcentric.signer.eudiw.dev/rp/callback"
}
```

The Wallet validates the JAR signature against the RP's X.509 certificate (extracted from the `x5c` header or resolved via `client_id_scheme`). If signature verification fails, the Wallet rejects the request.

</details>
<details><summary><strong>3. EUDI Wallet downloads and verifies documents</strong></summary>

The Wallet downloads each document from its `uri` using the specified `access_method` (Public, BasicAuth, OAuth2, etc.). After download, the Wallet computes the document hash and compares it against the `hash` in the request object:

```kotlin
// From eudi-lib-jvm-rqes-csc-kt — hash verification
val computedHash = MessageDigest.getInstance("SHA-256").digest(documentBytes)
val expectedHash = Base64.getUrlDecoder().decode(requestObject.hash)
require(computedHash.contentEquals(expectedHash)) {
    "Document hash mismatch — potential substitution attack"
}
```

If any hash mismatches, the Wallet aborts the flow and displays an error to the User. This is the primary defence against document substitution — an RP (or man-in-the-middle) cannot swap the document after the User has committed to signing it.

</details>
<details><summary><strong>4. EUDI Wallet discovers RSSP capabilities</strong></summary>

The Wallet calls `GET /csc/v2/info` on the QTSP's base URI to discover its capabilities. The Wallet may use a pre-configured default QTSP (per QES_18, which mandates at least one default) or allow the User to select from multiple configured QTSPs.

```http
GET /csc/v2/info HTTP/1.1
Host: walletcentric.signer.eudiw.dev
```

```json
{
  "specs": "2.0.0.0",
  "name": "Wallet-Centric QTSP",
  "logo": "https://walletcentric.signer.eudiw.dev/logo.png",
  "region": "EU",
  "lang": "en",
  "authType": ["oauth2code"],
  "oauth2": "https://walletcentric.signer.eudiw.dev/.well-known/openid-configuration",
  "methods": ["info", "credentials/list", "credentials/info", "signatures/signHash"],
  "validationInfo": true
}
```

The `authType: ["oauth2code"]` confirms that this RSSP uses OAuth2 Authorization Code flow (the mandated mode in the EUDI ecosystem). The `oauth2` URL points to the OAuth2 Authorization Server's discovery document, which the Wallet uses for the next two authorization steps.

</details>
<details><summary><strong>5. EUDI Wallet performs service-level OAuth2 authorization (Tier 1)</strong></summary>

Using the OAuth2 Authorization Code flow (optionally with PAR per §6.5), the Wallet obtains a **service access token** from the QTSP's authorization server. This is Tier 1 of the dual-layer authorization model (§26.3.2).

```http
POST /oauth2/authorize HTTP/1.1
Host: walletcentric.signer.eudiw.dev
Content-Type: application/x-www-form-urlencoded

response_type=code
&client_id=eudi-wallet-android
&redirect_uri=rqes://oauth/callback
&scope=service
&code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM
&code_challenge_method=S256
```

The `scope=service` indicates this is a service-level authorization, not a credential-level one. The `redirect_uri` uses the `rqes://` scheme registered by the EUDI reference wallet for OAuth callbacks. The resulting access token grants the Wallet permission to list credentials and query metadata, but **not** to sign.

</details>
<details><summary><strong>6. EUDI Wallet lists and selects signing credentials</strong></summary>

Using the service access token, the Wallet calls `POST /credentials/list` to retrieve the User's available signing credentials at this QTSP:

```http
POST /csc/v2/credentials/list HTTP/1.1
Host: walletcentric.signer.eudiw.dev
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
Content-Type: application/json

{
  "userID": "max.mustermann@example.de"
}
```

```json
{
  "credentialIDs": ["credential-qes-001", "credential-qes-002"],
  "credentialInfos": [
    {
      "credentialID": "credential-qes-001",
      "key": {
        "status": "enabled",
        "algo": ["1.2.840.10045.4.3.2"],
        "len": 256
      },
      "cert": {
        "status": "valid",
        "certificates": ["MIICpDCCAYwCCQDU+pQ4pHge..."],
        "issuerDN": "CN=QTSP Example CA, O=QTSP Example EU, C=EU",
        "subjectDN": "CN=Max Mustermann, C=DE",
        "serialNumber": "1234567890"
      },
      "SCAL": "2",
      "description": "Qualified Electronic Signature Certificate"
    }
  ]
}
```

The User selects which credential to use (or the Wallet auto-selects if only one exists). The `SCAL: "2"` confirms that this credential supports SCAL2 hash-bound authorization — the mandated level per QES_23. The `cert.certificates` array contains the X.509 certificate chain that will be embedded in the PAdES signature.

</details>
<details><summary><strong>7. EUDI Wallet computes document hash for PAdES signing</strong></summary>

The RQES SDK's `calculateDocumentHashes` function uses PodofoManager (a native C++ PDF library accessed via JNI on Android) to prepare the PDF for signing and compute the hash. This is not a simple file hash — it is a PAdES-specific hash:

```mermaid
---
config:
  themeVariables:
    noteBkgColor: "transparent"
    noteBorderColor: "transparent"
---
stateDiagram-v2
    classDef stateStyle text-align:left

    s1: Unsigned Raw PDF
    s2: PDF with Placeholder
    s3: Byte-Range Hashing
    s4: CSC Remote Signing
    s5: PAdES-B-B Document
    
    s1 --> s2 : Inject empty CMS signature field
    s2 --> s3 : Compute SHA-256 over document (excluding placeholder)
    s3 --> s4 : Send hash to RSSP via /signHash
    s4 --> s5 : Embed PKCS#1 signature value into placeholder
    
    class s1, s2, s3, s4, s5 stateStyle
```

1. **Inject signature placeholder**: PodofoManager adds a PKCS#7/CMS signature placeholder field to the PDF's incremental update section, reserving a byte range for the actual signature value
2. **Compute byte-range hash**: The SHA-256 hash is computed over the PDF's byte ranges (the entire document minus the placeholder bytes)
3. **Record byte-range coordinates**: The exact byte offsets are recorded for later signature embedding

```kotlin
// From eudi-lib-jvm-rqes-csc-kt — document hash calculation
val documentDigestList = cscClient.calculateDocumentHashes(
    documents = listOf(unsignedDocument),
    certificateChain = credential.cert.certificates,
    hashAlgorithmOID = HashAlgorithmOID.SHA_256
)
// documentDigestList.hashAlgorithmOID = "2.16.840.1.101.3.4.2.1" (SHA-256)
// documentDigestList.hashes = ["kF2Qk8mBNqvXMTb3UvZ4WbYJ9R0cvKHdXsU7oP5wF1M="]
```

The hash value is what will be sent to the RSSP for signing — the RSSP never sees the actual document content.

</details>
<details><summary><strong>8. EUDI Wallet performs credential-level OAuth2 authorization with hash binding (Tier 2, SCAL2)</strong></summary>

The Wallet initiates a second OAuth2 authorization, this time for the **specific credential** and bound to the **specific document hashes**. This is Tier 2 of the dual-layer model and the core SCAL2 security mechanism.

The document hashes are embedded in the authorization request via Rich Authorization Requests (RAR, RFC 9396):

```http
POST /oauth2/authorize HTTP/1.1
Host: walletcentric.signer.eudiw.dev
Content-Type: application/x-www-form-urlencoded

response_type=code
&client_id=eudi-wallet-android
&redirect_uri=rqes://oauth/callback
&scope=credential
&credentialID=credential-qes-001
&authorization_details=[
  {
    "type": "credential_authorization",
    "credentialID": "credential-qes-001",
    "documentDigests": [
      {
        "hash": "kF2Qk8mBNqvXMTb3UvZ4WbYJ9R0cvKHdXsU7oP5wF1M=",
        "label": "Service Agreement - Example Corp"
      }
    ],
    "hashAlgorithmOID": "2.16.840.1.101.3.4.2.1"
  }
]
&code_challenge=dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk
&code_challenge_method=S256
```

The QTSP's authorization server presents the User with a consent screen showing the document(s) to be signed. The User approves with biometric/PIN. The resulting **credential access token** is cryptographically bound to these specific hashes — if the Wallet later tries to sign different documents, the RSSP will reject the `signHash` call.

</details>
<details><summary><strong>9. EUDI Wallet signs the document hash via RSSP</strong></summary>

With the hash-bound credential access token, the Wallet calls `POST /signatures/signHash`. For SCAL2, the hashes do not need to be re-sent in the request body (they are already bound in the token):

```http
POST /csc/v2/signatures/signHash HTTP/1.1
Host: walletcentric.signer.eudiw.dev
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
Content-Type: application/json

{
  "credentialID": "credential-qes-001",
  "signAlgo": "1.2.840.10045.4.3.2",
  "operationMode": "S"
}
```

```json
{
  "signatures": ["MEUCIQCxRBN1bk..."]
}
```

The `signatures` array contains the raw PKCS#1 digital signature value created by the remote QSCD. The `operationMode: "S"` indicates synchronous operation (the signature is computed immediately). The RSSP internally verifies that the `signHash` request corresponds to the hashes authorized in step 8 — this is the SCAL2 binding enforcement.

</details>
<details><summary><strong>10. EUDI Wallet assembles the signed PAdES document</strong></summary>

The RQES SDK's `createSignedDocuments` function uses PodofoManager to embed the PKCS#1 signature value into the PAdES placeholder that was prepared in step 7:

```kotlin
// From eudi-lib-jvm-rqes-csc-kt — signed document assembly
val signedDocuments = cscClient.createSignedDocuments(
    documentDigestList = documentDigestList,
    signatures = signaturesList
)
// signedDocuments = [SignedDocument(filename, bytes, format=PAdES)]
```

The assembly process:
1. Retrieves the prepared PDF (with placeholder) from step 7
2. Constructs a CMS SignedData structure containing: the PKCS#1 signature value from the RSSP, the signing certificate chain, and optionally a qualified timestamp (if `ADES_B_T` or higher was requested)
3. Writes the CMS structure into the reserved byte range
4. Produces the final signed PDF

The resulting document is a valid PAdES-signed PDF that can be verified by any PAdES-compliant validator (e.g., Adobe Acrobat, the EU DSS library).

</details>
<details><summary><strong>11. EUDI Wallet dispatches signed document to Relying Party</strong></summary>

Using the Document Retrieval protocol's dispatch mechanism (§26.4.5), the Wallet sends the signed document back to the RP at the `response_uri` specified in the original request object:

```http
POST /rp/callback HTTP/1.1
Host: walletcentric.signer.eudiw.dev
Content-Type: application/json

{
  "document_id": "contract-2026-07-001",
  "documentWithSignature": "<base64-encoded-signed-PDF>",
  "signature_format": "PAdES",
  "conformance_level": "ADES_B_B",
  "signer_certificate_subject": "CN=Max Mustermann, C=DE"
}
```

The RP receives the signed document, validates the PAdES signature, and stores the result. The `documentWithSignature` field contains the complete signed PDF — the RP does not need to perform any additional assembly.

Alternatively, if the RP specified `signatureObject` in the request, the Wallet returns only the detached CMS signature bytes, and the RP performs the final PDF assembly on its server.

</details>

| Aspect | Detail |
|:-------|:-------|
| **RP integration complexity** | **Medium** — Document Retrieval protocol + callback |
| **CSC API used by** | **Wallet** (via RQES SDK) |
| **RP implements CSC client?** | No — RP only provides documents and receives results |
| **RP protocol** | Document Retrieval (§26.4) |
| **Reference SDK** | `eudi-lib-jvm-rqes-csc-kt` (Android), `eudi-lib-ios-rqes-csc-swift` (iOS) |

##### 26.2.3 Scenario C: RP-Channelled Remote QES

In this flow, the RP is the **signing orchestrator**. The RP selects the QTSP, manages the CSC API interaction server-side, and uses the Wallet only for User authentication and credential authorization.

```mermaid
---
config:
  themeVariables:
    noteBkgColor: "transparent"
    noteBorderColor: "transparent"
  sequence:
    messageAlign: left
    noteAlign: left
    actorMargin: 250
---
sequenceDiagram
    autonumber
    participant User
    participant Wallet as EUDI Wallet
    participant RP as Relying Party<br/>(CSC Client)
    participant RSSP as Remote QTSP<br/>(CSC API v2.0)

    rect rgba(148, 163, 184, 0.14)
    Note over RP: Phase 1 — Preparation
    User->>RP: Upload / select document
    RP->>RP: Select QTSP for signing
    RP->>RSSP: GET /csc/v2/info
    RSSP->>RP: RSSP metadata
    RP->>RSSP: Service authorization (Client Credentials)
    RSSP->>RP: Service access token
    Note right of RSSP: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end

    rect rgba(52, 152, 219, 0.14)
    Note over RP: Phase 2 — Credential + Hash
    RP->>RSSP: POST /credentials/list
    RSSP->>RP: Credential IDs
    RP->>RP: Compute document hash (SHA-256)
    Note right of RSSP: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end

    rect rgba(46, 204, 113, 0.14)
    Note over Wallet: Phase 3 — User Authorization
    RP->>Wallet: Request credential authorization<br/>(OpenID4VP with transaction_data<br/>containing document hash)
    Wallet->>User: Display: "Sign document X?"<br/>(WYSIWYS)
    User->>Wallet: Approve + biometric/PIN
    Wallet->>RP: Authorization response
    Note right of RSSP: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end

    rect rgba(241, 196, 15, 0.14)
    Note over RP: Phase 4 — Sign + Deliver
    RP->>RSSP: Credential authorization<br/>(with hash binding)
    RSSP->>RP: Credential access token
    RP->>RSSP: POST /signatures/signHash
    RSSP->>RP: Digital signature value
    RP->>RP: Assemble PAdES document
    RP->>User: Signed document available
    Note right of RSSP: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
```

<details><summary><strong>1. User selects document for signing at Relying Party</strong></summary>

The User uploads or selects a document for signing on the RP's platform. Unlike Scenarios A and B, the document stays on the RP's server throughout the entire flow — it is never transmitted to the Wallet or the QTSP (only the document hash is sent). This is the key architectural difference: the RP retains full control of the document lifecycle.

</details>
<details><summary><strong>2. Relying Party selects QTSP for signing</strong></summary>

The RP chooses which QTSP to use for signing. Per QES_04 note: "In a Relying Party-centric flow, the remote QTSP will likely be selected by the Relying Party, which implies the QSCD is managed by the remote QTSP."

The RP may pre-configure a single QTSP (most common for enterprise integrations) or maintain a list of qualified QTSPs offering interoperable CSC API v2.0 endpoints. No standardized QTSP discovery protocol exists (Open Question #23, §29) — the selection is based on contractual relationships and Trusted List verification (§26.7).

</details>
<details><summary><strong>3. Relying Party discovers RSSP and authenticates via Client Credentials</strong></summary>

The RP calls `GET /csc/v2/info` to discover the QTSP's capabilities, then uses the **Client Credentials** OAuth2 flow for server-to-server service authorization. This is the key difference from Scenario B — the RP authenticates as a **confidential client** with pre-registered credentials, not via interactive browser-based OAuth.

```http
POST /oauth2/token HTTP/1.1
Host: rp-centric.signer.eudiw.dev
Content-Type: application/x-www-form-urlencoded
Authorization: Basic ZXhhbXBsZS1iYW5rLWRlOmNsaWVudF9zZWNyZXQ=

grant_type=client_credentials
&scope=service
```

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "service"
}
```

The `grant_type=client_credentials` indicates that no user interaction is needed for this step — the RP authenticates using its registered client ID and secret (or certificate-based authentication). This service access token authorizes the RP to list credentials and query metadata.

</details>
<details><summary><strong>4. Relying Party lists credentials and computes document hash</strong></summary>

Using the service access token, the RP calls `POST /credentials/list` to retrieve the User's available signing credentials. Since the RP is a server, it can use standard cryptographic libraries (e.g., BouncyCastle, OpenSSL) for hash computation rather than a mobile PDF library.

```http
POST /csc/v2/credentials/list HTTP/1.1
Host: rp-centric.signer.eudiw.dev
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
Content-Type: application/json

{
  "userID": "max.mustermann@example.de"
}
```

The RP then prepares the PDF for PAdES signing (adding the signature placeholder) and computes the SHA-256 hash over the document byte ranges:

```python
# Server-side hash computation (Python/pyHanko)
from pyhanko.sign import signers
from hashlib import sha256

with open("contract.pdf", "rb") as f:
    pdf_bytes = f.read()

# Prepare PAdES placeholder and compute hash
prepared = signers.PdfSignatureMetadata(
    field_name="Signature1",
    md_algorithm="sha256"
)
document_hash = sha256(byte_range_content).hexdigest()
# "905d9093c981...a91e52fa7c5d"
```

</details>
<details><summary><strong>5. Relying Party requests User authorization via EUDI Wallet (OpenID4VP with transaction_data)</strong></summary>

The RP sends an OpenID4VP authorization request to the User's Wallet, including the document hash in the `transaction_data` extension (§13.15.5). This serves two purposes: (a) WYSIWYS — the Wallet displays the signing context to the User, and (b) proof of authorization — the signed KB-JWT response is cryptographic evidence that the User consented to sign this specific document.

```json
{
  "response_type": "vp_token",
  "client_id": "contracts.example-bank.de",
  "client_id_scheme": "x509_san_dns",
  "response_mode": "direct_post.jwt",
  "response_uri": "https://contracts.example-bank.de/oid4vp/response",
  "dcql_query": {
    "credentials": [{
      "id": "pid_for_signing",
      "format": "dc+sd-jwt",
      "meta": { "vct_values": ["eu.europa.ec.eudi.pid.1"] },
      "claims": [
        { "path": ["family_name"] },
        { "path": ["given_name"] }
      ]
    }]
  },
  "transaction_data": [
    {
      "type": "qes_authorization",
      "credential_id": "credential-qes-001",
      "document_digests": [
        {
          "hash": "kF2Qk8mBNqvXMTb3UvZ4WbYJ9R0cvKHdXsU7oP5wF1M=",
          "hash_algorithm_oid": "2.16.840.1.101.3.4.2.1",
          "label": "Service Agreement - Example Corp"
        }
      ],
      "qtsp_name": "RP-Centric QTSP",
      "signature_format": "PAdES"
    }
  ]
}
```

The Wallet displays the `label` and `qtsp_name` to the User: *"Sign 'Service Agreement - Example Corp' using RP-Centric QTSP?"*. The User approves with biometric/PIN. The Wallet returns a KB-JWT that includes a hash of the `transaction_data` in its payload — this cryptographically binds the User's consent to the specific document hashes.

> **Cross-reference**: §13.15.5 covers the full `transaction_data` specification for QES use cases, including how the hash commitment chain ensures the Wallet cannot be tricked into signing a different document.

</details>
<details><summary><strong>6. Relying Party performs credential authorization at QTSP (SCAL2 hash-bound)</strong></summary>

Using the Wallet's authorization proof (the KB-JWT from step 5), the RP requests credential-level authorization from the QTSP. The document hashes are bound to the authorization request via RAR (Rich Authorization Requests):

```http
POST /oauth2/token HTTP/1.1
Host: rp-centric.signer.eudiw.dev
Content-Type: application/x-www-form-urlencoded
Authorization: Basic ZXhhbXBsZS1iYW5rLWRlOmNsaWVudF9zZWNyZXQ=

grant_type=authorization_code
&code=SplxlOBeZQQYbYS6WxSbIA
&redirect_uri=https://contracts.example-bank.de/oauth/callback
&authorization_details=[
  {
    "type": "credential_authorization",
    "credentialID": "credential-qes-001",
    "documentDigests": [
      {
        "hash": "kF2Qk8mBNqvXMTb3UvZ4WbYJ9R0cvKHdXsU7oP5wF1M=",
        "label": "Service Agreement - Example Corp"
      }
    ],
    "hashAlgorithmOID": "2.16.840.1.101.3.4.2.1"
  }
]
```

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 300,
  "scope": "credential",
  "authorization_details": [
    {
      "type": "credential_authorization",
      "credentialID": "credential-qes-001"
    }
  ]
}
```

The resulting credential access token has a short expiry (typically 300 seconds) and is bound to the specific document hashes. The RSSP will verify this binding when `signHash` is called — any mismatch causes the signing operation to fail.

</details>
<details><summary><strong>7. Relying Party signs hash and assembles PAdES document</strong></summary>

The RP calls `POST /signatures/signHash` with the credential access token and receives the digital signature value from the QTSP's remote QSCD:

```http
POST /csc/v2/signatures/signHash HTTP/1.1
Host: rp-centric.signer.eudiw.dev
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
Content-Type: application/json

{
  "credentialID": "credential-qes-001",
  "signAlgo": "1.2.840.10045.4.3.2",
  "operationMode": "S"
}
```

```json
{
  "signatures": ["MEUCIQCxRBN1bk4Tl..."]
}
```

The RP then assembles the signed PAdES document server-side. Unlike Scenario B (where the Wallet uses PodofoManager), the RP uses server-side PDF libraries (e.g., pyHanko, iText, Apache PDFBox):

```python
# Server-side PAdES assembly (Python/pyHanko)
from pyhanko.sign import signers

signed_pdf = signers.embed_payload_with_cms(
    pdf_bytes=prepared_pdf,
    signature_value=base64.b64decode(signatures[0]),
    signing_cert=credential_certificate,
    timestamp_url="https://timestamp.sectigo.com/qualified"  # For ADES_B_T
)

with open("contract-signed.pdf", "wb") as f:
    f.write(signed_pdf)
```

The signed document is stored on the RP's infrastructure and made available to the User for download. The RP also logs the signing event per §26.8.

> **ETSI TS 119 101 obligation**: Because the RP provided the SCA (orchestrated the signing flow, computed the hash, and assembled the document), QES_24a applies. The RP must comply with ETSI TS 119 101's policy and security requirements for the SCA implementation.

</details>

| Aspect | Detail |
|:-------|:-------|
| **RP integration complexity** | **High** — server-side CSC client + QTSP relationship + `transaction_data` |
| **CSC API used by** | **RP** (server-side) |
| **RP implements CSC client?** | **Yes** — full server-side CSC v2.0 client required |
| **RP obligation** | Must comply with ETSI TS 119 101 (QES_24a) |
| **QTSP selection** | RP-managed; no standardized discovery protocol |

> **Cross-references**: §13.15.5 (transaction_data for QES), §6 (OpenID4VP for wallet authentication in Phase 3).

#### 26.3 CSC API v2.0 Protocol Deep-Dive

##### 26.3.1 Endpoint Catalog

The CSC API v2.0 defines 14 methods across 4 functional groups. All endpoints are relative to a base URI ending in `/csc/v2`:

| Group | Endpoint | CSC Section | Purpose | EUDI Ref. Impl. |
|:------|:---------|:------------|:--------|:----------------|
| **Service** | `info` | §11.1 | RSSP metadata: name, region, auth types, methods, algorithms | ✅ |
| **Auth** | `auth/login` | §11.2 | Explicit user authentication (non-OAuth path) | ❌ |
| **Auth** | `auth/revoke` | §11.3 | Revoke session/token | ❌ |
| **Credentials** | `credentials/list` | §11.4 | List credential IDs for the authenticated user | ✅ |
| **Credentials** | `credentials/info` | §11.5 | Credential metadata: key, certificate chain, SCAL level | ✅ |
| **Credentials** | `credentials/authorize` | §11.6 | Authorize credential use (explicit auth mode) | ❌ |
| **Credentials** | `credentials/authorizeCheck` | §11.7 | Check authorization status | ❌ |
| **Credentials** | `credentials/getChallenge` | §11.8 | Request OTP challenge | ❌ |
| **Credentials** | `credentials/sendOTP` | — | Deliver OTP for challenge-response | ❌ |
| **Credentials** | `credentials/extendTransaction` | §11.9 | Extend transaction authorization window | ❌ |
| **Signatures** | `signatures/signHash` | §11.10 | Create PKCS#1 signatures from hash values | ✅ |
| **Signatures** | `signatures/signDoc` | §11.11 | Sign entire documents server-side | ❌ (model exists) |
| **Signatures** | `signatures/signPolling` | — | Poll for async signing results | ❌ |
| **Signatures** | `signatures/timestamp` | — | RFC 3161 timestamp generation | ❌ |

The EUDI reference implementation (`eudi-lib-jvm-rqes-csc-kt`) implements the core **happy path**: `info` → `credentials/list` → `credentials/info` → `signatures/signHash`, using OAuth2 for both service and credential authorization. The `auth/login` and `credentials/authorize` explicit-auth endpoints are not implemented because the EUDI ecosystem mandates OAuth2.

##### 26.3.2 Dual-Layer Authorization Model

The most architecturally significant aspect of the CSC API is its **two-tier OAuth2 authorization** model:

**Tier 1 — Service Authorization** authorizes the application (Wallet or RP) to access the RSSP's general capabilities (listing credentials, querying info). The scope is `service`. The output is a **service access token** valid for credential listing and metadata operations.

**Tier 2 — Credential Authorization** authorizes the use of a **specific signing credential** for signing **specific documents**. The scope is `credential`. For SCAL2 (the mandated level per QES_23), the document hashes are embedded in the authorization request via Rich Authorization Requests (RAR) or scope parameters. The output is a **credential access token** cryptographically bound to the document hashes.

This two-tier model means that an attacker who compromises the service access token cannot sign documents — they can only list credentials. And an attacker who compromises the credential access token cannot sign *different* documents, because the token is bound to specific hashes (SCAL2).

```mermaid
---
config:
  themeVariables:
    noteBkgColor: "transparent"
    noteBorderColor: "transparent"
---
flowchart TD
    classDef t1 stroke-width:2px, text-align:left
    classDef t2 stroke-width:2px, text-align:left
    classDef eps stroke-dasharray: 4, text-align:left

    T1["`**Tier&nbsp;1:&nbsp;Service&nbsp;Auth**
    Scope:&nbsp;*service*
    No&nbsp;User&nbsp;Consent&nbsp;Required`"]:::t1
    
    T2["`**Tier&nbsp;2:&nbsp;Credential&nbsp;Auth**
    Scope:&nbsp;*credential*
    SCAL2&nbsp;Hash-Binding&nbsp;via&nbsp;RAR`"]:::t2
    
    T1_Token>"`**Service&nbsp;Access&nbsp;Token**`"]
    T2_Token>"`**Credential&nbsp;Access&nbsp;Token**`"]

    EP1["`🔓 **/info**
    🔓 **/credentials/list**
    🔓 **/credentials/info**`"]:::eps

    EP2["`⛔ **/signatures/signHash**
    *(Unlocks ONLY for bound document hashes)*`"]:::eps

    T1 --> T1_Token --> EP1
    T2 --> T2_Token --> EP2
```

##### 26.3.3 RSSP Metadata Discovery

When connecting to an RSSP, the first call is always `GET /csc/v2/info`. The response reveals:

| Field | Purpose |
|:------|:--------|
| `specs` | CSC API version (e.g., `"2.0.0.0"`) |
| `name` | Human-readable RSSP name |
| `logo` | RSSP logo URI |
| `region` | ISO 3166-1 country code |
| `authType` | Supported auth types: `oauth2code`, `external`, `basic`, `digest`, `tls` |
| `oauth2` | OAuth2 Authorization Server metadata URL (`.well-known/openid-configuration`) |
| `methods` | Which of the 14 CSC methods this RSSP supports |
| `asynchronousOperationMode` | Whether async signing (polling) is supported |
| `validationInfo` | Whether OCSP/CRL data is returned with signatures |

The EUDI reference implementation enforces that the base URI ends with `/csc/v2` and uses HTTPS:
```kotlin
// RSSPId validation — from eudi-lib-jvm-rqes-csc-kt Types.kt
require(it.value.toString().endsWith("/csc/v2")) { "Base URI must end with /csc/v2" }
require(uri.scheme.contentEquals("https", true)) { "URL must use https protocol" }
```

##### 26.3.4 SCAL1 vs SCAL2

Sole Control Assurance Level (SCAL) determines the security binding between the User's authorization and the signing operation:

| Level | Standard | Key Property | Hash Binding | EUDI Status |
|:------|:---------|:-------------|:-------------|:------------|
| **SCAL1** | EN 419 241-1 §5 | Authorization grants access to credential for N signatures | ❌ Hashes NOT bound to authorization | Not acceptable for QES |
| **SCAL2** | EN 419 241-1 §6 | Authorization is bound to specific document hashes | ✅ RSSP verifies signHash hashes match authorized hashes | **Required** by QES_23 |

In the EUDI reference implementation, SCAL2 is enforced at the type level — the `signHash` method on `CredentialAuthorized.SCAL2` does not require the caller to re-specify document hashes (they are already bound in the token):

```kotlin
// SCAL2 signHash — hashes already bound at credential authorization time
suspend fun CredentialAuthorized.SCAL2.signHash(
    signingAlgorithmOID: SigningAlgorithmOID,
    signingAlgorithmParams: String? = null,
): Result<SignaturesList>

// SCAL1 signHash — caller must specify hashes (no binding guarantee)
suspend fun CredentialAuthorized.SCAL1.signHash(
    documentDigestList: DocumentDigestList,
    signingAlgorithmOID: SigningAlgorithmOID,
    signingAlgorithmParams: String? = null,
): Result<SignaturesList>
```

##### 26.3.5 Reference Implementation

The EUDI RQES library ecosystem consists of four packages:

| Library | Platform | Purpose |
|:--------|:---------|:--------|
| `eudi-lib-jvm-rqes-csc-kt` | Kotlin/JVM (Android) | CSC API v2.0 client — core protocol |
| `eudi-lib-ios-rqes-csc-swift` | Swift (iOS) | CSC API v2.0 client — core protocol |
| RQES UI SDK (Android) | Android | Pre-built signing UI screens + flow |
| `EudiRQESUi` | Swift (iOS) | Pre-built signing UI screens + flow |

The core `CSCClient` interface composes 8 capability traits via Kotlin delegation — each trait maps to a distinct phase of the signing flow:

```kotlin
interface CSCClient :
    AuthorizeService,         // Tier 1: Service-level OAuth2
    AuthorizeCredential,      // Tier 2: Credential-level OAuth2 (SCAL2 hash-binding)
    ListCredentials,          // POST /credentials/list
    GetCredentialInfo,        // POST /credentials/info
    SignHash,                 // POST /signatures/signHash
    SignDoc,                  // POST /signatures/signDoc
    CreateSignedDocuments,    // Local: embed signature into PDF (PodofoManager)
    CalculateDocumentHashes   // Local: compute document hash (PodofoManager)
```

The reference wallets configure a demo QTSP endpoint:

```kotlin
// From eudi-ref-android RQESConfigImpl.kt
QtspData(
    name = "Wallet-Centric",
    endpoint = "https://walletcentric.signer.eudiw.dev/csc/v2",
    tsaUrl = "https://timestamp.sectigo.com/qualified",
    hashAlgorithm = HashAlgorithmOID.SHA_256,
)
```

Key integration points in the reference wallets:
- **Android**: `DocumentSign` navigation screen, `QrScanFlow.Signature` flow type, `DeepLinkType.RQES` and `DeepLinkType.RQES_DOC_RETRIEVAL` deep link handlers
- **iOS**: `EudiRQESUi` Swift Package, `rqes://oauth/callback` deep link scheme

#### 26.4 Document Retrieval Protocol

> ⚠️ **Stability warning**: The Document Retrieval protocol is **not part of the CSC API specification**. The EUDI reference implementation marks it with: *"This flow may be removed in future versions of the library."* RPs should implement it but be prepared for protocol evolution.

##### 26.4.1 Purpose and Architecture

The Document Retrieval protocol bridges the gap between RP-initiated signing (Scenario B) and the CSC API signing flow. It solves the question: **how does the RP tell the Wallet which documents to sign, and how does the Wallet return the signed results?**

The protocol uses an **OpenID4VP-like** request/response pattern:
1. The RP publishes a `request_uri` (via QR code or deep link)
2. The Wallet resolves the URI to a JAR-signed request object
3. The request object contains document locations, hashes, and access methods
4. After signing, the Wallet dispatches results back to the RP

##### 26.4.2 Document Retrieval and Signing Sequence

```mermaid
---
config:
  themeVariables:
    noteBkgColor: "transparent"
    noteBorderColor: "transparent"
  sequence:
    messageAlign: left
    noteAlign: left
    actorMargin: 250
---
sequenceDiagram
    autonumber
    participant User
    participant Wallet as EUDI Wallet
    participant RP as Relying Party

    rect rgba(148, 163, 184, 0.14)
    Note over RP: Phase 1 — Request
    RP->>User: Present QR code / deep link<br/>(contains request_uri)
    User->>Wallet: Scan QR code
    Wallet->>RP: GET request_uri
    RP->>Wallet: Return JAR-signed request object<br/>(document locations + hashes)
    Wallet->>Wallet: Parse and validate request object
    Note right of RP: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end

    rect rgba(52, 152, 219, 0.14)
    Note over Wallet: Phase 2 — Document Retrieval
    Wallet->>RP: Download document(s) from locations
    RP->>Wallet: Return document content
    Wallet->>Wallet: Compute document hashes<br/>and verify against request object
    Note right of RP: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end

    rect rgba(46, 204, 113, 0.14)
    Note over Wallet: Phase 3 — CSC Signing
    Note over Wallet: [Full CSC API flow per §26.3]
    Note right of RP: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end

    rect rgba(241, 196, 15, 0.14)
    Note over RP: Phase 4 — Dispatch
    Wallet->>RP: Send signed documents<br/>and/or signature objects
    RP->>Wallet: Acknowledge receipt
    Note right of RP: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
```

<details><summary><strong>1. Relying Party presents QR code or deep link to User</strong></summary>

The RP generates a QR code (for cross-device flow) or a deep link (for same-device flow) containing a `request_uri` that points to a JAR-signed request object. The URI follows the `mdoc-openid4vp` scheme defined in the EUDI reference implementation:

```
mdoc-openid4vp://https//walletcentric.signer.eudiw.dev/rp
    ?request_uri=https://walletcentric.signer.eudiw.dev/rp/wallet/sd/abc123
    &client_id=walletcentric.signer.eudiw.dev
```

The RP must pre-compute the document hash and embed it in the request object *before* generating the QR code. The `request_uri` is a one-time URL — it should expire after a short TTL (e.g., 5 minutes) to prevent replay attacks.

</details>
<details><summary><strong>2. User scans QR code with EUDI Wallet</strong></summary>

The User opens their EUDI Wallet and scans the QR code (cross-device) or taps the deep link (same-device). The Wallet recognises the `mdoc-openid4vp` scheme and extracts the `request_uri` and `client_id` parameters. At this point, no document content has been transferred — the Wallet only has a pointer to the RP's request object.

</details>
<details><summary><strong>3. EUDI Wallet fetches the JAR-signed request object from RP</strong></summary>

The Wallet performs an HTTP GET on the `request_uri` to fetch the request object. The RP returns a JAR-signed JWT (RFC 9101) containing the full request parameters:

```http
GET /rp/wallet/sd/abc123 HTTP/1.1
Host: walletcentric.signer.eudiw.dev
Accept: application/oauth-authz-req+jwt
```

The RP responds with the signed request object. The Wallet validates the JAR signature against the RP's X.509 certificate (resolved via the `client_id_scheme` — see §26.4.4 for the three supported schemes).

</details>
<details><summary><strong>4. Relying Party returns request object with document locations and hashes</strong></summary>

The request object contains document metadata — locations, hashes, access methods, and labels:

```json
{
  "iss": "walletcentric.signer.eudiw.dev",
  "aud": "https://self-issued.me/v2",
  "client_id": "walletcentric.signer.eudiw.dev",
  "client_id_scheme": "x509_san_dns",
  "response_mode": "direct_post",
  "response_uri": "https://walletcentric.signer.eudiw.dev/rp/callback",
  "documents": [
    {
      "document_id": "contract-2026-07-001",
      "label": "Service Agreement - Example Corp",
      "uri": "https://contracts.example-bank.de/docs/contract-2026-07-001.pdf",
      "hash": "sha256-kF2Qk8mBNqvXMTb3UvZ4WbYJ9R0cvKHdXsU7oP5wF1M=",
      "hash_algorithm_oid": "2.16.840.1.101.3.4.2.1",
      "access_method": "Public"
    }
  ]
}
```

The `hash` field is critical — it binds the request to a specific document version. The `access_method` tells the Wallet how to authenticate when downloading (see §26.4.3 for the full list of supported methods).

</details>
<details><summary><strong>5. EUDI Wallet parses and validates the request object</strong></summary>

The Wallet performs structural and cryptographic validation of the request object:

1. **JAR signature verification** — validate the JWT signature against the RP's certificate
2. **Certificate chain validation** — verify the RP's X.509 certificate chains to a trusted root
3. **`client_id` matching** — confirm the `client_id` in the JWT payload matches the SAN in the signing certificate
4. **Document metadata parsing** — extract `documents[]` array with URIs, hashes, and access methods
5. **Supported format check** — confirm the Wallet can handle the requested signing format

If any validation step fails, the Wallet rejects the request and displays an error to the User.

</details>
<details><summary><strong>6. EUDI Wallet downloads documents from specified locations</strong></summary>

The Wallet downloads each document from its `uri` using the specified `access_method`. For the common `Public` method, this is a simple HTTP GET:

```http
GET /docs/contract-2026-07-001.pdf HTTP/1.1
Host: contracts.example-bank.de
Accept: application/pdf
```

For `OAuth2` access, the Wallet uses a bearer token provided in the request object. For `BasicAuth`, it uses credentials from the request. The Wallet stores the downloaded document(s) in its secure local storage.

</details>
<details><summary><strong>7. EUDI Wallet computes document hashes and verifies integrity</strong></summary>

After download, the Wallet computes the cryptographic hash of each document and compares it to the `hash` value from the request object. This is the primary defence against document substitution attacks:

```kotlin
val computedHash = MessageDigest.getInstance("SHA-256").digest(documentBytes)
val expectedHash = Base64.getUrlDecoder().decode(requestObject.documents[0].hash)
require(computedHash.contentEquals(expectedHash)) {
    "Document hash mismatch — aborting signing flow"
}
```

If any hash mismatch is detected, the Wallet immediately aborts the flow and alerts the User. This prevents an attacker from modifying the document between when the RP computed the hash and when the Wallet downloads it.

</details>
<details><summary><strong>8. EUDI Wallet performs CSC signing flow</strong></summary>

The Wallet executes the full CSC API v2.0 signing protocol as detailed in §26.3 — service-level OAuth2 authorization, credential listing, document hash computation (PAdES-specific), credential-level SCAL2 authorization with hash binding, `signHash` invocation, and signed document assembly. For the complete step-by-step breakdown of this phase, see the Scenario B walkthrough (§26.2.2, steps 4–10).

</details>
<details><summary><strong>9. EUDI Wallet dispatches signed documents to Relying Party</strong></summary>

After signing, the Wallet sends the results back to the RP at the `response_uri` specified in the request object using `direct_post`:

```http
POST /rp/callback HTTP/1.1
Host: walletcentric.signer.eudiw.dev
Content-Type: application/json

{
  "document_id": "contract-2026-07-001",
  "documentWithSignature": "<base64-encoded-signed-PDF>",
  "signature_format": "PAdES",
  "conformance_level": "ADES_B_B"
}
```

The RP can request either `documentWithSignature` (complete signed PDF — the Wallet embeds the CMS signature into the PDF) or `signatureObject` (detached CMS signature bytes — the RP assembles the final PDF server-side). See §26.4.5 for the full dispatch specification.

</details>
<details><summary><strong>10. Relying Party acknowledges receipt</strong></summary>

The RP validates the received signed document (PAdES signature verification per ETSI EN 319 102-1), stores it, and sends an acknowledgement response to the Wallet:

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "status": "received",
  "document_id": "contract-2026-07-001"
}
```

The Wallet displays a confirmation to the User indicating that the signing flow is complete. The RP logs the signing event per §26.8 (transaction logging requirements).

</details>

The request URI format follows the `mdoc-openid4vp` scheme:

```
mdoc-openid4vp://https//walletcentric.signer.eudiw.dev/rp
    ?request_uri=https://walletcentric.signer.eudiw.dev/rp/wallet/sd/{sessionId}
    &client_id=walletcentric.signer.eudiw.dev
```

##### 26.4.3 Document Access Methods

The request object specifies how the Wallet should retrieve each document:

| Method | Description | Use Case |
|:-------|:-----------|:---------|
| `Public` | Document at a public URL — no authentication needed | Publicly available contracts |
| `BasicAuth` | HTTP Basic authentication | Simple authenticated access |
| `DigestAuth` | HTTP Digest authentication | More secure than Basic |
| `OAuth2` | OAuth 2.0 bearer token | Enterprise document management |
| `OTP` | One-time password provided in the request | Time-limited access |

##### 26.4.4 Client Authentication

The Document Retrieval client uses **JAR (JWT-Secured Authorization Request)** to ensure request integrity. The RP authenticates using one of three client ID schemes:

| Scheme | Mechanism | Verification |
|:-------|:----------|:-------------|
| `x509_san_uri` | X.509 certificate with URI in Subject Alternative Name | Wallet matches client_id against SAN URI |
| `x509_san_dns` | X.509 certificate with DNS name in Subject Alternative Name | Wallet matches client_id against SAN DNS |
| `pre_registered` | Pre-registered client ID (RFC 6749 default) | Wallet has prior knowledge of client |

> **Cross-references**: §6.3 (JAR construction), §7.3.1 (client ID schemes in OpenID4VP) — the Document Retrieval protocol reuses the same JAR infrastructure defined for presentation flows.

##### 26.4.5 Response Dispatch

After signing, the Wallet dispatches results back to the RP. The response can include:

| Field | Content | When Used |
|:------|:--------|:----------|
| `documentWithSignature` | Complete signed PDF documents | RP wants ready-to-store signed documents |
| `signatureObject` | Standalone signature values (detached) | RP wants to assemble the signed document itself |

The RP can request either or both. For PAdES (the mandatory format), the `documentWithSignature` approach is typical — the Wallet uses PodofoManager to embed the signature into the PDF and returns the complete signed file.

#### 26.5 Signature Formats and Conformance

##### 26.5.1 Mandatory Format: PAdES

CIR 2024/2979 Annex IV §1 mandates **PAdES** (PDF Advanced Electronic Signatures) as specified in **ETSI EN 319 142-1 V1.1.1**. This is a non-negotiable requirement — every integrated SCA must produce PAdES signatures.

PAdES is a standard for embedding digital signatures into PDF documents, including:
- The signature value (PKCS#1 or PKCS#7/CMS)
- The signing certificate (X.509)
- An optional qualified timestamp (RFC 3161)
- Optional revocation information (OCSP/CRL responses for long-term validation)

##### 26.5.2 Optional Formats

ARF QES_08 defines additional formats that Wallet Providers SHOULD support:

| Format | Standard | CSC Code | Media Type | Use Case |
|:-------|:---------|:---------|:-----------|:---------|
| **PAdES** | ETSI EN 319 142-1 V1.1.1 (2016-04) | `P` | PDF | **Mandatory** — human-readable documents |
| XAdES | ETSI EN 319 132-1 V1.2.1 (2022-02) | `X` | XML | XML documents, B2B data exchange |
| JAdES | ETSI TS 119 182-1 V1.2.1 (2024-07) | `J` | JSON | API payloads, JSON data |
| CAdES | ETSI EN 319 122-1 V1.3.1 (2023-06) | `C` | Binary | Binary data, arbitrary content |
| ASiC | ETSI EN 319 162-1/2 V1.1.1 (2016-04) | — | Container | Multiple files, package signing |

##### 26.5.3 Conformance Levels

Each signature format supports multiple conformance levels, determining the amount of validation information embedded:

| Level | Code | Content | Long-Term Validity |
|:------|:-----|:--------|:-------------------|
| **Baseline** | `ADES_B_B` | Signature value + signing certificate | ❌ No — depends on real-time revocation |
| **With Timestamp** | `ADES_B_T` | + qualified timestamp | Partial — proves signing time |
| **Long-Term** | `ADES_B_LT` | + revocation data (OCSP/CRL) | ✅ Yes — self-contained validation |
| **Long-Term Archival** | `ADES_B_LTA` | + archive timestamp | ✅ Yes — re-stampable for decades |

The reference implementation defaults to `ADES_B_B` (baseline) but supports all four levels. RPs accepting signed documents should verify at least `ADES_B_B` and SHOULD request `ADES_B_LT` or `ADES_B_LTA` for documents with long retention periods.

##### 26.5.4 Timestamping

Qualified timestamps (per Regulation (EU) No 910/2014, Art. 41–42) provide legally binding proof of the time a signature was created. The EUDI reference implementation uses a qualified TSA (Timestamp Authority):

```
TSA URL: https://timestamp.sectigo.com/qualified
```

For `ADES_B_T`, `ADES_B_LT`, and `ADES_B_LTA` conformance levels, a qualified timestamp is mandatory. The timestamp is obtained via RFC 3161 (Time-Stamp Protocol) and embedded in the PAdES signature.

#### 26.6 RP Obligations for Signing

##### 26.6.1 QES_24a: The RP's Core Signing Obligation

QES_24a is the **only High-Level Requirement that directly obligates Relying Parties** in the context of document signing:

> **QES_24a**: "Relying Parties providing the Signature Creation Application in a Relying Party-centric flow SHALL support ETSI TS 119 101."

This means: if an RP operates in **Scenario C** (RP-channelled remote QES, §26.2.3), where the RP provides the SCA, it must comply with **ETSI TS 119 101** — the ETSI standard for policy and security requirements for signature creation and signature validation applications. This standard covers:

- Security requirements for the SCA implementation
- Policy requirements for signature creation operations
- Audit trail requirements for signing events
- Key management practices for the SCA's cryptographic operations
- User authentication requirements within the SCA

##### 26.6.2 When Is an RP "Providing" an SCA?

Art. 12(1) of CIR 2024/2979 states that SCAs may be "provided by a wallet provider, by a provider of qualified trust services, or by a **wallet-relying party**." An RP is "providing" an SCA when it:

1. **Orchestrates the signing flow** — selects the QTSP, manages the CSC API interaction, and controls the document flow (Scenario C)
2. **Hosts the document and hash computation** — the User's document is on the RP's infrastructure and the RP computes the hash
3. **Channels the authorization** — the RP mediates between the Wallet (for User auth) and the QTSP (for signing)

An RP is **not** providing an SCA when it merely redirects the User to a QTSP portal (Scenario A) or provides documents to the Wallet for the Wallet's own SCA to process (Scenario B).

##### 26.6.3 Free-of-Charge QES

Art. 11(3) of CIR 2024/2979 and QES_02 mandate that natural persons have **free-of-charge access** to QES for non-professional purposes. This obligation falls on **Wallet Providers**, not RPs. However, RPs should be aware that:

- They cannot charge end-users for the signing function itself in non-professional contexts
- The QTSP costs (certificate issuance, QSCD usage) are borne by the Wallet Provider, not the User
- RPs may still charge for the service that requires signing (e.g., the contract itself), but not for the signature creation

##### 26.6.4 What You See Is What You Sign (WYSIWYS)

QES_10 requires that when the SCA is part of the Wallet Unit, it presents the document representation to the User before signing. For RPs:

- In **Scenario A**: WYSIWYS is the QTSP's responsibility
- In **Scenario B**: WYSIWYS is the Wallet's responsibility — the Wallet displays the document before invoking CSC API
- In **Scenario C**: WYSIWYS is a **shared responsibility** — the RP provides the document, but the Wallet displays the signing context via `transaction_data` (§13.15.5). The `transaction_data` should include sufficient information for the User to identify what they are signing

#### 26.7 Trust Verification for QESRCs

##### 26.7.1 QTSP Qualification Verification

QES_15 requires that in remote signing scenarios, the Wallet verifies that the QESRC (Qualified Electronic Signature Remote Creation) Provider is part of a **qualified trust service**. This verification uses the same Trusted List infrastructure described in §4.5:

1. The Wallet obtains the RSSP's X.509 certificate from the `/info` or `/credentials/info` endpoint
2. The Wallet traces the certificate chain to a root CA
3. The Wallet checks whether the CA or the QTSP is listed in the relevant Member State's Trusted List as a **qualified** trust service provider for signature/seal creation
4. If the QTSP is not found in any Trusted List, the Wallet MUST reject the signing operation

##### 26.7.2 CIR 2025/1567: SSASP Conformance

QTSPs managing remote QSCDs must conform to **ETSI TS 119 431-1 V1.3.1** as adapted by CIR 2025/1567. Key adaptations include:

| Adaptation | Requirement |
|:-----------|:-----------|
| Cryptographic controls | Aligned with ENISA Agreed Cryptographic Mechanisms |
| Personnel controls | Regular training updates (at least every 12 months) on new threats |
| Network security | Quarterly vulnerability scans; firewalls configured to deny-all except required protocols |
| Termination plan | Must comply with implementing acts per Art. 24(5) of eIDAS |
| QSCD certification | Practice statement must reference QSCD certification per Regulation Annex II |

For RPs operating in Scenario C (RP-channelled) that select the QTSP, the RP should verify that the selected QTSP has been assessed and listed per these requirements. This is an operational due diligence obligation, not a protocol-level check.

##### 26.7.3 Multi-QTSP Considerations

QES_18 mandates that Wallet Providers configure at least one **default qualified signing service**. However, Users may have credentials at multiple QTSPs. RPs should be aware of:

- In **Scenario A/B**: The User or Wallet selects the QTSP — the RP has no control
- In **Scenario C**: The RP selects the QTSP — the RP must verify qualification
- No standardized **QTSP discovery protocol** exists — this is tracked as Open Question #23 in §29

#### 26.8 Transaction Logging for Signing

QES_13 requires that Wallet Units log all QES transactions, per DASH_04 (Topic 19). For signing transactions, the log must include:

| Field | Content | Source |
|:------|:--------|:------|
| Transaction type | "Signature creation" or "Seal creation" | QES_13 |
| Date/time | ISO 8601 timestamp of the signing event | DASH_04 |
| Document identifier | Document name, hash, or reference | QES_13 |
| QTSP identity | Name and certificate of the QTSP used | QES_13, QES_15 |
| Credential used | Credential ID and certificate subject | DASH_04 |
| Completion status | Success / failure / cancelled | DASH_04 |
| Signature format | PAdES, XAdES, etc. | Implementation detail |

CIR 2024/2979 Art. 9(1) confirms the scope: transactions shall include "electronic signing and sealing."

For RPs, the key implication is that **every signing request is permanently recorded** in the User's Wallet transaction log. As noted in Finding #22 (§27), this log is exportable and persists across Wallet migrations. Over-requesting or unnecessary signature creation attempts are discoverable by Users and auditors.

> **Cross-references**: §25 (Monitoring, Observability), §16 (RP Obligations — data deletion and DPA reporting).

---

## Synthesis and Conclusions

### 27. Findings

#### 27.1 Architectural Observations

1. **The RP integration surface is larger than anticipated.** An RP must integrate with at least 7 external systems: Registrar, Access CA, LoTE Provider, Wallet Units (via OpenID4VP or ISO 18013-5), Status Lists, and (optionally) Registration Certificate Provider and Registrar API. This creates a significant system integration burden.

2. **Two parallel credential format stacks create implementation complexity.** Supporting both SD-JWT VC (JSON/JWT-based) and mdoc (CBOR-based) requires two complete verification pipelines, including different selective disclosure models, different device binding verification, and different trust anchor formats.

3. **The trust model has no single point of failure but many points of coordination.** The LoTE/Trusted List hierarchy, certificate chain validation, revocation checking, and optionally registration certificate verification create a robust but operationally complex trust model.

4. **The RP's wallet integration infrastructure is a critical-path dependency that requires its own operational resilience planning.** The EUDI Wallet integration relies on continuous availability of multiple external services: LoTE/Trusted List endpoints (for trust anchor refresh), Status List endpoints (for revocation checking), the Registrar API (for Wallet-side RP verification), and — for the RP's own authentication — valid, non-expired WRPACs with current SCTs. Failure in any of these creates a hard stop: stale trust anchors may cause signature verification failures; expired or revoked WRPACs prevent all Wallet interactions; unreachable Status Lists block revocation checks. RPs should implement: (a) aggressive trust anchor caching with configurable refresh intervals and graceful degradation when endpoints are unreachable; (b) WRPAC renewal automation with expiry alerting well before the certificate validity window closes; (c) Status List response caching per the `max-age` Cache-Control header to reduce external dependency during verification; (d) fallback verification flows for scenarios where the primary EUDI Wallet channel is unavailable (e.g., alternative identity verification methods during outages). Financial-sector RPs subject to DORA (§18.4) must include these dependencies in their ICT risk management framework (DORA Art. 28) and digital resilience testing programme (DORA Art. 24).

5. **SCA via EUDI Wallet is a paradigm shift for banks.** Moving SCA from proprietary banking apps to an interoperable Wallet-based model requires re-architecting payment authentication flows, adapting to OpenID4VP-based SCA requests, and bridging Dynamic Linking into existing authorisation infrastructure.

6. **The intermediary model solves a real problem but creates trust complexity.** Intermediaries reduce the technical integration burden for smaller RPs but introduce a three-party trust model that requires careful handling of identity display, data forwarding, and no-storage constraints.

7. **Pseudonym support is non-trivial.** RPs must support four pseudonym use cases, implement WebAuthn-based pseudonym authentication, and ensure they never refuse pseudonyms where identification is not legally required.

8. **User sovereignty is deeply embedded.** Every flow gives the User override capability — even disclosure policy denials can be overridden. RPs must design their systems to handle partial approvals and User-initiated disclosures gracefully.

#### 27.2 Regulatory Observations

9. **GDPR compliance requires careful attention.** User approval in the Wallet is NOT GDPR consent. RPs must independently establish a lawful basis for processing before requesting attributes. This is a common misunderstanding.

10. **AML/KYC onboarding via EUDI Wallet is feasible but depends on attestation availability.** Basic CDD using PID attributes works well. Enhanced Due Diligence requires additional attestation types that may not be available in all Member States at launch.

11. **DORA creates additional operational requirements for financial RPs.** The EUDI Wallet integration infrastructure (endpoints, certificates, trust anchors) must be included in DORA-mandated resilience testing and incident reporting.

#### 27.3 Protocol and Implementation Observations

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

24. **Progressive assurance is the dominant real-world pseudonym pattern.** Most RPs will not require identity verification at pseudonym registration. Instead, they will register pseudonyms at LoA Low and upgrade via step-up verification (§14.13) when higher-assurance actions are needed. The pseudonym itself has no eIDAS LoA (Topic E, Requirement 8), but the RP account can carry an effective assurance level based on bound identity verification.

25. **Same-user binding across WebAuthn and OpenID4VP is solvable today, but imperfectly.** Session-based binding (§14.7.3, Strategies 1–3) provides reasonable assurance for same-device flows. Cryptographic binding (Strategy 4, ARF Topic K) would provide hardware-level guarantees but is not yet standardised.

26. **WebAuthn for pseudonyms is becoming optional.** PA_22 now uses MAY instead of SHALL. Wallet Providers can implement alternative pseudonym technologies, but no alternative is standardised yet. WebAuthn remains the only interoperable approach.

27. **Pseudonym keys live in the OS keystore, not the WSCA/WSCD.** This is a deliberate design: pseudonyms have no eIDAS LoA, so the full eIDAS trust chain (WSCA certification, LoA High) is not required. For RPs, pseudonym authentication provides phishing resistance and credential binding but not the same hardware-attested key protection as PID credentials.

28. **Account recovery for lost device-bound passkeys is a critical RP operational concern.** Device-bound passkeys are lost with the device. Synced passkeys survive device loss via cloud keychain, but Wallet Provider implementations vary. RPs must implement recovery flows (§14.11.2) using PID presentation as a one-time step-up.

#### 27.4 Signing and QES Observations

29. **QES is a significant gap in current RP integration planning.** Document signing is one of three core Wallet capabilities, but it operates on a different protocol stack (CSC API v2.0) than identification and presentation (OpenID4VP). RPs must plan for a separate integration workstream with distinct QTSP relationships, credential management, and signature format requirements.

30. **SCAL2 hash-binding creates a strong anti-substitution guarantee.** In SCAL2 (mandated by QES_23), the credential authorization is cryptographically bound to the specific document hashes being signed. The RSSP verifies that `signHash` is called with the same hashes that were authorized. RPs cannot substitute different documents after user authorization — a security property absent from traditional e-signing flows.

31. **The Document Retrieval protocol bridges RP-initiated signing and CSC API but is not yet standardized.** This EUDI-specific extension uses an OpenID4VP-like request/response pattern to communicate document locations from RP to Wallet. The reference implementation marks it with a deprecation warning ("may be removed in future versions"), creating integration risk for early adopters.

32. **The RP-channelled signing model places substantial regulatory obligations on the RP.** An RP acting as signing orchestrator (Scenario C) must implement a server-side CSC API v2.0 client, comply with ETSI TS 119 101 (SCA policy per QES_24a), and perform QTSP qualification due diligence — a fundamentally different operational profile than attribute verification.

### 28. Recommendations

#### 28.1 For All RPs

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
| 🟡 **High** | Implement progressive assurance (§14.13) as the default pseudonym onboarding pattern. Start with pseudonym-only registration, add identity verification only when needed. |
| 🟡 **High** | Use session-based + challenge-embedding binding (§14.7.3, Strategies 1+2) for all combined pseudonym + attribute flows. Do not rely solely on temporal proximity. |
| 🟡 **High** | Set `attestation: "none"` for all WebAuthn pseudonym registration ceremonies unless there is a documented regulatory need for authenticator attestation (§14.9). |
| 🟡 **High** | Store only verification *results* (`age_verified: true`), never raw PID attributes, in the pseudonym account record (§14.10). |
| 🟢 **Medium** | Support cross-device pseudonym flows (§14.14) by not restricting `authenticatorAttachment` to `"platform"`. |
| 🟢 **Medium** | Implement account recovery flows that accept PID presentation as a one-time step-up to re-bind a new pseudonym to an existing account (§14.11.2). |
| 🟢 **Medium** | Define `verification_expiry` policies for KYC-upgraded pseudonym accounts. Re-verify periodically or upon suspicious activity (§14.13.3). |
| 🟢 **Medium** | Handle representation attestations (parent/minor, power-of-attorney) as a distinct credential type with scope restrictions. (§15.6) |
| 🟡 **High** | Determine which signing flow pattern (QTSP web portal, wallet-channelled, RP-channelled) fits your use case. Most RPs should start with wallet-channelled (Scenario B). (§26.2) |
| 🟡 **High** | If implementing RP-channelled signing (Scenario C), ensure compliance with QES_24a (ETSI TS 119 101 for RP-provided SCAs). (§26.6) |
| 🟢 **Medium** | Implement PAdES signature validation (ETSI EN 319 102-1) for receiving signed documents from Wallets or QTSPs. PAdES is the only mandatory format. (§26.5) |
| 🟢 **Medium** | Monitor ARF Topic 37 for forthcoming QES remote signing technical requirements. The HLR section does not yet exist. (§26.1) |

#### 28.2 For Financial-Sector RPs (Banks, PSPs)

| Priority | Recommendation |
|:---------|:---------------|
| 🔴 **Critical** | Implement TS12 SCA flow including `transaction_data` and Dynamic Linking. |
| 🔴 **Critical** | Map EUDI Wallet SCA response to existing authorisation decision infrastructure. |
| 🔴 **Critical** | Implement CDD onboarding flow using PID + address attestation. |
| 🟡 **High** | Include EUDI Wallet integration in DORA digital resilience testing programme. |
| 🟡 **High** | Assess intermediary as ICT third-party service provider under DORA Art. 28–30. |
| 🟢 **Medium** | Prepare for Enhanced Due Diligence attestation types as MS ecosystems mature. |

#### 28.3 Implementation Checklist

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
| 25 | **Signing** | Determine signing flow pattern (web portal / wallet-channelled / RP-channelled) | §26.2 |
| 26 | **Signing** | If RP-channelled: implement server-side CSC API v2.0 client | §26.3 |
| 27 | **Signing** | Implement PAdES signature validation for incoming signed documents | §26.5 |
| 28 | **Signing (financial)** | Integrate QES with `transaction_data` for contract signing | §26.2.3, §13.15.5 |

### 29. Open Questions

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
| 17 | How should RPs handle Wallet Units that implement alternative (non-WebAuthn) pseudonym technologies under PA_22? Is there a negotiation protocol? | ARF Topic E, PA_22 | No standard yet — WebAuthn remains the only interoperable option |
| 18 | Should the RP's `assurance_level` be communicated to the Wallet Unit in subsequent authentication requests, enabling the Wallet to apply different policies? | §14.13 | Not addressed in ARF |
| 19 | Can the Digital Credentials API (§7, Model D) be used for pseudonym registration/authentication, given that it shares the `navigator.credentials` API surface with WebAuthn? | ARF Topic F | Unclear — Topic F defers to future work |
| 20 | How should RPs handle revocation of a PID used for step-up verification? Should the pseudonym account be automatically downgraded? | §14.13.3 | Policy decision — RP-specific |
| 21 | Document Retrieval protocol stability — will it be standardized or replaced by a different RP-to-Wallet document exchange mechanism? | eudi-lib-jvm-rqes-csc-kt | Marked as "may be removed in future versions" |
| 22 | ARF Topic 37 (QES Remote Signing Technical Requirements) — when will detailed HLRs be published? | ARF main doc (lines 433, 2956) | Placeholder heading — does not exist in HLR annex yet |
| 23 | Multi-QTSP discovery — is there a standardized protocol for RPs or Wallets to discover available QESRCs? | QES_18 | Only "default" QTSP is mandated; no discovery protocol specified |
| 24 | CSC API version pinning — will EU mandate exactly v2.0, or allow v2.1/v2.2 which add signDoc and polling? | CIR 2024/2979 Annex IV §3 | Currently pins "v2.0 (20 April 2023)" |

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
    actorMargin: 250
---
sequenceDiagram
    autonumber
    participant RP as 🏦 Relying Party
    participant Cache as 💾 RP Local Cache
    participant SL as 📋 Status List<br/>Endpoint

    rect rgba(148, 163, 184, 0.14)
    Note right of RP: Phase 1: Reference Extraction
    RP->>RP: Extract status reference<br/>from credential:<br/>status_list.uri + status_list.idx
    Note right of SL: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end

    rect rgba(52, 152, 219, 0.14)
    Note right of RP: Phase 2: Token Retrieval
    RP->>Cache: Check cache for<br/>Status List Token
    alt Cache hit and not expired
        Cache-->>RP: Return cached<br/>Status List Token
    else Cache miss or expired
        RP->>SL: GET {status_list.uri}
        Note right of RP: Accept: application/statuslist+jwt
        SL-->>RP: Status List Token (JWT)
        RP->>RP: Verify JWT signature<br/>(issuer signing key from LoTE)
        RP->>RP: Validate exp, iss, sub claims
        RP->>Cache: Store in cache<br/>(TTL from exp claim)
    Note right of SL: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
    Note right of SL: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end

    rect rgba(46, 204, 113, 0.14)
    Note right of RP: Phase 3: Bitstring Processing
    RP->>RP: Base64url-decode lst,<br/>DEFLATE-decompress
    RP->>RP: Extract bit at index {idx}
    Note right of RP: byte = decompressed[idx / 8]<br/>bit = (byte >> idx % 8) & 1
    Note right of SL: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end

    rect rgba(241, 196, 15, 0.14)
    Note right of RP: Phase 4: Status Decision
    alt Bit = 0
        RP->>RP: Credential VALID ✅
    else Bit ≠ 0
        RP->>RP: Credential REVOKED ❌<br/>Reject presentation
    Note right of SL: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
    Note right of SL: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
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

The RP queries its internal cache (Redis, in-memory LRU, or database) for a previously fetched Status List Token matching the `uri` (`https://pid-provider.example-ms.eu/status/lists/chunk-47`). The cache key is the full URI. This caching step is critical for performance — a high-traffic RP may verify thousands of credentials per hour, and each shares the same chunked Status List. Without caching, the RP would issue redundant HTTP requests to the PID Provider for every verification, adding latency and load.
</details>
<details><summary><strong>3. RP Cache returns cached Status List Token</strong></summary>

If the cache contains a token for this URI and its `exp` claim is still in the future, the RP uses it directly — skipping the HTTP fetch (steps 4–5) and JWT verification (step 6). The RP jumps straight to decompression (step 9). The `exp`-based TTL is typically 1–24 hours, set by the PID Provider to balance freshness against load. A shorter TTL means faster revocation propagation but more HTTP traffic; a longer TTL reduces load but delays revocation detection.

> **Cache miss**: If the cache does not contain a valid token (first request, or token expired), the RP proceeds to step 4 (HTTP fetch).
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

The RP confirms that the Status List Token's `exp` claim is in the future (`exp` > current Unix timestamp). If expired, the token is considered stale and the RP must re-fetch from the endpoint (step 4). The `iat` claim indicates when the PID Provider last regenerated the Status List — a large gap between `iat` and the current time (e.g., > 24 hours) may indicate the RP should consider a forced refresh even if `exp` hasn't been reached, depending on the RP's risk appetite.
</details>
<details><summary><strong>8. RP stores Status List Token in local cache</strong></summary>

The RP stores the validated Status List Token in its local cache, keyed by the `uri`. The cache TTL is derived from the token's `exp` claim (or the HTTP `Cache-Control: max-age` header, whichever is shorter). The RP may also store the decompressed bitstring alongside the JWT to avoid repeated DEFLATE decompression for subsequent verifications against the same chunk.
</details>
<details><summary><strong>9. RP decompresses lst bitstring (DEFLATE)</strong></summary>

The RP base64url-decodes the `lst` value from the Status List Token's `status_list` claim, then applies raw DEFLATE decompression (RFC 1951, no zlib/gzip wrapper). The result is a byte array where each credential's status occupies `bits` consecutive bits (typically `bits=1`: 1 bit per credential). For a chunk of 10,000 entries with `bits=1`, the decompressed bitstring is ~1,250 bytes. The compressed form is typically only a few hundred bytes — most credentials are valid (bit=0), so the bitstring compresses extremely well.
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

If the extracted status value is `0`, the credential is not revoked or suspended — the RP can proceed with the presentation. This status check is the final step in the verification pipeline (§9): issuer signature → disclosure integrity → holder binding (KB-JWT) → revocation status. All four must pass for the presentation to be accepted. The RP should log the verification result (timestamp, credential index, status = VALID) for audit purposes.
</details>
<details><summary><strong>12. RP rejects presentation — credential REVOKED (bit = 1)</strong></summary>

If the extracted status value is `1` (or any non-zero value for `bits=1`), the credential has been revoked or suspended by the PID Provider. The RP **MUST** reject the entire presentation — even if the issuer signature, disclosures, and KB-JWT are all valid. Common revocation reasons include: User-reported lost/stolen device, PID Provider-initiated suspension (e.g., identity fraud investigation), cascade revocation due to Wallet Unit compromise (CIR 2024/2977 Art. 5.4(b)), or credential expiry-forced revocation. The RP should return a generic error to the User (*"Credential could not be verified"*) without disclosing the specific revocation reason.
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

## 30. References

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

### Signing and Trust Service Standards


- [Cloud Signature Consortium API Specification v2.0 (CSC API)](https://cloudsignatureconsortium.org/resources/download-api-specifications/) — RESTful API for remote digital signing services; mandated by CIR 2024/2979 Annex IV §3 for integrated SCAs relying on remote QSCDs (§26)
- [ETSI TS 119 432 — Protocols for Remote Digital Signature Creation](https://www.etsi.org/deliver/etsi_ts/119400_119499/119432/) — Specifies protocols for remote signature creation, supporting XML (OASIS DSS-v2.0) and JSON (CSC API) bindings (§26)
- [ETSI TS 119 431-1 — TSP Service Components Operating a Remote QSCD](https://www.etsi.org/deliver/etsi_ts/119400_119499/11943101/) — Requirements for Trust Service Providers operating remote QSCDs; referenced by CIR 2025/1567 (§26)
- [ETSI TS 119 431-2 — TSP Service Components Supporting AdES Digital Signature Creation](https://www.etsi.org/deliver/etsi_ts/119400_119499/11943102/) — Requirements for TSP components creating AdES digital signatures (§26)
- [ETSI TS 119 101 — Policy and Security Requirements for SCAs](https://www.etsi.org/deliver/etsi_ts/119100_119199/119101/) — Policy requirements for signature creation and validation applications; mandated for RP-provided SCAs by QES_24a (§26)
- [CEN EN 419 241-1 — Trustworthy Systems Supporting Server Signing](https://standards.cencenelec.eu/) — Defines Sole Control Assurance Levels (SCAL1/SCAL2) for remote signing; SCAL2 mandated by QES_23 (§26)
- [ETSI EN 319 142-1 — PAdES Digital Signatures](https://www.etsi.org/deliver/etsi_en/319100_319199/31914201/) — PDF Advanced Electronic Signatures; mandatory format per CIR 2024/2979 Annex IV §1 (§26)
- [Commission Implementing Regulation (EU) 2025/1567 — Remote QSCD Management](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32025R1567) — Standards for managing remote QSCDs as qualified trust services (§26)

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
