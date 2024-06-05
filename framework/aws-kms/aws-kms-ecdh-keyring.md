[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# AWS KMS ECDH Keyring

## Version

0.1.0-preview

### Changelog

- 0.1.0-preview

  - Initial record

## Implementations

| Language | Confirmed Compatible with Spec Version | Minimum Version Confirmed | Implementation |
| -------- | -------------------------------------- | ------------------------- | -------------- |

# Overview

A keyring which does local ECDH to
establish a shared secret that can be used to derive shared wrapping keys for
encryption and decryption of data keys.

## Definitions

### Conventions used in this document

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL"
in this document are to be interpreted as described in [RFC 2119](https://tools.ietf.org/html/rfc2119).

### ECDH

ECDH (Elliptic-curve Diffie–Hellman) is a key agreement protocol that
allows two parties, each having an elliptic-curve public–private key
pair, to establish a shared secret over an insecure channel.

This shared secret may be directly used as a key, or to derive another key.

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
- MUST provide an AWS KMS SDK client

On keyring initialization,
the caller:

- MAY provide a list of Grant Tokens

the keyring MUST set the recipient's public key on the keyring.

### Curve Specification

The ECDH curve specification to use with this keyring.

This value MUST correspond with one of the [supported curve specifications](#supported-curve-specifications).

#### Supported Curve Specifications

The following curve specifications are currently defined:

- [ECC NIST P256](https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.186-5.pdf#page=29)
- [ECC NIST P384](https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.186-5.pdf#page=29)
- [ECC NIST P521](https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.186-5.pdf#page=29)
- [SM2](https://docs.aws.amazon.com/kms/latest/developerguide/asymmetric-key-specs.html#key-spec-sm)

This keyring MUST NOT use a curve specification outside of the defined above.

### Key Agreement Schema

The following Key Agreement Schemas are currently supported for an AWS ECDH Keyring:

- [KmsPublicKeyDiscovery](../key-agreement-schemas.md#kmspublickeydiscovery)
- [KmsPrivateKeyToStaticPublicKey](../key-agreement-schemas.md#kmsprivatekeytostaticpublickey)

### Key Agreement Procedure

Depending on the configured [Key Agreement](./key-agreement-schemas.md#supported-key-agreement-schemas)
Schema, the shared secret is computed differently.

### Key Derivation Function Configuration

An AWS ECDH Key Derivation Function Configuration is defined as:

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
     the shared wrapping key to the data key.

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
should use the Additional Information to store:

- Non-secret data that MUST remain associated with the [message](../data-format/message.md) ciphertext.

## Structure

Since messages encrypted the AWS KMS ECDH Keyring can be decrypted by the
RAW ECDH Keyring both the Key Provider Information and the Ciphertext structures
are serialized the same in both keyrings. See each section in the RAW ECDH Keyring
[specification](../raw-ecdh-keyring.md#structure).

### [Key Provider Information](../raw-ecdh-keyring.md#key-provider-information)

### [Ciphertext](../raw-ecdh-keyring.md#ciphertext)

## Operation

### OnEncrypt

OnEncrypt MUST fail if configured with a [KmsPublicKeyDiscovery Key Agreement Configuration](../key-agreement-schemas.md#kmspublickeydiscovery)

OnEncrypt MUST take [encryption materials](structures.md#encryption-materials) as input.

The keyring MUST attempt to serialize the [encryption materials'](structures.md#encryption-materials)
[encryption context](structures.md#encryption-context-1) according to the [encryption context serialization specification](structures.md#serialization).

If the keyring cannot serialize the encryption context, OnEncrypt MUST fail.

To attempt to generate a shared secret,
OnEncrypt MUST call [AWS KMS DeriveSharedSecret]()
the keyring MUST call with a request constructed as follows:

- `KeyId` MUST be the configured AWS KMS key identifier in the schema
- `PublicKey` MUST be the configured Recipient Public Key on the schema
- `KeyAgreementAlgorithm` MUST be "ECDH"
- `GrantTokens` MUST be this keyring's [grant tokens](https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html#grant_token).

If the call to KMS DeriveSharedSecret fails, the keyring MUST fail.

The keyring MUST derive a shared wrapping key according to the construction
outlined by the [key agreement schemas](./key-agreement-schemas.md#key-derivation)

If the Key Derivation step fails, OnEncrypt MUST fail.

If they Key Derivation step succeeds it MUST produce
keying material with a length of 64 bytes.

The keyring MUST use the first 32 bytes as the Commitment Key.
The keyring MUST use the last 32 bytes as the Shared Wrapping Key.

The keyring MUST perform data key wrapping according to the [Data Key Wrapping section](../raw-ecdh-keyring.md#data-key-wrapping).

If the keyring is unable to wrap a plaintext data key, OnEncrypt MUST fail
and MUST NOT modify the [encryption materials](structures.md#encryption-materials).

Otherwise, OnEncrypt MUST append a new [encrypted data key](../structures.md#encrypted-data-key)
to the encrypted data key list in the [encryption materials](../structures.md#encryption-materials), constructed as follows:

- The [key provider id](../structures.md#key-provider-id) MUST be the UTF8 encoded string "aws-kms-ecdh".
- The [key provider information](structures.md#key-provider-information) is serialized as the
  [raw ECDH keyring key provider information](../raw-ecdh-keyring.md#key-provider-information).
- The [ciphertext](structures.md#ciphertext) is serialized as the
  [raw ECDH keyring ciphertext](../raw-ecdh-keyring.md#ciphertext).

### OnDecrypt

OnDecrypt MUST take [decryption materials](structures.md#decryption-materials) and
a list of [encrypted data keys](structures.md#encrypted-data-key) as input.

If the decryption materials already contain a plaintext data key,
OnDecrypt MUST fail
and MUST NOT modify the [decryption materials](structures.md#decryption-materials).

The keyring MUST attempt to serialize the [decryption materials'](structures.md#decryption-materials)
[encryption context](structures.md#encryption-context-1) according to the [encryption context serialization specification](structures.md#serialization).

If the keyring cannot serialize the encryption context, OnDecrypt MUST fail.

The set of encrypted data keys MUST first be filtered to match this keyring’s configuration.
For the encrypted data key to match:

- MUST first verify that the uncompressed deserialized sender's public key
  and the uncompressed deserialized recipient's public key match the public
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
by calling [AWS KMS DeriveSharedSecret]()
with a request constructed as follows:

- `KeyId` MUST be the configured AWS KMS key identifier in the schema
- `PublicKey` MUST be the configured Recipient Public Key on the schema
- `KeyAgreementAlgorithm` MUST be "ECDH"
- `GrantTokens` MUST be this keyring's [grant tokens](https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html#grant_token).

If the call to KMS DeriveSharedSecret fails, an error MUST be collected
and the next encrypted data key in the filtered set MUST be attempted.

The keyring MUST derive a shared wrapping key according
to the construction outlined by the [key agreement schemas](./key-agreement-schemas.md#key-derivation)

If the Key Derivation step fails, then an error MUST be collected
and the next encrypted data key in the filtered set MUST be attempted.

If they Key Derivation step succeeds it MUST produce
keying material with a length of 64 bytes.

The keyring MUST use the first 32 bytes as the Commitment Key.
The keyring MUST use the last 32 bytes as the Shared Wrapping Key.

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
