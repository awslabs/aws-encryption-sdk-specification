[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# AWS KMS ML-KEM Keyring

## Affected Features

| Feature                                                                       |
| ----------------------------------------------------------------------------- |
| [Keyring Interface](../../framework/keyring-interface.md)                     |
| [AWS KMS ML-KEM Keyring](../../framework/aws-kms/aws-kms-ml-kem-keyring.md)   |

## Affected Specifications

| Specification                                                                                            |
| -------------------------------------------------------------------------------------------------------- |
| [AWS KMS ML-KEM Keyring](../../framework/aws-kms/aws-kms-ml-kem-keyring.md) (new)                        |
| [ML-KEM Key Derivation](../../framework/ml-kem-key-derivation.md) (new)                                  |
| [Keyring Interface — Supported Keyrings](../../framework/keyring-interface.md#supported-keyrings)        |
| [Test Vectors — Key Description](../../framework/test-vectors/key-description.md)                        |
| [Test Vectors — Keys Manifest](../../framework/test-vectors/keys-manifest.md)                            |
| [Test Vectors — MPL Enumeration](../../framework/test-vectors/mpl-test-vector-enumeration.md)            |
| [Test Vectors — AWS KMS ML-KEM Keyring](../../framework/test-vectors/complete-vectors/ml-kem.md) (new)   |

## Affected Implementations

| Language | Version Introduced | Version Removed | Implementation |
| -------- | ------------------ | --------------- | -------------- |
| Java     | TBD                | n/a             | TBD            |
| Dafny    | n/a                | n/a             | Not planned for initial release. |
| .NET     | n/a                | n/a             | Not planned for initial release. |

## Definitions

- **ML-KEM** :
  Module-Lattice-Based Key Encapsulation Mechanism,
  a NIST-standardized post-quantum Key Encapsulation Mechanism
  (FIPS 203).

- **KEM** :
  Key Encapsulation Mechanism — a public-key primitive
  whose `Encapsulate(public key)` produces a fresh shared secret and a ciphertext,
  and whose `Decapsulate(private key, ciphertext)` recovers the same shared secret.

- **Encapsulation Source** :
  The configuration that selects whether ML-KEM `Encapsulate` runs in AWS KMS
  (`KmsEncapsulation`) or locally against the ML-KEM public key
  (`LocalEncapsulation`).

- **Shared Secret** :
  The 32-byte value produced by ML-KEM `Encapsulate`
  and recovered by ML-KEM `Decapsulate`,
  used as input keying material to the keyring's KDF.

### Conventions used in this document

The key words
"MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT",
"SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL"
in this document are to be interpreted as described in
[RFC 2119](https://tools.ietf.org/html/rfc2119).

## Summary

AWS KMS supports ML-KEM, a NIST-standardized post-quantum Key Encapsulation Mechanism,
through new `Encapsulate` and `Decapsulate` APIs on ML-KEM KMS keys.

This change introduces a new keyring, the AWS KMS ML-KEM Keyring,
that uses an ML-KEM KMS key to protect data keys in a quantum-resistant manner.
The keyring establishes a fresh per-message shared secret via ML-KEM,
derives a wrapping key from that secret using a KDF that binds the encryption context,
and AES-GCM-wraps the data key under the wrapping key.

The keyring's encapsulation source is configurable:

- `KmsEncapsulation` calls AWS KMS `Encapsulate` on encrypt.
- `LocalEncapsulation` performs `Encapsulate` locally against the ML-KEM public key,
  requiring no per-message KMS call and no `kms:Encapsulate` permission on encrypt.

Decapsulation is always performed by AWS KMS,
so the ML-KEM private key never leaves AWS KMS.
Both encapsulation sources produce a byte-identical encrypted data key,
so messages produced by either source decrypt through the same KMS-backed decrypt path.

The keyring reuses the existing AWS Encryption SDK message format and algorithm suites.
ML-KEM-specific bytes live entirely inside the encrypted data key produced by the keyring.

## Out of Scope

The following items are explicitly out of scope for this change
and may be addressed in future work:

- **Raw ML-KEM Keyring** — a keyring that performs both encapsulation and decapsulation
  locally (no KMS dependency), analogous to the existing Raw RSA Keyring.
  Decapsulation remains in AWS KMS for this change.
- **Cached shared-secret reuse** — calling AWS KMS `Encapsulate` once and reusing the
  shared secret across many messages. This introduces statefulness and cross-message
  linkability and is deferred.
- **Cross-language implementations** — this change targets a Java implementation.
  Other languages may follow.
- **Changes to the ESDK message format** or the algorithm-suite registry.

## Motivation

In a future where cryptographically-relevant quantum computers exist,
data keys encrypted under classical asymmetric primitives (RSA, ECC)
are vulnerable to "harvest now, decrypt later" attacks.
The AES-GCM body encryption performed by the ESDK is itself quantum-resistant,
but the asymmetric mechanisms used today to wrap the symmetric data key are not.

ML-KEM, as standardized by NIST in FIPS 203,
is a Key Encapsulation Mechanism designed to resist attack by both classical
and quantum adversaries.
AWS KMS now exposes ML-KEM via `Encapsulate` and `Decapsulate` APIs.

Adding a keyring that wraps data keys using ML-KEM
lets ESDK customers migrate envelope encryption to a quantum-resistant primitive
without changing the message format, the algorithm suites, the body cipher,
or any other keyring.

## Drawbacks

- The keyring depends on AWS KMS support for ML-KEM,
  which is a new service capability.
- Local encapsulation requires a local ML-KEM provider
  (e.g. AWS-LC, BouncyCastle, or ACCP) and additional code paths.

## Security Implications

The keyring derives the AES-GCM wrapping key from the shared secret
through a KDF (NIST SP 800-108 Counter Mode with HMAC-SHA384)
that binds the AWS KMS key ARN, a keyring version byte, and the canonicalized
encryption context as `FixedInfo`.
The same `FixedInfo` is also used as AES-GCM Additional Authenticated Data
during the data key wrap.
Encryption context binding is therefore present on both the wrapping-key derivation
and the wrap itself; tampering with either is detected by AES-GCM authentication.

The keyring does not derive an explicit key commitment value.
Modifying the encrypted data key, the salt, or the encryption context
causes the AES-GCM authentication tag to fail.
ML-KEM's implicit rejection additionally ensures that decapsulating an invalid
KEM ciphertext yields a pseudo-random shared secret rather than an error,
which deterministically derives a wrong wrapping key.

Because the wrapping key is unique per message (fresh shared secret and fresh salt),
the keyring may safely use a fixed (zeroed) 12-byte AES-GCM IV
without violating AES-GCM nonce uniqueness across messages.

KMS encapsulation and local encapsulation produce byte-identical encrypted data keys
and use the same ML-KEM key pair.
Local encapsulation removes the per-message KMS call and the `kms:Encapsulate`
permission requirement from the encrypt path,
at the cost of trusting the local ML-KEM provider for `Encapsulate` correctness.
Decapsulation is always performed by AWS KMS, regardless of encapsulation source.

## Operational Implications

- **Required permissions** —
  `kms:Decapsulate` is required on the decrypt path for all configurations.
  `kms:Encapsulate` is required on the encrypt path only when `KmsEncapsulation`
  is configured.
  `kms:GetPublicKey` is required once at configuration time when `LocalEncapsulation`
  is configured without a pre-supplied public key.
- **KMS calls** —
  `KmsEncapsulation` adds one KMS call per encrypt.
  `LocalEncapsulation` adds no KMS calls on encrypt
  (after the optional one-time `GetPublicKey`).
  All decrypts call KMS once.
- **Key management** —
  ML-KEM KMS keys use `ENCAPSULATE_DECAPSULATE` key usage.

## Reference-level Explanation

This change introduces the following normative specifications:

- [`framework/aws-kms/aws-kms-ml-kem-keyring.md`](../../framework/aws-kms/aws-kms-ml-kem-keyring.md)
  defining the keyring, its initialization, encapsulation source configuration,
  byte-level structure of the encrypted data key, operation,
  security considerations, and multi-keyring compatibility.
- [`framework/ml-kem-key-derivation.md`](../../framework/ml-kem-key-derivation.md)
  defining the byte-exact KDF construction (NIST SP 800-108 Counter Mode,
  HMAC-SHA384 PRF, 32-byte output) and `FixedInfo` serialization
  that the AWS KMS ML-KEM Keyring (and any future ML-KEM keyring) consumes.

The change also:

- Adds the new keyring to the
  [Supported Keyrings](../../framework/keyring-interface.md#supported-keyrings) list.
- Enumerates the new keyring in the test-vector key-description and key manifest
  specifications, and adds a complete-vectors document defining the basic tests.

## Guide-level Explanation

A customer creates an ML-KEM KMS key with `ENCAPSULATE_DECAPSULATE` key usage.

For the default behavior, the customer constructs the keyring with
`KmsEncapsulation`:
on encrypt, the keyring calls KMS to obtain a fresh shared secret and KEM ciphertext;
on decrypt, the keyring calls KMS to recover the shared secret from the KEM ciphertext.

For environments that prefer to avoid a per-message KMS call on encrypt,
the customer constructs the keyring with `LocalEncapsulation`,
optionally supplying the ML-KEM public key directly.
The encrypt path then runs entirely locally,
while decryption still calls KMS to recover the shared secret.

Messages produced by either configuration decrypt via the same KMS-backed decrypt path.

## Examples

See [`examples/templates/configuration/aws-kms-ml-kem-keyring/`](../../examples/templates/configuration/aws-kms-ml-kem-keyring/)
for the required example.
