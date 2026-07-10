[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# AWS KMS ML-KEM Keyring

## Implementations

| Language | Confirmed Compatible with Spec Version | Minimum Version Confirmed | Implementation |
| -------- | -------------------------------------- | ------------------------- | -------------- |

## Overview

A keyring that uses an AWS KMS ML-KEM key
to establish a per-message shared secret,
derives a wrapping key from it,
and AES-GCM-wraps the data key.
Encapsulation source is configurable (KMS or local);
decapsulation is always performed by AWS KMS.

## Definitions

### Conventions used in this document

The key words
"MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT",
"SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL"
in this document are to be interpreted as described in
[RFC 2119](https://tools.ietf.org/html/rfc2119).

### ML-KEM

[ML-KEM](https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.203.pdf)
is the NIST-standardized Module-Lattice-Based Key Encapsulation Mechanism (FIPS 203).
`Encapsulate(public key)` produces `(ciphertext, sharedSecret)`;
`Decapsulate(private key, ciphertext)` recovers the same shared secret.
ML-KEM uses implicit rejection:
decapsulating an invalid ciphertext returns a pseudo-random secret rather than an error.

### ML-KEM Public Key

For local encapsulation, an ML-KEM public key
MUST be a DER-encoded ASN.1 `SubjectPublicKeyInfo` as defined for ML-KEM in
[NIST FIPS 203](https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.203.pdf).
If the public key is not a valid DER-encoded `SubjectPublicKeyInfo`,
the keyring MUST fail.

### Shared Secret

The shared secret is the 32-byte value that ML-KEM `Encapsulate` produces
and that `Decapsulate` recovers.
The keyring uses it as the input keying material to [key derivation](#key-derivation),
and it is never used directly to wrap or encrypt a data key.

### Shared Secret Ciphertext

The byte string produced by ML-KEM `Encapsulate`
(returned by AWS KMS as `SharedSecretCiphertextBlob`).
Its length is fixed by the [parameter set](#supported-parameter-sets).

## Interface

The ML-KEM keyring MUST implement the [AWS Encryption SDK Keyring interface](../keyring-interface.md#interface).

## Initialization

The keyring constructor accepts the following required arguments:

- MUST accept an AWS KMS key identifier.
- MUST accept an AWS KMS SDK client.
- MUST accept an [ML-KEM Parameter Set](#supported-parameter-sets).
- MUST accept an [Encapsulation Source](#encapsulation-source).

The keyring constructor accepts the following optional arguments:

- MUST accept an optional list of Grant Tokens.

The AWS KMS key identifier MUST be
[a valid AWS KMS identifier](./aws-kms-key-arn.md#a-valid-aws-kms-identifier).
The AWS KMS key identifier MUST NOT be an AWS KMS alias.

### Supported Parameter Sets

The following ML-KEM parameter sets are currently defined.
All byte lengths are taken from
[NIST FIPS 203 §8 (Parameter Sets)](https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.203.pdf).

The supported parameter sets are listed in the table below.

| Parameter Set | Shared Secret Ciphertext Length (bytes) | Public Key Length (bytes, encapsulation key) |
| ------------- | ----------------------------- | -------------------------------------------- |
| ML-KEM-512    | 768                           | 800                                          |
| ML-KEM-768    | 1088                          | 1184                                         |
| ML-KEM-1024   | 1568                          | 1568                                         |

The supported parameter sets MUST be ML-KEM-512, ML-KEM-768, and ML-KEM-1024.

ML-KEM-512 MUST use a shared secret ciphertext length of 768 bytes.
ML-KEM-512 MUST use a Public Key Length of 800 bytes.
ML-KEM-768 MUST use a shared secret ciphertext length of 1088 bytes.
ML-KEM-768 MUST use a Public Key Length of 1184 bytes.
ML-KEM-1024 MUST use a shared secret ciphertext length of 1568 bytes.
ML-KEM-1024 MUST use a Public Key Length of 1568 bytes.

### Encapsulation Source

Exactly one of the following encapsulation sources MUST be configured.
Decapsulation is always performed by AWS KMS, regardless of the encapsulation source.
Both sources produce a byte-identical [encrypted data key](#structure).

- **`KmsEncapsulation`** —
  `OnEncrypt` MUST call AWS KMS `Encapsulate` against the configured key identifier and the provided ML-KEM public key.
- **`LocalEncapsulation`** —
  `OnEncrypt` MUST perform ML-KEM `Encapsulate` locally against the configured
  [ML-KEM public key](#ml-kem-public-key).
  If the public key is not supplied at configuration time, keyring construction MUST fail.

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

The key provider information MUST be in big-endian format.
The fields MUST be in the following order: Version, Key ARN Length, Key ARN.
The value of the Version field MUST be `0x01`.
The length of the Key ARN Length field MUST be 2 bytes.
The value of the Key ARN Length field MUST be the length in bytes of the Key ARN field.
The Key ARN field MUST be the UTF-8 encoded, fully qualified AWS KMS key ARN
identifying the ML-KEM KMS key that produced the [Shared Secret Ciphertext](#shared-secret-ciphertext).

### Ciphertext

This structure is a sequence of bytes in big-endian format to be used as
the [ciphertext](../structures.md#ciphertext) field in
[encrypted data keys](../structures.md#encrypted-data-key) produced by this keyring.

The following table describes the fields that form the ciphertext.
The bytes are appended in the order shown.

| Field              | Length (bytes)                                                                      | Interpreted as |
| ------------------ | ----------------------------------------------------------------------------------- | -------------- |
| Shared Secret Ciphertext     | Fixed by the [parameter set](#supported-parameter-sets) (768 / 1088 / 1568)         | Bytes          |
| Salt               | 32                                                                                  | Bytes          |
| Encrypted Key      | Length of AES-GCM ciphertext output (i.e. the data key length, per algorithm suite) | Bytes          |
| Authentication Tag | 16                                                                                  | Bytes          |

The ciphertext MUST be in big-endian format.
The fields MUST be in the following order: Shared Secret Ciphertext, Salt, Encrypted Key, Authentication Tag.
The length of the Shared Secret Ciphertext field MUST equal the length fixed by the configured [parameter set](#supported-parameter-sets).
The length of the Salt field MUST be 32 bytes.
The Encrypted Key field MUST be the AES-GCM ciphertext of the plaintext data key produced by [Data Key Wrapping](#data-key-wrapping).
The length of the Authentication Tag field MUST be 16 bytes.

The AES-GCM IV is fixed and is NOT carried in the ciphertext;
see [Data Key Wrapping](#data-key-wrapping).

## Key Derivation

The keyring derives the AES-GCM wrapping key from the shared secret
using
[NIST SP 800-108 Counter Mode](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-108r1-upd1.pdf#page=14)
with HMAC-SHA384 as the PRF.

The Key Derivation Function Configuration is defined as:

- Key Derivation Function:
  [Counter-Mode](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-108r1-upd1.pdf#page=14).
- Pseudo Random Function: HMAC-SHA384.
- Output length: 32 bytes (the AES-GCM-256 wrapping key).

The Key (input keying material) input to the KDF MUST be the 32-byte ML-KEM shared secret.
The Salt input to the KDF MUST be the 32-byte random value carried in the [Ciphertext structure](#ciphertext).
The `FixedInfo` input to the KDF MUST be the byte string constructed below.
On encrypt the keyring MUST generate the salt using a cryptographically secure random source.

The `FixedInfo` input to the key derivation function is the concatenation,
in the order listed below, of the following fields,
where each field is immediately preceded by a 2-byte big-endian unsigned integer
(`UInt16`) equal to the byte length of that field:

UInt16(length of field) || field, for each field in order.

The first `FixedInfo` field MUST be `UTF8("AWS-KMS-ML-KEM-KEY-DERIVATION")`.
The second `FixedInfo` field MUST be `UTF8(parameter_set)`.
The third `FixedInfo` field MUST be `UTF8("HMAC_SHA384")`.
The fourth `FixedInfo` field MUST be `UTF8(kms_key_arn)`.
The fifth `FixedInfo` field MUST be `keyring_version_byte`.
The sixth `FixedInfo` field MUST be `canonicalized(encryption_context)`.

The 2-byte length prefix preceding each `FixedInfo` field
MUST equal the byte length of that field.

Where:

- `parameter_set` is the UTF-8 encoding of the configured
  [parameter set](#supported-parameter-sets)
  (`"ML-KEM-512"`, `"ML-KEM-768"`, or `"ML-KEM-1024"`).
- `kms_key_arn` is the UTF-8 encoding of the fully qualified ARN of the ML-KEM KMS key
  (matching the `Key ARN` in the [Key Provider Information](#key-provider-information)).
- `keyring_version_byte` is `0x01`
  (matching the `Version` byte in the [Key Provider Information](#key-provider-information)).
- `canonicalized(encryption_context)` is the result of applying the
  [encryption context serialization specification](../structures.md#serialization)
  to the materials' encryption context.

This keyring does NOT use a key commitment construction.
See [Security Considerations](#security-considerations) for the rationale.

## Operation

### OnEncrypt

OnEncrypt MUST take [encryption materials](../structures.md#encryption-materials) as input.

If the encryption materials do not contain a plaintext data key,
OnEncrypt MUST generate a new plaintext data key.
The generated plaintext data key MUST be a fresh random value from a cryptographically secure random source, of the length defined by the materials' [algorithm suite](../algorithm-suites.md).

The keyring MUST attempt to serialize the
[encryption materials'](../structures.md#encryption-materials)
[encryption context](../structures.md#encryption-context-1)
according to the
[encryption context serialization specification](../structures.md#serialization).
If the keyring cannot serialize the encryption context, OnEncrypt MUST fail.

The keyring MUST obtain `(sharedSecret, sharedSecretCiphertext)`
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

The Version field MUST be serialized as described in [Key Provider Information](#key-provider-information).
The Key ARN Length field MUST be serialized as described in [Key Provider Information](#key-provider-information).
The Key ARN field MUST be serialized as described in [Key Provider Information](#key-provider-information).
The Shared Secret Ciphertext field MUST be serialized as described in [Ciphertext](#ciphertext).
The Salt field MUST be serialized as described in [Ciphertext](#ciphertext).
The Encrypted Key field MUST be serialized as described in [Ciphertext](#ciphertext).
The Authentication Tag field MUST be serialized as described in [Ciphertext](#ciphertext).

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
- The deserialized Shared Secret Ciphertext length MUST match the configured parameter set.

For each encrypted data key in the filtered set, one at a time,
OnDecrypt MUST attempt to decrypt the data key.
If this attempt results in an error, then these errors MUST be collected.

To attempt to decrypt a particular encrypted data key,
OnDecrypt MUST attempt to deserialize the [Ciphertext](#ciphertext) to obtain:

- The Shared Secret Ciphertext.
- The Salt.
- The Encrypted Key.
- The Authentication Tag.

The Version field MUST be deserialized as described in [Key Provider Information](#key-provider-information).
The Key ARN Length field MUST be deserialized as described in [Key Provider Information](#key-provider-information).
The Key ARN field MUST be deserialized as described in [Key Provider Information](#key-provider-information).
The Shared Secret Ciphertext field MUST be deserialized as described in [Ciphertext](#ciphertext).
The Salt field MUST be deserialized as described in [Ciphertext](#ciphertext).
The Encrypted Key field MUST be deserialized as described in [Ciphertext](#ciphertext).
The Authentication Tag field MUST be deserialized as described in [Ciphertext](#ciphertext).

If the keyring is unable to deserialize this information,
then an error MUST be collected
and the next encrypted data key in the filtered set MUST be attempted.

The keyring MUST recover the shared secret
by calling AWS KMS `Decapsulate` with a request constructed as follows:

- `KeyId` MUST be the configured AWS KMS key identifier.
- `EncapsulationAlgorithm` MUST be `ML_KEM`.
- `CiphertextBlob` MUST be the deserialized Shared Secret Ciphertext.
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
- The keyring MUST encrypt the plaintext data using an authentication tag of length 16 bytes.
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

## Multi-Keyring Compatibility

This keyring MAY be used inside a [multi-keyring](../multi-keyring.md).

This keyring MUST NOT be used inside an
[AWS KMS multi-keyring](./aws-kms-multi-keyrings.md),
which requires generator and children to be
[AWS KMS keyrings](./aws-kms-keyring.md) whose symmetric
`GenerateDataKey` / `Encrypt` / `Decrypt` construction differs from this keyring's
`Encapsulate` / `Decapsulate`.

## Security Considerations

**No key commitment.**
The keyring does not derive or carry a key commitment value.
Any modification to the encrypted data key, the salt, or the encryption context
changes the `FixedInfo` used as KDF input and as AES-GCM AAD,
which causes AEAD authentication to fail.
ML-KEM's implicit rejection ensures that decapsulating an invalid shared secret ciphertext
yields a pseudo-random shared secret rather than an error,
which deterministically derives a wrong wrapping key.

**Encryption context binding.**
The canonicalized encryption context is bound into the wrapping key via the KDF's
`FixedInfo` and into the data key wrap via the AES-GCM AAD.

**Encapsulation source equivalence.**
Both encapsulation sources use the same ML-KEM key pair and produce a byte-identical
encrypted data key.
Local encapsulation removes the per-message KMS call and the `kms:Encapsulate`
permission requirement on encrypt.

**AES-GCM IV.**
The wrapping key is unique per message (fresh shared secret + fresh salt),
so the fixed zeroed 12-byte IV used by
[Data Key Wrapping](#data-key-wrapping)
does not violate AES-GCM nonce uniqueness across messages.
