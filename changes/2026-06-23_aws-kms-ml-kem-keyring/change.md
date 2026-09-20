[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# AWS KMS ML-KEM Keyring

## Affected Features

| Feature                                                                     |
| --------------------------------------------------------------------------- |
| [AWS KMS ML-KEM Keyring](../../framework/aws-kms/aws-kms-ml-kem-keyring.md) |

## Affected Specifications

| Specification                                                                                          |
| ------------------------------------------------------------------------------------------------------ |
| [AWS KMS ML-KEM Keyring](../../framework/aws-kms/aws-kms-ml-kem-keyring.md) (new)                      |
| [Keyring Interface — Supported Keyrings](../../framework/keyring-interface.md#supported-keyrings)      |
| [Test Vectors — Key Description](../../framework/test-vectors/key-description.md)                      |
| [Test Vectors — Keys Manifest](../../framework/test-vectors/keys-manifest.md)                          |
| [Test Vectors — MPL Enumeration](../../framework/test-vectors/mpl-test-vector-enumeration.md)          |
| [Test Vectors — AWS KMS ML-KEM Keyring](../../framework/test-vectors/complete-vectors/ml-kem.md) (new) |

## Affected Implementations

| Language | Version Introduced | Version Removed | Implementation |
| -------- | ------------------ | --------------- | -------------- |
| Java     | TBD                | n/a             | TBD            |

## Definitions

### Conventions used in this document

The key words
"MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT",
"SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL"
in this document are to be interpreted as described in
[RFC 2119](https://tools.ietf.org/html/rfc2119).

## Summary

Add an AWS KMS ML-KEM Keyring that protects data keys with a NIST-standardized
post-quantum Key Encapsulation Mechanism (ML-KEM, FIPS 203).
The keyring uses an ML-KEM KMS key to establish a per-message shared secret,
derives a wrapping key from it, and AES-GCM-256 wraps (encrypts) the data key.
Encapsulation source is configurable (KMS or local);
decapsulation is always performed by AWS KMS.

## Out of Scope

- A Raw ML-KEM Keyring that performs decapsulation locally.
- Cross-language implementations beyond Java.
- Changes to the ESDK message format or algorithm-suite registry.

## Motivation

The ESDK's body cipher (AES-GCM) is quantum-resistant,
but the asymmetric primitives currently used to wrap symmetric data keys
(RSA, ECC inside AWS KMS) are not.
ML-KEM is the NIST-standardized post-quantum KEM and is now exposed by AWS KMS
via `Encapsulate` / `Decapsulate`.
This keyring lets customers migrate envelope encryption to a quantum-resistant
primitive without changing the message format, the algorithm suites,
other keyrings, or needing to create their own custom keyring.

## Security Implications

See
[Security Considerations](../../framework/aws-kms/aws-kms-ml-kem-keyring.md#security-considerations)
in the keyring specification for the full normative treatment.
In summary: the keyring binds the encryption context into both the KDF and the
AES-GCM AAD, and relies on the AES-GCM authentication tag plus ML-KEM's implicit
rejection for tamper detection in lieu of a separate key commitment value.

## Reference-level Explanation

This change introduces
[`framework/aws-kms/aws-kms-ml-kem-keyring.md`](../../framework/aws-kms/aws-kms-ml-kem-keyring.md),
registers the keyring in the
[Supported Keyrings](../../framework/keyring-interface.md#supported-keyrings) list,
and enumerates the keyring in the test-vector framework
(key descriptions, keys manifest, input dimensions, and a complete-vectors document).
