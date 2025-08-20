[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# Required Interface Demonstrations

## Version

0.1.0

## Implementations

- [Net](https://github.com/aws/aws-encryption-sdk-dafny/tree/develop/aws-encryption-sdk-net/Examples)
  - [Regional Client Supplier](https://github.com/aws/aws-encryption-sdk-dafny/blob/develop/aws-encryption-sdk-net/Examples/ClientSupplier/RegionalRoleClientSupplier.cs)

## Overview

Every implementation MUST include an example implementation
for every customer extendable class or interface in the Encryption SDK.

See [example/extendables](./extendables) for specific implementations.

## Definitions

### Conventions used in this document

The key words
"MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT",
"SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL"
in this document are to be interpreted as described in
[RFC 2119](https://tools.ietf.org/html/rfc2119).

## Requirements

- Every example extendable MUST be tested
  as part of the continous integration testing.
- Everty example extendable MUST be independent and complete.
- Every example extendable SHOULD follow this layout:

  - In a directory named for the extendable interface/class,
  - In a directory named for the example,
  - two files should exsist:
    - The implementation of the extendable interface/class,
    - An example that utilizes it.

- Every example extendable MUST only contain logic that is reasonable for production use.
- If an example extendable MUST contain logic that is not reasonable for production use,
  it MUST include clear comments identifying that logic as such
  and instructing the reader what they SHOULD do instead.

### Example Extendable Templates

For each extendable, there MUST be directory under [example/extendables](./extendables).
Each example extendable MUST be in the appropriate directory.
Example extendables MUST include sufficent code to clearly demonstrate
how to implement the interface and
how to use the implemented interface.
