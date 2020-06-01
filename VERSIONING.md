[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# Versioning Policy

We use a three-part X.Y.Z (Major.Minor.Patch) versioning definition, as follows:

- X (Major) version changes are significant and expected to break backwards compatibility.
- Y (Minor) version changes are moderate changes. These include:
  - Significant non-breaking feature additions.
  - Any change to the version of a dependency.
  - Possible backwards-incompatible changes. These changes will be noted and explained in detail in the release notes.
- Z (Patch) version changes are small changes. These changes will not break backwards compatibility.
  - Z releases will also include warning of upcoming breaking changes, whenever possible.

## Beta Releases

Versions with a zero major version (0.Y.Z) are considered to be beta releases.  
In beta releases, a Y-change may involve significant API changes.
