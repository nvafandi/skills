---
name: security-analysis
description: >
  Performs comprehensive security analysis on implemented code based on 
  OWASP, CERT, and NIST standards. Analyzes vulnerabilities, secure coding 
  violations, and provides SonarQube-style detailed findings with remediation 
  guidance.
argument-hint: "<target-path|pr-url> [--standard=owasp|cert|nist|all] [--severity-threshold=critical|high|medium]"
license: MIT
metadata:
  author: Nurvan Afandi
  version: 1.0.0
---

# Security Analysis

Deep security code review aligned with industry standards (OWASP Top 10, 
CERT Secure Coding, NIST SSDF/800-53) providing SonarQube-style vulnerability 
detection with actionable remediation.

## Purpose

Identify security vulnerabilities and secure coding violations before code 
reaches production, with standardized severity classification and fix guidance.

## Standards Coverage

### OWASP Top 10 (2021/2023)
| Category | ID | Key Checks |
|----------|-----|------------|
| Broken Access Control | A01 | Authorization checks, IDOR, path traversal |
| Cryptographic Failures | A02 | Weak algorithms, hardcoded keys, missing encryption |
| Injection | A03 | SQLi, NoSQLi, LDAPi, Command injection, XSS |
| Insecure Design | A04 | Missing threat model, insecure patterns |
| Security Misconfiguration | A05 | Default creds, verbose errors, unnecessary features |
| Vulnerable Components | A06 | CVE scanning, dependency check |
| Authentication Failures | A07 | Weak passwords, session mgmt, MFA |
| Software Integrity Failures | A08 | CI/CD security, unsigned artifacts |
| Logging/Monitoring Failures | A09 | Insufficient audit trails, alerting |
| SSRF | A10 | URL validation, allowlist, network segmentation |

### CERT Secure Coding (Java/C/C++/etc.)
- **Input Validation** (IDS00-J, STR00-J)
- **Concurrency** (LCK00-J, VNA00-J)
- **Exceptions** (ERR00-J, ERR01-J)
- **Serialization** (SER00-J, SER01-J)
- **Platform Security** (SEC00-J, SEC01-J)

### NIST Standards
- **SSDF** (SP 800-218): Secure Software Development Framework
- **800-53 Rev 5**: Security Controls (SA, SI, SC families)
- **800-63B**: Digital Identity Guidelines (auth)
- **800-57**: Key Management

## Analysis Categories

### 1. Injection Vulnerabilities
- SQL Injection (concatenated queries, JPQL/HQL injection)
- NoSQL Injection (MongoDB $where, $regex)
- Command Injection (Runtime.exec, ProcessBuilder)
- LDAP Injection
- XSS (Reflected, Stored, DOM-based)
- Template Injection (SSTI)
- Header Injection (CRLF)

### 2. Authentication & Session Management
- Weak password policies
- Credential stuffing protections missing
- Session fixation/rotation
- JWT vulnerabilities (alg:none, weak secrets, no expiration)
- Missing MFA enforcement
- Token storage issues (localStorage vs httpOnly cookies)

### 3. Authorization & Access Control
- Missing authorization checks (horizontal/vertical)
- IDOR (Insecure Direct Object References)
- Path traversal (../, absolute paths)
- Forceful browsing
- Missing function-level access control
- CORS misconfiguration

### 4. Cryptographic Failures
- Weak algorithms (MD5, SHA1, DES, RC4)
- Hardcoded secrets/keys
- Insecure random (Math.random vs SecureRandom)
- Missing encryption at rest/in transit
- Improper certificate validation
- Key rotation missing
- IV reuse in CBC mode

### 5. Input Validation & Sanitization
- Missing validation at trust boundaries
- Insufficient allowlist validation
- Deserialization vulnerabilities (gadget chains)
- XXE (XML External Entity)
- Prototype pollution (JS)
- Path traversal via input

### 6. Security Logging & Monitoring
- Insufficient audit logging
- Sensitive data in logs (PII, tokens, passwords)
- Missing security event alerts
- Log injection (forged entries)
- No centralized logging

### 7. Configuration & Deployment
- Debug endpoints exposed
- Default credentials
- Unnecessary services/ports
- Missing security headers (CSP, HSTS, X-Frame-Options)
- Container/VM hardening gaps
- Secrets in config files / Docker images

### 8. Supply Chain & Dependencies
- Vulnerable dependencies (CVE)
- Typosquatting/dependency confusion
- Unpinned versions
- Missing SBOM
- Unsigned artifacts

## Severity Classification (CVSS 4.0 Aligned)

| Severity | CVSS Range | Description | SLA |
|----------|------------|-------------|-----|
| **CRITICAL** | 9.0-10.0 | Actively exploitable, high impact | Fix immediately, block deploy |
| **HIGH** | 7.0-8.9 | Exploitable with moderate effort | Fix within 24h |
| **MEDIUM** | 4.0-6.9 | Limited exploitability/impact | Fix within sprint |
| **LOW** | 0.1-3.9 | Minimal risk, defense-in-depth | Fix when convenient |
| **INFO** | 0.0 | Best practice, no direct risk | Track for hygiene |

## Output Format (SonarQube-Style)

```markdown
# Security Analysis Report: {Target}

## Executive Summary
- **Scan Date**: {Date}
- **Standards**: OWASP Top 10 2023, CERT Java, NIST SSDF
- **Files Scanned**: {N}
- **Lines of Code**: {XXX}
- **Total Findings**: {XX} (C: {X} | H: {X} | M: {X} | L: {X})

## Findings by Standard

### OWASP Top 10 Coverage
| Category | Findings | Status |
|----------|----------|--------|
| A01: Broken Access Control | 2 | ⚠️ HIGH |
| A02: Cryptographic Failures | 1 | 🔴 CRITICAL |
| A03: Injection | 3 | 🔴 CRITICAL |
| A04: Insecure Design | 0 | ✅ PASS |
| A05: Security Misconfiguration | 1 | 🟡 MEDIUM |
| A06: Vulnerable Components | 4 | 🟠 HIGH |
| A07: Authentication Failures | 1 | 🟡 MEDIUM |
| A08: Software Integrity | 0 | ✅ PASS |
| A09: Logging Failures | 2 | 🟡 MEDIUM |
| A10: SSRF | 0 | ✅ PASS |

### CERT Secure Coding Violations
| Rule ID | Rule Name | Violations | Severity |
|---------|-----------|------------|----------|
| IDS00-J | Prevent SQL Injection | 3 | CRITICAL |
| ERR00-J | Do not suppress exceptions | 2 | MEDIUM |
| SEC00-J | Do not use weak encryption | 1 | CRITICAL |

### NIST SSDF Practices
| Practice | Status | Evidence |
|----------|--------|----------|
| PW.1: Secure Design | ⚠️ PARTIAL | Threat model missing for payment flow |
| PW.4: Secure Coding | ❌ FAIL | Multiple injection vulnerabilities |
| RV.1: Vulnerability Detection | ✅ PASS | SAST integrated in CI |
| RV.2: Vulnerability Remediation | 🔄 IN PROGRESS | |

## Detailed Findings

### 🔴 CRITICAL - SA-001: SQL Injection in UserRepository
**File**: `src/main/java/com/app/repository/UserRepository.java:42`
**Standard**: OWASP A03, CERT IDS00-J, NIST SI-10
**CWE**: CWE-89
**CVSS**: 9.8 (Critical)

**Vulnerable Code**:
```java
@Query("SELECT u FROM User u WHERE u.email = '" + email + "'")
User findByEmailUnsafe(String email);
```

**Impact**: Attacker can execute arbitrary SQL, extract all users, bypass auth, drop tables.

**Remediation**:
```java
// Option 1: Parameterized query (JPA)
@Query("SELECT u FROM User u WHERE u.email = :email")
User findByEmail(@Param("email") String email);

// Option 2: Spring Data derived query
User findByEmail(String email);
```

**References**: OWASP ASVS 5.3.4, CERT IDS00-J

---

### 🔴 CRITICAL - SA-002: Hardcoded Encryption Key
**File**: `src/main/java/com/app/security/TokenService.java:15`
**Standard**: OWASP A02, CERT SEC00-J, NIST SC-12
**CWE**: CWE-798
**CVSS**: 9.1 (Critical)

**Vulnerable Code**:
```java
private static final String SECRET_KEY = "my-super-secret-key-12345";
```

**Impact**: All tokens forgeable, key cannot be rotated, violates key management.

**Remediation**:
```java
@Value("${app.jwt.secret:}") // Injected from vault/env
private String secretKey;

@PostConstruct
void validateKey() {
    if (secretKey == null || secretKey.length() < 64) {
        throw new IllegalStateException("JWT secret must be 64+ chars from secure source");
    }
}
```

**References**: NIST SP 800-57, OWASP Key Management Cheat Sheet

---

### 🟠 HIGH - SA-003: Vulnerable Dependency - Jackson Databind 2.13.0
**File**: `build.gradle:45` / `pom.xml:67`
**Standard**: OWASP A06, NIST SA-22
**CVE**: CVE-2022-25647 (RCE via deserialization)
**CVSS**: 8.1 (High)

**Remediation**: Upgrade to 2.13.4+ or 2.14.0+

---

### 🟡 MEDIUM - SA-004: Missing Security Headers
**File**: `src/main/java/com/app/config/SecurityConfig.java`
**Standard**: OWASP A05, NIST SC-7
**Missing**: Content-Security-Policy, Referrer-Policy, Permissions-Policy

**Remediation**: Add SecurityHeadersConfig with CSP, HSTS, X-Frame-Options

---

### 🟡 MEDIUM - SA-005: Insufficient Audit Logging
**File**: `src/main/java/com/app/service/PaymentService.java`
**Standard**: OWASP A09, NIST AU-2, AU-3
**Issue**: Payment transactions not logged with user context, amount, outcome

**Remediation**: Add structured audit log with correlation ID

---

## Remediation Guidance by Category

### Injection Prevention
1. **Never** concatenate user input into queries
2. Use parameterized queries / prepared statements
3. Use ORM safely (derived queries, @Query with params)
4. Validate input with allowlists (not blocklists)
5. Encode output for context (HTML, JS, SQL, LDAP)

### Secrets Management
1. **Never** hardcode secrets in code/config
2. Use vault (HashiCorp, AWS Secrets Manager, Azure Key Vault)
3. Inject via environment variables at runtime
4. Rotate keys regularly (automated)
5. Audit secret access

### Dependency Management
1. Enable Dependabot/Renovate/Snyk
2. Pin versions (no ranges)
3. Generate SBOM (CycloneDX/SPDx)
4. Scan in CI/CD (OWASP Dependency Check, Trivy)
5. Have patch policy (critical: 24h, high: 7d)

## Tool Integration

### SAST Tools Supported
- **SonarQube** (import rules, export findings)
- **SpotBugs** + FindSecBugs plugin
- **Semgrep** (OWASP rulesets)
- **CodeQL** (GitHub Advanced Security)
- **Checkmarx** / **Fortify** / **Veracode** (import SARIF)

### CI/CD Integration
```yaml
# GitHub Actions example
- name: Security Scan
  uses: opencode/security-analysis@v1
  with:
    target: .
    standard: all
    severity-threshold: high
    format: sarif
    upload-sarif: true
```

## Usage

```bash
# Scan local directory with all standards
opencode run security-analysis -- ./src --standard=all

# Scan PR with OWASP focus, fail on HIGH+
opencode run security-analysis -- https://github.com/org/repo/pull/123 --standard=owasp --severity-threshold=high

# Scan with CERT Java rules only
opencode run security-analysis -- ./src --standard=cert --language=java

# Generate SARIF for GitHub Security tab
opencode run security-analysis -- ./src --format=sarif --output security-results.sarif

# Compare with baseline (show only new issues)
opencode run security-analysis -- ./src --baseline security-baseline.json
```

## Integration

- **Consumes**: Code from `backend-implementation` (post `code-review`)
- **Produces**: Security findings report (markdown/SARIF/JSON)
- **Blocks**: Deployment on CRITICAL/HIGH (configurable)
- **Feeds**: `task-audit` (security compliance check)
- **References**: 
  - `coding-guidelines/references/coding-standards.md` (secure coding rules)
  - Project threat model
  - Approved RFC security section
- **Exports**: SARIF for GitHub/GitLab security dashboards