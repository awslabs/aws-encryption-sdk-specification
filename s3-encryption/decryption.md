[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# Decryption

## Version

0.1.0

### Changelog

- 0.1.0
  - Initial

## Definitions

### Conventions used in this document

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL"
in this document are to be interpreted as described in [RFC2119](https://tools.ietf.org/html/rfc2119).

## Content Decryption

The content decryption process is largely the same as the [encryption](./encryption.md) process.
Only notable differences are specified in this document.

### Ranged Gets

The S3EC MAY support the "range" parameter on GetObject which specifies a subset of bytes to download and decrypt.
If the S3EC supports Ranged Gets, the S3EC MUST adjust the customer-provided range to include the beginning and end of the cipher blocks for the given range.
TODO: Fully spec out all edge cases for Ranged Gets.
For requests which provide a range to decrypt an object encrypted with an authenticated algorithm suite, the corresponding CTR-based algorithm suite is used.
If the object was encrypted with ALG_AES_256_GCM_IV12_TAG16_NO_KDF, then ALG_AES_256_CTR_IV16_TAG16_NO_KDF MUST be used to decrypt the range of the object.
If the object was encrypted with ALG_AES_256_GCM_HKDF_SHA512_COMMIT_KEY, then ALG_AES_256_CTR_HKDF_SHA512_COMMIT_KEY MUST be used to decrypt the range of the object.

If the GetObject response contains a range, but the GetObject request does not contain a range, the S3EC MUST throw an exception.
This behavior indicates that this is a "multipart download" which is currently not supported.

### Legacy Decryption

The S3EC MUST NOT decrypt objects encrypted using legacy unauthenticated algorithm suites unless specifically configured to do so.
If the S3EC is not configured to enable legacy unauthenticated content decryption, the client MUST throw an exception when attempting to decrypt an object encrypted with a legacy unauthenticated algorithm suite.

### Key Commitment

The S3EC supports algorithm suite(s) which provide [key commitment](./key-commitment.md).
The S3EC MUST validate the algorithm suite used for decryption against the key commitment policy before attempting to decrypt the content ciphertext.
If the commitment policy requires decryption using a committing algorithm suite, and the algorithm suite associated with the object does not support key commitment, then the S3EC MUST throw an exception.

#### Decrypting With Commitment

When using an algorithm suite which supports key commitment, the client MUST verify that the [derived key commitment](./key-derivation.md#hkdf-operation) contains the same bytes as the stored key commitment retrieved from the stored object's metadata.
When using an algorithm suite which supports key commitment, the verification of the derived key commitment value MUST be done in constant time.
When using an algorithm suite which supports key commitment, the client MUST throw an exception when the derived key commitment value and stored key commitment value do not match.
When using an algorithm suite which supports key commitment, the client MUST verify the key commitment values match before deriving the [derived encryption key](./key-derivation.md#hkdf-operation).
