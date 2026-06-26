[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# ML-KEM Key Derivation

## Version

0.1.0-preview

### Changelog

- 0.1.0-preview

  - Initial record.

## Implementations

| Language | Confirmed Compatible with Spec Version | Minimum Version Confirmed | Implementation |
| -------- | -------------------------------------- | ------------------------- | -------------- |

## Overview

This document defines the byte-exact key derivation construction
used by ML-KEM keyrings to turn a 32-byte ML-KEM shared secret
into the AES-GCM wrapping key used to wrap the data key.

This construction is consumed by the
[AWS KMS ML-KEM Keyring](./aws-kms/aws-kms-ml-kem-keyring.md).
Future ML-KEM keyrings (for example, a Raw ML-KEM Keyring)
MUST also use this construction in order to be wire-compatible.

## Definitions

### Conventions used in this document

The key words
"MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT",
"SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL"
in this document are to be interpreted as described in
[RFC 2119](https://tools.ietf.org/html/rfc2119).

### Shared Secret

A 32-byte value produced by ML-KEM `Encapsulate`
and recovered by ML-KEM `Decapsulate`.

### Wrapping Key

A 32-byte symmetric key derived from the shared secret
that the consuming keyring uses as the AES-GCM cipher key
when wrapping a data key.

## Key Derivation Function Configuration

The Key Derivation Function Configuration is defined as:

- Key Derivation Function:
  [Counter-Mode](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-108r1-upd1.pdf#page=14).
- Pseudo Random Function: HMAC-SHA384.
- Output length: 32 bytes (the AES-GCM-256 wrapping key).

## Key Derivation Inputs

The KDF inputs MUST be:

- Key (input keying material): the 32-byte ML-KEM shared secret.
- Salt: a 32-byte value carried by the consuming keyring's encrypted-data-key
  structure.
  On encrypt the consuming keyring MUST generate this salt
  using a cryptographically secure random source.
- `FixedInfo`: the byte string constructed below.

## FixedInfo

The `FixedInfo` field MUST be serialized in the following order,
with single `0x00` separator bytes between fields:

```
UTF8("AWS-KMS-ML-KEM-KEY-DERIVATION") || 0x00 ||
UTF8(parameter_set)                    || 0x00 ||
UTF8("HMAC_SHA384")                    || 0x00 ||
UTF8(kms_key_arn)                      || 0x00 ||
keyring_version_byte                   || 0x00 ||
canonicalized(encryption_context)
```

Where:

- `parameter_set` is one of `"ML-KEM-512"`, `"ML-KEM-768"`, `"ML-KEM-1024"`,
  matching the consuming keyring's configured parameter set.
- `kms_key_arn` is the fully qualified ARN of the ML-KEM KMS key,
  matching the `Key ARN` carried in the consuming keyring's key provider information.
- `keyring_version_byte` is the consuming keyring's version byte,
  matching the `Version` value carried in the consuming keyring's
  key provider information.
- `canonicalized(encryption_context)` is the result of applying the
  [encryption context serialization specification](./structures.md#serialization)
  to the materials' encryption context.

## Key Commitment

This construction does NOT produce an explicit key commitment value.

Tampering is detected by the AES-GCM authentication tag of the consuming keyring's
data key wrap:
any modification to the encrypted data key, the salt, or the encryption context
changes the `FixedInfo` used both as KDF input and as AES-GCM Additional Authenticated
Data, which causes AEAD authentication to fail.

ML-KEM additionally provides implicit rejection:
decapsulating an invalid KEM ciphertext returns a pseudo-random shared secret
rather than an error,
so a corrupted KEM ciphertext deterministically produces an unrelated wrapping key
that cannot decrypt the data key wrap.
