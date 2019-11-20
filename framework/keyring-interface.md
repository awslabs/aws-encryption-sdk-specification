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

- [KMS Keyring](#kms-keyring.md)
- [Multi-Keyring](#multi-keyring.md)
- [Raw AES Keyring](#raw-aes-keyring.md)
- [Raw RSA Keyring](#raw-rsa-keyring.md)

## Interface

### OnEncrypt

The following inputs are REQUIRED:

- [Algorithm Suite](#algorithm-suites.md)
- [Encryption Context](#encryption-context)

The following inputs are OPTIONAL:

- [Plaintest Data Key](#structures.md#plaintext-data-key)

This interface MAY return [data key materials](#structures.md#data-key-materials) appropriate for the request. 

The output of this interface is driven by two behaviours:

- [Generate data key](#generate-data-key)
- [Encrypt data key](#encrypt-data-key)

If this keyring attempted any of the above behaviors, and successfully completed those behaviors,
it MUST output the result as [data key materials](#structures.md#data-key-materials).

If the keyring did not attempt any of the above behaviors, it MUST produce no output.

#### Generate Data Key

If the input does not include a plaintext data key,
OnEncrypt MAY generate a data key.
If the input does include a plaintext data key, OnEncrypt MUST NOT generate a data key.

Generate Data Key MAY populate the following fields in the [data key materials](#structures.md#data-key-materials):

- [plaintext data key](#structures.md#plaintext-data-key)
- [keyring trace](#structures.md#keyring-trace)

To perform this behavior, the keyring generates a [plaintext data key](#structures.md#plaintext-data-key)
and includes the resulting plaintext data key in the [data key materials](#structures.md#data-key-materials)' 
[data key materials](#structures.md#data-key-materials).

The length of the output plaintext data key MUST be equal to the KDF input length of the [algorithm suite](#algorithm-suites.md)
specified in the [encryption materials](#structures.md#encryption-materials).
The value of the plaintext data key MUST consist of cryptographically secure (pseudo-)random bits.

If OnEncrypt generates a plaintext data key,
the [keyring trace](#structures.md#keyring-trace) returned by OnEncrypt MUST include one trace
associated with this keyring that has the [GENERATED DATA KEY](#structures.md#generated-data-key) flag.

Note: If the keyring successfully performs this behavior, this means that the keyring MAY then
perform the [Encrypt Data Key](#encrypt-data-key) behavior.

#### Encrypt Data Key

If the input contains a plaintext data key, or if the keyring generates a data key,
OnEncrypt MAY encrypt the data key.
Otherwise, OnEncrypt MUST NOT encrypt a data key.

Encrypt Data Key MAY populate the following fields in the [data key materials](#structures.md#data-key-materials):

- [encrypted data keys](#structures.md#encrypted-data-keys)
- [keyring trace](#structures.md#keyring-trace)

To perform this behavior, the keyring creates one or more [encrypted data keys](#structures.md#encrypted-data-key)
using the plaintext data key as input,
and includes the [encrypted data keys](#structures.md#encrypted-data-key)
in the [data key materials](#structures.md#data-key-materials) result.

The [encrypted data keys](#structures.md#encrypted-data-key) produced by this keyring MUST
have [ciphertexts](#structures.md#ciphertext) that can be decrypted to the plaintext data key in the
[data key materials](#structures.md#data-key-materials).

If OnEncrypt outputs [data key materials](#structures.md#data-key-materials) with at least
one [encrypted data key](#structures.md#encrypted-data-key),
the [keyring trace](#structures.md#keyring-trace) returned by OnEncrypt MUST include at least one trace
associated with this keyring that has the [ENCRYPTED DATA KEY](#structures.md#encrypted-data-key) flag.
Note that this trace MAY include more than one flag,
for example the [SIGNED ENCRYPTION CONTEXT flag](#structures.md#signed-encryption-context).

### OnDecrypt

The following inputs are REQUIRED:

- [Algorithm Suite](#algorithm-suites.md)
- [Encryption Context](#structures.md#encryption-context)
- [Encrypted Data Keys](#structures.md#encrypted-data-keys)

This interface MAY perform the following behavior:

- [Decrypt data key](#decrypt-data-key)

If this keyring attempted the above behavior, and succeeded, it MUST output the resulting [data key materials](#structures.md#data-key-materials). The [algorithm suite](#algorithm-suites.md) in the result must match the input [algorithm suite](#algorithm-suites.md).

If the keyring did not attempt the above behavior, it MUST produce no output.

#### Decrypt Data Key

Decrypt Data Key MAY populate the following fields in the [data key materials](#structures.md#data-key-materials):

- [plaintext data key](#structures.md#plaintext-data-key)
- [keyring trace](#structures.md#keyring-trace)

To perform this behavior, the keyring attempts to retrieve a plaintext data key from the input list
of [encrypted data keys](#structures.md#encrypted-data-key).

If the keyring is able to succesfully get at least one plaintext data key from any [encrypted data key](#structures.md#encrypted-data-key),
it SHOULD provide the resulting plaintext data key in the [data key materials](#structures.md#data-key-materials).

If the keyring is unable to get any plaintext data key using the input [encrypted data keys](#structures.md#encrypted-data-key)
the keyring MUST NOT produce output.

If OnDecrypt produces a plaintext data key,
the [keyring trace](#structures.md#keyring-trace) returned by OnDecrypt MUST include one trace
associated with this keyring that has the [DECRYPTED DATA KEY](#structures.md#encrypted-data-key) flag.
Note that this trace MAY include more than one flag, for example the [VERIFIED ENCRYPTION CONTEXT flag](#structures.md#verified-encryption-context).

## Security Considerations

Keyring implementations SHOULD provide integrity guarantees for the [encrypted data keys](#structures.md#encrypted-data-key)
it returns on [OnEncrypt](#onencrypt) such that tampered versions of those encrypted data keys,
if inputted into [OnDecrypt](#ondecrypt), are overwhelmingly likely to cause a decryption failure
(i.e. the chance of a successful decryption in this case is negligible).

Such integrity guarantees SHOULD include the integrity of the [encryption context](#structures.md#encryption-context)
such that, if the encryption context used as input to OnEncrypt to produce an encrypted data key is
different than the encryption context inputted to OnDecrypt to decrypt that encrypted data key,
the decryption is overwhelmingly likely to fail.

Users SHOULD use a keyring that protects wrapping keys and performs cryptographic operations within a secure boundary.
Examples are:

- The built-in [KMS keyring](#kms-keyring.md),
  which uses AWS Key Management Service (AWS KMS) customer master keys (CMKs) that never leave AWS KMS plaintext.
- A custom keyring that uses wrapping keys that are stored in your hardware security modules (HSMs)
- A custom keyring protected by another master key service.

The [raw AES keyring](#raw-aes-keyring.md) and [raw RSA keyring](#raw-aes-keyring) MAY be used,
however users should refer to their specification for notes on their respective security considerations.

## Appendix

### Keyring and Master Key Provider/Master Key Compatability

The following keyrings are compatible with the referenced [master key providers](#master-key-provider.md) or
[master keys](#master-key.md) when configured to use the same wrapping key.

| Keyring         | Master Key Provider: Java and Python                                                                             |
|-----------------|------------------------------------------------------------------------------------------------------------------|
| KMS keyring     | KMS master key (Java), KMS master key provider (Java), KMS master key (Python), KMS master key provider (Python) |
| Raw AES keyring | When they are used with symmetric encryption keys: JceMasterKey (Java), RawMasterKey (Python)                    |
| Raw RSA keyring | When they are used with asymmetric encryption keys: JceMasterKey (Java), RawMasterKey (Python)                   |

### Why should I use Keyrings instead of Master Key Providers and Master Keys?

Keyrings provide a simplified architecture over master keys and master key providers;
The keyring combines the similar responsibilities of master keys and master key providers into one concept,
as well as removes all key management logic from [cryptographic materials managers](#cmm-interface.md).

Due to this simplified architecture, master keys and master key providers are going to be deprecated in the future,
and new implementations SHOULD use keyrings.
