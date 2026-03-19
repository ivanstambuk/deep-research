import re

with open('papers/DR-0001/DR-0001-mcp-authentication-authorization-agent-identity.md', 'r') as f:
    text = f.read()

# Replace Diagram 25
old_25 = r"""<details><summary><strong>1. MCP Client sends a Rich Authorization Request to the Authorization Server</strong></summary>

The agent sends an authorization request with `authorization_details` \(RFC 9396 — RAR\) instead of \(or alongside\) traditional `scope` strings. The `authorization_details` payload specifies exactly what the agent needs — e.g., `{ "type": "mcp_tool_invocation", "tool": "process_patient_data", "actions": \["execute"\] }`. This is the RAR advantage: the agent describes its request in structured, machine-parseable JSON rather than opaque scope strings. The AS doesn't need pre-registered scopes for every possible tool/action combination.

</details>
<details><summary><strong>2. Authorization Server forwards the request to the Policy Decision Point for evaluation</strong></summary>

The AS doesn't make the authorization decision itself — it delegates to the PDP \(Policy Decision Point\), following the XACML/ABAC separation of concerns. The PDP receives the request context: who is requesting \(user identity\), what are they requesting \(from `authorization_details`\), and the environmental context \(time, IP, risk signals\). The PDP holds the policy rules but not the attribute data — it needs to query external systems for the current state of user entitlements, agent trust levels, and tool risk classifications.

</details>
<details><summary><strong>3. Policy Decision Point queries the PIP for dynamic context attributes</strong></summary>

The PDP queries the PIP \(Policy Information Point\) for attributes it needs to evaluate the policy. The PIP is the integration point for external data sources: LDAP/AD for user group memberships, HR systems for role assignments, risk engines for real-time threat scores, entitlement databases for fine-grained permissions, and tool registries for tool risk classifications. This dynamic lookup is what eliminates scope explosion — instead of pre-defining a scope for every tool-action-user combination, the PDP queries the actual attribute values at decision time.

</details>
<details><summary><strong>4. PIP returns the dynamic attributes to the Policy Decision Point</strong></summary>

The PIP returns the queried attributes: user entitlements \(e.g., "HIPAA-cleared"\), agent trust level \(e.g., "verified"\), tool risk classification \(e.g., "PHI-access, critical"\), and organizational policies \(e.g., "finance department: max transaction €10,000"\). These attributes are fetched in real-time from external systems — if Alice's role changed in the HR system 5 minutes ago, the PIP reflects that change immediately. This is fundamentally different from token-embedded scopes, which reflect the state at token issuance time.

</details>
<details><summary><strong>5. Policy Decision Point returns the permit/deny decision with obligations to the AS</strong></summary>

The PDP evaluates the intersection of the request, the dynamically fetched attributes, and the policy rules, and returns a decision: `PERMIT` \(with obligations such as "audit all access", "log to compliance system"\) or `DENY` \(with reason codes\). Obligations are actionable requirements the AS must enforce as a condition of permitting the request — the PERMIT is conditional on obligation fulfillment. This is the XACML obligation pattern: the PDP can say "yes, but only if you also do X."

</details>
<details><summary><strong>6. Authorization Server returns the decision with obligations to the MCP Client</strong></summary>

The AS communicates the decision to the client. If PERMIT, the AS issues a token \(or enriches the existing token\) constrained to the approved `authorization_details`. If DENY, the client receives an error explaining why authorization was refused. The obligations from the PDP are either fulfilled by the AS directly \(e.g., logging the audit record\) or encoded in the token for downstream enforcement \(e.g., the gateway must verify the obligation was met before forwarding\). The entire PIP/PDP evaluation happened transparently — the client sent a RAR request and received a decision.

</details>"""

new_25 = """<details><summary><strong>1. MCP Client submits a Rich Authorization Request (RAR) to the Authorization Server</strong></summary>

Instead of requesting a flat array of opaque `scope` strings, the AI Agent transmits a structured JSON payload via the `authorization_details` parameter (RFC 9396). This allows the agent to declare its exact contextual requirements and target constraints up front, escaping the combinatorial explosion of predefined OAuth scopes.

```json
{
  "authorization_details": [
    {
      "type": "mcp_tool_invocation",
      "tool": "process_patient_data",
      "actions": ["execute", "read"]
    }
  ]
}
```

</details>
<details><summary><strong>2. Authorization Server delegates the decision to the Policy Decision Point (PDP)</strong></summary>

Following the XACML/ABAC architecture, the AS operates merely as the Policy Enforcement Point (PEP). It packages the incoming context — mapping the authenticated user, the specific agent identity, and the RAR JSON payload — and forwards this bundle to the backend PDP for formal policy evaluation.

</details>
<details><summary><strong>3. Policy Decision Point queries the Policy Information Point (PIP) for live attributes</strong></summary>

The PDP executes its logical ruleset but recognizes it lacks real-time context. It fires internal queries to the Policy Information Point (PIP) to marshal the necessary live attributes. The PIP operates as the aggregation layer, independently fetching data from LDAP (user roles), HR (clearance status), Risk Engines (active threat scores), and Tool Registries (data classification levels).

</details>
<details><summary><strong>4. PIP aggregates and returns the real-time identity and risk context</strong></summary>

The PIP rapidly synthesizes the queried data and returns a consolidated assertion payload back to the PDP. 

```json
{
  "user_clearance": "HIPAA-cleared",
  "agent_trust_level": "verified",
  "tool_risk_tier": "critical_phi",
  "network_threat_score": 12
}
```
Because this lookup happens synchronously at decision-time, it cleanly avoids the "stale permissions" problem inherent to long-lived scopes. If the user's role was downgraded 30 seconds ago in LDAP, the PIP instantly reflects it.

</details>
<details><summary><strong>5. Policy Decision Point evaluates ABAC rules and returns the decision with obligations</strong></summary>

The PDP intersects the live PIP attributes against its strict compliance policies. Because the agent is "verified" and the user is "HIPAA-cleared", the engine computes a `PERMIT` decision. However, because the tool risk is "critical_phi", the engine attaches a strict XACML Obligation.

```mermaid
stateDiagram-v2
    direction TB
    state "Evaluate Rule" as Eval
    Eval --> Check1: Is user HIPAA-cleared?
    Check1 --> Check2: True
    Check2 --> Obligation: Is tool critical_phi?
    Obligation --> Permit: True (Append Audit Requirement)
```

</details>
<details><summary><strong>6. Authorization Server mints the targeted token enforcing the obligations</strong></summary>

Receiving the final verdict, the AS fulfills its role as the PEP. It mints the access token, crystallizing the approved `authorization_details` into the JWT payload, and either executes the "audit all access" obligation directly within the AS boundary or encodes it as a mandatory policy hook that the downstream Gateway must explicitly satisfy.

</details>"""

text = re.sub(old_25, new_25, text)

old_26 = r"""<details><summary><strong>1. AI Agent sends a tool call request to the Gateway</strong></summary>

The agent sends `POST /mcp tools/call: process_patient_data` with its user-delegated bearer token. This is a HIPAA-sensitive operation — processing patient data requires specific regulatory compliance controls. The agent doesn't need to know about the compliance requirements; the gateway will determine the appropriate authorization level based on the tool's risk classification and the `authorization_details` it constructs for the token exchange.

</details>
<details><summary><strong>2. Gateway constructs a Token Exchange request with RAR Agent Extensions</strong></summary>

The Gateway sends `POST /token` with `grant_type=urn:ietf:params:oauth:grant-type:token-exchange` and the key innovation: `authorization_details` containing both `policy_context` \(declaring HIPAA \+ GDPR compliance requirements\) and `lifecycle_binding` \(tying the token to `analysis-job-1138`\). These are the two new members from `draft-chen-oauth-rar-agent-extensions-00`. The `policy_context` tells the AS which policy ruleset to apply; the `lifecycle_binding` tells the AS to automatically revoke the token when the task ends.

</details>
<details><summary><strong>3. Authorization Server forwards the policy_context to the PDP for evaluation</strong></summary>

The AS delegates the authorization decision to the PDP, passing the `policy_context` from the RAR request. The PDP receives: the assurance level \(`hipaa_phi_access`\), the compliance frameworks \(`hipaa`, `gdpr`\), and the tool being invoked \(`process_patient_data`\). The PDP must evaluate whether the requesting user and agent meet the requirements imposed by these compliance frameworks — which requires dynamic attribute lookup.

</details>
<details><summary><strong>4. PDP queries the PIP for user, agent, and tool attributes</strong></summary>

The PDP queries the PIP for three categories of attributes: \(1\) user HIPAA clearance status \(from the HR system or entitlement database\), \(2\) agent trust level \(from the agent registry\), and \(3\) tool risk classification \(from the tool registry\). These attributes are fetched in real-time, ensuring the authorization decision reflects the current state — not stale data from token issuance time.

</details>
<details><summary><strong>5. PIP returns the queried attributes confirming eligibility</strong></summary>

The PIP returns: `user: HIPAA-cleared ✅`, `agent: verified ✅`, `tool: PHI-access \(critical\)`. All three attribute checks pass — the user has HIPAA clearance, the agent is verified/trusted, and the tool is correctly classified as critical PHI-access. If any check failed \(e.g., user's HIPAA training expired\), the PDP would deny the request regardless of the user's token scopes.

</details>
<details><summary><strong>6. PDP cross-validates the policy_context against the tool's requirements</strong></summary>

The PDP performs a critical self-referential check: does the `policy_context` in the request match what the tool actually requires\? A PHI-access tool requires `hipaa_phi_access` assurance level — the request's `policy_context` declares exactly this. This prevents a downgrade attack where an agent requests a lower assurance level than the tool requires. The cross-validation is bidirectional: the request must declare at least the required assurance level, and the declared frameworks must include the tool's mandatory frameworks.

</details>
<details><summary><strong>7. PDP returns PERMIT with an audit obligation to the Authorization Server</strong></summary>

The PDP returns `PERMIT` with an obligation: "audit all access." This obligation means the AS must ensure that every access made with the resulting token is logged to the compliance audit system. The obligation is not optional — the PERMIT is conditional on the obligation being fulfilled. The AS must either enforce the obligation directly \(e.g., by encoding it in the token\) or reject the request if it cannot guarantee obligation fulfillment.

</details>
<details><summary><strong>8. Authorization Server presents the consent prompt to the User</strong></summary>

The AS displays a compliance-aware consent screen: "Agent wants to process patient data under HIPAA \+ GDPR compliance for job analysis-job-1138." The consent screen includes the regulatory context — the user sees not just what the agent wants to do, but under which compliance frameworks. This is the `policy_context` benefit for human oversight: the user can make an informed decision knowing that HIPAA and GDPR protections are in effect for this specific operation.

</details>
<details><summary><strong>9. User approves the compliance-governed operation</strong></summary>

The user reviews the consent prompt and approves. The approval is logged with the full `authorization_details` including `policy_context` — creating a GDPR Art. 7\(1\) demonstrable consent record and a HIPAA access authorization record. The user's approval is scoped to the specific task \(`analysis-job-1138`\), not a blanket "process patient data anytime" approval.

</details>
<details><summary><strong>10. Authorization Server registers a lifecycle webhook with the Task Service</strong></summary>

The AS registers a webhook callback with the Task Service for `analysis-job-1138`. This implements the `lifecycle_binding` from the RAR request: when the task enters a terminal state \(`COMPLETED`, `FAILED_VALIDATION`, or `CANCELLED`\), the Task Service will notify the AS via webhook. This is the automatic revocation mechanism — the token's validity is bound to an external entity's lifecycle, not just a TTL.

</details>
<details><summary><strong>11. Authorization Server stores the token-to-task mapping in the revocation store</strong></summary>

The AS creates a mapping: `jti \(token ID\) → task_id \(analysis-job-1138\)` in its revocation store. This self-referential arrow represents internal state management: when the webhook fires \(step 15\), the AS can look up which token\(s\) to revoke by querying this mapping. The mapping also enables the reverse lookup: given a token, determine which task it's bound to — useful for audit and compliance queries.

</details>
<details><summary><strong>12. Authorization Server issues the enriched access token to the Gateway</strong></summary>

The AS issues an access token containing the validated `authorization_details` claim — including the `policy_context` and `lifecycle_binding`. The token is enriched: it carries not just scopes but structured authorization context. Downstream consumers \(gateway, MCP server\) can inspect the `authorization_details` claim to verify that the token was issued under the correct compliance framework and is bound to the correct task.

</details>
<details><summary><strong>13. Gateway forwards the tool call with the enriched token to the MCP Server</strong></summary>

The Gateway forwards the `process_patient_data` tool call to the MCP Server with the enriched token. The Gateway may also enforce the audit obligation from step 7 by logging the tool invocation to the HIPAA compliance audit system before forwarding. The MCP Server receives a token with full authorization context — it can verify the compliance framework and task binding without making additional authorization queries.

</details>
<details><summary><strong>14. MCP Server returns the processing result to the Agent</strong></summary>

The MCP Server executes `process_patient_data` and returns the result. The complete audit trail links: user \(Alice\) → approval \(with HIPAA \+ GDPR policy_context\) → agent → gateway → MCP Server → tool execution → result. Every step is traceable to the original human approval and the specific compliance context under which it was authorized.

</details>
<details><summary><strong>15. Task Service notifies the AS via webhook that the task completed</strong></summary>

When `analysis-job-1138` reaches a terminal state \(e.g., `COMPLETED`\), the Task Service fires the webhook registered in step 10. The webhook payload includes the `task_id` and the terminal state. This is the `lifecycle_binding` trigger — the AS now knows that the task the token was bound to has ended, and the token should be revoked. The webhook is secured via HMAC signature or mTLS to prevent spoofing.

</details>
<details><summary><strong>16. Authorization Server automatically revokes the task-bound token</strong></summary>

The AS looks up the token\(s\) bound to `analysis-job-1138` using the `jti → task_id` mapping from step 11, and revokes them. This self-referential arrow represents the automatic revocation: any further use of this token is rejected with `401 Unauthorized`. This is the `lifecycle_binding` payoff — the token's lifetime is automatically bounded by the task's lifecycle, not a static TTL. If the task fails or is cancelled early, the token is revoked immediately — preventing the agent from continuing to process patient data after the job is done.

</details>"""

new_26 = """<details><summary><strong>1. AI Agent sends a tool call request to the Gateway</strong></summary>

The agent invokes `POST /mcp tools/call: process_patient_data`, passing a standard user-delegated Bearer token. Because dealing with PHI involves stringent HIPAA constraints, simple authentication is insufficient. The Gateway must initiate an authorization elevation cycle.

```http
POST /mcp/tools/call/process_patient_data HTTP/1.1
Host: gateway.internal.corp
Authorization: Bearer eyJhbGci...
Content-Type: application/json

{ "patient_id": "PT-94829" }
```

</details>
<details><summary><strong>2. Gateway constructs a Token Exchange Request with RAR Agent Extensions</strong></summary>

The Gateway intercepts the call and crafts an RFC 8693 Token Exchange request, substituting the standard scope field with advanced `authorization_details` based on the IETF draft `draft-chen-oauth-rar-agent-extensions-00`.

```http
POST /token HTTP/1.1
Content-Type: application/x-www-form-urlencoded

grant_type=urn:ietf:params:oauth:grant-type:token-exchange
&subject_token=eyJhbGci...
&authorization_details=[{
  "type": "mcp_tool_invocation",
  "tool": "process_patient_data",
  "policy_context": {
    "assurance_level": "hipaa_phi_access",
    "compliance_frameworks": ["hipaa", "gdpr"]
  },
  "lifecycle_binding": {
    "type": "task_status_webhook",
    "task_id": "analysis-job-1138"
  }
}]
```

</details>
<details><summary><strong>3. Authorization Server routes the policy_context to the PDP</strong></summary>

The Authorization Server extracts the `policy_context` payload. Rather than making a static scope-matching decision, it delegates the complex regulatory alignment (HIPAA + GDPR constraints for a high-assurance tool) to the specialized Policy Decision Point.

</details>
<details><summary><strong>4. PDP queries the PIP for user, agent, and tool attributes</strong></summary>

The PDP dispatches a query vector to the Policy Information Point (PIP), requesting the real-time operational status for the three critical entities in this transaction: the User's HR clearance, the AI Agent's trust score, and the Target Tool's data classification.

</details>
<details><summary><strong>5. PIP returns the queried attributes confirming eligibility</strong></summary>

The PIP queries external databases and returns the unified state: the human user retains active HIPAA clearance, the AI Agent's cryptographic signature maps to a verified internal identity, and the tool is indeed flagged as a critical PHI vector. All prerequisite tests pass.

</details>
<details><summary><strong>6. PDP cross-validates the policy_context against the tool's requirements</strong></summary>

The PDP executes a bidirectional security check. It confirms that the `policy_context` supplied by the Gateway (`hipaa_phi_access`) meets or exceeds the minimum baseline demanded by the tool registry. This mechanism fundamentally prevents downgrade attacks where compromised agents attempt to request lower-assurance oversight for high-risk operations.

</details>
<details><summary><strong>7. PDP returns PERMIT with an audit obligation to the Authorization Server</strong></summary>

The PDP finalizes the assessment and issues a strictly conditional permit. The AS is instructed that it may only proceed if it strictly satisfies the attached XACML obligation: every access utilizing this token must be permanently flushed to the immutable HIPPA audit ledger.

</details>
<details><summary><strong>8. Authorization Server presents the consent prompt to the End User</strong></summary>

Detecting the `hipaa_phi_access` assurance requirement, the AS initiates an out-of-band communication directly with the human end user, displaying a dynamically generated, contextually-rich prompt.

> ⚠️ **Authorization Required**  
> AI Agent is requesting to execute `process_patient_data`  
> **Task**: analysis-job-1138  
> **Compliance**: HIPAA, GDPR constraints apply.

</details>
<details><summary><strong>9. End User approves the compliance-governed operation</strong></summary>

The human user acknowledges the constraints and digitally signs establishing consent. Because this approval structure is inextricably bound to the explicit `policy_context`, it natively satisfies the strenuous non-repudiability requirements of GDPR Article 7(1) demonstrability.

</details>
<details><summary><strong>10. Authorization Server registers a lifecycle webhook with the Task Service</strong></summary>

Addressing the `lifecycle_binding` parameter, the AS reaches out to the external orchestrator (Task Service) and registers an HTTPS webhook callback, subscribing directly to the `analysis-job-1138` execution state.

</details>
<details><summary><strong>11. Authorization Server stores the token-to-task mapping in the revocation store</strong></summary>

Internally, the AS updates its distributed memory ledger, creating a strict relational mapping between the newly generated JWT token ID (`jti`) and the task identifier (`analysis-job-1138`).

</details>
<details><summary><strong>12. Authorization Server issues the enriched access token to the Gateway</strong></summary>

The AS completes the Token Exchange, provisioning a highly specialized, context-aware Access Token back to the Gateway. This token serves as a portable proof not just of identity, but of the entire successful regulatory validation cascade.

```json
{
  "access_token": "eyJ...",
  "authorization_details": [
    {
      "type": "mcp_tool_invocation",
      "tool": "process_patient_data",
      "policy_context": { "assurance_level": "hipaa_phi_access" }
    }
  ]
}
```

</details>
<details><summary><strong>13. Gateway forwards the tool call with the enriched token to the MCP Server</strong></summary>

The Gateway logs the audit record (fulfilling the PDP's obligation) and proxies the HTTP payload onward. The terminating MCP Server natively reads the `authorization_details` from the token and verifies the `hipaa_phi_access` claim without needing to recursively query the AS.

</details>
<details><summary><strong>14. MCP Server returns the processing result to the AI Agent</strong></summary>

The action is executed against the PHI database and the results stream backward through the Gateway to the AI Agent. The operational pipeline has successfully threaded a fully verified, human-in-the-loop compliance audit through an autonomous execution vector.

</details>
<details><summary><strong>15. Task Service notifies the AS via webhook that the task completed</strong></summary>

Hours later, the orchestrator notes that `analysis-job-1138` has successfully finished. It fires the registered webhook to the AS endpoint.

```http
POST /webhooks/lifecycle HTTP/1.1
Content-Type: application/json

{
  "task_id": "analysis-job-1138",
  "status": "COMPLETED"
}
```

</details>
<details><summary><strong>16. Authorization Server automatically revokes the task-bound token</strong></summary>

The AS receives the external closure event, looks up the corresponding `jti` in its internal cache, and instantly revokes the credentials. The AI Agent's access is cryptographically severed precisely when its logical task ends, eliminating the dangerous drift inherent to hard-coded chronological token TTLs.

</details>"""

text = re.sub(old_26, new_26, text)

# Check changes
if text.find(new_25) != -1 and text.find(new_26) != -1:
    with open('papers/DR-0001/DR-0001-mcp-authentication-authorization-agent-identity.md', 'w') as f:
        f.write(text)
    print("SUCCESS 25 and 26")
else:
    print("FAILED TO MATCH")
