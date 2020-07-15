[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# Required Examples

## Version

0.1.0

### Changelog

- 0.1.0

  - [Require examples](../changes/2020-06-16_required-examples/change.md)

## Implementations

- [Python (DEV)](https://github.com/aws/aws-encryption-sdk-python/blob/keyring/examples/)
- [Java (DEV)](https://github.com/aws/aws-encryption-sdk-java/blob/keyring/src/examples/)

## Overview

Every implementation MUST include an example
for each use-case described in [example templates](./templates).

## Definitions

### Conventions used in this document

The key words
"MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT",
"SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL"
in this document are to be interpreted as described in
[RFC 2119](https://tools.ietf.org/html/rfc2119).

## Requirements

- Every example MUST be tested
  as part of the continuous integration testing.
- Every example MUST be independent and complete.
- Every example SHOULD follow a consistent layout and framing.

  - ex: Consistent function name and input parameters across examples.

- Every example MUST only contain logic that is reasonable for production use.
- If an example MUST contain logic that is not reasonable for production use,
  it MUST include clear comments identifying that logic as such
  and instructing the reader what they SHOULD do instead.

  - ex: Raw keyring examples generate wrapping keys as part of the example.
    These examples MUST contain guidance that
    in production those keys SHOULD be managed by an HSM.
