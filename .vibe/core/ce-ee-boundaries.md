# CE/EE Boundary Enforcement

This document defines strict separation rules between GitMesh Community Edition (CE) and Enterprise Edition (EE) to maintain licensing compliance and project integrity.

## Critical Rules

### Absolute Prohibitions

**YOU MUST NEVER:**
- Access, read, or reference any EE code, files, or repositories
- Copy, adapt, or incorporate any EE functionality into CE
- Suggest or implement features that exist in EE
- Use EE code as reference or inspiration for CE development
- Create CE features that duplicate EE functionality
- Discuss EE implementation details or architecture

**IF YOU DETECT EE CODE IN CE:**
1. **STOP IMMEDIATELY** - Do not proceed with any changes
2. **ALERT** - Notify the user that EE code has been detected
3. **REPORT** - Provide instructions for reporting the violation
4. **REMOVE** - Do not attempt to fix or adapt the code - it must be completely removed

## Licensing Requirements

### Community Edition (CE)
- **License**: Apache 2.0
- **Scope**: All code in this repository
- **Requirements**: 
  - All contributions must be Apache 2.0 compatible
  - No proprietary dependencies
  - No EE code references
  - Full source code availability

### Enterprise Edition (EE)
- **License**: Proprietary
- **Scope**: Separate private repository
- **Access**: Restricted to authorized personnel only
- **Separation**: Complete isolation from CE codebase

## Detection Patterns

### Code Indicators
Watch for these patterns that may indicate EE code:

**File Paths:**
- Any path containing `enterprise`, `ee`, `premium`
- Files in directories marked as EE-only
- Imports from EE packages or modules

**Code Comments:**
Watch for comments indicating EE code:
- Comments containing "EE-only feature"
- Comments containing "Enterprise Edition"
- Comments containing "Premium feature"
- License headers indicating "@license proprietary"

**Configuration:**
Watch for configuration indicating EE features:
- Edition field set to "enterprise"
- Premium flag set to true
- EE features array or list present

**Feature Flags:**
Watch for conditional logic checking edition:
- Checks for isEnterpriseEdition variable
- Checks for hasPremiumLicense variable
- Any conditional based on edition or premium status

### Documentation Indicators
- References to "Enterprise Edition" or "EE" in comments
- Documentation mentioning premium features
- Links to EE repositories or documentation
- License headers indicating proprietary code

## Reporting Procedures

### If You Detect EE Code

**Immediate Actions:**
1. Stop all work on the affected files
2. Document the location and nature of the violation
3. Do not attempt to modify or remove the code yourself

**Reporting:**
Contact the maintainers immediately:
- **Email**: support@gitmesh.com
- **GitHub Issue**: Create a private security advisory
- **Subject**: "CE/EE Boundary Violation Detected"

**Include in Report:**
- File paths containing EE code
- Description of the violation
- How the code was introduced (if known)
- Timestamp of detection

### If You Accidentally Introduce EE Code

**Immediate Actions:**
1. Revert your changes immediately
2. Delete any local copies of EE code
3. Report the incident to maintainers

**Prevention:**
- Never access EE repositories or documentation
- Never use EE code as reference material
- Always verify code sources before incorporating
- Review all third-party contributions for EE content

## Contribution Guidelines

### Before Contributing

**Verify:**
- [ ] All code is original or from Apache 2.0 compatible sources
- [ ] No EE code has been referenced or adapted
- [ ] No proprietary dependencies are introduced
- [ ] All imports are from CE-approved packages
- [ ] License headers are correct (Apache 2.0)

**Check:**
- [ ] No file paths contain `enterprise`, `ee`, `premium`, `pro`
- [ ] No comments reference EE features
- [ ] No configuration flags for EE functionality
- [ ] No feature flags checking for enterprise edition

### During Development

**Safe Practices:**
- Develop features independently without EE reference
- Use only CE documentation and examples
- Consult CE maintainers for feature guidance
- Review CE roadmap for planned features

**Unsafe Practices:**
- Looking at EE code for "inspiration"
- Copying EE patterns or architecture
- Implementing features that "look like" EE features
- Using EE documentation as reference

### Code Review Checklist

**Reviewers Must Verify:**
- [ ] No EE code patterns detected
- [ ] All dependencies are Apache 2.0 compatible
- [ ] No proprietary licenses in dependency tree
- [ ] No references to EE features or documentation
- [ ] License headers are present and correct
- [ ] No suspicious file paths or naming

## Architectural Boundaries

### CE-Only Components
These components must remain completely independent:
- Core platform functionality
- Open source integrations
- Community features
- Public APIs
- Documentation and examples

### Prohibited Integrations
Do not create CE features that:
- Require EE backend services
- Depend on EE APIs or endpoints
- Use EE authentication or authorization
- Access EE databases or data stores
- Integrate with EE-only third-party services

## Legal Considerations

### License Compliance
- **Apache 2.0**: Permissive, allows commercial use, requires attribution
- **Proprietary**: Restrictive, no access without authorization
- **Mixing**: Strictly prohibited - creates legal liability

### Intellectual Property
- CE code is community property under Apache 2.0
- EE code is proprietary intellectual property
- Mixing creates IP contamination
- Violations may result in legal action

### Contributor Agreement
By contributing to CE, you certify:
- Your code is original or properly licensed
- You have not used EE code as reference
- You have rights to contribute the code
- Your contribution is Apache 2.0 compatible

## Contact Information

### Security Issues
- **Email**: security@gitmesh.com
- **Response Time**: 24-48 hours
- **Severity**: Critical - immediate attention

### Licensing Questions
- **Email**: legal@gitmesh.com
- **Response Time**: 3-5 business days
- **Topics**: License compatibility, contribution questions

### General Inquiries
- **GitHub Discussions**: https://github.com/gitmesh/community/discussions
- **Discord**: https://discord.gg/gitmesh
- **Documentation**: https://docs.gitmesh.com

## Enforcement

### Automated Checks
- CI/CD pipeline scans for EE patterns
- License header validation
- Dependency license verification
- File path validation

### Manual Review
- All PRs reviewed for CE/EE compliance
- Maintainers verify no EE code present
- Community members can flag violations
- Security team investigates reports

### Consequences
- **Accidental Violations**: Code removed, contributor educated
- **Intentional Violations**: PR rejected, contributor banned
- **Repeated Violations**: Legal action may be pursued
- **Security Violations**: Immediate escalation to legal team

## Best Practices

### For AI Assistants
- Never access EE repositories or documentation
- Always verify code sources before suggesting
- Flag suspicious patterns immediately
- Err on the side of caution - when in doubt, ask

### For Human Contributors
- Read and understand this document before contributing
- Ask questions if unsure about boundaries
- Report violations immediately
- Help maintain CE integrity

### For Maintainers
- Review all contributions for CE/EE compliance
- Educate contributors about boundaries
- Investigate reports promptly
- Maintain clear documentation

## Summary

**Remember:**
- CE and EE are completely separate
- Never access, reference, or adapt EE code
- Report violations immediately
- Maintain Apache 2.0 license compliance
- Protect the integrity of the CE project

**When in doubt:**
- Ask maintainers before proceeding
- Review this document
- Check CE documentation
- Consult community discussions

**Zero tolerance for:**
- EE code in CE repository
- License violations
- IP contamination
- Intentional boundary violations
