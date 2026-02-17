[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# Encryption

## Version

0.1.0

### Changelog

- 0.1.0
  - Initial

## Definitions

### Conventions used in this document

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL"
in this document are to be interpreted as described in [RFC2119](https://tools.ietf.org/html/rfc2119).

## Content Encryption

The S3EC MUST use the encryption algorithm configured during [client](./client.md) initialization.

Once the requisite encryption materials have been provided, the client proceeds to encrypting the plaintext object content.

The client MUST validate that the length of the plaintext bytes does not exceed the algorithm suite's cipher's maximum content length in bytes.

For algorithm suites which support Key Commitment, a fixed IV is used for GCM content encryption.
Instead of generating an IV, committing algorithm suites use a Message ID which is used as input to the HKDF.
Otherwise, the IV and the Message ID are similar in some ways.
For example, the Message ID, like the IV, is stored in the persisted content metadata.
When implementing the S3EC, it is useful to generate the Message ID by the same process that generates the IV in non-committing algorithm suites.
The client MUST generate an IV or Message ID using the length of the IV or Message ID defined in the algorithm suite.

The generated IV or Message ID MUST be set or returned from the encryption process such that it can be included in the content metadata.

### Cipher Initialization

The client SHOULD validate that the generated IV or Message ID is not zeros.
There is an astoundingly small chance that an IV or Message ID is generated as all zeros.
An IV or Message ID containing all zeros is valid, but it is more likely that the IV/Message ID was not initialized or generated correctly.

The rest of the cipher initialization depends on the algorithm suite:

#### ALG_AES_256_CTR_IV16_TAG16_NO_KDF

Encryption using AES-CTR is not supported.
This algorithm suite is only used to decrypt ranges of a ciphertext encrypted using AES-GCM.
Attempts to encrypt using AES-CTR MUST fail.

#### ALG_AES_256_CTR_HKDF_SHA512_COMMIT_KEY

Encryption using AES-CTR is not supported.
This algorithm suite is only used to decrypt ranges of a ciphertext encrypted using key committing AES-GCM.
Attempts to encrypt using key committing AES-CTR MUST fail.

#### ALG_AES_256_CBC_IV16_NO_KDF

CBC encryption is no longer supported.
Decryption of ciphertexts encrypted using CBC is supported as an optional legacy behavior.
See [CBC Decryption](decryption.md#cbc-decryption).

#### ALG_AES_256_GCM_IV12_TAG16_NO_KDF

The client MUST initialize the cipher, or call an AES-GCM encryption API, with the plaintext data key, the generated IV, and the tag length defined in the Algorithm Suite when encrypting with ALG_AES_256_GCM_IV12_TAG16_NO_KDF.
The client MUST NOT provide any AAD when encrypting with ALG_AES_256_GCM_IV12_TAG16_NO_KDF.
The client MUST append the GCM auth tag to the ciphertext if the underlying crypto provider does not do so automatically.

#### ALG_AES_256_GCM_HKDF_SHA512_COMMIT_KEY

This algorithm suite supports Key Commitment and therefore requires deriving a key commitment value and a derived encryption key.
The client MUST use HKDF to derive the key commitment value and the derived encrypting key as described in [Key Derivation](key-derivation.md).
The derived key commitment value MUST be set or returned from the encryption process such that it can be included in the content metadata.
The client MUST append the GCM auth tag to the ciphertext if the underlying crypto provider does not do so automatically.
