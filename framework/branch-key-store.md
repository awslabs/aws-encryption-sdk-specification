[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# Branch Keystore

## Version

0.1.0

### Changelog

- 0.1.0
  - Initital record

## Implementations

| Language | Confirmed Compatible with Spec Version | Minimum Version Confirmed | Implementation |
| -------- | -------------------------------------- | ------------------------- | -------------- |

## Overview

A Branch Keystore persists hierarchical data that allows customers to call AWS KMS less often.
The Branch Keystore persists branch keys that wrap multiple data keys.
This creates a hierarchy where a branch key wraps multiple data keys and facilitates caching.
These branch keys MUST only be generated using the [AWS KMS API GenerateDataKeyWithoutPlaintext](https://docs.aws.amazon.com/kms/latest/APIReference/API_GenerateDataKeyWithoutPlaintext.html).

## Definitions

### Conventions used in this document

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL"
in this document are to be interpreted as described in [RFC 2119](https://tools.ietf.org/html/rfc2119).

## AWS DDB Table Set Up

In order to interact with the Branch Keystore, the table MUST be set up as follows:

- Partition Key: `branch-key-id` (String)
- Sort Key: `version` (String)
- Global Secondary Index: `Active-Keys`
  - Partion Key: `status` (String)
  - Sort Key: `branch-key-id` (String)

### Record Format

A branch key record MUST include the following key-value pairs:

1. `branch-key-id` : Unique identifier for a branch key; represented as [AWS DDB String](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.NamingRulesDataTypes.html#HowItWorks.DataTypes)
1. `version` : A version 4 [UUID](https://www.ietf.org/rfc/rfc4122.txt) of the Branch Key Version; represented as [AWS DDB String](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.NamingRulesDataTypes.html#HowItWorks.DataTypes)
1. `enc` : Encrypted branch key; represented as [AWS DDB Binary](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.NamingRulesDataTypes.html#HowItWorks.DataTypes)
1. `status` : Identifier for the lifecycle of the key. Possible values MAY include: `ACTIVE`, `DECRYPT_ONLY`.
1. `create-time`: Timestamp in ISO8601 format in UTC, to microsecond precision.
   Represented as [AWS DDB String](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.NamingRulesDataTypes.html#HowItWorks.DataTypes)
1. `hierarchy-version`: Version of the hierarchical keyring; represented as [AWS DDB Number](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.NamingRulesDataTypes.html#HowItWorks.DataTypes)
