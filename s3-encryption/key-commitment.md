[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# Key Commitment

## Version

0.1.0

### Changelog

- 0.1.0
  - Initial

## Overview

This document describes how the S3 Encryption Client implements key commitment.
It is similar to how the MPL implements key commitment (see [Commitment Policy](../framework/commitment-policy.md)).
Key commitment is a mechanism to bind the data key used to encrypt an object to that object, such that an error is returned when the data key has changed.
This is done using a KDF, the details of which can be found in the [Key Derivation spec](./key-derivation.md).

### Algorithm Suites

For more information on which algorithm suites support key commitment, see [Algorithm Suite spec](../framework/algorithm-suites.md).

### Commitment Policy

In order to provide a way to migrate from previous algorithm suites which do not support key commitment to algorithm suites which do support key commitment, the S3EC provides a configurable key commitment policy.
The values of the policy are represented using an enum type:

| S3EC Commitment Policy ENUM     |
| ------------------------------- |
| FORBID_ENCRYPT_ALLOW_DECRYPT    |
| REQUIRE_ENCRYPT_ALLOW_DECRYPT   |
| REQUIRE_ENCRYPT_REQUIRE_DECRYPT |

When the commitment policy is FORBID_ENCRYPT_ALLOW_DECRYPT, the S3EC MUST NOT encrypt using an algorithm suite which supports key commitment.
When the commitment policy is FORBID_ENCRYPT_ALLOW_DECRYPT, the S3EC MUST allow decryption using algorithm suites which do not support key commitment.

When the commitment policy is REQUIRE_ENCRYPT_ALLOW_DECRYPT, the S3EC MUST only encrypt using an algorithm suite which supports key commitment.
When the commitment policy is REQUIRE_ENCRYPT_ALLOW_DECRYPT, the S3EC MUST allow decryption using algorithm suites which do not support key commitment.

When the commitment policy is REQUIRE_ENCRYPT_REQUIRE_DECRYPT, the S3EC MUST only encrypt using an algorithm suite which supports key commitment.
When the commitment policy is REQUIRE_ENCRYPT_REQUIRE_DECRYPT, the S3EC MUST NOT allow decryption using algorithm suites which do not support key commitment.

### Configuration and Validation of Commitment Policy

For details on how the Key Commitment policy is provided to the client and validated against the encryption algorithm, see the [client spec](./client.md).
For details on the how the Key Commitment policy is validated during decryption, see the [decryption spec](./decryption.md).
