---
title: "PII Protection in REST API Design — GDPR-Compliant Patterns for URL Payloads and Beyond"
dr_id: DR-0005
status: published
authors:
  - name: Ivan Stambuk
date_created: 2026-04-08
date_updated: 2026-04-08
tags: [gdpr, pii, rest-api, encryption, tokenization, pseudonymization, fpe, owasp, data-protection, auditability, key-management, right-to-erasure]
related: []
reader_allow_h3_chapter_split: false
---

<!-- AUTO-GENERATED FROM src/papers/DR-0005/DR-0005-pii-protection-rest-api-design.mdx. DO NOT EDIT. -->

# PII Protection in REST API Design: GDPR-Compliant Patterns for URL Payloads and Beyond
**DR-0005** · Published · Created 2026-04-08

> Exhaustive investigation of patterns, techniques, and commercial solutions for protecting Personally Identifiable Information (PII) in REST API design, with a focus on GDPR compliance. Covers the problem of PII leakage through URL query parameters and path segments — a vulnerability recognized by OWASP (CWE-598, ASVS §9.3) and addressed by GDPR Article 32's mandate for pseudonymisation and encryption. Analyzes five categories of protection patterns: architectural (POST body migration, header-based placeholders, opaque identifiers, session-based resolution, single-use tokens), cryptographic (JWE, Format-Preserving Encryption, deterministic AES, searchable encryption, envelope encryption), pseudonymization and tokenization (vault-based, vaultless, client-side, k-anonymity), infrastructure and operational (gateway log redaction, real-time PII scanning, cache-control), and protocol-level (HTTP message signing, mTLS, Pushed Authorization Requests). Includes vendor deep-dives on 12+ products (HashiCorp Vault, Thales CipherTrust, Protegrity, VGS, Skyflow, Google Cloud DLP, Azure APIM, AWS, Cequence, Fortanix, Pangea, Protecto) with a build-vs-buy decision framework. Covers auditability and governance: audit trails for cryptographic operations, key management with separation of duties, centralized decryption authority, right to erasure in encrypted contexts (GDPR Article 17), and call-chain traceability with distributed tracing. Maps to GDPR Articles 5, 17, 25, 32, EDPB Guidelines 01/2025 on pseudonymisation, NIST SP 800-122, and OWASP standards.

---

## Table of Contents

- [Reader Orientation](#reader-orientation)
  - [Reading Guide](#reading-guide)
  - [Executive Decision Summary](#executive-decision-summary)
- [Context and Scope](#context-and-scope)
  - [Why This Document Exists](#why-this-document-exists)
  - [In Scope](#in-scope)
  - [Out of Scope](#out-of-scope)
- [Part I: Foundations](#part-i-foundations)
  - [1. Introduction and Problem Definition](#1-introduction-and-problem-definition)
  - <details><summary><a href="#2-regulatory-landscape">2. Regulatory Landscape</a></summary>

    - [§2.1 Article 32: Security of Processing](#21-article-32-security-of-processing)
    - [§2.1.1 The Risk-Based Approach](#211-the-risk-based-approach)
    - [§2.1.2 What Constitutes "Appropriate" Security for URL-Borne PII](#212-what-constitutes-appropriate-security-for-url-borne-pii)
    - [§2.1.3 Application to Data Controllers and Data Processors](#213-application-to-data-controllers-and-data-processors)
    - [§2.1.4 Completeness: Article 32(1)(b)–(d)](#214-completeness-article-321bd)
    - [§2.2 Article 25: Data Protection by Design and Default](#22-article-25-data-protection-by-design-and-default)
    - [§2.2.1 Article 25(1): Data Protection by Design](#221-article-251-data-protection-by-design)
    - [§2.2.2 Article 25(2): Data Protection by Default](#222-article-252-data-protection-by-default)
    - [§2.2.3 Privacy Impact Assessment (DPIA) Requirements](#223-privacy-impact-assessment-dpia-requirements)
    - [§2.3 Article 17: Right to Erasure](#23-article-17-right-to-erasure)
    - [§2.3.1 The Right and Its Scope](#231-the-right-and-its-scope)
    - [§2.3.2 Exceptions and Their API Design Implications](#232-exceptions-and-their-api-design-implications)
    - [§2.3.3 Encrypted Personal Data Remains Personal Data](#233-encrypted-personal-data-remains-personal-data)
    - [§2.4 EDPB Guidelines 01/2025 on Pseudonymisation](#24-edpb-guidelines-012025-on-pseudonymisation)
    - [§2.4.1 Key Definition: Pseudonymisation Under Article 4(5)](#241-key-definition-pseudonymisation-under-article-45)
    - [§2.4.2 Pseudonymisation Domain](#242-pseudonymisation-domain)
    - [§2.4.3 Techniques for Pseudonymisation](#243-techniques-for-pseudonymisation)
    - [§2.4.4 Quasi-Identifiers and the Limits of Pseudonymisation](#244-quasi-identifiers-and-the-limits-of-pseudonymisation)
    - [§2.4.5 Pseudonymisation as a Security Measure Under Article 32](#245-pseudonymisation-as-a-security-measure-under-article-32)
    - [§2.4.6 Distinction from Anonymisation](#246-distinction-from-anonymisation)
    - [§2.5 NIST and OWASP Standards](#25-nist-and-owasp-standards)
    - [§2.5.1 NIST SP 800-122: Guide to Protecting the Confidentiality of PII](#251-nist-sp-800-122-guide-to-protecting-the-confidentiality-of-pii)
    - [§2.5.2 OWASP ASVS v4.0.3: Sensitive Data in HTTP Requests](#252-owasp-asvs-v403-sensitive-data-in-http-requests)
    - [§2.5.3 CWE-598 and OWASP Query String Exposure](#253-cwe-598-and-owasp-query-string-exposure)
    - [§2.5.4 Synthesis: Standards Alignment](#254-synthesis-standards-alignment)
    - [§2.6 Adjacent Regulatory Frameworks](#26-adjacent-regulatory-frameworks)
    - [§2.6.1 ePrivacy Directive (2002/58/EC)](#261-eprivacy-directive-200258ec)
    - [§2.6.2 NIS2 Directive (Directive (EU) 2022/2555)](#262-nis2-directive-directive-eu-20222555)
    - [§2.6.3 DORA (Regulation (EU) 2022/2554)](#263-dora-regulation-eu-20222554)
    - [§2.6.4 PCI DSS v4.0](#264-pci-dss-v40)
    - [§2.6.5 Summary Table](#265-summary-table)
    </details>

- [Part II: Protection Patterns](#part-ii-protection-patterns)
  - <details><summary><a href="#3-architectural-patterns">3. Architectural Patterns</a></summary>

    - [§3.1 POST Body Migration](#31-post-body-migration)
    - [§3.2 Header-Based Placeholders](#32-header-based-placeholders)
    - [§3.3 Opaque Internal Identifiers](#33-opaque-internal-identifiers)
    - [§3.4 Session-Based Resolution](#34-session-based-resolution)
    - [§3.5 Temporary Single-Use Tokens](#35-temporary-single-use-tokens)
    - [§3.6 Comparative Analysis: Architectural Patterns](#36-comparative-analysis-architectural-patterns)
    </details>

  - <details><summary><a href="#4-cryptographic-patterns">4. Cryptographic Patterns</a></summary>

    - [§4.1 JWT/JWE Encrypted Parameters](#41-jwtjwe-encrypted-parameters)
    - [§4.2 Format-Preserving Encryption (FPE)](#42-format-preserving-encryption-fpe)
    - [§4.3 Deterministic AES Encryption](#43-deterministic-aes-encryption)
    - [§4.4 Searchable Encryption](#44-searchable-encryption)
    - [§4.5 Envelope Encryption](#45-envelope-encryption)
    - [§4.6 Client-Side Encryption](#46-client-side-encryption)
    - [§4.7 Session-Bound Symmetric Key Distribution](#47-session-bound-symmetric-key-distribution)
    - [§4.8 Comparative Analysis: Cryptographic Patterns](#48-comparative-analysis-cryptographic-patterns)
    </details>

  - <details><summary><a href="#5-pseudonymization-and-tokenization-patterns">5. Pseudonymization and Tokenization Patterns</a></summary>

    - [§5.1 Pseudonymization and Tokenization: Concepts and GDPR Spectrum](#51-pseudonymization-and-tokenization-concepts-and-gdpr-spectrum)
    - [§5.2 Component Architecture: Tokenization Building Blocks](#52-component-architecture-tokenization-building-blocks)
    - [§5.3 Vault-Based Tokenization](#53-vault-based-tokenization)
    - [§5.4 Vaultless Tokenization](#54-vaultless-tokenization)
    - [§5.5 Client-Side Pseudonymization](#55-client-side-pseudonymization)
    - [§5.6 K-Anonymity and Generalization](#56-k-anonymity-and-generalization)
    - [§5.7 Product Landscape: Tokenization and Pseudonymization Platforms](#57-product-landscape-tokenization-and-pseudonymization-platforms)
    - [§5.8 Comparative Analysis: Pseudonymization vs. Encryption vs. Anonymization](#58-comparative-analysis-pseudonymization-vs-encryption-vs-anonymization)
    </details>

  - <details><summary><a href="#6-infrastructure-and-operational-patterns">6. Infrastructure and Operational Patterns</a></summary>

    - [§6.1 API Gateway Log Redaction](#61-api-gateway-log-redaction)
    - [§6.2 Cache-Control and Browser-Directed Protections](#62-cache-control-and-browser-directed-protections)
    - [§6.3 Real-Time PII Scanning and Masking](#63-real-time-pii-scanning-and-masking)
    - [§6.4 Proxy-Level Data Masking](#64-proxy-level-data-masking)
    - [§6.5 Response-Side PII Leakage](#65-response-side-pii-leakage)
    - [§6.6 Client-Side PII Leak Surfaces](#66-client-side-pii-leak-surfaces)
    </details>

  - <details><summary><a href="#7-design-time-api-governance-and-contract-enforcement">7. Design-Time API Governance and Contract Enforcement</a></summary>

    - [§7.1 OpenAPI Specification-Level Controls](#71-openapi-specification-level-controls)
    - [§7.2 Linting Rules for PII in URLs](#72-linting-rules-for-pii-in-urls)
    - [§7.3 CI/CD Policy Gates](#73-cicd-policy-gates)
    - [§7.4 API Inventory and Deprecation Discipline](#74-api-inventory-and-deprecation-discipline)
    - [§7.5 Exception Handling and Approval Workflows](#75-exception-handling-and-approval-workflows)
    - [§7.6 Summary](#76-summary)
    </details>

  - <details><summary><a href="#8-protocol-and-deployment-contexts">8. Protocol and Deployment Contexts</a></summary>

    - [§8.1 HTTP Message Signing](#81-http-message-signing)
    - [§8.2 Mutual TLS for Identity](#82-mutual-tls-for-identity)
    - [§8.3 OAuth 2.0 Pushed Authorization Requests (RFC 9126)](#83-oauth-20-pushed-authorization-requests-rfc-9126)
    - [§8.4 Other Protocols, Deployment Models, and Pattern Selection](#84-other-protocols-deployment-models-and-pattern-selection)
    </details>

- [Part III: Implementation and Migration](#part-iii-implementation-and-migration)
  - <details><summary><a href="#9-migration-playbook-for-existing-apis">9. Migration Playbook for Existing APIs</a></summary>

    - [§9.1 Migration Principles](#91-migration-principles)
    - [§9.2 Inventory and Risk Classification](#92-inventory-and-risk-classification)
    - [§9.3 Measure Live Usage and Consumer Dependency](#93-measure-live-usage-and-consumer-dependency)
    - [§9.4 Design the Replacement Contract](#94-design-the-replacement-contract)
    - [§9.5 Return Opaque IDs and Run a Dual-Path Transition](#95-return-opaque-ids-and-run-a-dual-path-transition)
    - [§9.6 Deprecation, Sunset, and Consumer Communication](#96-deprecation-sunset-and-consumer-communication)
    - [§9.7 Rollout, Monitoring, and Breakage Control](#97-rollout-monitoring-and-breakage-control)
    - [§9.8 Historical Log and Observability Cleanup](#98-historical-log-and-observability-cleanup)
    - [§9.9 Cutover and Legacy Removal](#99-cutover-and-legacy-removal)
    - [§9.10 Migration Verification Checklist](#910-migration-verification-checklist)
    </details>

- [Part IV: Platforms and Vendor Reference](#part-iv-platforms-and-vendor-reference)
  - <details><summary><a href="#10-tokenization-and-encryption-platforms">10. Tokenization and Encryption Platforms</a></summary>

    - [§10.1 HashiCorp Vault Enterprise: Transform Secrets Engine](#101-hashicorp-vault-enterprise-transform-secrets-engine)
    - [§10.2 Thales CipherTrust Tokenization](#102-thales-ciphertrust-tokenization)
    - [§10.3 Protegrity Data Security Platform](#103-protegrity-data-security-platform)
    - [§10.4 Skyflow Data Privacy Vault](#104-skyflow-data-privacy-vault)
    - [§10.5 Pangea Vault Service](#105-pangea-vault-service)
    </details>

  - <details><summary><a href="#11-cloud-native-and-api-gateway-solutions">11. Cloud-Native and API Gateway Solutions</a></summary>

    - [§11.1 Google Cloud: Sensitive Data Protection](#111-google-cloud-sensitive-data-protection)
    - [§11.2 Microsoft Azure: API Management (APIM)](#112-microsoft-azure-api-management-apim)
    - [§11.3 Amazon Web Services: Composite PII Protection](#113-amazon-web-services-composite-pii-protection)
    - [§11.4 Cross-Cloud Provider Comparison](#114-cross-cloud-provider-comparison)
    - [§11.5 Cequence API Security: Inline Security Proxy](#115-cequence-api-security-inline-security-proxy)
    - [§11.6 Fortanix Data Security Manager (DSM): Multi-Cloud Cryptographic Platform](#116-fortanix-data-security-manager-dsm-multi-cloud-cryptographic-platform)
    </details>

  - <details><summary><a href="#12-build-vs-buy-decision-framework">12. Build-vs-Buy Decision Framework</a></summary>

    - [§12.1 Decision Overview](#121-decision-overview)
    - [§12.2 When to Build](#122-when-to-build)
    - [§12.3 When to Buy](#123-when-to-buy)
    - [§12.4 Hybrid Approaches](#124-hybrid-approaches)
    - [§12.5 Cost Analysis (Total Cost of Ownership)](#125-cost-analysis-total-cost-of-ownership)
    </details>

- [Part V: Governance, Auditability, and Operating Model](#part-v-governance-auditability-and-operating-model)
  - <details><summary><a href="#13-audit-trails-for-cryptographic-operations">13. Audit Trails for Cryptographic Operations</a></summary>

    - [§13.1 Minimum Audit Data](#131-minimum-audit-data)
    - [§13.2 Correlated Audit Trail: Sequence Walkthrough](#132-correlated-audit-trail-sequence-walkthrough)
    - [§13.3 Immutability and Tamper Evidence](#133-immutability-and-tamper-evidence)
    - [§13.4 SIEM Integration and Alerting](#134-siem-integration-and-alerting)
    - [§13.5 Vendor Audit Capabilities](#135-vendor-audit-capabilities)
    </details>
  - <details><summary><a href="#14-key-management-and-governance">14. Key Management and Governance</a></summary>

    - [§14.1 Key Lifecycle](#141-key-lifecycle)
    - [§14.2 Key Access Control](#142-key-access-control)
    - [§14.3 Centralized Decryption Authority](#143-centralized-decryption-authority)
    - [§14.4 Break-Glass Procedures](#144-break-glass-procedures)
    - [§14.5 HSM vs. Software Key Management](#145-hsm-vs-software-key-management)
    - [§14.6 Cloud KMS Platform Comparison](#146-cloud-kms-platform-comparison)
    </details>
  - <details><summary><a href="#15-right-to-erasure-in-encrypted-contexts">15. Right to Erasure in Encrypted Contexts</a></summary>

    - [§15.1 The GDPR Erasure Challenge](#151-the-gdpr-erasure-challenge)
    - [§15.2 Crypto Shredding](#152-crypto-shredding)
    - [§15.3 Backup and Retention Conflicts](#153-backup-and-retention-conflicts)
    - [§15.4 Tokenization Vault Cleanup](#154-tokenization-vault-cleanup)
    - [§15.5 Practical Erasure Checklist](#155-practical-erasure-checklist)
    - [§15.6 Design Patterns for Erasure-Friendly Architecture](#156-design-patterns-for-erasure-friendly-architecture)
    </details>

  - <details><summary><a href="#16-call-chain-traceability">16. Call-Chain Traceability</a></summary>

    - [§16.1 The Observability-Privacy Tension](#161-the-observability-privacy-tension)
    - [§16.2 Privacy-Preserving Trace Design](#162-privacy-preserving-trace-design)
    - [§16.3 Correlation ID Strategies](#163-correlation-id-strategies)
    - [§16.4 GDPR-Compliant Observability Stack](#164-gdpr-compliant-observability-stack)
    - [§16.5 Data Subject Access Request (DSAR) Trace Reconstruction](#165-data-subject-access-request-dsar-trace-reconstruction)
  </details>

- [Part VI: Synthesis](#part-vi-synthesis)

  - <details><summary><a href="#17-owasp-asvs-and-cwe-synthesis">17. OWASP, ASVS, and CWE Synthesis</a></summary>

    - [§17.1 Primary Vulnerability Class: Sensitive Data in URL Channels](#171-primary-vulnerability-class-sensitive-data-in-url-channels)
    - [§17.2 Control Mapping Across the Document](#172-control-mapping-across-the-document)
    - [§17.3 Adjacent API Security Concerns](#173-adjacent-api-security-concerns)
    - [§17.4 Operationalizing the Standards Mapping](#174-operationalizing-the-standards-mapping)
    </details>

  - <details><summary><a href="#18-findings">18. Findings</a></summary>

    - [F1. The default answer is architectural removal of PII from URLs, not harder protection of bad URLs](#f1-the-default-answer-is-architectural-removal-of-pii-from-urls-not-harder-protection-of-bad-urls)
    - [F2. Opaque IDs, POST-body lookup, and single-use tokens cover most primary remediation needs](#f2-opaque-ids-post-body-lookup-and-single-use-tokens-cover-most-primary-remediation-needs)
    - [F3. Migration is a first-class architecture problem, not a cleanup appendix](#f3-migration-is-a-first-class-architecture-problem-not-a-cleanup-appendix)
    - [F4. Protocol and deployment mechanisms are bounded adjacent controls, not the main solution](#f4-protocol-and-deployment-mechanisms-are-bounded-adjacent-controls-not-the-main-solution)
    - [F5. Cryptographic and tokenization patterns are mainly compatibility tools once the architecture is constrained](#f5-cryptographic-and-tokenization-patterns-are-mainly-compatibility-tools-once-the-architecture-is-constrained)
    - [F6. Pseudonymization and encryption remain fully inside the GDPR problem space](#f6-pseudonymization-and-encryption-remain-fully-inside-the-gdpr-problem-space)
    - [F7. Vendor and cloud platforms accelerate implementation, but they do not decide the architecture](#f7-vendor-and-cloud-platforms-accelerate-implementation-but-they-do-not-decide-the-architecture)
    - [F8. Build-vs-buy is usually a downstream hybrid decision rather than a binary ideology](#f8-build-vs-buy-is-usually-a-downstream-hybrid-decision-rather-than-a-binary-ideology)
    - [F9. Once decryption exists, centralized authority, auditability, and key lifecycle become the real trust boundary](#f9-once-decryption-exists-centralized-authority-auditability-and-key-lifecycle-become-the-real-trust-boundary)
    - [F10. Observability is a parallel exposure plane that can silently undo the main design](#f10-observability-is-a-parallel-exposure-plane-that-can-silently-undo-the-main-design)
    - [F11. Erasure capability depends on key and token lifecycle design, not on policy statements](#f11-erasure-capability-depends-on-key-and-token-lifecycle-design-not-on-policy-statements)
    - [F12. Break-glass and exceptional access paths must be designed as part of the system, not bolted on later](#f12-break-glass-and-exceptional-access-paths-must-be-designed-as-part-of-the-system-not-bolted-on-later)
    </details>

  - <details><summary><a href="#19-recommendations">19. Recommendations</a></summary>

    - [For API Architects and Developers](#for-api-architects-and-developers)
    - [For Security Engineers](#for-security-engineers)
    - [For Compliance Officers and Data Protection Officers](#for-compliance-officers-and-data-protection-officers)
    - [For Engineering Leadership](#for-engineering-leadership)
    </details>

  - <details><summary><a href="#20-open-questions">20. Open Questions</a></summary>

    - [Q1. How will post-quantum cryptography affect PII protection at the API layer?](#q1-how-will-post-quantum-cryptography-affect-pii-protection-at-the-api-layer)
    - [Q2. What is the DPA enforcement trajectory for PII in URLs?](#q2-what-is-the-dpa-enforcement-trajectory-for-pii-in-urls)
    - [Q3. Can FPE achieve broader industry adoption despite its known weaknesses?](#q3-can-fpe-achieve-broader-industry-adoption-despite-its-known-weaknesses)
    - [Q4. How should tokenization mapping tables be handled under cross-border data transfers?](#q4-how-should-tokenization-mapping-tables-be-handled-under-cross-border-data-transfers)
    - [Q5. What is the right granularity for key isolation in support of right-to-erasure?](#q5-what-is-the-right-granularity-for-key-isolation-in-support-of-right-to-erasure)
    - [Q6. How will AI-assisted PII detection change the infrastructure landscape?](#q6-how-will-ai-assisted-pii-detection-change-the-infrastructure-landscape)
    - [Q7. Is there a viable standard for cross-cloud key management?](#q7-is-there-a-viable-standard-for-cross-cloud-key-management)
    - [Q8. What audit log retention period satisfies both GDPR and sector-specific regulations?](#q8-what-audit-log-retention-period-satisfies-both-gdpr-and-sector-specific-regulations)
    - [Q9. How should data subject access requests be fulfilled for encrypted data at scale?](#q9-how-should-data-subject-access-requests-be-fulfilled-for-encrypted-data-at-scale)
    - [Q10. Will HTTP message signing (RFC 9421) complement or replace encryption for API parameter integrity?](#q10-will-http-message-signing-rfc-9421-complement-or-replace-encryption-for-api-parameter-integrity)
    </details>

---

## Reader Orientation

---

### Reading Guide

This document is intended to function as a **comprehensive reference** for API teams dealing with personal data exposure through URLs and adjacent request/response/observability surfaces. It is not optimized only for linear reading. Different readers should start in different places.

| Sections | Theme | Best For |
|:---------|:------|:---------|
| **§1–§2** | Problem definition, GDPR, standards, and regulatory baseline | **Architects**, **security engineers**, **privacy/compliance**, and decision-makers who need the policy and risk foundation |
| **§3–§5** | Core remediation patterns: architectural, cryptographic, tokenization, and pseudonymization | **API architects** and **backend engineers** choosing the primary protection model |
| **§6–§8** | Operational controls, design-time governance, and protocol/deployment contexts | **Platform teams**, **security engineers**, and teams implementing enforcement around live APIs |
| **§9** | Migration and remediation of existing APIs | **Engineering leadership**, **program owners**, and teams fixing live systems |
| **§10–§16** | Vendor platforms, build-vs-buy, auditability, key governance, erasure, and traceability | **Platform owners**, **security architecture**, **compliance**, and **engineering leadership** |
| **§17–§20** | Standards synthesis, findings, recommendations, and open questions | **Decision-makers** and teams synthesizing the document into action |

**Persona-based reading paths:**

| Persona | Start Here | Then Read | Finally |
|:--------|:-----------|:----------|:--------|
| **API Architect** | **§3 Architectural Patterns** | §3.6 comparison → §5 tokenization → §9 migration | §19 recommendations |
| **Backend Engineer** | §3.1 POST body migration → §3.3 opaque IDs | §6 operational controls → §7 design-time governance | §8 protocol contexts |
| **Security Engineer** | §2.5 standards alignment → §6 infrastructure controls | §7 governance → §13 audit trails → §16 traceability → §17 synthesis | §18 findings |
| **Platform / Gateway Team** | §6 operational patterns | §7 governance → §11 cloud/API gateway solutions | §9 migration |
| **Privacy / Compliance / DPO** | §2 regulatory landscape | §5 pseudonymization → §15 erasure → §16 traceability → §17 synthesis | §18 findings → §19 recommendations |
| **Engineering Leadership** | **Executive Decision Summary** | §12 build-vs-buy → §9 migration playbook → §17 synthesis | §19 recommendations |

If you already have live APIs exposing personal data in URLs, skip directly to **§9 Migration Playbook for Existing APIs**, then return to **§3** and **§7** for the default target state.

A practical way to use this reference is:

1. Choose the main contract or transformation pattern in **§3–§5**.
2. Read **§7** for design-time enforcement and **§9** for rollout if the problem exists in production already.
3. Read only the relevant supporting chapters in **§10–§16** based on what your chosen pattern implies operationally.
4. End with **§17–§20** for the standards map, synthesized findings, recommendations, and unresolved questions.

---

### Executive Decision Summary

This document's central conclusion is straightforward: **the default answer is to stop placing personal data in URLs, not to become better at protecting bad URLs.** The strongest designs remove personal data from path segments and query strings entirely, then reinforce that decision with governance, migration discipline, and operational controls.

#### Top Design Decisions

1. **Default to opaque internal identifiers.** Treat opaque IDs as the greenfield baseline for resource references and object lookup continuity (§3.3).
2. **Use POST bodies for lookup-by-PII workflows.** When a caller must submit personal data to find or verify something, move that data into the request body, return opaque IDs, and switch subsequent reads back to safe identifiers (§3.1).
3. **Use single-use or short-lived tokens for bounded link workflows.** Password reset, magic links, and email verification should not expose reusable personal data in the URL (§3.5).
4. **Treat cryptographic URL protection as legacy accommodation, not greenfield default.** JWE, FPE, deterministic encryption, and tokenization are valuable when migration or schema constraints force them, but they should not replace simpler clean designs where clean designs are possible (§4, §5).
5. **Assume leak surfaces extend beyond the request URL.** Responses, logs, traces, analytics systems, browser storage, and error channels can re-expose the same data if the architecture is careless (§6, §13, §16).
6. **Use protocol mechanisms only for bounded adjacent problems.** HTTP Message Signing helps request integrity, PAR protects browser-visible OAuth parameters, and mTLS helps in B2B/M2M identity-bound scenarios. None of these is the general default answer to business-data PII in URLs (§8).
7. **Enforce the design at contract time, not only at incident time.** API contracts, linting, CI gates, inventory discipline, exception workflows, and migration governance are required to keep the problem from reappearing (§7, §9).
8. **Plan remediation for existing APIs explicitly.** The hard part is rarely inventing the safe design; the hard part is migrating live consumers, deprecating bad endpoints, and cleaning up historical observability artifacts (§9).
9. **Keep governance and operating model aligned with the design choice.** Centralized decryption authority, key governance, auditability, erasure capability, and traceability should support the main remediation pattern rather than pull the document away from it (§13–§16).

---

## Context and Scope

---

### Why This Document Exists

API teams often treat personal data in URLs as a narrow implementation mistake. It is not. It is a recurring architectural failure mode with legal, operational, and forensic consequences. TLS protects the request while it is in transit, but it does not stop the URL from appearing in logs, browser history, analytics tools, tracing systems, support tools, and downstream integrations once the request is processed.

This document exists to give teams a **reference-grade design and remediation guide** for that problem. It is written for readers who may be designing a greenfield API, operating a gateway estate, migrating a legacy platform, evaluating a tokenization vendor, or trying to satisfy GDPR obligations under real operational constraints.

---

### In Scope

- REST API exposure of personal data in query parameters and path segments
- adjacent leak surfaces tied to the same design mistake, including responses, client-side artifacts, logs, traces, analytics, and operational tooling
- default architectural remediation patterns
- cryptographic, tokenization, and pseudonymization approaches where they are justified
- design-time governance, migration, deprecation, and API inventory discipline
- auditability, key governance, erasure, and traceability concerns that materially affect the architecture
- vendor/platform/build-vs-buy analysis relevant to implementing these controls in practice
- protocol and deployment contexts that materially change how the leakage problem appears or is mitigated

---

### Out of Scope

- general-purpose authentication architecture except where it directly affects PII exposure in URLs or adjacent API surfaces
- exhaustive treatment of non-HTTP protocols when they do not materially illuminate the URL leakage problem
- broad privacy program governance not tied to API design, transport, storage, observability, or remediation decisions
- replacing service-specific legal advice; this document provides design and standards analysis, not jurisdiction-specific legal counsel

# Part I: Foundations

---

## 1. Introduction and Problem Definition

A REST API endpoint that accepts an email address as a query parameter is, by most measures, a routine design choice. The URL `GET /api/users?email=alice@example.com` follows the pattern that every introductory REST tutorial teaches: resources are identified by URLs, and query parameters filter them. Yet this single design decision creates a data-protection liability that persists long after the HTTP response has been sent. The email address — personally identifiable information (PII) under the GDPR — will appear, in cleartext, in server access logs, proxy logs, browser history, referrer headers, analytics platforms, and any number of intermediary systems that the developer never intended to be data stores.

```mermaid
flowchart LR
    subgraph client ["Client-Side Exposure"]
        direction TB
        BH["Browser&nbsp;History"]
        EH["Email&nbsp;Links&nbsp;/&nbsp;Chat"]
        RH["Referer&nbsp;Header&nbsp;→&nbsp;Next&nbsp;Site"]
    end

    subgraph transit ["Network Exposure"]
        direction TB
        TLS["TLS&nbsp;protects&nbsp;in-transit"]
        FW["Forwarded&nbsp;Logs&nbsp;→&nbsp;Downstream"]
    end

    subgraph server ["Server-Side Exposure"]
        direction TB
        SL["Server&nbsp;Access&nbsp;Logs"]
        PL["Proxy&nbsp;/&nbsp;CDN&nbsp;Logs"]
        AP["Analytics&nbsp;Platforms"]
        SIEM["SIEM&nbsp;/&nbsp;Log&nbsp;Aggregator"]
    end

    REQ["`**GET /api/users?email=alice@example.com**`"]
    REQ --> client
    REQ --> transit
    REQ --> server

```

This is not a theoretical risk. It is a well-documented weakness catalogued by both the security and privacy communities.

---

### Default Design Rules

Before the detailed analysis, the following rules represent the opinionated default guidance for API designers. Each rule is derived from and justified by the analysis in subsequent chapters.

1. **Do not place personal data in URL path or query parameters.** Use opaque internal identifiers instead (§3.3).
2. **For search/lookup by personal data, use POST request bodies.** Return opaque identifiers and switch subsequent reads back to GET (§3.1).
3. **Use single-use or short-lived tokens for bounded link workflows** — email verification, password reset, magic links (§3.5).
4. **Treat encryption and tokenization in URLs as legacy accommodation, not greenfield default.** FPE, JWE, and vault-based tokenization are powerful but add complexity that is unnecessary when opaque identifiers suffice (§4, §5).
5. **Use mTLS, PAR, and HTTP Message Signing only where they solve a clearly bounded adjacent problem** — B2B identity, OAuth parameter protection, request integrity (§8).
6. **Enforce all of these at design time** via API contracts, linting rules, CI gates, and review processes.
7. **Remember that pseudonymised and encrypted data remains personal data under GDPR.** Tokenization and encryption reduce risk but do not remove compliance obligations (§2.3.3, F3).
8. **Audit observability pipelines for re-exposure.** Logs, traces, analytics, and error responses can reintroduce the PII that encryption was supposed to protect (§6, §16, F8).

---

### URL and API Exposure Surface Taxonomy

The design failure discussed in this document should not be modeled as "PII in query strings" only. The real problem is broader: a single bad identifier choice in the request path can cascade into multiple downstream leak surfaces across the application, browser, and operating environment.

| Surface | Typical leak path | Why it matters | Primary control families |
|:--------|:------------------|:---------------|:-------------------------|
| **Request URL** | Query parameters, path segments, reverse-proxy access logs, CDN logs | The URL is the most broadly propagated artifact in HTTP systems | Opaque IDs, POST body migration, single-use tokens, bounded protocol controls |
| **Browser-visible navigation** | Address bar, history, bookmarks, copied links, referer propagation | User-side tooling and browser behavior can preserve data far beyond the API request itself | Remove PII from navigable URLs, use POST, avoid sharing workflows that expose identifiers |
| **Response and error payloads** | API responses, debug pages, validation errors, support screenshots | Teams often fix the request URL but reintroduce the same data in responses | Response minimization, error hygiene, masking, cache-control, client-side review |
| **Client-side instrumentation** | Analytics SDKs, session replay, frontend logging, browser storage | Frontend telemetry can become a shadow data lake for the same personal data | Client-side redaction, SDK review, storage minimization, CSP-aware telemetry design |
| **Server and platform observability** | Application logs, gateway logs, traces, SIEM pipelines, alerts | Observability stacks often outlive the operational system and widen access to the data | Log redaction, trace-safe identifiers, field-level masking, retention and access control |
| **Operational and support workflows** | Dashboards, incident exports, tickets, ad hoc queries, support tooling | Humans and support systems can become the final leak surface even after technical controls exist | Governance, audit trails, role-bounded decryption, support-tool design, exception workflows |

The rest of the document maps these surfaces to different control layers. **Architectural patterns** remove the root cause. **Operational and governance patterns** stop the same data from being re-exposed elsewhere. **Protocol and deployment patterns** help in bounded contexts but do not replace the underlying design correction.

A common misconception holds that HTTPS eliminates the risk of PII in URLs. Transport encryption protects the request from a network-level eavesdropper (man-in-the-middle), but once the encrypted request arrives at the server, the URL is available in cleartext to every component in the request path. The PrivacyWise analysis (PrivacyWise, 2017) and the OWASP vulnerability entry both enumerate the same fundamental truth: **the URL is the most widely logged, cached, and shared artifact of any HTTP request**.

This section catalogues every channel where PII embedded in a URL becomes exposed, even when the connection uses TLS.

---

## 2. Regulatory Landscape

Article 32 of the General Data Protection Regulation (Regulation (EU) 2016/679) is the cornerstone security provision. It establishes a risk-based obligation for both data controllers and data processors to implement measures "appropriate to the risk":



> Taking into account the state of the art, the costs of implementation and the nature, scope, context and purposes of processing as well as the risk of varying likelihood and severity for the rights and freedoms of natural persons, the controller and the processor shall implement appropriate technical and organisational measures to ensure a level of security appropriate to the risk. (Article 32(1) GDPR)



The Article then enumerates four illustrative categories of measures, of which the first is most directly relevant:



**(a) the pseudonymisation and encryption of personal data;**



The remaining three — system confidentiality, integrity, availability, and resilience (b); timely restoration of availability (c); and regular testing and evaluation (d) — establish a broader security governance framework within which specific pseudonymisation and encryption measures operate.

---

### §2.1 Article 32: Security of Processing

```mermaid
flowchart TB
    subgraph gdpr["GDPR — Core Articles"]
        direction TB
        A32["`**Article 32**
        Security of Processing
        §2.1`"]
        A25["`**Article 25**
        Data Protection by Design and Default
        §2.2`"]
        A17["`**Article 17**
        Right to Erasure
        §2.3`"]
        A45["`**Article 4(5)**
        Pseudonymisation Definition
        §2.4`"]
    end

    A32 -->|"requires measures<br>appropriate to risk"| A25
    A25 -->|"by design implies<br>erasure capability"| A17
    A45 -->|"defines technique for<br>Art 32(1)(a)"| A32
    A45 -->|"reduces severity of<br>breach under Art 33/34"| A17
```

#### §2.1.1 The Risk-Based Approach



Article 32 is explicitly risk-based. The regulator does not prescribe a fixed set of technical controls; instead, it requires the controller (and, by extension, the processor under Article 28) to calibrate security measures against a multi-factor assessment:



- **State of the art** — what are current best practices for protecting data in transit and at rest? Tokenisation of PII in API payloads, TLS 1.3, and field-level encryption are all within the contemporary state of the art.

- **Costs of implementation** — a proportionality guardrail that prevents requiring gold-plated security where the risk profile is low. However, for high-sensitivity PII (health data, financial identifiers, government IDs), the costs of implementing robust PII protection are justified.

- **Nature, scope, context and purposes of processing** — a CRM system processing names and email addresses for marketing presents a different risk profile than a healthcare API processing patient identifiers and diagnostic codes.

- **Risk of varying likelihood and severity** — the likelihood that PII in a URL will be exposed (through Referer headers, browser history, server logs, or shoulder surfing) is high; the severity of that exposure depends on the data type.

#### §2.1.2 What Constitutes "Appropriate" Security for URL-Borne PII



When personal data travels in a URL — whether in path segments (`/users/john.doe@example.com/profile`) or query parameters (`?email=john.doe@example.com&ssn=123-45-6789`) — it is inherently more exposed than data confined to the HTTP message body. Article 32(1)(a) mandates "encryption of personal data," and while TLS encrypts data in transit, it does not address the exposure surfaces that are specific to URL-borne data:



1.  **Server access logs** — web servers, load balancers, and CDN edge nodes routinely log the full request URL. These logs may be retained for extended periods, accessible to operations teams with no legitimate need to view PII.

2.  **Referer headers** — when a user navigates from one page to another, the `Referer` header may contain the full URL including query parameters, leaking PII to any third-party resource on the destination page.

3.  **Browser history and cache** — URLs persist in browser history and may be cached, accessible to anyone with physical or remote access to the user's device.

4.  **Shoulder surfing** — URLs are visible in browser address bars and developer tools, making them susceptible to visual eavesdropping.



Given the high likelihood of exposure through these channels and the moderate-to-high severity depending on data sensitivity, transmitting PII in URL parameters is difficult to reconcile with Article 32's requirement for "a level of security appropriate to the risk" (Article 32(1)). An appropriate measure under Article 32(1)(a) would be to ensure that personal data is confined to the encrypted body of the HTTP request, where it is not subject to the exposure vectors listed above.

#### §2.1.3 Application to Data Controllers and Data Processors



Article 32(1) imposes obligations on **both** the controller and the processor. A processor designing an API that accepts PII in URL parameters is itself in breach of Article 32 if the resulting architecture does not provide an appropriate level of security. Under Article 28(3)(c), the processor must "take all measures required pursuant to Article 32." This means that API design decisions — including the decision to accept PII in query strings — fall within the processor's direct compliance obligations, not merely within the scope of the controller's instructions.

#### §2.1.4 Completeness: Article 32(1)(b)–(d)



For completeness, the remaining provisions of Article 32(1) establish complementary security obligations:



- **Article 32(1)(b)** requires the "ability to ensure the ongoing confidentiality, integrity, availability and resilience of processing systems and services." An API that leaks PII through URLs fails the confidentiality dimension of this requirement — not at the transport layer (where TLS may be effective), but at the application layer where data persists in logs and intermediaries.

- **Article 32(1)(c)** mandates the "ability to restore the availability and access to personal data in a timely manner in the event of a physical or technical incident." While primarily about availability, this provision's emphasis on incident response underscores the importance of limiting data exposure — the less PII is scattered across logs and intermediaries, the smaller the blast radius of any incident.

- **Article 32(1)(d)** requires "a process for regularly testing, assessing and evaluating the effectiveness of technical and organisational measures." Security audits and penetration tests should specifically verify that PII does not appear in URLs, logs, or Referer headers. Automated scanning for PII in server logs is a practical implementation of this requirement.



Article 32(2) further clarifies that risk assessment must consider "accidental or unlawful destruction, loss, alteration, unauthorised disclosure of, or access to personal data transmitted, stored or otherwise processed." The inclusion of "transmitted" data is significant: it extends the security obligation beyond storage to encompass data in transit — including the specific manner in which PII is encoded within HTTP requests.


Article 25 operationalises the principle of proactive data protection. It requires that privacy considerations be embedded into system architecture from the earliest design stages, not retrofitted as an afterthought. The Article has two prongs: data protection **by design** (Article 25(1)) and **by default** (Article 25(2)).

---

### §2.2 Article 25: Data Protection by Design and Default

#### §2.2.1 Article 25(1): Data Protection by Design



> Taking into account the state of the art, the cost of implementation and the nature, scope, context and purposes of processing as well as the risks of varying likelihood and severity for rights and freedoms of natural persons posed by the processing, the controller shall, both at the time of the determination of the means for processing and at the time of the processing itself, implement appropriate technical and organisational measures, such as pseudonymisation, which are designed to implement data-protection principles, such as data minimisation, in an effective manner and to integrate the necessary safeguards into the processing in order to meet the requirements of this Regulation and protect the rights of data subjects. (Article 25(1) GDPR)



The temporal dimension is critical: the controller must implement measures "at the time of the determination of the means for processing" — that is, during the **architectural design phase**. The decision of where PII travels within an HTTP request is precisely the kind of design choice that Article 25(1) captures.



When an API architect decides to place an email address or a national ID number in a URL query parameter, that decision is made at design time. It determines the entire downstream exposure profile: whether the data will appear in server logs, browser history, Referer headers, and CDN access logs. Article 25(1) requires that this decision be informed by the data minimisation principle and the risk assessment — not merely by developer convenience or RESTful purity.



The Article explicitly mentions "pseudonymisation" as an example of an appropriate measure. In the API context, replacing a direct identifier (e.g., an email address) with a pseudonymous token (e.g., a UUID or opaque reference) in the URL is a direct application of this principle. The pseudonymised token can be resolved to the actual PII by a backend service that holds the additional information separately — precisely the pattern described in Article 4(5) GDPR's definition of pseudonymisation.

#### §2.2.2 Article 25(2): Data Protection by Default



> The controller shall implement appropriate technical and organisational measures for ensuring that, by default, only personal data which are necessary for each specific purpose of the processing are processed. That obligation applies to the amount of personal data collected, the extent of their processing, the period of their storage and their accessibility. (Article 25(2) GDPR)



Article 25(2) introduces a "minimum necessary" standard across four dimensions:



- **Amount** — collect only the PII fields needed for the immediate purpose. An API that requires an email address for authentication but also returns the user's full name, date of birth, and postal address in the response violates data minimisation.

- **Extent of processing** — limit what is done with the data. If an API endpoint needs an email address to look up a user record, it should not also log that email, forward it to analytics services, or use it for marketing purposes.

- **Period of storage** — retain PII only as long as necessary. This has direct implications for PII in server logs: if logs retain PII-bearing URLs for years beyond the operational need, the default retention period is excessive.

- **Accessibility** — restrict who can access the data. PII in a URL is inherently accessible to every system in the request path — load balancers, reverse proxies, API gateways, application servers — regardless of whether those systems have a legitimate need to see it. Moving PII to the body (and ideally encrypting it at the application layer) limits accessibility.



The Article further specifies that "by default personal data are not made accessible without the individual's intervention to an indefinite number of natural persons." When PII appears in a URL, it is by default accessible to every operator, auditor, and contractor who has access to server logs — an effectively indefinite number of persons, none of whom required the individual's intervention.

#### §2.2.3 Privacy Impact Assessment (DPIA) Requirements



Article 35 GDPR mandates a Data Protection Impact Assessment (DPIA) for processing that is "likely to result in a high risk to the rights and freedoms of natural persons." According to Article 35(3)(a), a DPIA is required when processing involves "new technologies" — a category that many API-first architectures may fall within, particularly when they handle sensitive personal data at scale.



The European Data Protection Board (EDPB) has issued Guidelines on Data Protection Impact Assessment (WP248 rev.01) which provide further criteria. An API that transmits PII in URL parameters — particularly sensitive PII such as health data, financial identifiers, or government-issued numbers — would likely trigger a DPIA obligation because:



1.  **Large-scale processing** — public-facing APIs that process data at scale may meet the threshold of Article 35(1)(b), though scale is a contextual determination.

2.  **Systematic monitoring** — if the API is used for profiling or behavioural analysis, Article 35(1)(c) applies.

3.  **Innovative use of new technology** — the choice of API architecture, including data serialisation and transport patterns, constitutes a "new technology" decision under the EDPB's interpretation.



A DPIA for such an API should specifically address: (a) whether PII appears in URLs, headers, or body; (b) what logging is performed and for how long; (c) what intermediaries have access to PII-bearing requests; (d) what encryption or pseudonymisation measures are applied; and (e) what the residual risk is after controls are applied. The DPIA's assessment of necessity and proportionality under Article 35(7)(a) and (d) should directly confront the question of whether URL-borne PII is necessary or whether body-based transmission with tokenised references would achieve the same functional purpose with lower risk.


Article 17 establishes the "right to be forgotten" — the data subject's right to obtain erasure of personal data without undue delay. While the erasure right is often discussed in the context of databases and user records, it has significant implications for API architectures where PII is replicated across logs, caches, and intermediary systems.

---

### §2.3 Article 17: Right to Erasure

#### §2.3.1 The Right and Its Scope



Article 17(1) grants the data subject the right to obtain erasure when one of six grounds applies: the data is no longer necessary for its original purpose (a); consent is withdrawn (b); the data subject objects and there are no overriding grounds (c); the data was unlawfully processed (d); erasure is required by law (e); or the data was collected in connection with information society services offered to children (f).



The controller must erase the data "without undue delay." The GDPR does not define "undue delay" precisely, but the Article 29 Working Party (now the EDPB) has suggested that one month is a reasonable benchmark for most processing operations (WP42).

#### §2.3.2 Exceptions and Their API Design Implications



Article 17(3) sets out important exceptions. The erasure right does **not** apply where processing is necessary for:



- **(a)** Exercising the right of freedom of expression and information;
    In API terms, journalistic or blogging platforms may retain PII-bearing URLs under this exception.

- **(b)** Compliance with a legal obligation requiring processing by Union or Member State law;
    API audit logs required by financial regulations (e.g., MiFID II transaction reporting) fall under this exception.

- **(c)** Public health purposes in accordance with Article 9(2)(h)–(i) and Article 9(3);
    Healthcare APIs processing patient identifiers may retain data under this exception.

- **(d)** Archiving in the public interest, scientific or historical research, or statistical purposes (Article 89(1));
    Research APIs that pseudonymise data for statistical analysis may invoke this exception.

- **(e)** Establishment, exercise, or defence of legal claims.
    This is the most practically relevant exception for API-borne PII — see the detailed discussion below.



Of these, Article 17(3)(e) — the legal claims exception — is the most practically relevant to API-borne PII. If an API processes financial transactions, regulatory filings, or audit-trail data that may be needed for legal proceedings, the controller may lawfully retain PII (including PII in logs) beyond the point where the data subject requests erasure. However, the exception is narrowly construed: retention must be **necessary** for the legal claim, not merely convenient. Controllers should implement retention policies that distinguish between PII retained under this exception and PII that can be safely erased.


The erasure right creates a direct tension with the practice of logging PII-bearing URLs. When a personal data request such as:



```
GET /api/v1/users/jane.doe@example.com/preferences
```



is recorded in a server access log, that log entry becomes a copy of personal data under GDPR. Article 17(1) requires the controller to erase personal data — not merely the primary copy in a database, but all copies, including those in logs.



The practical implications are severe:



1.  **Log sanitisation is required.** If PII appears in URLs, log pipelines must implement real-time sanitisation (masking or tokenisation) to prevent PII from being written to persistent storage. This adds operational complexity and the risk of misconfiguration — a single unmasked log field is a compliance failure.

2.  **Cache purging becomes an erasure obligation.** CDN caches, reverse proxy caches, and browser caches may retain PII-bearing URLs. Article 17(2) requires the controller to take "reasonable steps, including technical measures, to inform controllers which are processing the personal data" — which, in practice, means implementing cache-invalidation mechanisms that can reliably purge PII-bearing entries.

3.  **Intermediary systems compound the problem.** API gateways, service meshes, and SaaS observability tools (Datadog, New Relic, Splunk) may receive and store full request URLs. Each of these is a separate data processor or sub-processor, and the controller must ensure that erasure requests propagate through all of them.



The most architecturally robust mitigation is to **prevent PII from entering URLs in the first place.** If the API uses body-based PII with tokenised references (`GET /api/v1/users/uuid-a1b2c3d4/preferences`), the token itself is personal data (it links to a natural person), but it is far easier to manage: the mapping table can be deleted, and the token in the log becomes unlinkable. This is precisely the pattern that the EDPB Guidelines 01/2025 on Pseudonymisation endorse (§2.4).

#### §2.3.3 Encrypted Personal Data Remains Personal Data



A foundational principle, confirmed by Recital 26 and the EDPB Guidelines 01/2025 (paragraph 22), is that **encrypted or pseudonymised personal data remains personal data** under GDPR. The right to erasure therefore extends to:



- Encrypted PII in database columns — the encryption key must be rotated or destroyed so that the encrypted data can no longer be decrypted;

- Tokenised PII — the token-to-identifier mapping must be deleted so that the token can no longer be resolved to a data subject;

- Hashed identifiers — if a hash can be used to link records (as described in the EDPB guidelines on pseudonymisation, paragraph 23), it constitutes personal data, and the hash must be deleted or rendered unrecoverable.



This principle has a direct consequence for API design: encrypting PII before placing it in a URL (e.g., `?data=BASE64(AES-256-GCM(email))`) does not remove the GDPR obligations. The encrypted payload is still personal data because the decryption key exists within the controller's systems. The data subject's erasure right still applies, and the controller must be able to delete or render irrecoverable the encrypted payload from all logs and caches. The protection gained from encryption is real (it prevents casual exposure), but it does not eliminate the compliance burden.


> **Note — EDPB 01/2025 Is Still Consultation-Stage Text**
>
> The European Data Protection Board adopted Guidelines 01/2025 on Pseudonymisation on 16 January 2025, marking the first comprehensive regulatory guidance on the topic since the GDPR's introduction. These guidelines provide a detailed framework for implementing pseudonymisation as a data-protection measure and are directly relevant to PII protection in API design. The publicly available version is still the consultation-stage text; the public consultation ran from 17 January 2025 to 14 March 2025 and is closed. The EDPB's 2026–2027 Work Programme indicates that the Board plans to work on the final version. The analysis in this document is based on the consultation-stage text, which remains directionally authoritative.

---

### §2.4 EDPB Guidelines 01/2025 on Pseudonymisation

#### §2.4.1 Key Definition: Pseudonymisation Under Article 4(5)



The guidelines reaffirm and elaborate the GDPR's legal definition of pseudonymisation (Article 4(5)):



> the processing of personal data in such a manner that the personal data can no longer be attributed to a specific data subject without the use of additional information, provided that such additional information is kept separately and is subject to technical and organisational measures to ensure that the personal data are not attributed to an identified or identifiable natural person.



The guidelines introduce a critical conceptual framework built around three actions that controllers must take (paragraph 5):



1.  **Modify or transform** the data — replace or alter identifying attributes so that the resulting data cannot be attributed to a data subject without additional information.

2.  **Keep additional information separately** — the data needed to re-attribute pseudonymised data to individuals must be stored apart from the pseudonymised data itself.

3.  **Apply technical and organisational measures** — prevent unauthorised access to the additional information and control the flow of pseudonymised data.

#### §2.4.2 Pseudonymisation Domain



A central innovation of the guidelines is the concept of the **pseudonymisation domain** (paragraph 35). This is the context — the set of people, systems, and organisational structures — within which pseudonymisation is designed to preclude attribution of data to individuals. The controller defines the domain based on a risk analysis:



- A narrow domain might encompass only a single organisational unit within the controller.

- A medium domain might include all legitimate recipients of pseudonymised data (e.g., a processor and its authorised staff).

- A broad domain might extend to all entities that could attempt unauthorised access, including external attackers and potentially hostile government authorities.



The effectiveness of pseudonymisation is "highly dependent on the choice of the pseudonymisation domain and its isolation from additional information" (paragraph 38). In API contexts, the pseudonymisation domain typically includes: the API gateway, backend services, logging infrastructure, and any intermediaries that can observe the request. If PII is replaced with tokens in the URL, but the token-to-identifier mapping is accessible to every service in the request path, the pseudonymisation domain is de facto the entire system — and the pseudonymisation provides little practical protection.

#### §2.4.3 Techniques for Pseudonymisation



The guidelines classify pseudonymising transformations into two classes (paragraph 87):



1.  **Cryptographic algorithms** — one-way functions (HMACs, keyed hash functions) and encryption algorithms. The guidelines recommend a preference for one-way functions due to the difficulty of reversal, even when secret parameters are known (paragraph 89). If hash functions are used, specialised password-authentication hash functions like Argon2 are advisable (paragraph 89, footnote 26).

2.  **Lookup tables** — deterministic mappings between identifiers and pseudonyms. These require secure storage of the table itself, which is personal data (paragraph 93). The guidelines note that lookup tables avoid susceptibility to cryptanalytic advances but require secure storage of potentially large datasets.



Both classes require the management of **pseudonymisation secrets** — cryptographic keys or lookup tables — which constitute "additional information" under Article 4(5) and must be "kept separately and subject them to technical and organisational measures that ensure their confidentiality" (paragraph 86).

#### §2.4.4 Quasi-Identifiers and the Limits of Pseudonymisation



The guidelines emphasise that pseudonymisation must address not only direct identifiers but also **quasi-identifiers** — combinations of attributes that, when correlated, can re-identify individuals (paragraph 101). Demographic data (age, gender, profession), structural data (role, hours of service), and temporal patterns can all serve as quasi-identifiers.



Three approaches to handling quasi-identifiers are described (paragraphs 101–104):



1.  **Removal** — delete quasi-identifying attributes entirely, which maximises protection but may reduce data utility.

2.  **Modification** — apply generalisation (e.g., replacing exact age with age range) or randomisation (noise addition) to reduce re-identification risk while preserving analytical value.

3.  **Domain restriction** — limit the pseudonymisation domain to a small set of people who lack the information needed to correlate quasi-identifiers. This approach is only available when pseudonymisation is internal to the controller's organisation (paragraph 104).

#### §2.4.5 Pseudonymisation as a Security Measure Under Article 32



The guidelines explicitly link pseudonymisation to Article 32(1) GDPR, confirming that "pseudonymisation may be employed as one of several measures contributing to a level of security appropriate to the risk of the data processing activity" (paragraph 59). Key points for API design:



- Pseudonymisation "may lower the severity of the consequences of unauthorised access to data" (paragraph 59) — if PII in an API request is tokenised, an attacker who gains access to logs sees opaque tokens rather than email addresses or ID numbers.

- For pseudonymisation to be an effective security measure, "additional information sufficient to attribute the pseudonymised data to identifiable natural persons should only be available outside the pseudonymisation domain" (paragraph 60). In API terms, the token-resolution service must be isolated from the systems that process pseudonymised requests.

- The security level "depends on the security level achieved for both pseudonymised and the relevant additional information" (paragraph 61). A well-tokenised URL is worthless if the token-resolution service is trivially compromised.

- Effective pseudonymisation "may also be considered when assessing the obligations a controller has under Art. 33 and 34 GDPR" — specifically, as a measure that "limits the impact of a personal data breach" (paragraph 62). This is relevant to breach notification decisions: if breached data is effectively pseudonymised, the controller may determine that the breach is unlikely to result in a risk to data subjects, avoiding the obligation to notify under Article 34.

#### §2.4.6 Distinction from Anonymisation



The guidelines emphasise a fundamental distinction (paragraph 22): pseudonymised data "is to be considered information on an identifiable natural person, and is therefore personal." This holds true even if the pseudonymised data and additional information are not in the hands of the same person. Even if all additional information has been erased, the pseudonymised data becomes anonymous only if the "conditions for anonymity are met" — which requires that re-identification be impossible by any means "reasonably likely to be used."



In the API context, this means that a tokenised user ID in a URL (`/users/tok_abc123/profile`) is personal data. The controller must treat it as such: it requires a legal basis for processing, is subject to the data subject's access and erasure rights, and must be protected under Article 32. Pseudonymisation reduces risk; it does not eliminate the GDPR's application.

```mermaid
flowchart LR
    subgraph personal ["All Personal Data — GDPR Applies"]
        RAW["`**Identifiable**
    Raw PII in URL
    alice@example.com`"]
        PSEUDO["`**Pseudonymised**
    Token / Hash
    tok_a7f3b2e9`"]
        ENCRYPTED["`**Encrypted**
    AES-256-GCM ciphertext
    base64url blob`"]
    end

    subgraph anon ["Not Personal Data"]
        ANON["`**Truly Anonymous**
    K-anonymised, generalized
    No re-identification possible`"]
    end

    RAW --> PSEUDO
    PSEUDO --> ENCRYPTED
    ENCRYPTED -.->|if re-identification| ANON

```


While the GDPR provides the primary regulatory framework for EU-based data processing, the US-originating NIST and OWASP standards offer complementary technical guidance that is widely adopted globally. Both frameworks directly address the handling of sensitive data in web application contexts, including REST APIs.

---

### §2.5 NIST and OWASP Standards

**URL PII Decision Tree.** The following decision tree synthesises the NIST PII taxonomy (§2.5.1) and the GDPR risk-based approach (§2.1.1) into an actionable flow. An API designer can trace their specific identifier through the tree to determine whether it can safely appear in a URL.

```mermaid
flowchart TD
    START(["API endpoint accepts<br>identifier parameter"]) --> TYPE{What type<br>of identifier?}

    TYPE -->|"Direct identifier<br>(email, SSN, Gov ID)"| DIRECT
    TYPE -->|"Token / UUID<br>(opaque reference)"| TOKEN
    TYPE -->|"Linkable data<br>(IP, device ID)"| LINKABLE

    DIRECT --> RISK1{Risk level?}
    RISK1 -->|"High — linked PII<br>(NIST SP 800-122)"| BODY1["**MUST** use HTTP body<br>Encrypted at app layer<br>Never in URL (ASVS V9.3)"]
    RISK1 -->|"Medium — minimal PII<br>but combinable"| ASSESS1["Assess combinability<br>with other parameters"]

    TOKEN --> RISK2{Token resolvable<br>within domain?}
    RISK2 -->|"Yes — pseudonymised<br>(Art. 4(5))"| BODY2["Use body preferred<br>Token still personal data<br>(EDPB 01/2025 §22)"]
    RISK2 -->|"No — anonymous"| URL_OK["URL acceptable<br>But verify true anonymity<br>(Recital 26 test)"]

    LINKABLE --> RISK3{Can it be correlated<br>with other data?}
    RISK3 -->|"Yes — quasi-identifier<br>(EDPB 01/2025 §101)"| BODY3["Use body or generalise<br>Assess re-identification risk"]
    RISK3 -->|"No — standalone"| LOW["Lower risk but apply<br>data minimisation (Art. 5(1)(c))"]

    ASSESS1 -->|"Combinable → linked PII"| BODY1
```

#### §2.5.1 NIST SP 800-122: Guide to Protecting the Confidentiality of PII



NIST Special Publication 800-122 (*Guide to Protecting the Confidentiality of Personally Identifiable Information (PII)*), published in 2010 and still referenced in contemporary guidance, provides a framework for identifying and protecting PII in US federal information systems. Although it predates the GDPR and is not a regulation, it is widely adopted beyond the federal sector and offers a structured taxonomy that is valuable for API design.



**Definition of PII.** NIST SP 800-122 defines PII as "any information about an individual maintained by an agency, including any information that can be used to distinguish or trace an individual's identity, such as name, Social Security number, date and place of birth, mother's maiden name, or biometric records." This definition is broader than the GDPR's concept of personal data in one respect and narrower in another: it focuses on identification and traceability rather than the GDPR's broader "any information relating to an identified or identifiable natural person," but it includes data elements (like biometric records) that are explicitly covered by GDPR Article 9 (special categories).



**PII Levels.** A key contribution of NIST SP 800-122 is its three-tier classification of PII, which maps directly to API design decisions:



| Level | Description | Examples | API Implications |
|:------|:------------|:---------|:-----------------|
| **Minimal** | Information that can identify an individual only when combined with other data. Data elements that, alone, cannot identify a person. | First name, date of birth (without year), zip code (partial) | Lower risk when transmitted in URLs, but still subject to data minimisation. Combinations of minimal PII can become linkable PII. |
| **Linked** | PII that directly identifies an individual or can be linked to specific records using publicly available information. | Full name, SSN, email address, driver's licence number, financial account numbers | Must never appear in URLs. These are direct identifiers that, if exposed, immediately identify the data subject. |
| **Linkable** | PII that does not directly identify an individual but can be linked to other data sources to enable identification. | IP address, device fingerprint, session token, location data | Require risk assessment. May be acceptable in URLs for session management, but their linkability must be evaluated. |



**Safeguards.** NIST SP 800-122 recommends safeguards categorised by the PII level. For linked PII (the highest sensitivity), recommended safeguards include encryption, access controls, and strict minimisation — principles that directly align with the GDPR's Article 32 and Article 25 requirements. The guide specifically warns that PII "should be protected from inappropriate access, use, and disclosure" and that organisations must "determine what level of protection is appropriate for each instance of PII."



For API design, the NIST taxonomy provides a practical heuristic: any data element classified as **linked PII** (email addresses, government IDs, financial account numbers, health identifiers) must be excluded from URLs and transmitted exclusively in the encrypted body of the request, with additional application-layer encryption where the risk profile warrants it.

#### §2.5.2 OWASP ASVS v4.0.3: Sensitive Data in HTTP Requests



The OWASP Application Security Verification Standard (ASVS) is the industry-standard checklist for application security. Version 4.0.3, §9 (Communications Verification Requirements), contains a direct and unambiguous requirement:



> **V9.3:** Verify that all sensitive data is sent to the server in the HTTP message body or headers (i.e., URL parameters are never used to send sensitive data).



This requirement is classified at **Level 2** (the standard security level for most applications), meaning it applies to the majority of web applications and APIs — not only to those handling the most sensitive data. The ASVS treats the confinement of sensitive data to the body or headers as a baseline security requirement, not an optional hardening measure.



The rationale is straightforward and aligns with the exposure analysis in §2.1.2: URL parameters are logged, cached, stored in browser history, leaked via Referer headers, and visible in the address bar. The ASVS requirement captures this consensus and codifies it as a verifiable security control.

#### §2.5.3 CWE-598 and OWASP Query String Exposure



CWE-598 (*Use of GET Request Method With Sensitive Query Strings*) is the MITRE standard's formal categorisation of this vulnerability class. The CWE description states:



> "The web application uses the GET method to transmit sensitive information, which allows the information to be captured in various ways, including by the URL, browser history, Referer header, or web server logs."



CWE-598 is classified with the following attributes:



- **Abstraction:** Base — a conceptual weakness that can manifest in many different ways.

- **Likelihood of Exploit:** Medium — the exposure is deterministic (it happens every time the request is made), not probabilistic.

- **Common Consequences:** Confidentiality impact — the primary consequence is the unauthorised disclosure of sensitive information.

- **Detection difficulty:** Difficult — while the vulnerability is easy to introduce, automated detection requires scanning URLs for PII patterns, which produces both false positives and false negatives.

The OWASP community vulnerability page on *Information Exposure Through Query Strings in URL* provides practical attack context that reinforces CWE-598's classification. It emphasises that "simply using HTTPS does not resolve this vulnerability" — a critical point that counters a common misconception. The exposure vectors — Referer header leakage, server log persistence, browser history, shared system visibility, and shoulder surfing — are the same vectors analysed in §2.1.2; the CWE classification confirms that this is a formally recognised vulnerability class, not merely a design concern.

A real-world example cited by OWASP illustrates the severity: a web application sent a one-time password (OTP) and the user's email address in the query string of a login URL. The OTP — "a secret credential equivalent to a password" — and the email address — "confidential PII" that "in many applications also serves as a login identifier" — were exposed in browser history, server logs, and third-party monitoring tools.

#### §2.5.4 Synthesis: Standards Alignment



The convergence across NIST, OWASP ASVS, OWASP CWE, and the GDPR is striking:



| Standard | Requirement | Scope |
|:---------|:------------|:------|
| GDPR Article 32(1)(a) | Implement pseudonymisation and encryption appropriate to the risk | All personal data, risk-calibrated |
| GDPR Article 25(1) | Data protection by design at the time of determining means for processing | All personal data |
| GDPR Article 25(2) | By default, only necessary PII is processed | Amount, extent, storage, accessibility |
| NIST SP 800-122 | Linked PII requires the strongest safeguards; never transmit in exposed channels | Linked PII (direct identifiers) |
| OWASP ASVS v4 V9.3 | Sensitive data must go in the body or headers — never in URL parameters | Level 2 baseline for all applications |
| OWASP CWE-598 | GET with sensitive query strings is a vulnerability | All sensitive data |
| EDPB Guidelines 01/2025 | Pseudonymisation reduces risk but pseudonymised data remains personal data | All personal data |



All of these standards converge on the same conclusion: **PII — particularly linked/direct identifiers — must not be transmitted in URL parameters.** The OWASP ASVS treats this as a Level 2 baseline requirement; the GDPR treats it as a design-time obligation under Article 25 and a security obligation under Article 32; NIST classifies linked PII as requiring the strongest safeguards; and the EDPB confirms that pseudonymisation is an effective risk-reduction measure that does not remove the data from the scope of data protection law.


The regulatory landscape for PII protection extends beyond the GDPR, NIST, and OWASP frameworks analysed above. Several adjacent regulations intersect with API design decisions, particularly where personal data is transmitted, logged, or processed by intermediaries. This section provides brief cross-references — not deep analysis — to the most relevant adjacent frameworks.

---

### §2.6 Adjacent Regulatory Frameworks

**Regulatory overlap map.** For organisations subject to multiple regulations (e.g., a European bank under GDPR + NIS2 + DORA + PCI DSS), the following diagram shows which requirements overlap and converge on the same architectural principle: keep PII out of URLs.

```mermaid
flowchart LR
    subgraph gdpr["EU — GDPR"]
        A32["Art. 32<br>Security of Processing"]
        A25["Art. 25<br>By Design and Default"]
        A17["Art. 17<br>Right to Erasure"]
    end

    subgraph edpb["EU — EDPB Guidance"]
        EDPB25["Guidelines 01/2025<br>Pseudonymisation"]
    end

    subgraph us["US — NIST"]
        NIST["SP 800-122<br>PII Confidentiality"]
    end

    subgraph owasp["Industry — OWASP"]
        ASVS["ASVS v4.0.3 V9.3<br>Body-only sensitive data"]
        CWE["CWE-598<br>GET with sensitive QS"]
    end

    subgraph sector["Sector-Specific"]
        DORA["DORA (EU)<br>Financial ICT"]
        PCI["PCI DSS v4.0<br>Cardholder data"]
        NIS2["NIS2 (EU)<br>Cybersecurity"]
    end

    A32 ---|"pseudonymisation<br>technique"| EDPB25
    A25 ---|"design-time<br>obligation"| ASVS
    EDPB25 ---|"risk reduction"| CWE
    NIST ---|"PII classification"| ASVS
    DORA ---|"API asset mgmt"| PCI
    NIS2 ---|"secure comms"| A32
```

#### §2.6.1 ePrivacy Directive (2002/58/EC)



The ePrivacy Directive, often referred to as the "cookie law," governs the privacy of electronic communications. While it predates the modern API economy, two provisions are relevant:



- **Article 5(1)** requires that traffic and location data — metadata generated by telecommunications networks — may only be processed when necessary for the provision of a communications service or for billing purposes. When an API gateway or load balancer logs request metadata (including the full URL), it is processing communications data that may fall within the scope of this provision.

- **Article 6** restricts the storage of information on a user's terminal equipment (the cookie provision). While primarily aimed at tracking cookies, the principle extends to any data stored by the API on the client — including PII in URL parameters that may persist in browser history or cache.



The ePrivacy Directive is currently under revision (the draft ePrivacy Regulation), which may bring its provisions more directly in line with modern API practices. Until the revision is finalised, the existing Directive provides a complementary layer of protection that reinforces the case against PII in URL parameters.

#### §2.6.2 NIS2 Directive (Directive (EU) 2022/2555)



The Network and Information Security Directive 2 (NIS2), which entered into force in January 2023 with transposition deadlines in October 2024, establishes baseline cybersecurity requirements for essential and important entities across critical sectors including energy, transport, health, and digital infrastructure.



- **Article 21(2)(b)** requires entities to implement "access control policies, including authentication and secure communication" — requirements that API architectures must satisfy, including the protection of sensitive data in transit.

- **Article 21(2)(d)** mandates "supply chain security," which extends to API integrations with third-party processors and SaaS providers that may have access to PII-bearing requests.



NIS2's risk-management approach (Article 21(2)(a)) aligns with the GDPR's risk-based framework under Article 32. An API that transmits PII in URL parameters would likely fail a NIS2 risk assessment in sectors where the directive applies, particularly given the directive's emphasis on the security of "network and information systems" that process electronic communications.

#### §2.6.3 DORA (Regulation (EU) 2022/2554)



The Digital Operational Resilience Act (DORA) applies specifically to the financial sector, requiring financial entities to establish ICT risk management frameworks. DORA came into effect on 17 January 2025.



- **Article 9** requires financial entities to identify, classify, and document all ICT assets, including APIs, and to assess the risks associated with them.

- **Article 11** mandates incident management and reporting, including the classification of incidents by severity. An incident involving the unauthorised disclosure of PII from API logs would fall within DORA's reporting obligations.

- **Article 28** requires third-party risk management for ICT service providers, including those that operate API gateways, logging infrastructure, or observability tools.



For financial institutions, DORA reinforces the GDPR's requirements by adding sector-specific enforcement mechanisms and supervisory oversight. The financial sector's historical sensitivity to PII (particularly through PCI DSS, below) makes the intersection of DORA, GDPR, and API design especially consequential.

#### §2.6.4 PCI DSS v4.0



The Payment Card Industry Data Security Standard (PCI DSS) version 4.0, effective March 2024, governs the handling of cardholder data. While PCI DSS is not a law — it is an industry standard enforced through contractual obligations — its requirements are effectively mandatory for any organisation that processes, stores, or transmits payment card data.



- **Requirement 3** (Protect Stored Account Data) mandates strong cryptography for stored cardholder data. This has direct implications for APIs that accept or return card numbers — the data must be encrypted or tokenised before storage.

- **Requirement 4** (Protect Cardholder Data with Strong Cryptography During Transmission Over Open, Public Networks) requires TLS for all transmissions of cardholder data across open networks. This aligns with the GDPR's encryption requirement under Article 32(1)(a).

- **Requirement 3.4** prohibits the storage of full track data, card verification values (CVV/CVC), and PIN data — the most sensitive cardholder data elements. Even when these elements are transmitted in API requests, they must not be logged or retained after processing.



PCI DSS and PII protection intersect at the point of **payment data in API design**. A common anti-pattern is placing card numbers or tokenised card references in URL parameters (`/api/payments/card_411111XXXXXX1111/charge`). Even when tokenised, this practice is inconsistent with PCI DSS guidance on minimising the exposure surface for cardholder data. The PCI Security Standards Council's guidance on web application security reinforces the OWASP ASVS position that sensitive data should be confined to the request body.

#### §2.6.5 Summary Table



| Regulation | Scope | Relevance to API PII Design |
|:-----------|:------|:-----------------------------|
| ePrivacy Directive (2002/58/EC) | Electronic communications metadata and terminal storage | Reinforces protection of request metadata logged by intermediaries |
| NIS2 Directive (EU 2022/2555) | Cybersecurity for essential/important entities | Risk management and secure communication requirements |
| DORA (EU 2022/2554) | ICT risk management for financial sector | API asset classification and incident reporting |
| PCI DSS v4.0 | Cardholder data protection | Strong cryptography, no logging of sensitive card data |



These adjacent regulations do not, in general, impose requirements that contradict or exceed the GDPR's framework for PII protection. Instead, they **compound** it: organisations subject to multiple regulatory regimes face overlapping obligations that all converge on the same architectural principle — **confine PII to the HTTP message body, protect it with encryption, and minimise its exposure surface.**

```mermaid
timeline
    title Regulatory Evolution — PII Protection in API Design
    section Foundational Privacy Frameworks
        2002 : ePrivacy Directive (2002/58/EC)<br>Electronic communications metadata
        2016 : GDPR adopted (EU 2016/679)<br>Comprehensive data protection framework
        2018 : GDPR enforcement begins<br>DPAs gain investigative & corrective powers
    section Sector-Specific Resilience
        2022 : NIS2 Directive (EU 2022/2555)<br>Cybersecurity risk management for essential entities
        2022 : DORA (EU 2022/2554)<br>Financial sector ICT risk management
    section Modern Enforcement & Guidance
        2024 : PCI DSS v4.0 full enforcement<br>Strong cryptography for cardholder data
        2025 : EDPB Guidelines 01/2025<br>Pseudonymisation techniques and standards
```


# Part II: Protection Patterns

---

## 3. Architectural Patterns

This chapter analyses the five principal architectural patterns for removing PII from URL query parameters and path segments. Unlike cryptographic or tokenization approaches (covered in Chapters 4–5), these patterns restructure the HTTP request itself — changing *where* PII travels rather than *how* it is encoded. Each pattern trades off REST purity, caching behaviour, operational complexity, and implementation cost against varying levels of PII protection.

The patterns are presented in rough order of implementation complexity, from the simplest (POST body migration) to the most involved (single-use tokens). A comparative analysis in §3.6 provides a decision matrix for selecting the right pattern — or combination of patterns — for a given use case.

In standards terms, this chapter is the main implementation answer to the baseline established in §2.5 and synthesized again in §17: it is how teams actually satisfy the OWASP ASVS requirement to keep sensitive data out of URL parameters and how they avoid instantiating the request-target exposure model formalized by CWE-598.

The diagram below shows the five patterns organized by implementation complexity, with the most common combination paths:

```mermaid
%%{init: {themeVariables: {fontSize: "14px"}}}%%
flowchart LR
    subgraph P1["Simple / Quick"]
        POST["§3.1 POST Body Migration"]
        HDR["§3.2 Header Placeholders"]
    end
    subgraph P2["Structural"]
        OPAQUE["§3.3 Opaque IDs"]
    end
    subgraph P3["Stateful"]
        SESSION["§3.4 Session-Based"]
        TOKEN["§3.5 Single-Use Tokens"]
    end

    P1 -->|"Complexity ↑"| P2
    P2 -->|"Complexity ↑"| P3

    POST ---|"Combine for search → cache"| OPAQUE
    HDR ---|"Combine for filters"| OPAQUE
    TOKEN ---|"Email link → opaque ID"| OPAQUE
```

---

### §3.1 POST Body Migration

#### §3.1.1 Concept

The most direct response to PII in URL query parameters is to move that data into the request body and issue the request via POST (or PATCH, PUT) instead of GET. The query string becomes empty — or contains only non-sensitive filters — while the PII travels inside the encrypted TLS payload of the body, invisible to the exposure surfaces described in §1.2 (server logs, Referer headers, browser history, proxy logs).

This pattern is the one most organizations reach for first, because it requires no special infrastructure — only a change to the HTTP method and payload structure.

#### §3.1.2 REST Semantics Implications

POST body migration introduces a fundamental tension with REST's uniform interface constraint. Roy Fielding's dissertation (Fielding 2000) defines GET as a *safe* and *idempotent* method: it must not cause state changes on the server, and repeated identical GET requests must return the same result. POST, by contrast, is defined as neither safe nor idempotent — it is the REST mechanism for creating subordinate resources or triggering non-idempotent processes.

Using POST for what is semantically a read operation — "look up this user by email" or "search for orders by SSN" — violates this contract in several ways:

- **Cacheability.** GET responses are cacheable by intermediaries (CDNs, browsers, reverse proxies) under the rules of RFC 9111 §3. POST responses are *not* cacheable unless the server explicitly marks them with `Cache-Control` headers containing `public` and an expiration directive — and even then, most CDN implementations ignore cache directives on POST (Cloudflare, Fastly, Akamai all default to non-caching POST).
- **Idempotency expectations.** Automated clients, HTTP libraries, and retry middleware often treat GET as safe to retry automatically. POST requests are retried with caution or not at all, because a retry might create duplicate side effects. When the operation is actually a read (no side effects), this creates a mismatch: the safe operation is coded as unsafe, losing automatic retry semantics.
- **HTTP/2 server push.** Server push is tied to GET requests in the HTTP/2 specification; POST-triggered push is not standardised and not supported by most implementations.
- **Preload and prefetch.** Browser resource hints (`<link rel="preload">`, `<link rel="prefetch">`) only work with GET. POST-based lookups cannot benefit from these performance mechanisms.
- **Bookmarkability and shareability.** GET URLs can be bookmarked, shared in documentation, or embedded in emails. POST URLs cannot encode the query parameters, so they lose this property entirely.

#### §3.1.3 Caching Challenges

The loss of caching is the most consequential operational impact. Consider a user-profile lookup endpoint. Under GET, the response can be cached at multiple layers:

| Cache layer | GET (cacheable) | POST (not cacheable) |
|:--|:--|:--|
| Browser cache | ✅ `Cache-Control: max-age=300` | ❌ Ignored unless `public` + explicit |
| CDN / reverse proxy | ✅ Keyed by URL | ❌ Not keyed; not stored |
| Service mesh sidecar | ✅ Istio/Envoy cache filter | ❌ No standard support |
| Application-level cache | ✅ Unaffected | ✅ Unaffected |

Application-level caches (Redis, Memcached, in-process LRU) are unaffected because they operate independently of HTTP semantics — the application decides when to cache. But all HTTP-layer caching is lost, which can significantly increase origin server load for high-traffic read endpoints.

Organizations that adopt POST body migration for PII protection typically compensate by implementing application-level caching keyed on a hash of the PII input, or by combining this pattern with §3.3 (Opaque Internal Identifiers) so that subsequent requests can use GET with a non-sensitive UUID.

#### §3.1.4 When POST Body Migration Is Appropriate

This pattern is appropriate when:

- The endpoint is called infrequently (no caching benefit to lose)
- The PII is the *only* query parameter (no mixed sensitive/non-sensitive filtering)
- The API is consumed by trusted backend services, not browsers (no bookmarkability needed)
- The endpoint already uses POST for other reasons (e.g., complex filter criteria that exceed URL length limits)
- A rapid migration from a vulnerable GET endpoint is needed, with no time for infrastructure changes

#### §3.1.5 When POST Body Migration Creates More Problems

This pattern is problematic when:

- The endpoint is a high-traffic read path that benefits significantly from CDN caching
- Mixed filtering is required — some parameters are safe for the URL, others are PII — resulting in an awkward split between query parameters and body fields that confuses API consumers
- The API serves browser-based clients that expect idempotent GET semantics for reads
- OpenAPI/Swagger documentation must clearly convey that a "read" operation uses POST, which many auto-generated SDKs handle poorly

#### §3.1.6 Example: Before and After

**Before — PII exposed in query string (CWE-598):**

```http
GET /api/v1/users/lookup?email=jane.doe%40example.com&include=profile,preferences HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
```

The email address `jane.doe@example.com` appears in server access logs, proxy logs, browser history, and Referer headers sent to any third-party resource on the page.

**After — PII moved to POST body:**

```http
POST /api/v1/users/lookup HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
Content-Type: application/json

{
  "email": "jane.doe@example.com",
  "include": ["profile", "preferences"]
}
```

The email now travels exclusively within the TLS-encrypted request body. Server logs record only `POST /api/v1/users/lookup` with no PII. The non-sensitive `include` parameter moves to the body alongside the email — a pragmatic trade-off to avoid splitting parameters across channels.

**Audit log entry — before:**

```
192.168.1.42 - - [08/Apr/2026:14:23:01 +0000] "GET /api/v1/users/lookup?email=jane.doe%40example.com&include=profile,preferences HTTP/1.1" 200 1842
```

**Audit log entry — after:**

```
192.168.1.42 - - [08/Apr/2026:14:23:01 +0000] "POST /api/v1/users/lookup HTTP/1.1" 200 1842
```

The PII has disappeared from the log line entirely — the simplest possible form of log redaction, requiring no special log-scanning infrastructure (cf. §7.2).

#### §3.1.7 Security Assessment

POST body migration provides **moderate** PII protection. It eliminates the URL as an exposure vector, which addresses the OWASP CWE-598 vulnerability directly. However, it does not protect against:

- **Server-side logging of the body.** Application frameworks may log request bodies at DEBUG or INFO level. Ensure body logging is disabled for endpoints carrying PII, or that PII fields are redacted before logging.
- **TLS termination at the load balancer.** If TLS is terminated at an external LB (e.g., AWS ALB, Cloudflare), the PII is visible in plaintext at the termination point. This is standard for any TLS traffic, but worth noting — POST body migration does not add a new risk here.
- **Request body inspection by WAFs or API gateways.** Some WAF configurations log request bodies for threat detection. Review and adjust WAF logging policies.

The primary value of this pattern is its simplicity and immediacy: it can be deployed in minutes with no infrastructure changes, and it eliminates the most common PII exposure surface (URLs).

---

### §3.2 Header-Based Placeholders

#### §3.2.1 Concept

The header-based placeholder pattern keeps PII out of the URL by splitting the request across two channels: the URL contains opaque `{placeholder}` tokens (typically UUIDs or sequential identifiers), while the actual PII values are transmitted in dedicated custom HTTP headers. The server maps each placeholder back to the corresponding header value during request processing.

This pattern is widely adopted in organisations subject to GDPR compliance requirements, particularly in the banking, insurance, and healthcare sectors where legacy API contracts embed user identifiers in URLs but regulatory mandates prohibit PII from appearing in server logs.

#### §3.2.2 Header Design

Custom headers for PII typically follow a naming convention that identifies both the purpose (PII transport) and the data type:

```
X-PII-Email: jane.doe@example.com
X-PII-Username: jdoe_1984
X-PII-SSN: 078-05-1120
X-PII-TaxId: IT12345678901
X-PII-Phone: +1-555-0123
```

An alternative convention uses a single generic header with structured content:

```
X-PII-Fields: email=jane.doe@example.com;username=jdoe_1984
```

The single-header approach reduces header count but requires parsing and is less transparent to intermediaries that inspect header names. The multi-header approach is generally preferred because each PII field can be inspected, validated, and redacted independently by API gateways and WAFs.

#### §3.2.3 The X- Prefix: RFC 6648 and De Facto Practice

RFC 6648 (Belshe & Thompson 2012) deprecated the `X-` prefix convention for custom HTTP headers, arguing that it created a false sense of interoperability and that header names should be registered in the IANA registry instead. The RFC recommends using descriptive, un-prefixed names like `Pii-Email` or `Email-Address`.

In practice, the `X-` prefix remains the de facto standard for organisation-internal headers. Reasons include:

- **Clear signal to intermediaries.** An `X-` prefix immediately tells operators, proxy administrators, and security engineers that this is a custom, non-standard header — reducing the risk of confusion with standard headers.
- **Tooling compatibility.** Many API gateways (Kong, Apigee, AWS API Gateway) and WAFs have built-in rules for handling `X-` prefixed headers. Un-prefixed custom headers may collide with future standard headers or trigger unexpected behaviour.
- **Organisational convention.** Most enterprises already use `X-` prefixed headers for tracing (`X-Request-ID`), correlation (`X-Correlation-ID`), and routing (`X-Forwarded-For`). Adding `X-PII-*` to this convention maintains consistency.

The pragmatic recommendation: use `X-PII-` prefix for internal APIs with explicit documentation. If the API is public or intended for broad third-party consumption, register a proper header name with IANA or use a vendor prefix (e.g., `Acme-Pii-Email`).

#### §3.2.4 Header Size Limits

HTTP headers have practical size constraints that limit the volume of PII that can be transmitted via this pattern:

| Component | Default limit | Configurable |
|:--|:--|:--|
| nginx `large_client_header_buffers` | 8 KB total headers | ✅ |
| Apache `LimitRequestFieldSize` | 8,190 bytes per header line | ✅ |
| Apache `LimitRequestFields` | 100 header fields | ✅ |
| AWS ALB | 64 KB total headers (fixed) | ❌ |
| Cloudflare | 128 KB total headers (Enterprise) | ❌ |
| Envoy proxy | 60 KB default total headers | ✅ |
| Tomcat `maxHttpHeaderSize` | 8 KB total headers | ✅ |
| Node.js `http.Server` | 16 KB total headers (hard limit) | ❌ |

An 8 KB limit accommodates roughly 20–30 PII fields depending on data size. For most real-world API requests — where only 1–3 PII fields need header transport — this is ample. If the PII payload exceeds header limits, the pattern breaks silently: the server returns a `431 Request Header Fields Too Large` status code.

#### §3.2.5 Proxy Compatibility

A significant operational risk with custom headers is proxy behaviour. Some intermediaries strip or modify headers they do not recognise:

- **Corporate proxies.** SSL-inspecting proxies in enterprise environments may strip custom headers as a security measure. This is particularly common with legacy proxy appliances (Blue Coat, McAfee Web Gateway) configured with strict header whitelists.
- **CDN edge servers.** Most CDNs forward custom headers to the origin, but some configurations (particularly with caching enabled) may normalise or strip headers from cached responses. Verify CDN behaviour with `Vary` header configuration.
- **API gateways.** Gateways generally preserve custom headers, but transformation policies may inadvertently remove or rename them. Kong, Apigee, and AWS API Gateway all support header transformation — ensure that `X-PII-*` headers are included in pass-through or mapping rules.
- **Service mesh sidecars.** Envoy and Istio sidecars forward all headers by default, but `request_header manipulation` policies in the mesh configuration can strip headers if misconfigured.

**Mitigation:** Require header passthrough configuration at every proxy/gateway layer. Document this requirement in API onboarding guides. Include header presence validation in API integration tests.

#### §3.2.6 Documentation and Discoverability

Header-based PII transport introduces a significant documentation burden:

- **OpenAPI/Swagger.** Standard OpenAPI 3.1 specifications describe headers in the `parameters` section with `in: header`. However, many code generators do not emit header parameters in SDK methods — developers must manually add them, which is error-prone.
- **API discoverability.** URL paths are self-documenting: `GET /users/jane.doe@example.com/profile` clearly communicates that a user email is part of the resource path. Header-based placeholders obscure this: `GET /users/{userRef}/profile` with `X-PII-Email` in the headers is opaque without reading the documentation.
- **Testing complexity.** Tools like Postman, curl, and httpie handle custom headers well, but automated API testing frameworks may not include them in generated test cases. Include header fixtures in test suites.
- **Onboarding friction.** Third-party integrators must be explicitly told about custom headers — they will not discover them from the URL structure alone. This is a significant barrier for public APIs.

#### §3.2.7 Example Request

**URL with placeholders; PII in headers:**

```http
GET /api/v1/users/{userRef}/orders/{orderRef} HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
X-PII-Email: jane.doe@example.com
X-PII-OrderRef: ORD-2026-8842
```

The server resolves the URL path as a template, extracts the PII from headers, and performs the lookup. The URL structure is clean and loggable:

```
GET /api/v1/users/%7BuserRef%7D/orders/%7BorderRef%7D HTTP/1.1
```

No PII appears in the log. The placeholders `{userRef}` and `{orderRef}` are literal tokens — not URL-encoded PII — so they are safe for logging, caching, and bookmarking.

**Server-side resolution pseudocode:**

```
// Extract PII from headers
email := request.Header("X-PII-Email")
orderRef := request.Header("X-PII-OrderRef")

// Resolve placeholders in URL path
// URL path: /api/v1/users/{userRef}/orders/{orderRef}
// Resolved:  /api/v1/users/jane.doe@example.com/orders/ORD-2026-8842
// (internal only — never exposed to logs or client)
```

#### §3.2.8 Security Assessment

Header-based placeholders provide **moderate** PII protection — comparable to POST body migration — with additional considerations:

- ✅ **Eliminates URL exposure.** PII does not appear in URLs, query strings, server logs, Referer headers, or browser history.
- ⚠️ **Headers are logged by some tools.** Some application servers and load balancers log request headers at the verbose level. Ensure `X-PII-*` headers are excluded from header-level logging, or redacted by log-processing pipelines.
- ⚠️ **Proxy stripping risk.** If a proxy strips custom headers, the request arrives without PII, causing either a processing error or (worse) a fallback to default behaviour.
- ⚠️ **No encryption at rest in headers.** Like POST body migration, PII in headers is plaintext within the TLS session. Unlike encrypted body patterns (Chapter 4), headers provide no confidentiality beyond TLS.

This pattern is most effective when combined with API gateway policies that enforce header presence, validate header values, and strip `X-PII-*` headers from downstream forwarding after server-side resolution.

---

### §3.3 Opaque Internal Identifiers

#### §3.3.1 Concept

The opaque internal identifier pattern replaces PII in URLs with database-generated identifiers — typically UUIDs or other opaque tokens — and resolves the PII server-side through an internal lookup table. The external API surface never exposes PII: consumers interact exclusively with opaque identifiers that carry no semantic meaning and reveal nothing about the underlying data subject.

This is the most architecturally clean of the five patterns because it preserves full REST semantics — GET remains GET, URLs remain cacheable and bookmarkable — while completely removing PII from the URL channel.

#### §3.3.2 How It Works

When a new entity (user, account, order) is created, the system generates an opaque identifier and stores a mapping in a lookup table:

```
+--------------------------------------+-----------------------------+
| user_id (UUID, primary key)          | email (PII)                 |
+--------------------------------------+-----------------------------+
| a1b2c3d4-e5f6-7890-abcd-ef1234567890 | jane.doe@example.com        |
| f7e6d5c4-b3a2-1098-fedc-ba0987654321 | john.smith@company.org      |
| 5a4b3c2d-1e0f-9876-5432-10fedcba0987 | alice.williams@startup.io   |
+--------------------------------------+-----------------------------+
```

Subsequent API requests use only the UUID:

```http
GET /api/v1/users/a1b2c3d4-e5f6-7890-abcd-ef1234567890/profile HTTP/1.1
```

The server resolves the UUID to the internal representation (including the email) through the lookup table. The email never appears in any URL, header, or log entry.

#### §3.3.3 Identifier Generation

The choice of identifier format has security, performance, and usability implications:

| Format | Entropy | Size | Guessability | URL-safe |
|:--|:--|:--|:--|:--|
| UUID v4 (random) | 122 bits | 36 chars (string) | Negligible | ✅ (after removing hyphens) |
| UUID v7 (time-ordered) | 74 bits random + 48 bits timestamp | 36 chars | Low | ✅ |
| ULID | 80 bits random + 48 bits timestamp | 26 chars (Crockford base32) | Negligible | ✅ |
| NanoID | Configurable (default 130 bits) | 21 chars (URL-safe base64) | Negligible | ✅ |
| Auto-increment integer | 0 bits | 1–19 digits | High (enumerable) | ✅ |

**UUID v4** is the most common choice and provides strong protection against enumeration attacks. The 122 bits of randomness make guessing a valid UUID computationally infeasible.

**UUID v7** (RFC 9562, Peabody 2024) adds timestamp-based ordering, which improves database index locality (sequential writes) without sacrificing adequate randomness. The reduced random component (74 bits) is still sufficient to prevent enumeration in practice.

**Auto-increment integers** must be avoided for security-sensitive APIs. An attacker who discovers that user IDs are sequential (`/users/1`, `/users/2`, …) can enumerate all users by incrementing the ID — a classic Insecure Direct Object Reference (IDOR) vulnerability (OWASP API Security Top 10, API1:2023 – Broken Object Level Authorization). Use UUIDs or ULIDs unless there is a compelling reason not to.

#### §3.3.4 Lookup Infrastructure

The lookup table is the operational backbone of this pattern. Several implementation approaches exist:

**Database-backed lookup.** The simplest approach: a database table mapping opaque identifiers to PII. This works well when the PII is already stored in the same database — the lookup is a standard `SELECT` query against the primary key. PostgreSQL UUID primary keys with B-tree indexes provide sub-millisecond lookup times even at scale.

**Distributed cache.** For high-traffic systems, a Redis or Memcached layer in front of the database reduces lookup latency to sub-millisecond at any scale. The cache is populated on first access and invalidated on PII updates. Cache entries should be short-lived (TTL of 5–60 minutes) to ensure consistency with the source of truth.

**Dedicated resolution microservice.** In microservice architectures, a standalone "identity resolution" service provides the lookup as a gRPC or REST endpoint. Other services call the resolver instead of querying the user database directly, decoupling PII storage from consuming services. This aligns with GDPR's data minimisation principle (Article 5(1)(c)) — services that need to identify a user by UUID do not need access to the user's PII.

**Embedding in JWT claims.** For authenticated API sessions, the opaque identifier can be embedded in the JWT token's `sub` (subject) claim. The client includes the JWT in the `Authorization` header, and the server uses `sub` as the lookup key. This eliminates the need for a separate lookup table for user-scoped resources — the identifier is already present in the token.

```mermaid
%%{init: {themeVariables: {fontSize: "13px"}}}%%
flowchart TB
    CLIENT(["Client request<br/>with opaque ID"])

    subgraph ROUTING["Lookup Strategy"]
        direction TB
        DB["Database Lookup<br/>SELECT by UUID PK<br/>Sub-ms with B-tree index"]
        CACHE["Distributed Cache<br/>Redis / Memcached<br/>Sub-ms, TTL 5–60 min"]
        SVC["Resolution Microservice<br/>gRPC / REST endpoint<br/>Decoupled PII storage"]
        JWT["JWT sub Claim<br/>No lookup needed<br/>sub = opaque ID"]
    end

    CLIENT -->|"High traffic"| CACHE
    CLIENT -->|"Simple / default"| DB
    CLIENT -->|"Microservices"| SVC
    CLIENT -->|"Authenticated session"| JWT

    CACHE -->|"Cache miss"| DB
    SVC -->|"Fallback"| DB
```

#### §3.3.5 When Opaque Identifiers Work Well

This pattern is the strongest general-purpose solution for PII protection in URLs:

- **User-scoped resources.** `/users/{userId}/profile`, `/users/{userId}/orders`, `/users/{userId}/preferences` — all use the opaque user ID. The user's email, name, and other PII are resolved server-side.
- **Account and order lookups.** External references to accounts and orders use opaque identifiers. Internal systems resolve to account numbers, order details, and associated PII as needed.
- **Multi-tenant APIs.** Tenant identifiers can be opaque, preventing cross-tenant PII leakage through URL enumeration.
- **Public-facing APIs.** Opaque IDs are safe to expose in public documentation, SDK examples, and client applications. They carry no semantic information about the underlying data subject.

#### §3.3.6 When Opaque Identifiers Don't Work

This pattern has limitations in specific scenarios:

- **Search operations.** When the consumer does not have the opaque identifier and must search by PII (e.g., "find user by email"), the initial lookup requires a different pattern — typically §3.1 (POST body migration) or §3.5 (single-use token) for the search request, followed by opaque-ID-based access for subsequent requests.
- **Cross-system lookups.** When integrating with external systems that identify entities by PII (e.g., a government tax ID system, a credit bureau), the external system's identifier is itself PII. The opaque ID must be mapped to the external PII for outbound calls, which requires a secure reverse lookup.
- **Human readability.** UUIDs are not human-readable. Customer support agents, logs analysts, and debuggers cannot glance at a URL and understand which user or order it refers to. This is a feature for security but a challenge for operations. Mitigate with internal admin dashboards that resolve UUIDs to human-readable labels, and with structured logging that includes both the UUID and (in restricted-access logs) a truncated PII reference.
- **Legacy system migration.** If an existing API has been using PII in URLs for years (e.g., `/customers/john.doe@example.com/invoices`), migrating to opaque identifiers requires a coordinated migration: new clients use opaque IDs, old clients continue with PII until deprecated, and a translation layer handles both during the transition.

#### §3.3.7 Combining with Other Patterns

Opaque identifiers combine naturally with other patterns in this chapter — see §3.6 for detailed combination analysis and implementation guidance for the five most effective pairings.

#### §3.3.8 Security Assessment

Opaque internal identifiers provide **strong** PII protection for the URL channel:

- ✅ **Complete URL decontamination.** No PII ever appears in URLs, query strings, or path segments.
- ✅ **Full REST compliance.** GET remains safe, idempotent, and cacheable. Caching works normally because cache keys are based on the opaque identifier.
- ✅ **Enumeration resistance.** Random UUIDs prevent IDOR attacks and cross-tenant data leakage.
- ⚠️ **Lookup table is a target.** The mapping between opaque IDs and PII is itself a high-value data store. Protect it with the same rigour as the PII it maps — encryption at rest, access controls, audit logging.
- ⚠️ **Cache side-channel.** If the lookup cache stores plaintext PII, a cache-compromise attack reveals PII. Use encrypted cache values or ensure the cache infrastructure has equivalent security to the primary database.
- ⚠️ **No protection for PII in responses.** This pattern only protects PII in *inbound* URLs. If the API response body includes PII (e.g., user profile endpoints return email addresses), that PII is still exposed in response bodies, logs, and caches. Combine with response-level patterns (Chapter 6) for full coverage.

---

### §3.4 Session-Based Resolution

#### §3.4.1 Concept

Session-based resolution stores PII server-side in a session object after an initial secure submission, then uses only the session identifier in subsequent requests. The session acts as a server-side vault: the client authenticates once (transmitting PII over a secure channel), and all subsequent requests reference the session rather than retransmitting PII.

This pattern is the oldest of the five and predates modern RESTful API design — it is inherited from the session-based web application model where cookies maintain state across HTTP requests. Its application to REST APIs requires careful consideration of statelessness constraints.

#### §3.4.2 Flow

The session-based resolution pattern follows a two-phase lifecycle:

**Phase 1 — Session creation (PII submission):**

1. Client submits PII via a secure channel (typically HTTPS POST with the PII in the body).
2. Server validates the PII, creates a session object, and stores the PII server-side.
3. Server returns a session identifier (typically a random token in a `Set-Cookie` header or a response body field).

**Phase 2 — Session usage (PII-free requests):**

4. Client includes the session identifier in all subsequent requests (via `Cookie` header or `Authorization` header).
5. Server resolves the session identifier to the stored PII internally.
6. Server processes the request using the resolved PII without the client retransmitting it.

```mermaid
%%{init: {sequence: {actorMargin: 250, messageMargin: 60}, themeVariables: {noteBkgColor: "transparent", noteBorderColor: "transparent"}}}%%
sequenceDiagram
    autonumber
    participant C as Client
    participant S as API Server
    participant SS as Session Store

    rect rgba(52, 152, 219, 0.14)
        Note over C, SS: Phase 1 — Session Creation (one-time PII submission)
        C->>S: POST /api/session {email: "jane.doe@example.com"}
        S->>SS: Store PII under session ID
        SS-->>S: OK (sess_a8f3k2...)
        S-->>C: 201 Created Set-Cookie: session=sess_a8f3k2...
        Note right of SS: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end

    rect rgba(46, 204, 113, 0.14)
        Note over C, SS: Phase 2 — Session Usage (no PII in URL or body)
        C->>S: GET /api/orders Cookie: session=sess_a8f3k2...
        S->>SS: Resolve session → PII
        SS-->>S: jane.doe@example.com
        S->>S: Process request with resolved PII
        S-->>C: 200 OK [{order: "ORD-001", ...}]
        Note right of SS: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
```

#### §3.4.3 Walkthrough

<details><summary><strong>1. Client submits PII via secure POST request</strong></summary>

The client initiates the session lifecycle by submitting PII to the server over a secure channel (HTTPS). This is the only point in the flow where PII appears on the wire — it is transmitted in the request body, never in the URL. The request targets a dedicated session-creation endpoint, typically `POST /api/session`, with the PII as a JSON payload:

```json
POST /api/session HTTP/1.1
Content-Type: application/json

{
  "email": "jane.doe@example.com",
  "tax_id": "19850315-1234"
}
```

Placing PII in the body rather than the URL is critical: URL parameters are logged in web server access logs, proxy logs, CDN logs, and browser history — creating an uncontrolled proliferation of PII copies that are difficult to audit and impossible to retract (OWASP ASVS v4.0.3, §5.1.2). The POST body, by contrast, is not logged by default and can be encrypted at the transport layer without leaving residual traces.

The client must be authenticated before this request — either through a prior authentication step or by including credentials (API key, OAuth token, mTLS certificate) in this request. Submitting PII to an unauthenticated session endpoint would allow any caller to create sessions populated with arbitrary PII.

</details>

<details><summary><strong>2. API Server stores PII in the Session Store</strong></summary>

Upon receiving the PII, the API Server validates the input (format checks, length constraints, and any business-rule validation such as verifying the email domain or tax ID checksum). It then generates a cryptographically random session identifier — a high-entropy token such as `sess_a8f3k2m9x1...` (minimum 128 bits, produced by a CSPRNG) — and stores the mapping between this identifier and the submitted PII in the Session Store.

The session store is a key-value data store (Redis, Memcached, or a database-backed session table) that holds the PII keyed by the session token. The server must set a TTL (time-to-live) on the entry to enforce automatic expiry — for example, 30 minutes of inactivity or 8 hours maximum lifetime. This TTL directly supports GDPR's storage limitation principle (Article 5(1)(e)): PII must not be retained longer than necessary for the purpose it was collected.

```json
// Redis session entry (conceptual)
{
  "sess_a8f3k2m9x1": {
    "email": "jane.doe@example.com",
    "tax_id": "19850315-1234",
    "created_at": "2026-04-09T14:23:00Z",
    "last_accessed": "2026-04-09T14:23:00Z",
    "expires_at": "2026-04-09T22:23:00Z"
  }
}
```

The storage mechanism has direct GDPR implications (see the Session Storage Options table below). In-memory stores (server process) are ephemeral and align well with data minimisation, but lack persistence and horizontal scalability. Redis-backed stores offer a practical balance — they support configurable TTLs for automatic data minimisation while providing the distributed access needed for multi-instance deployments.

</details>

<details><summary><strong>3. Session Store confirms storage and returns session identifier</strong></summary>

The Session Store acknowledges the write operation and returns the session identifier to the API Server. This confirmation ensures the PII is durably persisted before the server commits to the session — a write-ahead guarantee that prevents the server from returning a session token for data that was never actually stored.

If the Session Store is unavailable (network partition, Redis node failure), the API Server must fail the request rather than proceeding without session persistence. Returning a session token for a non-existent session creates a phantom reference: the client believes the session exists and submits subsequent requests, but every request fails session resolution — producing confusing errors and a poor user experience. The fail-closed approach (reject the creation request if the store is unreachable) is the only safe strategy.

</details>

<details><summary><strong>4. API Server returns session identifier to Client</strong></summary>

The API Server responds to the client with `201 Created` and delivers the session identifier. The delivery mechanism depends on the client type:

**Cookie-based delivery** (browser applications): The server sets an `HttpOnly`, `Secure`, `SameSite=Strict` cookie via the `Set-Cookie` header:

```
HTTP/1.1 201 Created
Set-Cookie: session=sess_a8f3k2m9x1; Path=/api; Secure; HttpOnly; SameSite=Strict
Content-Type: application/json

{"session_id": "sess_a8f3k2m9x1", "expires_at": "2026-04-09T22:23:00Z"}
```

The `Secure` flag prevents the cookie from being sent over plaintext HTTP — a critical safeguard against PII being exposed if the TLS layer is stripped (SSL stripping attacks). The `HttpOnly` flag prevents client-side JavaScript from accessing the cookie, mitigating XSS-based session theft. `SameSite=Strict` prevents the cookie from being sent on cross-site requests, providing CSRF protection.

**Header-based delivery** (API clients): Non-browser clients (mobile apps, service-to-service integrations) receive the session token in the response body or a custom header (`X-Session-ID`). These clients must store the token and include it in subsequent requests — typically in the `Authorization` header or a custom `X-Session-ID` header.

This step concludes Phase 1. The PII is now stored server-side; the client holds only an opaque session token.

</details>

<details><summary><strong>5. Client submits PII-free request with session identifier</strong></summary>

The client now needs to perform an API operation that internally requires PII (e.g., retrieving orders associated with the user's email). Instead of retransmitting the email or tax ID, the client includes only the session identifier:

```http
GET /api/orders HTTP/1.1
Cookie: session=sess_a8f3k2m9x1
```

The request URL is completely free of PII — no email addresses, tax IDs, or personal identifiers appear in the path, query string, or headers (beyond the opaque session token). This is the core benefit of session-based resolution: PII never appears in request logs, proxy logs, CDN access logs, or any intermediary's request metadata.

The session identifier is a random, opaque token that is meaningless without the server-side session store. Even if it is logged or intercepted, the token alone does not reveal any PII — the attacker would need to compromise the session store to resolve the token to its associated data. This separation is the fundamental security property of this pattern.

</details>

<details><summary><strong>6. API Server resolves session identifier to PII</strong></summary>

The API Server receives the request, extracts the session identifier, and looks it up in the Session Store. The store returns the associated PII (email and tax ID in this example). The server then uses this PII internally — for example, querying the orders database by email:

```sql
SELECT order_id, amount, status FROM orders
WHERE customer_email = 'jane.doe@example.com'
ORDER BY created_at DESC;
```

The resolution step introduces a latency dependency on the Session Store. Redis-backed stores typically resolve in under 2 ms; database-backed stores may take 2–10 ms depending on indexing. This overhead is acceptable for most use cases but should be monitored — a slow session store directly impacts API response times for every session-authenticated request.

If the session identifier is invalid, expired, or not found, the server must respond with `401 Unauthorized` (or `403 Forbidden`, depending on the semantics) rather than proceeding without PII context. This fail-closed behaviour prevents requests from executing with missing or incorrect identity context.

</details>

<details><summary><strong>7. Session Store returns resolved PII to API Server</strong></summary>

The Session Store returns the PII associated with the session identifier. In this example, it returns the email address `jane.doe@example.com`. The latency of this lookup depends on the store type: Redis typically responds in under 2 ms, while database-backed stores may take 2–10 ms. This resolution step is the critical dependency — if the session store is unavailable, the server cannot proceed with the request and must fail closed with a `503 Service Unavailable` response.

</details>

<details><summary><strong>8. API Server processes request with resolved PII</strong></summary>

With the PII resolved from the session, the API Server executes the business logic. The resolved email is used as a query parameter internally — for example, querying the orders database by email: `SELECT order_id, amount, status FROM orders WHERE customer_email = 'jane.doe@example.com'`. The PII exists in the server's working memory only for the duration of the request. It never appears in any outbound URL, header, or log entry.

</details>

<details><summary><strong>9. API Server returns response to Client</strong></summary>

The server returns the response to the client. The response body may contain PII (order details, user profile data) — session-based resolution protects PII in *inbound* request URLs, not in *outbound* response bodies. The server also updates the session's `last_accessed` timestamp, which resets the inactivity TTL. This sliding-window expiry ensures active sessions remain valid while idle sessions are automatically purged — enforcing GDPR's storage limitation principle without explicit cleanup logic.

</details>

#### §3.4.4 Session Storage Options

| Storage mechanism | Latency | Scalability | Persistence | GDPR considerations |
|:--|:--|:--|:--|:--|
| In-memory (server process) | <1 ms | Poor (single-node) | Non-persistent | ✅ Ephemeral — no data at rest |
| Redis / Memcached | <2 ms | Good (distributed) | Configurable TTL | ✅ TTL-based expiry supports data minimisation |
| Database-backed session | 2–10 ms | Good (distributed DB) | Persistent | ⚠️ Requires deletion on session end (Article 17) |
| Sticky sessions (load balancer) | <1 ms | Moderate | Server process | ⚠️ Session pinned to one server — loss on server failure |

#### §3.4.5 Statelessness Tension

REST's statelessness constraint (Fielding 2000, §5.1.3) requires that each request from client to server must contain all the information necessary to understand the request. Session-based resolution violates this constraint: the session identifier is meaningless without the server-side session state, making each request dependent on shared state.

This violation has concrete consequences:

- **Horizontal scaling complexity.** Without a shared session store (Redis, database), sessions are pinned to individual server instances. Load balancers must use sticky sessions (session affinity), which reduces resilience — if the pinned server fails, the session is lost.
- **Deploy and restart disruption.** Rolling deployments that terminate server instances will drop in-memory sessions, forcing users to re-authenticate and re-submit PII. With Redis-backed sessions, this is not an issue.
- **Replay and session hijacking risk.** A stolen session identifier grants access to the associated PII for the session's lifetime. Sessions must have short TTLs and use secure cookie attributes (`Secure`, `HttpOnly`, `SameSite=Strict`).
- **Testing difficulty.** Stateful sessions make API testing harder — each test must first create a session, then perform the actual test. Stateless APIs (token-based, header-based) are easier to test because every request is self-contained.

#### §3.4.6 When Session-Based Resolution Is Appropriate

Despite the statelessness tension, session-based resolution has legitimate use cases:

- **Multi-step workflows.** Registration flows, KYC (Know Your Customer) processes, and multi-page application forms naturally accumulate state across steps. Storing PII in a session during the flow avoids retransmitting it in every step's URL.
- **Wizard-style APIs.** APIs that guide clients through a multi-step process (e.g., "upload document → verify identity → approve account") benefit from session state because intermediate state is complex and not well-represented in URLs.
- **Browser-based applications.** Web applications that use cookie-based sessions already have the infrastructure. Extending the session to hold PII for API calls is a natural fit — the session is already being maintained for authentication.
- **Temporary operations.** When PII is needed only for the duration of a specific operation (e.g., generating a document that includes the user's name and address), a short-lived session that expires after the operation completes aligns with GDPR's storage limitation principle (Article 5(1)(e)).

#### §3.4.7 When Session-Based Resolution Is Inappropriate

- **RESTful stateless APIs.** APIs that follow strict REST principles should not introduce session state. Use opaque identifiers (§3.3) or tokens (§3.5) instead.
- **Microservice architectures.** Sessions that are consumed by multiple services require a shared session store and cross-service session propagation — both of which add operational complexity. Prefer per-service opaque identifiers.
- **Long-lived PII storage.** Sessions have an inherent temporary nature (TTL-based expiry). If PII must persist across sessions (e.g., user profile data), sessions are the wrong abstraction — use a database with proper access controls.
- **API versioning and evolution.** Session schemas are harder to version than request/response schemas. Adding a new PII field to a session requires migration logic; adding it to a request body is a simple schema change.

#### §3.4.8 GDPR Alignment

Session-based resolution has mixed GDPR implications:

- ✅ **Data minimisation.** PII stored in sessions can be scoped to the minimum necessary for the workflow and automatically purged on TTL expiry.
- ✅ **Storage limitation.** Short-lived sessions (TTL of 15–30 minutes) align with Article 5(1)(e)'s requirement to limit storage to what is necessary.
- ⚠️ **Right to erasure (Article 17).** If a user exercises their right to erasure while an active session holds their PII, the session must be immediately invalidated and the PII purged. This requires a session store that supports targeted deletion (not just TTL-based expiry).
- ⚠️ **Accountability (Article 5(2).** Session stores containing PII must be included in the data processing audit trail. Ensure session creation, access, and deletion events are logged.

#### §3.4.9 Security Assessment

Session-based resolution provides **moderate to strong** PII protection, depending on implementation:

- ✅ **PII eliminated from URLs.** Subsequent requests carry only the session identifier.
- ✅ **Server-side control.** The server determines what PII is stored and for how long — client cannot extend session lifetime or access PII directly.
- ⚠️ **Session hijacking.** A compromised session identifier grants access to the stored PII. Mitigate with short TTLs, secure cookie attributes, and IP-binding or device-binding where appropriate.
- ⚠️ **Session fixation.** An attacker who can set a victim's session identifier before authentication can hijack the session. Mitigate by regenerating the session ID after PII submission (authentication event).
- ⚠️ **Session store compromise.** The session store is a concentrated target — a single database breach exposes all active sessions' PII. Encrypt session data at rest and restrict access to the session store.

---

### §3.5 Temporary Single-Use Tokens

#### §3.5.1 Concept

The temporary single-use token pattern generates a short-lived, cryptographic token that maps to PII server-side. The client includes this token in the URL instead of raw PII. On first use, the server resolves the token to the PII, performs the requested operation, and immediately invalidates the token — preventing replay.

This pattern is the gold standard for **email-delivered links** — the canonical use case being password reset, email verification, and account activation links. When a user clicks a link in an email, the URL must carry enough information to identify the user, but it must not expose the user's PII in browser history, server logs, or analytics platforms.

#### §3.5.2 How It Works

**Token generation:**

1. Server receives a request that requires PII-based URL access (e.g., "send password reset email").
2. Server generates a cryptographically random token.
3. Server stores a mapping: `{token → PII, createdAt, expiresAt, usedAt}`.
4. Server sends the token to the client (typically embedded in a URL delivered via email).

**Token consumption:**

5. Client includes the token in a URL: `GET /api/v1/password-reset?token=abc123def456...`
6. Server looks up the token in the mapping store.
7. Server validates: token exists, has not expired, has not been used.
8. Server resolves the PII, performs the operation, marks the token as used.
9. Subsequent attempts to use the same token return `410 Gone` or `403 Forbidden`.

The full token lifecycle is illustrated below:

```mermaid
flowchart LR
    GEN["`**1. Generate**
Server creates random token
+ stores PII mapping`"]
    EMBED["`**2. Embed**
Token in email link
/reset?token=xK8v...`"]
    CLICK["`**3. Click**
User opens link
Browser sends GET`"]
    RESOLVE["`**4. Resolve**
Lookup PII from token
Perform operation`"]
    CONSUME["`**5. Consume**
Delete token from store
410 Gone on replay`"]
    EXPIRE["`**6. Expire**
TTL auto-cleanup
if never clicked`"]

    GEN --> EMBED --> CLICK --> RESOLVE --> CONSUME
    EMBED -.->|TTL| EXPIRE

```

#### §3.5.3 Token Generation Requirements

The security of this pattern depends entirely on the quality of the token:

- **Cryptographic randomness.** Tokens must be generated using a CSPRNG (Cryptographically Secure Pseudo-Random Number Generator). In Python: `secrets.token_urlsafe(32)` (256 bits). In Java: `SecureRandom`. In Node.js: `crypto.randomBytes(32)`.
- **Minimum entropy.** 128 bits (16 bytes) of randomness provides 2^128 possible values — computationally infeasible to guess even with enormous resources. For most applications, 192 or 256 bits provides an additional safety margin.
- **URL-safe encoding.** Tokens embedded in URLs must use URL-safe characters: `A–Z`, `a–z`, `0–9`, `-`, `_`. Base64url encoding (RFC 4648 §5) maps 32 random bytes to a 43-character URL-safe string.
- **No semantic content.** Tokens must not encode PII, timestamps, or any guessable information. A token like `reset-janedoe-20260408` is trivially guessable — the token must be opaque.

**Example token generation (Python):**

```
import secrets

def generate_token() -> str:
    return secrets.token_urlsafe(32)
    # Example output: 'xK8vN2m_P9qR7wL5tY3jB1hF6dA0cE4gU8iS...'
```

#### §3.5.4 Token Storage

The server-side token store is a critical component. Design requirements:

| Requirement | Implementation |
|:--|:--|
| Fast lookup by token | Primary key index on token column (database) or key-value store (Redis) |
| Automatic expiry | TTL on Redis key, or database job that deletes expired tokens |
| Single-use enforcement | Atomic update: mark `usedAt = NOW()` only if `usedAt IS NULL` |
| Audit trail | Log token creation, usage, and expiry events (without logging the PII itself) |
| Data encryption at rest | Encrypt the PII value in the token record, not the token key |

**Redis implementation sketch:**

```redis
# Store token
SETEX token:xK8vN2m_P9qR... 3600 '{"email":"jane.doe@example.com","purpose":"password-reset"}'

# Consume token (atomic: GET and DELETE)
token_data = GET token:xK8vN2m_P9qR...
if token_data:
    DEL token:xK8vN2m_P9qR...
    process_password_reset(json.loads(token_data))
else:
    return 410 Gone  # Token expired or already used
```

The Redis `GET` + `DEL` pattern provides single-use semantics: the first consumer gets the data and deletes it; subsequent consumers find nothing. For strict atomicity in Redis Cluster, use a Lua script that performs both operations atomically.

#### §3.5.5 Expiration and Replay Prevention

Single-use tokens combine two protection mechanisms:

- **Time-based expiry.** Tokens have a short TTL (typically 10–60 minutes for password reset, 24–48 hours for email verification). After expiry, the token cannot be used even if it has never been consumed.
- **Consumption-based invalidation.** The token is marked as used (or deleted) on first access. Even within the TTL window, the token cannot be replayed.

Both mechanisms must be enforced:

| Attack scenario | Time-based expiry | Single-use | Combined |
|:--|:--|:--|:--|
| Token captured from logs after expiry | ✅ Blocked | ✅ Blocked | ✅ Blocked |
| Token replayed within TTL | ❌ Not blocked | ✅ Blocked | ✅ Blocked |
| Token guessed before expiry | ❌ Not blocked | ✅ Blocked (on first use) | ✅ Blocked |
| Token stolen from email client | ⚠️ Mitigated by short TTL | ✅ Blocked (after victim uses it) | ⚠️ Race condition — attacker uses it first |

The race condition in the last row is fundamental: if an attacker intercepts the token and uses it before the legitimate user, the legitimate user's click will fail. Mitigate with:

- **Short TTLs.** A 10-minute TTL reduces the window for interception.
- **Notification on consumption.** Send a confirmation email when the token is used. If the user did not initiate the action, they know their email was compromised.
- **Rate limiting.** Limit password reset attempts per email address per time window to prevent token-flooding attacks.

#### §3.5.6 Email Link Use Case

The canonical application of single-use tokens is email-delivered links:

```
Dear Jane,

Click the link below to reset your password. This link expires in 15 minutes.

https://app.example.com/reset-password?token=xK8vN2m_P9qR7wL5tY3jB1hF6dA0cE4gU8iS

If you did not request a password reset, ignore this email.
```

Without the single-use token pattern, the URL would need to contain the user's email or user ID — both PII:

```
❌ https://app.example.com/reset-password?email=jane.doe@example.com
❌ https://app.example.com/reset-password?userId=usr_2847291
```

Both alternatives expose PII: the email directly, and the user ID if it is a sequential integer (IDOR risk) or a semantically meaningful identifier.

With the single-use token, the URL is clean — no PII, no guessable identifiers, and a built-in expiry and replay prevention mechanism. Browser history, server logs, and analytics platforms only see an opaque token.

#### §3.5.7 Email Security Scanner and Link Preview Operational Reality

A frequently overlooked operational problem with email-delivered tokens is that **automated link followers consume the token before the human user clicks it**. Corporate email security scanners — Proofpoint, Mimecast, Microsoft Defender for Office 365, Barracuda, Cisco Secure Email — automatically issue HTTP GET requests to every URL found in incoming emails to check for malware, phishing, and domain reputation. Link unfurling bots in messaging platforms (Slack, Microsoft Teams, Discord, Google Chat) perform the same pre-fetch to generate link previews. When a single-use token is embedded in that URL, the scanner's GET request consumes it — and the legitimate user receives an "invalid or expired token" error when they finally click.

This is not a theoretical edge case. It is a well-documented operational problem affecting magic link authentication, password reset flows, and email address verification across high-security corporate environments (OWASP Authentication Cheat Sheet, §Password Reset Mechanisms). The failure mode is silent from the server's perspective — the token was consumed by a valid GET request — and manifests only as user complaints about broken email links.

<details>
<summary>Concrete failure scenario</summary>

A SaaS platform sends a password reset email to `jane.doe@corporate.com`:

```
https://app.example.com/reset-password?token=xK8vN2m_P9qR7wL5tY3jB1hF6dA0cE4gU8iS
```

Corporate email gateway (Proofpoint) scans the email within milliseconds of delivery. Proofpoint issues:

```http
GET /reset-password?token=xK8vN2m_P9qR7wL5tY3jB1hF6dA0cE4gU8iS HTTP/1.1
Host: app.example.com
User-Agent: Mozilla/5.0 (compatible; MSIE; Microsoft Outlook/16.0; Proofpoint)
```

The server validates the token, marks it as **consumed**, and returns a 200 with the password reset form HTML. The token is now invalid. When Jane clicks the link five minutes later:

```json
{ "error": "invalid_token", "message": "This token has already been used or has expired." }
```

Jane assumes the email is broken or fraudulent and contacts support — generating a support ticket instead of completing the self-service reset.

</details>

##### Mitigations

**Intermediate confirmation step.** The link does not perform the consumptive action on GET. Instead, it renders a confirmation page ("Click below to confirm your password reset") that submits via POST. The token is consumed only on the POST request. Since email scanners and link preview bots only issue GET requests, the token remains valid for the human user. This is the most robust and widely deployed mitigation:

```http
GET /reset-password?token=xK8vN2m_P9qR7wL5tY3jB1hF6dA0cE4gU8iS
→ 200 OK: Renders confirmation page (token NOT consumed)

POST /reset-password?token=xK8vN2m_P9qR7wL5tY3jB1hF6dA0cE4gU8iS
   CSRF-Token: <csrftoken>
→ 200 OK: Token consumed, password reset performed
```

This approach also aligns with HTTP semantics — GET is safe and idempotent (RFC 9110, §9.2.1) and should never cause state-changing side effects.

**Split link + code flow.** The email contains a URL that does not include the token, plus a separate short alphanumeric code displayed in the email body:

```
Your verification code: 847 291

Click here to enter it:
https://app.example.com/reset-password
```

The user clicks the link (safe for scanners — no token in the URL) and enters the code on the landing page. This is functionally identical to OTP verification and eliminates the scanner problem entirely, at the cost of requiring the user to type or copy a short code.

**Scanner User-Agent detection.** The server inspects the `User-Agent` header for known scanner signatures — `Proofpoint`, `Mimecast`, `Microsoft Outlook/`, `Slackbot`, `Discordbot`, `Twitterbot`, `Facebookexternalhit` — and skips token consumption for matching requests. This mitigation is fragile: scanner User-Agent strings change without notice, some scanners spoof browser UAs to evade detection, and the list requires ongoing maintenance. It should not be the sole mitigation, but it can serve as a supplementary defence layer.

**Session binding.** After the user loads the confirmation page, the server sets a session cookie or stores a browser fingerprint server-side. The final consumptive POST is only accepted if it originates from the same session that loaded the confirmation page. Even if an attacker intercepts the link, they cannot complete the flow without the session. This adds server-side state but provides strong anti-theft protection.

##### Trade-Off Summary

| Mitigation | Scanner resistance | User friction | Implementation complexity | Maintenance burden |
|:--|:--:|:--:|:--:|:--:|
| **Intermediate confirmation page** | ✅ High — scanners only GET | 🟢 Low — one extra click | 🟢 Low — add a POST handler | 🟢 None |
| **Split link + code flow** | ✅ Complete — no token in URL | 🟡 Medium — user must enter code | 🟡 Medium — two-step UI | 🟢 None |
| **Scanner UA detection** | ⚠️ Fragile — UA strings change | 🟢 None | 🟡 Medium — UA database upkeep | 🔴 High — ongoing updates |
| **POST-based consumption** | ✅ High — same as confirmation page | 🟢 None (if combined with above) | 🟢 Low — HTTP method change | 🟢 None |
| **Session binding** | ✅ High — ties action to browser | 🟢 None | 🟡 Medium — session state | 🟡 Medium — session store |

*Legend: ✅ Strong · ⚠️ Partial · 🟢 Low · 🟡 Medium · 🔴 High*

##### Recommendation

The **intermediate confirmation page** pattern (GET renders, POST consumes) is the most robust and widely deployed solution. It aligns with HTTP method semantics — GET is safe and idempotent per RFC 9110 — and requires no ongoing maintenance. The split link + code flow is an excellent alternative when the design can accommodate a short code entry step. Scanner User-Agent detection should only be used as a supplementary defence, never as the sole mitigation.

The broader design principle is clear: **never design a flow where a GET request is the destructive or consumptive event.** Any URL that performs a state-changing action on GET is vulnerable not only to email scanners but also to link prefetching by browsers, search engine crawlers, and antivirus software. Token consumption — like all state mutations — belongs behind a POST.

#### §3.5.8 Extra Round-Trip Overhead

The primary cost of this pattern is the extra round-trip:

1. **Token generation request.** The client must first request a token before performing the actual operation. This adds one HTTP round-trip.
2. **Token resolution on the server.** Each request that uses a token requires a lookup operation against the token store.

For most applications, this overhead is negligible — the token generation is a one-time operation per workflow, and the lookup is a fast primary-key read. However, in high-frequency API scenarios where PII-based lookups occur on every request (e.g., per-request user resolution), the extra round-trip and lookup add latency that compounds across millions of requests. In these cases, §3.3 (Opaque Internal Identifiers) is more efficient — the opaque ID is assigned once during registration and reused indefinitely without token generation.

#### §3.5.9 When Single-Use Tokens Are Appropriate

- ✅ **Email-delivered links.** Password reset, email verification, account activation, document signing invitations.
- ✅ **One-time operations.** Actions that should only be performed once: email unsubscribe links, consent withdrawal links, survey responses.
- ✅ **Cross-system handoffs.** When one system needs to pass PII to another via URL (e.g., redirecting from an identity provider to a service provider), a single-use token bridges the handoff without exposing PII in the URL.
- ✅ **Short-lived workflows.** Multi-step processes where each step's URL should not persist PII beyond the workflow's completion.

#### §3.5.10 When Single-Use Tokens Are Inappropriate

- ❌ **High-frequency lookups.** Per-request PII resolution where the overhead of token generation and lookup is unacceptable.
- ❌ **Long-lived references.** URLs that must remain valid for days or weeks (e.g., shared report links, bookmarkable dashboards).
- ❌ **Offline-capable clients.** Mobile or desktop applications that may queue requests for later execution — tokens may expire before the queued request is sent.

#### §3.5.11 Security Assessment

Temporary single-use tokens provide **strong** PII protection for specific use cases:

- ✅ **URL completely clean.** No PII in URLs, query parameters, or path segments.
- ✅ **Replay prevention.** Single-use semantics prevent token reuse even within the TTL window.
- ✅ **Automatic expiry.** Time-based TTL limits the exposure window.
- ✅ **No server-side session state needed.** Unlike §3.4, tokens do not require session management infrastructure — a simple key-value store suffices.
- ⚠️ **Token store compromise.** If the token store is breached, valid (unused) tokens can be consumed by the attacker before their TTL expires. Mitigate with short TTLs and encrypted PII values in the store.
- ⚠️ **Interception risk.** If the delivery channel (email) is compromised, the attacker can use the token before the legitimate user. This is a limitation of any URL-based mechanism and cannot be fully mitigated — only reduced through short TTLs and notification emails.
- ⚠️ **Token guessing.** With 256 bits of entropy, token guessing is computationally infeasible. However, if token generation is accidentally implemented with insufficient randomness (e.g., `Math.random()` instead of `crypto.randomBytes()`), the entropy drops to ~32 bits — trivially guessable. Audit token generation code for CSPRNG usage.

---

### §3.6 Comparative Analysis: Architectural Patterns

#### §3.6.1 Pattern Comparison Matrix

The five architectural patterns address the same fundamental problem — removing PII from URLs — but differ significantly in their security properties, REST compliance, operational complexity, and suitability for different use cases. The following matrix provides a structured comparison across key dimensions.

| Dimension | §3.1 POST Body Migration | §3.2 Header-Based Placeholders | §3.3 Opaque Internal Identifiers | §3.4 Session-Based Resolution | §3.5 Single-Use Tokens |
|:--|:--|:--|:--|:--|:--|
| **PII removed from URL** | ✅ Complete | ✅ Complete | ✅ Complete | ✅ Complete (after session creation) | ✅ Complete |
| **REST compliance** | ⚠️ Violates GET semantics | ⚠️ Non-standard header usage | ✅ Full compliance | ❌ Violates statelessness | ✅ Full compliance |
| **Caching (GET responses)** | ❌ Not cacheable by default | ✅ Cacheable | ✅ Cacheable | ⚠️ Depends on session mechanism | ✅ Cacheable |
| **Implementation complexity** | 🟢 Low — change HTTP method | 🟡 Medium — custom headers, proxy config | 🟡 Medium — lookup table, ID generation | 🔴 High — session infrastructure | 🟡 Medium — token generation, store |
| **Infrastructure requirements** | None | Header passthrough config at proxies | Database/cache for lookup table | Shared session store (Redis, DB) | Key-value store with TTL |
| **Extra round-trips** | None | None | None (after initial ID assignment) | 1 (session creation) | 1 (token generation) |
| **Idempotency** | ⚠️ POST is not idempotent | ✅ GET remains idempotent | ✅ GET remains idempotent | ⚠️ Session mutations are not idempotent | ✅ Token consumption is idempotent (fails on replay) |
| **Browser compatibility** | ✅ Universal | ⚠️ Custom headers from JS restricted (CORS) | ✅ Universal | ✅ Cookie-based | ✅ Universal |
| **API discoverability** | ⚠️ POST for reads is confusing | ❌ Headers are non-discoverable | ✅ Clean, self-documenting URLs | ⚠️ Session creates hidden state | ✅ Token in URL is visible |
| **Replay protection** | ❌ No inherent protection | ❌ No inherent protection | ❌ No inherent protection | ⚠️ Session TTL only | ✅ Single-use + TTL |
| **GDPR data minimisation** | ✅ No extra data stored | ✅ No extra data stored | ⚠️ Lookup table is additional PII store | ⚠️ Session store is additional PII store | ⚠️ Token store is additional PII store |
| **Best for** | Quick migration, infrequent reads | Internal APIs with proxy control | General-purpose, public APIs | Multi-step workflows, web apps | Email links, one-time operations |

*Legend: ✅ Strong/Compliant · ⚠️ Partial/Caveats · ❌ Weak/Non-compliant · 🟢 Low · 🟡 Medium · 🔴 High*

#### §3.6.2 Security Strength Ranking

```mermaid
%%{init: {themeVariables: {fontSize: "13px"}}}%%
flowchart TB
    subgraph LEGEND["Security Spectrum"]
        direction LR
        L1["Moderate"] --> L2["Strong"]
    end

    subgraph MODERATE["Moderate Protection"]
        POST["§3.1 POST Body<br/>Simple, no infra<br/>Loses caching + REST"]
        HDR["§3.2 Headers<br/>GET preserved<br/>Proxy stripping risk"]
    end

    subgraph STRONG["Strong Protection"]
        OPAQUE["§3.3 Opaque IDs<br/>Best general-purpose<br/>Lookup table attack surface"]
        SESSION["§3.4 Session-Based<br/>Server-side vault<br/>Session hijack risk"]
        TOKEN["§3.5 Single-Use Tokens<br/>Replay prevention<br/>Interception risk"]
    end

    LEGEND ~~~ MODERATE
    MODERATE ~~~ STRONG
```

Ranked from strongest to weakest for PII protection in the URL channel:

1. **§3.3 Opaque Internal Identifiers** — Strongest general-purpose pattern. Complete URL decontamination with full REST compliance, caching support, and enumeration resistance. The lookup table is the only additional attack surface.

2. **§3.5 Single-Use Tokens** — Tied for strongest in specific use cases. Excellent for email links and one-time operations. Replay prevention and automatic expiry provide additional security beyond what opaque identifiers offer. Limited to scenarios where a token-generation round-trip is acceptable.

3. **§3.4 Session-Based Resolution** — Strong when implemented with a secure session store, short TTLs, and proper cookie attributes. The session store is a concentrated target, and statelessness violations introduce operational complexity.

4. **§3.2 Header-Based Placeholders** — Moderate protection equivalent to §3.1, with additional proxy compatibility risks. Useful when PII must be separated from the URL but POST body migration is not feasible (e.g., GET must be preserved for caching).

5. **§3.1 POST Body Migration** — Moderate protection. Simplest to implement but sacrifices REST purity, caching, and idempotency. Best as a quick fix or migration step toward a more robust pattern.

#### §3.6.3 Decision Matrix: Pattern Selection by Use Case

| Use case | Recommended pattern(s) | Rationale |
|:--|:--|:--|
| **User profile lookup** | §3.3 (opaque IDs) | High-frequency GET; must be cacheable; UUID as user ID is standard practice |
| **Search by PII (email, SSN)** | §3.1 (POST body) → §3.3 (opaque ID for results) | Initial search uses POST; results reference opaque IDs for subsequent GETs |
| **Password reset email link** | §3.5 (single-use token) | One-time operation; token in URL is replay-safe and time-limited |
| **Email verification link** | §3.5 (single-use token) | Same as password reset — one-time, email-delivered |
| **Multi-step registration flow** | §3.4 (session) or §3.5 (token per step) | Session captures accumulated PII; tokens work if each step is independent |
| **Internal microservice communication** | §3.3 (opaque IDs) + mTLS | Backend-to-backend; opaque IDs + mutual TLS for transport security |
| **Public API with browser clients** | §3.3 (opaque IDs) | Full REST compliance; cacheable; no CORS issues |
| **Legacy API migration (PII in URLs)** | §3.1 (immediate) → §3.3 (target) | POST body migration as stopgap; opaque IDs as long-term solution |
| **Government/tax ID lookups** | §3.1 (POST body) + §3.3 (opaque ID) | Tax ID is PII; use POST for initial lookup, return opaque ID for caching |
| **Healthcare patient lookup** | §3.3 (opaque IDs) + §3.2 (headers for filters) | Patient ID is opaque; additional PII filters in headers if needed |
| **Account activation from email** | §3.5 (single-use token) | One-time; email-delivered; must not be replayable |
| **Document signing invitation** | §3.5 (single-use token) | One-time; recipient identity must not be exposed in URL |
| **Dashboard bookmarkable URLs** | §3.3 (opaque IDs) | Must be cacheable and bookmarkable; opaque IDs in path are ideal |
| **Shared report link (time-limited)** | §3.5 (single-use or time-limited token) | URL must expire; single-use prevents unauthorized sharing |

```mermaid
flowchart TD
    START(["`**Which architectural pattern?**`"]) --> Q1{"Is it a one-time operation
    delivered via email or link?"}
    Q1 -->|Yes| TOKEN["§3.5 Single-Use Token"]
    Q1 -->|No| Q2{"Is it a multi-step
    web workflow?"}
    Q2 -->|Yes| SESSION["§3.4 Session-Based Resolution"]
    Q2 -->|No| Q3{"Can you change the API
    to use server-generated IDs?"}
    Q3 -->|Yes| OPAQUE["§3.3 Opaque Internal Identifiers"]
    Q3 -->|No — legacy API| Q4{"Can you change the
    HTTP method to POST?"}
    Q4 -->|Yes| POST["§3.1 POST Body Migration"]
    Q4 -->|No — must stay GET| HEADER["§3.2 Header-Based Placeholders"]

```

#### §3.6.4 Pattern Combinations

The patterns are not mutually exclusive — they can be combined to address different aspects of PII protection within a single API:

```mermaid
%%{init: {themeVariables: {fontSize: "13px"}}}%%
flowchart TB
    subgraph COMBO1["Combo 1: Search + Cache"]
        direction LR
        C1A["POST search<br/>§3.1"] --> C1B["Returns opaque ID"] --> C1C["GET with opaque ID<br/>§3.3"]
    end

    subgraph COMBO2["Combo 2: Filters + Resources"]
        direction LR
        C2A["Opaque ID in path<br/>§3.3"] --> C2B["PII filters in headers<br/>§3.2"]
    end

    subgraph COMBO3["Combo 3: Email + Persistent"]
        direction LR
        C3A["Single-use token<br/>§3.5"] --> C3B["Resolves to opaque ID"] --> C3C["Opaque ID for<br/>subsequent §3.3"]
    end

    subgraph COMBO4["Combo 4: Session + Token Handoff"]
        direction LR
        C4A["Single-use token<br/>§3.5"] --> C4B["Creates session §3.4"] --> C4C["Session for<br/>remaining steps"]
    end

    subgraph COMBO5["Combo 5: POST + Headers"]
        direction LR
        C5A["POST body for<br/>payload PII §3.1"] --> C5B["Headers for<br/>URL PII §3.2"]
    end

    COMBO1 ~~~ COMBO2
    COMBO2 ~~~ COMBO3
    COMBO3 ~~~ COMBO4
    COMBO4 ~~~ COMBO5
```

**§3.1 + §3.3 (POST search → opaque ID result).** The most common combination. A search endpoint accepts PII in a POST body, returns opaque identifiers in the response, and all subsequent access uses GET with opaque IDs. This preserves caching for the common case while protecting the initial PII-based lookup.

**§3.2 + §3.3 (Headers for dynamic PII, opaque IDs for resources).** Opaque IDs identify resources in the URL path, while dynamic PII (e.g., filter values in search) travels in `X-PII-*` headers. This keeps the URL clean while allowing complex PII-based filtering.

**§3.3 + §3.5 (Opaque ID + single-use token for email links).** When an email must contain a link to a user-specific resource, generate a single-use token that resolves to the opaque ID. The user clicks the link, the token resolves to the opaque ID, and the opaque ID is used for all subsequent navigation within the application.

**§3.4 + §3.5 (Session for workflow, token for handoff).** In a multi-step workflow that begins with an email link, use a single-use token for the initial email click, create a session on first access, and use the session for subsequent steps. The session provides stateful storage for the workflow; the token provides secure, replay-safe handoff from email to web.

**§3.1 + §3.2 (POST body + headers for mixed PII).** When both body and URL would contain PII (e.g., a POST with a search filter in the body and a user reference in the URL), move the body PII to the body (by definition) and the URL PII to headers. This is a fallback combination when neither pattern alone is sufficient.

#### §3.6.5 Summary

Architectural patterns are the first line of defence against PII exposure in URLs. They require no cryptography, no specialised vendor products, and no changes to the data itself — only changes to *where* the data travels within the HTTP request. The trade-offs are primarily around REST compliance, caching, and operational complexity.

For new API designs, **§3.3 (Opaque Internal Identifiers)** should be the default choice — it provides the strongest combination of security, REST compliance, and usability. Use **§3.5 (Single-Use Tokens)** for email-delivered links and one-time operations. Reserve **§3.1 (POST Body Migration)** for rapid migrations and **§3.4 (Session-Based Resolution)** for multi-step web application workflows. **§3.2 (Header-Based Placeholders)** fills a niche when headers must carry PII but POST body migration is not feasible.

Architectural patterns alone are necessary but not sufficient for comprehensive PII protection. They protect the URL channel but do not encrypt PII at rest, do not protect PII in response bodies, and do not address log redaction or audit requirements. The following chapters build on this foundation with cryptographic patterns (Chapter 4), pseudonymization and tokenization (Chapter 5), infrastructure patterns (Chapter 6), and protocol-level patterns (Chapter 8).

Use the later reference chapters selectively based on the pattern you choose:

| If your primary answer is... | Read next | Why |
|:-----------------------------|:----------|:----|
| **POST-body lookup, opaque IDs, or single-use tokens** | §7, §9 | Turn the contract decision into policy, migration, and deprecation work |
| **A design with residual leak surfaces or browser/tooling exposure** | §6, §16 | Control logs, caches, traces, analytics, and support systems |
| **A reversible or tokenized implementation** | §13, §14, §15 | Govern decryption, auditability, key lifecycle, and erasure |
| **A product-backed implementation path** | §10, §11, §12 | Compare vendors, cloud primitives, and build-vs-buy scope |

---

## 4. Cryptographic Patterns

Cryptographic patterns transform PII into ciphertext before it enters a URL, providing mathematical guarantees of confidentiality that architectural patterns alone cannot achieve. Where tokenization replaces PII with a synthetic reference, encryption binds the data to a secret key — only holders of the correct key can recover the original value. This chapter surveys the principal cryptographic approaches applicable to URL-borne PII, evaluating each against the constraints of REST API design: URL length limits, encoding compatibility, performance overhead, key management burden, and regulatory alignment.

#### Chapter Roadmap

This chapter examines seven cryptographic patterns organized from simple and standardized (JWE, §4.1) through specialized (FPE §4.2, Deterministic AES §4.3, Searchable Encryption §4.4) to operationally complex (Envelope Encryption §4.5, Client-Side Encryption §4.6, Session-Bound Key §4.7). The chapter concludes with a comparative analysis (§4.8) that synthesizes trade-offs across all patterns. The diagram below maps the relationships between patterns, their foundational building blocks, and the synthesis section:

```mermaid
%%{init: {themeVariables: {fontSize: "14px"}}}%%
flowchart TD
    subgraph foundation["Foundation Layer"]
        direction LR
        RAW["`**Raw PII**
        plaintext value`"]
        ENC["`**Symmetric Encryption**
        AES-256-GCM`"]
        ASYM["`**Asymmetric Encryption**
        RSA / EC`"]
    end

    subgraph patterns["Cryptographic Patterns"]
        direction TB
        JWE["`**§4.1 JWE**
        Asymmetric key wrapping
        + AEAD encryption`"]
        FPE["`**§4.2 FPE**
        Feistel network on
        format-preserving domain`"]
        DAES["`**§4.3 Deterministic AES**
        AES-GCM-SIV / AES-SIV
        synthetic IV from plaintext`"]
        SE["`**§4.4 Searchable Enc.**
        OPE / SSE / equality-preserving
        property-preserving schemes`"]
        ENV["`**§4.5 Envelope Enc.**
        Per-request DEK
        + KEK wrapping via KMS`"]
        CSE["`**§4.6 Client-Side Enc.**
        Browser encrypts before
        transmission`"]
        SBK["`**§4.7 Session-Bound Key**
        Per-session AES key
        + Web Crypto API`"]
    end

    subgraph analysis["Synthesis"]
        COMP["`**§4.8 Comparative Analysis**
        Decision matrix, pattern
        layering, use-case mapping`"]
    end

    RAW --> JWE
    RAW --> FPE
    RAW --> DAES
    RAW --> SE
    RAW --> ENV
    RAW --> CSE
    RAW --> SBK

    ENC --> JWE
    ENC --> FPE
    ENC --> DAES
    ENC --> ENV
    ENC --> SBK
    ASYM --> JWE
    ASYM --> CSE

    DAES -.->|builds on| SE
    ENV -.->|uses| ENC
    CSE -.->|can use| ENV
    SBK -.->|specializes| CSE

    JWE --> COMP
    FPE --> COMP
    DAES --> COMP
    SE --> COMP
    ENV --> COMP
    CSE --> COMP
    SBK --> COMP
```

Readers who need a quick recommendation should jump to §4.8; readers evaluating a specific pattern should navigate directly to the relevant section.

---

### §4.1 JWT/JWE Encrypted Parameters

#### §4.1.1 Concept Overview

JSON Web Tokens (JWTs) provide a compact, URL-safe means of representing claims between two parties (RFC 7519). When these claims contain PII — names, email addresses, national identification numbers — the standard JSON Web Signature (JWS, RFC 7515) is insufficient because it only signs the payload, leaving claims visible to any party who intercepts the token. JSON Web Encryption (JWE, RFC 7516) addresses this by encrypting the entire payload, ensuring that only holders of the decryption key can read the embedded PII.

The core idea is straightforward: instead of passing individual PII fields as separate URL query parameters (e.g., `?email=user@example.com&name=Jane+Doe`), the client packages all PII into a single JWE token and passes it as one parameter (e.g., `?token=eyJhbGciOiJSU0EtT0FFUC0yNTY...`). The server decrypts the token to recover the claims. Intermediate systems — proxies, loggers, CDNs — see only an opaque base64url string.

#### §4.1.2 JWT Structure: JWS vs JWE

A JWT is always a string of three or five dot-separated segments, depending on whether it uses JWS (signed) or JWE (encrypted):

**JWS (Signed JWT) — three segments:**
```
BASE64URL(UTF8(JWS Protected Header)) || . ||
BASE64URL(JWS Payload) || . ||
BASE64URL(JWS Signature)
```

The JWS payload is merely base64url-encoded, not encrypted. Anyone who obtains the token can decode the payload and read every claim. This is by design — JWS provides integrity and authenticity, not confidentiality. For PII transit, JWS alone is inadequate unless combined with TLS and strict access controls on logs.

**JWE (Encrypted JWT) — five segments:**
```
BASE64URL(JWE Protected Header) || . ||
BASE64URL(Encrypted Key) || . ||
BASE64URL(JWE Initialization Vector) || . ||
BASE64URL(JWE Ciphertext) || . ||
BASE64URL(JWE Authentication Tag)
```

RFC 7516 defines this five-part compact serialization. Each part serves a specific cryptographic function:

| Segment | Purpose | Example |
|:--------|:--------|:--------|
| **Protected Header** | Specifies encryption algorithm (`enc`) and key management algorithm (`alg`) | `{"alg":"RSA-OAEP-256","enc":"A256GCM"}` |
| **Encrypted Key** | The content encryption key (CEK), encrypted with the recipient's public key | Random ciphertext block |
| **Initialization Vector** | Nonce for the AEAD cipher | 96-bit random for A256GCM |
| **Ciphertext** | The encrypted JWT payload (the actual PII claims) | AEAD ciphertext |
| **Authentication Tag** | Integrity check for header + IV + ciphertext | 128-bit GCM tag |

```mermaid
flowchart LR
    subgraph JWE ["JWE Compact Serialization — 5 Segments"]
        direction LR
        H["`**Protected&nbsp;Header**
alg:&nbsp;RSA-OAEP-256
enc:&nbsp;A256GCM`"]
        EK["`**Encrypted&nbsp;Key**
CEK wrapped with
recipient public key`"]
        IV["`**Initialization&nbsp;Vector**
96-bit random nonce
for A256GCM`"]
        CT["`**Ciphertext**
Encrypted JWT payload
(the PII claims)`"]
        TAG["`**Authentication&nbsp;Tag**
128-bit GCM tag
integrity check`"]
    end

    H ~~~ EK
    EK ~~~ IV
    IV ~~~ CT
    CT ~~~ TAG

    KEY["`**Recipient&nbsp;Private&nbsp;Key**`"]
    KEY -.->|decrypt EK| EK
    EK -.->|recover CEK| CT
    IV -.->|AEAD nonce| CT
    CT -.->|verify| TAG

```

The recipient uses their private key to decrypt the Encrypted Key, recovers the CEK, then uses the CEK with the IV to decrypt the Ciphertext and verify the Authentication Tag. This provides both confidentiality and integrity.

#### §4.1.3 When to Use JWE vs JWS

The decision between JWS and JWE hinges on whether the claims must remain confidential from intermediaries:

- **Use JWS when** the claims are non-sensitive (user ID, role, session reference) and the token travels only over TLS to a trusted endpoint. The signature prevents tampering; TLS prevents eavesdropping.
- **Use JWE when** the claims contain PII that must not be exposed to intermediaries — proxy servers, API gateways, log aggregation systems, CDN edge nodes. JWE ensures confidentiality even if the token is logged, cached, or appears in a referrer header.

In the context of PII in URL parameters, JWE is almost always the correct choice. The primary threat model is not a network attacker (TLS handles that) but rather **insider threats and logging infrastructure** — any system that records the URL string becomes a PII repository if the claims are merely signed, not encrypted.

#### §4.1.4 Payload Claims for PII

The JWT payload is a JSON object containing registered, public, and private claims. For PII protection in URL parameters, the payload typically includes:

```json
{
  "sub": "usr_8f14e45f-ceea-467f-a330-7e4f2a2b3c9d",
  "email": "jane.doe@example.com",
  "given_name": "Jane",
  "family_name": "Doe",
  "date_of_birth": "1990-03-15",
  "tax_id": "123-45-6789",
  "iat": 1744128000,
  "exp": 1744214400,
  "nbf": 1744128000,
  "jti": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

**Registered claims relevant to PII:**

- `sub` (Subject) — identifies the principal. Use an internal identifier rather than PII when possible.
- `iat` (Issued At) — Unix timestamp of token creation.
- `exp` (Expiration) — Unix timestamp after which the token is invalid.
- `nbf` (Not Before) — Unix timestamp before which the token is not valid.
- `jti` (JWT ID) — unique identifier for the token, enabling replay detection.

**Custom claims for PII:** When PII must travel in the token, use namespaced custom claims to avoid collisions with registered claims:

```json
{
  "https://example.com/claims": {
    "email": "jane.doe@example.com",
    "phone": "+1-555-0123",
    "address": {
      "street": "123 Main St",
      "city": "Springfield",
      "postal_code": "62704"
    }
  }
}
```

The namespaced approach (`https://example.com/claims`) follows the JWT best practice of using reverse-domain notation to prevent claim name collisions (RFC 7519, §4.2).

#### §4.1.5 Expiry Claims for Automatic Token Invalidation

The `exp` (expiration) and `nbf` (not before) claims provide time-bound validity. This is critical for PII-bearing tokens: even if a token is intercepted and replayed, it becomes useless after `exp` elapses. For URL parameter tokens, short expiry windows are advisable — 5–15 minutes for interactive flows, seconds for single-use tokens.

```json
{
  "sub": "usr_8f14e45f",
  "email": "jane.doe@example.com",
  "iat": 1744128000,
  "exp": 1744128300,
  "nbf": 1744128000,
  "jti": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

In this example, the token is valid for 300 seconds (5 minutes). The `jti` claim combined with short `exp` enables a server-side replay cache: reject any `jti` value that has been seen before, even within the validity window.

#### §4.1.6 Tamper-Proofing: JWS Signatures

JWE provides confidentiality through encryption, but **JWE alone does not authenticate the sender**. An attacker who obtains the server's public key can construct a valid JWE with arbitrary claims. To ensure authenticity, combine JWE with JWS by nesting — encrypting first, then signing the ciphertext:

```
JWS(JWE(payload))
```

The sender first encrypts the PII claims into a JWE, then signs the resulting JWE string as a JWS. The recipient verifies the JWS signature (authenticating the sender), then decrypts the inner JWE (recovering the PII). This encrypt-then-sign approach provides both confidentiality and authenticity, and is the composition recommended by RFC 8725 (JSON Web Token Best Current Practices) for tokens carrying sensitive data.

RFC 7516 does not mandate nesting; the specification treats encryption and signing as independent operations. However, the security community broadly recommends nesting for tokens carrying sensitive data (see RFC 8725, §2.6 and §3.2).

#### §4.1.7 URL-Safe base64url Encoding

All five JWE segments use base64url encoding (RFC 4648, §5), which replaces `+` with `-` and `/` with `_`, and strips trailing `=` padding. This encoding is safe for use in URL query parameters and path segments without additional escaping.

| Standard base64 | base64url |
|:----------------|:----------|
| `abc+def/ghi=` | `abc-def_ghi` |

The JWE compact serialization concatenates the five base64url segments with periods, producing a string like:

```
eyJhbGciOiJSU0EtT0FFUC0yNTYiLCJlbmMiOiJBMjU2R0NNIn0.ZaV9M...eQ.IVf1...Cg.wyLt...Tw.R2l...Vg
```

This string is safe to embed directly in a URL parameter without percent-encoding.

#### §4.1.8 URL Length Limits

The most significant practical constraint on JWE tokens in URLs is **length**. A JWE containing PII claims, encrypted with RSA-OAEP-256 + A256GCM, produces a token of 500–1000+ characters. This exceeds common URL length limits:

| Context | Practical Limit | Notes |
|:--------|:----------------:|:------|
| **Browser address bar** | ~2,048 chars (IE), ~8,192 chars (Chrome) | Varies by browser; older IE was 2,083 |
| **Server URL parsing** | ~4,000–8,192 chars | nginx default: 4,096–8,192; Apache: 8,190 |
| **Proxy / WAF** | Varies | Some CDNs and WAFs truncate at 2,048 |
| **Server logs** | Varies | Some logging frameworks truncate long URLs |
| **HTTP/2** | No practical limit | HTTP/2 uses headers, not URL lines |

**Mitigation strategies:**

1. **Use POST instead of GET.** Moving the JWE to the request body eliminates URL length constraints entirely. The body is not logged by most proxies and CDNs.
2. **Minimize claim payload.** Include only the PII fields the downstream service actually needs. Replace verbose claims (full address) with references (address_id pointing to server-side storage).
3. **Use EC keys instead of RSA.** ECDH-ES key agreement produces shorter encrypted keys than RSA-OAEP (65 bytes vs 256 bytes for RSA-2048).
4. **Use `dir` key agreement.** When the client and server share a symmetric key, the `dir` algorithm (RFC 7518, §4.1) eliminates the Encrypted Key segment entirely, reducing token length by ~256 bytes.

#### §4.1.9 Key Management: Symmetric vs Asymmetric

| Dimension | Symmetric (HS256/A256GCM) | Asymmetric (RSA/EC) |
|:----------|:--------------------------|:---------------------|
| **Algorithm** | `alg: dir`, `enc: A256GCM` | `alg: RSA-OAEP-256`, `enc: A256GCM` |
| **Key distribution** | Both parties share the same secret key | Server holds private key; clients hold public key |
| **Token length** | Shorter (~200–400 chars) | Longer (~500–1200 chars due to encrypted CEK) |
| **Key rotation** | Must coordinate rotation across all parties | Rotate server key; clients fetch new public key via JWKS |
| **Scalability** | O(n) keys for n client-server pairs | O(1) public key for unlimited clients |
| **Trust model** | Mutual trust required | Unidirectional: any client with public key can encrypt |
| **JWKS support** | Not recommended (exposes secret) | Standard: publish public keys at `/.well-known/jwks.json` |

For PII-bearing JWE tokens in URLs, **asymmetric encryption** is typically preferred because it eliminates the need to distribute symmetric keys to every client. The server publishes a JWKS (JSON Web Key Set, RFC 7517) endpoint; clients fetch the public key and encrypt. Key rotation is straightforward — the server generates a new key pair, adds it to JWKS with a future `nbf`, and clients automatically pick up the new key.

#### §4.1.10 Performance Characteristics

JWE encryption and decryption impose measurable overhead compared to plain text parameters:

| Operation | Approximate Latency | Notes |
|:----------|:--------------------:|:------|
| **JWE encryption (client)** | 1–5 ms | Dominated by RSA key encapsulation or ECDH key agreement |
| **JWE decryption (server)** | 1–3 ms | RSA private key operation is the bottleneck |
| **Base64url encoding** | <0.1 ms | Negligible for typical payload sizes |
| **Total vs plain params** | +2–8 ms per request | Acceptable for most API workloads |

These numbers assume RSA-2048 with A256GCM on modern server hardware. EC keys (ECDH-ES with A256GCM) can reduce encryption time by ~50% due to smaller key sizes, though the difference is marginal for typical API volumes.

#### §4.1.11 Libraries

| Language | Library | JWE Support | Notes |
|:---------|:---------|:------------|:------|
| **Node.js** | `jose` | ✅ Full | Modern, maintained, supports all JWE algorithms |
| **Node.js** | `node-jose` | ✅ Full | Mature; larger API surface |
| **Python** | `PyJWT` | ✅ (with `cryptography`) | Requires `[crypto]` extra for JWE support |
| **Python** | `jwcrypto` | ✅ Full | Independent implementation, full JOSE suite |
| **Java** | `java-jwt` (Auth0) | ❌ JWS only | Does not support JWE encryption |
| **Java** | `nimbus-jose-jwt` | ✅ Full | Most comprehensive Java JOSE library |
| **Go** | `go-jose` | ✅ Full | Used by many production systems |
| **Rust** | `jsonwebtoken` | ❌ JWS only | No JWE support |
| **.NET** | `System.IdentityModel.Tokens.Jwt` | ✅ Full | Microsoft's official library (Microsoft.IdentityModel) |

#### §4.1.12 Example: JWE Containing PII as URL Parameter

**Step 1 — Client constructs the PII payload:**
```json
{
  "sub": "usr_8f14e45f",
  "email": "jane.doe@example.com",
  "given_name": "Jane",
  "family_name": "Doe",
  "tax_id": "123-45-6789",
  "iat": 1744128000,
  "exp": 1744128300,
  "jti": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

**Step 2 — Client encrypts the payload as a JWE (using ECDH-ES + A256GCM):**
```
eyJhbGciOiJFQ0RILUVTIiwiZW5jIjoiQTI1NkNCQyIsImVwayI6eyJrdHkiOiJFQyIsImNydiI6IlAtMjU2IiwieCI6Im1G...}}.lLk...Qw.8vW...rA.NzA...hQ.dGh...3Y
```

**Step 3 — Client sends the request:**
```http
GET /api/v1/users/profile?pii_token=eyJhbGciOiJFQ0RILUVTIiwiZW5jIjoiQTI1NkNCQyIsImVwayI6eyJrdHkiOiJFQyIsImNydiI6IlAtMjU2IiwieCI6Im1G...}}.lLk...Qw.8vW...rA.NzA...hQ.dGh...3Y HTTP/1.1
Host: api.example.com
```

**Step 4 — Server decrypts the JWE and processes the PII:**
```python
import jose.jwe
import jose.jwk

# Load server's ECDH private key
private_key = jose.jwk.ECKey(key_dict)

# Decrypt the JWE from the URL parameter
plaintext = jose.jwe.decrypt(
    pii_token,
    private_key
)
claims = json.loads(plaintext)

# claims['email'] == 'jane.doe@example.com'

# Process PII as needed, then discard
```

**What intermediaries see:** Only the opaque base64url string. No PII is visible in server access logs, proxy logs, CDN logs, or browser history.

---

### §4.2 Format-Preserving Encryption (FPE)

#### §4.2.1 Concept Overview

Format-Preserving Encryption (FPE) is a class of symmetric encryption algorithms that produce ciphertext in the same format as the plaintext. Unlike standard encryption — which produces random-looking byte strings of potentially different length — FPE transforms "123-45-6789" into something like "987-12-3456": same length, same character set, same structural format. The result is **indistinguishable in format** from a valid value of the same data type.

This property makes FPE uniquely valuable for protecting PII in systems with rigid schema constraints. A database column defined as `CHAR(11)` for Social Security Numbers (format `XXX-XX-XXXX`) can store FPE-encrypted SSNs without any schema changes. A legacy COBOL program that expects 9-digit numeric account numbers continues to function correctly with FPE-encrypted values. An API that validates phone numbers against a regex pattern still passes validation after FPE encryption.

FPE is specified in NIST SP 800-38G (originally published March 2016, revised February 2025 as SP 800-38G Rev. 1). The standard defines two algorithms: FF1 and FF3-1.

#### §4.2.2 NIST SP 800-38G: FF1 and FF3-1

**FF1 (Format-preserving Feistel-based encryption, radix ≤ 2^16):**

FF1 uses a 10-round Feistel network operating on numerically-encoded plaintext. The input plaintext (e.g., a credit card number) is split into two halves, and each round applies a round function based on AES to one half, using the other half as input. After 10 rounds, the halves are recombined to produce the ciphertext.

- **Radix:** The character set size (e.g., radix 10 for digits, radix 26 for letters, radix 36 for alphanumeric).
- **Min plaintext length:** 2 characters (after FF1, which originally required a minimum of 8 in the base64url domain — see security discussion below).
- **Max plaintext length:** 2^32 characters.
- **Tweak:** An optional secondary input (like an IV) that ensures the same plaintext encrypts to different ciphertexts when the tweak differs. Typically 64–128 bits.
- **Key:** 128, 192, or 256 bits (AES key).

**FF3-1 (Revised FF3):**

FF3-1 is the revised version of the original FF3 algorithm, which was found to have a security weakness (see §4.2.6 below). The revision increases the minimum domain size from the vulnerable range. FF3-1 uses an 8-round Feistel network with a different tweak schedule.

- **Radix:** Up to 2^16.
- **Min plaintext length:** At least 100 elements in the domain (radix^minlen ≥ 100). This is the key change from FF3, which was vulnerable for small domains.
- **Max plaintext length:** 2 × 10^7 characters.

**NIST SP 800-38G Rev. 1 (February 2025) updates:**

The 2025 revision made two significant changes:

1. **FF3 and FF3-1 are deprecated.** A weakness in the tweak schedule was identified that reduces the effective security below the intended level for certain configurations. FF1 remains the only NIST-approved FPE method.
2. **Minimum domain size for FF1 increased.** The revised standard requires the domain size (radix^minlen) to be at least 1,000,000 (10^6), effectively prohibiting FPE encryption of very short strings (e.g., 4-digit PINs) under the NIST approval.

#### §4.2.3 How FPE Works (High Level)

FPE operates by encoding the plaintext into a numerical representation, applying a Feistel network, and decoding the result back into the original character set:

1. **Encode:** Convert the plaintext characters into a numerical representation using the specified radix. For example, the SSN "123-45-6789" becomes the sequence of digits [1, 2, 3, 4, 5, 6, 7, 8, 9] (the dashes are structural, not part of the encrypted payload — or they can be included if the radix is defined to encompass them).

2. **Convert to bignum:** Treat the digit sequence as a number in the given radix. For radix-10, [1,2,3,4,5,6,7,8,9] → 123456789.

3. **Feistel network:** Split the number into two halves (A, B). For each of 10 rounds (FF1):
   - Compute round function F(B, round_number) using AES
   - New A = B
   - New B = (A + F(B, round_number)) mod radix^len(A)

4. **Recombine:** Merge the two halves back into a single number.

5. **Decode:** Convert the number back into the character sequence using the same radix. The result is a string of the same length and character set as the plaintext.

6. **Reformat:** Apply the original structural format (insert dashes, slashes, or other delimiters at the same positions).

The tweak value is mixed into each round function, ensuring that the same plaintext produces different ciphertext when encrypted with different tweaks. This is critical for security: without a tweak, FPE becomes deterministic (same input → same output), which leaks information about value frequency.

#### §4.2.4 Practical Examples

**Social Security Number encryption:**
```
Plaintext:  123-45-6789
Key:        [256-bit AES key]
Tweak:      0x48616c66 (binary representation of "Half")
Ciphertext: 987-12-3456
```

The ciphertext "987-12-3456" is a valid SSN format: nine digits, three groups separated by dashes. No system processing this value needs to be modified — it passes the same regex validators and fits in the same database column.

**Credit card number encryption:**
```
Plaintext:  4532-1234-5678-9010
Ciphertext: 7198-4321-8076-2543
```

**Email address encryption (radix 36, alphanumeric):**
```
Plaintext:  user@example.com
Ciphertext: k7xw@pn3fjrs.m9q
```

Note: When encrypting email addresses, the structural characters (`@`, `.`) must be handled carefully. One approach encrypts only the alphanumeric portions and leaves structural characters intact; another includes them in the radix (e.g., radix 38 for a-z, 0-9, @, .).

#### §4.2.5 Suitability for URL Parameters

FPE ciphertext is the same length as the plaintext, making it inherently compact — no padding, IV, or authentication tag bytes expand the ciphertext. This is a significant advantage over standard encryption for URL parameters:

| Property | FPE | Standard AES-GCM |
|:---------|:----|:-----------------|
| **Ciphertext length** | Same as plaintext | Plaintext + 12 (IV) + 16 (tag) bytes |
| **Character set** | Matches plaintext (digits, letters) | Raw bytes, requires base64url |
| **URL-safe?** | Yes (if plaintext is URL-safe) | After base64url encoding |
| **Format validation** | Passes (same format) | Fails (different format) |

For URL parameters, FPE-encrypted PII can be embedded directly without any additional encoding:

```http
GET /api/v1/customers?ssn=987-12-3456&phone=555-987-6543 HTTP/1.1
```

An observer sees valid-looking SSN and phone values — they are ciphertext, but indistinguishable from real values by format alone. This is both an advantage (no schema changes) and a risk (the observer cannot tell the values are encrypted, so they might be treated as real PII by downstream systems).

**Important caveat:** FPE alone does not provide integrity protection. A man-in-the-middle can modify FPE-encrypted values, and the modification may produce a valid (but different) ciphertext. For URL parameters, combine FPE with a MAC (e.g., HMAC-SHA256 over the entire parameter string) or use it within a JWS/JWE wrapper.

#### §4.2.6 Deterministic vs Non-Deterministic Modes

**Deterministic mode (no tweak or fixed tweak):** Same plaintext always encrypts to the same ciphertext. This enables exact-match searches on encrypted data — a powerful feature for databases and APIs that need to look up records by encrypted PII. However, it leaks frequency information: if the same ciphertext appears 1,000 times, an attacker knows the underlying plaintext appears 1,000 times.

**Non-deterministic mode (per-encryption tweak):** Each encryption operation uses a unique tweak (random, or derived from context like a session ID), producing different ciphertext for the same plaintext. This prevents frequency analysis but loses the ability to perform exact-match searches without also storing the tweak alongside the ciphertext.

For URL parameters, the choice depends on whether the server needs to look up records by the encrypted value:
- **Deterministic** for lookup tokens (e.g., `?customer_ref=987-12-3456` where the server uses the encrypted SSN as a database key)
- **Non-deterministic** for one-time PII submissions where the value is decrypted immediately and not stored

#### §4.2.7 Known Weaknesses

**FF3 tweak schedule weakness (2017):** Researchers (Bellar et al.) demonstrated that FF3's tweak schedule allows an attacker to recover the key with approximately 2^40 chosen plaintexts when the domain is small. This is well below the 2^128 security level of the underlying AES. NIST responded by publishing FF3-1 with a modified tweak schedule and larger minimum domain size (radix^minlen ≥ 100).

**FF1 minimum domain revision (2025):** NIST SP 800-38G Rev. 1 increased the minimum domain size for FF1 to 10^6 elements, effectively prohibiting FPE encryption of short strings (PINs, short zip codes). The revision was driven by analysis showing that small domains reduce the cipher's effective security margin against birthday-bound attacks.

**General FPE limitations:**
- FPE does not provide semantic security — ciphertexts in deterministic mode leak equality relationships
- FPE is not authenticated — it provides no integrity protection on its own
- Small domains (fewer than ~10^6 possible values) are inherently vulnerable to brute-force enumeration regardless of the FPE algorithm used

#### §4.2.8 Vendor Implementations

| Vendor/Product | FPE Algorithm | Key Features | Notes |
|:---------------|:-------------|:-------------|:------|
| **HashiCorp Vault** (Transform engine) | FF3-1 | Integrated secret management, audit logging, tokenization workflows | Supports both FPE and classic tokenization; enterprise-grade |
| **Google Cloud DLP** (FPE-FFX) | FFX (FF1 variant) | Cloud-native, automatic key rotation, bulk API | FFX is a proprietary variant; supports infrequent re-identification |
| **Thales CipherTrust** | FF1 | HSM integration, enterprise key management, format templates | Strongest enterprise story for on-premises FPE |
| **Fortanix** (Self-Defending KMS) | FF1 | HSM-as-a-service, API-driven, FPE for tokenization | NIST-approved FF1 with cloud-native key management |
| **Protegrity** | Proprietary FPE | Data-centric security platform, fine-grained access control | Proprietary algorithm, not NIST-approved |
| **Pangea** (Redact/Tokenize API) | FPE | Serverless API, per-field configuration, audit logging | Developer-friendly REST API for tokenization |
| **Capital One** (open-source `fpe`) | FF1 & FF3 | Open-source Go implementation | Niche use; primarily educational |
| **Mysto** (node-fpe) | FF3 & FF3-1 | Open-source Node.js implementation | Community-maintained; not for production FPE at scale |

#### §4.2.9 Key Management Requirements

FPE uses the same AES keys as standard encryption, but the key management requirements differ:

1. **Key separation.** Never use the same AES key for FPE and any other purpose (e.g., TLS, database encryption). Each key must be dedicated to a single FPE domain (one key per data type, or one key per application context).

2. **Treat tweaks as non-secret but integrity-protected.** The tweak is not a key — it does not need confidentiality — but it must not be tampered with. If the tweak is derived from request context (e.g., session ID), ensure the context cannot be manipulated by an attacker.

3. **Key rotation is complex.** Rotating an FPE key requires re-encrypting all existing ciphertexts with the new key, or maintaining a dual-key lookup period during which both old and new ciphertexts coexist. This is significantly harder than rotating a signing key or a TLS certificate.

4. **HSM integration.** For production FPE deployments, store keys in an HSM or cloud KMS. Never store FPE keys in application configuration files or environment variables.

#### §4.2.10 When FPE Is Better Than Standard Encryption

FPE excels in the following scenarios:

1. **Legacy database schemas.** When a `CHAR(9)` column stores SSNs and the schema cannot be changed, FPE allows encryption in-place without altering the column definition.

2. **Legacy API contracts.** When downstream systems expect specific data formats (e.g., a 16-digit credit card number string), FPE ensures the encrypted value still conforms to the expected format.

3. **Regulatory display masking.** FPE-encrypted values look like real data, which can be useful when a system needs to display "masked" values that are actually reversible ciphertexts rather than simple redactions.

4. **Minimal-overhead encryption.** When every byte of URL length matters (approaching browser or proxy limits), FPE's zero-expansion property avoids the base64url encoding overhead of standard encryption.

FPE is **not** appropriate when:
- The encrypted value must be searched or sorted by a party who does not hold the key
- The plaintext domain is very small (fewer than ~10^6 values) — brute-force enumeration is trivial
- Integrity protection is required without an additional MAC
- The system can be restructured to use opaque tokens instead of format-preserving ciphertexts

---

### §4.3 Deterministic AES Encryption

#### §4.3.1 Concept Overview

Standard authenticated encryption (AES-GCM, ChaCha20-Poly1305) uses a random nonce/IV for each encryption operation. Even if the same plaintext is encrypted twice, the ciphertexts differ because the nonce differs. This is called *probabilistic* encryption and provides semantic security — an attacker cannot determine whether two ciphertexts correspond to the same plaintext.

**Deterministic encryption** dispenses with the nonce. The same plaintext and key always produce the same ciphertext. This property is useful for creating consistent, repeatable tokens from PII values: the email `user@example.com` always encrypts to the same token `k7xw_pn3fjrs.m9q_aBcDeFgHiJkL`, enabling the token to be used as a stable identifier or lookup key.

Two standardized deterministic authenticated encryption (DAE) modes exist:

- **AES-GCM-SIV** (RFC 8452) — the primary recommendation for new implementations
- **AES-SIV** (RFC 5297) — the predecessor, still widely supported

#### §4.3.2 AES-GCM-SIV (RFC 8452)

AES-GCM-SIV is a nonce-misuse-resistant authenticated encryption mode designed by Shay Gueron and Yehuda Lindell. Its key innovation is the derivation of a synthetic IV (SIV) from the plaintext itself, using the POLYVAL universal hash function:

1. **Compute POLYVAL** over the nonce (if provided), plaintext, and associated data. POLYVAL is a little-endian variant of GHASH, operating over GF(2^128).
2. **Derive the SIV** by double-encrypting the POLYVAL output with AES: SIV = AES_K(POLYVAL(...)).
3. **Derive a sub-key** by XORing the SIV with a fixed constant: K' = K ⊕ SIV.
4. **Encrypt the plaintext** using AES-CTR with the sub-key K' and a counter derived from the SIV.
5. **Output** SIV || Ciphertext.

Because the SIV is a deterministic function of the plaintext, the same plaintext always produces the same SIV and the same ciphertext — hence "deterministic." The mode is also *nonce-misuse-resistant*: if the same nonce is accidentally reused (e.g., due to a bug in the nonce generator), the security degrades gracefully to deterministic mode rather than catastrophically (as standard AES-GCM would).

**When used with a fixed nonce** (or an empty nonce), AES-GCM-SIV becomes fully deterministic. This is the mode relevant for PII tokenization in URL parameters.

**Security properties (RFC 8452, §6):**
- 128-bit or 256-bit key size
- Provides 128-bit integrity for the ciphertext
- Deterministic: same plaintext → same ciphertext
- IND-DCPA security (indistinguishability under deterministic chosen-plaintext attack)
- Nonce-misuse resistance (if a nonce is provided)

#### §4.3.3 AES-SIV (RFC 5297)

AES-SIV is the predecessor to AES-GCM-SIV, using AES-CMAC as the SIV derivation function instead of POLYVAL:

1. **Compute SIV** as AES-CMAC over all inputs (nonce, associated data, plaintext) using a dual-CMAC construction: SIV = CMAC_K1(AAD) ⊕ CMAC_K2(plaintext).
2. **Encrypt** using AES-CTR with a counter derived from the SIV.
3. **Output** SIV || Ciphertext.

AES-SIV is slightly slower than AES-GCM-SIV (two CMAC operations vs one POLYVAL) and produces a slightly larger SIV. However, it has broader library support and is the better-understood construction (published 2008 vs 2018).

#### §4.3.4 Practical Comparison: AES-GCM-SIV vs AES-SIV

| Dimension | AES-GCM-SIV (RFC 8452) | AES-SIV (RFC 5297) |
|:----------|:------------------------|:--------------------|
| **SIV derivation** | POLYVAL (GHASH variant) | AES-CMAC (dual CMAC) |
| **Encryption** | AES-CTR | AES-CTR |
| **Performance** | ~20% faster (single pass for SIV) | Slightly slower (two CMAC passes) |
| **Ciphertext expansion** | 16 bytes (SIV/tag only) | 16 bytes (SIV/tag only) |
| **Key size** | 256-bit (or 512-bit for dual-key) | 256-bit (or 512-bit for dual-key) |
| **Nonce-misuse resistance** | Yes | Yes |
| **Library support** | Growing (Google Tink, libsodium) | Broad (NIST-approved, OpenSSL, BoringSSL) |
| **Recommendation** | ✅ Preferred for new implementations | ✅ Acceptable, especially for NIST alignment |

#### §4.3.5 Suitability for URL Parameters

Deterministic AES produces a fixed-length ciphertext for a given plaintext, which is ideal for tokenization:

1. **Consistency:** The same PII value always maps to the same token, enabling database lookups and deduplication.
2. **Reversibility:** The token can be decrypted back to the original PII by any party holding the key.
3. **Authenticated:** Both AES-GCM-SIV and AES-SIV produce an authentication tag (the SIV itself serves as the tag), detecting any modification of the ciphertext.

However, unlike FPE, the ciphertext **does not** match the plaintext's format or length:

| Plaintext | FPE Ciphertext | AES-GCM-SIV Ciphertext (raw) | base64url |
|:----------|:--------------|:-----------------------------|:----------|
| `user@example.com` (17 chars) | `k7xw@pn3fjrs.m9q` (17 chars) | `32 raw bytes` | `MjAy...` (44 chars) |
| `123-45-6789` (11 chars) | `987-12-3456` (11 chars) | `32 raw bytes` | `MjAy...` (44 chars) |
| `+1-555-0123` (10 chars) | `+1-876-5432` (10 chars) | `32 raw bytes` | `MjAy...` (44 chars) |

The ciphertext is always a fixed number of bytes (plaintext length + 16 bytes for the SIV/tag, plus any padding). After base64url encoding, the URL parameter is approximately 44–88 characters for typical PII values — significantly longer than the original plaintext, and unrecognizable as any particular data type.

#### §4.3.6 URL-Safe Encoding

To embed an AES-GCM-SIV ciphertext in a URL parameter, the raw bytes must be base64url-encoded:

```python
import base64
from cryptography.hazmat.primitives.ciphers.aead import AESGCMSIV

# Deterministic mode: pass None as nonce
key = AESGCMSIV.generate_key(bit_length=256)
aad = b"pii-token:v1"
ciphertext = AESGCMSIV(key).encrypt(nonce=None, data=b"user@example.com", associated_data=aad)

# base64url-encode (no padding)
token = base64.urlsafe_b64encode(ciphertext).rstrip(b'=').decode('ascii')

# e.g., "w2J7hK_L9qR3mN0pX1vBcD4eF6gH8iJ0kL2mN4oP6qR8sT0uV"
```

The resulting token is URL-safe (no `+`, `/`, or `=` characters) and can be embedded directly in a URL:

```http
GET /api/v1/users/lookup?email_token=w2J7hK_L9qR3mN0pX1vBcD4eF6gH8iJ0kL2mN4oP6qR8sT0uV HTTP/1.1
```

#### §4.3.7 Key Management Considerations

Deterministic encryption keys require the same management practices as any symmetric key, with some additional considerations:

1. **Key compromise reveals all mappings.** If the key is leaked, an attacker can decrypt every token — not just a single one. This is a higher-impact compromise than probabilistic encryption, where each ciphertext uses a different nonce.

2. **Key rotation requires re-encryption.** Unlike probabilistic encryption (where old ciphertexts remain valid), rotating a deterministic key requires re-encrypting all existing tokens with the new key and updating all references. For database-stored tokens, this is a batch operation that must be done atomically.

3. **Associated data (AAD) as key binding.** Using AAD to bind the ciphertext to a specific context (e.g., `"pii-token:v1"` or a tenant identifier) prevents tokens from one context from being used in another. This is a lightweight form of key separation.

4. **HSM storage.** Production deployments should store deterministic encryption keys in an HSM or cloud KMS, never in application code or configuration.

#### §4.3.8 Not Searchable Without Additional Index Structure

While deterministic encryption produces consistent tokens for the same plaintext, enabling exact-match lookups, it does **not** support:

- **Prefix searches:** Finding all tokens where the plaintext starts with "jane@..."
- **Range queries:** Finding tokens where the plaintext falls within a date range
- **Fuzzy matching:** Finding tokens where the plaintext is similar to a given value

For exact-match lookups, the server simply encrypts the search term with the same key and looks up the resulting token in the database. This is fast (single AES operation) and requires no index beyond the standard B-tree on the token column. But for any richer query, additional structures (searchable encryption indexes, see §4.4) are needed.

#### §4.3.9 Example: Email to AES-GCM-SIV Token to URL Parameter

```python
from cryptography.hazmat.primitives.ciphers.aead import AESGCMSIV
import base64

# Configuration (normally loaded from HSM/KMS)
key = bytes.fromhex("a1b2c3d4e5f6789012345678abcdef01" * 2)  # 256-bit key
context = b"api:v1:email-lookup"

# Encrypt (deterministic: no nonce)
def encrypt_email(email: str) -> str:
    ciphertext = AESGCMSIV(key).encrypt(
        nonce=None,
        data=email.encode('utf-8'),
        associated_data=context
    )
    return base64.urlsafe_b64encode(ciphertext).rstrip(b'=').decode('ascii')

# Decrypt
def decrypt_email(token: str) -> str:
    ciphertext = base64.urlsafe_b64decode(token + '==')  # restore padding
    plaintext = AESGCMSIV(key).decrypt(
        nonce=None,
        data=ciphertext,
        associated_data=context
    )
    return plaintext.decode('utf-8')

# Usage
token = encrypt_email("jane.doe@example.com")

# token = "w2J7hK_L9qR3mN0pX1vBcD4eF6gH8iJ0kL2mN4oP6qR8sT0uV"

# Same email always produces same token
assert encrypt_email("jane.doe@example.com") == token

# URL: GET /api/users?email_token=w2J7hK_L9qR3...
```

The server decrypts the token, retrieves the original email, and processes the request. The token is opaque to intermediaries and consistent across requests, enabling server-side caching and deduplication.

---

### §4.4 Searchable Encryption

#### §4.4.1 Concept Overview

Searchable encryption is a family of cryptographic techniques that allow a server to perform queries on encrypted data without decrypting it. In the context of PII protection, this means a server could search its database for all records matching a particular encrypted email address, or filter encrypted names by a prefix, without ever having access to the raw PII values.

Searchable encryption falls under the broader category of **property-preserving encryption** — encryption schemes that preserve specific properties of the plaintext in the ciphertext, enabling computation on encrypted data. The three main categories are:

- **Order-preserving encryption (OPE):** Ciphertexts preserve the order of plaintexts. If A < B, then Enc(A) < Enc(B). Enables range queries and sorting.
- **Equality-preserving encryption (deterministic encryption):** Same plaintext → same ciphertext. Enables exact-match lookups. This is what §4.3 (AES-GCM-SIV) provides.
- **Subset-preserving / keyword search encryption:** Enables searching for documents containing specific keywords, without revealing the full plaintext.

#### §4.4.2 Order-Preserving Encryption (OPE)

OPE was first proposed by Agrawal et al. (2004) and subsequently formalized by Boldyreva et al. (2009). The ciphertext space is ordered in the same way as the plaintext space, enabling range queries, MIN/MAX aggregation, and sorting — all on encrypted data.

**Practical schemes:**
- **Boldyreva-Lynn-Prabhakaran (BLP) scheme (2009):** The first provably secure OPE scheme, based on the ideal cipher model. Provides IND-OCPA security (indistinguishability under ordered chosen-plaintext attack).
- **mOPE (modified OPE, 2013):** A practical variant that achieves stronger security by randomizing ciphertext ranges.
- **CryptoVerif-verified OPE implementations:** Several schemes have been formally verified using the CryptoVerif tool, providing higher assurance.

**Limitations for URL parameters:**

OPE is primarily a database technology — it enables encrypted indexes, sorted query results, and range scans on encrypted columns. Its applicability to URL-borne PII is limited:

1. **Ciphertext expansion.** OPE ciphertexts are typically larger than plaintexts (to maintain order in a larger numeric space), making them impractical for URL parameters.
2. **Leakage.** OPE inherently leaks the order of values, which reveals significant metadata. For example, OPE-encrypted ages reveal the relative ordering of users' ages, which may itself be sensitive.
3. **Complex protocol.** Using OPE for URL parameters would require the client to encrypt the search term with the same OPE key, send it as a parameter, and have the server perform a range comparison. This is feasible but architecturally complex.

#### §4.4.3 Equality-Preserving Encryption

This is the simplest form of searchable encryption and is already covered by §4.3 (deterministic AES). The server can look up exact matches by encrypting the search term with the same key and comparing ciphertexts.

The security limitation is that equality-preserving encryption leaks whether two ciphertexts correspond to the same plaintext. This frequency analysis attack is well-studied: if the same email address appears in 1,000 records, the corresponding ciphertext also appears 1,000 times, allowing an attacker to correlate frequency information with known email distributions.

**Mitigations:**
- **Hiding frequency with dummy values.** Insert random ciphertexts (with no corresponding plaintext) to flatten frequency distributions. The server must know which ciphertexts are dummy values (e.g., via a secure bitmap), but an observer cannot distinguish real from dummy.
- **Bucketization.** Group PII values into buckets (e.g., by first letter) and encrypt the bucket identifier. The server can filter by bucket, then the client decrypts the results and selects the exact match.

#### §4.4.4 Subset-Preserving and Keyword Search Encryption

Symmetric Searchable Encryption (SSE) allows a client to outsource an encrypted document collection to a server and later issue search queries that the server can execute without learning the plaintext documents. The foundational work is by Song, Wagner, and Perrig (2000), with significant improvements by Curtmola et al. (2006).

**Relevant schemes:**
- **Inverted index-based SSE (Curtmola et al., 2006):** The client builds an encrypted inverted index alongside the encrypted documents. Search queries are trapdoors (encrypted keywords) that the server can match against the index.
- **Dynamic SSE:** Supports additions and deletions to the document set after initial setup. Schemes by Kamara and Papamanthou (2012, 2013) provide forward and backward privacy — preventing the server from learning whether a newly added document matches a previously searched keyword.
- **Multi-keyword SSE:** Supports conjunctive (AND) and disjunctive (OR) queries over multiple keywords simultaneously.

**Practical limitations for URL parameters:**

SSE is fundamentally a document storage and retrieval technology, not a URL parameter protection mechanism. Its applicability to REST API design is limited to scenarios where:
- The API endpoint is itself a search endpoint (e.g., `GET /api/v1/records?q=<encrypted_query>`)
- The server maintains an encrypted index that can be queried with a trapdoor derived from the URL parameter
- The overhead of maintaining the encrypted index is justified by the sensitivity of the data

This is a niche use case. For most PII-in-URL scenarios, the simpler approaches (JWE for transport, deterministic encryption for lookup tokens) are more appropriate.

#### §4.4.5 Current State of Research vs Production Readiness

**Academic research is mature but production adoption is limited:**

- **OPE:** Available in commercial products (e.g.,CipherTrust, Shadowbase) but with acknowledged security trade-offs. NIST has not standardized OPE. Academic consensus is that OPE leaks too much information for most use cases.
- **SSE:** Extensive academic literature (100+ papers since 2000) but very few production deployments. The overhead of maintaining encrypted indexes, managing trapdoors, and handling dynamic updates makes SSE impractical for most REST API scenarios.
- **Private Information Retrieval (PIR):** A related technique that allows a client to retrieve data from a server without revealing which data was retrieved. PIR is computationally expensive (orders of magnitude slower than standard queries) and not practical for interactive API workloads.

**Emerging standards:**
- **Mozilla's PyOxidizer and the Busemann Bloom Filter:** Experimental work on efficient encrypted search structures.
- **Homomorphic encryption (FHE/SHE):** Fully homomorphic encryption enables arbitrary computation on encrypted data, but performance remains 3–6 orders of magnitude slower than plaintext computation (IBM HElib, Microsoft SEAL, Google's OpenFHE). Not yet practical for API latency requirements.
- **Confidential computing (TEE-based):** Intel SGX, AMD SEV, AWS Nitro Enclaves — rather than encrypting the data and searching the ciphertext, run the search inside a hardware enclave. This sidesteps the ciphertext computation problem but introduces trust in the hardware manufacturer.

#### §4.4.6 When Searchable Encryption Matters for URL-Borne PII

Searchable encryption is relevant for PII in URL parameters in exactly one scenario:

> **The server needs to search, filter, or sort by the encrypted PII value without holding the decryption key.**

This arises in multi-tenant SaaS platforms where the data owner (customer) holds the encryption keys and the SaaS provider performs server-side operations. For example, a CRM SaaS might need to search for contacts by encrypted email address without ever seeing the plaintext.

In this scenario, the URL parameter carries an encrypted search query (a trapdoor), and the server matches it against an encrypted index. The overhead is significant, and the infrastructure is complex, but the security guarantee — zero-knowledge search — is the strongest possible.

For most other scenarios, the simpler patterns (JWE for one-time transport, deterministic encryption for lookup tokens, FPE for format-preserving tokenization) are more practical and equally secure for their intended use cases.

---

### §4.5 Envelope Encryption

#### §4.5.1 Concept Overview

Envelope encryption is a key management pattern in which each piece of data is encrypted with a unique, ephemeral Data Encryption Key (DEK), and that DEK is itself encrypted (wrapped) with a longer-lived Key Encryption Key (KEK). The "envelope" consists of the encrypted data plus the wrapped DEK — everything needed to decrypt is present, but the DEK is only accessible to parties who hold the KEK.

```mermaid
%%{init: {sequence: {actorMargin: 250, messageMargin: 60}, themeVariables: {noteBkgColor: "transparent", noteBorderColor: "transparent"}}}%%
sequenceDiagram
    autonumber
    participant C as Client / Edge Service
    participant KMS as Cloud KMS
    participant S as API Server
    participant DB as Backend DB

    rect rgba(52, 152, 219, 0.14)
        Note over C, KMS: Phase 1 — Encryption and Request Construction
        C->>KMS: GenerateDataKey(KEK_ID)
        KMS-->>C: plaintext DEK + wrapped DEK
        C->>C: Encrypt PII with DEK (AES-256-GCM)
        C->>C: Build envelope: wrapped_DEK + ciphertext
        C->>C: base64url(envelope) to URL parameter
        Note right of DB: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end

    rect rgba(46, 204, 113, 0.14)
        Note over C, S: Phase 2 — API Request
        C->>S: GET /api/users?token=base64url(envelope)
        Note right of S: URL contains no plaintext PII
        Note right of DB: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end

    rect rgba(241, 196, 15, 0.14)
        Note over S, DB: Phase 3 — Decryption and Processing
        S->>S: Parse envelope from URL
        S->>KMS: Unwrap(wrapped_DEK, KEK_ID)
        KMS-->>S: plaintext DEK
        S->>S: Decrypt ciphertext with DEK
        S->>DB: Query with plaintext PII
        DB-->>S: Results
        S->>S: Discard DEK + plaintext from memory
        Note right of DB: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end

    S-->>C: 200 OK (response body)
```

<details><summary><strong>1. Client requests DEK from Cloud KMS</strong></summary>

The client (or an edge service acting on its behalf) initiates the envelope encryption process by requesting a new Data Encryption Key from the Cloud KMS. This is typically a `GenerateDataKey` call (AWS KMS) or an equivalent operation in Azure Key Vault or Google Cloud KMS. The client specifies the target KEK by its key ID or ARN, along with the desired DEK specification (e.g., `AES_256`).

This step matters because it ensures **key uniqueness per request** — each piece of PII gets its own dedicated encryption key, so compromise of any single DEK limits exposure to only the data encrypted with that specific key. The KMS generates the DEK within its hardware security boundary (HSM), ensuring the key material never exists in plaintext outside the KMS and the client's memory.

**Example request (AWS KMS `GenerateDataKey`):**

```json
{
  "KeyId": "arn:aws:kms:us-east-1:123456789012:key/abcd-efgh-ijkl-mnop",
  "KeySpec": "AES_256"
}
```

</details>

<details><summary><strong>2. Cloud KMS returns plaintext DEK and wrapped DEK</strong></summary>

The KMS generates a cryptographically random 256-bit AES key (the DEK), encrypts it with the specified KEK (using AES key wrap per RFC 3394 or the KMS's internal wrapping mechanism), and returns **both** the plaintext DEK and the wrapped (encrypted) DEK to the client. This atomic operation is the core of the envelope encryption pattern — the client receives exactly what it needs: the plaintext DEK for immediate encryption and the wrapped DEK for inclusion in the envelope alongside the ciphertext.

This step matters because the **KMS never stores the DEK** — it exists only in the response and in the client's volatile memory. The wrapped DEK is the only persistent copy, and it is useless without access to the KEK via the KMS. This ensures that DEKs cannot be recovered from KMS logs or backups.

**Example response (AWS KMS):**

```json
{
  "Plaintext": "W3q8... (32-byte raw AES-256 key, base64)",
  "CiphertextBlob": "AQIDAHhV... (wrapped DEK, base64)",
  "KeyId": "arn:aws:kms:us-east-1:123456789012:key/abcd-efgh-ijkl-mnop"
}
```

</details>

<details><summary><strong>3. Client encrypts PII with DEK (AES-256-GCM)</strong></summary>

Using the plaintext DEK received from the KMS, the client encrypts the PII value (e.g., an email address, national ID, or account number) with AES-256-GCM. The client generates a random 12-byte nonce/IV for this encryption operation and optionally includes authenticated additional data (AAD) — such as a version tag or key ID — to bind the ciphertext to a specific context and prevent envelope swapping attacks. This step matters because **AES-256-GCM provides both confidentiality and integrity** — the GCM authentication tag ensures that any tampering with the ciphertext, IV, or AAD will be detected during decryption.

**Payload structure (pre-envelope assembly):**

```json
{
  "algorithm": "AES-256-GCM",
  "plaintext": "user@example.com",
  "iv": "a1b2c3d4e5f6 (12 bytes, base64)",
  "aad": "pii-envelope:v1",
  "ciphertext": "f7G8... (authenticated ciphertext + 16-byte GCM tag)"
}
```

</details>

<details><summary><strong>4. Client builds the envelope structure</strong></summary>

The client assembles the **envelope** — a self-contained data structure containing everything needed for decryption: the wrapped DEK (from step 2), the ciphertext (from step 3), the IV/nonce, and metadata such as the KMS key identifier, algorithm version, and AAD context. The envelope is the **unit of transport** — a self-describing package that contains all cryptographic material needed for decryption, but none of the key material in usable form.

**Example envelope structure (JSON, before base64url encoding):**

```json
{
  "v": 1,
  "kms": "aws:kms:us-east-1:123456789012:key/abcd-efgh-ijkl-mnop",
  "wk": "AQIDAHhV... (wrapped DEK, base64)",
  "ct": "f7G8... (ciphertext + GCM tag, base64)",
  "iv": "a1b2c3d4e5f6 (nonce, base64)"
}
```

</details>

<details><summary><strong>5. Client base64url-encodes the envelope for URL embedding</strong></summary>

The client serializes the envelope (typically as JSON) and base64url-encodes it so it can be safely embedded in a URL query parameter. Base64url encoding replaces `+` and `/` with `-` and `_`, and strips padding `=` characters, making the encoded string URL-safe. This step matters because the encoded envelope is what gets transmitted over the network — it must be compact, URL-safe, and self-contained so that the receiving server can decode and process it without any additional context or session state.

</details>

<details><summary><strong>6. Client sends API request with encrypted envelope</strong></summary>

The client issues the HTTP request to the API server, placing the base64url-encoded envelope in the URL query parameter (e.g., `?token=...`). The URL now contains **no plaintext PII** — only the opaque encrypted envelope. This means the PII is protected in browser history, proxy logs, CDN access logs, server access logs, and any other intermediary that records the full URL.

This step matters because URL parameters are the **most exposed channel** for PII in REST APIs. Unlike request bodies (which can be encrypted at the TLS layer and are not logged by default), URL parameters are routinely logged by web servers, load balancers, WAFs, and SIEM systems. Envelope encryption ensures that even if the URL is captured, the PII remains encrypted and inaccessible without KMS authorization.

**Example HTTP request:**

```http
GET /api/users?token=eyJ2IjoxLCJrbXMiOiJhd3M6a21zO... HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
```

</details>

<details><summary><strong>7. API Server parses the envelope from the URL parameter</strong></summary>

The server extracts the base64url-encoded token from the URL query parameter, decodes it, and parses the JSON envelope structure. It validates the envelope format — checking for required fields (`v`, `kms`, `wk`, `ct`, `iv`), verifying the version number, and confirming that the KMS key identifier refers to a key the server is authorized to use.

This step matters because **envelope validation is the first defense against malformed or malicious payloads**. A missing `iv` field, an unknown version number, or a KMS key ID from an unauthorized tenant must be rejected before any KMS calls are made. This prevents wasted KMS API calls (which are metered and rate-limited) and ensures that only well-formed envelopes proceed to the unwrapping stage.

</details>

<details><summary><strong>8. API Server unwraps DEK via Cloud KMS</strong></summary>

The server sends the wrapped DEK to the Cloud KMS for unwrapping, using the `Decrypt` API (AWS KMS) or the equivalent `UnwrapKey` operation (Azure Key Vault). The KMS authenticates the server's identity (via IAM roles, managed identity, or service account), verifies that the server has `kms:Decrypt` permission on the specified KEK, and returns the plaintext DEK.

This step matters because the **KMS acts as an access control enforcement point**. Even if an attacker intercepts the envelope from the URL, they cannot unwrap the DEK without valid KMS credentials. The KMS also logs every unwrapping operation, creating an audit trail of every decryption event — valuable for compliance with regulations such as GDPR Article 30 (records of processing activities) and PCI DSS Requirement 10 (audit logging).

**Example KMS unwrapping call (AWS KMS `Decrypt`):**

```json
{
  "CiphertextBlob": "AQIDAHhV... (wrapped DEK from the envelope)",
  "KeyId": "arn:aws:kms:us-east-1:123456789012:key/abcd-efgh-ijkl-mnop"
}
```

</details>

<details><summary><strong>9. Cloud KMS returns plaintext DEK to API Server</strong></summary>

The KMS returns the unwrapped plaintext DEK to the API Server. This DEK exists only in the server's volatile memory — it is never persisted to disk, never logged, and never shared with other services. The KMS also logs the unwrapping event (who requested it, when, and which KEK was used), creating an audit trail for compliance purposes.

</details>

<details><summary><strong>10. API Server decrypts PII ciphertext with DEK</strong></summary>

Using the plaintext DEK returned by the KMS, the server decrypts the ciphertext from the envelope using AES-256-GCM with the IV/nonce extracted from the envelope. The GCM authentication tag is verified during decryption — if the ciphertext, IV, or AAD has been tampered with, the decryption will fail with an authentication error.

This step matters because **GCM authentication provides integrity guarantees** — the server can be confident that the decrypted PII has not been altered in transit. If authentication fails, the server must reject the request (HTTP 400) and log the event, as it may indicate a tampering attempt or a corrupted envelope. Upon successful decryption, the server has the plaintext PII and can proceed with the business logic (e.g., querying the database by the user's email address).

</details>

<details><summary><strong>11. API Server queries Backend DB with plaintext PII</strong></summary>

With the plaintext PII now available (e.g., the user's email address), the API Server executes the business query against the backend database. This is the only point at which the PII is used for its intended purpose — resolving the data subject's identity to retrieve their records.

```sql
SELECT order_id, amount, status FROM orders
WHERE customer_email = 'user@example.com'
ORDER BY created_at DESC;
```

The PII remains in the server's working memory only for the duration of this query. It is not included in the query string sent to the database if the database API supports parameterized queries — the PII is passed as a bound parameter, not concatenated into SQL text.

</details>

<details><summary><strong>12. Backend DB returns query results to API Server</strong></summary>

The database returns the matching records (order details, account information, etc.) to the API Server. These results may themselves contain PII (order amounts, delivery addresses) — the envelope encryption pattern protects PII in the *inbound* request URL, not in the *outbound* response body. If the response requires PII protection, additional patterns apply (response filtering, field-level encryption — see §7).

</details>

<details><summary><strong>13. API Server discards DEK and plaintext PII from memory</strong></summary>

After processing the request, the server **immediately zeroes the plaintext DEK and the decrypted PII from memory**. This is a critical security hygiene step — holding plaintext PII in memory longer than necessary increases the window of exposure to memory-scraping attacks, core dumps, or debugging sessions that inadvertently log sensitive values.

This step matters because **memory is the weakest link** in the encryption chain. The KMS protects key material at rest, TLS protects data in transit, but data in memory relies on application-level discipline. Zeroing sensitive buffers (using `memset_s`, explicit zeroing in managed languages, or scoped variable lifetimes) ensures that the plaintext PII exists in memory for the minimum possible duration. This aligns with the principle of **data minimization** in GDPR Article 5(1)(c) and NIST SP 800-38D's guidance on key material lifecycle management.

</details>

<details><summary><strong>14. API Server returns response to Client</strong></summary>

The API Server sends the HTTP response (200 OK) back to the client with the requested data in the response body. The response URL and headers contain no PII — the envelope encryption pattern has protected the PII throughout its journey: from the client's URL parameter, through every intermediary log and proxy, to the server's decryption pipeline.

</details>
<br/>

The key insight is **key isolation**: if a DEK is compromised, only the data encrypted with that specific DEK is exposed. The KEK remains safe, and all other DEKs remain uncompromised. This is the fundamental security advantage over using a single key for all encryption operations.

#### §4.5.2 Per-Request Data Encryption Keys

In the context of PII in URL parameters, envelope encryption can be applied at the per-request level:

1. **Client (or edge service) generates a new DEK** — a fresh 256-bit AES key — for each request containing PII.
2. **Client encrypts the PII** with the DEK using AES-256-GCM.
3. **Client wraps the DEK** with the KEK (obtained from a KMS) using RSA-OAEP or AES key wrap (RFC 3394).
4. **Client sends the envelope** (wrapped DEK + encrypted PII) as a single URL parameter, base64url-encoded.

On the server side:
1. **Server receives the envelope** from the URL parameter.
2. **Server sends the wrapped DEK to the KMS** for unwrapping.
3. **KMS verifies the server's identity**, unwraps the DEK, and returns it (or uses it to decrypt in-place).
4. **Server decrypts the PII** with the unwrapped DEK and processes the request.

#### §4.5.3 Key Isolation Benefits

| Compromise Scenario | Single-Key Encryption | Envelope Encryption |
|:--------------------|:---------------------|:---------------------|
| **Application key leaked** | All data exposed | Only KEK exposed; DEKs still safe in envelopes |
| **Individual DEK leaked** | N/A | Only data encrypted with that DEK exposed |
| **KMS breached** | All data exposed (via key) | All data exposed (KEK + unwrapped DEKs) |
| **Log containing ciphertext** | All ciphertext decryptable with leaked key | Only decryptable with specific DEK (if also leaked) |

Envelope encryption's primary benefit is **containment**: a compromise is limited to the data encrypted with the compromised key, not the entire dataset. This aligns with GDPR's principle of data protection by design (Article 25) — the impact of any single security failure is minimized.

#### §4.5.4 Cloud KMS Integration

All major cloud providers offer envelope encryption as a managed service:

| Provider | Service | Envelope API | Key Hierarchy |
|:---------|:--------|:-------------|:--------------|
| **AWS** | KMS `GenerateDataKey` | Returns plaintext DEK + encrypted DEK | Customer-managed CMK (KEK) |
| **Azure** | Key Vault `Encrypt` / `UnwrapKey` | Manual envelope assembly | RSA key or AES key wrap |
| **Google Cloud** | Cloud KMS `Encrypt` / `Decrypt` | Manual envelope assembly | Customer-managed CMEK |

**AWS KMS — the most mature envelope encryption API:**

The `GenerateDataKey` API call atomically generates a new DEK and returns both the plaintext DEK (for immediate use) and the encrypted DEK (for storage alongside the ciphertext). This is a single API call with integrated key management:

```python
import boto3
import base64
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

kms = boto3.client('kms')
key_id = 'arn:aws:kms:us-east-1:123456789012:key/abcd-efgh-ijkl-mnop'

# Generate a per-request DEK (returns plaintext and encrypted DEK)
response = kms.generate_data_key(
    KeyId=key_id,
    KeySpec='AES_256'
)
dek = response['Plaintext']           # Use to encrypt PII
wrapped_dek = response['CiphertextBlob']  # Include in the URL

# Encrypt PII with the DEK
aad = b"pii-envelope:v1"
ciphertext = AESGCM(dek).encrypt(nonce=os.urandom(12), data=b"user@example.com", associated_data=aad)

# Construct the envelope
envelope = {
    "v": 1,
    "kms": "aws:kms:us-east-1:123456789012:key/abcd-efgh-ijkl-mnop",
    "wk": base64.b64encode(wrapped_dek).decode(),
    "ct": base64.b64encode(ciphertext).decode(),
    "iv": base64.b64encode(iv).decode()
}
token = base64.urlsafe_b64encode(json.dumps(envelope).encode()).rstrip(b'=').decode()
```

The resulting token is a self-contained envelope — it contains everything needed for decryption, but the DEK can only be unwrapped by authorized parties who have KMS access to the specified KEK.

#### §4.5.5 Overhead: Per-Request KMS Calls

The primary cost of envelope encryption is the **KMS call for DEK generation and unwrapping**:

| Operation | Latency (typical) | Notes |
|:----------|:-------------------:|:------|
| **GenerateDataKey** (client-side) | 20–50 ms | Per-request KMS call |
| **Decrypt** (server-side, unwraps DEK) | 20–50 ms | Per-request KMS call |
| **AES-256-GCM encrypt/decrypt** | <0.1 ms | Negligible |
| **Total envelope encryption overhead** | 40–100 ms | 2× KMS round-trip |

For interactive API calls (already 100–500 ms), adding 40–100 ms is often acceptable. For high-throughput APIs processing thousands of requests per second, the KMS call becomes a bottleneck.

**Mitigation strategies:**

1. **Batch DEK generation.** Pre-generate a pool of DEKs during off-peak periods and assign them to requests from the pool. This amortizes the KMS latency across many requests.
2. **Local caching with key wrapping.** The server can unwrap a batch of DEKs, cache them in memory (encrypted with a local key), and decrypt individual requests from the cache without additional KMS calls. The local key is rotated frequently.
3. **Use the KMS for unwrapping only.** If the client has a local copy of the KEK (obtained once from the KMS), it can wrap DEKs locally without per-request KMS calls. The server still calls the KMS for unwrapping, but the client-side overhead is eliminated.
4. **Cloud-provider-optimized paths.** AWS KMS supports the AWS Encryption SDK, which handles envelope construction and provides a streaming API that minimizes KMS calls for large payloads.

#### §4.5.6 Implementation Complexity

Envelope encryption is the most complex of the cryptographic patterns described in this chapter:

1. **Envelope serialization.** The envelope must be serialized into a format that includes the wrapped DEK, the ciphertext, the IV/nonce, and metadata (algorithm, KMS key ID, version). This format must be versioned and backward-compatible.
2. **Key rotation.** When the KEK is rotated, the wrapped DEKs encrypted under the old KEK remain valid — but new DEKs should be wrapped under the new KEK. The server must handle both old and new wrapped DEKs during the rotation period.
3. **Multi-recipient support.** If multiple services need to decrypt the same envelope, each needs access to the same KEK (or the envelope must contain multiple wrapped DEKs, one per recipient key).
4. **Error handling.** KMS calls can fail (rate limits, network errors, key disabled). The envelope must be constructed so that decryption failures are distinguishable from encryption failures.

For these reasons, envelope encryption is **rarely the right choice for simple URL parameter protection**. The added complexity is justified only in high-security contexts where key isolation is a hard requirement (e.g., financial services, healthcare, government).

#### §4.5.7 When Envelope Encryption Is Appropriate for URL Parameters

Envelope encryption is appropriate for PII in URL parameters when:

1. **Key isolation is required by policy.** Regulations or internal policies mandate that compromise of a single key must not expose all data.
2. **Multi-tenant SaaS.** Each tenant's PII is encrypted with a tenant-specific DEK, and only the tenant (or an authorized operator) can unwrap the DEK via KMS access controls.
3. **Audit trail for decryption.** Every unwrapping operation goes through the KMS, which provides an audit log of every decryption event — valuable for compliance and forensics.
4. **Key rotation without data re-encryption.** When the KEK is rotated, existing ciphertexts (encrypted with per-request DEKs) do not need to be re-encrypted. Only the DEK wrapping needs to be updated for the KEK rotation — and even that can be deferred.

For simpler use cases, JWE (§4.1) with asymmetric keys provides most of the same benefits (the encrypted CEK in JWE is conceptually identical to a wrapped DEK) with less implementation complexity, since the JWE standard handles the envelope format.

---

### §4.6 Client-Side Encryption

#### §4.6.1 Concept Overview

Client-side encryption (CSE) shifts the encryption operation entirely to the client — the browser, mobile app, or desktop application — before the PII ever leaves the device. The server receives only ciphertext; it never sees, processes, or stores raw PII. This is the strongest confidentiality guarantee available for data in transit and at rest: even a fully compromised server (including database, logs, and backups) reveals no PII.

In the context of PII in URL parameters, CSE means the client encrypts PII before constructing the URL:

```
1. User enters PII (email, name, etc.)
2. Client encrypts PII using a key held only by the client
3. Client constructs URL with ciphertext as parameter
4. Server receives only ciphertext → stores, processes, or forwards ciphertext
5. Only the client (or another party with the key) can decrypt
```

This is fundamentally different from server-side encryption (§4.1–§4.5), where the server holds the decryption key and can access raw PII. In CSE, the server is **functionally blind** to the data it handles.

```mermaid
flowchart TD
    subgraph Client_Trust_Boundary["Client Trust Boundary"]
        direction TB
        A["`**User Device**
        Browser / Mobile App`"]
        B["`**Key Management**
        Web Crypto API / libsodium`"]
    end

    subgraph Server_Trust_Boundary["Server Trust Boundary"]
        direction TB
        C["`**API Gateway**
        Receives ciphertext only`"]
        D["`**Application Server**
        Stores ciphertext only`"]
        E["`**Database**
        Encrypted data at rest`"]
    end

    subgraph Key_Service["Key Distribution"]
        K["`**KMS / Key Service**
        Distributes KEK to clients`"]
    end

    A -->|"`2. Client encrypts PII
    with DEK held locally`"| A2["`**Encrypted URL Parameter**
    ciphertext as query value`"]
    A2 -->|"`3. HTTP request with
    ciphertext in URL`"| C
    C --> D --> E

    B -->|"`1. Client obtains or
    generates encryption key`"| A
    K -.->|"`Key provisioning
    during onboarding`"| B

```

#### §4.6.2 Key Distribution Challenges

The central challenge of CSE is key distribution: how does the client obtain the encryption key, and how does any other party that needs to decrypt obtain the same key?

**Key distribution models:**

1. **Pre-shared symmetric key.** The key is provisioned to the client during onboarding (e.g., via a secure key exchange protocol, QR code, or out-of-band delivery). Simple but inflexible — key rotation requires re-provisioning all clients.

2. **Asymmetric key pair (client-generated).** The client generates an RSA or EC key pair and uploads the public key to the server. The client encrypts with its private key; anyone with the public key cannot decrypt (this is actually a signing operation). For encryption, the server's public key encrypts, and the client's private key decrypts — but this means the server's public key must be available to the client, which is the normal TLS pattern.

3. **Hybrid: client-generated DEK + server KEK.** The client generates a per-use DEK, encrypts PII with it, then wraps the DEK with the server's public key (or a shared KEK). The server unwraps the DEK with its private key and decrypts. This is essentially envelope encryption (§4.5) with client-side DEK generation — the server can decrypt but must explicitly do so.

4. **Key wrapping service.** A dedicated key management service distributes keys to authorized clients. The client authenticates to the service, receives a key, and uses it for encryption. The key service maintains an audit trail of key distribution events.

For true zero-knowledge architectures (where the server can never decrypt), only option 1 (pre-shared key) or option 2 (client-generated key pair with public key registered server-side) provides a valid model. Options 3 and 4 give the server the ability to decrypt, which is technically server-side decryption — even though the encryption happens client-side.

#### §4.6.3 Same-Origin Policy Implications

When CSE is implemented in a web browser, the Same-Origin Policy (SOP) constrains how cryptographic keys and operations can be managed:

- **Web Crypto API access.** The Web Crypto API (`window.crypto.subtle`) is available to JavaScript running in the page's origin. Keys generated or imported via the Web Crypto API are bound to the origin and cannot be exported to another origin.
- **Key extraction.** By default, `CryptoKey` objects created with `extractable: false` cannot be exported from the browser. This prevents JavaScript (even malicious scripts in the same origin) from exfiltrating the key. Setting `extractable: true` allows export via `crypto.subtle.exportKey()`.
- **Cross-origin key sharing.** If multiple origins need to encrypt/decrypt the same data, each must independently obtain the key — either via a shared key service or by using a key agreement protocol (e.g., ECDH) with a key server.
- **Service workers and Web Workers.** Cryptographic operations can be offloaded to workers for better performance, but the same-origin restrictions apply.

**Security consideration:** Any JavaScript running in the same origin has access to `window.crypto.subtle`. A cross-site scripting (XSS) vulnerability in the application could allow an attacker to call the encryption/decryption functions and access plaintext PII — even in a CSE architecture. CSE does not eliminate the need for XSS protection; it reduces the attack surface (the server never has the PII in cleartext, but the browser does).

#### §4.6.4 JavaScript Cryptographic Libraries

**Web Crypto API (native, recommended):**

The Web Crypto API is built into all modern browsers and provides access to AES, RSA, ECDSA, ECDH, HMAC, PBKDF2, and other algorithms. It is the recommended choice for browser-side cryptography:

```javascript
// Generate an AES-GCM key (non-extractable)
const key = await crypto.subtle.generateKey(
  { name: 'AES-GCM', length: 256 },
  false, // non-extractable: key cannot leave the browser
  ['encrypt', 'decrypt']
);

// Encrypt PII
const iv = crypto.getRandomValues(new Uint8Array(12));
const ciphertext = await crypto.subtle.encrypt(
  { name: 'AES-GCM', iv },
  key,
  new TextEncoder().encode('user@example.com')
);

// Base64url-encode for URL parameter
const token = btoa(String.fromCharCode(...new Uint8Array(ciphertext)))
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

// URL: GET /api/users?email_token=token
```

**Third-party libraries:**

| Library | Key Features | Notes |
|:--------|:-------------|:------|
| **libsodium-wrappers** | NaCl-family primitives (XSalsa20-Poly1305, X25519, Argon2) | Auditable, constant-time, excellent for messaging and file encryption |
| **forge** | Broad algorithm support (RSA, AES, SHA, HMAC, PBKDF2, certificate handling) | Pure JavaScript (no Web Crypto dependency); useful for Node.js compatibility |
| **sjcl** (Stanford JavaScript Crypto Library) | AES-CCM, AES-GCM, HMAC, SHA-256 | Designed for ease of use; smaller API surface |
| **TweetNaCl.js** | Minimal NaCl port (curve25519, xsalsa20, poly1305) | 100 lines of auditable code; no dependencies |

**Recommendation:** Use the Web Crypto API whenever possible. It is native (faster than JavaScript implementations), non-extractable keys provide stronger key protection, and it is maintained by browser vendors. Third-party libraries are appropriate when the Web Crypto API lacks a needed algorithm or when Node.js compatibility is required.

#### §4.6.5 Zero-Knowledge Architecture

CSE is the foundation of zero-knowledge (or zero-access) architectures, where the service provider has no ability to read customer data:

- **ProtonMail:** Encrypts emails on the client side; Proton's servers store only ciphertext. The user's mailbox password derives the encryption key. Proton cannot read user emails.
- **Tresorit:** Client-side encryption for cloud storage. Files are encrypted before upload; Tresorit's servers see only ciphertext.
- **Zero-knowledge API gateways:** An emerging pattern where an API gateway receives ciphertext-only requests, routes them to the appropriate backend, and the backend returns ciphertext-only responses. The gateway performs no decryption; it is a routing layer.

In the context of REST API URL parameters, a zero-knowledge architecture means:
- The client encrypts PII before constructing the URL
- The server stores and processes only ciphertext
- If the server needs to perform business logic on the PII, it must either:
  - Request the client to decrypt and provide specific fields (interactive)
  - Use homomorphic encryption or secure multi-party computation (impractical for most APIs)
  - Accept that it cannot perform business logic on encrypted fields

**This is the fundamental limitation of CSE:** if the server needs to use the PII (validate an email, look up a customer record, enforce business rules), it must be able to decrypt. True zero-knowledge is only possible when the server's function is limited to storage and retrieval.

#### §4.6.6 Limitations

1. **Server cannot decrypt for business logic.** If the server needs to validate an email format, check a name against a watchlist, or deduplicate records by SSN, it cannot do so with client-side-only encryption. The server must either hold a decryption key (breaking the zero-knowledge property) or receive plaintext from the client (via a secure channel).

2. **Key in the client is a risk.** Browser-based keys are protected by the same-origin policy and can be marked non-extractable, but they are ultimately under the control of the user's device. A compromised device (malware, physical access) exposes the key and all encrypted data.

3. **Key loss = data loss.** If the client loses the encryption key (cleared browser cache, lost device), the encrypted data is permanently unrecoverable. There is no "forgot password" reset for CSE keys.

4. **Search and query are impossible.** The server cannot search, filter, or aggregate encrypted data without additional structures (searchable encryption, see §4.4) that add complexity and often reduce the security guarantees.

5. **No server-side audit of plaintext.** Compliance requirements that mandate logging of PII access (who accessed whose data, and when) cannot be satisfied when the server never sees the plaintext. Audit must happen on the client side, which is inherently less trustworthy.

6. **Performance overhead on the client.** Cryptographic operations in the browser are slower than on the server (JavaScript vs native code, limited memory, battery constraints on mobile). For bulk operations (encrypting hundreds of PII fields), client-side performance may be a bottleneck.

---

### §4.7 Session-Bound Symmetric Key Distribution

The key distribution models in §4.6 assume either a **static public key** (JWKS endpoint, rotated operationally) or a **pre-shared symmetric key**. An alternative model shifts key generation to the server's session lifecycle: the server generates a unique symmetric encryption key at session establishment, stores it in the server-side session store, and delivers it to the frontend. The frontend uses this per-session key to encrypt PII via the Web Crypto API before transmitting it; the server decrypts using the same key from its session store. This pattern — termed **Session-Bound Symmetric Key Distribution** — occupies a middle ground between §3.4 (session-based resolution) and §4.6 (full client-side encryption with static keys).

```mermaid
%%{init: {sequence: {actorMargin: 250}, themeVariables: {noteBkgColor: "transparent", noteBorderColor: "transparent"}}}%%
sequenceDiagram
    autonumber
    participant C as Browser
    participant S as API Server
    participant SS as Session Store

    rect rgba(46, 204, 113, 0.14)
        Note over C,S: Phase 1 — Session + Key Establishment
        C->>S: POST /api/session (authenticate)
        S->>S: Generate AES-256-GCM key Kₛ
        S->>SS: Store Kₛ in session {session_id: abc123, key: Kₛ}
        S-->>C: 200 OK {session_id, Kₛ}
        Note right of SS: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end

    rect rgba(52, 152, 219, 0.14)
        Note over C,S: Phase 2 — Client-Side PII Encryption
        C->>C: Import Kₛ as non-extractable CryptoKey
        C->>C: Encrypt PII with K_s via Web Crypto API
        C->>S: GET /api/users?email_token=enc(PII,Kₛ)
        S->>SS: Retrieve Kₛ for session abc123
        S->>S: Decrypt enc(PII,Kₛ) → PII
        S-->>C: 200 OK (response)
        Note right of SS: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end

    rect rgba(231, 76, 60, 0.14)
        Note over C,SS: Phase 3 — Session Expiry → Key Destruction
        Note over SS: TTL expires → Kₛ destroyed
        Note over C: Tab closed → CryptoKey garbage-collected
        Note right of SS: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
```

#### §4.7.1 Walkthrough

<details><summary><strong>1. Browser authenticates and initiates session creation</strong></summary>

The browser sends an authenticated `POST /api/session` request to the API server. This request carries the user's credentials (or an existing authentication token such as a refresh token or SSO assertion) in the request body or headers. The session creation endpoint serves double duty: it establishes the authenticated session *and* triggers the generation of a per-session encryption key that will protect PII in all subsequent API calls. The authentication mechanism itself is outside the scope of this diagram — it may be a username/password exchange, an OAuth 2.0 token request (RFC 6749), or a federated SSO login. What matters is that the server validates the user's identity before proceeding to key generation, ensuring that session keys are only issued to authenticated principals.

```http
POST /api/session HTTP/1.1
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...

{
  "grant_type": "session",
  "user_agent": "Mozilla/5.0 ...",
  "device_fingerprint": "sha256:abc123..."
}
```

</details>

<details><summary><strong>2. API Server generates per-session AES-256-GCM key</strong></summary>

Upon successful authentication, the API server generates a fresh 256-bit symmetric key using a cryptographically secure random number generator. The algorithm choice — AES-256-GCM — provides both confidentiality (AES-256) and integrity (GCM's Galois/Counter Mode authentication tag) in a single operation, eliminating the need for a separate HMAC. The key is generated *per session*, meaning every user login or session renewal produces a unique, unrelated key. This is critical for forward secrecy at the application layer: compromising one session's key exposes only the PII transmitted during that session, not any past or future sessions. NIST SP 800-38D recommends AES-GCM with 96-bit IVs and 128-bit authentication tags for this class of application.

```python
# Server-side key generation (Python example)
import os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

session_key = AESGCM.generate_key(bit_length=256)  # 32 bytes from os.urandom
```

</details>

<details><summary><strong>3. API Server stores session key in Session Store</strong></summary>

The API Server persists the newly generated key Kₛ in its server-side session store, indexed by the session identifier (`abc123`). The session store — typically Redis, Memcached, or a database-backed session table — holds the key alongside other session metadata (user ID, creation timestamp, TTL). The store enforces a TTL (Time-To-Live) that automatically deletes the key when the session expires, providing automatic key destruction without manual rotation ceremonies. This makes the session store a high-value target: an attacker who compromises it gains access to all active session keys. Mitigations include encrypting session data at rest, network-isolating the session store, and enforcing short TTLs (minutes to hours, not days).

```json
{
  "session_id": "abc123",
  "user_id": "user-456",
  "created_at": "2026-04-10T14:30:00Z",
  "ttl_seconds": 3600,
  "encryption_key": "YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXoxMjM0NTY"
}
```

</details>

<details><summary><strong>4. API Server returns session identifier and key to Browser</strong></summary>

The API Server responds with a `200 OK` containing both the session identifier and the raw key bytes (base64url-encoded). The key is delivered in the response body — not embedded in HTML (which risks logging), not stored in a cookie (which may leak to subdomains), and not placed behind a separate endpoint (which adds attack surface). The key transport relies entirely on the existing TLS channel for confidentiality. This is a trade-off: unlike TLS handshake's asymmetric key exchange (which provides forward secrecy at the transport layer), the session key is sent as payload data. If the TLS session is recorded and the server's TLS private key is later compromised, the recorded session key can be decrypted. For most REST API deployments, TLS 1.3 with forward-secret cipher suites mitigates this risk adequately.

```json
{
  "session_id": "abc123",
  "encryption_key": "YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXoxMjM0NTY",
  "expires_at": "2026-04-10T15:30:00Z"
}
```

</details>

<details><summary><strong>5. Browser imports session key as non-extractable CryptoKey</strong></summary>

The browser's JavaScript runtime imports the base64url-encoded key into the Web Crypto API using `crypto.subtle.importKey()` with the `extractable` parameter set to `false`. This creates a `CryptoKey` object that can be used for encryption and decryption operations but whose raw key material *cannot* be exported via `crypto.subtle.exportKey()`. Non-extractability is a meaningful defense: if an XSS vulnerability allows an attacker to execute JavaScript in the page's origin, they cannot exfiltrate the raw key bytes to a remote server. However, XSS can still *use* the key for encrypt/decrypt operations within the compromised origin — non-extractability prevents key exfiltration, not key usage. This is a fundamental limitation shared by all client-side encryption patterns.

```javascript
const rawKey = Uint8Array.from(atob(encryptionKey), c => c.charCodeAt(0));
const cryptoKey = await crypto.subtle.importKey(
  'raw',
  rawKey,
  { name: 'AES-GCM' },
  false,  // non-extractable — cannot be exported
  ['encrypt', 'decrypt']
);
```

</details>

<details><summary><strong>6. Browser encrypts PII with session key via Web Crypto API</strong></summary>

Before transmitting any PII field (email address, phone number, national identifier), the browser encrypts it using the session key Kₛ via `crypto.subtle.encrypt()`. Each encryption operation generates a fresh 96-bit IV (Initialization Vector) using `crypto.getRandomValues()`, ensuring that encrypting the same plaintext twice produces different ciphertexts — a requirement for GCM mode security. The IV is prepended to the ciphertext (12 bytes IV + ciphertext + 16 bytes authentication tag) and base64url-encoded for inclusion in the API request. This step is the core of the client-side encryption pattern: PII never traverses the network in plaintext, providing defense-in-depth even if TLS is terminated and inspected by a WAF, CDN, or proxy that logs request bodies.

```javascript
const iv = crypto.getRandomValues(new Uint8Array(12));  // 96-bit IV for GCM
const ciphertext = await crypto.subtle.encrypt(
  { name: 'AES-GCM', iv },
  cryptoKey,
  new TextEncoder().encode('user@example.com')  // PII plaintext
);
// Prepend IV to ciphertext for transport
const encryptedParam = btoa(String.fromCharCode(...iv, ...new Uint8Array(ciphertext)));
// → "AAAAAAAAAAAAAAAAAAAAAX9hYkN3Rj..."
```

</details>

<details><summary><strong>7. Browser sends encrypted PII token in API request</strong></summary>

The browser includes the encrypted PII as a query parameter (or request body field) in the API request. The parameter name `email_token` signals that this is an encrypted token, not a plaintext email address — this convention helps server-side code distinguish between encrypted and unencrypted fields and prevents accidental logging of plaintext PII. The API server's request routing, load balancers, and access logs now see only opaque ciphertext rather than readable PII, reducing the blast radius of log exfiltration. This is particularly valuable under GDPR Article 5(1)(f), which requires "appropriate technical measures" to ensure personal data security — encrypted query parameters provide an additional layer of protection beyond TLS alone.

```http
GET /api/users?email_token=AAAAAAAAAAAAAAAAAAAAAX9hYkN3Rj... HTTP/1.1
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
Session-Id: abc123
```

</details>

<details><summary><strong>8. API Server retrieves session key from Session Store</strong></summary>

The API Server extracts the session identifier from the request (either from the `Session-Id` header or a session cookie) and looks up the corresponding session record in the Session Store. The session record contains the symmetric key Kₛ that was stored during Phase 1 (step 3). If the session has expired (TTL elapsed), the key no longer exists and the server returns a `401 Unauthorized` or `410 Gone` response, forcing the client to re-authenticate and establish a new session with a fresh key. This automatic expiration is a deliberate security property: it limits the window during which a stolen session key can be used to decrypt intercepted PII. The session store lookup must be fast (sub-millisecond for Redis/Memcached) to avoid adding unacceptable latency to every API call.

</details>

<details><summary><strong>9. API Server decrypts PII token using session key</strong></summary>

The API Server splits the encrypted token into its constituent parts: the 96-bit IV (first 12 bytes), the ciphertext, and the 16-byte GCM authentication tag (appended by AES-GCM). It then decrypts using `AES-256-GCM` with the session key Kₛ and the extracted IV. GCM's built-in authentication tag verification ensures that any tampering with the ciphertext — by a man-in-the-middle, a compromised proxy, or a malicious client — is detected before decryption proceeds. If the tag verification fails, the server rejects the request with a `400 Bad Request`, preventing chosen-ciphertext attacks. After decryption, the plaintext PII is available for business logic (email lookup, deduplication, name matching) but should never be logged or persisted in plaintext.

```python
# Server-side decryption (Python example)
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
import base64

raw = base64.b64decode(encrypted_token)
iv, ciphertext_and_tag = raw[:12], raw[12:]
aesgcm = AESGCM(session_key)
plaintext = aesgcm.decrypt(iv, ciphertext_and_tag, None)  # b'user@example.com'
```

</details>

<details><summary><strong>10. API Server returns response to Browser</strong></summary>

After decrypting the PII token and executing the business logic (e.g., looking up the user by email), the API Server returns the response to the browser. The response itself is protected by TLS at the transport layer — it does not need additional application-layer encryption because it flows over the same TLS channel that protected the session key distribution in step 4. The response may contain sensitive user data (names, addresses, account details), which is acceptable because the server has already authenticated the client via the session token. If the response contains PII that should be protected against TLS termination points (CDNs, WAFs), the server could encrypt the response body using the same session key — but this adds complexity and is uncommon in practice.

```json
{
  "user_id": "user-456",
  "email": "u***@example.com",
  "name": "John D.",
  "account_status": "active"
}
```

**Phase 3 — Key destruction.** When the session TTL expires, the Session Store automatically deletes the session key Kₛ. In Redis, this is handled natively by the `EXPIRE` mechanism; in database-backed stores, a background cleanup job removes expired sessions. Once the key is deleted, any ciphertext encrypted with Kₛ becomes permanently undecryptable — even if an attacker later obtains the ciphertext from access logs, CDN caches, or network captures, the key no longer exists to decrypt it. This provides application-layer forward secrecy. On the client side, when the browser tab is closed, the JavaScript runtime garbage-collects the `CryptoKey` object. The key material was never persisted to disk (non-extractable `CryptoKey`), so closing the tab ensures complete client-side key destruction.

</details>

#### §4.7.2 Architecture and Key Lifecycle

The session-bound symmetric key pattern has three phases: key establishment, PII encryption/decryption, and key destruction. Each phase maps directly to the session lifecycle.

**Phase 1: Session and Key Establishment.** During session creation (typically at login or first authenticated API call), the server generates a fresh AES-256-GCM key. This key is stored in the server-side session store (Redis, Memcached, or a database-backed session table) alongside other session data, and delivered to the frontend in the session creation response. The key transport relies on the existing TLS channel — the same channel that protects session cookies, authentication tokens, and all other sensitive data.

The key should be delivered as part of the session creation response body, not embedded in HTML (logging risk) or stored in a separate endpoint (additional attack surface). The response includes the raw key bytes (base64url-encoded) alongside the session identifier:

```json
{
  "session_id": "abc123",
  "encryption_key": "YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXoxMjM0NTY"
}
```

**Phase 2: Client-Side Encryption.** The frontend imports the key into the Web Crypto API with `extractable: false`, creating a non-extractable `CryptoKey` object. Even if an XSS vulnerability allows an attacker to execute JavaScript in the page's origin, the raw key bytes cannot be exported via `crypto.subtle.exportKey()`. However, XSS can still *use* the key for encrypt/decrypt operations — non-extractability prevents key exfiltration but not key usage.

```javascript
// Import session key as non-extractable CryptoKey
const rawKey = Uint8Array.from(atob(encryptionKey), c => c.charCodeAt(0));
const cryptoKey = await crypto.subtle.importKey(
  'raw', rawKey, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']
);

// Encrypt PII before transmission
const iv = crypto.getRandomValues(new Uint8Array(12));
const ciphertext = await crypto.subtle.encrypt(
  { name: 'AES-GCM', iv }, cryptoKey, new TextEncoder().encode(piiValue)
);
const encryptedParam = btoa(String.fromCharCode(...iv, ...new Uint8Array(ciphertext)));
```

**Phase 3: Key Destruction.** The key's lifetime is bounded by the session TTL. When the session expires (server-side TTL), is invalidated (logout), or the browser tab is closed (CryptoKey garbage-collected), the key is destroyed. No manual key rotation ceremony is required — the next session automatically generates a fresh key. This provides a natural form of forward secrecy at the application layer: compromising a session key exposes only the PII encrypted during that session, not historical or future data.

#### §4.7.3 Comparison with Static Key Distribution

The session-bound symmetric key differs fundamentally from the static JWKS-based key distribution described in §4.6:

| Dimension | Static JWKS (§4.6 hybrid) | Session-Bound Symmetric Key |
|:----------|:--------------------------|:----------------------------|
| Key type | Asymmetric (RSA/EC) + per-message DEK | Symmetric (AES-256) |
| Key generation | Client generates DEK; server's static public key wraps it | Server generates per-session key; sends to client |
| Key lifetime | DEK: per-message; public key: months/years | Per-session (minutes to hours) |
| Key rotation | DEK rotates per message; public key rotates operationally | Automatic with session renewal |
| Server can decrypt | ✅ Yes (holds private key) | ✅ Yes (holds symmetric key in session store) |
| Forward secrecy | ⚠️ Limited (private key compromise = all data) | ✅ Per-session (limited by session TTL) |
| XSS impact | Can encrypt but cannot decrypt server data | Can encrypt AND decrypt |
| Implementation complexity | Medium (JWE, key wrapping) | Low (symmetric AES-GCM only) |
| Cryptographic overhead | Higher (RSA/EC operations per message) | Lower (AES operations only) |
| Stateless API support | ✅ Yes (JWKS is stateless) | ❌ Requires server-side session store |
| Multi-frontend distribution | ✅ Single JWKS serves all clients | ⚠️ Each frontend needs its own session key |

#### §4.7.4 Security Analysis

**XSS remains the fundamental weakness** — the same caveat that applies to all client-side encryption patterns (§4.6). A per-session symmetric key compounds this risk because XSS can both encrypt *and* decrypt, whereas a static public key approach limits XSS to encryption-only (the private key never leaves the server). However, for the common case of "user enters PII → encrypt → send," XSS has access to plaintext before encryption regardless of the key distribution model.

**The session store becomes a high-value target.** A compromise of the session store exposes all active session keys, each of which can decrypt PII encrypted during its session. This is the same concentration risk noted in §3.4 for session-based resolution. Mitigation requires a dedicated, hardened session store with encryption at rest, access logging, network isolation, and short session TTLs.

**Key transport relies entirely on TLS.** Unlike the TLS handshake (which uses asymmetric key exchange for forward secrecy), the session key is sent as payload data over TLS. If the TLS session is recorded and the server's TLS private key is later compromised, the recorded session key can be decrypted. This is a trade-off of the symmetric approach — it sacrifices application-layer forward secrecy for implementation simplicity.

**Browser key storage options and their trade-offs:**

| Storage Location | XSS Risk | Persistence | Recommendation |
|:-----------------|:--------:|:-----------:|:--------------:|
| JavaScript variable (in-memory) | ✅ High | ❌ Lost on reload | Acceptable for single-page flows |
| Web Crypto API `CryptoKey` (non-extractable) | ⚠️ Medium | ❌ Lost on reload | **Best option** — non-extractable limits exfiltration |
| sessionStorage | ✅ High | ❌ Lost on tab close | Acceptable if Web Crypto unavailable |
| localStorage | ✅ High | ✅ Persists | **Never use** for encryption keys |

#### §4.7.5 Known Implementations and Vendors

The session-bound symmetric key pattern is not standardized by any RFC or IETF draft, but several implementations demonstrate its practical use:

**GhostBuy (University of Ottawa).** A research prototype for anonymous e-commerce that implements the exact pattern. The Backend Session Key is generated server-side, distributed to the Client Application, and used via the Web Crypto API to encrypt search terms and PII parameters before transmission. The backend decrypts using the same session key. GhostBuy demonstrates the pattern's feasibility for privacy-preserving commerce but remains an academic prototype without production deployment.

**Netflix Message Security Layer (MSL).** Netflix's MSL protocol establishes session keys (Master Tokens) for communication between Netflix clients and servers. While MSL operates at a custom protocol layer rather than REST, the architectural pattern is identical: session key establishment during handshake, symmetric encryption for subsequent messages, and key rotation via re-handshake. MSL is battle-tested at Netflix scale — it handles all streaming communication for over 200 million subscribers — demonstrating that session-bound key distribution can operate at extreme throughput.

**OpenAI Agents SDK — Encrypted Sessions.** The OpenAI Agents SDK provides an `EncryptedSession` implementation that derives per-session keys via HKDF for unique encryption per session. The transparent encryption wraps any session implementation, and key lifetime is automatically tied to session TTL. While not a browser-frontend pattern, it confirms that per-session key derivation is recognized as best practice even in non-browser contexts.

**Angular HTTP Interceptor Pattern.** A community-documented implementation uses Angular HTTP interceptors to transparently encrypt request/response payloads using a session-based symmetric key. The key is established during session creation and applied by the interceptor layer, centralizing the encryption logic and removing it from individual API call sites. This pattern is suitable for single-page applications where a centralized HTTP layer can intercept all requests.

**Adyen Client-Side Encryption (contrast).** Adyen's classic integration encrypts card data in the browser before submission, but uses **asymmetric** (public key) encryption rather than a per-session symmetric key. The library encrypts card data using a public key; the encrypted data is sent through the merchant's server to Adyen, where it is decrypted with the private key. This is the static JWKS approach (§4.6, option 3) — listed here as a contrast to highlight the industry's preference for asymmetric key distribution in payment contexts.

**Cloudflare WAF Payload Encryption with HPKE (contrast).** Cloudflare encrypts WAF-triggered payloads using Hybrid Public Key Encryption (RFC 9180), where a static key pair is used for asymmetric encryption at the edge. Like Adyen, this demonstrates the industry trend toward HPKE-based asymmetric key distribution rather than per-session symmetric keys — but HPKE could also serve as the key encapsulation mechanism for transporting a per-session key, combining the benefits of both approaches.

#### §4.7.6 When to Use This Pattern

The session-bound symmetric key is most appropriate when:

- **The server must decrypt PII for business logic** (the common case for REST APIs — email validation, deduplication, name matching), making true zero-knowledge encryption (§4.6) impractical.
- **Automatic key rotation is desired** without operational key rotation ceremonies. Session TTL provides natural rotation measured in minutes rather than months.
- **Implementation simplicity is preferred** over maximum key separation. Symmetric AES-GCM is significantly simpler to implement correctly than JWE with RSA/EC key wrapping.
- **Defense-in-depth against TLS compromise** is needed. The per-session key adds an application-layer encryption boundary that persists even if the TLS channel is compromised by a rogue CDN, WAF, or proxy that logs request bodies.

The pattern is **not appropriate** when:

- **The API is stateless** (JWT-only, no session store). The pattern requires server-side state to hold the session key.
- **Zero-knowledge properties are required** (the server must never be able to decrypt). Use §4.6 with client-generated key pairs instead.
- **Regulatory requirements mandate asymmetric key separation** (e.g., PCI DSS key management requirements that specify separate encryption and decryption keys).

#### §4.7.7 Browser Key Derivation Variant

A stronger variant avoids transmitting the raw key entirely. Instead of sending the symmetric key to the browser, the server sends a **key derivation seed** — a cryptographically random value that both sides independently feed into HKDF (RFC 5869) to derive the same AES-256 key:

```mermaid
flowchart LR
    subgraph server["Server"]
        direction TB
        S1["Generate random seed (32 bytes)"]
        S2["Store seed in session"]
        S3["HKDF(seed, salt, info) → Kₛ"]
        S1 --> S2
        S2 --> S3
    end

    subgraph browser["Browser"]
        direction TB
        B1["Receive seed over TLS"]
        B2["Web&nbsp;Crypto&nbsp;API: PBKDF2/HKDF import"]
        B3["Derive Kₛ (non-extractable CryptoKey)"]
        B1 --> B2
        B2 --> B3
    end

    SEED["seed (32 bytes)"] --> S1
    SEED --> B1
    S3 ===|"Same Kₛ"| B3
```

This variant has two advantages: (1) the seed is not the key itself — an attacker who captures the seed must also know the HKDF parameters (salt, info string) to derive the key; (2) the browser can derive the key directly into a non-extractable `CryptoKey` via `crypto.subtle.deriveKey()`, meaning the raw key bytes are never materialized in JavaScript.

```javascript
// Browser-side: derive key from seed without ever materializing raw key
const seedBuffer = Uint8Array.from(atob(seedB64), c => c.charCodeAt(0));
const baseKey = await crypto.subtle.importKey(
  'raw', seedBuffer, 'HKDF', false, ['deriveKey']
);
const sessionKey = await crypto.subtle.deriveKey(
  { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(16), info: new TextEncoder().encode('pii-encryption-v1') },
  baseKey, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
);
// sessionKey is non-extractable — the raw AES key never exists in JS memory
```

The server performs the same HKDF derivation with identical parameters to produce the same key. This approach is structurally similar to how the OpenAI Agents SDK's `EncryptedSession` works (per-session HKDF derivation), adapted for the browser context.

---

### §4.8 Comparative Analysis: Cryptographic Patterns

#### §4.8.1 Key Compromise Blast Radius

Each cryptographic pattern ties PII confidentiality to a secret key, but the consequences of key compromise vary dramatically. A compromised session key (§4.7) exposes only the PII exchanged during that browser session — minutes to hours of data. A compromised KEK (§4.5) allows an attacker to unwrap every data encryption key ever generated under it, potentially exposing months or years of PII across all tenants. A compromised FPE or deterministic AES key (§4.2, §4.3) not only decrypts all ciphertexts but also requires bulk re-encryption of every stored value — a key rotation event that can take days in production systems.

The diagram below maps each key type to its compromise scope:

```mermaid
%%{init: {themeVariables: {fontSize: "14px"}}}%%
flowchart TD
    subgraph key_hierarchy["Key Management Hierarchy"]
        direction TB
        KEK["`**KEK — Key&nbsp;Encryption&nbsp;Key**
        Long-lived, stored in KMS/HSM
        §4.5 Envelope Enc.`"]
        DEK["`**DEK — Data&nbsp;Encryption&nbsp;Key**
        Per-request, ephemeral
        §4.5 Envelope Enc.`"]
        SESSION["`**Session Key (Kₛ)**
        Per-session, auto-rotated
        §4.7 Session-Bound`"]
        STATIC["`**Static Asymmetric Key**
        JWKS endpoint, rotated quarterly
        §4.1 JWE, §4.6 CSE`"]
        FPE_KEY["`**FPE Key (AES-256)**
        Domain-specific, rotation = re-encrypt
        §4.2 FPE`"]
        DAE_KEY["`**Deterministic AES Key**
        Single key, rotation = re-encrypt
        §4.3 Det. AES`"]
    end

    subgraph scope["Scope of Compromise"]
        direction TB
        S1["`**KEK compromised** →
        All DEKs recoverable from
        wrapped DEKs in envelopes`"]
        S2["`**Single DEK compromised** →
        Only data from that one
        request exposed`"]
        S3["`**Session key compromised** →
        Only PII from that session
        (minutes to hours)`"]
        S4["`**Static private key compromised** →
        All JWE tokens decryptable
        until rotation`"]
        S5["`**FPE / Det. AES key compromised** →
        All ciphertexts decryptable
        — rotation requires bulk re-encryption`"]
    end

    KEK --> S1
    DEK --> S2
    SESSION --> S3
    STATIC --> S4
    FPE_KEY --> S5
    DAE_KEY --> S5

    KEK ---|wraps| DEK
```

Three tiers of blast radius emerge from this analysis. **Tier 1 — Catastrophic:** KEK compromise (§4.5) and static private key compromise (§4.1, §4.6) expose all historical data and require coordinated key rotation across all consumers. **Tier 2 — Significant:** FPE and deterministic AES key compromise (§4.2, §4.3) exposes all ciphertexts and additionally requires bulk re-encryption because the same key is used for every operation. **Tier 3 — Contained:** Per-request DEK compromise (§4.5) and session key compromise (§4.7) limit exposure to a single request or session, with no cross-contamination. This tiered model directly informs the key management recommendations in the Decision Matrix below — patterns with catastrophic blast radius demand hardware-backed key storage (KMS/HSM) and aggressive rotation schedules.

#### §4.8.2 Structured Comparison

The seven cryptographic patterns analyzed in this chapter address the same fundamental problem — protecting PII in URL parameters — but with fundamentally different trade-offs. This section provides a structured comparison across the dimensions most relevant to API architects.

| Dimension | JWE (§4.1) | FPE (§4.2) | Deterministic AES (§4.3) | Searchable Encryption (§4.4) | Envelope Encryption (§4.5) | Client-Side Encryption (§4.6) | Session-Bound Symmetric Key (§4.7) |
|:----------|:----------:|:----------:|:-------------------------:|:-----------------------------:|:--------------------------:|:----------------------------:|:--------------------------------:|
| **Security strength** | High (AES-256, RSA/EC) | Medium (bounded by domain size) | High (AES-256-GCM-SIV) | Low–Medium (leaks properties) | High (AES-256 + KEK isolation) | Highest (server never sees PII) | High (AES-256 + session isolation) |
| **Confidentiality** | ✅ Payload encrypted | ✅ Format-preserving ciphertext | ✅ Ciphertext opaque | ⚠️ Partial (property leakage) | ✅ Per-request encryption | ✅✅ End-to-end encryption | ✅ Client-side + TLS defense in depth |
| **Integrity** | ✅ AEAD tag | ❌ No integrity (add MAC) | ✅ SIV serves as tag | Varies by scheme | ✅ AEAD + KMS auth | ⚠️ Depends on mode | ✅ AEAD (AES-GCM) |
| **Performance overhead** | Low (1–5 ms) | Low (<1 ms) | Low (<1 ms) | High (index overhead) | Medium (40–100 ms KMS) | Low (browser crypto <5 ms) | Low (AES-GCM <2 ms) |
| **Ciphertext expansion** | High (2–3× base64url) | None (same length) | Medium (16 bytes + base64) | Varies by scheme | Medium (wrapped DEK + IV + tag) | Medium (same as chosen cipher) | Medium (IV + tag + base64url) |
| **URL compatibility** | ⚠️ Long tokens (>500 chars) | ✅ Excellent (same format) | ⚠️ Requires base64url (~44+ chars) | ❌ Complex protocol | ⚠️ Requires base64url (envelope) | ⚠️ Depends on cipher choice | ⚠️ Requires base64url (~44+ chars) |
| **Format preservation** | ❌ Opaque blob | ✅ Same format | ❌ Binary ciphertext | ❌ N/A | ❌ Binary envelope | ❌ Binary ciphertext | ❌ Binary ciphertext |
| **Lookup capability** | ❌ One-time token | ✅ Deterministic mode | ✅ Same plaintext → same token | ✅ Range/equality/prefix | ❌ Per-request (unique DEK) | ❌ Server can't search | ❌ Random IV per request |
| **Key management** | Medium (JWKS rotation) | High (rotation = re-encrypt all) | High (rotation = re-encrypt all) | High (complex key hierarchies) | High (KEK + per-request DEK) | Highest (key distribution to clients) | Low (automatic per-session rotation) |
| **Key compromise impact** | All tokens exposed | All ciphertexts exposed | All tokens exposed | All indexes exposed | Only affected DEKs exposed | Key holder's data exposed | Current session only |
| **Reversibility** | ✅ Decrypt with private key | ✅ Decrypt with FPE key | ✅ Decrypt with same key | ✅ (searchable) / ❌ (OPE partial) | ✅ Unwrap DEK, then decrypt | ✅ Decrypt with client key | ✅ Decrypt with session key |
| **GDPR Art. 32 alignment** | ✅ Encryption + pseudonymisation | ✅ Encryption + pseudonymisation | ✅ Encryption | ⚠️ Partial (property leakage) | ✅ Encryption + key isolation | ✅✅ Strongest encryption | ✅ Encryption + automatic rotation |
| **Production maturity** | High (RFC standard, many libs) | Medium (NIST-approved, niche use) | Medium (RFC standard, growing) | Low (research stage) | High (AWS/Azure/GCP native) | Medium (Web Crypto mature, ZK architecture emerging) | Low (no RFC, niche implementations) |
| **Implementation complexity** | Medium | Medium | Low | Very High | High | Medium–High | Low |

```mermaid
%%{init: {themeVariables: {fontSize: "14px"}}}%%
flowchart TD
    Q["`**Which cryptographic pattern
    for PII in URL parameters?**`"]
    Q --> Q1{"`Does the server need<br/>to decrypt the PII?`"}

    Q1 -- "`No — server must<br/>never see PII`" --> CSE["`**§4.6 Client-Side Encryption**
    Zero-knowledge architecture
    Browser encrypts before transmission`"]
    
    Q1 -- "`Yes — server processes PII`" --> Q2{"`Must the ciphertext<br/>match the plaintext format?`"}

    Q2 -- "`Yes — legacy schema,<br/>regex validation`" --> FPE["`**§4.2 FPE (FF1)**
    Same format, same length
    Passes existing validators`"]
    
    Q2 -- "`No — opaque token OK`" --> Q3{"`Is the token used for<br/>database lookups?`"}

    Q3 -- "`Yes — stable identifier`" --> Q4{"`Need exact match only,<br/>or range/prefix search?`"}
    
    Q4 -- "`Exact match only`" --> DAES["`**§4.3 Deterministic AES**
    Same PII → same token
    AES-GCM-SIV with fixed nonce`"]
    
    Q4 -- "`Range / prefix / keyword`" --> SE["`**§4.4 Searchable Encryption**
    OPE for ranges, SSE for keywords
    Significant complexity trade-off`"]

    Q3 -- "`No — one-time transport`" --> Q5{"`Is per-request key<br/>isolation required?`"}

    Q5 -- "`Yes — policy or compliance`" --> Q6{"`Is there a session<br/>context available?`"}
    
    Q6 -- "`Yes — stateful API`" --> SBK["`**§4.7 Session-Bound Key**
    Per-session AES key via Web Crypto
    Automatic rotation on session expiry`"]
    
    Q6 -- "`No — stateless API`" --> ENV["`**§4.5 Envelope Encryption**
    Per-request DEK + KMS wrapping
    Audit trail for every decryption`"]
    
    Q5 -- "`No — standard transport`" --> JWE["`**§4.1 JWE**
    Standard format, expiry support
    Wide library ecosystem, JWKS rotation`"]
```

The encryption pipeline diagram below visualizes how each pattern transforms the same plaintext PII value (`user@example.com`) into a URL parameter, highlighting the intermediate steps that distinguish the approaches:

```mermaid
%%{init: {themeVariables: {fontSize: "14px"}}}%%
flowchart LR
    subgraph plaintext["Plaintext PII"]
        P["user@example.com"]
    end

    subgraph jwe_flow["§4.1 JWE"]
        direction TB
        J1["Package claims as JSON"]
        J2["Encrypt with recipient<br/>public key (RSA-OAEP / ECDH-ES)"]
        J3["5-segment compact serialization"]
        J4["`?token=eyJhbG...`"]
        J1 --> J2 --> J3 --> J4
    end

    subgraph fpe_flow["§4.2 FPE"]
        direction TB
        F1["Encode to radix numeral"]
        F2["10-round Feistel network<br/>(AES-based)"]
        F3["Decode to same format"]
        F4["`?email=k7xw@pn3fjrs.m9q`"]
        F1 --> F2 --> F3 --> F4
    end

    subgraph daes_flow["§4.3 Det. AES"]
        direction TB
        D1["AES-GCM-SIV with<br/>fixed/empty nonce"]
        D2["SIV || Ciphertext"]
        D3["base64url encode"]
        D4["`?token=w2J7hK_L9qR3...`"]
        D1 --> D2 --> D3 --> D4
    end

    subgraph env_flow["§4.5 Envelope"]
        direction TB
        E1["KMS: GenerateDataKey"]
        E2["Encrypt PII with DEK"]
        E3["Wrap DEK with KEK"]
        E4["`?token=base64url(envelope)`"]
        E1 --> E2 --> E3 --> E4
    end

    P --> J1
    P --> F1
    P --> D1
    P --> E1
```

FPE is the only pattern where the output preserves the email format — a direct consequence of its Feistel-network design (§4.2). Envelope encryption has the most intermediate steps (KMS call → DEK generation → encryption → wrapping), which explains its higher latency but also its superior key isolation. JWE produces the longest URL parameter due to its 5-segment compact serialization (header, encrypted key, IV, ciphertext, tag).

#### §4.8.3 Decision Matrix

The following decision matrix maps common use cases to the most appropriate cryptographic pattern:

| Use Case | Recommended Pattern | Rationale |
|:---------|:-------------------:|:----------|
| **One-time PII submission** (form data in URL) | JWE | Self-contained, expiry support, standard libraries, server decrypts with private key |
| **Persistent lookup token** (customer reference in URL) | Deterministic AES or FPE | Same PII → same token, enabling database lookups without decryption |
| **Legacy system compatibility** (fixed-length columns, format validation) | FPE | Ciphertext passes all existing validators without schema changes |
| **Multi-tenant SaaS** (per-tenant key isolation) | Envelope encryption | Per-tenant DEKs; KMS access controls limit who can decrypt |
| **Zero-knowledge requirement** (regulatory or trust model) | Client-side encryption | Server never sees plaintext; strongest confidentiality guarantee |
| **Server-side search on encrypted PII** | Searchable encryption (or deterministic AES for exact match) | Enables server-side queries without decryption; limited to specific query types |
| **Short-lived session tokens containing PII** | JWE (with short exp) | Standard JWT infrastructure, automatic expiry, revocation via jti |
| **High-volume API with tight latency budget** | Deterministic AES or JWE | Minimal overhead (<5 ms); avoid envelope encryption (KMS latency) |
| **Maximum ciphertext compactness** | FPE | Zero expansion; same length as plaintext |
| **Audit trail for every decryption** | Envelope encryption | KMS logs every unwrap operation |

#### §4.8.4 Pattern Layering

Cryptographic patterns are not mutually exclusive — they can be layered to combine their strengths:

**JWE + Envelope Encryption:**
Use a per-request DEK for the JWE content encryption key (CEK), and wrap the DEK with the server's KEK. This combines JWE's standard format with envelope encryption's key isolation. Conceptually, this is what JWE already does when using asymmetric key agreement (the encrypted CEK is a wrapped DEK).

**FPE + MAC:**
FPE provides no integrity protection. Layer an HMAC-SHA256 over the FPE-encrypted value to detect tampering:
```
URL parameter: <FPE_ciphertext>.<HMAC-SHA256(FPE_ciphertext, mac_key)>
```

**Deterministic AES + JWE:**
Encrypt PII deterministically with AES-GCM-SIV, then package the ciphertext as a JWE signed claim. The outer JWS provides integrity; the inner deterministic encryption provides consistency:
```json
{
  "enc_pii": "<base64url(AES-GCM-SIV(email))>",
  "alg": "ES256"
}
```

**Client-Side Encryption + Envelope Encryption:**
The client generates a DEK, encrypts PII with it, wraps the DEK with a KEK (obtained from a KMS), and sends the envelope. The server unwraps the DEK via KMS (providing an audit trail) and decrypts. This gives the best of both worlds: client-side encryption with server-side auditability.

#### §4.8.5 Summary

No single cryptographic pattern is optimal for all use cases. The choice depends on the specific requirements of the API, the trust model, the performance budget, and the regulatory environment:

- **Start with JWE** for one-time PII transport — it is the most standardized, widely supported, and easiest to implement correctly.
- **Add FPE or deterministic AES** when you need stable tokens from PII values (lookup, deduplication).
- **Use envelope encryption** when key isolation and audit trails are required.
- **Reserve client-side encryption** for zero-knowledge architectures where the server must never see plaintext.
- **Consider session-bound symmetric key distribution** when the server must decrypt PII for business logic but automatic per-session key rotation is desired — simpler than asymmetric key wrapping, with natural forward secrecy.
- **Avoid searchable encryption** for URL parameters unless you have a specific requirement for server-side queries on encrypted data — the complexity and security trade-offs rarely justify the benefit.

All seven patterns satisfy GDPR Article 32's requirement for encryption of personal data. The difference lies in the **strength of the guarantee** and the **operational cost** of achieving it. The architect's task is to select the weakest pattern that still meets the security requirements — over-engineering adds cost without proportional benefit.

After selecting a cryptographic pattern, the next question is the operating model that pattern forces:

| If you chose... | Read next | Why |
|:----------------|:----------|:----|
| **Envelope encryption, centralized unwrap, or managed keys** | §13, §14 | Audit cryptographic operations and design the key authority model |
| **Stable or reversible ciphertext in live APIs** | §9, §15 | Plan migration and verify that erasure remains feasible |
| **Any design that may expose plaintext during processing or debugging** | §16 | Prevent observability systems from becoming the real leak surface |
| **A managed service or platform implementation** | §10, §11, §12 | Evaluate vendor fit, platform limits, and build-vs-buy boundaries |

---

## 5. Pseudonymization and Tokenization Patterns

Pseudonymization and tokenization patterns replace PII with surrogate values — tokens, hashes, or generalized representations — that carry no direct reference to the original data subject. Unlike encryption (Chapter 4), which uses reversible mathematical transformations bound to secret keys, tokenization relies on a mapping table or algorithmic derivation to maintain the relationship between the surrogate and the original. This chapter examines vault-based and vaultless tokenization, client-side pseudonymization techniques, and generalization approaches grounded in k-anonymity.

---

### §5.1 Pseudonymization and Tokenization: Concepts and GDPR Spectrum

The techniques in this chapter occupy a specific position on the GDPR compliance spectrum — between encryption (which protects confidentiality but does not alter the data's identifiability) and anonymisation (which irreversibly removes the link to the data subject). The EDPB Guidelines 01/2025 on pseudonymisation provide the authoritative framework: pseudonymised data is *still personal data* under GDPR Article 4(1), but the additional information needed for re-identification is "kept separately and subject to technical and organisational measures" (Article 4(5)). This makes pseudonymisation a recognised safeguard under Article 25 (data protection by design), Article 32(1)(a) (appropriate technical measures), and Article 6(4)(e) (legitimate interests balancing).

The pseudonymisation spectrum ranges from techniques that maintain full reversibility (vault-based tokenization, where a central mapping table links tokens to plaintext) through algorithmic reversibility (vaultless tokenization using FPE, where the key enables decryption) to irreversible transformations (client-side hashing, where no entity can recover the original PII from the pseudonym alone). At the far end, generalization (k-anonymity) reduces data precision rather than replacing it, and true anonymisation — where re-identification is not "reasonably likely" by any means — remains exceptionally difficult to achieve in practice.

The following diagram positions each technique along this spectrum, from raw PII (full GDPR scope) through progressively stronger pseudonymisation to anonymisation (outside GDPR scope):

```mermaid
flowchart LR
    A["`**Raw PII**
    Full GDPR scope`"]
    -->|Replace with token| B["`**Pseudonymised**
    (Vault-Based Tokenization)
    GDPR applies, reduced risk`"]
    -->|Algorithmic derivation| C["`**Pseudonymised**
    (Vaultless / FPE)
    GDPR applies, key-dependent`"]
    -->|Client-side hash| D["`**Pseudonymised**
    (Client-Side)
    GDPR applies, irreversible`"]
    -->|Reduce precision| E["`**Generalized**
    (K-Anonymity)
    GDPR applies, utility loss`"]
    -->|Irreversible destruction<br/>of mapping| F["`**Anonymised**
    GDPR does NOT apply`"]
```

---

### §5.2 Component Architecture: Tokenization Building Blocks

Before examining each tokenization technique in depth, it is useful to establish a shared understanding of the core components involved. Every tokenization architecture — whether vault-based or vaultless — involves a set of building blocks that govern how PII is transformed, stored, accessed, and audited. The diagram below shows the component relationships and data flows in a typical tokenization deployment:

```mermaid
flowchart TB
    subgraph Vault["Tokenization Vault"]
        direction TB
        TS["Token Store
        (Mapping Database)"]
        AC["Access Control
        (RBAC / Policies)"]
        AL["Audit Log
        (Immutable)"]
        KM["Key Management
        (HSM / KMS)"]
    end

    subgraph API["API Layer"]
        direction TB
        GW["API Gateway"]
        SRV["API Server"]
        BE["Backend DB"]
    end

    CL["Client App"]
    KMS["External KMS / HSM"]

    CL -- "1. Encode PII" --> Vault
    Vault -- "2. Return Token" --> CL
    CL -- "3. API Request with Token" --> GW
    GW -- "4. Forward" --> SRV
    SRV -- "5. Decode Token" --> Vault
    Vault -- "6. Return Plaintext" --> SRV
    SRV -- "7. Query" --> BE
    KM -.->|wraps keys| KMS
    AC -.->|governs| TS
    AL -.->|records all ops| TS
```

The **Tokenization Vault** (blue) houses the token store (mapping database), access control layer, immutable audit log, and key management subsystem. The **API Layer** (green) represents the standard request path — API gateway, API server, and backend database. The **Client App** (orange) initiates tokenization requests, and the **External KMS / HSM** (purple) provides hardware-backed key storage. Sections §5.3 through §5.6 explore how these components are arranged differently in vault-based, vaultless, client-side, and generalization architectures.

---

### §5.3 Vault-Based Tokenization

#### §5.3.1 Concept Overview

Vault-based tokenization is a reversible data-protection technique in which a centralized tokenization service — the *vault* — maintains a secure, one-to-one mapping between sensitive plaintext values (PII) and non-sensitive surrogate values (tokens). When an application needs to transmit or store PII through a REST API, it first sends the plaintext to the vault, receives a token in return, and uses that token in place of the original value. The vault is the sole component capable of reversing the transformation: resolving a token back to its plaintext counterpart.

Unlike encryption, tokenized values bear no mathematical relationship to the original data. A token for the email `alice@example.com` might be `a7f3b2e9-c41d-4f8a` — a random string with no derivable connection to the plaintext. This property is fundamental to tokenization's value proposition: even if an attacker intercepts or exfiltrates the token, they cannot reverse-engineer the original PII without access to the vault itself.

#### §5.3.2 How It Works in a REST API Context

The tokenization flow in a typical API architecture involves four participants: the **client application**, the **tokenization vault**, the **API gateway/server**, and the **backend data store**. The sequence proceeds as follows:

1. **Tokenization (encode).** The client application holds a plaintext PII value (e.g., a Social Security Number, email address, or national ID). Before making an API call, it sends the plaintext to the vault via a dedicated encode endpoint. The vault generates a random token, stores the mapping in its internal database, and returns the token to the client.

2. **API invocation with token.** The client uses the token in place of the PII in the URL — for example, `GET /customers/a7f3b2e9-c41d-4f8a/orders` instead of `GET /customers?ssn=123-45-6789/orders`. The API server receives only the token; it never sees the raw PII.

3. **Detokenization (decode).** When the API server (or a downstream service) needs the original PII for business logic — such as looking up a customer record or generating a compliance report — it calls the vault's decode endpoint with the token. The vault resolves the token to the plaintext and returns it. The server uses the plaintext internally and discards it, ensuring it does not leak into logs or responses.

4. **Response.** The API server returns results to the client. Depending on the use case, the response may contain tokens (if the client does not need to see the raw PII) or the resolved plaintext (if the client is authorized and the business process requires it).

#### §5.3.3 Vault Architecture

A production-grade tokenization vault comprises several critical components:

**Token store.** The core database that maintains the bidirectional mapping between tokens and plaintext values. This store must support high-throughput reads and writes, ACID transactions to prevent duplicate token assignment, and robust backup and recovery. Enterprise vaults typically use distributed databases (e.g., Cassandra, CockroachDB) to ensure horizontal scalability and fault tolerance.

**Mapping database.** While conceptually part of the token store, the mapping database is often logically separated into encode tables (plaintext → token) and decode tables (token → plaintext). The encode table enables *deterministic* tokenization — the same plaintext always produces the same token — which is essential for use cases where the API must perform lookups by PII value (e.g., `GET /customers?token=<email_token>`). The decode table supports the reverse lookup. Vault products often allow operators to choose between deterministic and randomized token generation per transformation.

**Access control.** The vault must enforce fine-grained access policies: which applications or services are authorized to encode, which can decode, and which transformations they are permitted to use. In HashiCorp Vault, this is managed through Vault policies bound to authentication methods (AppRole, JWT, Kubernetes auth). In Thales CipherTrust, role-based access control (RBAC) governs who can perform tokenization operations on which data domains.

**Audit logging.** Every encode and decode operation is logged immutably: who requested the operation, when, which transformation was used, the token (but typically not the plaintext, for security), and whether the operation succeeded or failed. This audit trail is essential for GDPR accountability (Art. 5(2)) and for investigating potential data breaches. If an attacker exfiltrates tokens, the audit log reveals which tokens were decoded by which identities — a critical forensic capability.

**Key management.** Although tokenization does not rely on cryptographic key material in the same way as encryption, vaults still manage keys for internal operations: signing tokens to prevent tampering, encrypting the mapping database at rest, and authenticating API clients. These keys are typically stored in an HSM or a KMS, following the principle of separation of duties.

#### §5.3.4 Sequence Diagram: Vault-Based Tokenization Flow

```mermaid
%%{init: {sequence: {actorMargin: 250, messageMargin: 60}, themeVariables: {noteBkgColor: "transparent", noteBorderColor: "transparent"}}}%%
sequenceDiagram
    autonumber
    participant C as Client App
    participant V as Tokenization Vault
    participant A as API Server
    participant D as Backend DB

    rect rgba(52, 152, 219, 0.14)
        Note over C, V: Phase 1 — Tokenization (Encode)
        C->>V: POST /encode {plaintext: "alice@example.com", transform: "email"}
        V->>V: Generate random token
        V->>V: Store mapping: "a7f3b2e9" → "alice@example.com"
        V->>V: Log encode operation (audit)
        V-->>C: 200 OK {token: "a7f3b2e9-c41d"}
        Note right of D: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end

    rect rgba(46, 204, 113, 0.14)
        Note over C, A: Phase 2 — API Invocation
        C->>A: GET /customers/a7f3b2e9-c41d/orders
        A->>V: POST /decode {token: "a7f3b2e9-c41d"}
        V->>V: Resolve token → plaintext
        V->>V: Log decode operation (audit)
        V-->>A: 200 OK {plaintext: "alice@example.com"}
        A->>D: SELECT * FROM orders WHERE email = "alice@example.com"
        D-->>A: Order records
        A-->>C: 200 OK [{order_id: 1001, ...}]
        Note right of D: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end

    rect rgba(241, 196, 15, 0.14)
        Note over A: Phase 3 — Cleanup
        A->>A: Discard plaintext from memory
        A->>A: Log API request with token only (no PII in logs)
        Note right of D: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
```

<details><summary><strong>1. Client App sends plaintext PII to Tokenization Vault for encoding</strong></summary>

The Client App initiates the tokenization flow by submitting the plaintext PII value (e.g., an email address, phone number, or national ID) to the Tokenization Vault's encode endpoint. The request specifies the plaintext value and the desired **transformation name** — a named policy that determines the token format, length, and character set.

This step matters because it is the **point at which PII leaves the client's possession in plaintext form**. After this call, the client retains only the token — the vault becomes the sole custodian of the mapping. This is the foundation of GDPR Article 4(5) pseudonymisation.

```http
POST /v1/transform/encode HTTP/1.1
Host: vault.internal.example.com
Content-Type: application/json

{
  "plaintext": "alice@example.com",
  "transformation": "email"
}
```

</details>

<details><summary><strong>2. Tokenization Vault generates a random token</strong></summary>

The vault generates a **cryptographically random token** using a CSPRNG — not derived from the plaintext through any reversible algorithm. Depending on the vault's configuration, the same plaintext may always map to the same token (deterministic mode, useful for lookup operations) or may produce a different token each time (randomized mode, which eliminates linkage risk).

</details>

<details><summary><strong>3. Tokenization Vault stores the token-to-plaintext mapping</strong></summary>

The vault stores the mapping between the generated token and the original plaintext in its internal database. The **mapping database is the crown jewel** of the tokenization architecture — an attacker who gains read access can reverse every token ever issued. The vault must protect this store with encryption at rest, strict access controls, and tamper-evident audit logging. PCI DSS Requirement 3.4 explicitly recognizes tokenization as a compliant method when these requirements are met.

</details>

<details><summary><strong>4. Tokenization Vault logs the encode operation</strong></summary>

The vault records an **audit log entry** for the encode operation, capturing the timestamp, token value, transformation name, requestor identity, and result. Critically, the audit log records the *token* but typically **not the plaintext** — ensuring the audit trail itself does not become a secondary PII repository.

</details>

<details><summary><strong>5. Tokenization Vault returns the token to Client App</strong></summary>

The vault responds with the generated token. From this point forward, **the client can use the token as a drop-in replacement for the PII** in API calls, URLs, logs, and database records.

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "token": "a7f3b2e9-c41d",
  "transformation": "email",
  "created_at": "2026-04-09T14:32:01.482Z"
}
```

</details>

<details><summary><strong>6. Client App sends API request using the token in the URL path</strong></summary>

The Client App issues the business API request to the API Server, substituting the token for the original PII in the URL path. The URL now contains **no plaintext PII**, ensuring that browser history, proxy logs, CDN access logs, and WAF audit trails capture only the opaque token.

```http
GET /api/v1/customers/a7f3b2e9-c41d/orders HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
```

</details>

<details><summary><strong>7. API Server requests detokenization from Tokenization Vault</strong></summary>

The API Server extracts the token from the URL path and calls the vault's decode endpoint. The vault authenticates the API Server and verifies it is authorized to perform decode operations. This is the **controlled re-identification point** — the only moment when pseudonymised data is re-linked to the data subject. Every decode operation is logged for GDPR Article 30 compliance.

```http
POST /v1/transform/decode HTTP/1.1
Host: vault.internal.example.com
Content-Type: application/json

{
  "token": "a7f3b2e9-c41d",
  "transformation": "email"
}
```

</details>

<details><summary><strong>8. Tokenization Vault resolves the token to plaintext</strong></summary>

The vault looks up the token in its mapping database and retrieves the corresponding plaintext. The vault is the **sole authority for re-identification** — no other component can resolve a token without calling the vault.

</details>

<details><summary><strong>9. Tokenization Vault logs the decode operation</strong></summary>

Before returning the plaintext, the vault records an audit log entry for the decode operation — capturing timestamp, token, requestor identity, result, and lookup duration. This audit trail is essential for detecting anomalous access patterns (e.g., a service decoding far more tokens than its business function requires).

</details>

<details><summary><strong>10. Tokenization Vault returns plaintext to API Server</strong></summary>

The vault returns the plaintext PII to the API Server. The vault can enforce **decode policies** at this stage — for example, requiring manager approval for certain transformations (e.g., SSN detokenization), enforcing rate limits, or returning partial plaintexts (e.g., masking all but the last four characters).

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "plaintext": "alice@example.com",
  "transformation": "email",
  "token": "a7f3b2e9-c41d"
}
```

</details>

<details><summary><strong>11. API Server queries Backend DB with the detokenized plaintext</strong></summary>

With the plaintext PII recovered, the API Server constructs the database query and executes it against the Backend DB. The detokenized PII is used only within the API Server's processing pipeline — passed as a query parameter and not included in any external-facing channel.

</details>

<details><summary><strong>12. Backend DB returns query results to API Server</strong></summary>

The database returns the matching business data (e.g., order records) to the API Server. The response contains **business data, not the detokenized PII** — the email address does not appear in the response body.

</details>

<details><summary><strong>13. API Server returns results to Client App</strong></summary>

The API Server formats the response and returns it to the Client App. The response uses the token (not the plaintext) as the customer identifier:

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "customer_token": "a7f3b2e9-c41d",
  "orders": [
    {"order_id": 1001, "status": "shipped", "total": "€89.99"},
    {"order_id": 1047, "status": "pending", "total": "€142.50"}
  ]
}
```

</details>

<details><summary><strong>14. API Server discards plaintext PII from memory</strong></summary>

After processing the request, the API Server **immediately zeroes the detokenized plaintext from memory** — clearing any variables, buffers, or cache entries that held the PII value. This minimizes the window of exposure to memory-scraping attacks (CVE-2021-44228-style exploits, core dumps, debugging sessions).

</details>

<details><summary><strong>15. API Server logs the request with token only (no PII in logs)</strong></summary>

The server writes the access log entry using **only the token**, never the plaintext PII. For example: `GET /api/v1/customers/a7f3b2e9-c41d/orders → 200`. This ensures that the log archive — which may be retained for years — contains no personal data, reducing the scope of GDPR Article 17 (right to erasure) and Article 33 (breach notification) obligations.

</details>

#### §5.3.5 Example Products

**HashiCorp Vault Transform Secrets Engine.** Available as part of Vault Enterprise's Advanced Data Protection (ADP) module, the Transform secrets engine provides both format-preserving encryption (FPE) and tokenization transformations. Tokenization in Vault is explicitly *non-reversible by algorithmic means* — there is no cryptographic key that can derive the plaintext from the token. Reversal is possible only through the vault's decode API, which looks up the mapping in Vault's internal storage. This distinction satisfies PCI-DSS requirements for irreversibility while still allowing authorized detokenization when business logic demands it. Vault supports deterministic tokenization (same input → same token) for lookups, and supports metadata attachment to tokens for identifying data type and purpose.

**Thales CipherTrust.** CipherTrust Tokenization (formerly Vormetric Tokenization) provides centralized tokenization with support for format-preserving tokens, ensuring that tokenized values conform to the same length and character set as the original data — critical for legacy systems that enforce field-level validation. CipherTrust integrates with Thales' broader data security platform, including Transparent Data Encryption and key management, providing a unified control plane for data protection policies across databases, files, and API endpoints.

**Protegrity Data Security Platform.** Protegrity offers both vault-based and vaultless tokenization (§5.4). Its vault-based approach centralizes token management with fine-grained access controls and audit logging. Protegrity's platform emphasizes *field-level* tokenization — different PII fields within the same API request can be tokenized with different policies (e.g., email gets a short-lived token, SSN gets a token that requires manager approval to decode).

#### §5.3.6 Latency Implications

Vault-based tokenization introduces additional network round-trips into the API request path. Each encode or decode operation requires an HTTP call to the vault service, adding latency that varies by deployment topology:

- **Same data center:** 1–5 ms per vault call (typical for co-located services)
- **Cross-region:** 20–100 ms per vault call (depending on geography and network conditions)
- **Cloud-hosted vault (e.g., HCP Vault Dedicated):** 5–30 ms per vault call, with additional variance from shared infrastructure

For a typical REST API flow that requires both encode (client-side) and decode (server-side), the total added latency ranges from 2 ms (best case, co-located) to 200 ms (worst case, cross-region vault with cold cache). This latency budget must be factored into API SLA design. Techniques to mitigate vault latency include:

- **Token caching.** Clients can cache recently obtained tokens, avoiding redundant encode calls for the same PII value within a session. However, cached tokens may expire (Vault supports TTL-based token expiration), requiring re-encode.
- **Batch operations.** Some vaults support batch encode/decode, allowing the client or server to tokenize or detokenize multiple values in a single API call, amortizing the round-trip overhead.
- **Sidecar deployment.** Running the vault (or a vault agent) as a sidecar in the same pod or VM as the API server eliminates network latency for decode operations, converting the overhead to a local IPC call.

#### §5.3.7 GDPR Classification: Pseudonymised ≠ Anonymised

The EDPB Guidelines 01/2025 on pseudonymisation, adopted in June 2025, provide authoritative guidance on this critical distinction. Under GDPR Article 4(5), *pseudonymisation* means "the processing of personal data in such a manner that the personal data can no longer be attributed to a specific data subject without the use of additional information, provided that such additional information is kept separately and is subject to technical and organisational measures to ensure that the personal data is not attributed to an identified or identifiable natural person."

Vault-based tokenization satisfies this definition: the token cannot be linked back to the data subject without access to the vault's mapping database, and the vault enforces access controls and audit logging. However, the EDPB guidelines are unambiguous on one point: **pseudonymised data remains personal data under the GDPR**. The data controller is still subject to all GDPR obligations — lawful basis, data subject rights, data protection impact assessments, breach notification. Pseudonymisation is a *safeguard* under Article 32(1)(a), not an exemption from the regulation.

The guidelines further clarify that the effectiveness of pseudonymisation must be assessed in context. A token that cannot be reversed in isolation might become re-identifiable when combined with external data sources — for example, if a token is consistently used alongside a timestamp that can be correlated with other events. Controllers must conduct a contextual analysis of re-identification risk, considering the "motivation, capability and resources of the hypothetical attacker" (EDPB Guidelines 01/2025, §III).

#### §5.3.8 Audit Trail Requirements

Every tokenization operation — encode and decode — should be logged immutably. A well-designed audit entry captures:

- **Timestamp** (UTC, with microsecond precision)
- **Operation type** (encode or decode)
- **Token value** (logged; plaintext is typically *not* logged for security)
- **Transformation name** (identifies the tokenization policy)
- **Requestor identity** (service account, application ID, or user)
- **Client IP address**
- **Result** (success or failure with error code)
- **Token TTL** (if applicable)

This audit trail serves three purposes under GDPR:

1. **Accountability** (Art. 5(2)): demonstrates that the controller has implemented appropriate technical measures.
2. **Breach investigation** (Art. 33–34): if tokens are exfiltrated, the audit log reveals the scope — which tokens were accessed and by whom.
3. **Access control review** (Art. 25): regular analysis of decode patterns can reveal over-privileged services that detokenize more frequently than business requirements justify.

#### §5.3.9 Failover and Availability Concerns

The vault is a **critical dependency** in a vault-based tokenization architecture. If the vault becomes unavailable, the system cannot encode new PII or decode existing tokens — effectively halting any API operation that requires PII resolution. This makes vault availability a first-class architectural concern:

- **High-availability deployment.** Enterprise vaults must be deployed in a highly available configuration — typically a multi-node cluster with automatic failover. HashiCorp Vault Enterprise supports integrated storage (Raft consensus) with leader election, ensuring that a vault cluster remains available as long as a quorum of nodes is reachable.
- **Disaster recovery.** Cross-region replication of the token store is essential for business continuity. HashiCorp Vault supports performance replication (primary-secondary topology) and disaster recovery replication, allowing a secondary cluster to assume the primary role if the primary region fails.
- **Graceful degradation.** In some architectures, the API server can continue operating with tokens it has already decoded and cached, serving requests that do not require fresh PII resolution. However, any request that needs a new encode or a fresh decode will fail.
- **Token expiry and offline periods.** If the vault enforces TTL-based token expiration and the vault is down when a token expires, the client cannot re-encode. Designs that use long-lived or non-expiring tokens reduce this risk but increase the window of exposure if tokens are compromised.

The EDPB Guidelines 01/2025 implicitly address this concern by emphasizing that pseudonymisation measures must be "state of the art" and proportionate to the risk. A tokenization architecture without adequate failover does not meet this standard.

---

### §5.4 Vaultless Tokenization

#### §5.4.1 Concept Overview

Vaultless tokenization eliminates the centralized mapping database that defines vault-based approaches. Instead of storing a token-to-plaintext correspondence in a persistent store, vaultless tokenization generates tokens *algorithmically* — the token is computed directly from the plaintext (and a secret key) using cryptographic techniques. The mapping is implicit in the mathematics, not stored in a database.

This architectural shift has profound implications for scalability, availability, and operational complexity. Without a vault to query, there is no network round-trip for tokenization or detokenization, no database to replicate for high availability, and no single point of failure. The trade-off is that reversibility depends entirely on key management: whoever holds the tokenization key can reverse the transformation, and key compromise is catastrophic because it affects all tokenized data — past and present.

#### §5.4.2 Deterministic vs. Randomized Approaches

Vaultless tokenization supports two fundamental modes, each with distinct properties:

**Deterministic tokenization.** The same plaintext input, combined with the same key, always produces the same token. This enables *lookup*: given a token, the system can re-derive the plaintext by applying the inverse operation (if the algorithm is reversible, as with FPE) or by hashing candidate plaintexts and comparing tokens (if the algorithm is a keyed hash). Deterministic tokenization is essential for use cases where the API must search or join on pseudonymised PII — for example, correlating customer records across systems using a tokenized email address.

The deterministic property, however, introduces *linkage risk*. An attacker who observes the same token appearing across multiple requests, databases, or time periods can infer that the underlying PII value is the same. This is a form of deterministic leakage that the EDPB Guidelines 01/2025 address under the concept of "singling out" — the ability to isolate an individual's record within a dataset. In contexts where linkage across requests is a privacy concern (e.g., advertising, analytics), deterministic tokenization may be insufficient on its own.

**Randomized tokenization.** Each tokenization of the same plaintext produces a different token, typically by incorporating a random nonce or initialization vector into the computation. This eliminates linkage risk — the same email address tokenized ten times yields ten different tokens — but it also eliminates lookup capability. Without a deterministic mapping, the system cannot resolve a token to its plaintext without additional state (such as an index mapping tokens to plaintexts, which would re-introduce a vault-like dependency).

Randomized vaultless tokenization is useful when tokens are ephemeral — generated for a single API request and discarded after use. In this pattern, the client tokenizes PII, sends the token in the API request, and the server detokenizes immediately using the shared key. The token has a useful lifetime measured in seconds, not hours.

#### §5.4.3 Format-Preserving Encryption (FPE) as the Foundation

The most common algorithmic foundation for vaultless tokenization is Format-Preserving Encryption (FPE). FPE algorithms encrypt a plaintext value into a ciphertext of the same format — same length, same character set — making the ciphertext suitable for direct substitution in systems that validate field format.

Two FPE algorithms are standardized by NIST:

- **FF1** (NIST SP 800-38G): A 128-bit block cipher mode that operates on arbitrary-length strings. It uses AES as the underlying block cipher with a Feistel-network structure. FF1 is widely implemented but was found to have a minor weakness in certain parameter configurations (see NIST SP 800-38G Rev. 1).
- **FF3-1** (NIST SP 800-38G Rev. 1): A refinement of the original FF3 algorithm, addressing the known attack by restricting the minimum domain size. FF3-1 operates on strings with a radix between 2 and 2^16, making it suitable for common PII formats (numeric strings, alphanumeric strings).

FPE is inherently *reversible* — anyone with the key can decrypt a token to recover the plaintext. This is both its strength (enables detokenization without a vault) and its weakness (key compromise exposes all tokenized data). In a REST API context, the server holds the FPE key and can detokenize any token it receives. The client may or may not hold the key, depending on the architecture:

- **Server-side FPE:** The client sends PII to the server; the server tokenizes it before storing or logging. The client never sees the token. This is primarily a data-at-rest protection pattern, not a transit protection pattern.
- **Shared-key FPE:** Both client and server share the FPE key. The client tokenizes PII before sending it in the API request; the server detokenizes on receipt. This protects PII in transit and in logs, but requires secure key distribution to the client.

#### §5.4.4 Key Management Without a Vault

Vaultless tokenization shifts the security dependency from a vault (service availability) to a key (cryptographic material). Key management becomes the central operational concern:

- **KMS-hosted keys.** The FPE key is stored in a cloud KMS (AWS KMS, Google Cloud KMS, Azure Key Vault). The application calls the KMS to encrypt or decrypt using the key. This introduces a network round-trip (similar to a vault call) but eliminates the need for a mapping database. The KMS provides automatic key rotation, access logging, and IAM-based access control.
- **Application-level keys.** The FPE key is stored in the application's configuration (environment variable, secret store, Kubernetes secret). This offers the lowest latency — no network call — but requires the application to manage key rotation and access control itself. Key distribution to multiple instances of the application (e.g., in a Kubernetes deployment) must be handled securely.
- **HSM-backed keys.** The FPE key is generated and stored in a Hardware Security Module, and all FPE operations are performed inside the HSM. This provides the strongest security guarantee — the key never leaves the HSM's secure boundary — but introduces the highest latency and cost.

#### §5.4.5 Performance Benefits

The primary performance advantage of vaultless tokenization is the elimination of the vault round-trip:

- **No network latency.** If the FPE key is available locally (in application memory or an HSM on the same host), tokenization and detokenization are CPU-bound operations, not I/O-bound. FPE encryption of a typical PII field (e.g., a 16-digit credit card number) takes microseconds on modern hardware.
- **No database lookup.** Without a mapping table to query, there is no database contention, no index maintenance, and no storage cost for the token store. This makes vaultless tokenization significantly cheaper at scale — billions of tokens require no additional storage.
- **Unlimited throughput.** Vaultless tokenization scales horizontally with the application. Each API server instance can tokenize independently, without coordinating through a central vault. This is particularly advantageous for high-volume APIs (e.g., payment processing, identity verification).

#### §5.4.6 Reversibility Implications

The reversibility model of vaultless tokenization differs fundamentally from vault-based approaches:

| Property | Vault-Based | Vaultless (FPE) |
|:---------|:------------|:----------------|
| Reversal mechanism | Vault lookup (database query) | Key-based decryption |
| Reversal requires | Vault access + authorization | Key material |
| Key compromise impact | Mapping database exposed | All tokenized data exposed |
| Key rotation | No impact on existing tokens | Old tokens become undecodable with new key |
| Token independence | Each token independently mapped | All tokens depend on same key |

The key rotation problem is particularly important. In a vault-based system, rotating the vault's encryption keys does not affect existing tokens — the mapping is stored, not derived. In a vaultless system, rotating the FPE key renders all existing tokens undecodable unless a re-encryption migration is performed. This migration must token-encrypt every token with the old key, decrypt to recover the plaintext, and re-encrypt with the new key — a process that can be expensive for large datasets.

#### §5.4.7 Vendor Approaches

**Protegrity Vaultless Tokenization.** Protegrity's vaultless offering uses algorithmic token generation based on FPE, eliminating the need for a centralized token store. The platform emphasizes *field-level* protection with granular policies — different PII fields can use different tokenization algorithms (FPE, masking, encryption) governed by a centralized policy engine. Protegrity's approach is designed for high-throughput environments where vault latency and availability are concerns, such as real-time payment processing and streaming analytics.

**Google Cloud DLP (FPE-FFX).** Google Cloud DLP's de-identification API supports Format-Preserving Encryption using the FFX mode (a precursor to the NIST-standardized FF1/FF3-1). The API accepts a plaintext value, a key wrapped in Cloud KMS, and a format specification (alphabet, length), and returns an FPE-encrypted token. This is a fully managed, serverless approach — the application calls the DLP REST API to tokenize or detokenize, and Google manages the underlying infrastructure. The trade-off is that each operation requires an API call to Google's servers, re-introducing network latency (though without a vault lookup, the latency is primarily from the FPE computation and API overhead, not a database query).

**Futurex Vaultless Tokenization.** Futurex's solution replaces sensitive data with format-preserving tokens without a centralized vault, using FPE performed inside the company's hardware security modules. The key material never leaves the HSM, providing a strong security boundary. Futurex positions vaultless tokenization as particularly suitable for payment environments where PCI-DSS scope reduction is a priority.

---

### §5.5 Client-Side Pseudonymization

#### §5.5.1 Concept Overview

Client-side pseudonymization shifts the protection of PII entirely to the client — the originating application — before any data is transmitted over the network. The server never receives the raw PII; it receives only a pseudonym derived from the PII by a one-way or reversible transformation performed on the client. This pattern represents the strongest form of transit protection because it eliminates the possibility of PII exposure at every intermediate point: the network, proxies, API gateways, load balancers, and the server's own ingestion pipeline.

In the context of REST API design, client-side pseudonymization is most relevant when the API request itself contains PII — in URL query parameters, path segments, or request headers — and the architecture demands that this PII never be visible to any component other than the client and the ultimate business-logic processor.

#### §5.5.2 Salted Hashing

The simplest form of client-side pseudonymization is *salted hashing*: the client computes a cryptographic hash of the PII value combined with a salt, and sends the hash digest as the pseudonym. The server receives the hash and uses it as an opaque identifier.

```
pseudonym = HMAC-SHA256(secret_key, pii_value)
```

**Shared-secret approach.** Both client and server share a secret key (an HMAC key). The client computes the HMAC of the PII value; the server, receiving the HMAC, cannot recover the plaintext but can verify consistency — the same PII always produces the same HMAC. This enables *deterministic lookup*: the server can use the HMAC as a database key, allowing it to find records by PII value without ever storing the PII itself.

**Per-user salt approach.** Each data subject is assigned a unique salt (randomly generated at onboarding). The client computes `H(salt || pii_value)` and sends the hash. This prevents cross-correlation: even if the same PII value appears for different users, the hashes differ. However, the server cannot look up records by PII value unless it stores the per-user salt alongside each record, which re-introduces a mapping dependency.

**Limitations of hashing for REST API pseudonymization:**

1. **No reversibility.** The server cannot recover the plaintext from the hash. If business logic requires the original PII (e.g., to display a customer's name, send a notification email, or perform a regulatory check), hashing is insufficient on its own. It must be paired with a secondary channel for PII recovery.

2. **No server-side search by PII.** If the API must support queries like "find the customer with email `x@example.com`", the server cannot perform this lookup because it only stores hashes. The client would need to hash the query value itself and submit the hash — but this assumes the client knows the exact PII value, which may not be the case (e.g., an admin searching for a customer by partial name).

3. **Hash collision risk.** While negligible for HMAC-SHA256, shorter hash outputs (e.g., truncated SHA-256 for URL brevity) increase collision probability. A collision means two different PII values produce the same pseudonym, leading to incorrect record association.

4. **Rainbow table resistance.** Without salting, or with a static shared salt, an attacker who obtains the hash values could attempt pre-computed rainbow table attacks. Per-user salts mitigate this but complicate the lookup model.

#### §5.5.3 Blinded Token Protocols

Blinded token protocols extend client-side pseudonymization with *public-key cryptography*, enabling the server to verify or process a pseudonymized value without ever learning the underlying PII. The client encrypts the PII with the server's public key, creating a *blind token* that only the server's private key can decrypt:

```
blind_token = encrypt(server_public_key, pii_value)
```

This pattern is closely related to Password-Authenticated Key Exchange (PAKE) protocols, where the client proves knowledge of a secret without revealing it. In the API context, blinded tokens serve a different purpose: the client sends an encrypted PII value, and only designated backend services — holding the server's private key — can decrypt it. API gateways, load balancers, and intermediate services see only the ciphertext.

**Advantages of blinded tokens:**

- The server *can* decrypt when needed (unlike hashing), but only if it holds the private key.
- The private key can be restricted to a specific security domain — e.g., a hardened decryption microservice — preventing PII exposure in the general API layer.
- Combined with TLS, blinded tokens provide defense in depth: even if TLS is terminated at a load balancer, the PII remains encrypted.

**Limitations:**

- **Key distribution.** The client must obtain and trust the server's public key. In a microservices architecture, managing which public key corresponds to which service adds operational complexity.
- **No deterministic lookup.** Asymmetric encryption is typically randomized — encrypting the same plaintext twice produces different ciphertexts. The server cannot use the ciphertext as a lookup key without storing a mapping, which re-introduces a stateful dependency.
- **Performance overhead.** Public-key operations (RSA, ECIES) are significantly slower than symmetric hashing or HMAC. For high-throughput APIs, this can be a bottleneck.

#### §5.5.4 When Client-Side Pseudonymization Is the Strongest Pattern

Client-side pseudonymization is the pattern of choice in several architectural contexts:

**Zero-trust network architectures.** In a zero-trust model, no intermediate network component is trusted. PII must be protected at the point of origin — the client — because every hop in the network is treated as potentially hostile. Client-side hashing or blinding ensures that even a compromised proxy or gateway cannot extract PII from API requests.

**Privacy-preserving architectures.** When the API is designed so that the server *does not need to know* the raw PII — it only needs a consistent pseudonym for record linkage — client-side hashing is the natural fit. Examples include analytics APIs that aggregate data by user identifier without needing the user's actual identity, or consent management APIs that track consent by pseudonymized subject ID.

**Regulatory environments with strict minimisation.** Under GDPR Article 5(1)(c) (data minimisation), controllers should process only the personal data that is strictly necessary for each purpose. If the API's purpose can be served by a pseudonym rather than the raw PII, client-side pseudonymization enforces this minimisation at the protocol level — the server *cannot* access more data than it needs because it never receives it.

#### §5.5.5 Key Compromise Risk

The central risk of client-side pseudonymization is **key compromise**. Unlike vault-based tokenization, where each token is independently mapped and a vault breach exposes mappings that can be rotated or revoked, client-side pseudonymization with a shared secret key creates a systemic dependency:

- If the HMAC key is compromised, an attacker who has collected historical pseudonyms can attempt to brute-force the PII values (particularly if the PII has limited entropy, such as dates of birth or postal codes).
- If the server's private key (for blinded tokens) is compromised, all historical encrypted values can be decrypted retroactively.
- Key rotation is disruptive: changing the HMAC key means all existing pseudonyms become inconsistent with new ones. Records stored with the old pseudonym cannot be correlated with records using the new pseudonym without a migration step.

Mitigation strategies include using HSM-backed keys, implementing key rotation with overlap periods (both old and new keys are accepted during transition), and designing the system so that the pseudonymized value is combined with the key version (e.g., `v1:hmac_value`) to support multi-key validity.

---

### §5.6 K-Anonymity and Generalization

#### §5.6.1 Concept Overview

Unlike the cryptographic and tokenization patterns discussed in §5.3–5.5, which protect PII by *encrypting* or *replacing* it with a surrogate value, generalization protects PII by *reducing its precision*. The underlying value remains in the dataset, but at a coarser granularity that makes individual identification harder.

Generalization transforms PII into a less specific representation:

| PII Field | Original Value | Generalized Value | Technique |
|:----------|:---------------|:------------------|:----------|
| Date of birth | `1985-03-14` | `1985` | Year-only |
| Postal code | `10115` (Berlin-Mitte) | `10xxx` (Berlin district) | Prefix suppression |
| Full name | `Maria Christina Müller` | `M. Müller` | Initial truncation |
| Age | `42` | `40–49` | Range generalization |
| IP address | `192.168.1.105` | `192.168.1.0/24` | Subnet masking |
| Salary | `€87,450` | `€80,000–€90,000` | Interval generalization |

This approach is fundamentally different from encryption or tokenization. The generalized value is not a ciphertext or a token — it is the actual PII, rendered less precise. The data remains readable, processable, and meaningful without any key or vault. The protection comes from the loss of specificity.

#### §5.6.2 K-Anonymity

K-anonymity, introduced by Latanya Sweeney in 2002, is a formal privacy model that quantifies the degree of indistinguishability in a dataset. A dataset satisfies *k-anonymity* if every record is indistinguishable from at least *k − 1* other records on a set of *quasi-identifiers* — attributes that are not directly identifying on their own but can be combined to re-identify an individual (e.g., date of birth, postal code, gender).

The intuition is straightforward: if you know that a person's record is one of at least k records with the same quasi-identifier values, you cannot determine *which* of those k records belongs to that person. The larger k is, the stronger the anonymity guarantee.

**How k-anonymity relates to REST API design.** While k-anonymity is traditionally a dataset-level property (applied to data at rest, in databases or CSV exports), it has implications for API design in two contexts:

1. **API responses that return aggregate data.** If a REST API returns statistical data — e.g., `GET /analytics/customers?region=Berlin&age=40-49` — the response should be suppressed if the result set contains fewer than k records. This prevents an attacker from querying for highly specific demographic combinations and receiving a result that identifies an individual. Google's Ad API, for example, enforces a minimum cohort size for reporting queries.

2. **Dataset publishing APIs.** APIs that serve research datasets or analytics exports must ensure that the exported data satisfies k-anonymity. The API layer is the enforcement point: before returning data, the backend applies generalization to achieve the target k value, and returns only the generalized dataset.

#### §5.6.3 L-Diversity and T-Closeness

K-anonymity alone is insufficient for strong privacy guarantees because it does not address the distribution of *sensitive attributes* within each equivalence class. Two well-known extensions address this limitation:

**L-diversity** (Machanavajjhala et al., 2007). A dataset satisfies *l-diversity* if, for each equivalence class (group of records with the same quasi-identifier values), there are at least *l* distinct values of the sensitive attribute. This prevents *homogeneity attacks*: if all k records in an equivalence class have the same sensitive attribute value (e.g., all have the same diagnosis), knowing that the individual is in the equivalence class reveals their sensitive attribute with certainty, regardless of k.

**T-closeness** (Li et al., 2007). A dataset satisfies *t-closeness* if, for each equivalence class, the distribution of the sensitive attribute values is within a distance *t* of the overall distribution in the entire dataset. This prevents *inference attacks* where the distribution of sensitive attributes in a specific equivalence class differs significantly from the global distribution, revealing probabilistic information about the individual.

For REST API designers, these extensions are relevant when the API serves data that includes both quasi-identifiers and sensitive attributes. A well-designed API should enforce not just minimum group sizes (k-anonymity) but also diversity and distributional constraints on sensitive fields before returning results.

#### §5.6.4 GDPR Alignment: Data Minimisation and Proportionality

Generalization aligns naturally with two core GDPR principles:

**Article 5(1)(c) — Data minimisation.** "Personal data shall be adequate, relevant and limited to what is necessary in relation to the purposes for which they are processed." Generalization is a direct implementation of minimisation: if the business purpose requires only the year of birth (e.g., age verification for a restricted product), processing the full date of birth is disproportionate. Returning or storing `1985` instead of `1985-03-14` satisfies the purpose while minimizing the data processed.

**Proportionality.** The GDPR does not prescribe specific technical measures but requires that processing be proportionate to the legitimate purpose. Generalization provides a tunable knob: the degree of precision reduction can be calibrated to the specific purpose. For a marketing analytics API, year-level age groups (`30–39`, `40–49`) may suffice; for a medical research API, more granular age brackets may be necessary to ensure statistical validity. The key is that the precision of the data matches the purpose — no more, no less.

#### §5.6.5 When Generalization Is Preferable to Encryption

Generalization is the appropriate pattern in several scenarios:

**Statistical data and analytics.** When the API serves aggregate data — dashboards, reports, trend analysis — the individual values are not needed. Generalization preserves the statistical properties of the data (means, distributions, correlations) while removing individual-level precision. Encryption, by contrast, would render the data unusable without decryption, adding operational overhead without clear benefit for statistical use cases.

**Public or semi-public data releases.** When data must be shared with third parties who do not have decryption keys — regulators, research partners, public transparency reports — generalization ensures the data is immediately usable. The recipient does not need access to a vault or key management system.

**Cross-border data transfers.** Under GDPR Chapter V, transferring personal data outside the EEA requires appropriate safeguards (Standard Contractual Clauses, adequacy decisions). If the transferred data is sufficiently generalized to no longer constitute personal data (a high bar, as discussed below), the transfer restrictions do not apply. Even if the data remains personal data, heavily generalized data presents lower re-identification risk, which may simplify the transfer impact assessment under Article 49.

#### §5.6.6 Utility Loss

The fundamental tension in generalization is between privacy and utility. Reducing precision reduces the analytical value of the data:

- **Exact match becomes impossible.** If postal codes are generalized from `10115` to `10xxx`, the API can no longer perform exact lookups by postal code. Any business logic that depends on precise geographic location — delivery routing, store finder, localized tax calculation — breaks.
- **Statistical significance degrades.** Overly aggressive generalization can collapse meaningful distinctions. If all ages are generalized to decade ranges, a study of age-related health outcomes in 20-year-olds versus 25-year-olds becomes impossible.
- **Edge cases create singleton equivalence classes.** If a record has a rare combination of quasi-identifier values (e.g., a postal code for a small village combined with a rare occupation), even generalization may not produce k ≥ 2. The system must suppress such records entirely, introducing data gaps.

This utility loss is why generalization is not universally applicable. For individual API lookups — `GET /customers/{id}`, `POST /orders` — the business logic typically requires exact values, and generalization is inappropriate. The pattern is most effective for batch analytics, reporting APIs, and data-sharing endpoints.

#### §5.6.7 The Anonymisation Threshold

A critical question for generalization is: *when does generalized data cease to be personal data under the GDPR?* If the data can no longer be attributed to an identifiable natural person, it falls outside the GDPR's scope entirely (Recital 26). However, achieving true anonymisation through generalization alone is extremely difficult. The EDPB Guidelines 01/2025 emphasize that anonymisation requires an assessment of all *reasonably likely* means of re-identification, taking into account:

- The motivation, capability, and resources of potential attackers
- The availability of external data sources that could be combined with the generalized data
- The state of technology (e.g., machine learning-based re-identification)

In practice, generalized datasets with k ≥ 5 or even k ≥ 11 have been re-identified using external data sources (as demonstrated by Latanya Sweeney's seminal work linking "anonymized" medical records with voter registration data). API designers should treat generalization as a pseudonymisation technique — reducing re-identification risk — rather than as a route to anonymisation. The GDPR obligations remain in force.

---

### §5.7 Product Landscape: Tokenization and Pseudonymization Platforms

The tokenization and pseudonymization techniques analysed in §5.1–§5.6 are implemented by a range of commercial and open-source platforms. The following table consolidates the key products referenced across this chapter, providing a side-by-side comparison of capabilities, licensing models, and suitability for different PII protection requirements. Detailed technical analysis of each vendor appears in Chapters 10–11.

| Product | Vendor | Techniques | FPE | Tokenization | Key Management | Licensing | Covered In |
|:--------|:-------|:-----------|:---:|:------------:|:--------------:|:---------:|:----------:|
| **Vault Enterprise (Transform)** | HashiCorp | FPE, tokenization, masking | ✅ | ✅ | Integrated (Vault KMS) | Enterprise (per-node) | §10.1 |
| **CipherTrust Tokenization** | Thales | FPE, tokenization, data masking | ✅ | ✅ | HSM-backed (Luna / CipherTrust Manager) | Enterprise | §10.2 |
| **Protegrity Data Security** | Protegrity | FPE, tokenization, encryption, masking | ✅ | ✅ | HSM / software | Enterprise | §10.3 |
| **Skyflow Data Privacy Vault** | Skyflow | Tokenization, encryption, data masking | ❌ | ✅ | Managed (isolated vault) | SaaS | §10.4 |
| **Pangea Vault** | Pangea | Tokenization, redaction | ❌ | ✅ | Managed | SaaS (API) | §10.5 |
| **Google Cloud DLP** | Google | FPE, deterministic encryption, masking, de-identification | ✅ | ❌ | Cloud KMS | Cloud (per-operation) | §11.1 |
| **Azure APIM** | Microsoft | Policy-based transformation, encryption | ❌ | Partial | Azure Key Vault | Cloud (per-API call) | §11.2 |
| **AWS KMS + Macie** | Amazon | Envelope encryption, PII discovery | ❌ | ❌ | Cloud KMS (HSM-backed) | Cloud (per-key operation) | §11.3 |
| **Cequence UAP** | Cequence | ML-based PII detection, inline FPE masking | ✅ | Partial | Integrates with external KMS | Enterprise / SaaS | §11.5 |
| **Fortanix DSM** | Fortanix | Encryption, key management, tokenization | ❌ | Partial | HSM-backed (SDKMS) | SaaS / on-premises | §11.6 |

**Selection criteria.** The choice between these platforms depends on several factors that interact with the architectural decisions in §5.1–§5.6:

- **PII recovery requirement.** If the original PII must be recoverable (§5.3 vault-based tokenization), platforms with lookup-table tokenization (HashiCorp Vault, Thales CipherTrust, Protegrity, Skyflow) are appropriate. If irreversibility is acceptable (§5.5 client-side pseudonymization), HMAC-based or one-way transformation suffices.
- **Format preservation.** FPE (§5.4) is available from HashiCorp Vault (FF1), Thales CipherTrust, Protegrity, Google Cloud DLP, and Cequence. If the downstream system requires the token to match the original format (e.g., a 16-digit credit card number), FPE support is mandatory.
- **Deployment model.** On-premises or hybrid deployment (common for financial services and healthcare) favours HashiCorp Vault, Thales CipherTrust, or Protegrity. Cloud-native deployments may prefer Google Cloud DLP, Azure APIM, or AWS KMS. SaaS platforms (Skyflow, Pangea) offer the fastest time-to-production but introduce vendor dependency.
- **Regulatory alignment.** Platforms with FIPS 140-2/3 validated HSMs (Thales, Fortanix, cloud KMS services) are required for PCI DSS Level 1 compliance and recommended for GDPR Article 32 risk assessments involving high-sensitivity PII.
- **Scale and latency.** Vault-based tokenization adds a round-trip latency (typically 2–10 ms) for every PII-bearing API call. Client-side pseudonymization (§5.5) eliminates this latency but shifts cryptographic responsibility to the frontend.

If tokenization or pseudonymization becomes the primary design, the most useful follow-on reading is **§12** for build-vs-buy, **§13–§14** for auditability and decryption authority, **§15** for mapping-table and erasure lifecycle, and **§16** for trace-safe detokenization and observability design.

---

### §5.8 Comparative Analysis: Pseudonymization vs. Encryption vs. Anonymization

The following decision tree guides API architects from their requirements to the recommended tokenization or pseudonymization technique. Each leaf node references the relevant section for detailed implementation guidance:

```mermaid
flowchart TD
    START["Do you need to<br/>recover the original PII?"]

    START -- "Yes" --> Q1["Do you need<br/>lookup/search by PII?"]
    START -- "No" --> Q4["Is the data for<br/>analytics/reporting?"]

    Q1 -- "Yes" --> Q2["Latency budget<br/>for vault round-trip?"]
    Q1 -- "No" --> Q3["Zero-trust<br/>requirement?"]

    Q2 -- "< 5ms" --> VAULTLESS["**Vaultless Tokenization** (FPE)
    §5.4 — No vault RT, format-preserving,
    deterministic, key-dependent"]
    Q2 -- "≥ 5ms OK" --> VAULT["**Vault-Based Tokenization**
    §5.3 — Vault round-trip, audit trail,
    independent token mapping"]

    Q3 -- "Yes" --> CLIENT["**Client-Side Pseudonymization**
    §5.5 — Hash/blind before send,
    server never sees PII"]
    Q3 -- "No" --> VAULT

    Q4 -- "Yes" --> KANON["**K-Anonymity / Generalization**
    §5.6 — Reduce precision,
    preserve statistical utility"]
    Q4 -- "No" --> CLIENT
```

#### §5.8.1 The GDPR Spectrum

The three techniques — anonymisation, pseudonymisation, and encryption — occupy distinct positions on the GDPR compliance spectrum. Understanding where each technique sits is essential for API architects making protection-pattern decisions. The EDPB Guidelines 01/2025 provide the authoritative framework for this analysis.

**Anonymisation — data exits the GDPR entirely.** Under Recital 26 of the GDPR, the regulation "does not apply to anonymised information, namely information which does not relate to an identified or identifiable natural person." Anonymised data is not personal data; it falls outside the GDPR's material scope. No lawful basis is required, no data subject rights apply, and cross-border transfers are unrestricted.

The EDPB Guidelines 01/2025 emphasize that anonymisation is assessed *relative to the controller* and *relative to the context*. Data that is anonymised for one controller (who lacks the means to re-identify) may remain personal data for another controller (who holds linking data). The assessment must consider all "reasonably likely means" of re-identification, including the state of technology, the cost and time required, and the attacker's motivation.

Achieving true anonymisation in a REST API context is exceptionally difficult. Even heavily generalized or tokenized data may be re-identifiable when combined with external sources. The EDPB guidelines caution against treating any single technique as a "silver bullet" for anonymisation — the assessment is holistic and context-dependent.

**Pseudonymisation — data remains personal data but with reduced risk.** Article 4(5) defines pseudonymisation as processing that renders data no longer attributable to a specific data subject "without the use of additional information," where that additional information is "kept separately and is subject to technical and organisational measures." Pseudonymised data is *still personal data* — the full GDPR applies, including lawful basis requirements, data subject rights (with practical limitations on exercise), and breach notification obligations.

The EDPB Guidelines 01/2025 elaborate that pseudonymisation serves as a safeguard under three specific GDPR provisions:

1. **Article 25 — Data protection by design and by default.** Pseudonymisation is listed as an explicit design measure that controllers should consider implementing from the outset of system design.
2. **Article 32(1)(a) — Appropriate technical measures.** "The pseudonymisation and encryption of personal data" is the first technical measure listed in Article 32, alongside "the ability to ensure the ongoing confidentiality, integrity, availability and resilience of processing systems and services."
3. **Article 6(4)(e) — Legitimate interests balancing.** When processing is based on legitimate interests (Art. 6(1)(f)), the controller must balance its interests against the data subject's rights. Pseudonymisation reduces the impact on the data subject, tipping the balance in favor of the controller.

Critically, the EDPB guidelines clarify that pseudonymisation is *not* a binary state but a *spectrum*. A weakly pseudonymised dataset (e.g., simple token replacement with no access controls on the mapping) provides less protection than a strongly pseudonymised dataset (e.g., FPE with HSM-backed keys and strict access policies). The effectiveness of pseudonymisation must be assessed proportionally to the risk.

**Encryption — protects confidentiality but does not alter data's status.** Encryption is a confidentiality mechanism: it prevents unauthorized parties from reading the data. Under the GDPR, encrypted data remains personal data. The data subject's rights (access, rectification, erasure) apply to the plaintext, regardless of whether it is encrypted in storage or transit.

Encryption serves as a complementary safeguard alongside pseudonymisation under Article 32(1)(a). The two techniques address different threat models:

- **Pseudonymisation** reduces *linkability* — the ability to connect data points about the same individual across systems or time periods.
- **Encryption** reduces *confidentiality risk* — the risk that an unauthorized party reads the data.

#### §5.8.2 Decision Matrix

The following matrix maps common REST API scenarios to the most appropriate protection technique:

| Scenario | Primary Technique | Rationale |
|:---------|:-----------------|:----------|
| PII in URL query parameters, server needs plaintext for business logic | Vault-based tokenization | Reversible, supports lookup, audit trail |
| High-throughput API, PII format must be preserved, latency-sensitive | Vaultless (FPE) tokenization | No vault round-trip, format-preserving, scalable |
| Zero-trust architecture, server does not need raw PII | Client-side hashing | Server never sees PII, minimal infrastructure |
| Analytics/reporting API, individual values not needed | Generalization (k-anonymity) | Preserves statistical utility, reduces re-identification risk |
| Data must be shared with untrusted third party | Anonymisation (if achievable) or strong pseudonymisation | Minimises GDPR scope or reduces compliance burden |
| PII at rest in database, regulatory requirement for encryption | Encryption (TDE, column-level) | Protects confidentiality of stored data |
| PII in transit, TLS alone insufficient (regulatory or policy) | JWE or client-side blinding | Defense in depth beyond TLS |
| API gateway logging must not contain PII | Vault-based tokenization + log-only-tokens | Audit trail shows tokens, not plaintext |
| Multi-tenant SaaS, tenant data isolation | Per-tenant tokenization keys or separate transformation namespaces | Prevents cross-tenant PII leakage |

#### §5.8.3 Combining Techniques: Defense in Depth

The most robust API architectures combine multiple techniques. The EDPB Guidelines 01/2025 explicitly support this approach, noting that "the combination of different pseudonymisation techniques can increase the overall level of protection" (§IV).

**Pseudonymisation + encryption.** This is the most common defense-in-depth combination. PII is first tokenized (pseudonymised) and then the tokens are encrypted in transit (via TLS) and at rest (via database encryption). If either layer is compromised — TLS is intercepted, or the database is exfiltrated — the other layer still protects the data. An attacker who obtains encrypted tokens cannot reverse the tokenization without the vault key; an attacker who obtains the tokenization mapping cannot link tokens to requests without decrypting the transit layer.

**Pseudonymisation + generalization.** For analytics APIs, the data can be first tokenized (to protect individual values) and then generalized (to ensure k-anonymity in the output). This dual approach protects both the raw values and the linkage between them, providing stronger guarantees for data sharing scenarios.

**Client-side pseudonymization + server-side decryption in hardened enclave.** The client hashes or blinds PII before transmission. The server receives the pseudonym and routes it to a hardened decryption microservice (running in an HSM or secure enclave) only when business logic requires the plaintext. The general API layer never handles raw PII; only the enclave does, and its access is tightly controlled and audited.

#### §5.8.4 The Anonymisation Mirage

A common misconception in API design is that applying any of these techniques — particularly tokenization or hashing — "anonymises" the data and removes it from GDPR scope. The EDPB Guidelines 01/2025 are unequivocal: this is almost never the case. Tokenized data is pseudonymised personal data. Hashed data is pseudonymised personal data. Encrypted data is encrypted personal data. All three remain subject to the GDPR.

True anonymisation requires demonstrating that re-identification is not "reasonably likely" by any means available to any party. In practice, this means:

- **No mapping exists** (or the mapping has been irreversibly destroyed).
- **The data contains insufficient quasi-identifiers** for re-identification even when combined with publicly available external data.
- **The re-identification effort is prohibitively expensive** relative to the attacker's motivation and resources.
- **A formal anonymisation assessment** has been conducted and documented, considering the specific context of the data use.

For most REST API use cases, this standard is not achievable without such aggressive generalization or data suppression that the resulting data is no longer useful. API architects should plan for GDPR compliance at the pseudonymisation level, using the techniques described in this chapter to reduce risk while maintaining data utility, rather than pursuing anonymisation as a regulatory shortcut.

---

## 6. Infrastructure and Operational Patterns

This chapter examines the infrastructure-level controls that organisations deploy to mitigate PII exposure in REST API interactions. Unlike the architectural patterns in §3 (which restructure the request) or the cryptographic approaches in Chapters 4–5 (which transform the data), the patterns in this chapter operate at the network perimeter — API gateways, reverse proxies, and HTTP headers — to mask, redact, or prevent the persistence of PII after it has entered the HTTP request pipeline.

Infrastructure patterns are inherently *defence-in-depth* measures. They do not eliminate PII from the URL during transit — that requires the architectural or cryptographic patterns covered earlier. Instead, they reduce the *blast radius* of PII exposure by controlling what gets logged, cached, forwarded, or leaked through referrer chains. In a mature PII protection strategy, these patterns complement (not replace) request-level and data-level controls.

That distinction matters in the OWASP / CWE framing as well: these controls help contain the damage from a bad request shape, but they are not substitutes for the primary contract correction summarized in §17.1. If an endpoint still carries direct identifiers in the request target, infrastructure controls are compensating measures, not closure of the core weakness.

The four sections in this chapter progress from passive measures (log redaction §6.1, cache headers §6.2) to active measures (inline scanning §6.3, proxy-level masking §6.4), reflecting increasing operational complexity and protection depth.

```mermaid
flowchart TD
    Client["`**Client**
    Browser / Mobile App`"]
    CDN["`**CDN / WAF**
    Edge Cache`"]
    GW["`**API Gateway**
    §6.1 Log Redaction
    §6.3 Inline Scanning`"]
    Proxy["`**Reverse Proxy**
    §6.2 Cache Headers
    §6.4 Data Masking`"]
    Backend["`**Backend Service**`"]
    SIEM["`**SIEM / Log Store**
    Redacted logs`"]
    BrowserCache["`**Browser Cache**
    no-store prevents write`"]

    Client -->|"GET /api?email=..."| CDN -->|"Forward"| GW -->|"Forward"| Proxy -->|"Masked request"| Backend
    GW -.->|"§6.1 Redact PII from logs"| SIEM
    Proxy -.->|"§6.2 Cache-Control: no-store"| BrowserCache
```

```mermaid
flowchart TD
    subgraph Passive["Passive Controls (post-processing)"]
        direction TB
        S61["`**§6.1 Log Redaction**
        Scrubs PII from access logs
        after request processing`"]
        S63["`**§6.2 Cache-Control Headers**
        Advises browsers/proxies
        not to store PII-bearing URLs`"]
    end

    subgraph Active["Active Controls (inline enforcement)"]
        direction TB
        S62["`**§6.3 Real-Time PII Scanning**
        Inspects request at gateway
        before backend forwarding`"]
        S64["`**§6.4 Proxy-Level Masking**
        Transforms request at proxy
        before backend forwarding`"]
    end

    Passive --> Active
```

---

### §6.1 API Gateway Log Redaction

#### §6.1.1 The Problem: Logs as the Primary PII Exposure Surface

Server access logs are the single largest exposure surface for PII in URL query parameters and path segments. Every HTTP request that reaches an API gateway or reverse proxy generates a log entry containing, at minimum, the request method, URI, client IP, timestamp, and response status. When query parameters contain PII — email addresses, phone numbers, national identification numbers, account identifiers — the log entry captures that PII in cleartext.

Consider a typical NGINX access log entry for an API that accepts a user's email as a query parameter:

```
192.168.1.42 - - [08/Apr/2026:14:22:31 +0000] "GET /api/v2/users/lookup?email=jane.doe@example.com&include=profile,preferences HTTP/1.1" 200 1842
```

This single log line contains the user's email address, their application preferences, and the full API path. In a high-traffic API handling millions of requests per day, access logs can accumulate billions of PII-bearing entries. The exposure risk is not theoretical: access log breaches are a documented attack vector, and logs are routinely shipped to multiple downstream systems (SIEM platforms, log aggregation services, long-term archival storage) where the blast radius expands.

The core challenge is that access logs serve a dual purpose. Operations teams need them for debugging, performance analysis, and security forensics. But their very usefulness — capturing the full request URI — makes them a liability when URIs contain PII. Log redaction resolves this tension by selectively scrubbing PII from log entries before they are persisted or shipped downstream, while preserving the structure needed for operational analysis.

#### §6.1.2 Regex-Based Redaction

Regex-based redaction uses pattern matching to identify and replace PII in log entries. The gateway inspects each log line against a library of regular expressions that match common PII formats:

| PII Type | Example Pattern | Example Match |
|:---------|:----------------|:--------------|
| Email | `[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}` | `jane.doe@example.com` |
| US SSN | `\b\d{3}-\d{2}-\d{4}\b` | `123-45-6789` |
| Credit card (Luhn) | `\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b` | `4111 1111 1111 1111` |
| Phone (US) | `\b\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b` | `(555) 123-4567` |
| IBAN | `[A-Z]{2}\d{2}[A-Z0-9]{11,30}` | `GB29NWBK60161331926819` |

Regex redaction is straightforward to implement and requires no integration with backend services. However, it suffers from well-known limitations:

- **False positives.** A string like `user.id=123-45-6789` may match an SSN pattern even when the value is a non-sensitive system identifier. Regex engines have no understanding of context — they match patterns regardless of whether the matched value is actually PII.
- **False negatives.** PII that does not conform to a known format — international phone numbers with unusual digit groupings, custom identification schemes, PII embedded in base64-encoded parameters — evades regex detection entirely.
- **Maintenance burden.** The regex library must be updated as new PII formats are introduced, and each update risks introducing new false positives. This is not a set-and-forget control.

#### §6.1.3 Structured Field Masking

Structured field masking operates on a whitelist or blacklist of known PII field names rather than pattern-matching values. When the gateway encounters a query parameter or request header whose name matches a known PII field — `email`, `ssn`, `phone`, `date_of_birth`, `passport_number` — it redacts the associated value regardless of what that value contains.

This approach is the inverse of regex redaction: instead of asking "does this value *look* like PII?", it asks "is this field *known* to carry PII?". The advantage is zero false positives for non-PII values that happen to match a PII format. The disadvantage is zero coverage for PII carried in fields whose names are not on the list — a query parameter called `uid` that happens to contain a Social Security number would pass through unredacted.

Structured field masking works best in controlled API environments where the set of PII-bearing fields is known and stable. It is often combined with regex redaction in a layered approach: structured masking handles known fields reliably, while regex catches PII in unexpected field names.

#### §6.1.4 Hash-Based Replacement

Hash-based replacement substitutes the PII value with a cryptographic hash (typically SHA-256) rather than fully redacting it. The original value is unrecoverable from the hash (assuming no rainbow table attack), but the hash preserves uniqueness — the same PII value always produces the same hash, enabling log analysis to correlate requests involving the same user without revealing the user's identity.

```
# Before redaction
GET /api/v2/users/lookup?email=jane.doe@example.com

# After hash-based replacement
GET /api/v2/users/lookup?email=a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2
```

This approach is valuable when logs need to support debugging workflows that trace a specific user's request sequence across multiple log entries. A fully redacted email (`***REDACTED***`) makes this impossible — every user's request looks identical. A hash allows operations teams to say "show me all log entries for the user whose email hashes to `a1b2c3…`" without ever learning the actual email.

The primary risk is rainbow table attacks: if an attacker obtains the hashed log entries and the PII values are low-entropy (common names, well-known email domains), precomputed tables can reverse the hash. Adding a per-deployment salt to the hash computation mitigates this, but the salt must itself be protected. HMAC-SHA-256 with a secret key provides stronger guarantees than plain SHA-256.

#### §6.1.5 Full Redaction

Full redaction replaces the entire PII value with a fixed placeholder string — typically `***REDACTED***` or a similar sentinel. This is the most aggressive approach: no information about the original value survives, not even its format or length.

```
# Before
GET /api/v2/users/lookup?email=jane.doe@example.com&ssn=123-45-6789

# After
GET /api/v2/users/lookup?email=***REDACTED***&ssn=***REDACTED***
```

Full redaction is appropriate when the operational need for log analysis does not require per-user correlation — for example, when debugging focuses on error rates, latency distributions, and status code patterns rather than individual request tracing. It provides the strongest guarantee against PII leakage from logs, but sacrifices the ability to trace a specific user's journey through the system.

```mermaid
flowchart TD
    Start["`**URL contains PII in query params**`"]
    Q1{"`Is the PII in a known field name?`"}
    Q2{"`Need to correlate requests by user?`"}
    Q3{"`Backend needs the value?`"}
    Regex["`**Regex-Based Redaction**
    Pattern-match values
    ⚠ False positives/negatives`"]
    Structured["`**Structured Field Masking**
    Whitelist known PII fields
    ✅ Zero false positives`"]
    Hash["`**Hash-Based Replacement**
    SHA-256 + salt
    ✅ Correlatable, irreversible`"]
    Full["`**Full Redaction**
    Replace with REDACTED
    ✅ Strongest guarantee`"]

    Start --> Q1
    Q1 -- "Yes: known field" --> Structured
    Q1 -- "No: arbitrary field" --> Regex
    Q1 -- "Both" --> Q2
    Q2 -- "Yes" --> Hash
    Q2 -- "No" --> Q3
    Q3 -- "Yes" --> Hash
    Q3 -- "No" --> Full
```

#### §6.1.6 Gateway-Specific Implementations

#### §6.1.7 Kong

Kong's plugin architecture makes it well-suited to log redaction. The open-source **request-transformer** plugin can strip or rewrite query parameters before they are logged, and custom Lua plugins can apply regex-based redaction directly to the access log entry. Kong 3.x introduced a dedicated **PII sanitization** plugin (documented in the Kong Gateway changelog) that masks PII in requests before they reach upstream services and before log serialization occurs.

A custom Lua plugin for log redaction in Kong might look like this:

```lua
local PII_PATTERNS = {
  email = "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}",
  ssn = "%d%d%d%-%d%d%-%d%d%d%d",
}

local function redact_uri(uri)
  for _, pattern in pairs(PII_PATTERNS) do
    uri = ngx.re.sub(uri, pattern, "***REDACTED***")
  end
  return uri
end

-- Hook into the log phase to redact before serialization
return {
  PRIORITY = 1000,
  version = "1.0.0",
  log = function(conf, ctx)
    local redacted_uri = redact_uri(ngx.var.request_uri)
    -- Write redacted entry to custom log destination
    ngx.log(ngx.ERR, "REDACTED_REQUEST: ", redacted_uri)
  end,
}
```

Kong's plugin model also supports per-route and per-service scoping, allowing organisations to apply different redaction rules to different APIs — more aggressive redaction for healthcare endpoints (HIPAA), less aggressive for public-facing product catalogues.

#### §6.1.8 Azure API Management

Azure APIM provides declarative policy-based PII masking through its XML policy engine. The `<set-query-parameter>` policy can rewrite query parameter values before the request is forwarded or logged. Combined with Azure Monitor's log profiles, APIM can strip PII from the logged URI while preserving the original for upstream processing.

```xml
<policies>
  <inbound>
    <!-- Mask email query parameter in logged URI -->
    <set-query-parameter name="email" exists-action="override">
      <value>***REDACTED***</value>
    </set-query-parameter>
  </inbound>
  <backend>
    <!-- Forward original email to backend via header -->
    <set-header name="X-Original-Email" exists-action="override">
      <value>@(context.Request.Url.Query.GetValueOrDefault("email",""))</value>
    </set-header>
  </backend>
</policies>
```

Azure Monitor's diagnostic settings for APIM allow selective field logging — organisations can exclude `requestUrl` or log only specific URI components (scheme, host, path) while omitting query parameters entirely. This is a coarse-grained but effective approach when the entire query string is sensitive.

#### §6.1.9 AWS API Gateway and CloudWatch

AWS API Gateway provides two complementary mechanisms for PII protection in logs:

1. **Access logging field selection.** API Gateway's access logging configuration allows operators to select which request/response fields are included in CloudWatch log entries. Organisations can log `$context.requestId`, `$context.status`, and `$context.responseLatency` without logging `$context.requestUri` — completely excluding the query string from logs.

2. **CloudWatch Logs Data Protection.** When full URI logging is needed (e.g., for debugging), CloudWatch Logs supports *data protection policies* that automatically detect and mask PII at ingestion time. The service provides managed data identifiers for common PII types — email addresses, credit card numbers, US Social Security numbers, AWS secret access keys, passport numbers for specific countries — using a combination of pattern matching and machine learning models. Detected PII is masked at all egress points (CloudWatch Logs Insights, metric filters, subscription filters). Only IAM principals with the `logs:Unmask` permission can view unmasked data.

A CloudWatch Logs data protection policy for an API Gateway log group:

```json
{
  "Name": "API-Gateway-PII-Protection",
  "Description": "Mask PII in API Gateway access logs",
  "Version": "2023-05-30",
  "Statement": [
    {
      "DataIdentifier": [
        "arn:aws:logs:::data-identifier/EmailAddress",
        "arn:aws:logs:::data-identifier/CreditCardNumber",
        "arn:aws:logs:::data-identifier/UsSocialSecurityNumber"
      ],
      "Operation": {
        "Audit": { "FindingsDestination": { "CloudWatchLogs": {} } },
        "Mask": {}
      }
    }
  ]
}
```

The data protection policy approach has a significant advantage: it is applied at the log ingestion layer, meaning it catches PII regardless of which upstream service generated the log entry. This makes it effective for multi-service architectures where different teams manage different APIs and may not all apply consistent log redaction at the application level.

#### §6.1.10 NGINX

NGINX supports log redaction through multiple mechanisms:

- **Custom log formats with embedded Lua.** Using `lua-nginx-module` (OpenResty), operators can execute Lua code during the `log_by_lua_block` phase to transform the request URI before it is written to the access log. This is the most flexible approach, supporting regex-based redaction, hash replacement, or any custom logic.

- **`map` directive with regex.** The `map` directive can rewrite specific `$arg_*` variables (query parameter values) before they appear in the log format, without modifying the actual request forwarded upstream.

```nginx
# Strip email query parameter from log format only
map $arg_email $redacted_email {
    default "***REDACTED***";
    ""      "";
}

log_format redacted escape=json
  '$remote_addr - $remote_user [$time_local] '
  '"$request_method $uri?email=$redacted_email&$args" '
  '$status $body_bytes_sent';
```

- **`mod_substitute`** (or the `sub_filter` directive) for response body rewriting — less commonly used for log redaction but available for transforming logged response content.

NGINX's approach is mature and performant but requires manual configuration for each PII field or pattern. Unlike cloud-native solutions (CloudWatch Data Protection, Azure Monitor), there is no built-in PII detection — all redaction rules must be explicitly defined and maintained. Note that NGINX can also perform *request-level* PII masking at the proxy layer; see §6.4 for the full NGINX proxy masking configuration using `rewrite_by_lua_block`.

#### §6.1.11 Limitations of Log Redaction

Log redaction is a valuable but inherently incomplete control. Its limitations must be understood:

- **PII persists in transit.** Log redaction cleans the *record* of the request, not the request itself. PII remains in the URL during its full network journey: browser → CDN → load balancer → API gateway → backend service. Any component in this chain that maintains its own logs (CDN access logs, load balancer access logs, WAF logs) captures the PII independently. Log redaction at one layer does not protect against exposure at other layers.

- **Rules require continuous maintenance.** As APIs evolve — new endpoints, new query parameters, new PII formats — redaction rules must be updated to match. A new endpoint that accepts `tax_id` as a query parameter will not be caught by existing rules until someone adds `tax_id` to the field list. This maintenance burden is non-trivial in large organisations with hundreds of APIs.

- **Novel PII formats evade detection.** Regex-based redaction can only catch PII that matches a known pattern. A proprietary identifier format (e.g., a company-specific 12-character alphanumeric customer ID that is considered PII under internal policy) will pass through unredacted unless someone explicitly writes a regex for it.

- **Redaction does not prevent access.** If an attacker gains access to the logging pipeline *before* the redaction step (e.g., by compromising a log shipper or tapping into the log stream), the PII is already exposed. The redaction must be applied as early as possible in the logging pipeline — ideally at the point of log generation, not at the point of log storage.

Log redaction should be treated as one layer in a defence-in-depth strategy. It reduces the PII footprint in long-term log storage and downstream analytics, but it does not eliminate PII from the HTTP request itself. For that, the architectural and cryptographic patterns in Chapters 3–5 are required.

---

### §6.3 Real-Time PII Scanning and Masking

#### §6.3.1 From Passive Redaction to Active Inspection

§6.1 addressed a *passive* control: cleaning up log entries after the request has already been processed. Real-time PII scanning takes a fundamentally different approach — it *inspects* the request as it passes through the API gateway, detects PII in the URL, headers, or body, and takes action *before* the request reaches the backend service. This shifts the control point from post-processing to inline enforcement, preventing PII from ever entering backend systems in cleartext.

Real-time scanning operates in three enforcement modes:

| Mode | Behaviour | Use Case |
|:-----|:----------|:---------|
| **Masking** | PII is detected and replaced with a token or placeholder in the forwarded request | Backend must receive the request but should not see raw PII |
| **Blocking** | Requests containing PII are rejected with an HTTP 400/403 response | API contract forbids PII in the request path |
| **Alerting** | Request is forwarded unchanged, but an alert is generated for security review | Detection without disruption; audit and compliance use cases |

The choice of enforcement mode depends on the organisation's risk tolerance and the API's operational requirements. Masking mode provides the strongest protection while maintaining API functionality. Blocking mode is appropriate when the presence of PII indicates a policy violation (e.g., an internal-only API receiving requests with email addresses in the URL, suggesting a misconfigured client). Alerting mode is useful during the initial deployment phase to gauge detection accuracy before enforcing masking or blocking.

```mermaid
flowchart LR
    subgraph Gateway["API Gateway"]
        direction TB
        A["`**Inbound Request**
        URL + Headers + Body`"]
        B["`**PII Detection Engine**
        Regex / ML / FPE`"]
        C{"`**Match Found?`"}
        D["`**Enforcement Mode**
        Mask / Block / Alert`"]
        E["`**Transformed Request**
        PII removed or replaced`"]
    end

    A --> B --> C
    C -- No --> F["`**Backend Service**
        Receives original request`"]
    C -- Yes --> D --> E --> F

```

#### §6.3.2 Regex-Based Detection

Regex-based detection mirrors the approach described in §6.1 but applies it to the *live request* rather than to log entries. The gateway inspects the request URI, headers, and (optionally) the request body against a library of PII patterns and flags matches.

The advantages and limitations are identical to regex log redaction, with one critical addition: false positives in live request scanning have a direct operational cost. A regex that incorrectly identifies a non-PII value as PII will cause the gateway to mask or block a legitimate request, disrupting the end user. In logging, a false positive merely generates a misleading redacted entry — the request itself is unaffected.

WSO2 AI Gateway exemplifies this approach. Its PII masking guardrail uses regex patterns to detect and mask sensitive data in LLM prompts and responses as they pass through the gateway. The guardrail operates as a real-time filter between client applications and AI model providers (OpenAI, Anthropic, Azure OpenAI, Mistral), scanning request payloads for PII patterns and replacing detected values with type placeholders (e.g., `{EMAIL}`, `{PHONE_NUMBER}`).

Regex detection is fast — typically sub-millisecond per pattern match — making it suitable for inline gateway enforcement where latency budgets are tight. However, its recall is bounded by the quality of the pattern library: it cannot detect PII that does not match a known format.

#### §6.3.3 ML-Based Detection

Machine learning models trained on labelled datasets can identify PII that regex misses. Named Entity Recognition (NER) models — the same technology used in natural language processing — can detect person names, addresses, and organisation names within unstructured text, including text that does not conform to a rigid format. Classification models can learn to identify sensitive fields based on surrounding context, field names, and data characteristics.

Google Cloud DLP provides the most comprehensive ML-based detection for API gateway use cases. Its inspect API supports 150+ built-in *info types* covering global PII formats — names, addresses, phone numbers, identification documents, medical record numbers, financial account numbers — across multiple countries and languages. Detection uses a combination of pattern matching, dictionary lookup, and contextual machine learning models that can identify PII even when it does not match a standard format.

An API gateway calling Google Cloud DLP's inspect API for each incoming request might look like this:

```python
from google.cloud import dlp_v2

def inspect_request(request_body: str) -> list[str]:
    client = dlp_v2.DlpServiceClient()
    response = client.inspect_content(
        request={
            "parent": f"projects/{PROJECT_ID}",
            "inspect_config": {
                "info_types": [
                    {"name": "EMAIL_ADDRESS"},
                    {"name": "PHONE_NUMBER"},
                    {"name": "PERSON_NAME"},
                    {"name": "US_SOCIAL_SECURITY_NUMBER"},
                ],
                "min_likelihood": dlp_v2.Likelihood.POSSIBLE,
            },
            "item": {"value": request_body},
        }
    )
    return [f.info_type.name for f in response.result.findings]
```

Microsoft Presidio, an open-source alternative, offers similar capabilities with 20+ supported languages and a modular architecture that allows custom recognisers. It can be deployed as a sidecar service alongside an API gateway, receiving inspection requests over HTTP.

The trade-off is latency. ML-based detection adds tens to hundreds of milliseconds per request, depending on the payload size and the number of info types checked. For high-throughput APIs processing thousands of requests per second, this overhead can be significant. Organisations typically mitigate this by caching detection results (the same email address encountered in multiple requests does not need to be re-evaluated) or by limiting ML inspection to high-sensitivity endpoints only.

#### §6.3.4 Format-Preserving Encryption (FPE)

Cequence Security's approach is notable for its use of Format-Preserving Encryption (FPE) as defined in NIST SP 800-38G. Rather than detecting PII and replacing it with a placeholder, Cequence masks the data with a cryptographic transformation that produces an output of the same length and type as the input. A 16-digit credit card number becomes a different 16-digit number; a 50-character string becomes a different 50-character string.

The value of FPE in the API gateway context is that masked data remains *structurally valid*. Downstream systems — API specification generators, traffic analysis tools, security scanners — can process the masked data without knowing that it has been transformed. A schema validator checking that a credit card field contains exactly 16 digits will pass on the masked value, where it would fail on a `***REDACTED***` placeholder. This makes FPE masking transparent to infrastructure that operates on API traffic, unlike crude placeholder replacement.

Cequence implements masking at the proxy level, before traffic reaches the analysis engine. Predefined expressions cover common PII types (credit card numbers, Social Security numbers), and customers can configure custom regex patterns for business-specific formats. The masking is irreversible — the original values cannot be reconstructed from the masked output without access to the encryption key — and repeatable, meaning the same input always produces the same output, preserving data consistency across log entries.

#### §6.3.5 Detection Accuracy: The Precision-Recall Trade-Off

PII detection systems operate on a precision-recall spectrum that has direct operational consequences:

- **High precision, low recall.** The system only flags values it is *very confident* are PII. False positives are rare, but many actual PII instances slip through undetected. This is acceptable when the cost of a false positive (blocking a legitimate request) is high and the cost of a missed detection (PII reaching the backend) is tolerable.

- **Low precision, high recall.** The system flags anything that *might* be PII. Catch rate is high, but false positives are frequent, potentially blocking or masking large volumes of legitimate traffic. This is appropriate when the cost of undetected PII (regulatory fine, data breach) far exceeds the cost of occasional user disruption.

- **Context-dependent PII.** Some values are PII only in context. The string "John" is a common English word and a common given name. In a free-text field, "John" might be a person's first name (PII). In a product description, it is not. Neither regex nor most ML models handle this ambiguity reliably — the false positive rate for context-dependent PII is inherently higher than for format-constrained PII like email addresses or credit card numbers.

Organisations deploying real-time PII scanning should expect a tuning period. Initial deployments typically produce an unacceptable false positive rate, which is reduced by adjusting detection thresholds, adding exclusion rules for known false-positive patterns, and combining regex and ML approaches to leverage the strengths of each.

#### §6.3.6 Performance Overhead

Inline PII scanning adds latency to every request it inspects. The magnitude depends on the detection mechanism, payload size, and the number of PII types checked:

| Detection Mechanism | Typical Latency Overhead | Throughput Impact |
|:---------------------|:------------------------|:-------------------|
| Regex (5–10 patterns) | 0.1–1 ms | Negligible |
| Regex (50+ patterns) | 1–5 ms | Low |
| ML-based (local model) | 10–50 ms | Moderate |
| Cloud API (Google DLP, Azure) | 50–500 ms | High |
| FPE encryption (Cequence) | 1–5 ms | Low |

For APIs with strict latency SLAs (e.g., sub-100 ms p99 response time), the overhead of ML-based or cloud-based detection may be prohibitive. Organisations in this position typically:

1. Limit scanning to specific high-sensitivity endpoints rather than applying it globally
2. Use regex for low-latency inline detection and queue suspicious payloads for asynchronous ML analysis
3. Cache detection results for repeated patterns (the same email appearing in multiple requests)
4. Deploy ML models on the gateway host itself (sidecar inference) rather than calling a remote API, trading infrastructure cost for latency

#### §6.3.7 Limitations

Real-time PII scanning has several inherent limitations:

- **Encrypted payloads are opaque.** If the request body is encrypted by the client (end-to-end encryption), the gateway cannot inspect its contents. PII inside an encrypted JSON body passes through undetected. This limitation is fundamental — the gateway cannot decrypt data it does not have the key for.

- **Encoded PII requires decoding.** PII that has been URL-encoded, base64-encoded, or otherwise transformed must be decoded before inspection. Gateways must handle nested encoding (double URL-encoding, base64-of-JSON-with-URL-encoded-fields), adding complexity and latency.

- **Multipart form data and binary payloads** are harder to scan than JSON. File uploads, protobuf payloads, and binary-encoded data may contain PII in formats that text-based scanners cannot parse.

- **Scanning is a point-in-time control.** Even if the gateway blocks PII at the edge, the backend service may generate PII in its response (e.g., returning a user profile that includes email and address). Response scanning doubles the overhead and introduces additional latency on the response path.

Real-time PII scanning is most effective as a targeted control on specific high-sensitivity endpoints, complemented by log redaction (§6.1) for broad coverage across all traffic.

---

### §6.2 Cache-Control and Browser-Directed Protections

#### §6.2.1 The Caching Threat Model

When a browser or intermediate cache stores a response that was returned for a URL containing PII in query parameters, the cached entry preserves the full URL — including the PII. This creates multiple exposure vectors:

- **Browser cache.** Anyone with access to the user's device can inspect the browser's cache and extract PII from cached URLs. Disk forensics tools can recover cached entries even after the user has cleared their browsing history, because cache entries are stored separately from history records.
- **Shared proxy caches.** Corporate proxy servers, ISP caches, and CDN edge caches may store responses keyed by the full URL, including query parameters. Other users whose requests resolve to the same cached entry can potentially access the stored PII (depending on the cache's isolation model).
- **Back-forward cache (bfcache).** Modern browsers maintain an in-memory back-forward cache that preserves the full page state — including the URL — when the user navigates away and returns via the back button. PII in the URL is retained for the lifetime of the bfcache entry.

The `Cache-Control` and `Referrer-Policy` HTTP response headers give servers direct control over how browsers and intermediaries handle these caching and referral behaviours. They are among the simplest PII protections to implement — a single header on the response — but also among the most frequently omitted.

#### §6.2.2 Cache-Control Directives for PII Protection

The following `Cache-Control` directives are relevant to PII protection, listed in order of strictness:

**`no-store`** — the strongest directive. Instructs the browser and all intermediate caches that the response must never be stored in persistent storage. This prevents the URL (and its PII-bearing query parameters) from being written to disk in the browser cache, proxy cache, or any other persistent storage mechanism. The response may still be held in memory for the duration of the page render, but it is discarded immediately afterward.

```
Cache-Control: no-store
```

This is the recommended directive for any API response where the request URL or response body contains PII. It provides the strongest guarantee against PII leakage through cached URLs.

**`no-cache, private`** — a less strict but widely used combination. `no-cache` means the cache must revalidate the response with the origin server before using a stored copy (the cached copy may exist but is considered stale). `private` means the response is intended for a single user and must not be stored by shared caches (proxies, CDNs). The browser cache may still store the response locally, subject to revalidation.

```
Cache-Control: no-cache, private
```

This combination prevents shared cache exposure (other users on the same proxy cannot access the cached response) but does not prevent the browser from storing the URL locally. It is appropriate when the PII risk is primarily about cross-user exposure through shared infrastructure, rather than single-device forensics.

**`Pragma: no-cache`** — an HTTP/1.0 fallback directive. Modern HTTP/1.1 and HTTP/2 clients honour `Cache-Control` preferentially, but some legacy proxy implementations only support `Pragma`. Including both headers provides maximum compatibility:

```
Cache-Control: no-store
Pragma: no-cache
```

The `Expires: 0` header serves a similar backward-compatibility purpose, instructing HTTP/1.0 caches that the response expired immediately. For complete legacy coverage:

```
Cache-Control: no-store
Pragma: no-cache
Expires: 0
```

#### §6.2.3 Referrer-Policy Directives

When a user navigates from a page whose URL contains PII to an external site, the browser sends the *referrer URL* (note the single-r spelling, as specified in the Referrer-Policy header) in the `Referer` request header. If the destination site logs referrer URLs — which most analytics and advertising platforms do — the PII leaks to the external site's logs.

The `Referrer-Policy` response header controls this behaviour:

**`no-referrer`** — the browser sends no referrer header on any navigation from the current page. This completely eliminates referrer-based PII leakage. However, it also breaks legitimate use cases like analytics attribution and cross-site navigation context.

```
Referrer-Policy: no-referrer
```

**`strict-origin`** — the browser sends only the origin (scheme, host, port) as the referrer, stripping the path and query parameters. If the source URL is `https://api.example.com/v2/users?email=jane@example.com`, the referrer sent to external sites is simply `https://api.example.com`. This preserves analytics origin data while removing PII from query parameters.

```
Referrer-Policy: strict-origin
```

**`strict-origin-when-cross-origin`** — the browser sends the full URL for same-origin navigation (within the same domain) but only the origin for cross-origin navigation. This is the default behaviour in modern browsers and is appropriate when the API and the frontend are served from the same origin.

```
Referrer-Policy: strict-origin-when-cross-origin
```

**`same-origin`** — the browser sends the full URL only for same-origin navigation. No referrer is sent for cross-origin navigation at all. This provides stronger protection than `strict-origin-when-cross-origin` by eliminating origin leakage to third parties.

#### §6.2.4 Browser Support

Modern browsers (Chrome, Firefox, Safari, Edge) fully support `Cache-Control` (HTTP/1.1, RFC 9111), `Referrer-Policy` (W3C Recommendation), and the `no-store` directive. The legacy `Pragma: no-cache` header is honoured by all HTTP clients, including HTTP/1.0-only implementations.

One subtlety: Chrome's back-forward cache (bfcache) historically did not cache pages that used `Cache-Control: no-store`, which could cause pages to be discarded when navigating away and re-fetched on return. Starting in Chrome 130 (2024), Chrome updated this behaviour: pages using `no-store` are now eligible for bfcache when the browser determines it is safe to do so (i.e., when the page does not use `Content-Disposition: attachment` or `Cache-Control: no-store` for security-sensitive resources). This change means `no-store` still prevents disk caching but no longer prevents in-memory bfcache, which may retain PII in memory for the duration of the browsing session.

#### §6.2.5 When These Headers Are Necessary vs. Sufficient

`Cache-Control` and `Referrer-Policy` headers are *necessary* for any API that returns PII in responses or accepts PII in request URLs. Without them, the browser and intermediate caches make their own caching decisions, which may default to storing the response — and its URL — according to the HTTP caching heuristics in RFC 9111 §4.2.2. The default heuristic for responses without explicit cache directives is to store the response with a freshness lifetime derived from the `Last-Modified` header (typically hours to days), which is far too long for PII-bearing URLs.

However, these headers are *not sufficient* as a standalone PII protection mechanism. Their limitations are:

- **Server-side logs are unaffected.** `Cache-Control` prevents browser and proxy caching but does not affect the server's own access logs. If the API gateway logs the full request URI (which it typically does by default), the PII is captured regardless of cache headers. Log redaction (§6.1) is required for this.

- **TLS termination logs are unaffected.** Load balancers, WAFs, and CDN edge servers that terminate TLS and log the decrypted request are not governed by `Cache-Control` headers. They log what they receive.

- **Browser history is unaffected.** `Cache-Control: no-store` prevents disk caching but does not prevent the URL from appearing in the browser's history. The history is a separate storage mechanism that is not controlled by HTTP headers.

- **JavaScript access is unaffected.** Client-side JavaScript can always read `window.location.href` and extract PII from the URL. Cache headers provide no protection against client-side code accessing PII in the address bar.

- **The referrer policy is advisory.** `Referrer-Policy: strict-origin` prevents the browser from sending the full URL as a referrer, but it does not prevent a malicious destination page from using other techniques (e.g., `window.open()` with the full URL) to capture navigation context. The policy is enforced by well-behaved browsers; a compromised browser extension or malware can bypass it entirely.

These headers should be considered the *minimum viable protection* for PII-bearing endpoints — easy to implement, low overhead, wide browser support — but not the primary or sole control. They are most effective as part of a layered strategy that combines cache headers (this section), log redaction (§6.1), proxy-level masking (§6.4), and request-level architectural patterns (Chapter 3).

---

### §6.4 Proxy-Level Data Masking

#### §6.4.1 Masking at the Network Perimeter

Proxy-level data masking goes a step further than log redaction (§6.1, which cleans the record) and cache headers (§6.2, which control storage). It *actively transforms the request* at the reverse proxy layer before forwarding it to the backend service. The backend never sees the original PII — only the masked version. This is the most comprehensive infrastructure-level control, because it protects not only logs but also every downstream component that receives the forwarded request.

The proxy becomes the enforcement boundary: all PII removal happens at a single point in the request path, and every backend service benefits without requiring individual PII-handling logic. The trade-off is that the proxy itself becomes security-critical — if it fails or is misconfigured, PII flows through to the backend unmasked.

```mermaid
flowchart LR
    Inbound["`**Inbound Request**
    GET /api?email=jane@...`"]
    Strip["`**Strip**
    Remove param entirely`"]
    Placeholder["`**Placeholder**
    email=***MASKED***`"]
    HashVal["`**Hash**
    email=sha256(a1b2c3...)`"]
    Backend["`**Backend Service**`"]

    Inbound --> Strip
    Inbound --> Placeholder
    Inbound --> HashVal
    Strip --> Backend
    Placeholder --> Backend
    HashVal --> Backend
```

The three masking strategies mirror the log redaction approaches described in §6.1: stripping parameters corresponds to full redaction, placeholder replacement parallels structured field masking, and hash forwarding is the same technique as hash-based log replacement. The diagram below shows these correspondences:

```mermaid
flowchart TD
    subgraph "§6.1 Log Redaction"
        L1["`Regex-based`"]
        L2["`Structured masking`"]
        L3["`Hash replacement`"]
        L4["`Full redaction`"]
    end

    subgraph "§6.4 Proxy Masking"
        P1["`Strip params`"]
        P2["`Placeholder replacement`"]
        P3["`Hash forwarding`"]
    end

    L3 -.->|"Same technique"| P3
    L2 -.->|"Conceptually similar"| P2
    L4 -.->|"Conceptually similar"| P1
```

#### §6.4.2 Strip PII Parameters Entirely

The simplest approach: the proxy removes PII-bearing query parameters before forwarding the request. The backend receives the request without the PII parameters at all.

This works only when the backend can fulfill the request without the PII — for example, when the PII was only included for logging or analytics purposes, or when the backend can reconstruct the necessary identifier from other sources (session token, authentication context, correlated header). In practice, this is the least common pattern, because if the PII was not needed by the backend, it should not have been included in the request in the first place.

#### §6.4.3 Replace with Placeholders

The proxy replaces the PII value with a placeholder before forwarding. The backend receives the request with the parameter present but the value masked.

```nginx
# NGINX: Replace email query parameter with placeholder
rewrite_by_lua_block {
    local args, err = ngx.req.get_uri_args()
    if args and args.email then
        args.email = "***MASKED***"
        ngx.req.set_uri_args(args)
    end
}
```

This approach preserves the backend's parameter handling logic (the code that reads `request.args['email']` does not break) but replaces the actual value. It is appropriate when the backend's error handling would reject a request missing an expected parameter, but the masked value is acceptable for processing.

#### §6.4.4 Hash Values Before Forwarding

The proxy computes a cryptographic hash of the PII value and forwards the hash in place of the original. This preserves uniqueness (the same user always produces the same hash) while removing the raw PII. The backend can use the hash as an opaque identifier for correlation, caching, and deduplication.

```nginx
# NGINX: Hash email query parameter before forwarding
rewrite_by_lua_block {
    local args, err = ngx.req.get_uri_args()
    if args and args.email then
        local resty_sha256 = require "resty.sha256"
        local str = require "resty.string"
        local sha256 = resty_sha256:new()
        sha256:update(args.email)
        args.email = str.to_hex(sha256:final())
        ngx.req.set_uri_args(args)
    end
}
```

For this to be effective, the backend must be designed to work with hashed identifiers rather than raw PII — the same requirement as the tokenization approach in §5, but enforced at the proxy layer rather than the application layer.

#### §6.4.5 NGINX Implementation

NGINX (via OpenResty and `lua-nginx-module`) provides the most mature and flexible platform for proxy-level PII masking. The `rewrite_by_lua_block` directive executes Lua code during the rewrite phase of request processing, before the request is forwarded upstream. This phase has full access to request headers, query parameters, and the request body, allowing comprehensive masking. (For NGINX *log redaction* using `log_by_lua_block` and `map` directives, see §6.1.)

A production NGINX configuration for PII masking might include:

```nginx
server {
    listen 443 ssl;
    server_name api.example.com;

    location /api/ {
        rewrite_by_lua_block {
            local args = ngx.req.get_uri_args()

            -- Mask known PII parameters by name (structured field masking)
            local pii_fields = { "email", "ssn", "phone", "dob" }
            for _, field in ipairs(pii_fields) do
                if args[field] then
                    args[field] = "***MASKED***"
                end
            end

            -- Regex-based masking for PII in arbitrary parameters
            for key, val in pairs(args) do
                if type(val) == "string" then
                    -- Mask email-like values in non-whitelisted parameters
                    val = ngx.re.sub(val,
                        "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}",
                        "***MASKED***")
                    args[key] = val
                end
            end

            ngx.req.set_uri_args(args)
        }

        proxy_pass http://backend_service;
    }
}
```

NGINX's Lua API also supports request body inspection and modification via `ngx.req.read_body()` and `ngx.req.get_body_data()`, enabling masking of PII in JSON or form-encoded request bodies as well as query parameters. However, body inspection adds processing overhead proportional to body size and should be applied selectively.

#### §6.4.6 Envoy Implementation

Envoy, the L7 proxy commonly used in service mesh deployments (Istio, Kubernetes Gateway API), provides several extension mechanisms for PII masking:

**Lua filter.** Envoy's built-in Lua filter allows inline request transformation using Lua scripts, similar to NGINX's approach. The Lua filter has access to request headers and the request body (if configured) and can modify them before the request is forwarded.

```lua
-- Envoy Lua filter: mask email in query parameters
function envoy_on_request(request_handle)
    local path = request_handle:headers():get(":path")
    if path then
        local masked = string.gsub(path, "email=[^&]+", "email=***MASKED***")
        if masked ~= path then
            request_handle:headers():replace(":path", masked)
        end
    end
end
```

The Lua filter is simple and performant but limited in capability — it cannot make external calls, interact with the filesystem, or use advanced Lua libraries. For complex masking logic, the External Processing filter is more appropriate.

**External Processing (ExtProc) filter.** Envoy's External Processing filter is the most powerful extension mechanism for PII masking. It establishes a bidirectional gRPC stream between the proxy and an external service for each HTTP request. The external service can inspect the full request (headers, body, trailers), modify it, and return the transformed version to Envoy for forwarding.

The ExtProc pattern is architecturally significant for PII masking because it decouples the masking logic from the proxy itself. The PII scanning and masking service can be implemented in any language, can maintain state (caching, rate limiting), and can integrate with external services (Google Cloud DLP, Microsoft Presidio) without modifying the proxy configuration.

```protobuf
// External Processing service definition
service ExtProcService {
    rpc Process(ProcessRequest) returns (ProcessResponse);
}

// The proxy sends the request headers to the external processor
message ProcessRequest {
    RequestHeaders headers = 1;
    RequestBody body = 2;
    // ...
}
```

The trade-off is latency and operational complexity. Each request incurs a gRPC round-trip to the external processor, adding network latency (typically 1–10 ms within the same cluster, more across clusters). The external processor becomes a critical path dependency — if it is unavailable or slow, requests are delayed or dropped.

**WebAssembly (WASM) filter.** Envoy supports WASM filters that run compiled code (Rust, C++, Go) within the proxy's address space, avoiding the network round-trip of ExtProc. WASM filters can inspect and modify request bodies using host functions provided by the Envoy WASM SDK, and they execute at near-native speed. However, WASM filters have limited access to external services (no network I/O in many implementations) and are more complex to develop and debug than Lua scripts.

#### §6.4.7 HAProxy Implementation

HAProxy, widely deployed as a load balancer and reverse proxy, supports request transformation through its Lua engine (similar to NGINX's OpenResty) and through `http-request` rules in its configuration language.

HAProxy's declarative rules are well-suited for simple field-based masking:

```
frontend https_front
    bind *:443 ssl crt /etc/ssl/api.example.com.pem

    # Mask email query parameter
    http-request replace-path query email=[^&]* email=***MASKED***

    # Mask SSN query parameter
    http-request replace-path query ssn=[^&]* ssn=***MASKED***

    default_backend api_backend
```

For more complex masking (regex on values, conditional logic), HAProxy's Lua engine provides the same capabilities as NGINX's Lua module. HAProxy's Lua integration is less commonly used than NGINX's OpenResty but is equally capable for PII masking purposes.

#### §6.4.8 Benefits of Proxy-Level Masking

- **Centralised enforcement.** PII masking is applied at a single infrastructure layer, eliminating the need for each backend service to implement its own PII handling. New services automatically benefit from the proxy's masking rules.

- **Transparent to backend services.** Backend services receive requests with masked PII and need not be aware that masking has occurred (when using placeholder or hash replacement). This reduces development effort and the risk of inconsistent PII handling across services.

- **Independent of application code.** Proxy-level masking works regardless of the backend technology stack — Java, Python, Go, Node.js, or any other runtime. It provides a uniform protection layer that does not require code changes to the applications behind the proxy.

- **Composable with other controls.** Proxy-level masking can be combined with log redaction (§6.1) for defence in depth — the proxy masks the request *and* the gateway redacts the log entry. Even if one control fails, the other provides residual protection.

#### §6.4.9 Limitations

- **The proxy becomes a security-critical component.** If the proxy is misconfigured (masking rules disabled, bypass route created, plugin not loaded), PII flows through to the backend unmasked. The proxy must be hardened, monitored, and regularly audited — it is now a security boundary, not just a routing component.

- **Added latency.** Every masking operation — regex substitution, hash computation, external processor call — adds latency to the request path. For simple field masking, the overhead is negligible (< 1 ms). For body inspection or external processing, the overhead can be significant (10–100 ms).

- **Request body inspection is expensive.** Masking PII in query parameters is straightforward (they are small and always present in the URI). Masking PII in request bodies requires buffering the entire body, parsing it (JSON, form-encoded, multipart), applying masking rules, and reconstructing the body before forwarding. For large request bodies (multi-MB file uploads), this can consume significant memory and CPU on the proxy.

- **TLS end-to-end considerations.** If the client encrypts the request body with end-to-end encryption (not TLS termination at the proxy, but application-level encryption), the proxy cannot inspect or mask the body content. Proxy-level masking requires the proxy to terminate TLS (or be in the TLS trust chain) and receive the request in cleartext.

- **Complexity of rule maintenance.** The proxy's masking rules must cover all PII-carrying parameters across all APIs. In a large organisation, this can become a large and complex rule set that requires coordination across teams and regular updates as APIs evolve. A missed parameter means unmasked PII reaching the backend — there is no "default deny" mode for proxy-level masking.

#### §6.4.10 When to Use Proxy-Level Masking

Proxy-level data masking is most appropriate when:

- The organisation operates a centralised API gateway or reverse proxy that all API traffic passes through
- Backend services are not designed to handle PII and cannot be easily modified
- A consistent masking policy must be enforced across many independent services
- The PII is primarily carried in query parameters (low overhead to mask) rather than large request bodies
- The proxy infrastructure is already managed by a platform or SRE team with security expertise

Proxy-level masking is least appropriate when:

- API traffic does not flow through a centralised proxy (direct service-to-service communication, microservices with sidecar proxies)
- The masking requirements are complex and context-dependent (different masking rules for different users, roles, or request contexts)
- End-to-end encryption prevents the proxy from inspecting request contents
- The backend services need the original PII values for processing (not just hashes or placeholders)

In such cases, the request-level patterns from §3 (moving PII out of URLs) or the cryptographic approaches from Chapters 4–5 (encrypting or tokenizing PII) may be more appropriate.

---

### §6.5 Response-Side PII Leakage

The preceding sections focus on preventing PII from appearing in *requests* — URLs, query parameters, headers, and bodies sent by the client. But API **responses** are an equally dangerous — and frequently overlooked — vector. An API that scrubs PII from every inbound request can still leak it through outbound responses, defeating the entire protection strategy.

Response-side leakage is insidious because it re-introduces PII into places the client cannot control: browser history, proxy logs, CDN caches, and monitoring dashboards. The following sections catalog the most common response-side leak vectors and provide mitigations for each.

#### §6.5.1 `Location` Headers in Redirects

When a resource is created (HTTP 201) or a redirect is issued (HTTP 301/302/307/308), the `Location` header often contains the canonical URL of the new resource. If the resource is identified by PII — an email address, a phone number, a national ID — that PII reappears in the URL.

❌ **Problematic response:**

```http
HTTP/1.1 201 Created
Location: /api/users?email=alice@example.com
Content-Type: application/json

{ "id": "usr_7f3a9b2c", "email": "alice@example.com" }
```

The `Location` header leaks the user's email into proxy logs, browser history, and any downstream redirect chains.

✅ **Fixed alternative:**

```http
HTTP/1.1 201 Created
Location: /api/users/usr_7f3a9b2c
Content-Type: application/json

{ "id": "usr_7f3a9b2c", "email": "alice@example.com" }
```

The `Location` header uses an opaque server-assigned identifier. The response body still returns the email (which the client already submitted), but the URL — the part that gets logged and cached — is PII-free.

**Mitigation rule:** Every `Location`, `Content-Location`, and redirect URL emitted by the server must use opaque identifiers, never PII-bearing query parameters.

#### §6.5.2 Validation Error Responses Echoing PII

Error responses — particularly validation errors — often echo back the submitted field values to help developers debug. This is useful in development but dangerous in production, especially when the error format is structured (e.g., RFC 7807 `application/problem+json`).

❌ **Problematic response:**

```http
HTTP/1.1 422 Unprocessable Entity
Content-Type: application/problem+json

{
  "type": "https://api.example.com/errors/validation",
  "title": "Validation Error",
  "status": 422,
  "errors": [
    {
      "field": "email",
      "value": "alice@example.com",
      "message": "Email is already registered"
    },
    {
      "field": "phone",
      "value": "+1-555-0123",
      "message": "Invalid phone number format"
    }
  ]
}
```

The `value` field echoes PII back in the response — and this response may be logged by API gateways, client-side error trackers, or developer consoles.

✅ **Fixed alternative:**

```http
HTTP/1.1 422 Unprocessable Entity
Content-Type: application/problem+json

{
  "type": "https://api.example.com/errors/validation",
  "title": "Validation Error",
  "status": 422,
  "errors": [
    {
      "field": "email",
      "message": "Email is already registered"
    },
    {
      "field": "phone",
      "message": "Invalid phone number format"
    }
  ]
}
```

The `value` field is omitted. The error message is sufficient for the client to understand the problem without re-transmitting the PII.

**Mitigation rule:** Validation error responses must never echo submitted PII field values. If a debug mode is needed for development, gate it behind an explicit environment flag and strip it in production.

#### §6.5.3 HATEOAS Links with PII in URL Templates

Hypermedia-driven APIs (HATEOAS) embed navigational links in response bodies. If the URL templates include PII — for example, constructing a link from a user's email or username — every response containing that link propagates the PII through caches, CDNs, and client logs.

❌ **Problematic response:**

```json
{
  "id": "usr_7f3a9b2c",
  "name": "Alice Smith",
  "_links": {
    "self": { "href": "/api/users?email=alice@example.com" },
    "orders": { "href": "/api/users?email=alice@example.com/orders" },
    "profile": { "href": "/api/profiles/alice.smith%40example.com" }
  }
}
```

Every link in the `_links` object contains PII — the email address — in the URL path or query string.

✅ **Fixed alternative:**

```json
{
  "id": "usr_7f3a9b2c",
  "name": "Alice Smith",
  "_links": {
    "self": { "href": "/api/users/usr_7f3a9b2c" },
    "orders": { "href": "/api/users/usr_7f3a9b2c/orders" },
    "profile": { "href": "/api/profiles/usr_7f3a9b2c" }
  }
}
```

All HATEOAS links use the opaque identifier. The response body can still contain PII fields (name, email) as data — but the navigational links are clean.

#### §6.5.4 Pre-Signed URLs with Embedded Identifiers

Cloud storage services (AWS S3, Google Cloud Storage, Azure Blob Storage) support pre-signed URLs that grant temporary access to objects. The object key or query parameters in these URLs may contain PII — for example, a filename derived from a user's name or an ID number.

❌ **Problematic pre-signed URL:**

```
https://storage.googleapis.com/bucket/downloads/
  alice.smith%40example.com_tax-return-2025.pdf
  ?x-goog-signature=1a2b3c...
  &x-goog-expires=1704067200
```

This URL exposes the user's email and document type in the object key. Pre-signed URLs are frequently logged by CDN access logs, browser download managers, and email gateway scanners.

✅ **Fixed alternative:**

```
https://storage.googleapis.com/bucket/downloads/
  d4e5f6a7-8b9c-0d1e-2f3a-4b5c6d7e8f90.pdf
  ?x-goog-signature=1a2b3c...
  &x-goog-expires=1704067200
```

The object key uses a UUID. The mapping from UUID to the original filename (which may contain PII) is stored server-side and never exposed in the URL.

#### §6.5.5 Downloadable Exports with PII in Filenames

APIs that generate downloadable reports (CSV, PDF, XLSX) often include PII in the `Content-Disposition` filename or in the URL that triggers the download.

❌ **Problematic response:**

```http
HTTP/1.1 200 OK
Content-Type: text/csv
Content-Disposition: attachment; filename="alice.smith-transactions-2025.csv"

"Date","Amount","Description"
"2025-01-15","$42.00","Coffee shop"
```

The filename `alice.smith-transactions-2025.csv` contains PII. Download managers, browser download histories, and antivirus scanners all record this filename.

✅ **Fixed alternative:**

```http
HTTP/1.1 200 OK
Content-Type: text/csv
Content-Disposition: attachment; filename="transactions-export-usr_7f3a9b2c-2025.csv"

"Date","Amount","Description"
"2025-01-15","$42.00","Coffee shop"
```

The filename uses the opaque user ID. The exported CSV content may still contain PII in its rows (which is the purpose of the export), but the filename itself is sanitized.

#### §6.5.6 Admin UI Deep Links

Internal admin panels and back-office tools often generate direct links to user records. If these links embed PII in the URL — for example, a search-by-email link — anyone with access to the admin tool's URL bar, browser history, or network monitoring can see the PII.

❌ **Problematic admin URL:**

```
https://admin.internal.example.com/users?search=alice@example.com&tab=orders
```

This URL appears in the admin's browser history, any screenshots of the admin panel, and network monitoring tools.

✅ **Fixed alternative:**

```
https://admin.internal.example.com/users/usr_7f3a9b2c?tab=orders
```

The admin UI navigates by opaque ID. The email is displayed in the page content (the admin has legitimate access), but the URL does not betray it.

#### §6.5.7 API Documentation and Example Responses

Swagger/OpenAPI specifications often include example responses in their schema definitions. If these examples use realistic-looking PII patterns — even fictional ones — they normalize the pattern and may influence developers to replicate it in production APIs.

❌ **Problematic OpenAPI example:**

```yaml
# In an OpenAPI 3.1 components/schemas/User definition
properties:
  email:
    type: string
    example: "alice@example.com"
  profile_url:
    type: string
    example: "/api/users?email=alice@example.com"
    description: "Link to the user's profile"
```

The `profile_url` example demonstrates a PII-bearing URL pattern. Developers copying this example will replicate the leak.

✅ **Fixed alternative:**

```yaml
# In an OpenAPI 3.1 components/schemas/User definition
properties:
  email:
    type: string
    example: "user@example.com"
  profile_url:
    type: string
    example: "/api/users/usr_a1b2c3d4"
    description: "Link to the user's profile (opaque identifier)"
```

The example uses a generic email and an opaque identifier in the URL. The pattern itself communicates best practice.

> **Important — Examples Must Model PII-Safe URL Design**
>
> API documentation examples must demonstrate PII-safe URL patterns. Use `user@example.com` (RFC 2606 reserved domain) for email examples, and opaque identifiers for URL paths. This is not merely cosmetic — it is a security documentation practice that shapes downstream implementation.

#### §6.5.8 Response-Side PII Checklist

The following checklist provides a structured audit framework for identifying PII leakage in API responses:

| Response Element | PII Risk | Audit Question | Mitigation |
|:-----------------|:---------|:---------------|:-----------|
| `Location` header | High | Do redirect/creation URLs contain PII in path or query? | Use opaque identifiers in all `Location` URLs |
| `Content-Location` header | Medium | Does the content location URL expose PII? | Use opaque identifiers |
| Validation error bodies (RFC 7807) | High | Do error responses echo submitted PII field values? | Omit `value` fields; use field names and messages only |
| HATEOAS `_links` | Medium | Do hypermedia links contain PII in URL templates? | Construct links from opaque IDs, not PII fields |
| Pre-signed URLs | High | Do object keys or query params in signed URLs contain PII? | Use server-side UUID mapping; avoid PII in object keys |
| `Content-Disposition` filenames | Medium | Do download filenames contain user names or emails? | Use opaque IDs or generic prefixes in filenames |
| Admin panel URLs | Medium | Do admin deep links embed PII in query parameters? | Navigate by opaque ID; display PII only in page content |
| OpenAPI example responses | Low | Do API docs show PII-bearing URL patterns? | Use `example.com` domains and opaque IDs in all examples |
| Pagination links (`Link` header) | Medium | Do `next`/`prev` links in `Link` headers contain PII query params? | Paginate by opaque cursor or offset, not by PII-bearing filters |
| ETag / If-None-Match values | Low | Do entity tags encode PII-derived hashes? | Generate ETags from resource content hashes, not from PII |

---

### §6.6 Client-Side PII Leak Surfaces

Even when an API is perfectly designed — PII-free URLs, sanitized responses, opaque identifiers everywhere — the **client-side environment** can reintroduce PII leakage through third-party tools, browser features, and developer workflows that capture and transmit URLs outside the organisation's control.

Client-side leak surfaces are particularly dangerous because they operate in environments the API team does not own: the user's browser, the mobile operating system, the developer's desktop, and third-party SaaS platforms. Mitigating these requires cooperation across frontend engineering, DevOps, mobile development, and security teams.

#### §6.6.1 Session Replay Tools

Session replay tools — Hotjar, FullStory, LogRocket, Smartlook, Microsoft Clarity — record user interactions for UX analytics. These tools capture the full page URL (including query parameters and fragments) on every page load, navigation, and state change. If the application constructs URLs containing PII — even transiently, for internal routing — the replay tool records and stores them.

**Risk profile:** PII is stored on the replay vendor's servers, accessible to anyone with analytics access. Replay recordings are often shared in Slack channels, Jira tickets, and sprint reviews without redaction.

**Mitigations:**

- Configure the replay SDK to **strip query parameters** before recording. Most tools support this:
  ```javascript
  // FullStory — exclude specific query params
  FS.setUserVars({ displayName: "usr_7f3a9b2c" });
  FS.consent(false);  // Disable recording for sensitive pages

  // Hotjar — suppress specific elements
  hj('event', 'pii_page');
  // Then configure Hotjar dashboard to exclude events matching 'pii_page'
  ```

- Use **Content Security Policy (`Content-Security-Policy`)** headers to restrict which domains receive navigation data:
  ```http
  Content-Security-Policy: connect-src 'self' https://api.example.com;
  ```
  This does not block replay SDKs directly (they use their own domains), but combined with a strict CSP, it makes it easier to audit which third-party scripts are loaded.

- **Best practice:** Avoid loading session replay SDKs on pages that handle PII. Use route-level conditional loading — only inject the replay script on marketing pages and non-sensitive areas.

#### §6.6.2 RUM and Browser Telemetry

Real User Monitoring (RUM) tools — New Relic Browser, Datadog RUM, Elastic RUM, Splunk RUM, Google Cloud Trace — capture full URLs in page load events, XHR/fetch calls, and resource timing entries. These URLs are transmitted to the RUM backend and stored in queryable time-series databases.

**Risk profile:** RUM data is typically retained for 30–90 days and is queryable by anyone with observability access. A query like `page_url LIKE '%email=%'` can extract all PII-bearing URLs captured during the retention window.

**Mitigations:**

- Configure the RUM SDK to **strip or hash query parameters** before transmission:
  ```javascript
  // Datadog RUM — strip all query params
  DD_RUM.init({
    applicationId: 'xxx',
    clientToken: 'xxx',
    site: 'datadoghq.com',
    // Allowlist only safe query parameters
    allowedTracingUrls: [
      { match: /api\.example\.com/, propagatorTypes: ['tracecontext'] }
    ],
    // Custom URL sanitizer
    beforeSend: (event) => {
      if (event.view?.url) {
        const url = new URL(event.view.url);
        url.search = '';  // Strip all query params
        event.view.url = url.toString();
      }
      return true;
    }
  });
  ```

- New Relic Browser supports `BrowserMonitoring` configuration to exclude specific URL patterns from capture.
- Elastic RUM supports `contextManager` configuration to redact URL segments before transmission.

**General rule:** Never allow RUM tools to capture raw query strings. If a URL parameter is sensitive enough to remove from server logs (per §3), it is sensitive enough to remove from RUM payloads.

#### §6.6.3 Crash Reporting SDKs

Crash reporting tools — Sentry, Firebase Crashlytics, Bugsnag, Rollbar — capture URLs as part of breadcrumb trails, stack traces, and custom context. When an exception occurs on a page with a PII-bearing URL, the crash report includes that URL in the payload sent to the crash reporting backend.

**Risk profile:** Crash reports are long-lived (often retained indefinitely for regression analysis) and widely accessible to the development team. Unlike session replays, crash reports are considered "essential infrastructure" and are rarely audited for PII content.

**Mitigations:**

- Configure **server-side PII scrubbing** in the crash reporting backend. Sentry supports scrubbing rules:
  ```python
  # sentry.conf.py
  def before_send(event, hint):
      if 'request' in event and 'url' in event['request']:
          url = event['request']['url']
          event['request']['url'] = re.sub(
              r'email=[^&]+', 'email=[REDACTED]', url
          )
      return event
  ```

- Use the SDK's **before-send hook** to strip PII from URLs before transmission:
  ```javascript
  // Sentry browser SDK
  Sentry.init({
    dsn: 'https://xxx@sentry.io/xxx',
    beforeSend(event) {
      if (event.request?.url) {
        const url = new URL(event.request.url);
        url.searchParams.delete('email');
        url.searchParams.delete('phone');
        event.request.url = url.toString();
      }
      return event;
    }
  });
  ```

- Bugsnag supports `redactedKeys` configuration to strip specific keys from all captured metadata.
- **Best practice:** Configure the SDK to strip *all* query parameters by default, and selectively allowlist known-safe parameters.

#### §6.6.4 Mobile Deep Links and Universal Links

Mobile applications use deep links (custom URL schemes like `myapp://`) and universal links (iOS) / app links (Android) to route users to specific content. These URLs are processed by the operating system, which may log them in system logs, analytics pipelines, or the device's universal link registry.

**Risk profile:** Deep links with PII are logged by:
- Android `logcat` (system-level URL dispatch logging)
- iOS `os_signpost` and Console.app
- Mobile device management (MDM) solutions that capture device activity
- Third-party attribution SDKs (Branch, AppsFlyer, Adjust) that intercept and log incoming URLs

**Mitigations:**

- **Never embed PII in deep link URLs.** Use opaque tokens or short-lived reference codes:
  ```
  ❌ myapp://user?email=alice@example.com&action=verify
  ✅ myapp://user?ref=tk_8f3a9b2c&action=verify
  ```

- Resolve the reference code server-side — the mobile app calls an API with the token to retrieve the actual data.
- Configure attribution SDKs to **strip query parameters** before logging. Branch supports `Branch.getInstance().setRequestMetadata("pii_field", "[REDACTED]")`.

#### §6.6.5 Screenshots and Screen Sharing

Browser developer tools display the current URL prominently in the address bar. Screenshots, screen recordings, and live screen shares (Zoom, Teams, Google Meet) routinely capture the URL bar. If the URL contains PII, it is exposed to everyone who sees the screenshot or recording.

**Risk profile:** Unlike programmatic leak vectors, screenshot leakage is human-driven and cannot be prevented by technical controls alone. Screenshots end up in:
- Jira tickets and Confluence pages
- Slack channels and email threads
- GitHub issues and pull request comments
- Support tickets and training materials

**Mitigations:**

- **Defense in depth:** If URLs do not contain PII in the first place (per §3 patterns), screenshots are safe by default. This is the strongest argument for keeping PII out of URLs — it eliminates an entire class of human-driven leakage.
- Use **browser extensions** that auto-redact query parameters from the URL bar for development/staging environments.
- Include **PII-safe URL practices** in developer onboarding and security training.

#### §6.6.6 API Examples in Communication Channels

Developers routinely share API URLs in Slack messages, Jira tickets, GitHub issues, Postman collections, and Confluence pages. If these URLs contain PII — either from production incidents or from test data that mirrors production patterns — the PII propagates into systems with broad access and long retention.

**Risk profile:** Communication channels have broad visibility (Slack channels with 50+ members, public GitHub repositories) and are often excluded from DLP (Data Loss Prevention) scanning.

**Mitigations:**

- Use **Postman environment variables** for PII fields, not hardcoded values in collection URLs:
  ```
  ❌ GET {{base_url}}/api/users?email=alice@example.com
  ✅ GET {{base_url}}/api/users/{{user_id}}
  ```

- Configure **Slack DLP integrations** (Slack Enterprise Grid) to scan for patterns resembling PII in URLs.
- Establish a convention that **example URLs always use RFC 2606 domains** (`example.com`, `example.org`) and opaque identifiers.
- Include URL hygiene in **code review checklists** — reviewers should flag any PR that hardcodes a PII-bearing URL in comments, tests, or documentation.

#### §6.6.7 Mock Servers and Generated SDKs

API development workflows often use mock servers (Postman Mock Server, Prism, WireMock) and SDK generators (OpenAPI Generator) that reflect the URL patterns defined in the API specification. If the OpenAPI spec defines paths or examples with PII patterns, the mock server reproduces them, and the generated SDK includes them as example code.

**Risk profile:** Mock servers are accessible to the entire development team and may be exposed on the internet (e.g., Postman Mock Server public endpoints). Generated SDK examples are copied into application code without scrutiny.

**Mitigations:**

- Ensure the OpenAPI specification uses **PII-free URL patterns** in all path definitions, examples, and descriptions:
  ```yaml
  # ❌ Bad: path parameter suggests PII
  /api/users/{email}:
    get:
      parameters:
        - name: email
          in: path
          example: "alice@example.com"

  # ✅ Good: opaque identifier
  /api/users/{userId}:
    get:
      parameters:
        - name: userId
          in: path
          example: "usr_7f3a9b2c"
  ```

- Configure mock servers to use **synthetic data** — not anonymized production data — for all example responses.
- Review generated SDK code before publishing: check example files, README snippets, and test fixtures for PII-bearing URLs.

#### §6.6.8 Client-Side Leak Surface Recommendations

| Leak Surface | Risk Level | Primary Mitigation | Secondary Controls |
|:-------------|:----------:|:-------------------|:-------------------|
| Session replay tools (Hotjar, FullStory, LogRocket) | High | Conditional loading — exclude SDK on PII-bearing pages | CSP headers; SDK query-param stripping |
| RUM / browser telemetry (New Relic, Datadog, Elastic) | High | `beforeSend` hook to strip query params from captured URLs | RUM backend query auditing; retention policies |
| Crash reporting SDKs (Sentry, Crashlytics, Bugsnag) | Medium | SDK before-send hook to redact PII from URL fields | Server-side scrubbing rules; `redactedKeys` config |
| Mobile deep links / universal links | Medium | Use opaque reference tokens in deep link URLs | Attribution SDK redaction; MDM logging audit |
| Screenshots and screen sharing | Low — human-driven | Keep PII out of URLs (defense in depth) | Browser extensions for dev/staging; security training |
| Communication channels (Slack, Jira, GitHub) | Medium | Convention: example URLs use `example.com` + opaque IDs | Slack DLP; code review checklist for PII in URLs |
| Mock servers and generated SDKs | Low | PII-free OpenAPI specs and synthetic mock data | Pre-publish review of generated example code |

**Key principle:** The most effective mitigation for client-side PII leakage is to **never put PII in URLs in the first place**. Every mitigation in this section is a defense-in-depth layer — the primary defense is the request-side patterns from §3. If URLs are PII-free at the source, every downstream tool — replay, RUM, crash reporter, mock server — inherits that safety by default.

---

## 7. Design-Time API Governance and Contract Enforcement

Runtime controls — log redaction, proxy masking, encryption at rest — are necessary but insufficient. By the time an API reaches production with personal data in its URL parameters, the cheapest fix has already been missed: **preventing the insecure design from being merged in the first place.**

This chapter covers the design-time controls that catch PII-in-URL patterns at the contract level, before any code is deployed. The principle is straightforward: if an OpenAPI specification cannot describe an endpoint with PII in a path or query parameter, no implementation of that specification can introduce the vulnerability.

This is the point where the standards mapping becomes enforceable engineering policy. The controls in this chapter translate the broad "do not place sensitive data in URL channels" expectation from OWASP ASVS and the weakness model behind CWE-598 into lint rules, CI gates, review checklists, and exception workflows that delivery teams can actually apply.

---

### §7.1 OpenAPI Specification-Level Controls

The OpenAPI Specification (OAS 3.1, the current version) provides several mechanisms for classifying and constraining parameter content. None of these are mandatory for PII protection out of the box — they must be deliberately configured.

#### §7.1.1 Field Sensitivity Classification

The most fundamental design-time control is **classifying which fields contain personal data**. Without classification, no automated tool can distinguish `GET /api/users?email=alice@example.com` (PII exposure) from `GET /api/products?category=electronics` (no exposure).

OAS 3.1 supports extension properties (`x-*` prefixes) that can carry custom metadata. A common pattern:

```yaml
# openapi.yaml (excerpt)
paths:
  /api/v1/users:
    get:
      parameters:
        - name: email
          in: query
          required: false
          schema:
            type: string
            format: email
          x-sensitivity: direct-identifier
          x-pii-category: email
          x-max-classification: restricted
        - name: user_id
          in: query
          required: false
          schema:
            type: string
            format: uuid
          x-sensitivity: pseudonymous-identifier
          x-pii-category: internal-reference
```

The `x-sensitivity` extension classifies each parameter:

| Classification | Meaning | Example |
|:---------------|:--------|:--------|
| `direct-identifier` | Directly identifies a natural person | email, SSN, phone number, national ID |
| `quasi-identifier` | Can identify when combined with other data | zip code + date of birth + gender |
| `pseudonymous-identifier` | Opaque token linked to a person via a mapping table | UUID, database primary key |
| `non-identifying` | Cannot be linked to a natural person | product category, page number, status code |

Once classified, downstream tooling (linters, CI gates, documentation generators) can enforce rules based on the classification.

#### §7.1.2 Restricting PII from Path and Query Parameters

The most enforceable design-time rule is a **blanket prohibition on direct identifiers in path and query parameters**. This can be expressed as a combination of:

1. **Schema-level prohibition:** Mark all `in: path` and `in: query` parameters with `x-sensitivity: direct-identifier` as invalid.
2. **Pattern-based detection:** Flag parameters whose names match known PII fields (`email`, `ssn`, `phone`, `tax_id`, `passport`, `date_of_birth`, `address`, `name`, `surname`, etc.).
3. **Format-based detection:** Flag parameters with `format: email`, `format: uri` (when the URI encodes identity), or regex patterns matching common PII formats (SSN `\d{3}-\d{2}-\d{4}`, phone `+\d{10,15}`, etc.).

A complete OpenAPI snippet showing the prohibited pattern:

```yaml
##### Bad example: direct identifier in query parameter
paths:
  /api/v1/users:
    get:
      parameters:
        - name: email
          in: query          # ← PII in query parameter
          schema:
            type: string
            format: email
```

The corrected design:

```yaml
##### Corrected example: POST body lookup, returns opaque ID
paths:
  /api/v1/users/lookup:
    post:
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                email:
                  type: string
                  format: email
                  x-sensitivity: direct-identifier
      responses:
        "200":
          content:
            application/json:
              schema:
                type: object
                properties:
                  user_id:
                    type: string
                    format: uuid
```

---

### §7.2 Linting Rules for PII in URLs

Automated linting catches violations that manual review misses. The two most mature OpenAPI linting frameworks are **Spectral** (by Stoplight, now part of Cisco) and **Redocly**.

#### §7.2.1 Spectral Rule: PII in Query Parameters

The following Spectral rule detects direct identifiers in query parameters by matching parameter names against a list of known PII fields:

```yaml
# .spectral.yaml
rules:
  no-pii-in-query:
    description: "PII must not be passed as query parameters (use POST body instead)"
    severity: error
    given: "$.paths[*][*].parameters[?(@.in == 'query')]"
    then:
      field: "name"
      function: pattern
      functionOptions:
        notMatch: "^(email|ssn|social_security|phone|mobile|tax_id|passport|date_of_birth|dob|address|street|city|zip|postal|name|first_name|last_name|surname|given_name|family_name|national_id|drivers_license|credit_card|card_number|account_number|sort_code|iban|bic|swift)$"

  no-pii-in-path:
    description: "PII must not appear in URL path segments (use opaque identifiers)"
    severity: error
    given: "$.paths[*][*].parameters[?(@.in == 'path')]"
    then:
      field: "name"
      function: pattern
      functionOptions:
        notMatch: "^(email|ssn|social_security|phone|mobile|tax_id|passport|date_of_birth|dob|name|first_name|last_name|surname|national_id)$"

  no-email-format-in-url:
    description: "Parameters with format:email must not be in path or query"
    severity: error
    given: "$.paths[*][*].parameters[?(@.in == 'query' || @.in == 'path')]"
    then:
      field: "schema.format"
      function: pattern
      functionOptions:
        notMatch: "^email$"

  no-sensitive-extension-in-url:
    description: "Parameters marked as direct-identifier must not be in path or query"
    severity: error
    given: "$.paths[*][*].parameters[?(@.in == 'query' || @.in == 'path')]"
    then:
      field: "x-sensitivity"
      function: pattern
      functionOptions:
        notMatch: "^direct-identifier$"
```

Running Spectral against an OpenAPI spec with these rules:

```bash
npx @stoplight/spectral-cli lint openapi.yaml --ruleset .spectral.yaml
```

Output for a violating spec:

```
openapi.yaml
  15:17  error  no-pii-in-query  PII must not be passed as query parameters (use POST body instead)  paths./api/v1/users.get.parameters[0].name
  23:15  error  no-pii-in-path   PII must not appear in URL path segments (use opaque identifiers)     paths./api/v1/users/{email}.get.parameters[0].name
```

#### §7.2.2 Redocly Configuration

Redocly provides similar capabilities through its `redocly.yaml` configuration. The rule structure is analogous to Spectral's, with the same JSONPath expressions for targeting path and query parameters.

#### §7.2.3 Beyond Name Matching: Semantic Detection

Name-based rules are a starting point but have limitations:
- **False negatives:** A parameter named `q` or `filter` can carry PII without being flagged.
- **False positives:** A parameter named `email` might be a legitimate enum value (`email`, `sms`, `push`) rather than an actual email address.

More sophisticated approaches include:
- **Format-aware detection:** Flag any `in: query` or `in: path` parameter with `format: email`, `format: uri` (where the URI encodes identity), or a regex pattern matching PII formats.
- **Schema-aware detection:** If the parameter's schema includes `pattern: "^\\d{3}-\\d{2}-\\d{4}$"` (SSN pattern), flag it regardless of the parameter name.
- **Extension-aware detection:** Respect the `x-sensitivity` extension — if a parameter is classified as `direct-identifier` and appears in path/query, it's a violation.

---

### §7.3 CI/CD Policy Gates

Linting rules only work if they are enforced. CI/CD integration ensures that every API specification change is validated before it can be merged.

#### §7.3.1 GitHub Actions Integration

```yaml
# .github/workflows/api-lint.yaml
name: API Spec Lint
on:
  pull_request:
    paths:
      - 'api/**/*.yaml'
      - 'api/**/*.yml'
jobs:
  spectral:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install Spectral
        run: npm install -g @stoplight/spectral-cli
      - name: Lint OpenAPI specs
        run: |
          spectral lint api/openapi.yaml \
            --ruleset .spectral.yaml \
            --format json \
            --output spectral-results.json
      - name: Check for PII-in-URL violations
        run: |
          violations=$(jq '[.[] | select(.code | startswith("no-pii"))] | length' spectral-results.json)
          if [ "$violations" -gt 0 ]; then
            echo "::error::$violations PII-in-URL violation(s) found in API spec"
            jq -r '.[] | select(.code | startswith("no-pii")) | "::error file=\(.source),line=\(.range.start.line)::\(.message)"' spectral-results.json
            exit 1
          fi
```

This workflow runs on every PR that touches API spec files, produces GitHub annotation errors on the exact lines where PII appears in URL parameters, and blocks the PR from merging until the violations are fixed.

#### §7.3.2 PR Review Automation

Beyond CI failures, automated PR review can provide contextual guidance:

- **Bot comments** on PR diffs that introduce PII in URL parameters, suggesting the corrective pattern (POST body, opaque ID, etc.).
- **Approval requirements** for API design changes — at least one reviewer from the API governance or security team must approve changes to API contracts.
- **Change classification** — automatically tag PRs as "API design change" when they modify OpenAPI spec files, ensuring they receive appropriate review.

#### §7.3.3 Pre-Commit Hooks

For teams that use pre-commit hooks:

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/stoplightio/spectral
    rev: v6.11.1
    hooks:
      - id: spectral
        args: ['lint', '--ruleset', '.spectral.yaml', '--fail-severity', 'error']
        files: 'api/.*\.ya?ml$'
```

This catches violations at the developer's workstation before they even commit.

---

### §7.4 API Inventory and Deprecation Discipline

Design-time governance requires knowing what APIs exist and what data they handle.

#### §7.4.1 Endpoint Inventory

Maintain a machine-readable catalog of all API endpoints, including:

- **Endpoint URL pattern** (e.g., `/api/v1/users/{id}`)
- **HTTP methods** supported
- **PII classification** of each path and query parameter
- **Current status** (active, deprecated, sunset)
- **Sunset date** (if deprecated)
- **Owner** (team responsible)

This inventory serves as the foundation for:
- Compliance audits ("show me all endpoints that accept PII in URLs")
- Migration planning ("which deprecated endpoints still have active consumers?")
- Risk assessment ("what is the blast radius if this endpoint's logs are leaked?")

#### §7.4.2 Deprecation and Sunset Discipline

When migrating away from PII-bearing endpoints (see §9 for the full migration playbook), the design-time governance layer must:

1. **Mark the endpoint as deprecated** in the OpenAPI spec:
   ```yaml
   deprecated: true
   x-sunset: "2026-09-30"
   x-deprecation-reason: "PII in query parameter — use POST /api/v1/users/lookup instead"
   x-replacement: "/api/v1/users/lookup"
   ```

2. **Emit Sunset headers** at runtime (operational enforcement, complementing the design-time deprecation):
   ```
   Sunset: Sat, 30 Sep 2026 00:00:00 GMT
   Link: </api/v1/users/lookup>; rel="successor-version"
   Deprecation: true
   ```

3. **Track consumer adoption** — monitor which clients still call the deprecated endpoint and proactively notify them.

---

### §7.5 Exception Handling and Approval Workflows

Not every case of PII in URLs can be eliminated immediately. Legacy partner integrations, third-party webhook contracts, and regulatory reporting formats may require PII in URL parameters as a transitional measure.

#### §7.5.1 Exception Request Process

An exception workflow should require:

1. **Justification** — why PII must appear in the URL (technical constraint, partner requirement, regulatory mandate).
2. **Risk assessment** — what PII is exposed, through which surfaces, to which intermediaries.
3. **Compensating controls** — log redaction, rate limiting, IP allowlisting, short retention periods.
4. **Time limit** — exceptions should be temporary, with a deadline for remediation.
5. **Approval** — data protection officer or security architect sign-off.
6. **Documentation** — the exception is recorded in the API inventory with its justification and expiry date.

#### §7.5.2 Exception Manifest

Maintain an exception manifest alongside the OpenAPI spec:

```yaml
# api-exceptions.yaml
exceptions:
  - endpoint: "GET /api/v1/partners/{partner_id}/users"
    parameter: "email"
    location: query
    justification: "Partner integration requires email-based lookup (contractual obligation until 2026-12-31)"
    compensating_controls:
      - "Log redaction on API gateway (§6.1)"
      - "IP allowlist to partner CIDR only"
      - "90-day log retention with automatic purge"
    approved_by: "security-team"
    approved_date: "2026-01-15"
    expires: "2026-12-31"
```

This manifest is itself subject to CI enforcement: if an exception has expired, the build fails.

---

### §7.6 Summary

| Design-Time Control | Risk Addressed | Enforcement Point |
|:--------------------|:---------------|:------------------|
| Field sensitivity classification | Unclear data boundaries in API specs | OpenAPI extensions (`x-sensitivity`) |
| Linting rules (name + format + extension) | PII in path/query parameters passes review | Spectral / Redocly in CI |
| CI/CD policy gates | Unreviewed API changes reach production | GitHub Actions, pre-commit hooks |
| API inventory | Unknown endpoints carrying PII | Machine-readable catalog |
| Deprecation discipline | Legacy endpoints persist indefinitely | OpenAPI `deprecated` + Sunset headers |
| Exception workflow | Uncontrolled deviations from policy | Exception manifest with expiry dates |

The design-time governance layer is the single most cost-effective investment in PII protection: it catches violations at the cheapest possible point in the development lifecycle, before any code is deployed, before any logs are written, and before any data is exposed.

---

## 8. Protocol and Deployment Contexts

This chapter is intentionally **contextual**, not foundational. The default answer to personal data exposure in URLs is still architectural correction: remove personal data from the URL, use opaque identifiers, and shift lookup-by-PII workflows into bodies or bounded token flows. Protocol and deployment mechanisms matter because they can reduce exposure or replace identity-in-URL patterns in specific situations, but they do not replace the underlying design correction.

The primary problem examined in this document is still **REST-style HTTP APIs where path segments and query parameters become durable leak surfaces**. This chapter broadens the view slightly by showing where protocol and deployment context changes that exposure model, where it does not, and where mechanisms such as mTLS, HTTP Message Signing, and PAR are genuinely useful.

This chapter covers three protocol mechanisms and one deployment/applicability synthesis section:

- **§8.1 — HTTP Message Signing (RFC 9421):** Cryptographic integrity over selected request components, preventing tampering with PII-bearing parameters.
- **§8.2 — Mutual TLS for Identity:** Using client certificates to establish identity in bounded B2B/M2M cases, reducing the need to pass PII-as-credential in URLs.
- **§8.3 — OAuth 2.0 Pushed Authorization Requests (RFC 9126):** Moving authorization parameters from the URL query string to a direct server-to-server POST, eliminating PII leakage through browser redirects.
- **§8.4 — Other Protocols, Deployment Models, and Pattern Selection:** Clarifying where the URL leakage model applies across REST, GraphQL, gRPC, WebSocket, SOAP, and service-mesh-backed deployments, then showing how to choose the right bounded mechanism.

A critical theme across all of this material: these mechanisms solve *different* aspects of the problem. Signing provides integrity but not confidentiality. mTLS can replace identity-in-URL in the right deployment model but does not solve business-data PII. PAR protects browser-visible authorization parameters, not arbitrary API calls. None is a complete solution on its own.

```mermaid
%%{init: {themeVariables: {'fontFamily': 'sans-serif'}}}%%
flowchart TD
    subgraph PII["PII Exposure Vectors in URLs"]
        direction LR
        V1["Tampering<br/>with parameters"]
        V2["PII-as-credential<br/>in URL path/query"]
        V3["PII leakage via<br/>browser redirects"]
    end

    subgraph SOL["Protocol-Level Solutions (§8)"]
        direction TB
        S1["§8.1 HTTP&nbsp;Message&nbsp;Signing<br/>RFC&nbsp;9421"]
        S2["§8.2 Mutual&nbsp;TLS&nbsp;(mTLS)"]
        S3["§8.3 Pushed&nbsp;Authorization&nbsp;Requests<br/>RFC&nbsp;9126"]
    end

    subgraph PROP["Properties Provided"]
        direction LR
        P1["✅ Integrity<br/>❌ Confidentiality"]
        P2["✅ Identity&nbsp;binding<br/>❌ URL&nbsp;parameter&nbsp;hiding"]
        P3["✅ Confidentiality&nbsp;for<br/>auth parameters"]
    end

    V1 --> S1
    V2 --> S2
    V3 --> S3

    S1 --> P1
    S2 --> P2
    S3 --> P3
```

---

### §8.1 HTTP Message Signing

#### §8.1.1 The Problem: Integrity of PII-Bearing Parameters

HTTP Message Signing is a **bounded integrity control**, not a primary remediation pattern. If the goal is to stop personal data from appearing in URLs, architectural correction remains the first answer. Message signing becomes relevant when a system still has to carry sensitive request components and needs proof that they were not modified in transit or by intermediaries.

When PII travels in URL query parameters — even when the connection is encrypted with TLS — it is vulnerable to tampering at every point where the URL is exposed in cleartext: server logs, proxy logs, browser history, referrer headers, and analytics tools. TLS protects the data *in transit* between two endpoints but does nothing to prevent an intermediary or logging system from recording and later modifying the parameters.

Consider an API that accepts a tax identifier in a query parameter:

```
GET /api/v1/records?tax_id=SK1234567890&jurisdiction=sk HTTP/1.1
Host: api.example.com
```

An attacker with access to logs or an intermediary system could swap the `tax_id` value for a different one, replay the request, or modify the `jurisdiction` to escalate access. The victim has no way to detect that the parameters were altered after the request left their browser.

HTTP Message Signatures (RFC 9421) address this by allowing the client to cryptographically sign selected components of an HTTP request — including the method, path, query parameters, and headers — with a private key. The verifier validates the signature with the corresponding public key, confirming that the signed components were not tampered with since the signature was applied.

```mermaid
%%{init: {sequence: {actorMargin: 250, messageMargin: 60}, themeVariables: {noteBkgColor: "transparent", noteBorderColor: "transparent"}}}%%
sequenceDiagram
    autonumber
    participant C as Client
    participant V as Verifier (API Server)

    rect rgba(52, 152, 219, 0.14)
        Note over C: Signing Phase
        C->>C: Select covered components (@method, @path, @query-params)
        C->>C: Build canonical signature base
        C->>C: Sign with private key (Ed25519 / ECDSA P-256)
        C->>C: Attach Signature-Input + Signature headers
        Note right of V: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end

    rect rgba(46, 204, 113, 0.14)
        Note over C, V: Transmission
        C->>V: GET /api/records?tax_id=SK1234... HTTP/1.1
        Note right of V: Signature-Input + Signature headers included
        Note right of V: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end

    rect rgba(241, 196, 15, 0.14)
        Note over V: Verification Phase
        V->>V: Reconstruct signature base from received components
        V->>V: Look up public key by keyid
        V->>V: Verify signature
        alt Signature valid
            V-->>C: 200 OK (process request)
        else Signature invalid or missing component
            V-->>C: 401 Unauthorized (tampering detected)
            Note right of V: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
        end
        Note right of V: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
```

<details><summary><strong>1. Client selects covered components (@method, @path, @query-params)</strong></summary>

The client begins the signing process by deciding which components of the HTTP request to include in the signature. RFC 9421 allows the signer to be selective — they choose exactly which derived components (prefixed with `@`, such as `@method`, `@path`, `@query-params`) and which HTTP headers to cover. This selectivity is essential for PII protection: the client can target the specific query parameters that carry sensitive data without needing to sign every header (many of which are added or modified by intermediaries and would cause spurious verification failures).

For a request that carries a tax identifier in the query string, the client selects:

- **`@method`** — Binds the signature to the HTTP method, preventing method-confusion attacks where an attacker re-sends a GET request as a DELETE.
- **`@path`** — Binds the signature to the request path, preventing path-traversal or path-substitution attacks.
- **`@query-params`;name="tax_id";name="jurisdiction"`** — Binds the signature to the specific named query parameters that carry PII and jurisdiction context. If an attacker adds, removes, or modifies either parameter, the signature will not verify.

The client does **not** sign the full `@query` string because intermediaries (CDNs, load balancers, analytics tags) may legitimately append non-sensitive parameters (e.g., `utm_source`, `cache_bust`). Signing only the PII-bearing parameters allows intermediaries to add their own parameters without breaking the signature — a practical requirement for real-world deployments.

</details>

<details><summary><strong>2. Client builds canonical signature base</strong></summary>

With the covered components selected, the client constructs a deterministic string called the **signature base** — the exact byte sequence that will be signed. RFC 9421 specifies a strict canonicalisation process to ensure that both signer and verifier produce an identical byte sequence from the same components, regardless of implementation differences.

The signature base for a GET request carrying PII in query parameters looks like this:

```
"@method": GET
"@path": /api/v1/records
"@query-params": tax_id=SK1234567890&jurisdiction=sk
"@signature-params": ("@method" "@path" "@query-params";name="tax_id";name="jurisdiction");created=1618884475;keyid="client-key-42"
```

Each component appears on its own line, prefixed with the component name in double quotes, followed by a colon and a space, then the component's value extracted from the HTTP message. The critical last line — `@signature-params` — is the signature metadata itself (the component list, creation timestamp, and key identifier). Including it in the signed data binds the signature to its own metadata: an attacker cannot swap the component list or the `keyid` after the fact without invalidating the signature.

Derived component values are extracted from the HTTP message according to the RFC's rules: `@method` yields the uppercase HTTP method, `@path` yields the URI path component, and `@query-params` with `name=` selectors yields only the values of the named parameters, sorted and joined with `&`. This deterministic extraction is what makes the signature portable — any compliant verifier can reconstruct the same byte sequence from the received message.

</details>

<details><summary><strong>3. Client signs with private key (Ed25519 / ECDSA P-256)</strong></summary>

The client signs the canonical signature base using its private key. RFC 9421 supports multiple signature algorithms; Ed25519 and ECDSA P-256 are the most common choices for API authentication:

| Algorithm | Key Size | Signature Size | Notes |
|:----------|:---------|:---------------|:------|
| Ed25519 | 32 bytes (private) | 64 bytes | Fastest to compute and verify; recommended by RFC 9421 |
| ECDSA P-256 (ES256) | 32 bytes (private) | 64 bytes | Widely supported; JWT ecosystem standard |
| RSASSA-PSS (PS256) | 2048+ bits (private) | 256+ bytes | Slower; used for compatibility with RSA infrastructure |
| HMAC-SHA256 | 256-bit shared secret | 32 bytes | Symmetric — only for pre-shared key scenarios |

The client computes `signature = Sign(private_key, signature_base)` using the algorithm identified in the `Signature-Input` header. The resulting signature bytes are base64url-encoded and placed in the `Signature` header.

Key management is a critical operational concern. The private key must be stored securely — in a hardware security module (HSM), a cloud KMS, or a dedicated secrets store — and must never be exposed to the application layer in cleartext. Key rotation must be handled gracefully: the verifier must retain access to old public keys until all signatures created with the corresponding private keys have expired, while the signer must begin using the new key for new signatures.

</details>

<details><summary><strong>4. Client attaches Signature-Input + Signature headers</strong></summary>

The client adds two headers to the HTTP request:

**`Signature-Input`** — Declares the covered components and signing metadata:

```http
Signature-Input: sig1=("@method" "@path"
  "@query-params";name="tax_id";name="jurisdiction");
  created=1618884475;keyid="client-key-42";alg="ed25519"
```

The value follows the structured field syntax defined in RFC 8941. The label `sig1` is an arbitrary identifier that links this signature input to its corresponding signature value. The component list is enclosed in parentheses, each query parameter selector uses the `name=` sub-parameter, and the metadata fields (`created`, `keyid`, `alg`) provide the verifier with everything it needs to validate the signature.

**`Signature`** — Carries the base64url-encoded signature value:

```http
Signature: sig1=:d2VpcmRzdHVmZi1leGFtcGxlLXNpZ25hdHVyZQ==:
```

The signature value is enclosed in colons (`:`) following the RFC 8941 Byte Sequence syntax. The label `sig1` matches the label in `Signature-Input`, binding the two headers together.

The complete signed request now looks like:

```http
GET /api/v1/records?tax_id=SK1234567890&jurisdiction=sk HTTP/1.1
Host: api.example.com
Signature-Input: sig1=("@method" "@path"
  "@query-params";name="tax_id";name="jurisdiction");
  created=1618884475;keyid="client-key-42";alg="ed25519"
Signature: sig1=:d2VpcmRzdHVmZi1leGFtcGxlLXNpZ25hdHVyZQ==:
```

The PII (`tax_id=SK1234567890`) is still visible in the URL — HTTP Message Signing provides integrity, not confidentiality. The signature proves the parameter was placed by a key holder and has not been modified, but it does nothing to hide the value from logs, browser history, or referrer headers. This is why signing must be combined with other patterns (POST body migration, tokenization) for full PII protection.

</details>

<details><summary><strong>5. Client sends signed request to Verifier (API Server)</strong></summary>

The client transmits the signed HTTP request to the API server over TLS. The request includes the PII-bearing query parameters and the two signature headers (`Signature-Input` and `Signature`). The TLS layer provides transport-level confidentiality — the request is encrypted between the client and the TLS terminator — but the signature provides *message-level* integrity that persists beyond TLS termination.

This distinction is crucial. If the TLS connection terminates at a reverse proxy or load balancer, the request is decrypted at that point and forwarded to the backend in cleartext. Without message signing, any component of the request could be modified at this point — a compromised proxy could change the `tax_id` parameter before forwarding to the backend, and the backend would have no way to detect the tampering. With message signing, the signature survives the TLS termination: the backend verifier reconstructs the signature base from the received components and validates the signature, detecting any modifications made after the client applied the signature.

The `created` timestamp in `Signature-Input` enables replay detection. The verifier can reject signatures that are too old (e.g., older than 5 minutes), preventing an attacker from capturing and re-sending a valid signed request. However, RFC 9421 does not mandate nonce-based replay protection — verifiers must implement their own replay-detection logic (e.g., tracking recently seen `(keyid, created)` pairs in a short-lived cache).

</details>

<details><summary><strong>6. Verifier (API Server) reconstructs signature base from received components</strong></summary>

Upon receiving the request, the verifier parses the `Signature-Input` header to learn which components were covered by the signature. It then extracts the values of those components from the received HTTP message and reconstructs the canonical signature base — the same deterministic byte sequence that the client built in Step 2.

The verifier must follow the exact same canonicalisation rules specified in RFC 9421: lowercased header names, sorted query parameter selectors, and the `@signature-params` line appended as the final entry. Any deviation in canonicalisation logic between signer and verifier will cause the signature to fail, even if no tampering occurred. This is why RFC 9421 is precise about byte-level details such as trailing whitespace handling, case normalisation, and parameter ordering.

If the request was modified in transit — for example, a proxy added or removed a query parameter, or a header value was altered — the reconstructed signature base will differ from the original. The verifier does not yet know whether the signature is valid; it simply builds the byte sequence that will be fed to the verification algorithm.

</details>

<details><summary><strong>7. Verifier looks up public key by keyid</strong></summary>

The verifier extracts the `keyid` from the `Signature-Input` header (`"client-key-42"` in this example) and uses it to retrieve the signer's public key from a trusted key repository. The key distribution mechanism is not defined by RFC 9421 — it is an operational concern that implementations must solve. Common approaches:

- **JWKS endpoint:** The verifier fetches the public key from a well-known JSON Web Key Set (JWKS) endpoint, typically published by the client's identity provider. This is the standard approach in OAuth 2.0 and OpenID Connect ecosystems.
- **Pre-shared keys:** In service-to-service communication, public keys are distributed out-of-band (configuration files, secret management systems) and cached locally. This avoids runtime key lookups but requires coordination on key rotation.
- **Certificate-based:** The `keyid` references an X.509 certificate, and the verifier validates the certificate chain against a trusted CA. This integrates with existing PKI infrastructure.

The verifier must handle key-not-found gracefully. If the `keyid` does not correspond to a known public key, the request must be rejected with `401 Unauthorized` — proceeding without verification would mean accepting an unsigned or unverified request. Key caching with a short TTL (e.g., 5–15 minutes) reduces lookup latency and mitigates denial-of-service attacks that would force the verifier to make network calls for every request.

</details>

<details><summary><strong>8. Verifier verifies signature</strong></summary>

The verifier feeds the reconstructed signature base and the retrieved public key into the signature verification algorithm (the same algorithm identified by the `alg` parameter in `Signature-Input`). The algorithm computes an expected signature from the signature base and compares it to the value provided in the `Signature` header:

```
expected = Verify(public_key, signature_base, received_signature)
```

If the computed value matches the received signature, verification succeeds — proving that the holder of the private key corresponding to `client-key-42` signed these exact components at the indicated time, and no covered component has been modified since. If any covered component was altered (query parameter changed, HTTP method swapped, path modified), the reconstructed signature base differs from what was signed, and verification fails.

The verifier also checks the `created` timestamp against its freshness window. If the signature was created more than N minutes ago (where N is a policy decision — typically 2–10 minutes for API authentication), the verifier rejects the request as potentially replayed, even if the cryptographic signature is valid. This replay protection is essential because an intercepted signed request is valid indefinitely without a freshness check.

</details>

<details><summary><strong>9. Verifier returns 200 OK — process request</strong></summary>

If the signature is cryptographically valid, all covered components are present, and the `created` timestamp is within the freshness window, the verifier accepts the request and passes it to the application handler. The response is `200 OK` (or whatever status code the business logic dictates).

At this point, the verifier has confirmed three properties:

1. **Integrity:** The signed components (`@method`, `@path`, `@query-params`) have not been tampered with since the client signed them.
2. **Authenticity:** The signature was produced by the holder of the private key identified by `client-key-42`.
3. **Freshness:** The signature was created recently (within the allowed time window), making replay attacks impractical.

Note that the verifier has **not** confirmed confidentiality — the `tax_id` value `SK1234567890` is still visible in the URL and will be logged by any intermediary that records the request line. The signature proves the value is authentic and untampered, but does nothing to hide it. For PII protection, this signing step must be paired with patterns that provide confidentiality: moving PII to the POST body (§3), replacing it with opaque tokens (§4), or encrypting it at the field level (§5).

</details>

<details><summary><strong>10. Verifier returns 401 Unauthorized — tampering detected</strong></summary>

If the signature does not verify, any covered component is missing from the request, or the `created` timestamp is outside the freshness window, the verifier rejects the request with `401 Unauthorized`. The response body should include enough detail for the client to diagnose the issue without revealing information useful to an attacker:

```http
HTTP/1.1 401 Unauthorized
Content-Type: application/problem+json

{
  "type": "https://.rfc-editor.org/rfc/rfc9421#verification-failed",
  "title": "Signature Verification Failed",
  "detail": "Signature verification failed: covered component '@query-params' (name='tax_id') does not match signed value",
  "status": 401
}
```

Common causes of verification failure:

- **Parameter tampering:** A query parameter was modified after signing (the most security-relevant case — it indicates an active attack or a buggy intermediary).
- **Missing component:** A header or derived component listed in `Signature-Input` is not present in the received request. This can happen when an intermediary strips headers (e.g., a CDN removing `Authorization`) or when the request is malformed.
- **Expired signature:** The `created` timestamp is too old. The client should generate a fresh signature with a current timestamp and retry.
- **Unknown key:** The `keyid` does not reference a known public key. The client may be using a rotated key that the verifier has not yet loaded.
- **Algorithm mismatch:** The `alg` parameter in `Signature-Input` does not match the algorithm the verifier expects for the given key. This can indicate a configuration error or a downgrade attack.

The verifier must not proceed with processing the request when signature verification fails — even if the request appears otherwise valid. A failed signature means the integrity guarantee is broken, and the request cannot be trusted.

</details>

#### §8.1.2 How HTTP Message Signatures Work

RFC 9421 defines a mechanism for creating, encoding, and verifying digital signatures over individual components of an HTTP message. The key insight is that the signer does not need to know or sign the *entire* message — they select specific components (called "covered components") and sign only those. This is essential for PII protection: a client can sign the query parameters containing PII without needing access to intermediary-added headers or transformed body content.

The mechanism uses two HTTP header fields:

- **`Signature-Input`:** Declares which components are covered by the signature, along with metadata such as the creation timestamp and key identifier.
- **`Signature`:** Contains the actual cryptographic signature value.

A concrete example from the RFC:

```http
POST /foo?param=value&pet=dog HTTP/1.1
Host: example.com
Date: Tue, 20 Apr 2021 02:07:55 GMT
Content-Type: application/json
Content-Length: 18
Signature-Input: sig1=("@method" "@authority" "@path"
  "content-type" "content-length");created=1618884475;
  keyid="test-key"
Signature: sig1=:Base64SignatureGoesHere=:

{"hello": "world"}
```

The `Signature-Input` header tells the verifier: "I am signing the HTTP method, the authority (host and port), the path, the content-type header, and the content-length header." The `Signature` header carries the base64-encoded signature produced by signing a deterministic serialization of those components.

#### §8.1.3 Creating the Signature Base

The client builds a canonical "signature base" string from the selected components. Each component appears on its own line with the component name in quotes, followed by a colon and the value:

```
"@method": POST
"@authority": example.com
"@path": /foo
"content-type": application/json
"content-length": 18
"@signature-params": ("@method" "@authority" "@path"
  "content-type" "content-length");created=1618884475;
  keyid="test-key"
```

The last line — `@signature-params` — is itself included in the signature base, which binds the signature to its own metadata (the list of covered components, creation time, and key ID). This prevents an attacker from swapping the signature parameters after the fact.

The client then signs this signature base with their private key using one of the supported algorithms (ECDSA P-256, Ed25519, RSASSA-PSS, HMAC-SHA256, etc.) and places the result in the `Signature` header.

#### §8.1.4 Verifying the Signature

The verifier reconstructs the signature base from the received message, using the component list declared in `Signature-Input`. It then validates the signature using the public key identified by `keyid`. If any covered component was modified — the query parameter changed, a header altered, the HTTP method swapped — the reconstructed signature base will differ from what was signed, and verification will fail.

#### §8.1.5 Component Identifiers: What Can Be Signed

RFC 9421 defines two categories of signable components:

**HTTP Headers:** Any header field from the request or response. Header names are always lowercased in the signature base. For example, `"content-type"`, `"authorization"`, `"x-request-id"`.

**Derived Components:** Special identifiers prefixed with `@` that reference structural parts of the HTTP message:

| Identifier | Value Signed |
|:-----------|:-------------|
| `@method` | HTTP method (GET, POST, PUT, DELETE, etc.) |
| `@target-uri` | Full request URI (scheme, authority, path, query) |
| `@authority` | Host and port (e.g., `api.example.com:443`) |
| `@scheme` | URI scheme (`http` or `https`) |
| `@path` | Request path (e.g., `/api/v1/records`) |
| `@query` | Full query string (e.g., `tax_id=SK1234567890&jurisdiction=sk`) |
| `@query-params` | Individual query parameters (see below) |
| `@status` | HTTP response status code (for signing responses) |

#### §8.1.6 Signing Query Parameters with `@query-params`

For PII in URL query strings, the `@query-params` derived component is particularly relevant. It allows signing individual named query parameters, ensuring that specific PII-bearing parameters cannot be tampered with:

```http
Signature-Input: sig1=("@method" "@path"
  "@query-params";name="tax_id";name="jurisdiction");
  created=1618884475;keyid="client-key-42"
```

This signs only the `tax_id` and `jurisdiction` query parameters. If an attacker adds, removes, or modifies any of these parameters, verification will fail. The signer can be selective — signing only the parameters that carry sensitive data, while leaving unsigned parameters (like pagination cursors or filter flags) free to be modified by intermediaries.

#### §8.1.7 Signing the Request Body

The request body is not signed directly. Instead, the client calculates a cryptographic hash of the body using the `Content-Digest` header (defined in RFC 9530) and then signs that header:

```http
Content-Digest: sha-256=:X48E9qOokqqrvdts8nOJRJN3OWDUoyWxBf7kbu9DBPE=:
Signature-Input: sig1=("@method" "@path" "@query-params";
  name="tax_id" "content-digest");created=1618884475;keyid="client-key-42"
```

If the body is tampered with, the digest won't match, and signature verification fails. This indirect approach avoids the need to include the full body in the signature base, which could be prohibitively large.

#### §8.1.8 Signing vs. Encryption: Different Problems

A common misconception is that HTTP Message Signatures provide confidentiality. They do not. The RFC is explicit in its abstract:

> Message signatures provide message integrity over the covered message components but do not provide any confidentiality for communication between parties. (RFC 9421)

Signing and encryption solve fundamentally different problems:

| Property | HTTP Message Signing | TLS / Field-Level Encryption |
|:---------|:---------------------|:-----------------------------|
| **Integrity** | ✅ Proves components were not tampered with | ✅ (via TLS MAC) |
| **Confidentiality** | ❌ Signed data remains readable | ✅ Data is encrypted |
| **Non-repudiation** | ✅ Private key proves origin | ❌ (TLS provides transport-only) |
| **Tamper detection after TLS termination** | ✅ Signature persists | ❌ Cleartext after termination |
| **Protection in logs** | ❌ PII still visible in logs | ❌ (unless encrypted at rest) |
| **Protection in browser history** | ❌ URL remains in history | ❌ (unless PII removed from URL) |

For PII protection specifically, signing is most valuable when combined with other patterns:

1. **Signing + POST body migration:** Move PII from the URL to the POST body (§4.1), then sign the body (via `Content-Digest`) and the method/path. This provides both confidentiality (PII is no longer in the URL) and integrity (the body cannot be tampered with).

2. **Signing + opaque identifiers:** Replace PII in the URL with opaque tokens (§4.3), then sign the token parameter. This prevents token substitution attacks.

3. **Signing + tokenization:** Use tokenized values in URLs (§6), then sign the tokenized parameters. The signature proves the token was issued by a trusted party and has not been altered.

#### §8.1.9 Implementations and Libraries

Several mature implementations of RFC 9421 are available:

| Library | Language | Notes |
|:--------|:---------|:------|
| `http-message-signatures` | JavaScript/TypeScript | Maintained by the IETF HTTPbis working group contributors |
| `http-signing` | Python | Apache 2.0 licensed, supports ECDSA and Ed25519 |
| `http-message-signatures` | Java (Authlete) | Production-grade, used in FAPI 2.0 implementations |
| `http-message-signatures` | Go | Community-maintained, supports Ed25519 and ECDSA |
| curl (experimental) | C | Native support discussed for libcurl |

FAPI 2.0 Security Profile (defined by the OpenID Foundation) mandates HTTP Message Signatures for client-to-AS and client-to-RS communication, which has accelerated library adoption in the identity and open banking ecosystems.

#### §8.1.10 Limitations for PII Protection

Despite its strengths, HTTP Message Signing has several important limitations in the context of PII protection:

1. **Signed PII is still visible.** A signature proves that `tax_id=SK1234567890` was not tampered with, but the value `SK1234567890` is still present in the URL in cleartext. It appears in server logs, proxy logs, browser history, and referrer headers. Signing does nothing to hide the PII from these exposure surfaces.

2. **No protection at rest.** Once a signed request is logged, the PII is stored in cleartext alongside the signature. The signature is useful for proving the log entry is authentic, but the PII itself must still be protected through other means (log redaction, encryption at rest, retention policies).

3. **Key distribution complexity.** The verifier must have access to the signer's public key, typically via a key directory or JWKS endpoint. Key rotation adds operational complexity — old signatures must still be verifiable with old keys while new signatures use the current key.

4. **Replay attacks.** RFC 9421 signatures include a `created` timestamp but do not define a mandatory nonce mechanism. Verifiers must implement their own replay detection (e.g., short validity windows, nonce tracking) to prevent request replay.

5. **Selective signing creates ambiguity.** If a client signs `@method` and `@path` but not `@query`, an attacker can modify query parameters without invalidating the signature. API designers must carefully choose which components to sign — missing a PII-bearing parameter from the signature creates a false sense of security.

#### §8.1.11 Best Practices

When using HTTP Message Signatures as part of a PII protection strategy:

- **Always combine with another confidentiality mechanism.** Signing alone is insufficient — pair it with POST body migration, tokenization, or field-level encryption to actually hide the PII.
- **Sign all PII-bearing query parameters.** Use `@query-params` with explicit `name=` parameters to ensure every sensitive parameter is covered. Do not rely on `@query` alone, as it signs the entire query string including non-sensitive parameters that intermediaries might legitimately modify.
- **Include `@method` and `@path` in every signature.** These are cheap to sign and prevent method-confusion and path-traversal attacks.
- **Sign `content-digest` for POST/PUT requests.** If PII is in the request body, sign the body hash to prevent tampering.
- **Use short-lived keys with automated rotation.** Ed25519 keys are ideal — they are small (32 bytes), fast to generate, and have a compact signature format (64 bytes).
- **Implement replay protection at the verifier.** Track recently seen `(keyid, created)` pairs and reject duplicates within a short window.

---

### §8.2 Mutual TLS for Identity

Mutual TLS is a **contextual identity pattern**, not the general default answer to PII in URLs. It is strongest where the problem is "the caller's identity is currently being carried in the URL" and the deployment model is already certificate-friendly — especially B2B and machine-to-machine integrations. It is much less helpful for business-data PII carried as part of the request itself.

#### §8.2.1 The Problem: PII-as-Credential in URLs

Many APIs use PII as an implicit credential or identifier in URLs. The most common pattern is embedding an email address, tax identifier, or national ID in the URL path or query string so the backend can look up the associated resource:

```
GET /api/v1/customers/jane.doe@example.com/orders HTTP/1.1
GET /api/v1/citizens?tax_id=SK1234567890 HTTP/1.1
GET /api/v1/accounts?iban=SK1234567890123456789012 HTTP/1.1
```

The PII in these URLs serves as an identifier, but its presence creates multiple problems: it is exposed in logs, browser history, and referrer headers, and it forces the API to accept potentially sensitive identifiers from untrusted sources.

Mutual TLS (mTLS) provides an alternative: instead of identifying the caller by PII embedded in the URL, the client presents an X.509 certificate during the TLS handshake. The backend extracts the caller's identity from the certificate, eliminating the need to pass PII in the URL at all.

#### §8.2.2 How mTLS Establishes Identity

In standard TLS — what every HTTPS connection uses — only the server presents a certificate to prove its identity to the client. The client authenticates the server, but the server does not authenticate the client. Any client that can reach the server can make requests, and the server must rely on other mechanisms (API keys, OAuth tokens, embedded PII) to identify the caller.

Mutual TLS extends this by requiring the *client* to also present an X.509 certificate during the TLS handshake. Both parties authenticate each other before any application data is exchanged:

1. **TLS handshake begins.** The client connects to the server and the server presents its certificate (standard TLS).
2. **CertificateRequest.** The server sends a `CertificateRequest` message, indicating that the client must present a certificate. The server specifies which certificate authorities (CAs) it trusts.
3. **Client certificate.** The client presents its X.509 certificate. This certificate was previously issued by a CA that the server trusts (or was pre-shared directly with the server).
4. **Certificate verification.** The server validates the client certificate: it checks the signature chain, expiration date, revocation status (via CRL or OCSP), and optionally the certificate's Subject Alternative Name (SAN) or Subject DN.
5. **Key exchange.** Both sides complete the TLS key exchange, and the connection is encrypted with mutual authentication established.
6. **Application request.** The client sends its HTTP request over the mutually-authenticated TLS channel.

From the application's perspective, the client's identity is available in the TLS session metadata. The backend can extract the identity from the certificate — without the client ever sending PII in the URL.

```mermaid
%%{init: {sequence: {actorMargin: 250, messageMargin: 60}, themeVariables: {noteBkgColor: "transparent", noteBorderColor: "transparent"}}}%%
sequenceDiagram
    autonumber
    participant C as Client
    participant P as TLS Terminator (Proxy)
    participant S as Backend API

    rect rgba(52, 152, 219, 0.14)
        Note over C, P: Mutual TLS session establishment
        C->>P: TLS handshake starts
        P-->>C: Server certificate presented
        C->>P: Client certificate presented
        P->>P: Validate certificate and extract identity
        Note right of S: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end

    rect rgba(241, 196, 15, 0.14)
        Note over C, S: PII-free route and trusted context
        C->>P: GET /api/customers/me/orders HTTP/1.1
        P->>S: Forward route with trusted identity headers
        S->>S: Resolve "me" from certificate identity
        S-->>P: 200 OK (orders data)
        P-->>C: 200 OK (orders data)
        Note right of S: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
```

<details><summary><strong>1. The client initiates the TLS handshake with the terminator</strong></summary>

The client opens the TLS session to the proxy or terminator that is enforcing mutual authentication. At this point the application has not sent any URL-borne identity data yet.

</details>

<details><summary><strong>2. The terminator presents its server certificate</strong></summary>

The client validates the server side of the connection first, exactly as in ordinary HTTPS. This preserves the normal guarantee that the client is talking to the intended API endpoint.

</details>

<details><summary><strong>3. The client presents its own certificate</strong></summary>

The client responds with a certificate chaining to a CA the terminator trusts. This is the moment where caller identity moves into the TLS layer instead of the URL.

</details>

<details><summary><strong>4. The terminator validates the certificate and extracts identity</strong></summary>

The terminator checks the chain, freshness, and revocation state, then binds the verified identity to the connection context. In modern deployments that identity should come from SAN entries such as SPIFFE URIs, service DNS names, or other opaque workload identifiers where possible.

</details>

<details><summary><strong>5. The client sends a PII-free application route</strong></summary>

The request uses a route such as `/api/customers/me/orders` rather than embedding a direct identifier like an email address in the path. That is the narrow privacy benefit mTLS provides in this document.

</details>

<details><summary><strong>6. The terminator forwards the route with trusted identity context</strong></summary>

If TLS terminates at a proxy, the backend receives the request together with trusted certificate-derived identity context, typically via internal headers or session metadata that only the terminator may inject.

</details>

<details><summary><strong>7. The backend resolves the context-relative alias</strong></summary>

The application maps a route like `/customers/me/orders` to the verified caller identity rather than reading identity from the URL itself. This is where identity-in-URL is replaced by identity-from-certificate.

</details>

<details><summary><strong>8. The backend returns the response to the terminator</strong></summary>

The business response flows back over the trusted internal path. mTLS has helped with caller identity, but it has not changed the need to keep response bodies, logs, and headers free of unnecessary personal data.

</details>

<details><summary><strong>9. The terminator returns the response to the client</strong></summary>

The client receives the response over the authenticated TLS channel. The broader privacy outcome still depends on the rest of the application contract, because mTLS does not protect business-data PII that the API continues to expose elsewhere.

</details>

#### §8.2.3 Deployment Sketch

For this document's purposes, the mTLS flow can be reduced to five decisions:

1. The server requests a client certificate during the TLS handshake.
2. The client presents a certificate chaining to a CA the server trusts.
3. The terminator validates the chain, freshness, and revocation state.
4. The caller identity is extracted from the certificate and bound to the request context.
5. The application uses a context-relative route such as `/customers/me/orders` rather than embedding the caller identity directly in the URL.

That is the useful design takeaway here. The important point is not the handshake choreography itself; it is that the identity proof moves to the TLS layer, which can remove the need to carry caller identity in path segments or query parameters.

#### §8.2.4 Identity Extraction and URL Shape

In modern deployments, the identity should come from the certificate's **Subject Alternative Name (SAN)** rather than the legacy Subject DN. Typical SAN values are:

- **URI** for workload identity, especially SPIFFE-style service identities
- **DNS** for machine identity in controlled internal networks
- **email** only when the deployment genuinely needs person-bound certificate identity

When TLS terminates at a proxy, the proxy typically forwards the verified identity to the backend via internal headers such as `X-Client-Cert-SAN` and a verification flag. That arrangement is acceptable only when the backend trusts those headers exclusively from the terminator's network boundary.

The resulting request shape is the real reason mTLS appears in this chapter:

```http
GET /api/v1/customers/me/orders HTTP/1.1
Host: api.example.com
```

instead of:

```http
GET /api/v1/customers/jane.doe@example.com/orders HTTP/1.1
Host: api.example.com
```

mTLS therefore helps when the URL currently carries **caller identity**. It does not help when the URL carries **business-data PII** that the application still needs as an input parameter.

#### §8.2.5 Certificate Lifecycle as the Main Cost

The real price of mTLS is not conceptual complexity. It is PKI operations:

- **Issuance:** establish who can obtain client certificates and with what identity format
- **Renewal:** automate rotation aggressively enough that expiry becomes routine rather than an outage source
- **Revocation or short TTLs:** decide whether to run CRL/OCSP infrastructure or to prefer very short-lived certificates and automatic re-issuance

This is why mTLS belongs mainly in environments that already have certificate management discipline or a service-identity platform.

#### §8.2.6 Why mTLS Stays Bounded Here

For the problem examined in this document, mTLS should be read as a narrow identity-substitution pattern:

- it is strong for B2B and M2M APIs where the caller's identity would otherwise leak through the URL
- it does not solve search or lookup flows where the parameter itself is personal data
- it does not remove the need for log, trace, and header hygiene after TLS termination
- it can simply relocate personal data if certificates themselves contain email addresses or other direct identifiers

#### §8.2.7 B2B vs. B2C Suitability

mTLS is exceptionally well-suited for B2B (business-to-business) and machine-to-machine (M2M) API communication:

| Factor | B2B / M2M | B2C (Consumer-Facing) |
|:-------|:----------:|:---------------------:|
| Certificate distribution | ✅ Managed centrally, embedded in services | ❌ Requires user-side certificate management |
| User experience | ✅ Invisible to end users | ❌ Installing certificates is user-hostile |
| Device management | ✅ Servers, containers, IoT devices | ❌ Heterogeneous consumer devices |
| Certificate rotation | ✅ Automated via CI/CD or orchestration | ❌ Requires user re-enrollment |
| Identity granularity | ✅ Service-to-service, tenant-to-tenant | ⚠️ Per-user certificates possible but rare |
| Scalability | ✅ Millions of short-lived certificates feasible | ❌ Managing per-user PKI is expensive |
| Regulatory acceptance | ✅ Common in financial services, healthcare | ⚠️ Less common for consumer apps |

In B2B contexts — payment processors connecting to banks, healthcare systems exchanging patient data, SaaS platforms providing API access to enterprise tenants — mTLS is the gold standard for API authentication. The certificate is typically issued during the onboarding process, embedded in the client's infrastructure, and rotated automatically. The PII of the end user never appears in the API URL because the *client* (a trusted organization) is authenticated by certificate, and the end user's identity is carried in the application payload (e.g., OAuth tokens, session cookies).

In B2C contexts, mTLS is rarely practical as the sole authentication mechanism. Consumer-facing APIs typically use OAuth 2.0 or OpenID Connect for authentication, with mTLS optionally layered underneath for additional security (e.g., certificate-bound access tokens per RFC 8705).

#### §8.2.8 Limitations for PII Protection

mTLS is a powerful tool for eliminating PII-as-credential in URLs, but it has important limitations:

1. **Only solves identity-related PII.** mTLS authenticates the *caller*, but it does nothing to protect PII that is part of the business logic. An API that searches for citizens by name still needs to accept the name as a parameter — mTLS does not eliminate that need. The PII moves from "who you are" (identity) to "what you're looking for" (business data), and the latter still needs protection through other patterns.

2. **Certificate contains PII too.** If the SAN includes an email address or other PII, that PII is embedded in the certificate. While the certificate is not exposed in URLs or HTTP logs, it is stored on the client's filesystem and may appear in TLS debug logs, certificate management tooling, and backup systems. For truly privacy-sensitive use cases, the certificate should use opaque identifiers (e.g., SPIFFE URIs, UUID-based CNs) rather than PII.

3. **TLS termination breaks the chain.** If TLS is terminated at a load balancer or reverse proxy (which is common in cloud deployments), the backend application no longer has direct access to the client certificate. Identity must be forwarded via headers, which introduces a trust dependency on the proxy. If the proxy is compromised, the forwarded identity can be forged.

4. **Operational complexity.** Managing a PKI — CA infrastructure, certificate issuance, renewal, revocation, and key storage — is non-trivial. Organizations without existing PKI expertise may find the operational burden of mTLS higher than the benefit of removing PII from URLs, especially when simpler alternatives (OAuth tokens, API keys, opaque identifiers) are available.

5. **No confidentiality for URL parameters.** mTLS authenticates the client, but it does not encrypt or hide URL parameters. If the API still uses query parameters for non-identity PII (e.g., `?search=jane+doe&city=bratislava`), those parameters are still exposed in the same ways as without mTLS.

#### §8.2.9 Best Practices

- **Use opaque identifiers in certificates.** Prefer SPIFFE URIs, UUID-based CNs, or service DNS names over PII (email, national ID) in certificate SANs. This prevents PII from being embedded in the PKI.
- **Issue short-lived certificates automatically.** Use HashiCorp Vault PKI, cert-manager (Kubernetes), or cloud-managed certificate services to automate issuance with TTLs of hours to days.
- **Terminate TLS as close to the application as possible.** If TLS termination at a proxy is unavoidable, use mutual authentication between the proxy and the backend, and restrict access to the `X-Client-Cert-*` forwarding headers to the proxy's network segment.
- **Combine with other PII protection patterns.** Use mTLS for client identity, POST body migration for business-logic PII, and HTTP Message Signing for integrity of the request parameters.
- **Implement certificate pinning for high-value APIs.** For critical B2B integrations, pin the expected client certificate (or its public key) at the server side, rejecting any certificate not explicitly registered.

#### §8.2.10 Privacy Caveat: Identity Relocation ≠ Elimination

> **Caution — Identity Relocation Is Not Privacy Elimination**
>
> mTLS does not *eliminate* personal data from the request path — it *relocates* it. When a certificate contains an email address in a SAN field, that personal data now appears in:

1. **The certificate itself** — stored in PKI issuance records, CT logs, and any certificate inventory.
2. **Proxy-injected headers** — `X-Client-Cert-SAN: email:jane.doe@example.com` is a cleartext header that passes through every hop between the TLS terminator and the application. It is logged, traceable, and visible to any middleware.
3. **Server-side identity resolution logs** — the service that maps the SAN to an internal user record creates an additional persistence point.

In tightly controlled B2B/M2M environments, this relocation may be an acceptable trade-off: the identity data is confined to a smaller blast radius. But it is not a privacy *win* in the same way that replacing an email with an opaque UUID is. For this reason:

- **Prefer workload identity** (SPIFFE URIs, service DNS names, opaque client IDs) over personal identifiers in certificates.
- **Treat email-in-SAN as a controlled edge case**, not the default privacy-friendly example.
- **Recognise proxy-injected identity headers as sensitive artifacts** that require the same redaction and retention discipline as URL parameters.

---

### §8.3 OAuth 2.0 Pushed Authorization Requests (RFC 9126)

OAuth 2.0 Pushed Authorization Requests (PAR) are a **high-value but tightly bounded** privacy control. They matter when personal data or sensitive authorization parameters would otherwise travel through browser-visible OAuth redirect URLs. They do not solve general REST API design problems outside that flow.

OAuth 2.0 Pushed Authorization Requests (PAR), standardized in (RFC 9126), address a fundamental privacy weakness in the OAuth 2.0 authorization flow: the traditional authorization request sends sensitive parameters — including PII such as `login_hint` (often an email address), user identity claims, and redirect URIs — as URL query parameters in a browser redirect. These parameters are exposed in browser history, server access logs, referrer headers, and any intermediary that inspects the URL.

PAR restructures the flow by having the client *push* all authorization parameters directly to the authorization server via a server-to-server POST request. The authorization server validates the parameters, stores them temporarily, and returns an opaque `request_uri`. The client then redirects the browser to the authorization endpoint with only the `request_uri` — no PII in the URL at all.

#### §8.3.1 The Problem: PII Leakage in OAuth Authorization URLs

In a standard OAuth 2.0 authorization code flow, the client redirects the user's browser to the authorization server with all parameters encoded in the URL:

```
https://as.example.com/authorize?
  response_type=code&
  client_id=s6BhdRkqt3&
  redirect_uri=https%3A%2F%2Fclient.example.com%2Fcb&
  scope=openid%20profile%20email&
  login_hint=john.doe%40example.com&
  prompt=login&
  state=af0ifjsldkj
```

Several of these parameters carry PII or sensitive context:

- **`login_hint`** — Often the user's email address (`john.doe@example.com`). This is direct personal data under GDPR.
- **`redirect_uri`** — May encode the client application's identity and callback context.
- **`state`** — Anti-CSRF token; while not PII itself, it contributes to URL length and may be logged alongside PII.
- **OIDC-specific parameters** — `id_token_hint`, `claims`, and `max_age` may embed identity claims or authentication context.

This URL passes through the user's browser, is visible in browser history and developer tools, is logged by the authorization server's access logs, and may be captured in referrer headers if the authorization server redirects through intermediate pages. For regulated industries — banking (PSD2), healthcare (HIPAA), and any GDPR-covered processing — this PII exposure in URLs is a compliance concern.

#### §8.3.2 How PAR Works

```mermaid
%%{init: {sequence: {actorMargin: 250, messageMargin: 60}, themeVariables: {noteBkgColor: "transparent", noteBorderColor: "transparent"}}}%%
sequenceDiagram
    autonumber
    participant C as Client (Backend)
    participant AS as Authorization Server
    participant B as User Browser

    rect rgba(231, 76, 60, 0.14)
        Note over C, B: Traditional Flow — PII Exposed in URL
        C->>B: Redirect with PII in URL
        Note right of B: /authorize?login_hint=john@example.com&scope=openid+email
        B->>AS: GET /authorize (PII in query string)
        Note right of AS: PII logged in access logs, browser history, referrer headers
        AS-->>B: Login page
        Note right of B: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end

    rect rgba(46, 204, 113, 0.14)
        Note over C, AS: PAR Flow — PII Pushed Server-to-Server
        C->>AS: POST /as/par (PII in request body)
        Note right of AS: login_hint, scope, claims — all server-side
        AS->>AS: Validate + store parameters
        AS-->>C: 201 Created request_uri (opaque URN)
        C->>B: Redirect with request_uri only
        Note right of B: /authorize?client_id=...&request_uri=urn:...
        B->>AS: GET /authorize (no PII in URL)
        AS->>AS: Resolve stored parameters
        AS-->>B: Login page
        Note right of B: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
```

#### §8.3.3 Walkthrough

<details><summary><strong>1. Client redirects user's browser with PII in the URL (traditional flow)</strong></summary>

In the traditional OAuth 2.0 authorization code flow, the client constructs an authorization URL containing all parameters — including PII such as `login_hint` (the user's email), `claims`, and `scope` — and redirects the user's browser to the authorization server. This URL passes through the browser's address bar, is stored in browser history, and is logged by every intermediary (proxies, CDNs, load balancers). The PII is exposed in plaintext in the query string, creating an uncontrolled proliferation of copies that violate GDPR's data minimisation principle (Article 5(1)(c)).

This step represents the **problem** that PAR solves. The redirect URL is the only browser-visible step in the traditional flow, but it is sufficient to expose the user's identity across the entire request chain.

</details>

<details><summary><strong>2. Browser forwards the authorization request to the Authorization Server (traditional flow)</strong></summary>

The browser follows the redirect and sends a GET request to the authorization server's `/authorize` endpoint with all parameters in the query string. The authorization server receives the PII and logs it in its access logs (a common default behaviour for web servers). At this point, the PII exists in at least three locations: the browser history, the network request, and the server's access logs — none of which are under the data subject's control.

</details>

<details><summary><strong>3. Authorization Server returns the login page (traditional flow)</strong></summary>

The authorization server processes the authorization request and returns a login page to the browser. The PII has already been exposed at every hop in the request chain. This step completes the traditional flow's "problem demonstration" — the user hasn't even logged in yet, and their personal data (email address in `login_hint`) has already been distributed across browser history, proxy logs, and server access logs.

</details>

<details><summary><strong>4. Client pushes authorization parameters to the PAR endpoint</strong></summary>

The client (a confidential backend service, not the user's browser) initiates the OAuth authorization flow by POSTing all authorization parameters directly to the authorization server's PAR endpoint. This is a server-to-server call — the parameters travel over a TLS-protected backend channel and never enter the browser's URL bar, history, or referrer headers. The client authenticates itself to the authorization server using its configured credential method (private_key_jwt, client_secret_basic, tls_client_auth, or another supported mechanism).

The POST body carries the full set of OAuth 2.0 authorization parameters in `application/x-www-form-urlencoded` format, exactly as they would appear in a traditional authorization URL — but now in the request body where they are not logged by default and are not visible to the user or any browser extensions (RFC 9126, §2):

```http
POST /as/par HTTP/1.1
Host: as.example.com
Content-Type: application/x-www-form-urlencoded
Authorization: Basic czZCaGRSa3F0MzpnWDFmQmF0M2JW

response_type=code&
client_id=s6BhdRkqt3&
redirect_uri=https%3A%2F%2Fclient.example.com%2Fcb&
scope=openid+profile+email&
login_hint=john.doe%40example.com&
prompt=login&
state=af0ifjsldkj
```

The `login_hint` parameter here contains the user's email address — PII that would, in the traditional flow, be exposed in the browser's address bar, server access logs, proxy logs, and referrer headers. By pushing it via POST, the PII remains confined to the TLS channel between the client backend and the authorization server.

</details>

<details><summary><strong>5. Authorization Server validates and stores the pushed parameters</strong></summary>

The authorization server receives the PAR request and performs a full validation pass before committing anything to storage. This is a key security advantage of PAR over the traditional flow: the AS validates parameters server-side, rejecting invalid requests before the browser is ever involved. The validation includes client authentication verification, `redirect_uri` matching against the client's pre-registered URIs, scope validation, and any policy-specific checks (RFC 9126, §2.2).

If the request passes validation, the AS generates a unique, opaque `request_uri` in the `urn:ietf:params:oauth:request_uri:` namespace and stores the authorization parameters under this key. The `request_uri` is not a navigable URL — it is a server-internal reference that only the issuing AS can resolve.

</details>

<details><summary><strong>6. Authorization Server returns the opaque request_uri to the Client</strong></summary>

The AS responds with `201 Created` containing the newly generated `request_uri` and an `expires_in` value:

```http
HTTP/1.1 201 Created
Content-Type: application/json
Cache-Control: no-store

{
  "request_uri": "urn:ietf:params:oauth:request_uri:bwc4JK-ESC0w8acc191e-Y1LTC2",
  "expires_in": 600
}
```

The `expires_in` value (default 600 seconds per RFC 9126, §2.2.1) defines how long the AS will honor the stored request. The AS must enforce this TTL and reject any subsequent authorization request that references an expired `request_uri`. The stored parameters include the client identifier, so the AS can also enforce client-to-`request_uri` binding — preventing an attacker from using a `request_uri` created by one client to authorize a different client (the "request URI swapping" attack described in RFC 9126, §7.4).

</details>

<details><summary><strong>7. Client redirects the user's browser with the opaque request_uri</strong></summary>

With the `request_uri` in hand, the client constructs a redirect URL for the user's browser. Crucially, this URL contains **only** the `client_id` and the opaque `request_uri` — all PII (login hints, claims, scope details) has already been pushed in Step 1 and is no longer needed in the redirect:

```
https://as.example.com/authorize?
  client_id=s6BhdRkqt3&
  request_uri=urn%3Aietf%3Aparams%3Aoauth%3Arequest_uri%3Abwc4JK-ESC0w8acc191e-Y1LTC2
```

The browser navigates to the authorization endpoint via a standard `302 Found` or `303 See Other` redirect. The resulting URL is short, contains no PII, and is safe from exposure in browser history, referrer headers, proxy logs, and network monitoring. Even if this URL is intercepted or logged, it reveals nothing about the user being authenticated or the resources being requested.

```http
HTTP/1.1 302 Found
Location: https://as.example.com/authorize?client_id=s6BhdRkqt3&request_uri=urn%3Aietf%3Aparams%3Aoauth%3Arequest_uri%3Abwc4JK-ESC0w8acc191e-Y1LTC2
```

This redirect is the only browser-visible step in the entire PAR flow. The browser acts as a transport mechanism — it carries the opaque reference from the client to the AS and back, without ever touching the actual authorization parameters.

</details>

<details><summary><strong>8. Browser sends authorization request with request_uri to the Authorization Server</strong></summary>

The browser navigates to the authorization endpoint via the redirect URL constructed in Step 7. Unlike the traditional flow, the URL contains only the `client_id` and the opaque `request_uri` — no PII is present in the query string. The browser sends a standard GET request:

```
GET /authorize?client_id=s6BhdRkqt3&request_uri=urn:ietf:params:oauth:request_uri:bwc4JK-ESC0w8acc191e-Y1LTC2 HTTP/1.1
Host: as.example.com
```

This is the only browser-visible step in the PAR flow. The URL is short, contains no PII, and is safe from exposure in browser history, referrer headers, proxy logs, and network monitoring. The browser acts purely as a transport mechanism — it carries the opaque reference without ever touching the actual authorization parameters.

</details>

<details><summary><strong>9. Authorization Server resolves the stored parameters</strong></summary>

When the authorization server receives the GET request with a `request_uri` parameter, it resolves the URN against its internal store to retrieve the full set of authorization parameters that were pushed in Step 4. The AS verifies that the `request_uri` has not expired, has not been used before (single-use enforcement is recommended by RFC 9126, §4), and is bound to the `client_id` specified in the redirect URL:

```
→ AS resolves urn:ietf:params:oauth:request_uri:bwc4JK-ESC0w8acc191e-Y1LTC2
→ Retrieves: {response_type: "code", scope: "openid profile email", login_hint: "john.doe@example.com", ...}
```

The single-use property of `request_uri` (enforced by deleting the stored parameters after first resolution) prevents replay attacks: even if the redirect URL is captured and replayed, the AS will reject it because the `request_uri` has already been consumed. From the AS's perspective, the resolved parameters are identical whether they arrived via the traditional URL-encoded query string or via PAR — PAR is transparent to the downstream authorization logic.

</details>

<details><summary><strong>10. Authorization Server returns login page to the Browser</strong></summary>

After the user authenticates and (if required) consents to the requested scopes, the authorization server redirects the browser back to the client's pre-registered `redirect_uri` with an authorization code and the `state` parameter. This redirect is standard OAuth 2.0 behavior — PAR does not change the authorization response flow. Note that the authorization code itself carries no PII — it is an opaque value that only the authorization server can decode. The `state` parameter is echoed back unchanged, allowing the client to verify that the response corresponds to its original request and to detect CSRF attacks.

From this point forward, the flow is identical to a standard OAuth 2.0 authorization code grant: the client exchanges the code for access and ID tokens at the token endpoint (RFC 6749, §4.1.3). PAR's contribution is complete — it ensured that PII (login hints, claims, scopes) never appeared in any browser-visible URL throughout the entire authorization lifecycle.

</details>

#### §8.3.4 Security Benefits Beyond PII Protection

PAR provides several security advantages beyond eliminating PII from the redirect URL:

- **Server-side parameter validation.** Because the authorization server receives and validates all parameters before the browser is involved, invalid or malicious parameters (unknown redirect URIs, out-of-scope `response_type` values, malformed scopes) are rejected immediately. The browser never sees or can manipulate rejected parameters.

- **Prevention of authorization parameter tampering.** In the traditional flow, a compromised browser extension or injected script could modify the authorization URL parameters before the redirect completes. With PAR, the parameters are stored server-side — the browser only carries the opaque `request_uri`, which cannot be meaningfully tampered with.

- **Reduced attack surface for authorization code injection.** RFC 9126 §7.4 describes the "request URI swapping" attack, where an attacker replaces a legitimate `request_uri` with one they control. The mitigation — binding the `request_uri` to the client that created it — is enforced server-side and is transparent to the browser.

- **Browser history and referrer hygiene.** Since the redirect URL contains only an opaque URN, browser history entries and referrer headers expose no PII. This is particularly important for single-page applications that may make multiple authorization attempts.

#### §8.3.5 Relationship to JAR and JARM

PAR interacts with two related OAuth specifications:

- **JWT-Secured Authorization Request (JAR, RFC 9101)** — Allows the client to encode all authorization parameters in a signed (and optionally encrypted) JWT, passed as the `request` parameter to the PAR endpoint. The authorization server validates the JWT signature, extracts the parameters, and stores them as usual. JAR + PAR provides end-to-end parameter integrity: even the PAR request body carries signed parameters, not plaintext.

- **JWT-Secured Authorization Response (JARM, Final)** — Applies the same signing/encryption concept to the authorization response. JARM was approved as a Final OpenID specification (incorporating errata set 1, August 2025). While not directly related to PAR, JARM + PAR provides a fully signed and encrypted authorization flow from request to response.

#### §8.3.6 FAPI 2.0: PAR as a Mandatory Requirement

The Financial-grade API (FAPI) 2.0 Security Profile, published by the OpenID Foundation as a Final specification (February 2025), mandates PAR as a required mechanism for all authorization requests (FAPI 2.0 Security Profile, §5.3.2). FAPI 2.0 builds on OAuth 2.1 and adds sender-constrained access tokens via DPoP (RFC 9449), HTTP Message Signatures for resource server validation (RFC 9421), and PAR for authorization request protection. The companion FAPI 2.0 Message Signing specification was also approved as a Final OpenID specification (September 2025). The security baseline for all of these specifications is established by RFC 9700 (OAuth 2.0 Security BCP, January 2025).

FAPI 2.0's security rationale for mandating PAR (FAPI 2.0 Security Profile, §6.4 — "Authorization request leaks lead to CSRF") is that parameter leakage in URLs creates a cross-site request forgery vector. An attacker who can observe or inject authorization URLs can replay or modify authorization requests. PAR eliminates this class of attack by ensuring the authorization server validates all parameters before the browser redirect occurs.

Adoption of FAPI 2.0 is growing beyond financial services. Open banking implementations in the UK (Open Banking), Brazil (Open Finance Brasil), and the EU (under eIDAS 2.0 and the Open Finance framework) all require FAPI 2.0 conformance, which in turn requires PAR support.

#### §8.3.7 Implementation Support

Major OAuth/OpenID Connect vendors support PAR:

| Vendor | PAR Support | Notes |
|:-------|:------------|:------|
| Okta | ✅ | Configurable per authorization server |
| Auth0 | ✅ | Supported in Auth0 Authentication API |
| Keycloak | ✅ | Enabled via admin console; can be made mandatory |
| Ping Identity | ✅ | Full support per RFC 9126 |
| Oracle Identity Cloud | ✅ | Supported in OIDC flows |
| Duende IdentityServer | ✅ | FAPI 2.0 profile includes PAR |
| Authlete | ✅ | `/pushed_auth_req` API backend |
| OpenIddict | ✅ | Open-source .NET implementation |
| AWS Cognito | ⚠️ | Limited support (not full RFC 9126) |
| Firebase Auth | ❌ | No native PAR support |

#### §8.3.8 Limitations

PAR is a targeted solution for OAuth/OIDC authorization flows, not a general-purpose PII protection mechanism:

- **OAuth flows only.** PAR applies exclusively to OAuth 2.0 authorization requests (and OIDC authentication requests, which are OAuth authorization requests with OIDC-specific parameters). It does not protect PII in general REST API calls — those require the architectural, cryptographic, and pseudonymization patterns discussed in previous chapters.

- **Requires server-side component.** The PAR request must be made from a confidential client (server-side) that can authenticate to the authorization server. Public clients (single-page applications, mobile apps) cannot make PAR requests directly — they must proxy through a backend-for-frontend (BFF) component, adding architectural complexity.

- **`request_uri` management.** The authorization server must temporarily store the pushed parameters, which introduces state management requirements. The default `expires_in` of 600 seconds means the AS needs an in-memory or Redis-backed store with TTL-based expiry. For high-traffic deployments, this store can become a scaling concern.

- **Does not protect the callback.** After the authorization server authenticates the user and issues an authorization code, it redirects back to the client's `redirect_uri` with the code and `state` as URL parameters. While the authorization code is not PII, the redirect URL is still logged and observable. (This is mitigated by using the `authorization_details` parameter or JARM to encrypt the response, but these are separate specifications.)

- **Browser compatibility.** The final redirect to the authorization endpoint is a standard browser navigation. Older browsers or enterprise proxies that truncate long URLs are not a concern (the URL is short — only `client_id` and `request_uri`), but some mobile app webviews may have unexpected behavior with URN-form `request_uri` values.

#### §8.3.9 Practical Guidance for PII Protection

When deploying PAR to reduce PII exposure in OAuth flows:

1. **Make PAR mandatory for all clients.** Configure the authorization server to reject authorization requests that include parameters directly (i.e., require that all parameters come through the PAR endpoint). Both Keycloak and Authlete support making PAR mandatory at the service or per-client level.

2. **Use short `expires_in` values.** The default of 600 seconds is reasonable, but for high-security deployments, reducing to 60–120 seconds narrows the window for `request_uri` replay attacks.

3. **Combine with JAR for parameter integrity.** When regulatory requirements demand end-to-end integrity, pass a signed JWT as the `request` parameter to the PAR endpoint. This ensures the authorization server can verify that the parameters were not tampered with even before storage.

4. **Secure the PAR endpoint with TLS client authentication.** Since the PAR endpoint receives PII (login hints, claims), protect it with mTLS or `private_key_jwt` client authentication — not `client_secret_basic`, which sends the secret in a base64-encoded header on every request.

5. **Log redaction for the PAR endpoint.** The PAR endpoint receives PII in POST bodies. Ensure that access logs for this endpoint either omit the request body entirely or apply PII redaction. The standard access log format typically does not log POST bodies, but application-level logging (request tracing, debugging) may inadvertently capture the pushed parameters.

---

### §8.4 Other Protocols, Deployment Models, and Pattern Selection

The problem described in this document is easiest to understand in REST APIs because REST makes URLs first-class identifiers and encourages resource-oriented paths and query filtering. Other protocols and deployment models change the exact leak surface, but they do not eliminate the need to reason about where personal data travels, what gets logged, and which layers preserve or widen observability.

#### §8.4.1 REST Versus Other Protocol and Deployment Contexts

| Context | Does the URL leakage model apply directly? | Main exposure pattern | Practical implication |
|:--------|:-------------------------------------------|:----------------------|:----------------------|
| **REST over HTTP** | **Yes — strongly** | Path segments, query parameters, browser-visible URLs, access logs | This is the primary design problem addressed by DR-0005 |
| **GraphQL over HTTP** | **Sometimes** | GET-based queries and persisted-query URLs can recreate the same problem; POST-based bodies reduce it | GraphQL is not automatically safer; transport style matters |
| **gRPC** | **Usually not via URL payloads** | Method path is stable, but metadata, logs, and translated gateway layers can still expose personal data | gRPC avoids some URL-centric leakage but not observability leakage |
| **WebSocket** | **At handshake boundaries** | Query-string tokens and identifiers during the initial HTTP upgrade request | The upgrade URL can become the leak surface if teams stuff identifiers into it |
| **SOAP / WS-* over HTTP** | **Less through the URL itself** | Headers, XML bodies, intermediaries, and logging systems become the dominant issue | The leak shifts away from URL design toward message and logging discipline |
| **Internal service mesh / mTLS-backed microservices** | **Only if the application still uses bad URLs** | Mesh identity can replace caller identity, but application paths and query parameters are still logged if they carry personal data | Service mesh mTLS is not a substitute for removing personal data from resource paths |

The key distinction is simple: **some protocols reduce direct URL-borne PII risk because they move semantics into bodies or envelopes, but none of them remove the need for disciplined API, logging, response, and observability design.** Where an HTTP URL remains visible to browsers, proxies, gateways, tracing, or logs, the same basic leakage model returns.

#### §8.4.2 Defense-in-Depth Layering

The protocols form a natural three-layer defense model. Each layer addresses a different aspect of PII exposure, and they compose without conflict:

```mermaid
%%{init: {themeVariables: {'fontFamily': 'sans-serif'}}}%%
flowchart LR
    subgraph L1["Layer 1: Transport"]
        TLS["TLS&nbsp;1.3<br/>Encryption&nbsp;in&nbsp;transit"]
    end

    subgraph L2["Layer 2: Protocol"]
        direction TB
        MS["HTTP&nbsp;Message&nbsp;Signing<br/>§8.1 — Integrity"]
        MT["mTLS<br/>§8.2 — Identity"]
        PAR["PAR<br/>§8.3 — Confidentiality"]
    end

    subgraph L3["Layer 3: Application"]
        direction TB
        POST["POST&nbsp;body&nbsp;migration"]
        TOK["Opaque&nbsp;tokens"]
        FPE["Format-preserving&nbsp;encryption"]
    end

    REQ["API&nbsp;Request&nbsp;with&nbsp;PII"] --> L1
    L1 --> L2
    L2 --> L3
    L3 --> SAFE["PII&nbsp;protected&nbsp;at&nbsp;every&nbsp;layer"]

```

**Layer 1 — Transport (TLS 1.3).** Not covered in this chapter but always assumed: encryption in transit prevents network-level eavesdropping. TLS is the foundation on which all three protocol-level patterns operate.

**Layer 2 — Protocol.** The three mechanisms from §8.1–§8.3. HTTP Message Signing guarantees that PII-bearing parameters were not tampered with. mTLS replaces PII-as-identifier with certificate-based identity. PAR prevents PII from appearing in browser-visible URLs during OAuth flows. These mechanisms are independent and non-overlapping — using all three creates no conflicts.

**Layer 3 — Application.** The architectural patterns from previous chapters (POST body migration, opaque tokens, format-preserving encryption) handle PII that remains in the request after protocol-level protections are applied.

#### §8.4.3 Decision Flowchart

Choosing which protocol-level pattern to deploy depends on the primary PII exposure vector. The following decision tree maps common scenarios:

```mermaid
%%{init: {themeVariables: {'fontFamily': 'sans-serif'}}}%%
flowchart TD
    START["API carries PII in URLs"] --> Q1{"What is the<br/>primary threat?"}
    Q1 -->|"Parameter tampering"| A1["Use HTTP Message Signing<br/>§8.1 — sign PII-bearing params"]
    Q1 -->|"PII used as<br/>caller identifier"| A2["Use mTLS<br/>§8.2 — certificate-based identity"]
    Q1 -->|"PII leaked via<br/>browser redirect"| A3["Use PAR<br/>§8.3 — push params server-to-server"]

    A1 --> COMBINE{"Need multiple<br/>protections?"}
    A2 --> COMBINE
    A3 --> COMBINE

    COMBINE -->|"Yes"| LAYER["Layer them:<br/>Signing + mTLS + PAR"]
    COMBINE -->|"No"| DONE["Single mechanism<br/>sufficient"]

    LAYER --> DONE

```

#### §8.4.4 Comparative Properties

| Property | HTTP Message Signing (§8.1) | mTLS (§8.2) | PAR (§8.3) |
|:---------|:---------------------------|:------------|:-----------|
| **Primary protection** | Integrity of request components | Caller identity without PII | Confidentiality of auth parameters |
| **PII vector addressed** | Tampering with URL parameters | PII-as-credential in URL path | PII in browser-visible redirect URLs |
| **Scope** | Any HTTP request | Any TLS-protected request | OAuth/OIDC authorization flows only |
| **Requires client changes** | Yes (signing library) | Yes (certificate management) | Yes (PAR endpoint integration) |
| **Requires server changes** | Yes (signature verification) | Yes (TLS config, cert extraction) | Yes (PAR endpoint deployment) |
| **Composable with others** | ✅ Fully independent | ✅ Fully independent | ✅ Fully independent |
| **Browser involvement** | None (server-side) | None (TLS layer) | Minimal (opaque redirect only) |
| **Regulatory alignment** | GDPR Art. 5(1)(f) integrity | GDPR Art. 25 data protection by design | GDPR Art. 5(1)(f) + eIDAS 2.0 |

#### §8.4.5 Practical Combination Guidance

**Machine-to-machine APIs** benefit most from mTLS + HTTP Message Signing. The certificate replaces PII in the URL path (e.g., `/customers/{email}/orders` → `/customers/me/orders`), and message signing protects any remaining query parameters from tampering. This combination is common in B2B financial services and healthcare APIs where both caller identity and parameter integrity are regulatory requirements.

**Browser-based OAuth flows** should always use PAR, combined with mTLS at the PAR endpoint itself. The PAR request carries PII (login hints, claims) in a POST body — protecting that endpoint with mTLS ensures the parameters cannot be intercepted or injected. If the downstream resource API also carries PII in URLs, add HTTP Message Signing at the API layer.

**Internal microservices** within a service mesh can rely on mTLS alone if the mesh provides automatic certificate rotation and identity propagation (e.g., SPIFFE/SPIRE, Istio, Linkerd). HTTP Message Signing adds value when requests traverse boundaries where the mesh's mutual authentication does not apply — for example, calls to external partner APIs or legacy systems outside the mesh.

**The key principle:** start with the threat model. Identify which PII exposure vector is most relevant (tampering, identity-in-URL, browser leakage), deploy the corresponding protocol-level pattern, then layer additional patterns as the threat landscape warrants. No single mechanism is sufficient for all vectors — but together, they provide comprehensive protocol-level protection that complements the architectural and cryptographic patterns discussed in earlier chapters.


# Part III: Implementation and Migration

This part closes the gap between the document's preferred target-state patterns and the reality of live systems. It explains how to remove personal data from URL paths and query parameters in production APIs without breaking consumers, losing observability control, or leaving historical leak surfaces untreated.

---

## 9. Migration Playbook for Existing APIs

The default design rule is simple: **do not place personal data in URL paths or query parameters**. But most organizations do not start from a blank slate. They discover the problem after years of organic API growth, partner integrations, copied examples, and observability tooling that already contains the exposed URLs. In practice, the migration question is not "what is the best greenfield pattern?" It is "how do we remove PII from a live API without breaking clients or losing operational control?"

This chapter provides a concrete migration path for that situation. It assumes an API estate where one or more endpoints already accept personal data in URL paths or query parameters and the organization needs to move toward opaque identifiers, POST-body lookup flows, single-use tokens, or other patterns described in Chapters 3, 6, and 7.

From the standards perspective summarized in §17, this chapter is the retirement path for already-deployed CWE-598-style endpoints and equivalent path-based exposure patterns. It turns a recognized weakness from a static finding into an operational program with inventory, replacement contracts, deprecation discipline, and cleanup of historical leak surfaces.

---

### §9.1 Migration Principles

The migration should be guided by five principles:

1. **Do not break consumers blindly.** A legacy URL pattern may be bad design, but production clients still depend on it. Migration begins with measurement, not wishful thinking.
2. **Move the identifier first, not the entire business workflow.** The core correction is removing personal data from the URL surface. Do not combine that with unrelated functional redesign unless there is a separate reason.
3. **Prefer additive rollout over flag-day replacement.** Introduce the safe endpoint first, migrate consumers, then remove the old endpoint. This is more controllable than a sudden hard cutover.
4. **Treat observability and historical storage as part of the migration scope.** Fixing the live endpoint while leaving old logs, traces, and examples untouched only solves half the problem.
5. **Make the replacement contract easier to adopt than the legacy one.** If the old endpoint is one GET and the new design requires an awkward multi-step workaround, consumers will resist or re-create the same mistake elsewhere.

The rest of this chapter turns those principles into an operational sequence.

---

### §9.2 Inventory and Risk Classification

The first step is to identify every endpoint that carries personal data in the URL. This requires both **contract review** and **runtime discovery**:

- Search OpenAPI specifications, gateway route definitions, framework routers, and handler code for path parameters or query parameters named `email`, `phone`, `name`, `dob`, `tax_id`, `passport`, `national_id`, and related fields.
- Review API gateway access logs and trace samples to detect endpoints where the parameter name is innocuous (`q`, `filter`, `lookup`) but the runtime values contain personal data patterns.
- Include internal admin APIs, partner APIs, webhooks, and mobile deep-link handlers. Legacy exposure often survives longest in internal or partner-only interfaces because they receive less design scrutiny.

Each endpoint should then be classified across four dimensions:

| Dimension | Question | Example values |
|:----------|:---------|:---------------|
| PII type | What personal data appears in the URL? | Email, phone number, customer name, account number |
| Exposure breadth | Where does the URL propagate? | Browser-visible, server-to-server only, partner integration, mobile deep link |
| Consumer criticality | How hard is it to change clients? | Internal service, first-party SPA, partner integration, public API |
| Remediation pattern | What should replace it? | Opaque ID, POST lookup, one-time token, PAR, header-based fallback |

This inventory becomes the migration backlog. Without it, the organization cannot prioritize effectively or verify completion later.

---

### §9.3 Measure Live Usage and Consumer Dependency

Before designing the replacement, measure how the legacy endpoint is actually used in production:

- Request volume by endpoint and by consumer
- Distinct client identifiers or API keys using the endpoint
- Whether the endpoint is browser-driven, server-to-server, or mobile-app initiated
- Error rates and retry behavior
- Whether clients cache the URL, bookmark it, email it, or embed it in documentation

This matters because the replacement pattern depends on the usage model:

- A browser-facing `GET /users?email=alice@example.com` usually migrates toward a **POST lookup** that returns an opaque ID.
- An email-delivered onboarding link often migrates toward a **single-use token** that resolves to an opaque ID on first access.
- A B2B URL that uses personal data as an identity surrogate may need **workload identity or certificate identity** instead of parameter-based identity.

Consumer dependency measurement should be explicit enough to answer:

1. Which clients must be contacted directly?
2. Which clients can be migrated by updating first-party code?
3. Which consumers are dormant and may be decommissioned instead of migrated?
4. Which endpoints are low-volume enough to justify a short migration window, and which require a long tail?

Without this data, sunset timelines are fictional.

---

### §9.4 Design the Replacement Contract

The replacement endpoint should be designed according to the same default rules used for greenfield APIs:

- **Resource reads** should use opaque identifiers in path segments or query parameters.
- **Lookup by personal data** should move to POST request bodies.
- **Email-delivered or externally shared links** should use one-time or short-lived tokens.
- **Legacy compatibility constraints** should be explicit, not accidental.

Typical replacement patterns:

| Legacy pattern | Replacement | Why |
|:---------------|:------------|:----|
| `GET /users?email=alice@example.com` | `POST /users/lookup` with JSON body `{ "email": "alice@example.com" }` returning `{ "user_id": "usr_..." }` | Removes PII from URL while preserving lookup capability |
| `GET /customers/alice@example.com/orders` | `GET /customers/usr_7f3a9b2c/orders` | Keeps GET semantics while removing direct identifier exposure |
| Password reset or magic link with user-identifying URL | Single-use token resolving once to an opaque reference | Prevents URL propagation of identity-bearing data |
| Admin deep link `...?search=alice@example.com` | Admin navigates by opaque subject ID | Eliminates browser-history and screenshot leakage |

The migration design should explicitly preserve or document these contract properties:

- whether GET remains cacheable,
- whether response semantics change,
- whether pagination or sorting changes,
- whether clients must store a new opaque ID,
- whether the replacement is backwards-compatible or requires a client release.

The replacement contract should also be reflected in the OpenAPI spec and design-time governance rules from §7, so the organization does not recreate the legacy pattern during the migration.

---

### §9.5 Return Opaque IDs and Run a Dual-Path Transition

The most effective migration pattern is usually a **dual-path transition**:

1. Introduce the replacement endpoint.
2. Have it return an opaque identifier.
3. Update first-party clients to switch subsequent reads and actions to the opaque-ID form.
4. Leave the legacy endpoint temporarily available while monitoring migration progress.

Example:

```http
POST /api/v1/users/lookup HTTP/1.1
Content-Type: application/json

{ "email": "alice@example.com" }
```

```json
{
  "user_id": "usr_7f3a9b2c",
  "_links": {
    "self": "/api/v1/users/usr_7f3a9b2c",
    "orders": "/api/v1/users/usr_7f3a9b2c/orders"
  }
}
```

The key migration move is not merely accepting the personal data in a safer place. It is ensuring that **all subsequent navigation and integration flows pivot to the opaque identifier immediately**. If the replacement endpoint still returns URLs with personal data, the migration has failed architecturally even if the initial request moved from query string to body.

During the dual-path window:

- first-party clients should be updated first,
- SDKs and generated examples should be regenerated,
- partner consumers should receive migration guidance and a sunset deadline,
- dashboards should show legacy versus replacement adoption side by side.

---

### §9.6 Deprecation, Sunset, and Consumer Communication

The legacy endpoint must be deprecated as an explicit contract event, not as tribal knowledge.

At minimum:

1. Mark the old operation as deprecated in OpenAPI.
2. Document the replacement endpoint and migration steps.
3. Emit `Deprecation` and `Sunset` headers on the legacy route.
4. Provide a `Link` header to the successor operation where appropriate.
5. Notify known consumers directly if the API is not purely public/self-serve.

Example runtime signaling:

```http
HTTP/1.1 200 OK
Deprecation: true
Sunset: Tue, 31 Mar 2027 00:00:00 GMT
Link: </api/v1/users/lookup>; rel="successor-version"
```

The message to consumers should be operationally clear:

- what is wrong with the old pattern,
- what endpoint replaces it,
- whether authentication or response semantics change,
- when the old endpoint will stop working,
- how to test the migration before cutoff.

This communication is not optional. A technically correct replacement still fails if downstream consumers learn about it only from production incidents.

---

### §9.7 Rollout, Monitoring, and Breakage Control

Migration rollout should be staged:

1. **Shadow observation**: measure current consumers and baseline the legacy route.
2. **Replacement launch**: publish the new endpoint without changing legacy behavior.
3. **First-party migration**: move internal UIs, backend services, mobile clients, and automation.
4. **Partner/public migration**: notify external consumers and track adoption.
5. **Protective tightening**: add warnings, reduced rate limits, or audit flags to legacy usage if needed.
6. **Cutover**: reject the old route once the migration threshold is met.

Recommended rollout metrics:

| Metric | Why it matters |
|:-------|:---------------|
| Legacy request volume | Primary indicator of whether decommissioning is safe |
| Distinct active consumers on legacy route | Volume alone can hide a critical long-tail client |
| Replacement endpoint success rate | Migration should not degrade reliability |
| Percentage of flows completing via opaque-ID path | Measures actual architectural conversion |
| Errors on deprecated route after notifications | Indicates clients that need intervention |

Breakage control means being ready to slow the migration if critical consumers fail. It does **not** mean leaving the legacy endpoint in place indefinitely. The whole point of the migration is to establish a bounded transition window with measurable exit criteria.

---

### §9.8 Historical Log and Observability Cleanup

A migration is incomplete if the live route is fixed but historical systems still leak the old URL pattern.

Cleanup work should cover:

- access logs retained by API gateways and reverse proxies,
- application logs containing raw request URLs,
- distributed traces and APM breadcrumbs,
- data lake exports of HTTP telemetry,
- analytics dashboards that store full URLs,
- documentation examples, Postman collections, support runbooks, and screenshots.

Not every historical record can be rewritten safely. The practical goal is:

1. stop new leakage,
2. reduce retention of old leaked data where lawful and feasible,
3. purge high-risk stores that are under the organization's control,
4. document residual historical exposure that cannot be retroactively removed.

This is where observability and privacy intersect directly. If the migration removes personal data from the URL but leaves a 365-day trace retention policy full of historic PII-bearing URLs, the operational risk remains materially significant.

---

### §9.9 Cutover and Legacy Removal

Legacy support should be removed only when the exit criteria are satisfied. A reasonable cutover standard includes:

- replacement route has been stable in production,
- first-party consumers are fully migrated,
- external consumers have been notified and given a migration window,
- legacy request volume has dropped below a defined threshold,
- no critical business process still depends on the old URL form,
- support and incident teams are prepared for residual failures after cutoff.

At cutover, the safest behavior is usually a **clear failure**, not silent fallback. A legacy request should return an explicit client error telling the consumer that the endpoint is deprecated and naming the successor path. Silent translation layers are acceptable only as temporary compatibility infrastructure with a hard end date; otherwise they become permanent architectural debt.

After cutover:

- remove the deprecated route from the contract,
- delete compatibility code and URL-parsing branches,
- close migration exceptions from the inventory,
- retain evidence of the migration for audit and post-incident review.

---

### §9.10 Migration Verification Checklist

The migration can be considered complete only when the following checks pass:

| Check | Verification question |
|:------|:----------------------|
| Inventory complete | Do we have a current list of all endpoints that previously carried personal data in URLs? |
| Replacement live | Does every in-scope endpoint have a replacement contract using opaque IDs, POST body lookup, or tokens? |
| Consumers migrated | Have first-party and identified external consumers moved to the new path? |
| Deprecation emitted | Were `Deprecation` / `Sunset` signals and contract updates published? |
| Legacy route removed | Does the old endpoint now fail closed or no longer exist? |
| New leakage stopped | Do current logs, traces, replay tools, and analytics show PII-free URLs for the migrated flow? |
| Historical exposure reduced | Were high-risk retained logs, dashboards, docs, and examples cleaned up where feasible? |
| Guardrails added | Do §7 contract checks now prevent reintroduction of the legacy pattern? |

The migration playbook is therefore not a side concern. It is the bridge between the document's architectural recommendations and the messy reality of live systems. Without a migration plan, "do not put personal data in URLs" remains correct but incomplete advice.


# Part IV: Platforms and Vendor Reference

This part is intentionally **downstream of the core design decision**. Chapters 3 through 8 explain how to remove or control personal data exposure in URLs and adjacent surfaces. The chapters that follow are not alternative first-order answers to that problem. They are implementation reference material for teams that need to select platforms, evaluate infrastructure trade-offs, and operationalize the chosen pattern set.

---

## 10. Tokenization and Encryption Platforms

This chapter should be read as **platform depth after pattern selection**, not as the place to decide whether personal data should remain in URLs at all. That decision should already have been made in Chapters 3 through 8. This chapter examines five dedicated tokenization and encryption platforms — products whose primary purpose is replacing sensitive data values with cryptographically protected tokens or format-preserving ciphertext. These platforms differ from the cloud-native services and API gateway solutions covered in §11 in that they are **cloud-agnostic, deployable on-premises or in hybrid configurations**, and focus exclusively on data-level protection rather than infrastructure-level request inspection.

Chapter 5 (§5.3–5.4) introduced the architectural patterns — vaulted tokenization, vaultless tokenization, and format-preserving encryption — and briefly mentioned several of these products in an "Example Products" context. This chapter provides the full vendor deep-dive: API design, key management, deployment models, compliance alignment, and practical limitations.

The five platforms were selected based on market presence, API integration capabilities, and regulatory alignment with GDPR pseudonymisation requirements. They represent the three architectural patterns from §5: **vaulted** (HashiCorp Vault Transform tokenization mode, Thales CipherTrust vaulted variant), **vaultless** (Thales CipherTrust FPE, Protegrity, Pangea), and **privacy-vault-as-a-service** (Skyflow).

---

### §10.1 HashiCorp Vault Enterprise: Transform Secrets Engine

**Product Overview.** HashiCorp Vault Enterprise (version ≥ 1.4) with the Advanced Data Protection (ADP) module provides the **Transform secrets engine**, a purpose-built secrets engine for securing sensitive data stored *outside* of Vault — in external databases, application logs, or third-party systems. Unlike Vault's Transit secrets engine (which encrypts data and returns ciphertext), the Transform engine provides three transformation modes: **format-preserving encryption (FPE)**, **data masking**, and **tokenization**. The Transform engine is exclusively available under the Vault Enterprise ADP license or the HCP Vault Dedicated Plus tier; it is not included in the open-source Vault distribution.



#### §9.1.1 Transformation Modes

The Transform engine offers three complementary transformation types, each suited to different use cases:



- **Format-Preserving Encryption (FPE).** Uses the NIST-vetted FF3-1 algorithm (NIST SP 800-38G Rev. 1) to encrypt values while preserving their original format and length. A 16-digit credit card number encrypts to a 16-digit ciphertext; a US SSN formatted as `XXX-XX-XXXX` encrypts to the same pattern. FPE is **stateless** — Vault does not store the protected data, only the encryption key. This makes FPE horizontally scalable: any Vault performance standby node can encode/decode without writes to the primary. Vault ships built-in templates for common formats (credit cards, SSNs, US phone numbers) and supports custom templates via regex patterns.



- **Tokenization.** Replaces sensitive data with mathematically unrelated random tokens. Unlike standalone tokenization, Vault's tokenization is **two-way** — it satisfies PCI-DSS requirements for data irreversibility while still allowing controlled decode operations. Vault secures the token-to-plaintext mapping internally using encrypted storage. Each tokenization transformation generates its own key, ensuring cryptographic separation between use cases (e.g., the same card number processed by different merchants produces different tokens). **Convergent tokenization** is optionally supported, allowing deterministic token generation for the same input — enabling statistical analysis on tokenized data without decoding.



- **Data Masking.** A one-way transformation that replaces characters with masking characters (e.g., `••••-••••-••••-4242`). Non-reversible, and suitable for display contexts where the original value must never be recoverable.



#### §9.1.2 API Pattern

The Transform engine exposes a standard Vault HTTP API under the `transform/` path. A typical tokenization workflow involves three configuration steps followed by encode/decode operations:



```bash
# 1. Create a transformation (defines the type and format)
vault write transform/transformation/ccn type=tokenization \
  template=ccn_template tweak_source=internal



# 2. Create or assign a role (maps transformations to allowed operations)
vault write transform/role/payments transformations=ccn



# 3. Encode (tokenize) a credit card number
vault write transform/encode/payments value=4111111111111111 \
  transformation=ccn
# Response: encoded_value="4589-xxxx-xxxx-1234"



# 4. Decode (detokenize) back to the original
vault write transform/decode/payments \
  encoded_value="4589-xxxx-xxxx-1234" transformation=ccn
# Response: decoded_value="4111111111111111"

```



The same pattern applies to FPE (using `type=fpe` in step 1), with the key difference that FPE encode/decode operations are stateless and do not require storage writes.



#### §9.1.3 Policy-Driven Access Control

Vault's HCL policy language governs all Transform operations. Policies control which identities can create transformations, assign roles, and perform encode/decode against specific transformations. This enables fine-grained separation of duties — for example, a payment processing service can be granted `encode` capability on a credit card transformation but denied `decode`, ensuring that only a designated settlement service can recover the original PAN.



```hcl
# policy-payments-encode.hcl
path "transform/encode/payments" {
  capabilities = ["update"]
}
path "transform/decode/payments" {
  capabilities = ["deny"]
}

```



#### §9.1.4 Audit Capabilities

Vault's built-in audit devices (file, syslog, socket) log every Transform operation. Each encode and decode request generates an audit entry containing the requesting token, the transformation name, the input value (or a HMAC of it, depending on configuration), the output value, and timestamps. Audit logs are tamper-evident when written to append-only storage or forwarded to a SIEM. The audit trail satisfies GDPR Article 32(1)(d)'s requirement for "a process for regularly testing, assessing and evaluating the effectiveness of technical and organisational measures" and provides the accountability chain required by GDPR Article 30.



#### §9.1.5 Key Management

All cryptographic keys for FPE and tokenization are managed internally by Vault and integrated with its transit engine. Tokenization keys support **automatic rotation** based on configurable time intervals and minimum key versions. When a key rotates, older versions remain available for decoding tokens generated under the previous key, up to the configured age limit. For organizations with HSM requirements, Vault Enterprise supports PKCS#11 integration, allowing FPE and tokenization keys to be backed by hardware security modules.



#### §9.1.6 Performance Characteristics

FPE and transit encryption are **stateless** operations that can be served by any Vault performance standby node, enabling horizontal scaling. Tokenization, however, is **stateful** — each encode operation writes the token-to-plaintext mapping to the primary node's storage, making it the bottleneck. HashiCorp recommends configuring **external database storage** (PostgreSQL, MySQL, or MSSQL) for tokenization mappings in high-throughput deployments, which significantly improves performance by offloading the primary node. Public benchmarks are scarce, but community reports suggest approximately 10,000–15,000 ops/sec for FPE on a well-provisioned cluster, with tokenization throughput varying based on storage backend.



#### §9.1.7 Integration Patterns

Vault's HTTP API is the primary integration surface. Client libraries are available for Go, Java, Python, Node.js, and .NET via the official `vault` and `hvac` SDKs. Two integration patterns are common in API-centric architectures:



1. **Direct API integration.** Services call Vault's `transform/encode` and `transform/decode` endpoints directly, typically through a sidecar proxy (Vault Agent or Consul Connect) that manages authentication token lifecycle.

2. **Database proxy pattern.** Vault's database secrets engine can be combined with Transform to encrypt/decrypt data at the database layer, transparent to the application. This is less common for API-specific PII protection but relevant for data-at-rest scenarios.



#### §9.1.8 Licensing and Deployment

The Transform secrets engine requires a Vault Enterprise license with the ADP module. Pricing is based on the number of client nodes and feature tier. Alternatively, HCP Vault Dedicated (HashiCorp Cloud Platform) offers the Transform engine on the Plus tier, providing a fully managed Vault cluster without infrastructure overhead. Self-hosted deployment requires Vault Enterprise binary, a storage backend (Consul, Integrated Storage, or external DB for tokenization), and optionally an HSM for key backing.



#### §9.1.9 GDPR Alignment

Vault's tokenization maps directly to GDPR Article 32(1)(a)'s requirement for "the pseudonymisation and encryption of personal data." The irreversibility of tokenization (without the Vault-managed key material) qualifies as pseudonymisation under the GDPR. The comprehensive audit trail satisfies accountability requirements under Article 30 and supports data subject access requests by providing a log of when and by whom a data subject's information was encoded or decoded. HSM-backed key management aligns with Article 32(1)'s broader mandate for appropriate technical measures.



#### §9.1.10 Limitations

The most significant limitation is the **enterprise-only licensing** — open-source Vault provides Transit encryption but not Transform tokenization or FPE. The stateful nature of tokenization introduces a single-point-of-failure risk on the primary node unless external storage is configured. Additionally, Vault's Transform engine operates as a centralized service; if Vault becomes unavailable, encode/decode operations for tokenized data fail entirely (unlike vaultless approaches where tokens can be validated independently).

---

### §10.2 Thales CipherTrust Tokenization

**Product Overview.** Thales CipherTrust is an enterprise-grade data security platform that provides a broad portfolio of data protection capabilities including encryption, tokenization, masking, key management, and data discovery. The CipherTrust Tokenization module is available in two variants — **Vaulted Tokenization** and **Vaultless Tokenization** — both of which can be deployed independently or in conjunction with data masking and redaction. Thales CipherTrust is widely deployed in financial services, healthcare, and government sectors where regulatory compliance (PCI DSS, GDPR, HIPAA) demands robust data protection with minimal disruption to existing systems.



#### §9.2.1 Vaulted vs. Vaultless Tokenization

CipherTrust's dual-approach architecture addresses different deployment constraints:



- **Vaulted Tokenization** (also called "Vault-based") operates by storing token-to-plaintext mappings in a centralized, encrypted token vault. When sensitive data is submitted for tokenization, CipherTrust generates a token and stores the mapping securely. Detokenization requires a lookup against the vault. This approach provides strong irreversibility guarantees and is well-suited for environments where the token vault can be secured with HSM-backed encryption.



- **Vaultless Tokenization** uses format-preserving encryption (FPE) — specifically the FF1 algorithm (ANSI X9.24) — to generate tokens algorithmically without storing any mapping. The token is computed deterministically from the plaintext input and an encryption key, eliminating the need for a lookup table. This provides near-zero latency, infinite scalability (no storage growth), and no single point of failure. Vaultless tokens can be validated and reversed at any CipherTrust endpoint that holds the encryption key, making it ideal for distributed, high-throughput API environments.



#### §9.2.2 Format-Preserving Encryption (FPE)

At the core of CipherTrust's vaultless offering is FPE, which transforms sensitive data while preserving its original format and length. A 16-digit card number tokenizes to a 16-digit value; an email address format can be partially or fully preserved. This transparency is critical for API integration — backend systems, databases, and validation logic continue to function without modification because the data format remains identical. CipherTrust supports FPE across multiple data types including numeric strings, alphanumeric fields, date formats, and custom regex-defined patterns.



#### §9.2.3 Centralized Key Management

All cryptographic keys for tokenization and FPE are managed through **CipherTrust Manager**, Thales's centralized key management platform. CipherTrust Manager provides a unified repository for encryption keys, supports automated key rotation, and integrates with hardware security modules (HSMs) — including Thales's own Luna HSM family as well as third-party PKCS#11-compliant HSMs. Key lifecycle policies enforce rotation schedules, access controls, and expiration. For cloud deployments, CipherTrust Manager integrates with AWS KMS, Azure Key Vault, and Google Cloud KMS, enabling bring-your-own-key (BYOK) and hold-your-own-key (HYOK) models.



#### §9.2.4 API and Integration

CipherTrust exposes tokenization services through a RESTful API, enabling programmatic integration from any application or API gateway. The API provides endpoints for:



- `POST /tokenize` — submit plaintext and receive a token (FPE or vaulted)

- `POST /detokenize` — reverse a token back to the original plaintext

- `POST /retokenize` — migrate data from one tokenization scheme to another (useful during key rotation)



The **CipherTrust Application Data Protection (CADP) SDK** extends integration to the application layer. CADP provides libraries for Java, Python, C, and .NET that enable developers to apply tokenization, encryption, and masking directly within application code — at the point of data creation or consumption. For database-level protection, CipherTrust offers agent-based and proxy-based deployment where data is tokenized transparently as it enters or leaves the database, without application code changes.



#### §9.2.5 Compliance Reporting

CipherTrust includes built-in compliance reporting capabilities that map data protection activities to regulatory frameworks. Pre-packaged reports for GDPR, PCI DSS, and HIPAA provide evidence of data protection controls, key management practices, and audit trails. The compliance dashboard tracks which data types are protected, where tokenization is applied, and whether any sensitive data remains unencrypted — a critical capability for demonstrating "appropriate technical measures" under GDPR Article 32.



#### §9.2.6 Deployment Models

CipherTrust supports on-premises deployment (as a virtual or physical appliance), cloud deployment (AWS, Azure, GCP), and hybrid configurations. The CipherTrust Manager appliance is available as both a VM and a hardware appliance for organizations that require air-gapped or FIPS 140-3 validated environments. Cloud deployments can leverage Thales's CipherTrust Cloud Key Manager for centralized key management across multi-cloud environments.



#### §9.2.7 Audit and Logging

All tokenization and encryption operations are logged with comprehensive metadata: the requesting identity, the data type and transformation applied, input/output values (or HMACs thereof), timestamps, and key version used. Audit logs can be streamed to SIEM platforms (Splunk, IBM QRadar, Sentinel) via syslog or API-based forwarding. The audit trail supports incident investigation, compliance audits, and GDPR accountability requirements.



#### §9.2.8 GDPR Alignment

CipherTrust's tokenization — both vaulted and vaultless — constitutes pseudonymisation as defined in GDPR Article 4(5) and satisfies Article 32(1)(a)'s requirement for "pseudonymisation and encryption of personal data." The centralized key management with HSM backing addresses Article 32(1)(a)'s encryption requirement with hardware-grade key protection. Compliance reporting automates the documentation burden of Article 30 (records of processing activities) and Article 35 (data protection impact assessments). The vaultless approach is particularly well-aligned with GDPR's data minimization principle (Article 5(1)(c)) — since no mapping table is stored, there is no secondary repository of personal data to protect.



#### §9.2.9 Limitations

CipherTrust is a heavyweight enterprise platform with a steep learning curve and significant licensing costs, making it less accessible for startups or mid-size organizations. The vaulted variant reintroduces the storage and scalability concerns of traditional token vaults. Integration complexity can be high, particularly for the CADP SDK and database-level agent deployment, which often requires professional services engagement.

---

### §10.3 Protegrity Data Security Platform

**Product Overview.** Protegrity is a data-centric security platform designed for enterprise-scale protection of sensitive data across structured and unstructured sources. The platform provides a modular framework combining data discovery, governance, protection, and privacy capabilities. At its core is **Protegrity's patented vaultless tokenization**, which replaces sensitive data with non-sensitive tokens generated algorithmically — without requiring a centralized vault to store token mappings. Protegrity serves large enterprises in financial services, healthcare, retail, and government, with customers including major banks, insurers, and retailers processing hundreds of millions of records.



#### §9.3.1 Vaultless Tokenization Architecture

Protegrity's vaultless tokenization uses a deterministic cryptographic algorithm combined with a secret key to generate format-preserving tokens on the fly. The key differentiator from vault-based approaches is that **no mapping table is stored** — tokens are computed directly from the plaintext and the protection key. This eliminates the single point of failure, removes storage scaling concerns (the mapping table does not grow with data volume), and provides near-zero-latency tokenization suitable for real-time API and transaction processing.



The vaultless approach is **reversible under policy control** — the original value can be restored when needed (e.g., for compliance operations or customer service), but only through the Protegrity enforcement point that holds the decryption key. This provides a balance between irreversibility (for security) and recoverability (for operational needs). Token reversal is governed by centralized policies that control which identities, under what conditions, can detokenize specific data types.



#### §9.3.2 Multiple Protection Methods

Protegrity provides six distinct protection methods, each addressable through a unified API:



- **Vaultless Tokenization** — patented algorithmic token generation without a vault

- **Format-Preserving Encryption (FPE)** — reversible encryption that maintains data format and length

- **Dynamic Data Masking** — contextual masking that changes based on the requester's role and authorization

- **Data Anonymization** — irreversible transformation for analytics and ML workloads

- **Data Pseudonymization** — reversible pseudonymization with referential integrity across systems

- **Synthetic Data Generation** — AI-powered generation of realistic but non-sensitive data for testing and development



This breadth allows organizations to apply the *right* protection method for each data type and use case rather than forcing a one-size-fits-all approach.



#### §9.3.3 Application-Level Protection: Protectors

Protegrity applies protection through **Protectors** — lightweight enforcement points deployed at the data source. A Protector intercepts data as it enters or leaves a system and applies the configured protection policy (tokenization, masking, encryption) based on data classification rules. Protectors can be deployed as:



- **Native integrations** — pre-built connectors for databases (Snowflake, Databricks, Redshift, MongoDB), data warehouses, and cloud platforms (AWS, Azure, GCP)

- **API proxies** — intercepting API requests/responses and applying field-level tokenization

- **SDKs** — application-level libraries (Java, Python) that protect data within application code

- **Batch processors** — protecting data at rest in files and databases



This decentralized enforcement model applies protection as close to the data as possible, with centralized policy management ensuring consistency across all enforcement points.



#### §9.3.4 Centralized Governance

The **Enterprise Security Administrator (ESA)** is Protegrity's centralized governance console. ESA provides a single pane of glass for defining protection policies, managing encryption keys, configuring data classification rules, and monitoring compliance status. Policies are defined once and enforced across all Protectors — whether data flows through a Snowflake query, a REST API, a Kafka stream, or a Databricks notebook. This centralized-decentralized architecture is particularly valuable for organizations operating across multiple cloud providers and on-premises environments.



#### §9.3.5 AI-Ready Data Protection

Protegrity has positioned itself as an AI-ready data security platform with features specifically designed for GenAI and ML pipelines:



- **Semantic Guardrails** — detect and protect sensitive data in prompts and model outputs

- **Anonymization for training data** — irreversibly strip identifiers while preserving data utility for ML model training

- **Field-level protection in inference pipelines** — tokenize PII before it reaches LLM APIs, detokenize on response



This is increasingly relevant for API architectures where LLM-powered endpoints process user prompts containing PII.



#### §9.3.6 API Playground

Protegrity offers a free, interactive **API Playground** that allows developers to experiment with tokenization, masking, and encryption operations without deploying the full platform. The playground provides a REST API surface mirroring the production API, enabling teams to evaluate protection methods, test format preservation, and validate integration patterns before committing to the platform. This is a valuable evaluation tool that lowers the barrier to understanding how vaultless tokenization works in practice.



#### §9.3.7 Compliance Framework

Protegrity provides compliance automation for GDPR, HIPAA, PCI DSS, CCPA, and other global privacy regulations. The platform's governance engine maps data protection policies to regulatory requirements and generates evidence packages for auditors. For GDPR specifically:



- Pseudonymisation via vaultless tokenization satisfies Article 4(5) and Article 32(1)(a)

- Centralized policy management supports data protection by design (Article 25)

- Audit trails for all protection operations support accountability (Article 30)

- Data discovery capabilities identify where PII exists across the estate — a prerequisite for effective data mapping under Article 30



#### §9.3.8 Deployment Models

Protegrity supports cloud-native deployment, on-premises deployment, and SaaS delivery. Three editions target different organizational scales:



- **AI Enterprise Edition** — full platform for large enterprises with dedicated infrastructure

- **AI Team Edition** — mid-scale deployment for teams and departments

- **AI Developer Edition** — free tier for individual developers to build and test



#### §9.3.9 Audit Capabilities

Every protection operation — tokenization, detokenization, masking, encryption — is logged with full metadata including the requester identity, data type, protection method applied, timestamp, and policy version. Logs are accessible through the ESA console and can be streamed to external SIEM platforms. Policy enforcement logging provides evidence that protection rules are consistently applied, supporting both security monitoring and compliance audit requirements.



#### §9.3.10 Limitations

Protegrity's enterprise focus means pricing is opaque and likely prohibitive for smaller organizations. The platform's breadth — while a strength — also introduces complexity; organizations need dedicated security engineering resources to configure and maintain the governance framework. As a centralized policy platform, Protegrity itself becomes a critical dependency — if the governance service is unavailable, Protectors may fall back to cached policies or fail closed, depending on configuration.

---

### §10.4 Skyflow Data Privacy Vault

**Product Overview.** Skyflow is a data privacy vault delivered as a service that combines tokenization, polymorphic encryption, data redaction, and access control in a unified platform. Founded in 2019 by former Apple and Netflix engineers, Skyflow applies the "privacy vault" architectural pattern — the same approach used internally by Apple and Netflix — as a managed service. The vault isolates sensitive data from application systems, storing PII in a purpose-built, zero-trust environment while replacing it with tokens in the application's data layer. Skyflow serves fintech, healthcare, and SaaS platforms, with notable customers including GoodRx (protecting 800M+ customer records), Nomi Health, and Scalapay.



#### §9.4.1 Polymorphic Encryption

Skyflow's signature technical innovation is **polymorphic encryption** — a patented approach that applies *different* encryption and tokenization techniques to the *same* data depending on the use case. A single credit card number stored in the vault might be:



- **Fully tokenized** for storage in the application database (non-reversible, maximum security)

- **Format-preserving encrypted** for transmission to a payment processor (reversible, format-maintaining)

- **Masked** for display in a customer service portal (e.g., `••••-••••-••••-4242`)

- **Partially redacted** for analytics queries (e.g., BIN and last-4 visible, middle digits hidden)



Each use case gets the optimal protection technique without requiring separate data copies or vaults. This is particularly valuable in API architectures where the same data field may flow to multiple downstream services with different security requirements. The vault manages the key material and policy configuration for each transformation type transparently.



#### §9.4.2 Vault Structure and Data Types

Skyflow vaults are structured as collections of **vaults** containing **tables** with typed **columns**. Each column has a defined data type (e.g., `skyflow.types.CREDIT_CARD_NUMBER`, `skyflow.types.EMAIL_ADDRESS`, `skyflow.types.SSN`) with built-in validation. When data is inserted into the vault, Skyflow automatically:



1. Validates the input against the column's data type

2. Applies the configured protection method (tokenization, encryption, or both)

3. Returns a token that replaces the original value in the application's data layer



This structured approach simplifies API design — developers define a schema once, and Skyflow enforces both validation and protection at the vault boundary.



#### §9.4.3 Skyflow Connections

A key differentiator is **Skyflow Connections** — pre-built integrations with third-party services that handle detokenization at the service boundary. Currently supporting 70+ integrations including Stripe, Visa, Plaid, Twilio, Salesforce, HubSpot, and ServiceNow, Skyflow Connections allow organizations to route sensitive data to third-party APIs without ever exposing raw PII to their own backend:



1. Application stores a token in its database; the real PII lives in Skyflow's vault.

2. When the application needs to call Stripe for a payment, it sends the token to Skyflow via a Connection.

3. Skyflow detokenizes the data and forwards the request directly to Stripe's API.

4. The response is tokenized by Skyflow before returning to the application.



This pattern keeps PII out of the application entirely, similar to VGS's proxy model but implemented through SDK-initiated vault operations rather than a network proxy.



#### §9.4.4 API Design

Skyflow provides a REST API and client SDKs (JavaScript, Python, React) for vault operations. The API surface is clean and developer-focused:



```javascript
// Insert sensitive data into the vault
const result = await skyflow.insert({
  records: [
    {
      table: "customers",
      fields: {
        first_name: "Jane",
        email_address: "jane@example.com",  // auto-tokenized
        ssn: "123-45-6789",                   // auto-tokenized
      }
    }
  ]
});
// Response includes tokens: email_address -> "tok_xxxx", ssn -> "tok_yyyy"



// Detokenize specific fields
const detokenized = await skyflow.detokenize({
  records: [
    { token: "tok_xxxx" }
  ]
});

```



#### §9.4.5 Data Redaction

Skyflow provides policy-driven data redaction that allows fine-grained control over which fields are visible to which callers. Policies can be defined at the column level, restricting certain identities or roles from seeing the full value. Redaction can be applied per API call — the same data element can be returned fully, partially masked, or completely redacted depending on the caller's authorization context. This is implemented through Skyflow's **purpose-based access control (PBAC)** engine, which evaluates not just *who* is accessing data but *why* (the declared purpose) and applies appropriate formatting.



#### §9.4.6 Data Residency

Skyflow vaults can be deployed in specific geographic regions, enabling organizations to meet data residency requirements without building multi-region infrastructure. Vaults can be placed in any of Skyflow's supported regions (US, EU, APAC, and others), ensuring that EU data subjects' PII remains within European data centers. This directly addresses GDPR's data localization considerations and similar requirements under PIPL (China), DPDP (India), and LGPD (Brazil).



#### §9.4.7 Compliance Certifications

Skyflow holds PCI DSS Level 1, SOC 2 Type II, HIPAA BAA, and ISO 27001 certifications. The platform's compliance posture is a significant selling point — particularly for fintech and healthcare startups that need to demonstrate compliance to customers and partners quickly. Skyflow's stated deployment timeline is "under a month" from evaluation to production, with some customers (like Nomi Health) reporting production readiness in hours.



#### §9.4.8 Deployment Models

Skyflow is available as a SaaS service with three deployment tiers:



- **Shared tenant** — multi-tenant SaaS, lowest cost, fastest setup

- **Dedicated tenant** — isolated infrastructure within Skyflow's cloud, dedicated resources

- **VPC deployment** — vault runs within the customer's own VPC (AWS VPC), providing maximum data isolation and network control



#### §9.4.9 Audit and Data Lineage

Skyflow logs all vault operations (insert, retrieve, detokenize, redact) with metadata including caller identity, timestamp, data type, and operation type. Access logs support data lineage tracking — understanding which systems and identities have accessed a specific data subject's information over time. This is critical for GDPR data subject access requests (Article 15) and for demonstrating accountability (Article 5(2)).



#### §9.4.10 Limitations

Skyflow is a relatively young company (founded 2019) compared to HashiCorp or Thales, which raises questions about long-term viability and enterprise support maturity. The vault-as-a-service model creates a hard dependency on Skyflow's infrastructure and availability — if Skyflow experiences an outage, detokenization operations fail, which can block critical business processes (e.g., payment processing). Pricing is not publicly listed and requires a sales engagement. The structured vault schema, while simplifying development, can be inflexible for unstructured data or rapidly evolving API payloads.

---

### §10.5 Pangea Vault Service

**Product Overview.** Pangea is a cloud security platform that provides a suite of API-first security services, including audit logging, redaction, intellectual property detection, authentication, authorization, and — relevant to this chapter — a **Vault service** for secrets management, encryption, and tokenization. Pangea targets developers and mid-size organizations that need enterprise-grade security capabilities without the operational overhead of deploying and managing dedicated infrastructure. The Vault service combines key management, secrets storage, and cryptographic operations (encryption, decryption, signing, format-preserving encryption) into a single REST API surface. Pangea is backed by CrowdStrike (which acquired a controlling stake in 2024) and is headquartered in Palo Alto, California.



#### §9.5.1 Capabilities

The Pangea Vault service provides three categories of functionality, each accessible through versioned REST API endpoints (V1 and V2):



- **Key Management.** Generate symmetric (AES-256-GCM) and asymmetric (RSA-2048/4096, ECDSA P-256/P-384) key pairs, or import existing keys. Keys are stored in hardware-backed infrastructure; private key material is never exposed outside the Pangea service. All cryptographic operations (encrypt, decrypt, sign, verify) are performed server-side — the developer submits plaintext and receives ciphertext (or vice versa) without ever handling the key material.



- **Format-Preserving Encryption (FPE).** The Vault service provides dedicated FPE endpoints (`/v2/encrypt_transform` and `/v2/decrypt_transform`) that encrypt data while preserving its original format. This enables tokenization-like behavior where a credit card number, SSN, or other structured field is encrypted to a same-length, same-format ciphertext. Structured JSON FPE (`/v2/encrypt_transform_structured`) allows encrypting specific fields within a JSON payload while leaving other fields untouched — directly applicable to API request/response body protection.



- **Secrets Storage.** Store arbitrary text secrets (API keys, credentials, configuration values) with automatic versioning, rotation policies, and access controls. Secrets are referenced by ID, so application code does not break when secrets are rotated.



#### §9.5.2 API Design

Pangea's API is designed for developer simplicity. All services use a consistent RESTful pattern with JSON request/response bodies, Bearer token authentication (Pangea API tokens), and clear error handling. The V2 API introduces structured operations that allow bulk operations and field-level targeting:



```bash
# Encrypt a credit card number with FPE
curl -X POST https://vault.aws.us.pangea.cloud/v2/encrypt_transform \
  -H "Authorization: Bearer $PANGEA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"cipher": "aes256", "format": "numeric", "input": "4111111111111111"}'
# Response: {"result": {"transformed": "8372910548263749", ...}}



# Encrypt structured JSON: only the "ssn" field is FPE-encrypted
curl -X POST https://vault.aws.us.pangea.cloud/v2/encrypt_transform_structured \
  -H "Authorization: Bearer $PANGEA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "cipher": "aes256",
    "format": "ssn",
    "json_input": {"name": "Jane Doe", "ssn": "123-45-6789"}
  }'
# Response: {"result": {"transformed": {"name": "Jane Doe", "ssn": "987-65-4321"}, ...}}

```



The base URL follows a regional pattern: `vault.<csp>.<region>.pangea.cloud`, where `<csp>` is the cloud provider (AWS, GCP, Azure) and `<region>` is the deployment region. This multi-region, multi-cloud architecture supports data residency requirements and reduces latency by allowing vault operations close to the application.



#### §9.5.3 Key Versioning and Rotation

Pangea Vault provides automatic key versioning — every rotation operation creates a new version while preserving previous versions. Keys and secrets support configurable **rotation policies** that trigger automatic rotation on a schedule (e.g., every 90 days). When a key is rotated:



- A new key version is generated and becomes the "current" (active) version.

- The previous version enters a **deactivated** state — it can still decrypt data encrypted under the old key but cannot be used for new encryption operations.

- A configurable **grace period** (applicable to Pangea API tokens) allows the old version to remain temporarily active during a transition window.



This versioning model ensures that key rotation does not break existing encrypted data — a critical requirement for API systems that persist encrypted values in databases.



#### §9.5.4 Vault Item Lifecycle Management

Pangea defines a comprehensive state machine for vault items (keys, secrets, tokens) with the following lifecycle states:



- **Pre-activated** → **Active** (ready for use)

- **Active** → **Deactivated** (retired due to rotation)

- **Active** → **Suspended** (inactive due to non-use; can be reactivated)

- **Any** → **Compromised** (suspected or confirmed breach; cannot return to Active)

- **Compromised** → **Destroyed** (key material permanently destroyed; only metadata remains)



The **Compromised** state is particularly relevant for incident response — if a key is suspected of being leaked, it can be immediately moved to a compromised state, preventing further use while the incident is investigated. This maps well to GDPR's breach notification requirements (Article 33) where swift action to contain the impact of a key compromise is essential.



#### §9.5.5 Audit Logging

Pangea provides a dedicated **Secure Audit Log** service that records tamper-evident, append-only logs of all vault operations. Audit entries are cryptographically signed and cannot be altered after creation. The audit log supports filtering by service, operation type, time range, and actor — enabling compliance teams to trace who accessed what data and when. Audit logs are accessible via API and through a React-based log viewer component that Pangea provides for embedding in admin dashboards.



#### §9.5.6 SDKs and Language Support

Pangea provides official SDKs for **Node.js, Python, Go, Java, and C#**, each with first-class support for the Vault service. The SDKs handle authentication, request signing, error handling, and retry logic. Additionally, Pangea offers a **Vanilla JS** library for browser-based integration and a **React Auth** library for authentication flows. This breadth of SDK support makes Pangea accessible to development teams regardless of their primary technology stack.



#### §9.5.7 Deployment and Pricing

Pangea is a SaaS platform with multi-region deployment across AWS, GCP, and Azure. The service is designed for rapid onboarding — a developer can sign up, generate API tokens, and begin encrypting data within minutes. Pricing is tiered based on usage (number of API calls, storage) and is publicly listed on Pangea's documentation site, making it transparent for budgeting. A free tier is available for evaluation and prototyping.



#### §9.5.8 GDPR Alignment

Pangea's encryption and FPE capabilities satisfy GDPR Article 32(1)(a)'s pseudonymisation and encryption requirements. The tamper-evident audit log supports accountability under Article 5(2) and record-keeping under Article 30. Multi-region deployment enables EU data residency. The comprehensive key lifecycle management — including rotation, revocation, and compromise handling — provides the "integrity and confidentiality" controls required by Article 32(1)(b). Pangea's SOC 2 certification provides third-party validation of its security controls.



#### §9.5.9 Limitations

Pangea Vault is more narrowly scoped than the enterprise platforms (HashiCorp Vault, Thales, Protegrity) — it provides key management and cryptographic operations but lacks some higher-level features like data discovery, automated classification, or centralized governance dashboards. The FPE implementation is functional but less mature than the dedicated FPE engines in Thales CipherTrust or Protegrity. As a SaaS service, Pangea introduces a network dependency — all cryptographic operations require an API call to Pangea's infrastructure, which adds latency and creates an availability dependency. Organizations with strict data sovereignty requirements may be reluctant to send plaintext data to a third-party service for encryption, even when TLS is used. Pangea does not offer on-premises deployment; all operations run in Pangea's managed cloud.

---

### Platform Architecture Classification

The five platforms covered in this chapter map to three architectural patterns introduced in §5 — vaulted tokenization (§5.3), vaultless tokenization (§5.4), and the privacy-vault-as-a-service model:

```mermaid
flowchart TD
    subgraph vaulted["Vaulted Architecture (§5.3 Pattern)"]
        HC["HashiCorp Vault<br/>Transform Engine<br/><i>Tokenization mode</i>"]
        TC_V["Thales CipherTrust<br/>Vaulted Tokenization"]
    end

    subgraph vaultless["Vaultless Architecture (§5.4 Pattern)"]
        TC_L["Thales CipherTrust<br/>Vaultless Tokenization<br/><i>FF1 FPE</i>"]
        PR["Protegrity<br/>Vaultless Tokenization<br/><i>Proprietary FPE</i>"]
        PG["Pangea Vault<br/>FPE Endpoints<br/><i>AES-256-GCM</i>"]
    end

    subgraph privacy_vault["Privacy Vault as a Service"]
        SK["Skyflow<br/>Data Privacy Vault<br/><i>Polymorphic Encryption</i>"]
    end

    vaulted ~~~ vaultless ~~~ privacy_vault

```

---

### Platform Selection Decision Flowchart

The following decision tree helps narrow the choice based on deployment constraints, regulatory requirements, and integration preferences:

```mermaid
flowchart TD
    START(["Need: PII tokenization<br/>or encryption platform"]) --> Q1{"Deployment<br/>model?"}

    Q1 -->|"On-premises /<br/>hybrid required"| Q2{"Need FPE<br/>+ tokenization?"}
    Q1 -->|"Cloud-native SaaS<br/>preferred"| Q3{"Need zero-PII<br/>in application?"}

    Q2 -->|"Yes — both"| HC["HashiCorp Vault<br/>Enterprise ADP"]
    Q2 -->|"Vaultless FPE<br/>only"| PR["Protegrity<br/>or Thales CipherTrust"]

    Q3 -->|"Yes — keep PII<br/>out of app entirely"| SK["Skyflow<br/>Privacy Vault"]
    Q3 -->|"No — need crypto<br/>API for app-layer"| PG["Pangea Vault<br/>or HashiCorp HCP"]

    HC --> NOTE1["Enterprise license<br/>required for Transform"]
    PR --> NOTE2["Proprietary algorithm<br/>(not NIST-standardized)"]
    SK --> NOTE3["Vendor lock-in risk<br/>(vault-as-a-service)"]
    PG --> NOTE4["Developer-friendly<br/>transparent pricing"]

```

---

### Cross-Platform Comparison

| Capability | HashiCorp Vault | Thales CipherTrust | Protegrity | Skyflow | Pangea |
|:-----------|:---------------:|:------------------:|:----------:|:-------:|:------:|
| **Architecture** | Vaulted (tokenization) / Vaultless (FPE) | Vaulted + Vaultless | Vaultless | Privacy Vault SaaS | Vaultless (FPE) |
| **FPE Algorithm** | FF3-1 (NIST SP 800-38G Rev. 1) | FF1 (ANSI X9.24) | Proprietary | N/A (polymorphic encryption) | AES-256-GCM |
| **Tokenization** | ✅ Two-way, convergent optional | ✅ Vaulted + vaultless | ✅ Vaultless | ✅ Polymorphic | ❌ FPE only |
| **Data Masking** | ✅ One-way | ✅ | ✅ Dynamic | ✅ Policy-driven | ✅ Redaction API |
| **Key Management** | Internal + HSM (PKCS#11) | CipherTrust Manager + Luna HSM | Centralized (ESA) | Managed by Skyflow | Managed by Pangea |
| **HSM Support** | ✅ PKCS#11 | ✅ Luna + third-party | Not documented | Not applicable | Hardware-backed (opaque) |
| **API Surface** | REST (`transform/`) | REST + CADP SDK | REST + Protectors + SDK | REST + SDKs | REST (V1/V2) |
| **SDKs** | Go, Java, Python, Node.js, .NET | Java, Python, C, .NET | Java, Python | JavaScript, Python, React | Node.js, Python, Go, Java, C# |
| **On-Premises** | ✅ | ✅ (appliance) | ✅ | ❌ (VPC only) | ❌ |
| **SaaS Option** | HCP Vault Dedicated | ✅ Cloud | ✅ SaaS edition | ✅ (primary model) | ✅ (primary model) |
| **Audit Trail** | ✅ Tamper-evident | ✅ SIEM integration | ✅ ESA console | ✅ Data lineage | ✅ Tamper-evident |
| **GDPR Pseudonymisation** | ✅ Art. 4(5), Art. 32(1)(a) | ✅ Art. 4(5), Art. 32(1)(a) | ✅ Art. 4(5), Art. 25 | ✅ Art. 32(1)(a) | ✅ Art. 32(1)(a) |
| **Data Residency** | Via deployment config | Via deployment config | Via deployment config | ✅ Regional vaults | ✅ Multi-region |
| **Public Pricing** | ❌ Enterprise quote | ❌ Enterprise quote | ❌ Enterprise quote | ❌ Sales engagement | ✅ Tiered, publicly listed |
| **Best For** | Enterprises needing FPE + tokenization with Vault ecosystem | Regulated industries requiring both vaulted and vaultless | Large enterprises with diverse data sources and AI pipelines | Organizations wanting to keep PII entirely out of their application | Developers and mid-size organizations seeking simple crypto APIs |

---

## 11. Cloud-Native and API Gateway Solutions

Chapter 9 examined dedicated tokenization and encryption platforms — products whose primary purpose is replacing sensitive data values with cryptographically protected tokens. This chapter remains in the same supporting/reference layer, but shifts focus to **infrastructure-level PII protection**: cloud-native services and API gateway solutions that embed data protection directly into the request/response path, without requiring application-level code changes. These tools are most useful once the team already knows which protection pattern it is trying to enforce and where in the request path the enforcement should occur.

The products covered here fall into three architectural categories:

1. **Cloud DLP services** (Google Cloud Sensitive Data Protection) — managed services that inspect, classify, and transform PII in real time via a synchronous API, tightly integrated with the cloud provider's key management system.

2. **API gateway policy engines** (Azure APIM, AWS API Gateway) — gateway-level policy mechanisms that strip, mask, or transform PII as traffic passes through the gateway, leveraging the provider's key management infrastructure for cryptographic operations.

3. **Inline security proxies** (Cequence API Security) — dedicated security appliances or SaaS platforms deployed in the data path between clients and backends, combining ML-based PII detection with inline format-preserving encryption.

A fourth product, **Fortanix Data Security Manager**, is included in this chapter for completeness, though its capabilities (multi-cloud FPE tokenization, HSM-backed key management) align more closely with the §9 tokenization platforms.

The chapter concludes with a cross-cloud provider comparison (§10.4) that consolidates the analysis of Google Cloud, Azure, and AWS into a side-by-side evaluation.

---

### §11.1 Google Cloud: Sensitive Data Protection

Google Cloud Sensitive Data Protection (formerly Cloud DLP) is a fully managed service for discovering, classifying, and protecting sensitive data across Google Cloud and external data sources. It provides both **inspection** (detecting PII in structured and unstructured data) and **de-identification** (transforming PII to reduce identifiability) as complementary capabilities accessible through a unified REST API and client libraries for Python, Java, Go, and Node.js. The service is particularly relevant to API-centric architectures because its de-identification API can be called synchronously in the request path — enabling real-time PII transformation of inbound API payloads before they reach backend services.



#### §10.1.1 InfoType Detection and De-identification Transformations

Sensitive Data Protection ships with 100+ built-in infoType detectors covering common PII categories: personally identifiable information (email addresses, phone numbers, names, SSNs, IBANs, passport numbers, driver's license numbers), financial data (credit card numbers, bank account numbers), healthcare identifiers (medical record numbers, health plan beneficiary numbers), and credentials (API keys, passwords, SSH keys). Detection combines pattern matching (regex), dictionary lookup (word lists), and contextual analysis (proximity to keywords) to balance precision and recall. Organizations can define custom infoTypes via regex patterns, word lists, or stored dictionaries for domain-specific data formats (e.g., internal employee IDs, proprietary identifiers).



The de-identification API supports six core transformation primitives, each suited to different privacy/utility trade-offs:



- **FPE-FFX (Format-Preserving Encryption).** Uses the FFX mode of format-preserving encryption to encrypt detected PII values while preserving their original format, length, and character set. A 16-digit credit card number encrypts to a 16-digit ciphertext; an email address retains its `local@domain.tld` structure. FPE keys are stored in and managed by Google Cloud KMS, with IAM policies governing which service accounts can use each key. FPE is deterministic — the same input with the same key always produces the same output — enabling re-identification via the `reidentifyContent` API. This makes FPE suitable for pseudonymisation under GDPR (data remains linkable but not directly identifiable).



- **Crypto Hash.** Applies SHA-256 hashing to detected values, optionally using a Cloud KMS key as a "crypto key" parameter. When a key is specified, the hash becomes deterministic (same input → same hash), enabling record linkage across datasets. Without a key, a random salt is applied per request, producing non-deterministic hashes that prevent cross-dataset matching. Salted hashing is the stronger privacy option but sacrifices analytical utility. Under GDPR, deterministic hashing qualifies as pseudonymisation; non-deterministic hashing moves closer to anonymisation depending on whether re-identification via auxiliary data remains feasible.



- **Deterministic Masking.** Replaces detected PII with a consistent masked value derived from the input. For example, all instances of the same email address are replaced with the same masked string. This provides a weaker form of pseudonymisation compared to FPE or hashing — the masked value may leak structural information about the original — but is computationally inexpensive and useful for display contexts.



- **Date Shift.** Shifts detected date values by a random offset (specified in days) while preserving the relative relationships between dates in the same record. If a patient's admission date is shifted by +42 days, their discharge date is also shifted by +42 days. This is particularly valuable for healthcare datasets where temporal relationships (length of stay, age at event) must remain analytically useful while individual event dates are obscured. The shift offset can be specified explicitly to enable re-identification, or randomized per request for non-reversible anonymisation.



- **Redact.** Replaces detected PII with a fixed redaction string (configurable, defaulting to `[REDACTED]`). This is a destructive, non-reversible transformation suitable for data minimization — ensuring PII is permanently removed from API responses, logs, or exported datasets. Under GDPR, redaction is the strongest form of data minimization (Article 5(1)(c)) but sacrifices all utility of the redacted field.



- **Replace with InfoType.** Replaces detected PII with the name of its detected infoType (e.g., `[EMAIL_ADDRESS]`, `[PHONE_NUMBER]`). Useful for generating privacy-safe representations that preserve the *type* of data without exposing its value. Commonly used in log anonymization and data quality testing.



#### §10.1.2 De-identification API Pattern

A synchronous de-identification request specifies the input data, the infoTypes to detect, and the transformation to apply. The request is processed in a single API call with sub-second latency for small payloads:



```json
{
  "item": {
    "value": "My email is alice@example.com and my SSN is 123-45-6789."
  },
  "deidentifyConfig": {
    "infoTypeTransformations": {
      "transformations": [
        {
          "infoTypes": [{"name": "EMAIL_ADDRESS"}],
          "primitiveTransformation": {
            "cryptoReplaceFfxFpeConfig": {
              "cryptoKey": {
                "kmsWrapped": {
                  "wrappedKey": "CiQA...",
                  "cryptoKeyName": "projects/my-project/locations/global/keyRings/dlp/cryptoKeys/fpe-key"
                }
              },
              "surrogateInfoType": {"name": "EMAIL_ADDRESS"}
            }
          }
        },
        {
          "infoTypes": [{"name": "US_SOCIAL_SECURITY_NUMBER"}],
          "primitiveTransformation": {
            "replaceWithInfoTypeConfig": {}
          }
        }
      ]
    }
  }
}

```



This example applies FPE encryption to email addresses (preserving format) and replaces SSNs with `[US_SOCIAL_SECURITY_NUMBER]`. Multiple transformations can be composed in a single request, and **record transformations** enable per-field transformation of structured JSON or tabular data — critical for API request/response bodies where different fields require different protection levels.

```mermaid
---
title: "§10.1 — Google Cloud DLP De-identification Data Flow"
---
flowchart LR
    Client["`**API Client**
    JSON payload
    containing PII`"]
    
    subgraph GCP["Google Cloud"]
        DLP["`**Cloud DLP**
        deidentifyContent
        Inspect + Transform`"]
        KMS["`**Cloud KMS**
        FPE Key (FFX)
        Key rotation`"]
    end
    
    Backend["`**Backend Service**
    Receives de-identified
    payload (FPE / masked
    / redacted)`"]
    ReId["`**Re-identification**
    (Authorized only)
    reidentifyContent`"]
    
    Client -->|"Request: email=alice@example.com
    ssn=123-45-6789"| DLP
    DLP -.->|"Key unwrap"| KMS
    DLP -->|"Response: email=tok_abc@***.com
    ssn=[US_SOCIAL_SECURITY_NUMBER]"| Backend
    Backend -.->|"Tokenized value"| ReId
    ReId -.->|"reidentifyContent"| DLP
    ReId -.->|"Original value"| Backend

```

#### §10.1.3 Cloud KMS Integration and Re-identification

FPE and deterministic crypto-hash transformations require a KMS key, which is stored in Google Cloud KMS and referenced in the de-identification request. Key access is controlled via IAM — a service account processing API traffic can be granted `cloudkms.cryptoKeyEncrypterDecrypter` on the specific key, while denied access to keys used by other services. This enables cryptographic separation between tenants, environments, and data sensitivity levels. Cloud KMS keys support automatic rotation (typically annually), with the DLP API transparently using the correct key version for encryption and re-identification operations.



**Re-identification.** The `reidentifyContent` API reverses FPE and deterministic crypto-hash transformations, restoring the original PII values. This is critical for GDPR compliance: pseudonymised data must be re-linkable to the data subject to fulfill data subject access requests (Article 15) and right to rectification (Article 16). The re-identification API accepts the same KMS key used for de-identification and reverses the transformation. Access to re-identification should be strictly limited — only authorized services and personnel should hold IAM permissions that grant decrypt-level access to the KMS key.



**Batch and streaming processing.** Beyond synchronous API calls, Sensitive Data Protection supports asynchronous batch jobs via Cloud Dataflow templates, enabling large-scale de-identification of datasets stored in BigQuery, Cloud Storage, Cloud SQL, and external sources (Amazon S3, Azure Blob Storage). For API-centric use cases, the synchronous `deidentifyContent` endpoint is the primary integration point. The service supports per-item pricing for inspection and transformation, with separate charges for storage scanning jobs.



#### §10.1.4 GDPR Alignment

Google Cloud Sensitive Data Protection maps to several GDPR requirements: FPE-FFX and deterministic crypto-hash satisfy Article 32(1)(a) pseudonymisation and encryption; redaction and infoType replacement satisfy Article 5(1)(c) data minimization; Cloud KMS key rotation and IAM access controls satisfy Article 32(1)(d) ability to ensure ongoing security of processing; and the re-identification API enables compliance with Articles 15–17 (data subject rights). Google Cloud's own GDPR compliance documentation and Data Processing Agreement (DPA) provide the contractual framework for using the service as a processor.



#### §10.1.5 Limitations

The synchronous API introduces latency proportional to payload size and the number of infoTypes inspected — not suitable for ultra-low-latency APIs (sub-10ms budgets) where in-process FPE libraries (e.g., BPS FF3-1, haaddons) would be faster. The service is tied to Google Cloud infrastructure; FPE keys must reside in Cloud KMS, which may conflict with multi-cloud key management strategies. Detection accuracy depends on the quality of infoType configuration — overly broad detectors produce false positives that mask non-sensitive data, while overly narrow detectors miss PII. Custom infoTypes require tuning and periodic review. Finally, FPE-FFX in Google's implementation is NIST SP 800-38G compliant but does not support the newer FF3-1 revision's extended tweak length, which may limit compatibility with certain format-preserving use cases.

---

### §11.2 Microsoft Azure: API Management (APIM)

Azure API Management (APIM) is a fully managed API gateway service that provides a rich policy engine for transforming, securing, and mediating traffic between API consumers and backend services. Unlike dedicated PII protection tools, APIM approaches data protection through its **policy pipeline** — a configurable sequence of XML-based statements that execute on inbound requests and outbound responses as they pass through the gateway. For PII protection specifically, APIM provides two complementary mechanisms: **policy-driven request/response transformation** (stripping or masking PII in the data plane) and **Azure Monitor integration** for PII management in access logs and diagnostics (the control plane).



#### §10.2.1 Policy-Driven PII Transformation

APIM's policy engine processes requests and responses through four sequential sections — `inbound`, `backend`, `outbound`, and `on-error`. Policies relevant to PII protection span all four:



- **`<set-body>`** — Replaces the request or response body with an entirely new value. Using C#-based policy expressions, an API publisher can parse JSON/XML bodies, extract PII fields, and replace them with masked values or tokens before forwarding. This is the primary mechanism for body-level PII stripping.



- **`<set-query-parameter>` / `<set-header>`** — Modifies individual query parameters or HTTP headers. A policy can detect PII patterns in query strings (e.g., email addresses, phone numbers) and replace them with masked versions or remove them entirely before the request reaches the backend.



- **`<find-and-replace>`** — Performs substring replacement within the body or headers. Suitable for regex-based masking of known PII patterns.



- **`<rewrite-uri>`** — Rewrites the request URI, enabling removal of PII from path segments or query strings. For example, `/users/john.doe@example.com/profile` can be rewritten to `/users/{userId}/profile` after looking up the internal user ID.



- **`<choose>` with `<when>` conditions** — Applies conditional logic based on request properties. This enables selective PII masking only for specific API operations, subscription tiers, or client IP ranges.



A representative policy that masks email addresses and phone numbers in a request body:



```xml
<policies>
  <inbound>
    <set-body>
      @{
        var body = context.Request.Body.As<JObject>(true);
        if (body["email"] != null) {
            body["email"] = Regex.Replace(
                body["email"].ToString(),
                @"(.{2})(.*)(@.*)",
                "$1***$3"
            );
        }
        if (body["phone"] != null) {
            body["phone"] = Regex.Replace(
                body["phone"].ToString(),
                @"(\+?\d{3})\d{3}(\d{4})",
                "$1***$2"
            );
        }
        return body.ToString();
      }
    </set-body>
    <base />
  </inbound>
</policies>

```



**Policy expressions.** The real power of APIM's PII masking lies in its **policy expression language** — a subset of C# with access to the `context` object, which provides read/write access to the request, response, and backend configuration. Policy expressions can call .NET Framework methods, including `System.Text.RegularExpressions.Regex` for pattern matching and `Newtonsoft.Json.Linq.JObject` for JSON manipulation. This enables sophisticated PII handling: conditional masking based on field names, dynamic regex patterns loaded from named values, and integration with external services via the `send-request` policy for tokenization lookups.

```mermaid
---
title: "§10.2 — Azure APIM Policy Pipeline for PII Protection"
---
flowchart LR
    Client["`**Client**
    Request with PII`"]

    subgraph Pipeline["APIM Policy Pipeline"]
        direction TB
        Inbound["`**inbound**
        &lt;set-body&gt; — JSON parse, mask PII
        &lt;set-header&gt; — strip PII headers
        &lt;find-and-replace&gt; — regex mask`"]
        Backend["`**backend**
        Forward sanitized
        request to API`"]
        Outbound["`**outbound**
        &lt;set-body&gt; — mask PII
        in response before
        returning to client`"]
        OnError["`**on-error**
        Error handling
        Sanitize error
        messages of PII`"]
        Inbound --> Backend --> Outbound
        Backend -.->|On failure| OnError
    end

    KV["`**Azure Key Vault**
    Encryption keys
    Tokenization secrets`"]
    AppIns["`**Application Insights**
    Request telemetry
    Correlation IDs`"]
    LogAnalytics["`**Log Analytics**
    Personal Data Mgmt
    GDPR Art. 17 purge`"]
    APIBackend["`**Backend API**
    Receives PII-free
    request`"]
    
    Client -->|Request| Pipeline
    Pipeline -->|Response| Client
    Inbound -.->|"{{key-vault-secret}}"| KV
    Outbound -.->|Trace/telemetry| AppIns
    Pipeline -.->|Diagnostics| LogAnalytics
    Backend -->|Forwarded request| APIBackend

```

#### §10.2.2 Azure Key Vault Integration

APIM integrates natively with Azure Key Vault, enabling encryption keys and secrets to be stored centrally and referenced in policies via `{{key-vault-secret-name}}` syntax. For PII protection, this means tokenization or encryption keys can be managed in Key Vault (with separate access policies for encrypt and decrypt operations) and referenced from APIM policies without embedding credentials in the policy XML. Named values in APIM can be configured as Key Vault secrets, ensuring that any sensitive configuration — regex patterns, API keys for tokenization services, encryption key identifiers — is not stored in plaintext within the APIM instance.



#### §10.2.3 PII in Access Logs, Azure Monitor, and Application Insights

APIM generates detailed access logs for every API request, recording the full request URL (including query parameters), request headers, response status, and latency. By default, **query parameters containing PII are written in plaintext** to these logs. APIM provides two mechanisms for log-level PII protection:



1. **Backend logging policies.** The `<azure-openai-token-limit-policy>` and custom telemetry policies can filter what data is emitted to Application Insights. However, this requires explicit configuration and is not automatic.

2. **Named value encryption.** Named values (configuration variables used in policies) can be marked as secret and encrypted. This protects PII stored *as configuration* but does not affect PII in request data flowing through the gateway.



For comprehensive log-level PII protection, organizations typically deploy **APIM diagnostic settings** that route logs to Azure Monitor Log Analytics with a log transformation pipeline that masks or redacts PII fields before long-term storage. This is a two-stage approach: APIM handles data-plane PII transformation; Azure Monitor handles control-plane PII in logs.



**Azure Monitor Personal Data Management.** Azure Monitor provides a **Personal Data Management** capability that allows organizations to purge specific data subject's personal data from log records. When a GDPR Article 17 (right to erasure) request is received, operators can search Application Insights and Log Analytics workspaces for traces associated with a specific user identifier (email, subscription ID, IP address) and issue a bulk deletion. This is a reactive, manual process — it does not prevent PII from being logged in the first place, but it provides the erasure mechanism required by GDPR.



**Application Insights.** When APIM is configured with Application Insights integration, request telemetry (URL, headers, response code, duration) is emitted to the Application Insights resource. For PII-heavy APIs, this telemetry can contain sensitive data in request URLs and custom properties. APIM's `trace` policy allows controlled emission of custom telemetry, and the `correlation-id` policy can be used to correlate requests across services without embedding PII in trace identifiers. Organizations handling sensitive PII should carefully configure Application Insights sampling and filtering to minimize PII in telemetry while maintaining operational visibility.



#### §10.2.4 Scope and Inheritance

APIM policies can be applied at five levels of granularity — global (all APIs), product (all APIs in a product), API (all operations), operation (single endpoint), and workspace. The `<base />` element controls inheritance: including it merges parent-scope policies with the current scope; omitting it replaces parent policies entirely. For PII masking, a common pattern is to define baseline PII detection and masking rules at the global scope (catching email and phone patterns across all APIs) and supplement with operation-specific rules at finer scopes for domain-specific PII types.



#### §10.2.5 GDPR Alignment

Azure APIM's policy-driven approach to PII protection maps to several GDPR requirements: request/response masking via policy expressions supports data minimization (Article 5(1)(c)) by stripping or transforming PII before it reaches backend services or is returned to clients; Azure Key Vault integration provides encryption key management (Article 32(1)(a)); Azure Monitor's Personal Data Management capability enables erasure of data subject information from logs (Article 17); and Application Insights telemetry correlation supports accountability (Article 5(2)) without embedding PII in trace identifiers. However, because APIM's masking is non-cryptographic, it does not qualify as pseudonymisation under Article 4(5) — organizations requiring GDPR-compliant pseudonymisation must supplement APIM with an external cryptographic tokenization service.



#### §10.2.6 Limitations

The most significant limitation is that **APIM does not provide built-in FPE, tokenization, or encryption**. All PII masking is done through policy expressions using regex and string manipulation — which is fundamentally a masking/redaction approach, not cryptographic pseudonymisation. Masked values are not reversible, which means APIM cannot support use cases that require re-identification (e.g., analytics on pseudonymised data, customer service lookups). For cryptographic PII protection, APIM must delegate to an external service (e.g., Azure Functions calling Azure Key Vault, or a third-party tokenization API) via the `send-request` policy — adding latency and complexity.



Performance is another consideration: policy expressions execute synchronously in the APIM gateway's request path, and complex JSON manipulation or regex matching on large request bodies adds measurable latency. For high-throughput APIs, the overhead of body parsing and field replacement should be benchmarked against latency SLAs. Additionally, APIM policies are XML documents managed through the Azure portal, Git integration, or REST API — there is no built-in policy testing framework, so PII masking policies must be validated through integration testing against representative request payloads.

---

### §11.3 Amazon Web Services: Composite PII Protection

Amazon Web Services does not offer a single unified PII protection service equivalent to Google Cloud DLP. Instead, PII protection in AWS API-centric architectures is achieved through a combination of four services working in concert: **API Gateway** (request/response transformation and routing), **CloudWatch Logs** (log-level data protection), **Amazon Macie** (PII discovery in storage), and **AWS KMS** (cryptographic key management and envelope encryption). This compositional approach provides flexibility but requires intentional integration design — there is no managed de-identification API comparable to Google Cloud DLP or Azure APIM's policy engine.



#### §10.3.1 API Gateway: Request/Response Transformation

API Gateway supports two types: REST APIs (legacy, feature-rich) and HTTP APIs (lightweight, lower latency). Both support request/response transformation through Velocity Template Language (VTL) templates in integration mapping templates, but the mechanisms differ:



- **VTL Mapping Templates (REST APIs).** Request and response bodies can be transformed using Apache Velocity templates that apply JSONPath queries and string manipulation. For PII stripping, a mapping template can selectively omit PII fields from the request body before forwarding to the backend:



```json
#set($inputRoot = $input.path('$'))
{
  "userId": "$inputRoot.userId",
  "requestId": "$util.uuid()",
  #foreach($key in $inputRoot.keySet())
    #if($key != "email" && $key != "ssn" && $key != "phone")
      "$key": $input.json("$key")
    #end
  #end
}

```



This approach strips known PII fields entirely. However, VTL templates have limited string manipulation capabilities — there is no built-in regex engine for masking (replacing partial values while preserving structure). Partial masking requires escaping to a Lambda function, adding latency.



- **Lambda Authorizers.** A Lambda authorizer function executes before the backend integration, receiving the full request (headers, query parameters, body for REST APIs). Lambda authorizers can inspect request data for PII patterns, return deny responses for non-compliant requests, or modify request headers to pass a PII-free token or reference ID to the backend. This is the most flexible PII handling mechanism in API Gateway but introduces the full cold-start and execution latency of Lambda.



- **AWS WAF Integration.** API Gateway integrates with AWS WAF, which can inspect incoming requests for patterns matching sensitive data exposure. WAF regex pattern sets and managed rule groups (including the `AWSManagedRulesKnownBadInputsRuleSet`) can block requests containing PII patterns (e.g., SSN patterns, credit card sequences) in URLs, query strings, or headers. WAF operates at the edge — before the request reaches API Gateway — providing the earliest possible interception. However, WAF is a security filter, not a transformation layer: it can block or allow requests but cannot mask or replace PII values.



#### §10.3.2 CloudWatch Logs: Data Protection Policies

CloudWatch Logs introduced **data protection policies** (2024) as a native capability for automatically detecting and masking sensitive data in log events at ingestion time. This is the closest AWS analogue to Azure Monitor's log-level PII management and is the most significant AWS development for API log PII protection:



- **Managed Data Identifiers.** CloudWatch Logs provides pre-configured detectors for five categories: Credentials (private keys, AWS secret access keys, API keys), Financial Information (credit card numbers, ABA routing numbers), Personally Identifiable Information (SSNs, driver's license numbers, passport numbers, taxpayer identification numbers), Protected Health Information (medical record numbers, health insurance numbers), and Device Identifiers (IP addresses, MAC addresses). Detection uses a combination of pattern matching and machine learning models.



- **Account-Level and Log Group-Level Policies.** Data protection policies can be applied at two scopes: account-wide (covering all existing and future log groups) or per-log-group. Both scopes are additive — if an account-wide policy masks SSNs and a log group policy masks credit card numbers, both are enforced on that log group. Each log group supports one data protection policy document, but the policy can specify many managed data identifiers.



- **Masking and Audit.** When a data protection policy is active, matching sensitive data is masked at all egress points: CloudWatch Logs Insights queries, metric filters, subscription filters, and log exports. Only IAM principals with the `logs:Unmask` permission can view unmasked data. A `LogEventsWithFindings` metric is emitted to CloudWatch Metrics when sensitive data is detected, enabling alarms and dashboards for compliance monitoring.



- **Custom Data Identifiers.** Beyond managed identifiers, organizations can define custom data identifiers using regex patterns — useful for domain-specific PII formats not covered by the built-in detectors (e.g., internal employee IDs, proprietary account numbers).



A data protection policy for an API Gateway log group:



```json
{
  "Version": "2024-01-01",
  "AuditLogDestination": {
    "LogGroup": "/aws/cloudwatch/api-gateway-audit"
  },
  "DataIdentifiers": [
    "arn:aws:logs:us-east-1:123456789012:defined-data-identifier/SocialSecurityNumber",
    "arn:aws:logs:us-east-1:123456789012:defined-data-identifier/CreditCardNumber",
    "arn:aws:logs:us-east-1:123456789012:defined-data-identifier/EmailAddress"
  ],
  "OversizedDataProtection": {
    "FindingsThreshold": {
      "Type": "PERCENTAGE",
      "Value": 50
    }
  }
}

```



#### §10.3.3 Amazon Macie: PII Discovery in Storage

Amazon Macie is a fully managed data security and data privacy service that uses machine learning and pattern matching to discover and classify sensitive data in Amazon S3. While Macie does not process API traffic directly, it is relevant to PII protection in API architectures because **API gateway logs, Lambda execution logs, and application traces are commonly stored in S3** for long-term retention. Macie scans these S3 buckets and generates findings when PII is detected, providing visibility into data exposure that might otherwise go unnoticed — for example, API access logs archived to S3 that contain unmasked query parameters with PII. Macie supports managed data identifiers for PII, PHI, and financial data, and integrates with AWS Security Hub for centralized finding management.



#### §10.3.4 AWS KMS: Envelope Encryption, Key Management, and CloudTrail Audit

AWS Key Management Service provides the cryptographic foundation for PII protection in AWS. For API-centric architectures, the most relevant KMS pattern is **envelope encryption**:



1. The API gateway or a Lambda function calls `KMS GenerateDataKey` to create a unique Data Encryption Key (DEK) for each request or batch.

2. KMS returns the plaintext DEK and an encrypted copy of the DEK (encrypted under a Customer Managed Key).

3. The plaintext DEK encrypts the PII payload locally (using AES-256-GCM via the AWS Encryption SDK).

4. The encrypted DEK is stored alongside the encrypted payload — only KMS can decrypt the DEK using the CMK.

5. Decryption reverses the process: call `KMS Decrypt` on the encrypted DEK, then use the recovered plaintext DEK to decrypt the payload.



This pattern provides **cryptographic isolation** between requests — each request is encrypted under a unique key, so compromise of one DEK does not expose other requests. It also aligns with the **principle of least privilege**: a Lambda function processing API requests can be granted `kms:GenerateDataKey` and `kms:Decrypt` permissions on a specific CMK, while denied `kms:CreateKey` or access to keys used by other services.



**Key management features.** KMS Customer Managed Keys (CMKs) provide fine-grained access control through key policies and IAM policies. Key policies can restrict which IAM roles, users, or service accounts can encrypt, decrypt, or re-encrypt data — enabling separation between services that encrypt (API gateways, edge functions) and services that decrypt (backend business logic, analytics pipelines). CMKs support **automatic annual rotation**, which creates a new key version while maintaining backward compatibility with data encrypted under previous versions. **Multi-Region keys** (introduced 2022) allow a single key to be replicated across AWS regions, supporting cross-region API deployments without key management fragmentation.



**CloudTrail audit.** All KMS API calls are logged to AWS CloudTrail, providing a tamper-evident audit trail of every key operation — who called `GenerateDataKey`, when a `Decrypt` was performed, from which IP address. This audit trail satisfies GDPR Article 30 (records of processing activities) and Article 32(1)(d) (regular testing and evaluation of security measures). CloudTrail logs themselves should be protected — stored in an S3 bucket with server-side encryption using a dedicated CMK, with Object Lock enabled for immutability.



#### §10.3.5 Integration Pattern: API Gateway to Lambda to Backend

The most common AWS pattern for PII protection in APIs combines these services: API Gateway receives the request, a Lambda authorizer or integration function inspects and transforms the request (masking or encrypting PII fields using the AWS Encryption SDK with KMS-managed keys), the transformed request is forwarded to the backend, and CloudWatch Logs captures gateway and Lambda logs with data protection policies masking any residual PII. Macie periodically scans S3 buckets where logs are archived for PII exposure. This compositional architecture provides defense in depth but requires deliberate integration across multiple services — each with its own configuration, IAM policies, and monitoring.

```mermaid
---
title: "§10.3 — AWS Composite PII Protection Architecture"
---
flowchart TD
    Client["`**API Client**
    Sends request with PII`"]
    WAF["`**AWS WAF**
    Pattern matching
    Block/Allow`"]
    GW["`**API Gateway**
    VTL Transform
    Route to Lambda`"]
    Lambda["`**Lambda Function**
    AWS Encryption SDK
    PII encrypt/mask`"]
    KMS["`**AWS KMS**
    CMK → DEK
    Envelope Encryption`"]
    Backend["`**Backend Service**
    Receives tokenized
    or masked payload`"]
    CWLogs["`**CloudWatch Logs**
    Data Protection Policy
    Auto-mask PII`"]
    Macie["`**Amazon Macie**
    S3 PII Discovery
    Classification Findings`"]
    S3["`**S3 Bucket**
    Log Archive
    Encrypted at rest`"]
    CT["`**CloudTrail**
    KMS API audit trail
    Tamper-evident`"]
    SecurityHub["`**Security Hub**
    Centralized Findings
    From Macie + CT`"]
    SIEM["`**SIEM / Compliance**
    Audit evidence
    GDPR Art. 30/32`"]
    
    Client -->|HTTPS Request| WAF
    WAF -->|Allowed Request| GW
    GW -->|VTL Transform / Route| Lambda
    Lambda -->|"GenerateDataKey"| KMS
    KMS -->|"DEK (plaintext + encrypted)"| Lambda
    Lambda -->|"Encrypted payload"| Backend
    Lambda -->|Log events| CWLogs
    CWLogs -->|Masked logs| S3
    Macie -->|PII findings| SecurityHub
    CT -->|KMS audit trail| SecurityHub
    SecurityHub -->|Compliance evidence| SIEM

```

#### §10.3.6 GDPR Alignment

The AWS stack provides GDPR-relevant capabilities at each layer: API Gateway + Lambda for data-plane transformation (Articles 25, 32), CloudWatch data protection policies for control-plane log masking (Article 5(1)(c) data minimization), KMS for encryption and pseudonymisation (Article 32(1)(a)), CloudTrail for audit trails (Articles 30, 32(1)(d)), and Macie for PII discovery and classification (Article 30, data mapping). However, **AWS does not provide a managed pseudonymisation or FPE service** — pseudonymisation must be implemented in Lambda code using the AWS Encryption SDK, third-party libraries (e.g., BPS FF3-1), or external tokenization services. The compositional nature of the AWS approach means organizations must design, implement, and maintain the integration logic themselves.



#### §10.3.7 Limitations

The primary limitation is the lack of a unified de-identification API. Google Cloud DLP provides `deidentifyContent` as a single call; AWS requires the organization to build the equivalent from Lambda + KMS + CloudWatch. VTL templates in API Gateway have limited string manipulation — no regex, no crypto — so PII transformation must be delegated to Lambda, adding at least 10–50ms of cold-start or warm-execution latency. CloudWatch data protection policies operate on ingested logs (not on in-flight request data), so they protect logs but not the API traffic itself. Macie only scans S3 — it does not protect DynamoDB, RDS, or in-transit data. Multi-region key management requires planning: Multi-Region keys have feature limitations (no HMAC, no asymmetric signing) that may affect certain integration patterns.

---

### §11.4 Cross-Cloud Provider Comparison

The three cloud providers — Google Cloud, Azure, and AWS — take fundamentally different approaches to PII protection in API-centric architectures. Google Cloud provides a purpose-built DLP service with a managed de-identification API; Azure leverages its API Management gateway's policy engine for inline transformation; AWS requires composing multiple services (API Gateway, Lambda, KMS, CloudWatch) into a custom pipeline. The following table compares their capabilities across key dimensions:

| Capability | Google Cloud | Azure | AWS |
|:-----------|:-------------|:------|:----|
| Managed DLP/de-identification API | ✅ Cloud DLP | ❌ No native DLP | ❌ No native DLP |
| API gateway policy engine | ⚠️ Envoy/ESP (not covered) | ✅ APIM (rich XML policies) | ⚠️ VTL templates (limited) |
| Log-level PII masking | ⚠️ Cloud Logging filters | ✅ Azure Monitor PDM | ✅ CloudWatch data protection |
| Managed FPE/tokenization | ✅ FPE-FFX in Cloud DLP | ❌ No native FPE | ❌ No native FPE |
| PII discovery service | ✅ Cloud DLP inspection | ❌ Manual | ✅ Macie (S3 only) |
| Key management integration | ✅ Cloud KMS | ✅ Key Vault | ✅ KMS + CloudHSM |
| Pseudonymisation capability | ✅ FPE + deterministic hash | ❌ Masking only (non-crypto) | ⚠️ Via Lambda + Encryption SDK |
| Re-identification API | ✅ `reidentifyContent` | ❌ Not applicable | ❌ Custom implementation |
| Data subject erasure in logs | ⚠️ Manual | ✅ Personal Data Management | ⚠️ Manual |
| Compliance audit trail | ✅ Cloud Audit Logs | ✅ Azure Monitor + Activity | ✅ CloudTrail |

**Key architectural trade-offs:**

- **Google Cloud** offers the most integrated solution — a single service (Cloud DLP) handles detection, transformation, and re-identification. This reduces integration complexity but creates vendor lock-in to Google's KMS and DLP APIs.
- **Azure APIM** provides the richest inline transformation capabilities through its XML policy engine and C# expressions, but lacks cryptographic pseudonymisation — all masking is non-reversible string manipulation.
- **AWS** provides the most composable building blocks but requires the most integration effort. Organizations comfortable managing Lambda functions and multi-service configurations gain maximum flexibility, at the cost of operational complexity.

All three providers offer robust key management (Cloud KMS, Key Vault, AWS KMS) and compliance audit logging — the differentiator is the PII protection layer above key management, not the key management itself.

---

### §11.5 Cequence API Security: Inline Security Proxy

Unlike the cloud-provider services discussed above, Cequence operates as a dedicated **inline security proxy** — not a cloud-native DLP service, API gateway, or tokenization platform. It intercepts API traffic between clients and backends, combining ML-based PII detection with format-preserving encryption to mask sensitive data in real time. This architectural distinction is important: Cequence sits in the data path rather than requiring integration with cloud-provider services, making it deployable in any infrastructure environment (cloud, on-premises, hybrid).

Cequence API Security (formerly Imperva/Shape Security) is a unified API security platform that provides API discovery, posture management, bot defense, and sensitive data protection in a single solution. Its **Sensitive Data Exposure** capability combines ML-based PII detection with format-preserving encryption (FPE) to mask sensitive data inline without requiring changes to backend application code or API contracts.



#### §10.5.1 Architecture and ML-Based PII Detection

Cequence's architecture centers on a reverse proxy or API gateway plugin, intercepting all API traffic between clients and backends. The platform processes requests and responses through a multi-stage pipeline: TLS termination → request parsing → ML-based threat detection → PII detection and classification → policy enforcement (block, allow, mask, transform) → forwarding to backend. The inline deployment model is critical for PII protection: because Cequence sits in the data path, it can **mask PII in the request or response body, headers, and query parameters before the traffic reaches backend services or is logged**. This differs from cloud-provider approaches where PII protection is applied at the gateway policy layer (Azure APIM) or as a post-hoc log operation (AWS CloudWatch).



**ML-Based PII detection.** Cequence uses machine learning models — not solely regex pattern matching — to detect PII in API payloads. This approach offers two advantages over pure regex: **higher recall** for PII that doesn't conform to rigid patterns (e.g., names with non-Western character sets, phone numbers with variable formatting, health data identifiers that change between providers) and **lower false-positive rates** for data that matches a PII pattern but isn't actually sensitive (e.g., a 16-digit order number that happens to look like a credit card). The ML models are trained on API traffic patterns and can be tuned per deployment to account for domain-specific data formats. Cequence also supports regex-based rules for deterministic detection of known formats (SSN, credit card, IBAN).

```mermaid
---
title: "§10.5 — Cequence API Security — Inline Proxy Deployment"
---
flowchart TD
    Client["`**API Client**
    Request with PII`"]
    
    subgraph Cequence["Cequence Security Proxy"]
        TLS["TLS Termination"]
        Parse["Request Parsing"]
        ML["`**ML PII Detection**
        + Regex Rules`"]
        Policy["`**Policy Engine**
        Mask / Block / Allow
        Confidence thresholds`"]
        FPE["`**Inline FPE**
        Format-Preserving
        Encryption`"]
        Forward["Forward to Backend"]
    end
    
    Backend["`**Backend Service**
    Receives masked/tokenized
    payload`"]
    Mgmt["`**Management Dashboard**
    Policy configuration
    Versioned rollouts`"]
    AuditLog["`**Audit Logs**
    PII type, endpoint
    client identity`"]
    
    Client -->|Request| TLS --> Parse --> ML --> Policy
    Policy -->|Mask| FPE --> Forward --> Backend
    Policy -->|Allow| Forward
    Policy -->|Block| Client
    Mgmt -.->|Policy updates| Policy
    ML -.->|Detection events| AuditLog
    FPE -.->|Masking operations| AuditLog

```

#### §10.5.2 Sensitive Data Masking: Inline FPE

When PII is detected in an API request or response, Cequence can apply **real-time masking** using format-preserving encryption. The key characteristics:



- **Inline operation.** Masking occurs in the request/response path without redirecting traffic to an external service or requiring backend cooperation. The latency overhead is bounded and predictable because the FPE computation happens within the proxy's execution context, not in a separate network call.



- **FPE-based transformation.** Cequence uses format-preserving encryption to mask PII values while preserving their format and length. A credit card number `4111 1111 1111 1111` becomes `9284 7362 5091 0000` — same length, same character set, Luhn-valid. An email address `alice@example.com` becomes a masked email of the same structure. FPE is reversible within Cequence (for authorized re-identification), but the masked value transmitted to the backend is cryptographically protected — the backend never sees plaintext PII.



- **Directional control.** Policies can specify masking independently for request and response directions. For example, an organization might mask PII in inbound requests (protecting backend systems from receiving plaintext PII) while leaving responses unmasked (returning data to the client). Or conversely, mask PII in outbound responses (protecting logged response payloads) while passing unmasked requests to the backend.



- **Selective masking by endpoint.** Policies are scoped to specific API endpoints, HTTP methods, and content types. A health check endpoint might be excluded from masking, while a user profile creation endpoint has aggressive PII masking applied. This granularity prevents over-masking of non-sensitive endpoints (reducing latency) while ensuring comprehensive protection for sensitive operations.



#### §10.5.3 Policy Engine and Compliance

Cequence's policy engine determines which PII types to detect, which to mask, and what action to take (mask, block, allow, log). Policies are configured through a management dashboard and can be versioned for staged rollouts. The policy engine supports:



- **PII type classification** — detect and mask specific categories: SSN, credit card numbers (PAN), email addresses, phone numbers, names, dates of birth, health identifiers, and custom patterns.

- **Confidence thresholds** — set minimum detection confidence levels before masking is applied, reducing false positives for ambiguous data.

- **Action policies** — choose between masking (FPE replacement), blocking (reject the request), or logging-only (detect but don't modify, for audit purposes).

- **Exemptions** — exclude specific API keys, OAuth scopes, IP ranges, or internal service-to-service calls from masking policies.



**Compliance and audit.** Cequence's masking capabilities are positioned for **GDPR, PCI DSS, and HIPAA** compliance. For PCI DSS, inline FPE masking of credit card numbers in API requests reduces the cardholder data environment (CDE) scope — backend services receive only masked PANs, which fall outside PCI DSS scope if the encryption key is managed outside the CDE. For GDPR, FPE masking qualifies as pseudonymisation under Article 4(5) — the data cannot be attributed to a specific data subject without additional information (the FPE key). Cequence generates detailed audit logs of all masking operations, including the original PII type, the masked value, the endpoint, and the client identity — providing the accountability chain required by GDPR Article 30.



#### §10.5.4 API Discovery and Inventory

Cequence's API discovery capability provides an inventory of all API endpoints, including shadow and deprecated APIs that may not have PII protection policies applied. By mapping the full API surface, organizations can identify endpoints that handle sensitive data but lack masking policies — a critical gap for compliance. This discovery-driven approach to PII protection is complementary to the masking itself: discovery finds the exposure; masking closes it.



#### §10.5.5 Deployment Models

Cequence can be deployed in three configurations:



1. **Inline proxy.** Traffic is routed through Cequence appliances or virtual machines deployed in the network path. This provides the deepest inspection and transformation capabilities but introduces a network hop.

2. **API gateway plugin.** Cequence integrates with existing API gateways (Kong, AWS API Gateway, NGINX) as a plugin or sidecar, adding PII detection and masking to the existing gateway layer.

3. **Cloud-native.** Cequence offers a SaaS deployment where API traffic is routed through Cequence cloud points of presence. This provides zero-footprint deployment but may raise data residency concerns for organizations with strict data sovereignty requirements.



#### §10.5.6 Limitations

Cequence is fundamentally a **security platform with PII masking as one capability** — not a dedicated data protection or tokenization platform. Its FPE implementation is opaque (the specific algorithm and key management internals are not publicly documented), which may conflict with organizations that require FIPS 140-2 validated cryptography or NIST SP 800-38G compliance for FPE. The inline deployment model adds a network hop and processing latency; while Cequence claims low latency overhead, the exact numbers are workload-dependent and not publicly benchmarked. Pricing is enterprise-tier and typically requires a direct sales engagement, making it inaccessible for smaller organizations or those seeking a self-service solution. Finally, re-identification (decrypting masked values) requires Cequence's infrastructure — organizations cannot independently re-identify data masked by Cequence without going through the platform, creating a vendor dependency.

---

### §11.6 Fortanix Data Security Manager (DSM): Multi-Cloud Cryptographic Platform

> **Categorization note.** Fortanix DSM is a multi-cloud cryptographic platform providing FPE-based tokenization and HSM-backed key management. Its capabilities and product category closely align with the tokenization platforms covered in §8 (HashiCorp Vault, Thales CipherTrust, Protegrity, Skyflow, Pangea). It is included here for completeness alongside the cloud-native solutions, but organizations evaluating tokenization platforms should compare Fortanix directly against the §8 products.

**Fortanix Data Security Manager (DSM)** is a unified data security platform that provides key management, secrets management, encryption, tokenization, and cryptographic operations across hybrid and multi-cloud environments. Unlike cloud-provider KMS services that are scoped to a single cloud ecosystem, Fortanix DSM is designed to be a **cloud-agnostic cryptographic platform** — managing keys and performing cryptographic operations across AWS, Azure, GCP, and on-premises infrastructure from a centralized control plane. Its **Data Tokenization** capability (built on NIST FF1 Format-Preserving Encryption) is the feature most relevant to PII protection in API contexts.



#### §10.6.1 FPE-Based Tokenization

Fortanix DSM implements **vaultless, Format-Preserving Encryption (FPE)** using the NIST FF1 algorithm (defined in NIST SP 800-38G). This approach replaces sensitive data values with ciphertext tokens that preserve the original data's format, length, and character set — a credit card number remains a 16-digit number, an SSN retains the `XXX-XX-XXXX` pattern, an email address keeps its `local@domain.tld` structure. The key characteristics:



- **Vaultless architecture.** Unlike vault-based tokenization (e.g., HashiCorp Vault Tokenization, Thales Vaulted), Fortanix does not store token-to-plaintext mappings. Tokenization is a pure cryptographic operation: the same input with the same key always produces the same token, and re-identification is the reverse FPE decryption. This eliminates the latency and storage overhead of vault lookups, making Fortanix suitable for high-throughput API workloads where every millisecond of latency matters.



- **NIST FF1 compliance.** Fortanix uses the FF1 algorithm (as opposed to the newer FF3-1), which supports larger tweak lengths and is better suited for certain data formats. FF1 is approved by NIST for use in government and financial services applications, and Fortanix's implementation is FIPS 140-2 Level 3 validated when running on Intel SGX enclaves (see below).



- **Multi-format support.** DSM supports FPE tokenization for common PII formats including credit card numbers (PAN), SSNs, phone numbers, email addresses, dates, and custom formats defined through regex-based templates. The platform allows organizations to define their own format templates, ensuring that domain-specific identifiers (e.g., employee IDs, medical record numbers with specific formats) can be tokenized without format breakage.



- **Deterministic and randomizable modes.** In deterministic mode, the same plaintext always produces the same token — enabling record linkage, deduplication, and search on tokenized data. In randomizable mode (using a "tweak" value), different tokens can be generated for the same plaintext by varying the tweak parameter — providing stronger privacy guarantees at the cost of losing deterministic linkability.



#### §10.6.2 HSM-Backed Key Management

Fortanix DSM's distinguishing technical feature is its **hardware security module backing**. Cryptographic keys — including FPE tokenization keys — are protected by one of two mechanisms:



1. **Intel SGX Enclaves.** In its SaaS and on-premises deployments, DSM can run cryptographic operations inside Intel SGX (Software Guard Extensions) enclaves — hardware-isolated memory regions where code and data are protected from the operating system, hypervisor, and cloud provider. This provides a level of key protection that is comparable to a traditional HSM without requiring dedicated HSM hardware. Fortanix DSM running on SGX has achieved FIPS 140-2 Level 3 validation, making it suitable for regulated industries.



2. **External HSM Integration.** For organizations that require or prefer traditional HSMs, DSM integrates with external HSMs (Thales, Utimaco, AWS CloudHSM) via PKCS#11, storing FPE keys in the external HSM while DSM manages the tokenization workflow, policy enforcement, and audit logging. This hybrid approach combines DSM's multi-cloud key management with the hardware-level assurance of a dedicated HSM.



#### §10.6.3 Centralized Governance and Policy

DSM provides a centralized policy engine for governing key access and cryptographic operations. Policies control:



- **Who** can perform tokenization/detokenization — based on identity (users, service accounts, API keys), role, or group membership.

- **What** operations are permitted — encrypt-only, decrypt-only, both, or audit-only.

- **Where** operations can be performed — restricted by IP range, network segment, cloud environment, or geographic region.

- **When** operations are permitted — time-based access windows for compliance with data handling schedules.



Policies are enforced uniformly regardless of where the tokenization is invoked — whether from an AWS Lambda function, an Azure API Management policy, a GCP Cloud Function, or an on-premises application. This centralized governance model is critical for organizations with multi-cloud API deployments where PII protection must be consistent across environments.



#### §10.6.4 API and Integration

DSM exposes a REST API for all cryptographic operations, including tokenization (encrypt) and detokenization (decrypt). A typical API call:



```bash
curl -X POST https://amer.smartkey.io/api/v1/crypto/encrypt \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "kid": "fpe-key-uuid",
    "alg": "FF1",
    "plaintext": "4111111111111111",
    "tweak": "payment-processor-A"
  }'



# Response: {"ciphertext": "9284736250910000"}

```



Client libraries are available for Python, Java, Go, and Node.js. Two integration patterns are common for API-centric architectures:



1. **Direct API integration.** Backend services call DSM's encrypt/decrypt API directly, typically through a client SDK that handles authentication, retries, and key selection. This is the simplest integration but requires network access from the backend to DSM.



2. **Gateway-side integration.** An API gateway (Kong, AWS API Gateway + Lambda, Envoy with external processing filter) calls DSM to tokenize PII in inbound requests before forwarding to the backend. The backend receives only tokenized data, reducing its compliance scope. For detokenization, the gateway or a separate service calls DSM's decrypt API.



#### §10.6.5 Tamper-Evident Audit Trail

DSM generates comprehensive audit logs for every cryptographic operation: who performed the operation, which key was used, the input (or a cryptographic hash of it), the output (or a hash), timestamps, and the client IP. Audit logs are cryptographically signed and append-only, providing tamper evidence. When DSM runs on SGX enclaves, the audit trail itself is generated within the enclave — ensuring that even a compromised operating system cannot alter audit records. This satisfies GDPR Article 32(1)(d)'s requirement for regularly testing the effectiveness of technical measures and Article 30's documentation requirements.



#### §10.6.6 Multi-Cloud Key Management

Fortanix DSM provides unified key management across AWS, Azure, GCP, and on-premises environments. It integrates as an **External Key Store (XKS) for AWS KMS**, an **External Key Manager (EKM) for Google Cloud KMS**, and supports **Bring Your Own Key (BYOK)** for Azure. This means organizations can manage all FPE tokenization keys from a single DSM control plane while using cloud-native KMS integrations for key access — maintaining the cloud provider's IAM and service integration while centralizing key governance in DSM.



#### §10.6.7 GDPR Alignment and Deployment Options

Fortanix DSM's capabilities map directly to GDPR requirements: FPE tokenization qualifies as pseudonymisation (Article 4(5), Article 32(1)(a)); centralized policy-driven access control supports data protection by design and by default (Article 25); the tamper-evident audit trail satisfies accountability and documentation requirements (Articles 24, 30, 32(1)(d)); SGX enclave-backed key protection provides encryption at a level exceeding standard software-based key management (Article 32(1)(a)); and the ability to perform erasure of tokenized data (by rotating or deleting the FPE key) supports the right to erasure (Article 17) — though with the caveat that rotating a key does not retroactively erase data already detokenized and stored elsewhere.



**Deployment options:** DSM is available in three deployment models: **SaaS** (hosted by Fortanix across global regions — North America, EU, UK, APAC, Australia, Saudi Arabia — each with data residency guarantees), **on-premises** (software appliance running on customer hardware with optional SGX or external HSM), and **hybrid** (SaaS control plane with on-premises key storage via HSM). The SaaS model provides the fastest deployment but requires trust in Fortanix as a data processor; the on-premises model provides maximum control but requires infrastructure provisioning; the hybrid model balances both.



#### §10.6.8 Limitations

The NIST FF1 algorithm (as opposed to FF3-1) is approved by NIST but has been subject to academic analysis suggesting that very large tweak lengths may reduce security margins — FF3-1 addresses this concern. Organizations with strict FPE algorithm requirements should verify whether FF1 meets their risk tolerance or whether FF3-1 is preferred. DSM is a separate infrastructure component that must be deployed and managed alongside existing API infrastructure — it is not a built-in cloud service. The REST API introduces network latency for each tokenization/detokenization call; while DSM's SGX-accelerated cryptography is fast, the round-trip latency is typically 1–5ms depending on network topology, which may be significant for ultra-low-latency APIs. Licensing is enterprise-tier with pricing based on the number of keys, cryptographic operations, and deployment model. Finally, while DSM provides excellent key governance and audit, it does not include PII detection (finding PII in unstructured data) — organizations must know which fields contain PII and configure tokenization policies accordingly, or use a complementary detection tool (e.g., Google Cloud DLP) for discovery.

---

## 12. Build-vs-Buy Decision Framework

---

### §12.1 Decision Overview

This chapter sits **after** the pattern and platform material because build-vs-buy is a second-order decision. Teams should first decide how they intend to remove or control personal data exposure, then decide whether to implement those controls themselves, buy a platform, or combine the two. Choosing between building, buying, or combining PII protection capabilities is a multi-dimensional decision that depends on regulatory requirements, engineering capacity, budget constraints, time-to-market pressure, and operational complexity. The following matrix provides a quick-reference guide to narrow the decision based on an organization's primary constraints:

| Primary Constraint | Recommended Approach | Rationale |
|:-------------------|:---------------------|:----------|
| Air-gapped / data sovereignty mandate | **Build** (§12.2) | Third-party services cannot reach isolated environments |
| In-house crypto expertise available | **Build** or **Hybrid** (§12.2, §12.4) | Leverage existing team knowledge |
| Budget < $100K/year | **Build** or **Cloud-native** (§12.2, §12.5.4) | Enterprise licensing exceeds budget |
| Multi-cloud deployment | **Buy — Enterprise** (§12.3) | Unified key management across providers |
| Time-to-market < 3 months | **Buy — Cloud-native** (§12.3) | Fastest integration path |
| Domain-specific PII detection | **Hybrid** (§12.4.3) | Custom detection + vendor enforcement |
| Regulatory third-party certification required | **Buy** (§12.3) | Vendor certifications satisfy auditor requirements |
| Tight cost constraints, narrow feature set | **Build** (§12.2) | Minimal scope keeps build effort manageable |

```mermaid
---
config:
  flowchart:
    htmlLabels: false
---
flowchart TD
    START["`**PII Protection Approach Decision**
    Start Here`"]

    Q1{"Air-gapped or data<br/>sovereignty mandate?"}
    Q2{"In-house crypto<br/>expertise?"}
    Q3{"Budget > 100K/year<br/>for licensing?"}
    Q4{"Multi-cloud or<br/>hybrid deployment?"}
    Q5{"Time-to-market<br/>pressure (< 3 months)?"}
    Q6{"Domain-specific PII<br/>detection needed?"}

    BUILD["`**BUILD**
    Custom implementation
    (§12.2)`"]

    BUY_CLOUD["`**BUY — Cloud-Native**
    Google DLP / AWS KMS
    (§12.3, Approach 3)`"]

    BUY_MID["`**BUY — Mid-Tier**
    VGS / Skyflow / Fortanix
    (§12.3, Approach 4)`"]

    BUY_ENTERPRISE["`**BUY — Enterprise**
    Vault Enterprise / Thales
    (§12.3, Approach 5)`"]

    HYBRID_API["`**HYBRID**
    Build API layer + buy tokenization
    (§12.4.1)`"]

    HYBRID_DETECT["`**HYBRID**
    Build detection + buy enforcement
    (§12.4.3)`"]

    HYBRID_INFRA["`**HYBRID**
    Build tokenization + buy infra
    (§12.4.2)`"]

    START --> Q1
    Q1 -->|Yes| BUILD
    Q1 -->|No| Q2
    Q2 -->|Yes| Q6
    Q2 -->|No| Q3
    Q6 -->|Yes| HYBRID_DETECT
    Q6 -->|No| HYBRID_INFRA
    Q3 -->|Yes| Q4
    Q3 -->|No| Q5
    Q5 -->|Yes| BUY_CLOUD
    Q5 -->|No| BUY_CLOUD
    Q4 -->|Yes| BUY_ENTERPRISE
    Q4 -->|No| Q5
```

---

### §12.2 When to Build

Custom implementation of PII protection is the right choice when an organization's requirements diverge significantly from what commercial products offer, when engineering capacity is available and cost constraints preclude enterprise licensing, or when operational constraints make third-party services infeasible. Building is not inherently inferior — it provides maximum control — but it demands sustained investment in security engineering and ongoing maintenance that many organizations underestimate.



#### §12.2.1 Criteria for Building

**Highly specific requirements.** Commercial tokenization and encryption platforms are designed for common PII types: names, email addresses, phone numbers, national identification numbers, financial account numbers, and healthcare identifiers. When an organization's data model includes proprietary identifiers, domain-specific sensitive fields, or unusual data formats that don't map cleanly to vendor-provided detection rules, a custom solution may be necessary. For example, a logistics company tracking shipment identifiers that encode customer location data may find that no vendor's PII detection rules recognize these as sensitive — the sensitivity is contextual and domain-specific, requiring custom regex patterns, NLP models, or business logic that only internal engineers can implement correctly.



**Air-gapped and highly regulated environments.** Organizations in defense, intelligence, classified government contracting, or heavily regulated industrial sectors (nuclear, critical infrastructure) often operate in air-gapped environments where external SaaS services cannot reach and where data residency requirements prohibit transmitting PII to third-party processors. In these environments, the question is not whether to build, but how to build within the constraints. The available building blocks — open-source cryptographic libraries (Google Tink, Bouncy Castle, libsodium), HashiCorp Vault OSS for key management, and custom middleware — provide the raw materials, but the organization must supply the engineering effort to assemble them into a coherent system.



**Tight cost constraints.** Enterprise tokenization platforms carry annual licensing costs ranging from $50,000 to $500,000+ (see §12.5 for detailed cost analysis). For early-stage companies, startups, or internal tools with limited PII exposure, this expenditure may be unjustifiable. A simple encryption middleware that encrypts PII fields in API request bodies using AES-256-GCM with keys stored in a cloud KMS can be implemented in 2–4 developer-weeks. A header-based placeholder pattern — replacing PII in URLs with opaque tokens and resolving them server-side from a session store — can be built in 1–2 developer-weeks. These minimal implementations may not match the feature breadth of commercial products, but they address the core requirement: preventing PII from appearing in logs, URLs, and intermediary systems.



**Full control over cryptographic implementation.** Some organizations — particularly those in financial services, healthcare, or government — require precise control over the cryptographic algorithms, key lengths, modes of operation, and key management procedures used to protect PII. This may be driven by regulatory mandates (e.g., FIPS 140-2/3 validation requirements that exclude certain vendor implementations), internal cryptographic standards, or the need to integrate with existing HSM infrastructure. Building allows the organization to select and validate every cryptographic component, implement custom key derivation schemes, and maintain full auditability over the cryptographic pipeline. Open-source libraries like Google Tink (which provides audited, misuse-resistant cryptographic primitives) and Bouncy Castle (a comprehensive Java cryptography provider supporting FIPS-validated modes) make this feasible without implementing cryptography from scratch — a task that is almost always a mistake.



**Integration with proprietary systems.** Legacy systems, proprietary databases, custom ERP platforms, and bespoke data pipelines may not expose the integration points that commercial tokenization platforms expect. A vendor's SDK may target PostgreSQL and MySQL but not a proprietary columnar store; a tokenization proxy may intercept HTTP but not gRPC or proprietary binary protocols. When the integration surface doesn't match vendor expectations, the effort to bridge the gap (custom adapters, protocol translation layers, data transformation pipelines) can approach or exceed the effort of building the PII protection layer directly.



#### §12.2.2 Building Blocks and Ecosystem

The ecosystem of open-source tools has matured significantly, reducing the barrier to building:



| Component | Open-Source Options | Notes |
|:----------|:--------------------|:------|
| Symmetric encryption | Google Tink, libsodium, Bouncy Castle | Tink provides misuse-resistant APIs; libsodium offers NaCl-family primitives |
| Format-preserving encryption | BPS FF3-1 (Java), haaddons FF1/FF3-1 (Go), python-fpe | Limited open-source FPE options; most require Java crypto providers |
| Key management | HashiCorp Vault OSS, AWS KMS, Azure Key Vault, Google Cloud KMS | Vault OSS provides secrets engine but NOT the Transform (tokenization) engine |
| PII detection | Presidio (Microsoft), spaCy NLP, custom regex | Presidio provides configurable PII recognition with pluggable recognizers |
| API middleware | Express/Koa middleware (Node.js), Django middleware (Python), Spring Security filters (Java) | Language-specific middleware for intercepting and transforming requests |
| Database-level | Hibernate listeners, Django field encryption, SQLAlchemy encrypting fields | Field-level encryption at the ORM layer |



#### §12.2.3 Engineering Effort Estimation

Based on the patterns analyzed in Chapters 3–7 and the vendor capabilities surveyed in Chapters 10–11, the following effort estimates apply to a team of experienced backend engineers (mid-to-senior level, familiar with cryptography fundamentals):



| Implementation Scope | Estimated Effort | Key Deliverables |
|:---------------------|:-----------------|:-----------------|
| Simple encryption middleware (AES-256-GCM) | 2–4 developer-weeks | Encryption/decryption service, KMS integration, basic key rotation, unit tests |
| Header-based placeholder pattern | 1–2 developer-weeks | Middleware to extract PII from URL, resolve from session/token store, request reconstruction |
| Custom tokenization service (vault-based) | 4–8 developer-weeks | Token generation/storage, detokenization API, token lifecycle management, basic admin UI or CLI |
| Custom PII detection pipeline | 3–6 developer-weeks | Regex-based detection, custom recognizers, configurable rules, testing framework |
| Full FPE implementation (FF3-1) | 8–16 developer-weeks | FPE library integration, key management, format validation, performance optimization, security review |
| Complete in-house platform | 16–32 developer-weeks | All of the above, plus admin dashboard, audit logging, key rotation automation, HA deployment, monitoring |



These estimates assume a dedicated team; parallel work across multiple features can compress calendar time. They also assume no major surprises during security review — which is an optimistic assumption for cryptographic implementations.



#### §12.2.4 Hidden Costs of Building

The initial engineering effort is only the beginning. A self-built PII protection system carries ongoing costs that are easy to underestimate:



- **Maintenance and bug fixes.** Cryptographic libraries receive security patches. Cloud KMS APIs evolve. New PII types emerge (e.g., new national ID formats). Detection rules require tuning to reduce false positives and false negatives. Expect 0.25–0.5 FTE ongoing maintenance for a non-trivial custom implementation.



- **Security audits.** Any custom cryptographic system should undergo independent security review before production deployment and periodically thereafter (annually or after significant changes). External penetration testing and cryptographic audits cost $15,000–$75,000 per engagement depending on scope. Without these audits, the organization bears the risk that its implementation contains subtle vulnerabilities — side-channel leaks, incorrect padding, weak random number generation, or improper key handling — that a commercial product's extensive testing has already addressed.



- **Key management operations.** Key rotation, key backup and recovery, key compromise incident response, multi-region key replication, and key access auditing are operational disciplines that require dedicated tooling and processes. HashiCorp Vault OSS provides some of this, but operating Vault at production scale (high availability, disaster recovery, seal/unseal procedures, storage backend management) is itself a non-trivial operational commitment.



- **Compliance certification.** If the organization processes payment card data (PCI DSS), healthcare records (HIPAA), or serves EU data subjects (GDPR), the custom PII protection system becomes part of the compliance scope. Demonstrating that the system meets regulatory requirements — through documentation, testing, and audit evidence — is an ongoing effort that commercial vendors handle as part of their product. Building shifts this burden entirely to the organization.



- **Knowledge concentration risk.** A custom cryptographic system built by one or two engineers creates key-person risk. If those engineers leave, the remaining team must understand and maintain a complex, security-critical system with limited documentation and institutional knowledge. Commercial products distribute this risk across a vendor's engineering team.



#### §12.2.5 When the Build Decision Is Defensible

The build decision is defensible when:



- The organization has cryptographic expertise on staff (or can hire it) and is willing to invest in ongoing security review.

- Requirements are sufficiently specific that no vendor product fits without extensive customization.

- Cost constraints make enterprise licensing infeasible and the required feature set is narrow enough to build incrementally.

- Operational constraints (air-gapped environments, data sovereignty mandates) preclude third-party services.

- The organization accepts and budgets for the total cost of ownership over 3–5 years, not just the initial build effort.

---

### §12.3 When to Buy

Commercial PII protection platforms exist because the problem is hard, the security stakes are high, and the ongoing operational burden is substantial. Buying shifts the responsibility for implementation correctness, security maintenance, and (in many cases) regulatory compliance to a vendor whose core business is solving exactly this problem. This section identifies the scenarios where purchasing is the stronger choice, surveys the vendor landscape by tier, and examines the compliance advantages of vendor-backed solutions.



**Compliance audit requirements.** Many regulatory frameworks — SOC 2 Type II, ISO 27001, PCI DSS Level 1, HIPAA BAA requirements — demand evidence that sensitive data handling systems meet specific security controls. A vendor that has already obtained these certifications provides a significant shortcut: the vendor's SOC 2 Type II report demonstrates that their tokenization infrastructure operates under audited access controls, encryption standards, and incident response procedures. The organization's own compliance burden reduces from *implementing and demonstrating* the controls to *selecting and configuring* a certified tool. For organizations pursuing SOC 2 certification for the first time, using a certified vendor for PII protection can eliminate an entire control domain from the internal audit scope.



**Vendor-backed security guarantees and SLAs.** Commercial platforms typically offer contractual guarantees around uptime (99.9–99.99%), data durability, recovery time objectives (RTO), and recovery point objectives (RPO). These SLAs provide financial recourse if the service degrades — a form of risk transfer that a self-built system cannot offer. More importantly, enterprise vendors employ dedicated security teams that continuously monitor for vulnerabilities, respond to CVEs in upstream dependencies, and release patches. When a critical vulnerability is discovered in a cryptographic library (as happened with ROBOT, Heartbleed, and numerous padding oracle attacks), a vendor's customers receive patched updates automatically. A self-built system requires the organization to discover, assess, and apply these patches independently — a process that often lags by weeks or months.



**Multi-cloud deployment with unified key management.** Organizations operating across multiple cloud providers (AWS, Azure, GCP) or hybrid environments (cloud + on-premises) face the challenge of managing cryptographic keys and PII protection policies consistently across disparate platforms. Cloud-native KMS services are provider-specific: AWS KMS keys cannot be used by Azure services, and Google Cloud KMS keys cannot be directly consumed by AWS Lambda functions. Enterprise tokenization platforms like HashiCorp Vault Enterprise and Thales CipherTrust provide abstraction layers that unify key management across providers, enabling consistent encryption and tokenization policies regardless of where the data resides. Building this abstraction layer independently — managing key material across multiple cloud KMS providers, handling cross-provider key rotation, and maintaining consistent access policies — is a significant engineering effort that duplicates what enterprise vendors have already built.



**Scale beyond internal engineering capacity.** Tokenization at volume introduces challenges that are non-obvious until the system reaches production scale. A custom tokenization service handling thousands of tokens per second must manage token-to-PII mappings efficiently (hash-based lookups vs. database queries), handle token collision resolution, maintain consistency across distributed instances (token generation must be globally unique), and provide low-latency detokenization for real-time API responses. At extreme scale — billions of tokens, millions of requests per second — the system requires sharding, caching layers, read replicas, and sophisticated monitoring. Enterprise tokenization platforms are designed and tested at this scale; HashiCorp Vault's Transform engine, for example, is benchmarked to handle millions of tokenization operations per second with sub-millisecond latency. Replicating this performance with a custom implementation requires distributed systems expertise that many organizations do not have in-house.



**Access to specialized expertise.** Implementing Format-Preserving Encryption correctly requires understanding NIST SP 800-38G, selecting appropriate tweak values, managing key hierarchies, and validating that the implementation preserves format characteristics across all edge cases (empty strings, maximum-length inputs, Unicode characters, special characters in structured formats). Managing Hardware Security Modules (HSMs) requires specialized knowledge of PKCS#11 interfaces, firmware updates, quorum-based key ceremonies, and FIPS 140-2/3 validation levels. These are specialized domains where mistakes have severe consequences — incorrect FPE implementation can leak plaintext, misconfigured HSM access controls can expose key material, and poor key management practices can render data unrecoverable. Vendors employ teams of cryptographers, HSM specialists, and security engineers who work on these problems full-time. Buying the vendor's product is, in effect, buying access to this expertise.



**Regulatory requirement for third-party certification.** Some regulatory frameworks and industry standards explicitly require or strongly prefer that data protection mechanisms be provided by certified third parties. PCI DSS Requirement 3.4 mandates that PANs be rendered unreadable "anywhere it is stored" using one of several approaches, including tokenization — and the payment card industry's security standards council has published guidance on tokenization that assumes a commercial tokenization provider. Similarly, financial regulators in certain jurisdictions (e.g., the Monetary Authority of Singapore's Technology Risk Management Guidelines) recommend that cryptographic key management be performed by specialized systems with independent certification. In these contexts, building a custom solution requires the organization to self-certify — a more burdensome and less persuasive process than pointing to a vendor's third-party audit report.



**Time-to-market pressure.** A commercial tokenization platform can be integrated in weeks (SDK integration, policy configuration, deployment). Building even a minimal custom system takes months (design, implementation, testing, security review, deployment). When a compliance deadline, product launch, or regulatory mandate imposes a firm timeline, the buy option is often the only viable path. The risk of rushing a custom cryptographic implementation to meet a deadline — cutting corners on testing, skipping security review, deploying with known limitations — is far greater than the risk of selecting a vendor that doesn't perfectly match every requirement.



#### §12.3.2 Vendor Landscape by Tier

The commercial PII protection landscape spans four tiers, distinguished by pricing, feature breadth, target market, and deployment model:



| Tier | Vendors | Annual Pricing (Est.) | Key Characteristics |
|:-----|:--------|:----------------------|:---------------------|
| **Enterprise** | HashiCorp Vault Enterprise, Thales CipherTrust, Protegrity | $50K–$500K+ | On-premises or hybrid deployment, HSM integration, comprehensive audit logging, dedicated support, custom professional services |
| **Mid-tier** | VGS, Skyflow, Fortanix DSM | $10K–$100K | SaaS or managed deployment, API-first design, developer-friendly SDKs, compliance certifications (SOC 2, ISO 27001), moderate customization |
| **Cloud-native** | Google Cloud DLP, Azure APIM, AWS KMS/Macie | $1K–$20K | Usage-based pricing, tight integration with cloud ecosystem, limited PII detection scope (cloud-specific infoTypes), no on-premises option |
| **Developer tools** | Pangea Vault, Protegrity API Playground | Free tier → $5K–$50K | Generous free tiers, self-service onboarding, focused feature set (e.g., secrets management without tokenization), suitable for smaller teams and MVPs |

> **Cross-reference:** Detailed vendor-by-vendor analysis of capabilities, pricing, and trade-offs appears in Chapters 9 and 10. The table above provides a tier-level summary for the build-vs-buy decision; consult the vendor chapters for specific product comparisons.



**Enterprise tier.** HashiCorp Vault Enterprise, Thales CipherTrust, and Protegrity target large enterprises with complex regulatory requirements, multi-cloud deployments, and existing HSM infrastructure. These platforms provide the broadest feature set: tokenization with multiple token formats, FPE, encryption as a service, key lifecycle management, comprehensive audit logging, role-based access control, and integration with enterprise identity providers (LDAP, SAML, OIDC). Pricing is typically based on node count (Vault Enterprise), data volume, or a combination of factors, and includes professional services for architecture design and implementation support. The total cost often exceeds $200,000/year at scale, but the platform replaces multiple point solutions and provides a unified framework for all data protection needs.



**Mid-tier.** VGS, Skyflow, and Fortanix occupy a middle ground — providing robust PII protection capabilities without the enterprise price tag. VGS offers a proxy-based approach that intercepts API traffic and replaces PII with tokens before it reaches the organization's systems, eliminating the need for application-level code changes. Skyflow provides a data privacy vault that stores sensitive data outside the organization's infrastructure and exposes it through API calls using tokens. Fortanix DSM delivers runtime encryption and key management with a focus on confidential computing environments. These vendors typically offer SOC 2 Type II certification, developer-friendly REST APIs and SDKs, and pricing based on data volume or API call count. They are well-suited for mid-market companies and enterprises that want to avoid the complexity of on-premises deployment.



**Cloud-native tier.** Google Cloud Sensitive Data Protection, Azure API Management, and AWS KMS (supplemented by Macie for PII detection) provide PII-relevant capabilities as part of broader cloud platforms. These services are deeply integrated with their respective cloud ecosystems — DLP API uses Cloud KMS for key management, APIM policies integrate with Azure Key Vault, AWS KMS works natively with Lambda, S3, and CloudWatch. Pricing is usage-based (per API call, per GB scanned, per key operation), making these services cost-effective for organizations already committed to a single cloud provider. The limitation is ecosystem lock-in: Google DLP cannot scan data in Azure Blob Storage, and Azure APIM cannot apply policies to traffic destined for AWS Lambda functions without additional infrastructure.



**Developer tools tier.** Pangea Vault and similar developer-focused tools provide managed secrets and sensitive data services with generous free tiers and self-service onboarding. Pangea's Vault offers structured logging for secrets access (audit trail), role-based access control, and IP allowlisting — features that overlap with enterprise products but with a simpler deployment model and lower cost. These tools are ideal for startups and small teams that need PII protection capabilities without enterprise complexity, and they scale to mid-market usage through paid tiers.



#### §12.3.3 Compliance Benefits of Vendor Solutions

The compliance argument for buying is often the strongest single factor. A vendor's certifications — SOC 2 Type II, ISO 27001, PCI DSS Level 1, FedRAMP, HIPAA BAA — represent months of audit preparation and hundreds of thousands of dollars in audit fees. By selecting a certified vendor, the organization inherits this compliance posture for the specific controls covered by the vendor's service. The vendor's audit reports (SOC 2 Type II, in particular) provide detailed evidence that the vendor's systems, processes, and personnel meet rigorous security standards — evidence that would be expensive and time-consuming for the organization to produce independently for a self-built system. For organizations subject to multiple regulatory frameworks (e.g., a SaaS company serving EU customers under GDPR, US healthcare clients under HIPAA, and payment processors under PCI DSS), a vendor with multi-framework certification dramatically reduces the compliance matrix.



#### §12.3.4 When the Buy Decision Is Defensible

The buy decision is defensible when:



- The organization lacks in-house cryptographic expertise and cannot justify hiring a dedicated security engineering team.

- Compliance requirements (SOC 2, ISO 27001, PCI DSS) demand third-party certification that a self-built system cannot provide.

- Time-to-market constraints make the months-long build-and-audit cycle infeasible.

- Data volumes or throughput requirements exceed what a small engineering team can support.

- Multi-cloud or hybrid deployment requires unified key management that building from scratch would duplicate.

- The total cost of ownership (licensing + integration + ongoing operations) is lower than the cost of building and maintaining an equivalent system.

---

### §12.4 Hybrid Approaches

The binary choice between build and buy is a false dichotomy. Most organizations with mature PII protection strategies use a **hybrid approach** — building custom components where their domain expertise creates differentiation, and purchasing vendor solutions for commodity capabilities where the vendor's scale and expertise provide superior outcomes. This section examines the most common hybrid patterns, their integration architectures, and the complexity trade-offs they introduce.

```mermaid
---
config:
  flowchart:
    htmlLabels: false
---
flowchart LR
    subgraph CLIENT["Client"]
        CL["API Client"]
    end

    subgraph CUSTOM["Custom Components (Build)"]
        MW["API Middleware<br/>Header Resolution<br/>Request Filtering"]
        DET["PII Detection<br/>Custom Recognizers<br/>Domain Rules"]
        TOK["Tokenization Logic<br/>Token Generation<br/>Detokenization"]
    end

    subgraph VENDOR["Vendor Components (Buy)"]
        VTK["Tokenization Service<br/>Vault Enterprise / VGS"]
        KMS["Key Management<br/>Cloud KMS / HSM"]
        DLP["DLP Transformation<br/>Google DLP / APIM"]
    end

    subgraph APP["Application"]
        SVC["Backend Service"]
    end

    CL --> MW
    MW --> DET
    DET --> DLP
    MW --> VTK
    TOK --> KMS
    VTK --> SVC

```

#### §12.4.1 Build the API Layer, Buy the Tokenization Backend

This is the most common hybrid pattern. The organization builds custom API middleware — header-based placeholder resolution, request transformation filters, or gateway plugins — that integrates with a commercial tokenization service for the actual cryptographic operations. The custom layer handles domain-specific logic (which fields contain PII, how tokens map to business entities, what format transformations are needed), while the vendor handles the hard parts (key management, HSM integration, FPE implementation, audit logging, high-availability token storage).



- **Custom middleware + HashiCorp Vault Enterprise.** Build a request/response filter in the API gateway (Kong, AWS API Gateway, Envoy) or application middleware (Spring Security filter, Express middleware) that intercepts PII-bearing fields and calls Vault's Transform API for tokenization or detokenization. Vault manages key lifecycle, provides FPE and HMAC-based tokenization, and generates comprehensive audit logs. The organization builds only the integration glue and domain-specific mapping logic.



- **Custom API gateway filter + Google Cloud DLP.** Build a filter that invokes the DLP API's `deidentifyContent` endpoint for inbound requests and `reidentifyContent` for outbound responses. Google DLP provides the detection logic (100+ infoTypes), the transformation primitives (FPE, hashing, masking, redaction), and the key management (via Cloud KMS). The organization builds only the filter logic and configures which DLP transformations apply to which API endpoints.



- **Custom encryption service + AWS KMS.** Build a microservice that performs field-level encryption (AES-256-GCM or deterministic AES) using data keys generated and encrypted by AWS KMS. The custom service handles request parsing, field identification, and encryption/decryption orchestration; KMS handles key storage, rotation, and access control. This is the simplest hybrid pattern — essentially building the encryption layer on top of a managed key service.



This pattern works well because it preserves the organization's ability to control *what* gets protected and *how* it flows through the API, while offloading the security-critical cryptographic operations to a vetted platform. The integration surface is well-defined (REST API calls to the tokenization service), making it testable and maintainable.



#### §12.4.2 Build the Tokenization, Buy the Infrastructure

In this inverse pattern, the organization implements its own tokenization or encryption logic but deploys it on managed infrastructure that handles key storage, availability, and operational concerns:



- **Custom tokenization microservice on Kubernetes with cloud KMS.** Build a stateless tokenization service (handling token generation, storage in a dedicated database, and detokenization lookup) and deploy it as a Kubernetes Deployment with horizontal auto-scaling. Use cloud KMS (AWS KMS, Azure Key Vault, Google Cloud KMS) for encryption key storage and rotation. The organization owns the tokenization logic; the cloud provider owns the key management infrastructure.



- **Self-managed FPE with HashiCorp Vault OSS for key storage.** Implement FF3-1 format-preserving encryption using an open-source library (BPS FF3-1, haaddons) and store the FPE keys in Vault's Key-Value or Transit secrets engine. Vault OSS provides secure key storage, access control (via Vault policies), and audit logging — but not the Transform engine (which is Enterprise-only). The organization builds the FPE pipeline; Vault OSS secures the keys.



This pattern appeals to organizations that need full control over the tokenization algorithm (e.g., proprietary token formats, custom FPE tweak values) but don't want to operate their own key storage infrastructure. The trade-off is operational: the organization still manages the tokenization service (deployments, monitoring, scaling, database operations) while the cloud provider or Vault OSS handles only the key layer.



#### §12.4.3 Build the Detection, Buy the Enforcement

PII protection has two distinct phases: **detection** (identifying which data elements are PII) and **enforcement** (applying the protection — encryption, tokenization, masking). These phases have different optimization targets: detection favors accuracy and configurability (domain-specific PII types, context-aware recognition); enforcement favors performance, reliability, and security guarantees (low latency, high availability, cryptographic correctness). A hybrid approach builds the detection layer and delegates enforcement to a commercial platform:



- **Custom PII detection + Kong/APIM enforcement.** Build a PII detection service that classifies data fields based on custom business logic, proprietary data dictionaries, or ML-based recognition (e.g., a spaCy NLP model trained on the organization's data). Route classification results to Kong (via a custom plugin) or Azure APIM (via a policy) for enforcement — the gateway applies tokenization, masking, or encryption based on the classification labels.



- **Custom detection rules + Google Cloud DLP transformation.** Define custom infoTypes in Google Cloud DLP (regex patterns, word lists, stored dictionaries) that encode the organization's domain-specific PII knowledge, then use DLP's built-in transformation primitives (FPE, hashing, redaction) for enforcement. This pattern is attractive when the organization's PII types are unique but the transformation requirements are standard.



This pattern is particularly effective when the organization's competitive advantage lies in understanding its own data — what constitutes PII in its specific domain — but the actual cryptographic transformations are commodity operations where vendor expertise provides no disadvantage.



#### §12.4.4 Integration Architecture Patterns

Regardless of which hybrid combination an organization chooses, the integration between custom and vendor components must follow a well-defined architectural pattern. Four patterns dominate in practice:



| Pattern | Description | Latency Impact | Complexity | Best For |
|:--------|:-------------|:---------------|:-----------|:---------|
| **Sidecar** | Tokenization service runs as a sidecar container alongside each API service | Low (local IPC) | Medium | Microservice architectures, per-service customization |
| **Gateway filter** | Tokenization as a plugin or filter in the API gateway | Low–Medium | Low | Centralized enforcement, uniform policies |
| **Service mesh** | Tokenization as an Envoy filter in Istio or Linkerd | Low (data plane) | High | Complex microservice topologies, zero-trust architectures |
| **Database proxy** | Tokenization at the database connection layer (before data reaches the DB) | Low (transparent) | Medium | Database-centric applications, minimizing code changes |

```mermaid
---
config:
  flowchart:
    htmlLabels: false
---
flowchart TD
    subgraph SG1["`**Sidecar Model**`"]
        direction TB
        A1["API Service"] -- localhost --> A2["Tokenization<br/>Sidecar"]
        A2 -- "REST/gRPC<br/>to vendor" --> A3["Commercial<br/>Tokenization"]
    end

    subgraph SG2["`**Gateway Filter Model**`"]
        direction TB
        B1["API Client"] --> B2["API Gateway<br/>(Kong / APIM)"]
        B2 -- "tokenize/detokenize<br/>inline" --> B3["Backend Service"]
        B2 -- "policy calls" --> B4["Commercial<br/>Tokenization"]
    end

    subgraph SG3["`**Service Mesh Model**`"]
        direction TB
        C1["Service A"] --> C2["Envoy Proxy<br/>(WASM filter)"]
        C2 --> C3["Service B"]
        C2 -- "ext_proc" --> C4["Tokenization<br/>Filter"]
    end

    subgraph SG4["`**Database Proxy Model**`"]
        direction TB
        D1["Application"] --> D2["DB Proxy<br/>(tokenize/encrypt)"]
        D2 --> D3["Database<br/>(tokens only)"]
        D2 -- "key ops" --> D4["KMS / Vendor"]
    end
```

The **sidecar** model. Each API service is deployed with a tokenization sidecar container (e.g., a Vault Agent, a custom tokenization proxy, or a DLP client) that handles PII transformation. The API service communicates with the sidecar over localhost (Unix socket or loopback HTTP), avoiding network latency. This pattern provides per-service customization — each service can configure which fields are tokenized, what transformation is applied, and how tokens are resolved — while keeping the tokenization logic external to the application code. The operational cost is proportional to the number of services: each sidecar must be deployed, configured, monitored, and updated independently.



The **gateway filter** model. The API gateway (Kong, AWS API Gateway, Azure APIM, Envoy) performs tokenization as requests and responses pass through. This centralizes PII protection in a single infrastructure component, reducing per-service configuration and providing a uniform enforcement point. The limitation is that the gateway must understand the payload structure — it needs to know which fields in which API routes contain PII. For APIs with complex or variable payload structures (polymorphic JSON, deeply nested objects, protocol buffers), the gateway filter may need custom logic that reduces its "plug-and-play" advantage.



The **service mesh** model. In environments using Istio, Linkerd, or a similar service mesh, PII transformation can be implemented as an Envoy WASM filter or an external processing (ext_proc) filter that intercepts traffic at the data plane level. This provides the same transparent interception as the gateway model but operates at a finer granularity — per-service or per-route — and does not require all traffic to pass through a single gateway. The service mesh model is the most architecturally sophisticated option and carries the highest operational complexity: it requires expertise in Envoy filter development, service mesh configuration, and distributed tracing for debugging transformation issues.



The **database proxy** model. A database proxy (e.g., a custom PostgreSQL protocol proxy, or a vendor solution like Protegrity's database protection layer) sits between the application and the database, tokenizing or encrypting PII fields as data is written and detokenizing or decrypting as data is read. The application sees plaintext in its query results; the database stores only tokens or ciphertext. This pattern minimizes application code changes — the protection is transparent to the application layer — but is limited to database-bound PII (it does not protect PII in API URLs, headers, or request/response bodies that don't transit the database). It is most effective when PII protection is primarily driven by storage security requirements (e.g., database encryption mandates) rather than API-level exposure concerns.



#### §12.4.5 Complexity Trade-Offs

Hybrid approaches offer the theoretical best of both worlds — custom domain logic where it matters, vendor security where it counts — but they introduce integration complexity that pure-build or pure-buy approaches avoid:



- **Dual system management.** The organization operates and maintains both the custom components and the vendor integration. When a vendor API changes (version upgrade, deprecation, rate limit change), the custom integration code must be updated. When the custom component needs modification, it must be tested against the vendor's current API behavior. This creates a coordination burden that grows with the number of integration points.



- **Debugging across boundaries.** When a tokenization operation fails — wrong token, incorrect detokenization, format mismatch — the root cause may lie in the custom detection logic, the vendor's transformation engine, the integration layer, or the key management configuration. Debugging across organizational boundaries (custom code vs. vendor service) is harder than debugging within a single system, particularly when the vendor's internal behavior is opaque.



- **Version coupling.** Custom components may depend on specific vendor API versions or feature configurations. Upgrading the vendor platform may require corresponding changes to the custom integration layer. Without careful version management, the hybrid system can become fragile — working today but breaking on the next vendor update.



- **Compliance scoping.** In a hybrid architecture, the compliance boundary is split between the organization (custom components) and the vendor (commercial platform). The organization must clearly document which controls are provided by each party, ensure the vendor's compliance certifications cover the specific configurations in use, and fill any gaps with internal controls. This scoping exercise is more complex than a pure-buy approach (where the vendor provides comprehensive control evidence) or a pure-build approach (where the organization controls the entire stack).



The hybrid approach is the pragmatic choice for most mid-to-large organizations, but it requires deliberate architectural governance: clear interface contracts between custom and vendor components, comprehensive integration testing, and explicit documentation of the compliance responsibility boundary.

---

### §12.5 Cost Analysis (Total Cost of Ownership)

Cost is rarely the sole deciding factor in build-vs-buy decisions for PII protection, but it is always a significant input. This section provides rough order-of-magnitude cost estimates across the five main approaches — fully self-built, open-source plus cloud KMS, cloud-native services, mid-tier platforms, and enterprise platforms — and examines the total cost of ownership (TCO) over a 3–5 year horizon. These estimates are indicative, based on 2024–2025 market rates for engineering talent, cloud services, and vendor licensing in North American and European markets. Actual costs vary significantly based on geography, organizational scale, existing infrastructure, and negotiation leverage.



#### §12.5.1 Methodology

Each cost estimate includes three components: (1) **initial build/integration effort**, measured in developer-time cost (assuming $150,000–$200,000 loaded annual cost per full-time engineer — salary, benefits, overhead); (2) **recurring infrastructure and licensing costs**, measured annually; and (3) **ongoing maintenance and operations**, measured in fractional FTE allocation. The TCO calculation sums these components over a 3-year and 5-year horizon, applying a 10% annual growth factor to maintenance costs (reflecting the increasing complexity of maintaining aging custom software) and a 5% annual increase to vendor licensing (reflecting typical enterprise contract escalation clauses).



#### §12.5.2 Fully Self-Built (Approach 1)

The organization designs, implements, tests, and operates a complete PII protection platform from scratch — encryption/tokenization service, key management, PII detection, audit logging, admin tooling, and production deployment infrastructure.



| Cost Component | Year 1 | Year 2–3 (annual) | Year 4–5 (annual) |
|:---------------|:-------|:------------------|:-------------------|
| Engineering (build) | 2.5–3 FTE × 6 months = $200K–$375K | — | — |
| Infrastructure (servers, databases, monitoring) | $12K–$60K | $12K–$60K | $12K–$60K |
| Security audit (initial) | $15K–$75K | — | — |
| Maintenance (0.5 FTE) | $37K–$50K | $41K–$55K | $45K–$61K |
| Security audit (annual) | — | $15K–$75K | $15K–$75K |
| Compliance documentation | $10K–$30K | $5K–$15K | $5K–$15K |
| **Annual total** | **$274K–$590K** | **$73K–$205K** | **$77K–$211K** |
| **3-year TCO** | | **$420K–$1,000K** | |
| **5-year TCO** | | | **$574K–$1,422K** |



The fully self-built approach has the highest first-year cost due to the engineering investment, but moderate ongoing costs if the system is well-architected and does not require significant feature expansion. The primary risk is underestimation: organizations that budget 6 months for the build often require 9–12 months when security review, compliance documentation, and production hardening are included. The security audit line item is non-negotiable for any system handling PII — skipping it saves money in the short term but creates legal and reputational risk.



#### §12.5.3 Open-Source and Cloud KMS (Approach 2)

The organization builds custom PII protection using open-source libraries (Google Tink for encryption, Presidio for detection, custom tokenization logic) with cloud KMS (AWS KMS, Azure Key Vault, Google Cloud KMS) for key storage. This avoids the cost and complexity of self-managed key infrastructure while retaining control over the protection logic.



| Cost Component | Year 1 | Year 2–3 (annual) | Year 4–5 (annual) |
|:---------------|:-------|:------------------|:-------------------|
| Engineering (build) | 1.5–2 FTE × 3 months = $75K–$100K | — | — |
| Cloud KMS (API calls + key storage) | $2K–$10K | $3K–$15K | $4K–$20K |
| Infrastructure (compute, database) | $6K–$30K | $6K–$30K | $6K–$30K |
| Security audit (initial) | $15K–$50K | — | — |
| Maintenance (0.25 FTE) | $19K–$25K | $21K–$28K | $23K–$30K |
| Security audit (annual) | — | $10K–$50K | $10K–$50K |
| **Annual total** | **$117K–$215K** | **$40K–$123K** | **$43K–$130K** |
| **3-year TCO** | | **$197K–$461K** | |
| **5-year TCO** | | | **$283K–$721K** |



This approach is the most cost-effective for organizations that already use a cloud provider and have basic cryptographic engineering capability. Cloud KMS eliminates the hardest part of key management (secure storage, access control, rotation) for a modest usage-based fee. The trade-off is lock-in to the cloud provider's KMS — migrating from AWS KMS to Azure Key Vault requires re-encrypting all data, which is expensive and operationally risky.



#### §12.5.4 Cloud-Native Services (Approach 3)

The organization uses cloud-native PII protection services (Google Cloud DLP, Azure APIM with Key Vault, AWS KMS + Macie) that provide detection, transformation, and key management as fully managed services. Engineering effort is limited to integration — configuring policies, writing API clients, and testing.



| Cost Component | Year 1 | Year 2–3 (annual) | Year 4–5 (annual) |
|:---------------|:-------|:------------------|:-------------------|
| Engineering (integration) | 0.5–1 FTE × 1–2 months = $12K–$33K | — | — |
| Cloud service (usage-based) | $5K–$30K | $8K–$50K | $12K–$75K |
| Security audit (initial, reduced scope) | $5K–$20K | — | — |
| Maintenance (0.1 FTE) | $7K–$10K | $8K–$11K | $9K–$12K |
| **Annual total** | **$29K–$93K** | **$16K–$61K** | **$21K–$87K** |
| **3-year TCO** | | **$61K–$215K** | |
| **5-year TCO** | | | **$103K–$389K** |



Cloud-native services offer the lowest TCO, particularly for organizations already committed to a single cloud provider. The usage-based pricing scales with actual PII processing volume, avoiding the "pay for capacity you don't use" problem of enterprise licensing. However, the cost grows with scale — at very high request volumes (millions of DLP API calls per day), the usage-based cost can exceed mid-tier platform licensing. The other significant limitation is feature scope: cloud-native services may not support every required transformation type (e.g., Google DLP's FPE does not support FF3-1's extended tweak length; Azure APIM's masking policies are less granular than dedicated tokenization platforms).



#### §12.5.5 Mid-Tier Platforms (Approach 4)

The organization licenses a mid-tier tokenization platform (VGS, Skyflow, Fortanix DSM, Pangea Vault) that provides managed tokenization, encryption, and key management with developer-friendly APIs.



| Cost Component | Year 1 | Year 2–3 (annual) | Year 4–5 (annual) |
|:---------------|:-------|:------------------|:-------------------|
| Licensing | $10K–$60K | $10K–$70K | $11K–$80K |
| Engineering (integration) | $25K–$50K | — | — |
| Security audit (vendor covers most; org audits integration) | $5K–$15K | $3K–$10K | $3K–$10K |
| Maintenance (0.15 FTE) | $11K–$15K | $12K–$17K | $13K–$18K |
| **Annual total** | **$51K–$140K** | **$25K–$97K** | **$27K–$108K** |
| **3-year TCO** | | **$101K–$334K** | |
| **5-year TCO** | | | **$155K–$550K** |



Mid-tier platforms occupy a middle ground in cost and capability. The licensing cost is predictable (annual subscription, not usage-based), and the vendor handles key management, audit logging, and security patches. The organization's engineering investment is limited to integration — SDK inclusion, API client configuration, and testing. The maintenance burden is light (0.15 FTE) because the vendor handles the heavy lifting. This approach is well-suited for organizations that want enterprise-grade PII protection without enterprise-grade pricing.



#### §12.5.6 Enterprise Platforms (Approach 5)

The organization licenses an enterprise data protection platform (HashiCorp Vault Enterprise, Thales CipherTrust, Protegrity) with comprehensive tokenization, encryption, key management, HSM integration, and compliance features.



| Cost Component | Year 1 | Year 2–3 (annual) | Year 4–5 (annual) |
|:---------------|:-------|:------------------|:-------------------|
| Licensing | $50K–$300K | $50K–$350K | $53K–$400K |
| Engineering (integration + customization) | $50K–$100K | $10K–$25K | $10K–$25K |
| Professional services (vendor consulting) | $20K–$75K | $5K–$25K | $5K–$25K |
| Infrastructure (if self-hosted) | $12K–$60K | $12K–$60K | $12K–$60K |
| Security audit (reduced — vendor provides SOC 2) | $5K–$15K | $3K–$10K | $3K–$10K |
| Maintenance (0.2 FTE) | $15K–$20K | $17K–$22K | $18K–$24K |
| **Annual total** | **$152K–$570K** | **$97K–$492K** | **$101K–$544K** |
| **3-year TCO** | | **$346K–$1,554K** | |
| **5-year TCO** | | | **$548K–$2,642K** |



Enterprise platforms carry the highest licensing cost but also the broadest capability and strongest compliance story. For large organizations with complex requirements (multi-cloud, HSM integration, regulatory mandates across multiple jurisdictions), the enterprise platform may be the only option that covers all requirements without extensive customization. The professional services line item reflects the typical need for vendor consulting during initial deployment — enterprise platforms are feature-rich and configuration is non-trivial. The infrastructure cost applies only to self-hosted deployments; SaaS deployments (e.g., Thales CipherTrust Cloud) shift infrastructure cost to the vendor but may carry higher per-operation pricing.



#### §12.5.7 Pricing Model Comparison

Beyond the absolute cost, the pricing model affects the economics at different scales:



| Pricing Model | Advantages | Disadvantages | Best For |
|:--------------|:-----------|:--------------|:---------|
| **Flat annual license** | Predictable budget, no cost surprises | Pays for unused capacity | Stable, predictable workloads |
| **Usage-based (per API call, per GB)** | Scales with actual need, low starting cost | Cost grows unpredictably with traffic | Variable workloads, startups |
| **Seat/node-based** | Scales with team size, straightforward | Doesn't scale with data volume | Small teams, dev-focused tools |
| **Tiered (base + overage)** | Balances predictability with scale | Complexity in predicting overage | Growing organizations |



#### §12.5.8 Hidden Costs Across All Approaches

The cost tables above capture the direct, quantifiable expenses. Several significant costs are harder to quantify but material to the decision:



- **Training and knowledge transfer.** Engineers must learn the chosen system — whether it's a self-built platform, an open-source framework, or a vendor product. For a team of 5–10 engineers, this represents 2–4 weeks of reduced productivity per engineer during onboarding. For enterprise platforms, formal training (vendor-provided courses) costs $2,000–$5,000 per engineer.



- **Integration testing.** Integrating PII protection into an existing API surface requires regression testing across all affected endpoints, performance testing to measure latency impact, and security testing to verify that protection is applied correctly. For an API with 50+ endpoints, this testing effort alone can require 2–4 developer-weeks.



- **Incident response and break-glass procedures.** When PII protection fails — a key is compromised, a tokenization service goes down, an encryption bug produces garbled data — the organization needs documented incident response procedures and a break-glass mechanism to restore operations. Developing and rehearsing these procedures is a one-time effort of 1–2 developer-weeks that the cost tables do not capture.



- **Opportunity cost.** Engineering time spent building, integrating, and maintaining PII protection is time not spent on product features, technical debt reduction, or other engineering priorities. For a small team (3–5 engineers), dedicating 0.5 FTE to PII protection maintenance represents 10–17% of total engineering capacity — a significant opportunity cost that a turnkey vendor solution would eliminate.



#### §12.5.9 TCO Summary

The following table compares 5-year TCO across approaches, expressed as a range to reflect the wide variation in organizational context:



| Approach | 5-Year TCO Range | Upfront Investment | Ongoing Annual Cost | Maintenance Burden |
|:---------|:-----------------|:-------------------|:---------------------|:-------------------|
| Fully self-built | $574K–$1,422K | Very high | Medium | High (0.5 FTE) |
| Open-source + Cloud KMS | $283K–$721K | Medium | Low–Medium | Medium (0.25 FTE) |
| Cloud-native services | $103K–$389K | Very low | Low–Medium | Low (0.1 FTE) |
| Mid-tier platforms | $155K–$550K | Low | Medium | Low (0.15 FTE) |
| Enterprise platforms | $548K–$2,642K | High | High | Low–Medium (0.2 FTE) |



**No single approach dominates across all dimensions.** Cloud-native services offer the lowest TCO but the narrowest feature set and cloud lock-in. Enterprise platforms offer the broadest capabilities but at the highest cost. Self-built approaches provide maximum control but carry hidden costs in security auditing, compliance documentation, and maintenance. The hybrid approaches described in §3 allow organizations to select the cost-capability point that best fits their specific context — building where differentiation matters, buying where commodity security suffices. The decision framework presented across this chapter's four sections provides the analytical structure for making this choice systematically rather than intuitively.

```mermaid
---
config:
  xyChart:
    xAxisOrientation: bottom
    yAxisOrientation: left
---
xychart-beta
    title "5-Year Total Cost of Ownership by Approach (USD)"
    x-axis ["Self-Built", "OSS+Cloud KMS", "Cloud-Native", "Mid-Tier", "Enterprise"]
    y-axis "Cost (thousands USD)" 0 --> 3000
    bar [570, 283, 103, 155, 548]
    bar [1422, 721, 389, 550, 2642]
```



# Part V: Governance, Auditability, and Operating Model

This part covers the **operating model that surrounds the chosen protection pattern**. These chapters do not replace the need to remove personal data from URLs and adjacent surfaces. They explain how to govern, audit, erase, and observe a system once the core design choice has been made.

---

## 13. Audit Trails for Cryptographic Operations

Auditability is a **supporting control**, not the primary remediation. The system still needs to avoid bad URL design first. Once that is true, the minimum audit data for every cryptographic or PII-protection operation must answer six fundamental questions: **who** performed the operation, **what** was done, **when** did it happen, **where** did it originate, **which** key or scope was used, and **what was the outcome**. These questions map directly to GDPR Article 30's requirements for records of processing activities and to the accountability principle in Article 5(2). Anything less leaves gaps that regulators, auditors, or incident response teams cannot fill.

---

### §13.1 Minimum Audit Data

#### §13.1.1 Core Audit Fields

**Operation type.** The category of cryptographic operation performed. This must use a controlled vocabulary to enable consistent querying and alerting across the audit trail. The canonical set includes: `encrypt`, `decrypt`, `tokenize`, `detokenize`, `mask`, `unmask`, `key_generate`, `key_rotate`, `key_destroy`, `rekey`, `hash`, and `verify`. Sub-operations provide additional granularity where needed: for example, `tokenize` may be qualified by the tokenization method (`vault_based`, `vaultless_fpe`, `vaultless_aes`, `format_preserving`), and `encrypt` may be qualified by the algorithm (`aes_256_gcm`, `rsa_oaep_sha256`, `chacha20_poly1305`). The operation type is the primary dimension for SIEM dashboards and anomaly detection — without it, analysts cannot distinguish between a batch encryption job and a suspicious spike in decryption operations.



**Actor identity.** The authenticated identity that triggered the operation. This is not merely a username — it must capture the full identity context: the service account name or human user ID, the authentication mechanism used (OAuth 2.0 client credentials, mTLS certificate CN, API key ID, IAM role), and the authorizing policy or permission that granted access. When a service account acts on behalf of a human user (the common pattern in microservice architectures), both identities should be recorded: the `caller` (the human or external system) and the `executor` (the service performing the cryptographic operation). This chain of identity enables forensics when investigating data exfiltration: which end user, through which application, triggered which service account to decrypt which PII.



**Timestamp.** ISO 8601 format with timezone offset and millisecond precision (e.g., `2026-04-08T14:32:17.482Z`). The timestamp must reflect when the operation *completed*, not when it was initiated — a distinction that matters for latency analysis and for understanding the sequence of events during an incident. For distributed systems, the timestamp should be generated by the auditing component itself (centralized clock) rather than by the calling service (distributed clock) to avoid clock-skew issues that corrupt event ordering. If the organization uses a distributed tracing framework (OpenTelemetry, Jaeger, Zipkin), the trace timestamp should be included separately to maintain correlation between the business transaction timeline and the audit timeline.



**Data classification.** The type of PII that was processed, expressed as a controlled taxonomy aligned with the organization's data classification scheme. Common categories include: `email_address`, `phone_number`, `social_security_number`, `national_id`, `passport_number`, `date_of_birth`, `full_name`, `first_name`, `last_name`, `address`, `postal_code`, `bank_account_number`, `iban`, `credit_card_number`, `health_record_id`, `ip_address`, `biometric_data`, and `geolocation`. This classification serves two purposes: it enables data-specific access reporting (e.g., "how many times were SSNs detokenized this month?") and it supports GDPR's data minimization principle in audit queries — analysts can investigate operations on the most sensitive categories without needing to search the entire audit corpus. The classification should reference the organization's data inventory or data map where possible, providing traceability from the audit event to the formal record of processing.



**Key identifier.** Which encryption key, tokenization scope, or masking policy was applied. This is critical for key lifecycle management: if a key is suspected of compromise, the audit trail must enable rapid identification of every operation that used that key, across every PII type and every data subject. The key identifier should include the key ID or alias, the key version (for versioned keys), and the key management system from which the key was sourced (e.g., `aws_kms:key/abcd1234:v3`, `vault:transform/payment_scope`, `azure_kv:key/pii-encryption-v2`). For tokenization operations, the scope name is the relevant identifier — it defines which tokenization mapping table was used and, consequently, which data subjects are affected by scope-level operations like rekey or scope deletion.



**Source IP and client identifier.** The network origin of the request and the logical client identity. The source IP should capture the immediate network address (the IP of the calling service or load balancer) and, where available, the forwarded-for chain to reconstruct the original client IP through proxy layers. The client identifier is the logical application or service that initiated the request — distinct from the actor identity, which is the *authenticated* principal. In microservice architectures, a single API call from an external user may traverse multiple internal services before reaching the cryptographic service; the source IP captures the last hop, while the correlation ID (below) captures the full path.



**Request correlation ID.** A unique identifier that links the cryptographic operation to the broader request flow. This is typically the distributed trace ID (OpenTelemetry trace ID, W3C `traceparent` header value) or a correlation ID propagated through the request chain. Without this, the audit trail is a disconnected sequence of cryptographic events that cannot be reconstructed into a coherent business transaction. For example, when investigating a customer support complaint that their SSN was displayed in a web application, the correlation ID enables an investigator to trace from the web request → API gateway → application service → cryptographic service, identifying every point at which PII was decrypted and who authorized each step.



**Outcome.** The result of the operation: `success` or `failure`. For failures, the error code and a sanitized error message must be included — the error message must describe the *nature* of the failure (e.g., `invalid_key_id`, `access_denied`, `key_expired`, `rate_limited`) without exposing sensitive implementation details (no stack traces, no internal paths, no key material). Failed operations are themselves audit-significant: a spike in `access_denied` failures on detokenization may indicate a compromised service account attempting unauthorized access, while a surge in `key_expired` errors may indicate a failed key rotation that needs immediate attention.



**Data volume.** The number of records or items processed in a single operation call. This dimension is essential for detecting bulk operations: a single API call that detokenizes 10,000 credit card numbers is qualitatively different from one that detokenizes a single card number, even though both might be authorized. Volume thresholds should be configurable per operation type and per data classification — bulk detokenization of SSNs warrants a lower threshold than bulk encryption of email addresses, reflecting the difference in sensitivity.



**Target system.** The downstream system or service that received the result of the cryptographic operation. When the cryptographic service decrypts PII and returns it to a calling service, that calling service is the target. Recording the target enables audit reconstruction of data flows: for any given piece of PII, the audit trail should reveal which systems accessed the decrypted value, not merely which system requested the encryption. In event-driven architectures, the target may be a message queue topic or a stream consumer group rather than a direct service.



**GDPR Article 30 alignment.** Article 30 requires controllers to maintain records including: the name and contact details of the controller, the purposes of processing, categories of data subjects and personal data, recipients, international transfers, retention periods, and technical and organizational security measures. While not every Article 30 field maps directly to a per-operation audit event, the aggregate audit trail must support the generation of Article 30 records. The data classification field maps to "categories of personal data," the actor and target fields map to "recipients," and the key identifier and operation type support the "technical and organizational security measures" requirement. Organizations should implement periodic aggregation jobs that transform raw audit events into Article 30-compliant processing records — the audit trail is the source data, not the record itself.



**Data minimization in audit logs.** The most critical rule for PII audit trails is: **never log the PII value itself**. The audit entry must record the *reference* to the PII (the token, the key ID, the record identifier) but never the plaintext value. Logging the decrypted email address alongside the detokenization event defeats the purpose of the protection. This principle extends to derived data: logging a SHA-256 hash of the PII value is acceptable (hashes are one-way, so the PII cannot be recovered), but logging a reversible encoding (Base64 of the encrypted value with the IV) is not — the key material could be compromised separately, and the audit log would then contain enough information to recover the PII. In practice, the audit entry references the PII by its token or record identifier, and the actual PII value remains in the vault or encrypted store.



#### §13.1.2 Sample Audit Log Entry

**Sample audit log entry.** The following JSON structure captures all required fields for a detokenization operation, illustrating how the audit data maps to the requirements defined above:



```json
{
  "audit_event_id": "evt_8f3a1b2c-4d5e-6f7a-8b9c-0d1e2f3a4b5c",
  "timestamp": "2026-04-08T14:32:17.482Z",
  "operation": {
    "type": "detokenize",
    "method": "vault_based",
    "algorithm": null
  },
  "actor": {
    "caller": "user:jsmith@example.com",
    "executor": "sa:payment-service-prod",
    "auth_mechanism": "oauth2_client_credentials",
    "policy_id": "pol_payment_ops_read"
  },
  "data": {
    "classification": "bank_account_number",
    "record_count": 1,
    "token_value": "tok_a1b2c3d4e5f6",
    "key_identifier": {
      "key_id": "payment_iban_scope",
      "key_version": null,
      "kms_system": "hashicorp_vault_transform"
    }
  },
  "source": {
    "ip": "10.0.3.47",
    "x_forwarded_for": ["203.0.113.42"],
    "client_id": "app:web-portal-prod"
  },
  "target": {
    "service": "svc:payment-processor-prod",
    "endpoint": "/api/v2/payments/validate"
  },
  "correlation": {
    "trace_id": "4bf92f3577b34da6a3ce929d0e0e4736",
    "span_id": "00f067aa0ba902b7",
    "request_id": "req_x9y8z7w6"
  },
  "outcome": {
    "status": "success",
    "error_code": null,
    "latency_ms": 12
  },
  "audit_metadata": {
    "log_version": "1.2",
    "sequence_number": 8947321,
    "previous_hash": "sha256:a3f8e2b1c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1"
  }
}
```

Note that the `token_value` field contains only the token reference, not the underlying IBAN. The `previous_hash` field enables hash-chain verification (discussed in §2). The `log_version` field supports schema evolution — when the audit format changes, consumers can filter or transform events based on version.

---

### §13.2 Correlated Audit Trail: Sequence Walkthrough

```mermaid
%%{init: {sequence: {actorMargin: 250, messageMargin: 60}, themeVariables: {noteBkgColor: "transparent", noteBorderColor: "transparent"}}}%%
sequenceDiagram
    autonumber
    participant GW as API Gateway
    participant APP as Application Service
    participant CRYPTO as Crypto Service
    participant KMS as Cloud KMS
    participant AUDIT as Audit Log

    Note over GW, AUDIT: All operations share the same traceparent correlation ID

    GW->>GW: Assign traceparent: 00-abc123...
    GW->>APP: GET /api/users (traceparent header)
    APP->>CRYPTO: Decrypt request (traceparent propagated)
    CRYPTO->>KMS: Unwrap DEK (traceparent propagated)
    KMS-->>CRYPTO: Plaintext DEK
    CRYPTO->>AUDIT: Log: decrypt | actor=app-svc | key=pii-v3 | traceparent=abc123...
    CRYPTO-->>APP: Plaintext PII
    APP->>AUDIT: Log: PII accessed | actor=app-svc | classification=SSN | traceparent=abc123...
    APP-->>GW: 200 OK (response body, no PII in URL)

    rect rgba(148, 163, 184, 0.14)
        Note over AUDIT: Correlated audit trail
        Note over AUDIT: All entries linked by traceparent=abc123...
        Note over AUDIT: Enables forensic reconstruction end-to-end
        Note right of AUDIT: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
```

<details><summary><strong>1. API Gateway assigns traceparent correlation ID</strong></summary>

The API Gateway receives an inbound request from an external client (web application, mobile app, or partner system) and generates a unique correlation ID before any downstream processing begins. This correlation ID is encoded as a W3C `traceparent` header value — a 32-character hex string following the format `00-{trace_id}-{span_id}-{flags}`, where the trace ID is a globally unique 128-bit identifier generated by a CSPRNG. For example: `traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01`.

The gateway may also accept an existing `traceparent` header from the client (as per the W3C Trace Context specification) and use it directly, preserving end-to-end trace continuity from the client's own observability stack. However, if the incoming request lacks a `traceparent` header — which is the common case for external clients that are not instrumented with OpenTelemetry — the gateway must generate one. This ensures that every request entering the system has a correlation ID, regardless of the client's instrumentation level.

```
traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
```

The correlation ID is the linchpin of the entire audit trail. Without it, each service's log entries exist in isolation — disconnected events that cannot be assembled into a coherent forensic narrative. With it, every subsequent log entry across every service can be linked back to this single originating request, enabling the end-to-end reconstruction that GDPR Article 5(2) (accountability) demands.

</details>

<details><summary><strong>2. API Gateway forwards request to Application Service with traceparent header</strong></summary>

The API Gateway performs its standard request processing — authentication, rate limiting, WAF inspection — and forwards the request to the Application Service. Crucially, the `traceparent` header is propagated verbatim in the forwarded request. The gateway may also inject additional context via the `tracestate` header (vendor-specific trace metadata) or the OpenTelemetry `baggage` header, but the core correlation ID in `traceparent` must remain untouched.

```
GET /api/users/eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ1c3JfODJmMWEifQ... HTTP/1.1
traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
X-Request-ID: req_8f2a3b1c
Authorization: Bearer eyJhbGci...
```

The gateway itself logs the request — but critically, the log entry must not contain plaintext PII. If the original client request included PII (e.g., `GET /api/users/jane.doe@example.com/...`), the gateway should log only the PII-free forwarded URL (with the encrypted token or pseudonymized reference), not the original. This is the observability-privacy tension described in §16.1: the gateway's log entry records that a request was received and forwarded, including the correlation ID, but never the PII value itself.

</details>

<details><summary><strong>3. Application Service sends decrypt request to Crypto Service with traceparent propagated</strong></summary>

The Application Service identifies that the requested operation requires access to plaintext PII — for example, a customer profile lookup where the user identifier in the URL is an encrypted envelope (§3.2), or a payment processing step that needs to detokenize a bank account number (§5.3). The Application Service constructs a decrypt request to the Crypto Service, the dedicated component responsible for all PII decryption in the system (§14.3).

The `traceparent` header is propagated from the Application Service to the Crypto Service without modification. This propagation is automatic when using OpenTelemetry-instrumented HTTP clients — the SDK extracts the trace context from the incoming request headers and injects it into the outgoing request. For services not yet instrumented with OpenTelemetry, the application must manually copy the `traceparent` header from the inbound request to the outbound request. Failure to propagate the correlation ID breaks the audit chain at this hop, creating an orphaned decrypt operation that cannot be linked to the originating user request.

```
POST /internal/v1/decrypt HTTP/1.1
Host: crypto-service.internal
traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
Content-Type: application/json
Authorization: Bearer sa:app-service-prod-token

{
  "ciphertext": "eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ1c3JfODJmMWEifQ...",
  "key_id": "aws_kms:key/prod/pii-v3",
  "context": "customer_profile_lookup"
}
```

</details>

<details><summary><strong>4. Crypto Service requests DEK unwrapping from Cloud KMS with traceparent propagated</strong></summary>

The Crypto Service receives the decrypt request and determines that the ciphertext was encrypted using envelope encryption (§3.2) — the ciphertext is accompanied by a wrapped Data Encryption Key (DEK). The Crypto Service must first unwrap the DEK by sending it to the Cloud KMS (AWS KMS, Azure Key Vault, Google Cloud KMS, or HashiCorp Vault), which holds the Key Encryption Key (KEK) needed to decrypt the DEK.

The `traceparent` header is propagated to the KMS API call. While cloud KMS services do not natively understand or propagate OpenTelemetry trace context, the header is included in the API request for audit purposes — the KMS's own audit trail (AWS CloudTrail, Azure Activity Log, GCP Cloud Audit Logs) will record the incoming request headers, preserving the correlation link even though the KMS does not actively participate in the trace.

```
POST /v1/decrypt HTTP/1.1
Host: kms.eu-west-1.amazonaws.com
traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
X-Amz-Target: Trenton.Decrypt
Authorization: AWS4-HMAC-SHA256 ...

{
  "CiphertextBlob": "AQIDAHhV... (base64-encoded wrapped DEK)",
  "EncryptionContext": {
    "service": "crypto-service-prod",
    "operation": "unwrap_dek",
    "key_purpose": "pii_decryption"
  }
}
```

The KMS acts as an access control enforcement point: only authenticated, authorized service accounts can unwrap DEKs. The KMS also logs every unwrapping operation in its native audit trail, creating a parallel audit record that corroborates the Crypto Service's own log entry. The correlation ID in the `traceparent` header enables investigators to cross-reference the KMS audit trail with the application-level audit trail — both recording the same decryption event from different vantage points.

</details>

<details><summary><strong>5. Cloud KMS returns plaintext DEK to Crypto Service</strong></summary>

The Cloud KMS verifies the caller's identity and authorization, checks that the KEK is not in a scheduled deletion state, decrypts the wrapped DEK using the KEK, and returns the plaintext DEK to the Crypto Service. This response is a synchronous operation — the DEK material exists only in the response payload and in the Crypto Service's memory; it is never persisted to disk by either the KMS or the Crypto Service.

The DEK has a short-lived window of relevance: the Crypto Service uses it to decrypt the ciphertext from step 3, then immediately discards it from memory (zeroization). The KMS's own audit log records the unwrapping event with the caller's identity, the key ID, the timestamp, and the source IP — all correlated by the `traceparent` header. This KMS-level audit record is particularly valuable because the KMS is a hardware-backed trust anchor: its log entries cannot be fabricated by application-level attackers who compromise the Crypto Service, providing an independent verification layer.

</details>

<details><summary><strong>6. Crypto Service logs decrypt operation to Audit Log</strong></summary>

The Crypto Service decrypts the ciphertext using the unwrapped DEK and, before returning the plaintext PII to the Application Service, writes an audit log entry to the Audit Log. This entry captures the full minimum audit fields defined earlier in this section: operation type (`decrypt`), actor identity (the service account that invoked the decrypt), timestamp, data classification, key identifier, source IP, correlation ID (the `traceparent` trace ID), and outcome.

```json
{
  "audit_event_id": "evt_d4e5f6a7-8b9c-0d1e-2f3a-4b5c6d7e8f90",
  "timestamp": "2026-04-09T14:32:17.482Z",
  "operation": {"type": "decrypt", "method": "aes_256_gcm"},
  "actor": {
    "caller": "user:jane.doe@example.com",
    "executor": "sa:app-service-prod",
    "auth_mechanism": "oauth2_client_credentials"
  },
  "data": {
    "classification": "ssn",
    "record_count": 1,
    "key_identifier": {"key_id": "prod/pii-v3", "kms_system": "aws_kms"}
  },
  "source": {"ip": "10.0.2.15", "client_id": "app:customer-portal-prod"},
  "target": {"service": "svc:crypto-service-prod", "endpoint": "/internal/v1/decrypt"},
  "correlation": {
    "trace_id": "4bf92f3577b34da6a3ce929d0e0e4736",
    "span_id": "00f067aa0ba902b7"
  },
  "outcome": {"status": "success", "latency_ms": 8}
}
```

Critically, the audit entry records the *fact* of decryption — what was decrypted, by whom, using which key — but **never the plaintext value itself**. The `data` object includes the classification (`ssn`) and the record count, but not the actual SSN. This is the data minimization principle applied to audit logs: the audit trail must be sufficient for forensic investigation and compliance reporting, but must not itself become a PII store.

The `trace_id` field (`4bf92f3577b34da6a3ce929d0e0e4736`) is extracted from the `traceparent` header. This is the field that enables the SIEM (or any downstream analysis tool) to join this audit entry with every other entry in the request's call chain — the gateway's access log, the application service's processing log, and the subsequent audit entries — into a single coherent timeline.

</details>

<details><summary><strong>7. Crypto Service returns plaintext PII to Application Service</strong></summary>

The Crypto Service returns the decrypted PII to the Application Service over an internal, mTLS-secured channel. The plaintext PII exists only in transit and in the Application Service's memory — it is never persisted to disk, never written to a log, and never exposed in a URL. The Application Service receives the PII, uses it for the business operation (e.g., populating a customer profile response, validating a payment), and then discards it from memory as soon as the operation completes.

The internal channel between the Crypto Service and the Application Service is a critical trust boundary. The Crypto Service's architecture (§14.3) ensures that it is the *only* component in the system that can decrypt PII — the Application Service cannot perform decryption directly. This centralization of decryption authority means that the audit trail captured in step 6 is a complete and authoritative record of every PII decryption event in the system. No decryption can occur without a corresponding audit entry.

</details>

<details><summary><strong>8. Application Service logs PII access event to Audit Log</strong></summary>

The Application Service writes a second audit entry to the Audit Log, recording that it received and processed decrypted PII. This entry is distinct from the Crypto Service's decrypt log: it records the *application-level consumption* of PII, not the cryptographic operation itself. The two entries are linked by the same correlation ID, enabling investigators to see both the decryption event (who decrypted what) and the consumption event (who used the decrypted value and for what purpose).

```json
{
  "audit_event_id": "evt_e5f6a7b8-9c0d-1e2f-3a4b-5c6d7e8f90a1",
  "timestamp": "2026-04-09T14:32:17.495Z",
  "operation": {"type": "pii_accessed", "method": null},
  "actor": {
    "caller": "user:jane.doe@example.com",
    "executor": "sa:app-service-prod",
    "auth_mechanism": "oauth2_client_credentials"
  },
  "data": {
    "classification": "ssn",
    "record_count": 1,
    "purpose": "customer_profile_retrieval"
  },
  "source": {"ip": "10.0.2.34", "client_id": "svc:crypto-service-prod"},
  "target": {"service": "svc:app-service-prod", "endpoint": "internal_handler"},
  "correlation": {
    "trace_id": "4bf92f3577b34da6a3ce929d0e0e4736",
    "span_id": "23a456bc78def012"
  },
  "outcome": {"status": "success", "latency_ms": 2}
}
```

The dual-entry pattern — one from the Crypto Service, one from the Application Service — is essential for accountability. The Crypto Service's entry proves that a decryption occurred; the Application Service's entry proves that the result was consumed by a specific business operation. If a data breach investigation reveals unauthorized PII exposure, these two entries together establish the full chain: who requested decryption, which key was used, and which application operation consumed the result. This dual-entry model directly supports GDPR Article 5(2)'s accountability requirement — the controller must be able to demonstrate, not merely assert, that PII processing was authorized and lawful.

</details>

<details><summary><strong>9. Application Service returns response to API Gateway</strong></summary>

The Application Service completes the business operation and returns the response to the API Gateway. The response body may contain the processed data (e.g., a customer profile with the SSN displayed in a masked format), but the critical design constraint is that plaintext PII must never appear in the URL — not in the response path, not in redirect locations, and not in `Location` headers. The URL channel is permanently compromised for PII due to its uncontrolled proliferation across logs, proxies, and browser history (OWASP ASVS v4.0.3, §5.1.2).

```
HTTP/1.1 200 OK
Content-Type: application/json
traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01

{
  "user_id": "usr_82f1a",
  "email_masked": "j***@example.com",
  "ssn_masked": "***-**-1234",
  "profile": {...}
}
```

At this point, the full audit trail for this request exists across multiple logs, all linked by the shared `trace_id: 4bf92f3577b34da6a3ce929d0e0e4736`:

| Service | Log Entry | Key Fields |
|:--------|:----------|:-----------|
| API Gateway | Access log | Request received, traceparent assigned, PII-free URL logged |
| Crypto Service | Decrypt audit | `decrypt` operation, key `prod/pii-v3`, actor `sa:app-service-prod` |
| Cloud KMS | CloudTrail / Activity Log | DEK unwrapping, caller identity, encryption context |
| Application Service | PII access audit | `pii_accessed` operation, purpose `customer_profile_retrieval` |

A SIEM query for `trace_id = 4bf92f3577b34da6a3ce929d0e0e4736` retrieves all four entries, assembling the complete request timeline. If the same user files a data access request (GDPR Article 15) or a complaint about unauthorized processing, the DPO can trace every decryption of that user's PII by querying for all trace IDs associated with the user's pseudonymized reference (§16.3) — without ever accessing the plaintext PII itself.

</details>

<br/>

---

### §13.3 Immutability and Tamper Evidence

An audit trail is valuable only if it can be trusted. If the log entries recording cryptographic operations can be modified, deleted, or backdated after the fact, they have no evidentiary value — in regulatory investigations, legal proceedings, or internal incident response. Immutability transforms audit logs from operational convenience into legally admissible evidence. This section covers the cryptographic mechanisms that enforce immutability, the storage architectures that support it, the legal standards that govern admissibility, and the operational practices that maintain integrity over time.



**Why immutability matters.** Consider the forensic scenario: a data breach investigation reveals that 50,000 SSNs were detokenized over a weekend by a service account that should not have had access. The investigation depends on the audit trail to establish the timeline, identify the actor, and determine the scope of exposure. If the audit log has been tampered with — entries deleted to cover tracks, timestamps altered to shift blame, or entries fabricated to create false alibis — the investigation collapses. Regulators (GDPR supervisory authorities under Article 58) will not accept untrusted logs as evidence of compliance. Courts in the EU, under the eIDAS Regulation (Regulation (EU) No 910/2014), require that electronic evidence meet standards of integrity and authenticity — standards that mutable logs cannot satisfy. The reputational cost of an audit trail that cannot be trusted is, in practice, indistinguishable from not having an audit trail at all.



#### §13.3.1 Cryptographic Sealing Mechanisms

**Cryptographic sealing via hash chains.** The simplest and most widely implemented mechanism for tamper-evident logging is the hash chain. Each log entry includes a cryptographic hash of the *previous* entry. To tamper with any entry — changing its timestamp, removing an event, or inserting a fabricated event — an attacker would need to recompute the hash of every subsequent entry in the chain. Without access to the sealing key (the private key used to sign periodic checkpoints, discussed below), the tampered chain will fail verification. The hash chain is conceptually identical to a blockchain without the distributed consensus: entries are ordered, each cryptographically linked to its predecessor, and verified by recomputing hashes from a trusted anchor.



The implementation is straightforward. Each audit event is serialized to a canonical form (deterministic JSON serialization, sorted keys, no whitespace), and a SHA-256 hash is computed over the concatenation of the previous entry's hash and the current entry's content. The resulting hash becomes the `previous_hash` field in the next entry (as shown in the sample audit entry in §1). Verification involves starting from the oldest known-good entry (a trusted anchor, typically the first entry after a key rotation or system deployment) and recomputing the chain forward. Any mismatch indicates tampering at or after the point of divergence.



Hash chains are effective against modification of individual entries and against deletion of entries in the middle of the chain. They are less effective against *truncation* — deleting the tail of the chain (removing the most recent entries) — because the verifier has no way to detect that entries are missing from the end. This limitation is addressed by periodic checkpointing and external anchoring (discussed below).



**Merkle tree approach for scalable verification.** For high-volume systems generating millions of audit events per day, the hash chain introduces a verification bottleneck: to verify the integrity of any single entry, the entire chain must be recomputed from the anchor. Merkle trees address this by organizing entries into blocks and computing a binary hash tree over each block. The root hash of each tree is published as a checkpoint, and verification of any individual entry requires only the hash path from the entry to the root — typically $\log_2(n)$ hash computations for a block of $n$ entries, rather than $n$ for a linear chain.



The architecture works as follows: audit events are buffered into time-based blocks (e.g., 1-minute or 10-minute windows). At the end of each block, a Merkle tree is constructed over the block's entries. The Merkle root is signed with the organization's audit signing key and published to an immutable external location — a public transparency log, a blockchain, or a time-stamping service. To verify an individual entry, the verifier requests the Merkle proof (the sibling hashes along the path from the leaf to the root) and the signed root, recomputes the root from the entry and the proof, and validates the signature. This provides $O(\log n)$ verification regardless of the total number of entries.



Several open-source implementations provide Merkle-tree-based audit logging: **Append-only Merkle Tree** (conceptual framework), **Google's Certificate Transparency** (the inspiration for log-based transparency), and commercial products like **Immuta** and **privacera** that integrate Merkle-based immutability into data governance platforms. For organizations building custom audit infrastructure, the Merkle tree is the recommended approach for any system processing more than 10,000 audit events per day.



**External anchoring for non-repudiation.** Even with hash chains and Merkle trees, the audit system itself is under the organization's control — a sufficiently privileged insider (or a compromised system administrator) could modify both the audit entries and the hash chain. External anchoring addresses this by periodically publishing a digest of the audit log's state to a location outside the organization's control. Options include:



- **Public transparency logs** (e.g., Certificate Transparency-style logs, Sigstore's Rekor ledger) — the Merkle root is published to a publicly verifiable, append-only log. Anyone can verify that a given root was published at a given time, and the log's append-only nature prevents retrospective modification.



- **Blockchain anchoring** — the Merkle root is embedded in a cryptocurrency transaction (Bitcoin, Ethereum) or a purpose-built blockchain. The transaction's inclusion in a block provides a timestamp and immutability guarantee backed by the blockchain's consensus mechanism. This is expensive (transaction fees) but provides the strongest non-repudiation guarantee.



- **Trusted timestamping services** — RFC 3161-compliant time-stamping authorities (e.g., DigiCert, GlobalSign) provide cryptographic timestamps that bind a hash to a specific time. The timestamp token is signed by the TSA's private key and can be independently verified. This is less expensive than blockchain anchoring and provides sufficient non-repudiation for most regulatory purposes.



The choice of anchoring mechanism depends on the threat model: for defense against external tampering, internal hash chains suffice; for defense against insider threats, external anchoring is necessary.

```mermaid
flowchart TD
    subgraph Sources["Audit Event Sources"]
        CRYPTO["Crypto Service<br/><i>encrypt / decrypt / tokenize</i>"]
        VAULT["Tokenization Engine<br/><i>vault-based / FPE</i>"]
        MW["Encryption Middleware<br/><i>application-level ops</i>"]
    end

    subgraph Sealing["Hash-Chain Sealer"]
        BUFFER["Event Buffer<br/><i>time-based windows</i>"]
        CHAIN["Hash Chain<br/><i>SHA-256(previous_hash + event)</i>"]
        MTREE["Merkle Tree Builder<br/><i>per-block root hash</i>"]
        SIGN["Periodic Checkpoint<br/><i>HSM-signed Merkle root</i>"]
    end

    subgraph Anchors["External Anchors"]
        TL["Transparency Log<br/><i>Sigstore Rekor</i>"]
        TSA["Timestamping Authority<br/><i>RFC 3161</i>"]
        BC["Blockchain<br/><i>Bitcoin / Ethereum tx</i>"]
    end

    subgraph Storage["Immutable Storage Tiers"]
        HOT["Hot Tier<br/><i>Elasticsearch / Splunk</i><br/>30–90 days"]
        WARM["Warm Tier<br/><i>S3 Standard / Blob</i><br/>1–2 years"]
        COLD["Cold Tier<br/><i>S3 Object Lock / Immutable Blob</i><br/>7+ years"]
    end

    VERIFY["Periodic Verification Job<br/><i>sample → verify hash chain + Merkle proof</i>"]

    CRYPTO --> BUFFER
    VAULT --> BUFFER
    MW --> BUFFER
    BUFFER --> CHAIN
    CHAIN --> MTREE
    MTREE --> SIGN
    SIGN --> TL
    SIGN --> TSA
    SIGN --> BC
    CHAIN --> HOT
    HOT --> WARM
    WARM --> COLD
    COLD --> VERIFY
    VERIFY -->|"integrity report"| HOT
```

#### §13.3.2 Write-Once Storage and Legal Admissibility

**Write-once storage backends.** Cryptographic sealing provides tamper *detection*; write-once storage provides tamper *prevention*. Even if an attacker obtains write access to the log storage, they cannot modify existing entries. The major cloud providers offer write-once or append-only storage options:



| Storage Backend | Write-Once Mechanism | Retention Control | Notes |
|:----------------|:---------------------|:------------------|:------|
| AWS S3 Object Lock | Governance or Compliance mode; minimum/maximum retention periods | Per-object or bucket-default retention; legal hold | Compliance mode prevents *any* deletion by any user, including root |
| Azure Blob Storage Immutable Storage | Time-based or legal hold immutability policies | Per-container or per-blob version | Legal hold prevents deletion until explicitly cleared |
| GCP Cloud Storage Object Holds | Event-based or time-based holds | Per-object | Integration with Vault Lock for Compliance mode equivalents |
| AWS CloudTrail | Managed append-only log delivery; S3 bucket with Object Lock as destination | Configurable retention (7 days to indefinite) | CloudTrail itself is append-only; S3 lock provides additional guarantee |
| Azure Monitor Log Analytics | Retention policies; immutable retention not native | 30–730 days (configurable) | Export to immutable storage for long-term retention |
| Elasticsearch / OpenSearch | Index-level settings: `index.blocks.write` (read-only) | Not native — requires external enforcement | Set indices to read-only after the retention window closes |



The recommended architecture is a two-tier system: a hot tier using the organization's existing log aggregation platform (Elasticsearch, Splunk, Datadog) for real-time querying and alerting, and a cold tier using cloud immutable storage (S3 Object Lock, Azure Immutable Blob) for long-term retention and tamper evidence. Entries flow from hot to cold on a configurable schedule (e.g., after 30 days), at which point the hot index is marked read-only.



**EU eIDAS and legal admissibility.** The eIDAS Regulation (Regulation (EU) No 910/2014) establishes standards for electronic identification, trust services, and electronic transactions within the EU. While eIDAS does not directly regulate audit logs, its provisions on electronic evidence and electronic signatures inform the admissibility standards that EU courts and supervisory authorities apply to digital records. Under eIDAS, electronic evidence must demonstrate: **integrity** (the record has not been altered since creation), **authenticity** (the record originated from the claimed source), and **availability** (the record can be produced when required). Cryptographic hash chains provide integrity; digital signatures on checkpoints provide authenticity; and write-once storage with appropriate retention policies provides availability.



For GDPR enforcement proceedings, audit logs serve as evidence of the technical and organizational measures implemented under Article 32. Supervisory authorities (under Article 58(1)(j)) have the power to obtain access to all personal data and processing operations. If an organization cannot produce trustworthy audit records — or if those records have been tampered with — the authority may infer non-compliance, with the consequences outlined in Article 83 (administrative fines up to €20 million or 4% of global annual turnover).



**Tamper detection and periodic verification.** Immutable storage prevents tampering; hash chains detect it. But detection only works if verification is actually performed. Organizations must implement periodic integrity verification jobs that:



1. Select a random sample of entries from the cold storage tier.

2. Retrieve the corresponding Merkle proofs (or recompute the hash chain segment).

3. Validate the proofs against the externally anchored checkpoint signatures.

4. Report any discrepancies to the security operations team immediately.



Verification should run at least daily, with the sample size proportional to the log volume (e.g., 1% of daily entries, minimum 100 entries). Any verification failure should trigger a high-severity security alert and initiate the incident response process — a broken hash chain indicates either a storage system malfunction (corruption) or active tampering, both of which require immediate investigation.



#### §13.3.3 Operational Integrity Practices

**Retention: balancing GDPR storage limitation with regulatory requirements.** GDPR Article 5(1)(e) establishes the storage limitation principle: personal data must be kept "no longer than is necessary for the purposes" of processing. However, audit logs containing references to PII operations (but not PII itself, per §1's data minimization rule) serve multiple purposes with different retention needs:



- **Operational monitoring**: 30–90 days — sufficient for real-time alerting, dashboarding, and operational troubleshooting.

- **Incident investigation**: 1–2 years — regulatory investigations and breach notifications (GDPR Article 33 requires notification within 72 hours, but investigation timelines often extend to months).

- **Compliance audit**: 3–7 years — many industry regulations (SOX, PCI DSS, HIPAA, national data protection laws) mandate multi-year record retention. PCI DSS Requirement 10.7 requires audit log retention for "at least one year, with a minimum of three months immediately available for analysis."

- **Legal proceedings**: 7+ years — statutes of limitations for civil and criminal proceedings vary by jurisdiction; EU member states typically set 3–10 years for data protection-related claims.



The recommended approach is tiered retention: hot storage for 30–90 days (immediately queryable), warm storage for 1–2 years (queryable with moderate latency), cold immutable storage for 7+ years (queried only during legal proceedings or compliance audits). The retention period should be documented in the organization's data retention policy, aligned with legal counsel's assessment of applicable statutes of limitations.



**Access control: separation of duties.** Audit logs must be protected by strict access controls that separate the *write* permission from the *read* permission. The services generating audit events (cryptographic services, tokenization engines, encryption middleware) require only write access to the log sink. The read permission — the ability to query, analyze, and export audit data — should be restricted to a separate set of users and service accounts: security operations analysts, compliance officers, internal audit teams, and designated incident responders. This separation prevents a compromised cryptographic service from covering its tracks by deleting its own audit entries (the write-only permission cannot delete), and it prevents a single administrator from both generating and reviewing audit data without oversight.



In cloud environments, this maps naturally to IAM role separation: one role for log producers (e.g., `audit-log-writer` with permissions only to `logs:PutLogEvents`), another for log consumers (e.g., `audit-log-reader` with permissions to `logs:FilterLogEvents` and `logs:GetLogEvents`). In HashiCorp Vault, the audit device is configured globally — all Vault operations are automatically logged to the configured audit backend, and no Vault token can disable or modify audit logging.



**Centralized log aggregation architecture.** Audit logs from all cryptographic services, tokenization engines, and encryption middleware must flow to a centralized aggregation platform. Decentralized audit logs — scattered across individual service log files — are fragmented, difficult to query, and easy to miss during investigations. The centralized platform must support:



- **Multi-protocol ingestion**: syslog, HTTP/HTTPS (via Filebeat/Fluentd/Vector), cloud-native push (AWS CloudTrail, Azure Monitor diagnostic settings, Google Cloud Audit Logs export).

- **Structured query**: the ability to search audit events by any field (operation type, actor, data classification, key identifier, timestamp range) with sub-second latency for the hot tier.

- **Role-based access control**: granular permissions for different analyst roles (security operations, compliance, development).

- **Immutable backing store**: the aggregation platform must write to append-only or write-once storage; it must not allow modification or deletion of ingested entries within the retention period.



The major platforms — Splunk, Elastic Security, Microsoft Sentinel, Datadog Logs, Grafana Loki — all support these requirements to varying degrees. The choice depends on the organization's existing SIEM investment, budget, and scale requirements. The critical requirement is the immutable backing store — a SIEM without write-once storage provides search and alerting but not evidentiary integrity.



**Backup and disaster recovery for audit logs.** Audit logs are as critical as the data they protect — losing the audit trail during a disaster event is equivalent to losing the ability to demonstrate compliance and investigate incidents. Backup strategy for audit logs must follow the same immutability principles as the primary store:



- **Cross-region replication** for cloud-backed audit storage (S3 cross-region replication with Object Lock, Azure geo-redundant immutable storage).

- **Air-gapped backups** for the most sensitive audit categories — copies written to offline or physically isolated storage media that cannot be accessed from the production network.

- **Restoration verification**: backup integrity must be tested periodically (at least quarterly) by restoring a sample and verifying hash chain integrity.



The recovery time objective (RTO) for audit logs should be aligned with incident response needs: if the SIEM platform goes down, how quickly must audit logs be available for investigators to continue their work? For most organizations, an RTO of 4–24 hours is acceptable for the cold tier, while the hot tier should be available within minutes (supported by the SIEM platform's own high-availability configuration).

---

### §13.4 SIEM Integration and Alerting

```mermaid
flowchart LR
    subgraph Sources["Audit Sources"]
        CS["Crypto&nbsp;Service"]
        TE["Tokenization&nbsp;Engine"]
        EM["Encryption&nbsp;Middleware"]
        KMS["Cloud&nbsp;KMS<br/>CloudTrail/Activity&nbsp;Log"]
    end

    subgraph Ingestion["Log Ingestion"]
        FB["Filebeat / Fluentd / Vector"]
        HEC["HTTP Event Collector"]
        API["Logs&nbsp;API"]
    end

    subgraph SIEM["SIEM Platform"]
        IDX["Structured Index<br/><i>audit_crypto</i>"]
        RULES["Detection Rules<br/><i>Rules&nbsp;1–6</i>"]
        DASH["Dashboards"]
        SOAR["SOAR&nbsp;Playbooks"]
    end

    subgraph Enrichment["Cross-Log Correlation"]
        AUTH["Auth&nbsp;Logs<br/><i>Okta / Azure&nbsp;AD</i>"]
        NET["Network&nbsp;Logs<br/><i>VPC Flow / Firewall</i>"]
        GW["API&nbsp;Gateway<br/><i>Access&nbsp;Logs</i>"]
    end

    subgraph Storage["Immutable Storage"]
        COLD["S3&nbsp;Object&nbsp;Lock<br/>Azure&nbsp;Immutable&nbsp;Blob"]
    end

    subgraph Response["Response"]
        ALERT["Slack / PagerDuty"]
        TICKET["Jira / ServiceNow"]
    end

    CS --> FB
    TE --> FB
    EM --> FB
    KMS --> HEC
    FB --> IDX
    HEC --> IDX
    API --> IDX
    IDX --> RULES
    RULES --> SOAR
    RULES --> ALERT
    SOAR --> TICKET
    SOAR --> ALERT
    IDX --> DASH
    AUTH --> IDX
    NET --> IDX
    GW --> IDX
    IDX -->|"tiered&nbsp;rotation"| COLD
```

Audit logs are inert data without the analysis and alerting infrastructure that transforms them into actionable intelligence. A cryptographic operation audit trail generates high-volume, structured event data that is ideally suited for ingestion into a Security Information and Event Management (SIEM) system — but the integration must be designed deliberately to ensure that PII-relevant signals are not drowned in noise. This section covers integration patterns with the major SIEM platforms, alerting rules tailored to cryptographic operations, cross-log correlation techniques, and the dashboard design that gives security operations teams real-time visibility into the organization's PII protection posture.



#### §13.4.1 Ingestion Patterns

**Ingestion patterns by SIEM platform.** Each major SIEM platform has a preferred ingestion method, and the choice affects latency, reliability, and cost:



- **Splunk** ingests audit logs via HTTP Event Collector (HEC), Universal Forwarder (agent-based), or syslog. For cryptographic audit logs, HEC is recommended — it supports structured JSON events natively, provides acknowledgment-based delivery confirmation, and allows per-event metadata (source, sourcetype, index) that drives downstream routing. Crypto audit logs should be assigned a dedicated index (e.g., `audit_crypto`) with a retention policy aligned to the tiered model described in §2. Splunk's Common Information Model (CIM) can be extended with a custom data model for cryptographic operations, enabling standardized field names across different log sources.



- **Microsoft Sentinel** ingests via data connectors — the Logs Ingestion API (for custom sources), the Diagnostic Settings export (for Azure-native services like Key Vault), or the Agent-based collection (for on-premises systems). For HashiCorp Vault audit logs, the solution is to forward syslog output to an Azure Monitor Log Analytics workspace via syslog-forwarding agents (Linux syslog-ng or Fluentd). Sentinel's Kusto Query Language (KQL) provides powerful time-series and anomaly detection capabilities well-suited to cryptographic audit analysis. The key integration decision is whether to use Sentinel's built-in Azure Key Vault connector (which captures Azure-native KMS operations) and supplement it with a custom connector for non-Azure cryptographic services (Vault, CipherTrust, custom middleware).



- **Elastic Security** ingests via Filebeat, Logstash, or the Elasticsearch HTTP API. Filebeat is the standard choice for structured JSON logs — the `json` filebeat module parses each line as a JSON document and maps fields to Elasticsearch's index mapping. For cryptographic audit logs, a dedicated index template with strict field mappings ensures data quality. Elastic Security's detection rules engine supports custom threshold-based rules (e.g., "more than N decryptions by a single actor in T minutes") and machine-learning anomaly detection jobs that can identify statistical outliers in cryptographic operation patterns without predefined thresholds.



- **Datadog** ingests via the Datadog Agent, the Logs API, or forwarding from existing log pipelines (Fluentd, Logstash, Vector). Datadog's strength is the tight integration between log analytics and infrastructure metrics — an alert on a spike in decryption operations can be correlated with CPU utilization on the cryptographic service, latency metrics, and upstream request rates in a single pane. Datadog's Security Signals feature supports rule-based detection on log patterns, and the Security Investigation workflow enables rapid pivot from an alert to the underlying log events.



- **Google Chronicle** (now part of Google SecOps) is designed for long-term log retention with fast query performance — up to 1 year of hot-queryable storage with petabyte-scale capacity. Chronicle ingests via the Chronicle API or the Event Forwarder agent. Its strength for cryptographic audit logs is the ability to perform retroactive threat hunting across extended time periods: an investigator can query 6 months of decryption history for a specific service account without the latency penalties of cold-storage retrieval. Chronicle's YARA-L detection rules support temporal and multi-event correlation, enabling sophisticated detection of slow-and-low exfiltration patterns that might not trigger volume-based alerts.



#### §13.4.2 Anomaly Detection Rules

**Alerting rules for anomalous cryptographic operations.** The following alerting rules should be implemented as a baseline for any organization with a cryptographic audit trail. Each rule is defined by its detection logic, the threat it addresses, and the recommended response:



**Rule 1: Decryption volume spike.** Detect when the number of decryption operations in a rolling time window exceeds a configurable threshold (e.g., >3 standard deviations above the 30-day hourly average, or >5× the median hourly rate). This detects bulk data exfiltration attempts where an attacker with access to a legitimate service account initiates large-scale decryption of PII. The rule should be segmented by actor, data classification, and target system — a spike in email decryption by the marketing service is less concerning than a spike in SSN decryption by a newly created service account.



- **Detection query (KQL example)**: `audit_crypto | where operation_type == "decrypt" | summarize count() by bin(timestamp, 1h), actor_executor, data_classification | where count_ > threshold_dynamic(actor_executor, data_classification)`

- **Response**: Trigger security incident. Block the actor's decryption access pending investigation. Review all decryptions performed by the actor in the preceding 72 hours.



**Rule 2: Unauthorized key access attempt.** Detect when an audit event records a `failure` outcome with an `access_denied` error code against a key identifier, particularly for high-sensitivity keys (SSN tokenization scope, payment encryption keys). A single failed access may be a legitimate misconfiguration; a pattern of repeated failures from the same actor or IP indicates probing or attempted privilege escalation.



- **Detection logic**: Count `access_denied` failures per actor per key within a 15-minute window. Alert if >5 failures against the same key or >10 failures across any keys by the same actor.

- **Response**: Review the actor's permissions. If the access is not authorized, revoke the relevant policy. If the access was legitimate but the actor's permissions were misconfigured, create a ticket to correct the configuration.



**Rule 3: After-hours cryptographic operations.** Detect cryptographic operations performed outside the organization's defined business hours (e.g., 22:00–06:00 local time) by service accounts that are not expected to operate during those windows. This is a simple but effective rule for organizations that have predictable workload patterns — batch encryption jobs, ETL pipelines, and scheduled tokenization runs should be whitelisted. Operations that fall outside the whitelist merit investigation.



- **Detection logic**: Filter audit events by timestamp outside business hours, exclude whitelisted service accounts (batch jobs, cron-based processes), alert on any remaining events.

- **Response**: Determine whether the operation was authorized (e.g., emergency production fix, on-call rotation). If not, investigate the actor identity and source IP.



**Rule 4: Bulk detokenization.** Detect single API calls or short-duration bursts that detokenize unusually large numbers of records. Unlike Rule 1 (which detects volume *across* calls), this rule detects volume *within* a single call or a tight time window — the pattern of a batch export or a mass data access.



- **Detection logic**: Alert when `data_classification` is a high-sensitivity category (SSN, bank account, health record) and `record_count` exceeds a per-classification threshold (e.g., >100 SSNs or >500 IBANs in a single call, or >1,000 in a 5-minute window from the same actor).

- **Response**: Verify the operation was authorized by the data owner. If authorized, log the justification in the audit trail. If not, treat as a potential data breach and initiate the GDPR breach notification process (Article 33).



**Rule 5: Rate-based failed decrypt/tokenize operations.** Detect a sustained rate of `failure` outcomes in decrypt or detokenize operations. A low error rate (1–2%) is normal — invalid tokens, expired keys, malformed inputs. A sustained error rate above 5–10% indicates either a systemic issue (key rotation gone wrong, configuration drift) or an active attack (credential stuffing against the tokenization API, fuzzing the decryption endpoint).



- **Detection logic**: Compute the rolling failure rate over 15-minute windows. Alert if the rate exceeds 10% for two consecutive windows.

- **Response**: Check system health — has a key rotation just occurred? Has the configuration of a calling service changed? If system health is confirmed, investigate for active attack.



**Rule 6: Key access from unusual IP or service account.** Detect when a key that is normally accessed by a specific set of actors or from a specific network range is accessed by a new actor or from a new IP. This requires a baseline period (typically 30 days) to establish the normal access pattern. New accesses that fall outside the baseline — particularly for the most sensitive keys — warrant investigation.



- **Detection logic**: Maintain a 30-day baseline of unique (actor, source_ip) pairs per key identifier. Alert on any access from a (actor, source_ip) pair not seen in the baseline.

- **Response**: Verify the access is legitimate (e.g., new service deployment, authorized access from a new environment). If not, revoke the actor's access and investigate.

```mermaid
flowchart TD
    EVENT["Audit Event<br/><i>crypto operation logged</i>"]

    EVENT --> R1{"Rule&nbsp;1<br/>Decryption&nbsp;volume&nbsp;>&nbsp;5×&nbsp;baseline?"}
    EVENT --> R2{"Rule&nbsp;2<br/>>5&nbsp;access_denied<br/>in&nbsp;15&nbsp;min?"}
    EVENT --> R3{"Rule&nbsp;3<br/>Outside&nbsp;business&nbsp;hours?"}
    EVENT --> R4{"Rule&nbsp;4<br/>Bulk&nbsp;detokenize<br/>>100&nbsp;SSNs?"}
    EVENT --> R5{"Rule&nbsp;5<br/>Failure&nbsp;rate&nbsp;>&nbsp;10%<br/>over&nbsp;30&nbsp;min?"}
    EVENT --> R6{"Rule&nbsp;6<br/>New&nbsp;actor&nbsp;or&nbsp;IP<br/>for&nbsp;this&nbsp;key?"}

    R1 -->|"yes"| HIGH["🔴 HIGH Severity<br/>Block&nbsp;actor&nbsp;→ investigate&nbsp;72h"]
    R2 -->|"yes"| MED_HIGH["🟠 HIGH Severity<br/>Review&nbsp;permissions&nbsp;→ revoke&nbsp;if&nbsp;unauthorized"]
    R4 -->|"yes"| HIGH
    R3 -->|"yes"| MED["🟡 MEDIUM Severity<br/>Verify&nbsp;authorization"]
    R5 -->|"yes"| MED_LOW["🟡 MEDIUM Severity<br/>Check&nbsp;key&nbsp;rotation&nbsp;/ config&nbsp;drift"]
    R6 -->|"yes"| LOW_INFO["🔵 LOW Severity<br/>Verify&nbsp;new&nbsp;access&nbsp;pattern"]

    HIGH --> SOAR["SOAR Playbook<br/>Enrich&nbsp;→ Contain&nbsp;→ Document"]
    MED_HIGH --> SOAR
    MED --> REVIEW["SOC&nbsp;Review<br/>Manual&nbsp;triage"]
    MED_LOW --> REVIEW
    LOW_INFO --> LOG["Log&nbsp;for&nbsp;baseline<br/>Update&nbsp;access&nbsp;map"]
```

#### §13.4.3 Dashboards and Automated Response

**Cross-log correlation.** Crypto audit logs tell part of the story; the full picture requires correlation with other log sources. A decryption spike in the crypto audit trail becomes far more meaningful when correlated with:



- **Authentication logs** (Okta, Azure AD, Keycloak) — was the service account's credential recently rotated? Was a new token issued from an unusual location?

- **Network logs** (VPC flow logs, firewall logs) — does the source IP match the expected network segment for the calling service? Is there evidence of lateral movement?

- **API gateway logs** (Kong, AWS API Gateway, Azure APIM) — what was the original client request that triggered the cryptographic operation? Was the request authenticated? Was it from an expected client application?

- **Infrastructure access logs** (AWS CloudTrail, Azure Activity Log, GCP Cloud Audit Logs) — was there a recent change to IAM policies, key policies, or service configurations that might explain the anomalous behavior?



Correlation is typically implemented in the SIEM platform using join queries (Splunk `join`, KQL `join`, Elasticsearch `has_parent`/`has_child`) or through a dedicated correlation engine (Elastic Security's timeline feature, Splunk Enterprise Security's notable event groups). The key design decision is whether to correlate in real-time (event-by-event, higher SIEM load) or in batch (post-ingestion, lower load but delayed detection). For the high-severity rules above, real-time correlation is recommended; for historical investigation, batch correlation over the cold tier suffices.



**Dashboards: real-time visibility.** The security operations team needs at-a-glance visibility into the health and security posture of the cryptographic infrastructure. The recommended dashboard layout includes:



- **Operations overview**: real-time rate of cryptographic operations by type (encrypt/decrypt/tokenize/detokenize), segmented by service and data classification. This establishes the baseline "normal" pattern that anomalies deviate from.

- **Error rate**: percentage of failed operations by error code, with time-series trend. Spikes in specific error codes (`key_expired`, `access_denied`, `rate_limited`) indicate operational issues or security events.

- **Key usage heatmap**: matrix of (key identifier) × (actor), showing the number of operations per time window. Cells that light up unexpectedly indicate new or unusual key access patterns.

- **Data classification breakdown**: distribution of operations by PII classification, enabling compliance officers to answer "how many times was SSN data tokenized this week?" without writing ad-hoc queries.

- **Active alerts**: list of currently firing crypto audit alerts with severity, rule name, affected actor, and drilldown to the underlying events.

- **Compliance metrics**: counts aligned with regulatory requirements — total detokenizations for the reporting period, unique data subjects accessed, retention status of audit logs by tier.



**Automated response: SOAR playbook integration.** When a crypto audit alert fires, the initial response steps are often predictable and time-sensitive enough to benefit from automation via a Security Orchestration, Automation, and Response (SOAR) platform (Splunk SOAR, Cortex XSOAR, Tines). A playbook for Rule 1 (decryption volume spike) might execute:



1. **Enrichment**: Query the IAM system for the actor's identity, creation date, associated policies, and recent authentication events. Query the CMDB for the source IP's asset ownership.

2. **Containment**: If the actor is a service account and the spike exceeds 10× baseline, automatically disable the service account's decryption permission (with a rollback mechanism). If the actor is a human user, flag the account for the security operations team to review.

3. **Evidence collection**: Extract all decryption events by the actor in the preceding 72 hours from the cold audit tier. Package for forensic review.

4. **Notification**: Send an alert to the security operations team via Slack/Teams/PagerDuty, including the enrichment data, containment actions taken, and a link to the evidence package.

5. **Documentation**: Create a security incident ticket in the ITSM system (Jira, ServiceNow), linked to the audit evidence.



Automation should be applied judiciously — automated containment actions carry the risk of disrupting legitimate business processes. The recommended approach is to start with enrichment-only automation (steps 1, 3, 5) and add containment automation (step 2) only after the playbook has been validated in a non-production environment and the false-positive rate is acceptably low.

---

### §13.5 Vendor Audit Capabilities

The audit capabilities of a cryptographic or tokenization platform are a critical selection criterion — and frequently an afterthought during evaluation. A platform that provides excellent encryption or tokenization but weak audit logging creates a compliance gap that must be filled with custom development, adding cost and complexity. This section compares the built-in audit capabilities of eight major vendors across six dimensions, identifies gaps that require custom implementation, and provides guidance on evaluating vendor audit features during the selection process.



#### §13.5.1 Vendor Profiles

**HashiCorp Vault.** Vault's audit system is one of its strongest enterprise features. Vault supports multiple audit devices (backends) simultaneously: `file` (writes JSON-formatted audit entries to a file), `syslog` (forwards to a syslog endpoint), `socket` (TCP/UDP with JSON payloads, suitable for Logstash/Fluentd ingestion), and an `enterprise` audit device ( Vault Enterprise only) that supports direct integration with Splunk and Elastic via purpose-built plugins. Every Vault operation — including token creation, secret access, policy modification, and Transit engine cryptographic operations — is automatically logged to all enabled audit devices. Vault signs each audit entry with an HMAC using a per-audit-device key, providing tamper-evidence at the entry level (though not a hash chain across entries — Vault does not chain hashes between consecutive audit entries). The audit log format includes the full request path, request data (with sensitive values HMAC'd), response data (similarly HMAC'd), authenticated identity, source IP, and timestamp. Vault's approach to sensitive data in audit logs is notable: rather than omitting sensitive fields entirely, Vault replaces them with an HMAC value that can be verified later (proving the field existed and had a specific value) without revealing the value itself. This is a powerful pattern for forensic investigation — investigators can verify that a specific key was accessed without seeing the key's value.



**Thales CipherTrust.** CipherTrust Manager provides centralized key management and data protection across multiple backends (HSMs, cloud KMS, databases, file systems). Its audit capabilities are enterprise-grade: detailed operation logs for all cryptographic operations (encryption, decryption, key lifecycle), compliance reporting aligned with PCI DSS, GDPR, HIPAA, and SOX, and integration with Thales's HSM audit trails for a unified view across software and hardware security modules. CipherTrust's audit logs capture the full context of each operation: who, what, when, which key, which domain/policy, and the outcome. The compliance reporting module generates pre-built reports for auditor consumption — a significant advantage over platforms that require custom report development. CipherTrust logs can be forwarded to external SIEM platforms via syslog or API-based export. A gap: CipherTrust's audit logs do not include native HMAC signing or hash-chain immutability — tamper-evidence must be enforced at the log storage layer (e.g., by writing to an immutable S3 bucket with Object Lock).



**Protegrity.** Protegrity's data protection platform focuses on enterprise-scale tokenization and encryption, with a strong governance layer that includes a dedicated governance dashboard. The dashboard provides visibility into which data is protected, by which policy, across which systems — and logs all protect/unprotect operations with full context. Protegrity's audit trail captures: operation type (protect, unprotect, rekey, policy change), actor identity, data classification (mapped to Protegrity's built-in data type taxonomy), policy name, key version, and outcome. The platform supports role-based access to audit reports — compliance officers can view summaries and trend reports without accessing individual log entries. Integration with SIEM platforms is via syslog export or REST API. A notable feature is Protegrity's policy enforcement logging: when a data protection policy blocks an operation (e.g., an attempt to unprotect data without the required authorization), the policy violation is logged with the full context, enabling compliance teams to track unauthorized access attempts. Gap: no native hash-chain or HMAC signing — relies on the SIEM or storage backend for immutability.



**Google Cloud DLP and Cloud KMS.** Google Cloud provides two audit surfaces for cryptographic and data protection operations. Cloud KMS (Key Management Service) operations — encrypt, decrypt, sign, verify, key creation, key rotation — are logged to Cloud Audit Logs, which includes two categories: Admin Activity logs (always on, free, 400-day retention) and Data Access logs (optional, billable, configurable retention). Data Access logs for KMS capture every cryptographic operation with the caller's identity, the key used, the API method, and the response status. Cloud DLP (Data Loss Prevention) operations — inspect, de-identify, re-identify — are similarly logged to Cloud Audit Logs. The integration advantage is significant: all Google Cloud services share a unified audit log format, and Cloud Audit Logs are exported to Cloud Storage, BigQuery, or Pub/Sub for downstream analysis. Cloud Monitoring provides pre-built metrics for KMS operations, and Alerting Policies can be configured for anomaly detection. The key gap: Cloud Audit Logs are not inherently tamper-evident. Google provides Bucket Lock for Cloud Storage (equivalent to S3 Object Lock), and BigQuery has table retention features, but the audit logs themselves do not include HMAC signing or hash chaining. Organizations requiring cryptographic immutability must implement it at the export/destination layer.



**AWS KMS and CloudTrail.** AWS KMS operations are logged to AWS CloudTrail, which records every KMS API call (GenerateDataKey, Encrypt, Decrypt, CreateKey, ScheduleKeyDeletion, etc.) with the caller's IAM identity, source IP, user agent, request parameters, and response elements. CloudTrail provides append-only log delivery to S3 buckets, and the logs can be forwarded to CloudWatch Logs for real-time alerting or to Amazon OpenSearch Service for analysis. AWS CloudTrail Lake provides a queryable store of CloudTrail events for up to 90 days (extendable by exporting to S3 and re-ingesting). The integration with AWS's broader security ecosystem — GuardDuty (threat detection), Security Hub (finding aggregation), and CloudWatch (alerting) — is the deepest of any cloud provider. For immutability, S3 Object Lock with CloudTrail log delivery provides write-once storage. Gap: CloudTrail logs are in AWS's proprietary JSON format, which requires transformation for non-AWS SIEM ingestion. The CloudTrail log format does not include HMAC signing; immutability is enforced at the storage layer rather than at the log entry level.



**Azure Key Vault.** Azure Key Vault logs are emitted as Azure Monitor diagnostic logs, capturing every key operation (encrypt, decrypt, wrap, unwrap, sign, verify) and every secret access. The logs include the caller's identity (Azure AD object ID, app registration ID, or managed identity), the operation name, the key or secret identifier, the HTTP status code, and the client IP. Activity Logs capture management operations (key creation, policy updates, access policy changes). Logs are routed to a Log Analytics workspace for querying with KQL, or exported to Event Hubs or Storage Accounts for downstream processing. Azure Monitor's alerting rules support threshold-based and metric-based detection on Key Vault operations. For immutability, Azure Blob Storage with immutable storage policies provides write-once retention. A notable advantage: Azure Key Vault's Managed HSM offering (dedicated HSM instances) provides a separate audit log stream with HSM-level operation detail, enabling correlation between application-level and hardware-level cryptographic operations. Gap: diagnostic log export latency can be several minutes, which is acceptable for compliance reporting but may be too slow for real-time intrusion detection.



**VGS (Very Good Security).** VGS provides a tokenization platform that intercepts and proxies API calls, replacing PII with tokens before data reaches the organization's systems. Its audit capabilities include transaction logs (every API request proxied through VGS, with operation type, data classification, route, and outcome), access logs (authentication events, API key usage, dashboard access), and compliance reports (PCI DSS SAQ support, SOC 2 evidence). VGS logs are accessible via the dashboard and API, and can be forwarded to external systems via webhooks or S3 export. The platform's unique advantage is that it sits in the API path — every PII interaction flows through VGS, so the audit trail captures a complete picture of PII access without requiring per-service instrumentation. Gap: VGS's audit logs do not include native HMAC signing or hash-chain immutability. SIEM integration is available but less mature than the hyperscale cloud providers — it requires custom webhook-to-SIEM pipelines.



**Skyflow.** Skyflow's data privacy vault provides tokenization and encryption with a governance layer that includes access logs, data lineage tracking, and audit reports. Access logs capture every read and write operation on sensitive data in the vault, including the caller's identity, the table/field accessed, the operation type, and the timestamp. Data lineage tracking maps the flow of sensitive data across systems — which upstream system inserted the data, which downstream systems accessed it — providing a compliance-friendly view of the data lifecycle. Skyflow's audit reports are designed for regulatory consumption: they map directly to GDPR Article 30 requirements and can be generated on-demand. Integration with external SIEM platforms is via log export. Gap: Skyflow is a newer platform (founded 2019) and its SIEM integration ecosystem is less mature than established players. Immutability features are not as robust — the platform relies on the customer's storage backend for write-once guarantees.



#### §13.5.2 Comparison Matrix and Gap Analysis

**Comparison matrix.** The following table summarizes vendor audit capabilities across six key dimensions:



| Dimension | HashiCorp Vault | Thales CipherTrust | Protegrity | Google Cloud DLP/KMS | AWS KMS/CloudTrail | Azure Key Vault | VGS | Skyflow |
|:----------|:-----------------|:-------------------|:-----------|:---------------------|:-------------------|:-----------------|:----|:--------|
| **Log format** | JSON (structured) | Proprietary structured | Proprietary structured | Cloud Audit Logs (JSON) | CloudTrail (JSON) | Azure Monitor JSON | JSON (API/dashboard) | JSON (API) |
| **HMAC / tamper-evidence** | ✅ Per-entry HMAC | ❌ None native | ❌ None native | ❌ None native | ❌ None native | ❌ None native | ❌ None native | ❌ None native |
| **Hash-chain integrity** | ❌ No chaining | ❌ No chaining | ❌ No chaining | ❌ No chaining | ❌ No chaining | ❌ No chaining | ❌ No chaining | ❌ No chaining |
| **SIEM integration** | ✅ Filebeat, syslog, Splunk/Elastic plugins | ✅ Syslog, REST API | ✅ Syslog, REST API | ✅ Cloud Logging export (Pub/Sub, BigQuery) | ✅ CloudWatch, OpenSearch, S3 export | ✅ Log Analytics, Event Hubs, Storage | ⚠️ Webhooks, S3 export (less mature) | ⚠️ Log export (less mature) |
| **Compliance reporting** | ❌ Custom (manual) | ✅ Pre-built PCI/GDPR/HIPAA/SOX | ✅ Governance dashboard | ✅ Cloud Audit Reports | ⚠️ CloudTrail + custom | ⚠️ Log Analytics + custom | ✅ PCI DSS SAQ support | ✅ GDPR Art. 30 reports |
| **Retention management** | Configurable (via log backend) | Configurable | Configurable | 400 days (Admin), 30–365 days (Data Access) | 90 days (CloudTrail Lake), S3-retained | 30–730 days (Log Analytics) | Configurable | Configurable |
| **Data lineage** | ❌ No native | ⚠️ Limited | ⚠️ Policy-based | ❌ No native | ❌ No native | ❌ No native | ⚠️ Route-based | ✅ Built-in lineage tracking |



**Gap analysis: what requires custom implementation.** The most striking finding from this comparison is that **no vendor provides native cryptographic immutability for audit logs**. HashiCorp Vault's per-entry HMAC is the closest — it provides tamper-evidence for individual entries but does not chain entries together, so bulk deletion or truncation of recent entries goes undetected. For organizations with regulatory requirements for tamper-evident audit logs (financial services under SOX, healthcare under HIPAA, payment processors under PCI DSS Requirement 10.5.2), the following capabilities must be implemented as a custom layer on top of vendor-provided logs:



1. **Hash-chain sealing**: A log processor (e.g., a Logstash pipeline, a Lambda function, or a dedicated microservice) sits between the vendor's audit output and the immutable storage tier. It appends a `previous_hash` to each ingested event, computes the chained hash, and writes the sealed event to the immutable store. This is a straightforward implementation (~200–500 lines of code) but must be highly reliable — a gap in the hash chain caused by a processor failure undermines the entire integrity guarantee.



2. **Merkle root publication**: A periodic job (every 1–10 minutes, depending on volume) computes the Merkle root of the sealed entries in the current time block, signs the root with an HSM-stored key, and publishes it to an external anchor (cloud KMS-signed attestation, transparency log, or time-stamping service).



3. **Cross-vendor audit normalization**: Organizations using multiple vendors (e.g., Vault for tokenization, AWS KMS for envelope encryption, Azure Key Vault for HSM-backed keys) need a unified audit schema that normalizes the divergent log formats into a consistent model. This normalization layer is a prerequisite for cross-vendor correlation and unified alerting. The schema defined in §1 serves as the target format.



4. **Automated verification**: A scheduled job that periodically samples entries from the immutable store, verifies hash-chain integrity, validates Merkle proofs against the externally anchored roots, and reports any discrepancies. This must be a separate process from the log ingestion pipeline — if the ingestion pipeline is compromised, the verification job provides an independent integrity check.



5. **Data lineage enrichment**: Most vendors log individual operations but do not track the *flow* of data across systems. A custom lineage layer — correlating tokenization events (source system → vault), detokenization events (vault → target system), and the application-layer trace IDs that connect them — provides the end-to-end data flow visibility that compliance reports and breach investigations require.



**Evaluating vendor audit capabilities during selection.** When evaluating a cryptographic or tokenization platform, the following checklist should be applied to the audit feature set:



- [ ] Are all cryptographic operations logged automatically (no opt-in per operation)?

- [ ] Does the log format include actor identity, timestamp (with timezone and millisecond precision), operation type, key identifier, data classification, source IP, and outcome?

- [ ] Is HMAC signing or hash-chain integrity applied to audit entries?

- [ ] Can logs be exported to the organization's SIEM platform via a supported integration (syslog, HTTP, API)?

- [ ] Are compliance reports available for the relevant regulations (PCI DSS, GDPR, HIPAA, SOX)?

- [ ] Is the retention period configurable, and does it support the organization's minimum retention requirement?

- [ ] Are access controls on audit logs separated from the operational access controls (read audit ≠ write audit)?

- [ ] Is the audit log format documented and stable (backward-compatible across versions)?

- [ ] Does the vendor provide an SLA for audit log availability and delivery latency?

- [ ] Can audit logs survive a vendor-side outage (are they replicated or exportable in near-real-time)?



Vendors that answer "yes" to fewer than six of these criteria will require significant custom development to meet enterprise audit requirements — a cost that should be factored into the build-vs-buy analysis (Chapter 12).

---

## 14. Key Management and Governance

This chapter matters only after a team has already decided that encryption, tokenization, or bounded decryptability is part of the chosen architecture. It is therefore **downstream of the design choice, not a substitute for it**. A cryptographic key is not a static artifact — it is a living resource with a defined lifespan, evolving through distinct phases from creation to destruction. NIST SP 800-57 Part 1 Rev. 5 defines the key lifecycle as a sequence of states: pre-activation (key generated but not yet authorized for use), active (key authorized for cryptographic operations), deactivation (key no longer authorized for new operations but still needed to verify or decrypt previously protected data), post-operational (key retained only for archival or dispute resolution), and destruction (key is no longer needed in any form). Managing this lifecycle correctly is essential both for security — a compromised key exposes every piece of PII it ever protected — and for compliance — GDPR's accountability principle requires demonstrable evidence that keys are managed according to best practices.

```mermaid
stateDiagram-v2
    [*] --> PreActivation : Key generated (CSPRNG)

    state PreActivation {
        [*] --> Generated
        Generated --> Authorized : Security team approves
    }

    PreActivation --> Active : Policy activation
    Active --> Active : Encrypt / Decrypt
    Active --> ScheduledRotation : Rotation policy triggers
    ScheduledRotation --> Active : New key version created
    Active --> Deprecated : New primary key activated

    state Deprecated {
        [*] --> DecryptOnly
        DecryptOnly : Decrypt still allowed
        DecryptOnly : Re-encryption in progress
    }

    Deprecated --> Retired : All data re-encrypted
    Retired --> Destroyed : Retention period expires
    Destroyed --> [*]

    note right of Active : KEK stored in KMS / HSM
    note right of Deprecated : Dual-key period (30-90 days)
    note right of Destroyed : Key material zeroized
```

---

### §14.1 Key Lifecycle

#### §14.1.1 Generation

**Generation.** Cryptographic keys must be generated using a Cryptographically Secure Pseudorandom Number Generator (CSPRNG) that meets the entropy requirements of FIPS 140-3 or an equivalent standard. On Linux systems, the kernel's `/dev/urandom` (backed by the ChaCha20 CSPRNG since kernel 4.8) provides sufficient entropy for most application-level keys, but key generation for HSM-stored root keys should use the HSM's own hardware entropy source, which typically combines a physical True Random Number Generator (TRNG) with environmental noise sources. Key length requirements depend on the algorithm and the protection duration: NIST SP 800-57 recommends a minimum of 128 bits of security strength for data protected until 2030 and 256 bits for data protected beyond 2030 (accounting for quantum computing advances). In practice, this translates to AES-256 for symmetric encryption (provides 256-bit security), RSA-3072 or RSA-4096 for asymmetric operations (provides 128-bit or 192-bit security respectively), and EC P-256 or P-384 for elliptic curve operations (provides 128-bit or 192-bit security). For PII protection specifically, AES-256-GCM is the de facto standard — it provides authenticated encryption (confidentiality + integrity) in a single operation, and the 256-bit key length provides a comfortable security margin against current and near-future threats.



#### §14.1.2 Distribution

**Distribution.** Once generated, keys must be securely distributed to the services that need them. The fundamental principle is that the key must never travel in cleartext over an untrusted channel. Three patterns address this: **key wrapping** (encrypting the key with a higher-level Key Encryption Key, or KEK), **key agreement protocols** (Diffie-Hellman, ECDH), and **out-of-band exchange** (physical transfer of key material for root keys, typically via split knowledge procedures where multiple key custodians each hold a key share that must be combined to reconstruct the full key). In cloud environments, key distribution is typically handled by the KMS itself — an application never receives the key material directly. Instead, the application sends plaintext data to the KMS for encryption, or the KMS generates a data encryption key (DEK), encrypts it with a KEK, and returns the plaintext DEK and the encrypted DEK to the application (envelope encryption). The application uses the plaintext DEK to encrypt PII locally, stores the encrypted DEK alongside the ciphertext, and discards the plaintext DEK from memory after use. This pattern means the KEK — the key that protects all DEKs — never leaves the KMS, and the application never sees it.

```mermaid
%%{init: {sequence: {actorMargin: 250}, themeVariables: {noteBkgColor: "transparent", noteBorderColor: "transparent"}}}%%
sequenceDiagram
    autonumber
    participant App as Application Service
    participant KMS as Cloud KMS / HSM
    participant DB as Database

    rect rgba(52, 152, 219, 0.14)
    Note over App,KMS: Envelope Encryption — Write Path
    App->>KMS: GenerateDataKey(keyId, keySpec: AES_256)
    KMS-->>App: plaintext_dek + encrypted_dek (wrapped by KEK)
    App->>App: Encrypt PII with plaintext_dek (AES-256-GCM)
    App->>App: Zeroize plaintext_dek from memory
    App->>DB: Store {ciphertext, encrypted_dek, key_id}
        Note right of DB: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end

    rect rgba(46, 204, 113, 0.14)
    Note over App,KMS: Envelope Encryption — Read Path
    App->>DB: Fetch {ciphertext, encrypted_dek, key_id}
    App->>KMS: Decrypt(encrypted_dek, key_id)
    KMS-->>App: plaintext_dek
    App->>App: Decrypt ciphertext with plaintext_dek
    App->>App: Zeroize plaintext_dek from memory
    App-->>App: Return plaintext PII to caller
        Note right of DB: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
```

#### §14.1.2.1 Walkthrough

<details><summary><strong>1. Application Service requests data encryption key from KMS</strong></summary>

When the application needs to encrypt a PII field (e.g., a social security number or health record), it does **not** ask the KMS to encrypt the data directly. Instead, it requests the KMS to generate a fresh Data Encryption Key (DEK) — a symmetric AES-256 key that will be used for a single encryption operation (or a small batch). The request specifies the KEK that should wrap the DEK, identified by its key alias or ARN. This two-level key hierarchy is the foundation of envelope encryption: the KEK never leaves the KMS, while the DEK is short-lived and confined to application memory.

```text
GenerateDataKey(keyId="alias/pii-encryption", keySpec="AES_256")
```

The KMS returns two copies of the same key: the plaintext DEK (for immediate local use) and the encrypted DEK (wrapped by the KEK, for persistent storage). This split design ensures that the KMS can later decrypt the stored DEK without ever having seen or stored the plaintext DEK itself.

</details>

<details><summary><strong>2. KMS generates and returns plaintext DEK and encrypted DEK</strong></summary>

The KMS generates a cryptographically random AES-256 key — the Data Encryption Key. It then encrypts (wraps) this DEK using the specified Key Encryption Key (KEK), which resides inside the KMS's hardware boundary. The response contains both the plaintext DEK and the encrypted (wrapped) DEK. The plaintext DEK is ephemeral: it exists only in the API response and in the application's memory for the duration of the encryption operation. The encrypted DEK is the persistent form — it will be stored alongside the ciphertext and can only be unwrapped by calling the KMS again.

```json
{
  "key_id": "alias/pii-encryption",
  "plaintext_dek": "base64(AES-256 key material — 32 bytes)",
  "encrypted_dek": "base64(KEK-wrapped DEK)"
}
```

The KMS also records an audit event for this operation, including the key ID, the requesting principal, and a unique request ID — enabling after-the-fact forensic analysis of key usage patterns.

</details>

<details><summary><strong>3. Application Service encrypts PII with plaintext DEK using AES-256-GCM</strong></summary>

The application uses the plaintext DEK to encrypt the PII field locally, without sending the plaintext data to the KMS. AES-256-GCM is the recommended mode because it provides both confidentiality (encryption) and integrity (authentication tag) in a single operation — unlike CBC mode, which requires a separate HMAC to achieve authenticated encryption. The application generates a random 12-byte initialization vector (IV) for each encryption operation, ensuring that identical plaintext values produce different ciphertexts. The IV is prepended to the ciphertext or stored alongside it, as it is needed for decryption but does not need to be kept secret.

```text
AES-256-GCM(key=plaintext_dek, iv=random_12_bytes, plaintext=pii_value)
→ ciphertext || tag || iv
```

This local encryption step is the core performance advantage of envelope encryption: the application encrypts data at line speed without routing every field through the KMS, while still delegating key management to the KMS.

</details>

<details><summary><strong>4. Application Service zeroizes plaintext DEK from memory</strong></summary>

After encrypting the PII field, the application **immediately** overwrites the plaintext DEK in memory with zeros or random bytes. This step is critical because the plaintext DEK is the only key material that exists outside the KMS's hardware boundary — if an attacker obtains a memory dump of the application process (via a debugger attach, `/proc/pid/mem` read, core dump, or cold-boot attack), the DEK can be used to decrypt all data encrypted with that key. Zeroizing must happen at the earliest possible moment: as soon as the encryption operation completes, before any subsequent processing, error handling, or I/O. In garbage-collected languages (Java, Go, C#), this requires explicit action — the DEK bytes must be written into a mutable array that is then zeroed in place, since the GC does not guarantee timely or secure memory reclamation. Some cloud SDKs provide a `ZeroableKey` utility that implements automatic zeroization on scope exit.

The zeroize step applies identically in both the write path (after encryption) and the read path (after decryption), minimizing the window during which the DEK is resident in application memory to milliseconds.

</details>

<details><summary><strong>5. Application Service stores ciphertext and encrypted DEK in database</strong></summary>

The application persists three components to the database: the AES-256-GCM ciphertext (the encrypted PII), the encrypted DEK (wrapped by the KEK), and the key identifier. The encrypted DEK is essentially a "token" that can only be redeemed by the KMS — it is useless without access to the KMS and the correct KEK. The key identifier links the encrypted DEK to a specific KEK version, which is essential for key rotation: when the KEK is rotated, new DEKs are wrapped under the new KEK version, while old encrypted DEKs reference the old version and continue to work until re-encrypted.

```json
{
  "ciphertext": "base64(aes-256-gcm(pii))",
  "encrypted_dek": "base64(wrapped_dek)",
  "key_id": "alias/pii-encryption",
  "key_version": "v3"
}
```

The plaintext PII value is never written to the database — only the ciphertext. This means that a database breach (SQL injection, backup exfiltration, insider access to the database) does not expose PII, because the attacker would also need access to the KMS to unwrap the DEK. This separation of encrypted data from the key that can decrypt it is the fundamental security property of envelope encryption.

</details>

<details><summary><strong>6. Application Service fetches encrypted data from database</strong></summary>

When the application needs to read the PII field (e.g., to display it to an authenticated user or process a business operation), it retrieves the stored record from the database. The database returns the ciphertext, the encrypted DEK, and the key identifier — none of which are sensitive on their own. The ciphertext is opaque binary data; the encrypted DEK can only be unwrapped by the KMS; and the key identifier is a public reference. This means the database read operation does not require any special access controls beyond standard row-level security — the encryption provides an additional layer of protection that is independent of database permissions.

</details>

<details><summary><strong>7. Application Service requests KMS to decrypt the encrypted DEK</strong></summary>

The application sends the encrypted DEK and the key identifier to the KMS, requesting that the KMS unwrap (decrypt) the DEK using the corresponding KEK. The KMS performs an access check: it verifies that the calling application's IAM principal has the `kms:Decrypt` permission for the specified key. If the application has been compromised and its IAM credentials revoked, this call will fail — preventing the attacker from obtaining plaintext DEKs even if they have access to the database. This is the key access control choke point of envelope encryption: all decryption operations must pass through the KMS, which enforces policy, logs audit events, and can be centrally revoked.

```text
Decrypt(keyId="alias/pii-encryption", ciphertext=encrypted_dek)
```

The KMS may also enforce additional constraints: the key must be in an `Enabled` state, the calling IP must be within an allowed range (VPC endpoint policy), and the request must satisfy any key policy conditions (e.g., encryption context matching). If any check fails, the KMS returns an access denied error and the application cannot decrypt the PII.

</details>

<details><summary><strong>8. KMS returns plaintext DEK to Application Service</strong></summary>

The KMS uses the KEK to decrypt (unwrap) the encrypted DEK inside its hardware boundary and returns the plaintext DEK to the application. The KEK material never leaves the KMS — only the unwrapped DEK is transmitted over the TLS-protected API channel. The KMS logs this decryption event, including the key ID, the requesting principal, the source IP, and a unique request ID. In environments with strict compliance requirements, the KMS can be configured to require dual authorization for decryption operations involving high-sensitivity keys, or to rate-limit decryption calls per key to detect anomalous bulk decryption attempts.

</details>

<details><summary><strong>9. Application Service decrypts ciphertext with plaintext DEK</strong></summary>

The application uses the plaintext DEK to decrypt the ciphertext locally, reversing the AES-256-GCM operation. The IV is extracted from the stored ciphertext (or from the companion field), and the GCM authentication tag is verified during decryption. If the tag verification fails — indicating that the ciphertext has been tampered with, corrupted, or encrypted with a different key — the decryption operation returns an error rather than corrupted plaintext. This integrity guarantee is a critical property of authenticated encryption modes: the application can trust that the decrypted value is exactly what was originally encrypted, without relying on a separate MAC or hash.

```text
AES-256-GCM-Decrypt(key=plaintext_dek, iv, ciphertext || tag)
→ plaintext pii_value
```

The decrypted PII value is now available in application memory for the duration of the business operation — displayed to the user, used in a calculation, or transmitted to a downstream service over a secure channel.

</details>

<details><summary><strong>10. Application Service zeroizes plaintext DEK from memory</strong></summary>

After decrypting the ciphertext and extracting the plaintext PII, the application immediately zeroizes the plaintext DEK from memory — the same operation performed in step 4 of the write path. The justification is identical: the DEK is the only key material that exists outside the KMS, and its exposure via a memory dump would compromise all data encrypted under that DEK. The zeroize step must happen immediately after decryption, before any business logic processing, error handling, or I/O that might delay it. Combined with the write-path zeroization, this ensures that the plaintext DEK resides in application memory for only a few milliseconds — from the KMS response to the encryption/decryption completion.

</details>

<details><summary><strong>11. Application Service returns plaintext PII to caller</strong></summary>

The decrypted PII value is returned to the calling component — typically a REST API handler that serializes the value into the HTTP response, or an internal service method that passes it to business logic. The plaintext PII must never be logged, cached in a shared cache (Redis, Memcached), or written to an unencrypted audit trail. The application should apply field-level access control to ensure that PII is only returned to authorized callers: a user viewing their own profile may see their SSN (masked or full, depending on the use case), while a customer service agent may see only the last four digits. After the response is sent, any remaining plaintext PII in application memory should be allowed to fall out of scope for garbage collection (or explicitly zeroized if the language supports it), completing the secure lifecycle of the PII value.

</details>

#### §14.1.3 Storage

**Storage.** Cryptographic keys must be stored in a manner that prevents unauthorized access, whether by external attackers, compromised applications, or insider threats. The storage tier hierarchy is: (1) **Hardware Security Modules (HSMs)** — dedicated hardware devices that perform cryptographic operations internally, ensuring the key material never exists in software-addressable memory; (2) **cloud KMS** — managed services backed by either FIPS 140-3 validated HSMs (AWS KMS, Azure Key Vault Managed HSM, Google Cloud HSM) or software-based key storage with optional HSM protection; (3) **software keystores** — encrypted key files protected by a password or master key (Java KeyStore, PKCS#12), suitable for development and low-sensitivity use cases but not for production PII protection; and (4) **plaintext configuration** — keys embedded in environment variables, application properties, or code — which is categorically unacceptable for any key used to protect PII in a production system. The storage decision is governed by the sensitivity of the data the key protects and any regulatory requirements: PCI DSS Level 1 mandates HSM-backed key storage for cardholder data encryption keys, while GDPR's risk-based approach does not prescribe a specific storage tier but requires that the storage be "appropriate to the risk" (Article 32(1)).



#### §14.1.4 Rotation

**Rotation.** Key rotation is the process of retiring an existing key and replacing it with a new one, while ensuring that data encrypted under the old key remains accessible. Rotation limits the window of exposure if a key is compromised: if a key is rotated annually, an undetected compromise exposes at most one year's worth of encrypted data (and only data encrypted since the previous rotation). NIST SP 800-57 provides general guidance on rotation periods but does not prescribe specific intervals, leaving the determination to the organization's risk assessment. Common industry practice: encryption keys used for PII protection are rotated annually, signing keys quarterly (because a compromised signing key enables forgery, not just decryption), and root keys or master keys every 3–5 years (because rotating root keys is operationally complex). Zero-downtime rotation requires maintaining multiple active key versions simultaneously: during the rotation window, new encryption operations use the new key, while decryption of data encrypted under the old key continues to work using the old (now deprecated but not yet destroyed) key. This "dual-key period" typically lasts 30–90 days, during which a re-encryption process migrates existing ciphertext from the old key to the new key. AWS KMS, Azure Key Vault, and Google Cloud KMS all support automatic key rotation with versioned keys — when automatic rotation is enabled, the KMS creates a new key version (the new primary), while previous versions remain available for decryption. The application does not need to be updated — it continues to request encryption using the same key ID, and the KMS transparently uses the latest version.



#### §14.1.5 Retirement and Destruction

**Retirement and destruction.** When a key is no longer needed for any purpose — all data encrypted under it has been re-encrypted, all signatures have been re-signed, and all legal retention obligations have expired — the key must be destroyed. Cryptographic destruction goes beyond deleting a file: the goal is to ensure that no copy of the key material persists in any form (disk, memory, backup, log, printout). For HSM-backed keys, destruction means zeroizing the key material within the HSM's secure boundary and revoking the key's certificate (if applicable). For cloud KMS keys, destruction involves scheduling key deletion (AWS and Azure enforce a mandatory waiting period of 7–30 days before permanent deletion, during which the key can be recovered; Google Cloud has a similar `destroy` → `destroyed` state transition). NIST SP 800-88 Rev. 1 (Guidelines for Media Sanitization) provides the framework for physical media destruction when keys are stored on removable media: Clear (overwriting), Purge (cryptographic erasure or degaussing), or Destroy (physical disintegration). In cloud environments, the cloud provider handles physical media destruction as part of their compliance certifications — the customer's responsibility is to ensure that key deletion is performed through the KMS API and that the deletion propagates to all replicas and backups.



#### §14.1.6 Key Hierarchy

**Key hierarchy.** Practical key management systems organize keys into a hierarchy that limits the blast radius of any single key compromise. The most common pattern in PII protection is envelope encryption with a two-tier hierarchy: a **Key Encryption Key (KEK)** — a long-lived, tightly controlled key stored in the KMS or HSM — encrypts many **Data Encryption Keys (DEKs)** — short-lived, per-context keys generated for individual encryption operations or data partitions. The KEK is the crown jewel: compromising it would allow decryption of all DEKs, and consequently all PII encrypted under those DEKs. The KEK must therefore be stored in the most secure tier available (HSM or HSM-backed KMS), with strict access controls limiting its use to the encryption and decryption of DEKs. In larger organizations, the hierarchy may extend further: a **Master Key (MK)** encrypts multiple KEKs, each KEK protects DEKs for a specific data domain (e.g., one KEK for payment data, another for healthcare data, another for HR data). This domain-level isolation ensures that a compromise of one KEK's access policy does not expose PII across all domains.

```mermaid
flowchart TD
    MK["**Master&nbsp;Key&nbsp;(MK)**
    FIPS&nbsp;140-3&nbsp;Level&nbsp;3&nbsp;HSM
    Rotated&nbsp;every&nbsp;3–5&nbsp;years"]

    KEK_P["**KEK&nbsp;—&nbsp;Payment&nbsp;Domain**
    HSM-backed&nbsp;KMS
    Annual&nbsp;rotation"]

    KEK_H["**KEK&nbsp;—&nbsp;Healthcare&nbsp;Domain**
    HSM-backed&nbsp;KMS
    Annual&nbsp;rotation"]

    KEK_HR["**KEK&nbsp;—&nbsp;HR&nbsp;Domain**
    HSM-backed&nbsp;KMS
    Annual&nbsp;rotation"]

    DEK1["DEK&nbsp;#1247
    AES-256-GCM
    Per-record"]
    DEK2["DEK&nbsp;#1248
    AES-256-GCM
    Per-record"]
    DEK3["DEK&nbsp;#891
    AES-256-GCM
    Per-batch"]
    DEK4["DEK&nbsp;#892
    AES-256-GCM
    Per-batch"]
    DEK5["DEK&nbsp;#501
    AES-256-GCM
    Per-session"]
    DEK6["DEK&nbsp;#502
    AES-256-GCM
    Per-session"]

    DATA1["Encrypted&nbsp;PII
    (card&nbsp;number)"]
    DATA2["Encrypted&nbsp;PII
    (card&nbsp;number)"]
    DATA3["Encrypted&nbsp;PII
    (diagnosis&nbsp;code)"]
    DATA4["Encrypted&nbsp;PII
    (diagnosis&nbsp;code)"]
    DATA5["Encrypted&nbsp;PII
    (SSN)"]
    DATA6["Encrypted&nbsp;PII
    (SSN)"]

    MK --> KEK_P
    MK --> KEK_H
    MK --> KEK_HR

    KEK_P --> DEK1
    KEK_P --> DEK2
    KEK_H --> DEK3
    KEK_H --> DEK4
    KEK_HR --> DEK5
    KEK_HR --> DEK6

    DEK1 --> DATA1
    DEK2 --> DATA2
    DEK3 --> DATA3
    DEK4 --> DATA4
    DEK5 --> DATA5
    DEK6 --> DATA6
```

#### §14.1.7 Key Metadata and Labeling

**Key metadata and labeling.** Every key in the system must carry metadata that enables operational management and forensic investigation. Required metadata fields include: a **purpose descriptor** (what the key is used for — e.g., `pii_email_encryption`, `pii_ssn_tokenization`), the **data classification** of the PII it protects, the **owning team** (responsible for access policy decisions), the **creation date**, the **expiry or rotation date**, the **algorithm and key length**, the **KMS or HSM from which the key was sourced**, and the **key's current lifecycle state** (active, deprecated, retired). Without this metadata, key management becomes an opaque, error-prone process — a security engineer responding to a key compromise cannot quickly determine which PII types are affected or which team owns the access policy. Cloud KMS services support key metadata through tags (AWS), labels (GCP), or tags and properties (Azure), and these should be enforced as mandatory fields through organizational policy.



#### §14.1.8 Automated Lifecycle Management

**Automated lifecycle management.** Manual key management does not scale. Organizations running hundreds of microservices with dozens of encryption keys must automate lifecycle operations to avoid the two most common failure modes: keys that are never rotated (accumulating risk over time) and keys that are rotated but the rotation breaks downstream services (because the old key version was destroyed before all ciphertext was re-encrypted). Cloud KMS services provide the foundation: AWS KMS automatic key rotation creates a new key version annually while preserving old versions for decryption; Azure Key Vault rotation policies trigger automated key rotation on a schedule and can integrate with Azure Event Grid for notification; Google Cloud KMS supports automatic rotation with configurable periods and provides `destroyScheduledTime` for managing the destruction of old versions. The automation layer above the KMS handles the application-level concerns: triggering re-encryption jobs after rotation, validating that all services can still decrypt after a rotation, alerting on keys approaching their rotation deadline, and enforcing metadata standards on newly created keys. Infrastructure-as-code tools (Terraform, Pulumi, CloudFormation) are the standard mechanism for defining and enforcing key lifecycle policies as code — the key configuration, rotation schedule, access policy, and metadata are defined in a version-controlled template, applied consistently across environments, and auditable through the same CI/CD pipeline used for application code.

---

### §14.2 Key Access Control

The principle that governs key access control in PII protection is a simple asymmetry: **many services need to encrypt, few services need to decrypt, and almost no services need to manage the keys themselves.** This asymmetry is not merely a convenience — it is a structural defense-in-depth measure that limits the impact of a compromised service account. If every service that encrypts PII can also decrypt it, then a vulnerability in any single service exposes all the PII that service has ever processed. By restricting decrypt access to a narrow set of authorized components, the blast radius of any compromise is contained to the data that flows through those specific components. This section defines the four-tier access control model, its implementation across major KMS platforms, and its relationship to GDPR's separation of duties requirements.



#### §14.2.1 The Four-Tier Permission Model

**The four-tier permission model.** Key operations in a PII protection system can be categorized into four tiers of privilege, each progressively narrower in scope:

```mermaid
flowchart LR
    subgraph T1 ["Tier 1 — Broadest"]
        direction TB
        E1["**Encrypt**"]
        E2["Application services"]
        E3["Payment, Profile, Notification"]
        E1 --- E2 --- E3
    end

    subgraph T2 ["Tier 2"]
        direction TB
        D1["**Decrypt**"]
        D2["Decryption service"]
        D3["Compliance tools, Migration pipeline"]
        D1 --- D2 --- D3
    end

    subgraph T3 ["Tier 3"]
        direction TB
        M1["**Manage**"]
        M2["Security engineering"]
        M3["Key rotation, policy, destruction"]
        M1 --- M2 --- M3
    end

    subgraph T4 ["Tier 4 — Narrowest"]
        direction TB
        A1["**Approve**"]
        A2["Compliance / Legal"]
        A3["Break-glass authorization, policy exceptions"]
        A1 --- A2 --- A3
    end

    T1 -->|narrower| T2
    T2 -->|narrower| T3
    T3 -->|narrower| T4
```



1. **Encrypt permission** — the ability to encrypt or tokenize PII using a given key or scope. This is the broadest permission, granted to application services that handle PII as part of their normal operation: the payment service encrypts credit card numbers, the user profile service encrypts SSNs, the notification service tokenizes phone numbers. Encrypt permission is inherently low-risk — a service that can encrypt but not decrypt cannot exfiltrate PII; it can only add more ciphertext to the system, which is effectively a write-only operation from a data protection perspective. The key consideration for encrypt permission is ensuring that the service encrypts the *correct* PII type with the *correct* key — misconfiguration (e.g., encrypting a password hash with the email encryption key) creates data integrity issues that are difficult to detect and correct.



2. **Decrypt permission** — the ability to reverse the encryption and recover plaintext PII. This is the most sensitive permission in the system, because a service with decrypt access can exfiltrate the PII it processes. Decrypt permission must be restricted to a minimal set of components, each with a documented and justified business need: the customer support interface (which needs to display masked PII for verification), the compliance investigation tool, the data migration pipeline, and the centralized decryption service (covered in §3). The default posture for decrypt access should be **deny-all** — any new decrypt grant must be explicitly requested, justified, approved, and time-bounded.



3. **Manage permission** — the ability to perform key lifecycle operations: rotation, retirement, destruction, policy changes, and access grant modifications. This permission is reserved for the security engineering team or the dedicated key management team — never for application development teams. The rationale is separation of duties: the team that builds the PII-handling service must not be the same team that controls access to the keys protecting that PII. Without this separation, a developer with both manage and decrypt permissions could modify the key policy to grant themselves decrypt access without any independent review. Manage permission is typically enforced through the KMS's own IAM system (e.g., AWS KMS key policy `kms:RotateKey`, Azure Key Vault RBAC role `Key Vault Crypto Officer`, Google Cloud KMS IAM role `roles/cloudkms.admin`).



4. **Approve permission** — the ability to authorize break-glass access, approve key policy exceptions, or sign off on sensitive key operations (e.g., emergency key destruction). This permission is reserved for compliance officers, legal counsel, or security leadership — individuals whose role includes oversight of data protection practices, not execution. Approve permission is typically implemented through a workflow or ticketing system (e.g., JIRA, ServiceNow) that integrates with the KMS access management system, rather than through direct KMS IAM roles. The approval step creates a documented audit trail of who approved what and why — a requirement under GDPR Article 30 and a critical input for Data Protection Impact Assessments (DPIAs).



#### §14.2.2 Separation of Duties as a GDPR Measure

**Separation of duties as a GDPR measure.** GDPR Article 32(1)(f) requires "a process for regularly testing, assessing and evaluating the effectiveness of technical and organisational measures for ensuring the security of the processing." Separation of duties is one of the fundamental organizational measures that satisfies this requirement. The EDPB Guidelines 01/2025 on pseudonymisation explicitly identify separation of duties as a technique that enhances the protection afforded by pseudonymisation: if the entity that pseudonymises the data is not the same entity that can re-identify it, the risk of unauthorized re-identification is reduced. In practice, this means: (a) the application development team writes code that encrypts PII, but does not have decrypt access to the encryption keys; (b) the security operations team manages key lifecycle and access policies, but does not develop the application; (c) the compliance team approves break-glass requests and reviews access logs, but cannot directly access the keys or the applications. This three-way separation ensures that no single individual or team can both protect and expose PII without involving at least one other team.



#### §14.2.3 Implementation Patterns Across KMS Platforms

**Implementation patterns across KMS platforms.** Each major cloud KMS provides mechanisms for enforcing the four-tier permission model, though the specific features and terminology differ:



- **AWS KMS** uses key policies — resource-based IAM policies attached directly to individual KMS keys. A key policy can grant `kms:Encrypt` and `kms:GenerateDataKey` to a broad set of IAM principals (application service roles) while restricting `kms:Decrypt` to a narrow set. AWS IAM supports conditions, so a decrypt grant can be further constrained: for example, only allow decryption when the request originates from a specific VPC endpoint, or only during a specific time window (for break-glass access). AWS KMS also supports grants — delegated permissions that can be retired programmatically, providing a mechanism for time-bounded access without modifying the key policy.



- **HashiCorp Vault** uses a policy language based on paths and capabilities. For the Transit secrets engine (Vault's cryptographic operations engine), a policy granting `encrypt` capability on `transit/keys/pii-encryption` allows the caller to encrypt data but not decrypt it. To decrypt, the caller needs `decrypt` capability on the same path. Vault's policy system is path-based and hierarchical — a policy granting `decrypt` on `transit/keys/pii-encryption` does not implicitly grant decrypt on `transit/keys/payment-encryption`. This path-level granularity enables per-domain isolation: the HR system's Vault policy can grant decrypt access to the employee data key but not the customer data key.



- **Azure Key Vault** supports two access control models: **access policies** (legacy, per-vault) and **Azure RBAC** (recommended, per-key). Under RBAC, the built-in roles provide the four-tier separation: `Key Vault Crypto User` can encrypt and decrypt, `Key Vault Crypto Officer` can manage keys, and custom roles can be defined to grant only `Microsoft.KeyVault/vaults/keys/encrypt/action` without `Microsoft.KeyVault/vaults/keys/decrypt/action`. Azure RBAC's condition support (currently in preview) allows further granularity, such as restricting decrypt access to requests from a specific managed identity or from within a specific virtual network.



- **Google Cloud KMS** uses IAM roles bound to KMS resources (key rings, keys, or individual key versions). The predefined role `roles/cloudkms.cryptoKeyEncrypter` grants `cloudkms.cryptoKeyVersions.useToEncrypt` but not `cloudkms.cryptoKeyVersions.useToDecrypt`. The role `roles/cloudkms.cryptoKeyEncrypterDecrypter` grants both. The role `roles/cloudkms.admin` grants full management access. For fine-grained control, organizations create custom IAM roles that include only the specific permissions needed — for example, a custom role with `cloudkms.cryptoKeyVersions.useToEncrypt` and `cloudkms.cryptoKeys.get` but without decrypt or management permissions.



#### §14.2.4 Service Identity Over Static Credentials

**Service identity over static credentials.** The principals that hold key access permissions should be service identities — not static API keys, shared secrets, or user credentials embedded in application code. Each major cloud platform provides a native service identity mechanism: AWS IAM roles (assumed via IAM instance profiles or the ECS/EKS pod identity feature), Azure managed identities (system-assigned or user-assigned, attached to VMs, App Service, or AKS pods), and Google Cloud workload identity (mapping Kubernetes service accounts to GCP IAM service accounts). Service identities provide three advantages over static credentials: (a) they are **ephemeral and auto-rotated** — the identity exists only as long as the compute resource exists, eliminating the risk of stale credentials; (b) they are **auditable** — the identity is linked to a specific compute resource (instance ID, pod name), providing traceability; and (c) they are **scoped** — IAM policies can restrict which resources the identity can access and from which network locations.



#### §14.2.5 Key Access Review

**Key access review.** Permission to use encryption keys, especially decrypt permission, must not be granted permanently and forgotten. Organizations should implement a **periodic access certification** process — typically quarterly — in which key access grants are reviewed by the key owner (the security team) and the data owner (the business team responsible for the PII domain). The review answers three questions: (a) does the service still need this access? (b) is the access level appropriate? (c) has the access been used? Grants that are unused for 90+ days should be flagged for revocation. Automated stale-access detection tools — available in AWS IAM Access Analyzer, Azure Permissions Management, and Google Cloud IAM Recommender — can identify over-permissioned service accounts and unused access grants. The access certification results should be documented and retained as part of the organization's GDPR Article 30 records of processing activities.

---

### §14.3 Centralized Decryption Authority

The most impactful architectural decision in a PII protection system is not which encryption algorithm to use or which KMS provider to select — it is **where decryption happens**. In a distributed microservice architecture, the temptation is to let every service that needs PII decrypt it locally: the order service decrypts the customer's shipping address, the billing service decrypts the credit card, the notification service decrypts the phone number. This pattern maximizes convenience and minimizes latency, but it maximizes the attack surface: every service that can decrypt PII is a potential point of data exfiltration. Centralized decryption authority inverts this model: **only one designated component** — a hardened, tightly controlled decryption service — is authorized to reverse the encryption and expose plaintext PII. Every other service that needs PII must request it from this central authority, which logs the request, enforces policy, and returns only the data the requester is authorized to see.

```mermaid
flowchart TD
    subgraph app ["Application Layer — Encrypt Only"]
        direction LR
        S1["User&nbsp;Profile&nbsp;Service"]
        S2["Payment&nbsp;Service"]
        S3["Notification&nbsp;Service"]
    end

    subgraph decrypt ["Decryption Authority — Hardened Zone"]
        DS["Decryption&nbsp;Service"]
        AUDIT["Audit&nbsp;Log&nbsp;(append-only)"]
        DS --- AUDIT
    end

    subgraph infra ["Key Management Infrastructure"]
        KMS["Cloud&nbsp;KMS&nbsp;/&nbsp;HSM"]
    end

    subgraph data ["Data Layer"]
        DB["Database"]
    end

    S1 -->|encrypt PII| KMS
    S2 -->|encrypt PII| KMS
    S3 -->|encrypt PII| KMS
    S1 -->|store ciphertext| DB
    S2 -->|store ciphertext| DB
    S3 -->|store ciphertext| DB

    S1 -.->|request decrypt| DS
    S2 -.->|request decrypt| DS
    S3 -.->|request decrypt| DS
    DS -->|unwrap DEK| KMS
    DS -->|return plaintext + audit ID| S1

```



#### §14.3.1 Architectural Pattern

**The architectural pattern.** In a centralized decryption model, the system is divided into two classes of components: **encrypters** and **decrypters**. Encrypters are the application services that handle PII as part of their domain logic — the registration flow collects the user's SSN and encrypts it, the payment flow collects the credit card and encrypts it. These services are stateless, horizontally scalable, and deployed across multiple availability zones. They call the KMS directly to encrypt PII (or use a client-side DEK) and store the resulting ciphertext in their database. Decrypters are the designated components authorized to call the KMS with a decrypt operation. In the simplest case, there is one decrypter — the Decryption Service — deployed in a hardened security zone with restricted network access, dedicated monitoring, and no direct exposure to the public internet. The security properties of this architecture are straightforward: the number of services that can expose plaintext PII is reduced from N (all PII-handling services) to 1 (the decryption service), reducing the attack surface by a factor of N and concentrating audit and monitoring on a single chokepoint.



#### §14.3.2 Decryption as a Privileged, Logged Operation

**Decryption as a privileged, logged operation.** Every call to the decryption service is an event that must be captured, analyzed, and retained. The decryption service enforces this by design: it cannot perform a decryption without creating an audit entry. The audit entry captures the full context defined in §11: who requested the decryption (caller identity and executor service), what PII was decrypted (data classification and record identifier), when the request was made, where it originated (source IP, network zone), and why it was requested (a mandatory justification or purpose code provided by the caller). The audit entry is written to a tamper-evident log store (append-only, integrity-verified) before the plaintext is returned to the caller — if the audit write fails, the decryption is aborted. This ensures that there are no "silent" decryption operations: every instance of PII being exposed from its encrypted state leaves an immutable record.



#### §14.3.3 API Design for the Decryption Endpoint

**API design for the decryption endpoint.** The decryption service exposes a dedicated API — not a general-purpose proxy to the KMS, but a purpose-built endpoint that enforces the organization's data access policies. A typical request includes: (a) the **ciphertext or token** to be decrypted; (b) an **authentication token** (OAuth 2.0 bearer token, mTLS certificate, or IAM role assertion); (c) a **justification** — a structured field indicating the business reason for the decryption (e.g., `customer_support_verification`, `compliance_investigation`, `data_migration`, `break_glass_incident_ID`); and (d) an optional **scope constraint** limiting which PII fields the caller is authorized to receive (e.g., a customer support agent may be authorized to see the customer's name and email but not their SSN). The response includes: (a) the **plaintext PII** (if authorized); (b) an **audit event ID** that the caller can use to trace the operation in the audit log; and (c) a **TTL** indicating how long the caller may retain the plaintext in memory (typically seconds — the caller should discard it immediately after use).



```
POST /api/v1/decrypt
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
X-Correlation-ID: 7f3a1b2c-4d5e-6f7a



{
  "ciphertext": "ct_AE8F3B...truncated",
  "key_id": "pii-ssn-production-v3",
  "data_classification": "social_security_number",
  "purpose": "customer_support_verification",
  "case_id": "CS-2026-04-08-12345",
  "requested_fields": ["ssn_masked_last4"]
}

```



The response returns only the masked last 4 digits because the caller requested `ssn_masked_last4` rather than the full SSN — the decryption service enforces field-level granularity to enforce the principle of data minimization.



#### §14.3.4 Microservice Implications

**Microservice implications.** Centralized decryption fundamentally changes the service topology. Services that encrypt can be designed as stateless, distributed components with no special security requirements beyond standard TLS termination and authentication. Services that decrypt — the decryption service itself — must be designed with the rigor of a security-critical system: deployed in a dedicated network segment with firewall rules restricting ingress to known application CIDRs, using private link endpoints (AWS VPC endpoints, Azure Private Link, GCP Private Service Connect) so that KMS traffic never traverses the public internet, running on hardened VMs or containers with runtime security monitoring, and scaling vertically (stronger compute) rather than horizontally (more instances) to minimize the number of nodes that hold the decrypt capability. The decryption service should be the only component in the architecture that has `kms:Decrypt` or equivalent permission — application services have only `kms:Encrypt` and `kms:GenerateDataKey`.



#### §14.3.5 Latency Considerations

**Latency considerations.** The primary objection to centralized decryption is the additional network hop: instead of a service calling the KMS directly (one hop), it calls the decryption service which calls the KMS (two hops). In practice, the latency overhead depends on the deployment topology. Within a single availability zone, an additional service-to-service hop over a service mesh (Istio, Linkerd) or internal load balancer adds approximately 1–3 ms. Cross-availability-zone calls add 1–5 ms. Cross-region calls add 10–50 ms depending on the distance between regions. For most PII access patterns — customer support looking up a single record, compliance investigating a specific case — this latency is acceptable: the operation is not latency-critical and the security benefit outweighs the performance cost. For high-throughput operations (batch data migration, reporting), the decryption service should support **batch decryption** — accepting a list of ciphertexts and returning a list of plaintexts in a single API call, amortizing the fixed latency overhead across multiple records. Caching decrypted values is possible but must be approached with extreme caution: any cache that holds plaintext PII is itself a target for exfiltration, and cache invalidation is notoriously difficult to get right. If caching is used, it should be: (a) in-memory only (no disk persistence), (b) scoped to a single request or session (not shared across users), (c) bounded by a strict TTL (seconds, not minutes), and (d) the cache key must be the ciphertext (not the PII value), so that a cache hit does not leak which PII values are being accessed.



#### §14.3.6 Centralized vs. Distributed Models

**Centralized vs. distributed decryption models.** The choice between centralized and distributed decryption is a trade-off between security and performance, governed by the organization's risk tolerance and regulatory requirements:



| Factor | Centralized Decryption | Distributed Decryption |
|:-------|:----------------------|:-----------------------|
| Attack surface | Minimal (1 decrypt-capable service) | Large (every PII-handling service) |
| Audit completeness | Full (all decrypts flow through one point) | Partial (depends on per-service logging) |
| Latency | Higher (extra network hop) | Lower (direct KMS access) |
| Availability risk | Single point of failure (mitigated by HA) | Higher availability by design |
| Policy enforcement | Centralized and consistent | Per-service, harder to audit |
| Regulatory alignment | Strong (demonstrable access control) | Weaker (relies on per-service discipline) |



For GDPR-regulated PII, the centralized model is strongly recommended: it provides the demonstrable, auditable access control that regulators expect, and the latency overhead is acceptable for the vast majority of PII access patterns. The distributed model may be appropriate for low-sensitivity PII (email addresses used for notification delivery, postal codes used for geographic filtering) where the performance benefit outweighs the marginal security reduction — but even in this case, the decrypt permissions should be scoped and audited.



#### §14.3.7 Use Cases

**Use cases.** Centralized decryption serves three primary use cases. First, **customer support operations**: a support agent needs to verify a customer's identity by confirming partial PII (last 4 digits of SSN, date of birth). The agent's interface calls the decryption service, which returns only the masked fields the agent is authorized to see — not the full PII. Second, **compliance and legal investigations**: a DPA inquiry or litigation hold requires access to specific customer data. The compliance team submits a request through the break-glass workflow (§4), which grants time-bounded access to the decryption service for the specific data subjects under investigation. Third, **data migration**: migrating PII between systems or regions requires decrypting from the source key and re-encrypting with the destination key. The migration pipeline calls the decryption service, which logs every record migrated and can enforce rate limits and data-type restrictions to prevent scope creep.

---

### §14.4 Break-Glass Procedures

No access control system is complete without a mechanism for legitimate emergency access. There are scenarios in which normal access controls must be overridden to protect the organization: a security incident that requires examining encrypted customer data, a regulatory investigation that demands access to specific records, or a production debugging situation where plaintext PII is needed to diagnose a critical issue. Break-glass procedures provide a controlled, audited, and temporary mechanism for this emergency access — ensuring that the organization can respond to crises without permanently weakening its access control posture. The term "break-glass" comes from the metaphor of shattering a glass panel to access a fire alarm: the action is visible, irreversible, and triggers an immediate response. In key management, break-glass means temporarily elevating a user's or service's permissions to decrypt PII, with every step of the process documented and every operation subject to enhanced monitoring.



#### §14.4.1 When Break-Glass is Needed

**When break-glass is needed.** Three categories of events typically trigger break-glass access to decryption capabilities:



- **Incident response.** A suspected or confirmed data breach requires the incident response team to examine encrypted customer data to determine the scope of exposure. The team needs to decrypt PII to identify affected data subjects, assess the sensitivity of the compromised data, and validate containment measures. Time is critical — the team needs access within minutes, not hours — but the access must be scoped to the specific data subjects and data types relevant to the incident.



- **Regulatory inquiry.** A Data Protection Authority (DPA) investigation, an e-discovery request in litigation, or a government subpoena may require the organization to produce specific customer data in plaintext. The legal or compliance team needs decryption access to extract the requested records, but the access must be limited to the records specified in the legal demand and must be documented as part of the organization's regulatory response.



- **Emergency operational access.** A production issue — a failed payment transaction, a corrupted data record, a misrouted notification — may require a DevOps or SRE engineer to examine plaintext PII to diagnose the root cause. This is the most common but also the most risky break-glass scenario, because operational break-glass requests are frequent enough to normalize elevated access, leading to "break-glass fatigue" where the procedure is followed loosely or bypassed entirely. Organizations should invest in diagnostic tools that operate on encrypted or tokenized data (e.g., matching on tokens instead of plaintext, logging ciphertext with metadata annotations) to reduce the need for operational break-glass access.



#### §14.4.2 The Break-Glass Approval Workflow

**The break-glass approval workflow.** A well-designed break-glass procedure balances urgency with accountability through a structured workflow with five stages:

```mermaid
flowchart TD
    START(["Incident Detected / Access Needed"]) --> REQ["1. Request
    Submit via ticketing system
    Justification + Scope + Duration"]
    REQ --> APP{"2. Dual Approval"}
    APP -->|Security Team ✅| APP2{"Compliance Team ✅?"}
    APP -->|Rejected ❌| DENIED["Denied — log in register"]
    APP2 -->|Approved ✅| GRANT["3. Grant
    Time-bounded elevated access
    Scoped to specific keys + data types"]
    APP2 -->|Rejected ❌| DENIED
    GRANT --> EXEC["4. Execute
    Enhanced monitoring + incident tagging
    Real-time SOC alerts"]
    EXEC --> REVOKE{"Time window expires?"}
    REVOKE -->|Yes| AUTO["Auto-revoke via KMS / PAM"]
    REVOKE -->|No| EXEC
    AUTO --> REVIEW["5. Post-Incident Review (within 48h)
    Audit all operations + scope compliance"]
    REVIEW --> REGISTER["Update Break-Glass Register"]

```



1. **Request.** The requester submits a formal break-glass request through a ticketing system or dedicated workflow tool (JIRA, ServiceNow, PagerDuty, or a custom application). The request must include: the **justification** (why normal access is insufficient), the **scope** (which data subjects, data types, and key identifiers), the **duration** (how long elevated access is needed), the **requester's identity**, and the **approving authority** (the security team lead or compliance officer designated for the relevant data domain). The request template should enforce minimum information quality — a request that simply says "need access for debugging" without specifying scope or duration should be rejected.



2. **Approval.** Break-glass access requires **dual approval**: sign-off from both the security team (confirming that the request is legitimate and the scope is appropriate) and the compliance team (confirming that the request is consistent with GDPR obligations, particularly the principle of data minimization under Article 5(1)(c)). For critical data domains (health records, financial data), a third approval from the data owner (the business unit responsible for the PII) may be required. The approval must be time-stamped and linked to the original request, creating an auditable chain of authorization.



3. **Grant.** Upon approval, the access management system — typically the KMS or a PAM (Privileged Access Management) solution — grants the requester time-bounded elevated access. The access grant must be scoped precisely: (a) to the specific key identifiers and data classifications listed in the approved scope; (b) to the specific decrypt operations needed (no key management or policy modification permissions); (c) to the specific network zone or endpoint from which access will be performed; and (d) to a defined time window (e.g., 4 hours for incident response, 24 hours for regulatory inquiry). The time window is the most critical constraint — it ensures that elevated access cannot persist indefinitely due to a forgotten revocation step.



4. **Execute.** The requester performs the necessary decryption operations under enhanced monitoring. During the break-glass window, the decryption service (§3) applies additional controls: every decrypt operation is tagged with the break-glass incident ID, real-time alerts are sent to the security operations center (SOC) for every operation, rate limits are relaxed to allow bulk operations but rate-limiting anomalies are still monitored, and the decryption service may require step-up authentication (re-authentication with a second factor) for each decrypt call to ensure the session has not been hijacked.



5. **Review.** Within 48 hours of the break-glass window closing, a post-incident review must be conducted. The review examines: (a) every decrypt operation performed during the window — what was decrypted, by whom, and was it within the approved scope?; (b) whether the scope of the request was appropriate or whether it was over-broad; (c) whether the time window was sufficient or excessive; (d) whether any operations fell outside the approved scope (indicating potential misuse); and (e) whether the break-glass was genuinely necessary or whether better diagnostic tools could have avoided it. The review findings are documented in the break-glass register and shared with the compliance team.



#### §14.4.3 Enhanced Logging During Break-Glass

**Enhanced logging during break-glass.** The decryption service's standard audit logging (Chapter 13) is augmented during a break-glass window with three additional measures: (a) **incident tagging** — every audit event includes the break-glass incident ID, linking the operation to the approved request; (b) **real-time alerting** — every decrypt operation triggers an immediate alert to the SOC, enabling live monitoring of the break-glass session; (c) **full payload logging** — while normal operations log only the token or ciphertext reference, break-glass operations may log the actual PII field names and values that were decrypted, providing a complete record for the post-incident review. This full payload logging must itself be subject to strict access controls and retention policies — it is sensitive data that must be encrypted at rest and deleted after the review period.



#### §14.4.4 Automatic Revocation

**Automatic revocation.** The time-bounded access grant must be enforced by the infrastructure, not by manual process. When the approved time window expires, the KMS or PAM system must automatically revoke the elevated permissions — without requiring any human action. This eliminates the risk of "forgot to revoke" and ensures that break-glass access cannot persist beyond its approved duration. If the requester needs additional time, they must submit a new request and obtain new approvals. Most cloud KMS services support time-bounded grants through IAM conditions (`aws:CurrentTime` in AWS, `expirationTime` in Azure RBAC conditions) or through PAM features (HashiCorp Vault's lease system with TTL-based automatic revocation, CyberArk's session management with hard timeout enforcement).



#### §14.4.5 Break-Glass Register

**Break-glass register.** Every break-glass activation — whether approved, denied, or cancelled — must be recorded in a **break-glass register**, a dedicated log or database table that serves as the organization's authoritative record of emergency access events. The register entry includes: the incident ID, the requester, the approvers, the scope (data subjects, data types, keys), the time window (approved start, approved end, actual start, actual end), the number of decrypt operations performed, and the post-incident review findings. The register is a critical artifact for regulatory audits: when a DPA asks "how do you control emergency access to encrypted personal data?" the break-glass register provides the evidence. The register should be reviewed quarterly by the compliance team to identify patterns — frequent break-glass activations for the same team or the same data domain may indicate a systemic issue (e.g., insufficient diagnostic tools, over-restrictive normal access policies) that should be addressed through engineering investment rather than repeated emergency access.



#### §14.4.6 Sample Break-Glass Policy Template

**Sample break-glass policy template.** The following policy template codifies the break-glass procedure for an organization handling GDPR-regulated PII:



> **Break-Glass Access Policy — Decryption Services**

>

> 1. **Eligibility.** Only designated incident responders (Security Team), compliance officers, and authorized DevOps engineers (on-call rotation) may submit break-glass requests.

> 2. **Approval Authority.** Dual approval required: Security Team Lead + Compliance Officer. For health or financial data domains, Data Owner approval also required.

> 3. **Scope.** Requests must specify: data subject identifiers (or query criteria), PII data types, key identifiers, and the specific decrypt operations needed. Over-broad requests ("all customer data") will be rejected.

> 4. **Duration.** Maximum 4 hours for incident response, 24 hours for regulatory inquiry, 2 hours for operational debugging. Extensions require a new request.

> 5. **Monitoring.** All decrypt operations during the break-glass window are tagged with the incident ID and trigger real-time SOC alerts.

> 6. **Review.** Post-incident review within 48 hours of window closure. Review findings documented in the break-glass register.

> 7. **Revocation.** Automatic at window expiry. No exceptions. Late revocation constitutes a security incident.

> 8. **Quarterly Audit.** Compliance team reviews break-glass register quarterly. Trends reported to the Data Protection Officer.

---

### §14.5 HSM vs. Software Key Management

The decision of where cryptographic key material physically resides — inside a tamper-resistant hardware device, or in software-protected storage — is one of the most consequential architectural choices in a PII protection system. It determines the threat model the system can defend against, the performance characteristics of cryptographic operations, the cost structure, and the operational complexity. There is no universal answer — the right choice depends on the sensitivity of the PII being protected, the regulatory requirements that apply, the organization's threat model, and its budget. This section provides a comparative analysis of HSM-backed and software-based key management to inform that decision.



#### §14.5.1 Hardware Security Modules

**Hardware Security Modules (HSMs).** An HSM is a dedicated, tamper-resistant computing device designed specifically for cryptographic key management and cryptographic operations. The defining security property of an HSM is that **key material never exists in plaintext outside the HSM's physical boundary** — the key is generated inside the HSM, used inside the HSM, and (if the HSM supports it) can be backed up in encrypted form, but the plaintext key can never be extracted. This property is enforced by the HSM's hardware and firmware, not by software access controls, which means it resists even an attacker who gains full administrative access to the host system.



#### §14.5.2 FIPS 140-3 Certification

**FIPS 140-3 certification.** HSMs used in production environments for PII protection should be validated against FIPS 140-3 (the current revision of the Federal Information Processing Standard for cryptographic modules), which defines four levels of security:



- **Level 1** — basic security requirements: production-grade components, role-based authentication. No physical security mechanisms. Suitable only for low-risk environments.

- **Level 2** — tamper-evident physical features: tamper-evident coatings or seals, role-based authentication with identity-based policy. Provides evidence of physical tampering but does not prevent it.

- **Level 3** — tamper-resistant physical features: tamper detection and response (the module zeroizes key material if physical tampering is detected), identity-based authentication, environmental failure protection. This is the minimum level recommended for PII protection keys in regulated environments.

- **Level 4** — tamper-active physical features: the module is designed to be physically secure even against a sophisticated physical attacker (e.g., an attacker with access to semiconductor test equipment). Environmental failure protection encompasses a wider range of conditions (voltage, temperature). Required for the most sensitive applications (national security, root CA operations).

```mermaid
flowchart TD
    subgraph L1 ["Level 1 — Basic"]
        L1T["Production-grade components"]
        L1A["Role-based authentication"]
        L1U["No physical security"]
        L1T --- L1A --- L1U
    end

    subgraph L2 ["Level 2 — Tamper-Evident"]
        L2T["All Level 1 features +"]
        L2A["Tamper-evident coatings / seals"]
        L2U["Identity-based policy"]
        L2T --- L2A --- L2U
    end

    subgraph L3 ["Level 3 — Tamper-Resistant"]
        L3T["All Level 2 features +"]
        L3A["Tamper detection + zeroization"]
        L3U["Environmental failure protection"]
        L3V["**Minimum for PII protection**"]
        L3T --- L3A --- L3U --- L3V
    end

    subgraph L4 ["Level 4 — Tamper-Active"]
        L4T["All Level 3 features +"]
        L4A["Physical security vs. sophisticated attacker"]
        L4U["Extended environmental protection"]
        L4V["National security, root CA operations"]
        L4T --- L4A --- L4U --- L4V
    end

    L1 --> L2 --> L3 --> L4
```

Cloud HSM services typically use HSMs validated at FIPS 140-3 Level 3: AWS CloudHSM (based on Cavium Nitrox HSMs), Azure Dedicated HSM (based on Thales Luna Network HSM 7), and Google Cloud HSM (also based on Thales Luna HSMs). The shared KMS services (AWS KMS, Azure Key Vault, Google Cloud KMS) use FIPS 140-3 Level 3 validated HSMs as their backing hardware, but the customer does not get exclusive access to the HSM — the KMS multiplexes across many customers' keys on shared hardware. For organizations that require exclusive HSM access (e.g., PCI DSS requirements, regulatory mandates for dedicated hardware), the dedicated HSM services provide a single-tenant HSM instance provisioned for the customer's exclusive use.



#### §14.5.3 HSM Security Guarantees

**HSM security guarantees.** Beyond the fundamental property of key material confinement, HSMs provide several additional security guarantees: (a) **tamper evidence and response** — the HSM detects physical tampering attempts (case opening, temperature extremes, voltage manipulation) and responds by zeroizing all key material, rendering the keys permanently unrecoverable; (b) **secure key backup** — key material can be backed up in an encrypted form (wrapped with a key split among multiple key custodians) without ever exposing the plaintext key; (c) **cryptographic operation authorization** — the HSM can enforce per-key authorization policies (e.g., this key can only be used for AES-GCM encryption, not for signing), preventing key misuse even if the calling application is compromised; (d) **audit logging** — the HSM maintains an internal, tamper-evident log of all cryptographic operations performed, providing a hardware-rooted audit trail.



#### §14.5.4 HSM Performance and Cost

**HSM performance and cost.** HSM performance varies by model and operation type. For symmetric operations (AES-GCM encryption/decryption), modern HSMs typically achieve 10,000–100,000 operations per second. For asymmetric operations (RSA signing, ECDSA), throughput is lower — typically 1,000–10,000 operations per second. Cloud KMS services built on shared HSMs abstract these limits and provide auto-scaling, but customers using dedicated HSMs must account for throughput limits in their capacity planning. Cost is the primary barrier to HSM adoption: dedicated cloud HSMs range from $1–3 per hour (approximately $8,000–26,000 per year per HSM instance), with additional costs for network connectivity, high availability (minimum 2 instances for production), and key backup infrastructure. On-premises HSMs from vendors like Thales, Utimaco, and Futurex range from $10,000 to $100,000+ for the hardware, plus annual maintenance contracts. For organizations with hundreds of encryption keys and moderate throughput requirements, cloud KMS with shared HSM backing provides the security benefits of HSM protection at a fraction of the cost of dedicated hardware.



#### §14.5.5 Software-Based Key Management

**Software-based key management.** In a software-based model, cryptographic keys are stored encrypted at rest (using a master key or passphrase) and decrypted into application memory when needed for cryptographic operations. The key material exists as bytes in the application's address space during the operation, and the application performs the cryptographic operation using a software cryptographic library (OpenSSL, BoringSSL, libsodium, Java Cryptography Architecture). The security of software-based key management depends entirely on the security of the host system: if an attacker can read the application's memory (via a memory dump, a debugging interface, or a supply chain attack that injects malicious code), they can extract the key material.



**Software key management risks.** The principal risks of software-based key management are: (a) **memory extraction** — keys decrypted into application memory can be captured via core dumps, debugging tools (gdb, strace), or memory-scanning malware; (b) **supply chain attacks** — a compromised dependency (e.g., a malicious version of a cryptographic library) can exfiltrate keys from memory during use; (c) **insider threats** — a developer or system administrator with access to the host can extract keys from configuration files or memory; (d) **improper key disposal** — keys that remain in memory after use (due to language runtime garbage collection behavior, particularly in Java and Go) can be recovered from memory forensics. Mitigations exist — memory locking (`mlock`), secure string wiping (libsodium's `sodium_memzero`), hardware-based trusted execution environments (Intel SGX, AMD SEV) — but these mitigations are defense-in-depth measures, not fundamental protections, and each has its own limitations and bypass techniques.



**Software key management advantages.** Despite the security limitations, software-based key management has compelling advantages for certain use cases: (a) **performance** — software cryptographic operations are significantly faster than HSM-backed operations, typically 100,000–1,000,000+ AES-GCM operations per second on modern server hardware, with no network latency for local operations; (b) **cost** — software-based key management requires no specialized hardware, adding only compute and storage costs that are typically negligible; (c) **latency** — for local operations, there is no network round-trip to an HSM or KMS, reducing per-operation latency from 1–10 ms (network-bound) to <0.1 ms (memory-bound); (d) **simplicity** — software key management requires no specialized infrastructure or procurement process, making it accessible to small teams and development environments.



#### §14.5.6 Decision Matrix

**Decision matrix.** The choice between HSM-backed and software-based key management should be driven by a risk-based assessment, not by convenience or cost alone. The following matrix provides guidance:



| Factor | HSM-Backed | Software-Based |
|:-------|:-----------|:---------------|
| Key material protection | Keys never leave hardware boundary | Keys exist in application memory |
| Threat resilience | Resists OS-level, memory-level, and physical attacks | Vulnerable to memory extraction, supply chain, insider |
| Regulatory alignment | Meets PCI DSS, eIDAS, and other HSM-mandated requirements | May not satisfy regulatory requirements for key storage |
| Performance (AES-GCM) | ~10K–100K ops/sec | ~100K–1M+ ops/sec |
| Latency per operation | 1–10 ms (network round-trip) | <0.1 ms (in-process) |
| Cost | $8K–100K+ per year (dedicated) or $0.03–0.06 per 10K ops (shared KMS) | Compute cost only |
| Operational complexity | Requires HSM provisioning, HA setup, key ceremony procedures | Minimal — standard deployment |
| Recommended for | Root keys, KEKs, PCI-regulated encryption keys, compliance-critical PII | DEKs (wrapped by HSM-backed KEK), dev/test, low-sensitivity PII |



#### §14.5.7 The Hybrid Model

**The hybrid model: envelope encryption with HSM-backed KEK.** The most common production architecture for PII protection uses a hybrid approach that combines the security of HSM-backed key storage with the performance of software-based encryption. The **Key Encryption Key (KEK)** is stored in an HSM or HSM-backed KMS — it never leaves the hardware boundary. **Data Encryption Keys (DEKs)** are generated per-context (per-record, per-batch, or per-session), encrypted by the KEK, and stored alongside the ciphertext. The application decrypts the DEK into memory (using the KMS API, which performs the decryption inside the HSM), uses the plaintext DEK to encrypt or decrypt the PII data in software, and then zeroizes the plaintext DEK from memory. This hybrid model provides the best of both worlds: the KEK — which protects all DEKs and is the highest-value target — is protected by the HSM, while the DEKs — which are ephemeral and limited in scope — benefit from the performance and low latency of software cryptography. If a DEK is compromised (extracted from memory), the attacker can decrypt only the specific data encrypted with that DEK — not all data in the system. AWS KMS's `GenerateDataKey` API, Azure Key Vault's `encrypt` operation with software-backed keys, and HashiCorp Vault's Transit engine's `generate/data-key` endpoint all implement this hybrid pattern natively.

---

### §14.6 Cloud KMS Platform Comparison

The practical implementation of key management for PII protection in most organizations is mediated through a cloud Key Management Service. AWS KMS, Azure Key Vault, and Google Cloud KMS each provide a managed service for generating, storing, and using cryptographic keys, with native integration into their respective cloud ecosystems (IAM, logging, networking, compute). While the core functionality — encrypt data with a key, decrypt data with a key — is the same across providers, the integration patterns, IAM models, and operational features differ in ways that affect architectural decisions. This section provides a comparative analysis of the three major cloud KMS platforms, focusing on the features most relevant to PII protection: envelope encryption, access control, audit logging, key rotation, and multi-cloud considerations.



#### §14.6.1 AWS KMS

**AWS KMS.** AWS Key Management Service is the most mature of the three platforms, with the broadest feature set for PII protection use cases. The core architectural pattern is **envelope encryption**, implemented through the `GenerateDataKey` API:



```json
// Request: Generate a data encryption key, encrypted with a KMS key
POST / HTTP/1.1
Host: kms.us-east-1.amazonaws.com
X-Amz-Target: TrentService.GenerateDataKey



{
  "KeyId": "arn:aws:kms:us-east-1:123456789012:key/abcd1234-...",
  "KeySpec": "AES_256"
}



// Response: Plaintext DEK (for local encryption) and encrypted DEK (for storage)
{
  "Plaintext": "w2j5k8...",
  "CiphertextBlob": "AQIDAHiR...",
  "KeyId": "arn:aws:kms:us-east-1:123456789012:key/abcd1234-..."
}

```



The application uses `Plaintext` to encrypt PII locally (AES-256-GCM), stores the resulting ciphertext alongside the `CiphertextBlob` (the encrypted DEK), and then discards the `Plaintext` from memory. To decrypt, the application sends the `CiphertextBlob` to AWS KMS's `Decrypt` API, which returns the plaintext DEK, which the application uses to decrypt the ciphertext. The KMS key (the KEK) is never exposed to the application — it remains inside AWS's FIPS 140-3 Level 3 validated HSM infrastructure.



#### §14.6.2 AWS KMS Key Policies

**AWS KMS key policies.** Access control in AWS KMS operates through a dual-layer model: the KMS key policy (resource-based, attached to the key) and IAM policies (identity-based, attached to IAM principals). Both must grant the permission for a principal to use a key — a service account must have `kms:Decrypt` in its IAM policy *and* the KMS key policy must allow that principal to call `kms:Decrypt`. This dual-layer model provides defense in depth: the KMS key policy acts as a final gatekeeper that cannot be bypassed even if IAM is misconfigured. For PII protection, the key policy should restrict `kms:Decrypt` to a narrow set of principals (the decryption service's IAM role, the compliance investigation role) while allowing `kms:Encrypt` and `kms:GenerateDataKey` to a broader set (application service roles). IAM conditions can further restrict access: for example, a condition that requires the request to originate from a specific VPC endpoint (`aws:SourceVpce`) prevents decrypt calls from being made from outside the organization's network perimeter.



#### §14.6.3 AWS KMS Audit Logging

**AWS KMS audit logging.** Every AWS KMS API call is logged to AWS CloudTrail as a management event. CloudTrail records the caller identity, source IP, timestamp, request parameters (including the key ID and, critically, the encryption context — see below), and response status. CloudTrail logs are immutable (once delivered to a trail, they cannot be modified) and can be forwarded to Amazon S3 for long-term retention, Amazon CloudWatch Logs for real-time alerting, or Amazon Athena for ad-hoc querying. For PII protection, CloudTrail provides the audit trail backbone: every encryption, decryption, and key management operation is captured automatically without any application-level logging code. The encryption context — a set of key-value pairs that the caller attaches to every `Encrypt` and `Decrypt` request — is the mechanism that binds the audit event to the specific data domain or data subject. For example, a `GenerateDataKey` call for encrypting a user's SSN might include the encryption context `{"data_classification": "ssn", "user_id": "usr_a1b2c3"}`, and the corresponding `Decrypt` call must include the same encryption context — if the contexts don't match, the KMS rejects the decrypt request. This prevents an attacker from taking an encrypted DEK from one context and using it in another.



#### §14.6.4 AWS KMS Automatic Key Rotation

**AWS KMS automatic key rotation.** When enabled, automatic key rotation creates a new cryptographic backing key for a KMS key every year, preserving all previous key versions for decryption. The application continues to reference the same key ID — the KMS transparently uses the current primary version for encryption and matches the correct version for decryption based on the key material in the ciphertext. Automatic rotation does not re-encrypt existing ciphertext — data encrypted under the old version is still decryptable, but new encryption uses the new version. For PII protection, this means the organization can achieve annual key rotation without any application changes or downtime, while maintaining backward compatibility with existing encrypted data. If the organization requires that all PII be encrypted under the latest key version (e.g., for regulatory reasons), a separate re-encryption process must read all existing ciphertexts, decrypt them with the old version, and re-encrypt with the new version — this is a data-layer operation that the KMS does not perform automatically.



#### §14.6.5 AWS KMS Multi-Region Keys

**AWS KMS multi-region keys.** For organizations operating across AWS regions, KMS multi-region keys enable encryption in one region and decryption in another. A multi-region primary key can have replica keys in other regions, each with the same key material. This is critical for PII protection in disaster recovery scenarios: if a region fails and encrypted data must be processed in the DR region, the replica key in the DR region can decrypt data that was encrypted by the primary key in the primary region. Multi-region keys simplify the operational model — no need to maintain separate per-region keys and cross-region key distribution — but they expand the attack surface: a compromise of the key policy in any region compromises the key in all regions. Multi-region keys should be used with enhanced cross-region IAM controls and monitoring.



#### §14.6.6 Azure Key Vault

**Azure Key Vault.** Azure Key Vault provides key management alongside secrets management (generic key-value secrets) and certificate management in a single service. This consolidation is operationally convenient — the team managing encryption keys can also manage database credentials, API keys, and TLS certificates in the same service — but it introduces a scope risk: a misconfiguration in the secrets management function could inadvertently affect key management. Organizations with strong security requirements should consider Azure Managed HSM, which provides a dedicated, single-tenant HSM instance with separate access controls from the standard Key Vault service.



#### §14.6.7 Azure Key Vault Access Control

**Azure Key Vault access control.** Azure supports two access control models for Key Vault: **access policies** (the legacy model, configured per-vault) and **Azure RBAC** (the recommended model, configured per-key). Under RBAC, the built-in role `Key Vault Crypto Service Encryption User` grants `Microsoft.KeyVault/vaults/keys/encrypt/action` — which allows encryption but not decryption. The role `Key Vault Crypto Service Encryption User` with the additional `decrypt/action` permission enables both. Custom roles can be defined to grant only encrypt or only decrypt, enabling the four-tier permission model described in §2. Azure RBAC's support for conditions (currently in preview) adds further granularity: conditions can restrict decrypt access to specific managed identities, specific virtual networks, or specific time windows. For break-glass scenarios, an Azure RBAC condition with a time-bound attribute provides the automatic revocation mechanism without requiring a PAM integration.



#### §14.6.8 Azure Key Vault Key Rotation

**Azure Key Vault key rotation.** Azure Key Vault supports key rotation through Azure Event Grid integration: a rotation policy can be configured on a key, and when the rotation trigger fires (based on a schedule or an expiration threshold), Azure Key Vault generates a new key version. The application must be written to reference the key by its key identifier (URI) rather than by a specific version — the latest version is used by default when no version is specified in the request. Azure also supports a more advanced rotation mechanism through Azure Key Vault's rotation policy with a rotation script: when the trigger fires, Azure executes a user-defined function (Azure Function) that can perform custom logic (e.g., re-encrypt existing data, update downstream dependencies, notify the security team).



#### §14.6.9 Azure Key Vault Soft-Delete and Purge Protection

**Azure Key Vault soft-delete and purge protection.** A critical operational safety feature: when a key is deleted in Azure Key Vault, it enters a soft-deleted state for a configurable retention period (7–90 days) during which it can be recovered. Purge protection prevents the key from being permanently deleted even by an administrator during the retention period. This protects against accidental or malicious key deletion — a scenario that would render all encrypted data permanently unrecoverable. For PII protection, purge protection should be enabled on every Key Vault that stores encryption keys, and the retention period should be set to the maximum (90 days) to provide the widest recovery window.



#### §14.6.10 Google Cloud KMS

**Google Cloud KMS.** Google Cloud Key Management Service organizes keys into a three-level hierarchy: **Key Rings** (regional containers), **CryptoKeys** (the logical key, with rotation settings and IAM policies), and **CryptoKeyVersions** (individual key material versions, each with a specific algorithm). This hierarchy provides natural scoping: all keys in a single region share a key ring, enabling regional access policies and disaster recovery planning.



#### §14.6.11 Google Cloud KMS IAM

**Google Cloud KMS IAM.** Google Cloud uses IAM roles scoped to KMS resources. The predefined role `roles/cloudkms.cryptoKeyEncrypter` grants `cloudkms.cryptoKeyVersions.useToEncrypt` and `cloudkms.cryptoKeys.get` — the service can encrypt data and read key metadata, but cannot decrypt. The role `roles/cloudkms.cryptoKeyDecrypter` grants only `cloudkms.cryptoKeyVersions.useToDecrypt`. The role `roles/cloudkms.cryptoKeyEncrypterDecrypter` grants both. This role separation directly implements the four-tier permission model: encrypt-only roles for application services, decrypt roles for the decryption service, and admin roles (`roles/cloudkms.admin`) for the security team. IAM policies can be applied at any level of the hierarchy: a policy on a key ring applies to all keys in the ring, a policy on a specific CryptoKey applies to that key only, and a policy on a specific CryptoKeyVersion applies to that version only.



#### §14.6.12 Google Cloud KMS Key Access Justification

**Google Cloud KMS key access justification.** A distinctive feature of Google Cloud KMS is the ability to require a **justification** for key access. When enabled, every request to use a CryptoKeyVersion (encrypt or decrypt) must include a `reason` string that describes why the key is being used. This justification is logged in Cloud Audit Logs alongside the operation, providing a built-in mechanism for documenting the purpose of each cryptographic operation. For PII protection, this feature reduces the reliance on application-level justification fields (as described in §3) and provides an infrastructure-enforced accountability mechanism: if the caller does not provide a reason, the KMS rejects the request. The justification requirement is configured through the organization policy constraint `constraints/gcp.resourceLocations` or through KMS-specific IAM conditions.



#### §14.6.13 Google Cloud KMS Key Rotation

**Google Cloud KMS key rotation.** Google Cloud KMS supports automatic rotation with a configurable period (minimum 90 days, maximum 365 days). When rotation is triggered, KMS generates a new CryptoKeyVersion using the same algorithm as the primary version and promotes the new version to primary. Previous versions remain available for decryption but cannot be used for new encryption (their state transitions from `primary` to `previous`). KMS does not automatically destroy old versions — they must be explicitly destroyed through a two-step process: `destroy` (schedules destruction after a 24-hour waiting period) → the version transitions to `destroyScheduled` → after 24 hours, the version transitions to `destroyed` and the key material is cryptographically erased. This two-step process with a mandatory waiting period prevents accidental or panicked key destruction.



#### §14.6.14 Multi-Cloud Key Management

**Multi-cloud key management.** Organizations operating across multiple cloud providers face a key management challenge: each cloud KMS is proprietary, with different APIs, different IAM models, and different key formats. A DEK encrypted by AWS KMS cannot be decrypted by Azure Key Vault, and vice versa. Two strategies address this:



- **Key management abstraction layer.** A centralized key management platform (HashiCorp Vault, Fortanix DSM, CyberArk Conjur) provides a unified API for encryption, decryption, and key lifecycle management, with backends that translate to each cloud KMS. The application calls Vault's Transit API (`transit/encrypt`, `transit/decrypt`), and Vault routes the operation to the appropriate cloud KMS backend. This abstraction decouples the application from the cloud provider and enables key portability — migrating from AWS KMS to Azure Key Vault requires changing Vault's backend configuration, not the application code. The trade-off is operational complexity: the organization must now operate and maintain the abstraction layer in addition to the cloud KMS services.



- **Cloud-agnostic envelope encryption.** Instead of relying on the cloud KMS for DEK management, the application generates DEKs locally, encrypts PII with the DEK, and uses the cloud KMS only to encrypt the DEK (the KEK operation). The DEK generation and encryption logic is implemented in application code or a shared library, making it portable across cloud providers. The encrypted DEK includes metadata indicating which cloud KMS and which key ID was used to encrypt it, enabling a multi-cloud decryption service to route the decrypt request to the correct cloud KMS. This approach requires more application-level code but avoids the dependency on a centralized key management abstraction layer.



For PII protection in a multi-cloud environment, the abstraction layer approach (HashiCorp Vault Transit) is the more common choice: it provides the unified audit trail, centralized access control, and operational consistency that the envelope encryption approach lacks. The key design decision is where to deploy the abstraction layer — ideally in a neutral location (on-premises or a separate cloud account) to avoid a single point of failure or a single cloud dependency for the key management infrastructure itself.

---

## 15. Right to Erasure in Encrypted Contexts

A persistent misconception in API design is that encrypting personally identifiable information (PII) somehow transforms it into non-personal data, thereby exempting the data controller from GDPR obligations. This chapter exists because teams that adopt tokenization, encryption, or centralized decryption as part of the core pattern set must still satisfy erasure obligations cleanly. This belief is categorically wrong and has been refuted by every major European data protection authority.



GDPR Article 4(1) defines "personal data" as **any information relating to an identified or identifiable natural person**. The operative word is *relating to* — the definition is concerned with the relationship between the data and the individual, not with the technical format in which the data is stored. An encrypted email address, a tokenised national identification number, or a cipher-text medical record still *relates to* a specific person regardless of whether the data controller can currently read it without additional steps. The European Data Protection Board (EDPB) has consistently maintained that encryption does not alter the fundamental nature of data as personal data, and the UK Information Commissioner's Office (ICO) explicitly states in its guidance that encrypted personal data remains personal data under the UK GDPR.



The identifiability test under Article 4(1) is both qualitative and contextual. Recital 26 provides that to determine whether a natural person is identifiable, account should be taken of **all the means reasonably likely to be used** to identify the natural person directly or indirectly. This includes the data controller's own capabilities, the capabilities of any third party it shares data with, and the state of technology at the time of assessment. If the data controller possesses a decryption key, the encrypted data is trivially identifiable. If the key is held by a processor or sub-processor under contract, the data remains identifiable by the controller through that contractual relationship. Even if the key were genuinely lost, the data could become re-identifiable through future advances in cryptanalysis — and the GDPR's identifiability assessment must consider reasonably foreseeable technological developments.



Consider a practical API scenario: a REST API logs every incoming request, including the `Authorization` header. Even if the JWT bearer token is stored in an encrypted log store, the token is cryptographically bound to a specific user via its `sub` claim. The encrypted log entry *relates to* that user. A data subject exercising their Article 15 right of access could demand that the controller reveal what personal data is held about them — and the controller must be able to comply, which paradoxically requires the controller to decrypt the data and present it. This creates a tension: if the controller can decrypt to fulfil Article 15, the data is demonstrably still personal data; if it cannot decrypt, it has lost control over the data it holds, which is itself a compliance failure under Article 5(1)(f) (integrity and confidentiality) and Article 32 (security of processing).



The EDPB's 05/2020 guidelines on consent clarify that **pseudonymised data remains personal data**. Encryption is a form of pseudonymisation — it substitutes identifiable information with a reversible transformation protected by a secret. The GDPR itself, in Recital 28, acknowledges this: "The application of pseudonymisation to personal data can reduce the risks to the data subjects concerned … but does not in itself mean that the data ceases to be personal data." The logical corollary is stark: every erasure obligation, every data subject right, and every controller obligation that applies to plaintext PII applies equally to encrypted PII.



This has profound implications for REST API architecture. An API that encrypts PII at rest and in transit has not reduced its regulatory footprint — it has merely added a layer of security. The data controller must still:



- Maintain a lawful basis for processing (Article 6) and, where applicable, a lawful basis for processing special categories of data (Article 9).

- Respect storage limitation (Article 5(1)(e)) and delete encrypted data when the retention period expires.

- Respond to erasure requests (Article 17) by actually removing the data — not merely rendering it temporarily unreadable.

- Implement data protection by design and by default (Article 25), which includes ensuring that encrypted data can be effectively erased within designed retention windows.



Treating encrypted PII as a compliance-free zone is not merely a design error — it is a regulatory risk that can result in enforcement actions, fines, and reputational damage.


A tempting operational shortcut for handling erasure requests in encrypted systems is key rotation: the data controller generates a new encryption key, re-encrypts active data under the new key, and discards the old key. The argument is seductive — without the old key, the previously encrypted ciphertexts are (presumably) unreadable, so the data is effectively "gone." This reasoning is flawed in several fundamental ways and has been explicitly rejected by European data protection authorities.



First, **key rotation does not destroy the ciphertexts**. The encrypted data remains on disk, in backups, in log aggregation pipelines, in CDN edge caches, and in any number of downstream systems that received copies before rotation was initiated. The data controller still *holds* personal data about the data subject — it simply cannot (or believes it cannot) read it in its current form. Under GDPR Article 4(1), holding data that relates to an identifiable person constitutes processing, regardless of whether the controller can currently interpret that data. The data has not been erased; it has been rendered inconvenient to access, which is not the same thing.



Second, **Article 15 (right of access) continues to apply**. A data subject may request access to all personal data held about them, including data encrypted under the old key. If the controller responds "we rotated the key and can no longer decrypt your data," the data subject could argue — with merit — that the controller has failed to implement adequate data management practices and may have violated Article 5(1)(f) (integrity and confidentiality) by losing the ability to manage the data it holds. The controller is caught in a paradox: it cannot both claim the data is erased (to avoid access obligations) and claim the data is still held (just encrypted, for security purposes).



Third, **the assumption of irreversible unreadability is often unfounded**. Key material is notoriously difficult to eradicate completely. Keys may persist in memory dumps, hardware security module (HSM) audit logs, key management service (KMS) version histories, configuration backups, CI/CD pipeline secrets stores, and developer workstations. Cloud KMS providers such as AWS KMS, Azure Key Vault, and GCP Cloud KMS retain key material for a configurable but often lengthy period (e.g., AWS KMS retains deleted keys for 7–30 days by default). During this window, the "destroyed" key is still recoverable. Even after hard deletion, key material may persist in offsite backups, disaster recovery snapshots, or forensic images taken for security incident investigation.



Fourth, **future cryptanalysis may break the encryption**. The security of encryption algorithms depends on computational assumptions that may weaken over time. AES-256 remains secure against known attacks today, but advances in quantum computing (Grover's algorithm reduces the effective key strength by half) or the discovery of new cryptanalytic techniques could render previously secure ciphertexts readable. The GDPR's identifiability assessment under Recital 26 requires consideration of reasonably foreseeable technological developments — a standard that arguably includes quantum computing timelines. If ciphertexts survive today on the assumption that the encryption is unbreakable, and that assumption fails in ten years, the data controller has failed to erase data that it was obligated to delete.



Fifth, **key rotation is a forward-secrecy mechanism, not an erasure mechanism**. Its legitimate purpose is to limit the blast radius of key compromise: if an attacker extracts today's key, they cannot decrypt data encrypted under yesterday's key (provided that key was also rotated out). This is a valuable security property, but it is orthogonal to erasure. Conflating the two is a category error — like confusing a locked door with a demolished building. The data is still there, still linked to the data subject, and still subject to GDPR obligations.



The practical lesson for REST API designers is unambiguous: if a data subject exercises their Article 17 right to erasure, the controller must delete the ciphertexts themselves (or the records containing them) from all storage locations, not merely rotate the encryption key and hope that the resulting ciphertexts become unreadable. Key rotation is an excellent security practice; it is not a substitute for erasure.


A more structurally sound approach to enabling erasure in encrypted systems is **per-subject key isolation**: assigning each data subject a dedicated encryption key that encrypts all of that individual's PII. Under this architecture, erasure becomes a two-step cryptographic operation — destroy the subject's key and delete all associated ciphertexts — which is both operationally clean and cryptographically verifiable.



The model is straightforward in concept. When a new data subject is onboarded (e.g., a user registers an account), the system generates a unique encryption key in a hardware security module (HSM) or cloud KMS, tagged with the subject's identifier. All PII belonging to that subject — profile fields, contact details, transaction records, communication metadata — is encrypted under this key before being written to storage. The key is never shared across subjects; each person's data is cryptographically isolated from every other person's data. When an erasure request arrives, the controller destroys the subject's key (a single KMS API call in most cloud environments) and issues a bulk delete of all ciphertexts tagged with that key's identifier. Without the key, any residual ciphertexts in backups or logs are provably unrecoverable — and critically, the controller can demonstrate to a supervisory authority that erasure has been achieved by providing a key destruction certificate from the HSM or KMS provider.



The advantages are compelling from a regulatory perspective. The EDPB and national DPAs have signalled cautious acceptance of cryptographic erasure when it is implemented with per-subject isolation, because the isolation makes erasure demonstrable. The controller can produce an audit trail showing: (a) the key was generated on date X, (b) the key was used to encrypt N records for subject Y, (c) the key was destroyed on date Z with no copies retained, and (d) all ciphertexts under that key were deleted from primary and secondary storage. This evidentiary chain is significantly stronger than "we rotated the master key and the old ciphertexts are hopefully unreadable."



However, the operational challenges are non-trivial. **Key explosion** is the most obvious concern: a system with one million active users requires one million managed encryption keys. AWS KMS supports a default quota of 500 keys per region (expandable upon request), Azure Key Vault supports up to 5,000 keys per vault, and GCP Cloud KMS has a per-project limit of 10,000 crypto keys. These limits are not designed for per-user key isolation at scale and require architectural workarounds. **Key management overhead** compounds the problem: each key must be rotated periodically (for forward secrecy), tagged with metadata, audited for usage, and eventually destroyed — all of which must be tracked and automated. **Query performance** suffers because cross-subject queries (e.g., "count all users in Germany") require decrypting with potentially thousands of different keys, which is impractical for analytical workloads.



Several mitigations address these challenges. **Key buckets** partition subjects into a fixed number of cryptographic buckets (e.g., 1,024 buckets), each with its own key. Subjects are deterministically assigned to buckets (e.g., by hashing their identifier modulo the bucket count). Erasure requires destroying one bucket key and deleting all ciphertexts in that bucket — which unfortunately affects all subjects in the same bucket, making this approach unsuitable for individual erasure. **Hierarchical key derivation** uses a single master key to derive per-subject keys via a KDF (e.g., HKDF-SHA256). Erasure requires deleting the derivation record and the subject's ciphertexts; the master key remains intact for other subjects. This avoids key explosion while maintaining per-subject isolation. **Envelope encryption with per-subject data keys** stores a unique data encryption key (DEK) for each subject, encrypted under a central key encryption key (KEK). Erasure destroys the subject's encrypted DEK and all ciphertexts; the KEK remains. This is the most practical approach for cloud-native systems, as it leverages existing envelope encryption infrastructure while providing per-subject erasure capability.



For REST API design, per-subject key isolation has specific implications. The API's data access layer must tag every encrypted record with the subject's key identifier. Read and write paths must perform key lookup before encryption or decryption operations. Bulk operations (e.g., GDPR data export under Article 20) must iterate over per-subject keys rather than issuing a single decrypt operation. The API must also handle edge cases: what happens when a subject's key is destroyed but a downstream consumer (e.g., an analytics pipeline) still references the ciphertexts? The answer is that the API must propagate deletion notifications to all downstream systems — a challenge that requires careful event-driven architecture.


Cryptographic erasure — the deliberate destruction of encryption keys to render associated ciphertexts permanently unrecoverable — occupies a contested space in the intersection of data protection law and information security. It is recognised as a valid media sanitisation method by NIST SP 800-88 Rev. 1 (*Guidelines for Media Sanitization*), which classifies it as a **Clear** or **Purge** technique depending on the implementation, but its acceptance under GDPR Article 17 is far less settled.



NIST SP 800-88 defines three categories of media sanitisation: **Clear** (overwriting data so it cannot be recovered by standard techniques), **Purge** (applying techniques that render data unrecoverable even by laboratory analysis), and **Destroy** (physically destroying the media). Cryptographic erasure, implemented by destroying the encryption key and leaving ciphertexts in place, qualifies as a **Purge** method — provided that the encryption algorithm is sufficiently strong, the key was generated and managed in a secure cryptographic module (e.g., FIPS 140-2 Level 3 HSM), and the key destruction is performed in a manner that prevents any recovery of the key material. The standard explicitly states that "if the encryption key is purged, then the media can be considered cleared" and that "if the cryptographic erasure process meets the requirements of a purge, then the media can be considered purged." This is a valuable operational property: destroying a 256-bit key is far faster than overwriting terabytes of encrypted storage.



The key destruction process itself must meet several requirements. The key must be **securely overwritten** in the KMS or HSM — zeroing the key bytes, not merely marking the key slot as available. The key's metadata (creation timestamp, usage records, associated policy identifiers) must also be purged. **Audit logs** that reference the key must be reviewed: if a log entry records "key K used to encrypt record R for subject S," the log entry itself contains personal data (the linkage between subject S and record R) even after the key is destroyed. The key's **backup copies** must be located and destroyed: cloud KMS services typically maintain replicated key material across availability zones and may retain deleted keys in a recovery window. The operator must confirm that all replicas have been purged, not merely the primary copy.



**Ciphertext overwriting** adds a second layer of assurance. After key destruction, the controller overwrites the ciphertext storage with random data or zeros. This eliminates any residual risk from partially recovered key material and provides physical evidence that the storage has been sanitised. In cloud environments, this can be achieved through storage lifecycle policies (e.g., AWS S3 Object Lock expiry followed by overwrite), volume snapshot deletion, or instance store reinitialisation. The combination of key destruction and ciphertext overwriting is the strongest form of cryptographic erasure and is most likely to satisfy a supervisory authority's scrutiny.



The critical question for GDPR compliance is whether cryptographic erasure satisfies **Article 17** (right to erasure). The regulation requires the controller to erase personal data "without undue delay." It does not prescribe a specific technical method for achieving erasure, which creates room for argument that cryptographic erasure — if implemented rigorously — could constitute erasure in the legal sense. However, the burden of proof lies with the controller. To demonstrate compliance, the controller must be able to show that:



1. The encryption key has been destroyed in all locations, with no recoverable copies.

2. No party — including the controller, its processors, sub-processors, or any third party with technical means — can recover the plaintext from the remaining ciphertexts.

3. The ciphertexts themselves have been deleted or overwritten from all storage systems, including backups, logs, and downstream copies.

4. A verifiable audit trail documents the entire erasure process, including timestamps, the identity of the operator who initiated erasure, and confirmation from the KMS or HSM that key destruction was completed.



In practice, many European DPAs remain sceptical of cryptographic erasure as a standalone measure. The French CNIL, in its recommendations on data retention and erasure, has indicated that deletion of the data itself (not merely the key) is the preferred approach. The German BfDI has similarly emphasised that the data must be rendered irretrievable, which it interprets as requiring deletion of the data records rather than relying on key inaccessibility. The EDPB has not issued binding guidance that explicitly endorses cryptographic erasure for GDPR Article 17 compliance, which means that controllers adopting this approach do so at their own regulatory risk.



For REST API architects, the pragmatic recommendation is to **use cryptographic erasure as an additional safeguard, not as the sole erasure mechanism**. Delete the ciphertexts, destroy the key, and overwrite the storage. This belt-and-suspenders approach satisfies both the legal requirement (data is deleted) and the security requirement (even if deletion missed some copies, the key is gone). The overhead is minimal — deleting records from a database and destroying a key in a KMS are both fast, automatable operations.

---

### §15.1 The GDPR Erasure Challenge



GDPR Article 17 establishes the data subject's right to erasure — commonly known as the "right to be forgotten." When a data subject exercises this right, the controller must delete their personal data "without undue delay." For data stored in plaintext, erasure is straightforward: delete the record from the database, clear the cache, and confirm deletion. But when PII is encrypted at rest, in transit across API boundaries, or pseudonymized for analytics, the concept of "deletion" becomes significantly more complex.



The challenge is threefold:



1. **Encrypted data exists in multiple locations**: PII encrypted at the API gateway may appear as ciphertext in logs, caches, downstream microservices, message queues, data warehouses, and backup systems. Each copy must be identified and deleted.

2. **Pseudonymized data retains a mapping**: Even after pseudonymization (Chapter 5), a mapping table or tokenization vault retains the link between the pseudonym and the real PII. Deleting the pseudonymized record from the analytics database is insufficient — the mapping itself constitutes personal data under GDPR Recital 26, because it allows re-identification.

3. **Encrypted backups create retention conflicts**: Encrypted backups are typically retained for disaster recovery, often with multi-year retention policies. If a data subject exercises their right to erasure, but their encrypted PII persists in a backup that won't be purged for another two years, is the controller in compliance?



#### §15.1.1 Legal Framework



GDPR Article 17(1) establishes the right to erasure. Article 17(3)(c) provides an important qualification: the right "does not apply to the extent that processing is necessary... for compliance with a legal obligation to which the controller is subject under Union or Member State law." This creates a potential conflict with other regulations that mandate data retention:



- **Financial services**: MiFID II (Article 25(1)) requires 5–7 year retention of transaction records. Solvency II requires up to 10 years. If a customer requests erasure of their transaction history, the financial institution may be caught between GDPR Article 17 and MiFID II's retention mandate.

- **Healthcare**: HIPAA (45 CFR §164.530(j)) requires 6-year retention of medical records. GDPR Article 17(3)(e) provides an exception for "archiving purposes in the public interest, scientific or historical research purposes, or statistical purposes" subject to appropriate safeguards.

- **Anti-money laundering**: AML regulations (EU AMLD, US BSA) require records to be retained for 5 years after the business relationship ends. These records frequently contain PII.

---

### §15.2 Crypto Shredding



Crypto shredding (also called cryptographic erasure) is a technique that makes encrypted data permanently unreadable by destroying the encryption keys rather than the ciphertext itself. When the key is destroyed, the ciphertext becomes mathematically unrecoverable — it is effectively deleted without ever touching the data storage layer.



#### §15.2.1 How Crypto Shredding Works

```mermaid
%%{init: {sequence: {actorMargin: 250, messageMargin: 60}, themeVariables: {noteBkgColor: "transparent", noteBorderColor: "transparent"}}}%%
sequenceDiagram
    autonumber
    participant DS as Data Subject
    participant CTRL as Controller
    participant KMS as Key Management System
    participant DB as Primary Database
    participant BK as Backups / Warehouse

    rect rgba(46, 204, 113, 0.14)
        Note over DB, BK: Normal operation — per-subject key isolation
        DB->>DB: Customer A data encrypted with key_A
        DB->>DB: Customer B data encrypted with key_B
        BK->>BK: Replicated ciphertexts (key_A, key_B)
        Note right of BK: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end

    rect rgba(231, 76, 60, 0.14)
        Note over DS, BK: Right to Erasure — Crypto Shredding
        DS->>CTRL: Erasure request (GDPR Art. 17)
        CTRL->>KMS: Destroy key_A
        KMS->>KMS: Zeroize key material
        KMS-->>CTRL: Key destroyed (audit log entry created)
        CTRL->>DB: key_A ciphertext now unrecoverable
        CTRL->>BK: key_A ciphertext in backups also unrecoverable
        CTRL-->>DS: Erasure confirmed
        Note right of BK: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end
```

#### §15.2.2 Walkthrough

<details><summary><strong>1. Primary Database encrypts Customer A data with per-subject key</strong></summary>

During normal operation, the primary database stores each data subject's PII under a dedicated data encryption key (DEK). Customer A's records (name, email, transactions) are encrypted with `key_A`, Customer B's with `key_B`. This per-subject key isolation is the foundational design decision that makes crypto shredding possible — if all subjects shared a single DEK, destroying that key would erase *every* subject's data, not just the one requesting erasure.

The self-referential arrow (`DB->>DB`) represents an internal application-layer encryption operation: before writing PII to disk, the application encrypts each field using the subject's DEK. The plaintext PII exists only in transient application memory during the write path and is never persisted in cleartext.

</details>

<details><summary><strong>2. Primary Database encrypts Customer B data with a different per-subject key</strong></summary>

Customer B's PII is encrypted with a separate DEK (`key_B`), maintaining the key isolation principle. This demonstrates that the per-subject key strategy scales to any number of data subjects — each one has independent encrypt/decrypt capability, and erasing one subject's key has zero impact on any other subject's data accessibility.

The granularity of key assignment (per-subject vs. per-record vs. per-field) is a critical architectural decision (see the Key Granularity Strategies table below). Per-subject keys offer the best trade-off between erasure precision and operational complexity.

</details>

<details><summary><strong>3. Backups and warehouse store replicated ciphertexts</strong></summary>

The encrypted data is replicated to secondary storage — database backups, data warehouses, analytics pipelines, and disaster recovery copies. These replicas store the same ciphertexts (encrypted with `key_A` and `key_B`) but are typically managed by separate teams and systems with independent retention policies. This replication is the core challenge that makes naive deletion impractical: finding and deleting every copy of Customer A's PII across all these systems is operationally intractable.

The self-referential arrow (`BK->>BK`) emphasises that the backup/warehouse system stores ciphertexts passively — it does not perform encryption or decryption, it simply stores the encrypted bytes as received. This means the backup system has no ability to "undo" encryption; the only path to making the data unreadable is destroying the key.

</details>

<details><summary><strong>4. Data Subject submits erasure request to Controller</strong></summary>

The erasure flow begins when a data subject invokes their right to erasure under GDPR Article 17 by submitting a verifiable request to the data controller. The request must identify the data subject and specify the scope of erasure (all data, or data relating to a specific processing purpose). The controller must authenticate the requester — typically through a self-service privacy portal backed by the subject's authenticated session, or via a signed identity assertion (eIDAS 2.0 electronic identification, OAuth 2.0 token):

```http
DELETE /api/privacy/erasure HTTP/1.1
Authorization: Bearer <subject_access_token>
X-Erasure-Reason: gdpr-art17
Content-Type: application/json

{
  "subject_id": "subj_7f3a9c2e",
  "scope": "all",
  "verification_token": "eyJhbGciOiJFUzI1NiIs..."
}
```

The `verification_token` is a short-lived, signed assertion proving the requester is the data subject (or their authorised representative). Without this, any authenticated user could request erasure of another subject's data. Under GDPR Article 12(3), the controller must respond without undue delay — generally within 30 days, though the EDPB recommends initiating technical erasure within 72 hours where feasible (EDPB Guidelines on the Right to Erasure, WP235).

</details>

<details><summary><strong>5. Controller identifies DEKs and schedules destruction via Key Management System</strong></summary>

Upon receiving the verified erasure request, the controller first queries its key registry to identify every data encryption key associated with the subject's records. This registry maps each data subject to the DEK(s) used to encrypt their PII across all storage locations. The lookup is critical — missing a single DEK means ciphertext in one storage location remains decryptable after the claimed "erasure":

```sql
SELECT dek_id, wrapped_dek, kms_key_version, storage_location, created_at
  FROM subject_key_registry
 WHERE subject_id = 'subj_7f3a9c2e';
```

With the complete list of DEKs identified, the controller instructs the KMS to schedule the destruction of each DEK. Most enterprise KMS providers support scheduled deletion with a configurable waiting period — this protects against accidental or malicious premature key destruction:

```bash
# AWS KMS: schedule key deletion with 7-day waiting period
aws kms schedule-key-deletion \
    --key-id arn:aws:kms:eu-west-1:123456789012:key/dek_a1b2c3 \
    --pending-window-in-days 7
```

The waiting period is a deliberate safety mechanism. During this window, the key remains usable, allowing the controller to recover from a mistaken erasure request. The controller must also record an immutable audit log entry documenting the erasure request, the identified DEKs, and the scheduled destruction timestamps (GDPR Article 5(2) accountability principle).

</details>

<details><summary><strong>6. Key Management System zeroizes key material</strong></summary>

When the scheduled waiting period expires, the KMS performs cryptographic zeroization. In an HSM-backed KMS, this means the key material is securely overwritten in tamper-resistant hardware — the same physical protection that prevents key extraction during normal operation now guarantees that the overwritten material is irrecoverable. The zeroization follows NIST SP 800-88 guidelines, using HSM-level overwrite mechanisms that cannot be bypassed by software.

After zeroization, even the KMS itself cannot reconstruct the key. The self-referential arrow (`KMS->>KMS`) represents this entirely internal operation — no external party participates in or observes the zeroization process.

</details>

<details><summary><strong>7. Key Management System confirms key destruction to Controller</strong></summary>

The KMS returns a destruction confirmation to the controller, including the zeroization method used and a unique audit event identifier:

```json
{
  "dek_id": "dek_a1b2c3",
  "status": "destroyed",
  "zeroization_method": "hsm_overwrite_nist_sp_800-88",
  "destroyed_at": "2026-04-09T14:30:00Z",
  "audit_event_id": "evt_9f8e7d6c"
}
```

This confirmation is the controller's proof that the key has been irrecoverably destroyed. If the KMS is operated by a cloud provider (AWS KMS, Azure Key Vault, Google Cloud KMS), the destruction confirmation comes from the provider's attestation. For workloads requiring higher assurance, a customer-managed HSM (AWS CloudHSM, Azure Dedicated HSM) provides direct control over the zeroization process. The controller records this confirmation in its erasure tracking record for the verification steps that follow.

</details>

<details><summary><strong>8. Controller verifies primary database ciphertext is unrecoverable</strong></summary>

After key destruction, the controller verifies that the subject's encrypted PII in the primary database (and any read replicas) is unrecoverable. The controller confirms that ciphertext exists — proving the data was stored — but that the corresponding DEK has been destroyed, making decryption impossible:

```json
{
  "checks": [
    {"location": "primary_db", "tables": ["customers", "orders"], "status": "ciphertext_present_but_undecryptable"},
    {"location": "read_replica", "tables": ["customers"], "status": "ciphertext_present_but_undecryptable"}
  ],
  "cached_keys_purged": true,
  "application_memory_flushed": true
}
```

The controller also verifies that no derived keys remain cached in application memory or on-disk key caches — a cached key would allow "erased" data to be decrypted retroactively (§15.2).

</details>

<details><summary><strong>9. Controller verifies backup and warehouse ciphertext is unrecoverable</strong></summary>

The controller extends verification to secondary storage locations — database backups, transaction logs, analytics warehouses, and any other system that holds replicated ciphertexts encrypted with the destroyed DEK(s):

```json
{
  "checks": [
    {"location": "transaction_log", "tables": ["transactions"], "status": "ciphertext_present_but_undecryptable"},
    {"location": "analytics_warehouse", "tables": ["customer_analytics"], "status": "ciphertext_present_but_undecryptable"},
    {"location": "backup_s3", "snapshot": "db-backup-2026-04-01", "status": "ciphertext_present_but_undecryptable"}
  ]
}
```

If any storage location still holds a viable decryption path (e.g., a wrapped DEK backed up with a different KMS key version), the controller must schedule additional key destructions or rotate the wrapping key to close the gap (§14.3). The erasure is only complete when **all** locations are confirmed unrecoverable.

</details>

<details><summary><strong>10. Controller confirms erasure to Data Subject</strong></summary>

Once verification is complete across all storage locations, the controller sends a confirmation to the data subject documenting that their erasure request has been fulfilled. The confirmation includes a reference identifier, the scope of erasure, and the date of completion:

```json
{
  "erasure_confirmation": {
    "request_id": "erq_5a4b3c2d",
    "subject_id": "subj_7f3a9c2e",
    "scope": "all",
    "status": "completed",
    "completed_at": "2026-04-09T14:35:00Z",
    "deks_destroyed": ["dek_a1b2c3", "dek_d4e5f6", "dek_g7h8i9"],
    "storage_locations_verified": 5,
    "retention": {
      "audit_log_retention_until": "2029-04-09T14:35:00Z",
      "note": "Erasure metadata retained for regulatory accountability only. No PII recoverable."
    }
  }
}
```

The controller may retain the erasure metadata (request ID, timestamp, DEKs destroyed) in its audit log for up to the GDPR limitation period — typically three years. This metadata does not contain PII; it only records that erasure was performed. Retaining it supports the GDPR Article 5(2) accountability principle by providing evidence of compliance during supervisory authority audits.

The data subject's ciphertext remains in storage (databases, backups, logs) — it is not deleted. It simply cannot ever be decrypted again. This is the fundamental insight of crypto shredding: rather than solving the computationally intractable problem of finding and deleting every copy of PII across an entire data ecosystem, the controller destroys the single key that makes all copies intelligible.

</details>
<br/>

The elegance of crypto shredding is that it collapses the multi-location deletion problem into a single key destruction operation. No matter how many copies of the ciphertext exist — in production databases, replicas, backups, logs, or analytics pipelines — all become permanently unreadable when the key is destroyed.



#### §15.2.3 Key Granularity Strategies



The effectiveness of crypto shredding depends on the granularity of the encryption key. The diagram below illustrates the four key strategies and their erasure precision trade-offs:

```mermaid
flowchart LR
    subgraph GK["Global Key"]
        direction TB
        A["All&nbsp;PII"] --> B["🔑 Key"]
    end

    subgraph TK["Per-Tenant Key"]
        direction TB
        C["Tenant&nbsp;1"] --> D["🔑 Key₁"]
        E["Tenant&nbsp;2"] --> F["🔑 Key₂"]
    end

    subgraph SK["Per-Subject Key"]
        direction TB
        G["Subject&nbsp;A"] --> H["🔑 Key_A"]
        I["Subject&nbsp;B"] --> J["🔑 Key_B"]
        K["Subject&nbsp;C"] --> L["🔑 Key_C"]
    end

    subgraph RK["Per-Record Key"]
        direction TB
        M["Record&nbsp;1"] --> N["🔑 Key₁"]
        O["Record&nbsp;2"] --> P["🔑 Key₂"]
        Q["Record&nbsp;3"] --> R["🔑 Key₃"]
    end

    GK ~~~ TK ~~~ SK ~~~ RK
```



| Granularity | Key Scope | Erasure Precision | Operational Complexity | Cost |
|:------------|:----------|:-----------------:|:----------------------:|:-----|
| **Global key** | All PII encrypted with one key | ❌ Cannot erase one subject | Low | Low |
| **Per-tenant** | One key per organization/customer | ⚠️ Erases entire tenant | Low | Medium |
| **Per-data-subject** | One key per individual | ✅ Precise per-subject erasure | High | High |
| **Per-record** | One key per data record | ✅ Precise per-record erasure | Very high | Very high |



**Per-data-subject keys** are the recommended granularity for GDPR compliance. Each data subject's PII is encrypted with a key derived from a master key and the subject's unique identifier:



```
subject_key = HKDF(master_key, info="pii-encryption", salt=subject_id)

```



When the subject requests erasure, the derived key is discarded (it can always be re-derived from the master key if needed, so the actual erasure operation requires removing the subject's entry from the key derivation registry).



**Envelope encryption with per-subject DEKs**: A more practical approach uses a per-subject data encryption key (DEK), wrapped by the KMS's master key. The DEK is stored alongside the ciphertext; the wrapped DEK is also stored. For erasure, both the DEK and the wrapped DEK are deleted. If the ciphertext is in a backup that also includes the DEK, destroying the DEK in the primary store is insufficient — the backup's DEK must also be destroyed, or the backup must use a different wrapping scheme (e.g., the KMS key wraps the DEK, and the KMS key itself is rotated after erasure, making old wrapped DEKs undecryptable).



#### §15.2.4 Limitations and Failure Modes



- **Deterministic encryption breaks crypto shredding**: If the same key is used for multiple subjects (deterministic AES, §4.3), destroying the key erases all subjects' data — not just the target. Crypto shredding requires per-subject or per-record key isolation.

- **Tokenization is incompatible**: Tokenization vaults (§5.3) store a mapping from token to real value. Crypto shredding the vault's encryption key destroys the entire vault, not a single mapping. For selective erasure, the mapping entry must be deleted from the vault — not the key.

- **Key derivation cache**: If the application caches derived keys in memory or on disk, the cached key must be purged when the subject is erased. Otherwise, the cached key can still decrypt the "erased" data.

- **Replay attacks**: If an attacker previously captured a valid ciphertext and the key, but the key is only destroyed upon erasure, the ciphertext/key pair remains valid until the key is destroyed. This is an inherent limitation — crypto shredding is not retroactive.

---

### §15.3 Backup and Retention Conflicts



The most common compliance failure mode for encrypted PII is the conflict between the right to erasure and backup retention policies.



#### §15.3.1 The Problem



When a data subject requests erasure, the controller deletes their record from the production database. But encrypted copies of their PII may persist in:



- **Database backups**: Point-in-time recovery snapshots, logical backups, third-party backup copies

- **Log archives**: API gateway access logs, application logs, audit trails (§11)

- **Analytics snapshots**: Data warehouse extracts, materialized views, ML training datasets

- **Message queue dead-letter queues**: Failed messages containing encrypted PII that were not processed

- **CDN cache**: Encrypted values cached at edge nodes

- **Developer local copies**: Developers who copied production data to local environments for debugging



Each of these is a potential GDPR violation if the data subject's PII is still recoverable after the erasure deadline.



#### §15.3.2 Crypto Shredding for Backups



Crypto shredding provides an elegant solution to the backup problem, but only if the backup includes wrapped DEKs (not just ciphertext). If the ciphertext and the wrapped DEK are co-located in the backup, then destroying the KMS key version used to wrap the DEK renders the entire backup undecryptable — not just the erased subject, but all subjects whose DEKs were wrapped with that key version.



A more targeted approach:



1. **Per-subject DEK wrapping**: Each subject's DEK is wrapped with the KMS master key. The wrapped DEK is stored alongside the subject's record.

2. **Erasure deletes the wrapped DEK**: When the subject requests erasure, delete the wrapped DEK from the production database AND from the backup (if the backup is mutable). If the backup is immutable (WORM), this step fails — see the WORM mitigation below.

3. **Key version rotation**: After erasure, rotate the KMS key version. The new key version is used for all future wrap operations. The old key version is retired and eventually destroyed. When the old key version is destroyed, any remaining wrapped DEKs in immutable backups become undecryptable.



This approach introduces a delay between the erasure request and the actual irrecoverability — the old KMS key version must be rotated and destroyed, which may take hours to days depending on the organization's key rotation procedures. The EDPB considers this delay acceptable under the "without undue delay" standard, provided the organization has a documented process and executes it within a reasonable timeframe (typically interpreted as 30 days under GDPR Article 12(3)).



#### §15.3.3 WORM Storage Mitigation



Immutable backup storage (WORM, S3 Object Lock in Compliance mode, Azure Immutable Blob) is specifically designed to prevent deletion — which directly conflicts with GDPR erasure. Mitigation strategies:



1. **Don't store PII in WORM storage**: The simplest solution is to exclude PII-containing data from immutable backups. This may not be feasible if the organization's backup policy is organization-wide.

2. **Encrypt before WORM**: Encrypt PII with a per-subject DEK before writing to WORM storage. The WORM copy contains ciphertext + wrapped DEK. Erasure destroys the DEK (in the mutable key store) and rotates the wrapping key. The WORM copy becomes unreadable.

3. **Short WORM retention**: If WORM retention must be used (regulatory requirement), minimize the retention period to the legally mandated minimum. After the retention period expires, the WORM copy is automatically deleted.

---

### §15.4 Tokenization Vault Cleanup



When PII is tokenized (Chapter 5), the tokenization vault maintains the mapping from token to real value. Even if the application deletes all references to a data subject's tokens, the mapping entry in the vault still constitutes personal data under GDPR Recital 26.



#### §15.4.1 Cleanup Process



1. **Identify all tokens for the data subject**: Query the tokenization vault for all tokens associated with the subject's identifier (e.g., all tokens created by a specific application for a specific data subject ID).

2. **Delete mapping entries**: Remove the token-to-value mapping from the vault. After deletion, the tokens become orphaned — they no longer map to any real value.

3. **Handle downstream references**: Downstream systems may still hold token references. These tokens now point to nothing. The application must handle "token not found" gracefully (return null, a default value, or an error).

4. **Audit the deletion**: Log the vault cleanup operation with full justification (GDPR Article 17 request reference, data subject ID, timestamp, number of tokens deleted).



#### §15.4.2 Vendor-Specific Considerations



- **HashiCorp Vault (Transform engine)**: Tokenization mappings are stored in Vault's storage backend. Deleting a mapping requires the `delete` capability on the `transform/role/` path. The operation is audited via Vault's audit devices (§13.5).

- **VGS**: VGS provides a data subject deletion API that removes all aliases (tokens) and their mappings for a specified data subject. The deletion is cascaded to all environments (staging, production).

- **Skyflow**: Skyflow supports data subject deletion via its REST API, which removes records from the vault and all connected downstream systems.

---

### §15.5 Practical Erasure Checklist



For organizations implementing PII encryption at the API layer, the following end-to-end erasure pipeline and checklist ensure GDPR Article 17 compliance:

```mermaid
flowchart TD
    START(["Data Subject submits<br/>erasure request"]) --> VERIFY{"Verify<br/>identity"}
    VERIFY -->|"✅ Verified"| LOCATE["Locate all PII<br/>via data catalog"]
    VERIFY -->|"❌ Rejected"| REJECT["Reject &amp; log"]
    REJECT --> STOP(["End"])

    LOCATE --> DELETE["Delete plaintext<br/>from mutable stores"]
    DELETE --> KEY_DESTROY["Destroy per-subject<br/>DEK in KMS"]
    KEY_DESTROY --> ROTATE["Rotate wrapping<br/>key version"]
    ROTATE --> VAULT["Clean tokenization<br/>vault mappings"]
    VAULT --> CACHE["Purge caches<br/>&amp; CDN"]
    CACHE --> BACKUP{"Immutable<br/>backups?"}
    BACKUP -->|"Yes"| SHRED["Crypto shredding<br/>via key version<br/>rotation"]
    BACKUP -->|"No"| DEL_BACKUP["Delete subject's<br/>ciphertext from<br/>mutable backups"]
    SHRED --> VERIFY_ERASE
    DEL_BACKUP --> VERIFY_ERASE
    VERIFY_ERASE["Verify all locations<br/>unrecoverable"]
    VERIFY_ERASE --> RESPOND["Respond to data<br/>subject within 30 days"]
```



| # | Step | Description | Responsible Team |
|:-:|:-----|:------------|:-----------------|
| 1 | **Receive erasure request** | Data subject submits request via DPA portal or customer service | Privacy / DPO |
| 2 | **Verify identity** | Confirm the requester is the data subject (or authorized representative) | Privacy / DPO |
| 3 | **Identify all PII locations** | Query data catalog for all systems, databases, backups, and logs containing the subject's PII | Data Engineering |
| 4 | **Delete plaintext copies** | Remove the subject's records from all mutable data stores | Application Engineering |
| 5 | **Destroy per-subject key** | Delete the subject's DEK from the KMS or key derivation registry | Security Engineering |
| 6 | **Rotate wrapping key** | Schedule immediate rotation of the KMS key version used to wrap the subject's DEK | Security Engineering |
| 7 | **Clean tokenization vault** | Delete the subject's token-to-value mappings from all tokenization systems | Security Engineering |
| 8 | **Purge caches and CDNs** | Invalidate any cached encrypted values at edge nodes or in-memory caches | Platform Engineering |
| 9 | **Confirm deletion** | Verify all locations have been purged (spot-check random samples) | Compliance |
| 10 | **Document and respond** | Record the erasure in the compliance register; notify the data subject within 30 days | Privacy / DPO |



**Target timeline**: Steps 1–3 within 72 hours of receiving the request. Steps 4–8 within 14 days. Step 10 within 30 days (GDPR Article 12(3) maximum).

---

### §15.6 Design Patterns for Erasure-Friendly Architecture



The best strategy for right-to-erasure compliance is not to retrofit erasure capabilities after the fact, but to design the PII protection architecture with erasure as a first-class requirement from the start. The following architectural patterns facilitate efficient, verifiable erasure.



#### §15.6.1 Per-Subject Key Isolation



The foundational design decision for erasure-friendly encryption is **per-subject key isolation**: each data subject's PII is encrypted with a key uniquely associated with that subject. The detailed key derivation and envelope encryption strategies (HKDF-SHA256 derivation, per-subject DEKs wrapped by a central KEK) are covered in §15.2 under Key Granularity Strategies, which includes the comparison table and implementation details. This section focuses on the architectural implications for erasure workflows.



The trade-off is key management overhead: a system with 10 million data subjects generates 10 million DEKs. This is manageable with a KMS that supports per-key metadata (AWS KMS allows up to 10 KB of metadata per key; for DEKs managed in a local key store with KMS-wrapped backup, the metadata can be stored externally).



#### §15.6.2 Event-Driven Erasure Propagation



When a data subject requests erasure, the erasure command should propagate through the system as an event, not as a set of point-to-point API calls. This ensures that all downstream consumers are notified, even if new consumers are added after the initial architecture is deployed.

```mermaid
flowchart LR
    REQ["Erasure<br/>Request"]
    BUS{{"Event Bus"}}
    REQ --> BUS
    BUS --> ENC["🔐 Encryption<br/>Service"]
    BUS --> VAULT["🏷️ Tokenization<br/>Vault"]
    BUS --> ANALYTICS["📊 Analytics<br/>Pipeline"]
    BUS --> BACKUP["💾 Backup<br/>Service"]
    BUS --> CACHE["🗑️ Cache<br/>Invalidation"]
    BUS --> AUDIT["📋 Audit<br/>Logger"]
```



Each consumer processes the erasure event idempotently — receiving the same event twice should not cause errors. The event payload includes: the data subject ID, the erasure request ID, the timestamp, and the scope (which data classifications should be erased). Consumers acknowledge the event; the orchestrator tracks acknowledgments and escalates any unacknowledged events.



#### §15.6.3 Cryptographic Proof of Erasure



After erasure, the controller should be able to demonstrate to a DPA or auditor that the data has been irrecoverably deleted. Crypto shredding provides a natural proof mechanism:



1. **Key destruction certificate**: When the KMS key version is destroyed, the KMS provider issues a certificate (or audit trail entry) confirming the destruction. This certificate is timestamped and signed by the KMS.

2. **Decryption attempt**: After key destruction, attempt to decrypt a sample of the "erased" ciphertext. The decryption should fail with a definitive error (`KeyNotFoundException` or similar). Log the failed decryption attempt as proof.

3. **Backup verification**: If encrypted backups exist, demonstrate that the key version needed to decrypt the erased subject's data has been destroyed. The KMS audit trail (§13.6) shows the key destruction event.



This approach provides stronger evidence of erasure than a simple `DELETE FROM database` statement, which can be rolled back from a backup. With crypto shredding, erasure is cryptographically irreversible.

---

## 16. Call-Chain Traceability

---

### §16.1 The Observability-Privacy Tension



Modern distributed systems rely on observability — logging, metrics, and distributed tracing — to diagnose performance issues, debug failures, and understand system behavior. This chapter is part of the supporting operating model: once the main architecture removes personal data from unsafe request surfaces, observability must avoid reintroducing the same data through logs, spans, and support tooling. OpenTelemetry has become the de facto standard for instrumenting services with trace context (trace ID, span ID) that propagates across service boundaries, enabling engineers to reconstruct the full call chain of a request.

In the standards synthesis of §17, this chapter represents the secondary exposure plane. An API can satisfy the primary "no sensitive data in URL channels" rule and still fail operationally if logs, traces, body capture, dashboards, or support tooling preserve the same values elsewhere.



However, observability and privacy are in fundamental tension. A distributed trace that captures every hop of a request through an API gateway, encryption service, tokenization vault, business logic service, and database may inadvertently record:



- **PII in URL parameters** (before encryption): The original request URL containing `?email=user@example.com&ssn=123-45-6789`.

- **PII in request/response bodies**: The full HTTP body before or after encryption, captured by body-logging middleware.

- **PII in span attributes**: OpenTelemetry spans can carry arbitrary key-value attributes. Engineers may add `customer.email` or `user.full_name` as span attributes for debugging convenience.

- **PII in log lines**: Structured logging frameworks that capture request context may include PII in log output, especially if the logging configuration uses JSON serialization of the request object.



This tension is particularly acute for the PII protection patterns discussed in this document. If the system encrypts PII at the API gateway (§3.2), the gateway must NOT log the pre-encryption PII. If the tokenization vault detokenizes a value for a downstream service (§5.3), the trace should capture the fact of detokenization but NOT the plaintext value.



The EDPB Guidelines 01/2025 on pseudonymization techniques acknowledge this tension and recommend that observability systems be treated as personal data processing systems in their own right — subject to the same GDPR obligations as the primary application.

**Figure 14.1: The Observability-Privacy Tension** — PII enters through the data plane (API gateway) but can leak through four observability channels in the control plane.

```mermaid
---
title: §16.1 — The Observability-Privacy Tension
config:
  themeVariables:
    fontSize: "13px"
---
flowchart TD
    Client(["`**Client**
    API Request with PII`"])

    subgraph DataPlane ["`**Data Plane**`"]
        GW["`**API Gateway**
        Encrypts PII`"]
        SVC["`**Business Service**
        Processes ciphertext`"]
        DB[("`**Database**
        Stores encrypted PII`")]
    end

    subgraph ControlPlane ["`**Control Plane — Observability**`"]
        LOGS["`**Access Logs**
        ⚠️ URL + headers`"]
        TRACES["`**Distributed Traces**
        ⚠️ Span attributes`"]
        APM["`**APM Backend**
        ⚠️ Sampled payloads`"]
        SEARCH["`**Log Aggregator**
        ⚠️ Full-text index`"]
    end

    Client -->|"`email, SSN, phone`"| GW
    GW -->|"`ciphertext forwarded`"| SVC
    SVC -->|"`store encrypted`"| DB

    GW -.->|"`pre-encryption leak`"| LOGS
    GW -.->|"`span with PII`"| TRACES
    SVC -.->|"`body sampling`"| APM
    LOGS & TRACES & APM --> SEARCH
```



#### §16.1.1 Regulatory Context



GDPR Article 5(1)(c) requires that personal data be "adequate, relevant and limited to what is necessary in relation to the purposes for which they are processed" — the data minimization principle. An OpenTelemetry trace that records a customer's SSN as a span attribute violates data minimization if the SSN is not necessary for the debugging purpose.



GDPR Article 25 requires data protection by design and by default. This means observability instrumentation should be designed from the outset to avoid capturing PII, not retroactively scrubbed.



#### §16.1.2 The Practical Impact



Organizations that implement PII encryption at the API layer often discover that their observability pipeline re-exposes the very PII they worked so hard to protect:



- **API gateway logs**: Capture the original request URL and headers before PII is extracted and encrypted.

- **Service mesh proxies** (Envoy, Istio): Capture full request/response metadata in access logs.

- **Application Performance Monitoring** (APM) tools (Datadog, New Relic, Dynatrace): Sample and store trace payloads, which may include request bodies.

- **Log aggregation** (ELK, Splunk, Loki): Index and store log lines from all services, including any PII that services log directly.



The result is a paradox: encrypting PII at the API layer provides strong protection in the data plane, but the control plane (observability) may still leak plaintext PII into logs, traces, and dashboards.

---

### §16.2 Privacy-Preserving Trace Design



The solution is to design the observability pipeline with the same rigor as the data pipeline: PII must be encrypted, redacted, or tokenized at the point of ingestion, not after the fact.



#### §16.2.1 Redaction at the Edge



The most effective strategy is to redact PII at the earliest point in the observability pipeline — the API gateway or ingress controller. Before any log line, trace span, or metric is emitted, the observability middleware scans the payload for PII patterns and replaces matches with placeholders.



```
# Before redaction
GET /api/v1/customers/jan.novak@example.com/profile HTTP/1.1
X-Customer-SSN: 123-45-6789
User-Agent: Mozilla/5.0...



# After redaction
GET /api/v1/customers/[REDACTED:email]/profile HTTP/1.1
X-Customer-SSN: [REDACTED:ssn]
User-Agent: Mozilla/5.0...

```



This is consistent with the infrastructure-level PII scanning described in §6.3, but applied to the observability pipeline rather than the data pipeline. The scanning patterns are identical: regex matching for email, SSN, phone number, national ID, and custom PII patterns defined by the organization.



#### §16.2.2 Trace Context Propagation Without PII



OpenTelemetry trace context propagates via HTTP headers (`traceparent`, `tracestate`, `baggage`). These headers should never contain PII. If the application needs to associate a trace with a specific data subject, use a pseudonymized identifier (e.g., a hashed or tokenized version of the data subject ID) in the `baggage` header — not the raw ID.



```
# Correct: pseudonymized subject ID in baggage
baggage: subject_ref=tok_a7f3e2b1c, classification=email



# Incorrect: raw subject ID in baggage
baggage: subject_id=usr_8f2a, email=jan.novak@example.com

```

**Figure 14.2: Privacy-Preserving Trace Context Propagation** — A three-phase sequence showing how PII is redacted from trace spans at the edge before propagating to downstream services.

```mermaid
---
title: §16.2 — Privacy-Preserving Trace Context Propagation
config:
  sequence:
    actorMargin: 250
  themeVariables:
    fontSize: "13px"
    noteBkgColor: "transparent"
    noteBorderColor: "transparent"
---
sequenceDiagram
    autonumber
    participant C as Client
    participant GW as API Gateway
    participant RED as Redaction Filter
    participant ENC as Encryption Svc
    participant BIZ as Business Svc
    participant OTel as OTel Collector

    rect rgba(231, 76, 60, 0.14)
    Note right of C: Request carries raw PII
    C->>GW: GET /customers/user@example.com
        Note right of OTel: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end

    rect rgba(241, 196, 15, 0.14)
    Note right of GW: PII detected, span created
    GW->>RED: Span { http.url: /customers/user@example.com }
    RED-->>RED: Scan attributes → match email pattern
    RED-->>GW: Span { http.url: /customers/[REDACTED:email] }
        Note right of OTel: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end

    rect rgba(46, 204, 113, 0.14)
    Note right of GW: PII encrypted, trace safe
    GW->>ENC: Encrypt user@example.com → eyJhbGci...
    ENC-->>GW: ciphertext
    GW->>BIZ: GET /customers/eyJhbGci... (traceparent + subject_ref)
    BIZ->>OTel: Span { subject_ref: tok_a7f3, operation: read }
        Note right of OTel: ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    end

    Note over OTel: No PII in trace backend ✓
```

#### §16.2.3 Walkthrough

<details><summary><strong>1. Client sends request with raw PII in URL path</strong></summary>

The client initiates a `GET /customers/user@example.com` request, embedding a plaintext email address directly into the URL path segment. This is a common REST API pattern where resource identifiers double as human-readable lookup keys — but it creates a PII exposure risk for any observability system that captures the full URL. At this stage, no tracing context has been created yet; the request is a bare HTTP call carrying raw personally identifiable information in a header-visible, log-visible location. The API Gateway is the first component that will intercept this request and begin both routing and observability processing.

</details>

<details><summary><strong>2. API Gateway creates OpenTelemetry span and passes to Redaction Filter</strong></summary>

Upon receiving the inbound request, the API Gateway creates an OpenTelemetry span capturing the full request metadata — including `http.url`, `http.method`, and `http.host` attributes. Before this span propagates to any downstream collector or backend, the Gateway routes it through the Redaction Filter, which acts as a middleware-level sanitization gate. The span at this point still contains the raw PII: `{ "http.url": "/customers/user@example.com" }`. The Gateway does not forward the span to the OTel Collector directly; instead, it ensures every span passes through the Redaction Filter first, establishing a guarantee that no unredacted attribute ever leaves the edge.

</details>

<details><summary><strong>3. Redaction Filter scans span attributes and detects email pattern</strong></summary>

The Redaction Filter iterates over every key-value pair in the span's attribute map and evaluates each value against a library of PII detection patterns. For the `http.url` attribute containing `/customers/user@example.com`, the email regex matches:

```
[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}
```

This pattern detects standard RFC 5322 email addresses embedded in URL segments. The filter flags the match, records the attribute key (`http.url`), the matched substring (`user@example.com`), and the PII classification (`email`) so the downstream replacement step can produce an accurate redaction placeholder. Additional patterns for phone numbers, SSNs, and national identifiers run in parallel during the same scan pass.

</details>

<details><summary><strong>4. Redaction Filter replaces PII with redaction placeholder in span</strong></summary>

Once the PII match is confirmed, the Redaction Filter performs an in-place substitution on the span attribute. The original value `/customers/user@example.com` is rewritten to `/customers/[REDACTED:email]`, preserving the URL structure and path semantics while replacing the sensitive identifier with a typed placeholder. This placeholder syntax (`[REDACTED:<type>]`) enables downstream tooling to understand what was removed without revealing the actual value. The span is then returned to the API Gateway with all attributes sanitized — ready for safe emission to any observability backend without PII leakage.

</details>

<details><summary><strong>5. API Gateway sends PII to Encryption Service</strong></summary>

Having sanitized the trace span, the API Gateway still needs to route the actual request to the correct downstream service. To avoid sending raw PII in the URL, the Gateway extracts the detected email address and forwards it to the Encryption Service, requesting a ciphertext token that can serve as a non-reversible, non-sensitive surrogate identifier. The encryption request payload follows the standard format:

```json
{
  "plaintext": "user@example.com",
  "pii_type": "email",
  "key_id": "kek-prod-2026-q2",
  "algorithm": "AES-256-GCM",
  "ttl_seconds": 3600
}
```

The `key_id` references the current Key Encryption Key (KEK) version, enabling key rotation without service disruption. The `ttl_seconds` field ensures the ciphertext has a bounded validity window, after which the surrogate expires and the downstream service must request re-encryption.

</details>

<details><summary><strong>6. Encryption Service encrypts PII and returns ciphertext</strong></summary>

The Encryption Service generates a random 96-bit IV, encrypts the plaintext email using the specified `AES-256-GCM` algorithm with the identified KEK, and returns a base64url-encoded ciphertext token (e.g., `eyJhbGciOiJBMTI4R0NNIiwiaXYiOi...`). This token is opaque to any system that lacks access to the corresponding decryption key. The Encryption Service also records an audit log entry noting the encryption operation, the requesting service identity, and the KEK version used — but never logs the plaintext value itself. The returned ciphertext serves as the canonical identifier for all downstream routing and storage operations.

</details>

<details><summary><strong>7. API Gateway forwards request with encrypted identifier to Business Service</strong></summary>

The API Gateway rewrites the original URL, replacing the raw email with the ciphertext token: `GET /customers/eyJhbGci...`. It also injects two additional headers into the forwarded request: the W3C `traceparent` header (carrying the trace context for distributed correlation) and a custom `subject_ref` header containing a short-lived reference token (`tok_a7f3`) that the Business Service can use to request re-identification through a separate authorization-gated flow if needed. The forwarded request now carries no raw PII — the URL, headers, and trace context are all PII-free, ensuring that any intermediary proxy, load balancer, or log sink between the Gateway and the Business Service is never exposed to the original email.

</details>

<details><summary><strong>8. Business Service processes request and emits PII-free span to OTel Collector</strong></summary>

The Business Service handles the read operation using the encrypted customer identifier, then emits its own OpenTelemetry span to the OTel Collector. The span attributes contain only non-sensitive surrogate identifiers — no email address, no personal data:

```json
{
  "service.name": "customer-svc",
  "subject_ref": "tok_a7f3",
  "operation": "read",
  "http.url": "/customers/[REDACTED:email]",
  "encryption.key_id": "kek-prod-2026-q2",
  "encryption.algorithm": "AES-256-GCM"
}
```

The OTel Collector receives this span and exports it to the trace backend (Jaeger, Tempo, or similar) without any additional redaction required. The `Note over OTel: No PII in trace backend ✓` confirms the end-to-end invariant: at no point in the observability pipeline — from span creation at the edge, through the collector, to long-term storage — does any PII appear in plain text. The trace is fully useful for debugging and performance analysis while remaining privacy-compliant.

</details>

#### §16.2.4 Span Attribute Sanitization



OpenTelemetry spans support two types of data:



| Type | Purpose | PII Risk |
|:-----|:--------|:---------|
| **Span attributes** | Key-value metadata attached to the span | 🔴 High — often includes request parameters, user identifiers |
| **Span events** | Timestamped log-like entries within the span | 🔴 High — often includes error details with request context |
| **Span links** | References to related spans in other traces | 🟢 Low — typically only trace/span IDs |



The following span attributes should always be sanitized:



- `http.request.header.*`: HTTP request headers may contain PII in custom headers (e.g., `X-Customer-Email`).

- `http.request.body.*`: Request body content, if captured by body-logging middleware.

- `http.response.body.*`: Response body content.

- `user.id`, `customer.id`: Replace with a pseudonymized version.

- `db.statement`: SQL queries that include PII as literal values (e.g., `WHERE email = 'jan.novak@example.com'`).



OpenTelemetry provides a `SpanProcessor` interface that can intercept and sanitize span data before export. A `PIISanitizingSpanProcessor` implementation:



1. Intercepts each span before it is exported to the backend.

2. Scans all attributes and events against PII patterns.

3. Replaces matches with `[REDACTED:type]`.

4. Logs the redaction event (without the PII value) for audit purposes.



This approach is more reliable than relying on individual service developers to avoid logging PII — it enforces sanitization centrally, at the SDK level.



#### §16.2.5 Redacting vs. Tokenizing Observability Data



| Approach | Pros | Cons |
|:---------|:-----|:-----|
| **Redaction** (replace PII with `[REDACTED]`) | Simple to implement; no additional infrastructure; irreversible (no PII in observability pipeline) | Loses analytical value — cannot correlate traces across data subjects or debug data-subject-specific issues |
| **Tokenization** (replace PII with token) | Preserves correlation — the same PII always maps to the same token, enabling trace correlation across services; tokens can be detokenized in a controlled environment for debugging | Requires tokenization vault integration in the observability pipeline; tokens are still linkable (privacy concern under GDPR if they function as identifiers) |
| **Hashing** (replace PII with SHA-256 hash) | Stateless — no vault required; deterministic — same input always produces the same hash; irreversible if the hash function is one-way | Not searchable (cannot look up all traces for a specific data subject without computing the hash first); rainbow table attacks if the PII value space is small (e.g., SSN) |



**Recommendation**: Use **redaction** as the default for all observability pipelines. Use **tokenization** only when there is a demonstrated operational need for trace correlation across data subjects (e.g., fraud investigation) and the tokenization vault's access controls (§14.2) are sufficient to prevent unauthorized detokenization.

---

### §16.3 Correlation ID Strategies



A correlation ID (also called a trace ID in OpenTelemetry) is the fundamental mechanism for linking related operations across service boundaries. In the context of PII protection, the correlation ID strategy determines how an organization can trace a data subject's journey through the system without recording their actual PII.



#### §16.3.1 Pseudonymized Subject References



Instead of using the data subject's actual identifier (email, national ID, phone number) as a correlation key, use a pseudonymized reference that is:



1. **Deterministic**: The same data subject always maps to the same pseudonym, enabling consistent correlation.

2. **Unidirectional**: The pseudonym cannot be reversed to reveal the real identifier without access to the mapping.

3. **Scoped**: The pseudonym is valid only within a specific context (e.g., a specific API version, a specific deployment environment) to prevent cross-context linkage.



Implementation: `subject_ref = HMAC-SHA256(context_key, real_identifier)`, where `context_key` is a secret known only to the correlation service.



#### §16.3.2 Request-Level Correlation



Each API request is assigned a unique request ID at the API gateway. This ID propagates through the entire call chain via the `traceparent` header. When a data subject's PII is encrypted at the gateway, the mapping from request ID to the original PII is stored in a temporary, access-controlled buffer that expires after a configurable TTL (e.g., 5 minutes).



```
API Gateway:
  Request received: GET /customers/jan.novak@example.com
  → Assigns request_id: req_8f2a3b1c
  → Encrypts PII: jan.novak@example.com → eyJhbGci...
  → Forwards: GET /customers/eyJhbGci... (with traceparent: 00-8f2a3b1c...)
  → Stores mapping: req_8f2a3b1c → {email: jan.novak@example.com} (TTL: 5 min)



Downstream Services:
  → See only: GET /customers/eyJhbGci... (traceparent: 00-8f2a3b1c...)
  → Log: "Request req_8f2a3b1c processed successfully" (no PII)



Debugging (authorized):
  → Security team queries: "Show original PII for req_8f2a3b1c"
  → Gateway returns: {email: jan.novak@example.com} (if within TTL)
  → Audit logged: "PII retrieval for req_8f2a3b1c by security-team"

```



This approach provides the best of both worlds: downstream services never see plaintext PII, but authorized personnel can reconstruct the original request for debugging — with full audit logging of the reconstruction.



#### §16.3.3 Cross-System Correlation for Regulatory Inquiries



When a DPA or internal auditor requests a complete record of all processing activities for a specific data subject (GDPR Article 15 — right of access), the organization must be able to trace every system that processed that subject's data. This requires:



1. **Data subject index**: A centralized index that maps each data subject's pseudonymized reference to the list of systems that processed their data. The index does not contain PII — only pseudonyms and system references.

2. **System-specific audit queries**: Each system is queried using the pseudonymized reference to retrieve the relevant log entries and trace spans.

3. **Aggregate report**: The results from all systems are compiled into a comprehensive report, which is reviewed by the DPO before being provided to the data subject or regulator.

---

### §16.4 GDPR-Compliant Observability Stack



Building a GDPR-compliant observability stack for a system that encrypts PII at the API layer requires modifications to the standard observability architecture at three levels: collection, processing, and storage.

**Figure 14.3: GDPR-Compliant Observability Stack** — Three-layer pipeline from PII-aware collection through DLP scanning to retention-governed storage.

```mermaid
---
title: §16.4 — GDPR-Compliant Observability Stack
config:
  themeVariables:
    fontSize: "13px"
---
flowchart TD
    subgraph Collection ["`**Collection Layer**`"]
        direction LR
        SDK["`**OTel SDK**
        + PIISanitizingProcessor`"]
        LOG["`**Log Framework**
        + PII filter`"]
        GWF["`**Gateway Filter**
        Redact access logs`"]
    end

    subgraph Processing ["`**Processing Layer**`"]
        direction LR
        DLP["`**DLP Scanner**
        Regex + ML patterns`"]
        ENRICH["`**Attribute Enricher**
        classification, env`"]
    end

    subgraph Storage ["`**Storage Layer**`"]
        direction LR
        TRACE_BK["`**Trace Backend**
        Retention: 30 days`"]
        LOG_BK["`**Log Aggregator**
        Field-level ACL`"]
        AUDIT_BK["`**Audit Store**
        Retention: 1 year`"]
    end

    APP(["`**Application
    Services`"])

    APP --> SDK & LOG & GWF
    SDK & LOG & GWF --> DLP
    DLP --> ENRICH
    ENRICH --> TRACE_BK & LOG_BK & AUDIT_BK
```



#### §16.4.1 Collection Layer (Instrumentation)



- **OpenTelemetry SDK with PII-aware processor**: As described in §16.2, the SDK-level span processor sanitizes attributes and events before export.

- **Log framework configuration**: Configure structured logging frameworks (SLF4J, Python `structlog`, Go `zap`) with a PII filter that redacts values matching defined patterns.

- **API gateway log filter**: Configure the API gateway (Kong, AWS API Gateway, Envoy) to redact PII from access logs before forwarding to the log aggregator.



#### §16.4.2 Processing Layer (Pipeline)



- **PII detection pipeline**: A dedicated pipeline stage that scans all incoming log lines and trace spans for PII patterns. Tools: Google Cloud DLP API (§9.1), Azure Information Protection, or open-source regex-based scanners.

- **Attribute enrichment**: After redaction, enrich spans with metadata that is useful for debugging but not privacy-sensitive: service version, deployment environment, data classification (e.g., `classification: email` without the actual email), and error codes.



#### §16.4.3 Storage Layer (Backend)



- **Retention policies**: Observability data containing PII (even redacted PII) should have shorter retention periods than infrastructure observability data. A typical policy: 30 days for application logs/traces, 90 days for infrastructure metrics, 1 year for security audit logs (§11.2).

- **Access control**: Observability backends should enforce role-based access. Engineering teams can view aggregated metrics and anonymized traces; only security and compliance teams can access the PII lookup buffer (§16.3) for authorized debugging.

- **Data residency**: Ensure that observability data is stored within the same jurisdiction as the primary data. If the organization uses a US-based APM tool (Datadog, New Relic) but processes EU data subjects' PII, the observability data may be subject to GDPR cross-border transfer restrictions (Chapter V, Articles 44–49).



#### §16.4.4 Tool-Specific Considerations



| Tool | PII Risk | Mitigation |
|:-----|:---------|:-----------|
| **Datadog** | APM traces capture request headers and bodies by default | Configure trace scrubbing rules; use the `DD_TRACE_OBFUSCATION_QUERY_STRING_REGEXP` and `DD_TRACE_OBFUSCATION_HEADER_REGEXP` environment variables |
| **New Relic** | Log ingestion captures full log lines including PII | Use New Relic's log obfuscation feature; configure drop rules for high-sensitivity PII fields |
| **Splunk** | Indexes all ingested data, including PII in logs | Use Splunk's `props.conf` SEDCMD to redact PII at index time; configure sensitive data masking |
| **Grafana Loki** | Label-based indexing; full log content stored | Use Grafana's log pipeline processors (regex, JSON, structured metadata) to redact PII before storage |
| **Elasticsearch** | Full-text search indexes all fields, making redacted data searchable | Use Elasticsearch's ingest pipelines to redact PII before indexing; configure field-level security to restrict access |

---

### §16.5 Data Subject Access Request (DSAR) Trace Reconstruction



GDPR Article 15 gives data subjects the right to obtain confirmation of whether their personal data is being processed, and if so, access to that data and supplementary information (purposes, categories, recipients, retention periods). In a distributed system where PII is encrypted at the API gateway and propagated as ciphertext, fulfilling a DSAR requires reconstructing the data subject's journey through the system from observability data.



#### §16.5.1 Reconstruction Process



1. **Identify the data subject's correlation references**: Query the pseudonymized subject index (§16.3) to obtain all correlation IDs and pseudonymized references associated with the data subject.

2. **Query observability backends**: For each correlation ID, retrieve the corresponding trace spans and log entries from the observability pipeline. Because PII is redacted at the edge, these traces show the *processing* of the data subject's information without revealing the information itself.

3. **Reconstruct from encrypted stores**: For the data content itself, query the application databases using the pseudonymized reference. Decrypt the retrieved values through the centralized decryption service (§14.3) with an audit-logged DSAR justification.

4. **Compile the DSAR response**: Combine the processing history (from observability) with the data content (from decrypted stores) into a comprehensive response.

**Figure 14.4: DSAR Trace Reconstruction Workflow** — Six-step process from DSAR receipt through pseudonym lookup, trace querying, store decryption, report compilation, DPO review, to response delivery.

```mermaid
---
title: §16.5 — DSAR Trace Reconstruction Workflow
config:
  themeVariables:
    fontSize: "13px"
---
flowchart TD
    DSAR["`**DSAR Received**
    Data subject requests
    Art.15 access`"]

    LOOKUP["`**Step 1: Pseudonym Lookup**
    Query subject index →
    subject_ref = tok_a7f3e2b1c`"]

    TRACE_Q["`**Step 2: Query Traces**
    All spans where
    subject_ref = tok_a7f3`"]

    DB_Q["`**Step 3: Decrypt Stores**
    Query DB with pseudonym →
    Decrypt via key service
    (audit-logged)`"]

    COMPILE["`**Step 4: Compile Report**
    Processing timeline
    + decrypted content`"]

    REVIEW["`**DPO Review**
    Verify completeness,
    redact third-party data`"]

    RESP["`**DSAR Response
    Delivered**`"]

    DSAR --> LOOKUP --> TRACE_Q --> DB_Q --> COMPILE --> REVIEW --> RESP
```



#### §16.5.2 Automation with OpenTelemetry



OpenTelemetry's trace archive can serve as the foundation for DSAR trace reconstruction. The key requirement is that every operation involving a data subject's data is associated with the data subject's pseudonymized reference in the trace context:



```
Span: API Gateway receives request
  Attributes:
    subject_ref: tok_a7f3e2b1c          ← pseudonymized reference
    classification: email, national_id    ← data types processed
    operation: encrypt                    ← what was done
    result: success



Span: Encryption Service processes
  Attributes:
    subject_ref: tok_a7f3e2b1c
    key_id: key/prod/pii-v2/2026-01
    algorithm: aes-256-gcm
    result: success



Span: Business Logic Service stores encrypted record
  Attributes:
    subject_ref: tok_a7f3e2b1c
    table: customers
    columns_encrypted: email, full_name, phone
    result: success

```



When a DSAR is received, the DPO queries the trace backend for all spans with `subject_ref = tok_a7f3e2b1c` and receives a complete timeline of every operation performed on the data subject's data. This timeline, combined with the decrypted data content, constitutes a comprehensive DSAR response.



#### §16.5.3 Compliance Benefits



This approach provides several compliance advantages:



- **Processing transparency**: The data subject can see exactly what operations were performed on their data (encryption, storage, transmission to third parties), not just the data itself.

- **Automated DSAR fulfillment**: With a well-instrumented observability pipeline, the DSAR reconstruction process can be largely automated, reducing the response time from weeks to hours.

- **Audit trail for DPAs**: If a DPA questions the organization's data processing practices, the trace archive provides verifiable evidence of what was processed, when, and by whom — without exposing the data subject's actual PII in the archive.


# Part VI: Synthesis

---

## 17. OWASP, ASVS, and CWE Synthesis

This document already established the regulatory and standards baseline in §2.5. This chapter does something narrower and more operational: it translates that baseline into a practical control map for the rest of the document. The core point is that personal data in URL paths and query parameters is not only a privacy-design mistake. It is also a recognized application-security weakness with a direct CWE classification, a clear OWASP ASVS expectation, and adjacent connections to broader API-security design problems.

---

### §17.1 Primary Vulnerability Class: Sensitive Data in URL Channels

The most direct standards signal is still the same one introduced earlier: **CWE-598** formally classifies the use of sensitive query strings in GET requests as a vulnerability, and **OWASP ASVS V9.3** requires sensitive data to travel in the message body or headers rather than in URL parameters. Those references do not replace the GDPR analysis in §2, but they do matter because they frame the issue as a recognizable security defect rather than a merely stylistic API preference.

The exact wording of CWE-598 is query-string specific, but the operational exposure model is broader than query strings alone. Path segments, query parameters, and other request-target elements share the same basic failure mode whenever they are logged, cached, indexed, propagated by intermediaries, or copied into support tooling. In other words, the standards vocabulary is narrow at the edge, while the real engineering problem is the entire **URL channel**.

| Exposure pattern | Standards signal | Practical meaning | Main document response |
|:-----------------|:-----------------|:------------------|:-----------------------|
| Sensitive email, phone, or national ID in query parameters | CWE-598; OWASP ASVS V9.3 | Recognized vulnerability, not just poor API taste | §3.1, §3.3, §7.2, §9 |
| Sensitive identifier embedded in path segments | Same exposure model, even if not named verbatim by CWE-598 | Same logging, caching, and propagation risk as query strings | §1.2, §3, §6, §9 |
| "HTTPS is enough" reasoning | OWASP guidance rejects that assumption | Transport confidentiality does not prevent server-side persistence and re-exposure | §1.2, §2.5.3, §6, §16 |

---

### §17.2 Control Mapping Across the Document

The standards do not tell an organization which exact vendor, cryptographic primitive, or migration sequence to choose. They do, however, define the baseline failure to avoid. The document's structure can therefore be read as a control map from standard requirement to implementable answer:

| Standards concern | What the standard is really demanding | Main answer in this document | Where it is enforced or sustained |
|:------------------|:--------------------------------------|:-----------------------------|:----------------------------------|
| ASVS V9.3: keep sensitive data out of URL parameters | Change the contract so sensitive data does not travel in the request target | Architectural patterns such as POST-body lookup, opaque IDs, and single-use tokens | §3, §7, §9 |
| CWE-598: remove sensitive query-string exposure | Retire endpoints that already instantiate the weakness | Inventory, replacement contract, dual-path rollout, and legacy cleanup | §9 |
| Secondary exposure through logs, traces, and caches | Prevent the same value from reappearing after the contract is fixed | Redaction, cache discipline, trace-safe identifiers, and observability design | §6, §16 |
| Reversible protection remains governable personal-data processing | Ensure decryption, detokenization, and key access are policy-bound and auditable | Audit trails, centralized decryption authority, key governance, and erasure design | §13, §14, §15 |

The practical implication is simple: the standards baseline is satisfied primarily by the **front half** of the document, while the **back half** makes the chosen answer governable, migratable, and operable at scale.

---

### §17.3 Adjacent API Security Concerns

PII-bearing URLs often coexist with broader API-security weaknesses, even when they are not identical to them. The most important adjacent issue in this document is identifier design.

When an API uses human-readable or predictable resource identifiers, two problems tend to appear together:

1. The identifier may itself be personal data, creating the URL-channel problem discussed throughout this document.
2. The identifier may also become an insecure authorization anchor, which moves the design toward classic IDOR and the OWASP API Security Top 10's **Broken Object Level Authorization (API1:2023)** pattern.

Opaque internal identifiers (§3.3) therefore do more than remove personal data from the URL. They also reduce the likelihood that routing, authorization, and external contract shape collapse onto the same guessable or human-meaningful value.

| Adjacent concern | Why it appears next to PII-in-URL problems | Main document response |
|:-----------------|:-------------------------------------------|:-----------------------|
| Predictable or meaningful object identifiers | Human-readable identifiers often become both privacy leak surfaces and authorization anchors | §3.3 Opaque IDs; strong object-level authorization |
| Runtime and support-system exposure | Teams remove PII from the endpoint contract but keep full URLs in logs, traces, dashboards, and tickets | §6, §13, §16 |
| Legacy endpoint drift | Known-unsafe endpoints remain in production because migration ownership is unclear | §7.4, §9 |

The point is not to over-claim that every PII-in-URL issue is automatically an OWASP API Top 10 issue of some other category. The point is that the same design habits that create URL-borne personal data also tend to create adjacent security weaknesses.

---

### §17.4 Operationalizing the Standards Mapping

The standards are most useful when they become a repeatable review model rather than a citation list. In practice, teams should operationalize them in four places:

1. **Design review**: ask whether an endpoint would place a direct or linkable identifier into the request target and therefore recreate the CWE-598 exposure model or conflict with ASVS V9.3.
2. **Contract linting and CI policy**: fail builds when OpenAPI contracts introduce direct identifiers in path or query parameters without an approved exception.
3. **Migration governance**: track live endpoints that already violate the rule as an explicit remediation program with owners, dates, and sunset evidence.
4. **Observability and audit review**: verify that the post-fix system does not reintroduce the same data into logs, traces, dashboards, or decryption workflows.

Used this way, OWASP ASVS, CWE-598, and adjacent API-security guidance do not sit off to the side as background reading. They become the security shorthand for why the architectural, migration, governance, and observability choices in the rest of the document are necessary.

---

## 18. Findings

---

### F1. The default answer is architectural removal of PII from URLs, not harder protection of bad URLs

The document's center of gravity remains the same after the restructuring: the strongest answer is to stop placing personal data in path segments and query parameters in the first place. TLS does not solve the persistence and propagation problem because the exposed value still lands in logs, browser history, tracing, analytics, support tooling, and intermediary infrastructure (§1, §6, §16). The combination of the exposure-surface model (§1), the regulatory baseline (§2), and the architectural pattern analysis (§3) supports a simple conclusion: **design out the bad identifier surface before reaching for compensating controls**.

---

### F2. Opaque IDs, POST-body lookup, and single-use tokens cover most primary remediation needs

The core pattern set in §3 is not just one menu among many; it is the main answer for most real API designs. Opaque Internal Identifiers (§3.3) are the clean default for durable resources, POST-body lookup (§3.1) is the main remediation for "lookup by personal data" workflows, and Single-Use Tokens (§3.5) are the right fit for bounded link distribution. The further the design stays inside those three patterns, the less it depends on downstream complexity in cryptography, governance, and vendor tooling.

---

### F3. Migration is a first-class architecture problem, not a cleanup appendix

The moved migration chapter (§9) makes the operational reality explicit: most organizations discover URL-borne PII in live systems, not greenfield designs. The hard problem is therefore not merely selecting the right target pattern, but inventorying current exposure, measuring consumer dependency, introducing replacement contracts, running dual-path transitions, and cleaning historical observability residue. A document about this topic is incomplete if it explains the target state but treats live remediation as secondary.

---

### F4. Protocol and deployment mechanisms are bounded adjacent controls, not the main solution

HTTP Message Signing, mTLS, and PAR matter, but only inside specific threat models (§8). They help with integrity, caller identity, and OAuth redirect confidentiality; they do not replace the need to remove business PII from general-purpose API resource paths and query strings. The document is strongest when these mechanisms are presented as contextual controls that complement the architecture rather than compete with it.

---

### F5. Cryptographic and tokenization patterns are mainly compatibility tools once the architecture is constrained

Chapter 4 and §5 show that JWE, FPE, deterministic encryption, vaulted tokenization, and vaultless tokenization are valuable, but usually because legacy systems, schema stability, external dependencies, or integration contracts make cleaner designs harder. They are not equivalent substitutes for simply not exposing personal data in URLs. In particular, FPE remains architecturally attractive for compatibility but should be treated cautiously and selectively because of its narrower security margin and tighter algorithmic constraints (§4.2.7).

---

### F6. Pseudonymization and encryption remain fully inside the GDPR problem space

The regulatory sections (§2.3–§2.4) and the pseudonymization chapters (§5) establish a non-negotiable point: pseudonymised and encrypted values remain personal data when re-identification remains possible. That means tokenization, vaultless tokenization, deterministic encryption, and related patterns reduce risk but do not eliminate duties around minimisation, retention, erasure, auditability, or data-subject rights. Any architecture that treats tokenization as a scope-exit from GDPR is conceptually wrong.

---

### F7. Vendor and cloud platforms accelerate implementation, but they do not decide the architecture

The vendor/platform chapters (§10–§11) are useful only after the primary design choice is made. Enterprise tokenization vendors, cloud-native services, and gateway-centric offerings provide useful implementation building blocks, but they cannot rescue a weak resource model by themselves. Their main value is in operational acceleration: managed key handling, transformation services, audit surfaces, compliance reporting, and integration speed. Their main downside is dependency concentration, especially around token mappings, proprietary workflows, and key-management lock-in.

---

### F8. Build-vs-buy is usually a downstream hybrid decision rather than a binary ideology

Chapter 12 is strongest when read as an implementation decision after the core pattern choice, not as a philosophical argument about vendor purity. For many teams, the practical equilibrium is hybrid: keep the application-layer contract and migration logic under internal control while delegating key storage, transformation backends, or selected control-plane functions to managed systems. This is less about product preference than about locating which parts of the problem are actually differentiating and which parts are expensive undifferentiated security plumbing.

---

### F9. Once decryption exists, centralized authority, auditability, and key lifecycle become the real trust boundary

The most consequential downstream operating-model decision is not which vendor logo appears in the stack, but whether decryption is centralized, policy-bound, and fully auditable (§13–§14). Centralized decryption authority (§14.3), separation of duties (§14.2), complete crypto-operation audit trails (§13.1–§13.5), and a coherent key lifecycle (§14.1, §14.6) determine whether the system behaves like a governable architecture or a scattered set of silent plaintext escape hatches.

---

### F10. Observability is a parallel exposure plane that can silently undo the main design

The moved traceability chapter (§16) makes clear that PII protection succeeds or fails twice: once in the data path, and again in the observability path. Teams often fix the request contract but keep leaking the same data through access logs, span attributes, body capture, dashboards, and search indexes. This makes observability redaction, pseudonymized correlation, retention control, and DSAR-aware trace design part of the core answer rather than an afterthought.

---

### F11. Erasure capability depends on key and token lifecycle design, not on policy statements

The erasure chapter (§15) demonstrates that Article 17 feasibility is an architectural property, not a governance aspiration. Crypto shredding only works when key granularity supports it. Tokenization cleanup only works when mapping deletion is a real operation. Backup and WORM constraints only become manageable when the encryption and retention design anticipated them. The teams that struggle most with erasure are usually the ones that adopted encryption or tokenization without designing the lifecycle consequences.

---

### F12. Break-glass and exceptional access paths must be designed as part of the system, not bolted on later

Emergency access is where many otherwise disciplined architectures become incoherent. If break-glass decryption is improvised, the entire governance model collapses into standing exceptions and undocumented plaintext access. If it is designed with explicit approval flow, time bounds, enhanced logging, and post-event review (§14.4), it becomes a controlled exception path that strengthens rather than undermines the trust model.

---

## 19. Recommendations

---

### For API Architects and Developers


**R1. Make "no personal data in URLs" the default contract rule for new APIs.**

Use Opaque Internal Identifiers (§3.3) as the baseline for resource addressing, use POST-body lookup (§3.1) when callers must submit personal data to search or verify, and use Single-Use Tokens (§3.5) for bounded shared-link workflows. Treat anything else as an exception that needs explicit justification.

**R2. Treat migration as a planned product change, not an implementation footnote.**

For existing APIs, follow the migration sequence in §9: inventory the exposure, measure real consumer dependency, introduce a replacement contract, run a dual-path period, publish deprecation and sunset signals, and clean historical telemetry. Do not leave legacy URL forms in place indefinitely because the migration feels inconvenient.

**R3. Use protocol mechanisms only where the problem is genuinely protocol-specific.**

Apply HTTP Message Signing, mTLS, and PAR where they address bounded issues such as integrity, workload identity, or OAuth redirect confidentiality (§8). Do not use them as rhetorical substitutes for fixing the resource model itself.

**R4. Prefer cleaner contracts over cryptographic cleverness unless compatibility forces otherwise.**

Use JWE, tokenization, deterministic encryption, or FPE when schema stability, external contracts, or legacy integration truly require them (§4–§5). When a cleaner contract is available, choose the cleaner contract.

---

### For Security Engineers


**R5. Make centralized decryption authority the default whenever reversible protection exists.**

Keep decrypt capability inside explicitly designated components (§14.3), enforce separation of duties (§14.2), and design all other services around the assumption that they handle references, ciphertext, or tokens rather than plaintext.

**R6. Treat cryptographic audit trails as a required system, not optional logging.**

Log every encrypt, decrypt, tokenize, detokenize, key, and exception event with the minimum fields from §13.1. Feed those events into alerting and review flows (§13.4), and design for integrity and immutability rather than assuming the logging substrate is trustworthy by default.

**R7. Secure the observability plane with the same rigor as the data plane.**

Redact or pseudonymize at the edge, sanitize span attributes, constrain retention, and preserve traceability without preserving plaintext (§16). If tracing and logs can still expose the subject, the architecture is only partially fixed.

**R8. Use managed KMS by default, but design the key lifecycle and break-glass path explicitly.**

Managed KMS is the practical starting point for most workloads (§14.5–§14.6), but the real design work is in rotation, scope separation, approval paths, emergency access, and audit review (§14.1, §14.4).

---

### For Compliance Officers and Data Protection Officers


**R9. Treat pseudonymized and encrypted values as personal data throughout the control framework.**

> **Important — Protected Values Remain Personal Data**
>
> Do not allow tokenization, FPE, or deterministic encryption to be described internally as if they move the data outside the GDPR problem space (§2.4, §5). DPIAs, RoPAs, retention rules, transfer analysis, and processor oversight should all continue to apply.

**R10. Require credible erasure and DSAR mechanics before approving a design.**

Approval should depend on whether the architecture can actually execute deletion, proof of deletion, and traceable access reconstruction (§15, §16.5), not on whether it claims to "support GDPR" in abstract terms.

**R11. Make migration evidence part of the compliance story for legacy APIs.**

For existing endpoints, require an inventory, successor contract, sunset timeline, and evidence that new leakage has stopped (§9). The compliance answer for legacy URL-borne PII cannot simply be "we plan to fix it later."

**R12. Ask whether downstream controls reinforce the main architecture or merely compensate for it.**

Audit, key management, vendor controls, and governance are valuable only if they reinforce the primary remediation path. If those controls are compensating for a still-bad contract surface, the design remains weak.

---

### For Engineering Leadership


**R13. Fund migration as real program work, not as backlog residue.**

The organization needs explicit ownership, rollout metrics, consumer communication, and deprecation governance for legacy APIs (§9). Without that, the document's architectural conclusions stay academically correct but operationally inert.

**R14. Default to hybrid build-vs-buy unless there is a strong reason not to.**

Keep control over the API contract, migration logic, and organization-specific policy surface while buying or delegating the most expensive undifferentiated security plumbing where it makes sense (§12). Pure build and pure buy are both edge positions more often than they are the practical center.

**R15. Budget for the full operating model, not just the transformation primitive.**

The real cost includes migration, gateway changes, observability hardening, audit infrastructure, key lifecycle work, exception handling, and developer enablement, not just "the encryption part" or "the tokenization SKU" (§12.5, §13, §14, §16).

**R16. Make the secure pattern easier than the insecure one for delivery teams.**

Provide reference middleware, design-time linting, CI checks, SDK examples, and platform conventions that push teams toward opaque IDs, POST lookup, safe tracing, and approved cryptographic patterns (§6, §7). If the path of least resistance is still the unsafe design, the organization has not operationalized the conclusion.

---

## 20. Open Questions

---

### Q1. How will post-quantum cryptography affect PII protection at the API layer?

NIST finalized its first post-quantum cryptographic standards in 2024 (FIPS 203 for ML-KEM, FIPS 204 for ML-DSA, FIPS 205 for SLH-DSA). However, these standards address key encapsulation and digital signatures — not the symmetric encryption algorithms (AES-256, ChaCha20) used for PII encryption at the API layer. AES-256 is believed to be quantum-resistant (Grover's algorithm provides at most a quadratic speedup, effectively reducing AES-256 to AES-128 security). The open question is whether organizations should begin hybrid classical/post-quantum key encapsulation for envelope encryption today, and how this affects the key management architecture described in §14.1.

---

### Q2. What is the DPA enforcement trajectory for PII in URLs?

As of 2026, no European Data Protection Authority has issued an enforcement action specifically targeting PII in REST API URLs. The regulatory analysis in §2 establishes that the practice is difficult to reconcile with Article 32, but enforcement is driven by complaints and audits, not by theoretical non-compliance. The open question is whether a high-profile data breach traced to PII exposure through server logs or Referer headers will trigger DPA enforcement — and whether such enforcement would establish a de facto standard that all API operators must follow.

---

### Q3. Can FPE achieve broader industry adoption despite its known weaknesses?

Format-Preserving Encryption (§4.2) is architecturally attractive but carries known cryptographic weaknesses (FF1's 10-round Feistel structure) and limited algorithmic diversity (essentially one NIST standard with two variants). The open question is whether the practical benefits of format preservation (zero schema changes, transparent legacy integration) will drive adoption despite the cryptographic caveats — and whether alternative approaches (deterministic AES with base64url encoding, §4.3) will prove more pragmatic in practice.

---

### Q4. How should tokenization mapping tables be handled under cross-border data transfers?

GDPR Chapter V (Articles 44–49) restricts transfers of personal data to third countries. Tokenization is often cited as a transfer safeguard: if PII is tokenized in the EU and only tokens are transferred to a US processor, the transfer arguably does not involve "personal data." However, the EDPB Guidelines 01/2025 classify pseudonymised data as personal data (§2.4.1), and the tokenization mapping table (which links tokens to real PII) is personal data regardless of where it is stored. The open question is whether DPA guidance will clarify the transfer implications of tokenization, and whether the Schrems II framework applies to token-to-value mappings.

---

### Q5. What is the right granularity for key isolation in support of right-to-erasure?

Crypto shredding (§15.2) requires per-subject or per-record key isolation to enable selective erasure. But per-subject keys create key management overhead that scales linearly with the data subject count: 10 million data subjects means 10 million DEKs. Per-record keys are even more expensive. The open question is whether practical architectures exist that balance erasure granularity with key management scalability — for example, per-tenant keys with application-level filtering, or per-time-window keys with selective re-encryption during erasure windows.

---

### Q6. How will AI-assisted PII detection change the infrastructure landscape?

The PII scanning and masking tools analyzed in §6.3 rely primarily on regex pattern matching and predefined infoType detectors. Machine learning models for PII detection (Google Cloud DLP's INFO_TYPE_DETECTION_LOGGING, custom ML models in Azure Information Protection) are improving but remain supplementary to rule-based approaches. The open question is whether large language models or other AI techniques will enable context-aware PII detection — distinguishing between a person's name in a business context (PII) and a company name in a product catalog (not PII) — and how this will affect the accuracy and performance of real-time PII scanning at the API gateway.

---

### Q7. Is there a viable standard for cross-cloud key management?

The multi-cloud key management analysis (§14.6) identifies a fundamental architectural gap: no standard exists for federating encryption keys across cloud providers. Proprietary solutions (Fortanix, Akeyless, Thales) address this with abstraction layers, but they introduce additional dependencies and cost. The open question is whether a cloud-agnostic key management standard — analogous to how OpenTelemetry standardized distributed tracing — will emerge, and whether cloud providers will participate in such a standard given the commercial incentive for lock-in.

---

### Q8. What audit log retention period satisfies both GDPR and sector-specific regulations?

GDPR Article 5(1)(e) requires that personal data be kept "no longer than is necessary for the purposes for which the personal data are processed." For audit logs containing cryptographic operation metadata (§13.1), the retention period must balance: the GDPR storage limitation principle (favoring short retention), sector-specific requirements (PCI DSS Requirement 10.7 mandates 1-year retention with 3 months immediately available; financial regulations mandate 5–7 years), and the organization's own incident response needs (forensic investigation may require logs older than 1 year). The open question is whether a tiered retention model — short retention for routine audit logs, extended retention for flagged or break-glass events — can satisfy all requirements simultaneously.

---

### Q9. How should data subject access requests be fulfilled for encrypted data at scale?

GDPR Article 15 requires the controller to provide the data subject with a copy of their personal data. When all PII is encrypted or tokenized, fulfilling a DSAR requires: identifying all systems holding the data subject's encrypted data, decrypting it through the centralized decryption service (§14.3), compiling it into a response, and verifying completeness. For a large organization with millions of data subjects and dozens of downstream systems, this process can take weeks without automation. The OpenTelemetry-based DSAR reconstruction approach (§16.5) is promising but requires that every service was instrumented with pseudonymized subject references from the outset. The open question is whether industry-standard DSAR automation patterns will emerge for encrypted data architectures.

---

### Q10. Will HTTP message signing (RFC 9421) complement or replace encryption for API parameter integrity?

HTTP Message Signing (§8.1) provides cryptographic integrity for HTTP request components, ensuring that parameters have not been tampered with in transit. It does not provide confidentiality — signed parameters are still readable by intermediaries. The open question is whether message signing will see adoption as a complement to encryption (ensuring integrity of encrypted parameters) or as a partial replacement (organizations sign sensitive parameters instead of encrypting them, accepting the confidentiality trade-off in exchange for lower complexity). The IETF's ongoing work on HTTP Message Signatures and the adoption patterns in financial services (where signing is mandated by Open Banking and PSD2) will shape this trajectory.
