# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| latest  | ✅ Yes             |
| < 1.0   | ❌ No              |

## Reporting a Vulnerability

**Please do NOT report security vulnerabilities through public GitHub issues.**

Instead, please report them by:

1. **Emailing** `security@free6bot.dev`
2. Or opening a [private security advisory](https://github.com/jasonzli-DEV/FREE6/security/advisories/new) on GitHub.

Please include:
- A description of the vulnerability
- Steps to reproduce (proof of concept if possible)
- Potential impact
- Your suggested fix (if any)

You will receive an acknowledgment within **48 hours** and a full response within **7 days**.

## Scope

In-scope vulnerabilities include:
- Remote code execution
- Authentication/authorization bypass
- Sensitive data exposure (tokens, credentials)
- Discord token compromise via the bot
- Web dashboard XSS/CSRF/SQLi

Out-of-scope:
- Issues in third-party dependencies (report upstream)
- Social engineering attacks
- Denial of service with physical access

## Disclosure Policy

We follow a **coordinated disclosure** policy. After a fix is available, we will:
1. Release a patched version
2. Publish a security advisory
3. Credit the reporter (unless they prefer to remain anonymous)
