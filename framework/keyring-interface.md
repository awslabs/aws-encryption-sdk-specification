[//]: # (Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.)
[//]: # (SPDX-License-Identifier: CC-BY-SA-4.0)

# Keyring Interface

## Version

0.1.0-preview

## Implementations

- [C](https://github.com/aws/aws-encryption-sdk-c/blob/master/source/materials.c)
- [Javascript](https://github.com/awslabs/aws-encryption-sdk-javascript/blob/master/modules/material-management/src/keyring.ts)

## Overview

Keyrings are responsible for the generation, encryption, and decryption of data keys.

The keyring interface specified in this document describes the interface all keyrings MUST implement.

## Definitions

### Conventions used in this document

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL"
in this document are to be interpreted as described in [RFC 2119](https://tools.ietf.org/html/rfc2119).

## Supported Keyrings

- [KMS Keyring](kms-keyring.md)
- [Multi-Keyring](multi-keyring.md)
- [Raw AES Keyring](raw-aes-keyring.md)
- [Raw RSA Keyring](raw-rsa-keyring.md)

## Interface

### OnEncrypt

This interface takes [encryption materials](structures.md#encryption-materials) as input
and MAY modify it with any of the following behaviors:

- [Generate data key](#generate-data-key)
- [Encrypt data key](#encrypt-data-key)

If this keyring attempted any of the above behaviors, and successfully completed those behaviors,
it MUST output the modified [encryption materials](structures.md#encryption-materials).

If the keyring did not attempt any of the above behaviors, it MUST output the
[encryption materials](structures.md#encryption-materials) unmodified.

#### Generate Data Key

If the [encryption materials](structures.md#encryption-materials) do not contain a plaintext data key,
OnEncrypt MAY generate a data key.
If the encryption materials contain a plaintext data key, OnEncrypt MUST NOT generate a data key.

Generate Data Key MAY modify the following fields in the [encryption materials](structures.md#encryption-materials):

- [plaintext data key](structures.md#plaintext-data-key)
- [keyring trace](structures.md#keyring-trace)

To perform this behavior, the keyring generates a [plaintext data key](structures.md#plaintext-data-key)
and sets the resulting plaintext data key on the [encryption materials](structures.md#encryption-materials).

The length of the output plaintext data key MUST be equal to the KDF input length of the [algorithm suite](algorithm-suites.md)
specified in the [encryption materials](structures.md#encryption-materials).
The value of the plaintext data key MUST consist of cryptographically secure (pseudo-)random bits.

If OnEncrypt updates the [encryption materials](#data-structure.md#encryption-materials) with a plaintext data key,
the [keyring trace](structures.md#keyring-trace) returned by OnEncrypt MUST include one trace
associated with this keyring that has the [GENERATED DATA KEY](structures.md#generated-data-key) flag.

Note: If the keyring successfully performs this behavior, this means that the keyring MAY then
perform the [Encrypt Data Key](#encrypt-data-key) behavior.

#### Encrypt Data Key

If the [encryption materials](structures.md#encryption-materials) contain a plaintext data key,
OnEncrypt MAY encrypt a data key.
If the encryption materials do not contain a plaintext data key, OnEncrypt MUST NOT encrypt a data key.

Encrypt Data Key MAY modify the following fields in the [encryption materials](structures.md#encryption-materials):

- [encrypted data keys](structures.md#encrypted-data-keys)
- [keyring trace](structures.md#keyring-trace)

To perform this behavior, the keyring creates one or more [encrypted data keys](structures.md#encrypted-data-key)
using the plaintext data key from the [encryption materials](structures.md#encryption-materials) as input,
and appends the [encrypted data keys](structures.md#encrypted-data-key) to the encrypted data key list
in the [encryption materials](structures.md#encryption-materials).

The [encrypted data keys](structures.md#encrypted-data-key) produced by this keyring MUST
have [ciphertexts](structures.md#ciphertext) that can be decrypted to the plaintext data key in the
[encryption materials](structures.md#encryption-materials).

If OnEncrypt updates the [encryption materials](#data-structure.md#encryption-materials) with at least
one new [encrypted data key](structures.md#encrypted-data-key),
the [keyring trace](structures.md#keyring-trace) returned by OnEncrypt MUST include at least one trace
associated with this keyring that has the [ENCRYPTED DATA KEY](structures.md#encrypted-data-key) flag.
Note that this trace MAY include more than one flag,
for example the [SIGNED ENCRYPTION CONTEXT flag](structures.md#signed-encryption-context).

### OnDecrypt

This interface takes [decryption materials](structures.md#decryption-materials) and
a list of [encrypted data keys](structures.md#encrypted-data-key) as input and
MAY modify it with the following behavior:

- [Decrypt data key](#decrypt-data-key)

If this keyring attempted the above behavior, and succeeded, it MUST output the modified [decryption materials](structures.md#decryption-materials).

If the keyring did not attempt the above behavior,
the keyring MUST output the [decryption materials](structures.md#decryption-materials) unmodified.

#### Decrypt Data Key

If the encryption materials do contain a plaintext data key, OnDecrypt MUST NOT decrypt a data key.
If the [decryption materials](structures.md#decryption-materials) do not include a plaintext data key,
OnDecrypt MAY decrypt a data key.

Decrypt Data Key MAY modify the following fields in the [encryption materials](structures.md#encryption-materials):

- [plaintext data key](structures.md#plaintext-data-key)
- [keyring trace](structures.md#keyring-trace)

To perform this behavior, the keyring attempts to retrieve a plaintext data key from the input list
of [encrypted data keys](structures.md#encrypted-data-key).

If the keyring is able to succesfully get at least one plaintext data key from any [encrypted data key](structures.md#encrypted-data-key)
and the [decryption materials](structures.md#decryption-materials) still do not include a plaintext data key,
it SHOULD set one resulting plaintext data key on the [decryption materials](structures.md#decryption-materials).

If the keyring is unable to get any plaintext data key using the input [encrypted data keys](structures.md#encrypted-data-key)
the keyring MUST NOT not update the [decryption materials](structures.md#decryption-materials).

If OnDecrypt updates the [decryption materials](#data-structure.md#decryption-materials) with a plaintext data key,
the [keyring trace](structures.md#keyring-trace) returned by OnDecrypt MUST include one trace
associated with this keyring that has the [DECRYPTED DATA KEY](structures.md#encrypted-data-key) flag.
Note that this trace MAY include more than one flag, for example the [VERIFIED ENCRYPTION CONTEXT flag](structures.md#verified-encryption-context).

## Security Considerations

Keyring implementations SHOULD provide integrity guarantees for the [encrypted data keys](structures.md#encrypted-data-key)
it returns on [OnEncrypt](#onencrypt) such that tampered versions of those encrypted data keys,
if inputted into [OnDecrypt](#ondecrypt), are overwhelmingly likely to cause a decryption failure
(i.e. the chance of a successful decryption in this case is negligible).

Such integrity guarantees SHOULD include the integrity of the [encryption context](structures.md#encryption-context)
such that, if the encryption context used as input to OnEncrypt to produce an encrypted data key is
different than the encryption context inputted to OnDecrypt to decrypt that encrypted data key,
the decryption is overwhelmingly likely to fail.

Users SHOULD use a keyring that protects wrapping keys and performs cryptographic operations within a secure boundary.
Examples are:

- The built-in [KMS keyring](kms-keyring.md),
  which uses AWS Key Management Service (AWS KMS) customer master keys (CMKs) that never leave AWS KMS plaintext.
- A custom keyring that uses wrapping keys that are stored in your hardware security modules (HSMs)
- A custom keyring protected by another master key service.

The [raw AES keyring](raw-aes-keyring.md) and [raw RSA keyring](#raw-aes-keyring) MAY be used,
however users should refer to their specification for notes on their respective security considerations.

## Appendix

### Keyring and Master Key Provider/Master Key Compatability

The following keyrings are compatible with the referenced [master key providers](master-key-provider.md) or
[master keys](master-key.md) when configured to use the same wrapping key.

| Keyring         | Master Key Provider: Java and Python                                                                             |
|-----------------|------------------------------------------------------------------------------------------------------------------|
| KMS keyring     | KMS master key (Java), KMS master key provider (Java), KMS master key (Python), KMS master key provider (Python) |
| Raw AES keyring | When they are used with symmetric encryption keys: JceMasterKey (Java), RawMasterKey (Python)                    |
| Raw RSA keyring | When they are used with asymmetric encryption keys: JceMasterKey (Java), RawMasterKey (Python)                   |

### Why should I use Keyrings instead of Master Key Providers and Master Keys?

Keyrings provide a simplified architecture over master keys and master key providers;
The keyring combines the similar responsibilities of master keys and master key providers into one concept,
as well as removes all key management logic from [cryptographic materials managers](cmm-interface.md).

Due to this simplified architecture, master keys and master key providers are going to be deprecated in the future,
and new implementations SHOULD use keyrings.
