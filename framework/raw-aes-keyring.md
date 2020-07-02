[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# Raw AES Keyring

## Version

0.2.0

### Changelog

- 0.2.0

  - [Remove Keyring Trace](../changes/2020-05-13_remove-keyring-trace/change.md)

- 0.1.0-preview

  - Initial record

## Implementations

| Language   | Confirmed Compatible with Spec Version | Minimum Version Confirmed | Implementation                                                                                                                                                    |
| ---------- | -------------------------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C          | 0.1.0-preview                          | 0.1.0                     | [raw_aes_keyring.c](https://github.com/aws/aws-encryption-sdk-c/blob/master/source/raw_aes_keyring.c)                                                             |
| NodeJS     | 0.1.0-preview                          | 0.1.0                     | [raw_aes_keyring_node.ts](https://github.com/awslabs/aws-encryption-sdk-javascript/blob/master/modules/raw-aes-keyring-node/src/raw_aes_keyring_node.ts)          |
| Browser JS | 0.1.0-preview                          | 0.1.0                     | [raw_aes_keyring_browser.ts](https://github.com/awslabs/aws-encryption-sdk-javascript/blob/master/modules/raw-aes-keyring-browser/src/raw_aes_keyring_browser.ts) |
| Python     | 0.1.0-preview                          | n/a                       | [keyrings/raw.py](https://github.com/aws/aws-encryption-sdk-python/blob/master/src/aws_encryption_sdk/keyrings/raw.py)                                            |
| Java       | 0.1.0-preview                          | n/a                       | [RawAesKeyring.java](https://github.com/aws/aws-encryption-sdk-java/blob/master/src/main/java/com/amazonaws/encryptionsdk/keyrings/RawAesKeyring.java)            |

## Overview

A keyring which does local AES-GCM encryption and decryption of data keys using a local wrapping key.

## Definitions

### Conventions used in this document

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL"
in this document are to be interpreted as described in [RFC 2119](https://tools.ietf.org/html/rfc2119).

### AES-GCM

Advanced Encryption Standard in Galois/Counter Mode (AES-GCM) is an Authenticated Encryption with Associated Data (AEAD) cipher.

Advanced Encryption Standard (AES) Specification: [NIST FIPS 297](https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.197.pdf)

Galois/Counter Mode (GCM) Specification: [NIST Special Publication 800-38D](https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-38d.pdf)

## Initialization

On keyring initialization, the following inputs are REQUIRED:

- [Key Namespace](#key-namespace)
- [Key Name](#key-name)
- [Wrapping Key](#wrapping-key)

### Key Namespace

A UTF-8 encoded value that, together with the [key name](#key-name), identifies a particular [wrapping key](#wrapping-key).

This value is also used for bookkeeping purposes.

### Key Name

A UTF-8 encoded value that, together with the [key namespace](#key-namespace), identifies a particular [wrapping key](#wrapping-key).

This value is also used for bookkeeping purposes.

### Wrapping Key

The AES key input to AES-GCM to encrypt plaintext data keys

The wrapping key MUST be a secret value consisting of cryptographically secure pseudo-random bytes.
It MUST be randomly generated from a cryptographically secure entropy source.
The length of the wrapping key MUST be 128, 192, or 256.

## Structure

### Key Provider Information

This structure is a sequence of bytes in big-endian format to be used as the
[key provider information](structures.md#key-provider-information) field in
[encrypted data keys](structures.md#encrypted-data-keys) produced by raw AES keyrings.

The following table describes the fields that form the raw AES keyring key provider information.
The bytes are appended in the order shown.

| Field                     | Length (bytes)                  | Interpreted as      |
| ------------------------- | ------------------------------- | ------------------- |
| Key Name                  | length of [Key Name](#key-name) | UTF-8 encoded bytes |
| Authentication Tag Length | 4                               | UInt32              |
| IV Length                 | 4                               | UInt32              |
| IV                        | [IV Length](#iv-length)         | Bytes               |

#### Key Name

The [Key Name](#key-name) of this keyring.

#### Authentication Tag Length

The length, in bits, of the authentication tag outputted by the AES-GCM encryption.

This value MUST be 128.

#### IV Length

The length, in bytes, of the initialization vector (IV) inputted into the AES-GCM encryption.

This value MUST be 12.

#### IV

The bytes to use as the IV in the AES-GCM encryption.

### Ciphertext

This structure is a sequence of bytes in big-endian format to be used as
the [ciphertext](structures.md#ciphertext) field in
[encrypted data keys](structures.md#encrypted-data-key) produced by raw AES keyrings.

The following table describes the fields that form the ciphertext for this keyring.
The bytes are appended in the order shown.

| Field              | Length (bytes)                                          | Interpreted as |
| ------------------ | ------------------------------------------------------- | -------------- |
| Encrypted Key      | length of AES-GCM ciphertext output                     | Bytes          |
| Authentication Tag | [Authentication Tag Length](#authentication-tag-length) | Bytes          |

#### Encrypted Key

The ciphertext outputted from the AES-GCM encryption of the plaintext data key.

#### Authentication Tag

The authentication tag outputted from the AES-GCM encryption.

## Operation

### On Encrypt

On encrypt MUST take [encryption materials](structures.md#encryption-materials) as input.

If the [encryption materials](structures.md#encryption-materials) do not contain a plaintext data key,
on encrypt MUST generate a random plaintext data key and set it on the [encryption materials](structures.md#encryption-materials).

The keyring MUST encrypt the plaintext data key in the [encryption materials](structures.md#encryption-materials)
using AES-GCM.

The keyring must use AES-GCM with the following specifics:

- it uses the [encryption context](structures.md#encryption-context-1) in the encryption materials
  as the additional authenticated data (AAD)
- the AAD is serialized in the same format as the serialization of [message header AAD key value pairs](../data-format/message-header.md#key-value-pairs)
- it uses this keyring's [wrapping key](#wrapping-key) as the AES-GCM cipher key
- it uses a randomly generated IV of 12 bytes
- it uses a authentication tag bit length of 128

Based on the ciphertext output of the AES-GCM decryption,
the keyring MUST construct an [encrypted data key](structures.md#encrypted-data-key) with the following specifics:

- the [key provider ID](structures.md#key-provider-id) is this keyring's [key namespace](#key-namespace)
- the [key provider information](structures.md#key-provider-information) is serialized as the
  [raw AES keyring key provider information](#key-provider-information)
- the [ciphertext](structures.md#ciphertext) is serialized as the
  [raw AES keyring ciphertext](#ciphertext)

The keyring MUST append the constructed encrypted data key to the encrypted data key list in the
[encryption materials](structures.md#encryption-materials).

On encrypt MUST output the modified [encryption materials](structures.md#encryption-materials).

### On Decrypt

On decrypt MUST take [decryption materials](structures.md#decryption-materials) and
a list of [encrypted data keys](structures.md#encrypted-data-key) as input.

The keyring MUST perform the following actions on each [encrypted data key](structures.md#encrypted-data-key)
in the input encrypted data key list, serially, until it successfully decrypts one.

For each [encrypted data key](structures.md#encrypted-data-key),
the keyring MUST first attempt to deserialize the [serialized ciphertext](#ciphertext)
to obtain the [encrypted key](#encrypted-key) and [authentication tag](#authentication-tag), and
deserialize the [serialized key provider info](#key-provider-information) to obtain the [key name](#key-name),
[IV](#iv), [IV length](#iv-length), and [authentication tag length](#authentication-tag-length).

The keyring MUST attempt to decrypt the encrypted data key if and only if the following is true:

- the [ciphertext](#ciphertext) and [key provider information](#key-provider-information) are successfully deserialized.
- the key name obtained from the encrypted data key's key provider information has a value equal to this keyring's [key name](#key-name).
- the key provider ID of the encrypted data key has a value equal to this keyring's [key namespace](#key-namespace).
- the [IV length](#iv-length) obtained from the encrypted data key's key provider information has a value equal to 12.
- the [authentication tag length](#authentication-tag-length) obtained from the key provider information has a value equal to 128.

If decrypting, the keyring MUST use AES-GCM with the following specifics:

- it uses the [encrypt key](#encrypted-key) obtained from deserialization as the AES-GCM input ciphertext.
- it uses the [authentication tag](#authentication-tag) obtained from deserialization as the AES-GCM input authentication tag.
- it uses this keyring's [wrapping key](#wrapping-key) as the AES-GCM cipher key.
- it uses the [IV](#iv) obtained from deserialization as the AES-GCM IV.
- it uses the encryption context from the [decryption materials](structures.md#decryption-materials) as the AES-GCM AAD.
- the AAD is serialized in the same format as the serialization of [message header AAD key value pairs](../data-format/message-header.md#key-value-pairs)

If a decryption succeeds, this keyring MUST
add the resulting plaintext data key to the decryption materials and return the modified materials.

If no decryption succeeds, the decryption MUST NOT make any update to the decryption materials.

## Security Considerations

[TODO: What security properties are guaranteed by this keyring]

- IV exhaustion/how many keys can we wrap this way?
- wrapping key use; both how many times it is used to encrypt data keys and where/whether/how it is used elsewhere.
- Does not write any information about what wrapping algorithm suite was used to wrap the data key.
- Puts data that doesn't belong in the provider info, into the provider info
