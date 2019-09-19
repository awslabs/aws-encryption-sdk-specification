// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved. // SPDX-License-Identifier: CC-BY-SA-4.0

# Raw RSA Keyring

## Version

0.1.0-preview

## Implementations

- [C](https://github.com/aws/aws-encryption-sdk-c/blob/master/include/aws/cryptosdk/raw_rsa_keyring.h)
- [NodeJS](https://github.com/awslabs/aws-encryption-sdk-javascript/blob/master/modules/raw-rsa-keyring-node/src/raw_rsa_keyring_node.ts)
- [Browser JS](https://github.com/awslabs/aws-encryption-sdk-javascript/blob/master/modules/raw-rsa-keyring-browser/src/raw_rsa_keyring_browser.ts)

## Overview

A keyring which does local RSA encryption and decryption of data keys using a local wrapping key.

## Definitions

### Conventions used in this document

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL"
in this document are to be interpreted as described in [RFC 2119](https://tools.ietf.org/html/rfc2119).

### RSA

RSA (Rivest–Shamir–Adleman) is an asymmteric cryptographic cipher.

RSA Implementation Specification: [RFC 3447](https://tools.ietf.org/html/rfc8017)

## Inputs

On keyring initialization, the following inputs are REQUIRED:

- [Key Namespace](#key-namespace)
- [Key Name](#key-name)
- [Padding Scheme](#padding-scheme)
- [Public Key](#public-key) and/or [Private Key](#private-key)

### Key Namespace

A UTF-8 encoded value that namespaces this keyring.

### Key Name

A UTF-8 encoded value that names this keyring.

### Padding Scheme

The RSA padding scheme to use with this keyring.

This value MUST correspond with one of the [supported padding schemes](#supported-padding-schemes).

If the padding scheme uses MGF1 Padding, the hash function used as part of MGF1 MUST be the same hash function
used to hash the plaintext data key.

#### Supported Padding Schemes

The following padding schemes are currently defined:

- [PKCS1 v1.5 Padding](https://tools.ietf.org/html/rfc8017#section-7.2)
- [OAEP with SHA-1 and MGF1 with SHA-1 Padding](https://tools.ietf.org/html/rfc8017#section-7.1)
- [OAEP with SHA-256 and MGF1 with SHA-256 Padding](https://tools.ietf.org/html/rfc8017#section-7.1)
- [OAEP with SHA-384 and MGF1 with SHA-384 Padding](https://tools.ietf.org/html/rfc8017#section-7.1)
- [OAEP with SHA-512 and MGF1 with SHA-512 Padding](https://tools.ietf.org/html/rfc8017#section-7.1)

This keyring MUST NOT use a padding scheme outside those defined above.

### Public Key

The RSA public key used by this keyring to encrypt data keys.

The public key MUST follow the [RSA specification for public keys](#rsa).
The raw RSA keyring SHOULD support loading PEM encoded [X.509 SubjectPublicKeyInfo structures](#https://tools.ietf.org/html/rfc5280#section-4.1)
as public keys.

### Private Key

The RSA private key used by this keyring to decrypt data keys.

The private key MUST follow the [RSA specification for private keys](#rsa).
The raw RSA keyring SHOULD support loading PEM encoded [PKCS #8 PrivateKeyInfo structures](#https://tools.ietf.org/html/rfc5958#section-2)
as private keys.
The private key SHOULD contain all Chinese Remainder Theorem (CRT) components (public exponent, prime factors, CRT exponents, and CRT coefficient).

## Operation

### OnEncrypt

OnEncrypt MUST NOT succeed if this keyring does not have a specified [public key](#public-key).

OnEncrypt MUST take [encryption materials](#structures.md#encryption-materials) as input.

If the [encryption materials](#structures.md#encryption-materials) do not contain a plaintext data key,
on encrypt MUST generate a random plaintext data key and set it on the [encryption materials](#structures.md#encryption-materials).

The keyring MUST attempt to encrypt the plaintext data key in the
[encryption materials](#structures.md#encryption-materials) using RSA.
The keyring performs RSA with the following specifics:

- this keyring's [public key](#public-key) is the RSA public key
- this keyring's [padding scheme](padding-scheme) is the RSA padding scheme.
- the plaintext data key is the plaintext input to RSA encryption.

If RSA encryption was successful, OnEncrypt MUST return the input
[encryption materials](#structures.md#encryption-materials), modified in the following ways:

- The encrypted data key list has a new encrypted data key added, constructed as follows:
  - the [key provider ID](#structures.md#key-provider-id) field is this keyring's [key namespace](#key-id).
  - the [key provider information](#structures.md#key-provider-information) field is this keyring's [key name](#key-name).
  - the [ciphertext](#structures.md#data-key-encryption) field is the ciphertext outputted from
    the RSA encryption of the plaintext data key.
- The keyring trace has a new [record](#structures.md#record) appended.
  This record MUST contain this keyring's [key name](#key-name) and [key namespace](#key-namespace),
  and the [flags](#structures.md$flags) field of this record MUST include the
  [ENCRYPTED DATA KEY](#structures.md#supported-flags) flag.
  If this keyring generated the plaintext data key in the [encryption materials](#structures.md#encryption-materials)
  the record MUST contain the [GENERATED DATA KEY](#structures.md#supported-flags) flag.
  The record MUST NOT contain the [SIGNED ENCRYPTION CONTEXT flag](#structures.md#flags).

### OnDecrypt

OnDecrypt MUST NOT succeed if this keyring does not have a specified [private key](#private-key).
The keyring MUST NOT derive a private key from a specified [public key](#public-key)

OnDecrypt MUST take [decryption materials](#structures.md#decryption-materials) and
a list of [encrypted data keys](#structures.md#encrypted-data-key) as input.

The keyring MUST attempt to decrypt the inputted encrypted data keys, in list order, until it successfully decrypts one.

For each encrypted data key, the keyring MUST attempt to decrypt the encrypted data key into plaintext
using RSA if and only if the following is true:

- the encrypted data key's [key provider information](#structures.md#key-provider-information)
  has a value equal to this keyring's [key namespace](#key-namespace).
- the encrypted data key's [key provider ID](#structures.md#key-provider-id) has a value equal to
  this keyring's [key name](#key-name).

The keyring performs RSA decryption with the following specifics:

- this keyring's [private key](#private-key) is the RSA priavte key
- this keyring's [padding scheme](padding-scheme) is the RSA padding scheme.
- an encrypted data key's [ciphertext](#structures.md#ciphertext) is the input ciphertext to RSA decryption.

If any decryption succeeds, this keyring MUST immediately return the input
[decryption materials](#structures.md#decryption-materials), modified in the following ways:

- The output of RSA decryption is set as the decryption material's plaintext data key.
- The keyring trace has a new [record](#structures.md#record) appended.
  This record MUST contain this keyring's [key name](#key-name) and [key namespace](#key-namespace),
  and the [flags](#structures.md$flags) field of this record MUST include the
  [DECRYPTED DATA KEY](#structures.md#supported-flags) flag.
  The record MUST NOT contain the [VERIFIED ENCRYPTION CONTEXT flag](#structures.md#flags).

If no decryption succeeds, this keyring MUST NOT make any update to the decryption materials.

## Security Considerations

[TODO: What security properties does this keyring guarantee?]

- multifactor RSA
- The storage of the raw RSA keys in the local box
- Does not write any information about what algorithm was used to wrap the data key.
- Does not provide any authenticity.
