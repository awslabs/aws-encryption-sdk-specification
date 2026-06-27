[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# AWS KMS ML-KEM Keyring

## Version

0.1.0-preview

### Changelog

- 0.1.0-preview

  - Initial record.

## Implementations

| Language | Confirmed Compatible with Spec Version | Minimum Version Confirmed | Implementation |
| -------- | -------------------------------------- | ------------------------- | -------------- |

## Overview

A keyring which uses an AWS KMS ML-KEM key
to establish a per-message shared secret
from which a wrapping key is derived,
and which then performs envelope encryption on a data key
using AES-GCM with that wrapping key.

The keyring's encapsulation source is configurable.
On encrypt, encapsulation MAY be performed by AWS KMS (`Encapsulate`)
or locally against the ML-KEM public key.
On decrypt, decapsulation is always performed by AWS KMS (`Decapsulate`);
the ML-KEM private key never leaves AWS KMS.

This keyring provides quantum-resistant protection of data keys
without requiring a change to the AWS Encryption SDK message format
or to the algorithm suites that govern body encryption.

## Definitions

### Conventions used in this document

The key words
"MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT",
"SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL"
in this document are to be interpreted as described in
[RFC 2119](https://tools.ietf.org/html/rfc2119).

### ML-KEM

ML-KEM (Module-Lattice-Based Key Encapsulation Mechanism) is a
[NIST-standardized Key Encapsulation Mechanism](https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.203.pdf)
believed to resist attack by both classical and quantum adversaries.

A Key Encapsulation Mechanism is a public-key primitive defined by three operations:

- `KeyGen` produces an encapsulation key (public) and a decapsulation key (private).
- `Encapsulate(public key)` produces `(ciphertext, sharedSecret)`,
  where the shared secret is a fresh random 32-byte value and the ciphertext encapsulates it.
- `Decapsulate(private key, ciphertext)` recovers the same shared secret.

The shared secret is never transmitted as plaintext;
only the ciphertext travels with the message.
ML-KEM uses implicit rejection: decapsulating an invalid ciphertext
returns a pseudo-random secret rather than an error.

### ML-KEM Public Key

For local encapsulation, an ML-KEM public key
MUST be a DER-encoded ASN.1 `SubjectPublicKeyInfo`
as defined for ML-KEM in
[NIST FIPS 203](https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.203.pdf).

### Shared Secret

A 32-byte value produced by ML-KEM `Encapsulate` and recovered by `Decapsulate`.
The shared secret is used as the input keying material to the
[key derivation step](#key-derivation) and is never used directly to wrap a data key.

### KEM Ciphertext

The byte string produced by ML-KEM `Encapsulate`
(returned by AWS KMS as `SharedSecretCiphertextBlob`)
that encapsulates the shared secret.
Its length is fixed by the ML-KEM parameter set
(see [Supported Parameter Sets](#supported-parameter-sets)).

## Interface

MUST implement the [AWS Encryption SDK Keyring interface](../keyring-interface.md#interface).

## Initialization

On keyring initialization, the caller:

- MUST provide an AWS KMS key identifier.
- MUST provide an AWS KMS SDK client.
- MUST provide an [ML-KEM Parameter Set](#supported-parameter-sets).
- MUST provide an [Encapsulation Source](#encapsulation-source).

On keyring initialization, the caller:

- MAY provide a list of Grant Tokens.

The AWS KMS key identifier MUST NOT be null or empty.
The AWS KMS key identifier MUST be
[a valid AWS KMS identifier](./aws-kms-key-arn.md#a-valid-aws-kms-identifier).
The AWS KMS key identifier MUST NOT be an AWS KMS alias.

### Supported Parameter Sets

The following ML-KEM parameter sets are currently defined.
All byte lengths are taken from
[NIST FIPS 203 §8 (Parameter Sets)](https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.203.pdf).

| Parameter Set | KEM Ciphertext Length (bytes) | Public Key Length (bytes, encapsulation key) |
| ------------- | ----------------------------- | -------------------------------------------- |
| ML-KEM-512    | 768                           | 800                                          |
| ML-KEM-768    | 1088                          | 1184                                         |
| ML-KEM-1024   | 1568                          | 1568                                         |

This keyring MUST NOT use a parameter set outside of the defined above.

### Encapsulation Source

The keyring's encapsulation source determines where ML-KEM `Encapsulate` runs on encrypt.
Decapsulation is always performed by AWS KMS, regardless of the encapsulation source.

Exactly one of the following encapsulation sources MUST be configured:

- **`KmsEncapsulation`** —
  `OnEncrypt` MUST call AWS KMS `Encapsulate` against the configured key identifier.
  This source carries no additional fields.
- **`LocalEncapsulation`** —
  `OnEncrypt` MUST perform ML-KEM `Encapsulate` locally against the configured public key.
  This source carries:
  - The [ML-KEM Public Key](#ml-kem-public-key).
    If the public key is not supplied at configuration time,
    the keyring MUST obtain it once via AWS KMS `GetPublicKey` and cache it.

Both encapsulation sources produce a byte-identical
[encrypted data key](#structure),
so a message encrypted with either source is decrypted by the same KMS-backed decrypt path.

## Structure

### Key Provider Information

This structure is a sequence of bytes in big-endian format to be used as the
[key provider information](../structures.md#key-provider-information) field in
[encrypted data keys](../structures.md#encrypted-data-keys) produced by this keyring.

The following table describes the fields that form the key provider information.
The bytes are appended in the order shown.

| Field          | Length (bytes) | Interpreted as |
| -------------- | -------------- | -------------- |
| Version        | 1              | `0x01`         |
| Key ARN Length | 2              | UInt16         |
| Key ARN        | Variable       | UTF-8 Bytes    |

The `Key ARN` field MUST be the fully qualified AWS KMS key ARN
identifying the ML-KEM KMS key
that produced the [KEM Ciphertext](#kem-ciphertext).

### Ciphertext

This structure is a sequence of bytes in big-endian format to be used as
the [ciphertext](../structures.md#ciphertext) field in
[encrypted data keys](../structures.md#encrypted-data-key) produced by this keyring.

The following table describes the fields that form the ciphertext.
The bytes are appended in the order shown.

| Field              | Length (bytes)                                                                      | Interpreted as |
| ------------------ | ----------------------------------------------------------------------------------- | -------------- |
| KEM Ciphertext     | Fixed by the [parameter set](#supported-parameter-sets) (768 / 1088 / 1568)         | Bytes          |
| Salt               | 32                                                                                  | Bytes          |
| Encrypted Key      | Length of AES-GCM ciphertext output (i.e. the data key length, per algorithm suite) | Bytes          |
| Authentication Tag | 16                                                                                  | Bytes          |

The AES-GCM IV is fixed and is NOT carried in the ciphertext;
see [Data Key Wrapping](#data-key-wrapping).

## Key Derivation

The keyring MUST derive the AES-GCM wrapping key from the shared secret
according to [ML-KEM Key Derivation](../ml-kem-key-derivation.md),
binding into the KDF's `FixedInfo`:

- The keyring's configured parameter set
  (from [Supported Parameter Sets](#supported-parameter-sets)).
- The fully qualified ARN of the configured AWS KMS key,
  matching the `Key ARN` in the
  [Key Provider Information](#key-provider-information).
- The keyring version byte `0x01`,
  matching the `Version` byte in the [Key Provider Information](#key-provider-information).
- The canonicalized encryption context from the materials.

The salt input to the KDF MUST be the 32-byte salt carried in the
[Ciphertext structure](#ciphertext).

This keyring does NOT use a key commitment construction.
See [Security Considerations](#security-considerations) for the rationale.

## Operation

### OnEncrypt

OnEncrypt MUST take [encryption materials](../structures.md#encryption-materials) as input.

If the encryption materials do not contain a plaintext data key,
OnEncrypt MUST generate a fresh random plaintext data key
of the length defined by the materials'
[algorithm suite](../algorithm-suites.md).

The keyring MUST attempt to serialize the
[encryption materials'](../structures.md#encryption-materials)
[encryption context](../structures.md#encryption-context-1)
according to the
[encryption context serialization specification](../structures.md#serialization).
If the keyring cannot serialize the encryption context, OnEncrypt MUST fail.

The keyring MUST obtain `(sharedSecret, kemCiphertext)`
from the configured [Encapsulation Source](#encapsulation-source):

- For `KmsEncapsulation`, the keyring MUST call AWS KMS `Encapsulate`
  with a request constructed as follows:
  - `KeyId` MUST be the configured AWS KMS key identifier.
  - `EncapsulationAlgorithm` MUST be `ML_KEM`.
  - `GrantTokens` MUST be this keyring's grant tokens.
- For `LocalEncapsulation`, the keyring MUST perform ML-KEM `Encapsulate`
  locally against the configured ML-KEM public key,
  using a cryptographically secure random source.

If the encapsulation step fails, OnEncrypt MUST fail
and MUST NOT modify the encryption materials.

The keyring MUST generate a 32-byte random salt
using a cryptographically secure random source.

The keyring MUST derive the wrapping key from the shared secret
according to [Key Derivation](#key-derivation), using the generated salt.
If the key derivation step fails, OnEncrypt MUST fail.

The keyring MUST perform data key wrapping
according to [Data Key Wrapping](#data-key-wrapping).
If the keyring is unable to wrap the plaintext data key,
OnEncrypt MUST fail and MUST NOT modify the encryption materials.

Otherwise, OnEncrypt MUST append a new
[encrypted data key](../structures.md#encrypted-data-key)
to the encrypted data key list in the encryption materials, constructed as follows:

- The [key provider id](../structures.md#key-provider-id)
  MUST be the UTF-8 encoded string `"aws-kms-ml-kem"`.
- The [key provider information](../structures.md#key-provider-information)
  is serialized as the
  [Key Provider Information](#key-provider-information) defined above.
- The [ciphertext](../structures.md#ciphertext)
  is serialized as the [Ciphertext](#ciphertext) defined above.

OnEncrypt MUST set the plaintext data key on the returned encryption materials
and MUST output the modified encryption materials.

### OnDecrypt

OnDecrypt MUST take [decryption materials](../structures.md#decryption-materials)
and a list of [encrypted data keys](../structures.md#encrypted-data-key) as input.

If the decryption materials already contain a plaintext data key,
OnDecrypt MUST fail
and MUST NOT modify the decryption materials.

The keyring MUST attempt to serialize the
[decryption materials'](../structures.md#decryption-materials)
[encryption context](../structures.md#encryption-context-1)
according to the
[encryption context serialization specification](../structures.md#serialization).
If the keyring cannot serialize the encryption context, OnDecrypt MUST fail.

The set of encrypted data keys MUST first be filtered to match this keyring's configuration.
For an encrypted data key to match:

- The key provider ID MUST equal the UTF-8 encoded string `"aws-kms-ml-kem"`.
- The [Key Provider Information](#key-provider-information) and
  [Ciphertext](#ciphertext) MUST be successfully deserialized.
- The deserialized `Version` value MUST match `0x01`.
- The deserialized `Key ARN` MUST match the keyring's configured AWS KMS key identifier
  (compared after [AWS KMS key identifier normalization](./aws-kms-key-arn.md)).
- The deserialized KEM Ciphertext length MUST match the configured parameter set.

For each encrypted data key in the filtered set, one at a time,
OnDecrypt MUST attempt to decrypt the data key.
If this attempt results in an error, then these errors MUST be collected.

To attempt to decrypt a particular encrypted data key,
OnDecrypt MUST attempt to deserialize the [Ciphertext](#ciphertext) to obtain:

- The KEM Ciphertext.
- The Salt.
- The Encrypted Key.
- The Authentication Tag.

If the keyring is unable to deserialize this information,
then an error MUST be collected
and the next encrypted data key in the filtered set MUST be attempted.

The keyring MUST recover the shared secret
by calling AWS KMS `Decapsulate` with a request constructed as follows:

- `KeyId` MUST be the configured AWS KMS key identifier.
- `EncapsulationAlgorithm` MUST be `ML_KEM`.
- `CiphertextBlob` MUST be the deserialized KEM Ciphertext.
- `GrantTokens` MUST be this keyring's grant tokens.

If the call to AWS KMS `Decapsulate` fails,
an error MUST be collected
and the next encrypted data key in the filtered set MUST be attempted.

The keyring MUST derive the wrapping key from the recovered shared secret
according to [Key Derivation](#key-derivation),
using the deserialized salt.

If the key derivation step fails,
an error MUST be collected
and the next encrypted data key in the filtered set MUST be attempted.

The keyring MUST perform data key unwrapping
according to [Data Key Unwrapping](#data-key-unwrapping).
If the keyring fails to unwrap the data key,
an error MUST be collected
and the next encrypted data key in the filtered set MUST be attempted.

If unwrapping succeeds, OnDecrypt:

- MUST set the plaintext data key on the
  [decryption materials](../structures.md#decryption-materials).
- MUST immediately return the modified decryption materials.

If OnDecrypt fails to successfully decrypt any encrypted data key,
then it MUST yield an error that includes all the collected errors.

### Data Key Wrapping

The keyring MUST encrypt the plaintext data key using `AES-GCM-256` with the following inputs:

- The keyring MUST use the derived wrapping key as the AES-GCM cipher key.
- The keyring MUST use the plaintext data key as the AES-GCM message.
- The keyring MUST use a zeroed-out 12-byte IV.
- The keyring MUST use an authentication tag of length 16 bytes.
- The keyring MUST use as the AES-GCM Additional Authenticated Data
  the same `FixedInfo` byte string defined in [Key Derivation](#key-derivation).

A zeroed-out IV is acceptable here because the wrapping key
is derived once per message from a fresh random salt
and is never reused; see [Security Considerations](#security-considerations).

### Data Key Unwrapping

The keyring MUST decrypt the Encrypted Key using `AES-GCM-256` with the following inputs:

- The keyring MUST use the derived wrapping key as the AES-GCM cipher key.
- The keyring MUST use the Encrypted Key obtained from deserialization
  as the AES-GCM input ciphertext.
- The keyring MUST use the Authentication Tag obtained from deserialization
  as the AES-GCM input authentication tag.
- The keyring MUST use a zeroed-out 12-byte IV.
- The keyring MUST use as the AES-GCM Additional Authenticated Data
  the same `FixedInfo` byte string defined in [Key Derivation](#key-derivation),
  reconstructed from the decryption materials' encryption context and the
  Key Provider Information.

If AES-GCM authentication fails, data key unwrapping MUST fail.

## Security Considerations

**No key commitment.**
The keyring does not derive or carry a key commitment value.
Tampering with the encrypted data key, the salt, or the encryption context
is detected by the AES-GCM authentication tag of the data key wrap:
any such modification changes the
`FixedInfo` used as AAD or as KDF input, which causes AEAD authentication to fail.
ML-KEM additionally provides implicit rejection — decapsulation of an invalid
KEM ciphertext returns a pseudo-random shared secret rather than an error —
so a corrupted KEM ciphertext deterministically produces an unrelated wrapping key
that cannot decrypt the data key wrap.

**Encryption context binding.**
The serialized encryption context is bound into the wrapping key
via the `FixedInfo` field of the KDF and into the data key wrap
via the AES-GCM Additional Authenticated Data.
Both bindings must agree on decrypt for the unwrap to succeed.

**Encapsulation source equivalence.**
KMS encapsulation and local encapsulation use the same ML-KEM key pair
and produce a byte-identical encrypted data key,
so the choice of encapsulation source has no effect on decryptors.
Local encapsulation does not transmit the shared secret to AWS KMS on encrypt,
which removes the per-message KMS call and the `kms:Encapsulate` permission
requirement from the encrypt path
at the cost of trusting the local ML-KEM provider for `Encapsulate` correctness.

**Algorithm suite compatibility.**
The keyring is compatible with all
[ESDK algorithm suites](../algorithm-suites.md),
including signing suites.
The shared-secret-derived wrapping key is unique per message,
so reusing a zeroed-out AES-GCM IV (see [Data Key Wrapping](#data-key-wrapping))
does not violate AES-GCM nonce uniqueness across messages.

## Multi-Keyring Compatibility

This keyring MAY be used as a member of a
[multi-keyring](../multi-keyring.md).

This keyring MUST NOT be used inside an
[AWS KMS multi-keyring](./aws-kms-multi-keyrings.md).
An AWS KMS multi-keyring requires its generator and children to be
[AWS KMS keyrings](./aws-kms-keyring.md),
whose construction differs from this keyring (symmetric `GenerateDataKey` / `Encrypt` /
`Decrypt` vs. ML-KEM `Encapsulate` / `Decapsulate`),
so its inclusion in an AWS KMS multi-keyring is not defined.
