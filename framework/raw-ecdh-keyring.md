[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# Raw ECDH Keyring

## Version

1.0.0

### Changelog

- 1.0.0

  - Initial record

## Implementations

| Language | Confirmed Compatible with Spec Version | Minimum Version Confirmed | Implementation |
| -------- | -------------------------------------- | ------------------------- | -------------- |

# Overview

A keyring which does local ECDH key establishment to
establish a shared secret that can be used to derive shared wrapping keys for
encryption and decryption of data keys using a local wrapping key.

## Definitions

### Conventions used in this document

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL"
in this document are to be interpreted as described in [RFC 2119](https://tools.ietf.org/html/rfc2119).

### ECDH

ECDH (Elliptic-curve Diffie–Hellman) is s a key agreement protocol that
allows two parties, each having an elliptic-curve public–private key
pair, to establish a shared secret over an insecure channel.

This shared secret may be directly used as a key.
As a best practice, it is recommended to
use this shared secret to derive a symmetric key.

### ECC Keys

ECC (Elliptic Curve Cryptography) are keys that are generated from elliptic
curves over finite fields.

ECC Private Key MUST be a [PEM encoded PKCS #8 PrivateKeyInfo structures](https://tools.ietf.org/html/rfc5958#section-2)
as private key.

ECC Public Key MUST be a [DER-encoded ASN.1 SubjectPublicKeyInfo](https://datatracker.ietf.org/doc/html/rfc5280#section-4.1)

## Interface

MUST implement the [AWS Encryption SDK Keyring interface](../keyring-interface.md#interface)

## Initialization

On keyring initialization,
the caller:

- MUST provide a [Key Agreement Schema](#key-agreement-schema)
- MUST provide a [Curve Specification](#curve-specification)

On initialization, the keyring MUST assert that the recipient's public key
and the sender's private key belong to the same ECC Curve, and that
the public key's ECC points are not the "points at infinity".

The keyring MUST set the sender's public key
and the recipient's public key on the keyring.

### Curve Specification

The ECDH curve specification to use with this keyring.

This value MUST correspond with one of the [supported curve specifications](#supported-curve-specifications).

#### Supported Curve Specifications

The following curve specifications are currently defined:

- [ECC NIST P256](https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.186-5.pdf#page=29)
- [ECC NIST P384](https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.186-5.pdf#page=29)
- [ECC NIST P512](https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.186-5.pdf#page=29)
- SM2

This keyring MUST NOT use a curve specification outside of the defined above.

### Key Agreement Schema

The following Key Agreement Schemas are currently supported:

- [EphemeralPrivateKeyToStaticPublicKey](./key-agreement-schemas.md#ephemeralprivatekeytostaticpublickey)
- [PublicKeyDiscovery](./key-agreement-schemas.md#publickeydiscovery)
- [RawPrivateKeyToStaticPublicKey](./key-agreement-schemas.md#rawprivatekeytostaticpublickey)

### Key Agreement Procedure

Depending on the configured Key Agreement Schema,
[Key Agreement](./key-agreement-schemas.md#supported-key-agreement-schemas)
is computed according to that schema's criteria.

### Key Derivation Function Configuration

A Raw ECDH Key Derivation Function Configuration is defined as:

- Key Derivation Function:
  - [Counter-Mode](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-108r1-upd1.pdf#page=14)
- Key Derivation Method:
  - HMAC_SHA384

#### Additional Information

The keyring will use the encryption and decryption materials' encryption
context in two places.

1. Fixed Info as part of the KDF
   - This ensures that the shared wrapping key is cryptographically
     bound in context to what it will be used for.
1. AAD as part of the data key wrapping
   - As with the other keyrings, the ECDH keyring will use
     the supplied encryption context to also cryptographically bind
     the shared wrapping key to the data encryption key.

Both the KDF and the AES-GCM operations will construct
a serialized AdditionalInfoAAD that will be include
the FixedInfo and the AAD.
This allows the AAD and the FixedInfo
to be bound to the shared wrapping key AND the
AAD in the AES-GCM data key wrapping operation.

Using additional information in this way allows
customers to have authenticated encryption
because the additional information
must match in the derivation step
and the data key wrapping/unwrapping step in order to
produce the data encryption key.

The additional information is a key-value mapping of arbitrary, non-secret, UTF-8 encoded strings.

[Encryption Context](../structures.md#encryption-context) is used as additional information
as part of the fixed info field input to the KDF. As such, users
SHOULD use the Additional Information to store:

- Non-secret data that MUST remain associated with the [message](../data-format/message.md) ciphertext.

## Structure

### Key Provider Information

This structure is a sequence of bytes in big-endian format to be used as the
[key provider information](structures.md#key-provider-information) field in
[encrypted data keys](structures.md#encrypted-data-keys) produced by raw ECDH keyrings.
Both the recipient and the sender public keys MUST be in their compressed formats.

The following table describes the fields that form the raw ECDH keyring
and the AWS KMS ECDH Keyring key provider information.
The bytes are appended in the order shown.

| Field                         | Length (bytes)          | Interpreted as |
| ----------------------------- | ----------------------- | -------------- |
| Version                       | 1                       | UInt32         |
| Recipient's Public Key Length | 32 or 48 or 56          | UInt32         |
| Recipient's Public Key        | [Public Key](#ecc-keys) | Bytes          |
| Sender's Public Key Length    | 32 or 48 or 56          | UInt32         |
| Sender's Public Key           | [Public Key](#ecc-keys) | Bytes          |

### Ciphertext

This structure is a sequence of bytes in big-endian format to be used as
the [ciphertext](structures.md#ciphertext) field in
[encrypted data keys](structures.md#encrypted-data-key) produced by raw AES keyrings.

The following table describes the fields that form the ciphertext for this keyring.
The bytes are appended in the order shown.

| Field              | Length (bytes)                                                   | Interpreted as |
| ------------------ | ---------------------------------------------------------------- | -------------- |
| Derivation Nonce   | 32                                                               | Bytes          |
| Commitment Key     | 32                                                               | Bytes          |
| Encrypted Key      | length of AES-GCM ciphertext output                              | Bytes          |
| Authentication Tag | [Authentication Tag Length](#authentication-tag-length) as Bytes | Bytes          |

## Operation

### OnEncrypt

OnEncrypt MUST fail if configured with a
[PublicKeyDiscovery Key Agreement Configuration](./key-agreement-schemas.md#publickeydiscovery)

OnEncrypt MUST fail if this keyring does not have
the ECC Key Pairs as specified by the configured
[Key Agreement Schema](./key-agreement-schemas.md#supported-key-agreement-schemas)

OnEncrypt MUST take [encryption materials](structures.md#encryption-materials) as input.

The keyring MUST attempt to serialize the [encryption materials'](structures.md#encryption-materials)
[encryption context](structures.md#encryption-context-1) according to the [encryption context serialization specification](structures.md#serialization).
If the keyring cannot serialize the encryption context, OnEncrypt MUST fail.

The keyring MUST derive the shared secret
according to the configured [Key Agreement Schema](#key-agreement-procedure).

If the keyring fails to compute the shared secret, the keyring MUST fail.

The keyring MUST derive a data key according to the construction
outlined by the [key agreement schemas](./key-agreement-schemas.md#key-derivation)

If the Key Derivation step fails, the keyring MUST fail.

If they Key Derivation step succeeds it MUST produce
keying material with a length of 64 bytes.

The keyring MUST use the first 32 bytes as the Commitment Key.
The keyring MUST use the last 32 bytes as the Derived Shared Wrapping Key.

The keyring MUST perform data key wrapping according to the [Data Key Wrapping section](#data-key-wrapping).

Based on the ciphertext output of the AES-GCM encryption,
the keyring MUST construct an [encrypted data key](structures.md#encrypted-data-key) with the following specifics:

- The [key provider id](../structures.md#key-provider-id) MUST be the UTF8 encoded string "raw-ecdh".
- The [key provider information](structures.md#key-provider-information) is serialized as the
  [raw ECDH keyring key provider information](#key-provider-information).
- The [ciphertext](structures.md#ciphertext) is serialized as the
  [raw ECDH keyring ciphertext](#ciphertext).

### OnDecrypt

OnDecrypt MUST fail if configured with a
[EphemeralPrivateKeyToStaticPublicKey Key Agreement Configuration](./key-agreement-schemas.md#ephemeralprivatekeytostaticpublickey)

OnDecrypt MUST take [decryption materials](structures.md#decryption-materials) and
a list of [encrypted data keys](structures.md#encrypted-data-key) as input.

If the decryption materials already contain a plaintext data key,
the keyring MUST fail
and MUST NOT modify the [decryption materials](structures.md#decryption-materials).

The keyring MUST attempt to serialize the [decryption materials'](structures.md#decryption-materials)
[encryption context](structures.md#encryption-context-1) according to the [encryption context serialization specification](structures.md#serialization).

If the keyring cannot serialize the encryption context, OnDecrypt MUST fail.

The set of encrypted data keys MUST first be filtered to match this keyring’s configuration.
For the encrypted data key to match:

- MUST first verify that the uncompressed deserialized sender public key
  and the uncompressed deserialized recipient public key match the public
  keys configured on the keyring.
- The deserialized version value in the [key provider information](#key-provider-information) MUST match `0x01`.
- The [ciphertext](#ciphertext) and [key provider information](#key-provider-information) MUST be successfully deserialized.
- The key provider ID of the encrypted data key MUST have a value equal to the UTF8 encoded strings `raw-ecdh` OR `aws-kms-ecdh`.
- The [authentication tag length](#authentication-tag-length) obtained from the key provider information MUST have a value equal to 16 bytes.

For each encrypted data key in the filtered set, one at a time, the OnDecrypt MUST attempt to decrypt the data key.
If this attempt results in an error, then these errors MUST be collected.

To attempt to decrypt a particular [encrypted data key](./structures.md#encrypted-data-key),
OnDecrypt MUST attempt to deserialize the [serialized ciphertext](#ciphertext)
to obtain:

- The derivation nonce
- The commitment key
- The [encrypted key](#encrypted-key)
- The [authentication tag](#authentication-tag)

If the keyring is unable to deserialize this information then an error MUST be collected
and the next encrypted data key in the filtered set MUST be attempted.

The keyring MUST derive the shared secret
according to the configured [Key Agreement Schema](#key-agreement-procedure).

If the Key Agreement step fails, then an error MUST be collected
and the next encrypted data key in the filtered set MUST be attempted.

The keyring MUST derive a shared wrapping key according to the construction
outlined by the [key agreement schemas](./key-agreement-schemas.md#key-derivation)

If the Key Derivation step fails, then an error MUST be collected
and the next encrypted data key in the filtered set MUST be attempted.

If they Key Derivation step succeeds it MUST produce
keying material with a length of 64 bytes.

The keyring MUST use the first 32 bytes as the Commitment Key.
The keyring MUST use the last 32 bytes as the Derived Shared Wrapping Key.

The keyring MUST check that the calculated Commitment Key
from the key derivation step is equal to the deserialized commitment key
found in the encrypted data key. This check MUST be a constant time check.

If the commitment keys DO NOT match, then an error MUST be collected
and the next encrypted data key in the filtered set MUST be attempted.

The keyring MUST perform data key unwrapping according to the [Data Key Unwrapping section](#data-key-unwrapping).

If the keyring fails to unwrap the data key,
then an error MUST be collected and the next encrypted data key
in the filtered set MUST be attempted.

If the response does satisfy these requirements then OnDecrypt:

- MUST set the plaintext data key on the [decryption materials](./structures.md#decryption-materials)
- MUST immediately return the modified [decryption materials](../structures.md#decryption-materials).

If OnDecrypt fails to successfully decrypt any encrypted data key,
then it MUST yield an error that includes all the collected errors.

#### Data Key Wrapping

If the [encryption materials](structures.md#encryption-materials) do not contain a plaintext data key,
OnEncrypt MUST generate a random plaintext data key.

The keyring MUST encrypt the plaintext data key
using AES-GCM and use the shared wrapping key as the wrapping key.

The keyring MUST encrypt a plaintext data key
using `AES-GCM-256` with the following inputs:

- MUST use the shared wrapping key as the AES-GCM cipher key.
- MUST use the plain text data key that will be wrapped by the shared wrapping key as the AES-GCM message.
- It MUST use a zeroed out 12 byte IV
- MUST use an authentication tag byte of length 16.
- MUST use the serialized [AAD](#branch-key-wrapping-and-unwrapping-aad) concatenated
  with the `FixedInfo` used as part of the key derivation step concatenated with the keyring version found
  in the key provider information.

The serialized AAD and the `FixedInfo` field MUST be serialized in the following order:

```
UTF8("ECDH-KEY-DERIVATION")||'0x00'|| UTF8(curve_spec)||'0x00'||UTF8("HMAC_SHA384")||'0x00'||(PKU || PKV)||'0x00'||'0x01'||'0x00'||canonicalized(EC)
```

If the keyring successfully wraps the plaintext data key it MUST set it on the [encryption materials](structures.md#encryption-materials).

#### Data Key Unwrapping

The keyring MUST decrypt the encrypted data key with the shared wrapping key using `AES-GCM-256` with the following inputs:

- It MUST use the `encrypted key` obtained from deserialization as the AES-GCM input ciphertext.
- It MUST use the `authentication tag` obtained from deserialization as the AES-GCM input authentication tag.
- It MUST use the shared wrapping key as the AES-GCM cipher key.
- It MUST use a zeroed out 12 byte IV
- MUST use the serialized [AAD](#branch-key-wrapping-and-unwrapping-aad) concatenated
  with the `FixedInfo` used as part of the key derivation step concatenated with the keyring version found
  in the key provider information.

The serialized AAD and the `FixedInfo` field MUST be serialized in the following order:

```
UTF8("ECDH-KEY-DERIVATION")||'0x00'|| UTF8(curve_spec)||'0x00'||UTF8("HMAC_SHA384")||'0x00'||(PKU || PKV)||'0x00'||'0x01'||'0x00'||canonicalized(EC)
```
